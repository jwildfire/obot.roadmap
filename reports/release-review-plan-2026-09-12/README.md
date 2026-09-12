# Release review plan, 12 September 2026

A review plan for @jwildfire covering every release candidate open and requesting his
review across the portfolio on 2026-09-12: open.csr v0.4.0-RC1 (open.csr#75) and the
gsm.safety stack v1.2.0-RC1 (gsm.safety#68), v1.3.0-RC1 (gsm.safety#69, approved
27 August and held for merge order) and v1.5.0-RC1 (gsm.safety#88). For each: what the
release lets someone do, its pull request, release notes, demo and requirement links,
and a checklist of what to look at before merge. It opens with the one decision the
gsm.safety stack needs before any reading (land the candidates in order, or take
v1.5.0 as one consolidated release) and a suggested order with a time budget.

## Sources

- The pull-request pages on GitHub (bodies, comments, review state), read on 2026-09-12.
- The hub requirements the candidates close: #9, #164, #165, #274, #319, #320, #321, and
  the review-gate change #340.
- `NEWS.md` on gsm.safety `dev`, `release/v1.2.0` and `release/v1.3.0`, and on open.csr
  `release/v0.4.0`; branch relationships measured with `git rev-list` on shallow
  clones at the heads named in the page footer.
- The demo pages under `reports/gs-v1.2-demo/`, `reports/gs-v1.3-demo/`,
  `reports/gsm-safety-v1.5.0-demo/` and `reports/open-csr-v0.4-demo/`; the clinical
  figures on this page are quoted from them, not re-measured.
- The site's queue (`roadmap.html`) and the standup placeholder on `session-state`, which
  name only two of the four candidates.

## Assumptions

- The waits are counted from the day review was requested, taken as the day each
  candidate opened.
- The recommendation (route A: cherry-pick the workflow fix, then land the gsm.safety
  candidates in order) is the author's; nothing on the page has been reviewed by
  @jwildfire.

Drafted by Claude Code using Fable 5.1 in the 2026-09-12 prep session.
