# Roadmap usage audit — the public story lags reality (2026-07-11)

Why https://jwildfire.github.io/obot.roadmap/roadmap.html showed an empty (then
one-item) **Development** lane on the day safety.viz v1.0.0 and obot.agent v0.1.0 both
shipped with four agents running. Covers the page's generation mechanism
(`scripts/build_roadmap.mjs` → project-board Status field), a reconstruction of actual
activity 2026-07-08 → 07-11 (21 PRs merged, 3 releases, ~30 issues), five specific
board-vs-reality gaps, root causes, and two tiers of recommendations — an
immediate-corrections list (deliberately **not applied**; each move awaits
@jwildfire) and practice changes, with the parts that belong in the session-hub
requirement ([#24](https://github.com/jwildfire/obot.roadmap/issues/24)) called out
for its in-flight design.

Sources: `scripts/build_roadmap.mjs`, `.github/workflows/deploy-site.yml`, the live
rendered page (fetched 2026-07-11 ~23:00 EDT), `gh` issue/PR/release queries across
jwildfire/{obot.roadmap, safety.viz, obot.agent, gsm.safety}, `gh project item-list 1`
(52 board items), sub-issue GraphQL queries on hub #1/#17/#21/#24/#25,
`site/roadmap-changelog.json`, and diary entries 2026-07-04 → 07-11. Read-only audit:
no issue, board, or stage state was modified.

Rendered: [index.html](https://jwildfire.github.io/obot.roadmap/reports/roadmap-usage-audit-2026-07-11/)

---

This report was drafted by Claude Code using Fable 5 and reviewed by @jwildfire
