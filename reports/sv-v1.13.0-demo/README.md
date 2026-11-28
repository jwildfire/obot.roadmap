# safety.viz v1.13.0 — annotated demo

The demo page for the safety.viz v1.13.0 release candidate. It is the "See it move" companion to the release notes, and walks each thing they list on a build of the candidate:

- A chip in the header names the study in use and lists every study: four demo studies and three ready-made simulated ones. Under the name it marks a simulated study "Simulated".
- Choosing a study keeps the tab you were on. A ready-made simulated study opens with no R. A study that fails to open says so under the chip, and the study in use stays.
- The Overview tab, which was the Data tab, opens on the loaded study, looked through with study.viewer. Its second face, Files, keeps each file, the file picker and Reset.
- The Overview tab shows a simulated study in sections, with study.builder's study view: Overview; Design (Protocol, Schedule) when the study followed a protocol; Data (Pipeline, Tables, Columns); One participant; Reporting (Efficacy, Adverse events). The view carries the label Experimental, and the study's own notes name the modified copy of gsm.datasim.
- For a study that kept monthly snapshots, the chip says which one is drawn, the charts and the RBQM tab draw that one, and the RBQM tab's Run details names it by its date.
- A Studies page lists every study and the three ways to add one.
- A study can be described in a form and built in the browser with R by a modified copy of gsm.datasim 2.1.0, then loaded into the charts and the RBQM tab. The form also takes a protocol. Build a study carries the label Experimental. CDISC's attribution is inside the builder, once (under the example protocols, or under the schedule grid when a protocol is in the form), in the Schedule view, and on the card of a study that followed a protocol.
- Every loaded file has a Details section, and columns are mapped in the viewer's Columns view.
- The app starts R once, shared by the RBQM tab and the builder. The page says what starting R downloads and from where.
- The expanded participant profile draws its chart beside its controls: the one change to the chart bundle, shown beside release 1.12.0.
- The header keeps one row at 1,280 pixels; the status panel and the footer each have a new sentence.
- The limits: the three things the release notes list as known and not fixed, the open ruling on the charts' statistics, what the capture noticed, and what it did not check.

The page is a release candidate's page until the release. Two elements carry the status and are the only ones to change at release: `#status-word` in the eyebrow and `#rc-links` under "Where it stands". `RELEASED_ON="<date>" node build.cjs` rewrites both and points the try-it links at the released app.

