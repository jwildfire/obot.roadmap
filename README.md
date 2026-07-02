# obot.roadmap

Development roadmap and project homepage for Jeremy Wildfire's open-source safety-graphics modernization work (the "obot" portfolio). This repo tracks high-level requirements, which link to implementation tasks in other repos.

The workflow mirrors [Gilead-BioStats/gsm.roadmap](https://github.com/Gilead-BioStats/gsm.roadmap); see [History](#history) for how this repo replaced the retired `obot-claw` hub.

# Repos

| Repo | Role |
|------|------|
| [`obot.roadmap`](https://github.com/jwildfire/obot.roadmap) | This repo — requirements, planning, roadmap tracking |
| [`safety.agent`](https://github.com/jwildfire/safety.agent) | Agent scaffold — requirement matrices, skills, and workflow conventions for the renderer migration |
| [`safety.viz`](https://github.com/jwildfire/safety.viz) | Consolidated Chart.js safety-chart library (mirrors `gsm.viz`) |
| [`gsm.safety`](https://github.com/jwildfire/gsm.safety) | R package — `Widget_*.R` htmlwidgets consuming `safety.viz` (mirrors `gsm.kri`) |
| [`safety-histogram`](https://github.com/jwildfire/safety-histogram) | Fork holding the nextgen histogram pilot (`dev` branch) |
| `obot-claw/*` (archived) | Legacy RhoInc renderer forks and the retired hub — read-only reference |

# Requirements

Requirements are captured as GitHub issues using the [requirement issue template](.github/ISSUE_TEMPLATE/requirement.yml) and tracked on the [obot Roadmap project](https://github.com/users/jwildfire/projects/1), whose Status field mirrors the lifecycle stages below. Each issue body has five sections, populated incrementally as the requirement moves through the lifecycle:

| Section | When filled | Required at creation |
|---|---|---|
| **Business Requirement** | Step 1 — Backlog | ✓ |
| **Overview** | Step 1 — Backlog | ✓ |
| **Data Requirement** | Step 2 — Requirement Gathering | — |
| **Design** | Step 3 — Design | — |
| **Tasks** | Step 3 — Design | — |

## Lifecycle

| # | Stage | Trigger | Milestone | Sign-off |
|---|---|---|---|---|
| 1 | **Backlog** | Issue created with Business Requirement + short Overview | `backlog` | — |
| 2 | **Requirement Gathering** | Prioritized for a quarter | `YYYYqN` | Data availability confirmed |
| 3 | **Design** | Requirement Gathering complete | `YYYYqN` | @jwildfire 👍 on the issue |
| 4 | **Development** | Design + Tasks complete; sub-issues filed in implementation repos | `YYYYqN` | — |
| 5 | **Review** | Implementation merged; evidence posted | `YYYYqN` | @jwildfire review |
| 6 | **Release** | Included in a quarterly release | `YYYYqN` | — |

Since this is a single-maintainer portfolio, all sign-offs are @jwildfire. Agent-drafted issues and PRs carry an attribution line noting the model used.

## Labels

One or more topic labels per requirement.

| Label | Use |
|---|---|
| `safety` | SafetyGraphics renderer modernization (safety.viz, gsm.safety, renderer migrations) |
| `infrastructure` | Platform / scaffold / operations investment (e.g., the obot GitHub App) |
| `ai` | Agent workflow and automation work |
| `blocked` | Blocked on an external dependency or decision |

## Milestones

| Milestone | Use |
|---|---|
| `backlog` | Step 1 holding pen; not yet prioritized for a quarter |
| `2026q3`, `2026q4`, … | Quarterly delivery slots (Step 2+), lowercase `YYYYqN` |

## Documentation

Formal requirement documentation lives under [`requirements/`](requirements/):

| Directory | Contents |
|---|---|
| [`requirements/design/`](requirements/design/) | Design documents — one per requirement (`{issue_number}_design.md`) |
| [`requirements/dataspec/`](requirements/dataspec/) | Data specification documents (`{issue_number}_dataspec.md`) |

File names use the requirement issue number as prefix. These documents are linked from the issue's Design section.

# Agentic scaffold

The workflow is designed to be maintained with AI-in-the-loop, following the conventions in [`gsm.agent`](https://github.com/Gilead-BioStats/gsm.agent) and [`safety.agent`](https://github.com/jwildfire/safety.agent). Agents drafting requirements here should read [AGENTS.md](AGENTS.md) first.

# History

This repo replaced the [`obot-claw` hub](https://github.com/obot-claw/obot-claw.github.io) (archived July 2026), which ran an autonomous-agent portfolio ("Open Source OrangeBot") from May–June 2026. Its daily diary, reports, and closed project issues (P004/P007/P008/P009) remain readable in the archived repo. Open requirements were migrated here with links back to their originals.
