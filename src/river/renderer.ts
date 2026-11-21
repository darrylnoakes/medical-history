// Canvas drawing for the river: paper, ribbons, tributaries, idea currents, markers, axis.
import type { Confidence, StreamId } from '../types';
import type { Camera } from './camera';
import { clamp, lerp, rgba, shade, type StreamGeom } from './geometry';
import { nodeC, type Flow, type IdeaPath, type Node, type Scene } from './scene';
import { formatYear, ticks, yearToU, PRESENT } from './time';

export const PAPER = '#f3ecdb';
export const INK = '#2a2420';
const SERIF = '"Newsreader Variable", "Newsreader", Georgia, serif';
const SANS = '"IBM Plex Sans", system-ui, sans-serif';

export interface DrawState {
  scene: Scene;
  cam: Camera;
  now: number;
  selected: string | null;
  hover: string | null;
  selectedIdea: string | null;
  hoverIdea: string | null;
  selectedFlow: string | null;
  hoverFlow: string | null;
  showIdeas: boolean;
  showFlows: boolean;
  /** 0 = positions by the record, 1 = by tradition */
  tradT: number;
  reduced: boolean;
  streamFocus: StreamId | null;
}

let noise: CanvasPattern | null = null;
function noisePattern(ctx: CanvasRenderingContext2D): CanvasPattern | null {
  if (noise) return noise;
  const c = document.createElement('canvas');
  c.width = c.height = 220;
  const x = c.getContext('2d')!;
  const img = x.createImageData(220, 220);
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = rnd();
    const dark = v < 0.5;
    img.data[i] = img.data[i + 1] = img.data[i + 2] = dark ? 60 : 255;
    img.data[i + 3] = Math.floor(Math.pow(rnd(), 3) * (dark ? 26 : 34));
  }
  x.putImageData(img, 0, 0);
  noise = ctx.createPattern(c, 'repeat');
  return noise;
}

function timeGradient(ctx: CanvasRenderingContext2D, cam: Camera, uA: number, uB: number) {
  const a = cam.tPx(uA), b = cam.tPx(uB);
  return cam.vertical ? ctx.createLinearGradient(0, a, 0, b) : ctx.createLinearGradient(a, 0, b, 0);
}

function drawPaper(ctx: CanvasRenderingContext2D, cam: Camera) {
  const g = timeGradient(ctx, cam, 0, 1);
  // papyrus → vellum → rag paper → clinical white
  g.addColorStop(0, '#e4d5b3');
  g.addColorStop(0.16, '#eadcbe');
  g.addColorStop(0.38, '#f0e6cf');
  g.addColorStop(0.62, '#f3ecdc');
  g.addColorStop(0.85, '#f4f0e6');
  g.addColorStop(1, '#f4f2ec');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, cam.W, cam.H);
  const p = noisePattern(ctx);
  if (p) { ctx.fillStyle = p; ctx.fillRect(0, 0, cam.W, cam.H); }
}

function visibleRange(g: { u0: number; u1: number }, cam: Camera, pad = 80): [number, number] {
  return [Math.max(g.u0, cam.uAt(-pad)), Math.min(g.u1, cam.uAt(cam.tLen + pad))];
}

