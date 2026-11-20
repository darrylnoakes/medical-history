# Content guide — Confluence, a river map of medical history

This is the editorial and technical contract for every piece of content on the site. If you are
writing or checking entries, read all of it before you start.

## What we are making

An interactive timeline of medical history drawn as a river: each medical tradition is a stream,
streams merge where knowledge was transmitted, and **evidence quality is part of the picture** —
firmly dated events are crisp points, loosely dated ones are smears across their plausible range,
legendary ones are ghosts. Every entry therefore carries explicit confidence ratings and sources
that a reader can click and check.

**Reader:** a curious adult with no medical or historical training. Smart, sceptical, easily bored
by textbook prose. They want to know what happened, why it mattered, and how sure we are.

## Voice

- Plain, vivid, concrete. Lead with the most interesting true thing. Name people, places, numbers.
- American spelling (anesthesia, hemoglobin, pediatric, color). Original spelling inside quotations.
- No hype and no hedging mush. Say what is known, then say plainly what is not.
- Never "the first ever" without qualification — write "the earliest known" or "the first documented"
  unless priority is genuinely undisputed.
- Do not flatter the present or sneer at the past. Explain why a wrong idea was reasonable at the time.
- Credit the overlooked where the record supports it (assistants, women, colonised or enslaved
  people, rival claimants) — but do not swap one legend for another.
- No bullet lists, headings or markdown in body text. `*asterisks*` for italics (book titles, foreign
  terms) is the only markup allowed.
- Dates: "c. 1600 BCE", "541 CE" (CE only where ambiguous), "the 1840s", "16 October 1846".
- Do not address the reader as "you". Do not mention this website, the river, or "this entry".

## Length by tier

| Tier | What it is | Body length | Min. sources |
|---|---|---|---|
| 1 | Turning point; mini-essay | 220–400 words, 3–5 paragraphs | 3 |
| 2 | Major development | 110–200 words, 2–3 paragraphs | 2 |
| 3 | Notable detail | 50–100 words, 1 paragraph (2 at most) | 2 |

A tier-1 essay should cover: what happened, the world it happened in, what changed (and how fast —
often slowly), and what is disputed or commonly misremembered.

## Confidence — the heart of the project

Each entry rates two separate things on the same five-step scale.

- `confidence.date` — how well do we know **when**?
- `confidence.claim` — how well do we know **that it happened as described / mattered as claimed**?

| Level | Meaning | Typical case |
|---|---|---|
| `firm` | Documented by contemporaneous records; no serious scholarly dispute. | Röntgen, 8 November 1895. |
| `agreed` | Scholarly consensus, but resting on indirect, later or incomplete evidence. | Edwin Smith Papyrus, c. 1600 BCE. |
| `uncertain` | A best estimate with real error bars; thin evidence; could move with new finds. | Alcmaeon's dates. |
| `disputed` | Qualified scholars actively disagree, or a famous version is contested. | Death toll of the Plague of Justinian. |
| `legendary` | Rests on tradition, later attribution or anecdote; little or no contemporaneous evidence. | Shennong tasting herbs c. 2800 BCE. |

Rules:

- Rate honestly. A site where everything is "firm" is useless; so is one where everything is "disputed".
  Modern, well-documented events are normally `firm`/`firm`. Rate the claim *as the entry states it*:
  if the body carefully says "tradition holds…", the claim it makes can still be solid.
- `confidence.note` (1–3 sentences) must say **why**: what the evidence is, and what exactly is
  unsure or contested. This is shown to the reader. Examples: "The papyrus itself is dated by its
  handwriting to c. 1600 BCE; the idea that it copies an Old Kingdom original rests on its archaic
  vocabulary and is plausible but unproven."
- When the date is not `firm`, give `date.earliest` and `date.latest` — the range a careful scholar
  would accept. These draw the smear on the map, so make them meaningful, not decorative.
- `date.traditional` is for cases where tradition gives a different date from scholarship (e.g. a text
  attributed to a legendary sage). The map draws a ghost at the traditional date.
