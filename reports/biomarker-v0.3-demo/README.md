# bio.viz and gsm.bio v0.3.0 — annotated demo

The review surface for the third releases of the biomarker charts objective (hub [#353](https://github.com/jwildfire/obot.roadmap/issues/353)): bio.viz v0.3.0, the JavaScript chart library, and gsm.bio v0.3.0, the R package. Both are release candidates awaiting review; neither is released. The page's head carries a marked placeholder line (`<p class="pending" id="rc-links">`, under an `RC-LINKS` comment) for the two release-candidate pull requests, to be filled in when they are opened.

Requirements it walks: the group comparison's three levels (hub [#367](https://github.com/jwildfire/obot.roadmap/issues/367)) and the site laid out as safety.viz's (hub [#369](https://github.com/jwildfire/obot.roadmap/issues/369)), with Fisher's exact test of a small table (gsm.bio [#46](https://github.com/jwildfire/gsm.bio/issues/46), bio.viz [#104](https://github.com/jwildfire/bio.viz/issues/104)). The difference grid is paused (hub [#371](https://github.com/jwildfire/obot.roadmap/issues/371)) and the page says so in one line and shows nothing of it; gsm.bio's `Analyze_DifferenceGrid()`, which ships with nothing drawing it, is left off the page for the same reason.

## Where the captures are from

- bio.viz: the preview site of its release preparation, `https://jwildfire.github.io/bio.viz/pr/109/` (bio.viz [#109](https://github.com/jwildfire/bio.viz/pull/109), branch `108-release-prep` at [`cdfb8ac`](https://github.com/jwildfire/bio.viz/commit/cdfb8ac)). Its header reads v0.3.0, its footer says it was built from `cdfb8ac`, and every chart footnote reads "bio.viz 0.3.0". At capture the dev site still served 0.2.0, because that pull request had not merged. The page's try-it links go to the dev site (`…/bio.viz/dev/group-comparison/`, `…/dev/cross-tab/`, `…/dev/gallery/`), which carries the same build once it merges, and the page says they become the root paths once the release is tagged.
- gsm.bio: its release preparation, branch `59-release-prep` at [`99faa77`](https://github.com/jwildfire/gsm.bio/commit/99faa77) (gsm.bio [#60](https://github.com/jwildfire/gsm.bio/pull/60)), version 0.3.0, exported with `git archive` to a scratch folder and loaded with `devtools::load_all()`. The gsm.bio repository itself was not modified. Its `inst/htmlwidgets/lib/SOURCE.json` records bio.viz `cdfb8ac`, and its `inst/statistics/statistics.R` has sha256 `8c4d5b2f…`, the same as the bio.viz preview's `site/vendor/gsm.bio/statistics.R`.
- The live gsm.bio reference page, `https://jwildfire.github.io/gsm.bio/reference/Widget_GroupComparison.html`, built from gsm.bio `dev` (at `7496f4f` when captured): header 0.2.0.9000, widget footnote "bio.viz 0.2.0 with development changes … gsm.bio 0.2.0.9000". The page's caption says so.

Data: gsm.bio's synthetic study only: 200 made-up participants, 11,472 results, 12 biomarkers, 5 visits, none of them unscheduled. The CSV files at bio.viz `site/data/synthetic-study/` have sha256 results `68a370bc…` and participants `6d7d7f3b…`, the same as for the v0.2.0 page. No real participant appears anywhere.

## How it was made

Run in this order, from this folder, with a scratch folder `$S`:

1. `Rscript gsm-bio.R <gsm.bio at 99faa77> $S 99faa77…` — saves `Widget_GroupComparison()` (the help page's example, with `visit_adjustment = "holm"` added) with `htmlwidgets::saveWidget(selfcontained = TRUE)` into `$S/widgets/`, and calls `Analyze_GroupDifferenceBy()` on D-dimer by arm at each visit, unadjusted and with Holm. Writes `gsm-bio.json`, copied here.
2. `PLAYWRIGHT_PACKAGE=<bio.viz checkout>/package.json BASE=https://jwildfire.github.io/bio.viz/pr/109/ node capture.mjs . $S` — Playwright, headless Chromium, real webR. Stills are 1.5× JPEG at a 1280 × 900 viewport, each of the chart's own frame (`.sv-main`) unless named otherwise; the three phone stills are 2× at 390 × 844. Sections can be run one at a time or side by side (`ONLY=2`); each writes only its own keys to `capture-numbers.json`. `BASE` defaults to the dev site, for re-capturing once the release preparation has merged.
3. `Rscript desktop-r.R <folder of the study's CSV files> desktop-r.json` — recomputes every number below from the CSV files with base R alone (`t.test()`, `p.adjust()`, `fisher.test()`). No gsm.bio function is called; jsonlite only writes the answers. R 4.3.3.
4. `node check-numbers.mjs` — 194 checks, 0 failed. It formats each desktop-R value as the chart prints it and looks for it in the text the live page showed (`capture-numbers.json`); holds `Analyze_GroupDifferenceBy()`'s answer (`gsm-bio.json`) to desktop R to 1 part in 10^8; and looks for each printed number in `index.html`, so a number on the page that desktop R did not compute fails the check.

Two stills are of a second chart typed into the live page's console, and the page says so beside each: the made-up study has no unscheduled visit, so section 04 names Week 2 as one with `unscheduled_visit_values`; and the cross-tabulation demo's controls cut CRP at its median only, which leaves no small category, so section 05 cuts CRP at 9.5. The lines typed are in `capture.mjs` (`UNSCHEDULED`, `SMALL`), are recorded in `capture-numbers.json` (`unscheduled.typed`, `fisher_small.typed`) and are printed on the page from there. The study and every other setting are the demo's.

Captured 2026-10-06 from 17:56 UTC (`captured_at`, the run start of each section). Every chart footnote reads "Drawn on 2026-10-06".

## Every number on the page, and where it came from

`capture-numbers.json` key → the live page or the saved file; `desktop-r.json` key → desktop R with base R only. Every number was matched.

| Number on the page | Read from | Desktop R check |
|---|---|---|
| 200 participants, 12 biomarkers, 5 visits, none unscheduled | `tiles.titles`, `tiles.tiles` (12), `unscheduled.study_note` = 0 | `sizes`, `visits`, `unscheduled_by_default` = [] |
| The tiles ask R for nothing | `tiles.r_requests_before_a_tile_is_opened` = [], `tiles_means.r_requests` = [], `over_time_r_requests_before` = 0 and `…_after` = 8 | — |
| IL-6 over time: Placebo 100, 92, 95, 93, 92; Treatment 100, 93, 91, 95, 92; p = 0.221 then p < 0.001 four times | `over_time_il6.n`, `.test` | `il6` (`t.test()`; p 0.22142, then 4.8e-10, 2.2e-10, 5.5e-12, 3.5e-12) |
| About 13 MB, once | the demo's own waiting note (`over_time_waiting`) | — |
| D-dimer unadjusted 0.014, 0.017, 0.123, 0.529, 0.017 | `over_time_ddimer.test` | `ddimer` `p` |
| D-dimer Holm 0.071, 0.071, 0.246, 0.529, 0.071 | `over_time_ddimer_holm.test` (each cell's title gives both p-values) | `ddimer` `p_holm`, `p.adjust(, "holm")` |
| D-dimer Benjamini and Hochberg 0.028, 0.028, 0.154, 0.529, 0.028 | `over_time_ddimer_bh.test` | `ddimer` `p_bh`, `p.adjust(, "BH")` |
| IL-6 at Week 4: 186 of 200 drawn, 95 and 91, 13 with no result, 1 missing; p < 0.001; difference 1.544 (1.091 to 1.998) | `one_visit.notes`, `.statistics`, `.trail` | `il6` Week 4 (`difference` 1.54445, 1.09105 to 1.99786; `no_result` 13, `missing` 1) |
| Week 2 named unscheduled: four visits, p = 0.221 then p < 0.001 three times; five again when switched on | `unscheduled.note`, `.over_time`, `.switched_on` | `il6_without_week_2` |
| Response by CRP cut at 9.5: 125 and 1, 72 and 2; Fisher p = 0.556, odds ratio 3.45 (0.1767 to 206.2); "> 9.5 has 3"; chi-square not computed | `fisher_small.table`, `.statistics`, `.chisq` | `fisher_small` (`fisher.test()`; p 0.55630, odds ratio 3.44976, 0.17672 to 206.188) |
| 6 chart cards; no sideways scroll at 390 px | `site.charts`, `site.pictures`, `site.phone_scroll_width`, `tiles_phone`, `over_time_phone` | — |
| Saved widget: 12 tiles; Baseline not tested, p < 0.001 at four visits, unadjusted and after Holm; Week 4 difference 1.235 (0.844 to 1.626); no request made; Benjamini-Hochberg unavailable | `widget.*` (`network_requests` = [], `over_time`, `over_time_unadjusted`, `over_time_bh`, `one_visit`) | `il6_change` (Week 4 `difference` 1.23504, 0.84401 to 1.62608) |
| About 2.8 MB | `gsm-bio.json` `widget_bytes` 2,848,995 | — |
| R 4.3.3, gsm.bio 0.3.0 in the widget's footnote | `widget.over_time.foot` | `gsm-bio.json` `r_version`, `gsm_bio` |
| The `Analyze_GroupDifferenceBy()` table: by, n_1, n_2, estimate, p_unadjusted, p_value for five visits | `gsm-bio.json` `by_visit_holm.rows`, printed to four significant figures | `ddimer`, each of estimate, lower, upper, p and Holm's p within 1 part in 10^8 |
| The reference page's widget, one level down | `reference.over_time` | `il6_change` |

## Stills

| File | Shows | From |
|---|---|---|
| `tiles.jpg`, `tiles-phone.jpg` | The trend tiles, by arm | bio.viz 0.3.0, the preview site |
| `over-time.jpg`, `over-time-phone.jpg` | IL-6 across the visits, R's test under each | bio.viz 0.3.0, the preview site |
| `over-time-adjusted.jpg` | D-dimer as medians with quartiles, adjusted by Holm | bio.viz 0.3.0, the preview site |
| `one-visit.jpg` | IL-6 at Week 4 alone | bio.viz 0.3.0, the preview site |
| `unscheduled.jpg` | The note for a visit left out, on a second chart naming Week 2 | bio.viz 0.3.0, the preview site |
| `fisher-small.jpg` | Fisher's exact test of a table with 3 in a column, on a second chart cutting CRP at 9.5 | bio.viz 0.3.0, the preview site |
| `site-gallery.jpg`, `site-phone.jpg` | The gallery in safety.viz's layout | bio.viz 0.3.0, the preview site |
| `widget-over-time.jpg`, `widget-one-visit.jpg` | The saved widget, opened from disk with the network off | gsm.bio 0.3.0 at `99faa77`, carrying bio.viz 0.3.0 |
| `reference.jpg` | The live reference page's example widget | the deployed gsm.bio site, built from `dev` at `7496f4f` (0.2.0.9000) |

Media total about 1.8 MB.

Not captured: the biomarker screen back in safety.viz's demo app, each chart's own table styles, gsm.bio's static figure and table leaving unscheduled visits out, and gsm.bio's headless-browser test of a saved page. The page lists them, with their links, under "In the release, and not shown above".

This page and README were drafted by Claude Code using Opus 5.5; the numbers were read by script, not typed from memory.
