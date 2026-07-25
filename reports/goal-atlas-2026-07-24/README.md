# Goal Atlas — first sweep (2026-07-24)

First full sweep of the obot issue landscape against the goal layer that shipped on 2026-07-24 ([#53](https://github.com/jwildfire/obot.roadmap/issues/53) / [#71](https://github.com/jwildfire/obot.roadmap/issues/71)), plus goal proposals and a requirement research spike.

Requested by @jwildfire (2026-07-24): *"do the first sweep of all issues and suggest goals. I'd like to see a few visualizations of how the issues roll up into goals/requirements/tasks. include orphans. Also do a research spike that suggests 5-10 new requirements for each goal."*

## Pages

| Page | What it holds |
|---|---|
| [`index.html`](index.html) | Landing — the coverage ridge, the five findings, and the route through the other three pages |
| [`atlas.html`](atlas.html) | Four views of the rollup: coverage ridge, strata icicle, filterable outline, unclaimed gallery, plus the goal × stage table |
| [`goals.html`](goals.html) | Coverage assessment of the four existing goals; three proposed new goals with draft titles, boundary prose and rosters; nine proposed relinks |
| [`requirements.html`](requirements.html) | 32 candidate requirements (8 per existing goal) with pitch, why-now, size and goal, plus seeds for the proposed goals |

## Data and method

- **Snapshot:** 2026-07-25 ~04:00 UTC. 182 issues (74 open) across `jwildfire/obot.roadmap`, `obot.agent`, `safety.viz`, `gsm.safety`, `open.gismo`. `jwildfire.github.io`, `RPharma2026-AIKeynote` and `scaffold` were queried and have no issues; `safety-histogram` has issues disabled.
- **Source:** GitHub GraphQL API (`repository.issues` with `parent`, `subIssues`, `labels`, `issueType`, `milestone`) plus `gh project item-list 1 --owner jwildfire` for board Status.
- **Membership:** resolved at read time by walking `subIssues` from each goal issue to any depth, per the [#53](https://github.com/jwildfire/obot.roadmap/issues/53) policy. An issue is *unclaimed* when no path of sub-issue links reaches a goal — having a parent is not enough if that parent is itself unclaimed.
- **Kind:** `goal` label → goal; `requirement` label or a `Requirement:` title prefix → requirement; otherwise task.
- **Stage:** the Status field on the obot Roadmap project (number 1). "Off board" means the issue is not an item on the project at all.
- **Frozen data:** [`data/atlas-data.js`](data/atlas-data.js) — the snapshot as `window.ATLAS`. The pages read it directly; nothing fetches at view time, so the report stays reproducible as the board moves.

## Headline numbers

| | |
|---|---:|
| Open issues | 74 |
| Reachable from a goal | 29 |
| Unclaimed | 45 |
| Unclaimed **requirements** | 20 |
| Not on the project board | 21 |
| Goal members: charts / autonomy / app / keynote | 18 / 5 / 1 / 1 |

## Design notes

- Base token set matches the [executive overview](../executive-overview-2026-07-21/) so this sits in the report family. Light and dark are both selected; the viewer's theme toggle wins over the OS setting.
- Goal hues are categorical slots 1–4 from the validated default palette, used only in the fixed order charts → app → autonomy → keynote so every on-screen pair is an adjacent pair (validated: worst adjacent CVD ΔE 9.1 light / 8.4 dark; worst adjacent normal-vision ΔE 22.9 / 19.8). Aqua and yellow fall below 3:1 on the light surface, so the relief rule applies — every goal-colored mark also carries a letter glyph or a written label, and the outline view is the table view.
- State is encoded by shape, never hue: filled dot open, hollow dot closed, ring for not-on-the-board.
- Self-contained: no CDNs, no network calls, no build step. `assets/` and `data/` are local relative includes.

## Boundaries respected

Nothing was filed, linked, edited or moved. Goal issues are read-only to autonomous sessions under the [#53](https://github.com/jwildfire/obot.roadmap/issues/53) policy; no issues were created, no sub-issue links changed, no board stages touched, and no code in `safety.viz`, `obot.agent` or `gsm.safety` was modified (three build siblings were running concurrently). Every proposal in Parts 2 and 3 is a proposal awaiting @jwildfire.

## Relationship to the nightly audit

This is analysis, not enforcement. The nightly roadmap audit ([#92](https://github.com/jwildfire/obot.roadmap/issues/92), `site/audit/`) applies rules to individual issues and files accept-decisions; the atlas asks whether the goal layer is the right shape for the work as a whole. The two overlap on orphan detection and disagree on nothing — the audit's orphan rule and this sweep's unclaimed set are the same idea at different altitudes.

## Known limitations

- The sweep reads sub-issue links only. An issue that "belongs" to a goal in prose — mentioned in a body, or obviously in scope — is unclaimed here if the link is missing. That is the point of the exercise, but it means the unclaimed count measures linking discipline, not intent.
- Closed issues are included in the outline and the totals but excluded from the strata icicle and the ridge, both of which are about live work.
- Requirement candidates in Part 3 were deduplicated against issue **titles**, not full bodies. A candidate could still overlap with a task buried in a requirement's body.

---

Drafted by Claude Code using Opus 5 (background session `👯🤖 2026-07-24 goal-atlas`) for review by @jwildfire.
