# Audit view redesign — three ways to clear the queue

**Date:** 2026-07-25 · **Status:** Current — **Option B chosen** with per-click dispatch (D1–D7 settled the same day); implementation not started
**Requirement:** [#109](https://github.com/jwildfire/obot.roadmap/issues/109) · **Blocked PR:** [#110](https://github.com/jwildfire/obot.roadmap/pull/110) (click-to-apply, on hold pending this design)
**Redesigns:** [/audit/](https://jwildfire.github.io/obot.roadmap/audit/), built by [`scripts/build_audit_page.mjs`](../../scripts/build_audit_page.mjs)

## Why

@jwildfire, 2026-07-25: *"page is too busy for quick review/iteration. make a compact view where each finding is a row in a table that i can expand for details or click check/x to approve/reject … group the table by rule and have check/x to accept/reject all. collapsable sidebar to search/sort/filter."*

The current page renders each finding as a card that repeats its rule's reasoning. Measured in Chrome at 1480 × 812 on the deployed page: **7,646 px (9.3 screens), 125 px per finding, 4 findings visible at once, 2,883 words, 77 buttons**. The same 33 findings in the compact table: **1,682 px (2.0 screens), 31 px per row, 16 findings visible**.

## What is here

| File | What it is |
|---|---|
| `index.html` | Overview — the measured problem, the shared row contract, the three options, the recommendation, decisions D1–D6 |
| `option-ledger.html` | **Option A · Ledger** — one table, rule bands inside it, detail opens in place under the row |
| `option-rail.html` | **Option B · Rail** — same table, fixed shape; the selected row fills a persistent detail rail |
| `option-sweep.html` | **Option C · Sweep** — the rule is the unit of work: reasoning once, batch decision first, rows for exceptions |
| `assets/audit.css` | Shared tokens (the live site's palette and type stacks, restated) and every shared component |
| `assets/core.js` | Data load, filter/sort/group, decision state, row fragments, detail, queue meter, tray, keyboard contract |
| `data/findings.json` | **Real data** — `site/audit/findings.json` as committed by the nightly audit at 2026-07-25T09:16:59Z (run 30152542604): 33 live findings, 1 muted, 22 rules |
| `data/decisions.json` | The decision ledger at the same commit (read for a finding's prior decisions) |

## Shared across all three

- Row answers *which issue* and *what changes* without expanding; ✓ / ✗ per row and per rule band.
- Collapsible sidebar: search, six sorts, facets (confidence / kind / rule group / repository / decided state), three saved sweeps, muted toggle.
- Decisions are **staged**, not dispatched. The tray shows counts; *Apply* prints the exact `repository_dispatch` body PR #110's lane would receive — two requests for 33 decisions rather than 33.
- Queue meter: one tick per finding in table order, hover to identify, click to jump.
- Keyboard: `j`/`k` move, `a` accept, `x` reject, `u` undo, `enter` details, `/` search.
- Confidence is encoded as a three-dot meter **plus** the word — never colour alone (dataviz skill, status relief rule).

## What is real and what is not

- **Real:** the findings, rules, evidence, proposed operations, agent prompts, prior decisions, confidence, run counts — all straight from the committed ledger.
- **Not real:** no GitHub token, no dispatch, no run polling, no persistence. Reloading clears every decision. The data is a snapshot so the three options stay comparable while the nightly audit moves on.
- **Not designed yet:** dark theme (every colour is a token, no component hard-codes white or black), small screens (the rail and sidebar collapse; the table still wants width), and the #109 activity log (see D4).

## Decisions — settled 2026-07-25

| # | Question | Decided |
|---|---|---|
| D1 | Which view ships on `/audit/`? | **Option B · Rail** |
| D2 | Dispatch per click, or stage? | **Per click** — the tray and payload preview come out; a rule band is still one request carrying all of its ids |
| D3 | May ✗ at the rule band mute a whole rule? | **Yes, with a confirm above 3** |
| D4 | Where does #109's activity log live? | **A fold under the table** |
| D5 | Default sort and grouping | **Grouped by rule, worst first** (the prototype default) |
| D6 | What happens to the long-form reading view? | **Rule reference only** — cards go, the 22-rule table and quiet rules stay |
| D7 | What the page shows between click and outcome | **Row pill + one run panel**, outcome re-read from `decisions.json` |

All seven went to the recommendation. #110 is unblocked; what it changes is the view, not the lane.

## No external dependencies

No CDN, no library, no font import. The type stacks name the site's faces with the site's own fallbacks, so the prototypes match the live page where those faces are installed and degrade the same way where they are not.

---
Drafted by Claude Code using Opus 5 for @jwildfire
