import { useMemo, useState } from 'preact/hooks';
import type { Confidence, Entry } from '../types';
import { content, openPage, page, select } from '../store';
import { CONFIDENCE_LABELS, STREAM_BY_ID } from '../river/streams';
import { Glyph, Icon, SourceList, hostOf } from './bits';

const CONFS: Confidence[] = ['firm', 'agreed', 'uncertain', 'disputed', 'legendary'];

function Shell({ title, children }: { title: string; children: preact.ComponentChildren }) {
  return (
    <div class="page" role="dialog" aria-modal="true" aria-label={title}>
      <div class="page-inner">
        <button class="icon-btn page-close" aria-label="Back to the map" onClick={() => openPage(null)}><Icon name="x" /></button>
        <nav class="page-tabs" aria-label="Sections">
          {(['index', 'sources', 'about'] as const).map((p) => (
            <button key={p} class={page.value === p ? 'on' : ''} onClick={() => openPage(p)}>{p === 'index' ? 'Index' : p === 'sources' ? 'Sources' : 'About'}</button>
          ))}
          <button onClick={() => openPage(null)}>← Back to the map</button>
        </nav>
        {children}
      </div>
    </div>
  );
}

const ERAS: [string, number, number][] = [
  ['Before writing', -Infinity, -3000],
  ['The first written medicine · 3000–500 BCE', -3000, -500],
  ['Classical systems · 500 BCE–500 CE', -500, 500],
  ['Translation and synthesis · 500–1400', 500, 1400],
  ['Print, anatomy and experiment · 1400–1800', 1400, 1800],
  ['The nineteenth century', 1800, 1900],
  ['1900–1950', 1900, 1950],
  ['1950–2000', 1950, 2000],
  ['The twenty-first century', 2000, Infinity],
];

