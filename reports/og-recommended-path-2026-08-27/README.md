# The read, and the bench behind it — the recommended path (2026-08-27)

The synthesis artifact for the open.gismo data-loading design session. Four directions were
designed in parallel overnight and judged from three seats. This picks one, grafts the best of
the other three onto it with each graft named and sourced, says what was thrown away, and walks
the result end to end in two clickable mockups.

Requested by @jwildfire (2026-08-26): *"Maybe a ultradesign session for open.gismo? re-visit the
research comparing other sites and do some mockups on how users will load their own data?"*

Extends row **D1** of the [platform gap analysis](../platform-gap-analysis-2026-07-25/) — the
data-mapping surface, scored present on five of thirteen platforms, absent here and never filed.
That row is re-read platform by platform on the page: the count of five survives, three of the
five names do not.

## Pages

| Page | What it holds |
|---|---|
| [`index.html`](index.html) | The recommendation — stated in the first paragraph, then the three-lens scorecard, the path, what `gsm.mapping` already solves and what it does not, what the landscape established and what it could not, the ten named grafts plus one addition, what was rejected, the six measurements this session ran itself, five weaknesses, and six decisions as the last thing on the page |
| [`flow.html`](flow.html) | Mockup 1 — eight clickable steps from a six-file CRO folder to a running study. Steps 3 to 6 are live: answer a finding and the ledger, the diff and the diagnostic all move together |
| [`bench.html`](bench.html) | Mockup 2 — the working surface behind the report. Clickable: accept identical matches, order candidates without scoring them, bind, derive, declare a constant, decline with a reason, and measure the keys |

## The recommendation in one line

**Inspect-first wins** — `og_read()` reads the folder as delivered and writes one document that
prices every gap in *displays* rather than columns — **with convention's diagnostic behind it**
(`og doctor`, every finding naming the file, the line and the literal text that fixes it, and
`og_run()` refusing while a blocking finding is open), **the bench's four dispositions as the
vocabulary of an answer** (Bound / Derived / Constant / Declined-with-a-price), and **guided
setup's inference rules** (order candidates, never fill a blank, never show a confidence number).

## Why this one

Ranked across the three lenses, inspect-first is the only direction never below second. On
four-three-two-one points it scores 10 and convention scores 9 — close enough that the ranking is
not the argument. The argument is that the two front-runners are not rivals: one is a document,
the other is a diagnostic, and each fixes the other's stated weakness.

| Direction | Statistician | Data manager | Engineer |
|---|---|---|---|
| Inspect-first — the intake report | 1st | 2nd | 2nd |
| Convention — `og scan` / `og doctor` | 2nd | 3rd | 1st |
| Mapping bench — the worksheet | 4th | 1st | lower |
| Guided setup — the wizard | 3rd | 4th | lower |

The engineer's judgement named a first and a second and did not separate the remaining two; those
cells say *lower* rather than inventing an order, on the page as well as here.

## What this session measured itself

This artifact synthesises four sessions that each measured a great deal. Six things were re-run
rather than trusted, because three of the grafts depend on them. R 4.3, `gsm.mapping 1.1.3`,
`open.gismo` @ `dev` v0.2.0, `demo-301` @ main. Scripts wrote only to `/tmp`.

- **M-a — the mapping seam is two lines.** `gsm.mapping::ApplySpec`, deparsed from the installed
  package: `mapping$source <- spec$source_col %||% name`, then
  `purrr::keep(~ .x$source %in% colnames(dfSource))`. Two keys, and a spec entry whose source
  column is absent is dropped from the generated `SELECT` with no message at any verbosity level.
- **M-b — the validator checks the wrong side.** `open.gismo/R/og_validate.R:201` is
  `setdiff(required, info$cols)`. It never reads `source_col`, so it fails a project `ApplySpec()`
  maps perfectly and passes one whose join yields nothing.
- **M-c — the YAML writer eats the study's own explanation.** `R/og_app_helpers.R` ends a settings
  write with `yaml::write_yaml(y, target)`. Round-tripping demo-301's own
  `workflows/1_mappings/LB.yaml` — read, set one `source_col`, write — takes it from 80 lines to
  70 and from **13 comment lines to 0**. The destroyed comment is the one explaining that
  `toxgrg_nsv` must be cast to character or the Grade 3+ KRI's `WHERE toxgrg_nsv IN ('3','4')`
  matches nothing. The `CAST` step survives; the reason it exists does not.
