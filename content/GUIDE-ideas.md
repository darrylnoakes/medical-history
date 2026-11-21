# Ideas and transmissions — supplement to GUIDE.md

Read `content/GUIDE.md` first. Voice, confidence scale and **all sourcing rules** (opened pages,
verbatim machine-checked quotes, no Wikipedia) apply here unchanged.

Besides dated entries, the river map draws two other things:

- **Ideas** — long-lived beliefs and practices drawn as currents running *inside* the streams, with
  a visible birth and (sometimes) death. File: `content/ideas.json`.
- **Transmissions** — the confluences: tributaries that carry knowledge from one stream into
  another. File: `content/transmissions.json`.

Stream ids: `prehistory`, `mesopotamia` (c. 3400 BCE–100 CE), `egypt` (c. 3300–30 BCE),
`greco-roman` (c. 800 BCE–1500 CE, thin "Byzantine" tail after 650), `india` (c. 1700 BCE–today),
`east-asia` (c. 1500 BCE–today), `islamic` (c. 650–1900), `americas`, `africa` (sub-Saharan; both
to today), `europe` (c. 450–1860, Latin West then early-modern Europe). From about 1840 "Europe"
fans out into five channels of global biomedicine that run to today: `bio-public` (public health,
systems, ethics), `bio-surgery` (surgery, imaging, devices, procedures), `bio-drugs` (drugs and
vaccines), `bio-lab` (germs, genes, molecules), `bio-mind` (mind and brain).
A span must lie within its stream's lifetime.

## ideas.json — array of

```jsonc
{
  "id": "humoral-theory",               // given in your assignment — do not change
  "name": "Humoral theory",             // short label drawn on the map (≤ 28 chars)
  "summary": "One sentence, ≤ 180 characters.",
  "body": ["150–300 words in 2–4 paragraphs: what the idea was, why it was persuasive, how it travelled, what killed it (or why it survives)."],
  "status": "superseded",               // abandoned | superseded | living | established
  "born": { "year": -400, "display": "c. 400 BCE", "confidence": "agreed" },
  "died": { "year": 1860, "display": "mid-19th century", "confidence": "agreed" },   // null if still alive
  "spans": [                             // where the current runs; one object per stream it flows through
    { "stream": "greco-roman", "from": -400, "to": 650 },
    { "stream": "islamic", "from": 800, "to": 1850 },
    { "stream": "europe", "from": 1080, "to": 1860, "fading": 1650 }   // "fading": year after which it is in decline (drawn dashed)
  ],
  "confidence": { "claim": "agreed", "note": "Why — what is solid and what is debated." },
  "related": ["four-humours", "galen"], // ids of entries in content/plan.tsv that tell parts of this story
  "sources": [ /* ≥ 3, same shape and rules as entry sources */ ],
  "further": ["nutton-2013"]
}
```

## transmissions.json — array of

```jsonc
{
  "id": "greek-into-arabic",            // given — do not change
  "title": "Greek medicine into Arabic",// ≤ 45 chars
  "from": "greco-roman", "to": "islamic",   // given — do not change
  "start": 750, "end": 950,             // when the flow was strongest; adjust to the evidence
  "display": "c. 750–950",
  "summary": "One sentence, ≤ 180 characters.",
  "body": ["80–180 words: what travelled, by whose hands, through which languages and places, and what it changed."],
  "confidence": { "claim": "firm", "note": "Why. Be especially honest where influence is asserted more than shown." },
  "related": ["translation-movement"],
  "sources": [ /* ≥ 2 */ ],
  "further": ["pormann-savage-smith-2007"]
}
```

Validate with `node scripts/validate-extra.mjs` and check sources with
`node scripts/check-sources.mjs content/ideas.json` (or `content/transmissions.json`).
