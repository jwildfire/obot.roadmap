# D0019 — Scheduled sessions: what is ready, what is not, and what would make it ready

**Status: Awaiting @jwildfire** — H1–H5 (D0019.1–.5).
**Requirement:** [jwildfire/obot.roadmap#122](https://github.com/jwildfire/obot.roadmap/issues/122) · **Task:** [#221](https://github.com/jwildfire/obot.roadmap/issues/221) · **Goal:** [#73 increased autonomy](https://github.com/jwildfire/obot.roadmap/issues/73)
**Q&A:** [#222](https://github.com/jwildfire/obot.roadmap/discussions/222)

Supersedes [D0014](../2026-08-15-scheduled-sessions-readiness/), and carries forward
findings from [D0015](../2026-08-15-worker-closeout-check/) and
[D0016](../2026-08-15-worker-supervision/) — all three closed 2026-08-16.

## What produced this

@jwildfire, 2026-08-16, in chat: *"D14/15/16 all seem like a mess to me. Close them
all. Do a single assessment of readiness to move to a schedule and let me know when
it's ready."*

The page's job is therefore the finish line rather than a verdict argument: five
gates, each with a check he can run himself, and an explicit list of observations
that would falsify a later "yes". The answer is not yet.

## Method

Nothing was carried over from D0014. Every figure was re-measured on the evening of
2026-08-16 from the machine's own records and from live repositories, by eight
parallel read-only agents working from separate briefs. Ten load-bearing claims were
then handed to independent agents instructed to refute them; four came back
overstated and were rewritten before publication.

Two of those corrections are stated on the page rather than quietly applied, because
D0014 died of the opposite habit:

- The commissioning brief (and its source relay) put the long suspension at
  08:28:59. That lid-close was real but lasted about three minutes (full wake at
  08:32:15, lid/UserActivity). The suspension that stranded the day's work began at
  09:33:59 and ended at the lid-open wake at 21:26:59 — 11h53m.
- The shared session log's apparent eleven-hour gap is twelve. `/etc/localtime` was
  rewritten to Europe/London at 21:27:39, forty seconds after the wake, so lines
  stamped before the wake (Europe/Paris) sit an hour ahead of lines after it.
- The brief also stated the dedicated-machine move as settled fact. His own words
  were *"Hopefully moving everything to devoted machine later this week…"* — the
  only written record of the plan anywhere. The page says so.

## Sources, and how each figure was derived

| Figure on the page | Source | Method |
|---|---|---|
| Suspension 09:33:59 → 21:26:59 (11h53m); only full wake in the window | `pmset -g log` | Filtered on the domain column (`$4=="Wake"`) rather than message text — the original pass filtered `Wake from` and structurally excluded dark wakes |
| 61 dark wakes, 2–11 s each, 242 s total (0.57% of 42,780 s) | `pmset -g log` | Every DarkWake→Sleep pair parsed; accounting closes to the second (242 + 42,538 = 42,780) |
| Idle sleep disabled on battery and mains; lid-close suspends on mains too | `pmset -g custom`, `pmset -g assertions`, `pmset -g log` | `sleep 0` both power sources; the 08:28:59 clamshell sleep is logged `Using AC (Charge:100%)`; running `caffeinate` holds are idle-only |
| Two workers silent 12.5 h and 13.0 h with state reading `working`; two deaths on network errors | `~/.claude/jobs/*/state.json` + `timeline.jsonl` | 73 job records read; endings classified on `state` plus detail string; `firstTerminalAt` null on all four |
| A working session reports about every 23 s; only 11 of 3,079 gaps exceeded 30 min | same | Inter-event gap distribution across 51 background sibling sessions; median 0.38 min, p95 1.55 min |
| 47 of 59 sessions ended cleanly over two days; no sleep event at all on 08-15 | same, plus `pmset -g log` | Sessions whose last recorded moment fell on 08-15 or 08-16 |
| 2,127 lines of uncommitted work salvaged | `.claude/drafts/obot.roadmap/W0009_wip.patch` | `wc -l` |
| Sweep ran 13 times where 142 were due; gaps of 332 and 324 min; 43 connection failures | `.claude/session-hub/navigator-sweep.log`, `/tmp/com.obot.navigator-sweep.err` | 297 log entries parsed; expected count from the job's 300-second interval |
| The one completed sweep reported health from seven failed queries | same log line | Its line reads `ok — 7 repos, 2 RCs` … the same run's entry names `Command failed: gh pr list` for all seven repos |
| The guard denied 1 of 14 destructive command strings | `.claude/hooks/merge-gate-guard.sh` | JSON payloads piped to the hook directly; live probes used non-existent remotes, branches, tags and endpoints so nothing could be destroyed |
| Four of seven repos have no branch protection on `main`; no repo protects the working branch | `gh api repos/jwildfire/{repo}/branches/{b}/protection` | 404 = unprotected; rulesets query returns 0 for all four |
| Token carries `delete_repo` | `gh auth status` | Scope list |
| None of the three watchdog checks exists | `obot.agent/tools/navigator/checks.mjs`, `sweep.mjs` | The four live checks enumerated from the module header and confirmed against the rendered state file; the only job-record reader filters `j.firstTerminalAt && inWindow(...)` |
| No digest producer since 2026-08-04 | `.claude/session-notes/*.md` | `grep -rl '## Morning digest'` |
| Demo study pipeline failed on both last scheduled runs | `gh run list -R jwildfire/demo-301` | Failures 2026-08-03 and 2026-08-10, event `schedule` |
| Nothing schedules the launcher; no autonomous session since 2026-08-01 | `launchctl list`, `crontab -l`, CronList, `~/.claude/jobs/*/state.json` | Only `com.obot.navigator-sweep` is an obot job; zero job names carrying the autonomous-session marker |
| Pre-flight passes; eight checks; level check only warns | `scripts/obot-auto --preflight-only` | Exit 0, `level=A1, goal=charts`; the level test is an `echo` to stderr, not a `exit` |
| Halt file checked at launch only; concurrency is a scan not a lock | `scripts/obot-auto`, `.claude/settings.json` | No registered hook references the halt file; the lock globs job state files for a name in `working` |
| Budgets: 4 wall-clock hours, 1 increment, no cost ceiling | `obot.agent/scripts/policy.json` | No token, dollar or cost key in the file |
| Worker ids, delivery record and roadmap-discipline checks shipped today | `tools/worker-id --audit`, `tools/delivery-log --audit`, `checks.mjs`, sweep log | Ledger clean (16 allocated, 12 stamped, 1 burned); record clean (59 calls, 31 closeouts); discipline checks live in the 5-minute sweep across 7 repos |
| This page's own evidence cost ~1.6M tokens across 18 agents | the workflow run record | Reported by the orchestration run that produced the evidence |

## Assumptions, and what is not established

- **The dedicated machine is unspecified.** No hardware, date, power arrangement or
  migration list is recorded anywhere. Gate one's cost line is therefore a shape, not
  an estimate, and the pre-flight would have to be re-run on that host before any
  conclusion here carries over — the app key lives in this Mac's login keychain, the
  sweep is a launchd agent on this Mac, the operations dashboard is a local server on
  this Mac, and page verification runs through this user's Chrome.
- **Whether a background session can be launched by the system scheduler at all is
  untested.** The launcher ends by handing off to `claude --bg`; the only scheduled
  job proven to work here is a plain node script that needed an explicit PATH. Named
  on the page as the unknown to retire first.
- **Effort figures are agent-time estimates**, not measurements, and assume the
  existing sweep is the base for the host-side checks.
- **The two frozen workers were not revived** — testing that needs a write, which
  this read-only pass did not make. Whether they were recoverable is unknown.
- **The 15:04 sweep's seven query failures are attributed to the network** from its
  error file (43 lines of `error connecting to api.github.com`); the sweep truncates
  each error to 90 characters, so the per-call cause is not printed in its own log.
- **Blocker-item text is withheld** from this public page per the containment rule
  (D0010).

## Related

- [D0017 the Navigator design](../2026-08-16-navigator-design/) — the closeout
  contract and the supervision fold-in this page rests on.
- [#212 a worker that stops wakes the Navigator](https://github.com/jwildfire/obot.roadmap/issues/212) — filed, no implementation attached; overlaps gate three's host-side half.
- [obot.agent#139 worker ids never reach the worker's shell](https://github.com/jwildfire/obot.agent/issues/139) — why the identifier stamping is manual today.

---

This decision artifact was drafted by Claude Code using Opus 5, in an unattended worker session (W0013), and reviewed by @jwildfire.
