# Guided setup for open.gismo (2026-08-27)

One of four competing directions explored in the open.gismo data-loading design session.
This one commits to **a guided setup**: the user is walked through one decision at a time,
in plain English, and the product does the inferring. It is optimised for someone who has
never seen gsm and does not know what an analysis domain is.

Requested by @jwildfire (2026-08-26): *"Maybe a ultradesign session for open.gismo? re-visit
the research comparing other sites and do some mockups on how users will load their own
data?"*

Extends row **D1** of the [platform gap analysis](../platform-gap-analysis-2026-07-25/) —
the data-mapping surface — from the guided-setup angle only. It deliberately does **not**
repeat the competitor survey done by the sibling artefacts in this session.

## Pages

| Page | What it holds |
|---|---|
| [`index.html`](index.html) | The design: six commitments, the staircase, the hard case walked end to end, what it costs, and five named weaknesses |
| [`walkthrough.html`](walkthrough.html) | The mockup — eight clickable steps. Steps 2, 3 and 5 are live: change an answer and the join count, the preview and the ledger all move |
| [`evidence.html`](evidence.html) | Method and verbatim output for all four measurements |

## The claim, in one line

Six questions, all answerable by looking at your own rows, reach a real chart from a CRO
delivery — and the design's shape is forced by the fact that the inference engine behind it
was measured producing a **confidently wrong answer** on the study open.gismo ships.

## What was measured, and how

Everything asserted about our own side was executed on 2026-08-27 against
`open.gismo` @ `dev` 6d23c9b (v0.2.0), `demo-301` @ main, working copies of
`safetyGraphics` and `safetyCharts`, with `gsm.mapping 1.1.3` / `gsm.kri 1.5.0` /
`gsm.core 1.2.0` installed.

- **M1 — the published name detector.** `safetyGraphics::detectStandard()` run unmodified
  against the fixture with `safetyCharts::meta_labs` and `meta_dm`: **3 of 9** lab roles
  (33%, and it names "SDTM" anyway), **5 of 7** on ADSL (71%), **0 of 4** hepatic analyte
  values. `hasColumn()` is exact membership — no fuzzy matching anywhere.
- **M2 — a name-blind value profiler**, written for this session (`data/profile.R`), on the
  same lab file: **9 of 9** roles correct, including the four M1 missed.
- **M3 — the same profiler on `demo-301/input/Raw_LB.csv`**: chose `visnum` as the lab
  result, `toxgrg_nsv` as the lower limit and `lb_dy` as the upper, scoring **1.000** —
  *above* the 0.849 it scored on the answer it got right. Re-ranking on a structural test
  (`data/profile2.R` — does some categorical column give exactly one reference range per
  level) puts the correct triple first on both lab files and demotes the impostor to second
  at purity 0.00.
- **M3b — the join.** Every character column against every other: `SUBJID`↔`SUBJECT` shares
  765 values, `USUBJID`↔`SUBJECT` shares **0**. `inner_join` on the latter yields **0 rows**
  from 57,200. A single constant prefix `AA-AA-000-0000` strips off `USUBJID` and recovers
  all 765.
- **M3c — the emitted spec runs.** A spec written exactly as the interview would emit it,
  pushed through `gsm.mapping::ApplySpec()` and the study's own inner join: 57,200 rows over
  765 participants, `lbstresn` numeric, `lb_dt` a Date. Six spec entries were dropped with
  **no message at any level** (`purrr::keep(~ .x$source %in% colnames(dfSource))`).
- **M4 — the price of a partial map.** `gsm.kri::CalculateRiskScore()` on identical site data
  with twelve KRIs mapped versus six: Site Risk Score **8.3 → 16.7**, exactly double, with no
  warning. `srs0001` is the only workflow with no `spec:` at all; its denominator is
  `sum(dfMaxWeights$max_WeightMax)` over the analyses that *ran*.
- **The staircase.** Every metric and module in `demo-301/workflows/` resolved through its
  `Mapped_*` dependencies to raw domains: `Raw_SUBJ` feeds 26 of 30 metrics and 10 of 12
  modules; `Raw_SUBJ` + `Raw_LB` (29 columns, two files) reaches **6 of 12 report modules**.
- **The ALT histogram** on walkthrough step 5 is the real distribution: 3,575 results over
  765 participants, binned 0–100 U/L in steps of 5, reference range 7–41. The caption states
  the 737 above the upper limit and the 320 that fall beyond the right edge rather than the
  chart hiding them.

