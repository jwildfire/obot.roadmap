# The intake report — direction C (2026-08-27)

One of four competing design directions for the open.gismo data-loading session. This one
commits to a single angle: **read their data and report back.** The product ingests whatever
folder it is pointed at, profiles everything in it, and answers with one document that says
what it found, what it can already build, and what each gap costs — priced in charts, not in
columns. Corrections are made by answering questions inside that document.

Requested by @jwildfire (2026-08-26): *"Maybe a ultradesign session for open.gismo? re-visit
the research comparing other sites and do some mockups on how users will load their own
data?"*

Extends row **D1** of the [platform gap analysis](../platform-gap-analysis-2026-07-25/) — the
data-mapping surface. The competitor landscape is covered by the sibling directions
([fit](../open-gismo-data-loading-2026-08-27/),
[bring-your-own-study](../og-data-loading-design-2026-08-27/)) and is deliberately not
repeated here.

## Pages

| Page | What it holds |
|---|---|
| [`index.html`](index.html) | The direction: why not a wizard, the four detectors, the hard case walked end to end, what it costs, five named weaknesses, five decisions |
| [`report.html`](report.html) | The mockup — a clickable intake report for the fixture delivery. Answering a finding moves the ledger and writes the diff |

## What was established, and how

Everything numeric on these pages was produced by running code against a fixture, not
estimated. R 4.x with `open.gismo` @ `dev` (v0.2.0), `gsm.core 1.2.0`, `gsm.mapping 1.1.3`,
`gsm.kri 1.5.0`, `gsm.reporting 1.1.5`, `workr 1.0.0`.

- **The fixture.** Six files generated from `demo-301`'s own `input/` data and re-shaped as a
  sponsor receives it: an SDTM-ish `dm.xpt` written with `haven::write_xpt()`, an EDC-style
  `ae.csv` with the toxicity grade removed, and the sixteen-analyte lab panel split across
  three vendors with different naming, different units, and one site-prefixed identifier.
  60,938 rows, 50 columns, 4.08 MB.
- **The verbatim failure.** `og_init(example = FALSE)`, copy the six files into `input/`,
  `og_validate()`. Twelve lines of `file not found` and no mention of any delivered file.
  Reproduced, not inferred.
- **The cost resolver.** Parses the 15 mapping, 29 metric and 10 module workflows in
  `demo-301/workflows/` and chains each consumer's `spec:` block back through the mapping
  specs to the `Raw_*` columns that feed it. 39 consumers, 56 consumed raw columns.
  `Raw_SUBJ.subjid` carries 53 downstream references; `Raw_SUBJ` absent takes out 36 of 39.
- **The four detectors.** Written and run: 6 of 6 files read including the transport;
  15 candidate keys yielding 12 relationships with 4 flagged broken-by-prefix and no false
  positives; 0 of 4 analyte names matched against the eDISH `measure_values`; 5 derivable
  columns unlocking 10 consumers, each with measured coverage.
- **The classification.** 9 displays ready on names alone, 10 one derivation away, 20 blocked
  by seven domains that were never delivered.

## Two corrections made during the work

- An intermediate count of 7,150 ALT rows was an R `NA`-subsetting artifact (a logical vector
  with `NA`s returns phantom rows). The file holds 3,575, all carrying an upper limit, and the
  CTCAE bands quoted sum to exactly that.
- The first ledger split assigned the analyte-vocabulary finding a cost of one display.
  `gsm.safety::Input_HysLaw` carries the same full-name `lMeasureValues` defaults as the
  chart, so the Hy's Law Candidate metric fails identically and invisibly. Cost is two, and
  the mock's ledger was rebuilt as an AND-structure over each display's blocking findings
  rather than a hand-assigned partition.

## Decisions this direction needs

`C1` artifact or session · `C2` never auto-apply, even at high confidence · `C3` do lossy
substitutions get carried onto the study site · `C4` should a broken key refuse the run ·
`C5` who drafts the `recode:` proposal to gsm.mapping (outside this program's write scope)

## Scope

Design only. Nothing in `open.gismo`, `demo-301` or any upstream repository was modified. The
fixture and the prototype detectors live outside every repository, in a scratch directory.
Competitor research was read-only from public documentation.

---

Drafted by Claude Code using Opus 5 and reviewed by @jwildfire
