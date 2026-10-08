# Developer guidelines

Status: v1, 2026-09-10. The engineering rules for every repository in the obot program,
for Claude Code sessions and people alike. They carry forward what the retired
obot.agent overlay said about testing, releases and the GxP stance, and add the rules the
requirement-session model needs: how a repository is set up for Claude Code, how pull requests
merge, and what a chart must have before it is done. The tracking rules are the
[issue contract](issue-contract.md); the operating model is
[ways of working](ways-of-working.md).

Amended 2026-10-07 by @jwildfire's decision: sessions run locally, from his workspace on
his own machines, and write to GitHub as obotclaw[bot]. Cloud sessions are parked ("we
can probably just park cloud support for now and i'll just do local here or on the agent
laptop"). The passages that said otherwise are changed below. One is left as it was: the
block every repository's `CLAUDE.md` carries, which still names the cloud path, so that
no repository drifts from it.

Amended 2026-10-07 by @jwildfire's decision, given as a multiple-choice answer in a local
session ("Tag it, fix the line"): obot.roadmap releases by a tag on `main`. The Releases
section said it "does not cut releases" while v0.1 to v0.4 stood as GitHub releases.

## Repositories and branches

| Repository | Kind | Integration branch — merges on green checks | Release branch — @jwildfire's review |
|---|---|---|---|
| safety.viz | clinical, JS | `dev` | `main` |
| gsm.safety | clinical, R | `dev` | `main` |
| bio.viz | clinical, JS | `dev` | `main` |
| gsm.bio | clinical, R | `dev` | `main` |
| open.csr, open.gismo | clinical | `dev` | `main` |
| demo-301 | clinical | `main` | `site` |
| obot.roadmap | operational | `main` | — |
| obot.agent | operational | `main` | `stable` |

Kind decides review: on a clinical repository @jwildfire reviews everything before it
reaches a released surface; on an operational one work lands on `main` and he sees it
through periodic releases. Which repository is which is his decision.

## Setting up a repository for Claude Code

This follows [Claude Code's best practices](https://code.claude.com/docs/en/best-practices).

- `CLAUDE.md` at the repository root, short. It holds the build and test commands, the
  code style, and the block below. Ask of every line: would removing it cause a mistake?
  If not, cut it. Domain knowledge and procedures go in skills, not here.

  ```markdown
  # Standards
  The obot program's standards are mandatory here: the issue contract, ways of working and
  developer guidelines in jwildfire/obot.roadmap `docs/` (on disk at ~/obot.roadmap/docs/
  in a cloud environment). Work runs one requirement per session (`/requirement-session <hub requirement>`).
  ```

- Skills for procedures. The `requirement-session` skill is linked into the workspace's
  `.claude/skills/`; a repository adds its own skills under `.claude/skills/` for things
  specific to it — how its evidence pages are generated, how its site builds.
- Permissions: sessions run in auto mode with the workspace's allowlist; do not add a
  permission rule to work around a refusal.
- Hooks only for deterministic gates that must happen every time with zero exceptions — a
  formatter after edits, a check that blocks writes to a generated directory. No hook
  publishes state, nags, or interrupts a turn. @jwildfire's workspace has one such gate:
  it refuses a GitHub write that would go out under his name (Commits, below).
- Plan mode before code on any task that is not trivially scoped: explore, propose,
  then implement against the plan.
- Subagents for investigation and verification, so research does not fill the main
  context and a fresh model tries to refute a result before it is claimed. The Workflow
  tool for multi-stage fan-out when @jwildfire has opted in. Every subagent brief names
  the task issue and its definition of done and returns evidence, not a summary.
- Context: `/context` to see what loaded; `/compact` with a note on what to preserve
  when the window fills; course-correct at the first wrong turn, not the tenth.

## Local work: worktrees

Sessions share the checkouts in the workspace, so a session never switches
branches under another session; it uses a linked worktree inside the repository:

```bash
git fetch origin
git worktree add .claude/worktrees/<branch> -b <branch> origin/<integration>
grep -qxF '.claude/worktrees/' .git/info/exclude 2>/dev/null || echo '.claude/worktrees/' >> .git/info/exclude
```

Claude Code auto-approves worktrees under `.claude/worktrees/`; any other location costs
@jwildfire a permission click. Never call the EnterWorktree tool from the obot2 workspace
root — it is not a git repository and the tool fails after prompting. Remove the worktree
after its PR merges; never remove another session's.

## Before code: the issue

- Every change starts from a task issue with a definition of done and a milestone. No
  milestone, no work. No task, file one under its requirement first. The requirement's
  `status:` label says where it stands (backlog → ready → in session → review → released);
  the session moves it at start, at the RC, and at close, always removing the previous one.
- Branch per task, named `<task-number>-<slug>`, off the integration branch.
- Tests first where the change is testable: write or update the test, see it fail,
  implement the minimum, see it pass. Documentation, CI and template changes may skip
  the failing-test step with a sentence saying why.

## Commits

- Small, one concern each, message in the imperative with the why in the body when the
  diff does not say it.
- Every commit carries the `Co-Authored-By` trailer the harness supplies for the model
  that wrote it. No secrets, no tokens, no generated bundles unless the repository
  commits them by design.
- A session writes to GitHub as obotclaw[bot], the program's GitHub App, and never as
  @jwildfire (his decision, 2026-10-07): issues, comments, commits, pushes, pull
  requests and the merges of increments. `gh` on his machine is signed in as him and
  he is admin on every repository, so a write with no token set is recorded as his. A
  release-candidate pull request has a second reason: GitHub does not let him approve
  a pull request he authored, and the release ruleset requires his approval.
- The bot's token, and the guard that refuses a GitHub write made any other way, are
  tooling of his workspace. They are in no repository, this one included. The bot's
  key belongs in his machines' Keychains and nowhere else; this repository's secrets
  held a copy for the site build, which no longer reads it, and deleting that copy is
  his to do. The workspace's README describes the tooling.
- Three things are his alone, and a session does not do them with any token:
  approving a pull request, merging past a ruleset, and changing a ruleset or a
  branch protection.

## Pull requests

| | Increment PR | Release-candidate PR |
|---|---|---|
| Base | integration branch | release branch |
| Opened | non-draft, auto-merge enabled | as a draft; marked ready and @jwildfire requested only after the review gate under [Releases](#releases) |
| Reviewer | nobody — never assign or request him | @jwildfire, always |
| Merges | on green checks, by GitHub | on his approving review, by him |
| Body | exec summary; `Closes <repo>#<task>`; the definition-of-done evidence; details | the release shape under [Releases](#releases) |

The increment PR body:

```markdown
{One sentence: what this changes for a user of the repository.}

Closes #<task>

### Evidence
- {the definition of done's proof: the command and its output, the URL and what it shows, the test and its result}

### Notes
{anything a reviewer of the diff needs; empty is fine}

---
This PR was drafted by Claude Code using <model>.
```

- Keep the description accurate: when the implementation diverges from what the body
  says, edit the body. Re-read the live body before summarising or building on it.
- Bodies on GitHub have no hard wraps — one line per paragraph or bullet; a single
  newline renders as a break.
- The attribution line is the last line, after a `---` rule. Say "and reviewed by
  @jwildfire" only when he reviewed it.
- Closing keywords are inert on pull requests that do not target the default branch; a
  release-candidate PR still lists every issue its release ships with a `Closes` line
  each, because that list is the release's manifest, and the issues are closed by hand
  at tag time if GitHub did not.

## Merging via rulesets

Merging is GitHub's job. Each repository carries two branch rulesets, applied once by
@jwildfire (they need repository admin):

- Integration branch: pull request required; the repository's CI check required where
  one exists; auto-merge allowed; no force pushes or deletions. An increment PR opened
  with auto-merge enabled lands when its checks are green.
- Release branch: pull request required; one approving review required, from
  @jwildfire; stale approvals dismissed on push; no force pushes or deletions.

The command that creates a release-branch ruleset, run from a checkout of the repository
by @jwildfire:

```bash
gh api -X POST repos/jwildfire/<repo>/rulesets --input - <<'JSON'
{
  "name": "release: review required",
  "target": "branch",
  "enforcement": "active",
  "conditions": { "ref_name": { "include": ["refs/heads/main"], "exclude": [] } },
  "rules": [
    { "type": "pull_request",
      "parameters": { "required_approving_review_count": 1,
                      "dismiss_stale_reviews_on_push": true,
                      "require_code_owner_review": false,
                      "require_last_push_approval": false,
                      "required_review_thread_resolution": false } },
    { "type": "deletion" },
    { "type": "non_fast_forward" }
  ]
}
JSON
```

The integration-branch ruleset is the same with `required_approving_review_count: 0`, a
`required_status_checks` rule naming the CI check, and the ref set to the integration
branch. obot.agent has no CI since v0.5.0; its `main` ruleset requires the pull request
only. A repository with no ruleset is not on the lane; ask on the blocked issue before
merging anything there. Never work around a ruleset.

## Testing

- JavaScript renderers (safety.viz) — the six layers, at minimum: schema tests
  (settings and data mapping validation); pure-function tests (data preparation,
  binning, statistics, domain calculations); renderer integration tests (DOM and canvas
  creation, lifecycle, settings updates); browser behaviour tests (controls, filtering,
  hover and click, listing, warnings); visual regression tests where screenshots are
  stable; requirements-traceability tests (every harvested requirement maps to test
  evidence or a documented manual review). `npm test` and `npm run test:e2e` green
  before a PR opens; the evidence set regenerated with `npm run evidence` when behaviour
  changes.
- R packages (gsm.safety) — testthat with the qcthat test-name convention, vdiffr
  snapshots for every static figure, `devtools::check()` clean (no errors, warnings or
  notes) before a PR opens. The `safety-viz-parity` check must stay green against every
  safety.viz release.
- Requirements as the source of truth: upstream wiki pages, settings schemas, examples
  and regression tests are requirements sources; a rendering change is not started
  before the feature area's requirements matrix exists
  ([safety.viz `requirements/`](https://github.com/jwildfire/safety.viz/tree/HEAD/requirements)),
  and every migration PR states which requirements it covers and which tests are the
  evidence. Behaviour is not removed because it is awkward in Chart.js; the requirement
  is documented and a replacement or a justified de-scope proposed.
- Clinical judgement: inconsistent source data is normal in trials — pick the credible
  input, guard it, document it as data cleaning, and do not escalate it as an upstream
  defect without per-record proof and a reading of the upstream source. A threshold or
  rule an agent derived needs @jwildfire's sign-off before anything claims conformance
  ([#142](https://github.com/jwildfire/obot.roadmap/issues/142)).

## Definition of done for a chart

A chart is not done — and its requirement is not Released — until all five hold on the
deployed site:

1. Gallery demo on the safety.viz site, on the canonical demo data.
2. Evidence page: requirements → tests → screenshots, generated from the test run.
3. API reference entry.
4. gsm.safety R widget, delivered or filed as a milestoned hub requirement, with the
   parity check green.
5. Static twin in gsm.safety driven by the same derived data and the same settings names
   (objective 2, 2026-09-10), or filed as a milestoned requirement where the plan schedules it
   later.

## Releases

- `NEWS.md` at every repository root, always current on the integration branch.
  Unreleased work accumulates under a `vX.Y.Z (Upcoming)` heading as it lands; the
  section opens with a `**See it move:**` link to the release's demo page, then a short
  intro, then `## What's new` — one bullet per feature, functionality-first and
  user-facing, each linking its hub requirement and implementing PRs — then
  `## Also in this release` for process and housekeeping, then a tests-and-provenance
  line. The section publishes verbatim as the release body when the tag is cut, and the
  heading loses `(Upcoming)` in the same pass.
- Release notes are short, and the detail goes on the demo page (@jwildfire, 2026-10-06:
  "Release notes are way too wordy. … see the latests safety.viz releases notes for a
  decent template. The details go in the demo page."). A section is at most 600 words,
  a `## What's new` bullet at most 70, with at most six of them; the only other
  headings are `## Deprecated` and `## Removed`, when something is. How a feature
  works, its settings, its edge cases, the before and after for an existing page, and
  what the review found are the demo page's. The template is
  [safety.viz v1.9.1](https://github.com/jwildfire/safety.viz/blob/dev/NEWS.md); the
  procedure and the checker that fails notes over a limit are obot.agent's
  [`release-notes`](https://github.com/jwildfire/obot.agent/blob/main/skills/release-notes/SKILL.md)
  skill (`check-notes.mjs`, beside that skill). The review
  gate's hard-rules reviewer runs it.
- The demo page, the hard requirement: a self-contained HTML page under this hub's
  `reports/{slug}/`, walking each change with screenshots or short clips and
  try-it-yourself steps against the live surface; its URL above the fold in the PR body
  and in the notes. A PR without a deployed demo link is not a release candidate.
  Repositories with no visual surface still owe a walkthrough of the behaviour change.
- The release-candidate PR: title `{package} vX.Y.Z-RCn` and nothing else. `n` counts
  candidates put in front of him — `-RC1` first; incremented only when review is
  re-requested after a `CHANGES_REQUESTED` decision; the same PR retitled, never
  replaced; reset per version; dropped from the tag. Body, in order:

  ```markdown
  {One sentence: what this release lets someone do that they could not do before.}

  <!-- Release candidate. Merges only on @jwildfire's approving review; the release
       branch's ruleset enforces it. Agent-facing note. -->

  - **See it move:** [annotated demo]({deployed hub URL})
  - **Release notes:** [NEWS.md]({repo}/blob/{head branch}/NEWS.md)

  ### Requirements this release closes
  - Closes #12 — {what it delivered}

  **The ask:** {the decision, and what happens on approval}

  ### Evidence
  ### Technical briefing
  ### Next steps
  ```

- The milestone and the manifest: the release's milestone exists before the window
  opens and sits on every issue the release delivers, moved forward off the wave that
  scoped it; the RC body lists them all with `Closes` lines. An issue only partly
  delivered keeps the milestone, stays open, and gets a comment naming what remains.
- The gate, in order: CI green on the head commit; for a chart, the definition of done
  above; and an independent review with every finding resolved. The session runs the
  review itself, so an unattended session can satisfy it; the same gate applies to any PR
  opened as a draft, before it is marked ready.
  - Reviewers: three review subagents, spawned in parallel, one per dimension —
    correctness (bugs, regressions, edge cases, tests that do not test what they claim);
    the definition of done and its proof (every issue the PR closes meets its definition
    of done, and the evidence shows it); the program's hard rules (no statistical
    inference in JavaScript — R computes every test and the browser renders the result;
    public or synthetic data only; the release-notes shape above).
  - Each brief carries the diff, the PR body, the issues it closes with their definitions
    of done, and these guidelines — never the session's own verification conclusions, so
    the read is not anchored on the author's. Reviewers are read-only: they edit, commit,
    push and comment on nothing, and return each finding with its file and line and how to
    see it.
  - Verify before acting: the session checks every finding against the code — reproduces
    it, or shows why it does not hold. Then it fixes the finding on the PR and pushes, or
    answers it with the reason it does not apply; "outside this release" is a reason only
    with the follow-up issue linked.
  - The review and its resolution are posted on the PR as one comment:

    ```markdown
    ### Review of {short head sha}
    Three independent reviewers: correctness; definition of done and proof; hard rules.

    - {finding}, `{file}:{line}` — fixed in {sha}
    - {finding}, `{file}:{line}` — does not apply: {reason}

    Every finding is resolved.

    ---
    This comment was drafted by Claude Code using {model}.
    ```

  - A re-review is owed when the head changes after the review by anything other than the
    fixes for its own findings — a merge from the integration branch, new work, a fix that
    grew past its finding — and for every new `-RCn`. It reviews the diff since the
    reviewed commit and posts its own comment.
  - Only then does the session mark the RC ready, request @jwildfire's review and move
    the requirement to `status: review`. A release candidate is never presented to him
    with an unresolved finding.
- After the tag: the hub requirements it delivered close with their proof comments and
  their label moves to `status: released`, and the requirement's nightly comment reports
  them under Complete. Publishing stays human.
- obot.agent releases by `main → stable` PR; demo-301 by `main → site`. obot.roadmap has
  no release branch: it releases by a tag on `main`, after the same review gate, when
  @jwildfire says to tag it, and the GitHub release publishes from its `NEWS.md` section.

## Artifacts and pages on the hub

- One folder per report under `reports/{slug}/`, a self-contained `index.html` (no
  external assets) and a `README.md` recording sources and assumptions. Decision
  artifacts under `reports/decisions/{date}-{slug}/` additionally carry
  `<meta name="premise">` lines the deploy can re-check.
- A one-line `<meta name="description">` directly after `<title>`, 40–260 characters,
  saying what the page contains and why he would open it; the deploy fails without one.
- Plain English: name things rather than numbering them — an issue is described first and
  its linkable number follows in parentheses, on a page, in a comment or in a reply to him
  alike, because nobody has the numbers memorised; links are trailing citations;
  the executive summary carries itself; emphasis is a heading, a list lead or a callout
  block — never a bolded clause mid-paragraph; bulleted lists over prose.
- Every page holds at a 390-pixel viewport with no horizontal scroll — he reads on a
  phone. Verify with a real render at that width.
- Publish first, then share the deployed URL; he reviews on the site, not a local
  preview. Every PR, issue, release and artifact named in a status message carries its
  clickable URL.

## Repository write policy

- All writes stay inside the `jwildfire` account. Never file, comment or open a PR in an
  organization he does not own, even when asked; hand him the draft.
- Never delete anything — files, issues, releases, branches with unmerged work, history
  — without his explicit approval, and cite the approval (date and channel) when acting
  on it — his sign-off comment on the objective, his review on the RC, his answer on the
  blocked issue — never a requirement that reads like approval.
- A worktree whose PR has merged may be removed without asking; one holding unmerged
  work may not.

## GxP stance

Nothing here makes a renderer validated. The program keeps a GxP-oriented engineering
discipline — traceable requirements, controlled changes, documented evidence,
deterministic tests, explicit review checkpoints — and says so in those words:
"GxP-oriented", "qualification-ready evidence", "traceability support". Never
"validated" unless a formal validation process exists.

---
This document was drafted by Claude Code using Fable 5.1 and reviewed by @jwildfire.
