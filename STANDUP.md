# The spoken standup

**This file is the address, not the standup.** The standup itself is regenerated every
five minutes and lives here, as plain text with no JavaScript and nothing to render:

<https://raw.githubusercontent.com/jwildfire/obot.roadmap/session-state/standup.md>

Fetch that URL — or read `standup.md` on this repository's `session-state` branch — and
read it aloud. It answers four questions in his terms: what is running, what is blocked,
what needs a decision from him and where to answer it, and which release candidates are
waiting on his review. It states its own age at the top, and it says in one sentence what
it deliberately leaves out.

## Why it is not on the site

Every path the Pages deploy watches rebuilds the whole site, so a file rewritten every
five minutes would rebuild the world all night and bury this repository's history. It is
published to the orphan `session-state` branch instead — the same lane the roadmap page's
session indicator already uses — where it is fetchable as `text/plain` and cached for
about as long as the cadence that writes it.

`roadmap.html` on the published site is not a substitute: it renders client-side and says
so in its own text, so anything that fetches it as text gets the shell rather than the
readout.

## Who writes it

`obot.agent/tools/voice/standup.mjs` composes it and `obot.agent/scripts/obot-standup`
publishes it, on the Navigator sweep's five-minute cadence. Every line is derived — from
`navigator-state.md`, this repository's decision registry, the local episode ledger and
the machine's job records. Nothing in it is hand-maintained, and an edit made to the
published copy is overwritten on the next pass.

## What never crosses

This repository is public. Config items — the jobs only @jwildfire's hands can do — are
local-only, and neither their text nor a count of them reaches the standup; the file says
plainly that it leaves them out rather than letting their absence read as an empty queue.
The publisher refuses to publish a file carrying a config id, a local path, a Spotify
episode uri or a `private:` marker.

## Sending something back

The inbound half of this pathway already exists and is not duplicated here: a note or a
question dictated in voice goes to this repository's
[Ideas discussions](https://github.com/jwildfire/obot.roadmap/discussions/categories/ideas),
where the existing triage picks it up within a minute or two of it landing. The Ideas
board is public, so anything sent that way is public the moment it posts — the `private:`
lane only exists on the machine.
