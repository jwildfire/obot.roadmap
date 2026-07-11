---
name: requirement-drafting
description: "Draft a new Requirement issue for this hub. Use when creating a requirement, writing an issue from a description, or promoting an idea to a requirement. Guides scoping, research, and issue creation."
argument-hint: "Describe the requirement or paste the idea/backlog text"
---

# Requirement Drafting

Adapted from [gsm.roadmap's requirement-drafting skill](https://github.com/Gilead-BioStats/gsm.roadmap/blob/main/.github/skills/requirement-drafting/SKILL.md), updated for the current 4-section template and this hub's conventions.

## When to Use

- Creating a new Requirement issue from a description or idea
- Promoting a backlog idea to a full requirement
- Refining an existing draft requirement

## Procedure

1. **Gather context from the user.** Ask about:
   - What is being implemented and why? (the Business Requirement)
   - Which project does it belong to (`P###`)? Create the `project:P###` label if new.
   - Which repos are affected?
   - Are there dependencies on other requirements, data sources, or upstream repos?
   - What is the current state — does any related code, prototype, or pilot exist?

2. **Research before drafting.** Look at:
   - Existing open `type:requirement` issues in this repo for overlap
   - Open issues/PRs in the affected repos for in-flight work
   - The [requirement template](../../ISSUE_TEMPLATE/requirement.yml) for required fields
   - For renderer migrations: the requirement matrices in `safety-agent` (`docs/requirements/`) — those are the spec source

3. **Draft the issue** following the template structure and the gsm.agent draft-file convention (save under `drafts/obot.roadmap/ISSUE_N_{slug}.md` in the gsm.agent clone):
   - **Project** — the `P###` code
   - **Business Requirement** — the *why*, in plain language (required)
   - **Overview** — short technical summary + impact (required)
   - **Data Requirement** — leave blank unless data availability is already known to matter
   - **Design** — leave blank or add high-level notes if available
   - **Sub-issues** — leave blank (populated by `requirement-tasks` after Design)

4. **Present for review** with the `issue-review` skill and iterate.

5. **After approval, post** with the required properties: `type:requirement` + `status:planned` + `project:P###` labels, assignee `@me`, and a link to the parent `type:project` issue in the body (the roadmap generator checks for it). Complete the posting checklist (rename draft, share URL).

## Reference

- [Requirement issue template](../../ISSUE_TEMPLATE/requirement.yml)
- [README — Requirement lifecycle](../../../README.md#requirement-lifecycle)
- [`requirement-design`](../requirement-design/SKILL.md) — next lifecycle stage
