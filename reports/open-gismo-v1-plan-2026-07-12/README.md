# open.gismo v1.0 — design & roadmap (2026-07-12)

Point-in-time design decision and phased roadmap for moving open.gismo toward a v1.0 release
that replaces the safetyGraphics Shiny app. Records the architecture choice (**C+** —
local-first engine, portable site, thin app face), the Phase 0 prototype built and verified in
this session on the `jwildfire/open.gismo` fork (branch `feat/local-first-prototype`), the
evidence, the four-phase plan to September 2026, and six decisions (D1–D6) staged for
@jwildfire's ratification.

Rendered: [index.html](https://jwildfire.github.io/obot.roadmap/reports/open-gismo-v1-plan-2026-07-12/)

## Sources

- **Deep-review synthesis** — state of the union, gap analysis per core requirement, design
  tensions, the three candidate architectures, and open questions.
- **Four-judge panel verdicts** — per-lens scores (end-user UX, ecosystem strategy, one-session
  feasibility, v1.0 roadmap durability) with recommendations and the two killer arguments quoted
  on the page. Totals: A = 16 (2/7/3/4), B = 22 (8/3/6/5), C = 33 (6/9/9/9).
- **Build-fleet results** — the six work packages (A1–A6) that produced `fs_lConfig`, `og_init`,
  `og_validate`, `og_run`, `og_view`, `og_app`, `StandardizeResults`, the site Reports tab, and CI.
- **Adversarial review results** — 12 confirmed findings across three lenses (11 fixed in the PR,
  1 deferred; 3 further candidates dismissed).
- **v1.0 roadmap notes** — the decision record, the four-phase plan, and the D1–D6 decision list
  rendered as the roadmap and decision panel.
- **Style reference** — `reports/harness-proposal-2026-07-04/index.html`, whose light/dark
  custom-property palette and visual language this report reuses so it reads as native to the hub.
- **Evidence** (`evidence/`, copied from the session artifacts): the local-first walkthrough GIF,
  the site pipeline-explorer screenshot, the thin-app screenshot, a static `kri0001` chart PNG,
  and the real 8.4 MB self-contained site-level KRI report HTML the run produced.

## Method

Produced in a single multi-agent "ultracode" session:

- **7-reader review fleet → 1 synthesis.** Parallel readers surveyed the open.gismo repos, the
  demo branch, workr, and gsm.kri; their findings were consolidated into one synthesis (state of
  the union, gap analysis, tensions, candidate architectures).
- **4-judge design panel.** One judge per lens scored the three candidate architectures A/B/C and
  recommended a path; the panel converged on the C+ hybrid (C's engine + a thin B-style shell)
  with the strategy judge's anti-monolith riders.
- **6-package build fleet.** Six agents built the prototype in parallel on the fork worktree, each
  self-verifying (unit tests + an end-to-end run), then integrated.
- **3-lens adversarial review.** R-core, integration, and packaging lenses hunted for defects in
  the integrated PR; confirmed findings were reproduced before being accepted, then fixed or
  explicitly deferred.

Verified figures on the page (timings, counts, test totals, flag changes) are session
measurements on the reference machine (macOS, R 4.3.3), quoted as final.

## Assumptions & caveats

- **Reader-report caveat.** In the synthesis step the seven reader reports arrived as an
  uninterpolated template variable, so the synthesis was rebuilt from direct spot-reads of the
  repos rather than the readers' prose. The conclusions were cross-checked against the build and
  review fleets, which independently executed the same pipeline paths.
- **Prototype, not release.** Phase 0 is a working prototype on a fork, not a shipped v1.0. The
  local-first (`fs_*`) lane is the acceptance path; the GitHub (`gh_*`) publishing lane is kept
  green in CI but its run-pipeline Action is deliberately still unproven end-to-end (Phase 3).
- **Decisions are open.** D1–D6 are recommendations pending @jwildfire's review; the architecture
  is presented as ratifiable, not ratified.
- **Placeholder link.** The draft PR is referenced as "PR #N" until the orchestrator fills the
  actual number.
- Content is frozen as of posting; the live state of the work is on the fork branch, the draft PR,
  and (once filed) the hub Requirement issues.

This report was generated with assistance from a large language model (Claude Code using Fable 5).
It is intended for planning and review only.

---

This report was drafted by Claude Code using Fable 5 and reviewed by @jwildfire
