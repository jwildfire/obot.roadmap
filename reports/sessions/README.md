# Session reports

Frozen operational records of working sessions, produced by the **session hub** report
mode (`session-hub.mjs --report`, shipped in
[obot.agent](https://github.com/jwildfire/obot.agent) v0.2) as the final step of
`session-wrapup`. Design:
[requirement #24](https://github.com/jwildfire/obot.roadmap/issues/24) /
[24_design.html](../../requirements/design/24_design.html).

Unlike the folder-per-report contract of the parent `reports/` directory, this is a flat
collection: **one self-contained HTML file per working session**, named by the diary slug
so report and diary entry are permanently paired:

- `YYYY-MM-DD.html` — the day's first session (pairs with `diary/YYYY-MM-DD.md`)
- `YYYY-MM-DD-N.html` (N = 2, 3, …) — later sessions the same day

Each diary entry links its report with a "📊 Session report" line under the meta block
(added by the wrapup); rendering reports as proper tabs on the diary pages is the
[#27](https://github.com/jwildfire/obot.roadmap/issues/27) follow-up.

The report is the **operational record** (agents, states, tokens, priorities check-state,
roadmap events — frozen at wrapup); the diary entry is the **narrative**. Neither restates
the other.

These reports are AI-generated from live session state (scratchpad, job state, the
GitHub API) at render time.
