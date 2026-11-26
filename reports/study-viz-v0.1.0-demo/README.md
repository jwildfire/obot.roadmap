# study.viz v0.1.0 — annotated demo

The demo page for the study.viz v0.1.0 release candidate, the first for the repository. study.viz is the demo app that lived inside safety.viz, copied into [its own repository](https://github.com/jwildfire/study.viz) under its own name; safety.viz's charts arrive as its built bundle. The page shows what is particular to study.viz and links to the [safety.viz v1.13.0 demo page](../sv-v1.13.0-demo/) for what the app does:

- The app has its own address and name: the wordmark "study.viz", browser tabs titled "… · study.viz demo", a footer reading "study.viz 0.1.0 · safety.viz 1.12.0".
- It does what the safety.viz demo does. The capture reads the same things from both apps and compares them.
- A simulated study is shown in sections, with study.builder v0.5.0's study view.
- One study is built with R in the browser and scored on the RBQM tab.
- How the copy is held: the app's files recorded with checksums against the safety.viz commit they came from (b0c93851, 299 files), the chart bundle byte for byte against the commit its own record names (f94fea41), and the browser tests with their stored pictures.

The page is a release candidate's page until the release. Two elements carry the status and are the only ones to change at release: `#status-word` in the eyebrow and `#rc-links` under "Where it stands". `RELEASED_ON="<date>" node build.cjs` rewrites both and points the try-it links at the released app.

Release notes, README and CONTRIBUTING: [study.viz on `dev`](https://github.com/jwildfire/study.viz/tree/dev). Requirement: [obot.roadmap#440](https://github.com/jwildfire/obot.roadmap/issues/440). The study view in sections: study.viz [#16](https://github.com/jwildfire/study.viz/issues/16).

## The parts

| File | What it is |
|---|---|
| `capture.cjs` | Takes the stills, reads the live app and the safety.viz demo beside it, and reads the repository's records. It holds each thing the page states to what it read, and exits 1 when a check fails. |
| `capture.json` | Everything `capture.cjs` read: the wordmark, titles and footer; the tabs, charts, studies and Studies page of both apps; the sections and their views; the build's steps and times; the records, the checksums it worked out again, and the counts of tests and pictures; each check. |
| `build.cjs` | Writes `index.html` from `capture.json`. It stops if a check did not hold, a still is missing, or the page would carry a script. |
| `page.css` | The same styles as the safety.viz v1.13.0 demo page. `build.cjs` puts them inline. |
| `index.html` | The page. Self-contained: inline CSS, no script, no outside asset but its own stills. |
| `media/` | The stills: PNG, from a 1,400 by 900 window at one pixel per point, light theme, cropped to what matters. |

## How it was made

- `capture.cjs` uses Playwright with headless Chromium against `https://jwildfire.github.io/study.viz/dev/`, the app built from `dev`, and compares it with `https://jwildfire.github.io/safety.viz/dev/demo/`. `BASE` and `COMPARE` point it at other builds; after the release, `BASE=https://jwildfire.github.io/study.viz/`.
- Run it from the root of an `npm ci` checkout of study.viz or safety.viz, for its Playwright: `node <path>/capture.cjs`, then `node <path>/build.cjs`.
- `PARTS=home,same,sections,build,held` takes only the named parts again and keeps the rest from the `capture.json` already here. The part `build` starts real R in the browser (webR) and takes one to two minutes.
- The part `sections` needs study.builder v0.5.0 in the build under review. If the build still shows the older study view, the part is marked pending, `build.cjs` writes a named placeholder for each of its five stills (`view-overview.png`, `view-design.png`, `view-data.png`, `view-participant.png`, `view-reporting.png`), and `PARTS=sections node capture.cjs && node build.cjs` fills them later. On this capture the dev build already had the sections, and nothing is pending.
- The part `held` reads public files with no token: `SOURCE.json`, `site/vendor/safety.viz/SOURCE.json` and `site/vendor/study.builder/SOURCE.json` from study.viz at the head of `dev`; the chart bundle from study.viz and from safety.viz at the commit the record names; the same bundle at the commit the app's files are held to; a sample of eleven recorded files (the first, the last and every thirtieth); the list of files, for the stored pictures; the check results for the head commit; and the commit and result of the run of the required check that the page cites.
- The one study built is small on purpose: phase 1, 24 participants, 3 sites, 3 months, seed 11, named `DEMO-BUILT`. Times are from one run on one machine.

Data: the Pilot study is the public, de-identified CDISC Pilot 01 study, with synthetic liver and kidney groups in the labs. The simulated studies are made up by gsm.datasim, every row. No real participant appears.

## Things the page states that the capture does not read

- That the required check ran 131 browser tests and all passed, on study.viz commit 3b7a8f36: [the run](https://github.com/jwildfire/study.viz/actions/runs/45853688302), whose log reads "Running 131 tests" and "131 passed". The capture reads the run's commit and result from the public API and holds them; a run's log cannot be read without signing in, so the count is given to the script (`TESTS_RAN`, with `TEST_RUN` for the run). The capture ran no test. It counts the stored pictures (67).
- That `npm run copied:check` and `npm run safety-viz:check` fail when a file and its record disagree, and that the check compares each stored picture on its Linux runner: study.viz's CONTRIBUTING and its workflow file. The capture did not run the commands; it worked out the checksums of a sample and of the chart bundle itself.
- That the app names itself in the mapping file it saves, its console warnings and the single file that opens from disk: CONTRIBUTING. Not opened here.
- That the record will be retired once safety.viz no longer carries the app: CONTRIBUTING.
- The status line: that v0.1.0 is a release candidate until it is approved.

## What the capture found

- The released address, `https://jwildfire.github.io/study.viz/`, had no page when this was captured; the app is at `dev/` until the release.
- The footer names safety.viz 1.12.0: the chart bundle study.viz carries.
- The first capture of the day found the dev build on the older study view (study.builder v0.4.0, one row of eight views). The sections arrived with study.viz pull request #17, and every still on the page was taken after it.

---
This page was drafted by Claude Code using Fable 5.2.
