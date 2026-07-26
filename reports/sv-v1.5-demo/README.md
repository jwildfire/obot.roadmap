# safety.viz v1.5.0 — annotated demo

Feature-by-feature walkthrough of what v1.5.0 adds, built to support @jwildfire's release review (guide [#114](https://github.com/jwildfire/obot.roadmap/issues/114), item R1). Visual companion to [reports/sv-v1.5-release-plan](../sv-v1.5-release-plan/), which covers the review order and the mechanics of the release itself.

**Live:** https://jwildfire.github.io/obot.roadmap/reports/sv-v1.5-demo/

## What it covers

Four groups, in the order the release plan lists them:

| Section | PRs | Media |
|---|---|---|
| Participant profile drill-down + lab-family dock | [sv#105](https://github.com/jwildfire/safety.viz/pull/105) ([hub#45](https://github.com/jwildfire/obot.roadmap/issues/45)) | 1 clip, 2 annotated stills |
| Migration Sankey + ALT waterfall | [sv#97](https://github.com/jwildfire/safety.viz/pull/97) ([hub#43](https://github.com/jwildfire/obot.roadmap/issues/43)) | 1 clip, 2 annotated stills |
| eDISH follow-ups | [sv#110](https://github.com/jwildfire/safety.viz/pull/110) ([hub#88](https://github.com/jwildfire/obot.roadmap/issues/88)) | 2 clips, 3 stills |
| Axis-limit inputs pre-filled | [sv#108](https://github.com/jwildfire/safety.viz/pull/108) ([sv#85](https://github.com/jwildfire/safety.viz/issues/85)) | 2 stills |

Each section carries a one-line what's-new, a "why it matters" note, an annotated capture, and numbered steps into the live demo.

## Sources

- Feature list and framing: [reports/sv-v1.5-release-plan](../sv-v1.5-release-plan/) and the draft release notes in the body of [safety.viz#114](https://github.com/jwildfire/safety.viz/pull/114).
- Every capture: the live dev site, https://jwildfire.github.io/safety.viz/dev/ — the build this release promotes. Nothing was staged, mocked or re-rendered locally.

## How the media was made

Playwright (Chromium, viewport 1340–1460 px wide) drove the real demo pages on 2026-07-25.

- **Clips** (`*.webm`): JPEG frames captured one at a time during the interaction, encoded to VP8 at 7–8 fps with Playwright's bundled ffmpeg. 4–5 s each, silent, `preload="none"` with a poster so nothing downloads until it scrolls into view. Interaction targets (cut-line pixel positions, scatter points, Sankey ribbons, waterfall bars, flank-panel boxes) were read off the live Chart.js metas and the ribbons' `data-*` attributes rather than guessed from screen fractions.
- **Stills** (`*.jpg`): 2× device-scale JPEG at quality 92, clipped to the element under discussion.
- Callouts are CSS-positioned pins over the image, keyed to a numbered list underneath — the image files themselves are unmodified captures.

The capture scripts lived in the session's job tmp dir; the safety.viz checkout was not modified.

## Known caveat: sv#112

[sv#112](https://github.com/jwildfire/safety.viz/pull/112) (profile v2 — right-hand rail, expand state, adverse-event domain) was folded into v1.5.0 on the evening of 2026-07-25, after these captures were taken, and its D4 removes the dock. It is still merging to `dev`, so the dock stills on this page show what the dev site carries today, not the final v1.5.0 surface. The page says so in the first section, in the masthead lede and in the provenance block. If sv#112 lands and the dock disappears from the dev site, the two profile stills (`profile-dock.jpg`, and the standalone mount in `profile-drill.webm`) are the ones to re-take.

## Assumptions and limits

- Counts and test totals (981 unit / 219 browser, 5 merged PRs) are quoted from the release plan and the promotion PR body, not re-run here.
- The demo data is the shared `adbds` cohort: 318 participants for the eDISH views, 58 for the abnormal-baseline waterfall. Numbers visible in the captures are demo numbers.
- Clips are WebM/VP8, which Chrome and Firefox play natively; Safari support depends on version. Posters and captions carry the meaning if a clip does not play.
- Verified while capturing, and stated on the page: the axis-limit boxes seed blank until a render resolves a single measure's domain, so the histogram's X-axis Limits fill once a measure is picked and stay empty on "All Measures".

---

Captured and written by Claude Code using Opus 5 — reviewed by @jwildfire
