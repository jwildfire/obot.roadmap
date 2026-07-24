# session-state branch

Orphan branch carrying a single file, `session.json`: the current obot session's
state, published by `obot.agent/scripts/obot-session-state` on the session
heartbeat and read client-side by the roadmap page's session indicator
(requirement [#57](https://github.com/jwildfire/obot.roadmap/issues/57), D5).

It lives here rather than under `site/` because every path the site deploy
watches triggers a full Pages rebuild — a heartbeat-rate commit there would
rebuild the world every minute and bury main's history. Nothing on this branch
is deployed; the page fetches the raw file.

This branch is not part of the site source. Do not merge it into `main`.
