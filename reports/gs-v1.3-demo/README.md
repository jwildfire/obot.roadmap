# gsm.safety v1.3.0 — annotated demo

Review surface for the gsm.safety v1.3.0 release candidate
([gs#69](https://github.com/jwildfire/gsm.safety/pull/69), `release/v1.3.0` → `main`)
under the RC framework. Built 2026-08-22 by 👯🤖 W0124.

The release rebuilds `SafetyCensus()` on twelve census metrics
([D0023](https://jwildfire.github.io/obot.roadmap/reports/decisions/2026-08-20-safety-census-rebuild/)):
the function keeps its name and loses its arithmetic, and every figure it returns is a
numerator a metric published beside the denominator that same metric published. Five
published figures move, the largest being the death count from 4 to 13 of 762.

## How every figure on the page was produced

- `SafetyCensus()` was called twice on the same mapped domains from `gsm.core::lSource` —
  once under gsm.safety 1.2.0 (`release/v1.2.0` at `4a436ce`) and once under 1.3.0
  (`release/v1.3.0` at `9f76d42`) — and the two payloads diffed figure by figure.
- The rendered census page comes from running the whole pipeline: the standard
  `gsm.mapping` mapping, the eleven census metrics with a domain on this study,
  `gsm.reporting::BindResults()` / `MakeMetric()`, then the `safety_census` report workflow.
- The death-count breakdown and the absent-domain behaviour were measured directly, the
  latter by withholding `Mapped_Death` from an otherwise identical call and capturing the
  warning text verbatim.
- `tools/qualify-census-metrics.R` and `tools/qualify-death-count.R` were both run from the
  branch; both exited zero, and every figure on the page agrees with `inst/qualification/`.
- The gsm.core 1.2.0 comparison (760 enrolled, 1 discontinuation-reason death) was run
  against this machine's own R library, to show why the page could not be built there.

Package versions: gsm.safety 1.3.0 and 1.2.0, gsm.core 1.3.1, gsm.mapping 1.1.6,
gsm.reporting 1.1.5, R 4.3.3. gsm.core and gsm.mapping were built from the Gilead-BioStats
`main` branches into a scratch library, leaving the machine's own library untouched; both
branches are byte-identical to their `v1.3.1` and `v1.1.6` tags, which is what CI installs.

Media: 1× JPEG still under `media/`. `AA-AA-000-0000` is the ecosystem's synthetic bundled
study — no real participant data.
