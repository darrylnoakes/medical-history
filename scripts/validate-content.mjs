#!/usr/bin/env node
// Validate entry files against the content schema.
// Usage: node scripts/validate-content.mjs [file.json ...]   (default: all of content/entries, plus coverage check)
import {
  loadPlan, loadJson, entryFiles, wordCount, CONTENT,
  STREAMS, CONFIDENCE, THEMES, LINK_KINDS, SOURCE_TYPES,
} from './lib-content.mjs';
import { join } from 'node:path';
import { existsSync } from 'node:fs';

const plan = loadPlan();
const planById = new Map(plan.map((p) => [p.id, p]));
const bib = loadJson(join(CONTENT, 'bibliography.json'));
const args = process.argv.slice(2);
const files = args.length ? args : entryFiles();
const checkCoverage = args.length === 0;

const WORDS = { 1: [200, 420], 2: [100, 210], 3: [45, 110] };
const MIN_SOURCES = { 1: 3, 2: 2, 3: 2 };
let errors = 0, warnings = 0;
const seen = new Map();

const err = (id, m) => { errors++; console.log(`  ERROR ${id}: ${m}`); };
const warn = (id, m) => { warnings++; console.log(`  warn  ${id}: ${m}`); };
const isStr = (v) => typeof v === 'string' && v.trim().length > 0;
const isYear = (v) => Number.isInteger(v) && v !== 0 && v > -400000 && v <= 2026;

