# gsm.safety v1.2.0 — annotated demo

The review surface for the consolidated gsm.safety v1.2.0 release candidate
([gsm.safety#88](https://github.com/jwildfire/gsm.safety/pull/88), `dev` → `main`), under
@jwildfire's decision of 2026-09-12 to ship everything merged since v1.1.0 as one release
("Let's go with option B, but squash it all into a single release: PR/Release notes/Demo for
a single v1.2"). It delivers four hub requirements: widget parity (#164), the SafetyCensus
rebuild (#274), the last two widgets (#165) and FDA ST&F phase 0 (#9), and the study-day
axis work under #438.

## Update of 2026-11-11

Three things changed after the page was written, and the page was measured again for them.

- gsm.core 1.3.2 regenerated the bundled study, and the census was re-qualified on it
  (gsm.safety#168, PR #169). gsm.safety's `Input_Deaths()` now reads `Mapped_STUDCOMP`
  itself and matches the reason in any case, because gsm.mapping 1.2.0's `Death.yaml`
  asks for `DEATH` and the study writes `Death`.
- The vendored bundle is safety.viz v1.12.0, and the example data carry `DY` and `ABLFL`.
- The Visit | Study day toggle reaches R (gsm.safety#166, PR #167).

### Code and libraries

- gsm.safety at `c3771e1` (branch `165-vendor-1.12.0`: `dev` after #169 plus the x-axis
  work), checked out detached into `gsm.safety/.claude/worktrees/demo-c3771e1` and installed
  with `R CMD INSTALL` into a private library holding gsm.core 1.3.2, gsm.mapping 1.2.0,
  gsm.reporting 1.1.8 and workr 1.1.1 (CI's versions).
- gsm.safety v1.1.0 from its tag (detached worktree `demo-v110`), installed into its own
  library and put first on `R_LIBS` for the before runs, with the same dependencies.
- R 4.3.3 with `LANG=en_US.UTF-8`; Chromium through the Playwright install in
  `safety.viz/node_modules`.

### Part 1, the eDISH comparison (re-measured)

- `Widget_HepExplorer(ExampleData("adbds"), lSettings)` with the release's
  `inst/workflow/4_modules/hep_explorer.yaml` settings, saved with
  `htmlwidgets::saveWidget(selfcontained = FALSE)` as `after/`.
- `before/` is a copy with the library directory renamed to `safety-viz-1.4.0`, its
  `safety.viz.js` replaced by the v1.1.0 tag's `inst/htmlwidgets/lib/safety.viz-1.4.0/`,
  and the HTML's reference rewritten. The two HTML files are identical once the directory
  name is set aside (checked with `cmp`), 7,359,960 and 7,359,961 bytes.
- A headless Chromium script wrapped `SafetyViz.hepExplorer` before the page loaded to keep
  the instance, clicked the Composite view button, and read `compositeSubjectsShown`
  (peak and baseline ×ULN, both quadrants) plus the count line. Results: 293 shown and 71
  excluded under both bundles; on-treatment quadrants 233/28/16/16 (1.4.0) and
  246/13/19/15 (1.12.0) for Normal & NN / Hy's Law / Temple's Corollary / Cholestasis;
  23 participants' peaks move, all downward, all in the `CLD-*` cohort, all 23 change
  quadrant (15 out of Hy's Law); no baseline differs.
- The ledger rows are generated from those two readings. The cohort counts (254 pilot,
  64 CLD, 46 AKI; baseline day per cohort; 25 pilot excluded) and CLD-9010's records are
  read from `ExampleData("adbds")` in R.
- Captures `composite-1.4.0.jpg` (replaced) and `composite-1.12.0.jpg` (new) are clips of
  the composite view at 1400 px, device scale 2. `composite-1.7.0.jpg` is no longer
  referenced and is kept, since nothing is deleted.
- The bundle hash is SHA-256 of the vendored `safety.viz.js` against a download of
  `https://jwildfire.github.io/safety.viz/dist/safety.viz-1.12.0/safety.viz.js`.
- The August figures (295/69 → 293/71, 9 moved, 2 left, no quadrant change) were measured on
  the example data as it stood on `release/v1.2.0`, whose study day was the visit number,
  with the 1.7.0 bundle. They stay on `reports/gs-v1.2-demo/`.
- `hep-waterfall.jpg` and `nep-explorer.jpg` were replaced with captures of the release's
  `hep_waterfall` and `nep_explorer` report workflows. Their counts (58 of 80, 22, 7;
  276 staged, 24 not plotted) were read from the rendered pages and match August's. The
  check that the nephrotoxicity explorer's earliest creatinine record is the flagged one
  for all 300 participants was run in R.

### Part 2, the census (re-measured)

- `Rscript tools/qualify-death-count.R` and `tools/qualify-census-metrics.R` from the
  checkout: both AGREE (12 of 754; every figure twice).
- The before column is the v1.1.0 `SafetyCensus()` on the same mapped domains (the
  standard gsm.mapping workflows for SUBJ, STUDCOMP, OverallResponse, Randomization, Death,
  AE and LB): 754, blank, 599, 2, 74.4, 56.5, median 31, 572, ECG blank, 635, 116; the
  disposition table 57 ongoing, 22 lost to follow-up, 21 completed, 12 withdrew consent,
  2 died, 2 discontinued with no reason, 638 not in the domain.
- The withheld-domain run calls the release's `SafetyCensus()` with and without `dfDeath`.
- `census-report.jpg` (replaced): the mapping above, the twelve census definitions' eleven
  runnable metrics through `gsm.core::RunWorkflows`, `gsm.reporting::BindResults`
  (snapshot date 2026-11-11) and `MakeMetric` over all twelve definitions, then the
  `safety_census` workflow; the page captured at 850 px, device scale 2.
- The version table's 1.2.0 and 1.3.1 columns are the qualification record's and the
  first version's; only the 1.3.2 column was measured here.

### Part 4 (checked)

- The row counts (46, 80) and the grading table were run again on the release's
  `ExampleData("adbds")`; all unchanged. The liver-grades figure is September's.

### Part 5, the study day (new)

- `Widget_ParticipantProfile()` with the shape of its help-page example, cohort
  `"01-701-1028"`, `default = "day"` and `default = "visit"`, saved with
  `saveWidget(selfcontained = FALSE)` and captured at 1200 px, device scale 2
  (`profile-study-day.jpg`, `profile-visit.jpg`). The adverse-event days (3, 21) and the
  visit days (Week 2 = 14, Week 4 = 27) were read from `ExampleData("adae")` and
  `ExampleData("adbds")`.

### The full change notes

- Rendered with pandoc (gfm → HTML) from the long form of the v1.2.0 notes as it stood on
  2026-11-11, one collapsed `<details>` per level-2 heading. Bold runs that open a list
  item became a styled lead; other bold was unwrapped. The "See it move" line was rewritten
  so the page does not link to itself, and the figures table was left out because part 2
  carries it. Three figures measured on earlier data were replaced with this update's
  measurements and marked on the page.

## How the page was first made (2026-09-12)

The page was assembled from the three demo pages written for the earlier, stacked
candidates, which stay published as the record of when each part was measured:

- Part 1 is `reports/gs-v1.2-demo/` (measured 2026-08-22 on `release/v1.2.0` at `4a436ce`).
- Part 2 is `reports/gs-v1.3-demo/` (measured 2026-08-22 on `release/v1.3.0` at `9f76d42`).
- Part 4 is `reports/gsm-safety-v1.5.0-demo/` (measured 2026-09-11 on `dev`).
- Part 3, the two widgets that never had a candidate or demo, is written from the v1.4.0
  section of `NEWS.md` on `dev` and the closing comment on requirement #165 (gsm.safety#72);
  it carries no capture and says so.

The example data are CDISC Pilot 01 with documented synthetic cohorts and the ecosystem's
synthetic bundled study; no real participant data appears.

Assembled by Claude Code using Fable 5.1 in the 2026-09-12 prep session; updated by Claude
Code using Opus 5.5 on 2026-11-11.
