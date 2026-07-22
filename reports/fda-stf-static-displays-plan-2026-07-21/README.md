# FDA Standard Safety Tables & Figures — static display strategy

Assessment and phased plan for implementing static (R) tables, listings and figures from the
FDA **Standard Safety Tables and Figures: Integrated Guide** v2.0 (April 2025), reviewable and
generatable alongside the existing `safety.viz` interactive graphics.

Input to hub requirement [#9](https://github.com/jwildfire/obot.roadmap/issues/9) (project P005),
whose Data Requirement, Design and Tasks sections are still empty.

## Contents

| File | What it is |
|---|---|
| `index.html` | The report — self-contained, theme-aware |
| `fda_stf_inventory.json` | Machine-readable inventory of all 60 tables and 22 figures: tier, section, type, chart engine, ADaM domains, cross-cutting rules |

## Headline findings

- The guide specifies **60 tables and 22 figures** in three delivery tiers (Core / Expanded /
  Optional), plus 5 appendix reference tables that are data assets rather than displays.
- The 22 figures reduce to **8 reusable chart engines**; the guide multiplies them across
  analyte panels.
- Open-source R coverage is lopsided: pharmaverse `cardinal` has templates for **26 of 60
  tables** but only **4 of 22 figures**, and its figure numbering is stale against v2.0.
- **15 figures have no static-R implementation anywhere.** **12 of those 15 already have a
  shipped `safety.viz` interactive twin**, and reduce to 4 chart engines — the proposed Phase 1.
- **The guide ships no companion code** and there is no FDA reference implementation or
  repository of reference outputs.
- Architecture recommendation: **shared R derivation layer + two thin renderers**, mirroring
  `gsm.kri`'s `Visualize_*` ↔ `Widget_*` pairing. Rejected: JS-renders-both (Chart.js is
  canvas, so raster output, and a browser toolchain is a qualification liability) and two fully
  independent libraries (duplicates normative FDA rules in two languages).

Four decisions (D1–D4) are raised for @jwildfire and none are executed: package placement,
depth of the shared layer, scope commitment, and output formats. A fifth strategic option —
contributing the figure engines upstream to `cardinal` — is flagged separately.

## How this was generated

Claude Code (Fable 5) running a plan session on 2026-07-21, fanning out five parallel research
agents:

1. **Three PDF inventory passes** over `standard_safety_tables_and_figures_integrated_guide_2025.pdf`
   (136 pages, split 1–48 / 49–96 / 97–136), each producing an exhaustive display inventory with
   chart types, data domains, structure notes and tiering language. Note the PDF carries ~11 pages
   of front matter, so PDF page numbers run ahead of printed page numbers in the later ranges.
2. **Ecosystem survey** of local clones — `gsm.safety` (both `main` and the unmerged
   `release/v1.0.0` worktree), `safety.viz` v1.4.0, `gsm.kri` as architecture reference, and
   `obot.roadmap` for hub state and publishing conventions.
3. **R landscape research** over public sources for `cardinal`/`falcon`, `tern`/`rtables`,
   alternative table stacks, `safetyCharts`, and any official companion code.

Three consequential claims were verified directly rather than trusted from search results:

- `cardinal`'s `NAMESPACE` exports nothing and `R/` contains only `archive/` plus a package stub
  — confirmed against `raw.githubusercontent.com/pharmaverse/cardinal/main`.
- `safetyCharts` and `safetyGraphics` were archived from CRAN on **2026-03-25**, as collateral
  from `Tendril`'s removal — confirmed against the CRAN package pages.

## Primary sources

- [FDA ST&F Integrated Guide v2.0 PDF](https://www.fda.gov/media/187065/download) — CDER BIRRS,
  April 2025; governed by MAPP 6025.9 (effective 2025-06-13)
- [FDA ST&F landing page](https://www.fda.gov/drugs/development-resources/standard-safety-tables-and-figures-stfs)
- [pharmaverse/cardinal](https://github.com/pharmaverse/cardinal) ·
  [template catalog](https://pharmaverse.github.io/cardinal/quarto/index-catalog.html)
- [tern reference index](https://insightsengineering.github.io/tern/latest-tag/reference/index.html) ·
  [junco](https://johnsonandjohnson.github.io/junco/)
- [SafetyGraphics/safetyCharts](https://github.com/SafetyGraphics/safetyCharts) ·
  [CRAN archival notice](https://cran.r-project.org/web/packages/safetyCharts/index.html)
- [R Consortium Submissions WG 2026](https://r-consortium.org/posts/submissions-wg-2026/)

## Assumptions and limitations

- Figures 2, 3 and 12 were characterised from titles, section text and structure notes rather
  than from the rendered mock images. The dot-plus-forest reading of Figures 2 and 3 is
  well-supported by the body text but should be confirmed against the PDF before implementation.
- Targeted Analysis Guide version numbers (v1.2, April 2025) come from search snippets, not the
  TAG PDFs themselves.
- `phuse-scripts` contents were not exhaustively enumerated; "no PHUSE deliverable implements the
  guide display-by-display" is high-confidence but not exhaustive.
- ADaM alignment between the guide's expectations and gsm's `Mapped_*` domains is assumed, not
  verified.
- Display counts treat the guide's unnumbered analyte-panel analogues (the Figure 6, Table 20 and
  Table 35 families) as parameterisations rather than separate displays.

## Disclaimer

Generated by an LLM agent from the sources above. The display inventory is a faithful extraction
but has not been line-by-line audited against the PDF by a human; treat it as a working
specification to verify at implementation time, not as a regulatory reference. Recommendations
and decisions are proposals for @jwildfire, not commitments.