function ribbonPath(ctx: CanvasRenderingContext2D, g: StreamGeom, cam: Camera, scale = 1) {
  const [ua, ub] = visibleRange(g, cam);
  if (ub <= ua) return false;
  const n = Math.max(2, Math.ceil(((ub - ua) * cam.k) / 5));
  const pts: [number, number, number][] = [];
  for (let i = 0; i <= n; i++) {
    const u = ua + ((ub - ua) * i) / n;
    pts.push([cam.tPx(u), cam.cPx(g.center(u)), (g.width(u) * cam.crossLen * scale) / 2]);
  }
  ctx.beginPath();
  for (let i = 0; i <= n; i++) {
    const [x, y] = cam.xy(pts[i][0], pts[i][1] - pts[i][2]);
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  for (let i = n; i >= 0; i--) {
    const [x, y] = cam.xy(pts[i][0], pts[i][1] + pts[i][2]);
    ctx.lineTo(x, y);
  }
  ctx.closePath();
  return true;
}

function streamGradient(ctx: CanvasRenderingContext2D, g: StreamGeom, cam: Camera, color: string, strength: number) {
  const grad = timeGradient(ctx, cam, g.u0, g.u1);
  const span = g.u1 - g.u0;
  for (let i = 0; i < g.keyU.length; i++) {
    grad.addColorStop(clamp((g.keyU[i] - g.u0) / span, 0, 1), rgba(color, g.keyA[i] * strength));
  }
  return grad;
}

function drawRibbons(ctx: CanvasRenderingContext2D, s: DrawState) {
  const { cam, scene } = s;
  ctx.save();
  ctx.globalCompositeOperation = 'multiply';
  for (const g of scene.geoms) {
    const focusFade = s.streamFocus && s.streamFocus !== g.def.id ? 0.3 : 1;
    if (g.def.wash) {
      // soft-edged wash: nested ribbons
      for (const sc of [1, 0.84, 0.66, 0.46]) {
        if (!ribbonPath(ctx, g, cam, sc)) break;
        ctx.fillStyle = streamGradient(ctx, g, cam, g.def.color, 0.1 * focusFade);
        ctx.fill();
      }
      continue;
    }
    if (!ribbonPath(ctx, g, cam)) continue;
    ctx.fillStyle = streamGradient(ctx, g, cam, g.def.color, (g.def.thin ? 0.52 : 0.44) * focusFade);
    ctx.fill();
    ctx.lineWidth = 1;
    ctx.strokeStyle = streamGradient(ctx, g, cam, g.def.color, 0.5 * focusFade);
    ctx.stroke();
  }
  ctx.restore();
}

/** Light streaks drifting downstream. */
function drawStreaks(ctx: CanvasRenderingContext2D, s: DrawState) {
  const { cam, scene } = s;
  ctx.save();
  ctx.lineWidth = 1.1;
  ctx.lineCap = 'round';
  ctx.strokeStyle = 'rgba(255,253,244,0.42)';
  const drift = s.reduced ? 0 : (s.now / 1000) * 16;
  let idx = 0;
  for (const g of scene.geoms) {
    if (g.def.wash) continue;
    const [ua, ub] = visibleRange(g, cam);
    if (ub <= ua) continue;
    const n = Math.max(2, Math.ceil(((ub - ua) * cam.k) / 7));
    const midW = g.width((ua + ub) / 2) * cam.crossLen;
    const offs = midW > 60 ? [-0.3, -0.08, 0.17, 0.36] : midW > 26 ? [-0.24, 0.22] : [0.05];
    for (const off of offs) {
      idx++;
      ctx.setLineDash([9 + (idx % 3) * 5, 21 + (idx % 4) * 6]);
      // anchor the dash phase to world position so panning does not make it swim
      ctx.lineDashOffset = -(drift * (0.8 + (idx % 3) * 0.25)) - cam.tPx(g.u0) % 1000 * 0 + ua * cam.k * 0;
      ctx.beginPath();
      let pen = false;
      for (let i = 0; i <= n; i++) {
        const u = ua + ((ub - ua) * i) / n;
        const w = g.width(u) * cam.crossLen;
        if (g.alpha(u) < 0.4 || w < 7) { pen = false; continue; }
        const [x, y] = cam.xy(cam.tPx(u), cam.cPx(g.center(u)) + off * w);
        if (!pen) { ctx.moveTo(x, y); pen = true; } else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
  }
  ctx.restore();
}

function smooth(t: number) { return t * t * (3 - 2 * t); }

function flowPoints(f: Flow, cam: Camera): { t: number; c: number }[] {
  let t0 = cam.tPx(f.u0), t1 = cam.tPx(f.u1);
  if (t1 - t0 < 30) { const m = (t0 + t1) / 2; t0 = m - 15; t1 = m + 15; }
  const cFrom = f.from.center(f.u0), cTo = f.to.center(f.u1);
  const sign = Math.sign(cTo - cFrom) || 1;
  const a = cam.cPx(cFrom + sign * f.from.width(f.u0) * 0.3);
  const b = cam.cPx(cTo - sign * f.to.width(f.u1) * 0.12);
  const pts: { t: number; c: number }[] = [];
  const n = 26;
  for (let i = 0; i <= n; i++) {
    const s = i / n;
    pts.push({ t: lerp(t0, t1, s), c: lerp(a, b, smooth(s)) });
  }
  return pts;
}

function drawFlows(ctx: CanvasRenderingContext2D, s: DrawState) {
  const { cam, scene } = s;
  for (const f of scene.flows) {
    f.screen = [];
    const tA = cam.tPx(f.u0), tB = cam.tPx(f.u1);
    if (tB < -60 || tA > cam.tLen + 60) continue;
    const pts = flowPoints(f, cam);
    const hw = clamp(cam.crossLen * 0.0065, 2.6, 5);
    const active = s.hoverFlow === f.tr.id || s.selectedFlow === f.tr.id;
    const weak = f.tr.confidence.claim === 'disputed' || f.tr.confidence.claim === 'uncertain' || f.tr.confidence.claim === 'legendary';
    const fade = s.streamFocus && s.streamFocus !== f.from.def.id && s.streamFocus !== f.to.def.id ? 0.25 : 1;
    ctx.save();
    ctx.globalCompositeOperation = 'multiply';
    ctx.beginPath();
    for (let i = 0; i < pts.length; i++) {
      const w = hw * (0.75 + 0.5 * (i / (pts.length - 1)));
      const [x, y] = cam.xy(pts[i].t, pts[i].c - w);
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    for (let i = pts.length - 1; i >= 0; i--) {
      const w = hw * (0.75 + 0.5 * (i / (pts.length - 1)));
      const [x, y] = cam.xy(pts[i].t, pts[i].c + w);
      ctx.lineTo(x, y);
    }
    ctx.closePath();
    const [x0, y0] = cam.xy(pts[0].t, pts[0].c), [x1, y1] = cam.xy(pts[pts.length - 1].t, pts[pts.length - 1].c);
    const grad = ctx.createLinearGradient(x0, y0, x1, y1);
    const alpha = (weak ? 0.38 : 0.7) * fade;
    grad.addColorStop(0, rgba(f.from.def.color, alpha));
    grad.addColorStop(1, rgba(f.to.def.color, alpha));
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.restore();

    ctx.save();
    if (weak) ctx.setLineDash([4, 4]);
    ctx.lineWidth = active ? 1.6 : 0.9;
    ctx.strokeStyle = active ? INK : rgba('#2a2420', 0.32 * fade);
    ctx.stroke();
    ctx.restore();

    // direction streak
    ctx.save();
    ctx.strokeStyle = 'rgba(255,253,244,0.7)';
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 9]);
    ctx.lineDashOffset = s.reduced ? 0 : -(s.now / 1000) * 14;
    ctx.beginPath();
    pts.forEach((p, i) => { const [x, y] = cam.xy(p.t, p.c); if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y); });
    ctx.stroke();
    ctx.restore();

    // midpoint marker invites a click
    const mid = pts[pts.length >> 1];
    const [mx, my] = cam.xy(mid.t, mid.c);
    ctx.save();
    ctx.translate(mx, my);
    ctx.rotate(Math.PI / 4);
    ctx.globalAlpha = fade;
    ctx.fillStyle = active ? INK : '#fbf7ea';
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1;
    const d = active ? 4.6 : 3.6;
    ctx.fillRect(-d, -d, d * 2, d * 2);
    ctx.strokeRect(-d, -d, d * 2, d * 2);
    ctx.restore();

    f.screen = pts.map((p) => { const [x, y] = cam.xy(p.t, p.c); return { x, y }; });
  }
}

/** Mist over deep time: the further back, the less we can see. */
function drawFog(ctx: CanvasRenderingContext2D, cam: Camera) {
  const uEnd = 0.085;
  if (cam.tPx(uEnd) < 0) return;
  const g = timeGradient(ctx, cam, 0, uEnd);
  g.addColorStop(0, 'rgba(232,221,196,0.86)');
  g.addColorStop(0.45, 'rgba(232,221,196,0.5)');
  g.addColorStop(1, 'rgba(232,221,196,0)');
  ctx.fillStyle = g;
  const a = cam.tPx(0) - 400, b = cam.tPx(uEnd);
  if (cam.vertical) ctx.fillRect(0, a, cam.W, b - a); else ctx.fillRect(a, 0, b - a, cam.H);
}

/** The river runs on past today; we just cannot see it yet. */
function drawFuture(ctx: CanvasRenderingContext2D, cam: Camera) {
  const a = cam.tPx(yearToU(PRESENT)), b = cam.tPx(1);
  if (a > cam.tLen) return;
  const g = cam.vertical ? ctx.createLinearGradient(0, a, 0, b) : ctx.createLinearGradient(a, 0, b, 0);
  g.addColorStop(0, 'rgba(244,241,234,0)');
  g.addColorStop(0.25, 'rgba(244,241,234,0.55)');
  g.addColorStop(1, 'rgba(244,241,234,1)');
  ctx.fillStyle = g;
  if (cam.vertical) ctx.fillRect(0, a, cam.W, cam.H - a + 10); else ctx.fillRect(a, 0, cam.W - a + 10, cam.H);
  ctx.fillStyle = 'rgba(244,241,234,1)';
  if (cam.vertical) ctx.fillRect(0, b - 1, cam.W, cam.H); else ctx.fillRect(b - 1, 0, cam.W, cam.H);
}

function haloText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, fill: string, halo = 'rgba(244,238,222,0.9)', lw = 3.2) {
  ctx.lineJoin = 'round';
  ctx.lineWidth = lw;
  ctx.strokeStyle = halo;
  ctx.strokeText(text, x, y);
  ctx.fillStyle = fill;
  ctx.fillText(text, x, y);
}

