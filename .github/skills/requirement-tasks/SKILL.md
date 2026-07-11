---
name: requirement-tasks
description: "Decompose a Requirement into repo-specific sub-issues. Use after the Design section is populated, when breaking work into cross-repo tasks, or drafting sub-issues for implementation repos. Sub-issues — not an inline task list — are the canonical task tracker for a Requirement."
argument-hint: "Requirement issue number (or URL)"
---

# Requirement Tasks

Adapted from [gsm.roadmap's requirement-tasks skill](https://github.com/Gilead-BioStats/gsm.roadmap/blob/main/.github/skills/requirement-tasks/SKILL.md) for this hub. Canonical tracking is the GitHub sub-issue relationship; the requirement body's **Sub-issues** section mirrors the URLs so the roadmap rollup (`scripts/build_roadmap.mjs`) can count them.

## When to Use

- A Requirement issue has the **Design** section populated and is ready to be decomposed
- Drafting sub-issues that implement a requirement across repos
- Re-scoping or adding sub-issues to a Requirement already in development

## Procedure

1. **Read the requirement issue** and confirm the **Design** section is populated. If not, redirect to [`requirement-design`](../requirement-design/SKILL.md) first — sub-issues should not be drafted ahead of Design.

2. **Identify the affected repos** from the Design section. Each sub-issue is scoped to a single repo.

3. **Draft each sub-issue.** Follow the gsm.agent draft-file convention: save under `drafts/{repo}/ISSUE_N_{slug}.md` in the gsm.agent clone, with the `STATUS:` and `GITHUB_PROPERTIES:` headers. Each draft includes:
   - **Title** — `{verb} {what}` in the target repo (e.g. `Extract histogram module into safety.viz`)
   - **Description** — what changes, acceptance criteria, and a link back to the parent (`Parent: jwildfire/obot.roadmap#{N}`)
   - **Target repo** — exactly one
   - **Labels** — repo-appropriate (defer to the target repo's conventions)
   - **Attribution line** — per the gsm.agent conventions

4. **Present the drafts for review** with the `issue-review` skill before posting.

5. **Post the sub-issues** to their target repos:
   ```
   gh issue create -R jwildfire/<repo> --title "<title>" --body-file <draft_path> --label <labels> --assignee @me
   ```

6. **Link each posted sub-issue to the parent** using the `sub-issue-linking` skill (gsm.agent). Verify each child appears under the parent in the GitHub Relationships UI.

7. **Mirror the URLs into the parent's Sub-issues section** — append one line per sub-issue URL via `gh issue edit --body-file` (draft-sync convention). This is what the roadmap generator reads; skipping it means the rollup shows no tasks.

8. **Summarize** the result: parent #, list of posted sub-issues (`repo#N — title`), and links to each. The rollup refreshes on the next push to `main` (the Deploy site workflow runs `scripts/build_roadmap.mjs`); no manual trigger exists.

Implementation of each sub-issue is then a `/tdd` run in the target repo — there is no separate implementation skill.

## Reference

- [Requirement issue template](../../ISSUE_TEMPLATE/requirement.yml) — Sub-issues section
- [README — Requirement lifecycle](../../../README.md#requirement-lifecycle)
- [`requirement-design`](../requirement-design/SKILL.md)
