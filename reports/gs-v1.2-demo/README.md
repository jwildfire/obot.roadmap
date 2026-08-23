# gsm.safety v1.2.0 — annotated demo

Review surface for the gsm.safety v1.2.0 release candidate
([gs#68](https://github.com/jwildfire/gsm.safety/pull/68), `release/v1.2.0` → `main`)
under the RC framework. Built 2026-08-22 by 👯🤖 W0124.

The release swaps the vendored safety.viz bundle from v1.4.0 to v1.7.0 across all eleven
widgets and adds `Widget_HepWaterfall()` and `Widget_NepExplorer()`. Its clinical headline
is the composite eDISH correction ([safety.viz#91](https://github.com/jwildfire/safety.viz/issues/91)):
on-treatment is now every record that is not the baseline record, rather than every record
after day zero.

## How every figure on the page was produced

- The hep-explorer report was rendered once from the package's own
  `inst/workflow/4_modules/hep_explorer.yaml` under gsm.safety 1.2.0 (`release/v1.2.0`
  at `4a436ce`), non-self-contained, then copied; the copy's vendored `safety.viz.js` was
  replaced with the v1.4.0 bundle from the `v1.1.0` tag. The two HTML files are
  byte-identical apart from the library directory name, so the only variable is the bundle.
- Both reports were opened in Chromium via Playwright, switched to the composite view, and
  each bundle's own reduction (`compositeSubjectsShown`) read out — 295 participants under
  1.4.0, 293 under 1.7.0, with the 9 moved peaks and 2 dropped participants diffed
  participant by participant.
- The per-participant record tables come from `ExampleData("adbds")` read directly in R.
- The two new widgets were rendered from their own module workflows on the release's
  bundled example data.
- Bundle identity: the vendored `safety.viz.js` hashes to `ecd740ff…`, the same value as
  the asset the live safety.viz site serves at `dist/safety.viz-1.7.0/`, downloaded and
  hashed while writing the page.

Package versions: gsm.safety 1.2.0 and 1.1.0, gsm.core 1.3.1, gsm.mapping 1.1.6, R 4.3.3.
gsm.core and gsm.mapping were built from the Gilead-BioStats `main` branches into a scratch
library, leaving the machine's own library untouched; both branches are byte-identical to
their `v1.3.1` and `v1.1.6` tags.

Media: 4× JPEG stills under `media/`. The example data is CDISC Pilot 01 with synthetic
augmentation — no real participant data.
