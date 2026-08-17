# The session model after obot-prime — five calls to make

**Decision artifact** for the session framework, written 2026-08-15 in a sibling session (👯🤖 sessmodel) at @jwildfire's direct request the night 🎩🤖 obot-prime launched: *"this long-running agent breaks our session model. Consider which if any of our session commands/skills/concepts are still useful… I'm open to suggestions on how to move forward."* His stated lean — a tight daily briefing (headlines + todos, maybe audio) plus a detailed weekly — was explicitly provisional ("if I had to pick right now") and is evaluated on the evidence, not assumed.

**Decide here:** [Q&A discussion](https://github.com/jwildfire/obot.roadmap/discussions/158) — @jwildfire records M1–M5 there.

**Status: Decided 2026-08-16 — M1–M5 all adopted as recommended in the local Operations Dashboard (adopt-all, no words typed). Closed out at his instruction the next morning ("I thought I asked for D2/7/14/15/16 to all be closed."), recorded as a second dated entry rather than folded into the first.** Filed as requirements 2026-08-17: [#238](https://github.com/jwildfire/obot.roadmap/issues/238) the fold and the briefing, [#239](https://github.com/jwildfire/obot.roadmap/issues/239) the weekly, [#240](https://github.com/jwildfire/obot.roadmap/issues/240) the retirement and re-homing notes, [#242](https://github.com/jwildfire/obot.roadmap/issues/242) audio. Of the five duties M2 re-homed, none has fully moved: hygiene is half moved (the merge-time milestone gate is live; board and stage placement is still batch-repaired), and verification and hand-off only look moved — the Navigator is live but the 2026-08-16 wrapup still ran its own verifier, and the hand-off is still written into the scratchpad by the wrapup. Everything else on the page is unbuilt: no fold at any hour, no briefing page, no weekly machinery, no path to his phone. His answer sat unapplied for nine hours, which is why he had to ask — filed as [#241](https://github.com/jwildfire/obot.roadmap/issues/241).

## What it contains

- **M1** — an honest verdict for each of 17 session concepts (skills, scratchpad, diary, reports, ledger). *Recommend: 9 keep · 6 re-home · 1 merge · 1 retire; nothing executed without his answer.*
- **M2** — the trigger problem: what fires the wrapup's five duties when no session ends. *Recommend: T5 — a content-gated 07:00 fold sibling for record + briefing, event push for RC-ready and all-goals-blocked, hygiene at event time, verification to the Navigator (#157).*
- **M3** — the daily briefing, designed from a measured autopsy of the ignored openclaw daily summaries (32 entries, 2026-05/06) and the properties of the dashboard news feed he likes. *Recommend: a 9-line, state-shaped, cumulative queue — pushed as a one-liner to the phone, one stable URL, gated on content. A fully drafted example composed from tonight's real queue is in the page.*
- **M4** — the weekly. *Recommend: yes — Sunday detail fold (goals, scaffold sweep, cost, staleness, week narrative for the keynote diary); it is the sink that keeps the daily at 9 lines.*
- **M5** — audio, researched properly. *Recommend: later, gated on 2–3 weeks of the text briefing being read. Spotify verified impossible for private feeds; Apple Podcasts follow-by-URL works; ~$1/mo TTS; ~4–5h build; a ~1-hour $0 iOS-Shortcut test exists if he wants audio now.*
- A migration path (4 phases) and named breakage if skills retire while referenced (findSessionMarker scoping, obot-auto's bookends, /s-init preprocessing, the Stop hook, cross-references).

## Sources

- The 12 `session-*` skills, `docs/session-framework.md`, `docs/rc-framework.md`, `templates/sibling-briefing.md` (obot.agent), all read in full
- The openclaw corpus: `obot-claw.github.io/daily/` — 32 entries measured for word count, structure, ask placement, and git-log cadence ([archaeology notes](sources/openclaw-summaries.md))
- session-hub source (`lib/render.mjs` activityFeed, `lib/collect.mjs`) and the rendered live page
- `prime-state.md`, the [2026-08-14 context-management artifact](../2026-08-14-prime-context-management/), hub #157 / #122 / #123, obot.agent PR #94
- Web research on Spotify/Apple Podcasts private-feed support, TTS pricing, and GitHub Pages limits, fetched 2026-08-15 — every external claim URL-cited in [sources/audio-research.md](sources/audio-research.md)

## Assumptions and limits

1. Word counts, cadence timestamps, and structure of the openclaw corpus are measured from the local clone; latency-of-reading claims about @jwildfire's mornings are inference from his own testimony, marked as the bet they are.
2. PushNotification reaching the phone from a cron-spawned background job is asserted from the tool contract (desktop + phone over Remote Control) but not yet exercised from that lane; the build must verify it.
3. Nothing was implemented: no skill edited or retired, no cron armed, no requirement filed. All five calls are @jwildfire's.
4. The example briefing uses tonight's real queue; its items will be stale by the time this is read — the shape, not the content, is the proposal.

*LLM disclaimer: this page was drafted by Claude Code (Fable 5) in an unattended sibling session and has not been reviewed by @jwildfire.*
