# safety.viz v1.8.0 — annotated demo

Walkthrough of what v1.8.0 adds, built as the review surface for the v1.8.0 release-candidate PR (dev → main). Captures taken 2026-10-02 with Playwright against the live dev deploy of safety.viz at commit `1c62598`, the build the release candidate promotes. The sections cover:

- the demo app and loading your own study (hub [#352](https://github.com/jwildfire/obot.roadmap/issues/352), on the standard domain set of hub [#325](https://github.com/jwildfire/obot.roadmap/issues/325); safety.viz [#155](https://github.com/jwildfire/safety.viz/pull/155));
- the Patient Journey Explorer and its narratives (hub [#349](https://github.com/jwildfire/obot.roadmap/issues/349), [#351](https://github.com/jwildfire/obot.roadmap/issues/351));
- the nine legacy-tracker requests (safety.viz [#136](https://github.com/jwildfire/safety.viz/issues/136)).

The "load your own study" captures use the renamed-column study committed in safety.viz under `tests/e2e/fixtures/app/`, loaded through the page's own file input, with six mapping rows set by hand. The single-file capture is the file served at `dev/demo/safety.viz-app.html`, saved and opened from disk with the network off.

Media: 1.5× JPEG stills under `media/`.
