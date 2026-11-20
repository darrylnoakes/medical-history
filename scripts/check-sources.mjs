#!/usr/bin/env node
// Fetch every cited URL and confirm the recorded verbatim quote really appears on the page.
// Usage: node scripts/check-sources.mjs <file.json ...> [--id entry-id] [--json report.json]
// Exit code 0 when every source is OK (or carries an explicit manualCheck note), 1 otherwise.
import { loadJson, normalise } from './lib-content.mjs';
import { execFileSync } from 'node:child_process';
import { writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const args = process.argv.slice(2);
const files = [], only = new Set();
let reportPath = null;
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--id') only.add(args[++i]);
  else if (args[i] === '--json') reportPath = args[++i];
  else files.push(args[i]);
}
if (!files.length) { console.error('usage: check-sources.mjs <file.json ...> [--id entry-id]'); process.exit(2); }

const UA = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36';
const tmp = mkdtempSync(join(tmpdir(), 'srccheck-'));
const cache = new Map();

function fetchText(url) {
  if (cache.has(url)) return cache.get(url);
  const out = join(tmp, `p${cache.size}`);
  let result;
  try {
    const meta = execFileSync('curl', [
      '-sS', '-L', '--compressed', '-m', '45', '--max-redirs', '8', '-A', UA,
      '-H', 'Accept: text/html,application/xhtml+xml,application/pdf;q=0.9,*/*;q=0.8',
      '-H', 'Accept-Language: en-US,en;q=0.9',
      '-o', out, '-w', '%{http_code} %{content_type}', url,
    ], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
    const [code, ...ct] = meta.trim().split(' ');
    const ctype = ct.join(' ');
    let text = '', raw = '';
    if (/pdf/i.test(ctype) || /\.pdf($|\?)/i.test(url)) {
      try { text = execFileSync('pdftotext', ['-q', out, '-'], { encoding: 'utf8', maxBuffer: 1 << 28 }); } catch { text = ''; }
    } else {
      raw = execFileSync('cat', [out], { encoding: 'utf8', maxBuffer: 1 << 28 });
      text = raw
        .replace(/<script[\s\S]*?<\/script>/gi, ' ')
        .replace(/<style[\s\S]*?<\/style>/gi, ' ')
        .replace(/<[^>]+>/g, ' ');
    }
    const captcha = /recaptcha|captcha-delivery|cf-challenge|Just a moment\.\.\./i.test(raw) && raw.length < 60000;
    result = { code: captcha && Number(code) < 300 ? 429 : Number(code), text: captcha ? '' : normalise(text) };
  } catch (e) {
    result = { code: 0, text: '', error: String(e.stderr || e.message).trim().split('\n').pop() };
  }
  cache.set(url, result);
  return result;
}

/** Exact normalised match, else tolerate small gaps: the longest run of consecutive quote words found. */
function quoteMatch(pageText, quote) {
  const q = normalise(quote);
  if (!q) return { ok: false, score: 0 };
  if (pageText.includes(q)) return { ok: true, score: 1 };
  const words = q.split(' ');
  let best = 0;
  for (let i = 0; i < words.length; i++) {
    for (let j = words.length; j > i + best; j--) {
      if (pageText.includes(words.slice(i, j).join(' '))) { best = j - i; break; }
    }
  }
  const score = best / words.length;
  return { ok: score >= 0.8 && best >= 5, score };
}

const report = [];
let bad = 0, total = 0;
for (const file of files) {
  const data = loadJson(file);
  const items = Array.isArray(data) ? data : [];
  for (const e of items) {
    if (only.size && !only.has(e.id)) continue;
    for (const [i, s] of (e.sources || []).entries()) {
      total++;
      let r = fetchText(s.url);
      let m = quoteMatch(r.text, s.quote || '');
      // PubMed Central rate-limits scripted readers with a CAPTCHA; the same article text is
      // available from the Europe PMC and NCBI E-utilities APIs, so check against those instead.
      const pmc = /ncbi\.nlm\.nih\.gov\/.*(PMC\d+)/i.exec(s.url);
      if (pmc && !m.ok) {
        for (const alt of [
          `https://www.ebi.ac.uk/europepmc/webservices/rest/${pmc[1].toUpperCase()}/fullTextXML`,
          `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=pmc&id=${pmc[1].slice(3)}`,
        ]) {
          const r2 = fetchText(alt), m2 = quoteMatch(r2.text, s.quote || '');
          if (m2.ok) { r = { ...r2, code: 200 }; m = m2; break; }
          if (m2.score > m.score) m = { ...m2, ok: false };
        }
      }
      let status;
      if (r.code >= 200 && r.code < 300 && m.ok) status = 'OK';
      else if (r.code >= 200 && r.code < 300) status = `QUOTE_NOT_FOUND (best run ${(m.score * 100).toFixed(0)}%)`;
      else status = `HTTP_${r.code}${r.error ? ' ' + r.error : ''}`;
      if (status !== 'OK' && s.manualCheck) status = `MANUAL (${status}) — ${s.manualCheck}`;
      const okish = status === 'OK' || status.startsWith('MANUAL');
      if (!okish) bad++;
      report.push({ id: e.id, index: i, url: s.url, status });
      console.log(`${okish ? (status === 'OK' ? 'ok    ' : 'manual') : 'FAIL  '} ${e.id} [${i}] ${status === 'OK' ? '' : status + ' '}${s.url}`);
    }
  }
}
if (reportPath) writeFileSync(reportPath, JSON.stringify(report, null, 2));
console.log(`\n${total - bad}/${total} sources verified${bad ? `, ${bad} FAILED` : ''}.`);
process.exit(bad ? 1 : 0);
