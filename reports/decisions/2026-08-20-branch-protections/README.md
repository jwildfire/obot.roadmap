# D0022 — Branch protections before the clock starts

**Status: Open** — P1 (D0022.1) awaiting @jwildfire. One choice: Option A, B or C.
**Requirement:** [jwildfire/obot.roadmap#272](https://github.com/jwildfire/obot.roadmap/issues/272) · **Goal:** [#73 increased autonomy](https://github.com/jwildfire/obot.roadmap/issues/73)
**Q&A:** [#283](https://github.com/jwildfire/obot.roadmap/discussions/283)

## What produced this

@jwildfire, 2026-08-18, dictated from the car after listening to the D0019 episode:

> *"I definitely want you to do branch protections in GitHub. That is critical. We need
> to do it. Probably should have already done it. So you go ahead and make a separate
> recommendation document around that with a podcast, and we can... I'll listen to that
> in the next few days, and I want that live before the scheduling starts. Definitely
> makes sense. It's a guardrail."*

It is the first thing he has called critical in his own words, and it carries an
ordering: protections live, then scheduled sessions start.

## Method

Everything on the page was measured on 2026-08-20 from the GitHub API. Nothing was
carried from the requirement, which was itself written from a partial reading.

- Protection state: `GET /repos/{owner}/{repo}/branches` for the `protected` flag on
  every branch of all seven repositories in the merge policy, then
  `GET .../branches/{branch}/protection` for the two that carry one. Rulesets checked
  separately (`GET /repos/{owner}/{repo}/rulesets`) — none exist anywhere.
- Direct-push counts: for each roled branch, the last 25–30 commits from the commits
  API, each asked whether a pull request is associated with it. A commit with none
  arrived by a direct push. This is the number that decides what a pull-request rule
  costs on that branch, and it is why the recommendation splits ten branches from three
  rather than applying one rule everywhere.
- Which build check can be required: read from each repository's workflow triggers, not
  from what happened to run last. Requiring a check that does not run on pull requests
  to that branch blocks the branch permanently — which is why open.gismo's `main` gets
  no required check (both its workflows filter pull requests to `dev`) and demo-301 gets
  none at all.
- The bot's permission: confirmed by an actual request. `gh api .../protection` with an
  obotclaw installation token returns 403 "Resource not accessible by integration".
  Inferring it from configuration would have been a guess.

## Corrections against the requirement

Two readings in [#272](https://github.com/jwildfire/obot.roadmap/issues/272) did not
survive measurement, and the page states the corrected version:

- The requirement's table says safety.viz `main` is protected "with required reviews".
  It is not. Its required approving review count is zero — a pull request is required,
  an approval is not. That distinction is the entire reason the recommendation is
  cost-free, so the page makes it explicit rather than repeating the summary.
- The requirement counts seven release-role branches and lists seven rows. The merge
  policy actually governs thirteen roled branches across seven repositories; the missing
  six include the harness repository's `stable`, demo-301's `site` (a released surface
  currently written by direct push, which routes around the attested lane entirely), and
  four integration branches. The page works from all thirteen.

## What it asks

One question, because everything else is already settled and written down.

- P1 (D0022.1) — which of three protection sets is applied. Recommends Option A.

## Scope note

The page proposes; nothing was applied and no protection was changed. Applying needs
repository administrator rights, which the bot does not have and should not be given.
The tooling that applies and verifies the choice is merged in
[obot.agent#267](https://github.com/jwildfire/obot.agent/pull/267) and refuses to run
without a citation of where and when he decided.

## Open tail

The requirement's third done-condition — that the scheduling work has a stated
dependency on this and cannot start before it — is not satisfied by anything mechanical
today. The scheduled-sessions requirement
([#122](https://github.com/jwildfire/obot.roadmap/issues/122)) does not mention branch
protections. The page names the natural place to put it: the unattended autonomy level
in the merge policy already describes scheduling as not yet enabled, and raising it
already needs his sign-off, so making the protection check a precondition of that raise
would turn the ordering from an intention into a step. That is a follow-on, not part of
this decision.
