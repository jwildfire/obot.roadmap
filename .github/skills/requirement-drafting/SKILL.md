---
name: requirement-drafting
description: "Draft a new Requirement issue for this hub under an objective. Use when creating a requirement, writing an issue from a description, or promoting an idea to a requirement. Guides scoping, research, and issue creation under the issue contract."
argument-hint: "Describe the requirement or paste the idea/backlog text"
---

# Requirement Drafting

Adapted from [gsm.roadmap's requirement-drafting skill](https://github.com/Gilead-BioStats/gsm.roadmap/blob/main/.github/skills/requirement-drafting/SKILL.md) for this hub's [issue contract](../../../docs/issue-contract.md). This is prep-phase work, done with @jwildfire.

## When to Use

- Creating a new Requirement issue from a description or idea
- Promoting a backlog idea to a full requirement
- Refining an existing draft requirement

## Procedure

1. **Gather context.** Ask about:
   - Which objective it belongs to — no objective, no requirement. Objectives are the open issues labelled `objective` on this hub.
   - What is being implemented and why (the Business Requirement)
   - Which repositories the tasks will live in
   - Dependencies on other requirements, data sources, or upstream repos
   - The current state — related code, prototype, or pilot

2. **Research before drafting.** Look at:
   - Existing open `requirement` issues under the same objective for overlap
   - Open issues and PRs in the affected repositories for in-flight work
   - The [requirement template](../../ISSUE_TEMPLATE/requirement.yml) for the sections
   - For chart work: the requirement matrices in [safety.viz `requirements/`](https://github.com/jwildfire/safety.viz/tree/HEAD/requirements) — the spec source

3. **Draft the issue** following the template, in a scratch file you will pass to `gh issue create --body-file`; the record is the filed issue, not the draft. Sections, in order:
   - **Objective** — `#N` (required)
   - **Business Requirement** — the *why*, in plain language (required)
   - **Overview** — the approach in a paragraph, and the repositories the tasks will live in (required)
   - **Data Requirement** — only when data is involved
   - **Design** — blank or high-level notes now; populated by `requirement-design` before tasks are filed
   - **Definition of done** — end state, proof, ships in. Write it so it can fail; it becomes the session's `/goal` condition ([issue contract → Definitions of done](../../../docs/issue-contract.md#definitions-of-done))
   - **Tasks** — blank; populated by `requirement-tasks`
   - Footer: a `---` rule and the drafted-by line, nothing else. It names the author only.

   **Renderer requirements carry the R widget from the start** (@jwildfire,
   2026-08-15: "Every renderer gets an R widget"). A safety.viz renderer requirement
   names its `gsm.safety` widget as scoped work — as a task, or as a separate
   requirement when the widget lands in a different gsm.safety release.

4. **Scope it to one session and one release.** A requirement is the set of tasks one `/goal` run can close and prove — a day or two of work — and covers exactly one release; if it is bigger, draft more than one. Deferring scope off an existing requirement follows the procedure in the contract: note the deferral on the original, file the new requirement with its own milestone, transfer the deferred tasks, close the original with its release.

5. **Present the draft** in the conversation, or as a comment on the objective when the session is unattended, and iterate. Presenting it is not approval; approval is his sign-off comment on the objective once the tree is complete.

6. **Post it**, then link it:
   ```bash
   gh issue create -R jwildfire/obot.roadmap --title "Requirement: <title>" --body-file <draft> \
     --label requirement --label "status: backlog" --milestone <delivery target>
   ```
   Link it as a sub-issue of its objective (the `sub-issue-linking` skill) and propose its place in the objective's ordered Requirements list in a comment — the objective body is his to edit.

## Reference

- [Requirement issue template](../../ISSUE_TEMPLATE/requirement.yml)
- [Issue contract](../../../docs/issue-contract.md) · [Ways of working](../../../docs/ways-of-working.md)
- [`requirement-design`](../requirement-design/SKILL.md) — next step
