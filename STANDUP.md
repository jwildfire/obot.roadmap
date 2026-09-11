# The spoken standup

This file is the address, not the standup. The standup itself is rendered nightly and
lives here, as plain text with no JavaScript and nothing to render:

<https://raw.githubusercontent.com/jwildfire/obot.roadmap/session-state/standup.md>

Fetch that URL — or read `standup.md` on this repository's `session-state` branch — and
read it aloud. It answers three questions in @jwildfire's terms: which objectives are
complete, in progress or blocked; what questions are waiting for him, one per blocked
issue; and which release candidates are waiting on his review.

## Who writes it

A scheduled Claude Code cloud routine on this repository
([obot.agent `routines/standup.md`](https://github.com/jwildfire/obot.agent/blob/main/routines/standup.md))
renders it every night from GitHub alone: the open objective issues, their sub-issue trees,
the latest nightly comment on each requirement rolled up per objective, every issue carrying the `blocked` label, and
the open release-candidate pull requests. Nothing in it is hand-maintained, nothing in
it comes from any machine's local state, and an edit made to the published copy is
overwritten on the next run. If a question is not on a blocked issue it is not in the
standup; that is the [issue contract](docs/issue-contract.md#what-the-standup-reads).

## Why it is not on the site

Every path the Pages deploy watches rebuilds the whole site, so the file is published to
the orphan `session-state` branch instead, where it is fetchable as `text/plain`.

## Sending something back

A note dictated in voice about an objective, a requirement or a blocked question is a comment
on that issue — the next session turn reads it there. There is no separate intake lane.
