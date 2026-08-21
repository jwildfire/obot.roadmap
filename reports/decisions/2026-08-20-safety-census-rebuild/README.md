# D0023 — Rebuilding the safety census on metrics and reports

**Status: Decided 2026-08-20** — he approved all six recommendations (D0023.1–.6), in chat after listening to the audio episode of this page:

> *"I listened to the safety sentence episode and approve the recommendations."*

"safety sentence" is read as "safety census": the episode of this page is titled *Decision: safety census rebuild*, it is the only census episode on his show, and it carries these six recommendations. That is an interpretation of a dictated word rather than a transcription of it, so his sentence is quoted as he said it and the reading is annotated rather than folded in.

What the six now commit the build to, one line each:

- **Deaths (C1)** — the death count is the standard mapping's union of the death domain and the discontinuation-reason match (13 on the bundled study, against the 1 reported today), and a second descriptive metric publishes how many participants the two sources disagree about. The demo study has to start supplying death records.
- **Coverage (C2)** — "expected" per visit means the participants whose time on study reaches that visit; no study is asked for new data, and the alphabetical visit-ordering defect goes with it. The expected-count source is a declared input, so the visit-schedule definition stays available later.
- **Thresholds (C3)** — none. Every census number is descriptive: no threshold in any meta, no flag step in any workflow. A completeness threshold is a separate later decision that has to arrive with a clinical reason.
- **Level (C4)** — study only, thirteen definitions — and the grouping level is a declared setting from the first line, so adding sites later is a copy with one line changed rather than a rewrite. A build that hard-codes the study level meets half this answer and breaks the other half.
- **Compatibility (C5)** — nothing breaks. The function keeps its name and arguments (column-name arguments deprecated and ignored), the report keeps writing the same payload, the four contract row labels stay word for word with a test behind them, and the demo application is untouched — its figures simply become correct.
- **Charts (C6)** — no chart in this release, and the chart requirement filed in the same breath: [#291](https://github.com/jwildfire/obot.roadmap/issues/291), with the coverage chart as its first item.

Approval of the design is not approval of a release: `gsm.safety` is clinical work he reviews before production, and nothing in it moves on this answer.

**Requirement:** [jwildfire/obot.roadmap#274](https://github.com/jwildfire/obot.roadmap/issues/274) · **Task:** [#284](https://github.com/jwildfire/obot.roadmap/issues/284) · **Goal:** [#73 increased autonomy](https://github.com/jwildfire/obot.roadmap/issues/73)
**Q&A:** [#285](https://github.com/jwildfire/obot.roadmap/discussions/285)
**Answers:** [D0021](../2026-08-17-safetycensus-stay-or-go/) — his 2026-08-18 decision that `SafetyCensus()` stays and is rebuilt, design first.

## What produced this

@jwildfire, 2026-08-18, dictated after listening to the audio episode of D0021. He went against the review panel's recommendation and gave a design brief rather than a verdict: model the census on the gsm.kri report, move the core numbers into the gsm metric framework as metrics, make the census a report, build it as workflows plus helper functions, keep the name — and design it before implementing it, asking him questions where it needs them.

His load-bearing sentence, and the one this design is built from:

> *"Not every metric has to have an action associated with it… the point of metrics is to have trustable numbers that we can qualify and validate."*

## Design only — nothing in gsm.safety moves on this

No branch on gsm.safety, no change to the published function, no release work. Implementation follows once he has answered, as its own sub-issues of #274.

## The finding that made this cheap

The obvious objection to a metric with no action is that the framework refuses one: `gsm.core::Flag()` errors on a null threshold and `Summarize()` requires a `Flag` column. Both are true and neither binds, because gsm.kri's `srs0001` (site risk score) already ships as an unflagged metric — no `Threshold` in its meta, no `Flag()` step, `Flag = NA` on its published rows — and `gsm.kri::MakeWeights()` filters out any metric with a null flag or null risk weight, so a descriptive metric cannot move a site's risk score by accident.

That precedent means the design needs no change to any package we do not own, which matters: gsm.core, gsm.kri and gsm.mapping are Gilead-BioStats repositories and are read-only here.

## Measured for this page, not relayed

Reproduced in R against `gsm.core::lSource`, the ecosystem's own bundled study:

- The census's death count (exact match of `DEATH`/`DIED` against `Raw_STUDCOMP$compreas`): **1**.
- `Raw_Death`: **12** rows, 12 distinct participants.
- `gsm.mapping::complete_death()` union of the two, plus randomisation and overall-response context: **13** distinct participants with `death == TRUE`.

The extra participant in the union is the single study-completion row whose reason reads `Death` but who has no death record — the two sources genuinely disagree about one real person, which is why the third option on question C1 exists.

Also read directly rather than inferred:

- `Mapped_SUBJ`'s spec carries `invid`, `country`, `timeonstudy`, `timeontreatment`, `firstdosedate` — and no `arm` column, which is why "Randomised to an arm" comes out blank on any standard pipeline. The demo's own `Raw_SUBJ.csv` does carry `arm`, which is the bespoke mapping the defaults were proven against.
- `Mapped_Randomization` records that a participant was randomised (`rgmn_dt`) without recording to what, so counting randomisation from it honours the blinding stance more cleanly than reading an arm column at all.
- demo-301 maps neither `Death` nor `VISIT` today and has no `Raw_Death.csv` or `Raw_VISIT.csv` in `input/` — the cost attached to C1's and C2's recommended answers.
- open.gismo's `site/src/safety.js` looks up four census rows by exact `Label` string — `Enrolled participants`, `Received study drug`, `Person-years on treatment`, `Deaths` — via `pick(label)`, which returns undefined rather than erroring. A rewording silently drops a tile.

## Sources and assumptions

- gsm.safety `origin/main` (`6a7dca3`) — `R/SafetyCensus.R`, `inst/workflow/2_metrics/saf0001–3.yaml`, `inst/workflow/4_modules/safety_histogram.yaml`, `DESCRIPTION`, `NEWS.md`.
- gsm.kri working clone — `R/Report_KRI.R`, `R/CalculateRiskScore.R`, `R/MakeWeights.R`, `inst/workflow/2_metrics/srs0001.yaml`, `inst/workflow/4_modules/report_kri_site.yaml` and `report_prematuredeath.yaml` (the report-workflow precedent).
- Installed gsm.core 
 (`Input_Rate`, `Transform_Count`, `Transform_Rate`, `Flag`, `Summarize`), gsm.reporting (`MakeMetric`) and gsm.mapping (the `1_mappings` specs and `complete_death`).
- demo-301 `origin/main` — `scripts/safety-census.R`, `config/data-config.yaml`, `input/` and `workflows/1_mappings/`; the deployed app's census reader from open.gismo `fork/dev` `site/src/safety.js`.
- The verified defects are the D0021 panel's, reproduced here rather than restated. Nothing on this page retracts any of them.
- Assumption: the descriptive-metric shape stays available — it rests on gsm.kri and gsm.core behaviour we do not control. If either changes, the ten-line not-flagging helper is the only thing that has to move.

---

Drafted by 👯🤖 Claude Code (Claude Opus 5, worker W0085). Not reviewed by @jwildfire before publication — he answered it on 2026-08-20 after listening to the audio episode, and his answer is recorded above. His decision was recorded here by 👯🤖 Claude Code (Claude Opus 5, worker W0096), the same evening.
