export type Confidence = 'firm' | 'agreed' | 'uncertain' | 'disputed' | 'legendary';
export type StreamId =
  | 'prehistory' | 'mesopotamia' | 'egypt' | 'greco-roman' | 'india' | 'east-asia' | 'islamic'
  | 'americas' | 'africa' | 'europe'
  | 'bio-public' | 'bio-surgery' | 'bio-drugs' | 'bio-lab' | 'bio-mind';
export type Theme =
  | 'theory' | 'practice' | 'surgery' | 'drugs' | 'technology' | 'institutions'
  | 'public-health' | 'ethics' | 'mind' | 'texts';

export interface Source {
  title: string;
  author?: string;
  publisher: string;
  year?: number;
  url: string;
  type: 'primary' | 'scholarly' | 'institutional' | 'reference' | 'news';
  supports: string;
  quote: string;
  manualCheck?: string;
}

export interface EntryImage {
  commons: string;
  alt: string;
  caption: string;
  // filled in by scripts/fetch-images.mjs
  src?: string;
  thumb?: string;
  width?: number;
  height?: number;
  credit?: string;
  license?: string;
  licenseUrl?: string;
  page?: string;
}

export interface EntryDate {
  year: number;
  earliest?: number | null;
  latest?: number | null;
  end?: number | null;
  display: string;
  traditional?: { year: number; display: string; note: string };
}

export interface Link { to: string; kind: 'built-on' | 'led-to' | 'overturned' | 'see-also'; note?: string }

export interface Entry {
  id: string;
  title: string;
  stream: StreamId;
  tier: 1 | 2 | 3;
  stub?: boolean;
  date: EntryDate;
  confidence: { date: Confidence; claim: Confidence; note: string };
  place: string;
  people: string[];
  themes: Theme[];
  summary: string;
  body: string[];
  myth?: { tradition: string; record: string };
  links: Link[];
  sources: Source[];
  further?: string[];
  image?: EntryImage;
}

export interface IdeaSpan { stream: StreamId; from: number; to: number; fading?: number | null }
export interface Idea {
  id: string;
  name: string;
  summary: string;
  body: string[];
  status: 'abandoned' | 'superseded' | 'living' | 'established';
  born: { year: number; display: string; confidence: Confidence };
  died?: { year: number; display: string; confidence: Confidence } | null;
  spans: IdeaSpan[];
  confidence: { claim: Confidence; note: string };
  related: string[];
  sources: Source[];
  further?: string[];
}

export interface Transmission {
  id: string;
  title: string;
  from: StreamId;
  to: StreamId;
  start: number;
  end: number;
  display: string;
  summary: string;
  body: string[];
  confidence: { claim: Confidence; note: string };
  related: string[];
  sources: Source[];
  further?: string[];
}

export interface Content {
  entries: Entry[];
  ideas: Idea[];
  transmissions: Transmission[];
  bibliography: Record<string, string>;
  built: string;
}
