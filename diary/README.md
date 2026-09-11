# Diary

Closed 2026-09-10. The session diary is no longer written: agents comment on the issues they
work, artifacts are linked from issues, and the site's news feed shows issue transitions
and artifact creation ([ways of working](../docs/ways-of-working.md#comments-artifacts-and-the-news-feed)).
The entries below stay as history and are still rendered to the site.

AI-written diary of project work — the continuation of the
[archived obot-claw hub](https://github.com/obot-claw/obot-claw.github.io)'s daily
briefings (32 entries, 2026-05-11 → 2026-06-11, migrated verbatim with front matter
and site navigation stripped).

## Conventions

- One file per working session with activity: `diary/YYYY-MM-DD.md` for a day's
  first session, `diary/YYYY-MM-DD-N.md` (N = 2, 3, …) for later sessions the same
  day. No entry on empty days — never machine-generated filler.
- **Cadence (design decision D2): per working session.** A session that did
  substantive work writes that session's entry before it ends; a goal session's
  nightly comment on its requirement issue is the source for most of it.
- **Section format leads with what needs @jwildfire**: `## 🚦 Release candidates
  needing review`, then `## 🧭 Decisions needed` — each a bulleted list of
  one-line items linking their PR or draft release and their hub demo or
  decision artifact — and only then the record (what was completed, issues/PRs
  touched, blockers/risks, scaffold changes, next-session loose ends, and the
  mechanical `## 🙋 ToDo` remainder). Both headline lists are **cumulative**: an
  RC he has not reviewed and a decision he has not made stay at the top of every
  subsequent entry until he closes them.
- Entries are rendered to the site by `scripts/render_diary.mjs` at deploy time;
  the markdown here is the source of truth.
