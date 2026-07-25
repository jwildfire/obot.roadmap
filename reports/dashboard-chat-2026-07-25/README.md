# Dashboard chat — working prototype (#77)

Evidence for the overnight prototype of [hub #77](https://github.com/jwildfire/obot.roadmap/issues/77)
— sending prompts to a running orchestrator session from the session-hub live dashboard and
watching the reply stream back. Companion to
[design #77](../../requirements/design/77_design.html) and prototype PR
[obot.agent#50](https://github.com/jwildfire/obot.agent/pull/50).

- **Sources.** The prototype itself (branch `77-dashboard-chat` in `obot.agent`), run live on
  2026-07-25 against two throwaway background sessions spawned for the demo
  (`👯🤖 2026-07-25 chat-demo`, monitor lane; `👯🤖 2026-07-25 chat-hook-demo`, Stop-hook lane).
  Timings and quotes are from the on-disk `delivered/*.json` claim records and the sessions' own
  transcripts.
- **Assets.** `chat-roundtrip.gif` — screen recording of a full send/reply cycle in Chrome.
  `chat-roundtrip-still.jpg` — the completed two-turn conversation. `chat-queued.jpg` — a message
  queued against a session with no delivery lane armed (the D2 gap, shown rather than hidden).
- **Assumptions and limits.** Nothing is merged and nothing was installed in the live workspace:
  the demo sessions ran with the chat hook supplied through `--settings`, so no already-running
  session was modified. Reply streaming is per-message (transcript JSONL granularity), not
  per-token. The lead session shows as "not armed" because hooks are read at session start.
- **Provenance.** Drafted by Claude Code using Opus 5 in overnight sibling session
  `👯🤖 2026-07-25 dashboard-chat`; reviewed by @jwildfire.
