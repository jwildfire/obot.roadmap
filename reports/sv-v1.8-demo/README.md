# safety.viz v1.8.0 — annotated demo

Walkthrough of what v1.8.0 adds, built as the review surface for the v1.8.0 release-candidate PR (dev → main, safety.viz [#158](https://github.com/jwildfire/safety.viz/pull/158)). Captures taken 2026-10-02 with Playwright against the live dev deploy of safety.viz at commit `b94f48d`, the build the release candidate promotes: after the Data view gained its sidebar, Reset and demo studies (safety.viz [#160](https://github.com/jwildfire/safety.viz/pull/160)) and after the release review's fixes, which took the Patient Journey Explorer out of the demo app as a prototype (safety.viz [#171](https://github.com/jwildfire/safety.viz/pull/171)). The sections cover:

- the demo app and loading your own study (hub [#352](https://github.com/jwildfire/obot.roadmap/issues/352), on the standard domain set of hub [#325](https://github.com/jwildfire/obot.roadmap/issues/325); safety.viz [#155](https://github.com/jwildfire/safety.viz/pull/155), [#160](https://github.com/jwildfire/safety.viz/pull/160));
- the Patient Journey Explorer and its narratives, as a prototype whose two requirements stay open (hub [#349](https://github.com/jwildfire/obot.roadmap/issues/349), [#351](https://github.com/jwildfire/obot.roadmap/issues/351); review findings safety.viz [#167](https://github.com/jwildfire/safety.viz/issues/167), [#168](https://github.com/jwildfire/safety.viz/issues/168));
- the nine legacy-tracker requests (safety.viz [#136](https://github.com/jwildfire/safety.viz/issues/136)).

The "load your own study" captures use the renamed-column study committed in safety.viz under `tests/e2e/fixtures/app/`, loaded through the page's own file input after Reset clears the pilot demo study, with six mapping rows set by hand. The single-file capture is the file served at `dev/demo/safety.viz-app.html`, saved and opened from disk with the network off.

Media: 1.5× JPEG stills under `media/`.

Captures are reproducible: from a safety.viz checkout (for its Playwright install and the fixture study), run `node <path to>/capture.mjs https://jwildfire.github.io/safety.viz/dev/ <out dir>`. It writes three stills the page does not use (`app-header`, `domains`, `legacy-reset`).
