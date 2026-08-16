# The roadmap page — three directions to react to (D0018)

Status: **Decided 2026-08-16** — R1–R3 (D0018.1–.3). @jwildfire approved the spike's
recommendation in chat ("i'm good with your rec  build"): the queue becomes the
front page, the wire sits one click behind it, the board's NOW panel is absorbed as
a slim strip, and the current inventory page survives as the catalog. R1 and R2 are
settled in his words; R3 — the fixed, labelled recent window as the public answer to
"what changed" — follows by implication from the page he approved, and is recorded
as an implication on the artifact so it is cheap to correct. The rebuild is
requirement [#211](https://github.com/jwildfire/obot.roadmap/issues/211); the
commissioning requirement
[#202](https://github.com/jwildfire/obot.roadmap/issues/202) closes out.

The design spike for the roadmap-page redesign: three genuinely different working
pages deployed beside the current one, on live data, at
[`roadmap-spike/`](https://jwildfire.github.io/obot.roadmap/roadmap-spike/). The
artifact page here carries them side by side with the questions his reaction has
to answer. Commissioned under requirement
[#202](https://github.com/jwildfire/obot.roadmap/issues/202), built as task
[#204](https://github.com/jwildfire/obot.roadmap/issues/204) — the first project
handed to obot-prime and obot-navigator to run without him (2026-08-16).

## Provenance

- Drafted 2026-08-16 by worker W0004 (Claude Code, Fable 5), spawned by
  🧭🤖 obot-navigator; direction pages built by sub-workers W0004.1 (the queue),
  W0004.2 (the wire), W0004.3 (the board); the current-page steelman by W0004.4.
- The three directions were designed and built independently and to equal depth,
  by explicit instruction: no favourite was built out further, and no two options
  were merged before he saw them apart.
- The generator is `scripts/build_spike.mjs` plus one module per direction under
  `scripts/spike/`; pages rebuild on every site deploy from the same collectors
  the roadmap page itself reads. The spike is temporary by design — generator,
  deploy step and validate lines all come out once the decision lands.

## Sources

- Requirement #202 and task #204 (the brief, including the three-questions test
  and the do-not-converge instruction).
- The live collectors under `scripts/lib/collect/` (requirements, PRs, releases,
  decisions, ideas, goals, hierarchy), the committed audit ledger and roadmap
  changelog, and the heartbeat-published session-state feed.
- The current page's generator (`scripts/build_roadmap_next.mjs`) and its view
  model (`scripts/lib/highlights.mjs`), read in full for the fourth-option
  section.
- The navigator's correction of 2026-08-16 on the "since you last looked"
  question: no direction may compute a personal window from a stand-in signal;
  the real signal is pending [#205](https://github.com/jwildfire/obot.roadmap/issues/205).

## Assumptions

- The public site records nothing per visitor; a per-browser `localStorage`
  timestamp is the only honest personal record available to a static page, and
  it is labeled as exactly that wherever used.
- The current inventory page survives somewhere reachable whichever direction
  wins (R2 asks him to confirm or overrule).
- Counts-only for anything workspace-local: no direction reads or renders
  config-list item text; the deploy's local-only guard stands between the
  build and the site.

## Verification

The verification record lives on the artifact page (Evidence section): per-page
390 px viewport checks in a real Chrome viewport with screenshots stored in this
folder, live-data cross-checks of one fact per page against GitHub, and the
existing-URL regression list. Checks were run against the deployed pages, not
the local build.
