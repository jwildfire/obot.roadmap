# gsm.qtl `report_qtl.yaml` — upstream audit

Every claimed defect in gsm.qtl's QTL report module, re-run from a clean R session against the package's own bundled inputs. Four confirmed, one withdrawn, plus the coverage gap underneath all of them — written as draft issues the gsm team can post, edit or dismiss.

**Live:** https://jwildfire.github.io/obot.roadmap/reports/gsm-qtl-report-module-audit-2026-07-29/

## Why it exists

An earlier agent session shipped demo-301's QTL pipeline and claimed five defects in `inst/workflow/4_modules/report_qtl.yaml`, then cut the claim to three. @jwildfire pushed back — *"Not seeing these in production use. Did you look at how the examples in gsm.qtl manage to navigate usage?"* — and this audit is the answer: every claim executed, on gsm.qtl's own data, with the mechanism established rather than inferred.

The examples navigate around the module by not using it. `data-raw/Example_QTL.R` builds the report's inputs in hand-written R and calls `gsm.kri::RenderRmd()` directly; the workflow is referenced nowhere in the repository outside itself. The two have drifted, and the workflow is the copy that ships to studies.

## What the audit found

| # | Finding | Verdict | Consequence |
|---|---|---|---|
| 1 | `compreas` fill tests `is.na()` only; the data uses `""` | Confirmed | Wrong result, silent — the QTL0002 listing shows 78 rows where 8 is correct |
| 2 | Unqualified `pull` | Confirmed | Halts the workflow at step 9 under both shipped drivers |
| 3 | `invid` lost in the SUBJ/STUDCOMP join | Confirmed | Halts the render — `object 'invid' not found` |
| 4 | `outputs/{SnapshotDate}` never created | Confirmed | Report silently written to `tempdir()` |
| 5 | No test, example or vignette runs the module | Confirmed | Root cause of 1–4 |
| — | "`yaml` never evaluates the `!expr` tag" | **Withdrawn** | `workr::RunStep()` re-parses and evaluates it |

Findings 2 and 3 stop the run before finding 1 can be seen, which is why the wrong result has gone unnoticed.

## How it was generated

Every repro was executed, not reasoned about. Console output on the page is verbatim; screenshots are of reports rendered during the audit.

Inputs were built from the packages' own bundled data rather than the demo study's, so nothing depends on demo-301:

```r
mapped <- workr::RunWorkflows(mappings_wf,
  gsm.mapping::Ingest(gsm.core::lSource, gsm.mapping::CombineSpecs(mappings_wf)))
```

The module was then run four ways: as shipped with no dplyr attached; as shipped with dplyr attached (which reaches the render); with the join and `pull` patched but the fill left alone; and with all three patched. The third and fourth differ by one line and produce a 78-row and an 8-row discontinuation listing respectively.

## Sources

- `Gilead-BioStats/gsm.qtl` at `3311a4e` (v1.3.0.9000) — the workflow, `inst/report/QTL0002.Rmd`, `data-raw/Example_QTL.R`, `tests/testthat/`, and the git history behind the drift.
- `Gilead-BioStats/workr` — `RunStep.R` (`parse_expr_param`), `internal.R` (`GetStrFunctionIfNamespaced`), `RunWorkflow.R` (`CheckSpec` validates but does not subset).
- `Gilead-BioStats/gsm.library` — `snapshot-main` and `snapshot-dev`, read-only, to establish that the file ships to studies and to compare all twelve module workflows.
- `Gilead-BioStats/gsm.template` — `inst/file-structure/scripts/run-snapshot.R`, the canonical study runner, and the `Depends` fields of the eight packages it attaches.
- `jwildfire/open.gismo` — `.og_attach_pipeline_packages()` in `R/og_run.R`.
- Data: `gsm.core::lSource` (100 STUDCOMP rows, 760 subjects) and a `gsm.datasim`-generated study (765 STUDCOMP rows).

Environment: gsm.qtl 1.3.0.9000 · workr 1.0.0 · gsm.core 1.2.0 · gsm.mapping 1.1.3 · gsm.kri 1.5.0 · gsm.reporting 1.1.5 · dplyr 1.1.4 · yaml 2.3.10 · R 4.3 arm64 · macOS.

## Assumptions and limits

The page states these itself in a **Limits** section:

- **Whether any live study enables the QTL module** could not be established from outside Gilead. What is established: the file ships byte-identical through `gsm.library`, is marked `Active: true`, and gsm.template's runner executes every module it finds.
- **Whether a study's own driver attaches dplyr.** Neither shipped driver does; a study with a hand-written runner may.
- **Whether real STUDCOMP extracts use `""` or `NA`** for participants who completed. Both datasets available here use `""`. The strongest indirect evidence is the gsm.qtl author's own commit message — *"datasim and live studies don't quite match"* — on the commit that added the empty-string case to the R.

One further caveat on finding 1's numbers: the corrected listing (8 rows) and the report's headline metric (14) still disagree, because the listing is reason-driven and the metric is `compyn`-driven and `gsm.core::lSource` is not internally consistent on that point. The defect is the 78, not the gap between 8 and 14.

Nothing here has been filed, commented or pushed to `Gilead-BioStats` — the agent has no write access to that org, and the draft issues are a handoff.

Full drafts, repro scripts and raw run logs: [`obot.agent` PR #62](https://github.com/jwildfire/obot.agent/pull/62), under `drafts/gsm.qtl/`.

---

Audited and written by Claude Code using Opus 5 in a background session, for @jwildfire — findings reviewed by @jwildfire, this write-up not yet
