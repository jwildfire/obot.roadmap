# gsm.safety v1.2.0 — annotated demo

The review surface for the consolidated gsm.safety v1.2.0 release candidate
([gsm.safety#88](https://github.com/jwildfire/gsm.safety/pull/88), `dev` → `main`), under
@jwildfire's decision of 2026-09-12 to ship everything merged since v1.1.0 as one release
("Let's go with option B, but squash it all into a single release: PR/Release notes/Demo for
a single v1.2"). It delivers four hub requirements: widget parity (#164), the SafetyCensus
rebuild (#274), the last two widgets (#165) and FDA ST&F phase 0 (#9).

## How the page was made

The page is assembled from the three demo pages written for the earlier, stacked
candidates, which stay published as the record of when each part was measured:

- Part 1 is `reports/gs-v1.2-demo/` (measured 2026-08-22 on `release/v1.2.0` at `4a436ce`).
- Part 2 is `reports/gs-v1.3-demo/` (measured 2026-08-22 on `release/v1.3.0` at `9f76d42`).
- Part 4 is `reports/gsm-safety-v1.5.0-demo/` (measured 2026-09-11 on `dev`).
- Part 3, the two widgets that never had a candidate or demo, is written from the v1.4.0
  section of `NEWS.md` on `dev` and the closing comment on requirement #165 (gsm.safety#72);
  it carries no capture and says so.

Edits to the copied parts are confined to what the consolidation made wrong: the
before/after column labels in part 2 (the "before" census is v1.1.0's, unchanged by part 1),
the sentences about stacked candidates and remaining deferrals, and the provenance notes.
No figure was re-measured; every number is the earlier page's, on branches whose commits
are all inside `dev`. The three census defects filed by the candidate's code review
(gsm.safety#89, #90, #91) are added to the "deliberately not finished" list.

Media: the six captures copied from the three source pages. The example data are CDISC
Pilot 01 with documented synthetic cohorts and the ecosystem's synthetic bundled study; no
real participant data appears.

Assembled by Claude Code using Fable 5.1 in the 2026-09-12 prep session.
