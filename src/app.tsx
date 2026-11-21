import { useEffect, useRef, useState } from 'preact/hooks';
import { effect } from '@preact/signals';
import { RiverController } from './river/controller';
import {
  confFilter, content, hover, intro, legendOpen, filtersOpen, matches, page, readHash, select, selection, showFlows, showIdeas,
  streamFocus, themeFilter, tourStep, tradition, view, openPage,
} from './store';
import { Header } from './ui/Header';
import { Panel } from './ui/Panel';
import { Filters, Intro, Legend, Tooltip, Tour, ZoomControls } from './ui/Overlays';
import { Pages } from './ui/Pages';
import { yearToU } from './river/time';

const panelInset = (vertical: boolean) =>
  window.innerWidth >= 900 ? Math.min(480, window.innerWidth * 0.4) : vertical ? Math.min(window.innerHeight * 0.7, window.innerHeight - 70) - 10 : 0;

export function App() {
  const host = useRef<HTMLDivElement>(null);
  const [river, setRiver] = useState<RiverController | null>(null);

  useEffect(() => {
    const c = content.value;
    if (!c || !host.current) return;
    const r = new RiverController(host.current, c, {
      onSelect: (t) => { if (tourStep.value != null && !t) return; if (t) { tourStep.value = null; } select(t); },
      onHover: (t, x, y) => { hover.value = t ? { target: t, x, y } : null; },
      onView: (zoom, u) => { view.value = { zoom, u }; },
    });
    setRiver(r);
    (window as any).__river = r;

    const stops = [
      effect(() => { r.setLayers(showIdeas.value, showFlows.value); }),
      effect(() => { r.setTradition(tradition.value); }),
      effect(() => {
        themeFilter.value; confFilter.value; // subscribe
        r.setFilter((n) => matches(n.entry), streamFocus.value);
      }),
      effect(() => {
        const t = selection.value;
        r.setPanelInset(t ? panelInset(r.cam.vertical) : 0);
        if (tourStep.peek() != null && !t) return;
        r.setSelection(t);
        if (t) r.focus(t);
      }),
    ];

    // deep link
    const h = readHash();
    if (h.target) { intro.value = false; selection.value = h.target; r.focus(h.target, { ms: 0 }); }
    else if (h.page) { intro.value = false; page.value = h.page; }
    const onHash = () => {
      const x = readHash();
      if (x.target) { page.value = null; intro.value = false; selection.value = x.target; }
      else if (x.page) page.value = x.page;
    };
    window.addEventListener('hashchange', onHash);

    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      const typing = el.tagName === 'INPUT' || el.tagName === 'TEXTAREA';
      if (e.key === 'Escape') {
        if (page.value) openPage(null);
        else if (intro.value) intro.value = false;
        else if (legendOpen.value || filtersOpen.value) { legendOpen.value = false; filtersOpen.value = false; }
        else if (tourStep.value != null) { tourStep.value = null; r.setSelection(null); }
        else if (selection.value) select(null);
        return;
      }
      if (typing || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === '/') { e.preventDefault(); document.getElementById('search-input')?.focus(); return; }
      if (page.value || intro.value) return;
      if (tourStep.value != null) {
        if (e.key === 'ArrowRight') { tourStep.value = Math.min(tourStep.value + 1, 20); e.preventDefault(); return; }
        if (e.key === 'ArrowLeft') { tourStep.value = Math.max(tourStep.value - 1, 0); e.preventDefault(); return; }
      }
      if (el.closest('.panel')) return;
      if (r.key(e)) e.preventDefault();
    };
    window.addEventListener('keydown', onKey);
    return () => { stops.forEach((s) => s()); window.removeEventListener('hashchange', onHash); window.removeEventListener('keydown', onKey); r.dispose(); };
  }, [content.value]);

  const start = (mode: 'source' | 'tour' | 'free') => {
    intro.value = false;
    if (!river) return;
    if (mode === 'tour') tourStep.value = 0;
    else if (mode === 'source') {
      // open on the first written medicine, with the headwaters trailing off behind
      const u0 = yearToU(-3600), u1 = yearToU(-200);
      river.cam.flyTo((u0 + u1) / 2, river.cam.zoomForSpan(u1 - u0, 0.92), 1600);
    }
  };

  const sel = selection.value;
  return (
    <div class={`app ${sel ? 'has-panel' : ''} ${intro.value ? 'intro-open' : ''} ${tourStep.value != null ? 'touring' : ''}`}>
      <a class="skip" href="#/index" onClick={(e) => { e.preventDefault(); openPage('index'); }}>Skip the map: open the text index</a>
      <div class="river" ref={host} />
      <Header />
      {!content.value && <p class="loading">Charting the river…</p>}
      <Legend river={river} />
      <Filters />
      <ZoomControls river={river} />
      <Tooltip />
      <Tour river={river} />
      <Panel />
      <Intro onStart={start} />
      <Pages />
    </div>
  );
}
