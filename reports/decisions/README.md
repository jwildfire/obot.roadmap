# Decision artifacts

When an autonomous session hits a call it cannot make — an unsigned design, a
clinical judgement, a policy carve-out, a missing prerequisite — it does not stall
and it does not guess. It writes a **decision artifact** here and moves on to the
rest of its work.

The contract comes from the [release-candidate framework](https://github.com/jwildfire/obot.agent/blob/main/docs/rc-framework.md)
(obot.agent, 2026-08-14). @jwildfire reviews exactly two kinds of thing: release-candidate
PRs, and these.

## The contract

- One folder per decision at `reports/decisions/{YYYY-MM-DD}-{slug}/`, containing a
  self-contained `index.html` (no external assets) and a `README.md` recording
  provenance, sources and assumptions.
- Contents of the page, in order: **the situation in three sentences**; **the options**,
  each with what it costs and what it forecloses; **a recommendation, stated plainly**;
  and **what unblocks** on each choice.
- Linked from the blocked goal's hub issue, and surfaced in that night's executive
  summary under *Critical blockers*.
- **Posted to the hub's [Q&A discussions](https://github.com/jwildfire/obot.roadmap/discussions/categories/q-a)**
  (@jwildfire, 2026-08-14): a *brief* executive summary — the open question, the
  options in a line each, and the recommendation — linking the artifact for the
  full argument, never restating it in markdown. The discussion thread is the
  *place*: @jwildfire documents his decision there, and the thread link goes in
  the Index below and in the roadmap page's Todo section.
- **One artifact per decision topic.** Bundling unrelated questions into one page
  defeats the purpose; a single page may carry several decisions only when they gate
  each other and must be answered in one sitting.

## Index

| Decision | Date | Goal | Discussion | Status |
|---|---|---|---|---|
| [How to interview @jwildfire — the elicitation method](2026-08-15-app-elicitation-method/) | 2026-08-15 | [#79](https://github.com/jwildfire/obot.roadmap/issues/79) | [#159](https://github.com/jwildfire/obot.roadmap/discussions/159) | Awaiting @jwildfire — E1–E4 ("defaults" is a complete answer; `/grill-me` skill already shipped) |
| [Which repos are operational, which are clinical](2026-08-15-operational-clinical-classification/) | 2026-08-15 | [#73](https://github.com/jwildfire/obot.roadmap/issues/73) | [#160](https://github.com/jwildfire/obot.roadmap/discussions/160) | Awaiting @jwildfire — C1 / G1 / D1 / M1 |
| [The session model after obot-prime — five calls](2026-08-15-post-session-model/) | 2026-08-15 | session framework | [#158](https://github.com/jwildfire/obot.roadmap/discussions/158) | Awaiting @jwildfire — M1–M5 |
| [Hub #140, thirteen days on — one question survives](2026-08-14-hub140-one-question/) | 2026-08-14 | [#73](https://github.com/jwildfire/obot.roadmap/issues/73) | [#156](https://github.com/jwildfire/obot.roadmap/discussions/156) | Awaiting @jwildfire — W1–W3 |
| [obot.agent has no branch to open a release PR from](2026-08-14-obot-agent-rc-shape/) | 2026-08-14 | [#73](https://github.com/jwildfire/obot.roadmap/issues/73) | [#155](https://github.com/jwildfire/obot.roadmap/discussions/155) | Decided 2026-08-15 — **R2 accepted** ([record](https://github.com/jwildfire/obot.roadmap/discussions/155#discussioncomment-18022829)), plus the operational-vs-clinical governing principle; implemented same night (`stable` branch, policy.json, v0.4.0 RC PR) |
| [How prime remembers — context management, six calls](2026-08-14-prime-context-management/) | 2026-08-14 | session framework | [#154](https://github.com/jwildfire/obot.roadmap/discussions/154) | Decided 2026-08-14 — approved; implemented in [obot.agent#91](https://github.com/jwildfire/obot.agent/pull/91) (merged), Navigator requirement [#157](https://github.com/jwildfire/obot.roadmap/issues/157) |
| [The app plan rewrite — four calls to make](2026-08-14-app-plan-rewrite/) | 2026-08-14 | [#79](https://github.com/jwildfire/obot.roadmap/issues/79) | [#149](https://github.com/jwildfire/obot.roadmap/discussions/149) | Partially decided 2026-08-15 — A1–A2 accepted; A3–A4 held open pending goal-#79 elicitation |
| [demo-301's `site` branch — what the fork actually costs](2026-08-14-demo-301-site-size/) | 2026-08-14 | [#79](https://github.com/jwildfire/obot.roadmap/issues/79) | [#150](https://github.com/jwildfire/obot.roadmap/discussions/150) | Awaiting @jwildfire — S1–S6 on [#143](https://github.com/jwildfire/obot.roadmap/issues/143) |
| [The merge lane is not broken — one invocation form is](2026-08-14-merge-lane-classifier-denials/) | 2026-08-14 | [#73](https://github.com/jwildfire/obot.roadmap/issues/73) | — | Decided 2026-08-14 — approved; the permission rule is @jwildfire's edit to make |
