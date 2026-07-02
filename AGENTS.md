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
- [requirements/design/](requirements/design/) — Design documents, one per requirement (`{issue_number}_design.md`)
- [requirements/dataspec/](requirements/dataspec/) — Data specification documents (`{issue_number}_dataspec.md`)
- [.github/ISSUE_TEMPLATE/requirement.yml](.github/ISSUE_TEMPLATE/requirement.yml) — Requirement issue template (5 sections)

## Constraints

- Always check the current state of referenced files before making changes — conventions may have evolved; do not assume historical practice still applies.
- Never create Requirement issues without populating **Business Requirement** and **Overview**.
- Never create Tasks before **Design** is populated. Data Requirement should be filled before Design unless data availability is obviously not at issue.
- Items without clear scope stay in the `backlog` milestone.
- Use lowercase quarterly milestone names (`2026q3`, not `2026-Q3`).
- Renderer migration requirements must trace to the reviewed requirement matrices in `safety.agent` (`docs/requirements/`); tests in implementation repos are keyed to those requirement IDs.

## Related agents

- **`safety.agent`** ([jwildfire/safety.agent](https://github.com/jwildfire/safety.agent)) — the development scaffold for renderer migration work. When a Requirement here reaches Development, sub-issues in `safety.viz`, `gsm.safety`, or the renderer forks are picked up under safety.agent's conventions.
- **`gsm.agent`** ([Gilead-BioStats/gsm.agent](https://github.com/Gilead-BioStats/gsm.agent)) — the upstream scaffold this ecosystem aligns with; shared skills and conventions originate there.
