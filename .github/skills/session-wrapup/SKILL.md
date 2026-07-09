---
name: session-wrapup
description: "Wrap up a working session end-to-end: inventory work completed across all agents, sweep the roadmap for uncaptured todos, review the session for scaffold updates, propose next-session tasks, and draft + post the session summary diary entry. Use at the end of any substantive session — 'wrap up', 'session wrapup', 'close out the session'. Do NOT use mid-session or for empty sessions."
argument-hint: "Optional: session focus or extra context to fold into the summary"
---

# Session Wrapup

Close out a working session so nothing lives only in a conversation. The wrapup is
done when four things are true:

1. **Clean roadmap** — every issue touched this session is accurate (body, stage,
   links) and the board reflects reality.
2. **Everything captured** — every open todo surfaced during the session has a
   durable home (issue, diary loose end, or memory), not just chat history.
3. **Scaffold reviewed** — friction and repetition from the session are turned into
   applied or proposed scaffold updates (skills, AGENTS.md, memory, config).
4. **Summary posted** — the day's diary entry is committed, the site deploy is
   green, and the deployed URL is shared for review.

This codifies diary design decision D2 (per-session cadence — see
[`diary/README.md`](../../../diary/README.md)) and extends it from "write the entry"
to the full closing routine.

## When to Use

- The end of any substantive working session, before signing off.
- @jwildfire asks to "wrap up", "close out", or "do the session wrapup".

**Do not invoke** mid-session (the summary would be premature — if in doubt, ask
whether the session is over) or after sessions with no real activity (never write
filler diary entries).

## Procedure

### 1. Inventory the session — all agents, not just this conversation

A session often spans several agents (interactive sessions, background jobs,
subagents). Sweep the evidence, don't trust recall:

- **This conversation** and any subagent/background-job results in it.
- **GitHub activity** since the session started, across the active repos
  (`obot.roadmap`, `safety.viz`, `gsm.safety`, `safety-histogram`, `safety.agent`,
  and upstream `gsm.agent` via its local clone — the Gilead-BioStats API is
  SAML-blocked). Per repo:
  `gh issue list -R jwildfire/{repo} --state all --search "updated:>={YYYY-MM-DD}"`
  and the same for `gh pr list`.
- **Local git state** in each workspace clone *and its `*-worktrees/` siblings*:
  `git log --all --since={date}` for commits, plus `git status` for uncommitted or
  unpushed work — unpushed work is a loose end, not a completion.
- **Session scratchpad** — `.claude/session-notes/{YYYY-MM-DD}.md` in the
  workspace, written mid-session by the
  [`session-update`](../session-update/SKILL.md) /
  [`session-note`](../session-note/SKILL.md) skills: fold unchecked Todo items
  into the uncaptured-todo sweep (step 2) and Notes into the diary entry
  (step 5), then check items off as captured — never delete the file.
- **Memory** (`next-session-todo` and friends) for what the session was *supposed*
  to do — anything planned but untouched is carried forward in step 4.

Produce a work inventory grouped the way diary entries report it: merged / opened /
closed / advanced, each with links.

### 2. Roadmap hygiene sweep — the "clean roadmap" gate

For **each requirement or issue touched this session** (from the step 1 inventory):

- **Body accurate?** Re-read the live body (`gh issue view` — Draft Sync
  Convention); update it if the session changed scope, design, or status. Verify
  requirement issues still carry exactly the five template sections (see
  [Creating Requirement issues](../../../AGENTS.md)).
- **Stage correct?** Check the obot Roadmap user project (project 1,
  `gh project item-list 1 --owner jwildfire`) and move items whose stage no longer
  matches reality. Respect done-gates (e.g. a renderer requirement is not Released
  until its site entry deploys).
- **Links intact?** PRs carry `Closes #X` lines and Development-sidebar links;
  sub-issues are attached to their parent (use the `sub-issue-linking` skill).
