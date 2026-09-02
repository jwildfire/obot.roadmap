# D0032 — One study, then the whole report

**Status: Awaiting his answers** — R1–R4 (D0032.1–.4).

A colleague's replication-readiness assessment of open.csr (dated 1 September) asked whether open.csr can reproduce the CDISC pilot clinical study report, and answered "not yet". This page checks that assessment against the repository and the data, records where it needs correction, and turns its build order into a four-release roadmap. The first release is broken into nine issues that could be filed as-is.

The argument: the assessment's central finding is confirmed from the data — the assembled report reads two packagings of the same study that disagree on the actual treatment of twelve subjects, so one section says 96 people took the low dose and another says 84. Everything else on its page is downstream of that. Its build order is right; its counts are right; one of its data-conflict rows (race) is a coding convention rather than a conflict, and one of its structural asks (a study-specific profile) is already a one-file change under the existing design.

**Goal:** [#112](https://github.com/jwildfire/obot.roadmap/issues/112) · **Milestone:** [open.csr v0.4.0](https://github.com/jwildfire/open.csr/milestone/4) · **Follows:** [D0030](../2026-08-27-sap-shells/) (SAP shells), [D0031](../2026-08-31-september-plan/) (September plan) · **Response to send:** [response.md](response.md)

## The four questions, one line each

- **R1 — the roadmap.** Adopt four releases: v0.4.0 one study, v0.5.0 the whole text (after the review layer), v0.6.0 the submission document, v1.0.0 the replication proven, with the general intake named as 1.1. Recommendation: yes; it is the assessment's own order with the SAP moved to the text release.
- **R2 — the data default.** Flip the source registry so the pilot's own package feeds every display, keeping the pharmaverse re-derivation only as the measured alternate (revises design decision D12). Recommendation: yes; the rule protecting the six original displays turned out to be protecting the document from agreeing with itself, and the last technical reason — exposure needing ADEX — does not hold.
- **R3 — the milestone.** Re-scope v0.4.0 to one study plus the seven missing displays, and move the SAP (open.csr#57) to v0.5.0. Recommendation: yes; the SAP page's questions are still open, so nothing in motion is displaced.
- **R4 — before the talk.** Issues A and B alone (two sessions) so the public demo stops contradicting itself, or the whole first release (about five) if September's answer sends the week to open.csr. Recommendation: the two sessions regardless; the week only if S2 sends it here.

## Measured for this page, not relayed

- Both lanes prepared through `prepare_data()` and tabulated by `TRT01P` and `TRT01A`: pharmaverse lane actual treatment 86 / 96 / 72; pilot package 86 / 84 / 84 by either. Race, sex, ethnicity, site and planned arm agree on all 254 subjects.
- The reference PDF fetched at the SHA-256 pinned in `quality/data/reference-report-agreement.json` and text-extracted: post-text set Tables 14-1.01 to 14-7.04 (thirty) and Figure 14-1; in-text Tables 11-1, 12-1 to 12-4 and Figures 9-1, 10-1. Titles and title-page numbers for the twelve displays the plan adds read from the document.
- `phuse-org/phuse-scripts` listed: `data/adam/cdiscpilot01/` has no `adex.xpt`; the pilot ADSL carries `AVGDD` and `CUMDOSE`; `data/sdtm/cdiscpilot01/` carries `cm.xpt`.
- Text library: fifteen `TXT-E3-*` blocks, ten approved 2026-07-25, five `generated`-tier drafts unapproved; `TXT-E3-1101` still carries "No efficacy analysis set is defined for this report".
- `git merge-base --is-ancestor origin/main origin/dev` fails in open.csr; `dev` has zero commits `main` lacks; 43 files differ, all version and evidence stamps from the v0.3.0 release.
- `pipeline/R/mmrm.R` fits with `nlme`; `mmrm`, `emmeans` and `pbkrtest` are not installed locally.
- `library/tfl/` on `dev` at `b9ecbfa` holds 26 displays; `library/templates/` holds four template objects; `site/config.json` lists the SAP as `planned`.

## Sources

- The assessment: a self-contained HTML file supplied by @jwildfire on 2026-09-02, not reproduced here.
- open.csr `dev` at `b9ecbfa`, `main` at `ff03f52`, release v0.3.0 (2026-08-27).
- `docs/design/design.md` (D6, D9, D12), `docs/design/framework.md`, `NEWS.md`, `qc/*.R`, `quality/data/*.json`.
- Hub: goal #112, requirements #111, #113, #129, #130, #179, #131; decisions D0029, D0030, D0031.

## Assumptions

- The talk date and September's allocation (D0031 S1, S2) are unresolved; the page conditions its September recommendation on them rather than re-asking.
- The reference report's appendix count of fourteen groups is taken from the assessment; the appendix table of contents did not extract cleanly from the PDF text and was not independently counted.
- Session sizes are calibrated on the sessions that produced v0.3.0 (four displays to nine displays per session, each with three-route agreement).

---

Drafted by Claude Code using Fable 5.1 and reviewed by @jwildfire.