export function validateSources(id, sources, min) {
  if (!Array.isArray(sources) || sources.length < min) err(id, `needs at least ${min} sources`);
  let nonRef = 0;
  for (const [i, s] of (sources || []).entries()) {
    const tag = `sources[${i}]`;
    for (const k of ['title', 'publisher', 'url', 'type', 'supports', 'quote']) {
      if (!isStr(s[k])) err(id, `${tag}.${k} missing`);
    }
    if (s.year != null && !Number.isInteger(s.year)) err(id, `${tag}.year must be an integer or omitted`);
    if (isStr(s.url)) {
      if (!/^https:\/\//.test(s.url) && !/^http:\/\//.test(s.url)) err(id, `${tag}.url must be http(s)`);
      if (/wikipedia\.org|wikimedia\.org|wikiwand|fandom\.com/.test(s.url)) err(id, `${tag}: Wikipedia/wiki mirrors are not acceptable sources`);
    }
    if (!SOURCE_TYPES.includes(s.type)) err(id, `${tag}.type must be one of ${SOURCE_TYPES.join(', ')}`);
    if (s.type !== 'reference' && s.type !== 'news') nonRef++;
    if (isStr(s.quote)) {
      const n = s.quote.split(/\s+/).length;
      if (n < 5) err(id, `${tag}.quote too short (${n} words; need 5–40 verbatim words)`);
      if (n > 45) err(id, `${tag}.quote too long (${n} words; keep to 40)`);
    }
  }
  if (nonRef < 1) err(id, 'needs at least one primary, scholarly or institutional source');
}

for (const file of files) {
  console.log(file.replace(/^.*content\//, 'content/'));
  let data;
  try { data = loadJson(file); } catch (e) { err(file, `invalid JSON: ${e.message}`); continue; }
  if (!Array.isArray(data)) { err(file, 'file must be a JSON array of entries'); continue; }
  for (const e of data) {
    const id = e.id || '(no id)';
    const p = planById.get(e.id);
    if (!p) { err(id, 'id not in content/plan.tsv'); continue; }
    if (seen.has(e.id)) err(id, `duplicate (also in ${seen.get(e.id)})`);
    seen.set(e.id, file);
    if (!isStr(e.title)) err(id, 'title missing');
    if (e.stream !== p.stream) err(id, `stream must be "${p.stream}" (per plan)`);
    if (!STREAMS.includes(e.stream)) err(id, 'unknown stream');
    if (e.tier !== p.tier) err(id, `tier must be ${p.tier} (per plan)`);

    const d = e.date || {};
    if (!isYear(d.year)) err(id, 'date.year must be a non-zero integer (negative = BCE)');
    if (!isStr(d.display)) err(id, 'date.display missing');
    for (const k of ['earliest', 'latest', 'end']) {
      if (d[k] != null && !isYear(d[k])) err(id, `date.${k} must be a year integer`);
    }
    if (d.earliest != null && d.earliest > d.year) err(id, 'date.earliest must be <= date.year');
    if (d.latest != null && d.latest < d.year) err(id, 'date.latest must be >= date.year');
    if (d.end != null && d.end < d.year) err(id, 'date.end must be >= date.year');
    if (d.traditional) {
      if (!isYear(d.traditional.year)) err(id, 'date.traditional.year invalid');
      if (!isStr(d.traditional.display)) err(id, 'date.traditional.display missing');
      if (!isStr(d.traditional.note)) err(id, 'date.traditional.note missing');
    }
    if (isYear(d.year) && Math.abs(d.year - p.year) > Math.max(60, Math.abs(p.year) * 0.25)) {
      warn(id, `date.year ${d.year} is far from the planned anchor ${p.year}; make sure that is intended`);
    }

    const c = e.confidence || {};
    if (!CONFIDENCE.includes(c.date)) err(id, `confidence.date must be one of ${CONFIDENCE.join(', ')}`);
    if (!CONFIDENCE.includes(c.claim)) err(id, `confidence.claim must be one of ${CONFIDENCE.join(', ')}`);
    if (!isStr(c.note)) err(id, 'confidence.note missing');
    if (['uncertain', 'disputed', 'legendary'].includes(c.date) && d.earliest == null && d.latest == null && !d.traditional) {
      warn(id, `date confidence is "${c.date}" but no earliest/latest bounds given`);
    }

    if (!isStr(e.place)) err(id, 'place missing');
    if (!Array.isArray(e.people)) err(id, 'people must be an array (may be empty)');
    if (!Array.isArray(e.themes) || e.themes.length < 1 || e.themes.length > 3) err(id, 'themes: 1–3 required');
    for (const t of e.themes || []) if (!THEMES.includes(t)) err(id, `unknown theme "${t}"`);
    if (!isStr(e.summary)) err(id, 'summary missing');
    else if (e.summary.length > 190) err(id, `summary too long (${e.summary.length} chars; max 190)`);

    if (!Array.isArray(e.body) || !e.body.every(isStr)) err(id, 'body must be an array of paragraph strings');
    else {
      const n = wordCount(e.body), [lo, hi] = WORDS[e.tier] || [0, 1e9];
      if (n < lo || n > hi) warn(id, `body is ${n} words; tier ${e.tier} target is ${lo}–${hi}`);
    }
    if (e.myth) {
      if (!isStr(e.myth.tradition) || !isStr(e.myth.record)) err(id, 'myth needs both "tradition" and "record"');
    }
    for (const l of e.links || []) {
      if (!planById.has(l.to)) err(id, `link target "${l.to}" not in plan`);
      if (l.to === e.id) err(id, 'self link');
      if (!LINK_KINDS.includes(l.kind)) err(id, `link kind must be one of ${LINK_KINDS.join(', ')}`);
    }
    validateSources(id, e.sources, MIN_SOURCES[e.tier] || 2);
    for (const f of e.further || []) if (!bib[f]) err(id, `further-reading key "${f}" not in bibliography.json`);
    if (e.image) {
      if (!/^File:.+\.(jpe?g|png|gif|tiff?|svg|webp)$/i.test(e.image.commons || '')) err(id, 'image.commons must look like "File:Name.jpg"');
      if (!isStr(e.image.alt)) err(id, 'image.alt missing');
      if (!isStr(e.image.caption)) err(id, 'image.caption missing');
    }
  }
}

if (checkCoverage) {
  const missing = plan.filter((p) => !seen.has(p.id));
  console.log(`\nCoverage: ${seen.size}/${plan.length} planned entries written.`);
  if (missing.length) console.log('Missing: ' + missing.map((m) => m.id).join(', '));
  for (const extra of ['ideas.json', 'transmissions.json']) {
    if (!existsSync(join(CONTENT, extra))) console.log(`Missing: content/${extra}`);
  }
}
console.log(`\n${errors} error(s), ${warnings} warning(s).`);
process.exit(errors ? 1 : 0);
