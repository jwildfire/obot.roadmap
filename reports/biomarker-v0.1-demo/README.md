# bio.viz and gsm.bio v0.1.0 — annotated demo

The review surface for the first two release candidates of the biomarker charts objective (hub [#353](https://github.com/jwildfire/obot.roadmap/issues/353)): bio.viz v0.1.0, the JavaScript chart library, and gsm.bio v0.1.0, the R package. v0.1.0 is everything on bio.viz `dev` at [`29ac722`](https://github.com/jwildfire/bio.viz/commit/29ac722) and gsm.bio `dev` at [`8720f73`](https://github.com/jwildfire/gsm.bio/commit/8720f73). The live bio.viz dev site was deployed from `29ac722` (its Pages run of 2026-10-03 03:50 UTC); the gsm.bio reference site from `8720f73`.

Requirements it walks: R in the browser (hub [#363](https://github.com/jwildfire/obot.roadmap/issues/363)), gsm.bio's statistics (hub [#364](https://github.com/jwildfire/obot.roadmap/issues/364)), the group comparison chart and its tests (hub [#355](https://github.com/jwildfire/obot.roadmap/issues/355), [#356](https://github.com/jwildfire/obot.roadmap/issues/356)), the association scatter and correlation matrix (hub [#357](https://github.com/jwildfire/obot.roadmap/issues/357)), the biomarker screen (hub [#358](https://github.com/jwildfire/obot.roadmap/issues/358)) and safety.viz's kit (hub [#354](https://github.com/jwildfire/obot.roadmap/issues/354)). The chart list (`BioViz.portfolio`) on bio.viz dev belongs to the demo-app hosting requirement (hub [#366](https://github.com/jwildfire/obot.roadmap/issues/366)), still in session.

Data: gsm.bio's synthetic study only (200 made-up participants, 11,472 results, 12 biomarkers, 5 visits), and on the R check page two tables cut from the public CDISC Pilot 01 data. No real participant appears anywhere.

## How it was made

- `capture.mjs` — Playwright, headless Chromium, real webR, against `https://jwildfire.github.io/bio.viz/dev/`. Run from a fresh `npm ci` clone of bio.viz (for its Playwright install): `node capture.mjs <out dir> <dir of saved widgets>`. `ONLY=1,3` runs only some sections and keeps the other sections' numbers. It writes the stills to `media/` (1.5× JPEG; 1440 × 900 desktop, 390 × 844 phone) and every number it read to `capture-numbers.json`. R's download is counted from the browser context's finished requests to webR's two hosts (`webr.r-wasm.org`, `repo.r-wasm.org`), as compressed response-body bytes (`request.sizes().responseBodySize`), each section in a fresh context with an empty cache.
- `desktop-r.R` — run with R 4.3.3 against gsm.bio installed from a fresh clone at `8720f73` (`R CMD INSTALL` into a scratch library): recomputes in desktop R every number the page prints, writing `desktop-r.json`, and saves the four widgets with `htmlwidgets::saveWidget(selfcontained = TRUE)` using each widget's own help-page example settings. The capture opens those four files from disk in a browser context with `offline: true` and records every http(s) request any of them makes (`widgets_network_requests`: none).

Captured 2026-10-03 between 04:14 and 04:20 UTC.

## Every number on the page, and where it came from

`capture-numbers.json` key → the live page; `desktop-r.json` key → desktop R. Every live number below was also matched against desktop R.

| Number on the page | Read from | Desktop R check |
|---|---|---|
| 12 biomarkers, "All 12 biomarkers are shown." | `gc_overview.count`, `.biomarkers` | `synthetic_sizes.biomarkers` = 12 |
| 200 participants, 5 visits | live notes "200 of 200 participants drawn" (`scatter.notes`) | `synthetic_sizes` |
| No R downloaded on the overview | `gc_overview.r_bytes_before_open` = 0 | — |
| 13.26 MB, 1.5 s for the first group-comparison test | `gc_il6.r_megabytes`, `.first_r_seconds` (1.513; 7 requests) | — |
| Week 2/4/8/12 differences, intervals, counts, p < 0.001 | `gc_il6.statistics` | `group_comparison_il6_change` (e.g. Week 4 1.23504, 0.844014 to 1.626076, p 3.2e-9, 95/91) |
| Planted difference 1.5; planted correlation 0.6 | gsm.bio `Synthetic_Truth` | `synthetic_truth` (−1.5 Treatment minus Placebo; 0.6) |
| r 0.6384 (0.5482 to 0.7139), n = 200; arms 0.5918, 0.6737; slope 0.3275 (0.2721 to 0.3828), intercept 2.028, R² 0.4075 | `scatter.statistics` | `correlation`, `fit` |
| Matrix cell 0.64; hover text 0.6384 (0.5482 to 0.7139), n = 200; 66 pairs | `matrix.upper_cell_text`, `.footnote_on_hover`, `.caption` | `matrix.rows` (IL-10/TNF-alpha 0.638382) |
| "No other pair at Baseline reaches 0.2 either way" | — | `matrix.rows`: next largest IL-6/LDH −0.1824 |
| Drilled scatter 0.6384, p < 0.001, Back button | `matrix_drill` | as above |
| Screen order, IL-6 0.9133 (0.6111 to 1.213), 95/91; IL-1beta 0.2589, p 0.080 / 0.481; 187 of 200 | `screen.order`, `.top_row`, `.frame`; IL-1beta from the `screen.jpg` still and the live page text | `screen.rows` |
| IL-6 row opens to 1.235 (0.844 to 1.626) | `screen_drill.statistics` | `group_comparison_il6_change["Week 4"]` |
| R check: same in 6 and 20 values; R 4.6.0 / survival 3.8.6 vs 4.3.3 / 3.5.8 | `r_check_now.agree`, `.session`, the page's own text | — |
| Recorded cost 26.22 MB / 3.568 s, 0.00 / 2.143 s, 0.00 / 0.004 s | `r_check_recorded.table` (the page's table, from bio.viz `site/r-check/measured.json`, recorded 2026-10-02) | — |
| This capture: 26.22 MB, 4.4 s, repeat 6 ms | `r_check_now.r_megabytes` (11 requests to webR's hosts; the page's own R source is not counted here), `.timings.firstResult` = 4372 ms, `.timings.repeat[0]` | — |
| 10 Mbit/s → about 21 seconds | the R check page's own footnote (`r_check_recorded.footnote`) | — |
| 7 statistics functions, 4 widgets | gsm.bio `NAMESPACE` at `8720f73` | — |
| Widgets "R 4.3.3 with gsm.bio 0.1.0 on 2026-10-03 04:19 UTC" | `widgets.*.provenance` | `r_version`, `gsm_bio` |
| Widget files about 2.6 to 2.7 MB | `ls` of the saved files: 2,637,447 to 2,730,775 bytes | — |
| Widget group comparison and screen drill-down 1.235 (0.844 to 1.626); scatter widget 0.6384 | `widgets.group-comparison.statistics`, `widgets.biomarker-screen.drill_statistics`, `widgets.association-scatter.statistics` | as above |
| Filtered widget view says statistics are unavailable | `widgets.group-comparison.filtered_statistics` | — |
| No widget network requests | `widgets_network_requests` = [] | — |
| Phone pages hold at 390 px | `phone_screen_scrollWidth`, `phone_scatter_scrollWidth` = 390 | — |

## Stills

| File | Shows |
|---|---|
| `gc-overview.jpg` | Group comparison overview, every biomarker at every visit, no R started |
| `gc-il6.jpg` | IL-6 change from baseline, R's Welch test under each visit |
| `scatter.jpg` | TNF-alpha vs IL-10 at Baseline, by arm, R's r and linear fits |
| `matrix.jpg` | Correlation matrix at Baseline, the planted cell hovered |
| `matrix-drill.jpg` | That cell opened as the association scatter, with the way back |
| `screen.jpg` | Biomarker screen, change at Week 4, IL-6 on top |
| `screen-drill.jpg` | The IL-6 row opened as the group comparison, with the way back |
| `r-check.jpg` | R check page after starting R: same answers as desktop R |
| `phone-screen.jpg`, `phone-scatter.jpg` | The screen and the scatter at 390 px |
| `widget-group-comparison.jpg` | gsm.bio's saved group comparison widget, offline, with its provenance line |
| `widget-unavailable.jpg` | One panel of that widget after a filter: statistics unavailable |
| `widget-screen-drill.jpg` | gsm.bio's saved screen widget, offline, after clicking IL-6 |

Media total about 2.2 MB.

This page and README were drafted by Claude Code using Opus 5.5; the numbers were read by script, not typed from memory.
