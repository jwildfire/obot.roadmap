# open.csr roadmap research: the change request nobody tracks (2026-07-27)

Roadmap research for [goal #112](https://github.com/jwildfire/obot.roadmap/issues/112)
(open.csr), directed by @jwildfire: ① evaluate available products and summarize core
functionality; ② propose a framework for medical writers to request/propose/implement
TLF changes while reviewing a document, with every change producing a new display
version via the established ARD approach, an LLM/agent assessing and drafting, and
biostatistician review/sign-off.

## Contents

- [`index.html`](index.html) — overview: five findings, next steps.
- [`landscape.html`](landscape.html) — Part 1: 18 products/platforms deep-dived on the
  change-request seam; the as-is TLF revision loop reconstructed in 11 sourced steps;
  standards/substrate update.
- [`framework.html`](framework.html) — Part 2: the display change-request framework —
  five pillars, derived lifecycle, five delivery increments, five open questions
  (D-CR1–D-CR5) for @jwildfire's review.

## Provenance

- Produced by autonomous session 🦾🤖 2026-07-27 csr-research (job b23e47f6), directed
  focus via `/session-init --auto`.
- Four parallel research lanes (Opus 5 subagents): commercial CSR tools · pharma
  document-review platforms · ARS/pharmaverse standards state · cross-domain
  change-workflow patterns. Synthesis and framework authored by the Fable 5 lead
  against open.csr's shipped v0.2 design (design.md D1–D12, §12–§13, contracts.md).
- Builds on the 2026-07-25 kickoff survey
  ([open.csr/research/sections/01](https://github.com/jwildfire/open.csr/blob/main/research/sections/01_existing-tools.md));
  basics from that survey are not repeated.

## Method notes and limits

- Every claim carries an inline source link; claims that could not be verified are
  marked "(unverified)". AI-generated SEO aggregator sites were identified and
  excluded from all claims.
- `lexjansen.com` (PharmaSUG/PHUSE archive) was DNS-unreachable on the research date;
  papers were reached via publisher mirrors (pharmasug.org, phuse.s3, pharmasug.com.cn)
  and absences that depend on that archive are labelled unknown rather than absent.
- Package/model facts (ARS model fields, cards NAMESPACE, release tags) were verified
  against GitHub source, not documentation prose. FDA guidance status verified via the
  Federal Register API; EMA reflection paper read from the primary PDF.
- One sub-researcher caught and discarded a fabricated claim about PharmaSUG 2025
  OS-024 (asserted shell-versioning content; the actual paper has none) — recorded
  here as a reminder that conference-paper claims were spot-checked against PDFs.
