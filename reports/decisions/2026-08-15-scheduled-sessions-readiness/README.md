# D0014 — Scheduled sessions: go, after four fixes

**Status: Awaiting @jwildfire** — S1–S4.

Readiness assessment for enabling the scheduled (nightly-trigger, no-human-launch)
autonomous session lane — autonomy level A2 in `obot.agent/scripts/policy.json`,
launched via `obot-auto`. Answers @jwildfire's question "What else do we need to do
before turning on the scheduled sessions next week?" (chat, 2026-08-15).

## Provenance and sources

- Primary evidence: the 2026-08-14 and 2026-08-15 session scratchpads (~25 sibling
  sessions, several fully unattended), sibling close-outs, and the day's decision
  artifacts.
- Everything asserted was re-verified live on 2026-08-15 evening, not recalled:
  - obot.agent#113 state (OPEN, CI green, MERGEABLE, classifier-blocked).
  - demo-301 workflow runs (`gh run list`): Run Pipeline failed 2026-08-03 and
    2026-08-10; build-site has zero runs.
  - policy.json v2 (profiles, classes, A1/A2 levels, invariants, carve-out).
  - Live dry-run: `obot-merge 52 -R jwildfire/gsm.safety --check` → approval tier
    demanded on a clinical release branch.
  - merge-gate-guard.sh patterns (CLI + REST + GraphQL merge routes covered).
  - User + workspace permission lists (close/delete denies are CLI-string-only;
    `gh api *` allowed; one entry on both lists).
  - Navigator launchd job + navigator-state.md freshness + tick log.
- Blocker-item text deliberately withheld from the public page per the blockers-list
  containment rule (D0010); the page points at the local list, count-only.

## Assumptions

- The oa#113 classifier denial is environmental (permission layer), not a policy
  misconfiguration — hub140x verified obot.agent main resolves `standard` correctly.
- Effort estimates assume the Navigator sweep codebase is the base for the watchdog.

---

This decision artifact was drafted by Claude Code using Fable 5 and reviewed by @jwildfire.
