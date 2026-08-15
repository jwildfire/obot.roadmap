# D0015 — Workers that finish into nothing

**Status:** Awaiting @jwildfire — W1–W4 (D0015.1–.4)
**Requirement:** [jwildfire/obot.roadmap#184](https://github.com/jwildfire/obot.roadmap/issues/184) · **Goal:** [#73 increased autonomy](https://github.com/jwildfire/obot.roadmap/issues/73)
**Q&A:** [#185](https://github.com/jwildfire/obot.roadmap/discussions/185)

## What produced this

@jwildfire, 2026-08-15, on the roadmap keeping up with agent work: *"already feeling hard to keep track of the work from the last day and we aren't even in full automation mode yet … I am not at all confident that the roadmap is keeping up with all of this work. That is the navigators job. Every time an agent spawns, the navigator is responsible for making sure it's updating the roadmap appropriately."*

Asked whether enforcement should gate at spawn or audit at closeout, he chose closeout and gave the contract: *"Any time a 'worker' sibling or sub agent closes, navigator makes sure that the roadmap is updated appropriately and you make sure that my todo list is current. Most of the time, workers should impact both. They should either prepare a PR for a planned release, ask me questions or ask for config work if there are blockers."*

Minutes later he added the readout: *"I think i almost certainly want a navigator tab in the ops db that tells me what changes each agent made to the dasboard. basically a list of issues/PRs that were created/updated by each agent."*

## Sources and method

All figures on the page were measured on 2026-08-15, not estimated.

| Figure on the page | Source | How it was derived |
|---|---|---|
| 44 job records; states `done` / `stopped` / `working` | `~/.claude/jobs/*/state.json` | Full read of every record; key union taken across all files |
| 41 jobs terminal in the window | same | Records whose `firstTerminalAt` falls on 2026-08-14 or 2026-08-15 |
| 9 of 41 (22%) wrote no close-out line | job records × `.claude/session-notes/2026-08-14.md`, `2026-08-15.md` | Per-job slug matched against `👯🤖 {slug} … CLOSE-OUT` in the scratchpads |
| 19 of 41 (46%) captured nothing automatically | job records | Records whose `children` array is empty |
| 7 of 41 left no recoverable trace; 3 were real workers | intersection of the two above | The 7 comprise 3 deliberate throwaway probes (`rcoff-*`), the concierge session itself, and 3 genuine workers |
| "an agent that merged three pull requests and filed two issues was recorded as touching nothing" | the `gov` job record and its close-out line | `children` empty; its close-out names merged PRs and filed issues in the agent-tooling repo |
| 87 distinct references / 61 in command output / 2 direct issue-creating calls | the `gov` session transcript | Regex over the whole transcript, over `tool_result` bodies only, and over `Bash` `tool_use` commands respectively |
| Subagents used zero times across 134 transcripts | `~/.claude/projects/-Users-jwildfire-Documents-obot2/*.jsonl` | Zero matches for `"name":"Task"` and zero for `"isSidechain":true` across all 134 files |
| "the workspace already runs hooks of exactly this shape" | `.claude/settings.json` | One `PreToolUse` Bash hook (`merge-gate-guard.sh`) and two `Stop` hooks are installed and running today |
| "about twenty rules" in the roadmap audit | `scripts/lib/audit/rules.mjs` | Rule identifiers enumerated from the exported rule list |
| "five rules fail the needs-my-attention test" | the roadmap-audit artifact of 2026-08-15 | Carried forward from that page's finding, not re-derived here |

## Assumptions, and what is not established

- **The job ledger's schema is treated as stable.** It is written by the harness, not by this project, so a future version could rename or drop `firstTerminalAt`. The design should fail loudly rather than silently report zero closeouts if the field disappears.
- **The recording hook is a proposal, not a tested build.** Hooks of this shape run in the workspace today, and a `PostToolUse` hook does receive the tool response — but no prototype of the mutation ledger was written for this page. The claim that it catches helper-script and raw-API writes follows from the hook contract, and should be verified by a prototype before the design is called settled.
- **"Blast radius" is not yet defined precisely.** The page proposes scoping the existing audit rules to one worker's changed objects; deriving that set depends on W3 being answered, since it is the same attribution problem.
- **The three-in-forty-one figure is a floor, not a ceiling.** It counts workers with no trace in either source. A worker that logged a close-out line but under-reported what it did is counted as fine here, and this method cannot detect that case.

## Related

- [#157 the release-candidate sweep](https://github.com/jwildfire/obot.roadmap/issues/157) — shipped; the Navigator this extends.
- [#181 working-set verification](https://github.com/jwildfire/obot.roadmap/issues/181) — the other Navigator requirement; separate release.
- [Recording your decisions](../2026-08-15-decision-recording/) — the Operations Dashboard whose three sections the three worker outcomes map onto.
- [Scheduled sessions: go, after four fixes](../2026-08-15-scheduled-sessions-readiness/) — the unattended lane whose volume makes this necessary.

---

Drafted by Claude Code using Opus 5 in an unattended sibling session (👯🤖 navcloseout) and reviewed by @jwildfire.
