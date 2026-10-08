<!--
NEWS.md is the running release log and the draft of each release's notes
(obot.agent/skills/release-notes/SKILL.md): newest section first; unreleased
work accumulates under a vX.Y (Upcoming) heading that loses the suffix when the
release is cut; the GitHub release publishes from the section verbatim.
-->

# obot.roadmap v0.5 — local sessions and the tracker

**See it move:** the [annotated v0.5 demo](https://jwildfire.github.io/obot.roadmap/reports/oa-v0.6-hub-v0.5-demo/) has screenshots, captures and the detail behind everything below.

The hub's first release since it became the standards home: a tracker in place of the project board, a cost chart that says what it covers, shorter release notes, and the fixes from a security review. Since 2026-10-07 the standards say a session runs locally and writes to GitHub as obotclaw[bot]; cloud sessions are parked. The roadmap pages no longer list draft releases.

## What's new

- **The tracker replaces the project board.** [`tracker.html`](https://jwildfire.github.io/obot.roadmap/tracker.html) shows every objective opened to its requirements and their tasks, with search, filters and a link that carries the view. The nav is the four pages that get read. PR [#347](https://github.com/jwildfire/obot.roadmap/pull/347)
- **The Cost chart runs through October and says what it covers.** The [analytics page](https://jwildfire.github.io/obot.roadmap/analytics/index.html) names the days each record runs through and the stretches where nothing was recorded. Local usage is refreshed by hand. PR [#370](https://github.com/jwildfire/obot.roadmap/pull/370)
- **The standards say how a session runs now.** A session runs locally, from @jwildfire's workspace, and writes to GitHub as obotclaw[bot]. Approving a pull request, merging past a ruleset and changing a ruleset stay his alone. [#384](https://github.com/jwildfire/obot.roadmap/issues/384), PR [#385](https://github.com/jwildfire/obot.roadmap/pull/385)
- **Release notes are held to a length.** At most 600 words a section and 70 a feature bullet, with the detail on the release's demo page ([developer guidelines](https://github.com/jwildfire/obot.roadmap/blob/main/docs/developer-guidelines.md#releases)). obot.agent PR [#341](https://github.com/jwildfire/obot.agent/pull/341)
- **A release candidate is reviewed by three subagents the session spawns.** They replace ultrareview, which only a person can launch. The session resolves every finding and posts the review before @jwildfire is asked. obot.agent PR [#340](https://github.com/jwildfire/obot.agent/pull/340)
- **The site build no longer uses the bot's key.** The step that minted a bot token is gone, and the steps that install outside code no longer see a personal token. A push to `main` cannot act as the bot once @jwildfire deletes the two secrets the build has stopped reading. [#382](https://github.com/jwildfire/obot.roadmap/issues/382), [#384](https://github.com/jwildfire/obot.roadmap/issues/384), PR [#383](https://github.com/jwildfire/obot.roadmap/pull/383), PR [#385](https://github.com/jwildfire/obot.roadmap/pull/385)

## Also in this release

- **The ruleset check fails when it cannot look.** `scripts/github-flows.sh check` reports a ruleset it cannot read as drift, and any entry on a bypass list. It used to print "matches" for both. [#378](https://github.com/jwildfire/obot.roadmap/issues/378), PR [#379](https://github.com/jwildfire/obot.roadmap/pull/379), PR [#387](https://github.com/jwildfire/obot.roadmap/pull/387), PR [#390](https://github.com/jwildfire/obot.roadmap/pull/390)
- **The nightly local usage job is retired.** Its script no longer hands control to a freshly fetched copy of itself. [#378](https://github.com/jwildfire/obot.roadmap/issues/378), PR [#379](https://github.com/jwildfire/obot.roadmap/pull/379)
- **The roadmap pages list release candidates from pull requests only.** Reading draft releases needed a token that can write. [#384](https://github.com/jwildfire/obot.roadmap/issues/384), PR [#385](https://github.com/jwildfire/obot.roadmap/pull/385), PR [#387](https://github.com/jwildfire/obot.roadmap/pull/387)
- **Links to pages obot.agent removed point at their new homes.** [#372](https://github.com/jwildfire/obot.roadmap/issues/372), PR [#376](https://github.com/jwildfire/obot.roadmap/pull/376)

## Tests and provenance

138 generator tests and 15 usage-aggregator tests pass, and the deploy checks that every published page describes itself. Each security finding fixed here was reproduced before its fix. The bot's token and the guard behind the third bullet are tooling of @jwildfire's workspace and are in no repository.

# obot.roadmap v0.4 — the standards home

**See it move:** [Requirement Sessions: the Mid-October Plan](https://jwildfire.github.io/obot.roadmap/reports/goal-sessions-plan-2026-09-10/) — the operating model this release installs, and the five objectives it runs.

The autonomous prototype was shut down on 2026-09-10 and the hub became the standards home: how work is tracked, how sessions run, and how code reaches a release now live here, in more detail than they had anywhere, and every session in every repository is bound to them. The site follows: objectives instead of goals, status on the issue instead of a board, a news feed of what actually moved, and the navigator-era scaffold gone.

## What's new

- **Three standards under `docs/`, mandatory everywhere.** The [issue contract](https://github.com/jwildfire/obot.roadmap/blob/main/docs/issue-contract.md) — objectives, requirements and tasks, definitions of done, status, blocked, comments, who decided it; [ways of working](https://github.com/jwildfire/obot.roadmap/blob/main/docs/ways-of-working.md) — the three phases (prep with @jwildfire, semi-autonomous execution, his review), requirement sessions and `/goal`, steering, the standup; and the [developer guidelines](https://github.com/jwildfire/obot.roadmap/blob/main/docs/developer-guidelines.md) — branches, Claude Code setup, pull requests, merging via rulesets, testing, releases with the ultrareview gate, artifacts, the write policy.
- **Objectives → Requirements → Tasks, with definitions of done.** Goals are objectives, to keep clear of Claude Code's `/goal`; a session runs one requirement, sized so one `/goal` run can close its tasks and prove its definition of done. The [objective](https://github.com/jwildfire/obot.roadmap/blob/main/.github/ISSUE_TEMPLATE/objective.yml), [requirement](https://github.com/jwildfire/obot.roadmap/blob/main/.github/ISSUE_TEMPLATE/requirement.yml) and [task](https://github.com/jwildfire/obot.roadmap/blob/main/.github/ISSUE_TEMPLATE/task.yml) templates carry it; the requirement template is simplified — an Objective field, repositories named, no provenance block.
- **Status is a label on the issue; the project board is retired.** `status: backlog` → `ready` → `in session` → `review` → `released`, one at a time, applied on filing and moved by the session at its start, its release candidate and its close. The [catalog](https://jwildfire.github.io/obot.roadmap/catalog.html) reads the labels and is the tracker; an open requirement labelled released, unlabelled, or doubly labelled is drift and says so.
- **The news feed shows what moved.** [News](https://jwildfire.github.io/obot.roadmap/news.html) now carries issue transitions — a requirement or objective filed, moved between statuses, closed, reopened — beside artifact creation and releases; a bulk day collapses to one row. The session diary closed on 2026-09-10: agents comment on the issues they work, and write an artifact only when a comment cannot carry it.
- **Every release candidate gets an ultrareview before it reaches @jwildfire.** It opens as a draft, `claude ultrareview <PR#> --post` runs, every finding is fixed or answered, and only then is it marked ready and he is asked.
- **The navigator-era scaffold is gone.** The nightly roadmap audit and its apply lane, the ideas triage, the local-only guard, the premise-status stamp, the config count, the session-state strip, the Audit and Agents nav entries and their labels — 35 files and 20k lines — removed; the roadmap and objective pages, news, diary history, reports and decisions, analytics and the status dashboard stay.

## Landed on main since v0.3, before the change of direction

These shipped to `main` between July and September under the autonomous prototype and are kept on record; several describe machinery this release then removed.

- **A decision artifact now says on the page whether its own premises still hold** — the claim sweep has re-checked them every five minutes since [obot.agent#262](https://github.com/jwildfire/obot.agent/issues/262), and the page itself said nothing, so a reader met an argument built on a premise that might have expired with no sign anything had ever looked. Every artifact now carries a strip above its masthead: the verdict, how old the reading is, and each premise with its own state. A page cannot check itself as you read it, so it does the next honest thing — it recomputes the reading's age in your browser, and past a day it stops asserting anything and tells you how long it has been instead. Holding, expired, "a person has to look" and "nothing has measured this" stay four different sentences ([#266](https://github.com/jwildfire/obot.roadmap/issues/266), [#301](https://github.com/jwildfire/obot.roadmap/issues/301)).
- **The drift count stops reporting a blocked mechanism as decay** — nothing can put an issue on the [obot Roadmap board](https://github.com/users/jwildfire/projects/1) any more ([#252](https://github.com/jwildfire/obot.roadmap/issues/252)), so every requirement filed since joins the off-board set and the drift number climbs by itself. Those rows are now counted as blocked rather than as drift, still shown and still saying `Unstaged`, with one line under the table naming the block and linking the decision. The queue says it once instead of once per requirement, and the audit marks the 61 findings whose repair is a board write as ones it cannot run — refused before anything is attempted, rather than failing halfway ([#254](https://github.com/jwildfire/obot.roadmap/issues/254)).
- **The roadmap page leads with what needs you** — [`roadmap.html`](https://jwildfire.github.io/obot.roadmap/roadmap.html) is now the queue: everything waiting on @jwildfire in one ranked list, longest wait first, each card carrying the one action that clears it. [The wire](https://jwildfire.github.io/obot.roadmap/wire.html) is one click behind with the last 7 days newest-first, and a slim NOW strip on both says what is running right now. Nothing moved: the URL everything already pointed at is the one that changed behind you.
- **The inventory survives in full as [the catalog](https://jwildfire.github.io/obot.roadmap/catalog.html)** — every requirement, PR, release, goal and idea, both composable filters, the hierarchy current-versus-proposed review lane, the audit fold and the changelog, exactly as they were; it simply stops being the front door. Deep links into it keep working from their old addresses. Decided as D0018 and built as [#211](https://github.com/jwildfire/obot.roadmap/issues/211); the three design-spike pages that produced the decision have come down, as the decision said they would.
- **Release-candidate dedupe actually runs** — the browser copy of the release-identity rule had lost its backslashes on the way into the page and quietly matched no version at all, so an RC PR and its draft release always counted twice. It is now emitted from `scripts/lib/rc.mjs` instead of retyped, with a test that evaluates what reaches the browser ([#209](https://github.com/jwildfire/obot.roadmap/issues/209)).
- **Section deep links land on their section** — a fragment like `#sec-audit` was being erased on load before the browser could act on it, dropping every such link at the top of the page instead. Fixed, along with the stale `#sec-usage` link left behind when Cost moved to the analytics page.
- **The roadmap page opens with what needs you** — a Todo section leading with the two queues: release candidates awaiting review, then decisions needed, each linking its PR or Q&A thread.
- **The decision log agrees with itself** — whether @jwildfire has decided something was recorded in two places, the published index and a field in the decision registry, with nothing comparing them; ten of twenty-one artifacts disagreed. The artifact page is now the single authority: it declares its state beside his recorded words, the registry is stamped from it, the index row is checked against it, and the deploy fails on any disagreement ([#196](https://github.com/jwildfire/obot.roadmap/issues/196), [#255](https://github.com/jwildfire/obot.roadmap/issues/255)).
- **Decisions have a lane**: self-contained artifacts under `reports/decisions/` with an index, each posted to a Q&A discussion where the decision is documented in-thread — including the RC-shape (R2), operational-vs-clinical, session-model, elicitation-method, and prime-context decisions.
- **Diary entries lead with RCs then decisions** — the RC-first wrapup format, so the daily record carries the same two headlines as the queues.
- **Nightly roadmap audits** publish a findings page every day under `reports/`.
- **Release-candidate demo pages** ship under `reports/` for each RC (safety.viz v1.6.0, obot.agent v0.4.0), walking every change against the live surface.

# Earlier releases

- [v0.3 — the roadmap that runs itself](https://github.com/jwildfire/obot.roadmap/releases/tag/v0.3) — 2026-07-25.
- [v0.2 — Designs signed off, identities and the session loop in place](https://github.com/jwildfire/obot.roadmap/releases/tag/v0.2) — 2026-07-11.
- [v0.1 — Roadmap hub established](https://github.com/jwildfire/obot.roadmap/releases/tag/v0.1) — 2026-07-03.
