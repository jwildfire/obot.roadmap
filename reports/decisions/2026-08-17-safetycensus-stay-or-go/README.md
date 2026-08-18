# D0021 — SafetyCensus() shipped: does it stay as public API, or get deprecated out?

> **Corrected 2026-08-18.** This page was published as *"SafetyCensus(): stays or goes, before v1.1.0 publishes"* and said the release was held at the tag pending this decision. It was not: gsm.safety v1.1.0 published 2026-08-17 at 05:42:53 UTC, sixteen minutes before this artifact was written. Only the framing is corrected — the panel record, the verified defects and the recommendation are unchanged. See the correction block at the top of [index.html](index.html). Correction task [#268](https://github.com/jwildfire/obot.roadmap/issues/268), under requirement [#266](https://github.com/jwildfire/obot.roadmap/issues/266).

**Status: Decided 2026-08-18** — C1–C2 (D0021.1–.2), against the recommendation. `SafetyCensus()` stays: not deprecated, kept under its own name (or an alias preserving it), and rebuilt on the gsm metric framework as metrics plus a report — design first, implementation second. His words are on [index.html](index.html) verbatim and complete. The refactor is [requirement #274](https://github.com/jwildfire/obot.roadmap/issues/274); this record is task [#276](https://github.com/jwildfire/obot.roadmap/issues/276).
**The recommendation is not overruled.** Every verified finding stands — the untrustable death count, the false zeros, the ghost IDs, the wrong column dialect. The panel judged the implementation; he is judging the purpose, and the purpose survives: the census gives open.gismo a standing safety summary. The answer to numbers that cannot be trusted is to make them trustable, not to remove the thing that needed them.
**Requirement:** [jwildfire/obot.roadmap#229](https://github.com/jwildfire/obot.roadmap/issues/229) · **Task:** [#230](https://github.com/jwildfire/obot.roadmap/issues/230) · **Goal:** [#73 increased autonomy](https://github.com/jwildfire/obot.roadmap/issues/73)
**Release:** [gsm.safety v1.1.0](https://github.com/jwildfire/gsm.safety/releases/tag/v1.1.0) — published 2026-08-17 05:42:53 UTC, `SafetyCensus()` exported at the tag and named in the notes ([PR#52](https://github.com/jwildfire/gsm.safety/pull/52))
**Q&A:** [#235](https://github.com/jwildfire/obot.roadmap/discussions/235)

## What produced this

@jwildfire, 2026-08-17, looking at the merged release candidate:

> *"Was looking at https://github.com/jwildfire/gsm.safety/pull/52 and want another review of the safetyCensus() function. It looks messy to me, and doesn't clearly fit in with gsm best practice. Do an adversarial code review and come back with a decision artifact that recommends whether it stays or goes."*

~~Publication was held at the merge because the function is exported from a clinical R package: publishing makes it public API, after which removal is a breaking change rather than a decision not to ship.~~

**As corrected, 2026-08-18.** Publication was not held. @jwildfire lifted the hold himself and v1.1.0 published at 05:42:53 UTC, before this artifact existed. The function is public API of a clinical package today, so the question became whether it stays that way or is deprecated now and removed in the next version — the same evidence, a different choice. He answered it on 2026-08-18: it stays, and is rebuilt.

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
- ~~Assumption: publication is pending this decision.~~ Falsified on 2026-08-18 against the release object: created 05:40:40 UTC, published 05:42:53 UTC, `draft=false`, `prerelease=false`; `export(SafetyCensus)` on line 7 of `NAMESPACE` at the tag and on `main`; the function named in the published release notes.

---

This artifact was drafted by 😺🤖 Claude Code (Claude Fable 5, worker W0023) and reviewed by @jwildfire. Corrected by 👯🤖 Claude Code (Claude Opus 5, worker W0071) on 2026-08-18. His decision was recorded by 👯🤖 Claude Code (Claude Opus 5, worker W0075) the same day, under task [#276](https://github.com/jwildfire/obot.roadmap/issues/276).
