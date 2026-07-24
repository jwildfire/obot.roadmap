#!/usr/bin/env bash
# Builds /tmp/context-pack.md for the ideas-triage workflow (requirement #58).
# Runs in the workflow after checkout (hub at ., obot.agent at ./obot-agent).
# Every section is best-effort: a failed fetch degrades to a note, never a failed run.
set -uo pipefail
OUT=/tmp/context-pack.md
R=jwildfire/obot.roadmap

{
  echo "# Triage context pack — generated $(date -u +%FT%TZ)"
  echo
  echo "## Open requirement issues"
  gh issue list -R "$R" --label requirement --state open --limit 100 \
    --json number,title,labels,milestone \
    --jq '.[] | "- #\(.number) \(.title) [\([.labels[].name] | join(", "))] (milestone: \(.milestone.title // "none"))"' \
    || echo "(unavailable)"
  echo
  echo "## Other open issues"
  gh issue list -R "$R" --state open --limit 100 --json number,title,labels \
    --jq '.[] | select([.labels[].name] | index("requirement") | not) | "- #\(.number) \(.title)"' \
    || echo "(unavailable)"
  echo
  echo "## Milestones"
  gh api "repos/$R/milestones" --jq '.[] | "- \(.title): \(.open_issues) open"' || echo "(unavailable)"
  echo
  echo "## Project board stages (obot Roadmap, user project 1)"
  gh project item-list 1 --owner jwildfire --format json --limit 200 2>/dev/null \
    | python3 -c '
import json, sys
d = json.load(sys.stdin)
for it in d.get("items", []):
    c = it.get("content") or {}
    num = c.get("number")
    if num:
        title = c.get("title") or it.get("title") or ""
        print("- #%s %s: %s" % (num, title, it.get("status") or "no stage"))
' 2>/dev/null \
    || echo "(board unavailable to this token — board adds defer to session wrapup)"
  echo
  echo "## Latest diary entry"
  latest=$(ls diary/2*.md 2>/dev/null | sort | tail -1)
  if [ -n "${latest:-}" ]; then
    echo "### $latest"
    cat "$latest"
  else
    echo "(none found)"
  fi
  echo
  echo "## Goals (obot.agent/goals)"
  if ls obot-agent/goals/*.md >/dev/null 2>&1; then
    for f in obot-agent/goals/*.md; do
      echo "### $f"
      cat "$f"
      echo
    done
  else
    echo "(obot.agent checkout not present)"
  fi
  echo
  echo "## Conventions"
  echo "AGENTS.md in this checkout is binding for body formatting and attribution; .github/ideas-triage-policy.md is binding for disposition."
} > "$OUT"

# Cap the pack so the prompt stays bounded.
head -c 60000 "$OUT" > "$OUT.tmp" && mv "$OUT.tmp" "$OUT"
echo "context pack: $(wc -c < "$OUT") bytes, $(wc -l < "$OUT") lines"
