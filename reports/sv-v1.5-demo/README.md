# safety.viz v1.5.0 — annotated demo

Feature-by-feature walkthrough of what v1.5.0 adds, built to support @jwildfire's release review (guide [#114](https://github.com/jwildfire/obot.roadmap/issues/114), item R1). Visual companion to [reports/sv-v1.5-release-plan](../sv-v1.5-release-plan/), which covers the review order and the mechanics of the release itself.

**Live:** https://jwildfire.github.io/obot.roadmap/reports/sv-v1.5-demo/

## What it covers

Four groups, in the order the release plan lists them:

| Section | PRs | Media |
|---|---|---|
| Participant profile drill-down, the rail, and the adverse-event domain | [sv#105](https://github.com/jwildfire/safety.viz/pull/105) ([hub#45](https://github.com/jwildfire/obot.roadmap/issues/45)), [sv#112](https://github.com/jwildfire/safety.viz/pull/112) ([hub#75](https://github.com/jwildfire/obot.roadmap/issues/75)) | 1 clip, 3 annotated stills |
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

## Resolved: sv#112 (profile v2)

[sv#112](https://github.com/jwildfire/safety.viz/pull/112) (profile v2 — right-hand rail, expand state, adverse-event domain) was folded into v1.5.0 on the evening of 2026-07-25, after the first pass of captures, and its D4 removes the dock. It merged to `dev` at 03:00 UTC on 2026-07-26, so the profile media was re-taken against the deployed rail:

- **`profile-rail.jpg`** (new) — the rail open beside the eDISH scatter on hep-explorer, showing the chart re-laid out narrower and the rail head's Expand / close controls. Replaces `profile-dock.jpg` on the page. The dock capture is left in `media/` rather than deleted; nothing references it.
- **`profile-drill.webm`** + poster — re-taken. Same interaction, same participant (CLD-9045), against the post-#112 build.
- **`profile-ae-tracks.jpg`** (new) — the adverse-event block under the labs chart on the participant-profile demo, added because the AE domain is v2's headline and no capture existed for it.

The masthead lede, the profile section's framing, the section's Try-it steps and the provenance block were updated to match; the test counts moved to the post-#112 figures from the dev CI run at `b40f552` (1 052 unit / 219 browser).

**Fixture gap worth knowing:** `adae.csv` covers 254 of the demo cohort's 318 participants, but none of the 24 crafted `CLD-*` Hy's-Law cases. Clicking anywhere in the Possible Hy's Law quadrant therefore shows an empty AE block ("No adverse events recorded for this participant"). `profile-ae-tracks.jpg` uses 01-705-1186, the worst eDISH position that does carry AE records. The page states the gap in the provenance block and in the Try-it note.

## Assumptions and limits

- Test totals (1 052 unit / 219 browser) are read from the CI run on `dev` at `b40f552` — the commit v1.5.0 is cut from — not re-run locally. PR counts are quoted from the release plan.
- The demo data is the shared `adbds` cohort: 318 participants for the eDISH views, 58 for the abnormal-baseline waterfall. Numbers visible in the captures are demo numbers.
- Clips are WebM/VP8, which Chrome and Firefox play natively; Safari support depends on version. Posters and captions carry the meaning if a clip does not play.
- Verified while capturing, and stated on the page: the axis-limit boxes seed blank until a render resolves a single measure's domain, so the histogram's X-axis Limits fill once a measure is picked and stay empty on "All Measures".

---

Captured and written by Claude Code using Opus 5 — reviewed by @jwildfire
