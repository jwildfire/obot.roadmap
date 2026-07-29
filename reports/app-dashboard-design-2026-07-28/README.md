# Overview & domain dashboards — design (2026-07-28)

The second design pass of 2026-07-28 on [goal #79](https://github.com/jwildfire/obot.roadmap/issues/79),
directed by @jwildfire after the first pass shipped: design the **top-level dashboard pages** —
Study Overview, RBQM and Safety — so each shows study-level trends for its domain, what changed
since the last snapshot, and an overall sense of how the study is going. His starting points were
"the riskiest sites per the SRS metric" and "QTL charts" for RBQM; the Safety overview was left
explicitly open ("not sure about a safety overview").

## Contents

- [`index.html`](index.html) — the design: three page mockups, three cross-cutting components,
  and the **Q1–Q8** question ledger.

## What is real and what is mocked

**Real** — every number in the mockups is computed from demo-301's published snapshots
`ps-001` and `ps-002`: 765 of 1000 participants across 148 of 150 sites; 2 red / 39 amber /
109 on-track sites with 617 cells below accrual threshold; 11 flag transitions between the two
snapshots; the SRS range 0–28.95 across 143 sites with 110 at exactly zero; 506 serious adverse
events, 807 grade 3+ laboratory results, 22 participants in the Hy's Law quadrant, 1 death; the
enrolment curve (87 days) and the lab-coverage-by-visit curve.

**Mocked** — the page layouts themselves are static HTML, not the running app. The
acceptable-ranges (QTL) panel is drawn but **not backed by a pipeline**: `gsm.qtl` was not
installed anywhere in the workspace and demo-301 ran zero QTL workflows at the time of writing.
The expected-rate column in the Safety mockup is illustrative — a real deployment sources
predicted rates from placebo databases, historical data or registries.

**DEMO-301 is a fabricated study.** No real participant data appears anywhere.

## Sources

Two research passes on 2026-07-28. A survey of roughly twenty commercial and open-source
clinical dashboards (gsm.kri read from source; Cyntegrity and Remarque from published screens;
Medidata, Veeva, Oracle and IQVIA from vendor self-description only — their sites returned 404
to automated fetch, and those claims are flagged as unverified in the underlying report), and
the primary regulatory texts read in full: ICH E6(R3) Step 4 final, ICH E8(R1), ICH E9,
TransCelerate's QTL and risk-reporting paper, FDA's RBM Q&A, DMC guidance (2006 and the 2024
draft), the DILI guidance, *Standard Safety Tables and Figures*, EMA's DMC guideline and eRMR
manual, and the ACRO/TransCelerate blinding deck. Visual-form guidance (sparklines, slopegraphs,
funnel plots, variance notation, graphical-perception results) came from a parallel lane.

Two corrections worth carrying forward: **"eDISH" appears nowhere in FDA's DILI guidance** — it
is community practice, not a regulatory artifact — and **safetyGraphics and safetyCharts were
archived on CRAN on 2026-03-25**.

## Where it went

@jwildfire answered the ledger the same evening: Safety ships as **Option A** (exposure and
census) plus the case-review queue, pending clinical input; the gsm.safety metric set was cut to
three ([#138](https://github.com/jwildfire/obot.roadmap/issues/138)); QTL work proceeds at full
scope; treatment arm is pooled by default with the split role-gated; and the action log that
would let users resolve findings is filed as
[#139](https://github.com/jwildfire/obot.roadmap/issues/139). Build continues under
[#134](https://github.com/jwildfire/obot.roadmap/issues/134).

Companion: [the app — design record](../app-design-2026-07-28/) (the first pass — shell
directions and the data/config framework). Live demo: <https://jwildfire.github.io/demo-301/>.

---

This report was drafted by Claude Code using Fable 5 and reviewed by @jwildfire
