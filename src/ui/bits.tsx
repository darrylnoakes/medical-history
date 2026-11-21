import type { ComponentChildren } from 'preact';
import type { Confidence, Source } from '../types';
import { CONFIDENCE_LABELS } from '../river/streams';
import { content } from '../store';

/** The same five glyphs the map draws, as inline SVG. */
export function Glyph({ conf, size = 14, color = 'currentColor' }: { conf: Confidence; size?: number; color?: string }) {
  const id = `fog-${conf}-${size}`;
  return (
    <svg class="glyph" width={size} height={size} viewBox="-10 -10 20 20" aria-hidden="true">
      {conf === 'firm' && <circle r="6.5" fill={color} />}
      {conf === 'agreed' && (<><circle r="7.6" fill={color} opacity="0.3" /><circle r="4.6" fill={color} /></>)}
      {conf === 'uncertain' && (
        <>
          <defs>
            <radialGradient id={id}>
              <stop offset="0" stop-color={color} stop-opacity="1" />
              <stop offset="0.3" stop-color={color} stop-opacity="0.95" />
              <stop offset="1" stop-color={color} stop-opacity="0" />
            </radialGradient>
          </defs>
          <circle r="10" fill={`url(#${id})`} />
        </>
      )}
      {conf === 'disputed' && (<><circle r="5.6" fill="none" stroke={color} stroke-width="1.8" /><path d="M0 -6.5 A6.5 6.5 0 0 0 0 6.5 Z" fill={color} /></>)}
      {conf === 'legendary' && <circle r="5.8" fill="none" stroke={color} stroke-width="1.7" stroke-dasharray="3.2 3.2" />}
    </svg>
  );
}

export function ConfChip({ label, conf }: { label: string; conf: Confidence }) {
  return (
    <span class={`conf-chip c-${conf}`} title={CONFIDENCE_LABELS[conf].gloss}>
      <Glyph conf={conf} size={15} />
      <span class="conf-k">{label}</span>
      <span class="conf-v">{CONFIDENCE_LABELS[conf].label}</span>
    </span>
  );
}

/** Body text: *asterisks* become italics. Nothing else is interpreted. */
export function Rich({ text }: { text: string }) {
  const parts = text.split(/(\*[^*\n]+\*)/g);
  return <>{parts.map((p, i) => (p.length > 2 && p.startsWith('*') && p.endsWith('*') ? <em key={i}>{p.slice(1, -1)}</em> : p))}</>;
}

const TYPE_LABEL: Record<Source['type'], string> = {
  primary: 'Primary source',
  scholarly: 'Scholarship',
  institutional: 'Institution',
  reference: 'Reference work',
  news: 'Journalism',
};

export function hostOf(url: string) {
  try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return url; }
}

export function SourceList({ sources }: { sources: Source[] }) {
  return (
    <ol class="sources">
      {sources.map((s, i) => (
        <li key={i}>
          <a href={s.url} target="_blank" rel="noopener noreferrer">{s.title}</a>
          <span class="src-meta">
            {s.author ? `${s.author}. ` : ''}{s.publisher}{s.year ? `, ${s.year}` : ''}
            <span class={`src-type s-${s.type}`}>{TYPE_LABEL[s.type]}</span>
          </span>
          <span class="src-supports"><Rich text={s.supports} /></span>
          <details class="src-quote">
            <summary>Checked passage</summary>
            <blockquote>“{s.quote}”</blockquote>
            <span class="src-host">{s.manualCheck ? `Checked by hand, not by script. ${s.manualCheck}` : `Found verbatim on ${hostOf(s.url)} when this page was built.`}</span>
          </details>
        </li>
      ))}
    </ol>
  );
}

export function Further({ keys }: { keys?: string[] }) {
  const bib = content.value?.bibliography ?? {};
  const items = (keys ?? []).map((k) => bib[k]).filter(Boolean);
  if (!items.length) return null;
  return (
    <div class="further">
      <h3>Further reading</h3>
      <ul>{items.map((b) => <li key={b}>{b}</li>)}</ul>
      <p class="fineprint">Standard books on the subject, listed for readers who want more. They were not used to check this text.</p>
    </div>
  );
}

export function Icon({ name }: { name: 'x' | 'search' | 'plus' | 'minus' | 'home' | 'menu' | 'left' | 'right' | 'filter' | 'layers' | 'ext' }) {
  const d: Record<string, ComponentChildren> = {
    x: <path d="M5 5l14 14M19 5L5 19" />,
    search: <><circle cx="10.5" cy="10.5" r="6.5" /><path d="M15.5 15.5L21 21" /></>,
    plus: <path d="M12 5v14M5 12h14" />,
    minus: <path d="M5 12h14" />,
    home: <path d="M4 12h16M4 12l4-4M4 12l4 4M20 12l-4-4M20 12l-4 4" />,
    menu: <path d="M4 7h16M4 12h16M4 17h16" />,
    left: <path d="M15 5l-7 7 7 7" />,
    right: <path d="M9 5l7 7-7 7" />,
    filter: <path d="M4 6h16M7 12h10M10 18h4" />,
    layers: <path d="M12 4l9 5-9 5-9-5 9-5zM3 14l9 5 9-5" />,
    ext: <path d="M14 5h5v5M19 5l-8 8M11 7H6v11h11v-5" />,
  };
  return (
    <svg class="icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      {d[name]}
    </svg>
  );
}
