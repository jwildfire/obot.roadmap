# The issue contract

Status: v1, 2026-09-10. This is the tracking contract every agent and every session in
the obot program works under. It replaces the standing-objective model and the `--auto`
selection rules of the retired autonomous prototype. @jwildfire's direction, verbatim:

> I want to move to much more rigid issue tracking in roadmap moving forward. Each objective
> issue should have well defined requirement issues with linked task issues before the
> session starts. Each of these issues should have clear definitions of done. Objective is
> complete when all requirements and their tasks are completed per the issue definitions.
> Each agent/subagent should be linked to an issue or issues and associated PRs. Agents
> should actively comment on their assigned objectives, and standup should give a summary of
> which objectives are complete/in progress/blocked. All questions in standup should be tied
> to blocked issues.

Companion documents: [ways of working](ways-of-working.md) (how sessions run and what
@jwildfire reviews) and [developer guidelines](developer-guidelines.md) (branches, PRs,
tests, releases).

## The tree

```
Objective  (hub issue, label objective)
└── Requirement  (hub issue, label requirement, sub-issue of the objective)
    └── Task  (issue in ONE implementation repo, sub-issue of the requirement)
        └── Pull request  (Closes the task; carries the evidence)
```

| Node | Where it lives | Labels | Milestone | Body owned by | Complete when |
|---|---|---|---|---|---|
| Objective | jwildfire/obot.roadmap | `objective` | the delivery target | @jwildfire | every requirement under it is closed and the closing comment names the release |
| Requirement | jwildfire/obot.roadmap | `requirement` + one area label | the delivery target | the author until sign-off, then @jwildfire | every task under it is closed and its proof is posted in a closing comment |
| Task | exactly one implementation repository | the repo's own | the repo's release milestone | the author | its pull request merged with `Closes #N` and the evidence in the PR body |

Links are GitHub sub-issues, made through the sub-issues API or the issue sidebar, so
the tree is readable by a machine — the standup walks it — and visible in the hub's
hierarchy view. A `Parent:` line in a task body is a courtesy for readers; the sub-issue
link is the record.

Nothing starts without the tree. A session runs one requirement. Its first act is to read
the objective's tree and check every node under its requirement, and to find the
objective's sign-off — a comment from @jwildfire on the objective issue saying the tree is
signed off. A node without a definition of done or a milestone is filed or fixed, and the
session stops for sign-off before building. The session quotes the sign-off link in its
start comment on the requirement.

## Definitions of done

Every node — objective, requirement, task — carries a `### Definition of done` section with
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

An objective's definition of done is the whole objective's end state in a paragraph; the plan
page for the five current objectives carries one per objective and they are the model. A
requirement's definition of done is what the session's `/goal` condition is built from: the
evaluator judges it from the transcript, so its proof must be something the session can show.
A task's definition of done is what its pull request proves.

## Objective issues

An objective is a hub issue filed from the [objective template](../.github/ISSUE_TEMPLATE/objective.yml).
It is completable: it closes when its tree is closed. Body sections, in order:

1. Intent — what direction this objective sets, in @jwildfire's words.
2. Definition of done — the whole objective's end state, its proof, the release it ships in.
3. Requirements — the ordered list of requirement issues under it, one line each, in the
   order their sessions should run. Membership is the sub-issue links; this list says the
   order.
4. Boundaries — what a session should weigh that the requirements do not say:
   constraints, prerequisites, what beats what, the cut line if the calendar slips.
5. The hidden `<!-- objective-slug: … -->` comment, which names the objective's site page.

@jwildfire owns the body and the sub-issue links. Agents comment on an objective; they never
edit its body or its links. Proposed changes to an objective go in a comment.

