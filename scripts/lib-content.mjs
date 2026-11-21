// Shared helpers for content scripts (no dependencies).
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
export const CONTENT = join(ROOT, 'content');

export const STREAMS = [
  'prehistory', 'mesopotamia', 'egypt', 'greco-roman', 'india', 'east-asia', 'islamic',
  'americas', 'africa', 'europe',
  'bio-public', 'bio-surgery', 'bio-drugs', 'bio-lab', 'bio-mind',
];
export const CONFIDENCE = ['firm', 'agreed', 'uncertain', 'disputed', 'legendary'];
export const THEMES = [
  'theory', 'practice', 'surgery', 'drugs', 'technology', 'institutions',
  'public-health', 'ethics', 'mind', 'texts',
];
export const LINK_KINDS = ['built-on', 'led-to', 'overturned', 'see-also'];
export const SOURCE_TYPES = ['primary', 'scholarly', 'institutional', 'reference', 'news'];

export function loadPlan() {
  const rows = readFileSync(join(CONTENT, 'plan.tsv'), 'utf8')
    .split('\n').filter((l) => l.trim() && !l.startsWith('#'));
  return rows.map((l) => {
    const [id, stream, year, tier, batch, title, notes] = l.split('\t');
    return { id, stream, year: Number(year), tier: Number(tier), batch, title, notes };
  });
}

export function loadJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

export function entryFiles() {
  const dir = join(CONTENT, 'entries');
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter((f) => f.endsWith('.json')).sort().map((f) => join(dir, f));
}

export function wordCount(paras) {
  return paras.join(' ').split(/\s+/).filter(Boolean).length;
}

/** Normalise text for quote matching: lowercase, unify quotes/dashes, strip punctuation, collapse space. */
export function normalise(s) {
  return s
    .normalize('NFKD').replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/&nbsp;|&#160;/g, ' ')
    .replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;|&apos;|&rsquo;|&lsquo;/g, "'")
    .replace(/&ldquo;|&rdquo;/g, '"').replace(/&ndash;|&mdash;/g, '-')
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}
