# obot.agent v0.6.0 and obot.roadmap v0.5 — annotated demo

The demo page for two releases that go together: the session core and the standards it runs under. Most of what is new has no visual surface, so the page pairs each change with real output and the command that produced it, and shows the two pages that do have one.

Deployed: https://jwildfire.github.io/obot.roadmap/reports/oa-v0.6-hub-v0.5-demo/

## What is on the page

1. Sessions run locally and write to GitHub as the bot (obot.agent PR 347, hub PR 385).
2. Release notes held to a length, and the checker that holds them (obot.agent PRs 341, 343, 345, 347).
3. A release candidate reviewed by three subagents (obot.agent PR 340).
4. A session checks who wrote a sign-off (obot.agent PR 345).
5. The ruleset check fails when it could not look (hub PR 379).
6. The site build holds no bot key and installs with its own token (hub PRs 379, 383, 385).
7. The tracker (hub PR 347).
8. The Cost chart (hub PRs 370, 379).
9. What the releases leave open.

## Provenance

- Every terminal capture is real output from @jwildfire's Mac on 2026-10-07. The "before" captures come from running the earlier version of the same file: obot.agent's checker at commit `1894185`, and the hub's ruleset check before PR 379, each against the same input as the "after".
- The two ruleset-check failures were produced with a stand-in for `gh` that changes one answer (fails one ruleset read, or adds one bypass entry) and passes every other call to the real `gh`. Nothing on GitHub was changed to make them.
- The guard and the token script shown in section 1 are tooling of his workspace and are in no repository; the page shows their output, not their source.
- The tracker's three try-it steps were carried out in a headless browser before publication: unticking Backlog took the list from 65 to 11 of 180 requirements and put the filter in the address, and that address opened the same view in a new tab.
- Screenshots: `media/tracker.jpg` and `media/cost.jpg`, taken at 1280 by 820 from the deployed site after the deploy of `83a165a`.
- Self-contained: no external assets, no scripts, no fonts.

## Related

- Release notes: [obot.agent `NEWS.md`](https://github.com/jwildfire/obot.agent/blob/main/NEWS.md), [obot.roadmap `NEWS.md`](https://github.com/jwildfire/obot.roadmap/blob/main/NEWS.md)
- The rules a release follows: [developer guidelines → Releases](https://github.com/jwildfire/obot.roadmap/blob/main/docs/developer-guidelines.md#releases)

---
This page was drafted by Claude Code using Opus 5.5.
