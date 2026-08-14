# Openclaw daily summaries — diagnosis notes

## 1. Where the summaries live

- **Primary corpus:** `/Users/jwildfire/Documents/obot2/obot-claw.github.io/daily/` — 32 dated entries, `2026-05-11.md` → `2026-06-11.md` (+ `index.md`). 18,760 words total (~570 words/entry average).
- **Mirrored into the current hub:** `/Users/jwildfire/Documents/obot2/obot.roadmap/diary/` carries the same 05-11→06-11 files (migrated), then the new-era entries resume 2026-07-02.
- **Cadence/channel (from git log):** committed by a cron at **23:31–23:35 ET every night, unconditionally** — commit messages "Publish {date} daily briefing", one per night, even on zero-activity days. Confirmed by memory `nightly-diary-routine.md`: "obot's old cadence: **unconditional nightly briefing ~23:30 ET** pushed to main by the obot-claw account". Channel = the obot-claw.github.io GitHub Pages site (`/daily/{date}/`); Jeremy had to navigate to the site to read it. No push/notification lane found in the repo.
- `~/Documents/github/obot` contains only `DECISION_DRAFTS.md` and `MIGRATION_PLAN.md` — no summaries there.
- The paused cloud replacement (`obot-hub-nightly-diary`, trig_01Uhscww…, paused 2026-07-02 over the 403 write blocker) never published a post.

## 2. Specimens

| Date | Words | Structure (## headings, in order) | Actionable lead? | Links | Latency | Channel |
|---|---|---|---|---|---|---|
| 2026-05-12 | 136 | Completed · Public links · Recommended next steps | No — narrative recap; no ask | 2 bare URLs | committed 23:32 same night (up to ~23h after the events) | Pages site `/daily/2026-05-12/` |
| 2026-05-25 | 559 | Work completed · PRs/issues touched · Checks and deploy outcomes · Blockers/risks · Recommended next priorities · Public Projects page updates | No — and this was a self-described "quiet day": 559 words to say nothing changed, incl. a full re-list of 8 unchanged draft PRs and "No project percentages changed today" | ~10 link-lines (many repeated from prior days) | 23:32 nightly batch | Pages site |
| 2026-06-08 | 865 | Work completed today · PRs/issues/reports touched · Blockers and risks · **🙋 ToDo** · Recommended next priorities · Project status changes | Partially — 7 explicit @jwildfire decision asks with links, but the ToDo section starts at **line 38, after ~500 words** of recap; asks are long (30–45 words each) and mix "please decide" with "no action until…" | Every ToDo item linked | 23:32 nightly batch | Pages site |
| 2026-06-11 | 723 | same 6-section template as 06-08 | Partially — ToDo at line 34, below the fold | linked | 23:32 (final entry; org archived 07-02) | Pages site |

- The **🙋 ToDo** (decision-asks) section only exists in the **last 7 of 32 entries** (2026-06-05 onward; added by the 06-06 "Add PM ToDo" commit). For the first 3.5 weeks there was no action section at all.
- Word count grew monotonically: 122–152 words (first 3 days) → 436–723 (mid-May) → 683–865 (June). The fixed 6-section template was filled every night regardless of signal.

## 3. The news feed Jeremy likes — dashboard "Roadmap activity" feed

Source: `/Users/jwildfire/Documents/obot2/obot.agent/tools/session-hub/lib/render.mjs` (`activityFeed()`, lines 187–194, wired at 239–240) + `lib/collect.mjs` (`collectGhSweep()`, lines 145–219); rendered instance in `/Users/jwildfire/Documents/obot2/.claude/session-hub/live.html` (lines 231–238).

- **Items:** GitHub issues + PRs owned by jwildfire updated **since session start**, plus recent releases across 5 active repos (`ACTIVE_REPOS` in collect.mjs); event verb derived per item (opened / closed / merged / released).
- **Wording:** one line per event, ~15–20 words: `12:02 AM · obot.agent · PR #91 Prime durable state… — merged`. Time + repo + linked number + title + bold verb. No prose.
- **Freshness:** gh sweep cached with a **5-minute TTL**; page auto-refreshes every 60s (or SSE live refresh when chat is on). Events appear minutes after they happen.
- **Links:** every item is an `<a href>` to the GitHub object.
- **Push vs pull:** ambient pull — the dashboard is already open in Chrome during a session (`/session-dashboard` skill); no separate trip. It is a **collapsed secondary panel** ("▸ Roadmap activity · 5 events") under the Priorities panel — count visible at a glance, expand only if curious.
- **Order/curation:** strictly chronological, machine-derived, session-scoped. Zero editorializing; the *curated* content lives in the sibling Priorities/Todo/Next-session panels instead.
- Related but distinct: the hub site also has a news feed (`obot.roadmap/scripts/build_news.mjs` → `news.html`, added 2026-07-03 per `obot.roadmap/diary/2026-07-03.md`) — same one-event-one-line-one-link idiom at roadmap scale; diary 2026-07-28 notes wrapup rules were changed *because* prose "scrolls off the news page", i.e. the feed is the read surface.

## 4. Failure-mode contrast

| Dimension | Openclaw daily summary (ignored) | Dashboard news feed (liked) |
|---|---|---|
| Length per item | 570-word avg document; bullets 20–45 words, 6 mandatory sections filled even on quiet days (05-25: 559 words for "nothing changed") | ~15–20 words per event, header shows just "N events" |
| Freshness | Batch at 23:31 ET — up to ~23h after the event, at the one hour Jeremy isn't working | Minutes (5-min sweep TTL, 60s page refresh), during the session |
| Actionability | Asks absent for 25/32 entries; when present (🙋 ToDo), buried at line ~34–50 behind the recap; mixed with "no action needed" items | Doesn't pretend to be actionable — pure event log; actionable items live in the always-open Priorities panel beside it |
| Links | Present but padded — quiet-day entries re-list the same 8 unchanged PRs with links night after night | One link per event, each link is *new* since session start |
| Channel / trip cost | Separate destination (Pages site), no notification; reading is an errand | Already-open dashboard tab; reading is a glance |
| Novelty vs redundancy | Recaps work Jeremy was in the room for (he ran the sessions) + repeats prior nights' open-item lists | Only deltas since session start; nothing repeats |
| Required for anything? | No — nothing gated on reading it, and decisions asked there were also on GitHub | No — but it costs ~2 seconds, so it gets read anyway |

## 5. Top diagnosed failure causes

1. **Recap of a day he lived, delivered after it ended.** Unconditional 23:31 batch publishing meant the content was either already known (he directed the sessions) or 23h stale; quiet days still produced 500+ word entries, training him that opening it usually paid nothing.
2. **Actionable asks buried or absent.** No decision section at all until the final week; even then 🙋 ToDo sat 4th of 6 sections, ~500 words down, with verbose mixed-urgency asks — the one thing that needed his eyes never led.
3. **Destination + template padding.** A separate Pages-site trip to read a fixed 6-section document whose length tracked the template, not the signal (136→865 words as sections accreted); vs. the feed's one-line-one-link-one-verb items inside a page he already has open, scoped to only what changed.
