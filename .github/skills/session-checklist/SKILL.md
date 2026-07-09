---
name: session-checklist
description: "Re-render the running session todo list from the session scratchpad. Use when @jwildfire asks 'session checklist', 'show the session todo list', 'what's left this session'. Also checks items off when told they're done. Do NOT use for the roadmap-wide kickoff list (that is session-overview)."
argument-hint: "Optional: item(s) to check off before rendering"
---

# Session Checklist

Re-render the session todo list on demand, so the running state is always one
command away. Reads the **session scratchpad** written by
[`session-update`](../session-update/SKILL.md) (see that skill for the file's
location and skeleton): `.claude/session-notes/YYYY-MM-DD.md` in the workspace
root.

## When to Use

- @jwildfire asks "session checklist", "show the list", "what's left", or wants
  to see the current todos after adding or finishing items.
- After a batch of work, to confirm what's still open this session.

**Do not use** for the roadmap-wide prioritized kickoff list — that is
[`session-overview`](../session-overview/SKILL.md). This checklist is only the
scratchpad's session-local items.

## Procedure

1. **Check off first, if asked** — if the request names finished items (or the
   argument does), mark them in the scratchpad:

   ```markdown
   - [x] {item} *(added HH:MM, done HH:MM)*
   ```

   Check off, never delete.
2. **Read the scratchpad** — today's file, plus any recent files with unchecked
   items (a session that ended without a wrapup leaves stragglers).
3. **Render the checklist** — the `## Todo` items as a markdown task list,
   unchecked first, with a one-line status summary (`N open / M done`). Carry-over
   items from earlier files are labeled with their date. If there is no scratchpad
   or no todos, say so and point to `session-update`.

Render-only otherwise: this skill never adds items (that is `session-update`) and
never gives todos durable homes (that is
[`session-wrapup`](../session-wrapup/SKILL.md)).
