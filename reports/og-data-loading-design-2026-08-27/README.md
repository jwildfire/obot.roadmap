# The mapping surface — what gsm.mapping already solves, and what it does not (2026-08-27)

A design session on the step before everything open.gismo v0.2.0 does well: how a person with a real
data extract gets their own study into a project folder. Extends row **D1** of the
[platform gap analysis](../platform-gap-analysis-2026-07-25/) — the data-mapping surface, present on
5 of the 13 platforms surveyed and filed nowhere.

Requested by @jwildfire (2026-08-26): *"Maybe a ultradesign session for open.gismo? re-visit the
research comparing other sites and do some mockups on how users will load their own data?"*

## Two sessions ran this brief in parallel

Two agents picked up the same ask the same evening. The companion artifact,
[`open-gismo-data-loading-2026-08-27/`](../open-gismo-data-loading-2026-08-27/), was being written
concurrently in this same checkout and carries the competitor landscape, four screens and seven
decisions. Its files were still being modified while this one was written, so **nothing in that
folder was touched** — no merge was attempted, and neither artifact has been folded into the other.

The two are complementary rather than rival:

- The companion found a failure mode this page did not: identifiers that are present and correctly
  typed but that do not actually join, producing an empty mapped domain in silence.
- This page carries two findings established by execution, one of which **corrects** the companion's
  account of how a user fixes a column name today.

`D-MAP6` on the index proposes folding this page's findings into the companion and retiring this
one. That is a call for @jwildfire or the Navigator.

## Pages

| Page | What it holds |
|---|---|
| [`index.html`](index.html) | The boundary — what is already solved, the two verified findings, the missing-capability table, the standards-table proposal, and six decisions (D-MAP1–6) |
| [`mockup.html`](mockup.html) | Four clickable steps against a hand-authored CRO delivery. The suggestions are computed by a matcher that runs on page load, not staged |

## What was established, and how

Everything about our own side was run on 2026-08-27, not inferred. `og_init(example = TRUE)` created
a fresh project and every number was read out of the 44 workflow YAMLs it snapshots.

- **12 input domains, 90 column declarations, 25 metrics** — extracted from the `spec:` blocks,
  keeping `Raw_*` domains and dropping `_`-prefixed sentinel keys.
- **Domain → metric reachability** — computed through `Raw_* → Mapped_* → metric`, never typed.
  `Raw_SUBJ` feeds 22 of the 25 metrics; `Raw_SITE` and `Raw_STUDY` feed none.
- **Only 23 of the 90 declarations are named by a metric.** Per-column leverage:
  `Raw_SUBJ$subjid` 23, `$invid` 12, `$country` 11, `$timeonstudy` 9. The other 67 declarations feed
  reporting and labels.
- **`srs0001` (Site Risk Score) has no spec at all** — it weights every `kri*` analysis that ran via
  `FilterAnalysis(strFilterIDPattern: "kri")`, so a partial mapping changes its denominator rather
  than failing.

### Finding one — `og_validate()` is blind to `source_col`

Verified three ways:

1. **By source.** `.og_input_specs()` in `open.gismo/R/og_validate.R` keeps `names(cols)` — the
   target names — and compares with `setdiff(required, info$cols)`. The string `source_col` does not
   appear in the file.
2. **By writing the fix.** 94 `source_col` lines were written across 12 of the 13 mapping files in a
   real project whose CSVs use ADaM-style names. `og_validate()` returned a byte-identical report.
3. **By running the engine on the same files.** `gsm.mapping::Ingest()` with that spec and that CSV
   returned all 14 columns correctly populated, 1,000 rows, `subjid` = `S384, S4476, S71069`.

Minimal confirmation:

```
SPEC says subjid comes from: USUBJID
CSV actually contains USUBJID?  TRUE
og_validate() says: error -> missing columns: studyid, invid, subjid, ...
```

The readiness check and the engine disagree about the same project. For any delivery whose columns
are not already named with gsm's internal names, that screen can never reach green.

### Finding two — behaviour on absent and unmatched data

- **Missing column, silently dropped.** `ApplySpec()` filters the spec with
  `purrr::keep(~ .x$source %in% colnames(dfSource))`. A column the source lacks is removed with no
  message at any level. `Ingest()` still prints its success line.
