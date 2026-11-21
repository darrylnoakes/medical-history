# Verification: content/ideas.json (13 ideas)

Second-pass fact-check. Every source URL was fetched and every quote located; claims in summary, body and notes were checked against the pages. Final state: `validate-extra` 0 errors, `check-sources` 71/71 ok. All four PMC URLs were changed to the `pmc.ncbi.nlm.nih.gov/articles/PMC…/` form. British spellings ("humours", "travelled", "randomised", "mould") were replaced with American ones; the `four-humours` id is unchanged.

## humoral-theory: corrected
- Body said humoral thinking shaped "everyday speech, Shakespeare's included". The NLM page supports only that it underpinned European medicine until at least the 1700s and that Shakespeare understood personality in humoral terms. Reworded.
- Unani was "brought to India by Arabic-speaking physicians"; the source says "Arabs". Fixed.
- Doubts: the India span (1300 onward) rests on one review that dates the arrival only loosely (the Arabs, then refugees after the Mongol invasion). The "died" year (1860) is a convention.

## miasma: corrected
- Unsupported: "the choice of air became part of every regimen of health"; "foul smells often did mark real danger"; reformers pressing for drains; "by the last decades of the century it had lost the argument". These were cut or rewritten.
- Added a source, Drakman 2025 (PMC12041326), for miasmatic thinking shaping hygiene and the sanitation movements. The BBC Snow page gives "not widely accepted until the 1860s".
- The Hippocratic quote is about a city's situation and its waters, not "miasma" as such; wording softened to "became a natural explanation".
- `died` confidence lowered to uncertain: no source dates the end. The Islamic span was narrowed to 1000–1500 (Ibn Sina is the only evidence); the 1500 end is an editorial choice.

## bloodletting: corrected
- The source says the practice began "around 3000 years ago with the Egyptians", so a 400 BCE birth was overstated. Kept 400 BCE as the humoral rationale but marked `born` uncertain, and the Egyptian claim is now stated.
- "Contrary to legend" had no support and was removed. "Pathology, the microscope and germ theory did the rest" was unsourced and was cut. The note now says what the Lind Library page says: Louis's impact is "hard to assess", and Broussais was already losing support.
- Doubts: the Europe span start (600) and the bio-drugs span are editorial; no source covers them.

## supernatural-causes: corrected
- The Asclepius temple claim was attributed to a Penn page that never mentions Asclepius. Added PMC3991897 (incubation, healing dreams); "flocked" became "sent the sick".
- "Probably the oldest explanation" became "among the oldest". "Observation of contagion kept the question alive" became "provoked sustained controversy", which Dols says. The unsourced "Germ theory removed gods and demons…" and "not removed from many people's understanding" are now hedged.
- `status` was "superseded" with `died` null, which is inconsistent. Added an approximate `died` of 1880 (uncertain, scientific medicine only). The Greek span now starts at 420 BCE (Hippocratic and Asclepian evidence) and ends at 650.
- Doubts: no source dates the end of the belief; the Mesopotamian and Egyptian span ends are not sourced.

## spontaneous-generation: corrected
- Aristotle did not "end his account of animal generation" with spontaneous animals; SEP says Book III closes with them. Fixed.
- "Mud" and "mould on bread" were unsupported; the Redi page says worms seemed to emerge from decaying plants and animals. Redi's work was "completed" in 1668, not "published".
- The Needham/Buffon sentence now follows the Spallanzani source. The claim that the Pasteur result was the premise of "antiseptic surgery and sterile technique" was unsourced and was replaced with what the Science History Institute says.
- `died` lowered to uncertain; "some defenders held out into the 1870s" was unsourced and was removed. `born` is now "by the 4th century BCE", since the belief predates Aristotle's text.

## qi-channels: corrected
- "Diagnosis by the pulse and treatment with needles, moxa and drugs" was not backed for the Neijing. Replaced by Sun Simiao's chapters on pulse diagnosis and acumoxa, which SEP does state.
- `born` moved from 200 BCE to about 250 BCE ("Warring States period, by the 3rd century BCE", uncertain), because SEP says Warring States texts already tie qi and yin-yang to health. The span start was moved to match.
- "Still in daily use" became "still in use today".
- Doubt: the 250 BCE anchor is approximate; the Zhuangzi passage is in a chapter of uncertain date.

