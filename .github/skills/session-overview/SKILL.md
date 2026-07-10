---
name: session-overview
description: "Open a working session with a prioritized list of open tasks from the roadmap: sweep requirement issues, open PRs, the project board, and the last few session summaries, then present a numbered priority list split into agent-actionable vs @jwildfire-gated items. Use at the start of any coding session — 'session overview', 'prioritized list of open tasks', 'what's on deck'. Do NOT use mid-session or for closing out (that is session-wrapup)."
argument-hint: "Optional: session focus to weight the priorities toward"
---

# Session Overview

Open a working session with a shared picture of what matters. The opening bookend
to [`session-wrapup`](../session-wrapup/SKILL.md): wrapup writes the state down at
the end of a session; overview reads it back and turns it into priorities at the
start of the next. The canonical trigger is @jwildfire's standing kickoff prompt:

> give me a prioritized list of open tasks from obot.roadmap. review the
> requirement issues, open PRs and the last few session summaries to inform the
> list. format as a numbered list with short bullets with links to relevant
> roadmap items, issues and prs.

The overview is done when three things are true:

1. **Evidence swept** — open issues, open PRs, the project board, and the recent
   diary entries have all been read; nothing is prioritized from memory alone.
2. **Priorities presented** — a single numbered list, ordered by importance, each
   item with short bullets and links to the roadmap items, issues, and PRs it
   draws on.
3. **Ownership clear** — every item is marked as agent-actionable now or gated on
   @jwildfire (review, sign-off, decision), so the session can start on the right
   work immediately.

## When to Use

- First thing in a coding session, when @jwildfire asks for the kickoff prompt
  above or any variant ("session overview", "what should we work on", "what's
  open").

**Do not invoke** mid-session (use the conversation's own context) or at the end
of a session (that is `session-wrapup`).

## Procedure

### 0. Session identity reminder

Sessions are named and colored by convention: @jwildfire types the built-in slash
commands `/name session overview YYYY-MM-DD` and `/color orange` at session
start. These are harness built-ins the model **cannot run** — if the session
doesn't appear to be named yet, remind @jwildfire to type them; do not attempt to
execute them yourself.

### 1. Sweep the evidence

Read the actual state — do not prioritize from recall:

- **Issues and PRs** across the active repos:

  ```bash
  for repo in obot.roadmap safety.viz gsm.safety safety-histogram; do
    gh issue list -R jwildfire/$repo --state open
    gh pr list -R jwildfire/$repo --state open
  done
  ```

  For requirement issues in the hub, note the lifecycle stage and whether the
  body's next step is agent work or a gate.

- **Project board** — the obot Roadmap user project carries the stage for each
  requirement:

  ```bash
  gh project item-list 1 --owner jwildfire --format json
  ```

  `jq` is **not installed** on this machine — parse the JSON with `python3`, or
  drop `--format json` and read the plain output.

- **Session summaries** — read the **two most recent** entries in
  [`diary/`](../../../diary/) (skip `README.md`). Their "Next session: loose
  ends" and "🙋 ToDo" sections are the wrapup skill's hand-off to this one; carry
  every still-open item into the list.
- **Session scratchpads** — recent files under `.claude/session-notes/` in the
  workspace, written mid-session by
  [`session-update`](../session-update/SKILL.md) /
  [`session-note`](../session-note/SKILL.md): carry any unchecked Todo items
  into the list.
- **Memory** — the `next-session-todo` memory pointer, when present, mirrors the
  latest diary hand-off; reconcile against it so nothing silently drops.

### 2. Prioritize

Order the swept items by what most advances the roadmap, weighing:

- **Unblocking value** — items that gate other work (reviews holding up merges,
  decisions holding up designs) rank high even when small.
- **Momentum** — in-flight work near done beats starting something new.
- **Staleness** — carried items that keep slipping get surfaced explicitly, not
  re-buried.
- **Session focus** — if @jwildfire supplied a focus argument, weight matching
  items up without hiding the rest.

### 3. Present the list

Format exactly as the kickoff prompt asks: a **numbered list** ordered by
priority, each item with **short bullets** and **links** to the relevant roadmap
items, issues, and PRs. Split it into two groups:

- **Agent-actionable** — work the agent can start now under standing grants.
- **Waiting on @jwildfire** — reviews, sign-offs, and decisions only he can make,
  each with a one-line ask and a direct link.

**The list is the deliverable — presenting it ends the overview.** Do **not**
close with a "which item should I start?" decision prompt, and do not start on
any item: @jwildfire reads the list and directs the session from there
(his call, 2026-07-09). The Decision Prompt Convention does not apply to this
closing step.
