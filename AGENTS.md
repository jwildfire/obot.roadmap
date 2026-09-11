# AGENTS.md

## Overview

This is the hub of Jeremy Wildfire's open-source safety-graphics modernization portfolio
(the "obot" program): its objectives, requirements and designs, the standards every session
works under, and the site that reports on it. An agent working here plans and tracks —
files and edits issues under the contract, captures designs, decomposes requirements
into tasks, comments on the issues it works and writes reports when a comment cannot carry
it — and follows the same standards it asks every
other repository to follow.

IMPORTANT: the three documents under [`docs/`](docs/) are the standards and they are
mandatory in every repository of the program. Read them before doing anything:

- [Issue contract](docs/issue-contract.md) — objectives, requirements and tasks, definitions
  of done, labels and milestones, blocked, closing, who decided it.
- [Ways of working](docs/ways-of-working.md) — requirement sessions, roles, what @jwildfire
  reviews, steering, the standup, decisions, releases.
- [Developer guidelines](docs/developer-guidelines.md) — branches, Claude Code setup,
  commits, pull requests, merging via rulesets, testing, releases, artifacts, the write
  policy, the GxP stance.

This repo mirrors [Gilead-BioStats/gsm.roadmap](https://github.com/Gilead-BioStats/gsm.roadmap)
in its requirement lifecycle; where the two differ, the documents above win.

## Operating grants

Standing grants from @jwildfire (2026-07-04, unchanged by the 2026-09-10 move to requirement sessions):

- Standard updates need no prior approval — filing and editing issues under the
  contract, requirement lifecycle updates, design and dataspec documents, reports, site
  content, and direct commits to `main` for those.
- Never delete anything without explicit approval — no deleting files, issues, releases
  or branches with unmerged work, and no history rewrites or force-pushes. Cite the
  approval when acting on one.
- Review flow: @jwildfire reviews artifacts, designs and requirements on the deployed
  site (https://jwildfire.github.io/obot.roadmap/), often on a phone. Publish first —
  commit and push so Pages deploys — then share the deployed URL, never a local preview.
- Objective issue bodies and their sub-issue links are his. Propose changes to an objective
  in a comment.

## Creating issues

Every issue is filed from its template so that the site's generators and the standup can
read it: [objective](.github/ISSUE_TEMPLATE/objective.yml),
[requirement](.github/ISSUE_TEMPLATE/requirement.yml),
[task](.github/ISSUE_TEMPLATE/task.yml). Filing with `gh issue create` bypasses the web
form, so reproduce the template's sections exactly — read the template first, never
reconstruct it from memory or from an existing issue.

- A requirement body has the six `###` sections in template order — Business
  Requirement, Overview, Data Requirement, Design, Definition of done, Tasks — never
  renamed, reordered, added to or dropped. Sections not yet populated carry a short
  italic placeholder saying when they will be. Verify before submitting:
  `gh issue view <n> --json body -q .body | grep '^### '`.
- Below the sections, after a `---` rule: the drafted-by line and the provenance block
  (`Authored by:` / `Approved by:` / `Beyond the approval:` when an approval is cited).
  `EMPTY` is the normal value of `Approved by` for agent-written work; a citation must
  resolve — `node scripts/provenance.mjs resolve <n>` — and never be prose. The full
  rule is [who decided it](docs/issue-contract.md#who-decided-it); the reason it exists
  is #215, when a worker prepared to delete files on the strength of a requirement it
  read as his approval.
- The `requirement-drafting`, `requirement-design` and `requirement-tasks` skills under
  [`.github/skills/`](.github/skills/) walk a requirement from idea to filed tasks;
  `sub-issue-linking` from the upstream harness makes the tree links. Every node gets its definition of done and its milestone before its requirement's session may start.
- One requirement, one release; the `backlog` milestone for unscheduled work; lowercase
  milestone names.
- A requirement's status is one `status:` label — backlog, ready, in session, review,
  released — applied by the template on filing and moved by the session at its start, its
  RC and its close, always removing the previous one ([issue contract → Status](docs/issue-contract.md#status)).
  The project board is retired; the site's catalog is the tracker.

## Comments first, artifacts when needed

The record of work is the issue thread. An agent comments on the issue it is working —
at start, at each close with the evidence its definition of done asked for, nightly on the
requirement, and whenever a decision or a blocker lands — under the shapes in the
[issue contract](docs/issue-contract.md#comments). A standard comment suffices for almost
everything. When it cannot carry the content — a page with figures, a design, a decision
with options laid out — the agent writes an artifact under `reports/` or
`requirements/design/`, links it from the issue it serves, and the artifact links back.
The site's [news feed](https://jwildfire.github.io/obot.roadmap/news.html) shows issue
transitions and artifact creation; nothing else needs writing to be seen.

The session diary closed on 2026-09-10; `diary/` stays as history and is still rendered,
but no new entries are written ([diary/README.md](diary/README.md)).

## Identity

The actor is the connected GitHub account of the session — in a cloud session, the
account that authorized Claude Code; locally, @jwildfire's own `gh` credentials. The
obotclaw[bot] App identity was retired with the autonomous prototype on 2026-09-10; its
App still exists and the `actions/create-github-app-token` secrets remain for workflows
that need them. The drafted-by line at the foot of every issue, PR and comment records
who wrote the content; say @jwildfire reviewed it only when he did.

## Constraints

- Always check the current state of referenced files before making changes; conventions
  have moved more than once and historical practice may no longer apply.
- Never create a requirement without Business Requirement and Overview; never file tasks
  before Design is populated; never start a session on a requirement whose objective's tree lacks a definition of done or a milestone anywhere.
- Renderer requirements trace to the reviewed requirement matrices in
  [safety.viz `requirements/`](https://github.com/jwildfire/safety.viz/tree/HEAD/requirements);
  tests in implementation repos are keyed to those requirement IDs.
- Every page published to the site carries a one-line `<meta name="description">` and
  meets the plain-English bar in [`reports/README.md`](reports/README.md); the deploy
  fails without the description.
- `site/roadmap-changelog.json` is the site's audit log: append an entry with a semver
  bump whenever a change alters what the site shows (patch for bookkeeping, minor for new
  pages or requirements, major for a redesign). The header badge reports when it has
  slipped.

## Related repositories

- [`obot.agent`](https://github.com/jwildfire/obot.agent) — the session core: the
  `requirement-session` skill every working session runs, the standup routine, the cloud
  environments. It carries no standards of its own; it points here.
- [`gsm.agent`](https://github.com/Gilead-BioStats/gsm.agent) — the upstream harness
  this ecosystem aligns with (drafts, attribution, worktrees, TDD); the documents above
  say where this program diverges.
