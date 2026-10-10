# safety.viz v1.11.0 — annotated demo

The review page for the safety.viz v1.11.0 release candidate: what the release changes in the demo app, shown on the live dev site beside release 1.10, with steps to try and the things that are @jwildfire's to rule on at the review. The release is the objective to make the demo app ready to show at the keynote of 21 October 2026 (hub [#401](https://github.com/jwildfire/obot.roadmap/issues/401)). It adds no chart and no metric, and nothing the app computes changes.

The sections follow the objective's seven requirements:

- the first screen: tab colours, the study's name, a welcome line (hub [#402](https://github.com/jwildfire/obot.roadmap/issues/402); safety.viz [#290](https://github.com/jwildfire/safety.viz/pull/290));
- the status ladder: one Exploratory label for the app, and six labels below it (hub [#403](https://github.com/jwildfire/obot.roadmap/issues/403); safety.viz [#296](https://github.com/jwildfire/safety.viz/pull/296));
- the R control (hub [#404](https://github.com/jwildfire/obot.roadmap/issues/404); safety.viz [#297](https://github.com/jwildfire/safety.viz/pull/297));
- the RBQM tab (hub [#405](https://github.com/jwildfire/obot.roadmap/issues/405); safety.viz [#298](https://github.com/jwildfire/safety.viz/pull/298));
- files on the Data tab (hub [#406](https://github.com/jwildfire/obot.roadmap/issues/406); safety.viz [#299](https://github.com/jwildfire/safety.viz/pull/299));
- the defects from the review of release 1.10 (hub [#407](https://github.com/jwildfire/obot.roadmap/issues/407); safety.viz [#289](https://github.com/jwildfire/safety.viz/pull/289), [#294](https://github.com/jwildfire/safety.viz/pull/294), [#301](https://github.com/jwildfire/safety.viz/pull/301), [#303](https://github.com/jwildfire/safety.viz/pull/303));
- the standards written down (hub [#408](https://github.com/jwildfire/obot.roadmap/issues/408)).

Data: the app's pilot study is 254 participants from the public CDISC pilot study; its labs file also carries 110 synthetic liver and kidney participants, as the app's Data tab says. The RBQM study is nine raw files in gsm's format for one synthetic study of 765 enrolled participants and 150 sites. No real participant appears.

## The parts

| File | What it is |
|---|---|
| `capture.mjs` | Takes the stills and reads the live pages. Holds what the page says to what the live site shows, and exits 1 when a check fails. |
| `capture-numbers.json` | Everything `capture.mjs` read: the sentences, the numbers, each check and whether it held, where each numbered marker sits on its still, and each still's size. |
| `build.mjs` | Writes `index.html` from `capture-numbers.json`. No sentence quoted from the app and no number is typed into the page by hand. |
| `index.html` | The page. Self-contained: inline CSS, no script, no font or asset from outside but its own stills. |
| `media/` | The stills. |

## How it was made

- `capture.mjs`: Playwright, headless Chromium, real R in the browser. Release 1.11 is the dev site, `https://jwildfire.github.io/safety.viz/dev/`. Release 1.10, for the "before" of each pair, is the released site, `https://jwildfire.github.io/safety.viz/`.
- Run it from the root of an `npm ci` checkout of safety.viz, for its Playwright install and the RBQM study's raw files: `node <path>/capture.mjs <out dir>`, then `node <path>/build.mjs`. `ONLY=1,3` runs some sections and keeps the others' numbers. `BASE` and `BEFORE` point it at other sites.
- Once release 1.11 is on the released site there is no release 1.10 left to capture. The script sees the status label there, says so, and keeps the release 1.10 stills and numbers it has.
- Stills are 1.5× JPEG at 1,280 × 800, and 390 × 844 for a phone. Small things (the label's hover line, the R control's states, the waterfall's titles) are stills of part of the page.
- Each numbered marker on a still is placed from the box of the element it points at, measured when the still was taken, so a marker cannot drift from what it names. `build.mjs` stops if a still's markers and its legend do not match one for one.
- Every section starts in a fresh browser context with an empty cache.
- R's download is counted from the context's finished requests, as compressed response-body bytes: requests to webr.r-wasm.org, to repo.r-wasm.org, and to the page's own address for gsm's packages. A megabyte is 1,048,576 bytes, as in safety.viz's own measure (browser test APP-RBQM-021).
- R that does not start is made by refusing every request to webr.r-wasm.org and repo.r-wasm.org in one browser context.
- Files of one's own are `Raw_SUBJ.csv`, `Raw_AE.csv` and `Raw_PD.csv` from the checkout's `site/data/rbqm/`, handed to the Data tab's drop zone as a browser hands over dropped files.
- What the page takes from GitHub is read by section 7 of the script from GitHub's public API with no token, so it is printed in the comments' own words: the three status questions, the footnote question and its answer, the eight steps of the keynote's demo path with its run and its screenshots, the count fix's own account of what the dev site read, the requirement row for a chart's label on its docs demo page, the contributing guide's headings, and the state of each requirement, task and pull request. GitHub answers 60 anonymous reads an hour from one address; past that the script makes the same read with the `gh` command. It writes nothing.
- `ONLY=7` runs that section alone, with no browser work, and starts its own checks again.

## Every number on the page, and where it came from

| On the page | Read from (`capture-numbers.json`) |
|---|---|
| The welcome line, the tabs' counts and colours, the Data tab's name for the study, the browser tab's titles | `first`, and `first_before` for release 1.10 |
| A link to the RBQM tab at phone width: where the tab sits, and the shortest tab | `phone_link`, `phone_link_before` |
| The label's hover line, the disclaimer, the count of charts on each rung, what each rung means | `status` |
| The six reasons, and that thirteen charts carry no second label and none draws a banner | `status.labels`, `status.unlabelled`, `status.banners` |
| The docs site's labels: 8 Exploratory, 5 Experimental, 1 Prototype | `docs_labels` |
| The R control's words in each state, the line inside the chart, R's test, R's details | `r`, and `r_before` for release 1.10 |
| Megabytes downloaded, and seconds to the first result | `r.megabytes`, `r.seconds_to_statistic`, `rbqm.megabytes`, `rbqm.seconds_to_result` |
| The RBQM tab's row, its outcome line, the site count, the column and table widths, the key, Run details | `rbqm`, and `rbqm_before` for release 1.10 |
| All eight metrics at 150 sites | `rbqm_study` |
| The Data tab's RBQM card, the three dropped files, the nine raw files, the refusal of a file that is not CSV | `data`, and `data_before` for release 1.10 |
| The waterfall's titles, and the width each page lays out at on a phone | `defects` |
| The docs home page's count of charts | `defects.home_description`, `defects.home_description_before` |
| The three status questions, and each issue's state | `github.comments.status`, `github.issues` |
| The footnote: what was asked, what was chosen, what was built | `github.comments.footnote`, `github.comments.answer`, `github.answer` |
| The footnote on the live app: its words, its link, where it sits, and at 390 pixels | `footnote` |
| The version: the app's footer and the docs site's badge | `first.version`, `footnote.app_version`, `defects.docs_version` |
| The keynote's demo path: its eight steps, its command, its run, its nine screenshots | `github.demo_path` |
| Seen while capturing: the two counts on the first screen, the Qualified rung's meaning, the RBQM tab's reason, the active arm's name | `first.welcome`, `first.histogram_line`, `data.study_note`, `status.rungs`, `status.labels`, `defects.waterfall` |
| The requirement row that has a chart draw its own label on its docs demo page | `github.requirement_rows` |
| What the docs home page read before the count was fixed again, and the pull requests called merged | `github.count_fix`, `github.pulls` |
| The contributing guide's section "Demo app conventions" | `github.contributing` |
| That the files R's answers are held to are release 1.10's | `github.since_110` |

Things the page states that the capture does not read:

- A build stops when a chart is marked Qualified: safety.viz's unit tests, as the closing comment on the status ladder requirement records (hub [#403](https://github.com/jwildfire/obot.roadmap/issues/403#issuecomment-6098149252)).
- The limits on waiting for R (ten minutes to start, three to load gsm's packages, five to run), and that they are held by unit tests: the closing comment on the R control requirement (hub [#404](https://github.com/jwildfire/obot.roadmap/issues/404#issuecomment-6098177054)).
- R's rows equal desktop R's to eight decimal places on the RBQM study: safety.viz browser test APP-RBQM-021, which is in the check every pull request must pass.
- The rule that tells a gsm raw file from a study's file, the rule that gives a tab its colour, and @jwildfire's words on raw files being an interim path: the requirements' own text (hub [#406](https://github.com/jwildfire/obot.roadmap/issues/406), [#402](https://github.com/jwildfire/obot.roadmap/issues/402)).
- 765 enrolled participants and 150 sites in the RBQM study: safety.viz unit test APP-RBQM-005; the capture reads the 150 sites.

## Assumptions and limits

- The dev site carries no commit of its own on the page. The footer of the demo page names the commit the `dev` branch stood at when the capture ran, read from GitHub; a deploy that was still under way would make the two differ.
- The "before" of each pair is the released site on the day of capture, which was release 1.10.
- The release candidate's link is a placeholder near the top of the page, `<!-- RC-LINK -->`, in `build.mjs`.
- The RBQM tab's footnote was answered and built on 10 October 2026 and merged in the last pull request before the release candidate. `build.mjs` shows its still when `capture-numbers.json` has a `footnote` entry, and stops if the footnote on the live app is not the one its task says was built.
- The status words the page prints are the app's drafts, which @jwildfire said he would correct at the release candidate. After a correction, run the capture and the build again: the checks name the old words and will fail until their expected text is changed.
- Seconds and megabytes are one run's, over a home connection.

## Stills

| File | Shows |
|---|---|
| `first-110.jpg`, `first.jpg` | The app as it opens, in release 1.10 and release 1.11 |
| `phone-link-110.jpg`, `phone-link.jpg` | A link to the RBQM tab opened at 390 pixels |
| `status-hover.jpg`, `status-panel.jpg`, `phone-status.jpg` | The app's label: on hover, open, and open on a phone |
| `waterfall-110.jpg`, `status-chart.jpg` | The Hepatic ALT Waterfall: the banner of release 1.10, and the label with its panel open |
| `status-tab.jpg` | The RBQM tab's label, open |
| `docs-gallery.jpg`, `docs-title.jpg` | The docs site's gallery and a chart page's title, with their labels |
| `r-110.jpg`, `r-off.jpg` | A biomarker chart before R is started |
| `r-state-off.jpg`, `r-state-starting.jpg`, `r-state-ready.jpg`, `r-state-failed.jpg` | The R control's four states |
| `r-statistic.jpg`, `phone-r.jpg` | R's test under the chart, and the control at 390 pixels |
| `rbqm-off-110.jpg`, `rbqm-off.jpg` | The RBQM tab before R is started |
| `rbqm-running.jpg` | The tab while R starts |
| `rbqm-done-110.jpg`, `rbqm-done.jpg` | The tab after the run, on the pilot study |
| `rbqm-footnote.jpg` | The foot of the tab after the run: the footnote, and the app's footer with its version |
| `rbqm-details.jpg`, `rbqm-metric.jpg`, `rbqm-cannot.jpg` | Run details, a metric's page, and a metric that did not run |
| `rbqm-study.jpg` | All eight metrics on the RBQM study |
| `phone-rbqm.jpg`, `phone-rbqm-metric.jpg` | The tab at 390 pixels |
| `data-raw-110.jpg`, `data-raw.jpg` | Three raw files dropped on the Data tab |
| `rbqm-own.jpg` | The RBQM tab run on those three files |
| `data-pilot.jpg`, `data-study.jpg`, `phone-data.jpg` | The Data tab's RBQM card on the pilot study, on the RBQM study, and at 390 pixels |
| `waterfall-titles-110.jpg`, `waterfall-titles.jpg` | The waterfall's titles |
| `phone-qt-110.jpg`, `phone-qt.jpg`, `phone-api-110.jpg`, `phone-api.jpg` | The QT Explorer and an API reference page at 390 pixels |

---
This page was drafted by Claude Code using Opus 5.5.
