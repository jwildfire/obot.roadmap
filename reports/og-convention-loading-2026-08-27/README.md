# Convention over configuration — loading a study into open.gismo (2026-08-27)

One of four competing design directions for how a user gets their own study data into
open.gismo. This one builds **no interface at all**: the mapping is a study document —
text, in the study's own git history, reviewed as a diff — and the entire user surface is
a generator that writes that document and a diagnostic whose every finding names the one
line to change and what it costs not to.

Requested by @jwildfire (2026-08-26): *"Maybe a ultradesign session for open.gismo?
re-visit the research comparing other sites and do some mockups on how users will load
their own data?"*

## Pages

| Page | What it holds |
|---|---|
| [`index.html`](index.html) | The design — four files, two commands, what is automatic vs asked, the friction moment, costs, the five weaknesses, six decisions |
| [`walkthrough.html`](walkthrough.html) | Eleven clickable terminal frames walking a CRO delivery all the way in, including the wrong turn that is available today |
| [`evidence.html`](evidence.html) | The measurements: the contract, the matcher run, the metric pricing, the safetyCharts asset, and which platforms leave the study with a file |

## The design in one paragraph

Four files a user may touch — `input/`, `config/data-config.yaml`, the project's own
`workflows/1_mappings/*.yaml`, and a new `config/vocab/*.csv` — and two commands.
`og scan` reads headers and samples, routes files to domains by content, and *writes*
candidate `source_col:` lines, vocabulary tables and join steps into the study's own
files, marked as guesses and never overwriting a human edit. `og doctor` replaces
`og_validate()`: every finding names the file, the line, the literal text that fixes it,
and the metrics and charts it costs, ordered by cost. `og_run()` refuses while a blocking
finding is open.

## The finding this is built around

Against a conformant ADaM delivery, the matcher's **single most confident hit is wrong**.
`Raw_SUBJ.subjid` matches `SUBJID` on an exact case-insensitive comparison, while `adae`
and `adlb` carry only `USUBJID`. Both columns are present and correctly typed, today's
`og_validate()` returns all-green, `og_run()` completes without an error — and the two
inner joins produce zero rows, so 8 of 29 metric workflows report zero at every site while
`srs0001` (which declares no spec) silently reweights across the 21 that ran. **A bad
mapping does not crash; it flatters.** The cheapest item on the build list — a key-overlap
check before the mapping phase, roughly sixty lines — is the one that catches it.

## Headline numbers

| | |
|---|---:|
| Raw domains a full study must satisfy | 14 |
| Distinct required columns across them | 126 |
| Of those, named by any metric workflow | 34 |
| Settled by the matcher with no human input | 73 |
| Metric-relevant columns left open | 12 |
| Alias rows lifted free from `safetyCharts` | 52 |
| Metrics that silently go to zero on the measured failure | 8 |
| Lines of text the user writes, end to end, in the walkthrough | 17 |

Measured 2026-08-27 against `demo-301/workflows/` with `workr 1.0.0 / gsm.core 1.2.0 /
gsm.mapping 1.1.3 / gsm.kri 1.5.0 / gsm.reporting 1.1.5` and `open.gismo` `dev` v0.2.0.
`og_init()`'s smaller default set is 12 domains and 90 columns; both numbers are correct
and describe different studies.

## Where it is weakest

1. **It concedes the person who usually owns the mapping.** Across the commercial
   platforms surveyed, mapping is done by a services team or a data manager, not by the
   person reading the charts. This direction is better for a statistician in a terminal and
   no better at all for anyone else.
2. **A right guess and a wrong guess look identical in a text file.** The measured error
   arrived through the *highest*-confidence tier, so an honest confidence annotation would
   have marked it green.
3. **No look-at-my-data moment** — no distinct-value browser, no cross-tab.
4. **Edit volume is only tolerable if the cost ranking is right.** 53 columns unsettled,
   12 that matter; the whole case rests on that ratio.
5. **The proof loop is slow** — the diagnostic is instant, but the chart costs a full run.

## Decisions awaiting @jwildfire

C1 who the user is (the question this direction cannot answer for itself) · C2 whether the
generator writes into the study's files or its own · C3 whether `og_run()` refuses while
red · C4 which formats the door accepts · C5 whether the value-level seam lives in
open.gismo or upstream in gsm.mapping · C6 whether the alias table gets an owner and a
regression test.

## Design notes

- Base tokens are the obot report family's, so this sits with its siblings and inherits
  the light/dark contract. The departure is deliberate and is the argument: terminal frames
  and diffs render in a single fixed dark palette in both modes, because a terminal looks
  like a terminal, and the page leans on the mono stack wherever it is showing the product.
- Status marks always carry a glyph **and** a written word; diff lines keep their `+`/`-`.
  No colour-only state anywhere.
- Self-contained: no CDNs, no network calls, no build step. One stylesheet, one inline
  stepper script, no data files.
- Every wide block scrolls inside its own container; verified to hold at a 390px viewport.

## Boundaries respected

Nothing was filed, edited, merged or moved. No code changed in `open.gismo` or any other
repository. Competitor research was read-only and from public sources only — product
documentation, package reference indexes and user guides; "documented" never means
verified. Measurement scripts wrote only to `/tmp`.

## Known limitations

- **The delivery and the alias table share an author.** Both were written from the CDISC
  variable lists, so a shared assumption inflates the 73. The shape is the trustworthy
  part, not the value; running this against a real non-synthetic delivery is the first
  thing that should happen if the direction is picked.
- **The terminal frames are a mockup, not a recording.** No such command exists. Every
  number inside them is measured; the prose around them is designed.
- **This is one of four directions and it disagrees with at least one of the others on
  purpose.** A parallel session published
  [`open-gismo-data-loading-2026-08-27`](../open-gismo-data-loading-2026-08-27/) taking the
  screen-based direction and carrying the full thirteen-platform landscape; a third sits at
  `og-data-loading-design-2026-08-27`. This page deliberately does not repeat their
  landscape work.

---

Drafted by Claude Code using Opus 5 for review by @jwildfire.
