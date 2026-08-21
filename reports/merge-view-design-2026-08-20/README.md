# The Merges Tab — design

A design for a fifth Operations Dashboard tab that answers one question: what did the
agents actually change today, and where is it going. Requested by @jwildfire on
2026-08-20 after listening to the day's briefing episode — "a view in the dashboard that
shows me metrics for merges… very directly tying agent IDs to pull requests to packages."

This is a design, not a build. Nothing in it is running.

## What is on the page

- A mock of the proposed tab, rendered from 2026-08-20's real merge data rather than from
  placeholder content, so the reaction is to something true.
- Four design calls with the reasoning behind each: how unattributable merges are handled,
  what a day means, why the tab never asks for anything, and what counts as a merge.
- The one gap that has to close before the tab can be built, and four questions for
  @jwildfire with a recommendation on each.

## Sources

Every number was measured on 2026-08-20 between 20:15 and 21:00 local, from:

- The GitHub API — merged pull requests across the `jwildfire` org, their merge commits
  (for the `Worker:` trailer), base branches, and release tags.
- `obot.agent/scripts/policy.json` — branch roles and repo classes, read rather than
  restated.
- `.claude/workers.journal` — worker ids, slugs, and recorded tasks.
- `.claude/session-hub/cache/metrics.json` — inspected to establish what the existing
  cache does and does not store.

## The measured shape of the day

- 20 merges: 17 to `obot.agent` main, 2 to `obot.roadmap` main, 1 to
  `jwildfire.github.io` main. Zero to safety.viz, gsm.safety, open.gismo, open.csr or
  demo-301.
- 15 merges attributed to 11 workers by commit trailer; 4 by the lead session, which holds
  no worker id by design; 1 merged by @jwildfire.
- 3 of the 17 `obot.agent` merges carry a UTC date of 2026-08-21, so a UTC day would have
  reported 14.

## Assumptions and corrections

- The brief assumed the agent → pull request join was broken via
  [obot.agent#276](https://github.com/jwildfire/obot.agent/issues/276). Measurement showed
  the commit-trailer join intact (26 of 26 worker merges in the last-30 sample). #276
  breaks the ledger join, not the git one, and the design says so rather than designing
  around a defect that is not there.
- The four untrailered merges were assumed to be attribution failures. They are
  prime/Navigator re-ranks, which claim no worker id.
- `safety.viz` `dev` being 0 ahead / 12 behind `main` looked like an inverted branch model.
  The 12 are promotion merge commits that never return to `dev` — normal, not a backlog.

## Related

- Shared stylesheet, inlined here: `obot.agent/assets/obot.css` (obot.agent#15).
- Operations Dashboard: `obot.agent/tools/ops-dashboard`.
- Merge policy and branch roles: `obot.agent/scripts/policy.json`.

---

Drafted by worker W0094 (Claude Code using Opus 5) for @jwildfire.
