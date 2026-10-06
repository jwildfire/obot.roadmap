# Usage data — how the Cost section stays current

The analytics page's Cost section is built from Claude Code transcripts, which live in
two places the site build cannot read:

| Store | Who can read it | How it reaches the page |
|---|---|---|
| @jwildfire's machine (`~/.claude/projects/-Users-jwildfire-Documents-obot2*`) — local sessions | only that machine | `refresh_local.sh` runs `build_usage_data.py` there, which merges the scan into `site/usage/usage.json`; the script commits the file to `main` when the numbers moved and pushes; the push redeploys the site |
| A cloud session's container (`~/.claude/projects/-home-user-<repo>`) — one session, gone with the container | only that session, while it runs | the session runs `publish_session_usage.sh`, which writes `usage/sessions/<repo>-<session>.json` on the `session-state` branch |

The deploy (`.github/workflows/deploy-site.yml`, on every push to `main` and daily at
10:00 UTC) fetches `usage/sessions/` from `session-state`, validates every fragment,
merges them with the committed file (`scripts/lib/usage/merge.mjs`) and renders the
section. The page says which days each store covers and where the record is known to be
incomplete, so a store that has stopped reporting is visible rather than silent. The
published `usage/usage.json` is the merged document.

## The machine forgets, so the file is merged, never rebuilt

Claude Code deletes a transcript it has not touched for `cleanupPeriodDays` — 30 unless
the setting is raised. The local store is therefore a window, not an archive, and
`build_usage_data.py` treats the published file as the record:

- A day only the file has is kept exactly as published.
- A day only the scan has is added.
- A day both have goes to whichever counted more API calls, the scan on a tie. In
  practice that is the last published day, which is always a partial one.
- Each day carries its per-model split (`dayModels`), so the model table stays the sum
  of the days when one is exchanged. A day published before the split existed cannot be
  exchanged and is kept as published, with a warning.
- The result is checked against the file it would replace. If any published day is
  missing, or has fewer calls or tokens, or a lower cost, the run prints which and exits
  non-zero without writing. `--allow-lower-cost` waives the cost check alone, for a
  deliberate downward price correction.
- A file that exists but will not parse stops the run; it is never overwritten.

Tests: `python3 -m unittest discover -s scripts -p 'test_*.py'`.

## What the record does not hold

Stated on the page from `KNOWN_GAPS` in `scripts/lib/usage/render.mjs`, because nothing in
the data file can show it — a day whose transcripts were deleted looks like a quiet day.

- 20 August to 18 September 2026 is a floor. The refresh was not running (below), and by
  5 October, when the stretch was first read, only sessions that had stayed open inside
  the 30-day window were left: mostly the two coordinating sessions. For 14 to 18 August,
  the last days published in full, the file holds $3,625.14 and the machine held $570.31
  of it on 5 October, all from those two sessions — 16%. From 10 September the work also
  moved to cloud sessions, of which one (12 September) has published.
- 19 to 30 September 2026 has no record at all: no transcript from those days was on the
  machine on 5 October and no cloud session reported.
- Everything here is the obot2 workspace only. Sessions started from any other directory
  are not counted.

## Session titles are published

The page lists every agent by its label, and for an untagged session the label is the
conversation title — free text. `scripts/usage/label_overrides.json` maps a session-id
prefix to the label to publish instead; use it for any title that names something that
should not be public. It is keyed by id so the withheld title is never written in this
repository. The nightly job publishes new titles unread; the requirement on what the
machine may say about itself in public
([#246](https://github.com/jwildfire/obot.roadmap/issues/246)) is where that gets decided.

## The local half, on his machine

Once, in the checkout:

```sh
bash scripts/usage/install_local_refresh.sh     # launchd, daily at 02:30, log in ~/Library/Logs/obot-usage-refresh.log
launchctl kickstart gui/$(id -u)/com.obot.usage-refresh   # run it now
tail -5 ~/Library/Logs/obot-usage-refresh.log   # and check that it did
```

The installer copies `refresh_local.sh` to `~/.obot/bin/` and schedules the copy. It has
to: from its installation on 2026-09-12 until 2026-10-05 the job pointed at the script
inside the checkout, the checkout is under `~/Documents`, and macOS privacy protection
refuses a launchd job access to that folder — so all 25 runs ended at `Operation not
permitted`, exit 126, before the script's first line, and the page went seven weeks
without a local update. Re-run the installer once to pick up the fix. The copy hands over
to the script in its own clone, so it does not go stale.

`refresh_local.sh` keeps its own clone under `~/.obot/usage-refresh` so a working
checkout is never committed from. It uses the machine's own git credentials and the
standing grant for direct commits of site content; it writes one file, and only when
the aggregate changed (`build_usage_data.py` leaves the file untouched when only the
generation stamp would differ). To refresh by hand instead, read the new labels before
pushing:

```sh
python3 scripts/build_usage_data.py && git diff site/usage/usage.json | grep '"agent"' | sort -u
git commit site/usage/usage.json -m "usage: local sessions through <day>" && git push
```

This job runs unattended on his machine, which the program otherwise avoids
(obot.agent `docs/cloud-environments.md`); it exists because the local transcripts are
nowhere else. Remove it with `launchctl bootout gui/$(id -u)/com.obot.usage-refresh`.

## The cloud half, in every session

A cloud session publishes its own usage late in the session — at its nightly comment
and again at its close — from its repository checkout:

```sh
bash ~/obot.roadmap/scripts/usage/publish_session_usage.sh
```

Re-running overwrites the session's own fragment, so the ledger never double-counts. The
fragment's agent label is `☁️ <repo> · <branch handle>` (the `claude/` prefix and random
suffix stripped), its role is `cloud`, and its `source.id` names the session. It is a
procedure step rather than a hook: the developer guidelines say no hook publishes state.
The `requirement-session` skill (obot.agent) is where the step belongs; until it carries
it, a session runs the command itself.

Every session pushes to one branch, so a rejected push is rebased and retried. A session
in an environment whose git proxy cannot push to the hub reports the failure and the
session's usage is simply absent from the page; the page's note shows how many cloud
sessions have reported.

## Validation

`merge.mjs` rejects a fragment that is not schema 1, has a cell without a `YYYY-MM-DD`
day, an unknown role, a non-finite or negative number, an agent label over 80
characters or carrying control characters, or more than 20,000 cells; the deploy
warns and skips it rather than failing. The committed local file goes through the same
check and fails the build if it is malformed, since it is reviewed content.
Tests: `node --test scripts/lib/usage/*.test.mjs`.

## Pricing

`build_usage_data.py` carries the list rates, from the model pricing table at
<https://platform.claude.com/docs/en/about-claude/pricing> (last checked row by row on
2026-10-05). A model missing from its table is counted in tokens and billed at $0 with a
warning on stderr — `claude-fable-5-1` was in that state until 2026-09-12 and
`claude-opus-5-5` until 2026-10-05. Add a new model to `PRICES` (and `CACHE_READ_MULT`
when its cache reads are not 0.10× input, `FAST_PRICES` when it has a fast mode) and
re-run both halves: a day the machine still holds in full is re-priced on the next run,
because the scan wins a tie.
