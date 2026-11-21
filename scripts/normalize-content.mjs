#!/usr/bin/env node
// Housekeeping over all content files: reader-facing PubMed Central links instead of API URLs.
// (The source checker falls back to the Europe PMC / NCBI APIs automatically for PMC links.)
import { entryFiles, CONTENT } from './lib-content.mjs';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const files = [...entryFiles(), join(CONTENT, 'ideas.json'), join(CONTENT, 'transmissions.json')].filter(existsSync);
let changed = 0;
for (const f of files) {
  const before = readFileSync(f, 'utf8');
  const after = before
    .replace(/https:\/\/www\.ebi\.ac\.uk\/europepmc\/webservices\/rest\/(PMC\d+)\/fullTextXML/g, 'https://pmc.ncbi.nlm.nih.gov/articles/$1/')
    .replace(/https:\/\/europepmc\.org\/(?:article\/PMC|articles)\/(PMC\d+)\/?(?=")/gi, 'https://pmc.ncbi.nlm.nih.gov/articles/$1/')
    .replace(/https?:\/\/www\.ncbi\.nlm\.nih\.gov\/pmc\/articles\/(PMC\d+)\/?(?=")/g, 'https://pmc.ncbi.nlm.nih.gov/articles/$1/');
  if (after !== before) { writeFileSync(f, after); changed++; }
}
console.log(`normalised ${changed} file(s)`);

// Citations given as Europe PMC *search API* URLs (used when PubMed blocked the writer) become
// ordinary PubMed links. Where one API URL covered several abstracts, find the one holding the quote.
import { execFileSync } from 'node:child_process';
import { normalise } from './lib-content.mjs';
const api = (pmid) => `https://www.ebi.ac.uk/europepmc/webservices/rest/search?query=EXT_ID:${pmid}%20AND%20SRC:MED&resultType=core&format=json`;
const get = (url) => { try { return execFileSync('curl', ['-sS', '-L', '-m', '40', url], { encoding: 'utf8', maxBuffer: 1 << 26 }); } catch { return ''; } };
let fixed = 0, unresolved = 0;
for (const f of files) {
  const data = JSON.parse(readFileSync(f, 'utf8'));
  let touched = false;
  for (const item of data) for (const s of item.sources || []) {
    if (!/europepmc\/webservices\/rest\/search\?/.test(s.url)) continue;
    const pmids = [...s.url.matchAll(/EXT_ID:(\d+)/g)].map((m) => m[1]);
    let pick = pmids.length === 1 ? pmids[0] : null;
    if (!pick) {
      const q = normalise(s.quote || '');
      for (const id of pmids) { if (normalise(get(api(id))).includes(q)) { pick = id; break; } }
    }
    if (pick) { s.url = `https://pubmed.ncbi.nlm.nih.gov/${pick}/`; fixed++; touched = true; }
    else { unresolved++; console.log(`  unresolved API citation in ${item.id}: ${s.url}`); }
  }
  if (touched) writeFileSync(f, JSON.stringify(data, null, 2) + '\n');
}
console.log(`converted ${fixed} API citation(s) to PubMed links${unresolved ? `, ${unresolved} unresolved` : ''}`);
