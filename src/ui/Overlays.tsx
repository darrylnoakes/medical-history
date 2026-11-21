import { useEffect } from 'preact/hooks';
import type { Confidence, StreamId, Theme } from '../types';
import {
  clearFilters, confFilter, content, entryById, filterActive, filtersOpen, flowById, hover, ideaById, intro, legendOpen,
  select, streamFocus, themeFilter, toggleIn, tourStep,
} from '../store';
import { CONFIDENCE_LABELS, STREAMS, THEME_LABELS } from '../river/streams';
import { TOUR } from '../tour';
import { Glyph, Icon } from './bits';
import type { RiverController } from '../river/controller';

const CONFS: Confidence[] = ['firm', 'agreed', 'uncertain', 'disputed', 'legendary'];

export function Intro({ onStart }: { onStart: (mode: 'source' | 'tour' | 'free') => void }) {
  if (!intro.value) return null;
  const c = content.value;
  const n = c?.entries.filter((e) => !e.stub).length ?? 0;
  const nSrc = c ? c.entries.reduce((a, e) => a + e.sources.length, 0) + c.ideas.reduce((a, e) => a + e.sources.length, 0) + c.transmissions.reduce((a, e) => a + e.sources.length, 0) : 0;
  return (
    <div class="intro" role="dialog" aria-modal="true" aria-labelledby="intro-title">
      <div class="intro-card">
        <p class="eyebrow">Fifty thousand years of healing</p>
        <h1 id="intro-title">Confluence</h1>
        <p class="lede">
          Medicine did not march in a straight line from Hippocrates to the hospital down the road. It ran in many
          streams — Egyptian, Mesopotamian, Greek, Indian, Chinese, Islamic, American, African — that rose apart,
          borrowed from one another, and sometimes merged. This is a map of that river.
        </p>
        <ul class="howto">
          <li>
            <span class="how-art"><Glyph conf="firm" size={18} /><Glyph conf="agreed" size={18} /><Glyph conf="uncertain" size={22} /><Glyph conf="disputed" size={18} /><Glyph conf="legendary" size={18} /></span>
            <span><strong>The fog is part of the map.</strong> A crisp dot is a well-documented event. Softer marks are less certain; a long smear shows how far a date could plausibly slide; a dotted ghost is legend.</span>
          </li>
          <li>
            <span class="how-art"><svg width="74" height="24" viewBox="0 0 74 24" aria-hidden="true"><path d="M2 5 C26 5 30 19 72 19" fill="none" stroke="#7d3c6e" stroke-width="6" opacity="0.55" /><path d="M2 19 L72 19" fill="none" stroke="#1f8a5f" stroke-width="7" opacity="0.5" /></svg></span>
            <span><strong>Streams are traditions; tributaries are borrowings.</strong> Where one stream pours into another, knowledge changed hands — click the join to see how we know.</span>
          </li>
          <li>
            <span class="how-art"><svg width="74" height="24" viewBox="0 0 74 24" aria-hidden="true"><path d="M3 12 H44" stroke="#2a2420" stroke-width="1.5" /><path d="M44 12 H68" stroke="#2a2420" stroke-width="1.5" stroke-dasharray="4 4" /><path d="M68 7 V17" stroke="#2a2420" stroke-width="1.5" /><circle cx="3" cy="12" r="2.6" fill="#f3ecdb" stroke="#2a2420" stroke-width="1.3" /></svg></span>
            <span><strong>Ideas have lifespans.</strong> Thin lines inside the streams are long-lived beliefs — the four humors, bad air, bloodletting — from birth to fading to death.</span>
          </li>
        </ul>
        <div class="intro-actions">
          <button class="btn primary" onClick={() => onStart('tour')}>Take the tour <small>{TOUR.length} stops</small></button>
          <button class="btn" onClick={() => onStart('source')}>Start at the source</button>
          <button class="btn ghost" onClick={() => onStart('free')}>Explore freely</button>
        </div>
        <p class="intro-foot">
          {n} entries · {nSrc.toLocaleString('en-US')} citations, each checked against its source ·{' '}
          <span class="kbd-hint">scroll to zoom, drag to travel</span>
        </p>
      </div>
    </div>
  );
}

