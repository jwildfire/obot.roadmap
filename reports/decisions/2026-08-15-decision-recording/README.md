# Recording your decisions — in the doc, in a log, and whether you could ever click "approve"

**Date:** 2026-08-15 · **Goal:** session framework · **Status:** **Decided 2026-08-15** — the Decisions-section rule and all three calls adopted as recommended, in chat. Implemented the same day.

## Decisions

- **2026-08-15, in chat:** *"I'd like you to update the artifacts with a 'decisions' section at the top when I decide something."* — resolved and implemented same day: every artifact gets a top-of-page Decisions section (date, channel, his words verbatim, what it resolves, follow-through links) the day he decides; README + index move to Decided in the same commit. Written into the decisions-lane contract (`reports/decisions/README.md`); first applied to the blockers-list artifact today.

- **2026-08-15, in chat:** *"I'm good with recs in https://jwildfire.github.io/obot.roadmap/reports/decisions/2026-08-15-decision-recording/ File a requirement for a local 'decisions app' associated with the dashboard."* — all three calls adopted. The derived log shipped the same day ([the Decisions page](https://jwildfire.github.io/obot.roadmap/decisions/), its `decisions.json` feed, and a deploy that fails when an artifact the index calls decided records nothing); no approve button goes on the public site; no new tracker is stood up.
- **2026-08-15, in chat:** *"I basically want it to be my todo list with blockers included. Go ahead and work on the new page where you open decision artifacts in a main area and then have a sidebar where i can make decisions. Keep a persistent header. I feel like we want a new local only folder in the project to own the obs db. Let's call the local page the Operations Dashboard (or just dashboard) and call the public page with roadmap, news, etc the hub."* — expanded call 1 from a nice-to-have into work to start now, and fixed the vocabulary: **dashboard** = the local page, **hub** = the public site. Filed as [requirement #180](https://github.com/jwildfire/obot.roadmap/issues/180); a working first version shipped the same day in [obot.agent#109](https://github.com/jwildfire/obot.agent/pull/109).

## The questions, as they were asked

1. **An "approve" button on the published decision pages?** Recommend **no** — the site is public, so an unauthenticated button is a forgeable approval, and authenticating it is a small product, not a button. Chat is the lane; if click-to-decide is ever wanted, extend the local dashboard's proven click-stage-submit pattern (roadmap-audit lane), not GitHub Pages.
2. **A formal decision log?** Recommend **yes, derived automatically**: a deploy-time generator reads every artifact's Decisions section and builds a chronological Decisions page on the site. Never hand-maintained (drift). Includes backfilling Decisions sections on already-Decided artifacts.
3. **A roadmap tracker?** Recommend **no new tracker** — the existing surfaces (roadmap page's waiting-on-you section, project board, and the daily-briefing design in flight on [Q&A #158](https://github.com/jwildfire/obot.roadmap/discussions/158)) should read from the derived log's data instead. This page deliberately specs no surface competing with the #158 briefing; it hands that design its data feed.

## Sources and assumptions

- @jwildfire's chat message of 2026-08-15 (quoted verbatim in the Decisions sections).
- `reports/decisions/README.md` contract including today's plain-English bar and Decisions-section rule; `deploy-site.yml` generator-at-deploy pattern; the validated local audit click-stage-submit lane (July 2026).
- GitHub URL prefill supports new-issue bodies only, not comments on existing threads — the constraint that sinks the cheap "prefilled link" variant.
- Assumes the decisions index README stays the machine-checkable inventory the generator can cross-validate against.

---
This artifact was drafted by Claude Code using Fable 5 (👯🤖 v2docs sibling, session 2026-08-15); @jwildfire answered all three calls the same day, recorded above by Claude Code using Opus 5 (👯🤖 dapp sibling).
