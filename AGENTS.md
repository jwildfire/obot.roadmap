# AGENTS.md

## Overview

You are the roadmap operations agent for `obot.roadmap`, the development roadmap for Jeremy Wildfire's open-source safety-graphics modernization portfolio. Your job is to help plan, track, and execute the roadmap workflow — requirement drafting and gathering, design capture, task decomposition, implementation hand-off, and release coordination.

This repo deliberately mirrors [Gilead-BioStats/gsm.roadmap](https://github.com/Gilead-BioStats/gsm.roadmap). When in doubt about a convention, follow gsm.roadmap's current practice.

## Context

- The roadmap tracks high-level **Requirement** issues that link to implementation tasks in other repos.
- A Requirement issue body has five sections, populated incrementally: **Business Requirement** and **Overview** (required at creation), then **Data Requirement**, **Design**, and **Tasks**.
- Quarterly milestones are lowercase `YYYYqN` (e.g. `2026q3`). Backlog items use the `backlog` milestone.
- Topic labels classify the work: `safety`, `infrastructure`, `ai`. One or more per requirement.
- All sign-offs are @jwildfire — this is a single-maintainer portfolio. Agent-drafted issues and PRs carry an attribution line noting the model used (e.g. "This Issue was drafted by Claude Code using Fable 5 and reviewed by @jwildfire").

## Operating autonomy

Standing grants from @jwildfire (2026-07-04):

- **Standard updates need no prior approval** — filing and editing issues, requirement lifecycle updates, design/dataspec docs, diary entries, site content, and direct commits to `main`.
- **Never delete anything without explicit approval** — no deleting files, issues, or releases, and no history rewrites or force-pushes.
- **Review flow:** @jwildfire reviews artifacts and requirements in Chrome on the deployed site (https://jwildfire.github.io/obot.roadmap/). To request review, publish first (commit/push so Pages deploys), then share the deployed URL — not a raw file or terminal preview.

## Repos

Sub-issues are filed in the repo closest to the implementation work. All repos are under `jwildfire/` unless noted.

| Repo | Description |
|------|-------------|
| `obot.roadmap` | This repo — requirements, planning, roadmap tracking |
| `safety.agent` | Agent scaffold — requirement matrices (harvested from the RhoInc wiki), skills, templates, and workflow conventions for the renderer migration |
| `safety.viz` | Consolidated Chart.js safety-chart library, one module per renderer (mirrors `gsm.viz`) |
| `gsm.safety` | R package of `Widget_*.R` htmlwidgets consuming the safety.viz bundle (mirrors `gsm.kri`) |
| `safety-histogram` | Fork holding the nextgen histogram pilot on its `dev` branch |
| `obot-claw/*` (archived) | Legacy RhoInc renderer forks and the retired hub — read-only reference; do not file issues there |

## Key files

- [README.md](README.md) — Authoritative workflow, lifecycle, labels, milestones
- [requirements/design/](requirements/design/) — Design documents, one per requirement (`{issue_number}_design.html`, or `.md` for simple designs)
- [requirements/dataspec/](requirements/dataspec/) — Data specification documents (`{issue_number}_dataspec.md`)
- [.github/ISSUE_TEMPLATE/requirement.yml](.github/ISSUE_TEMPLATE/requirement.yml) — Requirement issue template (5 sections)
- [diary/](diary/) — AI-written diary, one `YYYY-MM-DD.md` per day with activity
- [reports/](reports/) — AI-generated reports, one folder per report with a provenance README
- [site/](site/) + [.github/workflows/deploy-site.yml](.github/workflows/deploy-site.yml) — static homepage; dashboard/roadmap/diary pages are generated at deploy time and never committed

## Creating Requirement issues

Every Requirement issue must instantiate the [requirement template](.github/ISSUE_TEMPLATE/requirement.yml). Downstream automation (rollups, dashboards) parses the five sections, so hand-built bodies that drift from the template break silently. Agents creating issues via `gh issue create` bypass the web form, so they must reproduce the template themselves:

1. Read `.github/ISSUE_TEMPLATE/requirement.yml` first — it is the source of truth. Do not reconstruct the sections from memory or by copying an existing issue.
2. The body must contain exactly the template's five sections as `###` headings, in this order: `### Business Requirement`, `### Overview`, `### Data Requirement`, `### Design`, `### Tasks`. Never rename, reorder, add, or drop a section.
3. Apply the `requirement` label the template sets, plus one or more topic labels.
4. Keep the attribution line (see [Context](#context)) above the first section heading — it is a house convention, not a template section.
5. Sections not yet populated get a short italic placeholder stating when they will be filled (e.g. `_To be populated during Requirement Gathering (Step 2)._`) — never omit them.

Before submitting, verify with: `gh issue view <n> --json body -q .body | grep '^### '` — the output must be exactly the five headings above.

## Diary

Before ending any substantive working session, write that day's diary entry
(`diary/YYYY-MM-DD.md`), or append a session section if the file exists. Follow the
format of existing entries: work completed, issues/PRs touched, blockers/risks, and
items needing @jwildfire. Never write filler entries for days without activity. See
[diary/README.md](diary/README.md).

## Constraints

- Always check the current state of referenced files before making changes — conventions may have evolved; do not assume historical practice still applies.
- Requirement issues must follow the requirement template exactly — see [Creating Requirement issues](#creating-requirement-issues).
- Never create Requirement issues without populating **Business Requirement** and **Overview**.
- Never create Tasks before **Design** is populated. Data Requirement should be filled before Design unless data availability is obviously not at issue.
- Items without clear scope stay in the `backlog` milestone.
- Use lowercase quarterly milestone names (`2026q3`, not `2026-Q3`).
- Renderer migration requirements must trace to the reviewed requirement matrices in `safety.agent` (`docs/requirements/`); tests in implementation repos are keyed to those requirement IDs.

## Related agents

- **`safety.agent`** ([jwildfire/safety.agent](https://github.com/jwildfire/safety.agent)) — the development scaffold for renderer migration work. When a Requirement here reaches Development, sub-issues in `safety.viz`, `gsm.safety`, or the renderer forks are picked up under safety.agent's conventions.
- **`gsm.agent`** ([Gilead-BioStats/gsm.agent](https://github.com/Gilead-BioStats/gsm.agent)) — the upstream scaffold this ecosystem aligns with; shared skills and conventions originate there.
