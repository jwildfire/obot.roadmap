# safety.viz demo app: a standard note where R can be started (2026-10-13)

Mockups for release 1.11.1 of the safety.viz demo app, asked for by @jwildfire on 13 October 2026: "a standard note for charts where user can trigger R. Users should be able to click a button in the `<p>` to trigger. Format as a Warning on charts that can't run. Format on info for charts where p-values will be added. Give me mockups first." While the page was being made he added: "remove the purple color here. use blue for info throughout", of the line the app shows on first open. It is a design: nothing was built, and no file in safety.viz or bio.viz was changed.

## Round two (later on 2026-10-13)

@jwildfire read the first round and said: "mock-up looks good. Get rid of the data info box." The page was updated in place; the first round is in git history at commit `3eb674d`.

- The line on first open ("You are looking at the CDISC pilot study…") is removed from every proposed capture, the note's own section and the change list. Release 1.11.0 added that line, so the Today captures still show it.
- Every proposed page was captured again, with R started, held back and blocked as before, and the markers moved to the new positions.
- The five decisions stay as recommended until he approves them.

## What the page holds

- A three-line summary and five decisions, the recommended answer first.
- Four mockups of whole app pages at 1,280 pixels wide, with numbered markers and a legend. Each has a Today switch that swaps in the released page in the same state; the first has a switch for each alternative that changes the page; Start R and Try again can be clicked.
- The other three biomarker charts with the same note, and a table of what each chart draws without R and what R adds.
- The note itself, drawn by the page in the proposed styles, in each of its states.
- Every note in the app, as it is in release 1.11.0 and as proposed.
- The change list for the release, as one requirement of four tasks, with what is left out.

## What was found

- Three of the five biomarker charts draw without R, and R adds a test and its p-value: Group comparison, Association scatter, Cross-tabulation.
- Two draw no result without R: the Correlation matrix shows an empty grid, and the Biomarker screen lists the biomarkers it would screen. With the RBQM tab, these are the charts the page proposes the warning for.
- The sentence under a biomarker chart ("Statistics need R. Start R, at the top right.") is handed to the chart by the app, so the app can change its words without a bio.viz release. Putting a button inside that line would need one.

## How it was made

- The Today captures are the released demo app, https://jwildfire.github.io/safety.viz/demo/ (safety.viz 1.11.0), at 1,280 by 820 pixels on 13 October 2026, in a headless browser.
- The Proposed captures are the same live pages with the proposed note and colours applied to the page before the capture: the styles in `note.css` added, the note's element inserted, the chart's own line reworded, and the line on first open taken out. They are pictures of the real page as changed in the browser, not of a build.
- The states are real: R was started on the Association scatter and on the RBQM tab for the ready and finished captures, R's hosts were held back for the starting captures, and blocked for the failed ones.
- `capture.cjs` is the script. It needs a safety.viz checkout with its packages installed for the browser, and its path is written into the script.
- Code was read from safety.viz at its development branch, commit `980e1709`, which holds only the notes' promotion since the `v1.11.0` tag.
- The page asks the live safety.viz site for the app's typefaces and falls back to system fonts without them. It loads nothing else from outside.

## Checks

- The page opened headlessly at 1,280 and 390 pixels wide: scroll width equal to the viewport at both, no console errors, no failed requests.
- Every state and version of every mockup was walked with real clicks at both widths, 28 frames, each image loaded; pressing Start R in the first mockup played through starting to ready.
- `node scripts/check_artifact_descriptions.mjs` passes with this page present.

## Assumptions and limits

- The sentences in the notes are drafts for @jwildfire to correct.
- Desktop only. How the note wraps on a phone is not mocked.
- The Group comparison is shown in its first view, the tiles, where no test is asked of R; the view with one biomarker open was not captured.
- In the table of every note, the example sentences for a chart that needs more data, an unsupported RBQM metric, a load note and a failed draw are shortened stand-ins, not the app's exact words.
- Whether the format a chart gets should be named in bio.viz's chart list or in the page's list of libraries is proposed, not settled: the page proposes the second for this release.

## Sources

- safety.viz `src/app/`: `r-control.js`, `r-on-request.js`, `r-words.js`, `page.js`, `rbqm-view.js`, `styles.js`, `libraries.js`; `scripts/app-libraries.mjs`.
- The released demo app on 13 October 2026.
- @jwildfire's two messages in the session of 13 October 2026.
- The form of the page: the hub's `requirement-design` skill and `reports/sv-v1.11-design-2026-10-09/`.

---

This report was drafted by Claude Code using Opus 5.5 and reviewed by @jwildfire
