# Usage data — how the Cost section stays current

The analytics page's Cost section is built from Claude Code transcripts, which live in
two places the site build cannot read:

| Store | Who can read it | How it reaches the page |
|---|---|---|
| @jwildfire's machine (`~/.claude/projects/-Users-jwildfire-Documents-obot2*`) — local sessions | only that machine | `refresh_local.sh` runs `build_usage_data.py` there, commits `site/usage/usage.json` to `main` when the numbers moved, and pushes; the push redeploys the site |
| A cloud session's container (`~/.claude/projects/-home-user-<repo>`) — one session, gone with the container | only that session, while it runs | the session runs `publish_session_usage.sh`, which writes `usage/sessions/<repo>-<session>.json` on the `session-state` branch |

The deploy (`.github/workflows/deploy-site.yml`, on every push to `main` and daily at
10:00 UTC) fetches `usage/sessions/` from `session-state`, validates every fragment,
merges them with the committed file (`scripts/lib/usage/merge.mjs`) and renders the
section. The page says which day each store runs through, so a store that has stopped
reporting is visible rather than silent. The published `usage/usage.json` is the merged
document.

## The local half, on his machine

Once, in the checkout:

```sh
bash scripts/usage/install_local_refresh.sh     # launchd, daily at 02:30, log in ~/Library/Logs/obot-usage-refresh.log
launchctl kickstart gui/$(id -u)/com.obot.usage-refresh   # run it now — this is the backfill
```

`refresh_local.sh` keeps its own clone under `~/.obot/usage-refresh` so a working
checkout is never committed from. It uses the machine's own git credentials and the
standing grant for direct commits of site content; it writes one file, and only when
the aggregate changed (`build_usage_data.py` leaves the file untouched when only the
generation stamp would differ). To refresh by hand instead:

```sh
python3 scripts/build_usage_data.py && git commit site/usage/usage.json -m "usage: local sessions through <day>" && git push
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

`build_usage_data.py` carries the list rates. A model missing from its table is counted
in tokens and billed at $0 with a warning on stderr — `claude-fable-5-1`, which the
cloud sessions run on, was in that state until 2026-09-12. Add a new model to `PRICES`
(and `CACHE_READ_RATE` when its cache-read rate is not 0.10× input) and re-run both halves.
