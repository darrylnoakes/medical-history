#!/usr/bin/env node
// Validate content/ideas.json and content/transmissions.json.
import { loadPlan, loadJson, CONTENT, STREAMS, CONFIDENCE, SOURCE_TYPES, wordCount } from './lib-content.mjs';
import { join } from 'node:path';
import { existsSync } from 'node:fs';

const plan = new Set(loadPlan().map((p) => p.id));
const bib = loadJson(join(CONTENT, 'bibliography.json'));
const LIFE = {
  prehistory: [-400000, -2500], mesopotamia: [-3400, 100], egypt: [-3300, -30], 'greco-roman': [-800, 1500],
  india: [-1700, 2030], 'east-asia': [-1500, 2030], islamic: [650, 1900], americas: [-8000, 2030], africa: [-8000, 2030],
  europe: [450, 1860], 'bio-public': [1840, 2030], 'bio-surgery': [1840, 2030], 'bio-drugs': [1840, 2030],
  'bio-lab': [1840, 2030], 'bio-mind': [1840, 2030],
};
let errors = 0;
const err = (id, m) => { errors++; console.log(`  ERROR ${id}: ${m}`); };
const isStr = (v) => typeof v === 'string' && v.trim().length > 0;
const isYear = (v) => Number.isInteger(v) && v !== 0;

function common(x, minSources, words) {
  const id = x.id || '(no id)';
  if (!isStr(x.summary) || x.summary.length > 190) err(id, 'summary missing or > 190 chars');
  if (!Array.isArray(x.body) || !x.body.every(isStr)) err(id, 'body must be paragraphs');
  else { const n = wordCount(x.body); if (n < words[0] || n > words[1]) console.log(`  warn  ${id}: body ${n} words (target ${words[0]}–${words[1]})`); }
  if (!x.confidence || !CONFIDENCE.includes(x.confidence.claim) || !isStr(x.confidence.note)) err(id, 'confidence.claim / note invalid');
  for (const r of x.related || []) if (!plan.has(r)) err(id, `related "${r}" not in plan`);
  for (const f of x.further || []) if (!bib[f]) err(id, `further "${f}" not in bibliography`);
  if (!Array.isArray(x.sources) || x.sources.length < minSources) err(id, `needs ≥ ${minSources} sources`);
  for (const [i, s] of (x.sources || []).entries()) {
    for (const k of ['title', 'publisher', 'url', 'type', 'supports', 'quote']) if (!isStr(s[k])) err(id, `sources[${i}].${k} missing`);
    if (/wikipedia\.org|wikimedia\.org/.test(s.url || '')) err(id, `sources[${i}]: Wikipedia not acceptable`);
    if (!SOURCE_TYPES.includes(s.type)) err(id, `sources[${i}].type invalid`);
    const n = (s.quote || '').split(/\s+/).length; if (n < 5 || n > 45) err(id, `sources[${i}].quote must be 5–40 words`);
  }
}

const ideasPath = join(CONTENT, 'ideas.json');
if (existsSync(ideasPath)) {
  console.log('content/ideas.json');
  for (const x of loadJson(ideasPath)) {
    const id = x.id || '(no id)';
    if (!isStr(x.name) || x.name.length > 30) err(id, 'name missing or too long');
    if (!['abandoned', 'superseded', 'living', 'established'].includes(x.status)) err(id, 'status invalid');
    if (!x.born || !isYear(x.born.year) || !isStr(x.born.display) || !CONFIDENCE.includes(x.born.confidence)) err(id, 'born invalid');
    if (x.died && (!isYear(x.died.year) || !isStr(x.died.display) || !CONFIDENCE.includes(x.died.confidence))) err(id, 'died invalid');
    if (!Array.isArray(x.spans) || !x.spans.length) err(id, 'spans required');
    for (const s of x.spans || []) {
      if (!STREAMS.includes(s.stream)) { err(id, `span stream "${s.stream}" unknown`); continue; }
      if (!isYear(s.from) || !isYear(s.to) || s.to <= s.from) err(id, `span ${s.stream}: from/to invalid`);
      const [a, b] = LIFE[s.stream];
      if (s.from < a || s.to > b) err(id, `span ${s.stream} ${s.from}–${s.to} outside stream lifetime ${a}–${b}`);
      if (s.fading != null && (s.fading < s.from || s.fading > s.to)) err(id, `span ${s.stream}: fading outside span`);
    }
    common(x, 3, [140, 320]);
  }
} else console.log('content/ideas.json missing');

const trPath = join(CONTENT, 'transmissions.json');
if (existsSync(trPath)) {
  console.log('content/transmissions.json');
  for (const x of loadJson(trPath)) {
    const id = x.id || '(no id)';
    if (!isStr(x.title) || x.title.length > 48) err(id, 'title missing or too long');
    if (!STREAMS.includes(x.from) || !STREAMS.includes(x.to)) err(id, 'from/to stream invalid');
    if (!isYear(x.start) || !isYear(x.end) || x.end <= x.start) err(id, 'start/end invalid');
    if (!isStr(x.display)) err(id, 'display missing');
    common(x, 2, [70, 200]);
  }
} else console.log('content/transmissions.json missing');
console.log(`\n${errors} error(s).`);
process.exit(errors ? 1 : 0);