## The fixture, and what is invented about it

All measurements use one constructed CRO delivery. **The values are real** — every row is
demo-301 study data, unchanged. **The packaging is invented**, and that choice is mine:

- `adsl.csv` (1,005 × 16) — `Raw_SUBJ.csv` renamed into ADaM, with `USUBJID` built as
  `studyid-subjid`.
- `lab_central.csv` (57,200 × 11) — `Raw_LB.csv` renamed to a central-lab extract, with
  `SUBJECT` as a bare id, `LBORRES`/`LBORNRLO`/`LBORNRHI` as the *original* rather than
  standardised result and range, analytes respelled `ALT` / `SGOT` / `TBILI` / `Alk Phos`,
  and `toxgrg_nsv`, `lbblfl`, `lb_dy` removed.

Two of those choices make the case harder and should be challenged: the
original-versus-standardised result is what makes M1 score badly, and the three removed
columns are what create the highest-friction moment. Both are real patterns; both are still
mine. This is stated on `evidence.html` as well as here.

The fixture itself is not committed — it is 57,200 rows of a study that already lives in
this workspace. The generating recipe is in `evidence.html`; sample rows are committed as
[`data/delivery.js`](data/delivery.js) so the walkthrough renders measured values rather
than illustrations. The probe scripts are [`data/profile.R`](data/profile.R) and
[`data/profile2.R`](data/profile2.R).

## What is invented in the mockup

- The visual design of the interview. open.gismo has no setup route today.
- `config/setup-log.md` does not exist; it is proposed as the artefact that keeps the user's
  plain English next to the machine-readable spec.
- The step-5 chart is a static SVG from the measured distribution, not a live `safety.viz`
  render.
- The four hepatic dropdown answers are pre-selected in the mock so the ledger can be shown
  in both states; the real interview would leave them empty.

## Known limitations

- **The structural ranker fixes the failure I found.** It is not evidence that the ranker is
  sound in general, and the failure mode it guards is silent-wrong rather than loud-broken.
- **The profiler is O(n³) in numeric columns.** Eleven is instant; an 80-column ADLB is over
  half a million combinations and would need pruning that reintroduces name heuristics.
- **The dependency graph is demo-301's.** A study drawing on `gsm.mapping`'s wider domain set
  has more.
- **Nothing was tested against a wide lab file** — one column per test rather than one row —
  where there is no categorical column for the structural test to group by.
- **The competitor landscape was not re-surveyed here.** M1 is a direct run of one
  open-source implementation, not a survey. The session's landscape work lives in the
  sibling artefacts.

## Boundaries respected

- **Nothing was built.** No change to `open.gismo`, `demo-301`, `gsm.mapping`, `gsm.kri`,
  `safetyGraphics` or `safetyCharts`. No issue, no branch, no PR.
- **No writes outside `jwildfire`.** `gsm.mapping` and `gsm.kri` are Gilead-BioStats
  repositories and were read only.
- **Read-only competitor research**, public sources only.
- **Sibling artefacts untouched.** Three sessions ran this brief in parallel;
  `open-gismo-data-loading-2026-08-27/`, `og-data-loading-design-2026-08-27/` and
  `og-mapping-bench-2026-08-27/` were not read into this design's argument beyond confirming
  no overlap, and not modified.

## Design notes

- Report chrome uses the obot report family tokens (executive overview 2026-07-21, goal atlas
  2026-07-24, platform gap analysis 2026-07-25) with the same three-state light/dark
  contract. The product frame in `walkthrough.html` deliberately overrides them with
  open.gismo's own espresso theme, fixed light in both modes, because a mock of a product
  should look like the product.
- Every state carries a glyph **and** a word. No colour-only status anywhere.
- Nothing is fetched at view time — no CDN, no web fonts, no network calls, no build step.
- Verified at a real 390px viewport: all three pages, no horizontal page scroll
  (`scrollWidth` 386), no element overflowing without its own scroll container, and the
  interview rail collapses from a sidebar to a horizontal step strip below 52rem.
- The walkthrough's interactive paths were exercised in-browser, including the failure
  states: choosing the zero-overlap join key produces a refusal and a repair offer, and both
  a broken join and a wrong result column block the first-light step rather than drawing
  something plausible.

---

Drafted by Claude Code using Opus 5 for review by @jwildfire.
