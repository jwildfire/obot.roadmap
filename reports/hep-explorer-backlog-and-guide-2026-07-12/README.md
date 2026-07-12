# Hep-explorer: upstream backlog & a clinical-guide section

A two-part proposal produced off the back of safety.viz PR #44 (the eDISH port):

1. **Upstream backlog triage** — every open issue in `SafetyGraphics/hep-explorer` (35 non-PR issues, fetched 2026-07-12) triaged against our Chart.js port, bucketed into add-this-release / maps-to-existing-defer / new-follow-up / out-of-scope, with a headline release recommendation.
2. **A Clinical guide site section** — a design for a new per-renderer "Clinical guide" tab, grounded in the DIA-ASA Interactive Safety Graphics Working Group's *Hepatic Safety Explorer User's Manual v1.2.1*, with an integration proposal, a copyright-safe content outline, and a page mockup.

## Sources

- Open issues: `https://github.com/SafetyGraphics/hep-explorer/issues` (state=open, 2026-07-12).
- Clinical workflow: *Interactive Safety Graphic – Hepatic Safety Explorer User's Manual* v1.2.1 (DIA-ASA Working Group), `HepExplorerWorkflow_v1_2_1.pdf` — **summarized and linked, not reproduced** (copyrighted third-party document).
- Our port state: safety.viz PR #44 / the hep-explorer requirement matrix (obot.agent#28) / deferred set sv#45–51 under obot.roadmap#30.

## Method

A 7-agent workflow: five parallel issue-triage batches (7 issues each) against a port-state brief, one clinical-guide design agent over the manual + site architecture, and one synthesis pass that bucketed the backlog and cross-checked against the deferred sv# set.

## Status

**Proposal — awaiting @jwildfire.** Nothing is filed or built. Three decisions are staged (A: approve the Clinical guide section; B: confirm the add-this-release short list; C: file the follow-ups). Drafted by Claude Code using Opus 4.8.
