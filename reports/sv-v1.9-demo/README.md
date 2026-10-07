# safety.viz v1.9.0 — annotated demo

Walkthrough of what v1.9.0 adds, built as the review surface for the safety.viz v1.9.0 release candidate. v1.9.0 is everything on safety.viz `dev` at [`096cc26`](https://github.com/jwildfire/safety.viz/commit/096cc26d48e5d3cd1bf03eb78249658974c7a307), the merge of release prep (safety.viz [#189](https://github.com/jwildfire/safety.viz/pull/189), for [#187](https://github.com/jwildfire/safety.viz/issues/187)) on top of [`3acaf62`](https://github.com/jwildfire/safety.viz/commit/3acaf62) (the merge of safety.viz [#186](https://github.com/jwildfire/safety.viz/pull/186), R on request). Release prep set the version to 1.9.0, added the `dist/safety.viz-1.9.0/` bundles, rebuilt `dist/safety.viz-1.8.0/` without the kit and updated NEWS, README and test fixtures; it changed no file under `src/` or `site/`. So the app, R-on-request and single-file captures, taken against the dev deploy of `3acaf62`, still hold. The single file served at `096cc26` measures the same 1,165,774 bytes. The two stills that show the version, `kit.jpg` and `domains-top.jpg`, were re-captured against the dev deploy of `096cc26` (its Pages run succeeded) and now show `v1.9.0`, with `safety.viz-1.9.0` in the kit's loading snippet. The sections cover:

- the Biomarkers tab in the demo app (hub [#366](https://github.com/jwildfire/obot.roadmap/issues/366); safety.viz [#182](https://github.com/jwildfire/safety.viz/issues/182));
- starting R on request, and the single file without it (safety.viz [#183](https://github.com/jwildfire/safety.viz/issues/183));
- the chart list's format version 2 and the Domains page (safety.viz [#181](https://github.com/jwildfire/safety.viz/issues/181));
- the kit, `SafetyViz.kit` (hub [#354](https://github.com/jwildfire/obot.roadmap/issues/354); safety.viz [#154](https://github.com/jwildfire/safety.viz/issues/154)).

The app's own version line (`app_version_lines`, read at `3acaf62`: `safety.viz 1.8.0`) is in no still.

Data: the app's pilot demo study, `site/data/` in safety.viz: 254 participants from the public CDISC pilot study; its labs file also carries 110 synthetic participants who are in no other file. No real participant appears.

## How it was made

- `capture.mjs` — Playwright, headless Chromium, real webR, against `https://jwildfire.github.io/safety.viz/dev/`. Run from the root of a fresh `npm ci` clone of safety.viz (`3acaf62` for the first captures; sections 3 and 5 only read the live site) (for its Playwright install and the pilot study's files): `node <path>/capture.mjs <out dir>`. `ONLY=1,3` runs some sections and keeps the others' numbers. Stills are 1.5× JPEG at 1440 × 900, and 390 × 844 for the phone stills. R's download is counted from the browser context's finished requests to webR's hosts, as compressed response-body bytes (`request.sizes().responseBodySize`), from the press of Start R. Every section starts in a fresh context with an empty cache.
- `capture-count.mjs` — reads the Data view's chart count and the app's version line into `capture-numbers.json`.
- The single file is the one served at `dev/demo/safety.viz-app.html`, saved and opened from disk in a browser context with `offline: true`; the pilot study's four files (`adsl.csv`, `adae.csv`, `adbds.csv`, `adeg.csv`) were dropped on it through its own file input. Every http(s) request it made was recorded (`single_file_requests`: none).
- `desktop-r.R` — R 4.3.3. Sources the gsm.bio statistics file the app vendors (`site/vendor/gsm.bio/statistics.R`, gsm.bio `8720f73`, sha256 `ea129ee3…`, the file R in the browser is given) and reads the app's own `site/data/adbds.csv` and `adsl.csv`. It recomputes:
  - the group comparison's one-way ANOVA for Alanine Aminotransferase by arm at every visit, with the arm taken from the subject-level file, one result per participant and visit;
  - the biomarker screen the app opens on, Baseline results of all 28 biomarkers, Placebo against Xanomeline High Dose, keeping a participant's first result per biomarker and visit, as the chart says it does.

  Output: `desktop-r.json`. Run: `Rscript desktop-r.R <safety.viz checkout> desktop-r.json`. This is independent of safety.viz's own `scripts/app-statistics.R`, which answers requests recorded from the app.

Captured 2026-10-03 from 06:39 UTC; `kit.jpg` and both Domains stills re-captured at 07:07 UTC against `096cc26` (`domains-bio.jpg` came out byte-identical). The run start of each section is in `captured_at`.

## Every number on the page, and where it came from

`capture-numbers.json` key → the live page; `desktop-r.json` key → desktop R.

| Number on the page | Read from | Desktop R check |
|---|---|---|
| Tabs 9 of 9, 1 of 1, 3 of 3, Biomarkers 4 of 4; each biomarker chart ready | `tabs`, `biomarker_items` | — |
| 17 of 17 charts ready | `data_view_of_17` ("17 of 17 charts ready") | — |
| "12 of 28 biomarkers shown", page 1 of 3 | `overview_count`, `bio-tab.jpg` | `screen_baseline.biomarkers` = 28 |
| The need-R sentence; 0 requests to R's host before the press | `need_r_lines`, `action_idle.title`, `r_requests_before_press` = 0 | — |
| Starting R… → R started, 1.5 s | `action_starting`, `action_running`, `r_started_seconds` = 1.537 | — |
| 13.26 MB, 7 requests, all to webr.r-wasm.org; nothing more for the screen | `r_megabytes`, `r_requests`, `r_hosts`, `screen.r_requests_total_after` = 7 | — |
| ANOVA p and counts, Baseline to Week 26 (table) | `r_test_panels` | `alt_by_visit`: every visit matches (e.g. Week 4 p 0.004889, 75/67/65; Week 20 p 0.0502) |
| R's reason under small unscheduled visits (minimum group size 5) | `r_test_panels` | `alt_by_visit` (status not computed, NA p) |
| Screen: Platelet 0.3404 (0.01 to 0.6696), p 0.042 / 0.295; 28 biomarkers | `screen.rows`, `screen.caption` | `screen_baseline.top3` (0.340401, 0.0099997 to 0.669613, 0.04219, 0.29536, 78/65) |
| Single file 1,165,774 bytes (the same at `096cc26`), no Start R, the unavailable sentence, 0 requests | `single_file_bytes`, `single_file_action` = 0, `single_file_lines`, `single_file_requests` = [] | — |
| Domains: 17 charts read the standard set; format version 2; "Biomarkers, from bio.viz" | `domains_summary`, `domains_format`, `domains_biomarker_section` | — |
| Kit: 36 members, 8 shared modules, Chart.js 4.5.1, public from v1.9.0 | `kit_page.text` (re-read at `096cc26`) | — |
| 254 participants; 110 synthetic in the labs file only | live notes "of 254 participants drawn"; the pilot study's description in `src/app/studies.js` | `participants` = 254 |

## Stills

| File | Shows |
|---|---|
| `bio-tab.jpg` | The Biomarkers tab on the pilot study, the group comparison overview, Start R |
| `bio-need-r.jpg` | Alanine Aminotransferase chosen before the press: "Statistics need R…" |
| `bio-starting.jpg`, `bio-started.jpg` | The control reading Starting R…, then R started |
| `bio-r-test.jpg` | R's one-way ANOVA under Week 4 and Week 6, R's reasons under small visits |
| `bio-screen.jpg` | The biomarker screen on the same R |
| `phone-tab.jpg`, `phone-r-test.jpg` | The tab before the press, and R's Baseline test, at 390 px |
| `file-header.jpg`, `file-offline.jpg` | The single file offline: the tab with no Start R, and the unavailable line |
| `domains-top.jpg`, `domains-bio.jpg` | The Domains page summary, and its "Biomarkers, from bio.viz" section |
| `kit.jpg` | The kit's API reference |

Media total about 2.4 MB.

## The v1.9.2 note (2026-10-07)

The note `<div class="note" id="v192">` in the page's masthead is the whole demo of the v1.9.2 patch release, linked from the release notes as `#v192`. Since 2026-10-07 it is worded for the release: [safety.viz v1.9.2](https://github.com/jwildfire/safety.viz/releases/tag/v1.9.2) was released that day, when the owner approved the release candidate ([safety.viz#218](https://github.com/jwildfire/safety.viz/pull/218)). Its captures and numbers were taken from safety.viz `dev` at [`dfbb4f4`](https://github.com/jwildfire/safety.viz/commit/dfbb4f4f1644e8bd0d42fe006024b9811f2ace92), one step before release preparation set the version to 1.9.2; the released demo app's footer reads 1.9.2 and an install measures about 285 MB. It covers the installer for the demo app (safety.viz [#214](https://github.com/jwildfire/safety.viz/issues/214), PR [#215](https://github.com/jwildfire/safety.viz/pull/215)) and the demo app's biomarker charts rebuilt on bio.viz v0.3.0 and gsm.bio v0.3.0 (hub [#367](https://github.com/jwildfire/obot.roadmap/issues/367); safety.viz [#212](https://github.com/jwildfire/safety.viz/issues/212), PR [#213](https://github.com/jwildfire/safety.viz/pull/213)). No existing still or section was changed.

### How it was made

- `capture-v192.mjs` — Playwright, headless Chromium, real webR, against `https://jwildfire.github.io/safety.viz/dev/demo/`. `PLAYWRIGHT_FROM=<a package.json whose node_modules holds playwright> node capture-v192.mjs <out dir>`; `LOCAL=http://127.0.0.1:8711/` also captures the page the installer serves, and `ONLY=1,2,3` runs some sections. Stills are 1.5× JPEG at 1280 × 800 (the cross-tabulation's is taller, to hold R's line), and 390 × 844 for the phone stills. It writes what it read to `capture-v192-numbers.json` and holds 30 things the note says to the page that shows them; it exits 1 when one fails. All 30 passed.
- The installer was run for real on macOS 14 with Node 24.14.0 and git 2.39.3, in an empty scratch folder:
  - `install-demo.mjs` was downloaded from `raw.githubusercontent.com/jwildfire/safety.viz/dev/scripts/install-demo.mjs` (12,371 bytes, byte-identical to `origin/dev`). The same address on `main` answered 404 then, which is why that run names `dev`. Since the release it answers 200, and the note's commands name `main` and no `--ref`.
  - `node install-demo.mjs --ref dev --no-open --port 8711` cloned `dfbb4f4`, installed, built and served; the page answered 200 about 51 seconds after the command started. The listener was `127.0.0.1:8711` and nothing else. The folder measured 275 MB (`du -sh`): 127 MB `node_modules`, 14 MB `build`.
  - An interrupt to the installer ended it and the demo, and the address stopped answering. Run again with no `--ref`, it printed "safety.viz 1.9.1 is already in …; using it." and answered within seconds.
  - With no `--ref` in a fresh folder it cloned `main` (v1.9.1) and stopped with "has no demo command: it came in v1.9.2."; run again over that folder with `--ref dev` it stopped with "already holds safety.viz 1.9.1, and it is used as it is."
  - The first clone attempt was cut off by the network ("RPC failed; curl 56"); the installer stopped with git's message and left no folder. The second went through.
- `desktop-r-v192.R` — R 4.3.3, base R alone (it sources nothing from gsm.bio), on `site/data/adsl.csv` and `adbds.csv` of the clone the installer made. `Rscript desktop-r-v192.R <safety.viz checkout> desktop-r-v192.json`. It recomputes the one-way ANOVA of Alanine Aminotransferase by arm at the ten scheduled visits (`anova(lm())`, a participant's first result at the visit, the arm from the subject-level file) and the table of arm by end-of-study status with `chisq.test()` and `fisher.test()`.

### Every number in the note, and where it came from

| Number in the note | Read from (`capture-v192-numbers.json`) | Desktop R (`desktop-r-v192.json`) |
|---|---|---|
| Biomarkers 5 of 5, the five charts ready; 18 of 18 charts | `tabs`, `biomarker_charts`, `charts_line`; "18 of 18 charts ready" is in `v192-local.jpg` | — |
| bio.viz 0.3.0; the footer reads safety.viz 1.9.1 | `bio_viz_version`, `app_version` | — |
| 28 trend tiles, no statistic, 9 unscheduled visits not drawn, no request to R | `tiles`, `tiles_statistic`, `tiles_hidden_visits`, `r_requests_at_tiles` = 0 | `biomarkers` = 28, `unscheduled_visits` = 9 |
| Ten visits; "Statistics unavailable" before R | `over_time_before_r`, `over_time_before_r_line` | — |
| The one-way ANOVA row: p = 0.515, 0.127, 0.005, 0.037, 0.013, 0.380, 0.170, 0.050, 0.517, 0.252, and the number in each arm | `over_time` | `alt_by_visit`: every p-value and count matches |
| Week 4 alone: Visit "1 of 10"; p = 0.005 (75, 67, 65); the trail and its way back | `one_visit_control`, `one_visit_lines`, `one_visit_trail`, `trail_back_one`, `trail_back_two` | `alt_by_visit["Week 4"]` |
| Cross-tabulation: 58 and 28, 27 and 45, 25 and 71, total 254; chi-square and Fisher both p < 0.001 (n = 254) | `cross_tab` | `cross_tab`: the same counts; p = 6.7e-08 and 5.6e-08 |
| Starting R: 13.25 MB in 7 requests, all to webr.r-wasm.org; nothing more afterwards | `r_megabytes`, `r_requests`, `r_hosts`, `r_requests_after_walk` = 7 | — |
| At 390 px the page does not scroll sideways | `phone` (both scroll widths 390) | — |
| The Biomarker screen's `init()` sentence | `screen_sentence` | — |
| The installed demo: 18 of 18, Biomarkers 5 of 5, 28 tiles, asked `127.0.0.1:8711` only | `local` | — |
| 254 participants; 110 synthetic in the labs file only | the charts' own notes, in `v192-cross-tab.jpg` | `participants` = 254 |
| 2,242 unit and 385 browser tests; ten behaviours broken on purpose; three review findings | not measured here: safety.viz `NEWS.md` and the two pull requests | — |

### Stills

| File | Shows |
|---|---|
| `v192-local.jpg` | The demo app the installer served at `http://127.0.0.1:8711/`, on the Data view |
| `v192-tiles.jpg` | The Biomarkers tab, 5 of 5, the group comparison on its trend tiles |
| `v192-over-time.jpg` | Alanine Aminotransferase over time, R's test under each visit |
| `v192-one-visit.jpg` | Week 4 opened alone, the trail above it |
| `v192-cross-tab.jpg` | The cross-tabulation with R's chi-square test |
| `v192-phone-tiles.jpg`, `v192-phone-over-time.jpg` | The tiles and one biomarker over time at 390 px |
| `v192-screen-note.jpg` | The Biomarker screen's sentence about `init()` (bio.viz [#119](https://github.com/jwildfire/bio.viz/issues/119)) |

The v1.9.2 stills total about 1.1 MB.

### What changed when v1.9.2 was tagged

Done on 2026-10-07: every element that was worded for a candidate, each marked with a `data-flip` attribute in `index.html`, now reads for the release, and the attributes are gone. The installer transcript is still the run made before the release, with `--ref dev`, and its caption says so.

This page and README were drafted by Claude Code using Opus 5.5; the numbers were read by script, not typed from memory.