- **Missing domain, hard abort.** `Ingest()` calls `stop_if()`, and `LogMessage(level = "error")`
  routes to `cli::cli_abort()`. Domain-level failures are loud; column-level failures are silent.
- **`fs_LoadData()` warns and skips** a missing input file, so which behaviour a user gets depends on
  which path reaches the data first.
- **`CheckSpec()` does detect** missing columns and wrong types, as warnings — but it fires a
  missing-column warning even on the clean reference data (`Raw_DATAENT$subject_nsv`), and it grades
  `subjid` and `mincreated_dts` identically.
- **CSV only.** Every loader in open.gismo calls `read.csv`. There is no `.xpt`, `sas7bdat` or
  parquet path.
- **Adding a domain or variable** means filing an issue on `Gilead-BioStats/gsm.mapping` and waiting,
  per that package's own `add_new_domain_var` vignette.

## Competitor reading

Read-only, from public documentation and package source. "Seen on" means documented, not verified.

- **safetyGraphics** (the direct ancestor, local read-only clone) is the model. `detectStandard()`
  scores a data frame against every known standard, computes `match_percent`, and labels the best one
  ("Partial ADaM (7/12 cols/fields matched)"), pre-filling the mapping screen. The asset behind it is
  `safetyCharts::meta_*`, which carries `standard_adam` and `standard_sdtm` per target field —
  `USUBJID`/`USUBJID`, `AVAL`/`LBSTRESN`, `PARAM`/`LBTEST`. **gsm.mapping has no equivalent.**
- **tidyCDISC** accepts `sas7bdat` only and ships a `suggest_adam_column_mapping` helper.
- **clinDataReview** reads `sas7bdat` or `xpt` from a configured `pathDataFolder`.
- **elluminate** ships a separate visual "Mapper" whose stated objective is making mapping easier for
  non-programmers, and in 2026 named Data Mapping as one of four pillars for agentic AI.

Both open-source competitors read native clinical formats; open.gismo reads neither.

## The mockup

`mockup.html` is HTML, wired to nothing. What is real underneath it:

- The domains, columns, types, `declared_in` file lists and metric dependencies are the extracted
  ground truth described above, in `data/ground-truth.js`.
- The suggestions are produced by `assets/mock.js` at page load — exact match, case-normalised match,
  ADaM name, SDTM name, known alias, then a unique-prefix fallback — with conflicts surfaced when two
  targets claim one source column.
- The delivery it runs against was **hand-authored before the alias table**, so the matcher gets no
  help from having seen it. It scores the delivery as Partial ADaM (19 of 42 standard names present)
  and settles 27 of 81 columns unaided.

The `adam` / `sdtm` / `aliases` table in `data/ground-truth.js` is a **proposal**, seeded by hand. It
is the one asset that does not exist in the ecosystem today.

## Boundaries respected

- Nothing filed. No issues, comments, PRs, board moves or goal edits.
- No package source modified. open.gismo, gsm.mapping, gsm.core and workr were read and run; the
  probe projects were written to `/tmp`.
- No writes outside the `jwildfire` org, and no writes to the concurrent session's artifact folder.
- Competitor research was read-only from public sources — no demos, trials or vendor contact.

## Known limitations

- **One delivery, hand-authored.** The matcher's 45% ADaM score reflects one invented CRO extract.
  A different invented extract would score differently.
- **The alias table is seeded, not researched.** It was written from general CDISC familiarity, not
  from a systematic survey of EDC vendor naming.
- **The mapped-name shortcut.** Tracing a metric's `Mapped_X.col` back to `Raw_X.col` assumes the
  mapping preserves the column name, which holds for these 13 workflows but is not guaranteed in
  general.
- **`og_init()`'s project differs from demo-301.** This session used a fresh `og_init()` project (12
  domains, 90 declarations, 25 metrics); the companion artifact used demo-301 (14 domains, 126
  columns, 30 metrics). Both are correct about their own substrate; the numbers are not comparable
  across the two pages.
- **The competitor scoring is documentation-based** and inherits the gap analysis's caveat that
  vendor documentation flatters.

---

Drafted by Claude Code using Opus 5 for review by @jwildfire.
