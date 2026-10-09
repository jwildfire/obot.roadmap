# safety.viz CI speed spike (2026-10-09)

A design and research spike @jwildfire asked for on 2026-10-09: "safety.viz CI/CD is slow. ~22 minutes to run the test for each PR. Do a design/research spike to see if we can optimize." The page says where the 22 minutes go, times five other ways of running the same tests on GitHub's runners, recommends one that takes about 6 minutes with every test kept, and records what a security assessment of that layout found. Nothing in safety.viz's `dev` or `main` was changed.

## Status

Decided the same day. @jwildfire asked for the objective to be built out with the security assessment folded in, and chose to land the work in safety.viz release 1.11. The page's Decisions section carries his words and links the objective, its requirements and their tasks.

## What the page holds

- The answer in three bars: 22.6 minutes today, 12.1 with each suite run once, about 6 with the browser suite on two runners behind a gate.
- Where the 22 minutes go in one real run, why the check doubled between 7 and 9 October, and why more workers do not help.
- A table of the layouts measured, with the result of each.
- The recommendation in three steps, what was looked at and set aside, and what the spike left behind.
- The security assessment: eight findings with severity, whether the change introduces each, and what closes it; and a correction to a claim the page made before the assessment.

## How it was made

- Baseline: the step timings and logs of safety.viz's CI runs, read through the GitHub API on 2026-10-09. The medians by day are over the last 100 successful first-attempt runs of the CI workflow. Per-test times are parsed from the log of [the run on dev at 04:04 UTC](https://github.com/jwildfire/safety.viz/actions/runs/37882151006).
- Measurements: a temporary workflow on the scratch branch `spike/ci-speed` in safety.viz, pushed as the bot with no pull request, in two rounds ([round 1](https://github.com/jwildfire/safety.viz/actions/runs/37941542874), [round 2](https://github.com/jwildfire/safety.viz/actions/runs/37944608902)). Wall clock is from the first job starting to the last job finishing. In round 2 each layout ran twice; the two gates of the split layout waited on all four browser jobs, so each repetition's time is its own longest job plus its gate.
- Security assessment: a second agent of the same session, given the branch and the plan and not the page's conclusions. It ran the evidence guard locally against hand-edited results built from one real run of the unit suite and the real list of browser tests. It pushed nothing; what it says about GitHub's behaviour is from documentation.
- The page was checked at 390 and 1,280 pixels wide in a headless browser, in the light and dark themes.

## Limits

- Every timing is from one day. There are three runs of the recommended layout and three of the single pass, one of which lost 9.5 minutes to a stalled package mirror.
- The evidence refresh run's new layout is designed, not measured.
- The claim that tests inside one file cannot run side by side rests on one failed attempt and a reading of the specs.

## Sources

- safety.viz: `.github/workflows/ci.yml`, `.github/workflows/evidence-update.yml`, `scripts/evidence.mjs`, `scripts/evidence-lib.mjs`, `playwright.config.js` on `dev` at `7a875f72`.
- [Everything the scratch branch changes](https://github.com/jwildfire/safety.viz/compare/dev...spike/ci-speed).

---
This report was drafted by Claude Code using Opus 5.5. It is LLM-generated; check a figure against its linked run before relying on it.