- **M-d — the join that returns nothing**, on demo-301's real `input/`. Build `USUBJID` as
  `studyid-subjid` (`AA-AA-000-0000-S384`) while the lab file keeps the bare `subjid` (`S1000`):
  overlap **0 of 765**, and the inner join the study actually runs returns **0 rows** from 57,200.
  Strip the constant prefix and it is 765 of 765, all 57,200 rows. Independently reproduces the
  guided-setup session's M3b and the convention session's blocking finding, from a third angle.
- **M-e — what that costs.** All 42 consumers in `demo-301/workflows/` (30 metric + 12 module)
  resolved through their `Mapped_*` dependencies: `Raw_SUBJ` feeds **36 of 42**; `Raw_LB` feeds 9
  (`cou0005 kri0005 saf0001 hep_explorer safety_delta_delta safety_histogram
  safety_outlier_explorer safety_results_over_time safety_shift_plot`); `Raw_AE` feeds 7
  (`cou0001 cou0002 kri0001 kri0002 saf0003 ae_explorer ae_timelines`). **`srs0001` is the only
  consumer declaring no `spec:` at all** — it does not fail with the others, it re-normalises over
  whatever ran. One wrong identifier convention silently zeroes **16 of 42 displays** and moves the
  site risk score's denominator.

- **M-f — the engine's own missing-column error cannot fire.** `ApplySpec()` given a two-column
  frame and a three-entry spec: `purrr::keep()` removes the undelivered entry before the query is
  built, so the guard that follows —
  `if (!all(sourceCols %in% names(dfSource))) LogMessage(level = "error", ...)` — tests a vector the
  offending entries have already been deleted from. Unreachable code. Every condition captured with
  `withCallingHandlers`: the only messages emitted are DuckDB connect, query complete, disconnect.
  This is not an argument against the package — dropping unmatched entries is what makes partial
  specs work — it is the argument for a surface that reports what the engine chose to ignore.

One finding beyond the four sessions' own: the analyte-vocabulary failure costs **three** displays,
not two. `hep_explorer.yaml` pins the four literals, `gsm.safety::Input_HysLaw` (`R/Input_HysLaw.R:67`)
carries the identical defaults and feeds `saf0001`, and `demo-301`'s own
`workflows/4_modules/safety_delta_delta.yaml:14` pins `measure_x: Alanine Aminotransferase` and
`measure_y: Aspartate Aminotransferase`.

## The fixture, and what is invented about it

The mockups load **HEP-204**, a constructed CRO delivery: `dm.xpt` (1,005 × 16), `ae_listing.csv`
(2,583 × 15), and the sixteen-analyte lab panel split across three vendors —
`lab_central.csv` (28,600 × 11, 8 analytes), `lab_specialty.csv` (7,150 × 10, TBILI and GGT in
µmol/L) and `lab_haem.csv` (21,450 × 9, six analytes and no reference range at all) — plus
`sites_20260824.csv` (150 × 9). 60,938 rows, 70 columns.

**The values and the row counts are real** — demo-301's own `input/` re-cut the way a CRO and an
EDC vendor would send it, and the arithmetic closes exactly (16 analytes × 3,575 = 57,200;
8 + 2 + 6 analytes = 28,600 + 7,150 + 21,450). **The packaging is invented**: the file names, the
vendor column names, and the identifier affixes. The delivered column names and the alias list
behind the bench's suggester were written by the same author on the same morning, so the hit rate
shown is an upper bound on a real one rather than a measurement of one — survivable only because
nothing on either mockup is ever applied without a click.

**Everything on the contract side is real**: the 42 consumers, the 45 target columns and their
declared types, the downstream consumer counts, the four silences, and the four literal strings
the hepatic displays demand.

## Where this is weakest

1. **It is two surfaces**, which is more than any single direction proposed. The staircase — read
   and diagnostic in v1, bench in v2 — is the mitigation, and it risks shipping a report that
   links to a room that does not exist.
2. **The whole product rests on one cost resolver**, built once, against one study's workflows. If
   it mis-attributes a column, every finding is ordered wrongly and no user can tell.
3. **`srs0001` is a hole none of this closes.** No spec, so no resolver can price it and no
   diagnostic can block on it. A printed warning is the best available, and it is not enough.
