import { useMemo, useRef, useState } from 'preact/hooks';
import {
  content, filterActive, filtersOpen, intro, legendOpen, openPage, select, showFlows, showIdeas, tourStep, tradition,
} from '../store';
import { STREAM_BY_ID } from '../river/streams';
import { Icon } from './bits';
import type { Target } from '../river/controller';

interface Hit { target: Target; title: string; sub: string; color?: string; score: number }

function useSearch(q: string): Hit[] {
  const c = content.value;
  const index = useMemo(() => {
    if (!c) return [];
    const norm = (s: string) => s.normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase();
    return [
      ...c.entries.map((e) => ({
        target: { kind: 'entry', id: e.id } as Target, title: e.title, sub: e.date.display,
        color: STREAM_BY_ID.get(e.stream)?.color, tier: e.tier,
        t: norm(e.title), p: norm(e.people.join(' ') + ' ' + e.place), b: norm(e.summary + ' ' + e.body.join(' ')),
      })),
      ...c.ideas.map((i) => ({
        target: { kind: 'idea', id: i.id } as Target, title: i.name, sub: 'Current of belief', color: undefined, tier: 1,
        t: norm(i.name), p: '', b: norm(i.summary + ' ' + i.body.join(' ')),
      })),
      ...c.transmissions.map((f) => ({
        target: { kind: 'flow', id: f.id } as Target, title: f.title, sub: `Confluence · ${f.display}`, color: undefined, tier: 2,
        t: norm(f.title), p: '', b: norm(f.summary + ' ' + f.body.join(' ')),
      })),
    ];
  }, [c]);
  return useMemo(() => {
    const words = q.normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase().split(/\s+/).filter((w) => w.length > 1);
    if (!words.length) return [];
    const out: Hit[] = [];
    for (const it of index) {
      let score = 0, all = true;
      for (const w of words) {
        const inT = it.t.includes(w), inP = it.p.includes(w), inB = it.b.includes(w);
        if (!inT && !inP && !inB) { all = false; break; }
        score += (inT ? (it.t.startsWith(w) || it.t.includes(' ' + w) ? 12 : 8) : 0) + (inP ? 5 : 0) + (inB ? 1 : 0);
      }
      if (all) out.push({ target: it.target, title: it.title, sub: it.sub, color: it.color, score: score + (4 - it.tier) });
    }
    return out.sort((a, b) => b.score - a.score).slice(0, 9);
  }, [q, index]);
}

function Search() {
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [cursor, setCursor] = useState(0);
  const hits = useSearch(q);
  const input = useRef<HTMLInputElement>(null);
  const go = (h: Hit) => { select(h.target); intro.value = false; setOpen(false); setQ(''); input.current?.blur(); };
  return (
    <div class="search" role="search">
      <Icon name="search" />
      <input
        ref={input} id="search-input" type="search" placeholder="Search people, ideas, diseases…" autocomplete="off" spellcheck={false}
        aria-label="Search the timeline" value={q}
        onInput={(e) => { setQ((e.target as HTMLInputElement).value); setOpen(true); setCursor(0); }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') { e.preventDefault(); setCursor((c) => Math.min(hits.length - 1, c + 1)); }
          else if (e.key === 'ArrowUp') { e.preventDefault(); setCursor((c) => Math.max(0, c - 1)); }
          else if (e.key === 'Enter' && hits[cursor]) go(hits[cursor]);
          else if (e.key === 'Escape') { setQ(''); input.current?.blur(); }
          e.stopPropagation();
        }}
      />
      {open && q.trim().length > 1 && (
        <ul class="search-results" role="listbox">
          {hits.length === 0 && <li class="none">Nothing found for “{q}”.</li>}
          {hits.map((h, i) => (
            <li key={h.target.kind + h.target.id} role="option" aria-selected={i === cursor}>
              <button class={i === cursor ? 'on' : ''} onMouseDown={(e) => { e.preventDefault(); go(h); }} onMouseEnter={() => setCursor(i)}>
                <span class="swatch" style={{ background: h.color ?? '#2a2420' }} />
                <span class="sr-title">{h.title}</span>
                <span class="sr-sub">{h.sub}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function Header() {
  const [menu, setMenu] = useState(false);
  const close = () => setMenu(false);
  return (
    <header class="topbar">
      <button class="brand" onClick={() => { intro.value = true; select(null); }} aria-label="Confluence — about this map">
        <span class="brand-name">Confluence</span>
        <span class="brand-sub">a river map of medical history</span>
      </button>
      <Search />
      <button class="icon-btn menu-btn" aria-label="Menu" aria-expanded={menu} onClick={() => setMenu(!menu)}><Icon name={menu ? 'x' : 'menu'} /></button>
      <nav class={`controls ${menu ? 'open' : ''}`} aria-label="Map controls">
        <div class="seg" role="group" aria-label="Whose dates">
          <button class={!tradition.value ? 'on' : ''} aria-pressed={!tradition.value} onClick={() => { tradition.value = false; }} title="Place everything where the evidence puts it">Record</button>
          <button class={tradition.value ? 'on' : ''} aria-pressed={tradition.value} onClick={() => { tradition.value = true; }} title="Move legendary and traditionally dated items to where tradition puts them">Tradition</button>
        </div>
        <button class={`toggle ${showIdeas.value ? 'on' : ''}`} aria-pressed={showIdeas.value} onClick={() => { showIdeas.value = !showIdeas.value; }} title="Long-lived beliefs and practices, drawn as lines inside the streams">Currents</button>
        <button class={`toggle ${showFlows.value ? 'on' : ''}`} aria-pressed={showFlows.value} onClick={() => { showFlows.value = !showFlows.value; }} title="Where knowledge passed from one tradition to another">Confluences</button>
        <button class={`toggle ${filterActive.value ? 'on warn' : ''}`} aria-expanded={filtersOpen.value} onClick={() => { filtersOpen.value = !filtersOpen.value; legendOpen.value = false; close(); }}>
          <Icon name="filter" /> Filter
        </button>
        <span class="sep" />
        <button class="navlink" onClick={() => { tourStep.value = 0; intro.value = false; close(); }}>Tour</button>
        <button class="navlink" onClick={() => { openPage('index'); close(); }}>Index</button>
        <button class="navlink" onClick={() => { openPage('sources'); close(); }}>Sources</button>
        <button class="navlink" onClick={() => { openPage('about'); close(); }}>About</button>
      </nav>
    </header>
  );
}
