# The Mapping Bench — one direction for loading your own study into open.gismo (2026-08-27)

A design session on the step before everything open.gismo v0.2.0 does well: how a person with a
real EDC or CRO extract gets their own study into a project folder. Extends row **D1** of the
[platform gap analysis](../platform-gap-analysis-2026-07-25/) — the data-mapping surface.

Requested by @jwildfire (2026-08-26): *"Maybe a ultradesign session for open.gismo? re-visit the
research comparing other sites and do some mockups on how users will load their own data?"*

**This is one of four competing directions on the same brief**, written the same night by parallel
sessions and deliberately not hedged toward the others. It commits to a *mapping surface*: a dense
worksheet optimised for a clinical data manager who knows their data intimately and wants control.
Its weakest points are stated on the page, in the order the author would attack them.

## Pages

| Page | What it holds |
|---|---|
| [`index.html`](index.html) | The direction — the commitment, the four dispositions, what is automatic and what is asked, the moment of highest friction, the build cost, six weaknesses, seven decisions |
| [`bench.html`](bench.html) | The bench, working. Clickable: assign files to domains, bind, derive, declare constants, decline, dry-run, measure key overlap, map controlled values, watch the YAML being written |
| [`hard-case.html`](hard-case.html) | The three-laboratory liver panel, executed end to end against the installed packages. Verbatim console output |

## The design in one paragraph

Every column the pipeline declares, beside every column the study delivered, on one screen. Each row
carries one of **four dispositions** — Bound (to a source column), Derived (from a generated SQL
step), Constant (one value for the study), Declined (recorded with a reason and a printed price) —
and each writes into the project's own `workflows/1_mappings/*.yaml`, not into an app database.
Nothing is ever pre-filled: identical names bind on request, everything else stays a proposal until
a person clicks it. Readiness is never a count of filled boxes; the screen says *Not run* until the
mapping has executed against the real files.

## What was established, and how

Read from the repositories and executed on 2026-08-27 against `gsm.mapping 1.1.3`,
`gsm.core 1.2.0`, `workr 1.0.0` and `open.gismo` @ `dev` (v0.2.0):

- **14 raw domains, 126 columns**, with declared types, extracted from demo-301's own
  `workflows/1_mappings/*.yaml`, keeping only `Raw_*` and dropping the `_all` sentinel.
- **Downstream consumers per column and per domain**, from the 46 metric, reporting and module
  workflows. `Mapped_SUBJ$subjid` carries 25; `$invid` and `$country` 12 each; `$timeonstudy` 8.
- **The two spec keys.** `gsm.mapping/R/ApplySpec.R:42` reads `source_col` and `type` and nothing
  else, and `:47` is `purrr::keep(~ .x$source %in% colnames(dfSource))` — a column whose source is
  absent is dropped from the query at no verbosity level.
- **`og_validate()` never reads `source_col`.** `og_validate.R:201` is
  `setdiff(required, info$cols)` — target names against file columns. Verified by writing a correct
  `source_col` spec, getting the identical fourteen-column error report, and then handing the same
  spec to `ApplySpec()`, which mapped the file. *Independently found by the companion session the
  same evening; carried here because it is the fact under this design's readiness rule.*
- **The three-laboratory liver panel, run.** 14,300 rows and 765 participants delivered;
  10,076 rows and 548 participants survive the participant `inner_join`; 7,532 rows and
  **417 participants** reach the eDISH plot. The two defects mask each other exactly —
  4,224 LOCAL rows are simultaneously the site-prefixed identifiers and the missing reference
  ranges, and 2,544 SPEC rows are simultaneously the short analyte codes and the µmol/L bilirubin —
  so what arrives at the chart has no NAs, one unit per analyte and no warning of any kind.
  Arithmetic closes at both stages (7,532 + 4,224 + 2,544 = 14,300; 417 + 217 + 131 = 765).
- **Hy's Law candidates: 16 among 417 evaluable** — a correct number over a denominator nobody was
  told about.
- **A first attempt aborts** with `Conversion Error: Could not convert string '' to DOUBLE when
  casting from source column LBSTNRLO` and 29 rlang frames, because the local laboratories
  delivered empty reference-range cells.
- **The cost model was checked against reality and corrected three times**, each correction a real
  property of the workflows: a raw domain can feed more than one mapped domain (`STUDY.yaml` reads
  `Raw_SUBJ` to count participants, so `Raw_SUBJ.subjid` produces both `Mapped_SUBJ$subjid` and
  `Mapped_STUDY$subjid`); a mapped domain can be built from other mapped domains rather than a raw
  one (`Mapped_COUNTRY` comes entirely from `Mapped_SUBJ`); a mapping's query steps can emit columns
  that appear in no spec (`GroupID`, `egbase`, `egchg`); and module workflows declare their columns
  against `dfResults`, an alias for whatever `meta.Data` names.
