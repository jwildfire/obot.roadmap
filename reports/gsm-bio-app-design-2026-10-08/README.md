# The biomarker app: three shells and a Data page (2026-10-08)

A page of design options for `gsm.bio::RunApp()`, the six biomarker charts in one Shiny app, written for @jwildfire to pick from. It covers the app's shell and navigation and its Data page, which he asked to look like a professional web app rather than a default Shiny page. It is a proposal: nothing was built, and no file under gsm.bio, bio.viz or safety.viz was changed.

## What the page holds

- A three-line summary of the options and the pick, under the title, for a phone.
- What reads as ad hoc Shiny today, with stills of the running app at 1280px and 390px.
- The fixed constraints every option respects, and the safety.viz demo app as the reference for "a professional web app" in this program, with two stills of it.
- Three options, A to C, each as HTML and CSS mockups at 1280px and 390px with a still of a real chart in place, then the Data page in three states (as it opens on the synthetic study; a results file chosen with two columns unsaid, an outcomes file R could not read, and the Draw button pressed once; applied on the reader's files with no outcomes table), then what is better, what is worse and what it costs, including which browser-test ids each option keeps.
- Eight decisions inside the options, each with a pick.
- A recommendation (A, with two things carried in from B) and the build order.

## How it was made

- The app's source was read from the `80-data-viewer` worktree of gsm.bio (`R/RunApp.R`, `R/app-data.R`, the app vignette and the README). The states, sentences, ids, counts and column names on the page come from there.
- The chart stills were captured from the app running on this machine at `http://127.0.0.1:4602`, with chromote from R (`capture.R` in the session's scratch directory): the group comparison overview and its IL-6 over time view, the association scatter, the correlation matrix and the stratified survival chart, each as the chart element alone (`#GroupComparison` and the others) at 1180px, 2x; and the whole page at 1180px and at 390px. Two stills were cropped from the session's earlier captures of the same app at 1280px and 390px: the wide group comparison overview (`chart-wide.jpg`) and the phone chart with its Controls collapsed (`chart-phone.jpg`). The three stills of today's app (`today-app.jpg`, `today-phone.jpg`, `today-data.jpg`) are the v0.4.0 demo page's own captures of the app as it opens, at gsm.bio 0.4.0, scaled down; the phone still is its first screen. The chart stills inside the mockups were taken a little earlier, so a chart's own footnote in them reads "bio.viz 0.3.0 with development changes" where the release reads "bio.viz 0.4.0".
- The safety.viz demo app was looked at in a browser at 1280px and 390px, on its live dev site, a chart open and its Data page; the three stills of it are the browser's own screenshots at 800px wide.
- The mockups are HTML and CSS of this page around those stills. A desktop mockup is laid out at 1280px and scaled to the room it has, with a toggle to show it at full size scrolling inside its own frame; a phone mockup is laid out at 390px. The page loads nothing from outside, so the mockups use system fonts; the real shell would ask for the family's web fonts (Instrument Sans, Instrument Serif) and fall back to the system's.
- The page's own chrome follows the recent report pages: light and dark by the system setting, one `<meta name="description">`, bulleted lists, no bold inside a paragraph or bullet, callout blocks for emphasis.

## Checks

- Opened headlessly with Playwright (from the safety.viz checkout) at 1280x900 and 390x844, in light and dark: the document's scroll width equals the viewport width at both (1280 and 390), 11 images, none broken, no console errors or page errors. With a desktop mockup switched to full size at 390px, the frame scrolls and the page still does not (page scroll width 390, frame scroll width 1280).
- `node scripts/check_artifact_descriptions.mjs` from the worktree root: 128 artifacts, all described, with this page present.

## Assumptions and limits

- The chart stills are scaled to the width each shell gives them. A real chart given more width reflows its tiles rather than growing, so the desktop mockups overstate the size of the chart's text slightly where the shell is wider than 1180px.
- The dm.csv preview rows and its column names beyond USUBJID (ARM, SEX, AGE, RESPONSE, COUNTRY) are made up for the mockup, as are the file names lb.xpt, dm.csv and notes.xlsx. The results rows, the counts (200 participants, 11,472 results, 12 biomarkers, 5 visits, 1,148 pages of ten rows) and the column names USUBJID, VISIT, VISITNUM, TEST, STRESU, STRESN are the synthetic study's.
- Effort estimates ("a day", "two days") are the designer's reading of the Shiny constructs involved, not measurements.
- The browser tests were not run; which ids each option keeps was read from the app's source and the capture script that drives it, not from the test files themselves.

## Sources

- gsm.bio worktree `80-data-viewer`: `R/RunApp.R`, `R/app-data.R`, `vignettes/articles/app.Rmd`, `README.md`.
- bio.viz `site/site.css` and `site/shell.html`; safety.viz `site/site.css`; the safety.viz demo app at https://jwildfire.github.io/safety.viz/dev/demo/.
- This hub's `reports/README.md` and two earlier options pages, `og-data-loading-design-2026-08-27/` and `open-csr-sidebar-anatomy-2026-09-02/`, for the form.

---

This page was drafted by Claude Code using Fable 5.1.