- **Metadata set?** Milestone (lowercase `YYYYqN` or `backlog`) and topic labels.

Then sweep the session itself for **uncaptured todos**: promises made in
conversation, "we should…" moments, blockers hit, review requests, deferred
decisions. Every one gets a durable home:

- New scoped work → a Requirement (`requirement-drafting`) or a sub-issue in the
  implementation repo (`requirement-tasks`).
- Adjustments to existing work → an edit or comment on the existing issue.
- Small or not-yet-scoped items → the diary entry's "Next session" /
  "🙋 ToDo" sections (step 5), which are re-read at the next session's start.

Standing grants apply: standard updates (issue edits, stage moves, direct commits
to `main`) need no approval; **never delete or close anything not verifiably done**
without explicit approval.

### 3. Scaffold review — what did this session teach the harness?

Review the session for scaffold updates and either apply or propose them:

- **Repeatable pattern** executed by hand two or more times, or an existing skill
  that gave stale/wrong guidance → draft a new skill or a skill update. Hub-process
  skills live in this repo (`.github/skills/` + a symlink from the workspace
  `.claude/skills/`); shared gsm conventions go upstream as a `gsm.agent` PR.
- **Convention drift** — a convention changed or was granted in-session (autonomy,
  formats, gates) → update `AGENTS.md` / workspace `CLAUDE.md` so the next session
  starts current.
- **Memory** — durable facts, preferences, and feedback from the session → write or
  update memory files now (always within grants).
- **Config friction** — repeated permission prompts, broken skill symlinks, stale
  merged worktrees, out-of-date clones → fix what is safe (nothing destructive);
  list the rest.

Apply what standing grants cover; everything else becomes a proposal (issue, draft
PR, or a decision item in the diary's 🙋 ToDo). Note applied scaffold changes in the
diary entry so the trail survives.

### 4. Propose next-session tasks

Draft a prioritized, concrete list of what the next session should pick up:

- Every item traceable — link the issue/PR it advances; file an issue first
  (step 2) if substantial work has none.
- Include carried items from previous entries that are still open, marked as
  carried, so nothing silently drops.
- Record the list as the diary entry's **"Next session: loose ends"** section and
  update the memory next-session pointer to match.

### 5. Draft and post the session summary

- **File**: `diary/YYYY-MM-DD.md` (today). If it exists, append a session section
  under the existing content — one file per day.
- **Format** (match recent entries; the diary README and the latest few entries are
  the exemplars):
  - Lead `<span class="meta">…</span>` paragraph — the session's story in 2–4
    sentences.
  - `## Work completed` — from the step 1 inventory, grouped by lane.
  - `## PRs / issues touched` — merged / opened / closed / advanced, with links.
  - `## Blockers / risks`
  - `## Next session: loose ends` — from step 4.
  - `## 🙋 ToDo` — items needing @jwildfire (reviews, sign-offs, decisions).
- **Changelog**: if the session changed what `roadmap.html` shows (stage moves, new
  requirements), append a `site/roadmap-changelog.json` entry with the semver bump
  rules in `AGENTS.md`.
- **Post**: commit directly to `main` and push (standard-update grant). The site
  deploy triggers on `diary/**` pushes.
- **Verify the deploy**: `gh run list -R jwildfire/obot.roadmap --workflow=deploy-site.yml --limit 1`
  and watch it to a green conclusion — a posted-but-undeployed entry is not posted.
- **Share the deployed URL** (https://jwildfire.github.io/obot.roadmap/ diary page)
  — @jwildfire reviews in Chrome on the deployed site, not from a local file.

### 6. Exit checklist

Confirm, and state in the closing response:

- [ ] Board stages match reality for every touched issue; bodies synced.
- [ ] No todo exists only in conversation — each has an issue, diary line, or
      memory entry.
- [ ] Scaffold updates applied or proposed; memory current.
- [ ] Next-session list recorded (diary + memory).
- [ ] Diary entry deployed (workflow green) and the deployed URL shared.
