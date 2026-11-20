import { signal, computed } from '@preact/signals';
import type { Confidence, Content, Entry, Idea, StreamId, Theme, Transmission } from './types';
import type { Target } from './river/controller';

export const content = signal<Content | null>(null);
export const selection = signal<Target | null>(null);
export const hover = signal<{ target: Target; x: number; y: number } | null>(null);
export const showIdeas = signal(true);
export const showFlows = signal(true);
export const tradition = signal(false);
export const themeFilter = signal<Set<Theme>>(new Set());
export const confFilter = signal<Set<Confidence>>(new Set());
export const streamFocus = signal<StreamId | null>(null);
export const page = signal<'index' | 'about' | 'sources' | null>(null);
export const intro = signal(true);
export const tourStep = signal<number | null>(null);
export const view = signal({ zoom: 1, u: 0.5 });
export const legendOpen = signal(false);
export const filtersOpen = signal(false);

export const entryById = computed(() => new Map<string, Entry>((content.value?.entries ?? []).map((e) => [e.id, e])));
export const ideaById = computed(() => new Map<string, Idea>((content.value?.ideas ?? []).map((e) => [e.id, e])));
export const flowById = computed(() => new Map<string, Transmission>((content.value?.transmissions ?? []).map((e) => [e.id, e])));

export const filterActive = computed(() => themeFilter.value.size > 0 || confFilter.value.size > 0 || streamFocus.value !== null);

export function matches(e: Entry): boolean {
  const th = themeFilter.value, cf = confFilter.value, sf = streamFocus.value;
  if (th.size && !e.themes.some((t) => th.has(t))) return false;
  if (cf.size && !cf.has(e.confidence.claim) && !cf.has(e.confidence.date)) return false;
  if (sf && e.stream !== sf) return false;
  return true;
}

export function toggleIn<T>(sig: { value: Set<T> }, v: T) {
  const next = new Set(sig.value);
  if (next.has(v)) next.delete(v); else next.add(v);
  sig.value = next;
}

export function clearFilters() {
  themeFilter.value = new Set();
  confFilter.value = new Set();
  streamFocus.value = null;
}

// ----- hash routing -----
export function targetToHash(t: Target | null): string {
  if (!t) return '#/';
  return `#/${t.kind === 'entry' ? 'e' : t.kind}/${t.id}`;
}

export function readHash(): { target: Target | null; page: 'index' | 'about' | 'sources' | null } {
  const m = location.hash.match(/^#\/(e|idea|flow)\/([a-z0-9-]+)/);
  if (m) return { target: { kind: m[1] === 'e' ? 'entry' : (m[1] as 'idea' | 'flow'), id: m[2] }, page: null };
  const p = location.hash.match(/^#\/(index|about|sources)/);
  return { target: null, page: p ? (p[1] as 'index' | 'about' | 'sources') : null };
}

export function select(t: Target | null) {
  selection.value = t;
  const h = targetToHash(t);
  if (location.hash !== h && !(h === '#/' && !location.hash)) history.replaceState(null, '', h === '#/' ? location.pathname + location.search : h);
}

export function openPage(p: 'index' | 'about' | 'sources' | null) {
  page.value = p;
  history.replaceState(null, '', p ? `#/${p}` : location.pathname + location.search);
}
