# demo-301's site branch — what the fork actually costs

**Decision artifact** for hub [#143](https://github.com/jwildfire/obot.roadmap/issues/143), written 2026-08-14 in an unattended session. Companion to [the app plan-rewrite decisions](../2026-08-14-app-plan-rewrite/), whose A4 decides whether demo-301 is the fork template at all.

**Status: Decided 2026-08-15** — all six calls adopted as recommended, in the local Operations Dashboard. His words, verbatim:

> "I'm good with the recommendations here, but I think the real issue is that we need to move to a more robust database instead of just leaning on github sooner or later. Add discussion of that approach to the upcoming grill-me session related to the app strategy/design."

Follow-through filed the same day against [#143](https://github.com/jwildfire/obot.roadmap/issues/143) (milestone 2026q3, nothing implemented yet): [#189](https://github.com/jwildfire/obot.roadmap/issues/189) drops the duplicate root copy (S1), [#190](https://github.com/jwildfire/obot.roadmap/issues/190) shrinks what a fork downloads (S2), [#191](https://github.com/jwildfire/obot.roadmap/issues/191) bounds the branch's growth (S3). The second half of his answer — whether the program keeps using GitHub itself as its datastore — is a separate and larger question, recorded as a prep topic for the app-strategy elicitation interview on [goal #79](https://github.com/jwildfire/obot.roadmap/issues/79#issuecomment-5304424574).

**Decided in:** the local Operations Dashboard, not the Q&A thread ([discussion #150](https://github.com/jwildfire/obot.roadmap/discussions/150) carries a pointer to this record).

## Why it exists

#143 says the size call must be made "before demo-301 is used as the fork template in the keynote". It proposes four mitigations and a recommendation, but its framing rests on a clone cost that had not been measured. This page measures it and reframes the issue: there are two problems under one number.

## What was measured (2026-08-14, read-only)

- `site` checkout **302.58 MiB / 689 files** — #143's figure is exact
- **103.41 MiB of it is a byte-identical duplicate**: `origin/site:output` and `origin/site:ps-002/output` are the same tree object `d2f3ae3cefb8296212dedc628dd8134e8d4a4f50` (34% of the checkout, unmentioned in #143)
- A clone transfers **90.91 MiB** compressed for both branches and checks out `main` — **124.67 MiB**, of which `input/` is 124.48 MiB and three CSVs are 83%
- The heaviest chart gzips **10,015,826 → 417,963 bytes** on the wire (24×)
- The branch is not growing today: the scheduled pipeline failed on 2026-08-03 and 2026-08-10

## Recommendation

**S1 (drop the duplicate root `output/`) + S2 (shrink `input/` on main) now; S3 (snapshot retention) with the Actions fix. Not S4 (uncommit charts), not S5 (orphan branch).**

## How it was generated

`git ls-tree`, `git rev-parse`, `git rev-list --objects | git cat-file --batch-check='%(objectsize:disk)'`, `gh run list`, and `curl -H 'Accept-Encoding: gzip'`, all run directly against `origin/site` / `origin/main` and the live Pages site. Every number on the page carries the command that produced it.

## Assumptions and limits

1. Compressed sizes are local on-disk object sizes; an optimally repacked server-side transfer may differ.
2. Which workflows consume `Raw_DATACHG` / `Raw_DATAENT` at what fidelity was **not** audited — S2 needs that check before it is executed.
3. **Nothing was changed.** No branch rewritten, no file deleted, no history touched; #143's surgery waits on this decision.

*LLM disclaimer: this page was drafted by Claude Code (Opus 5) in an unattended session; @jwildfire reviewed it and decided all six calls on 2026-08-15.*
