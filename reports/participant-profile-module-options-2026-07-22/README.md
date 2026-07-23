# Participant profile — one drill-down module for every safety.viz chart

Design-options artifact, 2026-07-22. Triggered by collaborator feedback on the
hep-explorer composite view: hovering shows details, but clicking a patient point
does not open the multi-graph drill-down the original SafetyGraphics eDISH had.

Proposes carving the original's click-rendered participant profile (header,
standardized-labs-over-time spaghetti, measure table with sparklines) out as a
shared `participant-profile` module, and lays out four surfacing options —
A dock below the chart, B slide-over drawer, C full view, D host-composed
standalone renderer — with a recommendation (D's packaging + A's default dock,
cohort stepper for multi-select). Decisions D1–D4 await @jwildfire.

## Sources

- Original drill-down behavior: local clone `obot2/hep-explorer`
  (`src/callbacks/onResize/customizePoints/` — `addPointClick.js`,
  `participantHeader/`, `spaghettiPlot/`, `measureTable/`,
  `initParticipantDetails.js`), v1.4.2.
- Current behavior: `obot2/safety.viz` `src/hep-explorer.js` (`drawDetail` L2002,
  `toggleCompositeSelection` L1655, `dispatchSelection` L2106),
  `src/hep-explorer/structureData.js` (`participantMeasureSeries` L464,
  `measureSummary` L486), `src/shell.js`, `src/histogram/listing.js`.
- Related issues: safety.viz #53, #87, #88, #91, #92, #93; obot.roadmap #41, #43.

## Assumptions

- Mockups are schematic sketches in the keynote theme, not renderer output.
- "Yesterday's related issues" interpreted as sv#87/#88 (participant selection)
  with sv#53/#91–#93 as adjacent context.
- No implementation started; requirement filing follows the D1–D4 decisions.
