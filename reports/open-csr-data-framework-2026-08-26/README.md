# open.csr — the data design framework

Self-contained walkthrough of how open.csr turns study data into a Clinical Study Report:
the four source directories a contributor edits, how a display becomes an ARD and then a
table, how a sentence binds a number instead of quoting one, and how the ICH E3 template
assembles all four. Written for a colleague who has never opened the repository.

- Page: [`index.html`](index.html)
- Repository: [jwildfire/open.csr](https://github.com/jwildfire/open.csr) (`dev` branch)
- Companion in-repo document: [`docs/design/framework.md`](https://github.com/jwildfire/open.csr/blob/main/docs/design/framework.md)

## How it was generated

Read directly from the `dev` branch working tree on 2026-08-26 — `library/tfl/`,
`library/values/values.yaml`, `library/text/`, `library/templates/ich-e3/`, `pipeline/R/`,
`scripts/assemble.mjs`, `scripts/site.mjs`, `docs/design/contracts.md`, plus the committed
artifacts under `outputs/` and `docs/assembled/csr.json`. No code was run; every count and
value on the page was extracted from a committed file.

## Sources for the numbers on the page

| Claim | Source |
|---|---|
| 6 displays, 15 text blocks (10 included), 15 values (13 bound / 2 derived) | `docs/assembled/csr.json`, `outputs/values/values.json` |
| 181 resolved bindings, 119 E3 sections, 18 populated | `docs/assembled/csr.json` |
| 236 ARD rows for `t-demographics`, the three quoted rows, 254 / 143 / 56.3% | `outputs/t-demographics/v002/ard.json` |
| 16 bindings in `TXT-E3-1102`, its resolved prose | `docs/assembled/csr.json` §11.2 |
| 11 built-in cell patterns | `pipeline/R/render.R` → `default_patterns()` |
| Variant keys honoured (`title`, `filter`, `footnotes`) | `pipeline/R/render.R` → `render_display()`, `build_gt()` |
| Content vocabulary counts (62 / 20 / 15 / 21 / 1) | `library/templates/ich-e3/sections.yaml` |
| Every `git_commit` empty | all 13 `outputs/*/v*/ard.json`, all `iterations.yaml`, `outputs/values/values.json` |
| Two template objects; 25 synopsis sections, 20 populated; 11 named values cited | `node scripts/assemble.mjs --all`, `docs/assembled/e3-synopsis.json` |
| `t-disposition` numbered 14.1.1 and 13.1 | `docs/assembled/csr.json` and `e3-synopsis.json` `displayIndex` |

## Correction, 2026-08-26 evening

The page first described a template library holding one template object. The ICH E3 Annex I
synopsis object landed in [open.csr#29](https://github.com/jwildfire/open.csr/pull/29)
45 seconds before the companion pull request merged, so two things were rewritten rather
than deleted:

- Part 5 now describes a template object as the unit and names both objects, with the two
  properties the second exists to demonstrate.
- Finding 2 changed from "the named-value store reaches no approved sentence" to "named
  values reach the synopsis, not the report", with the date it changed kept on the page.
- Finding 5 was added: a named-value citation leaves no entry in a block's `bindings` array.

Verified by running `node scripts/assemble.mjs --all` against `dev` at `d2b91fd`, not by
reading the diff.

## Assumptions and limits

- Reflects the `dev` branch on 2026-08-26. The demo library is expected to grow (more
  displays, a second template); the four-part structure is what the page documents, and
  it is not expected to change with that growth.
- The five findings in the closing section are documentation and usage observations, not
  defects in the framework. No code behaviour was changed to produce them, and none of
  them was fixed by this page except finding 3, which the accompanying pull request
  addresses in the repository README and on the project site.
- Demo data is `{pharmaverseadam}` CDISCPILOT01 — public, regenerable, no proprietary
  data anywhere in the repository or on this page.

## LLM disclaimer

Drafted by Claude Code (Opus 5) in background session `👯🤖 W0130 csrframework`. Claims are
sourced to committed files as listed above; a reader should still verify anything they
intend to rely on against the repository.

---

Drafted by Claude Code using Opus 5 (worker `W0130`).
