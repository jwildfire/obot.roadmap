# D0027 — Where the data-coverage numbers come from

**Status: Awaiting his answers** — DC1–DC5 (D0027.1–.5).

Data coverage per visit is the thirteenth census number and the only one of the thirteen that was not built. It is also the first item of the chart requirement he approved. Both stop in the same place: no standard domain says which visit a lab result belongs to, and the definition of "expected" he approved needs a per-visit scheduled day that no standard domain carries. This page measures what each way of closing those two gaps actually produces, on both studies the programme has, and puts five questions to him rather than guessing.

**Requirement:** [jwildfire/obot.roadmap#306](https://github.com/jwildfire/obot.roadmap/issues/306) · **Blocked by it:** [gsm.safety#58](https://github.com/jwildfire/gsm.safety/issues/58) under [#274](https://github.com/jwildfire/obot.roadmap/issues/274), and [#291](https://github.com/jwildfire/obot.roadmap/issues/291) · **Goal:** [#73 increased autonomy](https://github.com/jwildfire/obot.roadmap/issues/73)
**Answers on:** [D0023](../2026-08-20-safety-census-rebuild/), question C2 (D0023.2).

## The five questions, one line each

- **DC1 — the visit label.** Where does a visit label for a lab result come from? Recommended: the study's own lab mapping passes through the visit-name column its raw data already carries, and the metric stops when it is absent.
- **DC2 — the denominator.** What defines the day a visit is expected on? Recommended: support two declared forms — the visit table, and a study-declared visit schedule — take the visit table when both are present, and never infer a schedule from observed dates.
- **DC3 — results outside the denominator.** Recommended: count only participants in the expected set, and publish the outsiders as their own descriptive number, which is the shape he approved for the death count's two disagreeing sources.
- **DC4 — a study that supplies neither input.** Recommended: publish nothing, and name the missing input on the report.
- **DC5 — ordering.** Recommended: the study's declared order when there is one, the middle of each visit's observed dates when there is not, and the ordering day printed on the row either way. Never alphabetical.

## Measured for this page, not relayed

Everything below was produced in the session that wrote the page, on `gsm.core` 1.3.1 and `gsm.mapping` 1.1.6 with R 4.3.3 — the versions the automation installs today — both installed from source into a scratch library so the machine's own library was not changed.

On the ecosystem's bundled study (`gsm.core::lSource`), through the standard mapping:

- `Mapped_LB` carries `studyid`, `subjid`, `toxgrg_nsv`, `lb_dt` — four columns, no visit column. `Raw_LB` carries `visnam` on all **405,720** rows; the mapping's own spec declares four columns and `Ingest()` drops the rest.
- `Mapped_VISIT` carries `visit` (from `foldername`) and `visit_dt`: **8,000** rows, 1,000 participants, 8 visits each. Of gsm.mapping's 23 mapping workflows, a visit *label* survives into exactly two mapped domains — the visit domain and PK.
- A metric declaring `Mapped_LB.visnam` and running against the standard mapped data: the spec check passes, the step logs `[FATAL] Referenced column "visnam" not found`, `RunWorkflow()` returns `NULL`, and **no error reaches the caller**.
- Lab rows whose date exactly matches a visit date for the same participant: **0 of 405,720**. Nearest-visit-date attribution scored against the raw rows' own `visnam`: **12.5%** correct on a 60-participant sample (31,680 rows) — chance for eight visits — with a median 50-day gap. The lab domain holds **3** distinct dates study-wide, and **61.4%** of lab rows are dated on the participant's enrolment date.
- Every one of the **762** enrolled participants has a visit calendar spanning longer than their recorded time on study: median visit span **117** days against median `timeonstudy` **30**.
- C2's definition with the scheduled day inferred as the median observed study day: 79%, 89%, 142%, 252%, 393%, **1,220%**, and two visits with a denominator of zero.
- The recommended shape (visit label from the study's mapping, expected from the visit table): **598 of 762** at each of the eight visits, 78.5%.
- Alphabetical ordering puts `End of Treatment` and `Follow-up` ahead of `Screening`; ordering by median observed study day recovers the correct clinical order for all eight.

On the live demo study (`demo-301`, `main`), read directly from its input files:

- Its own lab mapping declares `visnam`, `visnum` and `lb_dy` — the visit label, its order and the study day. It maps no visit domain and ships no `Raw_VISIT.csv`.
- Every visit carries an exact scheduled day (minimum, median and maximum identical): Baseline 1, Week 1 8, Week 2 15, Week 3 22, Week 4 29, Week 6 43, Week 8 57, Week 12 85, Week 16 113.
- C2's definition there: 100%, 99%, 99%, 99%, 100%, 92%, 55%, 11%, 100%. **286 of 765** enrolled participants have a lab result dated after their recorded time on study ends, and **269 of the 286** week-16 lab participants fall outside the expected set — 1,682% if they are counted, invisible if they are not.
- It also ships `Raw_EG.csv` and its own ECG mapping carrying `visnam`, `visnum` and `eg_dy`, so ECG coverage is computable there while `gsm.mapping` ships no ECG mapping at all.

## Claims found wrong

- gsm.safety#58, finding 4: *"it cannot key on it at all without a change upstream."* It can. The visit label is in the raw lab data on both studies, and the study's own mapping decides whether it survives — which is what demo-301 already does. This correction is what the whole recommendation rests on.
- D0023's C2 rationale, *"nothing new is asked of any study"*: something new is asked of every study, a per-visit scheduled day.
- D0023's C2 rationale, *"it takes a defect with it — the alphabetical visit-ordering fault goes away"*: changing the denominator orders nothing. The ordering question is live and is DC5.
- Requirement #306, *"the subject domain carries no enrolment date"*: true of `Mapped_SUBJ`, but it carries `firstdosedate`, and the standard `Mapped_ENROLL` carries `enroll_dt`. Anchor dates exist; the scheduled day is what is missing.

Held exactly as written: a metric declaring a column the mapping dropped does not receive it. Not previously recorded: it fails silently.

## Sources

- `gsm.safety` `origin/dev` (`277fae8`) — `inst/qualification/census-metrics-qualification.md`, `inst/workflow/2_metrics/saf0001`–`saf0015`, `inst/workflow/4_modules/safety_census.yaml`, `R/SafetyCensus.R` on both `dev` and `main`.
- `gsm.mapping` 1.1.6 and `gsm.core` 1.3.1, built from `Gilead-BioStats` `origin/main` and installed to a scratch library; the mapping specs read from the installed package.
- `demo-301` `origin/main` (`86ab167`) — `workflows/1_mappings/LB.yaml`, `config/*.yaml`, `input/Raw_LB.csv`, `input/Raw_EG.csv`, `input/Raw_SUBJ.csv`, `scripts/safety-census.R`.
- The ranked position of the two blocked items read from obot.agent's `rank/top10.json`, where the census rebuild is second and the coverage chart third.

## Assumptions

- That a study may supply its own mapping workflows is treated as a supported configuration rather than a workaround, on the evidence that the live demo study already does it and that two of the package's three existing safety metrics only run on a study that does.
- The bundled study is a snapshot: it changed under the same name between `gsm.core` 1.2.0 and 1.3.1, which is what produced the correction block on D0023. Every figure here is on 1.3.1 and should be re-measured, not re-quoted, on any later version.

---

Drafted by 👯🤖 Claude Code (Claude Opus 5, worker W0121) for 🧭🤖 obot-navigator. Not reviewed by @jwildfire before publication.