- **Five workflows name no raw column at all** — `srs0001`, `Bounds`, `Metrics`, `report_kri_site`,
  `report_kri_country`. `srs0001` stacks every `kri*` that produced results and re-normalises, so
  declining a domain *moves its denominator* rather than failing. Named on the page as the one
  consequence this screen can warn about but not prevent.
- **Declining the seven undelivered domains leaves 26 of the 41 data-driven workflows running**,
  computed from the project's own workflows: all eight safety charts, both reporting workflows, and
  the AE, deviation, Grade 3+ lab, query-age and enrolment metrics at site and country level.

## What is invented

The incoming delivery — six files, their names, their column names and their row counts. It is
demo-301's own data re-cut as a CRO drop, and it is labelled as constructed on every page it
appears on. The one file built to be genuinely hard, `LAB_LIVER_ALL.csv`, was then run through the
real pipeline, so its failure figures are measurements of an invented study rather than assertions
about a real one.

Everything on the *contract* side is real: domains, columns, declared types, downstream consumers,
the four silences, and the `og_validate()` behaviour.

## The suggester's honest caveat

The alias list and the constructed delivery were written by the same person on the same evening, so
the hit rate shown on the bench is an upper bound on a real one rather than a measurement of one.
That is survivable for this direction specifically, because nothing the suggester says is ever
applied — a wrong suggestion costs one glance. It would not be survivable for a direction that
pre-fills.

The file proposer is disclosed the same way and is the more interesting result: it gets **seven of
fourteen domains right**, correctly abstains on one, and is **confidently wrong on six** — it puts
the liver-laboratory file on `Raw_DATACHG` at 75% name coverage — because nine of the fourteen
domains want a `studyid`, a subject identifier and a date, so every file matches every domain. That
number is the argument for asking rather than taking.

## Competitor context

Not repeated here. The landscape work for this brief is the
[companion session's](../open-gismo-data-loading-2026-08-27/landscape.html), including its
correction to row D1's membership, and this page cites it rather than re-running it. No demos, no
trials, no vendor contact, no accounts.

## Boundaries respected

- **Nothing was built.** No change to `open.gismo`, `demo-301`, `gsm.mapping`, `gsm.core` or any
  other repository's source. No issue, no branch, no pull request.
- **No writes outside `jwildfire`.** `gsm.mapping` and `gsm.core` are Gilead-BioStats repositories;
  they were read. Decision D-B5 deliberately recommends the option that needs nothing from them.
- **No other session's work was touched.** Two sibling artifacts were being written in this same
  checkout while this one was; only `reports/og-mapping-bench-2026-08-27/` was created or modified.

## Design notes

- Base token set matches the obot report family (executive overview 2026-07-21, goal atlas
  2026-07-24, platform gap analysis 2026-07-25), with the same three-state light/dark contract.
- The bench renders in open.gismo's espresso theme (`site/src/style.css`: `#271810` rail,
  `#faf6f1` paper, `#c2410c` accent), fixed light in both modes, because a mock of a product should
  look like the product. Those tokens are namespaced `--og-*` and never leak into the report chrome.
- Every state mark carries a glyph **and** a written word. No state is encoded by colour alone.
- One diagram, inline SVG, showing where each of the four dispositions lands in the project file and
  that the engine below is unchanged.
- Self-contained: system font stacks, no CDN, no network calls, no build step. The contract is
  frozen in `data/bench-data.js` as `window.BENCH`, and the figures quoted in the prose are computed
  from it at render time rather than typed.
- Verified with an iframe probe at a real 390 px viewport: no element overflows its container and
  the page body does not scroll horizontally. The bench collapses from three columns to one below
  62 rem and each row stacks.

## Known limitations

- **One study.** The 14 domains and 126 columns are demo-301's. A study drawing on gsm.mapping's
  wider set (VISIT, Death, Randomization, OverallResponse, PK, Consents, AntiCancer) has more,
  which sharpens the direction's second weakness rather than softening it.
- **The build estimates have no spike behind them.** The spec writer is the item most likely to be
  wrong, and it is wrong in the expensive direction.
- **The cost model resolves join-carried columns to `Raw_SUBJ`.** Columns arriving on `Mapped_AE`
  and `Mapped_LB` from `Mapped_SUBJ` are attributed there. Right for demo-301's mappings; would need
  re-deriving for a study that joins differently.
- **The eDISH reach figures are a real measurement of an invented study.** That is the strongest
  claim available without a sponsor's data, and it is not the same as a claim about a real one.

---

Drafted by Claude Code using Opus 5 for review by @jwildfire.
