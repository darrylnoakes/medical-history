// Turns content into things with positions in river space (u along time, c across).
import type { Content, Entry, Idea, StreamId, Transmission } from '../types';
import { buildGeom, type StreamGeom } from './geometry';
import { STREAMS } from './streams';
import { yearToU, PRESENT } from './time';

export interface Node {
  entry: Entry;
  geom: StreamGeom;
  /** position by the record, and by tradition if that differs */
  uRec: number;
  uTrad: number | null;
  uEarliest: number | null;
  uLatest: number | null;
  uEnd: number | null;
  /** lane offset as a fraction of stream width, −0.5..0.5 */
  lane: number;
  r: number;
  labelW: number;
  // per-frame screen state
  t: number;
  cpx: number;
  visible: boolean;
  labelSide: 0 | 1 | -1; // 0 hidden, 1 after the dot, −1 before it
  dim: boolean;
  el: HTMLButtonElement | null;
}

export interface IdeaPath {
  idea: Idea;
  /** one polyline per span plus connectors; u positions with stream + lane to resolve c */
  segs: { geom: StreamGeom; u0: number; u1: number; uFade: number | null; lane: number; connectFrom?: { geom: StreamGeom; u: number; lane: number } }[];
  alive: boolean;
  screen: { x: number; y: number }[];
}

export interface Flow {
  tr: Transmission;
  from: StreamGeom;
  to: StreamGeom;
  u0: number;
  u1: number;
  screen: { x: number; y: number }[];
}

export interface Scene {
  geoms: StreamGeom[];
  geomById: Map<StreamId, StreamGeom>;
  nodes: Node[];
  nodeById: Map<string, Node>;
  ideas: IdeaPath[];
  flows: Flow[];
}

const IDEA_LANES = [-0.36, 0.36, -0.2, 0.2, -0.44, 0.44, 0, -0.28, 0.28];

export function buildScene(content: Content): Scene {
  const geoms = STREAMS.map(buildGeom);
  const geomById = new Map(geoms.map((g) => [g.def.id, g]));

  const nodes: Node[] = content.entries.map((entry) => {
    const d = entry.date;
    return {
      entry,
      geom: geomById.get(entry.stream)!,
      uRec: yearToU(d.year),
      uTrad: d.traditional ? yearToU(d.traditional.year) : null,
      uEarliest: d.earliest != null ? yearToU(d.earliest) : null,
      uLatest: d.latest != null ? yearToU(d.latest) : null,
      uEnd: d.end != null ? yearToU(d.end) : null,
      lane: 0,
      r: entry.tier === 1 ? 5.6 : entry.tier === 2 ? 4.3 : 3.2,
      labelW: 0,
      t: 0, cpx: 0, visible: false, labelSide: 0, dim: false, el: null,
    };
  });
  const nodeById = new Map(nodes.map((n) => [n.entry.id, n]));

  // idea currents: give each idea a lane per stream so parallel currents do not overlap
  const laneUse = new Map<StreamId, number>();
  const ideas: IdeaPath[] = content.ideas.map((idea) => {
    const spans = [...idea.spans].sort((a, b) => a.from - b.from);
    const segs: IdeaPath['segs'] = [];
    for (const s of spans) {
      const geom = geomById.get(s.stream);
      if (!geom) continue;
      const n = laneUse.get(s.stream) ?? 0;
      laneUse.set(s.stream, n + 1);
      const lane = IDEA_LANES[n % IDEA_LANES.length];
      const u0 = Math.max(geom.u0, yearToU(s.from));
      const u1 = Math.min(geom.u1, yearToU(Math.min(s.to, PRESENT)));
      if (u1 <= u0) continue;
      const seg: IdeaPath['segs'][number] = { geom, u0, u1, uFade: s.fading != null ? yearToU(s.fading) : null, lane };
      // connect to the most plausible parent: an earlier span still running (or most recently ended)
      let parent: IdeaPath['segs'][number] | null = null;
      for (const p of segs) {
        if (p.u0 >= u0) continue;
        if (!parent || Math.min(p.u1, u0) > Math.min(parent.u1, u0)) parent = p;
      }
      if (parent && parent.geom !== geom) {
        const uJoin = Math.max(parent.u0, Math.min(parent.u1, u0) - 0.012);
        seg.connectFrom = { geom: parent.geom, u: uJoin, lane: parent.lane };
      }
      segs.push(seg);
    }
    return { idea, segs, alive: !idea.died, screen: [] };
  });

  const flows: Flow[] = content.transmissions
    .filter((tr) => geomById.has(tr.from) && geomById.has(tr.to))
    .map((tr) => {
      const from = geomById.get(tr.from)!, to = geomById.get(tr.to)!;
      // keep the tributary inside both streams' lifetimes
      const u0 = Math.min(Math.max(yearToU(tr.start), from.u0 + 0.002), from.u1 - 0.002);
      const u1 = Math.min(Math.max(yearToU(tr.end), to.u0 + 0.004, u0 + 0.004), to.u1 - 0.001);
      return { tr, from, to, u0, u1, screen: [] };
    });

  return { geoms, geomById, nodes, nodeById, ideas, flows };
}

/**
 * Spread a stream's entries across lanes so neighbours in time sit at different heights.
 * `crossLen` is the pixel extent of the cross axis; `k` a reference zoom for spacing.
 */
export function assignLanes(scene: Scene, crossLen: number, k: number) {
  const byStream = new Map<StreamGeom, Node[]>();
  for (const n of scene.nodes) {
    if (!byStream.has(n.geom)) byStream.set(n.geom, []);
    byStream.get(n.geom)!.push(n);
  }
  for (const [geom, list] of byStream) {
    list.sort((a, b) => a.uRec - b.uRec);
    const lastT: number[] = [];
    let prevLane = -1;
    for (const n of list) {
      const wpx = Math.max(geom.width(n.uRec), geom.def.wash ? 0.5 : 0) * crossLen;
      const lanes = geom.def.wash ? 5 : Math.max(1, Math.min(4, Math.floor((wpx * 0.78) / 20)));
      const t = n.uRec * k;
      // choose the lane whose previous occupant is furthest back; break ties by cycling
      let best = 0, bestGap = -Infinity;
      for (let i = 0; i < lanes; i++) {
        const j = (prevLane + 1 + i) % lanes;
        const gap = t - (lastT[j] ?? -Infinity);
        if (gap > bestGap + 0.5) { bestGap = gap; best = j; }
      }
      lastT[best] = t;
      prevLane = best;
      // keep the upper bank clear for the stream's name
      const spread = geom.def.wash ? 0.62 : 0.56;
      n.lane = lanes === 1 ? (geom.def.thin ? 0 : 0.08) : ((best / (lanes - 1)) - 0.5) * spread + (geom.def.wash ? 0 : 0.09);
    }
  }
}

/** Cross position (0..1) of a node at time position u. */
export function nodeC(n: Node, u: number): number {
  const g = n.geom;
  const uu = Math.min(Math.max(u, g.u0), g.u1);
  const w = g.def.wash ? Math.max(g.width(uu), 0.5) : Math.max(g.width(uu), g.width(Math.min(Math.max(n.uRec, g.u0), g.u1)));
  return g.center(uu) + n.lane * w;
}