- `myth` is for a popular story that the record does not support (or supports only partly). Use it
  whenever a well-known "fact" about the subject is wrong, embellished or unproven. Two short
  fields: `tradition` (what is often said) and `record` (what the evidence supports). Many entries
  will not need one. Do not invent a myth to fill the slot.

## Sources — non-negotiable rules

Every source in `sources` must have been **opened and read by you in this session**, and must
directly support what you say it supports.

1. **Acceptable:** peer-reviewed articles (PubMed Central, journal sites, JSTOR open pages),
   university and museum pages (Wellcome Collection, NLM/NIH, British Museum, Science Museum, Met,
   Penn Museum), national libraries, official bodies (WHO, CDC, NobelPrize.org, FDA, NHS), primary
   texts in reputable editions/translations (e.g. Perseus, Loeb excerpts, archive.org scans, original
   journal articles), scholarly encyclopedias (Stanford Encyclopedia of Philosophy, Encyclopaedia
   Iranica, Britannica — type `reference`), and serious journalism for very recent events (type `news`).
2. **Not acceptable:** Wikipedia or its mirrors, content farms, listicles, unsourced blogs,
   AI-generated pages, commercial health sites, quote sites, anything you could not open.
3. At least one source per entry must be `primary`, `scholarly` or `institutional`. Prefer the
   strongest source you can actually open over a famous one you cannot.
4. For each source record a **verbatim `quote`** (5–40 words) copied exactly from the page, which
   supports the claim named in `supports`. This is machine-checked: a script re-fetches the URL and
   searches for the quote. Copy from the page's main text (not from a search snippet), keep it to a
   single run of words without ellipses, and avoid passages with footnote markers or odd characters in the middle.
5. Use stable URLs: PMC article pages (`https://pmc.ncbi.nlm.nih.gov/articles/PMC…/`), DOI
   landing pages that show the text, museum object pages. Avoid URLs with session tokens.
   Prefer HTML pages to PDFs; PDFs are allowed if text-extractable.
6. The sources together must cover: the date, the central claim, and every specific number,
   name or "first" in the body. If you cannot source a detail, cut the detail.
7. If good sources disagree, say so in the body or the confidence note, and cite both sides.
8. `further` lists keys from `content/bibliography.json` — standard books for readers who want
   more. These are *not* verification and need not be opened; only list a book if it genuinely
   covers the topic. 0–3 keys.

Run `node scripts/check-sources.mjs content/entries/<your-file>.json` — every source must come back
`ok`. If a page is genuinely good but cannot be machine-checked (JavaScript-rendered, bot-blocked,
scanned PDF), first look for an equivalent checkable source. Only as a last resort keep it and add
`"manualCheck": "why the script cannot verify it, and how you read it"` to that source. No more
than one `manualCheck` source per entry, and never the only non-reference source.

## Entry schema

Each file in `content/entries/` is a JSON array of entry objects. Field by field:

