# D0025 — Back on CRAN: the work is done, and the next step is not ours to take

**Status: Open** — C1–C3 (D0025.1–.3) awaiting @jwildfire. The headline is one approval:
may the prepared safetyCharts release be submitted to CRAN.
**Requirement:** [jwildfire/obot.roadmap#281](https://github.com/jwildfire/obot.roadmap/issues/281) · **Goal:** [#73 increased autonomy](https://github.com/jwildfire/obot.roadmap/issues/73)
**Q&A:** [#293](https://github.com/jwildfire/obot.roadmap/discussions/293)

## What produced this

Two things on the same night.

The work: W0084 prepared, checked and adversarially audited both packages on 20 August and
handed them over on
[#281](https://github.com/jwildfire/obot.roadmap/issues/281#issuecomment-5361087922).
Nothing was pushed and nothing was submitted, because both repositories are outside the
`jwildfire` org.

The gap: @jwildfire noticed the same evening that finished work of that shape has no way
into his queue.

> *"Around the safety graphics resubmission stuff, we need to figure out how you get stuff
> like that added to the queue. I think probably, like, it's not a release in one of our
> packages, so it probably belongs in a decision artifact where you're just summarizing
> what was done and asking for approval to do the next step outside of... like, it's
> basically just a nonstandard action. Right? So you're asking for approval for a
> nonstandard action, which I think is fine."*

This page is the first instance of that answer, and the rule it establishes is recorded on
[#220](https://github.com/jwildfire/obot.roadmap/issues/220), where the three-bucket rule
itself lives, so the two are read together.

## Method

Nothing on the page was re-derived. The prepared work, the check results and the research
on the route back come from the worker hand-off at
`.claude/session-notes/2026-08-20-cran.md`, read in full rather than summarised from its
issue comment. Four things were measured fresh for this page:

- Both CRAN package pages fetched on 2026-08-20. Both still read that the package was
  removed from the CRAN repository, archived 2026-03-25 as requiring an archived package.
- The external request read from GitHub on 2026-08-20: `SafetyGraphics/safetyGraphics#728`,
  open, created 2026-08-17 by an external contributor, zero comments.
- Branch state read locally. `git branch -a --contains` on each prepared tip returns only
  the local branch in both repositories, which is how the page states as fact rather than
  as inference that neither branch has ever been pushed.
- The prepared tarballs confirmed present on disk.

## What it asks

- C1 (D0025.1) — do the packages go back to CRAN: submit now, hold until the replacement
  app's direction is settled, or stay off CRAN. Recommends submitting, after running the
  development-version check on each tarball.
- C2 (D0025.2) — the six calls baked into the prepared change. Recommends taking all six;
  the only one that changes behaviour is the retired chart raising an error rather than a
  warning, which the requirement described as a deprecation and which the page therefore
  puts back to him rather than absorbing.
- C3 (D0025.3) — the unanswered request outside the program. Recommends drafting the reply
  for him to post, whichever way C1 goes.

## Two facts the page is built to get right

- Only safetyCharts is submittable now. safetyGraphics must wait until safetyCharts is
  ACCEPTED, not merely submitted — a CRAN team member has stated that dependents are
  auto-archived otherwise. The prepared safetyGraphics comment file carries a do-not-submit
  banner and two blanks that cannot honestly be filled in until then.
- CRAN documents no un-archive procedure. What is established from primary sources and what
  is not are separated on the page, and the unestablished half is labelled UNVERIFIED in
  those words rather than presented as a plausible process.

## Scope note

Nothing was pushed, submitted, filed or commented anywhere. Both packages live under the
`SafetyGraphics` organisation, which agents in this program do not write to under any
circumstances — including `#728`, which asks for exactly this work and stays unanswered
for that reason. Every act the page recommends is @jwildfire's own.

## Open tail

- The prepared work exists on exactly one machine, in unpushed branches and in a workspace
  folder that is in no repository, and the laptop changes hands this weekend with no backup
  destination configured — the finding carried by
  [the laptop move](../2026-08-20-laptop-migration/). The page raises pushing the branches
  as worth doing under all three answers rather than only under the recommended one.
- This artifact needs an episode, per
  [#280](https://github.com/jwildfire/obot.roadmap/issues/280): an open decision artifact
  has one he can answer from a car.
- Requirement #281 is not on the roadmap board. Board writes fail for every agent
  credential — [#252](https://github.com/jwildfire/obot.roadmap/issues/252) — so that is a
  known blocked mechanism rather than an oversight.

---

Drafted by 👯🤖 W0095 using Claude Opus 5. Not reviewed by @jwildfire.
