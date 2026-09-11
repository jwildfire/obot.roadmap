# Ways of working

Status: v1, 2026-09-10. How the obot program runs since the autonomous prototype was shut
down: requirement sessions in the cloud, driven by @jwildfire through the issues on this
hub. The decision and the five objectives it applies to are on the
[plan page](https://jwildfire.github.io/obot.roadmap/reports/goal-sessions-plan-2026-09-10/).
The tracking rules are the [issue contract](issue-contract.md); the engineering rules
are the [developer guidelines](developer-guidelines.md).

## Principles

- Human driving, not human reviewing. @jwildfire sets the objectives, signs the trees, answers
  the blocked questions and reviews the release candidates. Agents do the work in
  between and write it down where he reads.
- The measure is clinical deliverables and user-facing tools. Orchestration health,
  worker reporting and scaffold polish are not progress; the deployed site on Friday is.
- Nothing bespoke. Sessions use Claude Code as shipped — cloud sessions, `/goal`, plan
  mode, subagents, the Workflow tool, routines, skills — and GitHub as shipped — issues,
  sub-issues, labels, milestones, rulesets, auto-merge. Anything that would need its own
  daemon, hook, ledger or dashboard is a smell.
- Everything is on GitHub. If it is not on an issue, a pull request, a release or a page
  on the site, it did not happen.

## The three phases

@jwildfire's shape for the work (2026-09-10): prep, execution, review.

| Phase | Where | Who | `status:` label moves | What happens |
|---|---|---|---|---|
| 1 · Prep | a session in the `obot.roadmap` cloud environment | agent and @jwildfire together — active collaboration | Backlog → Ready | the requirement is drafted, designed and decomposed with the hub's `requirement-drafting`, `requirement-design` and `requirement-tasks` skills; tasks are filed in their repositories with definitions of done and milestones; the objective's tree is signed off; the Ready gate is checked and the status set |
| 2 · Execution | a session in the repository's cloud environment | the agent, semi-autonomously; @jwildfire steers on the issue or in the session | Ready → In session → Review | the `requirement-session` skill: set `/goal` from the requirement's definition of done, work the tasks through auto-merging PRs, comment nightly, open the release candidate as a draft, run ultrareview on it and resolve every finding, then mark it ready for him |
| 3 · Review | GitHub | mostly @jwildfire | Review → Released | the RC PR with its demo page and notes; his approving review merges it; the tag closes the requirement |

An execution session that finds its requirement still in Backlog has a prep job in front
of it, not an execution job: it files what is missing and stops for sign-off. The
Requirement-level milestone rule is part of the Ready gate — every task carries a
milestone in its repository, and the requirement carries one on the hub, before anything
is Ready ([issue contract → Status](issue-contract.md#status)).

## The loop

1. @jwildfire states an objective. The objective issue is filed under the contract, with its
   definition of done.
2. Prep: the tree is built in the hub environment — requirements with designs and
   definitions of done, tasks in the implementation repositories, all milestoned and
   linked. Agents draft with him; he signs off on the objective issue; the requirement
   goes Ready.
3. A cloud session starts on the first requirement. It sets `/goal` from the
   requirement's definition of done and works its tasks: branch, tests, pull request,
   auto-merge, closing comment with evidence. The next requirement gets the next session.
4. Every night the session comments on its requirement — complete, in progress, blocked —
   and the standup routine rolls every objective's state and every blocked question up into
   the voice-readable standup.
5. @jwildfire steers: answers on the blocked issue, redirects the running session on
   claude.ai/code, or changes the objective body.
6. When the tree ships a release, the release-candidate pull request goes to him with
   its demo page and notes. He merges; the tag is cut; the objective closes.
7. Every Friday the deployed site must show what the plan said it would. That is the
   honest measure of the week.

## Roles

| Who | Does | Does not |
|---|---|---|
| @jwildfire | owns objective bodies and their links; signs off trees; answers blocked questions; reviews and merges release candidates; applies rulesets and creates cloud environments | review increment PRs; get asked in chat what could be asked on an issue |
| A requirement session | one requirement, start to finish; files missing tree nodes and stops for sign-off; works its tasks through PRs; comments on the requirement; reports its tasks' state every turn | edit an objective or requirement body or its links; start a second requirement; merge a release branch |
| A subagent or Workflow stage | one task or one bounded investigation, briefed with its issue and definition of done; returns evidence | act without an issue to be bound to |
| The standup routine | reads GitHub nightly and publishes the standup | comment, label, open or close anything |

## Sessions

- One requirement per session. An objective is the steering unit and is never a session;
  its requirements run one at a time, each as a Claude Code cloud session bound to the
  repository where the requirement's tasks live, running in auto mode, in the environment
  for that repository ([obot.agent `docs/cloud-environments.md`](https://github.com/jwildfire/obot.agent/blob/main/docs/cloud-environments.md)).
- The session runs the [`requirement-session`](https://github.com/jwildfire/obot.agent/blob/main/skills/requirement-session/SKILL.md)
  skill: read the requirement and its tree, check it, set the goal from the requirement's
  definition of done, work the tasks, comment, finish — moving the requirement's `status:`
  label to in session at start, review when its RC opens, and released at close
  ([issue contract → Status](issue-contract.md#status)).
- The `/goal` condition is generated from the tree with this template, under 4,000
  characters:

  ```text
  /goal Requirement jwildfire/obot.roadmap#<requirement> is done: every task linked as its
  sub-issue is closed by a merged pull request carrying its definition-of-done evidence, or
  carries the `blocked` label with a comment naming the one thing needed from @jwildfire;
  and the requirement's own definition of done — <its end state and proof, quoted> — is
  proven in a closing comment on the requirement. Prove it at the end of every turn by
  listing each task with its state. Stop after <N> turns or by <date>, whichever comes
  first, and post the nightly comment before stopping.
  ```

  The evaluator judges only what the session surfaces, so every turn ends with the
  requirement's state, one line per task. Background work defers evaluation; check-ins arrive
  at 30 minutes, then hourly.
- Concurrency: two sessions at a time as the plan stands — one on the app lane, one on
  the charts lane — so there are two threads to steer and never more. A third is
  possible; it doubles the steering load on the busiest weeks.
- Idle: a cloud session waiting on @jwildfire idles and its VM is eventually reclaimed.
  Nothing is lost — the question is on the blocked issue and `/goal` survives a resume.
- Local sessions: a person at a terminal may run a requirement session locally under the same
  contract, using the worktree layout in the developer guidelines. What no longer exists
  is anything unattended on a person's machine.

## What @jwildfire reviews

Exactly three things reach him:

1. Trees, for sign-off — a comment on the objective issue covering its requirements and tasks.
2. Blocked questions — one per blocked issue, answered on the issue.
3. Release-candidate pull requests — each with a demo page, release notes and an
   ultrareview whose findings are all resolved, merged only on his approving review,
   which the release branch's ruleset requires.

Increment pull requests never reach him: they merge on green checks. A session that
finds itself wanting his opinion on an increment has a blocked question, not a review
request.

## Steering

- On the issue: answer the blocked question, change a definition of done, reorder the
  requirements list, add a boundary. The next turn reads it.
- In the session: open it on claude.ai/code or the phone and redirect it. A message
  queues into a running session and is read at the next turn.
- By voice: the daily check-in reads `standup.md` aloud; a note dictated back is a
  comment on the issue it concerns, not a new intake lane.

## The standup

A scheduled cloud routine on this repository
([obot.agent `routines/standup.md`](https://github.com/jwildfire/obot.agent/blob/main/routines/standup.md))
renders, every night, from GitHub alone:

- every open objective with its requirements' status labels and its complete / in
  progress / blocked counts across tasks, and the sentences from its requirements' latest
  nightly comments;
- one question per issue carrying the `blocked` label, quoted from its latest comment;
- the release-candidate pull requests waiting on him and how long they have waited.

It publishes `standup.md` on the `session-state` branch, the address the voice check-in
has always read ([STANDUP.md](../STANDUP.md)). It never comments, labels or edits.

## Decisions

- A question that blocks work is asked on the blocked issue. That is the default and it
  covers almost everything.
- A call that needs options laid out — a design direction, a data-cleaning judgement
  with clinical consequences, a scope trade — gets a decision artifact under
  [`reports/decisions/`](../reports/decisions/README.md): the situation in three
  sentences, the options with what each costs, a plain recommendation, and what
  unblocks on each choice. It is linked from the blocked issue, which remains what the
  standup reads. One artifact per decision.
- A decision he makes is recorded where he made it — the issue comment, the review, the
  Q&A thread — and cited from there ([who decided it](issue-contract.md#who-decided-it)).
  The day he decides, the artifact that asked gets a Decisions section at the top in his
  words.

## Eliciting intent before a requirement is filed

When an objective is stated but what he wants is not yet clear enough to write a definition of
done, ask on the objective issue: one batch of questions in one comment, each answerable in a
sentence, with the default the agent would take if unanswered. He answers in a comment
or edits the objective body. Three batches is the ceiling; after that the requirement is
drafted with the gaps stated in its body, and his sign-off on the objective closes them.

## Releases and review

- Operational repositories (obot.agent, obot.roadmap): work merges to `main` on green
  checks; obot.agent cuts releases to its lagging `stable` branch by a `main → stable`
  release-candidate PR he reviews.
- Clinical repositories (safety.viz, gsm.safety, open.csr, open.gismo, demo-301): he
  reviews everything before it reaches a released surface — the release-candidate PR
  from the integration branch to the release branch, with its demo page and notes.
- The calendar sets what each week must show. A release candidate is the vehicle for
  the week's must-show wherever the plan names a release.

Full rules for release candidates, notes, demo pages and rulesets:
[developer guidelines → Releases](developer-guidelines.md#releases).

## Comments, artifacts and the news feed

The record of work is the issue thread: a standard comment on the issue being worked, under
the shapes in the [issue contract](issue-contract.md#comments), suffices for almost
everything — start, progress, evidence at close, a decision, a blocker. There is no
session diary. An artifact is for what a comment cannot carry — a page with figures, a
design, a decision with its options — and it is always linked from the issue it serves,
with the issue linked back. The site's news feed shows issue transitions (filed, moved
between statuses, closed) and artifact creation, so the basics are visible without any
other writing; weekly round-ups, podcast episodes and the like are additions for later.

Anything written for him lives on this hub's site: reports under `reports/`, designs
under `requirements/design/`, decisions under `reports/decisions/`. Each is a
self-contained page with a one-line description in its head, written in plain English —
name things, do not number them; links are trailing citations; emphasis is structural or
a callout, never a bolded clause mid-paragraph. He reviews on the deployed site, often on
a phone, so every page holds at a 390-pixel viewport. The contract is
[`reports/README.md`](../reports/README.md).

## What was retired, and why

Until 2026-09-10 the program ran a fully autonomous multi-agent prototype: a navigator
session judging closeouts and dispatching workers on a five-minute sweep, a prime
concierge session, an admiral, a `--auto` dispatcher with an objective registry, session
bookend skills with a scratchpad, blocker and worker journals, an operations dashboard,
a spend cap, a merge policy script with an attested lane, a bot identity with a
Keychain-bound token, and stop hooks in every session. Its readout: the agent structure
was more robust than earlier attempts; objectives and memory management were poor; most of
the effort went into the orchestration itself; @jwildfire had to redirect it constantly;
and it never produced a release for him to review. It was retired in obot.agent v0.5.0.
The hub's own scaffold from that era — the nightly audit and its apply lane, the ideas
triage, the navigator-era stamps — was removed on 2026-09-10 under the same principle.

---
This document was drafted by Claude Code using Fable 5.1 and reviewed by @jwildfire.
