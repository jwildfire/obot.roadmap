# Platform gap analysis — what the other safety platforms ship that we don't (2026-07-25)

External-landscape survey of safety-monitoring and clinical-review platforms, scored against this
portfolio's coverage and roadmap, with ranked requirement proposals to close the gaps.

Requested by @jwildfire (2026-07-25): *"a research agent that looks at other safety monitoring
platforms and looks for gaps in our coverage/roadmap. make a list of common views/functionality that
we don't support. Propose requirements to close the gaps."*

## Pages

| Page | What it holds |
|---|---|
| [`index.html`](index.html) | Landing — the headline gap list as frequency bars, five findings, the status rollup, and what we have that they don't |
| [`landscape.html`](landscape.html) | Capsule per source: what it is, its signature views and workflows, and where that was read |
| [`matrix.html`](matrix.html) | The gap matrix — 63 capabilities × our status, filterable, grouped into four families |
| [`proposals.html`](proposals.html) | 12 ranked requirement proposals with pitch, why-now, goal, size and the honest caveat on each |

## Sources

Thirteen platforms and two reference catalogues, all from public documentation, package reference
indexes, user guides and PHUSE / PharmaSUG papers — no demos, trials or vendor conversations.

- **Open source:** safetyGraphics / ISG (safetyCharts, safetyProfile, volcanoPlot, nepExplorer,
  qtexplorer), teal & teal.modules.clinical (Roche), DaVinci `dv.*` (Boehringer), tidyCDISC
  (Biogen), clinDataReview (Open Analytics)
- **Commercial:** JMP Clinical, JReview / Integrated Review, Spotfire clinical (Roche CoreSV /
  Revvity Signals), elluminate (eClinical Solutions), CluePoints, Medidata Clinical Data Studio,
  Veeva CDB, Oracle Empirica Signal
- **Reference catalogues:** FDA Standard Safety Tables & Figures v2.0 (April 2025), CTSpedia / PHUSE
  safety-display catalogues

Per-source citations are on [`landscape.html`](landscape.html); every capsule carries its links.

## Our side of the matrix

Verified rather than assumed, on 2026-07-25:

- `safety.viz` `dev` branch — 11 renderers at `available` in the gallery config, 2 at `planned`,
  plus the module source and data-contract schemas
- `gsm.kri` — 17 metric workflows in `inst/workflow/2_metrics/` including Site Risk Score
- Full issue census: every open and closed issue on `jwildfire/obot.roadmap` (67) and every open
  issue on `jwildfire/safety.viz` (23), plus the four goal issues and the `hub#9` FDA ST&F design

## Headline numbers

| | |
|---|---:|
| Sources surveyed | 15 |
| Capabilities scored | 63 |
| Have today | 17 |
| Filed on the roadmap | 7 |
| Missing or only partial, nothing filed | 37 |
| Missing on ≥4 of the 13 platforms (the headline list) | 16 |
| Review-workflow capabilities we have | **0 of 10** |

## The finding in one line

The chart migration is close to complete and in two places ahead of the field; the **review
workflow layer** — review state, change-since-last-review, annotation, issue tracking, alerting —
does not exist here and exists on almost every platform surveyed.

## Deduplication

Checked against the filed hub and `safety.viz` backlogs, and against the
[goal atlas](../goal-atlas-2026-07-24/) published the same night. Nine overlaps are named explicitly
on [`proposals.html`](proposals.html) and deferred to the atlas rather than proposed twice: its
candidates C3, C4, C5, C6, C7, C8, A3, A6 and A7. What is left is the review-workflow layer and four
chart families the safetyGraphics migration inventory never contained.

## Design notes

- Base token set matches the obot report family ([executive overview](../executive-overview-2026-07-21/),
  [goal atlas](../goal-atlas-2026-07-24/)); goal hues are reused unchanged.
- Status uses the dataviz reference **status** palette (good / warning / critical), which is fixed
  and never themed. Validated with the skill's validator against both surfaces: worst adjacent CVD
  ΔE 11.3 (protan), normal-vision ΔE 27.6 — clear of the 8 / 15 floors in both modes. Light-mode
  `warning` measures 1.83:1 on white, below 3:1 by design, so the relief rule is applied without
  exception: **every status mark carries a glyph and a written word**, and the matrix is a table.
- The one plotted form is a single-series magnitude bar (platforms shipping a capability we lack) —
  one sequential blue, no legend, and the count printed on every row so the bar is a reading aid
  rather than the only encoding.
- Self-contained: no CDNs, no network calls, no build step. `assets/` and `data/` are local relative
  includes; the survey is frozen in `data/gaps-data.js` as `window.GAPS`, and every number in the
  prose is derived from it at render time rather than typed.

## Boundaries respected

Nothing was filed, linked, edited or moved. No issues created, no sub-issue links changed, no board
stages touched, no goal issues edited, and no code changed in any repo. Every proposal on Part 3 is
a proposal awaiting @jwildfire.

## Known limitations

- **Documented, not verified.** A platform is scored as shipping a capability because its
  documentation describes it. Nothing was tested, and vendor documentation flatters.
- **Depth follows publication.** Medidata's and Veeva's capsules are short because those vendors
  publish little detail; that is not a judgment about the products.
- **The grain is a judgment.** Sixty-three rows reflects one analyst's split-and-merge decisions.
  Counts would move under different ones.
- **Static coverage was scored separately.** `hub#9` plans static ggplot versions of much of the FDA
  figure set. That is real coverage, but it does not give a reviewer the interactive display, so
  those rows are scored against the interactive portfolio with the static plan noted in the row.
- **Oncology response views and post-marketing disproportionality** were surveyed and marked low
  priority rather than dropped, so the record shows they were considered.

---

Drafted by Claude Code using Opus 5 (background session `👯🤖 2026-07-25 platform-gaps`) for review
by @jwildfire.
