# The roadmap audit audits itself — 2026-08-15

*v2 (2026-08-15): plain-English rewrite — decisions stated in words before any issue number, codes demoted to trailing tags; substance unchanged.*

*v3 (2026-08-15, 👯🤖 audit2): @jwildfire's decision recorded in a `Decisions` section at the top, in his words. R4 replaced wholesale — the original recommendation is rejected and kept only as a rejected option, with a verdict on whether the underlying rule survives. New §5 records the retroactive sweep that applied his rule to every requirement already in violation of it.*

**Decision artifact** for the roadmap-audit loop ([#92](https://github.com/jwildfire/obot.roadmap/issues/92)), written 2026-08-15 in an unattended sibling session (👯🤖 audit), on @jwildfire's instruction to run a roadmap clean-up under a new standing grant to auto-accept high-confidence findings.

**Decided** in chat on 2026-08-15; the decision is recorded in full at the top of the page. The [Q&A discussion](https://github.com/jwildfire/obot.roadmap/discussions/163) remains as the working thread, but the artifact is the record.

**Status: Decided 2026-08-15.** Six of seven calls adopted as recommended. The seventh (R4 — teach the audit that some requirements stay open on purpose) was **rejected and replaced** by @jwildfire's own rule: a requirement covers exactly one release; if it is too big for one, split it into more than one. Deferring sub-tasks is allowed, with a procedure — note the deferral on the original, file a new requirement with its own milestone, transfer the deferred sub-tasks, and the original closes with its release.

**Follow-through, same day (👯🤖 audit2):** four approved closes executed; seven requirements found in violation of the new rule and all seven split and closed (§5) — five new requirements filed with milestones, eleven sub-tasks transferred or re-homed with history intact, nothing deleted; the rule folded into the requirement-authoring path rather than only into the audit rule set.

## Why it exists

@jwildfire, verbatim: *"Also do a session of roadmap clean up. I'm fine with you auto-accepting most high-confidence audit findings moving forward. If there are things in the roadmap that truly need my attention batch them into a decision artifact for my review. That said, generally speaking, if it needs my attention it probably isn't a good audit rule …"*

The last clause is the design principle the page is built around: it makes "does this rule resolve itself?" the test of a rule's quality, independent of whether the rule detects something true. §3 applies that test to all 22 rules and is the substantive part of the deliverable.

## How it was generated

- `node scripts/audit_roadmap.mjs` run against live GitHub state, 2026-08-15 ~01:00 UTC. 45 live findings, 22 rules, 12 firing (one muted), 10 quiet. Raw ledger written to the session job directory.
- Every finding was then checked against the underlying issue, its sub-issues, its board item and its last comment before being auto-applied, batched or dismissed as a false positive. No finding was applied on the rule's word alone.
- 32 changes applied (§1 of the page): 27 from the audit itself, plus 5 cleaning up findings the applies created (§3.5). Issue closes were deliberately excluded: they are a state change with consequences, and agent closes are hook-blocked in this workspace by design.
- The audit was re-run after applying. Live findings: **45 → 28**.

## Findings worth recording

- **`GOALLESS-REQUIREMENT` was broken and is now fixed** ([17881b3](https://github.com/jwildfire/obot.roadmap/commit/17881b3), closes [#133](https://github.com/jwildfire/obot.roadmap/issues/133)). It checked only the *direct* parent for a `goal` label, so legitimately-nested requirements were reported goalless: #122 (under #18 under goal #73) and #131 (under #130 under goal #112) — 2 false positives out of 3 findings. Now walks the whole ancestor chain with a visited set. Tests added first (nested case + cycle case), both red before the change; rules.test.mjs 31/31, page.test.mjs 12/12.
- **Neither obot.agent nor safety.viz had a `backlog` milestone**, which made the 2026-08-14 milestone-before-work rule unsatisfiable outside the hub. Created in both.
- **The audit has no memory of stage transitions.** Three of the five failing rules fail for that one missing capability — the highest-leverage single change to the audit.
- **Applying findings in bulk exposed three rule interactions** that reading them never would (§3.5): `UNTRACKED-TASK`'s fix manufactures `UNSTAGED-BOARD-ITEM` findings, and `SUBS-DONE-PARENT-OPEN` mistakes an empty sub-issue list for finished scope. A rule that reliably creates work for another rule is a defect in the first one.
- **#161 was left alone deliberately** — it fires `OFF-BOARD-REQUIREMENT`, but it was filed minutes earlier by a concurrent sibling session (👯🤖 km) that is still working it.
- **[#114](https://github.com/jwildfire/obot.roadmap/issues/114) is the hub's largest hidden queue**: a 2026-07-25 checkbox review guide, 9 of 20 boxes checked, 11 open, invisible to the roadmap page, the board and every rule but `UNTRACKED-TASK`. Its item X2 pre-authorised the same four closes this audit independently reached.

## Assumptions

- "Provably shipped" for C1 means all three of: board Status Released, zero open sub-issues, and shipping evidence written in-thread by the session that shipped it. All four C1 issues meet all three; #35 fails it deliberately (phased work) and was excluded.
- The needs-you counts in §3 attribute a finding to "needed you" if no reversible change could resolve it tonight — including the three C1 closes, which are only yours because closes sit outside the grant.
- The ~13% projection in §4 re-scores tonight's same 45 findings under the proposed rules; it is arithmetic on this run, not a forecast of future runs.

## Sources

- `scripts/lib/audit/rules.mjs`, `engine.mjs`, `snapshot.mjs` — the rule registry and ledger (requirement #92).
- Live GitHub: hub issues, the obot Roadmap user Project (number 1), and issue threads on #2, #3, #21, #35, #114, #129, gsm.safety#44.
- Prior context: hub [#133](https://github.com/jwildfire/obot.roadmap/issues/133) (the GOALLESS ancestor-walk gap, filed 2026-07-27 and closed by this session), [#132](https://github.com/jwildfire/obot.roadmap/issues/132) (hierarchy tail), [#87](https://github.com/jwildfire/obot.roadmap/issues/87) (weekly goal review).
