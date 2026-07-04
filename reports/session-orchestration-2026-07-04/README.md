# Roadmap agent — session orchestration proposal

Implementation proposal for orchestrated work sessions: an interactive roadmap-agent
session picks 1–2 lanes, spawns a sibling background session per lane, tracks their
status through the harness's session-state machinery, and writes the day's
[diary](../../diary/) entry at wrap-up. Positions the capability as the attended middle
step between [#17](https://github.com/jwildfire/obot.roadmap/issues/17) (safety.agent as
a thin overlay on gsm.agent) and
[#18](https://github.com/jwildfire/obot.roadmap/issues/18) (autonomous lanes), with the
generic pieces flowing upstream to gsm.agent / gsm.roadmap once proven.

**Status: posted for @jwildfire review** (publish-first review flow) — decisions D1–D4
and the implementation order are open. Originally published as a
[Claude Code artifact](https://claude.ai/code/artifact/a88637ab-928a-4f32-b2f7-9c8af30c8ad9);
this copy is the point-in-time record. Once reviewed, the live state of the work moves to
a Requirement issue (proposed in D1).

This report was generated with assistance from a large language model (Claude Code using
Fable 5). It is intended for planning and review only.
