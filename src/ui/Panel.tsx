import { useEffect, useRef } from 'preact/hooks';
import type { Entry, Idea, Transmission } from '../types';
import { content, entryById, flowById, ideaById, select, selection } from '../store';
import { STREAM_BY_ID, THEME_LABELS } from '../river/streams';
import { ConfChip, Further, Glyph, Icon, Rich, SourceList } from './bits';

const KIND_OUT: Record<string, string> = {
  'built-on': 'Built on', 'led-to': 'Led to', overturned: 'Overturned', 'see-also': 'See also',
};
const KIND_IN: Record<string, string> = {
  'built-on': 'Later built on by', 'led-to': 'Grew out of', overturned: 'Overturned by', 'see-also': 'See also',
};

function EntryLinkButton({ id, label, note }: { id: string; label: string; note?: string }) {
  const e = entryById.value.get(id);
  if (!e) return null;
  return (
    <li>
      <button class="link-row" onClick={() => select({ kind: 'entry', id })}>
        <span class="link-kind">{label}</span>
        <span class="link-title">{e.title}</span>
        <span class="link-date">{e.date.display}</span>
        {note && <span class="link-note">{note}</span>}
      </button>
    </li>
  );
}

function Connections({ entry }: { entry: Entry }) {
  const all = content.value?.entries ?? [];
  const incoming = all.flatMap((e) => e.links.filter((l) => l.to === entry.id && !entry.links.some((m) => m.to === e.id)).map((l) => ({ from: e.id, ...l })));
  const ideas = (content.value?.ideas ?? []).filter((i) => i.related.includes(entry.id));
  const flows = (content.value?.transmissions ?? []).filter((f) => f.related.includes(entry.id));
  if (!entry.links.length && !incoming.length && !ideas.length && !flows.length) return null;
  return (
    <section class="connections">
      <h3>Connections</h3>
      <ul class="link-list">
        {entry.links.map((l) => <EntryLinkButton key={`o${l.to}`} id={l.to} label={KIND_OUT[l.kind]} note={l.note} />)}
        {incoming.map((l) => <EntryLinkButton key={`i${l.from}`} id={l.from} label={KIND_IN[l.kind]} note={l.note} />)}
        {ideas.map((i) => (
          <li key={i.id}>
            <button class="link-row" onClick={() => select({ kind: 'idea', id: i.id })}>
              <span class="link-kind">Current</span><span class="link-title">{i.name}</span><span class="link-date">{i.born.display}{i.died ? ` – ${i.died.display}` : ' – today'}</span>
            </button>
          </li>
        ))}
        {flows.map((f) => (
          <li key={f.id}>
            <button class="link-row" onClick={() => select({ kind: 'flow', id: f.id })}>
              <span class="link-kind">Confluence</span><span class="link-title">{f.title}</span><span class="link-date">{f.display}</span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

function StreamNav({ entry }: { entry: Entry }) {
  const list = (content.value?.entries ?? []).filter((e) => e.stream === entry.stream);
  const i = list.findIndex((e) => e.id === entry.id);
  const prev = list[i - 1], next = list[i + 1];
  const s = STREAM_BY_ID.get(entry.stream)!;
  return (
    <nav class="stream-nav" aria-label={`More in ${s.name}`}>
      <button disabled={!prev} onClick={() => prev && select({ kind: 'entry', id: prev.id })}>
        <Icon name="left" /><span><small>Upstream</small>{prev ? prev.title : '—'}</span>
      </button>
      <button disabled={!next} onClick={() => next && select({ kind: 'entry', id: next.id })}>
        <span><small>Downstream</small>{next ? next.title : '—'}</span><Icon name="right" />
      </button>
    </nav>
  );
}

function EntryView({ entry }: { entry: Entry }) {
  const s = STREAM_BY_ID.get(entry.stream)!;
  const img = entry.image?.src ? entry.image : null;
  return (
    <article>
      {img && (
        <figure class="hero">
          <img src={img.src} alt={img.alt} width={img.width} height={img.height} loading="lazy" />
          <figcaption>
            <Rich text={img.caption} />
            <span class="credit">
              {img.credit}{img.license ? ` · ${img.license}` : ''}{img.page && <> · <a href={img.page} target="_blank" rel="noopener noreferrer">Wikimedia Commons</a></>}
            </span>
          </figcaption>
        </figure>
      )}
      <div class="panel-body">
        <p class="kicker"><span class="swatch" style={{ background: s.color }} />{s.name}{entry.place ? ` · ${entry.place}` : ''}</p>
        <h2>{entry.title}</h2>
        <p class="when">{entry.date.display}</p>
        {entry.stub ? (
          <p class="stub">This entry is planned but not yet written.</p>
        ) : (
          <>
            <div class="conf-box">
              <div class="conf-chips">
                <ConfChip label="When" conf={entry.confidence.date} />
                <ConfChip label="What" conf={entry.confidence.claim} />
              </div>
              <p><Rich text={entry.confidence.note} /></p>
              {entry.date.traditional && (
                <p class="trad"><Glyph conf="legendary" size={13} /> <strong>Tradition says {entry.date.traditional.display}.</strong> <Rich text={entry.date.traditional.note} /></p>
              )}
            </div>
            <div class="prose">{entry.body.map((p, i) => <p key={i}><Rich text={p} /></p>)}</div>
            {entry.myth && (
              <aside class="myth">
                <div><h4>Often said</h4><p><Rich text={entry.myth.tradition} /></p></div>
                <div><h4>What the record supports</h4><p><Rich text={entry.myth.record} /></p></div>
              </aside>
            )}
            {entry.people.length > 0 && (
              <section class="people"><h3>People</h3><ul>{entry.people.map((p) => <li key={p}>{p}</li>)}</ul></section>
            )}
            <p class="themes">{entry.themes.map((t) => <span key={t} class="chip">{THEME_LABELS[t]}</span>)}</p>
            <Connections entry={entry} />
            <section><h3>Sources</h3><SourceList sources={entry.sources} /></section>
            <Further keys={entry.further} />
          </>
        )}
        <StreamNav entry={entry} />
      </div>
    </article>
  );
}

function Related({ ids }: { ids: string[] }) {
  const items = ids.map((id) => entryById.value.get(id)).filter(Boolean) as Entry[];
  if (!items.length) return null;
  return (
    <section class="connections">
      <h3>Part of this story</h3>
      <ul class="link-list">
        {items.sort((a, b) => a.date.year - b.date.year).map((e) => <EntryLinkButton key={e.id} id={e.id} label={e.date.display} />)}
      </ul>
    </section>
  );
}

const STATUS: Record<Idea['status'], string> = {
  abandoned: 'Abandoned', superseded: 'Superseded', living: 'Still practiced', established: 'Now established',
};

function IdeaView({ idea }: { idea: Idea }) {
  return (
    <article><div class="panel-body">
      <p class="kicker">A current of belief · {STATUS[idea.status]}</p>
      <h2>{idea.name}</h2>
      <p class="when">{idea.born.display} – {idea.died ? idea.died.display : 'today'}</p>
      <div class="conf-box">
        <div class="conf-chips">
          <ConfChip label="Born" conf={idea.born.confidence} />
          {idea.died && <ConfChip label="Died" conf={idea.died.confidence} />}
          <ConfChip label="Account" conf={idea.confidence.claim} />
        </div>
        <p><Rich text={idea.confidence.note} /></p>
      </div>
      <div class="prose">{idea.body.map((p, i) => <p key={i}><Rich text={p} /></p>)}</div>
      <p class="themes">{[...new Set(idea.spans.map((s) => s.stream))].map((id) => {
        const s = STREAM_BY_ID.get(id)!;
        return <span key={id} class="chip"><span class="swatch" style={{ background: s.color }} />{s.name}</span>;
      })}</p>
      <Related ids={idea.related} />
      <section><h3>Sources</h3><SourceList sources={idea.sources} /></section>
      <Further keys={idea.further} />
    </div></article>
  );
}

function FlowView({ flow }: { flow: Transmission }) {
  const a = STREAM_BY_ID.get(flow.from)!, b = STREAM_BY_ID.get(flow.to)!;
  return (
    <article><div class="panel-body">
      <p class="kicker">A confluence</p>
      <h2>{flow.title}</h2>
      <p class="when">{flow.display}</p>
      <p class="flow-dir">
        <span class="chip"><span class="swatch" style={{ background: a.color }} />{a.name}</span>
        <span class="arrow" aria-label="flows into">⟶</span>
        <span class="chip"><span class="swatch" style={{ background: b.color }} />{b.name}</span>
      </p>
      <div class="conf-box">
        <div class="conf-chips"><ConfChip label="How sure" conf={flow.confidence.claim} /></div>
        <p><Rich text={flow.confidence.note} /></p>
      </div>
      <div class="prose">{flow.body.map((p, i) => <p key={i}><Rich text={p} /></p>)}</div>
      <Related ids={flow.related} />
      <section><h3>Sources</h3><SourceList sources={flow.sources} /></section>
      <Further keys={flow.further} />
    </div></article>
  );
}

export function Panel() {
  const sel = selection.value;
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    ref.current?.scrollTo(0, 0);
    // move keyboard focus into the panel so screen-reader and keyboard users land on the text
    if (sel && document.activeElement?.closest('.river-nodes, .search, .tour, .link-list, .stream-nav')) ref.current?.focus({ preventScroll: true });
  }, [sel?.kind, sel?.id]);
  if (!sel) return null;
  const entry = sel.kind === 'entry' ? entryById.value.get(sel.id) : null;
  const idea = sel.kind === 'idea' ? ideaById.value.get(sel.id) : null;
  const flow = sel.kind === 'flow' ? flowById.value.get(sel.id) : null;
  if (!entry && !idea && !flow) return null;
  return (
    <aside class="panel" ref={ref} aria-label="Details" tabIndex={-1}>
      <button class="panel-close icon-btn" onClick={() => select(null)} aria-label="Close"><Icon name="x" /></button>
      {entry && <EntryView entry={entry} />}
      {idea && <IdeaView idea={idea} />}
      {flow && <FlowView flow={flow} />}
    </aside>
  );
}
