#!/usr/bin/env bash
# Nightly refresh of the committed local usage file, for @jwildfire's machine.
#
# Aggregates this machine's Claude Code transcripts with scripts/build_usage_data.py
# and, when the numbers moved, commits site/usage/usage.json to main and pushes —
# which redeploys the site, so the analytics page's Cost section carries last
# night's local sessions by morning. Cloud sessions are not here: they report
# themselves (publish_session_usage.sh) and the deploy merges the two.
#
# It works in its own clone (~/.obot/usage-refresh by default), never in a working
# checkout, so a half-edited tree is never committed by accident. Nothing else is
# written to main: one file, one commit, only when it changed. The commit is
# allowed by the standing grant for direct commits of site content.
#
#     bash scripts/usage/refresh_local.sh            # once, by hand
#     bash scripts/usage/install_local_refresh.sh    # nightly at 02:30 via launchd
#
# Environment (optional): OBOT_HUB_URL (clone URL — use the SSH form if that is how
# this machine authenticates), OBOT_USAGE_WORKDIR (the clone's location).
set -euo pipefail

HUB_URL=${OBOT_HUB_URL:-https://github.com/jwildfire/obot.roadmap.git}
WORK=${OBOT_USAGE_WORKDIR:-$HOME/.obot/usage-refresh}
FILE=site/usage/usage.json

log() { printf '%s %s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$*"; }

if [ ! -d "$WORK/.git" ]; then
  log "cloning $HUB_URL into $WORK"
  mkdir -p "$(dirname "$WORK")"
  git clone -q --branch main --single-branch "$HUB_URL" "$WORK"
fi
git -C "$WORK" fetch -q origin main
git -C "$WORK" reset -q --hard origin/main

# The aggregator leaves the file untouched when only its timestamp would change,
# so a quiet night makes no commit.
python3 "$WORK/scripts/build_usage_data.py" --out "$WORK/$FILE"

if git -C "$WORK" diff --quiet -- "$FILE"; then
  log "unchanged — nothing to commit"
  exit 0
fi

LAST=$(python3 -c 'import json,sys; print(json.load(open(sys.argv[1]))["totals"]["last"])' "$WORK/$FILE")
git -C "$WORK" add "$FILE"
git -C "$WORK" commit -q -m "usage: local sessions through ${LAST}" \
  -m "Nightly refresh by scripts/usage/refresh_local.sh on @jwildfire's machine."
git -C "$WORK" push -q origin main
log "pushed $FILE through $LAST — the site redeploys on this push"
