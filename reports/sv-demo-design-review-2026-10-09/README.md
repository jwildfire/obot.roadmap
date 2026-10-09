# safety.viz demo app v1.10.0: design review and proposal (2026-10-09)

A review of the safety.viz demo app as released in v1.10.0, written for @jwildfire to decide from. He asked for four things: one standard way to load and run R across the app, one "Experimental" label for the whole app with its details on hover and on click, polish for the RBQM tab without changing what it does, and any other formatting, layout or navigation details that need a tweak, starting with the black hexes on the newer tabs. It is a proposal: nothing was built, and no file in safety.viz, bio.viz or gsm.safety was changed.

## What the page holds

- Eight decisions at the top, each with a recommendation first and the alternative after it.
- Four sections, one per ask. Each shows what is there today with stills, what is inconsistent or wrong with the file and line behind it, and the proposed change.
- Three mockups in HTML and CSS: the standard R strip in its four states (it runs on a press, and can be made to fail), the single Experimental label with its detail (it opens on a tap), and the top of the RBQM tab after the polish items.
- A list of defects found in the released app, kept apart from the design items.
- A table of every proposed change with the files it touches and a size, quick wins first.
- What could not be verified.

## How it was made

- A design subagent of the session did the review; the session's lead read the page, checked a sample of its findings against the code, and published it.
- The live site was confirmed as the v1.10.0 build: the docs header and the app footer both say 1.10.0.
- Code was read from a detached worktree of safety.viz at the `v1.10.0` tag (commit `4a3c07d`). Every "Where" line on the page is a path and line at that tag.
- The app was walked in a browser on the live site, https://jwildfire.github.io/safety.viz/demo/, with both R starts triggered there, and captured with headless Playwright from safety.viz's own `node_modules` at 1280, 1440 and 390 pixels wide. The stills in `img/` are those captures, cropped.
- Timings (1.7 to 4.6 seconds for the biomarker charts' R, 21 to 43 seconds to the RBQM tab's first results) were measured on one Mac on a home connection.
- The page asks the live safety.viz site for the app's three typefaces and falls back to system fonts without them. It loads nothing else from outside.

## Checks

- The lead checked these findings against the code at the tag and they hold: the graphite hex colour and the rule that applies it (`src/app/styles.js:47` and `56`, `src/app/libraries.js:323-325`, `src/app/page.js:427`); the RBQM tab's pill hidden between 761 and 1339 pixels (`src/app/styles.js:216-218`); two steps each said to be the longest (`src/app/rbqm.js:98` and `102`); the two callers of the in-chart banner and no caller of the Prototype banner; the RBQM tab's unused title and one-line description in `site/config.json`; the overprinted titles on the Hepatic ALT Waterfall, from the still.
- The rest of the findings are the subagent's, with its stills as the evidence.
- Opened headlessly with Playwright (from the safety.viz checkout) at 1280x900 and 390x844: the document's scroll width equals the viewport width at both (1280 and 390), 37 images, none broken, no console errors or page errors, the four font files loaded.
- `node scripts/check_artifact_descriptions.mjs` from the worktree root passes with this page present.

## Assumptions and limits

- A shared R for the whole app is a reading of the code, not a run. Nobody has run the biomarker statistics and gsm's packages in one R in a browser.
- R was not tried on a slow connection or a real phone.
- The single-file download of the app was not opened; its two "cannot start R" sentences were read in the code.
- Whether gsm.viz lets the app rename the overview table's first column, show a cell's numbers on a tap, or change the charts' typeface was not checked.
- The gsm.safety R widgets were not opened. The proposal for a chart with no page around it rests on `src/shell.js` alone.
- The Time-to-Event Explorer's arm colours were read from a still; the other two sets were measured on the page.
- The RBQM "why it is experimental" sentence in the label mockup is a draft from the release notes, marked as one. The other charts' reasons are left blank for @jwildfire.
- Sizes in the last table (small, medium, large) are estimates from reading the code.

## Sources

- safety.viz at `v1.10.0`: `src/app/`, `src/shell.js`, `src/hep-waterfall.js`, `src/hep-explorer/views/migration.js`, `src/qt-explorer.js`, `scripts/app-libraries.mjs`, `scripts/site-lib.mjs`, `scripts/site.mjs`, `site/config.json`, `site/site.css`, `site/shell.html`, `site/vendor/bio.viz/bio.viz.js`, `NEWS.md`.
- The live site at https://jwildfire.github.io/safety.viz/ on 8 and 9 October 2026.
- This hub's `reports/README.md` for the form.

---

This report was drafted by Claude Code using Opus 5.5 and reviewed by @jwildfire
