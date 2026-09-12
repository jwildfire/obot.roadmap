#!/usr/bin/env bash
# The GitHub-flows standard for every repository in the obot program
# (developer guidelines → Merging via rulesets; hub requirement #343).
#
#   scripts/github-flows.sh plan  [repo…]   show what apply would change, change nothing
#   scripts/github-flows.sh apply [repo…]   set repository settings and upsert the rulesets
#   scripts/github-flows.sh check [repo…]   one line per repository: matches / drift; exit 1 on drift
#
# Needs `gh` authenticated as an account with admin on the repositories (the
# rulesets API refuses anything less) and `jq`. Idempotent: rulesets are found by
# name and updated in place; settings are only written when they differ.
#
# What the standard is, per repository kind:
#   repository settings   auto-merge allowed, delete branch on merge
#   integration ruleset   pull request required (0 approvals), the CI check required
#                         where one is named below, no force push, no deletion
#   release ruleset       pull request required, 1 approving review, stale approvals
#                         dismissed on push, Copilot code review requested on every
#                         pull request and on every later push, no force push, no deletion
#   the hub               no-force-push and no-deletion on main only: prep sessions
#                         commit to main directly under the standing grant (2026-09-11)
#
# Copilot code review as a ruleset rule needs a Copilot plan that offers it; when the
# API rejects the rule the release ruleset is written without it and the line says so.
set -euo pipefail

# repo | integration branch | release branch | CI check name required on the integration branch ("" = none yet)
REPOS=(
  "safety.viz|dev|main|"
  "gsm.safety|dev|main|"
  "open.csr|dev|main|"
  "open.gismo|dev|main|"
  "demo-301|main|site|"
  "obot.agent|main|stable|"
  "obot.roadmap|main||"
)
OWNER=jwildfire
MODE=${1:-check}; shift || true
ONLY=("$@")

need() { command -v "$1" >/dev/null || { echo "needs $1" >&2; exit 2; }; }
need gh; need jq

