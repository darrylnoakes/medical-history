// Owns the canvas, the DOM label layer, input handling and the animation loop.
import type { Content, StreamId } from '../types';
import { Camera } from './camera';
import { clamp } from './geometry';
import { draw, pick, type DrawState } from './renderer';
import { assignLanes, buildScene, type Node, type Scene } from './scene';
import { yearToU } from './time';

export type Target = { kind: 'entry' | 'idea' | 'flow'; id: string };

export interface ControllerEvents {
  onSelect: (t: Target | null) => void;
  onHover: (t: Target | null, x: number, y: number) => void;
  onView: (zoom: number, uCenter: number) => void;
}

const LABEL_FONT: Record<number, string> = {
  1: '600 14.5px "Newsreader Variable", Georgia, serif',
  2: '500 13px "Newsreader Variable", Georgia, serif',
  3: '400 12.5px "Newsreader Variable", Georgia, serif',
};

export class RiverController {
  readonly cam = new Camera();
  readonly scene: Scene;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private layer: HTMLDivElement;
  private root: HTMLElement;
  private dpr = 1;
  private raf = 0;
  private dirty = true;
  private layoutDirty = true;
  private disposed = false;
  private ro: ResizeObserver;
  private state: DrawState;
  private tradTarget = 0;
  private filter: (n: Node) => boolean = () => true;
  private pointers = new Map<number, { x: number; y: number }>();
  private dragMoved = 0;
  private pinchDist = 0;
  private velocity = 0;
  private lastMoveT = 0;
  private inertia = 0;
  private reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  private lastViewEmit = 0;

  constructor(root: HTMLElement, content: Content, private events: ControllerEvents) {
    this.root = root;
    this.scene = buildScene(content);
    this.canvas = document.createElement('canvas');
    this.canvas.className = 'river-canvas';
    this.canvas.setAttribute('aria-hidden', 'true');
    this.layer = document.createElement('div');
    this.layer.className = 'river-nodes';
    root.append(this.canvas, this.layer);
    this.ctx = this.canvas.getContext('2d', { alpha: false })!;
    this.state = {
      scene: this.scene, cam: this.cam, now: 0,
      selected: null, hover: null, selectedIdea: null, hoverIdea: null, selectedFlow: null, hoverFlow: null,
      showIdeas: true, showFlows: true, tradT: 0, reduced: this.reduced, streamFocus: null,
    };
    this.cam.onChange = () => { this.dirty = true; };
    this.buildNodes();
    this.ro = new ResizeObserver(() => this.resize());
    this.ro.observe(root);
    this.resize();
    this.bind();
    (document as any).fonts?.ready.then(() => { this.measureLabels(); this.layoutDirty = true; this.dirty = true; });
    this.raf = requestAnimationFrame(this.frame);
  }

  dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.raf);
    this.ro.disconnect();
    this.canvas.remove();
    this.layer.remove();
  }

  // ---------- public API ----------

  setSelection(t: Target | null) {
    this.state.selected = t?.kind === 'entry' ? t.id : null;
    this.state.selectedIdea = t?.kind === 'idea' ? t.id : null;
    this.state.selectedFlow = t?.kind === 'flow' ? t.id : null;
    for (const n of this.scene.nodes) n.el?.classList.toggle('sel', n.entry.id === this.state.selected);
    this.dirty = true;
  }

  setLayers(showIdeas: boolean, showFlows: boolean) {
    this.state.showIdeas = showIdeas; this.state.showFlows = showFlows; this.dirty = true;
  }

  setTradition(on: boolean) { this.tradTarget = on ? 1 : 0; this.dirty = true; }

  setFilter(fn: (n: Node) => boolean, streamFocus: StreamId | null) {
    this.filter = fn;
    this.state.streamFocus = streamFocus;
    for (const n of this.scene.nodes) {
      n.dim = !fn(n);
      n.el?.classList.toggle('dim', n.dim);
    }
    this.layoutDirty = true; this.dirty = true;
  }

  setPanelInset(px: number) { this.cam.insetEnd = px; }

  /** Fly to an entry, idea, tributary or stream. */
  focus(t: Target, opts: { zoom?: number; ms?: number } = {}) {
    const ms = this.reduced ? 0 : opts.ms ?? 950;
    if (t.kind === 'entry') {
      const n = this.scene.nodeById.get(t.id);
      if (!n) return;
      // zoom so that neighbours in the same stream are distinguishable, but never zoom out on the reader
      const want = opts.zoom ?? Math.max(this.cam.zoom, this.zoomForNode(n));
      this.cam.flyTo(n.uRec, want, ms);
    } else if (t.kind === 'idea') {
      const ip = this.scene.ideas.find((i) => i.idea.id === t.id);
      if (!ip || !ip.segs.length) return;
      const u0 = Math.min(...ip.segs.map((s) => s.u0)), u1 = Math.max(...ip.segs.map((s) => s.u1));
      this.cam.flyTo((u0 + u1) / 2, this.cam.zoomForSpan(u1 - u0, 0.82), ms);
    } else {
      const f = this.scene.flows.find((x) => x.tr.id === t.id);
      if (!f) return;
      this.cam.flyTo((f.u0 + f.u1) / 2, clamp(this.cam.zoomForSpan(f.u1 - f.u0, 0.3), 1.5, 14), ms);
    }
  }

  focusYears(from: number, to: number, ms = 950) {
    const u0 = yearToU(from), u1 = yearToU(to);
    this.cam.flyTo((u0 + u1) / 2, this.cam.zoomForSpan(u1 - u0, 0.9), this.reduced ? 0 : ms);
  }

  focusStream(id: StreamId) {
    const g = this.scene.geomById.get(id);
    if (g) this.cam.flyTo((g.u0 + g.u1) / 2, this.cam.zoomForSpan(g.u1 - g.u0, 0.86), this.reduced ? 0 : 950);
  }

  zoomBy(f: number) { this.cam.zoomAt(this.cam.focusPx, f); }
  home() { this.cam.flyTo(0.5, 1, this.reduced ? 0 : 800, this.cam.tLen / 2); }

  private zoomForNode(n: Node) {
    // enough zoom that ~2.5% of the river around the entry fills the view, scaled by how crowded its era is
    const list = this.scene.nodes.filter((m) => m.geom === n.geom);
    let nearest = 1;
    for (const m of list) if (m !== n) nearest = Math.min(nearest, Math.abs(m.uRec - n.uRec));
    const du = clamp(nearest * 9, 0.012, 0.09);
    return clamp(this.cam.zoomForSpan(du, 0.7), 2, 40);
  }

  // ---------- DOM nodes ----------

  private buildNodes() {
    const frag = document.createDocumentFragment();
    const sorted = [...this.scene.nodes].sort((a, b) => a.uRec - b.uRec);
    for (const n of sorted) {
      const b = document.createElement('button');
      const trails = (n.uLatest != null && n.uLatest > n.uRec) || n.uEnd != null;
      b.className = `node t${n.entry.tier}${trails ? ' raise' : ''}`;
      b.type = 'button';
      b.dataset.id = n.entry.id;
      b.setAttribute('aria-label', `${n.entry.title}, ${n.entry.date.display}`);
      const lbl = document.createElement('span');
      lbl.className = 'lbl';
      lbl.textContent = n.entry.title;
      b.append(lbl);
      n.el = b;
      frag.append(b);
    }
    this.layer.append(frag);
    this.measureLabels();
    this.layer.addEventListener('click', (e) => {
      const el = (e.target as HTMLElement).closest('.node') as HTMLElement | null;
      if (!el || this.dragMoved > 6) return;
      this.events.onSelect({ kind: 'entry', id: el.dataset.id! });
    });
    this.layer.addEventListener('pointerover', (e) => {
      const el = (e.target as HTMLElement).closest('.node') as HTMLElement | null;
      if (!el || (e as PointerEvent).pointerType === 'touch') return;
      this.hoverEntry(el.dataset.id!);
    });
    this.layer.addEventListener('pointerout', (e) => {
      const el = (e.target as HTMLElement).closest('.node');
      if (el) this.hoverEntry(null);
    });
    this.layer.addEventListener('focusin', (e) => {
      const el = (e.target as HTMLElement).closest('.node') as HTMLElement | null;
      if (!el) return;
      const n = this.scene.nodeById.get(el.dataset.id!);
      if (!n) return;
      // keyboard focus: bring the node into view (the browser may have scrolled the container; undo that)
      this.root.scrollLeft = 0; this.root.scrollTop = 0;
      if (el.matches(':focus-visible') && (n.t < 60 || n.t > this.cam.tLen - this.cam.insetEnd - 120)) {
        this.cam.flyTo(n.uRec, undefined, this.reduced ? 0 : 400);
      }
      this.hoverEntry(n.entry.id);
    });
    this.layer.addEventListener('focusout', () => this.hoverEntry(null));
  }

  private hoverEntry(id: string | null) {
    if (this.state.hover === id) return;
    this.state.hover = id;
    this.dirty = true;
    if (id) {
      const n = this.scene.nodeById.get(id)!;
      const [x, y] = this.cam.xy(n.t, n.cpx);
      this.events.onHover({ kind: 'entry', id }, x, y);
    } else this.events.onHover(null, 0, 0);
  }

  private measureLabels() {
    const c = document.createElement('canvas').getContext('2d')!;
    for (const n of this.scene.nodes) {
      c.font = LABEL_FONT[n.entry.tier];
      n.labelW = Math.min(c.measureText(n.entry.title).width + 4, 250);
    }
  }

  // ---------- layout ----------

  private resize() {
    const r = this.root.getBoundingClientRect();
    if (r.width < 10 || r.height < 10) return;
    // cap the backing store at ~4.5 megapixels: beyond that, fill-rate costs more than sharpness gains
    this.dpr = Math.max(1, Math.min(window.devicePixelRatio || 1, 2, Math.sqrt(4.5e6 / (r.width * r.height))));
    this.canvas.width = Math.round(r.width * this.dpr);
    this.canvas.height = Math.round(r.height * this.dpr);
    this.canvas.style.width = `${r.width}px`;
    this.canvas.style.height = `${r.height}px`;
    const first = this.cam.W <= 1;
    const wasVertical = this.cam.vertical;
    this.cam.resize(r.width, r.height);
    if (first) { this.cam.k = this.cam.minK; this.cam.o = -this.cam.padStart; }
    this.root.classList.toggle('vertical', this.cam.vertical);
    if (first || wasVertical !== this.cam.vertical || true) assignLanes(this.scene, this.cam.crossLen, this.cam.minK * 5);
    this.layoutDirty = true; this.dirty = true;
  }

  /** Greedy label placement: important entries first; hide what does not fit. */
  private layoutLabels() {
    const cam = this.cam, z = cam.zoom;
    const placed: number[] = []; // flat [x0,y0,x1,y1,...]
    const hits = (x0: number, y0: number, x1: number, y1: number) => {
      for (let i = 0; i < placed.length; i += 4) {
        if (x0 < placed[i + 2] && x1 > placed[i] && y0 < placed[i + 3] && y1 > placed[i + 1]) return true;
      }
      return false;
    };
    const tierOk = (n: Node) => n.entry.tier === 1 || (n.entry.tier === 2 ? z >= (cam.vertical ? 2.4 : 1.5) : z >= (cam.vertical ? 5 : 3.2));
    const order = [...this.scene.nodes].sort((a, b) =>
      (a.entry.id === this.state.selected ? -1 : 0) - (b.entry.id === this.state.selected ? -1 : 0)
      || Number(a.dim) - Number(b.dim) || a.entry.tier - b.entry.tier || a.uRec - b.uRec);
    // world-space rects (time offset removed) so the result is stable while panning
    for (const n of order) {
      const u = n.uTrad != null && this.state.tradT > 0.5 ? n.uTrad : n.uRec;
      const t = u * cam.k, c = n.cpx;
      let side: 0 | 1 | -1 = 0;
      const sel = n.entry.id === this.state.selected;
      if ((tierOk(n) && !n.dim) || sel) {
        const h = n.entry.tier === 1 ? 19 : 17, gap = n.r + 6;
        const lift = (n.uLatest != null && n.uLatest > n.uRec) || n.uEnd != null ? 9 : 0;
        const tryRect = (s: 1 | -1): [number, number, number, number] => {
          if (cam.vertical) { const x0 = s === 1 ? c + gap : c - gap - n.labelW; return [x0, t - h / 2 - lift, x0 + n.labelW, t + h / 2 - lift]; }
          const x0 = s === 1 ? t + gap : t - gap - n.labelW; return [x0, c - h / 2 - lift, x0 + n.labelW, c + h / 2 - lift];
        };
        for (const s of [1, -1] as const) {
          const r = tryRect(s);
          // in portrait, labels must stay on screen horizontally
          if (cam.vertical && (r[0] < 44 || r[2] > cam.W - 4)) continue;
          if (!hits(r[0] - 3, r[1] - 1, r[2] + 3, r[3] + 1) || sel) { side = s; placed.push(...r); break; }
        }
      }
      // every dot is an obstacle for later labels
      if (cam.vertical) placed.push(c - n.r - 2, t - n.r - 2, c + n.r + 2, t + n.r + 2);
      else placed.push(t - n.r - 2, c - n.r - 2, t + n.r + 2, c + n.r + 2);
      if (n.labelSide !== side) {
        n.labelSide = side;
        if (n.el) { n.el.classList.toggle('lab', side !== 0); n.el.classList.toggle('left', side === -1); }
      }
    }
  }

  // ---------- frame loop ----------

  private frame = (now: number) => {
    if (this.disposed) return;
    this.raf = requestAnimationFrame(this.frame);
    const s = this.state;
    // tradition ⇄ record morph
    if (s.tradT !== this.tradTarget) {
      const step = this.reduced ? 1 : 0.035;
      s.tradT = this.tradTarget > s.tradT ? Math.min(1, s.tradT + step) : Math.max(0, s.tradT - step);
      this.dirty = true; this.layoutDirty = true;
    }
    // inertia after a drag
    if (this.inertia && !this.pointers.size) {
      this.cam.panBy(this.inertia * 16);
      this.inertia *= 0.93;
      if (Math.abs(this.inertia) < 0.02) this.inertia = 0;
    }
    const animate = !this.reduced && document.visibilityState === 'visible';
    if (!this.dirty && (!animate || now - this.lastDraw < 66)) return;
    this.lastDraw = now;
    s.now = now;
    const zoomChanged = this.lastK !== this.cam.k;
    draw(this.ctx, s, this.dpr);
    if (this.dirty) {
      const perf: Record<string, number> | undefined = (window as any).__perf;
      const t0 = performance.now();
      if (zoomChanged || this.layoutDirty) { this.layoutLabels(); this.layoutDirty = false; this.lastK = this.cam.k; }
      const t1 = performance.now();
      this.positionNodes();
      if (perf) { perf.layout = (perf.layout ?? 0) + t1 - t0; perf.dom = (perf.dom ?? 0) + performance.now() - t1; }
      if (now - this.lastViewEmit > 120) { this.lastViewEmit = now; this.events.onView(this.cam.zoom, this.cam.uAt(this.cam.focusPx)); }
    }
    this.dirty = false;
  };
  private lastK = 0;
  private lastDraw = 0;

  private positionNodes() {
    const cam = this.cam;
    for (const n of this.scene.nodes) {
      const el = n.el;
      if (!el) continue;
      const on = n.t > -260 && n.t < cam.tLen + 260;
      if (!on) { if (el.style.display !== 'none') el.style.display = 'none'; continue; }
      if (el.style.display === 'none') el.style.display = '';
      const [x, y] = cam.xy(n.t, n.cpx);
      el.style.transform = `translate3d(${x.toFixed(1)}px,${y.toFixed(1)}px,0)`;
    }
  }

  // ---------- input ----------

  private bind() {
    const el = this.root;
    el.addEventListener('wheel', (e) => {
      e.preventDefault();
      const r = el.getBoundingClientRect();
      const [tpx] = this.cam.tc(e.clientX - r.left, e.clientY - r.top);
      const unit = e.deltaMode === 1 ? 32 : 1;
      const dx = e.deltaX * unit, dy = e.deltaY * unit;
      this.inertia = 0;
      if (this.cam.vertical) {
        if (e.ctrlKey) this.cam.zoomAt(tpx, Math.exp(-dy * 0.01)); else this.cam.panBy(-dy);
      } else if (e.ctrlKey) this.cam.zoomAt(tpx, Math.exp(-dy * 0.012));
      else if (e.shiftKey || Math.abs(dx) > Math.abs(dy) * 1.2) this.cam.panBy(-(Math.abs(dx) > Math.abs(dy) ? dx : dy));
      else this.cam.zoomAt(tpx, Math.exp(-dy * 0.0022));
    }, { passive: false });

    el.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return;
      this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      this.dragMoved = 0; this.inertia = 0; this.velocity = 0;
      this.cam.stop();
      if (this.pointers.size === 2) this.pinchDist = this.pinchLength();
    });
    window.addEventListener('pointermove', (e) => {
      const p = this.pointers.get(e.pointerId);
      if (!p) { if (e.pointerType !== 'touch') this.hoverCanvas(e); return; }
      const dx = e.clientX - p.x, dy = e.clientY - p.y;
      p.x = e.clientX; p.y = e.clientY;
      const r = el.getBoundingClientRect();
      if (this.pointers.size === 1) {
        const d = this.cam.vertical ? dy : dx;
        this.dragMoved += Math.abs(dx) + Math.abs(dy);
        if (this.dragMoved > 4) {
          el.classList.add('dragging');
          this.cam.panBy(d);
          const now = performance.now(), dt = Math.max(1, now - this.lastMoveT);
          this.velocity = this.velocity * 0.6 + (d / dt) * 0.4;
          this.lastMoveT = now;
        }
      } else if (this.pointers.size === 2) {
        const len = this.pinchLength();
        const pts = [...this.pointers.values()];
        const [tpx] = this.cam.tc((pts[0].x + pts[1].x) / 2 - r.left, (pts[0].y + pts[1].y) / 2 - r.top);
        if (this.pinchDist > 0) this.cam.zoomAt(tpx, len / this.pinchDist);
        this.pinchDist = len;
        this.dragMoved += 10;
      }
    });
    const up = (e: PointerEvent) => {
      if (!this.pointers.has(e.pointerId)) return;
      this.pointers.delete(e.pointerId);
      el.classList.remove('dragging');
      if (this.pointers.size === 0) {
        if (this.dragMoved > 6 && performance.now() - this.lastMoveT < 60 && !this.reduced) this.inertia = clamp(this.velocity, -4, 4);
        else if (this.dragMoved <= 6 && !(e.target as HTMLElement).closest('.node')) this.clickCanvas(e);
      }
      this.pinchDist = 0;
    };
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
    el.addEventListener('pointerleave', () => { if (!this.pointers.size) this.setCanvasHover(null, 0, 0); });
    el.addEventListener('dblclick', (e) => {
      if ((e.target as HTMLElement).closest('.node')) return;
      const r = el.getBoundingClientRect();
      const [tpx] = this.cam.tc(e.clientX - r.left, e.clientY - r.top);
      this.cam.flyTo(this.cam.uAt(tpx), this.cam.zoom * 2.2, this.reduced ? 0 : 450);
    });
  }

  private pinchLength() {
    const p = [...this.pointers.values()];
    return Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y);
  }

  private hoverCanvas(e: PointerEvent) {
    if (!(e.target === this.canvas || e.target === this.layer || e.target === this.root)) {
      if (this.state.hoverIdea || this.state.hoverFlow) this.setCanvasHover(null, 0, 0);
      return;
    }
    const r = this.root.getBoundingClientRect();
    const x = e.clientX - r.left, y = e.clientY - r.top;
    this.setCanvasHover(pick(this.scene, x, y), x, y);
  }

  private setCanvasHover(hit: { kind: 'idea' | 'flow'; id: string } | null, x: number, y: number) {
    const idea = hit?.kind === 'idea' ? hit.id : null, flow = hit?.kind === 'flow' ? hit.id : null;
    const changed = idea !== this.state.hoverIdea || flow !== this.state.hoverFlow;
    this.state.hoverIdea = idea; this.state.hoverFlow = flow;
    this.root.classList.toggle('can-click', !!hit);
    if (changed) this.dirty = true;
    if (hit) this.events.onHover(hit, x, y);
    else if (changed) this.events.onHover(null, 0, 0);
  }

  private clickCanvas(e: PointerEvent) {
    const r = this.root.getBoundingClientRect();
    const hit = pick(this.scene, e.clientX - r.left, e.clientY - r.top, e.pointerType === 'touch' ? 16 : 9);
    this.events.onSelect(hit);
  }

  /** Keyboard navigation on the river itself. */
  key(e: KeyboardEvent): boolean {
    const step = this.cam.tLen * 0.18;
    switch (e.key) {
      case 'ArrowRight': case 'ArrowDown': this.cam.panBy(-step); return true;
      case 'ArrowLeft': case 'ArrowUp': this.cam.panBy(step); return true;
      case '+': case '=': this.zoomBy(1.5); return true;
      case '-': case '_': this.zoomBy(1 / 1.5); return true;
      case '0': this.home(); return true;
    }
    return false;
  }
}
