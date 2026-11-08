# safety.viz v1.11.3 — annotated demo

The review page for the safety.viz v1.11.3 release candidate. It shows the two changes in the release, both to the Safety Histogram and both display only: the axes are titled in every view, and the bar listing names each record's visit, with the participant ID listed once. Each view is a before-and-after pair: release 1.11.2 on the released site, and this release on the dev site, side by side on a desktop and stacked on a phone. The pairs cover the single-measure chart, the all-measures overview, the grouped panels and the bar listing on the gallery page, and the chart and the listing in the demo app. The page has steps to try. Requirement: the Safety Histogram's quick wins (hub [#430](https://github.com/jwildfire/obot.roadmap/issues/430)). Tasks: safety.viz [#347](https://github.com/jwildfire/safety.viz/issues/347), pull request [#349](https://github.com/jwildfire/safety.viz/pull/349); [#348](https://github.com/jwildfire/safety.viz/issues/348), pull request [#350](https://github.com/jwildfire/safety.viz/pull/350). Release preparation: [#351](https://github.com/jwildfire/safety.viz/issues/351).

## The parts

| File | What it is |
|---|---|
| `capture.cjs` | Takes the stills and reads the live pages. It holds each claim the page makes to what the live site shows, and exits 1 when a check fails. |
| `capture.json` | Everything `capture.cjs` read: the axis titles in each view, the bars and ticks in both releases, the listing's columns and rows in both releases, the demo app's titles and columns, each check, and where each numbered marker sits on its still. |
| `build.cjs` | Writes `index.html` from `capture.json`. It stops if a check did not hold or a still is missing. |
| `page.css` | The styles from the v1.11.2 demo page, without its band table and tooltip lines, plus the before-and-after pairs and the listing's column lists. `build.cjs` puts them inline. |
| `index.html` | The page. Self-contained: inline CSS, no script, no outside asset but its own stills. |
| `media/` | The stills, each as `-before` and `-after`: `single`, the single-measure chart; `overview` and `grouped`, the small multiples; `listing`, the bar listing for one participant; `app` and `app-listing`, the same in the demo app. Numbered markers sit on the after stills only. |

## How it was made

- `capture.cjs` uses Playwright with headless Chromium. Release 1.11.3 is the dev site, `https://jwildfire.github.io/safety.viz/dev/histogram/` and `…/dev/demo/`. Release 1.11.2 is the released site, `https://jwildfire.github.io/safety.viz/histogram/`.
- Run it from the root of an `npm ci` checkout of safety.viz, for its Playwright: `node <path>/capture.cjs`, then `node <path>/build.cjs`. `BASE` and `BEFORE` point it at other sites.
- The single-measure chart is Alanine Aminotransferase with every filter on All and no grouping. The grouped view is by treatment group, the gallery page's default. The capture compares that chart's bar counts and tick labels between the releases.
- The listing's participant is the one with Alanine Aminotransferase results at the most distinct visits (ties broken by ID), selected with the Participant ID filter; the capture clicks the tallest bar and checks the same bar holds the same records in both releases.
- The demo app is read through the bundle's own Chart.js (`SafetyViz.kit.Chart`), since the app keeps no chart on `window`.
- GitHub Pages caches each file for ten minutes. Run the capture only once the dev site serves the merged bundle: on 8 November the first run, minutes after the merge, still got the old one and failed its listing check.
- The commit is read from GitHub's public API with no token. The script writes nothing to GitHub.
- The stills are 1.5× JPEG at a 1,280 × 1,000 viewport.

## After the release

Once release 1.11.3 is on the released site, run `BASE=https://jwildfire.github.io/safety.viz/ node <path>/capture.cjs`, then `node <path>/build.cjs`. The script sees that the released site already titles the axes, keeps the release 1.11.2 reads it has, and the page then calls release 1.11.3 "the released site". Do not remove `capture.json` first.

## Things the page states that the capture does not read

- That the working group raised both points on 3 November 2026: hub requirement #430.
- That the original safety-histogram titled its axes: its `getCurrentMeasure.js` and `webchartsSettings.js`, cited in safety.viz #347.
- That on the demo data the study-day column holds visit numbers: the gallery demo passes `VISITNUM` as `studyday_col` (safety.viz `site/demo/histogram.js`), and #348 keeps the study day out of this release.
- That a caller's own listing columns are used as given, and that the participant profile, the time axes, the demo data and the gsm.safety widget are unchanged: pull requests #349 and #350.
- The Apache License 2.0: safety.viz pull request #346.
- That the demo app's listing runs past its card at 1,280 pixels: read once by hand during the release candidate's review (the table 948 pixels wide in a 912-pixel column), and filed as safety.viz #355. The app's stills show the cut-off Unit column.
- That the demo app offers no participant filter: safety.viz `src/app/charts.js`, whose filters are the site, sex, race and treatment group.

Wording corrected after the release candidate's review: the page no longer says the capture compared the footnote, which it does not read.

---
This page was drafted by Claude Code using Opus 5.5.
