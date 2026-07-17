# Safety graphics — improvement requirements & feasibility

Self-contained assessment turning a colleague's five safety-graphics improvement
ideas into actionable requirements with a high-level feasibility read for each.
**Assessment + requirement-scoping** — the report is direction-setting; the
requirements it names were subsequently filed as issues (below).

- **Report:** [`index.html`](index.html)
- **Date:** 2026-07-17
- **Author:** Claude Code (Fable 5), background session `😺🤖 2026-07-17`, reviewed by @jwildfire
- **Status:** Current — all four referenced source documents reviewed; Initiatives 01 and 03 are in build (ultracode sessions); 04–05 remain domain-knowledge-scoped.

## The five ideas

| # | Initiative | Feasibility | Filed as |
|---|---|---|---|
| 01 | Hep Explorer — composite plot (baseline-referenced eDISH) | High | [safety.viz#67](https://github.com/jwildfire/safety.viz/issues/67) |
| 02 | Renal Explorer — finish & integrate into the suite | Moderate | requirement [hub #35](https://github.com/jwildfire/obot.roadmap/issues/35) |
| 03 | QT Explorer — build (ICH-E14 cardiac safety) | Moderate | requirement [hub #36](https://github.com/jwildfire/obot.roadmap/issues/36) → Phase 1 [safety.viz#68](https://github.com/jwildfire/safety.viz/issues/68) |
| 04 | Benefit-Risk tools (Forest Plot + Value Tree) | Exploratory · gated | — (ASA taskforce scope pending; `SafetyGraphics/BRForestPlot` exists) |
| 05 | Recurrent AE analysis | Exploratory | — (quick wins highlighted; formal modeling needs stats) |

## Bottom line

Three of the five (hep composite, renal KDIGO, QT outlier) reuse the same
**scatter-with-zones** grammar the suite already ships, so they read as achievable
rather than novel. The hep composite plot is the highest-confidence build (FDA
public-domain reference code exists); the QT and renal tools arrive as
safetyGraphics R Shiny apps, which is why import/mapping recurs and is better
solved once at the suite level. Benefit-Risk is gated on the merged ASA taskforce
scope; recurrent-AE modeling needs a statistician, though its descriptive quick
wins (MCF, events-per-subject, gap-time on ae-timelines) can ship now.

## Sources reviewed

- **Hep composite plot:** Tesfaldet B, Patel T, Chen M, Pucino F, Rosario L,
  Hayashi P, Navarro Almario E. *Composite Plot for Visualizing Aminotransferase
  and Bilirubin Changes in Clinical Trials of Subjects with Abnormal Baseline
  Values.* Drug Safety 2024;47:699–710. FDA reference code:
  `github.com/FDA/Composite-eDISH-Plot` (public domain).
- **Renal:** *ISG Renal Safety Explorer User's Manual & Workflow v1.0* (ASA
  Biopharm Safety Working Group) — dual-scale KDIGO + Delta-Creatinine scatter,
  CKD-EPI 2021 eGFR equations, Steps 1a–5d AKI workflow.
- **QT:** CSRC *Example QT Tool Display v2* (6-slide mockup) and *QT Safety
  Explorer Draft Clinical Workflow (28 Apr 2025)*, v0.1 (ISG × CSRC).
- safety.viz architecture (shipped renderers, evidence pipeline,
  `scripts/build-demo-data.mjs`); nepExplorer migration assessment (hub #35);
  `pharmaverseadam` ADEG (QTcF/QTcB demo data).

## Assumptions

- Feasibility ratings are a high-level triage read, not committed estimates.
- Initiatives 04 (Benefit-Risk) and 05 (recurrent AE) had no source document
  supplied and are scoped from domain knowledge.
- Requirement scope for 01 and 03 reflects the source documents as of 2026-07-17;
  the finished-tool screenshots (renal, QT) were not yet available.
