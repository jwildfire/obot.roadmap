# Requirement Sessions: the Mid-October Plan

Written 2026-09-10 in response to the handover document "Refactor to Objective-Based Sessions" (Jeremy, via voice session). Lays out the five objectives as issue trees with definitions of done, two concurrent session lanes, and a Friday-by-Friday "must show" calendar to mid-October.

## Sources

- The handover document (Google Doc, 2026-09-10) and Jeremy's in-session answers the same day: one retire PR, artifact-first sequencing, a safety.viz-native app, the rigid issue-tracking model quoted verbatim on the page, and the move to cloud sessions instead of Remote Control.
- Hub objective issues #78, #79, #112 and their sub-issue trees as read on 2026-09-10; requirement #9 and its design (`requirements/design/9_design.html`); requirements #161, #164, #165, #171, #182.
- The FDA ST&F static-display strategy report (2026-07-21) and its `fda_stf_inventory.json` (22 figures).
- safety.viz v1.7.0 (13 modules in `src/main.js`, per-module data schemas under `src/data/schema/`), gsm.safety v1.1.0 (9 `Widget_*` functions, no `Visualize_*`), open PRs gsm.safety#68/#69 and open.csr#75.
- Claude Code documentation for `/goal`, cloud sessions, cloud environments and routines (code.claude.com/docs/en/goal, /claude-code-on-the-web, /cloud-environments, /routines), version 2.1.268 in use.

## Assumptions

- "Mid-October" is taken as ready by Friday 2026-10-16; the exact talk date is a listed decision.
- Parity was decided the same day as "static twin only" — no code export from the app; the page reflects that.
- "ultracode" is the Claude Code Workflow tool; "ultradesign" is the Claude Design canvas skill.
- Weeks are Monday–Sunday with the Friday deployed-site state as the review point.
- `/goal` inside a cloud session, and R installing in a cloud environment's setup script, are assumed workable and are verified in week 0 before anything depends on them.
- Requirement counts and week placements are a proposal for the issue trees, not filed issues; filing them is the first step on the page.

This plan was drafted by Claude Code using Fable 5.1 and reviewed by @jwildfire.
