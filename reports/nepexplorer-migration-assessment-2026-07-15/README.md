# nepExplorer → safety.viz — migration assessment

Self-contained assessment of whether and how
[SafetyGraphics/nepExplorer](https://github.com/SafetyGraphics/nepExplorer) (the
kidney-function safety renderer) can be migrated into
[jwildfire/safety.viz](https://github.com/jwildfire/safety.viz), the consolidated
Chart.js library. **Assessment only** — no code changes, issues, or PRs were made.

- **Report:** [`index.html`](index.html)
- **Date:** 2026-07-15
- **Author:** Claude Code (Fable 5), background session `👯🤖 nep-explorer-assess`, reviewed by @jwildfire
- **Status:** Current — direction-setting input for hub [#29](https://github.com/jwildfire/obot.roadmap/issues/29) (v1.3 renderers) and [#33](https://github.com/jwildfire/obot.roadmap/issues/33) (legacy renderer mining); decisions D1–D3 await @jwildfire.

## Bottom line

**GO, phased.** nepExplorer's core chart (a KDIGO-staged, per-participant creatinine
scatter) is a direct kidney analog of the already-shipped hep-explorer eDISH module, so
it fits the canvas-first `checkInputs → configure → structureData → getScales/getPlugins`
module pattern with high reuse. Migrate from the **Shiny v1.0.0** (`master`) as the
behavioral source of truth; treat the **deprecated JS v0.9.0** (`deprecated-js`, D3 +
RhoInc webcharts) as a UX reference only. Split into Phase 1 (KDIGO scatter, demoable on
current data) and Phase 2 (patient-profile drill-down, gated by demo data).

## Key findings

- **Two incarnations:** current Shiny app (R/ggplot2/plotly, ~1.5k lines) and a
  deprecated D3+webcharts JS renderer. The Shiny app is the current product and the
  authoritative source of clinical logic.
- **Data gap (the real constraint):** safety.viz's current pharmaverseadam (CDISC Pilot
  01) demo data has creatinine, BP, and most electrolytes, but **lacks cystatin C,
  eGFRcys, urine albumin/creatinine ratio, and bicarbonate**. The core scatter is
  demoable today; the full patient profile is not. eGFR is derivable (CKD-EPI).
- **Unit dependence:** the KDIGO absolute-change thresholds and the ≥4 mg/dL rule assume
  mg/dL; demo creatinine is in µmol/L. The module must be unit-aware. (Fold-change axis is
  unit-safe.)
- **Latent bug to catch, not copy:** the R `DELTA_STAGE` `case_when` ordering makes
  Stage 2/3 unreachable — re-derive from KDIGO intent.

## Sources inspected

- `SafetyGraphics/nepExplorer` `master` (Shiny v1.0.0): `R/`, `inst/config/nepExplorer.yaml`,
  `data-raw/` (meta mappings + adbds), `outline.md`, `NEWS.md` — shallow clone.
- `SafetyGraphics/nepExplorer` `deprecated-js` (JS v0.9.0): `src/kdigoScatterPlot`,
  `src/timeSeries`, `settings-schema.json`, `package.json` — shallow clone.
- `jwildfire/safety.viz`: working tree + `origin/hep-explorer` branch (eDISH precedent),
  `delta-delta` / `results-over-time` modules, `src/data/schema/*`, `site/data/adbds.csv`
  (pharmaverseadam demo).

## Assumptions

- Effort sizes are relative T-shirt estimates for direction-setting, not commitments.
- The pharmaverseadam demo-data measure inventory was read from `origin/main`
  `site/data/adbds.csv` on 2026-07-15; a later demo-data change would shift the data-gap
  table.
