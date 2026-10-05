# bio.viz and gsm.bio v0.2.0 — annotated demo

The review surface for the second releases of the biomarker charts objective (hub [#353](https://github.com/jwildfire/obot.roadmap/issues/353)): bio.viz v0.2.0, the JavaScript chart library, and gsm.bio v0.2.0, the R package. bio.viz v0.2.0 is released ([release](https://github.com/jwildfire/bio.viz/releases/tag/v0.2.0), tag at [`4440a43`](https://github.com/jwildfire/bio.viz/commit/4440a43), the merge of bio.viz [#77](https://github.com/jwildfire/bio.viz/pull/77)), and its stills are of the released site, `https://jwildfire.github.io/bio.viz/`, whose footer says it was built from `4440a43` and whose demo pages load `dist/bio.viz-0.2.0/`. gsm.bio v0.2.0 is the release candidate: its release prep (gsm.bio [#44](https://github.com/jwildfire/gsm.bio/issues/44), PR [#45](https://github.com/jwildfire/gsm.bio/pull/45)) merged to `dev` as [`d24f804`](https://github.com/jwildfire/gsm.bio/commit/d24f804), version `0.2.0`, and its widgets, batch run and gallery are from there. Its `inst/htmlwidgets/lib/SOURCE.json` records bio.viz `35ccfd3`, and the bundle it carries, `bio.viz-0.2.0/bio.viz.js`, has sha256 `bc979670…`, the same as `dist/bio.viz-0.2.0/bio.viz.js` at the `v0.2.0` tag. The pkgdown deploy for `d24f804` had succeeded, and the site's home page shows 0.2.0, before the gallery was captured.

The bio.viz site vendors safety.viz 1.9.0 and gsm.bio's statistics file from gsm.bio `514cbc3` (the site's footer still calls it "gsm.bio's, version 0.1.0", which is the release that file comes from); its sha256, `ca87eee2…`, is the same as the file gsm.bio `d24f804` ships at `inst/statistics/statistics.R`.

Requirements it walks: the cross-tabulation and the cut rule (hub [#359](https://github.com/jwildfire/obot.roadmap/issues/359)), stratified survival and the screen's hazard rows (hub [#360](https://github.com/jwildfire/obot.roadmap/issues/360)), results out of the browser (hub [#361](https://github.com/jwildfire/obot.roadmap/issues/361)) and results out of R (hub [#362](https://github.com/jwildfire/obot.roadmap/issues/362)).

Data: gsm.bio's synthetic study only: 200 made-up participants, 11,472 results, 12 biomarkers, 5 visits, and one event-free survival endpoint with 133 events. The three CSV files on the bio.viz dev site (`site/data/synthetic-study/`) and in gsm.bio (`inst/extdata/`) have the same sha256: results `68a370bc…`, participants `6d7d7f3b…`, outcomes `118343dc…`. No real participant appears anywhere.

## How it was made

Run in this order, from this folder, with a scratch folder `$S`:

1. `NODE_PATH=<safety.viz>/node_modules ONLY=1,2,3,4 node capture.mjs . $S` — Playwright, headless Chromium, real webR, against the released site `https://jwildfire.github.io/bio.viz/` (`BASE=https://jwildfire.github.io/bio.viz/dev/` for dev). Stills are 1.5× JPEG at a 1280 × 900 viewport, each of the chart's own frame (`.sv-main`) unless named otherwise. Section 4 saves the three downloads of the survival demo to `$S`, and the specifications the survival and cross-tabulation demos write (`spec-survival.json`, `spec-crosstab.json`, with `bio_viz_version` `0.2.0`, copied here). Each section was run on its own; two attempts timed out waiting for R's survival package or failed a fetch and were re-run.
2. `Rscript gsm-bio.R <gsm.bio checkout at d24f804> $S` — `devtools::load_all()` of gsm.bio dev; saves `Widget_StratifiedSurvival()` and `Widget_CrossTab()` with `htmlwidgets::saveWidget(selfcontained = TRUE)`, and runs `Run_Specifications()` on the two specifications the released bio.viz site wrote, unchanged, with `bAcrossBiomarkers = TRUE`, into `$S/batch`. Writes `gsm-bio.json` (the manifest, versions, time and file count) and `batch-listing.txt`, both copied here. The gsm.bio repository itself was not modified.
3. Move the two widget pages alone into `$S/widgets/` (so nothing beside them can be loaded), then `ONLY=5 node capture.mjs . $S`. It opens each widget from disk in a browser context with `offline: true` and records every request other than the page itself (`widgets_network_requests`: none). It reads the CRP RTF table back from the file's cells (`rtf_rows`), and captures the live gsm.bio gallery.
4. `sips` converts two files to the JPEGs in `media/`: the batch figure `$S/batch/01-stratified-survival-crp.png` → `batch-figure.jpg` (full size), and the downloaded PNG `$S/survival.png` → `downloaded-png.jpg` (resampled to 1,200 wide).
5. `Rscript desktop-r.R <gsm.bio>/inst/extdata desktop-r.json` — recomputes every number below from the three CSV files with base R and the survival package alone. No gsm.bio function is called; jsonlite only writes the answers. R 4.3.3, survival 3.5.8.
6. `node check-numbers.mjs` — formats each desktop-R value as the chart prints it and looks for it in the text the live page showed (`capture-numbers.json`): 61 checks, covering the cross-tabulation, both survival views, the screen row opened, all 12 screen rows and their order, and the two CSV downloads. 0 failed at the released site.

An RTF still was tried and dropped: macOS's text system (`textutil`) and pandoc both misread r2rtf's table rows, and Pages would not export unattended, so the page prints the RTF's cells as a table instead, read back from the file.

Captured 2026-10-05 from 00:59 UTC: sections 1–4 (the bio.viz stills) against the released site, section 5 at 01:01; the widgets and batch made at 01:01 from gsm.bio `d24f804` (`captured_at`, the run start of each section). Every chart footnote reads "Drawn on 2026-10-05", the UTC date.

History. The page was first captured on 2026-10-04 at bio.viz `f421a90` and gsm.bio `7200def`, before either release prep, with footnotes reading "bio.viz 0.1.0 with development changes" and "gsm.bio 0.1.0.9000". The bio.viz stills were then re-captured at 20:13 UTC against the dev site built from `8f188bf`, bio.viz's release prep. The released v0.2.0 adds the release review's fixes on top of `8f188bf` (bio.viz [#78](https://github.com/jwildfire/bio.viz/issues/78), changing the cross-tabulation, stratified survival and the statistics line), so the bio.viz stills were captured a third time against the released site, and the gsm.bio ones once, at `d24f804`. What changed from the first capture:
- the versions in every footnote, the PNG's text chunks (`Software` `bio.viz 0.2.0`) and the specification (`bio_viz_version` `0.2.0`), and the date, now 2026-10-05;
- the released cross-tabulation labels Fisher's odds ratio, "odds ratio (Non-responder / Responder, odds of ≤ 2.783 against > 2.783)", and its cut note adds that every participant the filters keep with a value is cut;
- the released survival chart carries an Experimental banner, so the PNG is 1,872 × 2,514 px (was 2,396) and 516,035 bytes;
- the batch is 2,088,211 bytes (was 2,099,921) and took 5.3 s; the widget files are 2,684,370 and 2,673,383 bytes.

Every number in `capture-numbers.json` came out the same each time, and `check-numbers.mjs` holds them to desktop R: 61 checks, 0 failed, at the released site. The 12 batch hazard ratios equal the screen's 12 rows again.

## Every number on the page, and where it came from

`capture-numbers.json` key → the live page or a saved file; `desktop-r.json` key → desktop R with base R and survival only. Every number was matched.

| Number on the page | Read from | Desktop R check |
|---|---|---|
| 200 participants, 12 biomarkers, 5 visits, one endpoint | the demos' subtitles and notes (`crosstab.titles`, `screen_hazard.titles`) | `sizes`, `efs` (200 with an outcome, 133 events) |
| Arm by Response 66/34, 60/40, chi-square p = 0.464 | `crosstab_default` | `crosstab_arm_response` (p 0.46399) |
| Response by CRP at its median 2.783: 67/59 (53.2%/46.8%), 33/41 (44.6%/55.4%), totals 126, 74, 100, 100 | `crosstab.table`, `.footnote_hint` | `crp_cut.median` 2.783 by `quantile()` type 7; `crosstab_response_crp.counts`, `.row_percent` |
| Chi-square with Yates p = 0.305; Fisher p = 0.305, odds ratio 1.408 (0.7617 to 2.619), non-responders over responders for the odds of being at or below the cut | `crosstab.statistics`, `.fisher` | `chisq_p` 0.305265, `fisher_p` 0.305261, `odds_ratio` 1.40843, `or_ci` 0.76174 to 2.61862 |
| The 59 non-responders above the cut, first BIO-008 | `crosstab_listing` (59 of 59 records; first ten ids) | `listing_nonresponder_high` (n 59, same first ten) |
| About 13 MB, and about 26 MB with the survival package | the demos' own waiting notes (`waiting_notes`) | — |
| Survival at 2.783: medians 23.32 (17.32 to not reached), 8.28 (5.24 to 9.71); HR 3.523 (2.43 to 5.107); p < 0.001 | `survival.statistics` | `survival_crp_median` (log-log `survfit()`, `coxph()`; log-rank p 2.0139e-12; HR 3.52297, 2.43029 to 5.10693) |
| At risk 100, 78, 63, 49, 41 and 100, 60, 37, 21, 8 | `survival.risk` | `survival_crp_median.at_risk` |
| Dragged to 4.34: 159/41; medians 14.17 (10.55 to 17.35), 6.97 (3.34 to 10.16); HR 2.153 (1.458 to 3.179); p < 0.001 | `survival_dragged` (cut from the handle's `aria-valuenow`, 4.34); while dragging, `survival_during_drag` | `survival_crp_dragged` (log-rank p 7.89e-5; HR 2.15273, 1.45786 to 3.17881) |
| Screen at Baseline: CRP 3.523 (2.43 to 5.107), p < 0.001 both, 100/100; LDH 1.257 (0.8943 to 1.767), p 0.187, BH 0.748; every other interval crosses 1 | `screen_hazard.rows` | `screen_hazard` (each biomarker cut at its own median; BH by `p.adjust()`; LDH p 0.18692, BH 0.74770) |
| IFN-gamma 99/101, two participants on the median | `screen_hazard.rows` (`99 / 101`) | `screen_hazard` IFN-gamma `on_cut` = 2 |
| The CRP row opens to 23.32 and 8.28, with Back | `screen_hazard_drill` | as above |
| PNG 1,872 × 2,514 px, title, footnotes and version in the file | `output.downloads.png` (`IHDR`, `pHYs` 7,559 px/m, `iTXt` Title, Description, Software) | — |
| Log-rank p 2.0138756978103445e-12 in the statistics CSV | `output.downloads.statistics.first` | `survival_crp_median.logrank_p` 2.01387569781021e-12 |
| Table CSV: 200 participants | `output.downloads.table.lines` = 201 (with its header) | `sizes.participants` |
| Specification: 37 settings, no filters; rebuilt chart writes the same | `output.specification.settings_count`, `.filters`, `output.round_trip_equal` = true | — |
| Survival widget 3.523, 23.32, 8.28, offline; cross-tab widget p = 0.305 | `widgets.widget-survival.statistics`, `widgets.widget-crosstab.statistics`, `widgets_network_requests` = [] | as above |
| Widget files about 2.7 MB | `ls`: 2,684,370 and 2,673,383 bytes | — |
| Gallery: 6 figures, 6 widgets | `gallery.figures`, `.widgets` | — |
| RTF table cells for CRP | `rtf_rows`, `rtf_paragraphs` | as for the survival numbers |
| Batch: 24 views written, 49 files, 2.1 MB, 5.3 s | `gsm-bio.json` (`manifest` all `written`, `batch_files` 49, `batch_bytes` 2,088,211, `batch_seconds` 5.3) and `batch-listing.txt` | — |
| The 12 batch survival hazard ratios equal the screen's 12 rows | `gsm-bio.json` manifest `statistics` against `screen_hazard.rows`: 12 of 12 equal | `screen_hazard` |
| The CRP batch cross-tab p = 0.305 | `gsm-bio.json` manifest | `batch_crosstab` CRP 0.30527 |
| 9 by 6 inches | the batch PNG, 1,350 × 900 px, `Run_Specifications()` defaults `nWidth = 9`, `nHeight = 6` | — |

## Stills

| File | Shows | Shows a version? |
|---|---|---|
| `crosstab.jpg` | Response by CRP cut at its median, R's chi-square, footnotes | bio.viz 0.2.0, the released site |
| `crosstab-listing.jpg` | The 59 participants of one cell listed (page footer text included) | bio.viz 0.2.0, the released site |
| `survival.jpg` | Stratified survival at the median | bio.viz 0.2.0, the released site |
| `survival-dragged.jpg` | The cut dragged to 4.34, R's answer for it | bio.viz 0.2.0, the released site |
| `screen-hazard.jpg` | The screen's hazard-ratio rows at Baseline | bio.viz 0.2.0, the released site |
| `screen-hazard-drill.jpg` | The CRP row opened in the survival chart | bio.viz 0.2.0, the released site |
| `footnotes.jpg` | The footnotes and the download buttons | bio.viz 0.2.0, the released site |
| `downloaded-png.jpg` | The PNG the button saved | bio.viz 0.2.0, the released site |
| `widget-survival.jpg` | The saved survival widget, offline | gsm.bio 0.2.0 at `d24f804`, carrying bio.viz 0.2.0 |
| `gallery.jpg` | The gsm.bio gallery's survival pair | gsm.bio 0.2.0, the deployed site (built in CI on R 4.6.1) |
| `batch-figure.jpg` | One batch figure | gsm.bio 0.2.0 at `d24f804` |

The page's RTF footnote caption and alt texts quote the versions and date as captured: bio.viz 0.2.0, gsm.bio 0.2.0, 2026-10-05.

Media total about 2 MB.

This page and README were drafted by Claude Code using Opus 5.5; the numbers were read by script, not typed from memory.