Release notes: safety.viz [`NEWS.md` on `dev`](https://github.com/jwildfire/safety.viz/blob/dev/NEWS.md), section v1.13.0. Changes named on the page: safety.viz pull requests [#395](https://github.com/jwildfire/safety.viz/pull/395), [#419](https://github.com/jwildfire/safety.viz/pull/419) and [#430](https://github.com/jwildfire/safety.viz/pull/430), and issues [#423](https://github.com/jwildfire/safety.viz/issues/423), [#424](https://github.com/jwildfire/safety.viz/issues/424), [#427](https://github.com/jwildfire/safety.viz/issues/427), [#428](https://github.com/jwildfire/safety.viz/issues/428), [#259](https://github.com/jwildfire/safety.viz/issues/259) and [#410](https://github.com/jwildfire/safety.viz/issues/410); study.viz issues [#19](https://github.com/jwildfire/study.viz/issues/19) and [#20](https://github.com/jwildfire/study.viz/issues/20). The same app in its own repository: the [study.viz v0.1.0 demo page](../study-viz-v0.1.0-demo/).

## The parts

| File | What it is |
|---|---|
| `capture.cjs` | Takes the stills and reads the app. It holds each thing the page states to what the app shows, and exits 1 when a check fails. |
| `capture.json` | Everything `capture.cjs` read: the chip's list and the line under a study's name, the cards, the titles, the sections and their views, the two Experimental labels and their sentences, a study's notes, the snapshot chosen and what the chip, a chart, the RBQM tab and its Run details then said, the Studies page, the form's labels, where CDISC's attribution sits, the build's steps and times, the requests to R's hosts, every host asked, the mapping before and after a column was set, the header at five widths on seven studies, the expanded profile's measurements, each check, and where each numbered marker sits on its still. |
| `build.cjs` | Writes `index.html` from `capture.json`. It stops if a check did not hold, a still is missing, the capture asked a host the page does not name, or the page would carry a script or a local address. |
| `page.css` | The styles of the v1.12.0 demo page, plus a few rules for PNG stills shown at their own size. `build.cjs` puts them inline. |
| `index.html` | The page. Self-contained: inline CSS, no script, no outside asset but its own stills. |
| `media/` | The stills: PNG, at one pixel per point, light theme, cropped to what matters. All are of a 1,400 by 900 window but three of the header, at 1,280 and 1,440 wide. `header-before.png` and `profile-expanded-before.png` are release 1.12.0 on the released site; every other still is the build of the candidate. |

## How it was made

- `capture.cjs` uses Playwright with headless Chromium. This capture ran against a build of the release candidate served from the capture's own machine: safety.viz at commit `5aedf993`, which was `dev` at `c3918758` (study.builder v0.5.2, safety.viz #428) with one change that was not yet on `dev` when the build was made: the fixes from the second review of the candidate (safety.viz #427, pull request #430). That change merged on 27 November 2026, while the capture ran. `dev` at `57b50d13` holds the same files as the build apart from the stored test records under `docs/evidence/`: `git diff 5aedf993 57b50d13 -- . ':(exclude)docs/evidence'` prints nothing. The script writes nothing to GitHub and signs in to nothing.
- Run it from the root of an `npm ci` checkout of safety.viz, for its Playwright (or set `PLAYWRIGHT` to that folder): `node <path>/capture.cjs`, then `node <path>/build.cjs`. With nothing set it captures the dev site, `https://jwildfire.github.io/safety.viz/dev/demo/`, and reads the commit `dev` is at from GitHub's public API with no token. `BASE` and `BEFORE` point it at other builds; with a build of your own, `BUILD_IS` gives the words the page calls it and `COMMIT` its commit. After the release, `BASE=https://jwildfire.github.io/safety.viz/demo/` takes the stills from the released app; the two "before" stills are then kept from this capture.
- `PARTS=chip,switch,sections,snapshot,studies,files,build,other,profile` takes only the named parts again and keeps the rest from the `capture.json` already here. The parts `snapshot`, `build` and `other` start real R in the browser (webR) and take one to two minutes each.
- The app is driven by its own buttons, as a reader would press them. Nothing is injected into the page.
- Two steps change what reaches the page, both in the part `switch`. The file of one ready-made study (READY-P2) is stopped on its way to the page, as a dropped connection would stop it, to read what the app says when a study does not open. The block is then lifted and the same study opened. The files of one demo study (Renamed columns) are then stopped and let through in the same way.
- The expanded profile is opened by pressing the chart near where one participant (CLD-9002, on the Hepatic Explorer, on the Pilot study) sits, in both releases.
- The one study built is small on purpose: phase 1, 24 participants, 3 sites, 3 months, seed 11, named `DEMO-BUILT`. The second, for the other order of starting R, uses the same numbers.
- "Requests to R's host" counts the requests the page made to `webr.r-wasm.org`, and "requests for packages" those to `repo.r-wasm.org`, during the step named. They are how the page shows that R is not downloaded twice. The capture also lists every host the app asked anything of: its own, and those two. It counts requests by host; it does not read what a request carried.
- Times are from one run on one machine. They are on the page as "on this capture".

Data: the Pilot study and the Renamed columns study are the public, de-identified CDISC Pilot 01 study, with synthetic liver and kidney groups in the labs. The simulated studies are made up, every row, by a modified copy of gsm.datasim 2.1.0 that study.builder carries. No real participant appears. PILOT-PROTOCOL follows one of CDISC's example protocols (DDF-RA, CC-BY-4.0); the app's attribution is on the page in full.

## Things the page states that the capture does not read

- That safety.viz carries study.builder v0.5.2: the release notes, and the record in safety.viz's `site/vendor/study.builder/`.
- That the chip's list also holds your own files while they are loaded and studies saved in the builder; that study.builder has RBQM and Safety views of its own, left out here; what a library's `source`, `portfolio: true` and `viewer` do; that no chart's settings, data or numbers change: the release notes. The capture checks only that the app shows no RBQM or Safety view in the study view, and that Build a study draws in place of the loaded files.
- The "Known, and not fixed" item about the Patient Journey Explorer, and the list of the charts' statistics awaiting a ruling: the release notes. That chart is not in the demo app.
- That the dev site shows what the stills show. The change is on `dev`; the dev site itself was not opened after the merge.
- The status line: that v1.13.0 is a release candidate until it is approved.

## What the capture saw, listed on the page as "Noticed while capturing"

Each is an observation of the build on the day, not a promise that it will change.

- At 1,200 pixels wide the header took two rows on two of the seven studies (Renamed columns; Liver cohort, labs only). At 1,280, the width the release notes name, it was one row on all seven. Widths between the two were not read.
- In the builder's form, Tab from a changed Participants field landed on Sites, and from Sites on Months. Tab from a changed Name, Months or Seed field, each followed by a row of buttons, left keyboard focus on nothing in the page.
- On PILOT-PROTOCOL at its last snapshot the RBQM tab listed 11 sites and the Overview tab counted 12. At the third snapshot both said 4. The study has 12 sites and one has no participants; the RBQM tab lists the sites that have participants.

Two things the page listed on 27 November's first capture are gone, because the app changed: the sentence for a study that did not open no longer points at a form, and the side panel beside the builder now lists what is loaded.

The three things the release notes list as known and not fixed are on the page beside what the capture saw of each.

## Not checked

- Files of the reader's own; the reader's own files or Reset chosen while a slow study is arriving; a hand-set column kept across a snapshot change; what a failed build says; building from a protocol (the form was opened on one example, not built); the other four example protocols and "Open a file…"; the builder's Save, Study file and Download all buttons; the app's one-file download; the Biomarkers tab on a simulated study; the expanded profile in any chart but the Hepatic Explorer; the Patient Journey Explorer; any statistic; a phone; a window narrower than 1,199 pixels; any browser but Chromium.

---
This page was drafted by Claude Code using Fable 5.2.
