import { clamp, easeInOut, lerp } from './geometry';

/**
 * Maps river space — u along time (0..1), c across (0..1) — to screen pixels.
 * Zoom affects the time axis only; the cross axis always fits the viewport, so every
 * stream stays in view. `vertical` swaps the axes for narrow screens.
 */
export class Camera {
  W = 1;
  H = 1;
  vertical = false;
  /** world length along time, in px */
  k = 1000;
  /** scroll offset along time, in px */
  o = 0;
  /** breathing room before 50,000 BCE and after the present at minimum zoom */
  padStart = 28;
  padEnd = 150;
  /** cross-axis pixel bounds */
  c0 = 70;
  c1 = 600;
  /** px on the far side of the time axis hidden by an open panel */
  insetEnd = 0;
  onChange: () => void = () => {};
  private anim = 0;

  get tLen() { return this.vertical ? this.H : this.W; }
  get minK() { return Math.max(200, this.tLen - this.padStart - this.padEnd); }
  get maxK() { return this.minK * 90; }
  get zoom() { return this.k / this.minK; }

  resize(W: number, H: number) {
    const center = this.uAt(this.tLen / 2);
    const z = this.k / this.minK;
    this.W = W; this.H = H;
    this.vertical = W < 720 && H > W;
    if (this.vertical) {
      this.c0 = 46; this.c1 = W - 8; this.padStart = 84; this.padEnd = 120;
    } else {
      this.c0 = 74; this.c1 = H - 58; this.padStart = 30; this.padEnd = Math.min(170, W * 0.12);
    }
    this.k = clamp(z * this.minK, this.minK, this.maxK);
    this.o = center * this.k - this.tLen / 2;
    this.clampOffset();
  }

  tPx(u: number) { return u * this.k - this.o; }
  uAt(tpx: number) { return (tpx + this.o) / this.k; }
  cPx(c: number) { return this.c0 + c * (this.c1 - this.c0); }
  cAt(cpx: number) { return (cpx - this.c0) / (this.c1 - this.c0); }
  get crossLen() { return this.c1 - this.c0; }
  xy(tpx: number, cpx: number): [number, number] { return this.vertical ? [cpx, tpx] : [tpx, cpx]; }
  /** screen point → (time px, cross px) */
  tc(x: number, y: number): [number, number] { return this.vertical ? [y, x] : [x, y]; }

  private clampOffset() {
    const lo = -this.padStart, hi = this.k - this.tLen + this.padEnd + this.insetEnd;
    this.o = hi < lo ? lo : clamp(this.o, lo, hi);
  }

  stop() { cancelAnimationFrame(this.anim); this.anim = 0; }

  zoomAt(tpx: number, factor: number) {
    this.stop();
    const u = this.uAt(tpx);
    this.k = clamp(this.k * factor, this.minK, this.maxK);
    this.o = u * this.k - tpx;
    this.clampOffset();
    this.onChange();
  }

  panBy(dpx: number) {
    this.stop();
    this.o -= dpx;
    this.clampOffset();
    this.onChange();
  }

  /** Centre of the unobscured part of the time axis. */
  get focusPx() { return (this.tLen - this.insetEnd) / 2; }

  flyTo(u: number, zoom?: number, ms = 900, at?: number) {
    this.stop();
    const k1 = clamp((zoom ?? this.zoom) * this.minK, this.minK, this.maxK);
    const k0 = this.k, focus = at ?? this.focusPx;
    const uc0 = this.uAt(focus);
    const start = performance.now();
    if (ms <= 0) {
      this.k = k1; this.o = u * k1 - focus; this.clampOffset(); this.onChange(); return;
    }
    const step = (now: number) => {
      const t = clamp((now - start) / ms, 0, 1), e = easeInOut(t);
      // interpolate zoom geometrically so the motion feels even
      this.k = Math.exp(lerp(Math.log(k0), Math.log(k1), e));
      const uc = lerp(uc0, u, e);
      this.o = uc * this.k - focus;
      this.clampOffset();
      this.onChange();
      if (t < 1) this.anim = requestAnimationFrame(step);
      else this.anim = 0;
    };
    this.anim = requestAnimationFrame(step);
  }

  /** Zoom at which a span of years fills a comfortable part of the view. */
  zoomForSpan(du: number, fraction = 0.5) {
    const len = (this.tLen - this.insetEnd) * fraction;
    return clamp(len / Math.max(du, 1e-6) / this.minK, 1, 90);
  }
}