4. **Answering still writes machine-generated SQL into a clinical document.** `source_col:` is one
   line; prefix strips, value recoding and derived grades have no declarative home and arrive as
   generated `RunQuery` steps.
5. **Nothing here has met a real sponsor delivery.** Every fixture is demo-301's data re-cut. A
   real measurement of an invented study is the strongest claim available, and it is not the same
   as a claim about a real one.

## Decisions awaiting @jwildfire

`R1` two surfaces in v1 or a staircase · `R2` does a blocking finding refuse `og_run()` ·
`R3` does answering write into the study's own mapping YAML · `R4` do answers replay across
transfers, and at what scope · `R5` which formats the door accepts on day one · `R6` do lossy
substitutions get carried onto the study site.

## Design notes

- Base tokens are the obot report family's (executive overview 2026-07-21, goal atlas 2026-07-24,
  platform gap analysis 2026-07-25, and the four direction artifacts published the same night),
  with the same three-state light/dark contract: the full light palette on bare `:root`, the dark
  palette redefined under `prefers-color-scheme` guarded against an explicit light choice and again
  under `[data-theme="dark"]`.
- The product mockups render in open.gismo's own espresso theme (`site/src/style.css`: `#271810`
  rail, `#faf6f1` paper, `#c2410c` accent), fixed light in both modes, because a mock of a product
  should look like the product. Terminal frames are fixed dark for the same reason. Those tokens
  are namespaced `--og-*` / `--tm-*` and never leak into the report chrome.
- Every state mark carries a glyph **and** a written word. No colour-only state anywhere.
- One diagram, inline SVG, laid out vertically so it stays legible on a phone.
- Self-contained: system font stacks, no CDN, no network calls, no build step.
- Verified with an iframe probe at a real 390px viewport: `scrollWidth` 390 on all three pages,
  zero elements overflowing without their own scroll container — including every one of the flow's
  eight steps with all answers applied, and the bench with the grid expanded and a row open.
  That probe ran before the recommendation was hoisted into the standfirst and the two sections on
  `gsm.mapping` and the landscape were added. Those additions were **not** re-probed in a browser;
  they were checked structurally instead, and the check is stated so it can be discounted: they
  reuse only patterns the probe already cleared on this page (`.grid.two`, which collapses below
  17rem; `.tablewrap`, `overflow-x: auto`; `.term pre`, the same), and their longest unbreakable
  prose token is 24 characters against 33 already on the page, their longest terminal line 55
  against 60. Re-probing the published page is a five-minute job for the next session at a
  keyboard.
- The interactive paths were exercised in-browser, including the failure states: the ledger runs
  0/16/0/23 → 9/3/4/23 → 16/0/0/23 as answers land, the diagnostic refuses and then passes, and
  binding the trap column on the bench produces the zero-overlap refusal and a repair offer.

## Boundaries respected

- **Nothing was built.** No change to `open.gismo`, `demo-301`, `gsm.mapping`, `gsm.core`,
  `gsm.safety` or any other repository's source. No issue, no branch, no pull request, no merge.
- **No writes outside `jwildfire`.** `gsm.mapping` and `gsm.core` are Gilead-BioStats repositories
  and were read only. Every graft here is deliberately expressible with the two spec keys that
  already exist, so nothing is needed from them.
- **No other session's work was touched.** Only `reports/og-recommended-path-2026-08-27/` was
  created or modified.
- **Competitor research is read-only and public-source only** — product documentation, package
  reference indexes, user guides and conference papers. No demos, no trials, no vendor contact.
  *Seen on* means documented, never verified. The landscape work for this brief is the
  [companion session's](../open-gismo-data-loading-2026-08-27/landscape.html) and is cited rather
  than re-run; the page states in its own section what that survey establishes, what it corrected
  in our July matrix, and the five things it could not establish at all — including what elluminate
  and Medidata do when a mapping does not fit, which is the failure behaviour this whole design is
  about.

## The four directions this synthesises

- [The intake report](../og-intake-report-2026-08-27/) — the winner
- [Convention over configuration](../og-convention-loading-2026-08-27/) — grafts G1, G2, G3
- [The mapping bench](../og-mapping-bench-2026-08-27/) — grafts G4, G5, G6, G7
- [Guided setup](../og-guided-setup-2026-08-27/) — grafts G8, G9, G10

---

Drafted by Claude Code using Opus 5 for review by @jwildfire.
