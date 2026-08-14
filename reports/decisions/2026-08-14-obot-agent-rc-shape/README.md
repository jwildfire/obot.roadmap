# Decision — how obot.agent ships a release candidate

**Date:** 2026-08-14 · **Goal:** [#73 autonomy](https://github.com/jwildfire/obot.roadmap/issues/73) · **Discussion:** [#155](https://github.com/jwildfire/obot.roadmap/discussions/155) · **Status:** Awaiting @jwildfire — R1–R4

## Question

@jwildfire's rule, set 2026-08-14: a release candidate is a **PR** — assignee `obotclaw[bot]`, reviewer @jwildfire, review formally requested — and only RCs reach his review queue. obot.agent cannot satisfy it: its integration branch *is* `main`, so work merges straight there and no branch is left to open a release PR from. The v0.4.0 draft release is the RC framework's own documented workaround for that case, and he has said it is not an RC. Which gives way — the roles rule, or the branch model?

## Options

- **R1** — amend the roles rule so a draft GitHub release is an accepted RC vehicle for single-branch repos.
- **R2** *(recommended)* — create one lagging `stable` branch at the `v0.3.0` commit; release by `main → stable` PR. One array edited in `policy.json`; the shape demo-301 already runs.
- **R3** — the full safety.viz model: create `dev`, switch the default branch, `main` becomes the release branch.
- **R4** — a throwaway `release/vX.Y.Z` base per release; a variant of R2 with more moving parts.

## Recommendation

**R2.** It is the only option that satisfies the rule without changing how obot.agent is worked on. It reuses a shape `policy.json` already models, leaves all 47 hard-coded `obot.agent/blob/main` links meaning what they mean now, strands none of the 21 live branches, and lets v0.4.0 ship as a real RC PR the same night. R3 buys symmetry with safety.viz and nothing R2 does not already give, at the cost of a default-branch switch and a reference sweep in a repo with no CI.

## Sources

- `obot.agent/scripts/policy.json` v2 — the `roles`, `profiles` and `repos` blocks; obot.agent is `{"integration": "main", "release": []}`, demo-301 is `{"integration": "main", "release": ["site"]}`.
- `obot.agent/docs/rc-framework.md` lines 24–30 (the increment-vs-RC table) and 78–83 (the "repos where integration *is* the release branch" paragraph).
- GitHub API: obot.agent default branch (`main`), 23 branches, **no branch protection**, no workflows, no `package.json`.
- `git log v0.3.0..origin/main` — 42 commits, 21 merged PRs.
- Repo-wide grep for `obot.agent/blob/main` across obot.agent and obot.roadmap — 47 occurrences in 40 files.

## Assumptions and limits

- The 47-link count is markdown and HTML only; it does not include links inside GitHub issue and PR bodies, which no local grep can see and which a default-branch switch would also silently re-point.
- R2's effort estimate assumes `obot-merge` needs no change to merge a `main → stable` PR — the `auto` profile already maps the `release` role to the attested lane, but that path has only ever been exercised on `dev → main` repos.
- Nothing here decides the separate draft-versus-ready contradiction for *increment* PRs, filed as [#152](https://github.com/jwildfire/obot.roadmap/issues/152).

## Related

- v0.4.0 demo page: [`reports/oa-v0.4-demo/`](../../oa-v0.4-demo/)
- Release notes: [obot.agent `NEWS.md`](https://github.com/jwildfire/obot.agent/blob/main/NEWS.md)
- The framework this stresses: [oa#83](https://github.com/jwildfire/obot.agent/pull/83), [oa#86](https://github.com/jwildfire/obot.agent/pull/86)

---
This artifact was drafted by Claude Code using Opus 5 (👯🤖 oa-rc sibling session) and awaits @jwildfire's decision
