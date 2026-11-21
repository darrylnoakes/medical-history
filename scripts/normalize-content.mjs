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
