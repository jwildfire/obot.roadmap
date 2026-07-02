# Reports

AI-generated reports for the obot portfolio, following the
[gsm.roadmap](https://github.com/Gilead-BioStats/gsm.roadmap) artifacts pattern:
**one folder per report**, containing a self-contained `index.html` (plus any assets)
and a `README.md` recording provenance, sources, and assumptions. The site deploy
workflow publishes this folder as-is.

The reports below were migrated from the [archived obot-claw hub](https://github.com/obot-claw/obot-claw.github.io)
(July 2026). New reports land here under the same contract; see the design doc for
requirement [#7](https://github.com/jwildfire/obot.roadmap/issues/7).

## Index

| Report | Date | Status |
|---|---|---|
| [Autonomous PM/Development framework report](autonomous-agent-framework/) (10 chapters) | 2026-06-06 → 06-11 | **Current** — flagship; Chapter 10 covers the Claude Code migration |
| [Autonomy audit and refactor development framework](autonomy-audit-2026-06-05/) | 2026-06-05 | Current |
| [PM agent and portfolio framework review](pm-portfolio-framework-2026-06-06/) | 2026-06-06 | Current |
| [Subagent failure deep dive](subagent-failure-deep-dive-2026-06-06/) | 2026-06-06 | Current |
| [Work-session supervision acceptance evidence](work-session-supervision-acceptance-2026-06-06/) | 2026-06-06 | Current |
| [P009 supervised runner user summary](p009-supervised-runner-user-summary-2026-06-08/) | 2026-06-08 | Current |
| [Framework options v4 — Paperclip evaluation](autonomous-agent-framework-options-v4-paperclip-2026-06-07/) | 2026-06-07 | Superseded by the framework report |
| [Framework options v3](autonomous-agent-framework-options-v3-2026-06-07/) | 2026-06-07 | Superseded by v4 |
| [Framework options v2](autonomous-agent-framework-options-v2-2026-06-06/) | 2026-06-06 | Superseded by v3 |
| [Framework options v1](autonomous-agent-framework-options-2026-06-06/) | 2026-06-06 | Superseded by v2 |

Superseded versions are retained deliberately (design decision D3) — the memory
philosophy favors preserving the decision trail.

## Adding a report

1. Create `reports/<kebab-name-with-date>/` with a self-contained `index.html`.
2. Add a `README.md`: how it was generated, sources, assumptions, LLM disclaimer.
3. Add a row to the index above (newest current work at the top of its group).
