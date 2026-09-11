# gsm.safety v1.5.0 — annotated demo

Review surface for the gsm.safety v1.5.0 release candidate (`gsm.safety v1.5.0-RC1`,
`dev` → `main`) under requirement [obot.roadmap#9](https://github.com/jwildfire/obot.roadmap/issues/9),
phase 0 of the FDA Standard Safety Tables and Figures work. Built 2026-09-11 by the
requirement session on gsm.safety.

The release ships the guide's Appendix Tables 56 to 60 as package data
(`FDA_AbnormalityLevels`, `FDA_ExtremeValues`; gsm.safety#77), the first three
`Derive_*` functions that apply the guide's rules to a long lab table and return it with
the derived columns added (gsm.safety#78), the requirement matrix keying all 22 figures
and 16 cross-cutting rules (`requirements/fda-stf.md`; gsm.safety#79), and the ADaM to
`Mapped_*` alignment note with the phase 1 column contract
(`design/fda-adam-alignment.md`; gsm.safety#80).

## How every figure on the page was produced

- Row counts, spot values and the sample outputs were run from the release branch on
  2026-09-11 with `devtools::load_all()` on R 4.3.3; the same numbers are asserted in
  `tests/testthat/test-fda-reference.R` and `tests/testthat/test-Derive.R`.
- The liver-panel figure (`media/liver-grades.png`) is `ExampleData("adbds")` passed
  through `Derive_ULNMultiple()` and `Derive_AbnormalityLevel()`, drawn with ggplot2;
  the cut lines are read from `FDA_AbnormalityLevels`, not typed.
- The grep counts on the matrix were run on the branch that adds it; the rule citations
  were counted over `tests/testthat/` on the branch that adds the derivations.
- The alignment summary table is copied verbatim from the note.

Sources: FDA CDER, Standard Safety Tables and Figures: Integrated Guide v2.0 (April 2025),
https://www.fda.gov/media/187065/download; the hub's figure inventory at
`reports/fda-stf-static-displays-plan-2026-07-21/fda_stf_inventory.json`; the design at
`requirements/design/9_design.html`.

Media: one PNG under `media/`. The example data are pharmaverseadam extracts of the CDISC
pilot study with documented synthetic cohorts; no real participant data appears.