wanted() { [ ${#ONLY[@]} -eq 0 ] || printf '%s\n' "${ONLY[@]}" | grep -qx "$1"; }

# ---------------------------------------------------------------- rule builders
pr_rule() { # $1 approvals
  jq -cn --argjson n "$1" '{type:"pull_request",parameters:{required_approving_review_count:$n,dismiss_stale_reviews_on_push:($n>0),require_code_owner_review:false,require_last_push_approval:false,required_review_thread_resolution:false,allowed_merge_methods:["merge","squash","rebase"]}}'
}
checks_rule() { # $1 check name
  jq -cn --arg c "$1" '{type:"required_status_checks",parameters:{strict_required_status_checks_policy:false,do_not_enforce_on_create:false,required_status_checks:[{context:$c}]}}'
}
copilot_rule() { jq -cn '{type:"copilot_code_review",parameters:{review_on_push:true,review_draft_pull_requests:false}}'; }
protect_rules() { jq -cn '[{type:"non_fast_forward"},{type:"deletion"}]'; }

ruleset_body() { # $1 name, $2 branch, $3 rules-json-array
  jq -cn --arg name "$1" --arg ref "refs/heads/$2" --argjson rules "$3" \
    '{name:$name,target:"branch",enforcement:"active",conditions:{ref_name:{include:[$ref],exclude:[]}},rules:$rules}'
}

integration_rules() { # $1 check
  local rules; rules=$(jq -cn --argjson pr "$(pr_rule 0)" --argjson p "$(protect_rules)" '[$pr]+$p')
  [ -n "$1" ] && rules=$(jq -c --argjson c "$(checks_rule "$1")" '. + [$c]' <<<"$rules")
  echo "$rules"
}
release_rules() { # $1 with_copilot (1/0)
  local rules; rules=$(jq -cn --argjson pr "$(pr_rule 1)" --argjson p "$(protect_rules)" '[$pr]+$p')
  [ "$1" = 1 ] && rules=$(jq -c --argjson c "$(copilot_rule)" '. + [$c]' <<<"$rules")
  echo "$rules"
}

# ---------------------------------------------------------------- github helpers
api() { gh api -H "Accept: application/vnd.github+json" "$@"; }
ruleset_id() { api "repos/$OWNER/$1/rulesets" --jq --arg n "$2" '.[] | select(.name==$n) | .id' 2>/dev/null | head -1; }
ruleset_get() { api "repos/$OWNER/$1/rulesets/$2" 2>/dev/null; }

# Normalise a live ruleset to the fields we set, so it can be compared with what we want.
normalise() { jq -c '{name,target,enforcement,conditions:{ref_name:{include:.conditions.ref_name.include,exclude:(.conditions.ref_name.exclude//[])}},rules:[.rules[]|{type,parameters:(.parameters//{})}|if .parameters=={} then {type} else . end]|sort_by(.type)}'; }
normalise_wanted() { jq -c '{name,target,enforcement,conditions,rules:[.rules[]|if (.parameters//{})=={} then {type} else . end]|sort_by(.type)}'; }

upsert_ruleset() { # $1 repo, $2 body → prints ok / ok-without-copilot / error
  local repo=$1 body=$2 name id out
  name=$(jq -r .name <<<"$body"); id=$(ruleset_id "$repo" "$name")
  if [ -n "$id" ]; then
    out=$(api -X PUT "repos/$OWNER/$repo/rulesets/$id" --input - <<<"$body" 2>&1) && { echo ok; return; }
  else
    out=$(api -X POST "repos/$OWNER/$repo/rulesets" --input - <<<"$body" 2>&1) && { echo ok; return; }
  fi
  if grep -qi copilot <<<"$out"; then
    body=$(jq -c '.rules |= map(select(.type!="copilot_code_review"))' <<<"$body")
    if [ -n "$id" ]; then api -X PUT "repos/$OWNER/$repo/rulesets/$id" --input - <<<"$body" >/dev/null && { echo ok-without-copilot; return; }
    else api -X POST "repos/$OWNER/$repo/rulesets" --input - <<<"$body" >/dev/null && { echo ok-without-copilot; return; }; fi
  fi
  echo "error: ${out//$'\n'/ }"
}

settings_drift() { # $1 repo → "" or a phrase
  local s; s=$(api "repos/$OWNER/$1" --jq '{a:.allow_auto_merge,d:.delete_branch_on_merge}')
  local out=""
  [ "$(jq -r .a <<<"$s")" = true ] || out+="auto-merge off; "
  [ "$(jq -r .d <<<"$s")" = true ] || out+="delete-branch-on-merge off; "
  echo "$out"
}
ruleset_drift() { # $1 repo, $2 wanted body → "" or a phrase
  local id live; id=$(ruleset_id "$1" "$(jq -r .name <<<"$2")")
  [ -z "$id" ] && { echo "missing ruleset '$(jq -r .name <<<"$2")'; "; return; }
  live=$(ruleset_get "$1" "$id" | normalise)
  if [ "$live" != "$(normalise_wanted <<<"$2")" ]; then
    # Tolerate the one difference a plan without Copilot forces.
    if [ "$live" = "$(jq -c '.rules |= map(select(.type!="copilot_code_review"))' <<<"$2" | normalise_wanted)" ]; then echo "ruleset '$(jq -r .name <<<"$2")' lacks Copilot review; "; else echo "ruleset '$(jq -r .name <<<"$2")' differs; "; fi
  fi
}

# ---------------------------------------------------------------- per repository
drift=0
for row in "${REPOS[@]}"; do
  IFS='|' read -r repo integ release check <<<"$row"
  wanted "$repo" || continue
  hub=0; [ "$repo" = obot.roadmap ] && hub=1

  if [ $hub = 1 ]; then
    bodies=("$(ruleset_body "main: no force push, no deletion" main "$(protect_rules)")")
  else
    bodies=("$(ruleset_body "integration: checks and auto-merge" "$integ" "$(integration_rules "$check")")"
            "$(ruleset_body "release: review required" "$release" "$(release_rules 1)")")
  fi

  case $MODE in
    plan)
      echo "== $repo"
      echo "settings: allow_auto_merge=true delete_branch_on_merge=true  (now: $(settings_drift "$repo" | sed 's/; $//;s/^$/as wanted/'))"
      for b in "${bodies[@]}"; do
        echo "ruleset '$(jq -r .name <<<"$b")' on $(jq -r '.conditions.ref_name.include[0]' <<<"$b"): $(jq -r '[.rules[].type]|join(", ")' <<<"$b")  (now: $(ruleset_drift "$repo" "$b" | sed 's/; $//;s/^$/as wanted/'))"
      done ;;
    apply)
      printf '%s: ' "$repo"
      api -X PATCH "repos/$OWNER/$repo" -F allow_auto_merge=true -F delete_branch_on_merge=true >/dev/null && printf 'settings ok; '
      for b in "${bodies[@]}"; do printf "ruleset '%s' %s; " "$(jq -r .name <<<"$b")" "$(upsert_ruleset "$repo" "$b")"; done
      echo ;;
    check)
      d="$(settings_drift "$repo")"; for b in "${bodies[@]}"; do d+="$(ruleset_drift "$repo" "$b")"; done
      if [ -z "$d" ]; then echo "$repo: matches"; else echo "$repo: drift — ${d%; }"; drift=1; fi ;;
    *) echo "usage: $0 plan|apply|check [repo…]" >&2; exit 2 ;;
  esac
done
[ "$MODE" = check ] && exit $drift || exit 0
