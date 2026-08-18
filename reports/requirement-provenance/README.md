# Requirements that say @jwildfire reviewed them

Counted 2026-08-18 for requirement [#215](https://github.com/jwildfire/obot.roadmap/issues/215).

## What it is

74 of this hub's 113 requirement issues end with an attribution line asserting that @jwildfire reviewed them, and nothing anywhere records that he did. 50 are still open; 38 of those sit at Requirement Gathering. The page names every one.

It exists so the population is labelled rather than rewritten. Editing 74 issue bodies to say something different about his own review is a bulk change to his record made unattended on his behalf — the shape of act #215 exists to prevent.

## Sources

- Every issue labelled `requirement` on `jwildfire/obot.roadmap`, open and closed, read through the GitHub REST and GraphQL APIs on 2026-08-18.
- The counting rule is code, not judgement: `reviewClaim()` and `judge()` in [`scripts/lib/provenance.mjs`](../../scripts/lib/provenance.mjs). A requirement counts when its drafted-by line asserts a review by @jwildfire and its body carries no provenance block.

## Reproduce

```bash
node scripts/provenance.mjs report
```

The counts on the page are that command's output on 2026-08-18. They move as requirements are filed and as blocks are added, so the page is a dated measurement rather than a live view — the live view is the roadmap catalog's legend and the nightly audit.

## Assumptions and limits

- A requirement whose drafted-by line says "not yet reviewed by @jwildfire" (9 of them) is not counted: it makes no claim.
- 38 requirements carry no drafted-by claim either way. They are not counted and are not evidence of anything.
- The report cannot tell whether @jwildfire *did* review a given requirement off the record. It says only that nothing records it — which is the whole point, and is why the fix is a citation rather than a better sentence.
- Nothing here was edited. The one requirement whose body did change is #215 itself, which now carries the block, and its own attribution line was corrected in the same edit from "and reviewed by @jwildfire" to name the author only.

---

This report was drafted by 👯🤖 W0046 (Claude Code using Opus 5) in an unattended session, and not yet reviewed by @jwildfire.
