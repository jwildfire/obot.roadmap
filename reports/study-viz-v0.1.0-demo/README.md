# study.viz v0.1.0 — annotated demo

The demo page for the study.viz v0.1.0 release candidate, the first for the repository. study.viz is the demo app that lived inside safety.viz, copied into [its own repository](https://github.com/jwildfire/study.viz) under its own name; safety.viz's charts arrive as its built bundle. The page shows what is particular to study.viz and what the app says of a simulated study, and links to the [safety.viz v1.13.0 demo page](../sv-v1.13.0-demo/) for the rest of what the app does:

- The app has its own address and name: the wordmark "study.viz", browser tabs titled "… · study.viz demo", a footer reading "study.viz 0.1.0 · safety.viz 1.13.0". The chart bundle is named 1.13.0; when this was captured, safety.viz v1.13.0 was a release candidate, not released. study.viz v0.1.0 is released after it.
- It does what the safety.viz demo does. The capture reads the same things from both apps and compares them.
- A simulated study says so: "Simulated" and its snapshot under its name on the chip, "Made by: a modified copy of gsm.datasim 2.1.0" on its card, the label Experimental on its view and on Build a study, its own notes, and CDISC's attribution in the builder and the Schedule view. A study that does not open is said under the chip.
- The study view in sections, with study.builder v0.5.2.
- The files the app saves from a simulated study are named `simulated-…`: `simulated-study-viz-mapping.json` and `simulated-adsl.csv`.
- One study is built with R in the browser and scored on the RBQM tab; a second study's Run details name the snapshot chosen by its date.
- The header at 1,280 pixels.
- How the copy is held: the app's files recorded with checksums against the safety.viz commit they came from (75b918cd, 304 files, 183 listed changes in 39 files), the chart bundle byte for byte against the same commit, and the required check's run.
- The limits: what study.viz's notes list as known, the faults that come with safety.viz's app and study.builder v0.5.2, the charts' statistics awaiting a ruling, and three things a reviewer found.

study.viz v0.1.0 was released on 28 November 2026, and the page was rebuilt that day with `RELEASED_ON` and `SV_RELEASED_ON` both set; nothing was captured again. The release's commit differs from the one captured (beee1a56) in three files, none of them served: the notes, one comment in a script, and the chart bundle's record. Until the release the page was a release candidate's page. Two elements carry the status and are the only ones to change at release: `#status-word` in the eyebrow and `#rc-links` under "Where it stands". `RELEASED_ON="<date>" node build.cjs` rewrites both and points the try-it links at the released app.

The sentences about the chart bundle depend on safety.viz v1.13.0's release. Without a setting they say what the capture read from safety.viz's public tags: on this capture, that v1.13.0 was not tagged. `SV_RELEASED_ON="<date>" node build.cjs` rewrites them to say the bundle is safety.viz v1.13.0's, released on that date. They are in "Where it stands" (the second item) and under the footer still in section 1; section 7 names the bundle by its commit and name only.

Release notes, README and CONTRIBUTING: [study.viz on `dev`](https://github.com/jwildfire/study.viz/tree/dev). Requirement: [obot.roadmap#440](https://github.com/jwildfire/obot.roadmap/issues/440). The study view in sections: study.viz [#16](https://github.com/jwildfire/study.viz/issues/16). The copy at safety.viz 75b918cd and study.builder v0.5.2: study.viz [#32](https://github.com/jwildfire/study.viz/issues/32).

## The parts

| File | What it is |
|---|---|
| `capture.cjs` | Takes the stills, reads the live app and the safety.viz demo beside it, and reads the repository's records. It holds each thing the page states to what it read, and exits 1 when a check fails. |
| `capture.json` | Everything `capture.cjs` read: the wordmark, titles, footer and status panel; the header at 1,280 pixels on every study; the tabs, charts, studies and Studies page of both apps; the chip's line and card on a simulated study, and a failed open; the sections, their views, the Experimental label, the notes and CDISC's attribution; the names of the saved files; the snapshot chosen and Run details; the build's steps and times; the records, the checksums it worked out again, and the run of the required check; every host asked; each check. |
| `build.cjs` | Writes `index.html` from `capture.json`. It stops if a check did not hold, a still is missing, the capture asked a host the page does not name, or the page would carry a script or a local address. |
| `page.css` | The same styles as the safety.viz v1.13.0 demo page. `build.cjs` puts them inline. |
| `index.html` | The page. Self-contained: inline CSS, no script, no outside asset but its own stills. |
| `media/` | The stills: PNG, at one pixel per point, light theme, cropped to what matters. All are of a 1,400 by 900 window but `header-1280.png`, of a window 1,280 wide. |
| `comparison/` | A side-by-side run of study.viz's own comparison script: see the end of this file. Not part of the page's capture. |

## How it was made

- `capture.cjs` uses Playwright with headless Chromium. This capture ran on 28 November 2026 against the published dev site, `https://jwildfire.github.io/study.viz/dev/`, with `dev` at `beee1a56`, and compared it with safety.viz's dev site, `https://jwildfire.github.io/safety.viz/dev/demo/`, with safety.viz's `dev` at `75b918cd`. Before the capture, the served app file was checked to hold a sentence first added at `beee1a56`.
- Run it from the root of an `npm ci` checkout of study.viz or safety.viz, for its Playwright (or set `PLAYWRIGHT` to that folder): `node <path>/capture.cjs`, then `node <path>/build.cjs`. With nothing set it captures the dev site and reads the commit `dev` is at from GitHub's public API with no token. `BASE` and `COMPARE` point it at other builds; with a build of your own, `BUILD_IS` gives the words the page calls it and `COMMIT` its commit. After the release, `BASE=https://jwildfire.github.io/study.viz/`.
- `PARTS=home,same,chip,sections,saved,snapshot,build,held` takes only the named parts again and keeps the rest from the `capture.json` already here. The parts `snapshot` and `build` start real R in the browser (webR) and take a minute or two each.
- The app is driven by its own buttons. Nothing is injected into the page. One step changes what reaches the page, in the part `chip`: the file of one ready-made study (READY-P2) is stopped on its way to the page, as a dropped connection would stop it, to read what the app says when a study does not open. The block is then lifted and the same study opened.
- The part `saved` presses the app's own Download mapping and Download CSV buttons on a demo study and on PILOT-PROTOCOL and reads the name the browser is offered. The files are not kept.
- The part `held` reads public files with no token: `SOURCE.json`, `site/vendor/safety.viz/SOURCE.json` and `site/vendor/study.builder/SOURCE.json` from study.viz at the commit captured; the chart bundle from study.viz and from safety.viz at the commit the record names; a sample of twelve recorded files (the first, the last and every thirtieth); safety.viz's tags; the list of files, for the stored pictures; the check results for the commit captured; and the commit and result of the run of the required check that the page cites.
- The one study built is small on purpose: phase 1, 24 participants, 3 sites, 3 months, seed 11, named `DEMO-BUILT`. Times are from one run on one machine.

Data: the Pilot study and the Renamed columns study are the public, de-identified CDISC Pilot 01 study; the Pilot study's labs carry 110 synthetic liver and kidney participants. The Liver cohort is synthetic. The RBQM study is synthetic, from jwildfire/demo-301; the app does not say so (safety.viz #434). The simulated studies are made up, every row, by a modified copy of gsm.datasim 2.1.0 that study.builder carries. No real participant appears. PILOT-PROTOCOL follows one of CDISC's example protocols (DDF-RA, CC-BY-4.0); the app's attribution is on the page in full.

## Things the page states that the capture does not read

- That the required check ran 617 unit tests and 131 browser tests and all passed, on study.viz commit beee1a56: [the run](https://github.com/jwildfire/study.viz/actions/runs/46113608409), the push to `dev`, whose log reads "617 passed", "Running 131 tests" and "131 passed". The capture reads the run's commit and result from the public API and holds them; a run's log cannot be read without signing in, so the counts are given to the script (`UNIT_TESTS`, `TESTS_RAN`, with `TEST_RUN` for the run). The capture ran no test. It counts the stored pictures.
- What `npm run copied:check` printed. The command was run in a clone of study.viz at beee1a56 on 28 November 2026 and printed "✓ SOURCE.json: 304 files match their recorded checksums (copied from jwildfire/safety.viz at 75b918c, 39 of them changed by the 183 changes the record lists), and the copied folders hold no other file." The page quotes the part of that line the capture's own counts agree with. `npm run safety-viz:check` passed in the same clone.
- That the check compares each stored picture on its Linux runner, and that the app names itself in its console warnings and the single file that opens from disk: study.viz's CONTRIBUTING and its workflow file.
- That the record will be retired once safety.viz no longer carries the app: CONTRIBUTING.
- The comparison in section 2: when it was made and of which builds (at the end of this file).
- The issues named under "Limits": safety.viz #432, #434 and #259, study.builder #1, and study.viz #19, #20 and #28.
- The status line: that v0.1.0 is a release candidate until it is approved.

## What the capture found

- The released address, `https://jwildfire.github.io/study.viz/`, had no page when this was captured; the app is at `dev/` until the release.
- After the build had started R, the RBQM tab still asked for Start R and said R must be downloaded (study.viz #19). Pressing it made no request to R's own host.
- After a reload the app opened on the Pilot study, though DEMO-BUILT was in use before (study.viz #20).
- The status panel's line under Qualified reads "Validated for regulated use. Nothing in safety.viz is, yet.": the words come from the chart bundle.

## Things study.viz's notes may change

study.viz's `NEWS.md` (v0.1.0 section) is the page's text to follow. The page is written to stay true if the notes gain a bullet on the charts' statistics, gain a sentence on the faults that come with safety.viz v1.13.0 and study.builder v0.5.2, or describe the bundle as safety.viz v1.13.0's once it is released: the page names those faults and the statistics by their issues, not as quotes from the notes, and the bundle's sentences follow `SV_RELEASED_ON`.

---
This page was drafted by Claude Code using Fable 5.2.

## comparison/

Eight screenshots, `counts.json` and `table.md` from one run of study.viz's `scripts/compare-demos.mjs`, with real R, on 28 November 2026 at 10:06 AM Eastern, after the release, from a clone of study.viz whose files equal the released commit's (58c40695). safety.viz's demo was its released one, https://jwildfire.github.io/safety.viz/demo/ (v1.13.0, tag at 60845fbe), and study.viz's was its released address, https://jwildfire.github.io/study.viz/ (v0.1.0, tag at 58c40695). The roadmap requirement "study.viz exists and runs the demo" (obot.roadmap#440) asks for this comparison, and its closing comment gives it.

This run replaces the one made before the release against the two dev sites (safety.viz `dev` at 75b918cd, study.viz `dev` at beee1a56), which gave the same counts; it is in this folder's history. The date and the two versions are also in `COMPARISON` in `build.cjs`.
