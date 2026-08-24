# Legacy renderer trackers — what survives the move to safety.viz

Report for hub requirement [#33](https://github.com/jwildfire/obot.roadmap/issues/33):
mine the retired safetyGraphics / RhoInc renderer issue trackers for feature requests
worth carrying into `safety.viz`, map each to its target module, and pick the quick wins.

## How it was generated

- **Corpus.** Every OPEN issue in the twelve trackers listed on the page, read via the
  GitHub issues API. Pull requests returned by the same endpoint (25 across ten
  trackers) were excluded, leaving 282 issues.
- **Cached sweep, plus a re-fetch.** A prior worker (W0127) had already pulled the 282
  issues with their bodies; that cache was reused rather than re-fetching. It did NOT
  carry comment text, only comment counts, so 135 comment bodies across the 90 issues
  that have comments were fetched to close the gap. 21 of those issues have an empty
  body, meaning the whole request lived in comments the cache did not hold.
- **Classification.** Each issue placed in exactly one of: worth migrating, already
  covered by safety.viz, obsolete. Coverage claims were checked against safety.viz's
  source, its reviewed requirement matrices (`requirements/*.md`) and its per-module
  coverage documents (`docs/*-coverage.md`), not against module names. 232 of the 282
  carry such a check and print it on the page; the other 50 are marked `judged`.
- **Executed, not reasoned.** Two claims about failure modes were run against the
  shipped modules: `columnPlan()` in ae-explorer (confirmed a defect the port
  inherited) and `listVisits()` in shift-plot (confirmed a request the port already
  satisfies). The two came out opposite ways, which is the argument for running them.

## Sources

- The twelve trackers: `RhoInc/ae-timelines`, `RhoInc/aeexplorer`,
  `RhoInc/paneled-outlier-explorer`, `RhoInc/safety-delta-delta`,
  `RhoInc/safety-histogram`, `RhoInc/safety-outlier-explorer`,
  `RhoInc/safety-results-over-time`, `RhoInc/safety-shift-plot`, `RhoInc/web-codebook`,
  `SafetyGraphics/hep-explorer`, `SafetyGraphics/nepExplorer`,
  `SafetyGraphics/qtexplorer`.
- `jwildfire/safety.viz` at `main` (13 renderers): `src/`, `requirements/`, `docs/`,
  `_api/`, `tests/`.

## Assumptions and limits

- `web-codebook` and `paneled-outlier-explorer` map to modules safety.viz has planned
  but not built. Their requirement matrices exist and are marked "(planned)". "Already
  covered" for those two means the capability exists elsewhere in the library and the
  planned module would inherit it — not that a module of their own does it.
- Issues targeting the legacy R packages or Shiny apps (`nepExplorer`, `qtexplorer`)
  are classified obsolete **as safety.viz items**, with that reason stated. The R route
  for these charts is `gsm.safety`'s `Widget_*` htmlwidgets over the safety.viz bundle;
  anything genuinely wanted there needs filing against that package, not this library.
- Two performance items (hep-explorer #239, web-codebook #320) propose remedies aimed
  at SVG DOM pressure. safety.viz renders to canvas, so the measurements do not
  transfer; both are listed with that caveat and should be re-measured before scoping.
- 86 of the 282 issues have a title and nothing else in the tracker. They were
  classified from the title, which is sufficient for some and thin for others.

## What was NOT done

Nothing was written to any repository outside the `jwildfire` organisation — no issues,
comments, pull requests or reactions on `RhoInc` or `SafetyGraphics`. Nothing was filed
in `safety.viz` either: @jwildfire's review gates any filing, per the requirement.

## Disclaimer

Drafted by Claude Code using Opus 5 in an unattended session and not yet reviewed by
@jwildfire. The classifications are an LLM's judgement; each one prints the evidence
behind it so it can be checked and disagreed with.
