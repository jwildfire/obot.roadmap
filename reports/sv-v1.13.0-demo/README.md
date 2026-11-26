# safety.viz v1.13.0 — annotated demo

The demo page for the safety.viz v1.13.0 release candidate. Every change in the release notes is to the demo app, and the page walks each one on the live dev build:

- A chip in the header names the study in use and lists every study: four demo studies and three ready-made simulated ones.
- Choosing a study keeps the tab you were on. A ready-made simulated study opens with no R.
- The Overview tab shows a simulated study in sections, with study.builder's study view: Overview; Design (Protocol, Schedule) when the study followed a protocol; Data (Pipeline, Tables, Columns); One participant; Reporting (Efficacy, Adverse events).
- A Studies page lists every study and the three ways to add one.
- A study can be described in a form and built in the browser by gsm.datasim with R, then loaded into the charts and the RBQM tab. The form also takes a protocol.
- Every loaded file has a Details section, and columns are mapped in the viewer's Columns view.
- The app starts R once, shared by the RBQM tab and the builder.

The page is a release candidate's page until the release. Two elements carry the status and are the only ones to change at release: `#status-word` in the eyebrow and `#rc-links` under "Where it stands". `RELEASED_ON="<date>" node build.cjs` rewrites both and points the try-it links at the released app.

Release notes: safety.viz [`NEWS.md` on `dev`](https://github.com/jwildfire/safety.viz/blob/dev/NEWS.md), section v1.13.0. Pull requests named on the page: safety.viz [#395](https://github.com/jwildfire/safety.viz/pull/395), [#398](https://github.com/jwildfire/safety.viz/pull/398), [#399](https://github.com/jwildfire/safety.viz/pull/399). The same app in its own repository: the [study.viz v0.1.0 demo page](../study-viz-v0.1.0-demo/).

## The parts

| File | What it is |
|---|---|
| `capture.cjs` | Takes the stills and reads the live app. It holds each thing the page states to what the app shows, and exits 1 when a check fails. |
| `capture.json` | Everything `capture.cjs` read: the chip's list, the titles, the sections and their views, the Studies page, the form's labels, the build's steps and times, the requests to R's hosts, the mapping before and after a column was set, each check, and where each numbered marker sits on its still. |
| `build.cjs` | Writes `index.html` from `capture.json`. It stops if a check did not hold, a still is missing, or the page would carry a script. |
| `page.css` | The styles of the v1.12.0 demo page, plus a few rules for PNG stills shown at their own size. `build.cjs` puts them inline. |
| `index.html` | The page. Self-contained: inline CSS, no script, no outside asset but its own stills. |
| `media/` | The stills: PNG, from a 1,400 by 900 window at one pixel per point, light theme, cropped to what matters. `header-before.png` is release 1.12.0 on the released site; every other still is the dev build. |

## How it was made

- `capture.cjs` uses Playwright with headless Chromium against `https://jwildfire.github.io/safety.viz/dev/demo/`, the demo app built from `dev`. The page's fact bar names the commit `dev` was at, read from GitHub's public API with no token. The script writes nothing to GitHub and signs in to nothing.
- Run it from the root of an `npm ci` checkout of safety.viz, for its Playwright: `node <path>/capture.cjs`, then `node <path>/build.cjs`. `BASE` and `BEFORE` point it at other builds. After the release, `BASE=https://jwildfire.github.io/safety.viz/demo/` takes the stills from the released app; the one "before" still is then kept from this capture.
- `PARTS=chip,switch,sections,studies,files,build,other` takes only the named parts again and keeps the rest from the `capture.json` already here. The parts `build` and `other` start real R in the browser (webR) and take one to two minutes each.
- The app is driven by its own buttons, as a reader would press them. Nothing is injected into the page.
- The one study built is small on purpose: phase 1, 24 participants, 3 sites, 3 months, seed 11, named `DEMO-BUILT`. The second, for the other order of starting R, uses the same numbers.
- "Requests to R's host" counts the requests the page made to `webr.r-wasm.org`, and "requests for packages" those to `repo.r-wasm.org`, during the step named. They are how the page shows that R is not downloaded twice.
- Times are from one run on one machine. They are on the page as "on this capture".

Data: the Pilot study and the Renamed columns study are the public, de-identified CDISC Pilot 01 study, with synthetic liver and kidney groups in the labs. The simulated studies are made up by gsm.datasim, every row. No real participant appears.

## Things the page states that the capture does not read

- That the release notes list changes to the demo app only: the notes on `dev`.
- That the app's footer reads 1.13.0 from the release on. The stills were captured on the dev build before the release's version number was set, and its footer read "safety.viz 1.12.0"; the page says so under "Where it stands".
- That study.builder has RBQM and Safety views of its own, left out here: the release notes. The capture checks only that the app shows none.
- That safety.viz carries study.builder's v0.5.0 release: the titles of pull requests #398 and #399.
- That the simulation is gsm.datasim's: the app's own words, quoted.
- The status line: that v1.13.0 is a release candidate until it is approved.

## What the capture saw, listed on the page as "Noticed while capturing"

Each is an observation of the dev build on the day, not a promise that it will change.

- After the builder has started R, the RBQM tab still reads "Site metrics need R · 55 MB, once" and still asks for Start R; after the RBQM tab has started R, the builder still reads "First build in this browser: about half a minute and 55 MB, to start R". In both orders the second step made no request to R's own host.
- The first build took about a minute on this capture, where the builder's note says about half a minute.
- While the builder is open, the panel on the left reads "No files loaded" though the chip still names the study in use.
- The snapshot chosen for one simulated study carries to the next: PILOT-PROTOCOL opened after READY-P1 showed snapshot 6 of 7, not its last.
- After a reload the app opens on the Pilot study, whichever study was in use. A built study is still in the chip's list after the reload.

## Not checked

- Files of the reader's own; building from a protocol (the form was opened on one example, not built); the other four example protocols and "Open a file…"; the builder's Save, Study file and Download all buttons; the app's one-file download; the Biomarkers tab on a simulated study; a phone; any browser but Chromium.

---
This page was drafted by Claude Code using Fable 5.2.
