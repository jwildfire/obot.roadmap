# The app — design record (2026-07-28)

The 2026-07-28 design pass on [goal #79](https://github.com/jwildfire/obot.roadmap/issues/79)
(build the app — the safetyGraphics replacement on the open.gismo arc), in two halves:
the shell/navigation directions for the app itself, and the data + configuration
framework underneath it. @jwildfire approved the direction in session and directed an
immediate build; publishing this record is stage 1 of the resulting requirement,
[#134](https://github.com/jwildfire/obot.roadmap/issues/134) (demo-301 v0), so that
requirement cites public artifacts rather than private ones.

## Contents

- [`index.html`](index.html) — landing page: context, the two documents, what is real
  versus mocked, where it goes next.
- [`directions.html`](directions.html) — Part 1, the UI: three shell directions
  (A *Monitor*, B *Gallery*, C *Study site*), the recommendation (C's frame, B's
  gallery, A's tiles), the two worked surfaces — chart-viewing workflow and
  snapshots / demo study — the provenance chip, and the **D-APP0–D-APP7** decision
  ledger.
- [`framework.html`](framework.html) — Part 2, data & config: four layers and one
  direction of flow, why workr is the substrate, a Domain as a config entry rather
  than code, the proposed fork-target study-repo layout, a real / aspirational /
  inconsistent inventory, and the **D-FW1–D-FW8** decision ledger.

## What is real and what is mocked

- **All screens in both documents are static mockups.** No safety.viz renderer is
  mounted, no workr pipeline runs behind these pages, and nothing on them is
  interactive beyond the page itself. Vendoring the live safety.viz bundle into the
  chosen frame is a separate, later step (the participant-profile-v2 mockup
  precedent).
- **All study content is synthetic.** The **DEMO-301** study, its sites, participants,
  metric values, flags, snapshot ids, timestamps and package pins are fabricated for
  design purposes. No real study data appears anywhere in this record. (The
  `jwildfire/demo-301` repo created the same day will be filled with synthetic data
  from `gsm.core` example source / `gsm.datasim` — see #134.)
- **The framework half is grounded in source, not prose.** Its inventory of what
  exists today was read from the repositories listed below; items that were
  reconstructed rather than read — the gsm.library branch model and the upstream
  demo-study repo — are flagged as such inside the document.
- **The decisions are open.** Sixteen items (D-APP0–7, D-FW1–8) carry draft positions,
  not settled answers. The demo decisions @jwildfire recorded on 2026-07-28 (home =
  forkable study repo · engine = merge v0.2 forward · front-end = evolve `site/` ·
  scope = all four surfaces) are captured on
  [#134](https://github.com/jwildfire/obot.roadmap/issues/134), not here.

## Sources

Read from source during the design pass:

- [safety.viz](https://github.com/jwildfire/safety.viz) v1.5.0 — shell, docs site, and
  the shipped renderer set.
- [open.gismo](https://github.com/jwildfire/open.gismo) — `dev` plus the
  `feat/local-first-prototype` branch (the v0.2 `og_*` / `fs_*` local-first engine),
  `site/` and its fetch layer, `todo.md`, and `.github/workflows`.
- [safetyGraphics](https://github.com/SafetyGraphics/safetyGraphics) v2.1.1 — the
  application being replaced.
- [gsm.kri](https://github.com/Gilead-BioStats/gsm.kri) — report layout and the
  gsm.viz widget bindings; `inst/workflow` alongside gsm.safety's.
- [workr](https://github.com/Gilead-BioStats/workr) v1.0.0 (local clone at
  `~/Documents/github/workr`) — Steps / Meta / Spec and the workflow runner.

Decision context: [#34](https://github.com/jwildfire/obot.roadmap/issues/34) (GitHub's
role in open.gismo v1.0 — D1/D2/D6) and
[#131](https://github.com/jwildfire/obot.roadmap/issues/131), both linked inline in the
documents.

## Provenance and edits on publication

- Compiled 2026-07-28 by the 😺🤖 session; both documents were authored as Claude
  artifacts during the design pass and reviewed live by @jwildfire, then promoted here
  unchanged in content.
- Two edits were made on publication, and only these two: each document's
  cross-reference to the other was a private `claude.ai/code/artifact/…` URL and now
  points at its sibling file (`directions.html` ↔ `framework.html`), and each fragment
  was wrapped in a standalone `<!doctype html>` / `<head>` skeleton (charset +
  viewport) so it renders as a page on the site. All `github.com` links are as
  authored. The interactive originals remain reachable from the artifact URLs recorded
  on #134.
- LLM disclaimer: these documents are AI-generated design work. Every screen is an
  illustration of a proposal, not a record of software that exists.

---

Drafted by Claude Code using Opus 5 and reviewed by @jwildfire.
