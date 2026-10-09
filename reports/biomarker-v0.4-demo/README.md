# bio.viz and gsm.bio v0.4.0 — annotated demo

The demo page for the fourth releases of the biomarker charts objective (hub [#353](https://github.com/jwildfire/obot.roadmap/issues/353)): gsm.bio v0.4.0, the R package, and bio.viz v0.4.0, the JavaScript chart library. They are release candidates, opened together: gsm.bio [#83](https://github.com/jwildfire/gsm.bio/pull/83) and bio.viz [#126](https://github.com/jwildfire/bio.viz/pull/126). The page is also where the detail behind the two releases' short notes lives (hub developer guidelines, Releases).

Requirements it walks:

- An R app for the biomarker charts (hub [#399](https://github.com/jwildfire/obot.roadmap/issues/399)): the six charts as one Shiny app, a reader's own files, every statistic from the server's R, and the article on Posit Connect.
- The biomarker app as a web app (hub [#400](https://github.com/jwildfire/obot.roadmap/issues/400)): the app's header, navigation and Data page, designed. Section 04 is the proof its definition of done asks for: the header and each state of the Data page at 1280 and 390 pixels, beside the option as mocked up on the [options page](https://jwildfire.github.io/obot.roadmap/reports/gsm-bio-app-design-2026-10-08/).

## What the page cannot show

- The app has no public address. The stills are of the app run on a laptop, and the page's try-it steps are R commands a reader runs on their own machine.
- No one has deployed the app to a Posit Connect server. The page says so in its head and in section 06, with what stands in for a deployment.
- Any browser but Chrome, or a real phone: the phone stills are of a 390-pixel window in a headless Chrome.

## Where the captures are from

- gsm.bio: `dev` at [`4543f9e`](https://github.com/jwildfire/gsm.bio/commit/4543f9eccb2df78d279ac28601034373f849e1f3), the head of its release candidate, version 0.4.0, in a worktree of the repository, loaded with `devtools::load_all()`. `capture-numbers.json` records the commit. Its `inst/htmlwidgets/lib/SOURCE.json` records bio.viz `066bbec`.
- bio.viz: the bundle gsm.bio carries, version 0.4.0, from bio.viz `dev` at [`066bbec`](https://github.com/jwildfire/bio.viz/commit/066bbec7795c5fe07aa1c16d5ab4fcecb5682d5d), the head of its release candidate. Every chart footnote in the stills reads "bio.viz 0.4.0".
- R 4.3.3 on macOS, an Apple laptop. The line under each chart names that R, because it is the one that answered.
- The mockups in section 04 (`media/mock-a-*.jpg`): stills of option A's five mockups on the published options page, taken with Playwright in a 1360-pixel window at twice its pixels. They are of the page as published on 2026-10-08, and nothing in them was redrawn.

Data: gsm.bio's synthetic study only: 200 made-up participants, 11,472 results, 12 biomarkers, 5 visits. The file loaded in section 03 is the same results table written as SAS transport with three columns renamed (`SUBJID`, `LBTEST`, `LBSTRESN`), and the participants table as `.csv`. The file R cannot read, `adtte.xpt`, is one line of text under a transport file's name. No real participant appears anywhere.

## How it was made

From this folder:

1. `Rscript capture.R <gsm.bio checkout> .` — runs the app in a second R session with gsm.bio's own test helper, opens it in a headless Chrome with chromote, and writes fifteen stills into `media/` and what it read into `capture-numbers.json`.
   - The page shows thirteen of the fifteen. The other two are beside it in `media/`: the stratified survival chart (`survival.jpg`) and a file chosen before the button is pressed (`data-asked.jpg`).
   - Desktop stills are of a 1280 by 900 window at twice its pixels; the four phone stills are 390 by 844 at twice its pixels, each of the whole page.
   - The saved widget in section 02 is `Widget_GroupComparison()` on IL-6 at Week 4 by arm, saved with `htmlwidgets::saveWidget(selfcontained = TRUE)` and opened from the file.
2. The same script holds each statistic it read to R called with no page between. It makes the widget of the same settings in its own session, whose stored results are `Analyze_*()` answers for the rows the chart draws, finds the request the page made among them, and stops unless the two answers are equal to 1 part in 10^14. Four are held: IL-6 across the visits, IL-6 at Week 4 by Welch's test and by the rank-sum test, and IL-6 across the visits on the loaded file. It also stops unless the loaded file gives the answer the packaged study gives.
3. The script stops when a page is wider than its window at 390 pixels: the app as it opens, and the Data page as it opens, with files chosen, and with the charts drawn (`capture-numbers.json`, keys `phone` and `phone_data`).
4. The times in section 08 are from gsm.bio's own `data-raw/app-timing.R`, run on the same machine on 2026-10-08 at gsm.bio 0.3.0.9000, before the redesign (gsm.bio [#78](https://github.com/jwildfire/gsm.bio/pull/78) quotes the run). They were not measured again at the release.
5. `media/build/` holds the before and after stills the two redesign pull requests link to (gsm.bio [#92](https://github.com/jwildfire/gsm.bio/pull/92) and [#95](https://github.com/jwildfire/gsm.bio/pull/95)), taken by their builder on the branches. The page does not use them.

## Numbers on the page, and where each is from

- p = 0.221 at Baseline and p < 0.001 at the four later visits; a difference in means of 1.544 (1.091 to 1.998) on 95 and 91 participants; the rank-sum test's p < 0.001: `capture-numbers.json`, keys `over_time`, `one_visit` and `rank_sum`, each read from the page and held as above.
- The chip's words, "No statistic was asked of R." under the tiles, and the footer line: key `opens`.
- "lb.xpt: 11,472 rows, 6 columns", the tags, "These files: lb.xpt (results), dm.csv (participants).", R's sentence for a table half said, "3 of 6 columns still to say", and "The charts are drawn on lb.xpt, dm.csv, loaded in this session. 5 of the 6 charts are ready.": key `own_file`.
- 62 packages in the manifest: the run printed in gsm.bio's article, `vignettes/articles/app-manifest.txt`.
- The times and message sizes of section 08: the run quoted in gsm.bio #78.
- Test counts in section 09: each release's notes.

## Assumptions

- The page is written before the releases are tagged. Its install line names the `dev` branch until then, and its status line names the two release candidates.
- The quotes of @jwildfire in section 04 are his words in the session of 2026-10-08 and 2026-10-09, as the requirement (hub #400) records them.

---
This page was drafted by Claude Code using Opus 5.5.
