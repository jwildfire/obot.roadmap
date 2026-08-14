# The app plan rewrite — four calls to make

**Decision artifact** for goal [#79](https://github.com/jwildfire/obot.roadmap/issues/79) (the app / open.gismo arc), written 2026-08-14 in an unattended session. Linked from [#34](https://github.com/jwildfire/obot.roadmap/issues/34).

**Decide here:** [Q&A discussion #149](https://github.com/jwildfire/obot.roadmap/discussions/149) — the thread where @jwildfire records the calls.

**Status:** Partially decided 2026-08-15 — A1 and A2 accepted as recommended; A3 and A4 held open (deferred pending a structured elicitation exercise on goal #79's real scope, not rejected). @jwildfire's verdict, relayed from chat, is recorded on discussion #149.

## Why it exists

Goal #79's own Boundaries block selection: *"until the app-first plan update lands on #34 and the Phase 1–4 requirements are filed and designed, every increment here is pipeline-advancement; there is nothing implementation-ready to select."* That blocker is a decision @jwildfire has to make, not work a session can do — so per the [release-candidate framework](https://github.com/jwildfire/obot.agent/blob/main/docs/rc-framework.md), it goes to a decision artifact rather than a PR. **The app goal produced no release candidate on 2026-08-14, deliberately.**

## What it contains

Four decisions, each with options, costs, what each forecloses, a plain recommendation, and what unblocks:

- **A1** — what replaces the stale 2026-07-12 v1.0 plan report, and whether #34 closes. *Recommend: retire and anchor.*
- **A2** — what the requirement set is, given demo-301 already demonstrates most of "Phase 1". *Recommend: surface-anchored requirements + adopt the five goalless app issues.*
- **A3** — what is in v1.0 and what is deferred in writing. *Recommend: acceptance-path v1.0.*
- **A4** — whether demo-301 is the canonical fork template and must be goal-bound. *Recommend: yes, and bind it.*

Plus two stale-fact corrections proposed as comments (never as goal-body edits).

## Sources

- Hub issues #34 (and its 2026-07-19 / 2026-07-21 comments), #79, #134, #143, #136, #138, #139, #142, #144
- `reports/app-design-2026-07-28/` (directions D-APP0–7, framework D-FW1–8) and `reports/app-dashboard-design-2026-07-28/`
- `reports/open-gismo-v1-plan-2026-07-12/` — the report A1 is about
- Working trees of `jwildfire/open.gismo` (`dev`) and `jwildfire/demo-301`; `obot.agent/scripts/policy.json` and `obot.agent/goals/registry.json`
- The live demo at https://jwildfire.github.io/demo-301/

## How it was generated

A parallel research pass (eight source digests + one synthesis stage) read the sources above; the seven claims in the page's Evidence table were then re-run directly by the author session before publication — Actions run history, branch sizes and tree hashes, the App installation list, sub-issue membership, the registry binding, and the policy commit. Everything not in that table is attributed to the research pass in the page itself.

## Assumptions and limits

1. The page reports the state as of 2026-08-14; issue bodies and policy files may move under it.
2. Test counts and plan-report line-level claims were read by the research pass, not re-verified by hand.
3. Nothing was changed in any repo other than this hub: no goal body edited, no branch rewritten, no issue closed.
4. Recommendations are recommendations. All four calls are @jwildfire's.

*LLM disclaimer: this page was drafted by Claude Code (Opus 5) in an unattended session and has not been reviewed by @jwildfire.*
