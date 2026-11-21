#!/usr/bin/env node
// House style is American spelling. Fix the common British forms in our own prose —
// never inside quotation marks, source titles, quotes, publishers or author names.
import { entryFiles, CONTENT } from './lib-content.mjs';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const MAP = [
  [/\bhumour(s|al|alism)?\b/g, 'humor$1'], [/\bHumour(s|al|alism)?\b/g, 'Humor$1'],
  [/\banaesthe/g, 'anesthe'], [/\bAnaesthe/g, 'Anesthe'],
  [/\bstandardis(ed|e|es|ing|ation)\b/g, 'standardiz$1'], [/\borganis(ed|e|es|ing|ation|ations)\b/g, 'organiz$1'],
  [/\brecognis(ed|e|es|ing)\b/g, 'recogniz$1'], [/\brandomis(ed|e|es|ing|ation)\b/g, 'randomiz$1'],
  [/\bsterilis(ed|e|es|ing|ation|ations)\b/g, 'steriliz$1'], [/\bSterilis(ation)\b/g, 'Steriliz$1'],
  [/\bcentre(s)?\b/g, 'center$1'], [/\bprogramme(s)?\b/g, 'program$1'], [/\blabour\b/g, 'labor'],
  [/\btumour(s)?\b/g, 'tumor$1'], [/\bcolour(s|ed)?\b/g, 'color$1'], [/\bhaemo/g, 'hemo'], [/\bHaemo/g, 'Hemo'],
  [/\bpaediatric(s)?\b/g, 'pediatric$1'], [/\bleukaemia\b/g, 'leukemia'], [/\boestrogen\b/g, 'estrogen'],
  [/\bfoetus\b/g, 'fetus'], [/\bfoetal\b/g, 'fetal'], [/\bdiarrhoea\b/g, 'diarrhea'], [/\bcaesarean\b/g, 'cesarean'],
];
const fix = (text) => text.split(/("[^"]*"|“[^”]*”)/).map((part, i) => (i % 2 ? part : MAP.reduce((t, [a, b]) => t.replace(a, b), part))).join('');
let n = 0;
const walk = (o, key) => {
  if (typeof o === 'string') return o;
  if (Array.isArray(o)) return o.map((v, i) => (typeof v === 'string' && key !== 'themes' && key !== 'further' && key !== 'related' ? tally(v) : walk(v, key)));
  if (o && typeof o === 'object') {
    for (const k of Object.keys(o)) {
      if (k === 'sources') { for (const s of o[k]) if (typeof s.supports === 'string') s.supports = tally(s.supports); continue; }
      if (['id', 'stream', 'to', 'from', 'kind', 'commons', 'url', 'status', 'date', 'claim'].includes(k) && typeof o[k] === 'string') continue;
      if (typeof o[k] === 'string') o[k] = ['title', 'name', 'summary', 'note', 'tradition', 'record', 'place', 'alt', 'caption', 'display'].includes(k) ? tally(o[k]) : o[k];
      else o[k] = walk(o[k], k);
    }
  }
  return o;
};
function tally(v) { const w = fix(v); if (w !== v) n++; return w; }
for (const f of [...entryFiles(), join(CONTENT, 'ideas.json'), join(CONTENT, 'transmissions.json')]) {
  const data = JSON.parse(readFileSync(f, 'utf8'));
  const before = n;
  walk(data);
  if (n !== before) writeFileSync(f, JSON.stringify(data, null, 2) + '\n');
}
console.log(`americanized ${n} string(s)`);
