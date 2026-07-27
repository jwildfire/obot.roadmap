# Reports

AI-generated reports for the obot portfolio, following the
[gsm.roadmap](https://github.com/Gilead-BioStats/gsm.roadmap) artifacts pattern:
**one folder per report**, containing a self-contained `index.html` (plus any assets)
and a `README.md` recording provenance, sources, and assumptions. The site deploy
workflow publishes this folder as-is.

The reports below were migrated from the [archived obot-claw hub](https://github.com/obot-claw/obot-claw.github.io)
(July 2026). New reports land here under the same contract; see the design doc for
requirement [#7](https://github.com/jwildfire/obot.roadmap/issues/7).

## Index

| Report | Date | Status |
|---|---|---|
| [open.csr text-block editor — live protocol](open-csr-text-editor-2026-07-26/) | 2026-07-26 | Current — the editing surface shipped by [open.csr#9](https://github.com/jwildfire/open.csr/pull/9) (part B of [#113](https://github.com/jwildfire/obot.roadmap/issues/113), *reader → editor*), demonstrated by **running it**: the repository's own gate module (`text-core.js`), diff writer (`editor-core.js`), a real 84-row CDISCPILOT01 ARD and two prose blocks are inlined into the page, so both editors are live and a twelve-step protocol drives them — type a number by hand and the numeric-fidelity gate fails it in the sentence; bind the same number and it passes. Each step declares what it expects and then checks itself (12/12 against [`bb58906`](https://github.com/jwildfire/open.csr/commit/bb58906)). Covers the four ways a binding goes wrong, `scale`/`digits` qualifiers, the patch (hunks offset past the frontmatter, so no browser edit can touch approval state) and the multi-block patch bar |
| [safety.viz v1.5.0 — annotated demo](sv-v1.5-demo/) | 2026-07-25 | Current — visual companion to the release plan for [#114](https://github.com/jwildfire/obot.roadmap/issues/114) item R1: what v1.5.0 adds, feature by feature, as four annotated walkthroughs — participant profile and its v2 rail plus adverse-event domain ([sv#105](https://github.com/jwildfire/safety.viz/pull/105), [sv#112](https://github.com/jwildfire/safety.viz/pull/112)), migration Sankey + ALT waterfall ([sv#97](https://github.com/jwildfire/safety.viz/pull/97)), the eDISH follow-ups ([sv#110](https://github.com/jwildfire/safety.viz/pull/110)) and pre-filled axis limits ([sv#108](https://github.com/jwildfire/safety.viz/pull/108)). Four short screen captures (draggable Hy's-Law cut-lines, profile click-through, Sankey → composite hand-off, waterfall hover) plus annotated stills, all taken with Playwright against the live [dev site](https://jwildfire.github.io/safety.viz/dev/) — the build this release promotes — with numbered steps into each demo. The profile captures were re-taken late on 2026-07-25 against the rail, after sv#112 merged and removed the dock |
| [Audit view redesign — three ways to clear the queue](audit-view-redesign-2026-07-25/) | 2026-07-25 | Current — design prototypes for [#109](https://github.com/jwildfire/obot.roadmap/issues/109), driven by the real nightly ledger (33 findings, 22 rules): three working compact views — **A Ledger** (one table, rule bands, detail in place), **B Rail** (master–detail), **C Sweep** (rule-first batch). The queue drops from 9.3 screens to 2.0 and from 125 px to 31 px per finding; ✓/✗ per row and per rule, collapsible search/sort/filter sidebar, staged decisions that print the `repository_dispatch` body instead of sending it. **Decided the same day: Option B ships, dispatch stays per click**, D3–D7 to the recommendation (rule-band reject confirms above 3, activity log as a fold under the table, rule reference kept, run status as a row pill plus one panel); [PR #110](https://github.com/jwildfire/obot.roadmap/pull/110) unblocked |
| [Dashboard chat — working prototype](dashboard-chat-2026-07-25/) | 2026-07-25 | **Parked 2026-07-26 (backlog)** — evidence for [#77](https://github.com/jwildfire/obot.roadmap/issues/77): a file-based per-session inbox delivered by a Stop hook (working sessions) or a persistent Monitor (idle sessions), with the transcript JSONL tailed as the reply stream and a loopback-only local server hosting the live page; both lanes verified end to end (0.9 s idle, next turn boundary while working); decisions D1–D6 awaiting @jwildfire; companion to [design #77](../requirements/design/77_design.html) and [obot.agent PR #50](https://github.com/jwildfire/obot.agent/pull/50) |
| [Platform gap analysis — what the other safety platforms ship that we don't](platform-gap-analysis-2026-07-25/) | 2026-07-25 | Current — external-landscape survey: 13 safety-monitoring / clinical-review platforms plus 2 reference catalogues, 63 capabilities scored against the portfolio (17 have, 7 filed, 37 missing or partial). Headline: the chart migration is nearly complete and ahead of the field on abnormal-baseline DILI, but **0 of 10 review-workflow capabilities** exist here — review state, change-since-last-review, annotation, issue tracking, alerting. 12 ranked requirement proposals, deduplicated against the goal atlas (defers to its C3–C8, A3, A6, A7); nothing filed |
| [The Goal Atlas — first sweep of the roadmap against the goal layer](goal-atlas-2026-07-24/) | 2026-07-24 | Current — first full issue sweep after the goal layer shipped ([#53](https://github.com/jwildfire/obot.roadmap/issues/53)/[#71](https://github.com/jwildfire/obot.roadmap/issues/71)): 182 issues, only 29 of 74 open ones reachable from a goal, 45 unclaimed including 20 requirements; four rollup visualizations, three proposed new goals (workbench / one-product / evidence) with rosters, nine proposed relinks, and 32 candidate requirements across the four goals; all proposals awaiting @jwildfire — nothing filed or linked |
| [Participant profile v2 — where the profile lives](participant-profile-v2-mockup-2026-07-24/) | 2026-07-24 | Current — interactive UX mockup for [#75](https://github.com/jwildfire/obot.roadmap/issues/75): the profile in a right-hand rail, the four surfacing options switchable live against the real chart + profile modules, expand-to-full-screen, and the AE summary / AE timeline tracks on the lab chart's study-day axis; decisions D1–D9 awaiting @jwildfire; companion to [design #75](../requirements/design/75_design.html) |
| [Participant profile — one drill-down module for every safety.viz chart](participant-profile-module-options-2026-07-22/) | 2026-07-22 | Current — triggered by collaborator feedback on the composite view's missing eDISH-style click drill-down; four surfacing options (A dock / B drawer / C view / D host-composed) with a recommended hybrid + cohort stepper; decisions D1–D4 awaiting @jwildfire; relates to [sv#87](https://github.com/jwildfire/safety.viz/issues/87)/[#88](https://github.com/jwildfire/safety.viz/issues/88)/[#53](https://github.com/jwildfire/safety.viz/issues/53)/[#91](https://github.com/jwildfire/safety.viz/issues/91) and [hub #43](https://github.com/jwildfire/obot.roadmap/issues/43) |
| [obot portfolio — executive overview](executive-overview-2026-07-21/) | 2026-07-21 | Current — accomplishments to date, status across 7 workstreams, next steps (this week + Aug–Sept), gaps G1–G7, and the roadmap.html diagnosis behind generator v1.8.0; feeds [hub #31](https://github.com/jwildfire/obot.roadmap/issues/31). Direction update same night (banner in report): stage model set — Stage 2 = safety.viz fully shipped, Stage 3 = autonomy goals (charts + safetyGraphics-replacement app), Phase 4 = Sept talk prep; decisions on [#10](https://github.com/jwildfire/obot.roadmap/issues/10)/[#18](https://github.com/jwildfire/obot.roadmap/issues/18)/[#34](https://github.com/jwildfire/obot.roadmap/issues/34) |
| [FDA ST&F — static display strategy](fda-stf-static-displays-plan-2026-07-21/) | 2026-07-21 | Current — full inventory of the 60 tables / 22 figures in guide v2.0; 15 figures unserved in open-source R, 12 with a shipped safety.viz twin; architecture + phasing recommended, decisions D1–D4 awaiting @jwildfire; input to [hub #9](https://github.com/jwildfire/obot.roadmap/issues/9) (P005) |
| [Safety graphics — improvement requirements & feasibility](safety-graphics-improvement-assessment-2026-07-17/) | 2026-07-17 | Current — 5 colleague ideas scoped; all 4 sources reviewed; Initiative 01 (hep composite, [sv#67](https://github.com/jwildfire/safety.viz/issues/67)) + Initiative 03 (QT Phase 1, [hub #36](https://github.com/jwildfire/obot.roadmap/issues/36) / [sv#68](https://github.com/jwildfire/safety.viz/issues/68)) building; renal ties [#35](https://github.com/jwildfire/obot.roadmap/issues/35) |
| [nepExplorer → safety.viz — migration assessment](nepexplorer-migration-assessment-2026-07-15/) | 2026-07-15 | Current — GO (phased); decisions D1–D3 awaiting @jwildfire; input to [hub #29](https://github.com/jwildfire/obot.roadmap/issues/29) / [#33](https://github.com/jwildfire/obot.roadmap/issues/33) |
| [Hep-explorer — upstream backlog & a clinical-guide section](hep-explorer-backlog-and-guide-2026-07-12/) | 2026-07-12 | Current — proposal awaiting @jwildfire (A/B/C decisions); companion to [safety.viz PR #44](https://github.com/jwildfire/safety.viz/pull/44) |
| [open.gismo v1.0 — design & roadmap](open-gismo-v1-plan-2026-07-12/) | 2026-07-12 | Current — decisions D1–D6 awaiting @jwildfire; companion to [open.gismo PR #1](https://github.com/jwildfire/open.gismo/pull/1) |
| [Roadmap usage audit — the public story lags reality](roadmap-usage-audit-2026-07-11/) | 2026-07-11 | Current — tier-1 corrections awaiting @jwildfire |
| [safety.viz homepage — five layout directions](safety-viz-homepage-options-2026-07-11/) | 2026-07-11 | Current — awaiting @jwildfire's pick (safety.viz#29) |
| [safety.agent harness proposal (#17/#18)](harness-proposal-2026-07-04/) | 2026-07-04 | Current |
| [Autonomous PM/Development framework report](autonomous-agent-framework/) (10 chapters) | 2026-06-06 → 06-11 | **Current** — flagship; Chapter 10 covers the Claude Code migration |
| [Autonomy audit and refactor development framework](autonomy-audit-2026-06-05/) | 2026-06-05 | Current |
| [PM agent and portfolio framework review](pm-portfolio-framework-2026-06-06/) | 2026-06-06 | Current |
| [Subagent failure deep dive](subagent-failure-deep-dive-2026-06-06/) | 2026-06-06 | Current |
| [Work-session supervision acceptance evidence](work-session-supervision-acceptance-2026-06-06/) | 2026-06-06 | Current |
| [P009 supervised runner user summary](p009-supervised-runner-user-summary-2026-06-08/) | 2026-06-08 | Current |
| [Framework options v4 — Paperclip evaluation](autonomous-agent-framework-options-v4-paperclip-2026-06-07/) | 2026-06-07 | Superseded by the framework report |
| [Framework options v3](autonomous-agent-framework-options-v3-2026-06-07/) | 2026-06-07 | Superseded by v4 |
| [Framework options v2](autonomous-agent-framework-options-v2-2026-06-06/) | 2026-06-06 | Superseded by v3 |
| [Framework options v1](autonomous-agent-framework-options-2026-06-06/) | 2026-06-06 | Superseded by v2 |

Superseded versions are retained deliberately (design decision D3) — the memory
philosophy favors preserving the decision trail.

## Session reports

[`sessions/`](sessions/) holds the frozen per-session operational records produced at
wrapup by the session hub ([requirement #24](https://github.com/jwildfire/obot.roadmap/issues/24)).
It follows its own flat contract — one self-contained HTML file per working session,
named by the diary slug — documented in [`sessions/README.md`](sessions/README.md).

## Adding a report

1. Create `reports/<kebab-name-with-date>/` with a self-contained `index.html`.
2. Add a `README.md`: how it was generated, sources, assumptions, LLM disclaimer.
3. Add a row to the index above (newest current work at the top of its group).
