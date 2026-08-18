---
name: requirement-design
description: "Capture the Design section for a Requirement issue, either inline in the issue body or as a design document under requirements/design/. Use when a requirement is ready to design, when filling out the Design section, or when creating a per-requirement design artifact."
argument-hint: "Requirement issue number (or URL)"
---

# Requirement Design

Adapted from [gsm.roadmap's requirement-design skill](https://github.com/Gilead-BioStats/gsm.roadmap/blob/main/.github/skills/requirement-design/SKILL.md) for this hub.

## When to Use

- A Requirement issue has Business Requirement and Overview populated and is ready for design
- Drafting or revising the **Design** section of a Requirement issue
- Creating a long-form design artifact at `requirements/design/{issue_number}_design.html`

## Procedure

1. **Read the requirement issue** (`gh issue view` — live body, not a stale draft) and confirm:
   - **Business Requirement** and **Overview** are populated (required at creation).
   - **Data Requirement** is populated, or the requirement is clearly not data-dependent. If the gap matters, surface it before proceeding — Design depends on it.
   - The issue carries `type:requirement` and a `project:P###` label.

2. **Identify affected repos** — typically a subset of: `safety.viz`, `gsm.safety`, `safety-agent`, `safety-histogram` and the other renderer forks. Check existing open issues in those repos for overlap. Architecture references live outside the org (`Gilead-BioStats/rbm-viz`, `Gilead-BioStats/gsm.kri`).

3. **Decide where the design lives:**
   - **Simple requirement** → fill the Design section directly in the issue body (`Summary`, `Affected repos`, `Design artifacts`).
   - **Complex requirement** → create `requirements/design/{issue_number}_design.html` in this repo, add the long-form design there, and reference it from the issue's Design section.

   A design document is an agent artifact and appears in the site's news feed, so its
   page head carries its own one-line description — written now, with the file:

   ```html
   <title>Design #161 — Kaplan–Meier time-to-event family: the interactive renderer</title>
   <meta name="description" content="Kaplan–Meier survival curves for safety.viz: the statistics stated exactly, the data contract, the at-risk table, and how the module gets verified.">
   ```

   Say what the design settles and why someone would open it. Not "Design document for
   Requirement #161" — that restates the title and leans on a number nobody has
   memorised. `node scripts/check_artifact_descriptions.mjs` fails the deploy without it;
   full contract in [`requirements/design/README.md`](../../../requirements/design/README.md).

4. **Draft the design** covering:
   - Summary of the approach
   - Affected repos
   - Key technical components or changes
   - Dependencies on other requirements, data sources, or upstream repos
   - Open questions

5. **Present the draft for review** and iterate. Design changes to the issue body go through `obot.agent/scripts/obot-gh issue edit --body-file` (draft-sync convention) — the wrapper writes as `obotclaw[bot]`, where a plain `gh` writes as @jwildfire ([obot.agent#197](https://github.com/jwildfire/obot.agent/issues/197)). Verify Design is signed off before decomposing the work — and "signed off" means the requirement's
`Approved by` line resolves, not that the Design section looks finished. Check it with
`node scripts/provenance.mjs resolve <number>`: it prints what was asked and what he said, or it says
nobody has approved this. A design an agent wrote and an agent approved is not signed off (#215).

If the design goes beyond what he approved — which is normal, because a design is mostly the agent's
work — say so on the `Beyond the approval` line rather than letting the citation cover it silently — then hand off to [`requirement-tasks`](../requirement-tasks/SKILL.md).

## Reference

- [Requirement issue template](../../ISSUE_TEMPLATE/requirement.yml)
- [README — Requirement lifecycle](../../../README.md#requirement-lifecycle)
- [`requirements/design/`](../../../requirements/design/) — design documents, one per requirement
