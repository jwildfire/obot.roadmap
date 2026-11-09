# safety.viz: what the overview's count axis should say

Five options for the count axis of the Safety Histogram's all-measures overview. They replace "Number of results" turned on its side beside every panel, the version in the v1.11.3 release candidate ([safety.viz #358](https://github.com/jwildfire/safety.viz/pull/358)), which @jwildfire did not like on 2026-11-08. The options:

- A, today
- B, a "#" at the top of the axis
- C, the count on hover only
- D, one line above the grid
- E, B and C together, which is recommended

Decided on 2026-11-08: @jwildfire chose "One line + Hover. No #." and, for the grouped panels, "Yes, same" (D's line with C's hover). The page records it at the top; it is built in safety.viz #359.

Each is drawn on the live dev overview at 1280px and 390px, with numbered markers. The page leaves him two calls: which option, and whether the grouped panels follow. Requirement: the Safety Histogram's quick wins ([#430](https://github.com/jwildfire/obot.roadmap/issues/430)).

## The parts

| File | What it is |
|---|---|
| `capture.cjs` | Opens the dev overview in headless Chromium, changes the running charts in the page to show each option, and takes the stills. Marker positions go to `capture.json`. Nothing in it is built into safety.viz. |
| `capture.json` | Where each numbered marker sits on its still, and the bar the hover shows. |
| `build.cjs` | Writes `index.html` from `capture.json`, `page.css` and the option text. It stops if a still or a marker is missing. |
| `page.css` | The page's styles, put inline by `build.cjs`. |
| `index.html` | The page. Self-contained, with no script: the option switch is pure CSS. |
| `media/` | The stills: `{a…e}-desk.jpg` and `{a…e}-phone.jpg`. |

Run `capture.cjs`, then `build.cjs`, with a safety.viz checkout's Playwright available.
