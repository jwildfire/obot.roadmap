# safety.viz v1.10.0 — annotated demo

Walkthrough of what v1.10.0 adds, built as the review surface for the safety.viz v1.10.0 release candidate. v1.10.0 is everything on safety.viz `dev` after release prep (safety.viz [#256](https://github.com/jwildfire/safety.viz/pull/256), for [#255](https://github.com/jwildfire/safety.viz/issues/255)). The page names the commit it was captured from.

The sections cover:

- the RBQM tab on the study the app opens with (hub [#398](https://github.com/jwildfire/obot.roadmap/issues/398); safety.viz [#253](https://github.com/jwildfire/safety.viz/issues/253));
- all eight metrics on raw files in gsm's format, the RBQM study or a reader's own (hub [#374](https://github.com/jwildfire/obot.roadmap/issues/374); safety.viz [#233](https://github.com/jwildfire/safety.viz/issues/233) to [#236](https://github.com/jwildfire/safety.viz/issues/236));
- whose code runs in R, what starting R downloads and what stays in the browser (hub [#373](https://github.com/jwildfire/obot.roadmap/issues/373));
- the footnote under each chart (safety.viz [#246](https://github.com/jwildfire/safety.viz/issues/246)) and the histogram's two removed settings (safety.viz [#188](https://github.com/jwildfire/safety.viz/issues/188)).

Data: the app's pilot demo study, `site/data/` in safety.viz, is 254 participants from the public CDISC pilot study. The RBQM study, `site/data/rbqm/`, is nine raw files in gsm's format for one synthetic study of 765 enrolled participants and 150 sites, copied from the forkable demo-301 study; safety.viz's `docs/DATA_SOURCES.md` records the commit and each file's checksum. No real participant appears.

## How it was made

- `capture.mjs`: Playwright, headless Chromium, real R in the browser, against `https://jwildfire.github.io/safety.viz/dev/`. Run from the root of an `npm ci` checkout of safety.viz, for its Playwright install and the RBQM study's files: `node <path>/capture.mjs <out dir>`. `ONLY=1,3` runs some sections and keeps the others' numbers.
- Stills are 1.5× JPEG at 1280 × 800, and 390 × 844 for the phone stills. `rbqm-pilot.jpg` is the whole page.
- Every section starts in a fresh browser context with an empty cache.
- R's download is counted from the context's finished requests, as compressed response-body bytes, from the press of Start R: requests to webr.r-wasm.org, to repo.r-wasm.org, and to the page's own address for gsm's packages. A megabyte is 1,048,576 bytes, as in safety.viz's own measure of the download (browser test APP-RBQM-021).
- The own-files step chooses `Raw_SUBJ.csv` and `Raw_AE.csv` from the checkout's `site/data/rbqm/` and a two-line `site_notes.csv` the script writes.
- The histogram step opens the histogram's own page on the dev site and gives the bundle that page loads both removed settings, on that page's example labs file grouped by treatment group, and listens to the console.
- The script holds what the page prints to what the live page shows, and exits 1 when a check fails. Every check held on the capture the page was built from; `capture-numbers.json` lists them under `checks`.

The page's measured values (megabytes, seconds, versions, the quoted sentences) are filled in from `capture-numbers.json` when the page is assembled, so they are the capture's and not typed by hand.

## Every number on the page, and where it came from

| On the page | Read from (`capture-numbers.json`) |
|---|---|
| The sentence before the press, and "supports 3 of 8 metrics" | `pilot_before`, `pilot_summary` |
| Nothing asked of R's addresses before the press | `r_requests_before_press` = 0 |
| What each file of the study gives, and each metric's line | `pilot_gives`, `pilot_support` |
| "R ran 3 of 8 metrics…", the versions, gsm.kri 1.7.0 and gsm.viz 2.4.1 | `pilot_done` |
| 17 sites; columns AE, SAE, SDSC; site 705 first with 16 enrolled and 1 red flag | `pilot_overview` |
| "Screen Failure Rate needs Raw_ENROLL.csv, which is not loaded." | `pilot_choices`, `pilot_why` |
| The site not mapped: "…which no column of adsl.csv is mapped to." | `unmapped_why` |
| Megabytes by address, and seconds to the first result | `megabytes`, `pilot_seconds_to_first_result` |
| The RBQM study: 8 of 8 on 9 files, 150 sites, eight columns | `study_done`, `study_overview` |
| Own files: 3 loaded, 2 placed, 2 of 8; the file not recognised | `own_summary`, `own_files` |
| No sideways scroll at 390 pixels | `phone_scroll_before`, `phone_scroll_after` |
| The footnote's words and links | `footnote`, `footnote_links` |
| The histogram: no setting kept, no p-value, the console's two lines | `histogram`, `histogram_warnings` |

Numbers the page states that the capture does not read are safety.viz's own tests':

- 1,186 site rows on the RBQM study and 51 on the pilot study equal desktop R's to eight decimal places: safety.viz browser tests APP-RBQM-021 and APP-RBQM-047.
- 1,122 adverse events, 3 serious, 144 of 254 participants who left early: safety.viz unit test APP-RBQM-044.
- 765 enrolled participants and 150 sites in the RBQM study: safety.viz unit test APP-RBQM-005.
- Every request held to a read at three addresses: safety.viz browser tests APP-RBQM-030, APP-RBQM-039 and APP-RBQM-047.

## Stills

| File | Shows |
|---|---|
| `rbqm-before.jpg` | The RBQM tab on the pilot study before Start R is pressed |
| `rbqm-supports.jpg` | The list of what the study's files give and which metrics they support |
| `rbqm-starting.jpg` | The tab while R installs its packages |
| `rbqm-pilot.jpg` | The whole page after the run: overview, metric buttons, both charts |
| `rbqm-pilot-charts.jpg`, `rbqm-pilot-sdsc.jpg` | The adverse event rate's charts, and the study discontinuation rate's |
| `rbqm-did-not-run.jpg` | A metric that did not run, with R's sentence |
| `rbqm-not-mapped.jpg` | The tab after the site's row of the mapping was cleared |
| `rbqm-study-data.jpg`, `rbqm-study.jpg` | The RBQM study on the Data tab, and its eight metrics |
| `rbqm-own-files.jpg` | Three files chosen from disk, two placed |
| `phone-before.jpg`, `phone-overview.jpg`, `phone-charts.jpg` | The tab at 390 pixels |
| `footnote.jpg` | The footnote under the hepatic explorer |
| `histogram-no-p.jpg` | The histogram given both removed settings, with no p-value |

---
This page was drafted by Claude Code using Opus 5.5.
