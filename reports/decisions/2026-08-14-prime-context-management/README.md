# Context management for 🎩🤖 obot-prime — six calls to make

**Decision artifact** for the obot-prime concierge (session framework, [obot.agent docs/session-framework.md](https://github.com/jwildfire/obot.agent/blob/main/docs/session-framework.md)), written 2026-08-14 in an unattended sibling session at @jwildfire's direct request: *"How are we going to handle context management in a long running agent like this? … Do some research and make a recommendation. Again, primary goal for everything this agent does is to keep responses quick."* Mid-drafting, @jwildfire added the **Navigator** proposal (a standing roadmap bot keeping state current for prime), relayed by obot-prime; it is evaluated head-to-head as C2.

**Decide here:** [Q&A discussion #154](https://github.com/jwildfire/obot.roadmap/discussions/154) — @jwildfire records C1–C6 there.

**Status: DECIDED 2026-08-14 — approved.** @jwildfire (relayed via obot-prime): "I'm good with your recommendations." Implemented 2026-08-15 in [obot.agent#91](https://github.com/jwildfire/obot.agent/pull/91) (merged, standard lane, closes [oa#90](https://github.com/jwildfire/obot.agent/issues/90)); the Navigator (C2) is filed as requirement [#157](https://github.com/jwildfire/obot.roadmap/issues/157) under goal #73.

## Why it exists

obot-prime is a standing singleton designed to stay up indefinitely, so context compaction is a certainty, not a risk. The charter asserts "durable state lives in the scratchpad and in the delegates' artifacts, never only in prime's context" — an assertion without a mechanism. Tonight produced a live instance of the failure class: prime told @jwildfire a monitor "self-corrects", which was false, and the claim lived only in prime's context where nothing could contradict it — plus three further provenance errors, all summaries-of-summaries. The binding constraint on any fix is latency: the <30s / ≤2-round-trip contract is the objective function, not a tiebreaker.

## What it contains

Six decisions, each with options, measured or cited costs, and a plain recommendation:

- **C1** — split queryable STATE from the append-only narrative log. *Recommend: a capped, provenance-stamped `prime-state.md`.*
- **C2** — @jwildfire's Navigator: a standing peer keeping state true. *Recommend: yes, strictly as a file-writing verifier (never someone prime asks), scoped to bookkeeping on day one, ramped from a scheduled sweep.*
- **C3** — the rehydration procedure after compaction or relaunch. *Recommend: one scripted, one-round-trip bundle read (`prime-rehydrate`), fired lazily.*
- **C4** — write mechanics. *Recommend: replace the 759-char heredoc with a `scratchpad-log` script — ~10× cheaper per event, benefits every sibling.*
- **C5** — retention discipline: what prime deliberately lets go, and the anti-relitigation rule. *Recommend: adopt the four listed rules.*
- **C6** — where it lands. *Recommend: one obot.agent PR left open for review; the Navigator as a hub requirement issue through the normal lifecycle.*

## Sources

- Tonight's scratchpad `.claude/session-notes/2026-08-14.md` (the case study, read end to end)
- The session-prime charter (`.claude/skills/session-prime/SKILL.md`), `obot.agent/docs/session-framework.md`, `templates/sibling-briefing.md`, `tools/session-init/handoff.sh`, `scripts/obot-session-state`
- @jwildfire's Navigator proposal, relayed verbatim by obot-prime mid-session (quoted in full in the page)
- Local measurements made for this artifact (read timings, byte/token counts, script timings) — reproduced in the page's tables
- Anthropic published guidance and third-party sources on agent memory — every external claim carries its URL in the page

## How it was generated

A background research subagent swept Anthropic's docs/engineering posts and third-party agent-memory literature (all claims URL-cited in the page). The author session read tonight's scratchpad end to end as the case study, inventoried each scaffold mechanism directly, and made every measurement in the page itself (Python timed reads, `time` on scripts, `wc -c` on files) on this machine, 2026-08-14/15.

## Assumptions and limits

1. Latency figures for model round trips and output-token generation are estimates from observed orders of magnitude, marked as such in the page; file and script timings are measured.
2. External documentation was fetched 2026-08-15 and may move; the compaction-survival table cites the harness docs as of that date.
3. Nothing was implemented: no skill edited, no script added, no template changed, no Navigator spawned. C6 is a proposal.
4. Recommendations are recommendations. All six calls are @jwildfire's.

*LLM disclaimer: this page was drafted by Claude Code (Fable 5) in an unattended session and has not been reviewed by @jwildfire.*