export function Tooltip() {
  const h = hover.value;
  if (!h) return null;
  let title = '', when = '', text = '', confs: [string, Confidence][] = [], hint = 'Click to read';
  if (h.target.kind === 'entry') {
    const e = entryById.value.get(h.target.id);
    if (!e) return null;
    title = e.title; when = e.date.display; text = e.summary;
    if (!e.stub) confs = [['When', e.confidence.date], ['What', e.confidence.claim]];
  } else if (h.target.kind === 'idea') {
    const i = ideaById.value.get(h.target.id);
    if (!i) return null;
    title = i.name; when = `${i.born.display} – ${i.died ? i.died.display : 'today'}`; text = i.summary; hint = 'A current of belief · click to read';
  } else {
    const f = flowById.value.get(h.target.id);
    if (!f) return null;
    title = f.title; when = f.display; text = f.summary; confs = [['How sure', f.confidence.claim]]; hint = 'A confluence · click to read';
  }
  const flipX = h.x > window.innerWidth - 340, flipY = h.y > window.innerHeight - 220;
  return (
    <div class={`tip ${flipX ? 'fx' : ''} ${flipY ? 'fy' : ''}`} style={{ left: `${h.x}px`, top: `${h.y}px` }} role="tooltip">
      <p class="tip-when">{when}</p>
      <p class="tip-title">{title}</p>
      {text && <p class="tip-text">{text}</p>}
      {confs.length > 0 && (
        <p class="tip-conf">{confs.map(([k, c]) => <span key={k}><Glyph conf={c} size={12} /> {k}: {CONFIDENCE_LABELS[c].label.toLowerCase()}</span>)}</p>
      )}
      <p class="tip-hint">{hint}</p>
    </div>
  );
}

export function Legend({ river }: { river: RiverController | null }) {
  return (
    <>
      <button class={`legend-btn chip-btn ${legendOpen.value ? 'on' : ''}`} aria-expanded={legendOpen.value} onClick={() => { legendOpen.value = !legendOpen.value; filtersOpen.value = false; }}>
        <Icon name="layers" /> Legend
      </button>
      {legendOpen.value && (
        <section class="card legend" aria-label="Legend">
          <button class="icon-btn card-close" aria-label="Close legend" onClick={() => { legendOpen.value = false; }}><Icon name="x" /></button>
          <h3>How sure are we?</h3>
          <ul class="legend-conf">
            {CONFS.map((c) => (
              <li key={c}><Glyph conf={c} size={c === 'uncertain' ? 20 : 16} /><span><strong>{CONFIDENCE_LABELS[c].label}</strong> {CONFIDENCE_LABELS[c].gloss}</span></li>
            ))}
            <li>
              <svg width="44" height="14" viewBox="0 0 44 14" aria-hidden="true"><defs><linearGradient id="lg-smear"><stop offset="0" stop-color="#2a2420" stop-opacity="0" /><stop offset="0.5" stop-color="#2a2420" stop-opacity="0.5" /><stop offset="1" stop-color="#2a2420" stop-opacity="0" /></linearGradient></defs><rect x="0" y="2" width="44" height="10" rx="5" fill="url(#lg-smear)" /><circle cx="22" cy="7" r="3.4" fill="#2a2420" /></svg>
              <span><strong>Smear</strong> The range in which the date could plausibly fall.</span>
            </li>
            <li>
              <svg width="44" height="14" viewBox="0 0 44 14" aria-hidden="true"><path d="M8 7 H38 M38 3.5 V10.5" stroke="#2a2420" stroke-width="2" /><circle cx="8" cy="7" r="3.4" fill="#2a2420" /></svg>
              <span><strong>Bar</strong> Something that lasted: an epidemic, a programme, a trial.</span>
            </li>
            <li>
              <svg width="44" height="14" viewBox="0 0 44 14" aria-hidden="true"><path d="M8 7 H36" stroke="#2a2420" stroke-width="1" stroke-dasharray="1.5 4" /><circle cx="8" cy="7" r="3.6" fill="none" stroke="#2a2420" stroke-width="1.3" stroke-dasharray="2 2" /><circle cx="36" cy="7" r="3.4" fill="#2a2420" /></svg>
              <span><strong>Ghost</strong> Where tradition dates it, tethered to where the evidence does.</span>
            </li>
            <li>
              <svg width="44" height="14" viewBox="0 0 44 14" aria-hidden="true"><path d="M5 7 H26" stroke="#2a2420" stroke-width="1.4" /><path d="M26 7 H40" stroke="#2a2420" stroke-width="1.4" stroke-dasharray="3.5 3.5" /><path d="M40 3 V11" stroke="#2a2420" stroke-width="1.4" /><circle cx="5" cy="7" r="2.4" fill="#f8f3e6" stroke="#2a2420" stroke-width="1.2" /></svg>
              <span><strong>Current</strong> A long-lived idea: born, fading (dashed), ended. Click a line to read about it.</span>
            </li>
            <li>
              <svg width="44" height="14" viewBox="0 0 44 14" aria-hidden="true"><path d="M2 3 C20 3 22 11 42 11" fill="none" stroke="#7d3c6e" stroke-width="5" opacity="0.5" /><rect x="19" y="4" width="6" height="6" transform="rotate(45 22 7)" fill="#f8f3e6" stroke="#2a2420" stroke-width="1" /></svg>
              <span><strong>Confluence</strong> Knowledge crossing between traditions. Click the diamond.</span>
            </li>
          </ul>
          <h3>The streams</h3>
          <ul class="legend-streams">
            {STREAMS.filter((s) => !s.wash).map((s) => (
              <li key={s.id}>
                <button
                  class={streamFocus.value === s.id ? 'on' : ''}
                  title={s.blurb}
                  onClick={() => {
                    const next = streamFocus.value === s.id ? null : (s.id as StreamId);
                    streamFocus.value = next;
                    if (next) river?.focusStream(next);
                  }}
                >
                  <span class="swatch" style={{ background: s.color }} />{s.name}
                </button>
              </li>
            ))}
          </ul>
          <p class="fineprint">Click a stream to follow it alone. A thin or faint stream means a thin written record, not thin medicine.</p>
        </section>
      )}
    </>
  );
}

