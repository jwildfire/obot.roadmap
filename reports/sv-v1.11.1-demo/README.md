# safety.viz v1.11.1 — annotated demo

The review page for the safety.viz v1.11.1 release candidate: what the release changes in the demo app, shown on the live site beside release 1.11.0, with steps to try and six things that are @jwildfire's to rule on at the review. The release is a patch under the requirement for a standard note where R can be started (hub [#420](https://github.com/jwildfire/obot.roadmap/issues/420)). It adds no chart and no metric, and nothing the app computes changes.

The sections follow the changes:

- the note at the top of a biomarker chart's card, blue or amber (safety.viz task [#322](https://github.com/jwildfire/safety.viz/issues/322), pull request [#325](https://github.com/jwildfire/safety.viz/pull/325));
- the note while R starts, when R did not start, and once R is ready, with every sentence it says;
- the blue note closed with its cross, which stays closed while R starts;
- the same note on the RBQM tab, in each of its states;
- one note style across the app, and the line on first open removed (safety.viz task [#321](https://github.com/jwildfire/safety.viz/issues/321), pull request [#324](https://github.com/jwildfire/safety.viz/pull/324));
- what did not change;
- six things for his ruling at the review.

The page was built from the approved design page, [a standard note where R can be started](https://jwildfire.github.io/obot.roadmap/reports/sv-v1.11.1-r-note-design-2026-10-13/). It was captured again after the fixes the release candidate's review asked for (safety.viz task [#328](https://github.com/jwildfire/safety.viz/issues/328)) reached the dev site.

Data: the app's pilot study is 254 participants from the public CDISC pilot study; its labs file also carries 110 synthetic liver and kidney participants, as the app's Data tab says. The demo study "Liver cohort, labs only", used for the chart with no file loaded, is synthetic. No real participant appears.

## The parts

| File | What it is |
|---|---|
| `capture.cjs` | Takes the stills and reads the live pages. Holds each sentence the page quotes to what the live site shows, and exits 1 when a check fails. |
| `capture.json` | Everything `capture.cjs` read: the sentences, each note's kind and colour, each check and whether it held, where each numbered marker sits on its still, and each still's size. |
| `build.cjs` | Writes `index.html` from `capture.json`. Two sentences, which no picture shows, are quoted from the app's code and say so; no other sentence of the app's is typed into the page by hand. |
| `page.css` | The page's styles, taken from the v1.11.0 demo page. `build.cjs` puts them inline. |
| `index.html` | The page. Self-contained: inline CSS, no script, no font or asset from outside but its own stills. |
| `media/` | The stills. |

## How it was made

- `capture.cjs`: Playwright, headless Chromium, real R in the browser. Release 1.11.1 is the dev site, `https://jwildfire.github.io/safety.viz/dev/demo/`. Release 1.11.0, for the "before" of each pair, is the released site, `https://jwildfire.github.io/safety.viz/demo/`.
- Run it from the root of an `npm ci` checkout of safety.viz, for its Playwright: `node <path>/capture.cjs`, then `node <path>/build.cjs`. `ONLY=blue,rbqm` runs some sections and keeps the others' reads. `BASE` and `BEFORE` point it at other sites.
- Before it starts, the script waits for the site under review to show the release under review: the note on a biomarker chart, and the RBQM tab's line under its note at 14.72 pixels, which the review's fix put right. It looks once a minute for up to 20 minutes (`WAIT_MINUTES`) and stops if the site never shows it. `FALLBACK` names a second site to use instead; there is none by default.
- One version and one commit. When a run of every section begins, the script reads the app's version line and, from GitHub, the commit the site's branch stands at, and the page quotes those. A run of some sections (`ONLY=`) stops if either has moved since, and says to run every section.
- Stills are 1.5× JPEG at 1,280 × 800, and 390 × 844 for a phone. The strips are the top 268 pixels of the page. The stills of the note alone are the note at 390 pixels wide, where its sentence is large enough to read on the page.
- Each numbered marker on a still is placed from the box of the element it points at, measured when the still was taken. `build.cjs` stops if a still's markers and its legend do not match one for one, or if a still on disk is not on the page.
- Every state starts in a fresh browser context with an empty cache.
- R that is starting is made by holding every request to an address containing `r-wasm.org` in one browser context. R that does not start is made by refusing those requests. One more check switches the browser offline after the page has loaded, which is what the page's try-it step asks a reader to do.
- R that is ready is real: R downloaded and run in the browser, on the Association scatter and on the RBQM tab's pilot study.
- The blue note closed, while R starts and then when R did not start, is one visit: the note is closed, Start R is pressed on the control with R's addresses held, each of the five charts is read, the addresses are then refused, and each chart is read again.
- The RBQM tab with R up and nothing run: R is started, the study is cleared with Reset on the Data tab while R starts, and the pilot study is chosen again once R is up. With nothing loaded: Reset on the Data tab. With no file the metrics read: the demo study "Liver cohort, labs only". The app as one file: `safety.viz-app.html` beside the app, which the app's footer offers as a download, opened from the site.
- The release 1.11.0 stills, other than the first screen's, are taken with the line on first open closed, so each shows only its own change.
- The chart with no file loaded is the Adverse Event Explorer with the demo study "Liver cohort, labs only" chosen on the Data tab. The chart with a column not mapped is the Histogram after the Result column of the labs file is set to "not mapped" on the Data tab.
- The commit, and whether the review fixes have a pull request, are read from GitHub's public API with no token. The script writes nothing to GitHub.

## After the release: the six views on the released site

The requirement's proof asks for a capture of each of the six views on the released site, and until the release the page shows them on the dev site. Once release 1.11.1 is on the released site:

- run every section with `BASE=https://jwildfire.github.io/safety.viz/demo/ node <path>/capture.cjs`, then `node <path>/build.cjs`;
- the script sees that the released site is no longer release 1.11.0 and keeps the release 1.11.0 stills and reads it has, so do not remove `capture.json` or `media/` first;
- the page then calls release 1.11.1 "the released site", names the commit `main` stood at, and its try-it links open the released app.

This was done on 14 October 2026 at 00:15 UTC, after release 1.11.1 was published: 111 of 111 checks held on the released site, with `main` at `b704a954`. The page as it stands is that capture. The last capture of the dev site, at `b6a1ceb2` with 120 checks, is the commit before this one in the hub's history.

## What on the page came from where

| On the page | Read from (`capture.json`) |
|---|---|
| The site captured, the date, the branch's commit, the app's version line | `site` |
| Whether the review fixes have a pull request, and its number | `github.fix_pull` |
| The line on first open, its colour, where the first chart starts | `first_before`, `first` |
| The app's status label and its count of charts on each rung; the Data tab's note on the pilot study | `first.status_label`, `first.status_counts`, `first.study_note` |
| The blue note on each of three charts, the chart's own line, the control, the chart's footer, the count of requests to R's addresses | `blue`, and `blue_before` for release 1.11.0 |
| The amber note on each of two charts | `amber`, `amber_before` |
| The strips of the six views and of two metric pages | `views`, `views_before` |
| The note, the control and the chart's line while R starts | `starting` |
| The same when R did not start, the reason behind Why, and with the browser offline | `failed` |
| No note, the chip and R's test once R is ready; the same test on the released site | `ready`, `ready_before` |
| The blue note closed: each chart's line, another tab, a reload, no note while R starts, and the note on all five charts when R did not start | `closed` |
| The RBQM tab's note before R, the line under it, while R starts, when R did not start, and after a run | `rbqm`, `rbqm_starting`, `rbqm_failed`, `rbqm_done`, and `rbqm_before`, `rbqm_failed_before`, `rbqm_done_before` for release 1.11.0 |
| The RBQM tab with R up and nothing run, with nothing loaded, with no file the metrics read, and in the app as one file | `rbqm_states`, and `rbqm_ready_before` for release 1.11.0 |
| The participant profile's sentence | `profile`, `profile_before` |
| A chart with no file loaded, and with a column not mapped | `cannot`, `cannot_before`, `liver` |
| The notes at 390 pixels, their widths and the page's | `phone` |

Things the page states that the capture does not read:

- Two sentences of the RBQM tab's note, for R that stopped answering and R that stopped during the run. They are quoted from safety.viz `src/app/rbqm.js` (`RBQM_NOTE.silent`, `RBQM_NOTE.stopped`) with the button's words and the last sentence from `src/app/r-words.js`, as they stand at the commit the capture names (`site.commit`), in `FROM_CODE` at the top of `build.cjs`. Unit tests hold them there (requirement row APP-RBQM-083). The page labels them as quoted from the code.
- A chart that was ready and then failed keeps its red card: the standard note's pull request says so, and requirement row APP-NOTE-002 records it (safety.viz [#324](https://github.com/jwildfire/safety.viz/pull/324)). The capture has no way to make a chart fail.
- The design page drew seconds in the note while R starts, "13 MB · 4 s", and said that once R is ready there is no note: the design page itself. The rule that keeps one count on the page is requirement row APP-RBQM-019 in safety.viz `requirements/demo-app.md`.
- The hub's line "One way to do a thing across an app: one control that starts R, in one place": `docs/developer-guidelines.md` in this repository. That safety.viz's contributing guide was reworded: its demo app conventions.
- No file of R's changed and no chart's code changed: the release notes (safety.viz `NEWS.md`). The capture reads only that the chart's footer still names bio.viz 0.3.0, and that R's test on two charts and the RBQM tab's outcome line and first row are the released site's.
- The browser tests named by requirement rows: the pull requests' own accounts.
- That the requirement is not yet linked under the demo-ready objective (hub [#401](https://github.com/jwildfire/obot.roadmap/issues/401)): the session that asked for this page.
- 254 participants and 110 synthetic participants: the app's Data tab, which the capture reads as one sentence and checks.

## Assumptions and limits

- The site carries no commit of its own on the page. The footer names the commit its branch stood at when the capture began, read from GitHub; a deploy that was still under way would make the two differ. The wait for the review's fix to show guards against the commonest case.
- The "before" of each pair is the released site on the day of capture, which was release 1.11.0.
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
| `closed.jpg`, `closed-starting.jpg` | The Association scatter with the blue note closed, before R and while R starts |
| `rbqm-1110.jpg`, `rbqm.jpg` | The RBQM tab before R is started |
| `rbqm-starting.jpg` | The tab while R starts |
| `rbqm-failed-1110.jpg`, `rbqm-failed.jpg` | The tab when R did not start |
| `rbqm-done.jpg` | The tab after a real run on the pilot study |
| `rbqm-ready-1110.jpg`, `rbqm-ready.jpg` | The tab with R up and nothing yet run |
| `rbqm-nofiles.jpg`, `rbqm-noneplaced.jpg`, `rbqm-singlefile.jpg` | The top of the tab with nothing loaded, with no file the metrics read, and in the app as one file |
| `profile-1110.jpg`, `profile.jpg` | The Participant Profile with no participant chosen |
| `nofile-1110.jpg`, `nofile.jpg` | The Adverse Event Explorer with no adverse events file loaded |
| `notmapped-1110.jpg`, `notmapped.jpg` | The Histogram with the Result column not mapped |
| `phone-blue.jpg`, `phone-amber.jpg`, `phone-rbqm.jpg` | The blue note, the amber note and the RBQM note at 390 pixels |
| `note-*.jpg` | The note alone, at 390 pixels, in each state |

---
This page was drafted by Claude Code using Opus 5.5.
