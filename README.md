# Confluence

**A river map of medical history — from before writing to the present day — with the uncertainty left in.**

Live: <https://confluence-medical-history.vercel.app>

Medicine did not run in one straight line. This site draws it as a river:

- **Streams** are medical traditions — Egypt, Mesopotamia, Greece & Rome, India, China & East Asia, the Islamic
  world, the Americas, sub-Saharan Africa, Europe — fanning into a delta of modern biomedicine.
- **Tributaries** ("confluences") show where knowledge passed from one tradition to another.
- **Currents** are long-lived ideas — the four humors, miasma, bloodletting, germ theory — with a visible birth
  and, sometimes, death.
- **Evidence quality is part of the drawing.** A crisp dot is a well-documented event; softer marks are less
  certain; a smear shows how far a date could plausibly slide; a dotted ghost marks where tradition puts
  something the evidence puts elsewhere.

Every entry carries two confidence ratings (how sure are we *when*, and how sure are we *what*), a note
explaining them, and sources you can click and check.

## How the content was made and checked

All text was researched and written by Claude (an AI model made by Anthropic) working as a team of agents.
No human historian has reviewed it. The process was built to make that as trustworthy as it can be:

1. **An editorial contract.** [`content/GUIDE.md`](content/GUIDE.md) defines the voice, the five-level
   confidence scale and the sourcing rules. Wikipedia is not accepted as a source.
2. **Sources had to be opened.** Writers worked from pages they fetched during the work, not from memory.
3. **Every citation records a verbatim passage** from the page that supports the claim.
4. **A script re-reads every page.** [`scripts/check-sources.mjs`](scripts/check-sources.mjs) fetches each cited
   URL and confirms the recorded passage is really there.
5. **An independent second pass.** A different agent re-checked each batch against its sources; its findings
   are in [`content/verification/`](content/verification).

This still does not guarantee that a source is right or that a specialist would weigh the evidence the same
way. Treat it as a well-referenced starting point and trust the sources over the summary.

## Repository layout

```
content/
  plan.tsv            the master list of entries (id, stream, year, tier, scope)
  GUIDE.md            editorial contract for entries
  GUIDE-ideas.md      supplement for idea currents and transmissions
  entries/*.json      the entries, in research batches
  ideas.json          idea currents
  transmissions.json  confluences between streams
  bibliography.json   further-reading list
  verification/*.md   reports from the independent fact-check
scripts/
  validate-content.mjs   schema and coverage checks for entries
  validate-extra.mjs     same for ideas and transmissions
  check-sources.mjs      fetches every source and matches the recorded quote
  fetch-images.mjs       downloads images from Wikimedia Commons, verifying licences
  build-content.mjs      compiles content/ into the bundle the app loads
src/
  river/     the map engine: warped time scale, hand-drawn stream geometry, canvas renderer, camera
  ui/        Preact components: detail panel, search, legend, tour, index and sources pages
public/img/  entry images (WebP) and manifest.json with credits and licences
```

## Development

```bash
npm install
```

```bash
npm run dev
```

```bash
npm run build
```

Other useful commands:

```bash
npm run validate
```

```bash
npm run check-sources
```

```bash
npm run images
```

The site is a static Vite + Preact app with no backend; Vercel builds it from this repository.

## Editing the map

- **Add or change an entry:** edit the JSON in `content/entries/`, following `content/GUIDE.md`, then run the
  validator and the source checker. New ids must first be added to `content/plan.tsv`.
- **Reshape a stream:** the courses of the streams are hand-drawn keyframes in `src/river/streams.ts`.
- **Change how time is stretched:** the knots in `src/river/time.ts`.

## Licence and credits

Images are from Wikimedia Commons under public-domain or Creative Commons licences; each is credited beside
the picture, and the full list is in `public/img/manifest.json`. Typefaces: Newsreader and IBM Plex Sans (SIL
Open Font License).
