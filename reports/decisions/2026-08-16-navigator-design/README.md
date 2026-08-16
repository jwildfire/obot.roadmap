# D0017 — The Navigator: how the operating officer works

**Status: Decided 2026-08-16** — N1–N8 (D0017.1–.8) all adopted as recommended, in chat ("I'm good with D0017 recommendations. Implement."), with one sequencing change: the audit-versus-verifier disagreement is resolved before the four new audit checks ship. The queued sessions-page ask becomes a requirement of its own. Implemented the same morning: the disagreement resolved (neither check was wrong; the audit had not run), the Navigator session live as job `b510658b` ([obot.agent#135](https://github.com/jwildfire/obot.agent/pull/135)), the checks shipped across all seven repos ([obot.agent#137](https://github.com/jwildfire/obot.agent/pull/137), under [#200](https://github.com/jwildfire/obot.roadmap/issues/200)), and the sessions-page ask filed as [#199](https://github.com/jwildfire/obot.roadmap/issues/199). **Q&A thread:** [#197](https://github.com/jwildfire/obot.roadmap/discussions/197). **Requirement:** [#195](https://github.com/jwildfire/obot.roadmap/issues/195) · **Goal:** [#73 increased autonomy](https://github.com/jwildfire/obot.roadmap/issues/73)

A consolidated design-and-decision document, written at @jwildfire's explicit request on
2026-08-16: *"what I really want to see is a consolidated design/decision doc explaining
how the navigator/coo agent is going to work. I suspect it combines a few of your
artifacts from last night. I want to get Navigator session up and running today if
possible and get a feel for how we work together."*

It therefore folds in and supersedes the open questions of two artifacts from the night
before — [D0015](../2026-08-15-worker-closeout-check/) (worker closeout) and
[D0016](../2026-08-15-worker-supervision/) (worker supervision). Both pages remain,
unchanged and cited, each carrying a banner pointing here; nothing in either is withdrawn.
[#186](https://github.com/jwildfire/obot.roadmap/issues/186) (standing sessions surviving
compaction) is deliberately **not** folded in: that is prime's problem, not the Navigator's.

## His inputs, in the order they arrived

All four are quoted on the page or built into the design:

1. The roadmap complaint — *"you and the workers you create aren't impacting the roadmap,
   which means none of this is sustainable … Every worker should advance a requirement
   through its lifecycle."*
2. The org model — *"prime and I set the strategy (think ceo) and then the navigator
   translates it to actionable tasks (coo) and makes sure the workers are delivering."*
3. The delegation grant — *"I am fine delegating a lot of judgement calls to COO. It can
   escalate critical items to me."*
4. The ownership line — *"prime (and I) own goals and overall roadmap structure. Coo owns
   everything else. Requirements, tasks, lifecycle, milestones, etc. coo can propose
   structural changes, but we make the call on implementing or not."*
5. The narrowing, which reframed the whole page — *"I'm more interested in COO improving
   operations. Updating templates, tweaking dashboards, refining audit framework. That is
   its job. Splitting goals is strategy that ceo owns."* An earlier draft built out a
   structural-proposal channel on the strength of input 4; input 5 cut it back to a narrow
   escalation and made the build mandate the centre of the role.
6. The reporting line — *"The coo reports directly to you. You report to me … I might talk
   to it directly sometimes if there are specific operational things I want done, but you
   are still my primary point of contact"*, with prime owing him a recommendation on every
   COO proposal rather than forwarding it. This settled the open question about who reads
   the COO's decision record: prime does, daily; @jwildfire sees critical items and
   proposals.

Inputs 2–6 arrived while the page was being written and were relayed by prime rather than
typed into this session. They are quoted as his words on that basis; if any wording is off,
the page should be corrected rather than defended.

## Provenance and sources

Re-verified against GitHub and this machine on the morning of 2026-08-16 — not carried
forward from the account that reached him:

- **The six overnight issues** in `jwildfire/obot.agent` (#116, #118, #120, #121, #122,
  #126) — created 19:31–22:55 on 2026-08-15, all `CLOSED` by morning, all milestoned
  `v0.5.0`. Bodies grepped for any roadmap reference: only #118 contains one, in prose.
- **Structural linkage** — the GitHub sub-issue `parent` field queried for all six:
  `null` in every case, #118 included. The roadmap's machine-readable record of the night
  is empty, which is a stronger claim than "only one is linked" and is the claim the page
  makes.
- **The requirements that were open the whole time** — the Operations Dashboard
  requirement ([#180](https://github.com/jwildfire/obot.roadmap/issues/180), OPEN,
  2026q3, under goal #73): zero sub-issues, zero comments. The release-scaffolding
  requirement ([#123](https://github.com/jwildfire/obot.roadmap/issues/123), OPEN, 2026q3):
  zero comments, and its Overview names "a documented RC PR framework" — the exact thing
  #121 shipped.
- **Counter-evidence, verified issue by issue** — #184 (filed by @jwildfire himself), #185,
  #186, #189–#191, #192–#193: all OPEN, all 2026q3, all real.
- **Hub parent and board state, measured here** — #184, #185, #186, #194, #195 parent to
  #73; #189–#191 to #143; #192–#193 to #79; all ten present on the "obot Roadmap" project
  at Backlog as of this morning. This is the check that falsified the "hub side was clean"
  claim, since several of those links post-date the work they describe.
- **Parentless-issue count, measured here** — 41 open issues across the six spoke repos,
  **26 with no hub parent**, 14 of 16 in `obot.agent`. This is the number behind the
  "gate on work done, not on filing" recommendation.
- **The live sweep** — `obot.agent/tools/navigator/sweep.mjs`, launchd
  `com.obot.navigator-sweep`, `StartInterval` 300 s, 233 runs, last exit 0; sole writer of
  `.claude/session-hub/navigator-state.md`; carries the config-ledger audit. The dashboard's
  `/navigator` tab renders any `## Heading` the state file carries, which is the seam the
  delivery record uses.
- **The launcher pattern** — `obot.agent/scripts/obot-prime`: `claude --bg
  --permission-mode auto --remote-control -n "🎩🤖 obot-prime" --model opus /s-prime`, run
  from the workspace root, with a singleton check over `~/.claude/jobs/*/state.json`.
  Nothing named `obot-navigator` exists yet.
- **The job ledger** — `~/.claude/jobs/<id>/state.json` and `timeline.jsonl`;
  `firstTerminalAt` as the closeout watermark; the role-aware `blocked` signal; 46% of jobs
  recording no children. As of this morning one blocked job is still sitting unterminated.
- **The nightly audit** — 22 rules in `obot.roadmap/scripts/lib/audit/rules.mjs`, run by
  `scripts/audit_roadmap.mjs` at 03:30 ET; scope is hub issues, the board, PRs across the
  seven repos, ideas and design docs. Spoke issues are visible only when a hub issue
  already lists them as children.
- **Cost and stall figures** — from [D0016](../2026-08-15-worker-supervision/), which
  measured them from the job ledger. Cited, not re-measured.

## Corrections to the account that reached @jwildfire

Recorded here as well as on the page, because a claim propagating unverified through
several agents is the failure class this program spent 2026-08-15 cataloguing. Two of
these correct earlier drafts of *this* page:

1. **All six spoke issues are unattached** — not four, not five. #116 was missed in the
   first count, and #118 was counted as linked because it names #180 in prose; GitHub
   records no parent for either, nor for the other four.
2. **Not all of them were @jwildfire's instructions.** #126 (the config-list ledger) was
   filed by a sibling agent that found two allocated IDs with nothing behind them.
   #116, #118, #120, #121 and #122 trace to things he said.
3. **The "hub side was clean" claim is withdrawn.** An earlier draft, on a relayed audit
   scorecard, said every requirement filed overnight was correctly parented, labelled and
   milestoned and that the gap sat entirely in the spoke repos. It did not: #184's link to
   goal #73 was never made, and nine issues were put on the board only after the fact by a
   later check. Verified here at 07:2x — #184, #185, #186, #194, #195 now parent to #73,
   #189–#191 to #143, #192–#193 to #79, and all ten are on the board at Backlog. They are
   correct **now**; they were corrected, not filed correctly.
4. **An unresolved disagreement between two checks, left open on the page.** The nightly
   audit reported four requirements off the board; a separate verifier found nine more the
   same morning. Stale snapshot, differing scope, or a defect in one of them — not
   established, and neither is assumed right. The page names it as the Navigator's first
   task rather than papering over it.

## Assumptions and known softness

- **The audit scorecard (one caught, five missed) was produced by another agent** and
  relayed. The scope claim and the 26-of-41 count were re-verified here; the per-rule
  attributions were not re-derived line by line. Its "caught and clean" row has since been
  contradicted by an independent verifier and is presented on the page as partly caught,
  with the disagreement flagged rather than resolved.
- **The exemption-rate tripwire ("much more than a third") is a starting value, not a
  measurement.** Nothing has counted exemptions, because the rule does not exist yet.
- **The per-closeout cost figures are extrapolations** from D0016's measured model applied
  to last night's closeout volume, not a bill. The ordering between waking and polling is
  robust; the absolute numbers are not.
- **"Four of five are link holes, not requirement holes" is an editorial judgement** about
  scope fit, made by reading each issue against the two open requirements. @jwildfire may
  read one of the four as genuinely out of scope.
- **The identifier scheme for the Navigator's own calls is proposed, not built.** It reuses
  the style of the existing config-item ids; nothing allocates them yet.

---

This decision artifact was drafted by Claude Code using Opus 5 and reviewed by @jwildfire.
