# Clinical work, not scaffold — the refocused ten and the v1.0 question

**Decision artifact `D0026`** for goals [#78](https://github.com/jwildfire/obot.roadmap/issues/78) (keep adding charts) and [#79](https://github.com/jwildfire/obot.roadmap/issues/79) (build the app / the open.gismo arc), written 2026-08-21 by background worker `W0109`.

**Decide here:** the [Q&A discussion](https://github.com/jwildfire/obot.roadmap/discussions/304) — or in chat, quoting an ID.

**Status:** Open — awaiting his answers on V1–V5 (`D0026.1`–`.5`).

## Why it exists

@jwildfire redirected the programme on 2026-08-21, verbatim:

> *"I have a busy weekend and I'm a little bit hesitant to migrate until we get things a little more under control on this machine. So instead of migrating now, I want to see how some clinical build work goes in our new framework. Do a prioritization excercise on our clinical goals and refocus the top 10 for this weekend on charting/platform improvements (instead of scaffold work). Review the gap artifact from a while back and think about charts to make. I know there are still improvements to make, but curious about whether the current framework is 'good enough' to move forward with a push towards open.gismo v1.0"*

The laptop migration is off for the weekend on his word, and is not ranked here.

## What it contains

- The answer to his question, in the second paragraph, under both readings of "framework" (the machine that builds, and the product architecture).
- The 2026-07-25 platform gap analysis re-derived against tonight's code and trackers — seven of its statements moved, one of them the headline "zero review-workflow capabilities filed".
- Ten items to replace the current ranked head, every one with an issue behind it, each marked for whether it needs his clinical review before shipping.
- Five capabilities worth ranking that have no issue to rank, named rather than ranked.
- What a two-day weekend can actually hold, and the smallest piece of real clinical work that would test the framework: the gsm.safety widget catch-up.
- The charts to make, ordered by clinical value rather than by competitor count, split into cheap-given-what-exists, expensive-and-valuable, and deliberately-not.

## Sources read

- All four pages of `reports/platform-gap-analysis-2026-07-25/`, including the frozen `data/gaps-data.js` the prose derives from.
- `safety.viz`: `site/config.json` (renderer statuses), `src/`, `docs/evidence/`, `docs/*-coverage.md`, release list.
- `gsm.safety`: `R/Widget_*.R`, `DESCRIPTION`, `inst/htmlwidgets/lib/`, `NEWS.md`, release list.
- `open.gismo`: `NEWS.md`, `DESCRIPTION`, tags, open issues. `demo-301`: Actions run history and the failing job step.
- `jwildfire/obot.roadmap`: every open issue (115), every issue closed since 2026-07-25 (61), issue bodies for #34, #43, #139, #161, #164, #274, #291, goal #79.
- `obot.agent`: `goals/registry.json`, `rank/top10.json`.
- `reports/decisions/2026-08-14-app-plan-rewrite/` (its unanswered third question is why v1.0 has no definition) and `reports/decisions/2026-08-20-safety-census-rebuild/`.

## Assumptions and limits

1. Everything about competing platforms comes from the July survey, which scored them from public documentation and tested nothing. Our own column was re-verified tonight; theirs was not.
2. "Thirteen of thirty" rests on the survey's grain — sixty-three capabilities is one analyst's split-and-merge judgment, and the count moves under a different one. The recommendation does not rest on it.
3. The clinical share of August is measured by the `safety` label: 7 of the 57 roadmap issues closed in August carry it. Two clinical items in that window carry no label, so the true share is slightly higher.
4. Nothing was filed, ranked, closed, merged or built. No issue created or edited, no ranking changed, no code touched in any repo. The ranking itself is obot-prime's call; this page proposes.

---

Drafted by Claude Code using Opus 5, background worker `W0109`.
