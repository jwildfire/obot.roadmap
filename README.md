# obot.roadmap

Development roadmap, standards and project homepage for Jeremy Wildfire's open-source
safety-graphics modernization work (the "obot" portfolio). This repo holds the goals,
requirements and designs, the standards every agent and session works under, and the
site that reports on all of it.

# How work runs

Since 2026-09-10 the program runs as goal-based sessions: one clearly defined goal per
session, running in the cloud for as long as the goal takes, steered by @jwildfire
through the issues here. The three documents under [`docs/`](docs/) are the standards,
and complying with them is mandatory for every session in every repository:

| Document | What it settles |
|---|---|
| [Issue contract](docs/issue-contract.md) | Goals, requirements and tasks; definitions of done; labels and milestones; blocked; how closing and comments work; who decided what |
| [Ways of working](docs/ways-of-working.md) | The loop, roles, sessions and `/goal`, what @jwildfire reviews, steering, the standup, decisions, releases |
| [Developer guidelines](docs/developer-guidelines.md) | Repositories and branches, Claude Code setup, worktrees, commits, pull requests, merging via rulesets, testing, the definition of done for a chart, releases, artifacts, write policy, the GxP stance |

The plan that installed this model and the five goals it runs:
[Goal Sessions: the Mid-October Plan](https://jwildfire.github.io/obot.roadmap/reports/goal-sessions-plan-2026-09-10/).
The session core — the `goal-session` skill, the standup routine and the cloud
environments — lives in [jwildfire/obot.agent](https://github.com/jwildfire/obot.agent).

# Repos

| Repo | Role |
|------|------|
| [`obot.roadmap`](https://github.com/jwildfire/obot.roadmap) | This repo — goals, requirements, designs, standards, the site |
| [`obot.agent`](https://github.com/jwildfire/obot.agent) | The session core: the goal-session skill, the standup routine, the cloud environments |
| [`safety.viz`](https://github.com/jwildfire/safety.viz) | Consolidated Chart.js safety-chart library and its site (mirrors `gsm.viz`) |
| [`gsm.safety`](https://github.com/jwildfire/gsm.safety) | R package — `Widget_*` htmlwidgets over `safety.viz` and the static FDA safety charts (mirrors `gsm.kri`) |
| [`open.csr`](https://github.com/jwildfire/open.csr), [`open.gismo`](https://github.com/jwildfire/open.gismo), [`demo-301`](https://github.com/jwildfire/demo-301) | The CSR builder, the RBQM platform and its demo study — goals paused or parked for the talk |
| `safety-histogram` (archived 2026-08-15), `obot-claw/*` (archived) | Retired pilot fork and the legacy hub — read-only reference |

# Daily check-in by voice

The spoken standup — every goal's complete / in progress / blocked state, one question
per blocked issue, and the release candidates waiting — is rendered nightly from GitHub
by a scheduled cloud routine and published as plain text. [STANDUP.md](STANDUP.md) is the
address; the file itself is `standup.md` on the `session-state` branch. A note dictated
back is a comment on the issue it concerns.

# Requirements and designs

Issues are filed from the templates — [goal](.github/ISSUE_TEMPLATE/goal.yml),
[requirement](.github/ISSUE_TEMPLATE/requirement.yml),
[task](.github/ISSUE_TEMPLATE/task.yml) — under the
[issue contract](docs/issue-contract.md), and tracked on the
[obot Roadmap project](https://github.com/users/jwildfire/projects/1). The hub's
`requirement-drafting`, `requirement-design` and `requirement-tasks` skills under
[`.github/skills/`](.github/skills/) walk a requirement from idea to filed tasks.

Formal documentation lives under [`requirements/`](requirements/):

| Directory | Contents |
|---|---|
| [`requirements/design/`](requirements/design/) | Design documents — one per requirement, `{issue_number}_design.html`, self-contained and published to the site |
| [`requirements/dataspec/`](requirements/dataspec/) | Data specification documents, `{issue_number}_dataspec.md` |

# Site

The repo publishes the project homepage via GitHub Pages
([`deploy-site.yml`](.github/workflows/deploy-site.yml)): the roadmap and goal pages
generated from live GitHub state at deploy time, the AI-written [diary](diary/), the
[reports](reports/) and decision artifacts, the news feed, and the package status
dashboard. See the [#7 design doc](requirements/design/7_design.html) for the
architecture.

| Directory | Contents |
|---|---|
| [`site/`](site/) | Hand-authored homepage + shared stylesheet |
| [`diary/`](diary/) | AI-written diary — one markdown file per day ([conventions](diary/README.md)) |
| [`reports/`](reports/) | Reports and decision artifacts, one folder each ([contract](reports/README.md)) |
| [`scripts/`](scripts/) | Site generators and their shared collectors in `scripts/lib/`; `provenance.mjs` for who-decided-it checks |

Two maintainer notes that survive from the earlier build:

- The nav is defined once, in [`scripts/lib/nav.mjs`](scripts/lib/nav.mjs); adding a
  page means adding one row there. The deploy asserts every page carries it.
- The Cost section of the analytics page reads a committed artifact,
  `site/usage/usage.json`, generated locally from @jwildfire's Claude Code transcript
  store by `python3 scripts/build_usage_data.py`; the site build renders whatever was
  last committed.

The nightly roadmap audit, its apply lane, the ideas-triage workflow and the
navigator-era stamps (premise status, config count, session state) belong to the retired
autonomous prototype and are being retired from this repo under the issue contract, one
requirement at a time.

# History

This repo replaced the [`obot-claw` hub](https://github.com/obot-claw/obot-claw.github.io)
(archived July 2026), which ran an autonomous-agent portfolio ("Open Source OrangeBot")
from May–June 2026. Open requirements were migrated here with links back to their
originals, and the hub's diary and reports were migrated into [`diary/`](diary/) and
[`reports/`](reports/) under requirement [#7](https://github.com/jwildfire/obot.roadmap/issues/7).
From July to September 2026 a second, fully autonomous prototype ran from
[`obot.agent`](https://github.com/jwildfire/obot.agent); it was retired on 2026-09-10 in
favour of the goal-session model above, for the reasons recorded in
[ways of working](docs/ways-of-working.md#what-was-retired-and-why).
