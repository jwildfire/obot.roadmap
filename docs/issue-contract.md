# The issue contract

Status: v1, 2026-09-10. This is the tracking contract every agent and every session in
the obot program works under. It replaces the standing-goal model and the `--auto`
selection rules of the retired autonomous prototype. @jwildfire's direction, verbatim:

> I want to move to much more rigid issue tracking in roadmap moving forward. Each goal
> issue should have well defined requirement issues with linked task issues before the
> session starts. Each of these issues should have clear definitions of done. Goal is
> complete when all requirements and their tasks are completed per the issue definitions.
> Each agent/subagent should be linked to an issue or issues and associated PRs. Agents
> should actively comment on their assigned goals, and standup should give a summary of
> which goals are complete/in progress/blocked. All questions in standup should be tied
> to blocked issues.

Companion documents: [ways of working](ways-of-working.md) (how sessions run and what
@jwildfire reviews) and [developer guidelines](developer-guidelines.md) (branches, PRs,
tests, releases).

## The tree

```
Goal  (hub issue, label goal)
└── Requirement  (hub issue, label requirement, sub-issue of the goal)
    └── Task  (issue in ONE implementation repo, sub-issue of the requirement)
        └── Pull request  (Closes the task; carries the evidence)
```

| Node | Where it lives | Labels | Milestone | Body owned by | Complete when |
|---|---|---|---|---|---|
| Goal | jwildfire/obot.roadmap | `goal` | the delivery target | @jwildfire | every requirement under it is closed and the closing comment names the release |
| Requirement | jwildfire/obot.roadmap | `requirement` + one area label | the delivery target | the author until sign-off, then @jwildfire | every task under it is closed and its proof is posted in a closing comment |
| Task | exactly one implementation repository | the repo's own | the repo's release milestone | the author | its pull request merged with `Closes #N` and the evidence in the PR body |

Links are GitHub sub-issues, made through the sub-issues API or the issue sidebar, so
the tree is readable by a machine — the standup walks it — and visible in the hub's
hierarchy view. A `Parent:` line in a task body is a courtesy for readers; the sub-issue
link is the record.

Nothing starts without the tree. A session's first act is to read its goal's tree and
check every node below; a node without a definition of done or a milestone is filed or
fixed, and the session stops for sign-off before building. Sign-off is a comment from
@jwildfire on the goal issue saying the tree is signed off; the session quotes its link
in its start comment.

## Definitions of done

Every node — goal, requirement, task — carries a `### Definition of done` section with
three parts:

- End state: what is observably true when the work is done. A page exists at a URL and
  shows a thing; a function is exported and returns a thing; a table reads 22 of 22.
- Proof: how a reader who has memorised nothing can check it. A command and what it
  prints; a URL and what it shows; a test name and its result; a screenshot in the
  evidence set. The proof must be something a session can put in its transcript, because
  the goal evaluator judges from the transcript.
- Ships in: the release or milestone the work lands in.

Write it so it can fail. "Works as expected" and "is complete" cannot fail and are not
definitions of done. Compare:

| Not a definition of done | A definition of done |
|---|---|
| The portfolio view is implemented and works. | End state: `https://jwildfire.github.io/safety.viz/dev/portfolio/` renders all 13 chart modules on the demo data, grouped by domain, with the participant profile opening from any chart. Proof: the Playwright run `npm run test:e2e -- portfolio` passes and its screenshots are in `docs/evidence/portfolio/`. Ships in: safety.viz v1.8.0. |
| Add the DILI figures. | End state: `Visualize_DILI()` renders F7 and F8 from the FDA ST&F guide on the vendored pharmaverse data with the Hy's Law quadrants drawn per the guide's rules. Proof: `devtools::test(filter = "dili")` passes including its vdiffr snapshots, and the figures appear in the pkgdown gallery beside their safety.viz twins. Ships in: gsm.safety v2.0.0. |

A goal's definition of done is the whole goal's end state in a paragraph; the plan page
for the five current goals carries one per goal and they are the model.

