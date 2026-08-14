# Decision — which repos are operational, which are clinical

- **Date:** 2026-08-15 · **Goal:** [#73 autonomy](https://github.com/jwildfire/obot.roadmap/issues/73) · **Discussion:** [#160](https://github.com/jwildfire/obot.roadmap/discussions/160)
- **Trigger:** @jwildfire's operational-vs-clinical governing principle ([recorded in #155](https://github.com/jwildfire/obot.roadmap/discussions/155#discussioncomment-18022829)) keys on a per-repo classification he never enumerated.
- **Recorded as clear (not asked):** obot.agent, obot.roadmap operational; safety.viz, gsm.safety, safety-histogram clinical.
- **Put to him:** C1 open.csr (rec: clinical), G1 open.gismo (rec: clinical), D1 demo-301 (rec: operational), M1 machine-readable home (rec: `class` field in policy.json, written only after he answers).
- **Precondition flagged:** CI on every auto-merge repo; obot.agent had none until [obot.agent#98](https://github.com/jwildfire/obot.agent/pull/98).
- **Sources:** policy.json v2 (all 8 repo entries), GitHub API workflow listings for all 8 repos (2026-08-15), rc-framework.md, workspace CLAUDE.md roster.
- **Assumptions:** reference-only clones stay outside policy.json; today's merge mechanics already match the recommended classification, so the decision records intent rather than changing lanes.

---

Drafted by Claude Code using Fable 5 (👯🤖 gov sibling session), 2026-08-15.
