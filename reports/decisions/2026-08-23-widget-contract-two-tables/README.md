# D0028 — The widget that has to carry two tables

**Status: Awaiting his answers** — W1–W4 (D0028.1–.4).

Eleven of the thirteen charts in the safety chart library can be called from R. The two that cannot — the participant profile and the Kaplan–Meier survival chart — are recorded as deferred because both need two tables of data while the R binding accepts one. That reason is wrong about the profile and understates the problem with the survival chart. This page builds all four candidate shapes, runs them, and reports what each one did.

**Requirement:** [jwildfire/obot.roadmap#165](https://github.com/jwildfire/obot.roadmap/issues/165) · **Blocked by it:** the two cited deferrals in `gsm.safety`'s widget-parity allowlist · **Goal:** [#78 clinical charts](https://github.com/jwildfire/obot.roadmap/issues/78)
**Follows:** [D0026](../2026-08-21-clinical-priorities/), which put the R widget catch-up at the head of the ranked ten.

## The four questions, one line each

- **W1 — the contract.** When a chart needs more than one table, how does it ask for them? Recommended: named table arguments, with one shared helper reading the chart's own contract to learn which tables and columns are required. It touches none of the eleven working widgets, and it is the shape the risk-indicator package next door already uses.
- **W2 — the profile's R surface.** Recommended: a standalone widget that takes the participants to show as an argument, plus a documented note that eight of the eleven widgets already open the profile beside them today.
- **W3 — the population table.** Recommended: analysis-dataset shaped, matching the other eleven widgets, vendored as a fifth example dataset. The pipeline-shaped route needs a derivation step and should not be the first two-table widget's problem.
- **W4 — the done-gate.** Does a widget have to be seen drawing before it counts as delivered? Recommended: yes — one rendering check per widget. Nothing today loads a built widget in a browser, which is why the broken shape below passes every check the package has.

## Executed, not argued

Run 2026-08-23 against `gsm.safety` `origin/dev` (`277fae8`) in a scratch worktree, R 4.3.3, `gsm.core` 1.2.0, with the vendored `safety.viz` 1.7.0 bundle the package actually ships.

- The obvious survival-chart binding under today's contract builds with no error, accepts column mappings that name columns which do not exist, and then renders `Required dataset(s) missing: events, population` in the browser. Cause, measured: the shared check reads required columns from `properties.settings.required`, which a two-table contract does not populate — 0 column checks against 2, 3 and 4 for the one-table charts.
- A second table carried inside `lSettings` — the route the profile's adverse-event domain already uses — serialises column-wise and arrives as `{USUBJID:[…], AEDECOD:[…]}`. The module's `Array.isArray` test fails and it drops the whole domain with no error, no warning and no mark on the page.
- A correctly built standalone profile widget renders `Waiting for selection — listening on document.` and nothing else. Its data contract declares one table; the blocker is the selection, not the tables.
- Eight of the eleven shipped widgets already mount the profile as a panel, on by default: histogram, shift plot, delta-delta, outlier explorer, adverse-event timelines, liver explorer, adverse-event explorer, QT explorer. Not: results over time, liver waterfall, kidney explorer. The setting that controls it appears in none of the vendored data contracts. A lab host feeds the profile labs only; an adverse-event host feeds it events only; neither shows both.
- The recommended shape, built end to end: the survival chart renders from R (254 participants, 3 arms, 217 events, 37 censored), every swallowed failure is now refused in R, and a two-table report workflow ran start to finish through `gsm.core::RunWorkflow()`.
- Test suite, integration branch: 2,941 passing / 0 failing / 13 skipped. Same branch with both new widgets and the contract change: 2,941 passing / 6 failing / 13 skipped. All six are hand-maintained rosters that name eleven widgets (exports, deferrals, gallery, example pages). No assertion belonging to an existing widget changed state.
- The stacked-table alternative, measured on the real data: 1,376 rows × 13 columns against 1,122 × 10 plus 254 × 4, 26% of cells pure padding, 1.22× payload, and `USUBJID` and `ARM` meaning different things in different rows.
- The parity guard passes on a binding file that exists. It passed for the broken widget.

## Claims found wrong

- Requirement #165 and `gsm.safety`'s parity allowlist, on the participant profile: *"its v2 AE domain means a second data frame, which the single-`dfResults` widget contract cannot carry."* Its published contract (`src/data/schema/participant-profile.json`) declares one dataset and always has; the adverse-event domain is optional and travels in settings. This changed W2 from a plumbing question to a product one.
- Requirement #165: *"time-to-event needs none [no design] beyond the established pattern."* It is the one that needs it.
- Requirement #165, Overview: re-vendoring the bundle at safety.viz v1.7.0 is listed as outstanding. It landed in gsm.safety #51; `Config/safetyviz/version` is 1.7.0 on `dev` and both renderers are in the shipped bundle.
- Requirement #165, Data Requirement: vendoring the `adae` and `adsl` extracts is listed as outstanding. `adae.csv.gz` landed on 2026-07-12 and shipped in v1.0.0; only the population extract is missing.
- Requirement #165 body targets gsm.safety v1.3.0; its title targets v1.4.0. `dev` carries v1.3.0 (Upcoming) and both v1.2.0 and v1.3.0 are release candidates in his queue, so v1.4.0 is right and the body is stale.
- The brief that commissioned this page: *"Both need two data frames — event records plus a population extract."* True of the survival chart only.

Held exactly as written: the shared binding helper does validate every one-table chart correctly. The defect is confined to the shape nothing has used yet.

## A trap worth recording

Twelve of the thirteen chart factories take `(element, settings)`. `participantProfile` takes `(element, data, settings)`. A binding copied from any of the others passes settings where data belongs and produces a chart complaining that four columns are missing from data it never received. This is not source-versus-bundle drift — it is the same in the source, at the tag, and in the bundle.

## Sources

- `gsm.safety` `origin/dev` (`277fae8`) — `R/utils-widget.R`, all eleven `R/Widget_*.R` and `inst/htmlwidgets/Widget_*.js`, `inst/schema/*.json`, `inst/workflow/4_modules/*.yaml`, `tests/testthat/`, `tools/check-safety-viz-parity.sh`, `.github/parity-allowlist.yaml`, and the vendored `inst/htmlwidgets/lib/safety.viz-1.7.0/safety.viz.js`.
- `safety.viz` `origin/main` = tag `v1.7.0` (`e83cfb7`) — `src/main.js`, `src/time-to-event*`, `src/participant-profile*`, `src/profile-host.js`, `src/data/schema/*.json`, `site/data/adsl.csv`, `site/demo/time-to-event.js`.
- `gsm.kri` `dev` — `R/Widget_*.R` and `inst/htmlwidgets/Widget_GroupOverview.js`, for the multiple-table precedent, and its `inst/workflow` specs for the multiple-domain workflow precedent.
- `gsm.mapping` 1.1.3, installed — `inst/workflow/1_mappings/SUBJ.yaml` and `AE.yaml`.

## Assumptions

- That the two release candidates in his queue land before this work, so it targets v1.4.0. If they do not, the release number changes and nothing else does.
- That every figure here is on `gsm.core` 1.2.0, which is what this machine has; CI installs 1.3.1. No figure on the page comes from the census metrics, which are the only place the two versions differ, and the 13 skipped tests are identical before and after the change.
- The probe implementation exists only in a local worktree and is evidence, not a candidate to merge.
