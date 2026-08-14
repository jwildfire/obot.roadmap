# Decision — the obot-merge classifier denials

**Date:** 2026-08-14 · **Goal:** [#73 autonomy](https://github.com/jwildfire/obot.roadmap/issues/73) · **Status:** Decided — @jwildfire approved the recommendations, 2026-08-14

## Question

The lead session's merge calls were denied by the Claude Code auto-mode classifier, including the read-only `--check` dry run. Is that systemic — in which case the "increments merge unattended, @jwildfire reviews only RCs" model cannot work — and is there a settings-level fix?

## Answer

No, it is not systemic. The lead used the one invocation spelling (`scripts/obot-merge …`, repo-relative) that no permission rule in the workspace allowlist covers, so the call fell through to the classifier, whose verdict on unmatched commands is non-deterministic. All four probe forms — including the lead's exact failing command — were allowed in this session minutes later.

## Sources

- 39 session transcripts under `~/.claude/projects/-Users-jwildfire-Documents-obot2/`, parsed for every `obot-merge` tool call and its result (99 real invocations, 3 denials).
- `/Users/jwildfire/Documents/obot2/.claude/settings.json` (permission allowlist; last modified 2026-08-05) and `.claude/hooks/merge-gate-guard.sh`.
- `obot.agent/scripts/obot-merge`, `obot-policy`, `policy.json`.
- Four live probes run 2026-08-14, all `--check` dry runs — nothing was merged to obtain this evidence.

## Assumptions and limits

- The workspace `.claude/` directory is not under version control, so the allowlist has no history. The claim that the single 2026-07-22 allowlisted-form denial predates its rule is inference from the file's modification time, not proof.
- Classifier behaviour is observed, not documented; "non-deterministic" is the conclusion from one command string producing both verdicts, not a statement about its implementation.
- Denial counts come from transcripts that survive on disk. Sessions whose transcripts were pruned are not represented.

## Recommendation

Add `"Bash(scripts/obot-merge *)"` to `permissions.allow` (only @jwildfire can — carve-out), and in parallel make the already-allowlisted absolute path the documented convention. The second half ships with the v0.4.0 RC and needs no decision.

---
This artifact was drafted by Claude Code using Opus 5 and reviewed by @jwildfire
