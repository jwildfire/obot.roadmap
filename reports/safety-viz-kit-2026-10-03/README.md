# The safety.viz kit — what changed, and what did not

A one-page explainer, written on 2026-10-03 at @jwildfire's request in the working session ("Make me an artifact summarizing the 'kit' not fully understanding what is changing there"), after the kit merged to safety.viz `dev`.

## Sources

- The kit pull request, jwildfire/safety.viz#161, merged 2026-10-03 00:56 UTC at `95c3f95`.
- Its task, jwildfire/safety.viz#154, and its closing evidence comment.
- The requirement, jwildfire/obot.roadmap#354, and its closing proof comment.
- The live kit API reference: https://jwildfire.github.io/safety.viz/dev/kit/index.html
- The biomarker charts design page: requirements/design/353_design.html (decision D3).

## How the facts were established

- Member count, freezing and the Chart.js version were read from the committed bundle on safety.viz `dev` by evaluating it, not from the worker's report: 36 members, frozen, Chart.js 4.5.1.
- "No chart changed" rests on the diff against `dev` (only `src/kit.js` and the export in `src/main.js` differ under `src/`), zero changed PNG files, and a record-by-record comparison of the 14 evidence sets against `dev`, all run by the orchestrating session.
- The groupings and one-line purposes in the table are summaries of the kit's own API reference page and the modules' source.

## Assumptions

- "Public surface from v1.9.0" assumes the kit ships in v1.9.0, the milestone it now carries; that is @jwildfire's to change at the release candidate.

---
This file was drafted by Claude Code using Opus 5.5.