function drawIdeas(ctx: CanvasRenderingContext2D, s: DrawState) {
  const { cam, scene } = s;
  for (const ip of scene.ideas) {
    ip.screen = [];
    const active = s.hoverIdea === ip.idea.id || s.selectedIdea === ip.idea.id;
    const someActive = !!(s.hoverIdea || s.selectedIdea);
    // at the overview the currents are a faint texture; they come forward as you zoom in
    const near = clamp((cam.zoom - 1.3) / 2.2, 0, 1);
    const baseA = active ? 0.95 : someActive ? 0.16 : 0.26 + 0.26 * near;
    const showLabels = active || (near > 0.55 && !someActive);
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    let labelled = false;
    ip.segs.forEach((seg, si) => {
      const lineAt = (u: number): [number, number] => {
        const g = seg.geom;
        return cam.xy(cam.tPx(u), cam.cPx(g.center(u) + seg.lane * g.width(u)));
      };
      const fade = s.streamFocus && s.streamFocus !== seg.geom.def.id ? 0.3 : 1;
      ctx.strokeStyle = rgba('#2a2420', baseA * fade);
      ctx.lineWidth = active ? 2.2 : 1.25;
      // connector from the parent current
      if (seg.connectFrom) {
        const cf = seg.connectFrom;
        const tA = cam.tPx(cf.u), tB = cam.tPx(seg.u0);
        if (!(tB < -40 || tA > cam.tLen + 40)) {
          const cA = cam.cPx(cf.geom.center(cf.u) + cf.lane * cf.geom.width(cf.u));
          const cB = cam.cPx(seg.geom.center(seg.u0) + seg.lane * seg.geom.width(seg.u0));
          ctx.setLineDash([2, 4]);
          ctx.save();
          if (!active) ctx.globalAlpha *= 0.45;
          ctx.beginPath();
          for (let i = 0; i <= 16; i++) {
            const q = i / 16;
            const [x, y] = cam.xy(lerp(tA, tB, q), lerp(cA, cB, smooth(q)));
            if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
            ip.screen.push({ x, y });
          }
          ctx.stroke();
          ctx.restore();
          ip.screen.push({ x: NaN, y: NaN });
        }
      }
      const [ua, ub] = visibleRange(seg, cam, 30);
      if (ub <= ua) return;
      const drawPart = (a: number, b: number, dashed: boolean) => {
        if (b <= a) return;
        const n = Math.max(2, Math.ceil(((b - a) * cam.k) / 6));
        ctx.setLineDash(dashed ? [5, 5] : []);
        ctx.beginPath();
        for (let i = 0; i <= n; i++) {
          const [x, y] = lineAt(a + ((b - a) * i) / n);
          if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
          ip.screen.push({ x, y });
        }
        ctx.stroke();
      };
      const uf = seg.uFade ?? Infinity;
      drawPart(ua, Math.min(ub, uf), false);
      drawPart(Math.max(ua, uf), ub, true);
      ip.screen.push({ x: NaN, y: NaN });

      const isLast = si === ip.segs.length - 1 || seg.u1 >= Math.max(...ip.segs.map((q) => q.u1)) - 1e-9;
      // spring at the very start
      if (si === 0 && seg.u0 >= ua) {
        const [x, y] = lineAt(seg.u0);
        ctx.setLineDash([]);
        ctx.beginPath(); ctx.arc(x, y, 2.6, 0, Math.PI * 2);
        ctx.fillStyle = PAPER; ctx.fill(); ctx.stroke();
      }
      // ending: a bar where the idea died, an arrow where it flows on
      if (seg.u1 <= ub + 1e-9 && isLast) {
        const [x, y] = lineAt(seg.u1);
        ctx.setLineDash([]);
        ctx.beginPath();
        if (ip.alive) {
          const [ax, ay] = cam.xy(5, 0), [bx, by] = cam.xy(0, 3.5);
          ctx.moveTo(x - ax + bx, y - ay + by); ctx.lineTo(x, y); ctx.lineTo(x - ax - bx, y - ay - by);
        } else {
          const [bx, by] = cam.xy(0, 4.5);
          ctx.moveTo(x - bx, y - by); ctx.lineTo(x + bx, y + by);
        }
        ctx.stroke();
      }
      // label: at the segment start, or pinned to the leading edge of the view when the start is off-screen
      const startPx = cam.tPx(seg.u0), endPx = cam.tPx(seg.u1);
      const pin = cam.vertical ? 96 : 14;
      if (showLabels && endPx - Math.max(startPx, pin) > 110 && (!labelled || startPx > pin)) {
        const tpx = Math.max(startPx + 8, pin);
        const u = cam.uAt(tpx);
        const [x, y] = lineAt(clamp(u, seg.u0, seg.u1));
        ctx.font = `italic 500 ${active ? 12.5 : 11.5}px ${SERIF}`;
        ctx.textBaseline = 'bottom';
        ctx.setLineDash([]);
        const [ox, oy] = cam.vertical ? [5, -4] : [0, -3.5];
        haloText(ctx, ip.idea.name, x + ox, y + oy, rgba('#2a2420', (active ? 1 : 0.72 * near) * fade), `rgba(244,238,222,${active ? 0.85 : 0.8 * near})`, 2.6);
        labelled = true;
      }
    });
    ctx.restore();
  }
}

