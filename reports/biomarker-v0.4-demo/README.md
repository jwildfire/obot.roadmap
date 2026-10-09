# bio.viz and gsm.bio v0.4.0 — annotated demo

The demo page for the fourth releases of the biomarker charts objective (hub [#353](https://github.com/jwildfire/obot.roadmap/issues/353)): gsm.bio v0.4.0, the R package, and bio.viz v0.4.0, the JavaScript chart library. They are release candidates, opened together: gsm.bio [#83](https://github.com/jwildfire/gsm.bio/pull/83) and bio.viz [#126](https://github.com/jwildfire/bio.viz/pull/126). The page is also where the detail behind the two releases' short notes lives (hub developer guidelines, Releases).

Requirement it walks: an R app for the biomarker charts (hub [#399](https://github.com/jwildfire/obot.roadmap/issues/399)): the six charts as one Shiny app, a reader's own files, every statistic from the server's R, and the article on Posit Connect.

## What the page cannot show

- The app has no public address. The stills are of the app run on a laptop, and the page's try-it steps are R commands a reader runs on their own machine.
- No one has deployed the app to a Posit Connect server. The page says so in its head and in section 05, with what stands in for a deployment.

## Where the captures are from

- gsm.bio: its release preparation merged to `dev`, at [`2e33634`](https://github.com/jwildfire/gsm.bio/commit/2e33634b8763ddfb6a6b06031710de2ae2c39521) (gsm.bio [#82](https://github.com/jwildfire/gsm.bio/pull/82)), version 0.4.0, in a worktree of the repository, loaded with `devtools::load_all()`. The stills were taken at that pull request's head, `ab9aed6`, which `capture-numbers.json` records; the merge is a squash of it and holds the same files (both trees are `a157c5d`). Its `inst/htmlwidgets/lib/SOURCE.json` records bio.viz `1f0390f`.
- bio.viz: the bundle gsm.bio carries, version 0.4.0, from bio.viz `dev` at [`1f0390f`](https://github.com/jwildfire/bio.viz/commit/1f0390fc9c3ddb2015383c56db42dc4efd130afd), its release preparation's merge (bio.viz [#125](https://github.com/jwildfire/bio.viz/pull/125)). Every chart footnote in the stills reads "bio.viz 0.4.0".
- R 4.3.3 on macOS, an Apple laptop. The line under each chart names that R, because it is the one that answered.

Data: gsm.bio's synthetic study only: 200 made-up participants, 11,472 results, 12 biomarkers, 5 visits. The file loaded in section 03 is the same results table written as SAS transport with three columns renamed (`SUBJID`, `LBTEST`, `LBSTRESN`), and the participants table as `.csv`. No real participant appears anywhere.

## How it was made

From this folder:

1. `Rscript capture.R <gsm.bio checkout> .` — runs the app in a second R session with gsm.bio's own test helper, opens it in a headless Chrome with chromote, and writes the eleven stills into `media/` and what it read into `capture-numbers.json`.
   - The page shows eight of the eleven. The other three are beside it in `media/`: the stratified survival chart (`survival.jpg`), a file chosen before the button is pressed (`data-asked.jpg`) and the Data view after the charts are drawn on the file (`data-applied.jpg`).
   - Desktop stills are of a 1280 by 900 window at twice its pixels; the phone still is 390 by 844 at twice its pixels.
   - The saved widget in section 02 is `Widget_GroupComparison()` on IL-6 at Week 4 by arm, saved with `htmlwidgets::saveWidget(selfcontained = TRUE)` and opened from the file.
2. The same script holds each statistic it read to R called with no page between. It makes the widget of the same settings in its own session, whose stored results are `Analyze_*()` answers for the rows the chart draws, finds the request the page made among them, and stops unless the two answers are equal to 1 part in 10^14. Four are held: IL-6 across the visits, IL-6 at Week 4 by Welch's test and by the rank-sum test, and IL-6 across the visits on the loaded file. It also stops unless the loaded file gives the answer the packaged study gives.
3. The times in section 07 are from gsm.bio's own `data-raw/app-timing.R`, run on the same machine on 2026-10-08 (gsm.bio [#78](https://github.com/jwildfire/gsm.bio/pull/78) quotes the run).

## Numbers on the page, and where each is from

- p = 0.221 at Baseline and p < 0.001 at the four later visits; a difference in means of 1.544 (1.091 to 1.998) on 95 and 91 participants; the rank-sum test's p < 0.001: `capture-numbers.json`, keys `over_time`, `one_visit` and `rank_sum`, each read from the page and held as above.
- "lb.xpt: 11,472 rows, 6 columns", the sentence for a table half said, and "Drawn on lb.xpt, dm.csv, loaded in this session.": key `own_file`.
- 62 packages in the manifest: the run printed in gsm.bio's article, `vignettes/articles/app-manifest.txt`.
- The times and message sizes of section 07: the run quoted in gsm.bio #78.
- Test counts in section 08: each release's notes.

## Assumptions

- The app's look is a first version, released as it is by @jwildfire's choice of 2026-10-08 ("Release now, design next"). The stills show that look. The redesign is a requirement of its own (hub [#400](https://github.com/jwildfire/obot.roadmap/issues/400)).
- The page is written before the releases are tagged. Its install line names the `dev` branch until then, and its status line names the two release candidates.
- The phone still was checked to have no sideways scroll: the page was 390 pixels wide in a 390-pixel window (`capture-numbers.json`, key `phone`).

---
This page was drafted by Claude Code using Opus 5.5.
