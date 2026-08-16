# D0016 — Who watches the workers

**Status: Closed 2026-08-16** — answered by [D0017](../2026-08-16-navigator-design/), and the wider question it belonged to is now [D0019](../2026-08-16-scheduled-sessions-assessment/). @jwildfire closed this page and two others the same day (*"D14/15/16 all seem like a mess to me. Close them all…"*). Its central question was already settled: the separate supervisor folds into the Navigator rather than being built beside it, and the standalone supervision requirement closes into the Navigator's. The measurements — worker silence distributions, the death that survived only in the event timeline, and the finding that a watcher living inside a session is not a watcher — carry forward into the readiness assessment. Original scope — F1–F7 (D0016.1–.7). Q&A thread: [#187](https://github.com/jwildfire/obot.roadmap/discussions/187). Requirements filed alongside: [#185](https://github.com/jwildfire/obot.roadmap/issues/185) (supervision) and [#186](https://github.com/jwildfire/obot.roadmap/issues/186) (compaction survival).

Answers @jwildfire's proposal (chat, 2026-08-15 ~22:40) of a fourth orchestration
role — a "first mate" that keeps an eye on the worker agents so they do not get
lost or stall — and his follow-on that the long-running sessions "almost
definitely need to be set to auto-compact."

## Provenance and sources

Everything on the page was measured on 2026-08-15 evening from the machine's own
records, not recalled from the day:

- **Job ledger** — `~/.claude/jobs/*/state.json` and `*/timeline.jsonl`, 49 job
  records, 45 with event timelines, ~2,400 recorded state events.
  - Sibling working-state gap distribution: n=1,992 across 38 background workers
    (median 23 s, p95 1.7 min, p99 7.0 min, 8 gaps > 15 min, 1 gap > 30 min).
  - `blocked` events: 2 in background workers (both belonging to the one death),
    47 in the concierge and interactive sessions (all normal waits).
  - The audit worker's death: `blocked` at `2026-08-15T06:12:24.110Z` with
    "API Error: The response stopped arriving"; a message recorded against the
    job at `06:38:28.182Z` with the state still `blocked`; next event 80 minutes
    later. Its `state.json` now reads `done` with a completion note — the death
    survives only in the timeline, which is why the page says a watcher must
    observe live rather than forensically.
  - `respawnFlags` and `intent` present on every record — the basis for the claim
    that replacement is mechanical.
- **Concierge activity record** — 236 timeline events; 9 turns tagged to fleet
  supervision (sibling sweeps, close-out collection, dead-worker diagnosis and
  replacement) across 2026-08-14/15.
- **Shared scratchpad** — `.claude/session-notes/2026-08-15.md`, 201 session-log
  lines; per-agent heartbeat gaps n=170 (median 5 min, p90 27 min, max 516 min).
- **Scheduled sweep** — `.claude/session-hub/navigator-sweep.log` and
  `navigator-state.md`. The 22:43 PARTIAL failure (3 of 7 repos) was live while
  the page was being written; the 6h12m review gap is the delta between
  @jwildfire's CHANGES_REQUESTED at `2026-08-15T08:29:35Z` and the sweep's first
  observation at 10:41 ET.
- **Auto-compact state** — verified rather than assumed: `autoCompactEnabled`
  defaults to true in the installed CLI (2.1.233); absent from
  `~/.claude/settings.json`, the workspace `settings.json`, and `~/.claude.json`;
  no `DISABLE_AUTO_COMPACT` / `DISABLE_COMPACT` in the environment, the launcher
  scripts, or the shell profile. So it is on, by default, unchosen.
- **Prior art** — `reports/subagent-failure-deep-dive-2026-06-06/` and
  `reports/p009-supervised-runner-user-summary-2026-06-08/`: the same root cause
  and a records-based (not agent-based) answer, one runtime generation ago.
- **Adjacent scope** — the closeout check ([#184](https://github.com/jwildfire/obot.roadmap/issues/184))
  and the scheduled-sessions readiness assessment
  ([D0014](../2026-08-15-scheduled-sessions-readiness/)), whose Fix 2 already
  scopes the detection layer as blocking work.

## Assumptions

- **Cost figures are order-of-magnitude estimates, not a bill.** Published list
  prices for the model these sessions run on ($5/M input, $25/M output, cache
  reads ~0.1x, cache writes 1.25x at 5-minute TTL and 2x at 1-hour) applied to
  measured context and token counts. The ordering between the four rows is not
  sensitive to the assumptions; the absolute numbers are.
- The worst-case polling row assumes a 5-minute wake cadence against a 5-minute
  cache lifetime, i.e. the cache lapsing on every wake. That is the failure mode,
  not the expected case.
- Loop detection is described but **not** measured, and is marked as such on the
  page.

---

This decision artifact was drafted by Claude Code using Opus 5 and reviewed by @jwildfire.
