#!/usr/bin/env node
// Compile content/ into src/generated/content.json for the app.
// Planned entries that have not been written yet are emitted as stubs (dev only);
// pass --strict to fail the build if anything is missing.
import { loadPlan, loadJson, entryFiles, CONTENT, ROOT } from './lib-content.mjs';
import { join } from 'node:path';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';

const strict = process.argv.includes('--strict');
const plan = loadPlan();
const written = new Map();
for (const f of entryFiles()) {
  try {
    for (const e of loadJson(f)) if (e && e.id) written.set(e.id, e);
  } catch (e) {
    console.warn(`skipping unreadable ${f}: ${e.message}`);
  }
}

const manifestPath = join(ROOT, 'public', 'img', 'manifest.json');
const images = existsSync(manifestPath) ? loadJson(manifestPath) : {};

const fmtYear = (y) => (y < 0 ? `${-y} BCE` : `${y}`);
const entries = [];
let stubs = 0;
for (const p of plan) {
  const e = written.get(p.id);
  if (e) {
    const out = { ...e };
    // keep verbatim quotes out of the bundle only if absent; they are shown in the sources list
    if (out.image) {
      const m = images[p.id];
      if (m) out.image = { ...out.image, ...m };
      else delete out.image; // no verified licence → no image
    }
    entries.push(out);
  } else {
    stubs++;
    entries.push({
      id: p.id, title: p.title, stream: p.stream, tier: p.tier, stub: true,
      date: { year: p.year, display: fmtYear(p.year) },
      confidence: { date: 'agreed', claim: 'agreed', note: 'Not yet written.' },
      place: '', people: [], themes: [], summary: p.notes || '', body: [], links: [], sources: [], further: [],
    });
  }
}
entries.sort((a, b) => a.date.year - b.date.year);

const readOpt = (name, fallback) => {
  const p = join(CONTENT, name);
  if (!existsSync(p)) return fallback;
  try { return loadJson(p); } catch (e) { console.warn(`skipping unreadable ${name}: ${e.message}`); return fallback; }
};
const ideas = readOpt('ideas.json', []);
const transmissions = readOpt('transmissions.json', []);
const bibliography = loadJson(join(CONTENT, 'bibliography.json'));

if (strict && stubs) {
  console.error(`${stubs} planned entries are not written yet.`);
  process.exit(1);
}

const outDir = join(ROOT, 'src', 'generated');
mkdirSync(outDir, { recursive: true });
writeFileSync(
  join(outDir, 'content.json'),
  JSON.stringify({ entries, ideas, transmissions, bibliography, built: new Date().toISOString().slice(0, 10) }),
);
const nSources = entries.reduce((n, e) => n + (e.sources?.length || 0), 0);
console.log(`content: ${entries.length - stubs} entries (${stubs} stubs), ${ideas.length} ideas, ${transmissions.length} transmissions, ${nSources} sources, ${Object.keys(images).length} images`);
