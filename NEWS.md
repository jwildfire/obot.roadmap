<!--
NEWS.md is the running release log and the draft of each release's notes
(obot.agent/skills/rc-release-notes/SKILL.md): newest section first; unreleased
work accumulates under a vX.Y (Upcoming) heading that loses the suffix when the
release is cut; the GitHub release publishes from the section verbatim.
-->

# obot.roadmap v0.4 (Upcoming)

- **The drift count stops reporting a blocked mechanism as decay** — nothing can put an issue on the [obot Roadmap board](https://github.com/users/jwildfire/projects/1) any more ([#252](https://github.com/jwildfire/obot.roadmap/issues/252)), so every requirement filed since joins the off-board set and the drift number climbs by itself. Those rows are now counted as blocked rather than as drift, still shown and still saying `Unstaged`, with one line under the table naming the block and linking the decision. The queue says it once instead of once per requirement, and the audit marks the 61 findings whose repair is a board write as ones it cannot run — refused before anything is attempted, rather than failing halfway ([#254](https://github.com/jwildfire/obot.roadmap/issues/254)).
- **The roadmap page leads with what needs you** — [`roadmap.html`](https://jwildfire.github.io/obot.roadmap/roadmap.html) is now the queue: everything waiting on @jwildfire in one ranked list, longest wait first, each card carrying the one action that clears it. [The wire](https://jwildfire.github.io/obot.roadmap/wire.html) is one click behind with the last 7 days newest-first, and a slim NOW strip on both says what is running right now. Nothing moved: the URL everything already pointed at is the one that changed behind you.
- **The inventory survives in full as [the catalog](https://jwildfire.github.io/obot.roadmap/catalog.html)** — every requirement, PR, release, goal and idea, both composable filters, the hierarchy current-versus-proposed review lane, the audit fold and the changelog, exactly as they were; it simply stops being the front door. Deep links into it keep working from their old addresses. Decided as D0018 and built as [#211](https://github.com/jwildfire/obot.roadmap/issues/211); the three design-spike pages that produced the decision have come down, as the decision said they would.
- **Release-candidate dedupe actually runs** — the browser copy of the release-identity rule had lost its backslashes on the way into the page and quietly matched no version at all, so an RC PR and its draft release always counted twice. It is now emitted from `scripts/lib/rc.mjs` instead of retyped, with a test that evaluates what reaches the browser ([#209](https://github.com/jwildfire/obot.roadmap/issues/209)).
- **Section deep links land on their section** — a fragment like `#sec-audit` was being erased on load before the browser could act on it, dropping every such link at the top of the page instead. Fixed, along with the stale `#sec-usage` link left behind when Cost moved to the analytics page.
- **The roadmap page opens with what needs you** — a Todo section leading with the two queues: release candidates awaiting review, then decisions needed, each linking its PR or Q&A thread.
- **The decision log agrees with itself** — whether @jwildfire has decided something was recorded in two places, the published index and a field in the decision registry, with nothing comparing them; ten of twenty-one artifacts disagreed. The artifact page is now the single authority: it declares its state beside his recorded words, the registry is stamped from it, the index row is checked against it, and the deploy fails on any disagreement ([#196](https://github.com/jwildfire/obot.roadmap/issues/196), [#255](https://github.com/jwildfire/obot.roadmap/issues/255)).
- **Decisions have a lane**: self-contained artifacts under `reports/decisions/` with an index, each posted to a Q&A discussion where the decision is documented in-thread — including the RC-shape (R2), operational-vs-clinical, session-model, elicitation-method, and prime-context decisions.
- **Diary entries lead with RCs then decisions** — the RC-first wrapup format, so the daily record carries the same two headlines as the queues.
- **Nightly roadmap audits** publish a findings page every day under `reports/`.
- **Release-candidate demo pages** ship under `reports/` for each RC (safety.viz v1.6.0, obot.agent v0.4.0), walking every change against the live surface.

# Earlier releases

- [v0.3 — the roadmap that runs itself](https://github.com/jwildfire/obot.roadmap/releases/tag/v0.3) — 2026-07-25.
- [v0.2 — Designs signed off, identities and the session loop in place](https://github.com/jwildfire/obot.roadmap/releases/tag/v0.2) — 2026-07-11.
- [v0.1 — Roadmap hub established](https://github.com/jwildfire/obot.roadmap/releases/tag/v0.1) — 2026-07-03.
