---
name: requirement-design
description: "Capture the Design section for a Requirement issue, either inline in the issue body or as a design document under requirements/design/. Use when a requirement is ready to design, when filling out the Design section, or when creating a per-requirement design artifact."
argument-hint: "Requirement issue number (or URL)"
---

# Requirement Design

The second of the three prep-phase steps under the hub's
[issue contract](../../../docs/issue-contract.md): drafting, design, tasks. Adapted from
[gsm.roadmap's requirement-design skill](https://github.com/Gilead-BioStats/gsm.roadmap/blob/main/.github/skills/requirement-design/SKILL.md);
where the two differ, the contract wins. This is prep-phase work, done with @jwildfire.

## When to Use

- A Requirement issue has Business Requirement and Overview populated and is ready for design
- Drafting or revising the **Design** section of a Requirement issue
- Creating a long-form design artifact at `requirements/design/{issue_number}_design.html`

## Procedure

1. **Read the requirement issue** — the live body, never a stale draft:

   ```bash
   gh issue view <n> -R jwildfire/obot.roadmap --json title,body,labels,milestone,state
   gh api repos/jwildfire/obot.roadmap/issues/<n>/parent --jq '"objective #\(.number) \(.title)"'
   ```

   Confirm:
   - The six sections are present in template order: Objective, Business Requirement, Overview, Data Requirement, Design, Definition of done, Tasks (`gh issue view <n> --json body -q .body | grep '^### '`).
   - **Business Requirement** and **Overview** are populated (required at filing) and **Objective** names the objective the issue is a sub-issue of.
   - **Data Requirement** is populated, or the requirement is clearly not data-dependent. If the gap matters, surface it before proceeding — Design depends on it.
   - Labels are `requirement`, one area label (`safety`, `infrastructure` or `ai`) and one `status:` label; the milestone is the hub's delivery target. Fix what is wrong before designing.

2. **Identify affected repositories** — named in the Overview's **Repositories** line; typically `safety.viz` (charts, the portfolio, the loader), `gsm.safety` (widgets, static figures), `obot.roadmap` (hub work) or `obot.agent` (the session core). Check the open issues and pull requests in those repositories for in-flight overlap. Architecture references live outside the account (`Gilead-BioStats/rbm-viz`, `Gilead-BioStats/gsm.kri`); chart work traces to the requirement matrices in [safety.viz `requirements/`](https://github.com/jwildfire/safety.viz/tree/HEAD/requirements).

3. **Decide where the design lives:**
   - **Simple requirement** → fill the Design section directly in the issue body: summary, affected repositories, key components, dependencies, open questions.
   - **Complex requirement** → write `requirements/design/{issue_number}_design.html` in this repository, self-contained, and reference it from the issue's Design section.

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
   The page holds at a 390-pixel viewport; he reads it on the deployed site, so commit and
   push it to `main` before sharing its URL.

4. **Draft the design** covering:
   - Summary of the approach
   - Affected repositories
   - Key technical components or changes
   - Dependencies on other requirements, data sources or upstream repositories
   - Open questions, each with the default the session would take if unanswered
   - What the design does to the **Definition of done**: if designing changed the end state, the proof or the release, revise that section in the same edit.

5. **Present the draft and iterate.** In the conversation when he is there; as a comment on the objective when the session is unattended, naming any scope you worked out yourself that he has not seen. Edit the issue body with `gh issue edit <n> --body-file <draft>`; the connected account is the actor and the drafted-by line at the foot of the body records authorship. Verify the six `###` headings survived the edit.

   Presenting a design is not approval. "Signed off" means the requirement's objective's
   tree is signed off by @jwildfire in a comment on the objective — not that the Design
   section looks finished. Tasks are not filed on an unsigned tree except as proposals
   ([`requirement-tasks`](../requirement-tasks/SKILL.md)).

## Reference

- [Requirement issue template](../../ISSUE_TEMPLATE/requirement.yml)
- [Issue contract → Requirement issues](../../../docs/issue-contract.md#requirement-issues) · [Ways of working → The three phases](../../../docs/ways-of-working.md#the-three-phases)
- [`requirements/design/`](../../../requirements/design/) — design documents, one per requirement
- [`requirement-drafting`](../requirement-drafting/SKILL.md) — previous step · [`requirement-tasks`](../requirement-tasks/SKILL.md) — next step
