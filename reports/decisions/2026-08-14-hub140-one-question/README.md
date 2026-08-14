# Decision — hub#140, thirteen days on: one question survives

**Date:** 2026-08-14 · **Goal:** [#73 autonomy](https://github.com/jwildfire/obot.roadmap/issues/73) · **Status:** Awaiting @jwildfire — W1–W3

## Question

Hub [#140](https://github.com/jwildfire/obot.roadmap/issues/140) has carried eight unanswered decisions (D1–D8) for thirteen days and is the bottleneck for the merge carve-out gate and a truthful `obot-merge --check`. What is actually left to decide, and what happens to the issue itself?

## Answer

One of the eight survives as a policy call (D4 → **W1**: what does the carve-out require — recommend attested-always). The other seven are engineering calls the design already answers; they collapse into one blanket sign-off (**W2** — recommend accept, with D3's hub-workflows fragment severed to its own issue). **W3** is the disposition of #140 itself — recommend closing it with the obot.agent v0.4.0 release, since its Business Requirement shipped 2026-07-29 and the enforcement work is already fully tracked in oa#65, oa#75, and discussion #141.

## Sources

- Hub #140 body and all four comments; `requirements/design/140_design.html` §§1–10 (D1–D8 verbatim from §8).
- obot.agent live at `main` (d765564): `scripts/obot-merge` (verified: PR JSON fetch carries no file list; audit comment posts before the merge; `--check` conflates policy with mergeability), `scripts/obot-policy` (`explain jwildfire/obot.agent` run tonight — no carve-out mention), `scripts/policy.json` v2 (`carveOut._note` vs `invariants.never` contradiction), `NEWS.md` v0.4.0 section.
- oa#83 merge forensics re-verified via `gh pr view 83 --json state,mergedAt,mergedBy,comments,files`: merged 2026-08-14T20:46:28Z by app/obotclaw, files include `goals/registry.json`, exactly one comment and it is not the 🔒 audit comment.
- oa#37, #58, #65 (including the 2026-08-14 second-instance comment), #75; hub#70, #152, #153; discussion #141 (all three comments); the Decided merge-lane classifier artifact; `reports/decisions/README.md` contract.

## Assumptions and limits

- "The classifier decision is settled" is taken from that artifact's Decided status; nothing here reopens it.
- The claim that `gh pr view --json files` truncates at 100 entries is the design's 2026-08-01 measurement, not re-measured tonight.
- W3a assumes the requirement-lifecycle convention that hub Requirements close via a release promotion @jwildfire approves; the v0.4.0 release is treated as that event for the delivered half.
- The board-status wording ("Requirement Gathering → Design") is from the design document, not re-read from the Project board tonight.

## Recommendation

**W1a** (attested-always) + **W2a** (blanket-accept the design defaults, sever the hub-workflows fragment) + **W3a** (close #140 with v0.4.0). Together they unblock the single obot.agent PR specified in design §10, which closes oa#65, oa#75, and discussion #141 — and which itself arrives on the attested lane.

---
This artifact was drafted by Claude Code using Fable 5 (👯🤖 sibling, session 2026-08-14) and awaits @jwildfire's review
