# Recording your decisions — in the doc, in a log, and whether you could ever click "approve"

**Date:** 2026-08-15 · **Goal:** session framework · **Status:** Partially decided — the Decisions-section rule is adopted and in force; calls 1–3 await @jwildfire.

## Decisions

- **2026-08-15, in chat:** *"I'd like you to update the artifacts with a 'decisions' section at the top when I decide something."* — resolved and implemented same day: every artifact gets a top-of-page Decisions section (date, channel, his words verbatim, what it resolves, follow-through links) the day he decides; README + index move to Decided in the same commit. Written into the decisions-lane contract (`reports/decisions/README.md`); first applied to the blockers-list artifact today.

## Open questions

1. **An "approve" button on the published decision pages?** Recommend **no** — the site is public, so an unauthenticated button is a forgeable approval, and authenticating it is a small product, not a button. Chat is the lane; if click-to-decide is ever wanted, extend the local dashboard's proven click-stage-submit pattern (roadmap-audit lane), not GitHub Pages.
2. **A formal decision log?** Recommend **yes, derived automatically**: a deploy-time generator reads every artifact's Decisions section and builds a chronological Decisions page on the site. Never hand-maintained (drift). Includes backfilling Decisions sections on already-Decided artifacts.
3. **A roadmap tracker?** Recommend **no new tracker** — the existing surfaces (roadmap page's waiting-on-you section, project board, and the daily-briefing design in flight on [Q&A #158](https://github.com/jwildfire/obot.roadmap/discussions/158)) should read from the derived log's data instead. This page deliberately specs no surface competing with the #158 briefing; it hands that design its data feed.

## Sources and assumptions

- @jwildfire's chat message of 2026-08-15 (quoted verbatim in the Decisions sections).
- `reports/decisions/README.md` contract including today's plain-English bar and Decisions-section rule; `deploy-site.yml` generator-at-deploy pattern; the validated local audit click-stage-submit lane (July 2026).
- GitHub URL prefill supports new-issue bodies only, not comments on existing threads — the constraint that sinks the cheap "prefilled link" variant.
- Assumes the decisions index README stays the machine-checkable inventory the generator can cross-validate against.

---
This artifact was drafted by Claude Code using Fable 5 (👯🤖 v2docs sibling, session 2026-08-15) and awaits @jwildfire's answers on calls 1–3.
