# obot.roadmap

@AGENTS.md

# Standards

IMPORTANT: the obot program's standards live in this repository and are mandatory here and
in every other repository: [`docs/issue-contract.md`](docs/issue-contract.md),
[`docs/ways-of-working.md`](docs/ways-of-working.md),
[`docs/developer-guidelines.md`](docs/developer-guidelines.md). Read them before doing
anything.

A prep session runs here, with @jwildfire: it takes a requirement from `status: backlog` to
`status: ready` — objective, design, definition of done, tasks filed in their repositories
with milestones, his sign-off on the objective — using the `requirement-drafting`,
`requirement-design` and `requirement-tasks` skills. An execution session runs one requirement
(`/requirement-session <n>`) in that requirement's repository, never here.

# Commands

- `node --test scripts/lib/*.test.mjs scripts/lib/collect/*.test.mjs scripts/lib/usage/*.test.mjs` — the site generators' tests
- `node scripts/check_artifact_descriptions.mjs` — every report and design page carries its one-line description
- The site builds on push to `main` (`.github/workflows/deploy-site.yml`); to build locally, run the workflow's steps in order with `GITHUB_TOKEN` set.
