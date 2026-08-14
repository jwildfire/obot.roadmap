# obot.agent v0.4.0 — annotated demo

The demo page for the v0.4.0 release candidate, required by the [release-candidate framework](https://github.com/jwildfire/obot.agent/blob/main/docs/rc-framework.md) for a repo with no visual surface: a walkthrough of the behaviour change rather than a screenshot tour.

**Deployed:** https://jwildfire.github.io/obot.roadmap/reports/oa-v0.4-demo/

## What is on the page

Five sections, each pairing what an operator can now do with a real capture and the command that produced it:

1. Sessions open instantly — the hand-off bundle is injected during command expansion (PRs #76/#77/#80/#81).
2. One click to the hub — the status line carries a live OSC 8 hyperlink (PR #52).
3. One policy file per repo — merge tiers and autonomy grants unified into profiles (PRs #59/#61).
4. Unattended runs stop stalling — worktree relocation, Remote Control lane triage, wrapup trail (PRs #69/#63/#67/#71/#72).
5. The release contract — notes live in `NEWS.md` and publish verbatim, decisions get a Q&A thread (PRs #83/#85/#86/#87/#88).

## Provenance

- Every terminal capture is real output taken from this machine, not a mock-up. Sections 1–4 were captured after the v0.4.0 release commit (`092e6fc`); section 5 after `#88` merged. Terminal colour is reproduced in CSS; escape sequences appear as `^[` / `^G` exactly as `cat -v` prints them.
- Each reproduce command was executed before publication. One error was caught that way: the wrapup skill's usage builder lives at `obot.roadmap/scripts/build_usage_data.py`, not the `analytics/` path first written here.
- The "before" captures for the status line and the worktree path are reconstructed from the pre-merge state of those files (`git show` on the parent commit), not from a live v0.3.0 session.
- Self-contained: no external assets, no scripts, no fonts.

## Related

- Draft release: https://github.com/jwildfire/obot.agent/releases — its body is the `NEWS.md` v0.4.0 section copied verbatim; section 5 shows the check.
- Release log: [obot.agent `NEWS.md`](https://github.com/jwildfire/obot.agent/blob/main/NEWS.md)
- Decision artifact on the merge lane: [`reports/decisions/2026-08-14-merge-lane-classifier-denials/`](../decisions/2026-08-14-merge-lane-classifier-denials/)
- Goal [#73 — autonomy](https://github.com/jwildfire/obot.roadmap/issues/73)

---
This demo was drafted by Claude Code using Opus 5 and reviewed by @jwildfire
