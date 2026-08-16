<!--
NEWS.md is the running release log and the draft of each release's notes
(obot.agent/skills/rc-release-notes/SKILL.md): newest section first; unreleased
work accumulates under a vX.Y (Upcoming) heading that loses the suffix when the
release is cut; the GitHub release publishes from the section verbatim.
-->

# obot.roadmap v0.4 (Upcoming)

- **The roadmap-page design spike is live** — three genuinely different redesign candidates rendered beside the current page on live data at [`roadmap-spike/`](https://jwildfire.github.io/obot.roadmap/roadmap-spike/): the queue (what needs you), the wire (what changed), the board (what is running) — with decision artifact D0018 carrying them side by side. Decided the same day: the queue becomes the front page, the wire sits one click behind it, the board's NOW panel is absorbed as a slim strip, and the current inventory page stays on as the catalog; the rebuild is [#211](https://github.com/jwildfire/obot.roadmap/issues/211).
- **The roadmap page opens with what needs you** — a Todo section leading with the two queues: release candidates awaiting review, then decisions needed, each linking its PR or Q&A thread.
- **Decisions have a lane**: self-contained artifacts under `reports/decisions/` with an index, each posted to a Q&A discussion where the decision is documented in-thread — including the RC-shape (R2), operational-vs-clinical, session-model, elicitation-method, and prime-context decisions.
- **Diary entries lead with RCs then decisions** — the RC-first wrapup format, so the daily record carries the same two headlines as the queues.
- **Nightly roadmap audits** publish a findings page every day under `reports/`.
- **Release-candidate demo pages** ship under `reports/` for each RC (safety.viz v1.6.0, obot.agent v0.4.0), walking every change against the live surface.

# Earlier releases

- [v0.3 — the roadmap that runs itself](https://github.com/jwildfire/obot.roadmap/releases/tag/v0.3) — 2026-07-25.
- [v0.2 — Designs signed off, identities and the session loop in place](https://github.com/jwildfire/obot.roadmap/releases/tag/v0.2) — 2026-07-11.
- [v0.1 — Roadmap hub established](https://github.com/jwildfire/obot.roadmap/releases/tag/v0.1) — 2026-07-03.
