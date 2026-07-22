# gsm.safety v1.0.0 — every safety.viz chart, now an R widget

DRAFT — ships with the v1.0.0 tag after the RC merges; review on the rendered page.

Nine interactive clinical safety charts, one function call each. gsm.safety v1.0.0 wraps every renderer in the safety.viz v1.4.0 library as an R htmlwidget — all nine, with nothing left behind — so the charts the docs site demos are now first-class citizens of an R session, an R Markdown report, or a Shiny app.

## The widgets

| Widget | Chart | Data |
| --- | --- | --- |
| `Widget_Histogram()` | Result distributions with normal-range overlays, grouped small multiples, and a linked participant listing | labs/vitals (BDS) |
| `Widget_ShiftPlot()` | Baseline-versus-comparison shifts per participant, with visit and summary-stat controls | labs/vitals (BDS) |
| `Widget_DeltaDelta()` | Change on two measures at once (ALT vs AST by default), optional regression line | labs/vitals (BDS) |
| `Widget_ResultsOverTime()` | Longitudinal results by visit with grouping and normal-range context | labs/vitals (BDS) |
| `Widget_OutlierExplorer()` | Participant-level trajectories for spotting outliers per measure | labs/vitals (BDS) |
| `Widget_AeTimelines()` | Per-participant adverse-event timelines colored by severity | adverse events |
| `Widget_AeExplorer()` | Adverse-event prevalence by System Organ Class and preferred term, with per-arm rates, between-arm differences, and participant drill-down | adverse events |
| `Widget_HepExplorer()` | eDISH hepatic safety explorer: peak liver measures with Hy's Law quadrants and participant drill-down | labs/vitals (BDS) |
| `Widget_QtExplorer()` | QT/QTc safety: central tendency with Δ/ΔΔ and confidence intervals against the ICH E14 threshold, outlier scatter, and categorical crossing counts | ECG |

## One call to a rendered chart

```r
library(gsm.safety)

Widget_Histogram(
  dfResults = ExampleData("adbds"),
  lSettings = list(group_by = "ARM", display_normal_range = TRUE)
)
```

Every widget takes a long-format data.frame plus a settings list, validates your columns against the chart's shipped data contract before rendering (clear errors, not blank charts), and inherits the safety.viz control sidebar — filters, grouping, and linked listings — with no extra code.

## Workflows and examples included

Each chart ships a gsm-idiom report workflow (`inst/workflow/3_reports/`) runnable via `gsm.core::RunWorkflow()`, and a runner script (`inst/examples/`) that writes a standalone HTML report. `ExampleData()` provides the same pharmaverseadam-derived demo data the safety.viz site uses — `adbds` (labs and vitals), `adae` (adverse events), and `adeg` (ECG) — so what you render locally matches the published demos exactly.

## Built for regulated use

The release is qualified with [qcthat](https://github.com/Gilead-BioStats/qcthat): every test names the GitHub issue it evidences, and the [v1.0.0 qualification matrix](https://jwildfire.github.io/obot.roadmap/reports/gsm-safety-v1.0.0-rc1/) — 73 issue-linked tests, all passing, `R CMD check` clean — publishes with the release alongside [rendered evidence pages](https://jwildfire.github.io/obot.roadmap/reports/gsm-safety-v1.0.0-rc1/) for every widget.

## Gallery

The package home page now opens with a thumbnail gallery — one real chart image per widget, each linking to a live interactive example on the docs site.

## Breaking changes

The experimental safetyCharts bridge is retired: `RenderSafetyChartsWidget()` and `MakeExampleData()` are removed, along with the safetyCharts/Tendril dependencies. The nine `Widget_*()` functions and `SaveWidgetReport()` replace them.

Development process: designed, built, and qualified against [obot.roadmap#28](https://github.com/jwildfire/obot.roadmap/issues/28) with per-issue commit and test traceability.

---

This release was drafted by Claude Code using Fable 5, updated for the AE Explorer and QT Explorer bindings by Claude Code using Opus 4.8, and reviewed by @jwildfire.
