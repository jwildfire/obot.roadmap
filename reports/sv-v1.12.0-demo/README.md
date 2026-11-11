# safety.viz v1.12.0 — annotated demo

The review page for the safety.viz v1.12.0 release candidate. It shows the release's three pieces of work, all merged to safety.viz `dev`:

- The demo data carries each record's visit, its real study day and the baseline flag, with one visit numbering across every extract.
- One X-axis control, Visit or Study day, on the participant profile, its side panel in the host charts, the outlier explorer and the QT drill-down, and in the demo app, which remembers the chosen view while the page is open. With neither a visit nor a study day, the profile and the outlier explorer show a message instead of a chart.
- hep-explorer's time slider steps by visit or by study day (the control is labelled "Step by"), and its 30-day timing test always measures study days. With no study day the test is not evaluated: crosses, a footnote, the timing-window input disabled.

Each view is a before-and-after pair where a before exists: release 1.11.3 on the released site, and this release on the dev site, side by side on a desktop and stacked on a phone. Each section has steps to try. A "Decided in the build" section states the two calls the reviewer must see, and a "Noticed while capturing" section lists what the capture found that the pull requests do not say.

Requirements: both visit and study day in the demo data ([obot.roadmap#435](https://github.com/jwildfire/obot.roadmap/issues/435)), one x-axis toggle ([#436](https://github.com/jwildfire/obot.roadmap/issues/436)), hep-explorer's slider and timing ([#437](https://github.com/jwildfire/obot.roadmap/issues/437)), under the objective to firm up the tools for the ISG relaunch ([#429](https://github.com/jwildfire/obot.roadmap/issues/429)). Design: [436_design.html](https://jwildfire.github.io/obot.roadmap/requirements/design/436_design.html). Tasks: safety.viz [#365](https://github.com/jwildfire/safety.viz/issues/365)–[#377](https://github.com/jwildfire/safety.viz/issues/377). Pull requests: [#378](https://github.com/jwildfire/safety.viz/pull/378), [#379](https://github.com/jwildfire/safety.viz/pull/379), [#381](https://github.com/jwildfire/safety.viz/pull/381). Raised by a member of the working group.

## The parts

| File | What it is |
|---|---|
| `capture.cjs` | Takes the stills and reads the live pages. It holds each claim the page makes to what the live site shows, and exits 1 when a check fails. |
| `capture.json` | Everything `capture.cjs` read: each chart's axis title, ticks and plotted x values, the X-axis controls (pressed, greyed, the reason given), tooltip lines, listing columns and rows, hep-explorer's drawn filled, hollow and cross points, the defaults, each check, and where each numbered marker sits on its still. |
| `harness.html` | A small page that loads a safety.viz bundle from the safety.viz site and mounts charts on the gallery's own demo data with columns taken out. See "The harness" below. |
| `build.cjs` | Writes `index.html` from `capture.json`. It stops if a check did not hold, a still is missing, or the page would carry a script. |
| `page.css` | The styles of the v1.11.3 demo page, plus a single-still figure, two callouts and the defaults table. `build.cjs` puts them inline. |
| `index.html` | The page. Self-contained: inline CSS, no script, no outside asset but its own stills. It links to the harness. |
| `media/` | The stills, 1.5× JPEG at a 1,280 × 1,000 viewport. `-before` is release 1.11.3, `-after` this release; `profile-visit`/`profile-day`, `outlier-day`/`outlier-listing`, `qt-day` and `hep-stepby-visit` are this release only. Numbered markers sit on the after stills only. |

## How it was made

- `capture.cjs` uses Playwright with headless Chromium. This release is the dev site, `https://jwildfire.github.io/safety.viz/dev/`. The work merged at pull request #381 (2468471d); by the capture the release preparation (#382, 9713018e) had also merged and the dev site loads `dist/safety.viz-1.12.0/`. The page's fact bar names the commit `dev` was at. Release 1.11.3 is the released site, `https://jwildfire.github.io/safety.viz/`.
- Run it from the root of an `npm ci` checkout of safety.viz, for its Playwright: `node <path>/capture.cjs`, then `node <path>/build.cjs`. `BASE`, `BEFORE` and `HARNESS` point it at other sites.
- The participant is 01-701-1028 throughout, the participant the data pull request names. The gallery pages are driven through the instances they put on `window` (`setSelected`, `selectParticipant`, a `participantsSelected` event on the host's root, `brushValues` on the shift plot) and read through the bundle's own Chart.js (`SafetyViz.kit.Chart`). The X-axis buttons are clicked.
- Tooltips are opened the way a hover opens them, through Chart.js's active elements, and their lines are read from Chart.js.
- hep-explorer's hollow count is read from the points as drawn (a transparent fill and a circle), and checked against the timing each point carries. On the dev site it was 131 of 318. It is not typed into the page or the script.
- The demo app keeps no chart on `window`; it is driven by its own buttons, and a participant is selected by clicking a point.
- The commit is read from GitHub's public API with no token. The script writes nothing to GitHub.

## The harness

The gallery's data has both a visit and a study day, so three things cannot be shown on the gallery pages: data with neither, data with no study day, and a chart given no time setting. safety.viz's own browser fixtures (`tests/e2e/fixtures/`) are not deployed to the site, so the capture uses `harness.html` instead.

- `harness.html?bundle=dev|released&case=neither|noday|defaults`.
- `bundle=dev` loads the bundle the dev site's hep-explorer page loads, `bundle=released` the released site's. The harness reads the path from that page, so it follows a renamed bundle; on this capture they were `dev/dist/safety.viz-1.12.0/` and `dist/safety.viz-1.11.3/`. The first capture hard-coded the old dev path and stopped when the release preparation renamed it.
- Both read the dev site's `hep-explorer/adbds.csv`, the gallery's demo data, keep the four liver measures, and drop columns: `neither` drops `VISIT`, `VISITNUM` and `DY`; `noday` drops `DY`; `defaults` drops nothing.
- `neither` mounts an outlier explorer with no settings and a participant profile for 01-701-1028. `noday` mounts hep-explorer on its scatter with the visit columns and no study day. `defaults` mounts the histogram, outlier explorer, shift plot and delta-delta with no time setting and reads each one's `studyday_col`.
- The capture opens it from this folder as a `file:` page; GitHub Pages answers the bundle and the data with `Access-Control-Allow-Origin: *`. Published beside the page, it works the same from the hub.

## Things the page states that the capture does not read

- The two calls in "Decided in the build", and that the requirement's definition of done asked for a control in all eight hosts: pull requests #379 and #381.
- That the AE explorer and AE timelines panels open on Study day: pull request #379. The capture reads the histogram, outlier explorer and QT explorer panels only.
- That the design was approved on 11 November, and the plain-English summary of each task: the design page and the task titles.
- That the change was raised by a member of the working group: the design page.
- That a page with a DY column it does not mean as a study day should set `studyday_col` to none: the four charts' `configure.js`.
- That the hep-explorer and hep-waterfall listings gained Visit and Study day columns (#377), and that the gsm.safety widgets follow in their own release (hub #438): named on the page as not captured.

## What the capture found that the pull requests do not say

- Release 1.11.3's participant profile page plotted a day worked out from the visit name (Week 26 = day 183), not the visit number. The data pull request's "not 13" holds for the side panels (the histogram's panel plotted 13), not for that page. The page states it this way.
- With no study day, hep-explorer's tooltip still reads "@ day NA" for each peak, above "Timing not evaluated (no study day)".
- Switching the outlier explorer's main axis clears the selected participant and closes its side panel.
- The demo's ECG data has no participant with two visits on one study day, so the design's "several ECGs on one day separate in Visit view" case cannot be shown on it.

---
This page was drafted by Claude Code using Opus 5.5.
