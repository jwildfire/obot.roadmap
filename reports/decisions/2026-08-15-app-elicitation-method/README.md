# How to interview @jwildfire — the elicitation method (E1–E4)

*v2 (2026-08-15): plain-English rewrite, substance unchanged.*

**Decision artifact** for goal [#79](https://github.com/jwildfire/obot.roadmap/issues/79), written 2026-08-15 in an unattended sibling session (👯🤖 elicit), on @jwildfire's direct request while reviewing the [app-plan artifact](../2026-08-14-app-plan-rewrite/): *"I basically want you to interview me to figure out what I want."*

**Decide here:** [Q&A discussion #159](https://github.com/jwildfire/obot.roadmap/discussions/159). Answering **"defaults"** is a complete response.

**Status:** Awaiting @jwildfire — E1–E4. The protocol itself is already shipped as the `grill-me` skill ([obot.agent #95](https://github.com/jwildfire/obot.agent/issues/95) / [PR #96](https://github.com/jwildfire/obot.agent/pull/96), merged standard lane 2026-08-15) with the recommendations as defaults, so the E-calls amend rather than gate it.

## Why it exists

A3 and A4 of the app-plan artifact are held open pending a structured elicitation exercise on goal #79's real scope, and #79's Intent/Boundaries need detail @jwildfire holds tacitly — and partly does not yet hold at all. This page answers *how* to run the extraction, not what the answers are. The interview itself is a separate, deliberate act with him present; this session deliberately did not attempt it.

## How it was generated

A 7-agent ultracode workflow (`wf_882149bc-099`, ~700k subagent tokens, all agents completed): grill-me hunt local + web, CSR-precedent mining, capture-path mapping, and three external-research lenses (classic elicitation techniques, artifact-driven/reactive methods, failure modes + LLM-interviewer literature). The lead session synthesized; per-strand structured returns are in the session job directory and the workflow journal.

## Sources

- [mattpocock/skills](https://github.com/mattpocock/skills) — `grill-me`, `grilling`, `grill-with-docs`, `wayfinder`, `to-questionnaire` (read from source); author docs at aihero.dev. Negative results: no grill-me in anthropics/skills (17 skills enumerated) or obra/superpowers (14 enumerated; `brainstorming` is the nearest).
- Local prior art: `obot.agent/interviews/p004-grill-queue.md` ("P004 grill-me queue" — the likely other source of the memory), `obot.agent/skills/stakeholder-interview/SKILL.md` + `docs/interview-framework.md` + templates (capture schema forked into the new skill; Telegram transport dropped).
- CSR precedent: `reports/csr-change-request-framework-2026-07-27/`, `reports/platform-gap-analysis-2026-07-25/`, open.csr `research/sections/01_existing-tools.md`, hub #130/#131/#114(D5), session notes 07-25/07-27.
- Literature (principal citations): Clark & Feldon (≈70% expert omission); Tofel-Grehl & Feldon 2013 meta-analysis (g≈0.87); Aranda et al. interview-effectiveness family; Davis, Dieste, Hickey, Juristo & Moreno RE'06 systematic review; Burton et al. 1990; Tohidi, Buxton, Sellen & Baecker CHI 2006 (single-design inflation); Jansson & Smith 1991 (fixation); Nemeth et al. 2001 (role-played dissent); Veinott, Klein & Wiggins 2010 (premortem framing); Schuman & Presser (question-form effects); Nisbett & Wilson 1977; Polanyi; LLMREI (RE 2025); OntoAgent/ReqElicitGym 2026; Bano et al. interviewer-mistake taxonomy; LENS; Elicitron; the AI-conversational-interviewing RCT (n≈1,800: probing adds words not information; 81%-vs-72% false-agreement result); the devil's-advocate role study (99.2% vs ~55% disagreement).

## Assumptions and limits

1. No published study covers this exact deployment (LLM repeatedly interviewing a single product owner, async); the protocol extrapolates from adjacent evidence and should be treated as an experiment and tuned after round one.
2. The CSR-precedent read is reconstructed from artifacts and session notes; which of the two July exercises he actually remembers is worth one confirming line from him.
3. Nothing here interviews him: no elicitation was attempted in this session.
4. Recommendations are recommendations; E1–E4 are his.

---

Drafted by Claude Code using Fable 5 in an unattended session (not yet reviewed by @jwildfire).
