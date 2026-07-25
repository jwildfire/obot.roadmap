# Participant profile v2 — UX mockup

Interactive design mockup for requirement
[#75](https://github.com/jwildfire/obot.roadmap/issues/75) (participant profile v2 —
sidebar surfacing + AE domains), promoted from
[discussion #49](https://github.com/jwildfire/obot.roadmap/discussions/49). Companion to the
design document at
[`requirements/design/75_design.html`](https://jwildfire.github.io/obot.roadmap/requirements/design/75_design.html).

Published: <https://jwildfire.github.io/obot.roadmap/reports/participant-profile-v2-mockup-2026-07-24/>

## What it shows

- The participant profile in a **right-hand rail** as the default click behaviour, with
  push vs overlay, an adjustable rail width, and auto-collapse of the chart's own controls.
- The **four surfacing options side by side** — dock (v1, shipped), opposite rails, both
  right stacked, both right tabbed — each applied live to the running chart.
- **Expand to full screen**: the rail fills the renderer's container and the module's own
  control sidebar appears (i.e. the standalone renderer).
- **AE summary and AE timeline tracks** added to the profile, with the timeline pixel-locked
  to the labs chart's study-day axis.
- The **cohort stepper** (#45 D3) in rail context, via a button that dispatches an
  8-participant selection.
- Nine decisions (D1–D9), each with a recommendation, all left open for @jwildfire.

## What is real and what is mocked

**Real** — the Hepatic Safety Explorer, its control sidebar and selection event, and the whole
participant-profile block (header, spaghetti, measure table, sparkline insets, cohort stepper).
Switching to a "both right" layout moves the chart's actual sidebar element into the rail.

**Mocked by this page** — the rail chrome, push/overlay behaviour, the expand state, the
standardization control in the rail head, and both AE tracks. The AE tracks read the real
adverse-event dataset for the selected participant but are rendered by `mockup.js`, not by
the library.

## Sources and assumptions

- `vendor/safety.viz-dev-1.4.1.js` — the committed dist bundle from the safety.viz `dev`
  Pages tier (`dev/dist/safety.viz-1.4.1/safety.viz.js`), built from `dev` after
  [sv#105](https://github.com/jwildfire/safety.viz/pull/105) landed the participant-profile
  rollout. Vendored rather than linked so the mockup keeps working when the dev tier moves on.
- `data/adbds-liver.csv` — the safety.viz demo lab extract (CDISC Pilot 01 ADaM, via
  pharmaverseadam), subset to the four liver measures the hepatic tools standardize.
- `data/adae.csv` — the adverse-event dataset shipped with the ae-explorer demo, unmodified.
- **Study days are derived.** The lab extract carries visits, not study days, while the AE
  file is in study days. The page derives a nominal day per record from the visit label
  (Baseline = day 1, "Week N" = day 7N + 1) and interpolates unscheduled visits. This is
  local cleaning for the mockup: the real requirement is a study-day column in the lab
  domain, which is called out as decision D7.
- **The demo's constructed `CLD-` cohort has no adverse events**, so clicking one of those
  points shows the AE empty state. The page opens on `01-701-1239`, who has both elevated
  transaminases and ten adverse events.

## Measurements taken from the page

- The measure table will not lay out below **455px** of content width, so a rail narrower
  than about 500px clips its sparkline column. The default rail width here is 520px.
- The shipped control sidebar renders on the **left**, not the right — so the profile rail
  and the controls do not compete for a slot.

---

*Drafted by Claude Code using Opus 5 and reviewed by @jwildfire*
