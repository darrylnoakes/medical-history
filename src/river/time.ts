// Warped time: a piecewise-linear map from calendar year to a unit interval u ∈ [0, 1].
// Deep time is compressed and the documented centuries are stretched, so that the
// density of what we can say about each period is roughly even along the river.

const KNOTS: [year: number, u: number][] = [
  [-50000, 0.0],
  [-10000, 0.026],
  [-3500, 0.056],
  [-1000, 0.118],
  [-500, 0.152],
  [1, 0.214],
  [500, 0.262],
  [1000, 0.32],
  [1400, 0.378],
  [1700, 0.468],
  [1800, 0.532],
  [1850, 0.59],
  [1900, 0.672],
  [1950, 0.772],
  [2000, 0.9],
  [2032, 1.0],
];

export const YEAR_MIN = KNOTS[0][0];
export const YEAR_MAX = KNOTS[KNOTS.length - 1][0];
export const PRESENT = 2026;

export function yearToU(year: number): number {
  if (year <= YEAR_MIN) return 0;
  if (year >= YEAR_MAX) return 1;
  for (let i = 1; i < KNOTS.length; i++) {
    const [y1, u1] = KNOTS[i];
    if (year <= y1) {
      const [y0, u0] = KNOTS[i - 1];
      return u0 + ((year - y0) / (y1 - y0)) * (u1 - u0);
    }
  }
  return 1;
}

export function uToYear(u: number): number {
  if (u <= 0) return YEAR_MIN;
  if (u >= 1) return YEAR_MAX;
  for (let i = 1; i < KNOTS.length; i++) {
    const [y1, u1] = KNOTS[i];
    if (u <= u1) {
      const [y0, u0] = KNOTS[i - 1];
      return y0 + ((u - u0) / (u1 - u0)) * (y1 - y0);
    }
  }
  return YEAR_MAX;
}

/** Human label for an axis year. */
export function formatYear(year: number): string {
  const y = Math.round(year);
  if (y < 0) return `${(-y).toLocaleString('en-US')} BCE`;
  if (y === 0) return '1 CE';
  if (y < 1000) return `${y} CE`;
  return String(y);
}

const STEPS = [10000, 5000, 1000, 500, 100, 50, 10, 5, 1];

/**
 * Choose axis ticks for the visible range. Because the scale is warped, a single step size
 * does not work: we add ticks from coarse to fine wherever there is room.
 */
export function ticks(uToPx: (u: number) => number, pxMin: number, pxMax: number, minGap = 84): { year: number; px: number; major: boolean }[] {
  const placed: { year: number; px: number; major: boolean }[] = [];
  const u0 = Math.max(0, invert(uToPx, pxMin));
  const u1 = Math.min(1, invert(uToPx, pxMax));
  const yA = uToYear(u0), yB = uToYear(u1);
  for (const step of STEPS) {
    const first = Math.ceil(yA / step) * step;
    for (let y = first; y <= yB; y += step) {
      if (y > PRESENT) break;
      const yy = y === 0 ? 1 : y;
      const px = uToPx(yearToU(yy));
      if (placed.some((t) => Math.abs(t.px - px) < minGap)) continue;
      placed.push({ year: yy, px, major: step >= 100 });
    }
  }
  return placed.sort((a, b) => a.px - b.px);
}

function invert(uToPx: (u: number) => number, px: number): number {
  const a = uToPx(0), b = uToPx(1);
  return (px - a) / (b - a);
}
