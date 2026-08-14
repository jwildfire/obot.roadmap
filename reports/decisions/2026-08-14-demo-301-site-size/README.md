# demo-301's site branch — what the fork actually costs

**Decision artifact** for hub [#143](https://github.com/jwildfire/obot.roadmap/issues/143), written 2026-08-14 in an unattended session. Companion to [the app plan-rewrite decisions](../2026-08-14-app-plan-rewrite/), whose A4 decides whether demo-301 is the fork template at all.

**Decide here:** [Q&A discussion #150](https://github.com/jwildfire/obot.roadmap/discussions/150) — the thread where @jwildfire records the call.

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

*LLM disclaimer: this page was drafted by Claude Code (Opus 5) in an unattended session and has not been reviewed by @jwildfire.*
