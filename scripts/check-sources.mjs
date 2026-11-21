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
let fetchCount = 0;

const sleep = (ms) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);

function fetchText(url) {
  if (cache.has(url)) return cache.get(url);
  // be polite, and give rate-limited sites a second and third chance
  let r = fetchOnce(url);
  for (let attempt = 1; attempt <= 2 && (r.code === 429 || r.code === 0 || r.code === 503); attempt++) {
    sleep(7000 * attempt);
    r = fetchOnce(url);
  }
  sleep(350);
  cache.set(url, r);
  return r;
}

function fetchOnce(url) {
  const out = join(tmp, `p${fetchCount++}`);
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
      // PubMed Central and PubMed rate-limit scripted readers with CAPTCHAs, but the same article text is
      // served by the Europe PMC and NCBI E-utilities APIs — so for those links, check the APIs first.
      let r = { code: 0, text: '' }, m = { ok: false, score: 0 };
      const pmc = /ncbi\.nlm\.nih\.gov\/.*(PMC\d+)/i.exec(s.url);
      const pmid = /pubmed\.ncbi\.nlm\.nih\.gov\/(\d+)/i.exec(s.url);
      const alts = pmc ? [
        `https://www.ebi.ac.uk/europepmc/webservices/rest/${pmc[1].toUpperCase()}/fullTextXML`,
        `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=pmc&id=${pmc[1].slice(3)}`,
      ] : pmid ? [
        `https://www.ebi.ac.uk/europepmc/webservices/rest/search?query=EXT_ID:${pmid[1]}%20AND%20SRC:MED&resultType=core&format=json`,
      ] : [];
      for (const alt of alts) {
        const r2 = fetchText(alt), m2 = quoteMatch(r2.text, s.quote || '');
        if (m2.ok) { r = { ...r2, code: 200 }; m = m2; break; }
        if (m2.score > m.score) m = { ...m2, ok: false };
      }
      if (!m.ok) {
        const r1 = fetchText(s.url), m1 = quoteMatch(r1.text, s.quote || '');
        if (m1.ok || !alts.length || m1.score >= m.score) { r = r1; m = m1; }
        else r = { ...r1, code: r1.code === 429 ? 200 : r1.code };
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
