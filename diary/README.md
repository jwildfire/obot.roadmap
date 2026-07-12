# Diary

AI-written diary of project work — the continuation of the
[archived obot-claw hub](https://github.com/obot-claw/obot-claw.github.io)'s daily
briefings (32 entries, 2026-05-11 → 2026-06-11, migrated verbatim with front matter
and site navigation stripped).

## Conventions

- One file per working session with activity: `diary/YYYY-MM-DD.md` for a day's
  first session, `diary/YYYY-MM-DD-N.md` (N = 2, 3, …) for later sessions the same
  day. No entry on empty days — never machine-generated filler.
- **Cadence (design decision D2): per working session.** The agent wraps up any
  substantive session by writing that session's entry. The entry is the final step
  of the full
  [`session-wrapup` skill](https://github.com/jwildfire/obot.agent/blob/main/skills/session-wrapup/SKILL.md)
  (home: obot.agent since v0.1.0) — roadmap hygiene, todo capture, scaffold review,
  and next-session planning come first.
- **Session report (requirement [#24](https://github.com/jwildfire/obot.roadmap/issues/24)):**
  each entry links its frozen operational record in
  [`reports/sessions/`](../reports/sessions/) — same slug as the entry — with a
  "📊 Session report" line under the meta block, added by the wrapup's report step.
- Section format follows the hub entries: what was completed, issues/PRs touched,
  blockers/risks, and items needing @jwildfire.
- Entries are rendered to the site by `scripts/render_diary.mjs` at deploy time;
  the markdown here is the source of truth.