```jsonc
{
  "id": "edwin-smith-papyrus",          // from content/plan.tsv — do not change
  "title": "The Edwin Smith Papyrus",   // may refine the planned title; keep it short (≤ 60 chars)
  "stream": "egypt",                    // from plan — do not change
  "tier": 1,                            // from plan — do not change
  "date": {
    "year": -1600,                      // best-estimate anchor. Negative = BCE (-1600 is 1600 BCE). No year 0.
                                        // "31,000 years ago" → -29000.
    "earliest": -1650,                  // optional; required unless date confidence is firm
    "latest": -1550,
    "end": null,                        // optional: last year, if the entry is a period (e.g. 1346–1353)
    "display": "c. 1600 BCE",           // how the date is written for readers
    "traditional": {                    // optional — only where tradition and scholarship differ
      "year": -2600, "display": "c. 2600 BCE", "note": "One sentence on the traditional attribution."
    }
  },
  "confidence": {
    "date": "agreed",
    "claim": "firm",
    "note": "Why — see above."
  },
  "place": "Thebes (modern Luxor), Egypt",
  "people": ["Edwin Smith (1822–1906), dealer who bought it", "James Henry Breasted (1865–1935), translator"],
                                        // key people with life dates and a few words of role; [] if none
  "themes": ["surgery", "texts"],       // 1–3 of: theory, practice, surgery, drugs, technology,
                                        // institutions, public-health, ethics, mind, texts
  "summary": "One sentence, ≤ 180 characters, that makes someone want to click.",
  "body": ["Paragraph one.", "Paragraph two."],
  "myth": { "tradition": "…", "record": "…" },      // optional
  "links": [                            // 0–4 links FROM this entry to other ids in plan.tsv
    { "to": "ebers-papyrus", "kind": "see-also", "note": "A few words on the connection." }
  ],                                    // kinds: built-on (target is earlier and this draws on it),
                                        // led-to (target is later and this enabled it),
                                        // overturned (this displaced the target), see-also
  "sources": [
    {
      "title": "Title of the page or article",
      "author": "Author(s), if stated",       // optional
      "publisher": "Journal, museum or site",
      "year": 2006,                            // optional (publication year)
      "url": "https://…",
      "type": "scholarly",                     // primary | scholarly | institutional | reference | news
      "supports": "What in this entry the source backs (date, claim, numbers).",
      "quote": "five to forty words copied verbatim from the page"
    }
  ],
  "further": ["nunn-1996"],
  "image": {                            // optional but wanted for tier 1–2: a Wikimedia Commons file
    "commons": "File:Edwin Smith Papyrus v2.jpg",
    "alt": "What the image shows, for screen readers.",
    "caption": "Caption a museum label would be proud of; say what, where and when it is."
  }
}
```

### Images

- Only Wikimedia Commons files, given by exact file title (`File:….jpg`). Check the file page exists
  (`https://commons.wikimedia.org/wiki/File:…`) and that its licence is public domain, CC0, CC BY or
  CC BY-SA. Our build fetches the licence and credit automatically and will reject anything else.
- Prefer authentic period material: manuscripts, objects, engravings, photographs, original
  figures. Avoid modern artists' impressions, portraits painted centuries later presented as
  likenesses (if you must use one, say so in the caption), stock images, logos and maps of little interest.
- Landscape or squarish images work best. Skip the image rather than use a poor or misleading one.

## Working method

1. Read your assignment rows in `content/plan.tsv` (the "scope notes" column says what to cover
   and which traps to address). You may improve on the notes if the evidence says otherwise —
   the notes were written from memory and may contain errors. **Trust sources over the notes.**
2. Research each entry on the web. Open real pages. Cross-check dates and numbers between at least two sources.
3. Write the entry. Then re-read it against your sources: every date, number, name and "first" must be backed.
4. Write your file to `content/entries/<assignment>.json`, then run:
   - `node scripts/validate-content.mjs content/entries/<assignment>.json` — fix all errors, consider warnings.
   - `node scripts/check-sources.mjs content/entries/<assignment>.json` — fix until every source is ok.
5. Do not edit any other file. Do not run git commands.
6. Finish with a short report: entries written, anything you could not source and therefore cut,
   places where you departed from the scope notes and why, and any facts in *other* planned entries
   (see plan.tsv) that you noticed are likely wrong.

## Practical notes on fetching and checking

- The checker fetches with `curl` and a desktop browser user-agent, strips HTML tags, and looks for
  your quote after normalising case, punctuation and whitespace. Pages that render their text with
  JavaScript, or block non-browser clients, will fail even though you could read them some other way.
- Known to work: `pmc.ncbi.nlm.nih.gov`, `nobelprize.org`, most university, museum, journal and
  government pages. Known to fail: `britannica.com` (blocks the checker — do not rely on it).
- To keep your context small, save pages to your scratch directory with
  `curl -sL --compressed -A "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36" -o page.html URL`
  and pull out the relevant passages with `grep`/`python3` instead of printing whole pages.
  For PDFs use `pdftotext file.pdf -`.
- Save your JSON file early and often (after every two or three entries) so nothing is lost.