function drawStreamLabels(ctx: CanvasRenderingContext2D, s: DrawState) {
  const { cam, scene } = s;
  ctx.save();
  ctx.textBaseline = 'middle';
  for (const g of scene.geoms) {
    const [ua, ub] = visibleRange(g, cam, 0);
    if (ub <= ua) continue;
    const startPx = cam.tPx(g.u0);
    const pin = cam.vertical ? cam.padStart + 6 : 16;
    // find the first place at or after the pin where the ribbon is wide and inked enough
    let tpx = Math.max(g.def.delta ? cam.tPx(yearToU(1872)) : startPx + 14, pin);
    let u = cam.uAt(tpx), tries = 0;
    const min = g.def.thin ? 3 : 9;
    while (tries++ < 60 && u < g.u1 && (g.width(u) * cam.crossLen < min || g.alpha(u) < 0.3)) { tpx += 12; u = cam.uAt(tpx); }
    if (u >= g.u1 || cam.tPx(g.u1) - tpx < 60) continue;
    const wpx = g.width(u) * cam.crossLen;
    const size = g.def.wash ? 15 : clamp(wpx * 0.24, 10.5, 15);
    const fade = s.streamFocus && s.streamFocus !== g.def.id ? 0.3 : 1;
    let text = g.def.label;
    if (g.def.id === 'greco-roman' && u > yearToU(700)) text = 'Byzantium';
    if (g.def.id === 'europe' && u > yearToU(1480)) text = 'Europe';
    if (g.def.id === 'islamic' && u > yearToU(1720)) text = 'Unani';
    ctx.font = `italic 600 ${size}px ${SERIF}`;
    try { (ctx as any).letterSpacing = g.def.thin ? '0.04em' : '0.09em'; } catch { /* older browsers */ }
    const cpx = cam.cPx(g.center(u)) - (g.def.thin ? wpx / 2 + 8 : Math.max(0, wpx / 2 - size * 0.78));
    ctx.fillStyle = rgba(g.def.color, 1);
    ctx.globalAlpha = (g.def.wash ? 0.75 : 0.9) * fade;
    ctx.save();
    const [x, y] = cam.xy(tpx, g.def.wash ? cam.cPx(0.5) - cam.crossLen * 0.33 : cpx);
    ctx.translate(x, y);
    if (cam.vertical) ctx.rotate(Math.PI / 2);
    ctx.fillStyle = shade(g.def.color, 0.5);
    ctx.fillText(text.toUpperCase(), 0, 0);
    ctx.restore();
  }
  try { (ctx as any).letterSpacing = '0px'; } catch { /* */ }
  ctx.restore();
}