export function Filters() {
  if (!filtersOpen.value) return null;
  const all = content.value?.entries ?? [];
  const count = (t: Theme) => all.filter((e) => e.themes.includes(t)).length;
  return (
    <section class="card filters" aria-label="Filters">
      <button class="icon-btn card-close" aria-label="Close filters" onClick={() => { filtersOpen.value = false; }}><Icon name="x" /></button>
      <h3>Show only</h3>
      <div class="chip-row">
        {(Object.keys(THEME_LABELS) as Theme[]).map((t) => (
          <button key={t} class={`chip-btn ${themeFilter.value.has(t) ? 'on' : ''}`} aria-pressed={themeFilter.value.has(t)} onClick={() => toggleIn(themeFilter, t)}>
            {THEME_LABELS[t]} <small>{count(t)}</small>
          </button>
        ))}
      </div>
      <h3>By how sure we are</h3>
      <div class="chip-row">
        {CONFS.map((c) => (
          <button key={c} class={`chip-btn ${confFilter.value.has(c) ? 'on' : ''}`} aria-pressed={confFilter.value.has(c)} onClick={() => toggleIn(confFilter, c)}>
            <Glyph conf={c} size={13} /> {CONFIDENCE_LABELS[c].label}
          </button>
        ))}
      </div>
      <p class="fineprint">Matches an entry if either its date or its central claim has that rating.</p>
      {filterActive.value && <button class="btn small" onClick={clearFilters}>Clear all filters</button>}
    </section>
  );
}

export function ZoomControls({ river }: { river: RiverController | null }) {
  return (
    <div class="zoom" role="group" aria-label="Zoom">
      <button class="icon-btn" aria-label="Zoom in" onClick={() => river?.zoomBy(1.7)}><Icon name="plus" /></button>
      <button class="icon-btn" aria-label="Zoom out" onClick={() => river?.zoomBy(1 / 1.7)}><Icon name="minus" /></button>
      <button class="icon-btn" aria-label="Show the whole river" onClick={() => river?.home()}><Icon name="home" /></button>
    </div>
  );
}

export function Tour({ river }: { river: RiverController | null }) {
  const i = tourStep.value;
  useEffect(() => {
    if (i == null || !river) return;
    const stop = TOUR[i];
    select(null);
    river.focus({ kind: 'entry', id: stop.id }, { zoom: stop.zoom, ms: 1500 });
    river.setSelection({ kind: 'entry', id: stop.id });
  }, [i, river]);
  if (i == null) return null;
  const stop = TOUR[i];
  const e = entryById.value.get(stop.id);
  const end = () => { tourStep.value = null; river?.setSelection(null); };
  return (
    <section class="tour" aria-label="Guided tour" aria-live="polite">
      <div class="tour-head">
        <span class="tour-count">Stop {i + 1} of {TOUR.length}</span>
        <button class="icon-btn" aria-label="End tour" onClick={end}><Icon name="x" /></button>
      </div>
      <p class="tour-text">{stop.text}</p>
      <div class="tour-foot">
        <button class="btn small ghost" disabled={i === 0} onClick={() => { tourStep.value = i - 1; }}><Icon name="left" /> Back</button>
        {e && <button class="btn small" onClick={() => { tourStep.value = null; select({ kind: 'entry', id: e.id }); }}>Read: {e.title}</button>}
        {i < TOUR.length - 1
          ? <button class="btn small primary" onClick={() => { tourStep.value = i + 1; }}>Next <Icon name="right" /></button>
          : <button class="btn small primary" onClick={() => { end(); river?.home(); }}>Finish</button>}
      </div>
      <div class="tour-dots" aria-hidden="true">{TOUR.map((_, j) => <span key={j} class={j === i ? 'on' : j < i ? 'done' : ''} />)}</div>
    </section>
  );
}
