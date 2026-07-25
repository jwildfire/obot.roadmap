# roadmap-audit apply policy v1

Binding policy for the judgment path of the roadmap audit (requirement #92). `roadmap-audit-apply.yml` loads this file at run time, so editing it changes how accepted findings are applied without touching the workflow.

## What you are doing

@jwildfire clicked **accept** on one or more audit findings whose fix is a judgment call rather than a fixed operation. Mechanical findings were already applied deterministically before you started — you are not repeating that work. `/tmp/audit-agentic.md` lists exactly the findings you own, each with its rule, evidence, goal, and instructions. That list is your entire scope.

## Sequence

1. Read `/tmp/audit-agentic.md` in full before acting, so you can spot findings that interact (two findings on the same issue, or a re-parenting that also settles a stage).
2. Work the findings in the order listed. For each one: read the subject issue or PR (and its sub-issues, linked PRs, and parent goal when they matter), decide, act, then move on.
3. Prefer the smallest change that satisfies the finding's goal. The audit's job is accuracy, not tidiness — do not reorganize adjacent work you were not asked about.
4. Write a report to `/tmp/agent-summary.md`: one line per finding, stating what you changed and why, or why you deliberately changed nothing. The workflow posts it on the decision issue.

Delegate freely. Research (reading a requirement's history, finding which goal a requirement serves, digesting a PR diff) goes to subagents on `claude-sonnet-5` via the Task/Agent tool. Keep the decisions for yourself. If the Task tool is unavailable, proceed solo and say so in the report.

## Hard guards

- **Scope**: act only on the findings in `/tmp/audit-agentic.md`. If you notice a real problem outside that list, add a line about it to the report — do not fix it.
- **Never merge anything**, and never push to `main`, `dev`, or any protected branch. Merges are @jwildfire's, always, through `obot-merge`.
- **Never delete** an issue, discussion, release, file, or piece of history. Closing an issue or removing a board item is allowed when the finding's instructions say so — deleting is not.
- **Do not start implementing product work.** A finding may ask you to move a stage, link a parent, write a Design section, or file a follow-up requirement. It never asks you to build the thing.
- **One comment per subject at most.** The decision issue carries the narrative; do not annotate the same issue twice.
- **If a finding turns out to be wrong**, do nothing to the subject, and say so plainly in the report — the detection is heuristic for exactly these rules, and a false positive is information about the rule. Name the rule so it can be tuned.
- **Stop at genuine ambiguity.** If a finding needs a decision only @jwildfire can make (a convention with no documented answer, a scope call with real consequences), leave the state alone, describe the options in the report, and move on. A finding left undone with a reason is a good outcome; a guess dressed up as a fix is not.

## House conventions that apply to everything you post

- No hard wraps in any GitHub body: one line per paragraph or bullet. Single newlines render as literal line breaks.
- Attribution goes at the **bottom** of anything you draft, after a `---` rule: `This {comment/Issue} was drafted by Claude Code using Opus 5 and reviewed by @jwildfire`.
- Requirement issues keep exactly the five template sections, in order: `### Business Requirement`, `### Overview`, `### Data Requirement`, `### Design`, `### Tasks`. Never add, rename, or reorder them.
- Assignee `jwildfire` and milestone `backlog` on anything you file, plus the `requirement` label if it is a requirement. Add it to the obot Roadmap project (`gh project item-add 1 --owner jwildfire --url <url>`); if the token cannot see the project, say "board add deferred" in the report rather than failing.
- Sub-issue links are the canonical parent/child relationship: `gh api -X POST repos/jwildfire/obot.roadmap/issues/{parent}/sub_issues -F sub_issue_id={child_node_id}`.
- `gh pr edit` is broken in this environment — edit PR bodies through the REST API.

## Ledger

You do not write `site/audit/decisions.json` — the workflow does, and it records your findings as `delegated` before you run and patches the outcome after. Do not edit files under `site/audit/`.
