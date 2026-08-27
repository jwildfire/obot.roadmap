# Loading your own data into open.gismo (2026-08-27)

A design session on the step before everything open.gismo v0.2.0 does well: how a person
with a real EDC export gets their own study into a project folder. Extends row **D1** of the
[platform gap analysis](../platform-gap-analysis-2026-07-25/) — the data-mapping surface —
with a narrower competitor question and a set of clickable mockups.

Requested by @jwildfire (2026-08-26): *"Maybe a ultradesign session for open.gismo? re-visit
the research comparing other sites and do some mockups on how users will load their own
data?"*

## Pages

| Page | What it holds |
|---|---|
| [`index.html`](index.html) | The argument — three problems, the seams that already exist, the build order, and seven decisions |
| [`landscape.html`](landscape.html) | Thirteen platforms, re-read for what a user actually *does*; six kinds of front door; sources |
| [`mockups.html`](mockups.html) | Four clickable screens. Screen 3 is live — change a mapping and the readiness line, the preview and the diff all move |

## What was established, and how

Everything about our own side was read from the repositories on 2026-08-27, not inferred:

- **14 raw domains, 126 required columns** — extracted from the `spec:` blocks of
  `demo-301/workflows/1_mappings/*.yaml`, keeping only `Raw_*` domains and dropping
  sentinel keys (`_all`).
- **Downstream dependencies** — from the 30 metric workflows in
  `demo-301/workflows/2_metrics/` and the 12 module workflows in `4_modules/`, by the
  `Mapped_*` domains each names in its `spec` block or its `meta.Data` key.
  `Mapped_SUBJ` is read by 25 of them; `Mapped_LB` feeds 6 of the 9 safety charts.
- **The inner joins** — `demo-301/workflows/1_mappings/AE.yaml` and `LB.yaml` both end in
  `dplyr::inner_join` on `subjid` against a lookup derived from `Mapped_SUBJ`. The AE
  workflow documents this as the data-cleaning step, on purpose.
- **The two spec keys** — `gsm.mapping/R/ApplySpec.R:42` reads `source_col` and `type` and
  nothing else; the key is documented in `gsm.core`'s `gsmExtensions` article and is
  exercised across `gsm.mapping/inst/workflow/1_mappings/` against Rave-flavoured source
  names (`subjectname`, `foldername`, `protocol_number`, `pi_number`).
- **Warn-and-continue on a missing domain** — `open.gismo/R/og_run.R:397`,
  `.og_load_input()`: a missing input file raises `warning()` and `next`.
- **What today's validation does check** — `open.gismo/R/og_validate.R`: per-file column
  presence and numeric coercion on a 5,000-row sample. It reads one file at a time and
  never compares keys across files.
- **Real overlap figures in the shipped demo** — 1,005 subjects in `Raw_SUBJ`, 765 with
  `enrollyn == "Y"`, 57,200 `Raw_LB` rows over exactly those 765, 2,583 `Raw_AE` rows over
  616 of them. Measured directly from `demo-301/input/`.

## Competitor research

Thirteen platforms, all from public documentation, package reference indexes, user guides
and PhUSE papers. No demos, no trials, no vendor contact, no accounts created. Every
per-platform source is linked at the foot of `landscape.html`.

**Seen on means documented, not verified.** Rows that could not be established from public
material say so rather than being filled in — Spotfire clinical's column-mapping interaction
and clinDataReview's batch-comparison mechanism are both recorded as unestablished.

### A correction to the anchor report, recorded on purpose

The gap analysis scored D1 as seen on safetyGraphics, JReview, Spotfire clinical, tidyCDISC
and elluminate. On this closer reading:

- **tidyCDISC** has no mapping surface at all — a missing required variable rejects the
  upload outright. It should not have been credited.
- **Spotfire clinical** could not be established either way.
- **JReview**'s mapping is real but lives in an administrator-configured data dictionary.
- **Medidata**, **Veeva CDB** and **Empirica Signal** all have one and were not credited.

Five of thirteen cells in that row were wrong in one direction or the other. The count
survived; the membership did not.

## What is invented

The incoming export in the mockups — file names, the lab vendor's column names, the sample
values, the row counts on screens 1 and 2 — is constructed to make the argument and is
labelled as such on the page. Everything on the *left* of the mapping grid (target column,
type, downstream consumer) is real.

The `recode:`, `transform:` and `derive:` keys shown in the screen-4 diff are a **proposal**,
rendered in a different colour with an explicit marker, because the gsm mapping spec has no
such key today. That is decision D4.

## Boundaries respected

- **Nothing was built.** No change to `open.gismo`, `demo-301`, `gsm.mapping` or any other
  repository's source. No issue, no branch, no PR.
- **No writes outside `jwildfire`.** `gsm.mapping` is a Gilead-BioStats repository; the D4
  proposal is a draft handed to @jwildfire, not an issue filed upstream.
- **Read-only competitor research.** Public documentation only.

## Design notes

- Base token set matches the obot report family (executive overview 2026-07-21, goal atlas
  2026-07-24, platform gap analysis 2026-07-25), with the same three-state light/dark
  contract: the full light palette on bare `:root`, the dark palette redefined under
  `prefers-color-scheme` guarded against an explicit light choice, and again under
  `[data-theme="dark"]`.
- The mockups deliberately break from that and render in open.gismo's own espresso theme
  (`site/src/style.css`: `#271810` sidebar, `#faf6f1` paper, `#c2410c` accent), fixed light
  in both modes, because a mock of a product should look like the product.
- Fonts are system stacks throughout. Nothing is fetched at view time — no CDN, no web
  fonts, no network calls, no build step.
- Every status mark carries a glyph **and** a written word. No state is encoded by colour
  alone, in the report chrome or in the mocks.
- Verified at a 390px viewport: the mock sidebar drops out below 52rem, the mapping grid
  collapses from three columns to stacked rows below 44rem, and every wide table scrolls
  inside its own container rather than the page.

## Known limitations

- **Nothing was executed.** The consequence of a zero-overlap join follows from reading the
  workflow's inner join, not from running the pipeline against broken data.
- **The demo study is one study.** The 14 domains and 126 columns are `demo-301`'s. A study
  that adds domains from `gsm.mapping`'s wider set (VISIT, Death, Randomization,
  OverallResponse and the rest) has more.
- **`gsm.mapping`'s raw layer was characterised, not exhaustively catalogued.** The claim
  that findings and events are lower-case SDTM-adjacent while subject, site and enrolment
  are operational-EDC shaped is a reading of the fourteen specs, and there are columns that
  sit awkwardly in both camps.

---

Drafted by Claude Code using Opus 5 for review by @jwildfire.
