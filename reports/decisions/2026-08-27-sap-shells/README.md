# D0030 — The SAP, and what a display looks like with no numbers in it

**Status: Awaiting his answers** — D-SAP1–D-SAP5 (D0030.1–.5).

Most of the statistical analysis plan is already in open.csr, dispersed: seventeen of the twenty-six displays cite the CDISCPILOT01 plan by section, at real precision, spanning its sections 8 through 14. What is missing is the document that assembles them, so a reader who wants to know what this study planned opens twenty-six display specifications and reads their footnotes. The claim worth making is that the plan and the report are the same objects in different states — one says what will be produced, the other reports what was — and that assembled from one library they cannot disagree about the first.

The load-bearing question was whether a display can render as a **shell**, its own rows and columns with no numbers in them, from its specification alone. It can, and the page shows the shells rather than arguing for them.

**Requirement:** [open.csr#57](https://github.com/jwildfire/open.csr/issues/57) · **Milestone:** v0.4.0 · **Goal:** [#112](https://github.com/jwildfire/obot.roadmap/issues/112) · **Follows:** [open.csr v0.3.0](https://github.com/jwildfire/open.csr/releases/tag/v0.3.0) · **Adjacent:** [#130](https://github.com/jwildfire/obot.roadmap/issues/130), [#129](https://github.com/jwildfire/obot.roadmap/issues/129)

## The five questions, one line each

- **D-SAP1 — state or artifact.** A shell as a state of a display, versus a separate shell file that can be reviewed and can also be wrong. Recommendation: a state, because the build showed the second object would carry no information the first does not already hold.
- **D-SAP2 — columns without data.** A declared treatment vocabulary plus the spec's own keys, versus the study model, versus leaving columns out. Recommendation: the vocabulary, sourced from the study model; it is one branch in one function.
- **D-SAP3 — what it carries.** Every display in the library, versus only what its assembly names. Recommendation: only what its assembly names, plus the check that then falls out for free — a display planned and not produced, or produced and not planned, becomes a build failure rather than a silence.
- **D-SAP4 — the words.** Share the report's text library with a tense variant per block, versus a separate SAP library sharing only the tenseless blocks. Recommendation: separate, because twenty-four of thirty-three blocks are past-tense only.
- **D-SAP5 — the reference.** Reproduce the pilot's own SAP the way the 2006 report is reproduced, or not. Recommendation: not — no SAP is vendored, its redistributability is unestablished, and the section citations already carry the useful part.

## Measured for this page, not relayed

A shell builder reading only `analysis.yaml` and `display.yaml` — no ARD, no `outputs/` directory — was run against all twenty-six displays on `dev` at `b9ecbfa`.

- **Three shapes, all shelling cleanly.** Twenty-one displays name every row in their spec; four declare a hierarchy over data levels, so their shells read "one row per system organ class, then per preferred term", which is what a real SAP shell says anyway; one is a listing that declares its columns outright and has no rows block at all.
- **`total:` predicts the Total column on 26 of 26 displays.** No exceptions. That, plus the treatment vocabulary, is the whole of a shell's column set.
- **One set of levels, three variables.** All twenty-five grouped displays yield exactly Placebo, Xanomeline Low Dose, Xanomeline High Dose — while `group:` names `TRT01A` on ten, `TRTP` on nine and `TRT01P` on six. So `group:` alone cannot supply a shell's columns; a declared vocabulary can, and already exists as `trt_levels()`.
- **The text library is written in the past tense.** Of thirty-three blocks, twenty-four are past-tense only, nine are tense-neutral, and none uses *will* or *shall*.
- **The four existing templates carry 26, 26, 22 and 6 displays**, so there is no house answer to D-SAP3 to inherit.
- **No SAP is vendored.** The eleven files under `pipeline/inst/extdata/phuse-cdiscpilot01/` are transport datasets and a provenance record.

Nothing was filed, built or changed in open.csr for this page. The shell builder was a throwaway script in a scratch worktree and is not committed.
