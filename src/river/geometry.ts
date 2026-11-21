// Small numeric helpers: monotone cubic interpolation and stream geometry.
import { yearToU } from './time';
import type { StreamDef } from './streams';

/** Monotone cubic Hermite interpolation (Fritsch–Carlson). Clamps outside the domain. */
export function monotone(xs: number[], ys: number[]): (x: number) => number {
  const n = xs.length;
  if (n === 1) return () => ys[0];
  const dx: number[] = [], m: number[] = [], t: number[] = new Array(n);
  for (let i = 0; i < n - 1; i++) {
    dx.push(xs[i + 1] - xs[i]);
    m.push((ys[i + 1] - ys[i]) / (dx[i] || 1e-9));
  }
  t[0] = m[0];
  t[n - 1] = m[n - 2];
  for (let i = 1; i < n - 1; i++) {
    if (m[i - 1] * m[i] <= 0) t[i] = 0;
    else {
      const w1 = 2 * dx[i] + dx[i - 1], w2 = dx[i] + 2 * dx[i - 1];
      t[i] = (w1 + w2) / (w1 / m[i - 1] + w2 / m[i]);
    }
  }
  return (x: number) => {
    if (x <= xs[0]) return ys[0];
    if (x >= xs[n - 1]) return ys[n - 1];
    let lo = 0, hi = n - 1;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (xs[mid] <= x) lo = mid; else hi = mid;
    }
    const h = dx[lo], s = (x - xs[lo]) / h, s2 = s * s, s3 = s2 * s;
    return (2 * s3 - 3 * s2 + 1) * ys[lo] + (s3 - 2 * s2 + s) * h * t[lo]
      + (-2 * s3 + 3 * s2) * ys[lo + 1] + (s3 - s2) * h * t[lo + 1];
  };
}

export function linear(xs: number[], ys: number[]): (x: number) => number {
  return (x: number) => {
    if (x <= xs[0]) return ys[0];
    const n = xs.length;
    if (x >= xs[n - 1]) return ys[n - 1];
    for (let i = 1; i < n; i++) {
      if (x <= xs[i]) return ys[i - 1] + ((x - xs[i - 1]) / (xs[i] - xs[i - 1])) * (ys[i] - ys[i - 1]);
    }
    return ys[n - 1];
  };
}

export interface StreamGeom {
  def: StreamDef;
  u0: number;
  u1: number;
  /** centre line in cross units, defined (clamped) for all u */
  center: (u: number) => number;
  /** full width in cross units; 0 outside the stream's life */
  width: (u: number) => number;
  alpha: (u: number) => number;
  /** u positions of the keyframes, for gradient stops */
  keyU: number[];
  keyA: number[];
}

export function buildGeom(def: StreamDef): StreamGeom {
  const us = def.keys.map((k) => yearToU(k.y));
  const cs = def.keys.map((k) => k.c);
  const ws = def.keys.map((k) => k.w);
  const as = def.keys.map((k) => k.a ?? 1);
  const c = monotone(us, cs), w = monotone(us, ws), a = linear(us, as);
  const u0 = us[0], u1 = us[us.length - 1];
  return {
    def, u0, u1,
    center: c,
    width: (u) => (u < u0 || u > u1 ? 0 : Math.max(0, w(u))),
    alpha: a,
    keyU: us,
    keyA: as,
  };
}

export const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

export function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
export function rgba(hex: string, a: number): string {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r},${g},${b},${a})`;
}
/** Mix a colour toward black (t>0) or white (t<0). */
export function shade(hex: string, t: number): string {
  const [r, g, b] = hexToRgb(hex);
  const target = t > 0 ? 0 : 255, k = Math.abs(t);
  const f = (v: number) => Math.round(v + (target - v) * k);
  return `rgb(${f(r)},${f(g)},${f(b)})`;
}
