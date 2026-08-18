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
   - **Provenance** — two lines at the foot of the body, after a `---` rule, beside the attribution line

   Say who wrote it and who approved it, and do not conflate them (#215):

   ```
   Authored by: 🧭🤖 obot-navigator (Claude Code using Opus 5)
   Approved by: EMPTY
   ```

   `Approved by: EMPTY` is the normal, correct value for a requirement you drafted. Write a citation
   only when a recorded decision or a native GitHub review actually covers it — a decision id
   (`D0018.1`, preferred because it names what was asked) or `owner/repo#123 review`. Never prose:
   `node scripts/provenance.mjs check <n>` fails a claim that cannot be shown, and `EMPTY` always
   passes, so nothing is gained by guessing.

   The trap this exists for is specific and it is one you are in right now. You are usually drafting
   from something @jwildfire said, and the requirement will contain more than he said — the scope you
   worked out yourself. That extra scope is invisible once it is filed, and the next agent will read
   the whole issue as his. When you cite an approval, the third line is required and it is where you
   name the gap:

   ```
   Approved by: D0018.1 — @jwildfire, 2026-08-16, in chat
   Beyond the approval: the spike-harness teardown in Overview — my own judgement, he has not seen it
   ```

   Do not file a decision artifact merely to have something to cite. If he has not decided, the
   requirement is unapproved and says so.

   **Renderer requirements carry the R widget from the start** (@jwildfire,
   2026-08-15: "Every renderer gets an R widget"; see #164). A safety.viz
   renderer requirement must name its `gsm.safety` widget as scoped work — as a
   sub-issue, or as a separate filed requirement when the widget lands in a
   different gsm.safety release (requirements tie to one release). "Widget
   adoption follows in that package's own cadence" is not a valid scope line;
   gsm.safety's `safety-viz-parity` CI fails on unwrapped renderers whose
   deferral cites no filed requirement.

4. **Scope it to one release before presenting it.** A requirement covers **exactly one release**; if the scope is bigger than one release, draft more than one requirement. The tell is a body that describes phases, or a Tasks section where some items are explicitly "later" — that is two requirements wearing one issue number, and splitting is cheaper now than after the first release ships. See [README — One requirement, one release](../../../README.md#one-requirement-one-release).

   When scope is deferred off an **existing** requirement, follow the procedure in that order: note the deferral on the original (what and why), file the new requirement with its own milestone, **transfer** the deferred sub-issues rather than re-filing them, and the original closes with its release. A defect found after release is not deferred scope — it is an ordinary issue against shipped work, and needs no new requirement.

5. **Present for review** with the `issue-review` skill and iterate. Presenting it is not approval,
   and posting it after an unattended session is not approval either. The attribution line names the
   author only — do not append "and reviewed by @jwildfire" unless he reviewed it, and if he did,
   record it in `Approved by` where it resolves. 75 of this hub's requirements assert his review in
   prose and carry no record of it; that is the sentence this convention replaces.

6. **After approval, post** with the required properties: `type:requirement` + `status:planned` + `project:P###` labels, assignee `@me`, and a link to the parent `type:project` issue in the body (the roadmap generator checks for it). Complete the posting checklist (rename draft, share URL).

## Reference

- [Requirement issue template](../../ISSUE_TEMPLATE/requirement.yml)
- [README — Requirement lifecycle](../../../README.md#requirement-lifecycle)
- [`requirement-design`](../requirement-design/SKILL.md) — next lifecycle stage