## Goal issues

A goal is a hub issue filed from the [goal template](../.github/ISSUE_TEMPLATE/goal.yml).
It is completable: it closes when its tree is closed. Body sections, in order:

1. Intent — what direction this goal sets, in @jwildfire's words.
2. Definition of done — the whole goal's end state, its proof, the release it ships in.
3. Requirements — the ordered list of requirement issues under it, one line each, with
   the order a session should take them in. Membership is the sub-issue links; this list
   says the order.
4. Boundaries — what a session should weigh that the requirements do not say:
   constraints, prerequisites, what beats what, the cut line if the calendar slips.
5. The hidden `<!-- goal-slug: … -->` comment, which names the goal's site page.

@jwildfire owns the body and the sub-issue links. Agents comment on a goal; they never
edit its body or its links. Proposed changes to a goal go in a comment.

Goals carry the milestone of their delivery target. As of 2026-09-10 the delivery target
is the R/Pharma talk, milestone `2026-10-talk`; the five goals from the
[plan](https://jwildfire.github.io/obot.roadmap/reports/goal-sessions-plan-2026-09-10/)
are the open goals. Standing goals that predate this contract are converted (the charts
and app goals), closed as retired (autonomy), or paused with a comment (CSR, keynote).

## Requirement issues

A requirement is a hub issue filed from the
[requirement template](../.github/ISSUE_TEMPLATE/requirement.yml), linked as a sub-issue
of exactly one goal. Sections, in order:

| Section | What it holds | Required before the session starts |
|---|---|---|
| Business Requirement | the need in plain language — who benefits, what success looks like | yes |
| Overview | the approach in a paragraph and the repos it touches | yes |
| Data Requirement | the domains, columns and sources the work needs, with availability | yes when data is involved |
| Design | the technical design, inline or as `requirements/design/{N}_design.html` | yes |
| Definition of done | end state, proof, ships in | yes |
| Tasks | one line per task issue, `repo#N — title`, mirrored from the sub-issue links | yes |

Below the sections, after a `---` rule: the attribution line and the two provenance lines
([Who decided it](#who-decided-it)).

Rules that carry over unchanged from the earlier lifecycle:

- One requirement, one release. If the scope is bigger than one release it is more than
  one requirement; split it at authoring time. Deferring scope has a procedure and the
  order matters: note the deferral on the original, file a new requirement with its own
  milestone, transfer (not re-file) the deferred tasks, and close the original with its
  release. A defect found after release is an ordinary issue against shipped work, not
  deferred scope.
- A requirement's Design section must be populated before its tasks are filed; the
  hub's `requirement-drafting`, `requirement-design` and `requirement-tasks` skills
  walk the three steps and now each add the definition-of-done section.
- Labels: `requirement` plus one area label — `safety` (charts, safety.viz, gsm.safety),
  `infrastructure` (platform and scaffold), `ai` (agent workflow). Milestone: the goal's
  delivery target.

## Task issues

A task is an issue in exactly one implementation repository — safety.viz, gsm.safety,
obot.roadmap for hub work, obot.agent for the session core — linked as a sub-issue of
its requirement. Shape:

```markdown
Parent: jwildfire/obot.roadmap#<requirement>

### What changes
Two or three sentences: the change, where in the repo, and what it must not change.

### Definition of done
- End state: …
- Proof: …
- Ships in: <the repo's release milestone>

---
This issue was drafted by Claude Code using <model>.
```

- Title: `{verb} {what}` — "Add the portfolio manifest schema", "Wrap ggsurvfit for the
  Kaplan–Meier figures".
- Milestone: the repository's release milestone (`v1.8.0`, `v2.0.0`), created if
  absent. A task with no milestone is not pickable.
- Labels: whatever the repository uses; no program-wide task label is required.
- Size: a task is one pull request. If it needs two, it is two tasks.
- Closed by its pull request's `Closes #N` line on merge; the PR body carries the
  evidence the definition of done asked for.

## States

There are no workflow labels beyond `blocked`. A node's state is read from GitHub:

| State | How it is read |
|---|---|
| open | the issue is open and carries no `blocked` label; a task with an open PR is "in review" in the nightly comment |
| blocked | the issue carries the `blocked` label and its latest comment is one question for @jwildfire |
| closed | the issue is closed; for a task, by its PR; for a requirement and a goal, with a closing comment carrying the proof |

Blocked is a state of an issue, not of a session. The session adds the label and the
question, comments on the goal naming it, and moves to the next task. @jwildfire answers
on the issue; whoever reads the answer removes the label. The standup lists every
`blocked` issue and asks nothing else.

## Comments

The comments are the record of the work; the standup and @jwildfire read them, so they
are written for him. Each ends with a `---` rule and the drafted-by line.

| When | Where | Content |
|---|---|---|
| Session start | the goal | the order of requirements, which agent holds which task, the link to his sign-off |
| A task closes | the task (and the PR body) | the definition-of-done evidence, and one sentence saying what he can now do that he could not before |
| A requirement closes | the requirement | the proof its definition of done asked for, and the sentence |
| Nightly, and before the session stops | the goal | three fixed headings: Complete, In progress, Blocked — one line per node |
| Blocked | the blocked issue | one question, first paragraph, nothing else |
| The goal closes | the goal | the release it shipped in and the sentences from its requirements |

The nightly comment's shape, exactly:

```markdown
### Complete
- #N — one sentence: what @jwildfire can now do that he could not before

### In progress
- #N — where it stands, and what lands next

### Blocked
- #N — the one question, quoted from the issue's latest comment
```

A closure carries a sentence. `#251, #256 and #264 closed` is the failure this exists to
stop: the sentence is the deliverable and the issue number is a trailing citation.

## Milestones and labels

Milestones name delivery targets. On the hub: `backlog` for unscheduled work and one
named target per delivery — `2026-10-talk` today; quarterly `YYYYqN` milestones remain
for planning beyond the target. In a repository: the release version, `vX.Y.Z`.

| Label | Where | Use |
|---|---|---|
| `goal` | hub | a goal issue |
| `requirement` | hub | a requirement issue |
| `safety`, `infrastructure`, `ai` | hub | the requirement's area |
| `blocked` | any repo | the issue is waiting on one question for @jwildfire |

Labels the retired prototype used for selection and bookkeeping — `auto`, `draft`,
`top10`, `on-deck`, `ws-*`, `audit-decision`, `orphan-accepted` — are no longer read by
anything and are removed with the hub scaffold retirement.

## Who decided it

Most requirements are written by an agent, and a filed requirement looks like settled
intent — milestoned, linked to a goal — whether the scope in it came from @jwildfire or
from the agent's own judgement. So the two facts are recorded separately, at the foot of
every requirement body:

```
Authored by: Claude Code using Fable 5.1
Approved by: EMPTY
```

`Approved by` holds a citation that resolves — his sign-off comment on the goal
(`jwildfire/obot.roadmap#N (comment)`), a decision id (`D0018.1`), or his native GitHub
review (`owner/repo#123 review`) — or `EMPTY`, which is the normal and correct state for
work he has not approved. Never prose. `node scripts/provenance.mjs resolve <n>` prints
what was asked, what he said, the channel and the date, or says nobody has approved it.
An approval-gated action — a deletion, a merge to a release branch, anything an invariant
names — cites that, never the requirement that contains it.

## What the standup reads

The standup is derived, never maintained. It walks every open goal's sub-issues and
theirs, counts closed / open / blocked, quotes the latest nightly comment, and lists
every `blocked` issue's question. If a thing is not on the tree it is not in the standup;
if a question is not on a blocked issue it is not asked. Keeping the tree and its
comments right is the whole job of reporting.

---
This document was drafted by Claude Code using Fable 5.1 and reviewed by @jwildfire.