function IndexPage() {
  const [q, setQ] = useState('');
  const entries = content.value?.entries ?? [];
  const list = useMemo(() => {
    const w = q.trim().toLowerCase();
    return w ? entries.filter((e) => (e.title + ' ' + e.people.join(' ') + ' ' + e.place + ' ' + e.summary).toLowerCase().includes(w)) : entries;
  }, [q, entries]);
  const open = (e: Entry) => { openPage(null); select({ kind: 'entry', id: e.id }); };
  return (
    <Shell title="Index">
      <h1>Index</h1>
      <p class="page-lede">Every entry on the map, in order of time. The two marks beside each show how sure we are of <em>when</em> and of <em>what</em>.</p>
      <input class="page-filter" type="search" placeholder="Filter by name, person or place…" value={q} onInput={(e) => setQ((e.target as HTMLInputElement).value)} aria-label="Filter the index" />
      {ERAS.map(([name, a, b]) => {
        const rows = list.filter((e) => e.date.year >= a && e.date.year < b);
        if (!rows.length) return null;
        return (
          <section key={name} class="index-era">
            <h2>{name}</h2>
            <ul class="index-list">
              {rows.map((e) => (
                <li key={e.id}>
                  <button onClick={() => open(e)} class={`t${e.tier}`}>
                    <span class="ix-date">{e.date.display}</span>
                    <span class="ix-title"><span class="swatch" style={{ background: STREAM_BY_ID.get(e.stream)!.color }} />{e.title}</span>
                    <span class="ix-conf" title={`When: ${CONFIDENCE_LABELS[e.confidence.date].label}. What: ${CONFIDENCE_LABELS[e.confidence.claim].label}.`}>
                      <Glyph conf={e.confidence.date} size={13} /><Glyph conf={e.confidence.claim} size={13} />
                    </span>
                    <span class="ix-sum">{e.summary}</span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </Shell>
  );
}

function SourcesPage() {
  const c = content.value;
  if (!c) return null;
  const groups = [
    ...c.entries.filter((e) => !e.stub).map((e) => ({ id: e.id, kind: 'entry' as const, title: e.title, when: e.date.display, sources: e.sources })),
    ...c.ideas.map((i) => ({ id: i.id, kind: 'idea' as const, title: `${i.name} (current)`, when: i.born.display, sources: i.sources })),
    ...c.transmissions.map((f) => ({ id: f.id, kind: 'flow' as const, title: `${f.title} (confluence)`, when: f.display, sources: f.sources })),
  ];
  const all = groups.flatMap((g) => g.sources);
  const hosts = new Map<string, number>();
  for (const s of all) hosts.set(hostOf(s.url), (hosts.get(hostOf(s.url)) ?? 0) + 1);
  const top = [...hosts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 14);
  const byType = (t: string) => all.filter((s) => s.type === t).length;
  return (
    <Shell title="Sources">
      <h1>Sources</h1>
      <p class="page-lede">
        {all.length.toLocaleString('en-US')} citations to {hosts.size.toLocaleString('en-US')} different sites: {byType('scholarly')} works of scholarship,{' '}
        {byType('institutional')} pages from museums, libraries and official bodies, {byType('primary')} primary sources,{' '}
        {byType('reference')} reference works and {byType('news')} pieces of journalism. Every one records the exact passage relied on.
      </p>
      <p class="hosts">Most cited: {top.map(([h, n]) => `${h} (${n})`).join(' · ')}</p>
      {groups.map((g) => (
        <section key={g.kind + g.id} class="src-group">
          <h2><button onClick={() => { openPage(null); select({ kind: g.kind, id: g.id }); }}>{g.title}</button> <small>{g.when}</small></h2>
          <SourceList sources={g.sources} />
        </section>
      ))}
      <h2 class="bib-h">Further reading</h2>
      <ul class="bib">{Object.values(c.bibliography).sort().map((b) => <li key={b}>{b}</li>)}</ul>
    </Shell>
  );
}

function AboutPage() {
  const c = content.value;
  if (!c) return null;
  const written = c.entries.filter((e) => !e.stub);
  const nSrc = written.reduce((a, e) => a + e.sources.length, 0) + c.ideas.reduce((a, e) => a + e.sources.length, 0) + c.transmissions.reduce((a, e) => a + e.sources.length, 0);
  const count = (k: 'date' | 'claim', v: Confidence) => written.filter((e) => e.confidence[k] === v).length;
  const withImg = written.filter((e) => e.image?.src);
  const manual = [...written, ...c.ideas, ...c.transmissions].flatMap((e) => e.sources).filter((s) => s.manualCheck).length;
  return (
    <Shell title="About">
      <h1>About this map</h1>
      <p class="page-lede">
        Confluence is an experiment in drawing the history of medicine honestly: as many traditions rather than one,
        and with the uncertainty left in rather than tidied away.
      </p>

      <h2>Why a river</h2>
      <p>
        The usual timeline of medicine is a single line of European firsts. But for most of history the world’s most
        sophisticated medicine was being written in Greek, then Arabic, Sanskrit or Chinese, and ideas travelled between
        them constantly. A river shows that: streams that rise separately, tributaries where knowledge crossed over, and,
        from the nineteenth century, a delta as laboratory medicine fans out into specialisms and spreads worldwide while
        older traditions run on beside it.
      </p>
      <p>
        The time axis is deliberately warped. Fifty thousand years of prehistory are squeezed into a sliver and the last
        two centuries are stretched wide, so that what can actually be said about each period gets roughly equal room.
        Stream widths are a drawing, not a measurement: a thin, faint stream means a thin written record.
      </p>

      <h2>How sure are we?</h2>
      <p>Each entry is rated twice — how well we know <em>when</em> it happened, and how well we know <em>what</em> happened — on the same five-step scale, with a note explaining the rating.</p>
      <table class="conf-table">
        <thead><tr><th></th><th>Meaning</th><th>When</th><th>What</th></tr></thead>
        <tbody>
          {CONFS.map((k) => (
            <tr key={k}>
              <th><Glyph conf={k} size={16} /> {CONFIDENCE_LABELS[k].label}</th>
              <td>{CONFIDENCE_LABELS[k].gloss}</td>
              <td>{count('date', k)}</td>
              <td>{count('claim', k)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p>
        Where a date is not firm, the entry records the earliest and latest years a careful scholar would accept, and the
        map draws that range as a smear. Where tradition gives a different date from the evidence — a text credited to a
        mythical emperor, say — the map draws a ghost at the traditional date, and the <strong>Record / Tradition</strong>{' '}
        switch lets you see the river as tradition tells it. Where a famous story is wrong or unproven, the entry says
        so in an “Often said / What the record supports” box.
      </p>
      <p>These ratings are editorial judgements, made from the sources cited. They are meant to be argued with.</p>

      <h2>How it was made and checked</h2>
      <p>
        This site was researched, written and built by Claude, an AI model made by Anthropic, working as a team of
        research agents under one editor, for Darryl Noakes. No human historian has reviewed it. That makes the checking
        process matter, so here it is in full:
      </p>
      <ol class="method">
        <li><strong>Sources had to be opened.</strong> Every claim was to be written from pages the researcher actually opened during the work, not from memory. Wikipedia and unsourced sites were not accepted as sources.</li>
        <li><strong>Every citation carries a verbatim passage.</strong> For each of the {nSrc.toLocaleString('en-US')} citations, the researcher recorded the exact words on the page that support the claim. You can see them under “Checked passage” on any source.</li>
        <li><strong>A script re-read every page.</strong> An automated checker fetched each cited address again and searched it for the recorded passage. A citation only counts as verified if the passage is really there.{manual > 0 ? ` ${manual} citation${manual === 1 ? '' : 's'} could not be machine-checked (scanned documents, or sites that turn away automated readers); ${manual === 1 ? 'it was' : 'they were'} checked against a saved copy instead and ${manual === 1 ? 'is' : 'are'} marked “Checked by hand”.` : ''}</li>
        <li><strong>A second, independent pass.</strong> A different agent then re-read each entry against its sources, looking for dates, numbers and names that the sources did not support, and for overclaiming.</li>
      </ol>
      <p>
        What this does <em>not</em> guarantee: that the sources themselves are right, that the best source was chosen,
        or that a specialist would weigh the evidence the same way. Summaries compress, and compression loses nuance.
        Treat this as a well-referenced starting point, follow the links, and trust the sources over the summary.
        This is history, not medical advice.
      </p>

      <h2>What is left out</h2>
      <p>
        {written.length} entries cannot hold the history of medicine. The selection leans toward what left written
        records, and toward what later proved influential. Oral traditions, everyday domestic healing, nursing and
        midwifery, veterinary medicine and most of the history of individual diseases are badly under-represented.
        The “Sub-Saharan Africa” and “Americas” streams in particular show only what outsiders happened to write down.
      </p>

      <h2>Images</h2>
      <p>
        The {withImg.length} images come from Wikimedia Commons and are in the public domain or under Creative Commons
        licences; each is credited beside the picture with a link to its file page. Licence information was read
        from Commons automatically when the site was built.
      </p>

      <h2>Colophon</h2>
      <p>
        Set in Newsreader and IBM Plex Sans. The map is drawn on an HTML canvas; there is no tracking and no server.
        The code and all content, including the editorial guide the researchers worked to, are on{' '}
        <a href="https://github.com/darrylnoakes/medical-history" target="_blank" rel="noopener noreferrer">GitHub</a>.
        Content last built {c.built}.
      </p>
    </Shell>
  );
}

export function Pages() {
  switch (page.value) {
    case 'index': return <IndexPage />;
    case 'sources': return <SourcesPage />;
    case 'about': return <AboutPage />;
    default: return null;
  }
}
