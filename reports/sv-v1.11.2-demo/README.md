# safety.viz v1.11.2 — annotated demo

The review page for the safety.viz v1.11.2 release candidate. It shows the one change in the release: Hep Explorer gets the new R ratio (nR) as a Point Size setting and as a tooltip line. The page shows it on the dev site's Hep Explorer demo, beside release 1.11.1, and has steps to try. Task: safety.viz [#334](https://github.com/jwildfire/safety.viz/issues/334), pull request [#335](https://github.com/jwildfire/safety.viz/pull/335). Release preparation: [#336](https://github.com/jwildfire/safety.viz/issues/336).

## The parts

| File | What it is |
|---|---|
| `capture.cjs` | Takes the stills and reads the live pages. It holds each claim the page makes to what the live site shows, and exits 1 when a check fails. |
| `capture.json` | Everything `capture.cjs` read: the Point Size options before and after, the two legend notes, the tooltip lines before and after, the counts on the demo data, each check, and where each numbered marker sits on its still. |
| `build.cjs` | Writes `index.html` from `capture.json`. It stops if a check did not hold or a still is missing, and if the participants it names have moved. |
| `page.css` | The styles from the v1.11.1 demo page, plus the band table and the tooltip lines. `build.cjs` puts them inline. |
| `index.html` | The page. Self-contained: inline CSS, no script, no outside asset but its own stills. |
| `media/` | The stills: `by-nr.jpg` and `by-r.jpg`, the scatter under each Point Size setting, and `tooltip.jpg`, one participant's tooltip. |

## How it was made

- `capture.cjs` uses Playwright with headless Chromium. Release 1.11.2 is the dev site, `https://jwildfire.github.io/safety.viz/dev/hep-explorer/`. Release 1.11.1 is the released site, `https://jwildfire.github.io/safety.viz/hep-explorer/`. Both open on the composite plot, so the script first chooses the eDISH / mDISH scatter.
- Run it from the root of an `npm ci` checkout of safety.viz, for its Playwright: `node <path>/capture.cjs`, then `node <path>/build.cjs`. `BASE` and `BEFORE` point it at other sites.
- The counts are read from the chart's own points in the page: participants plotted, how many have an R and an nR, how many have an nR above or below their R, and how many fall in each band of the clinical guide's table.
- The example participant is the one with the highest nR among those that nR moves into a higher band. On this data that is also the participant with the highest nR overall, and `build.cjs` stops if it is not.
- The commit is read from GitHub's public API with no token. The script writes nothing to GitHub.
- The stills are 1.5× JPEG at a 1,280 × 1,000 viewport.

## After the release

Once release 1.11.2 is on the released site, run `BASE=https://jwildfire.github.io/safety.viz/ node <path>/capture.cjs`, then `node <path>/build.cjs`. The script sees that the released site already offers nrRatio, keeps the release 1.11.1 reads it has, and the page then calls release 1.11.2 "the released site". Do not remove `capture.json` first.

This was done on 15 October 2026, after release 1.11.2 was published: 9 of 9 checks held on the released site, with `main` at `4ffccf9f`. The release 1.11.1 reads and their two checks are those of the dev-site capture, which is the commit before this one in the hub's history.

## Things the page states that the capture does not read

- How nR is defined, that either aminotransferase alone is enough, and that it is always computed against the upper limit of normal. These come from safety.viz `src/hep-core/rows.js` (`computeNRRatio`) and requirement row HEP-DISPLAY-008. The capture checks the consequence it can see: no participant's nR is below their R.
- That the original Hep Explorer took the ratio at each visit: SafetyGraphics/hep-explorer `src/callbacks/onInit/cleanData/makeRRatio.js`.
- The bands (above 5, 2 to 5, below 2): the safety.viz clinical guide for Hep Explorer.
- That the R filter, the participant profile and the gsm.safety widget are unchanged: pull request #335's diff.
- The data's provenance: safety.viz `docs/DATA_SOURCES.md`. Wording corrected after the release candidate's review (safety.viz #338): the pilot study is public and de-identified, and the page names one largest point under rRatio, not several. The largest point under rRatio being a synthetic `CLD-*` participant is checked by `build.cjs`.

---
This page was drafted by Claude Code using Opus 5.5.
