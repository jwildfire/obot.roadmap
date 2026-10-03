# safety.viz v1.9.0 — annotated demo

Walkthrough of what v1.9.0 adds, built as the review surface for the safety.viz v1.9.0 release candidate. v1.9.0 is everything on safety.viz `dev` at [`3acaf62`](https://github.com/jwildfire/safety.viz/commit/3acaf62) (the merge of safety.viz [#186](https://github.com/jwildfire/safety.viz/pull/186), R on request); the dev site was deployed from that commit. The sections cover:

- the Biomarkers tab in the demo app (hub [#366](https://github.com/jwildfire/obot.roadmap/issues/366); safety.viz [#182](https://github.com/jwildfire/safety.viz/issues/182));
- starting R on request, and the single file without it (safety.viz [#183](https://github.com/jwildfire/safety.viz/issues/183));
- the chart list's format version 2 and the Domains page (safety.viz [#181](https://github.com/jwildfire/safety.viz/issues/181));
- the kit, `SafetyViz.kit` (hub [#354](https://github.com/jwildfire/obot.roadmap/issues/354); safety.viz [#154](https://github.com/jwildfire/safety.viz/issues/154)).

Release prep (safety.viz [#187](https://github.com/jwildfire/safety.viz/issues/187)) was still open at capture, so the version shown on the site is 1.8.0. Stills that show a version: `kit.jpg` (header badge `v1.8.0`, and `safety.viz-1.8.0` in its loading snippet) and `domains-top.jpg` (header badge). The app's own version line (`safety.viz 1.8.0`, `app_version_lines`) is not in any still.

Data: the app's pilot demo study, `site/data/` in safety.viz: 254 participants from the public CDISC pilot study; its labs file also carries 110 synthetic participants who are in no other file. No real participant appears.

## How it was made

- `capture.mjs` — Playwright, headless Chromium, real webR, against `https://jwildfire.github.io/safety.viz/dev/`. Run from the root of a fresh `npm ci` clone of safety.viz at `3acaf62` (for its Playwright install and the pilot study's files): `node <path>/capture.mjs <out dir>`. `ONLY=1,3` runs some sections and keeps the others' numbers. Stills are 1.5× JPEG at 1440 × 900, and 390 × 844 for the phone stills. R's download is counted from the browser context's finished requests to webR's hosts, as compressed response-body bytes (`request.sizes().responseBodySize`), from the press of Start R. Every section starts in a fresh context with an empty cache.
- `capture-count.mjs` — reads the Data view's chart count and the app's version line into `capture-numbers.json`.
- The single file is the one served at `dev/demo/safety.viz-app.html`, saved and opened from disk in a browser context with `offline: true`; the pilot study's four files (`adsl.csv`, `adae.csv`, `adbds.csv`, `adeg.csv`) were dropped on it through its own file input. Every http(s) request it made was recorded (`single_file_requests`: none).
- `desktop-r.R` — R 4.3.3. Sources the gsm.bio statistics file the app vendors (`site/vendor/gsm.bio/statistics.R`, gsm.bio `8720f73`, sha256 `ea129ee3…`, the file R in the browser is given) and reads the app's own `site/data/adbds.csv` and `adsl.csv`. It recomputes:
  - the group comparison's one-way ANOVA for Alanine Aminotransferase by arm at every visit, with the arm taken from the subject-level file, one result per participant and visit;
  - the biomarker screen the app opens on, Baseline results of all 28 biomarkers, Placebo against Xanomeline High Dose, keeping a participant's first result per biomarker and visit, as the chart says it does.

  Output: `desktop-r.json`. Run: `Rscript desktop-r.R <safety.viz checkout> desktop-r.json`. This is independent of safety.viz's own `scripts/app-statistics.R`, which answers requests recorded from the app.

Captured 2026-10-03 from 06:39 UTC; the run start of each section is in `captured_at`.

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
| Single file 1,165,774 bytes, no Start R, the unavailable sentence, 0 requests | `single_file_bytes`, `single_file_action` = 0, `single_file_lines`, `single_file_requests` = [] | — |
| Domains: 17 charts read the standard set; format version 2; "Biomarkers, from bio.viz" | `domains_summary`, `domains_format`, `domains_biomarker_section` | — |
| Kit: 36 members, 8 shared modules, Chart.js 4.5.1, public from v1.9.0 | `kit_page.text` | — |
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

This page and README were drafted by Claude Code using Opus 5.5; the numbers were read by script, not typed from memory.
