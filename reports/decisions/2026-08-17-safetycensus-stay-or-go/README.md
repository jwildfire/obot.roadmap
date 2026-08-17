# D0021 — SafetyCensus(): stays or goes, before v1.1.0 publishes

**Status: Awaiting @jwildfire** — C1–C2 (D0021.1–.2).
**Requirement:** [jwildfire/obot.roadmap#229](https://github.com/jwildfire/obot.roadmap/issues/229) · **Task:** [#230](https://github.com/jwildfire/obot.roadmap/issues/230) · **Goal:** [#73 increased autonomy](https://github.com/jwildfire/obot.roadmap/issues/73)
**Release held:** [gsm.safety#52](https://github.com/jwildfire/gsm.safety/pull/52) (v1.1.0, merged 2026-08-17, unpublished pending this decision)

## What produced this

@jwildfire, 2026-08-17, looking at the merged release candidate:

> *"Was looking at https://github.com/jwildfire/gsm.safety/pull/52 and want another review of the safetyCensus() function. It looks messy to me, and doesn't clearly fit in with gsm best practice. Do an adversarial code review and come back with a decision artifact that recommends whether it stays or goes."*

Publication was held at the merge because the function is exported from a clinical R package: publishing makes it public API, after which removal is a breaking change rather than a decision not to ship.

## Method

- Run as a 14-agent workflow (`wf_9068001a-b4f`) under worker W0023 on 2026-08-17.
- Six refute reviewers, one lens each (pipeline shape, column conventions, testability, duplication, comprehensibility, usage), each defaulting to "this should go" and required to argue it with evidence anchors; one steelman briefed to keep it.
- Every report went to an independent fact-checker briefed to reproduce citations and re-run probes (most probes executed in R against the extracted source). 47 claims → 49 verdicts: 29 confirmed, 20 overstated (accurate versions used on the page), 0 refuted.
- The recommendation was formed only after every lens and every fact-check had reported.
- The full panel record (every claim, anchor, and verdict) is [`panel-record.json`](panel-record.json) in this folder.

## Corrections to the commissioning brief

Two facts in the orchestrator's own briefing failed verification, both in the function's favor, and the page says so:

- "Nothing reads the demo's census JSON" — wrong; the deployed demo app fetches and renders it live (the local open.gismo checkout was stale).
- "No issue anywhere asked for a census" — too strong; no issue body does, but a decision record on obot.roadmap#138 (52 minutes before the merge) sanctions the exposure-and-census safety overview, pending clinical input.

## Sources and assumptions

- gsm.safety `origin/main` at the v1.1.0 merge (`cb2b79d`); the local working tree was stale and never used.
- Installed gsm.core / gsm.kri packages, gsm.mapping specs, clindata reference data; demo-301 repo, its site branch, and the deployed site; gsm ecosystem conventions in the workspace `.github/AGENTS.md`.
- Assumption: v1.1.0's content is otherwise approved (it is — the RC was approved with only this review outstanding); this page decides only the census function's fate and its follow-up.

---

This artifact was drafted by 😺🤖 Claude Code (Claude Fable 5, worker W0023) and reviewed by @jwildfire.