/** One confidence glyph: crisp for firm, softer as certainty falls, hollow for legend. */
export function drawGlyph(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, conf: Confidence, ink: string, paper = '#f6f0df') {
  ctx.save();
  if (conf === 'uncertain') {
    const g0 = ctx.createRadialGradient(x, y, 0, x, y, r * 2.5);
    g0.addColorStop(0, 'rgba(246,240,223,0.9)'); g0.addColorStop(1, 'rgba(246,240,223,0)');
    ctx.fillStyle = g0; ctx.beginPath(); ctx.arc(x, y, r * 2.5, 0, Math.PI * 2); ctx.fill();
    const g = ctx.createRadialGradient(x, y, 0, x, y, r * 2.1);
    g.addColorStop(0, ink); g.addColorStop(0.3, ink); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.globalAlpha *= 0.9;
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r * 2.1, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    return;
  }
  ctx.save(); ctx.globalAlpha *= 0.82;
  ctx.beginPath(); ctx.arc(x, y, r + 1.3, 0, Math.PI * 2);
  ctx.fillStyle = paper; ctx.fill();
  ctx.restore();
  ctx.fillStyle = ink; ctx.strokeStyle = ink;
  if (conf === 'firm') {
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  } else if (conf === 'agreed') {
    ctx.save(); ctx.globalAlpha *= 0.3;
    ctx.beginPath(); ctx.arc(x, y, r + 1.2, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    ctx.beginPath(); ctx.arc(x, y, r * 0.72, 0, Math.PI * 2); ctx.fill();
  } else if (conf === 'disputed') {
    ctx.lineWidth = Math.max(1, r * 0.28);
    ctx.beginPath(); ctx.arc(x, y, r - ctx.lineWidth / 2, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.arc(x, y, r, Math.PI / 2, Math.PI * 1.5); ctx.fill();
  } else {
    ctx.lineWidth = Math.max(1, r * 0.26);
    ctx.setLineDash([r * 0.55, r * 0.55]);
    ctx.beginPath(); ctx.arc(x, y, r - 0.3, 0, Math.PI * 2); ctx.stroke();
  }
  ctx.restore();
}

function roundBar(ctx: CanvasRenderingContext2D, cam: Camera, tA: number, tB: number, cpx: number, h: number) {
  const [x0, y0] = cam.xy(tA, cpx - h / 2);
  const [w, hh] = cam.vertical ? [h, tB - tA] : [tB - tA, h];
  ctx.beginPath();
  (ctx as any).roundRect ? ctx.roundRect(x0, y0, w, hh, h / 2) : ctx.rect(x0, y0, w, hh);
}

function drawMarkers(ctx: CanvasRenderingContext2D, s: DrawState) {
  const { cam, scene } = s;
  const order = [...scene.nodes].sort((a, b) => b.entry.tier - a.entry.tier);
  for (const n of order) {
    const u = n.uTrad != null ? lerp(n.uRec, n.uTrad, s.tradT) : n.uRec;
    const t = cam.tPx(u);
    const cpx = cam.cPx(nodeC(n, u));
    n.t = t; n.cpx = cpx;
    const tMin = Math.min(t, n.uEarliest != null ? cam.tPx(n.uEarliest) : t, n.uTrad != null ? cam.tPx(n.uTrad) : t);
    const tMax = Math.max(t, n.uLatest != null ? cam.tPx(n.uLatest) : t, n.uEnd != null ? cam.tPx(n.uEnd) : t, n.uTrad != null ? cam.tPx(n.uRec) : t);
    n.visible = t > -30 && t < cam.tLen + 30;
    if (tMax < -30 || tMin > cam.tLen + 30) continue;
    const ink = shade(n.geom.def.color, n.geom.def.wash ? 0.6 : 0.52);
    const active = s.selected === n.entry.id || s.hover === n.entry.id;
    ctx.save();
    ctx.globalAlpha = n.dim ? 0.14 : 1;

    // the smear: where the date could plausibly fall
    const recWeight = n.uTrad != null ? 1 - s.tradT : 1;
    if ((n.uEarliest != null || n.uLatest != null) && recWeight > 0.02) {
      const tA = cam.tPx(n.uEarliest ?? n.uRec), tB = cam.tPx(n.uLatest ?? n.uRec), tC = cam.tPx(n.uRec);
      if (tB - tA > 3.5) {
        const h = n.r * 2.4 + 3;
        const peak = clamp((tC - tA) / (tB - tA), 0.02, 0.98);
        const [r, g, b] = ink.match(/\d+/g)!.map(Number);
        const cc = cam.cPx(nodeC(n, n.uRec));
        for (const [scale, a] of [[1, 0.1], [0.62, 0.12], [0.3, 0.14]] as const) {
          const grad = cam.vertical ? ctx.createLinearGradient(0, tA, 0, tB) : ctx.createLinearGradient(tA, 0, tB, 0);
          const col = (k: number) => `rgba(${r},${g},${b},${k * a * recWeight})`;
          grad.addColorStop(0, col(0));
          grad.addColorStop(peak * 0.55, col(0.45));
          grad.addColorStop(peak, col(1));
          grad.addColorStop(peak + (1 - peak) * 0.45, col(0.45));
          grad.addColorStop(1, col(0));
          ctx.fillStyle = grad;
          roundBar(ctx, cam, tA, tB, cc, h * scale);
          ctx.fill();
        }
      }
    }
    // a period: a crisp bar from start to end
    if (n.uEnd != null && recWeight > 0.5) {
      const tB = cam.tPx(n.uEnd);
      if (tB - t > 4) {
        const long = tB - t > 220;
        ctx.strokeStyle = ink; ctx.lineWidth = long ? 1.1 : 2; ctx.lineCap = 'butt';
        if (long) ctx.globalAlpha *= 0.45;
        const [x0, y0] = cam.xy(t, cpx), [x1, y1] = cam.xy(tB, cpx);
        ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1);
        const [bx, by] = cam.xy(0, 3.5);
        ctx.moveTo(x1 - bx, y1 - by); ctx.lineTo(x1 + bx, y1 + by);
        ctx.stroke();
        if (long) ctx.globalAlpha /= 0.45;
      }
    }
    // tradition's ghost and its tether to the record
    if (n.uTrad != null) {
      const ug = lerp(n.uTrad, n.uRec, s.tradT);
      const tg = cam.tPx(ug), cg = cam.cPx(nodeC(n, ug));
      const [gx, gy] = cam.xy(tg, cg), [mx, my] = cam.xy(t, cpx);
      ctx.save();
      ctx.strokeStyle = ink; ctx.globalAlpha *= 0.5; ctx.lineWidth = 1; ctx.setLineDash([1.5, 4]);
      ctx.beginPath(); ctx.moveTo(gx, gy); ctx.lineTo(mx, my); ctx.stroke();
      ctx.restore();
      ctx.save();
      ctx.globalAlpha *= 0.7;
      drawGlyph(ctx, gx, gy, n.r, 'legendary', ink);
      ctx.restore();
    }
    const [x, y] = cam.xy(t, cpx);
    const conf: Confidence = n.uTrad != null && s.tradT > 0.5 ? 'legendary' : n.entry.confidence.claim;
    drawGlyph(ctx, x, y, n.r * (active ? 1.25 : 1), conf, ink);
    if (s.selected === n.entry.id) {
      ctx.strokeStyle = INK; ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.arc(x, y, n.r + 5, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.arc(x, y, n.r + 8.5, 0, Math.PI * 2); ctx.globalAlpha *= 0.35; ctx.stroke();
    } else if (s.hover === n.entry.id) {
      ctx.strokeStyle = INK; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.arc(x, y, n.r + 4.5, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.restore();
  }
}

function drawLinks(ctx: CanvasRenderingContext2D, s: DrawState) {
  if (!s.selected) return;
  const { cam, scene } = s;
  const me = scene.nodeById.get(s.selected);
  if (!me) return;
  const pairs: { other: Node; kind: string }[] = [];
  for (const l of me.entry.links) { const o = scene.nodeById.get(l.to); if (o) pairs.push({ other: o, kind: l.kind }); }
  for (const n of scene.nodes) for (const l of n.entry.links) if (l.to === me.entry.id && !pairs.some((p) => p.other === n)) pairs.push({ other: n, kind: l.kind });
  ctx.save();
  ctx.strokeStyle = rgba('#2a2420', 0.6);
  ctx.lineWidth = 1.2;
  for (const { other, kind } of pairs) {
    const [x0, y0] = cam.xy(me.t, me.cpx), [x1, y1] = cam.xy(other.t, other.cpx);
    const dx = x1 - x0, dy = y1 - y0, len = Math.hypot(dx, dy);
    if (len < 4) continue;
    const bow = clamp(len * 0.18, 14, 70);
    const cx = (x0 + x1) / 2 - (dy / len) * bow, cy = (y0 + y1) / 2 + (dx / len) * bow * (dx > 0 ? -1 : 1);
    ctx.setLineDash(kind === 'see-also' ? [2, 4] : []);
    ctx.beginPath(); ctx.moveTo(x0, y0); ctx.quadraticCurveTo(cx, cy, x1, y1); ctx.stroke();
    ctx.setLineDash([]);
    ctx.beginPath(); ctx.arc(x1, y1, other.r + 4, 0, Math.PI * 2); ctx.stroke();
  }
  ctx.restore();
}

function drawAxis(ctx: CanvasRenderingContext2D, s: DrawState) {
  const { cam } = s;
  const tk = ticks((u) => cam.tPx(u), -20, cam.tLen + 20, cam.vertical ? 64 : 92);
  ctx.save();
  // faint gridlines across the river
  ctx.strokeStyle = 'rgba(60,48,36,0.07)';
  ctx.lineWidth = 1;
  for (const t of tk) {
    const [x0, y0] = cam.xy(Math.round(t.px) + 0.5, cam.vertical ? cam.c0 - 4 : 60);
    const [x1, y1] = cam.xy(Math.round(t.px) + 0.5, cam.c1 + 6);
    ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
  }
  // the axis band
  if (cam.vertical) {
    ctx.fillStyle = 'rgba(243,236,219,0.9)';
    ctx.fillRect(0, 0, 40, cam.H);
    ctx.strokeStyle = 'rgba(60,48,36,0.25)';
    ctx.beginPath(); ctx.moveTo(40.5, 0); ctx.lineTo(40.5, cam.H); ctx.stroke();
    ctx.font = `500 10.5px ${SANS}`;
    ctx.fillStyle = 'rgba(42,36,32,0.8)';
    ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
    for (const t of tk) {
      const label = formatYear(t.year);
      const parts = label.split(' ');
      ctx.fillText(parts[0], 35, t.px - (parts[1] ? 5 : 0));
      if (parts[1]) { ctx.fillStyle = 'rgba(42,36,32,0.5)'; ctx.fillText(parts[1], 35, t.px + 6); ctx.fillStyle = 'rgba(42,36,32,0.8)'; }
      ctx.beginPath(); ctx.moveTo(37, t.px + 0.5); ctx.lineTo(41, t.px + 0.5); ctx.stroke();
    }
  } else {
    const y = cam.H - 40;
    ctx.fillStyle = 'rgba(243,236,219,0.9)';
    ctx.fillRect(0, y, cam.W, 40);
    ctx.strokeStyle = 'rgba(60,48,36,0.3)';
    ctx.beginPath(); ctx.moveTo(0, y + 0.5); ctx.lineTo(cam.W, y + 0.5); ctx.stroke();
    ctx.font = `500 11.5px ${SANS}`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (const t of tk) {
      ctx.strokeStyle = 'rgba(60,48,36,0.45)';
      ctx.beginPath(); ctx.moveTo(Math.round(t.px) + 0.5, y); ctx.lineTo(Math.round(t.px) + 0.5, y + 6); ctx.stroke();
      ctx.fillStyle = 'rgba(42,36,32,0.82)';
      ctx.fillText(formatYear(t.year), t.px, y + 21);
    }
  }
  // "now"
  const nowPx = cam.tPx(yearToU(PRESENT));
  if (nowPx > 0 && nowPx < cam.tLen) {
    ctx.strokeStyle = 'rgba(42,36,32,0.35)';
    ctx.setLineDash([3, 4]);
    const [x0, y0] = cam.xy(nowPx, cam.vertical ? 40 : 64), [x1, y1] = cam.xy(nowPx, cam.vertical ? cam.W : cam.H - 40);
    ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
    ctx.setLineDash([]);
    ctx.font = `italic 500 12px ${SERIF}`;
    ctx.fillStyle = 'rgba(42,36,32,0.7)';
    ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    const [lx, ly] = cam.xy(nowPx + 6, cam.vertical ? 46 : 70);
    ctx.fillText('today', lx, ly);
  }
  ctx.restore();
}

export function draw(ctx: CanvasRenderingContext2D, s: DrawState, dpr: number) {
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  drawPaper(ctx, s.cam);
  drawRibbons(ctx, s);
  drawStreaks(ctx, s);
  if (s.showFlows) drawFlows(ctx, s); else for (const f of s.scene.flows) f.screen = [];
  drawFog(ctx, s.cam);
  drawFuture(ctx, s.cam);
  drawStreamLabels(ctx, s);
  if (s.showIdeas) drawIdeas(ctx, s); else for (const i of s.scene.ideas) i.screen = [];
  drawMarkers(ctx, s);
  drawLinks(ctx, s);
  drawAxis(ctx, s);
}

/** Nearest idea current or tributary to a screen point, within `tol` px. */
export function pick(scene: Scene, x: number, y: number, tol = 9): { kind: 'idea' | 'flow'; id: string } | null {
  let best: { kind: 'idea' | 'flow'; id: string } | null = null, bestD = tol * tol;
  const test = (pts: { x: number; y: number }[], kind: 'idea' | 'flow', id: string, bias: number) => {
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1], b = pts[i];
      if (Number.isNaN(a.x) || Number.isNaN(b.x)) continue;
      const dx = b.x - a.x, dy = b.y - a.y;
      const l2 = dx * dx + dy * dy || 1;
      const q = clamp(((x - a.x) * dx + (y - a.y) * dy) / l2, 0, 1);
      const px = a.x + q * dx - x, py = a.y + q * dy - y;
      const d = px * px + py * py - bias;
      if (d < bestD) { bestD = d; best = { kind, id }; }
    }
  };
  for (const f of scene.flows) test(f.screen, 'flow', f.tr.id, 20);
  for (const i of scene.ideas) test(i.screen, 'idea', i.idea.id, 0);
  return best;
}
