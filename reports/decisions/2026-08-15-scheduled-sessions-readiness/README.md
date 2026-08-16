# D0014 — Scheduled sessions: go, after three fixes

**Status: Awaiting @jwildfire** — S1–S4.

**Corrected 2026-08-16** — published as *"go, after four fixes"*; one of the four is
withdrawn. See "The correction" below.

Readiness assessment for enabling the scheduled (nightly-trigger, no-human-launch)
autonomous session lane — autonomy level A2 in `obot.agent/scripts/policy.json`,
launched via `obot-auto`. Answers @jwildfire's question "What else do we need to do
before turning on the scheduled sessions next week?" (chat, 2026-08-15).

## The correction

The page's one *never acceptable* row — that the local permission classifier had
denied `obot-merge`'s landing command for obot.agent#113 "in every sanctioned form
(4 attempts)", and had also denied the same agent's `blocker-log` write and its
`gh pr comment` — **did not happen**. Origin: a single sibling-agent report
(hub140x, 2026-08-15 ~15:40), relayed onward as fact and written onto this page
without anyone re-running the command.

Falsified independently by four agents: opsux (no reproduction), oa113 (clean on
the first try, exit 0, before touching anything), a first correction agent
(2026-08-16 00:52), and this one. obot.agent#113's actual blocker was a merge
conflict; it was resolved and **#113 merged 2026-08-15 22:41 UTC** (`3a2128c`).

### Re-verification run for this correction — 2026-08-16, 06:03–06:07 CEST

All first-hand, run before the page was edited, on live repositories:

| Command | Result |
|---|---|
| `scripts/obot-merge 113 -R jwildfire/obot.agent --check` — plain, `./`-relative, absolute, and `bash`-prefixed forms | All four executed; no prompt, no classifier denial. Business-logic refusal only (`PR state is MERGED, not OPEN`). |
| `scripts/obot-merge 52 -R jwildfire/gsm.safety --check` (live open clinical RC) | exit 0 — `PASS - merging is permitted on the approval tier (explicit Jeremy approval + --jeremy-approved required)` |
| `bash obot.agent/tools/blocker-log --audit` | exit 0 — ledger clean, 11 ids allocated / 11 present |
| `bash obot.agent/tools/scratchpad-log d0014fix "…"` (called directly, not via the heredoc fallback) | exit 0; line confirmed present in `.claude/session-notes/2026-08-16.md` at 06:05 |
| `gh pr view 113 -R jwildfire/obot.agent --json comments` | exit 0 |
| `python3 obot.agent/scripts/test/policy-sweep` | `30 verdicts, all identical to the baseline` |
| `node obot.agent/scripts/test/carve-out-gate.test.mjs` | 23 pass, 0 fail |

### What survives

The earlier decision [*The merge lane is not broken — one invocation form
is*](../2026-08-14-merge-lane-classifier-denials/) stands and is not withdrawn: one
particular invocation spelling falls outside the permission allowlist and is denied
roughly two times in three. The error was escalating that to "every sanctioned
form", in a single relay.

### Recount

- **Fix 1 (unstick the sanctioned lanes) — withdrawn.** Permission lines
  unnecessary; the PR it was meant to release merged on its own once the conflict
  was resolved. The deny-then-park rule moves to nice-to-have (sound, but no
  observed denial justifies gating on it).
- **Fixes 2, 3, 4 stand**, and keep their numbers so yesterday's references still
  resolve. Verdict restated: **go — gated on 3 blocking fixes + 1 rehearsal**;
  @jwildfire's hands-on cost drops from ~10 minutes to one sign-off line (Fix 3).
- The ledger's withdrawn rows are struck through in place, not deleted.
- One caveat retained: the *outcome* the withdrawn row described (a run that stalls
  while reporting itself healthy) did occur overnight — the first correction agent
  logged one line at 00:52 then went silent for three hours — from agent failure
  rather than a blocked write. Covered by Fix 2's silent-session check.

## Governance change added to the page

obot.agent#113 forces the attested (Jeremy-sign-off) lane when a PR touches a
guardrail path, and when the local `scripts/policy.json` differs from main's or
cannot be read for comparison. Verified here: the 30-verdict lane matrix is
identical before and after, so no existing check was loosened — the change adds a
gate only. Consequence stated on the page: **#113 was the last guardrail change
that could merge on the standard lane**, and Fix 3 (destructive-route hard stops)
is the first change that must meet the new gate. A real input to the S1 go/no-go.

## Provenance and sources

- Primary evidence: the 2026-08-14 and 2026-08-15 session scratchpads (~25 sibling
  sessions, several fully unattended), sibling close-outs, and the day's decision
  artifacts.
- Everything asserted was re-verified live on 2026-08-15 evening, not recalled:
  - demo-301 workflow runs (`gh run list`): Run Pipeline failed 2026-08-03 and
    2026-08-10; build-site has zero runs.
  - policy.json (profiles, classes, A1/A2 levels, invariants, carve-out).
  - Live dry-run: `obot-merge 52 -R jwildfire/gsm.safety --check` → approval tier
    demanded on a clinical release branch (re-confirmed 2026-08-16 06:07).
  - merge-gate-guard.sh patterns (CLI + REST + GraphQL merge routes covered).
  - User + workspace permission lists (close/delete denies are CLI-string-only;
    `gh api *` allowed; one entry on both lists).
  - Navigator launchd job + navigator-state.md freshness + tick log.
  - **Except** obot.agent#113's "classifier-blocked" status, which was taken from a
    sibling report rather than re-run — the one unverified assertion on the page,
    and the one that was wrong.
- Blocker-item text deliberately withheld from the public page per the blockers-list
  containment rule (D0010); the page points at the local list, count-only.

## Assumptions

- ~~The oa#113 classifier denial is environmental (permission layer), not a policy
  misconfiguration.~~ **Retracted 2026-08-16** — there was no denial.
- Effort estimates assume the Navigator sweep codebase is the base for the watchdog.

---

This decision artifact was drafted by Claude Code using Fable 5 and reviewed by @jwildfire.
Corrected 2026-08-16 by Claude Code using Opus 5, after independently re-running the
checks the withdrawn claim rested on.