## tridosha: corrected
- "Compiled by Agnivesha and edited by Charaka" is tradition, and the review calls the texts "legendary". Now attributed to tradition.
- "Their dates are much debated" and "the two systems count and define their elements differently" were unsupported. Replaced by the review's 2nd-century BCE date and the plain count (four versus three). The NCCIH 240,000 figure is now attributed to NCCIH.
- Doubt: the birth year (200 BCE) rests on a single review; the Charaka and Sushruta compilations are usually dated later.

## human-dissection: corrected
- Boniface VIII's bull was described as banning "a funerary custom". PMC4582158 says it aimed at the bone trade involving soldiers killed in the Holy Wars, and that it did halt dissection in some other countries. Fixed.
- "Bodies opened to find the cause of death from the 1280s" now reads "first recorded case in Italy, 1286". The Europe span start was set to 1286.
- "Galen's animal-based anatomy became the authority for well over a millennium" and "public revulsion … recurring scandal into the nineteenth century" were unsupported. Replaced by what the sources say (public condemnation, shortage of bodies, grave robbing). The Vesalius sentence now matches the NLM wording (confirmed some of Galen, refuted many).
- The source disagreement is stated: PMC4582158 gives 1315 for Mondino's dissection; the Dictionary of Scientific Biography (via encyclopedia.com) gives January 1316.
- Doubt: encyclopedia.com reprints the Dictionary of Scientific Biography, which is acceptable but second-hand.

## germ-theory: substantially rewritten in two places
- "Koch laid down conditions for proving …" (the postulates) is not on the Nobel page and could not be sourced. Cut.
- "Historians resist making Fracastoro a prophet" overstated the source, which calls it "difficult—perhaps impossible" to say. Reworded. "For three centuries contagion competed with miasma" and "by the 1880s the theory was established" were unsourced and were softened.
- `born` 1546 was rated firm; it is a convention, now rated disputed.
- Doubt: Pasteur and Koch only "won broad acceptance" in these sources; nothing dates "established" exactly.

## fair-tests: corrected
- The streptomycin trial was dated "1948". The MRC report is 1948; Bhatt (PMC3149409, added) says the trial was carried out in 1946. Now "begun in 1946 and reported in 1948".
- "Became the yardstick by which new treatments are judged" and "others counted outcomes through the nineteenth century" were unsourced. Replaced by the cited "methodological landmark" and Louis's own "narrow limits". The summary no longer claims "medicine's standard of proof".
- Doubt: no fetched source states outright that the RCT is the standard test (the idea's `established` status rests on common knowledge).

## immunisation: corrected
- "Variolation was far safer … Jenner removed that danger" was unsourced. The text now says "considered safe and effective, though deaths, rare, were recorded" (Wright's midwife). Eradication is backed by the Lind Library essay.
- Span starts moved to the sources: Islamic 1650 (the practice reached Constantinople by about 1650), Africa 1707 (when Onesimus came to Mather). Montagu was "wife of a British diplomat", not the ambassador.
- Doubt: `born` is the first written mention (1549), not the origin. The India span start (1731, Coult) is likewise first-written, not first-practiced.

## eugenics: corrected
- Galton was a half-cousin of Darwin (ASU). The genome.gov page says eugenic practices were common until at least the 1970s and "in some instances … continued into the present"; the old "after 1945 … an embarrassment" line, which was unsourced, was replaced by that. `died` (1977) is now uncertain and the note explains it marks the end of North Carolina's board only.
- `related`: removed `mendel` and `tuskegee`, which the body does not discuss.
- Doubt: `status` "abandoned" fits the movement but not every practice.

## informed-consent: corrected
- "That last phrase is the seed of the word informed" was unsourced; now "anticipates what later came to be called informed consent". The claim that consent is "required" was softened to "generally requires" (ASU).
- `born` and `claim` lowered from firm to agreed: the Code is the best-known codification, but earlier precedents and the first use of the phrase "informed consent" are not traced in the sources.
- Doubt: whether 1947 deserves to be the birth year is a judgment.
