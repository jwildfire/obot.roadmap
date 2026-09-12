#!/usr/bin/env bash
# Publish this cloud session's Claude Code usage to the hub's usage ledger.
#
# A cloud session's transcripts live in its container and vanish with it, so the
# session is the only thing that can ever count them. This aggregates the
# container's transcript store with scripts/build_usage_data.py into one fragment
# and commits it to usage/sessions/<repo>-<session>.json on the `session-state`
# branch of jwildfire/obot.roadmap. The nightly site deploy merges every fragment
# there with the committed local file (scripts/lib/usage/merge.mjs) and the
# analytics page's Cost section shows the sum.
#
# Run it from the session's repository checkout, late in the session — at the
# nightly comment and again at close. Re-running overwrites the session's own
# file, so the ledger never double-counts. It is a procedure step, not a hook:
# the developer guidelines say no hook publishes state.
#
#     bash ~/obot.roadmap/scripts/usage/publish_session_usage.sh            # publish
#     bash ~/obot.roadmap/scripts/usage/publish_session_usage.sh --dry-run  # aggregate, commit locally, push nothing
#
# Environment (all optional): OBOT_HUB_URL (the hub clone URL), CLAUDE_PROJECTS_DIR
# (the transcript store, default ~/.claude/projects), OBOT_USAGE_PREFIX (the
# project-directory prefix to scan, default -home-user- — the cloud container's
# slug for /home/user/<repo>).
set -euo pipefail

HUB_URL=${OBOT_HUB_URL:-https://github.com/jwildfire/obot.roadmap.git}
LEDGER_BRANCH=session-state
LEDGER_PATH=usage/sessions
STORE=${CLAUDE_PROJECTS_DIR:-$HOME/.claude/projects}
PREFIX=${OBOT_USAGE_PREFIX:--home-user-}

HERE=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
AGGREGATOR="$HERE/../build_usage_data.py"

DRY_RUN=0
for arg in "$@"; do
  case "$arg" in
    --dry-run) DRY_RUN=1 ;;
    -h|--help) sed -n '2,24p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//'; exit 0 ;;
    *) echo "unknown argument: $arg" >&2; exit 2 ;;
  esac
done

# --- identify the session ------------------------------------------------------
# The repository this session works in, from its checkout; the branch handle
# without the claude/ prefix and the random suffix (claude/sharp-archimedes-0glrb8
# → sharp-archimedes) — the public, human-sized name for the session.
REPO=$(basename -s .git "$(git remote get-url origin 2>/dev/null || basename "$PWD")")
BRANCH=$(git branch --show-current 2>/dev/null || echo unknown)
HANDLE=$(printf '%s' "$BRANCH" | sed -E 's#^claude/##; s/-[a-z0-9]{6}$//')

# The main session's id is the name of the oldest top-level transcript in the
# container's store (sub-agents sit underneath it). Every transcript in a container
# belongs to this one session, so one fragment covers the store.
STORE_DIRS=$(find "$STORE" -maxdepth 1 -mindepth 1 -type d -name "${PREFIX}*" 2>/dev/null | sort)
if [ -z "$STORE_DIRS" ]; then
  echo "no transcript store under $STORE matching ${PREFIX}* — nothing to publish" >&2
  exit 1
fi
FIRST_TRANSCRIPT=$(find $STORE_DIRS -maxdepth 1 -name '*.jsonl' -printf '%T@ %p\n' 2>/dev/null | sort -n | head -1 | cut -d' ' -f2-)
if [ -z "$FIRST_TRANSCRIPT" ]; then
  echo "no transcripts under $STORE_DIRS — nothing to publish" >&2
  exit 1
fi
SESSION=$(basename -s .jsonl "$FIRST_TRANSCRIPT")
SHORT=${SESSION:0:8}
FRAGMENT="${REPO}-${SHORT}.json"
AGENT="☁️ ${REPO} · ${HANDLE}"

# --- aggregate -----------------------------------------------------------------
TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT

python3 "$AGGREGATOR" \
  --projects-dir "$STORE" --prefix="$PREFIX" \
  --role cloud --agent "$AGENT" --source "cloud:${REPO}:${SESSION}" \
  --out "$TMP/$FRAGMENT"
LAST=$(python3 -c 'import json,sys; print(json.load(open(sys.argv[1]))["totals"]["last"])' "$TMP/$FRAGMENT")

# --- publish -------------------------------------------------------------------
git clone -q --depth 1 --branch "$LEDGER_BRANCH" --single-branch "$HUB_URL" "$TMP/ledger"
mkdir -p "$TMP/ledger/$LEDGER_PATH"
cp "$TMP/$FRAGMENT" "$TMP/ledger/$LEDGER_PATH/$FRAGMENT"

cd "$TMP/ledger"
git add "$LEDGER_PATH/$FRAGMENT"
if git diff --cached --quiet; then
  echo "usage ledger already carries $LEDGER_PATH/$FRAGMENT through $LAST — nothing to publish"
  exit 0
fi
# The session's git identity if it has one; a fixed one otherwise, since the
# commit is a data write and the fragment's source block names the session.
git config user.name  >/dev/null 2>&1 || git config user.name  "obot usage ledger"
git config user.email >/dev/null 2>&1 || git config user.email "noreply@github.com"
git commit -q -m "usage: ${AGENT} through ${LAST}" \
  -m "Published by scripts/usage/publish_session_usage.sh from the session's container; merged into the analytics page by the nightly deploy."

if [ "$DRY_RUN" = 1 ]; then
  echo "dry run — would push this to $LEDGER_BRANCH:"
  git --no-pager show --stat HEAD | head -12
  exit 0
fi

# Every session pushes to the same branch; a rejected push means someone else
# got there first, so rebase this one commit onto theirs and try again.
for attempt in 1 2 3 4 5; do
  if git push -q origin "$LEDGER_BRANCH"; then
    echo "published $LEDGER_PATH/$FRAGMENT (${AGENT}, through $LAST) to $LEDGER_BRANCH"
    exit 0
  fi
  echo "push rejected (attempt $attempt) — rebasing onto the branch and retrying" >&2
  sleep $((attempt * 2))
  git fetch -q origin "$LEDGER_BRANCH"
  git rebase -q "origin/$LEDGER_BRANCH" || { git rebase --abort; git reset -q --hard "origin/$LEDGER_BRANCH"; cp "$TMP/$FRAGMENT" "$LEDGER_PATH/$FRAGMENT"; git add "$LEDGER_PATH/$FRAGMENT"; git commit -q -m "usage: ${AGENT} through ${LAST}"; }
done
echo "could not push to $LEDGER_BRANCH after 5 attempts" >&2
exit 1
