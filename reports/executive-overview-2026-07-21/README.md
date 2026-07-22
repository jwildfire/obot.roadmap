# obot portfolio — executive overview (2026-07-21)

Executive overview of the obot portfolio: accomplishments to date (June framework era → July shipping sprint), current status across seven workstreams, proposed next steps (short term this week, medium term August–September), seven identified roadmap gaps (G1–G7), and a diagnosis of `roadmap.html` with the fixes shipped in generator v1.8.0 plus further recommendations.

## Contents

| File | What it is |
|---|---|
| `index.html` | The report — self-contained, theme-aware |

## Headline findings

- The July shipping sprint delivered safety.viz v1.0.0 → v1.4.0 (nine renderers) in seven days, obot.agent v0.2.0, and six published diary posts.
- The critical path tonight is four items at gates: gsm.safety v1.0.0 RC (PR #39, CI fix in flight), blog Diary #7, requirement #9 design decisions D1–D4 (PR #42), and the open.gismo plan update.
- Biggest roadmap gaps: the keynote deck requirement (#10) is a stub; the Q4 slate is over-committed with no recorded sequencing; the project board has drifted (6 open issues marked Released, 23 unstatused board items).
- `roadmap.html` staleness is semantic, not mechanical — deploys are healthy; the Tasks column, board lag, manual version badge, backlog-first ordering, and hub-only scope made it unhelpful. Generator v1.8.0 (shipped alongside this report) adds sub-issue progress, an Updated column, "still open" flags, and attention-first section ordering.

## How this was generated

Claude Code (Fable 5) sibling background session `roadmap-exec-overview` on 2026-07-21, from live GitHub state captured that evening: all 26 requirement issues, the full obot Roadmap user-project board (project 1), release lists and open PRs across safety.viz / gsm.safety / obot.agent / open.gismo / obot.roadmap, `deploy-site.yml` run history, the hub diary (through 2026-07-19), and the reports index. Renderer count verified against the safety.viz `src/` module tree at v1.4.0.

## Assumptions

- In-flight facts (gsm.safety #39 CI fix, hub PR #42) reflect sibling agent sessions running the same evening and may resolve within hours.
- The Jul 19 decision-session outcomes are taken from the 2026-07-19 diary entry and issue comments.
