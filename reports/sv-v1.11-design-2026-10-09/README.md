# safety.viz demo app: design for release 1.11 (2026-10-09)

Round two of the design for the safety.viz demo app, redone from @jwildfire's feedback on the review of release 1.10 (`reports/sv-demo-design-review-2026-10-09/`). The aim he set for the release: ready to be shown live at the R/Pharma keynote on 21 October 2026, and good enough for people to play with afterwards. It is a design: nothing was built, and no file in safety.viz, bio.viz or gsm.safety was changed.

## His feedback, and where it went

- The R control was "a little heavy": it is now one slim control that shrinks to a chip once R is ready (mockup 3).
- "All of this is 'exploratory' - nothing is qualified. All results should be confirmed.": a four-rung ladder, Qualified, Exploratory, Experimental, Prototype, with one app-wide Exploratory label and the same component on a chart below that rung (mockups 1 and 2).
- RBQM: icons for metric status, the overview table's columns capped at 100 pixels, the file box removed in favour of the Data tab, and the log folded to one line (mockups 4, 5 and 6).
- Tab colours: a module names its own, and one that names none is given the first open colour, never grey (mockup 1 and the Tab colours section).

## What the page holds

- A three-line summary and the five decisions still open, recommendation first.
- Six mockups of whole app pages at 1,280 pixels wide, scaled to fit with a full-size switch. Each has numbered markers with a legend, and a Today switch that swaps in a capture of the released 1.10 page in the same state.
- The status ladder: how the rung is stored, its default, and the sentence proposed for each Experimental label.
- The tab-colour rule, the status icons, and what moving raw-file loading to the Data tab involves in the code, with its risks.
- The change list for release 1.11 in six groups, each sized to become one requirement, with what is left out and why.

## The drafts page

`requirements.html` in this folder holds the draft objective and six draft requirements for release 1.11, written by the session's lead from the change list and @jwildfire's feedback under the hub's issue contract. They are drafts: nothing on that page is filed on GitHub, and he has not approved them. Once filed, the issues are the record and that page is history.

## How it was made

- A design subagent of the session did the work, continuing from its review of release 1.10; the session's lead read the page, looked at each mockup at full size, and published it.
- The mockups are HTML and CSS built from the app's own styles at the `v1.10.0` tag (`src/app/styles.js`), around stills of the real charts captured from the live app, https://jwildfire.github.io/safety.viz/demo/, on 9 October 2026. The Today captures are the same live pages at 1,280 pixels wide.
- Code was read from a detached worktree of safety.viz at `v1.10.0` (commit `4a3c07d`).
- The page asks the live safety.viz site for the app's typefaces and falls back to system fonts without them. It loads nothing else from outside.

## Checks

- The subagent's: every mockup state in both modes and both sizes at 1,280 and 390 pixels wide, scroll width equal to the viewport, 31 images, none broken, no console errors; real clicks open and close the labels, play Start R through to the chip, play the RBQM run through six steps to results, and open the log. In the mockup of the overview table with three metrics the number and flag columns measure 100 pixels apart.
- The lead's: the page opened headlessly at 1,280 and 390 pixels wide with no sideways scroll and no console errors, and each of the six mockups read at full size.
- `node scripts/check_artifact_descriptions.mjs` from the worktree root passes with this page present.

## Assumptions and limits

- The 100-pixel column rule is measured on the mockup's own table with the app's styles, not on the live gsm.viz table.
- Five of the six sentences proposed for the Experimental labels are drafts for @jwildfire to correct; the Time-to-Event Explorer's is from the docs site.
- Whether the biomarker library's R can be asked for its version without a release of that library was not checked.
- The mockups are desktop only, as asked. The phone-width fixes in the change list are carried over from the review and were not tested again.
- Per-step times in Run details come from one run on 9 October.
- A shared R for both tabs is left out of release 1.11: it is unproven and needs a release of the biomarker library.

## Sources

- safety.viz at `v1.10.0`: `src/app/` (page, styles, data panel, libraries, the RBQM files, view and run modules, the R modules), `src/shell.js`, `scripts/app-libraries.mjs`, `scripts/site-lib.mjs`, `site/config.json`, `site/rbqm/needs.json`.
- The live site on 9 October 2026.
- @jwildfire's feedback in the session of 9 October 2026.

---

This report was drafted by Claude Code using Opus 5.5 and reviewed by @jwildfire
