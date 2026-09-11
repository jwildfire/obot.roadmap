---
name: requirement-tasks
description: "Decompose a Requirement into task issues in the implementation repositories, link them as sub-issues, and take the requirement through the Ready gate. Use after the Design section is populated, when breaking work into cross-repo tasks, when linking a sub-issue, or when re-scoping a requirement. Sub-issues — not an inline task list — are the canonical task tracker for a Requirement."
argument-hint: "Requirement issue number (or URL)"
---

# Requirement Tasks

The third of the three prep-phase steps under the hub's
[issue contract](../../../docs/issue-contract.md): drafting, design, tasks. Adapted from
[gsm.roadmap's requirement-tasks skill](https://github.com/Gilead-BioStats/gsm.roadmap/blob/main/.github/skills/requirement-tasks/SKILL.md);
where the two differ, the contract wins. Canonical tracking is the GitHub sub-issue
relationship; the requirement body's **Tasks** section mirrors it for readers, and the
site's roadmap generator (`scripts/build_roadmap.mjs`) counts the sub-issues.

## When to Use

- A Requirement issue has the **Design** section populated and is ready to be decomposed
- Drafting task issues that implement a requirement across repositories
- Linking an issue as a sub-issue, in this repository or across repositories
- Re-scoping or adding tasks to a Requirement already in session

## Procedure

1. **Read the requirement issue** and confirm the **Design** section is populated. If not, redirect to [`requirement-design`](../requirement-design/SKILL.md) first — tasks are not drafted ahead of Design.

2. **Identify the affected repositories** from the Design section. Each task is scoped to a single repository.

   **Check the decomposition fits one session and one release.** A requirement is the set of tasks one `/goal` run can close and prove, a day or two of work, and covers exactly one release. If the tasks you are about to draft cannot plausibly ship together, split now, before any of them exist: draft only the ones for this release; the rest become a second requirement, filed now with its own milestone, not a "phase 2" note in the body ([issue contract → Requirement issues](../../../docs/issue-contract.md#requirement-issues)).

3. **Draft each task** in the task shape of the [issue contract](../../../docs/issue-contract.md#task-issues), in a scratch file you will pass to `gh issue create --body-file`:

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

   - **Title** — `{verb} {what}` ("Add the portfolio manifest schema", "Wrap ggsurvfit for the Kaplan–Meier figures")
   - **Target repository** — exactly one
   - **Labels** — whatever the repository uses; no program-wide task label
   - **Size** — one pull request; if it needs two, it is two tasks
   - **Definition of done** — written so it can fail: a command and what it prints, a URL and what it shows, a test name and its result. The proof is what the task's pull request body carries.

   Before decomposing, check whether the objective's tree is signed off (his comment on the
   objective). If it is not, the tasks are filed as proposals and the objective comment asking
   for sign-off names them.

   If a task is approval-gated (a deletion, a merge to a release branch, anything an
   invariant names), write the citation into the task itself — the specific approval, with its
   date and channel, not the parent's issue number.

4. **Present the drafts for review** in the conversation, or as a comment on the requirement when the session is unattended, before posting.

5. **Post the tasks** to their target repositories, each with its release milestone (create the milestone if it is absent — a task with no milestone is not pickable and its requirement cannot be Ready):

   ```bash
   gh api repos/jwildfire/<repo>/milestones --jq '.[].title'          # does the release milestone exist?
   gh api -X POST repos/jwildfire/<repo>/milestones -f title=v1.8.0 -f description='<hub requirement #N: what it delivers>'
   gh issue create -R jwildfire/<repo> --title "<title>" --body-file <draft> --label <labels> --milestone v1.8.0
   ```

   The actor is the connected GitHub account; the drafted-by line at the foot of the body records authorship.

6. **Link each posted task to the requirement as a sub-issue** — see [Linking sub-issues](#linking-sub-issues) below — and verify each child appears under the parent.

7. **Mirror the tasks into the requirement's Tasks section**, one line per task, `repo#N — title`, via `gh issue edit <n> --body-file <draft>` on the live body. Verify the six `###` headings survived.

8. **Summarize** the result: the requirement number, the tasks (`repo#N — title`) with links, and the Ready-gate status below. The site refreshes on the next push to `main` and on the daily deploy; there is no manual trigger beyond `workflow_dispatch` on the Deploy site workflow.

## Linking sub-issues

The sub-issue link is the record the standup, the site and the requirement-session skill
read; a `Parent:` line in the body is a courtesy. Links are made through the sub-issues
API with the child's numeric **id** (not its number), which works across repositories:

```bash
# the child's id
gh api repos/jwildfire/gsm.safety/issues/77 --jq .id
# link it under the hub requirement
gh api -X POST repos/jwildfire/obot.roadmap/issues/9/sub_issues -F sub_issue_id=<id>
# verify
gh api repos/jwildfire/obot.roadmap/issues/9/sub_issues --paginate --jq '.[] | "\(.repository_url | sub(".*/repos/";"")) #\(.number) \(.title)"'
```

Moving a child to a different parent: `-F sub_issue_id=<id> -F replace_parent=true` on the
new parent. Removing one: `gh api -X DELETE repos/jwildfire/obot.roadmap/issues/<parent>/sub_issues -F sub_issue_id=<id>`.
A requirement is linked under its objective the same way; an objective's links are
@jwildfire's, so propose those in a comment unless he has asked for the link.

Never create a second issue because a link failed: fix the link. A duplicate created that
way is closed as a duplicate, never deleted.

## The Ready gate

Decomposition ends with the requirement Ready, or with a comment saying what stops it. Check,
in order, and move the status label only when all four hold:

1. The requirement's Design and Definition of done sections are populated.
2. Every task is linked as a sub-issue and carries its own definition of done.
3. Every task carries a milestone in its repository (`gh issue view <n> -R <repo> --json milestone`),
   and the requirement carries the hub's delivery-target milestone. No milestone, no Ready.
4. The objective's tree is signed off by @jwildfire in a comment on the objective.

Then move the requirement to Ready — one status label at a time, the previous one removed:

```bash
gh issue edit <n> -R jwildfire/obot.roadmap --add-label "status: ready" --remove-label "status: backlog"
```

The execution session (`/requirement-session <n>` in the repository's cloud environment)
re-checks the same four before it sets its goal.

## Deferring a task after the fact

When a task will not make the requirement's release, it moves — the requirement does not wait for it:

1. **Note the deferral on the requirement**: what is deferred and why, in a comment.
2. **File a new requirement** for the deferred scope, with its own milestone.
3. **Transfer the tasks** with `replace_parent=true` (above). Never close-and-refile: transferring keeps the scoping, the comment history and any partial work attached.
4. **Correct any milestone that now names a release the work did not ship in** — a task milestoned for a shipped release it missed is a false record.
5. **Close the original requirement** with the release it delivered and move its label to `status: released`.

Two cases need no new requirement: a **defect found after release** (an ordinary issue against shipped work — re-home it to the objective), and scope that **already has a requirement of its own** and was merely nested (re-home it to the objective).

## Reference

- [Requirement issue template](../../ISSUE_TEMPLATE/requirement.yml) · [Task issue template](../../ISSUE_TEMPLATE/task.yml)
- [Issue contract → Task issues](../../../docs/issue-contract.md#task-issues) · [→ Status and the Ready gate](../../../docs/issue-contract.md#status)
- [`requirement-design`](../requirement-design/SKILL.md) — previous step
- [`requirement-session`](https://github.com/jwildfire/obot.agent/blob/main/skills/requirement-session/SKILL.md) (obot.agent) — what runs once the requirement is Ready
