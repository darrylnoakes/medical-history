#!/usr/bin/env node
// Download entry images from Wikimedia Commons, verify their licences, and write
// public/img/<id>.webp plus public/img/manifest.json (credit, licence, dimensions).
// Resumable: entries already in the manifest with the same Commons file are skipped.
// Usage: node scripts/fetch-images.mjs [--force id ...]
import { entryFiles, loadJson, ROOT } from './lib-content.mjs';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';

const OUT = join(ROOT, 'public', 'img');
mkdirSync(OUT, { recursive: true });
const manifestPath = join(OUT, 'manifest.json');
const manifest = existsSync(manifestPath) ? loadJson(manifestPath) : {};
const force = new Set(process.argv.slice(2).filter((a) => !a.startsWith('--')));
const UA = 'ConfluenceTimeline/1.0 (educational history-of-medicine site; image attribution fetch)';
const OK_LICENCE = /^(public domain|pd\b|pd-|cc0|cc[ -]by([ -]sa)?([ -]\d|$)|no restrictions|attribution|copyrighted free use|cc-pd|cc pdm)/i;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function curl(args) {
  return execFileSync('curl', ['-sS', '-L', '--compressed', '-m', '90', '-A', UA, ...args], { maxBuffer: 1 << 28 });
}
const strip = (html) => (html || '')
  .replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#0?39;/g, "'").replace(/&nbsp;/g, ' ')
  .replace(/\s+/g, ' ').trim();

async function info(title) {
  const url = 'https://commons.wikimedia.org/w/api.php?action=query&format=json&prop=imageinfo&iiprop=extmetadata%7Curl%7Csize%7Cmime&iiurlwidth=1280&titles=' + encodeURIComponent(title);
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const j = JSON.parse(curl([url]).toString('utf8'));
      const page = Object.values(j.query.pages)[0];
      if (page.missing !== undefined || !page.imageinfo) return { missing: true };
      return page.imageinfo[0];
    } catch (e) {
      await sleep(4000 * (attempt + 1));
    }
  }
  return { failed: true };
}

const report = { ok: [], skipped: [], rejected: [], missing: [], failed: [] };
const wanted = [];
for (const f of entryFiles()) for (const e of loadJson(f)) if (e.image?.commons) wanted.push(e);

for (const e of wanted) {
  const have = manifest[e.id];
  if (have && have.commons === e.image.commons && existsSync(join(ROOT, 'public', have.src)) && !force.has(e.id)) { report.skipped.push(e.id); continue; }
  const ii = await info(e.image.commons);
  await sleep(1200);
  if (ii.missing) { report.missing.push(`${e.id}: ${e.image.commons}`); continue; }
  if (ii.failed) { report.failed.push(`${e.id}: API`); continue; }
  const md = ii.extmetadata || {};
  const licence = strip(md.LicenseShortName?.value);
  if (!OK_LICENCE.test(licence)) { report.rejected.push(`${e.id}: ${e.image.commons} — licence "${licence}"`); continue; }
  const tmp = join(OUT, `.${e.id}.download`);
  let done = false;
  for (let attempt = 0; attempt < 4 && !done; attempt++) {
    try {
      const src = ii.thumburl || ii.url;
      const buf = curl([src]);
      writeFileSync(tmp, buf);
      const img = sharp(tmp, { failOn: 'none' }).rotate().resize({ width: 1000, height: 1300, fit: 'inside', withoutEnlargement: true });
      const outFile = join(OUT, `${e.id}.webp`);
      const meta = await img.webp({ quality: 72 }).toFile(outFile);
      const short = (t) => (t.length > 110 ? t.slice(0, 107).replace(/\s+\S*$/, '') + '…' : t);
      const artist = short(strip(md.Artist?.value));
      const credit = short(strip(md.Credit?.value).replace(/^https?:\/\/\S+\s*/, ''));
      manifest[e.id] = {
        commons: e.image.commons,
        src: `/img/${e.id}.webp`,
        width: meta.width,
        height: meta.height,
        credit: (artist && !/^unknown/i.test(artist) ? artist : '') || credit || artist || 'Wikimedia Commons contributor',
        license: licence,
        licenseUrl: md.LicenseUrl?.value || '',
        page: ii.descriptionurl,
      };
      writeFileSync(manifestPath, JSON.stringify(manifest, null, 1));
      report.ok.push(e.id);
      done = true;
    } catch (err) {
      await sleep(5000 * (attempt + 1));
    }
  }
  if (existsSync(tmp)) rmSync(tmp);
  if (!done) report.failed.push(`${e.id}: download/convert`);
  await sleep(1500);
}

// drop manifest rows whose entry no longer asks for that image
const want = new Map(wanted.map((e) => [e.id, e.image.commons]));
for (const id of Object.keys(manifest)) {
  if (want.get(id) !== manifest[id].commons) { delete manifest[id]; const f = join(OUT, `${id}.webp`); if (existsSync(f)) rmSync(f); }
}
writeFileSync(manifestPath, JSON.stringify(manifest, null, 1));
console.log(`images: ${report.ok.length} fetched, ${report.skipped.length} already present, ${report.rejected.length} rejected, ${report.missing.length} missing, ${report.failed.length} failed`);
for (const k of ['rejected', 'missing', 'failed']) for (const line of report[k]) console.log(`  ${k}: ${line}`);
