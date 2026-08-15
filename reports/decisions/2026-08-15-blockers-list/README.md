# The blockers list — work only your hands can do (BL1–BL4)

**Decision artifact** for the session framework, written 2026-08-15 in a sibling session (👯🤖 blocklist) at @jwildfire's direct request: *"I also wonder if we need a formal 'blockers' list for things that don't fit into RC or Decision artifacts. That list might be local only since it's going to be my hands on keyboard to implement. Work on a plan for that too - security probably important for that one …"*

**Status: Decided 2026-08-15 — all four calls adopted as recommended.**

## Decisions

- **2026-08-15, in chat:** *"BL1-4 look good. Recommendations approved."* — resolves BL1–BL4, all as recommended. Implemented same day: deploy-time sentinel guard + `blockers*` gitignore line in this repo; `blocker-log` capture script in obot.agent; seed file promoted from provisional to canonical at the workspace-local location. Read path (dashboard section + walkthrough skill) filed as follow-up in obot.agent; count-line spec handed to the daily-briefing design ([Q&A #158](https://github.com/jwildfire/obot.roadmap/discussions/158)). ([Q&A #162](https://github.com/jwildfire/obot.roadmap/discussions/162) remains the thread of record for the original ask.)

## What it contains

- **BL1** — the scope test: *if the fix is fully specified and only his keyboard is missing, it's a blocker; if a one-word "yes" would let an agent do it, it isn't.* Routing table, worked examples from the last 24 hours, three near-misses.
- **A threat model**, sized honestly: the proven adversary is mechanical (the hub deploy copies `reports/` wholesale; the wrapup folds scratchpads into the published diary), the human adversary gets reconnaissance convenience at most, and the status quo is leakier than any option proposed.
- **BL2** — storage: five homes priced on readability, `git add -A`, the deploy sweep, append cost, and machine loss. *Recommend: a file at the workspace root's `.claude/` (outside every git repo — structurally immune), wrapped in four layers: location → LOCAL-ONLY sentinel → deploy-time guard that fails the site build if the sentinel appears in `_site` → hub gitignore line.*
- **BL3** — write path: a `blocker-log` script mirroring `scratchpad-log` (sub-10s capture, schema'd entries with paste-ready fixes and verified-dates, grep-dedup, retire-never-delete).
- **BL4** — read path: full text on local surfaces only (session dashboard section + a `/session-blockers` re-verify-and-walk-through skill); published surfaces carry a count, never item text — the count-line spec is handed to the briefing design in [#158](https://github.com/jwildfire/obot.roadmap/discussions/158) (M3), not built in parallel.
- **The seed**, described categorically: 6 open, 3 resolved, 3 near-misses — written tonight to the proposed local file only. The live inventory deliberately does not appear in this artifact or this repo.

## Sources

- `obot.roadmap/.github/workflows/deploy-site.yml` — the `cp -r reports _site/reports` sweep and the `reports/**` push trigger, read in-file tonight
- Workspace and user Claude settings files — allowlist and startup-setting state verified live 2026-08-15 (one item found already resolved, one found absent as claimed)
- Session scratchpads 2026-08-14 / 2026-08-15 and the blockers-tails, ctx-mgmt, elicit, and milestone sibling close-outs — the seed's provenance
- `obot.agent/docs/rc-framework.md`, this directory's README contract, memory files (two stale entries caught by re-verification: a 16-day-stale app-install line, a closed hub#46)

## Assumptions and limits

1. The workspace root remains a non-git-repo — the structural-immunity argument for BL2(a) depends on it; if the workspace is ever `git init`-ed, BL2 must be re-decided.
2. The seed's device-side item (Apple Reminders list) could not be verified from this session and is marked UNVERIFIED in the file.
3. Nothing was built: no script, no guard, no skill, no gitignore change. The only writes are the local seed file and this artifact. All four calls are @jwildfire's.

*LLM disclaimer: this page was drafted by Claude Code (Fable 5) in an unattended sibling session and has not been reviewed by @jwildfire.*
