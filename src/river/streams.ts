// The hand-drawn map: where each stream runs. Years on the time axis, c/w in cross-axis
// units (0 = one bank, 1 = the other). `a` is ink strength (how well documented the stream is there).
import type { StreamId } from '../types';

export interface StreamKey { y: number; c: number; w: number; a?: number }
export interface StreamDef {
  id: StreamId;
  name: string;
  /** label drawn on the ribbon */
  label: string;
  color: string;
  keys: StreamKey[];
  blurb: string;
  /** part of the modern delta */
  delta?: boolean;
  wash?: boolean;
  thin?: boolean;
}

const delta = (
  id: StreamId, name: string, label: string, color: string, c0: number, c1: number, blurb: string, wobble = 0,
): StreamDef => ({
  id, name, label, color, delta: true, blurb,
  keys: [
    { y: 1836, c: c0, w: 0.066, a: 0 },
    { y: 1862, c: (c0 * 2 + c1) / 3, w: 0.074, a: 1 },
    { y: 1900, c: c1, w: 0.094 },
    { y: 1950, c: c1 + wobble, w: 0.096 },
    { y: 2000, c: c1 - wobble, w: 0.096 },
    { y: 2032, c: c1, w: 0.094 },
  ],
});

export const STREAMS: StreamDef[] = [
  {
    id: 'prehistory', name: 'Before writing', label: 'Before writing', color: '#8c8272', wash: true,
    blurb: 'For most of human existence healing left no texts — only bones, teeth and the occasional frozen body. Everything here is inferred from physical remains, and every interpretation is contestable.',
    keys: [
      { y: -50000, c: 0.5, w: 0.34, a: 0 },
      { y: -40000, c: 0.5, w: 0.46, a: 0.55 },
      { y: -10000, c: 0.5, w: 0.66, a: 0.6 },
      { y: -4000, c: 0.5, w: 0.8, a: 0.55 },
      { y: -3000, c: 0.5, w: 0.84, a: 0.3 },
      { y: -2300, c: 0.5, w: 0.86, a: 0 },
    ],
  },
  {
    id: 'americas', name: 'The Americas', label: 'The Americas', color: '#6f9a3a', thin: true,
    blurb: 'Andean and Mesoamerican healers practiced skilled surgery and kept vast herbals, but almost nothing was written down before the Spanish conquest — and the conquest destroyed much of what there was. The stream thins after 1520 because the record does, and because so many of its people died.',
    keys: [
      { y: -7000, c: 0.052, w: 0, a: 0 },
      { y: -6000, c: 0.052, w: 0.02, a: 0.4 },
      { y: -1000, c: 0.052, w: 0.03, a: 0.55 },
      { y: 1000, c: 0.052, w: 0.044, a: 0.9 },
      { y: 1500, c: 0.052, w: 0.05, a: 1 },
      { y: 1620, c: 0.046, w: 0.022, a: 0.7 },
      { y: 1900, c: 0.04, w: 0.014, a: 0.5 },
      { y: 2032, c: 0.04, w: 0.012, a: 0.5 },
    ],
  },
  {
    id: 'africa', name: 'Sub-Saharan Africa', label: 'Sub-Saharan Africa', color: '#5a4a9c', thin: true,
    blurb: 'Healing traditions south of the Sahara were rich but passed on by word of mouth. What reaches the written record are glimpses, usually through outsiders’ eyes. The thin line shows the thinness of the record, not of the medicine.',
    keys: [
      { y: -3300, c: 0.118, w: 0, a: 0 },
      { y: -2500, c: 0.118, w: 0.02, a: 0.4 },
      { y: 1000, c: 0.118, w: 0.027, a: 0.5 },
      { y: 1700, c: 0.115, w: 0.03, a: 0.7 },
      { y: 1900, c: 0.1, w: 0.018, a: 0.5 },
      { y: 2032, c: 0.1, w: 0.014, a: 0.5 },
    ],
  },
  {
    id: 'egypt', name: 'Egypt', label: 'Egypt', color: '#c9a236',
    blurb: 'Three thousand years of pharaonic medicine: named physicians, specialist titles and papyri that mix careful observation with spells. Its drugs and its fame flowed into Greek medicine, above all through Alexandria.',
    keys: [
      { y: -3400, c: 0.235, w: 0.012, a: 0 },
      { y: -3000, c: 0.235, w: 0.07, a: 0.85 },
      { y: -1500, c: 0.235, w: 0.086 },
      { y: -600, c: 0.245, w: 0.076 },
      { y: -300, c: 0.27, w: 0.06 },
      { y: -30, c: 0.31, w: 0.022 },
      { y: 60, c: 0.326, w: 0 },
    ],
  },
  {
    id: 'mesopotamia', name: 'Mesopotamia', label: 'Mesopotamia', color: '#a8543a',
    blurb: 'Sumerian, Babylonian and Assyrian healers left the oldest medical writing we have, on clay: prescriptions, omens and long diagnostic handbooks in which gods and symptoms share the page.',
    keys: [
      { y: -3500, c: 0.436, w: 0.012, a: 0 },
      { y: -3000, c: 0.436, w: 0.068, a: 0.85 },
      { y: -1800, c: 0.436, w: 0.086 },
      { y: -600, c: 0.43, w: 0.07 },
      { y: -300, c: 0.412, w: 0.04 },
      { y: 100, c: 0.378, w: 0 },
    ],
  },
  {
    id: 'greco-roman', name: 'Greece & Rome', label: 'Greece & Rome', color: '#7d3c6e',
    blurb: 'From the Hippocratic writers to Galen, Greek-speaking physicians built the system — humors, regimen, prognosis — that would dominate medicine from Spain to Persia for the next fifteen centuries. After Rome’s western half fell, the tradition ran on in Byzantium.',
    keys: [
      { y: -800, c: 0.335, w: 0.012, a: 0 },
      { y: -500, c: 0.335, w: 0.06 },
      { y: -300, c: 0.335, w: 0.1 },
      { y: 150, c: 0.34, w: 0.122 },
      { y: 450, c: 0.346, w: 0.1 },
      { y: 650, c: 0.358, w: 0.05 },
      { y: 1000, c: 0.366, w: 0.028, a: 0.8 },
      { y: 1400, c: 0.36, w: 0.018, a: 0.7 },
      { y: 1520, c: 0.332, w: 0, a: 0.5 },
    ],
  },
  {
    id: 'europe', name: 'Europe', label: 'Latin Europe', color: '#4f6d94',
    blurb: 'On the margins of learned medicine for centuries after Rome, the Latin West rebuilt its own from Arabic translations, then from printing, dissection and experiment. In the nineteenth century it fans out into the laboratory-based medicine now practiced worldwide.',
    keys: [
      { y: 450, c: 0.322, w: 0.008, a: 0 },
      { y: 560, c: 0.296, w: 0.02 },
      { y: 700, c: 0.266, w: 0.03 },
      { y: 1000, c: 0.262, w: 0.036 },
      { y: 1200, c: 0.27, w: 0.06 },
      { y: 1500, c: 0.29, w: 0.1 },
      { y: 1700, c: 0.33, w: 0.15 },
      { y: 1800, c: 0.37, w: 0.23 },
      { y: 1838, c: 0.4, w: 0.33, a: 1 },
      { y: 1866, c: 0.404, w: 0.4, a: 0 },
    ],
  },
  delta('bio-public', 'Public health & ethics', 'Public health & ethics', '#3d7ea6', 0.268, 0.2,
    'How societies keep people well: sanitation, epidemiology, health systems, pandemics — and the rules written after medicine’s worst abuses.', 0.004),
  delta('bio-surgery', 'Surgery & machines', 'Surgery & machines', '#5a6bb0', 0.334, 0.305,
    'Anesthesia and antisepsis turned surgery from a last resort into routine; imaging, transplants and devices followed.', -0.003),
  delta('bio-drugs', 'Drugs & vaccines', 'Drugs & vaccines', '#2f9a8a', 0.4, 0.41,
    'From plant extracts to antibiotics, hormones, the Pill and mRNA: the chemistry of treatment and prevention, and the regulation that grew up around it.', 0.003),
  delta('bio-lab', 'Germs & genes', 'Germs & genes', '#7a5aa6', 0.466, 0.515,
    'The laboratory’s account of what disease is: cells, microbes, vitamins, hormones, DNA, and the tools for reading and rewriting them.', -0.004),
  delta('bio-mind', 'Mind & brain', 'Mind & brain', '#a65a8a', 0.532, 0.61,
    'Asylums, psychoanalysis, shock treatments, lobotomy and psychiatric drugs: medicine’s most contested territory.', 0.003),
  {
    id: 'islamic', name: 'Islamic world', label: 'Islamic world', color: '#1f8a5f',
    blurb: 'From the eighth century, scholars writing in Arabic and Persian — Muslims, Christians, Jews and others — translated Greek, Syriac, Sanskrit and Persian medicine, tested it, extended it, and built great hospitals. Their textbooks taught Europe for five hundred years; the tradition survives as Unani medicine in South Asia.',
    keys: [
      { y: 640, c: 0.5, w: 0.012, a: 0 },
      { y: 800, c: 0.5, w: 0.055 },
      { y: 1000, c: 0.5, w: 0.105 },
      { y: 1250, c: 0.505, w: 0.095 },
      { y: 1500, c: 0.525, w: 0.065 },
      { y: 1700, c: 0.565, w: 0.042, a: 0.9 },
      { y: 1800, c: 0.625, w: 0.03, a: 0.75 },
      { y: 1860, c: 0.682, w: 0.02, a: 0.55 },
      { y: 1920, c: 0.7, w: 0.014, a: 0.35 },
      { y: 1960, c: 0.704, w: 0.008, a: 0 },
    ],
  },
  {
    id: 'india', name: 'India', label: 'India', color: '#d4622a',
    blurb: 'Ayurveda’s great compendia set out a medicine of three doshas, a vast pharmacopoeia and remarkably ambitious surgery. Their dates are among the most uncertain on this map. The tradition absorbed Greco-Arabic medicine after 1200 and is practiced by hundreds of thousands today.',
    keys: [
      { y: -1800, c: 0.72, w: 0.012, a: 0 },
      { y: -1000, c: 0.72, w: 0.045, a: 0.7 },
      { y: -200, c: 0.72, w: 0.075 },
      { y: 600, c: 0.72, w: 0.086 },
      { y: 1200, c: 0.722, w: 0.076 },
      { y: 1800, c: 0.736, w: 0.07 },
      { y: 1900, c: 0.76, w: 0.06 },
      { y: 2032, c: 0.76, w: 0.055 },
    ],
  },
  {
    id: 'east-asia', name: 'China & East Asia', label: 'China & East Asia', color: '#b3263c',
    blurb: 'Chinese medicine — qi, yin and yang, channels, a huge materia medica — took written shape around two thousand years ago and spread to Korea, Japan and Vietnam. It remains a living tradition, though the tidy system called “Traditional Chinese Medicine” is largely a twentieth-century creation.',
    keys: [
      { y: -1600, c: 0.89, w: 0.012, a: 0 },
      { y: -1000, c: 0.89, w: 0.05, a: 0.7 },
      { y: 1, c: 0.89, w: 0.086 },
      { y: 1000, c: 0.89, w: 0.1 },
      { y: 1800, c: 0.895, w: 0.09 },
      { y: 2032, c: 0.9, w: 0.086 },
    ],
  },
];

export const STREAM_BY_ID = new Map(STREAMS.map((s) => [s.id, s]));

export const THEME_LABELS: Record<string, string> = {
  theory: 'Beliefs & theories',
  practice: 'Diagnosis & care',
  surgery: 'Surgery',
  drugs: 'Drugs & vaccines',
  technology: 'Technology',
  institutions: 'Institutions',
  'public-health': 'Public health',
  ethics: 'Ethics & abuses',
  mind: 'Mind',
  texts: 'Texts',
};

export const CONFIDENCE_LABELS: Record<string, { label: string; gloss: string }> = {
  firm: { label: 'Firm', gloss: 'Documented at the time; no serious dispute.' },
  agreed: { label: 'Generally agreed', gloss: 'Scholarly consensus, resting on indirect or later evidence.' },
  uncertain: { label: 'Uncertain', gloss: 'A best estimate with real error bars.' },
  disputed: { label: 'Disputed', gloss: 'Qualified scholars disagree.' },
  legendary: { label: 'Legendary', gloss: 'Tradition or later attribution; little contemporary evidence.' },
};