Objectives carry the milestone of their delivery target. As of 2026-09-10 the delivery target
is the R/Pharma talk, milestone `2026-10-talk`; the five objectives from the
[plan](https://jwildfire.github.io/obot.roadmap/reports/goal-sessions-plan-2026-09-10/)
are the open objectives. Standing objectives that predate this contract are converted (the charts
and app objectives), closed as retired (autonomy), or paused with a comment (CSR, keynote).

## Requirement issues

A requirement is a hub issue filed from the
[requirement template](../.github/ISSUE_TEMPLATE/requirement.yml), linked as a sub-issue
of exactly one objective. Sections, in order:

| Section | What it holds | Required before a session starts on it |
|---|---|---|
| Objective | the objective it belongs to, `#N`; the sub-issue link is the record | yes, at filing |
| Business Requirement | the need in plain language — who benefits, what success looks like | yes |
| Overview | the approach in a paragraph, and the repositories the tasks will live in | yes, at filing |
| Data Requirement | the domains, columns and sources the work needs, with availability | only when data is involved |
| Design | the technical design, inline or as `requirements/design/{N}_design.html` | yes |
| Definition of done | end state, proof, ships in | yes |
| Tasks | one line per task issue, `repo#N — title`, mirrored from the sub-issue links | yes |

Below the sections, after a `---` rule: the drafted-by line, and nothing else
([Who decided it](#who-decided-it)).

A requirement is sized for one session: the set of tasks one `/goal` run can close and
prove — a day or two of work, one release, a definition of done the evaluator can judge
from the transcript. If it needs more than that, it is two requirements.

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
  `infrastructure` (platform and scaffold), `ai` (agent workflow). Milestone: the objective's
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
  absent. A task with no milestone is not pickable, and its requirement cannot be Ready.
- Labels: whatever the repository uses; no program-wide task label is required.
- Size: a task is one pull request. If it needs two, it is two tasks.
- Closed by its pull request's `Closes #N` line on merge; the PR body carries the
  evidence the definition of done asked for.

## Status

A requirement's status lives in one place: a `status:` label on the requirement issue —
`status: backlog`, `status: ready`, `status: in session`, `status: review`,
`status: released`. Exactly one at a time: setting the next removes the previous
(`gh issue edit <n> --add-label "status: ready" --remove-label "status: backlog"`). The
requirement template applies `status: backlog` on filing. The obot Roadmap project board
is retired: a label is readable by any token where the board's field needed @jwildfire's
own, it is written through the same lane as every other issue edit, and it is visible in
every issue list. Five values, each set at a point the contract already passes through, so
status is written as a side effect and never hand-maintained. They map onto the three
phases of the [ways of working](ways-of-working.md#the-three-phases):

| Status | Phase | Set when | Set by |
|---|---|---|---|
| Backlog | prep | the requirement is filed; its tree or its definition of done is incomplete | whoever files it |
| Ready | prep → execution | the Ready gate below holds | the prep session, with @jwildfire |
| In session | execution | the session posts its start comment | the session |
| Review | execution → review | a release-candidate PR carrying its `Closes` line is ready for review — CI green, ultrareview run and every finding resolved, @jwildfire requested | the session, when it marks the RC ready |
| Released | review | closed with its release | @jwildfire at the tag, or the session at close |

The Ready gate — all of these, checked by the prep session and re-checked by the
execution session before it sets its goal:

- The requirement's Design and Definition of done sections are populated.
- Every task under it is filed in its implementation repository, linked as a sub-issue,
  with its own definition of done.
- Every task carries a milestone in its repository, and the requirement carries the
  hub's delivery-target milestone. A requirement whose tasks span two repositories
  carries a milestone in each; no task without a milestone, no Ready.
- The objective's tree is signed off by @jwildfire in a comment on the objective.

The site's requirements collector reads the labels and renders them on the catalog and
roadmap pages — the tracker on the hub site — and the standup reads them too. An open
requirement labelled released, an open one with no status label, or one carrying two, is
drift and is reported as such; a closed requirement reads Released whatever it carries.

Objectives carry no status label: their state is the roll-up of their requirements. Tasks
carry none either: their state is their issue, and the requirement's sub-issue progress
shows completion. There are no workflow
labels beyond `blocked`, and a node's other states are read from GitHub:

| State | How it is read |
|---|---|
| open | the issue is open and carries no `blocked` label; a task with an open PR is "in review" in the nightly comment |
| blocked | the issue carries the `blocked` label and its latest comment is one question for @jwildfire |
| closed | the issue is closed; for a task, by its PR; for a requirement and an objective, with a closing comment carrying the proof |

Blocked is an overlay on a status, not a status: a requirement In session with a blocked
task stays In session and shows the label. Blocked is a state of an issue, not of a session. The session adds the label and the
question, comments on the objective naming it, and moves to the next task. @jwildfire answers
on the issue; whoever reads the answer removes the label. The standup lists every
`blocked` issue and asks nothing else.

## Comments

The comments are the record of the work; the standup and @jwildfire read them, so they
are written for him. Each ends with a `---` rule and the drafted-by line.

| When | Where | Content |
|---|---|---|
| Session start | the requirement | the order of its tasks, which agent holds which, the link to his sign-off on the objective |
| A task closes | the task (and the PR body) | the definition-of-done evidence, and one sentence saying what he can now do that he could not before |
| A requirement closes | the requirement, and one line on the objective | the proof its definition of done asked for, and the sentence |
| Nightly, and before the session stops | the requirement | three fixed headings: Complete, In progress, Blocked — one line per task |
| Blocked | the blocked issue | one question, first paragraph, nothing else |
| The objective closes | the objective | the release it shipped in and the sentences from its requirements; @jwildfire closes it |

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
| `objective` | hub | an objective issue |
| `requirement` | hub | a requirement issue |
| `safety`, `infrastructure`, `ai` | hub | the requirement's area |
| `blocked` | any repo | the issue is waiting on one question for @jwildfire |

Labels the retired prototype used for selection and bookkeeping — `auto`, `draft`,
`top10`, `on-deck`, `ws-*`, `audit-decision`, `orphan-accepted` — are no longer read by
anything and are removed with the hub scaffold retirement.

## Who decided it

Approval is recorded where it happens and cited from there — never asserted in prose on
the thing being approved:

- A tree is approved by @jwildfire's sign-off comment on the objective; the requirement's
  `status: ready` label is the record that the gate held, and the session quotes the
  comment's link in its start comment.
- A release is approved by his approving review on the release-candidate PR, which the
  release branch's ruleset requires.
- A decision he makes is recorded where he made it — the issue comment, the review, the
  Q&A thread — and an approval-gated action (a deletion, a merge to a release branch,
  anything an invariant names) cites that record, with its date, not the requirement that
  contains it.

Every issue, PR and comment ends with a `---` rule and the drafted-by line naming who
wrote it. It names the author and nothing else; "and reviewed by @jwildfire" is written
only when he did. The earlier `Authored by / Approved by / Beyond the approval` block and
the machinery that checked it were retired on 2026-09-10 with the template that carried
them.

## What the standup reads

The standup is derived, never maintained. It walks every open objective's requirements and
their tasks, counts closed / open / blocked, quotes each requirement's latest nightly
comment, and lists every `blocked` issue's question. If a thing is not on the tree it is not in the standup;
if a question is not on a blocked issue it is not asked. Keeping the tree and its
comments right is the whole job of reporting.

---
This document was drafted by Claude Code using Fable 5.1 and reviewed by @jwildfire.
