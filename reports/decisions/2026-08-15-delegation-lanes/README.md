# 2026-08-15 — Siblings stay: the two delegation lanes under obot-prime (D0013)

**Status: Decided 2026-08-15** — @jwildfire, in chat with 🎩🤖 obot-prime: "good point about context. we can keep the current model."

## What this records

@jwildfire questioned whether separate background sibling sessions still earn their keep under obot-prime ("maybe you just call everything as sub-agents now"), since he no longer drives siblings himself. A comparison session (👯🤖 lanes) was spawned; while relaying the question, prime raised the context-cost point — a subagent's full result returns into prime's own context, a sibling's does not — and @jwildfire decided on it before the comparison finished. Both lanes stay; nothing is retired. The one deliverable kept from the comparison is the routing rule, shipped the same day into the `session-prime` and `session-spawn` skills in obot.agent.

## Provenance and sources

- The decision: @jwildfire in chat with obot-prime, 2026-08-15, relayed verbatim to the comparison session mid-task.
- Evidence behind the rationale section: workspace session scratchpads `.claude/session-notes/2026-08-14.md` and `2026-08-15.md` (sibling rosters ~20/day; the 👯🤖 audit death and 👯🤖 audit2 takeover; 👯🤖 gov resumed three times across ten hours), prime's state file, the [prime context-management artifact](../2026-08-14-prime-context-management/) (D0004, decided 2026-08-14), and obot.agent's `docs/session-framework.md` + `docs/terminology.md`.
- Capability facts (model-but-not-effort on the in-conversation lane; results returning to the caller's context) verified against the live Agent-tool and spawn-flag surfaces on 2026-08-15, not assumed.

## Assumptions

- The context-cost rationale is recorded together with its caveat (subagent output discipline can shrink, not eliminate, the cost) so the record does not rest on a half-mitigable argument alone.
- The ultracode/Workflow lane and the Navigator's scheduled sweep are out of scope and unaffected.

---

This artifact was drafted by Claude Code using Fable 5 (👯🤖 lanes) and reviewed by @jwildfire.
