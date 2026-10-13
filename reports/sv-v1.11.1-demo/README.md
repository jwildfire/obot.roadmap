# safety.viz v1.11.1 — annotated demo

The review page for the safety.viz v1.11.1 release candidate: what the release changes in the demo app, shown on the live site beside release 1.11.0, with steps to try and four things that are @jwildfire's to rule on at the review. The release is a patch under the requirement for a standard note where R can be started (hub [#420](https://github.com/jwildfire/obot.roadmap/issues/420)). It adds no chart and no metric, and nothing the app computes changes.

The sections follow the changes:

- the note at the top of a biomarker chart's card, blue or amber (safety.viz task [#322](https://github.com/jwildfire/safety.viz/issues/322), pull request [#325](https://github.com/jwildfire/safety.viz/pull/325));
- the note while R starts, when R did not start, and once R is ready;
- the blue note closed with its cross;
- the same note on the RBQM tab;
- one note style across the app, and the line on first open removed (safety.viz task [#321](https://github.com/jwildfire/safety.viz/issues/321), pull request [#324](https://github.com/jwildfire/safety.viz/pull/324));
- what did not change;
- four things for his ruling at the review.

The page was built from the approved design page, [a standard note where R can be started](https://jwildfire.github.io/obot.roadmap/reports/sv-v1.11.1-r-note-design-2026-10-13/).

Data: the app's pilot study is 254 participants from the public CDISC pilot study; its labs file also carries 110 synthetic liver and kidney participants, as the app's Data tab says. The demo study "Liver cohort, labs only", used for the chart with no file loaded, is synthetic. No real participant appears.

## The parts

| File | What it is |
|---|---|
| `capture.cjs` | Takes the stills and reads the live pages. Holds each sentence the page quotes to what the live site shows, and exits 1 when a check fails. |
| `capture.json` | Everything `capture.cjs` read: the sentences, each note's kind and colour, each check and whether it held, where each numbered marker sits on its still, and each still's size. |
| `build.cjs` | Writes `index.html` from `capture.json`. No sentence quoted from the app is typed into the page by hand. |
| `page.css` | The page's styles, taken from the v1.11.0 demo page. `build.cjs` puts them inline. |
| `index.html` | The page. Self-contained: inline CSS, no script, no font or asset from outside but its own stills. |
| `media/` | The stills. |

## How it was made

- `capture.cjs`: Playwright, headless Chromium, real R in the browser. Release 1.11.1 is the dev site, `https://jwildfire.github.io/safety.viz/dev/demo/`. Release 1.11.0, for the "before" of each pair, is the released site, `https://jwildfire.github.io/safety.viz/demo/`.
- Run it from the root of an `npm ci` checkout of safety.viz, for its Playwright: `node <path>/capture.cjs`, then `node <path>/build.cjs`. `ONLY=blue,rbqm` runs some sections and keeps the others' reads. `BASE` and `BEFORE` point it at other sites.
- Before it starts, the script waits for the site under review to show the note on a biomarker chart: up to 20 minutes (`WAIT_MINUTES`), looking once a minute. If it never does, the script uses a second site (`FALLBACK`, by default the preview of pull request 325) and records which in `capture.json` under `site`.
- Once release 1.11.1 is on the released site there is no release 1.11.0 left to capture. The script sees the note there, says so, and keeps the release 1.11.0 stills and reads it has. To capture the released site as "after" then, run with `BASE=https://jwildfire.github.io/safety.viz/demo/`.
- Stills are 1.5× JPEG at 1,280 × 800, and 390 × 844 for a phone. The strips of the six views are the top 268 pixels of the page. The stills of the note alone are the note at 390 pixels wide, where its sentence is large enough to read on the page.
- Each numbered marker on a still is placed from the box of the element it points at, measured when the still was taken. `build.cjs` stops if a still's markers and its legend do not match one for one, or if a still on disk is not on the page.
- Every state starts in a fresh browser context with an empty cache.
- R that is starting is made by holding every request to an address containing `r-wasm.org` for 30 seconds in one browser context. R that does not start is made by refusing those requests. One more check switches the browser offline after the page has loaded, which is what the page's try-it step asks a reader to do.
- R that is ready is real: R downloaded and run in the browser, on the Association scatter and on the RBQM tab's pilot study.
- The release 1.11.0 stills, other than the first screen's, are taken with the line on first open closed, so each shows only its own change.
- The chart with no file loaded is the Adverse Event Explorer with the demo study "Liver cohort, labs only" chosen on the Data tab. The chart with a column not mapped is the Histogram after the Result column of the labs file is set to "not mapped" on the Data tab.
- The commit the `dev` branch stood at is read from GitHub's public API with no token. The script writes nothing to GitHub.

## What on the page came from where

| On the page | Read from (`capture.json`) |
|---|---|
| The site captured, the date, the commit, the app's version line | `site`, `first.version` |
| The line on first open, its colour, where the first chart starts | `first_before`, `first` |
| The app's status label and its count of charts on each rung; the Data tab's note on the pilot study | `first.status_label`, `first.status_counts`, `first.study_note` |
| The blue note on each of three charts, the chart's own line, the control, the chart's footer, the count of requests to R's addresses | `blue`, and `blue_before` for release 1.11.0 |
| The amber note on each of two charts | `amber`, `amber_before` |
| The strips of the six views and of two metric pages | `views` |
| The note, the control and the chart's line while R starts | `starting` |
| The same when R did not start, the reason behind Why, and with the browser offline | `failed` |
| No note, the chip and R's test once R is ready; the same test on the released site | `ready`, `ready_before` |
| The blue note closed: the chart's line, the other charts, another tab, a reload, and R then not starting | `closed` |
| The RBQM tab's note before R, while R starts, when R did not start, and after a run | `rbqm`, `rbqm_starting`, `rbqm_failed`, `rbqm_done`, and `rbqm_before`, `rbqm_failed_before`, `rbqm_done_before` for release 1.11.0 |
| The participant profile's sentence | `profile`, `profile_before` |
| A chart with no file loaded, and with a column not mapped | `cannot`, `cannot_before`, `liver` |
| The notes at 390 pixels, their widths and the page's | `phone` |

Things the page states that the capture does not read:

- A chart that was ready and then failed keeps its red card: the standard note's pull request says so, and requirement row APP-NOTE-002 records it (safety.viz [#324](https://github.com/jwildfire/safety.viz/pull/324)). The capture has no way to make a chart fail.
- The design page drew seconds in the note while R starts, "13 MB · 4 s": the design page's own mockup. The rule that keeps one count on the page is requirement row APP-RBQM-019 in safety.viz `requirements/demo-app.md`.
- No file of R's changed and no chart's code changed: the release notes (safety.viz `NEWS.md`). The capture reads only that the chart's footer still names bio.viz 0.3.0, and that R's test on two charts and the RBQM tab's outcome line and first row are the released site's.
- The browser tests named by requirement rows: the two pull requests' own accounts.
- That the requirement is not yet linked under the demo-ready objective (hub [#401](https://github.com/jwildfire/obot.roadmap/issues/401)): the session that asked for this page.
- 254 participants and 110 synthetic participants: the app's Data tab, which the capture reads as one sentence and checks.

## Assumptions and limits

- The dev site carries no commit of its own on the page. The footer names the commit the `dev` branch stood at when the capture ran, read from GitHub; a deploy that was still under way would make the two differ.
- The dev site's footer read "safety.viz 1.11.0" when captured: the version number moves with the release preparation task (safety.viz [#323](https://github.com/jwildfire/safety.viz/issues/323)). The page says so, and says nothing once the footer reads 1.11.1.
- The "before" of each pair is the released site on the day of capture, which was release 1.11.0.
- The release candidate's link is a placeholder near the top of the page, `<!-- RC-LINK -->`, in `build.cjs`.
- The sentences in the notes are drafts, his to correct at the release candidate. After a correction, run the capture and the build again: the checks name the old words and will fail until their expected text, at the top of `capture.cjs`, is changed.
- Seconds are one run's, over a home connection.
- Light only, as the v1.11.0 demo page is.

## Stills

| File | Shows |
|---|---|
| `first-1110.jpg`, `first.jpg` | The app as it opens, in release 1.11.0 and release 1.11.1 |
| `blue-1110.jpg`, `blue.jpg` | The Association scatter before R is started |
| `amber-1110.jpg`, `amber.jpg` | The Correlation matrix before R is started |
| `view-*.jpg` | The top of each of the five biomarker charts, the RBQM tab's overview and two of its metric pages |
| `starting.jpg`, `failed.jpg`, `failed-why.jpg` | The Association scatter while R starts and when R did not start, and the reason behind Why |
| `ready.jpg`, `ready-screen.jpg` | The Association scatter and the Biomarker screen with R ready |
| `closed.jpg` | The Association scatter with the blue note closed |
| `rbqm-1110.jpg`, `rbqm.jpg` | The RBQM tab before R is started |
| `rbqm-starting.jpg` | The tab while R starts |
| `rbqm-failed-1110.jpg`, `rbqm-failed.jpg` | The tab when R did not start |
| `rbqm-done.jpg` | The tab after a real run on the pilot study |
| `profile-1110.jpg`, `profile.jpg` | The Participant Profile with no participant chosen |
| `nofile-1110.jpg`, `nofile.jpg` | The Adverse Event Explorer with no adverse events file loaded |
| `notmapped-1110.jpg`, `notmapped.jpg` | The Histogram with the Result column not mapped |
| `phone-blue.jpg`, `phone-amber.jpg`, `phone-rbqm.jpg` | The blue note, the amber note and the RBQM note at 390 pixels |
| `note-*.jpg` | The note alone, at 390 pixels, in each state |

---
This page was drafted by Claude Code using Opus 5.5.
