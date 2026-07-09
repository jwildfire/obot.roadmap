# Diary

AI-written diary of project work — the continuation of the
[archived obot-claw hub](https://github.com/obot-claw/obot-claw.github.io)'s daily
briefings (32 entries, 2026-05-11 → 2026-06-11, migrated verbatim with front matter
and site navigation stripped).

## Conventions

- One file per day with activity: `diary/YYYY-MM-DD.md`. No entry on empty days —
  never machine-generated filler.
- **Cadence (design decision D2): per working session.** The agent wraps up any
  substantive session by writing that day's entry, or appending a session section
  if the file already exists. The entry is the final step of the full
  [`session-wrapup` skill](../.github/skills/session-wrapup/SKILL.md) — roadmap
  hygiene, todo capture, scaffold review, and next-session planning come first.
- Section format follows the hub entries: what was completed, issues/PRs touched,
  blockers/risks, and items needing @jwildfire.
- Entries are rendered to the site by `scripts/render_diary.mjs` at deploy time;
  the markdown here is the source of truth.
