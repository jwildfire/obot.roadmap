# CSR template objects — what the report framework still has to be taught

- **Published:** 2026-08-26
- **Page:** [`index.html`](index.html)
- **Companion to:** [open.csr #28](https://github.com/jwildfire/open.csr/issues/28) and [PR #29](https://github.com/jwildfire/open.csr/pull/29)

## What this is

A design report answering @jwildfire's ask for additional template objects in open.csr for the test study, referencing the R Consortium submission projects. It does three things: records what shipped (a second real template object, the ICH E3 Annex I synopsis), lists the twelve document types a CSR framework plausibly needs with what each would take, and states the licence position on the consortium work — which is what decides whether any of it can be drawn on.

## Sources

- The `RConsortium` organisation's twenty-six `submission*` repositories, enumerated and read through the GitHub API on 2026-08-26. Licences taken from the API's `license.spdx_id` field, not inferred from README text.
- `pharmaverse/pharmaverseadam` (Apache-2.0), the source of the test study's analysis datasets.
- ICH E3 (1995), Step 4 — Section 2 and Annex I, for the synopsis document model.
- The CDISC pilot statistical analysis plan carried as `cdiscpilot01.pdf` in `submissions-pilot6-adams-tlfs`, read to establish the display inventory for the test study. Cited as a fact about the study; nothing copied.
- The open.csr repository at branch `csrtemplates`; display numbers verified against the assembled `docs/assembled/csr.json` rather than asserted.

## Assumptions and limits

- A public GitHub repository with no licence file is treated as all rights reserved. That is GitHub's own default and the conservative reading.
- GPL-3.0 is treated as one-way incompatible with an Apache-2.0 project in the direction reuse would need. Apache-2.0 code may be taken into a GPL-3.0 work; the reverse requires relicensing.
- Three things are stated as unestablished rather than guessed: the PHUSE ADRG template's terms, the CDISC pilot material's terms, and whether the missing consortium licences are deliberate.

## Provenance

Read-only research outside the jwildfire organisation. No issue, comment, pull request or fork was created in any RConsortium, CDISC, PHUSE or pharmaverse repository.

---

Drafted by Claude Code (Opus 5) as worker W0131.
