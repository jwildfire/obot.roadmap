# Response to the open.csr replication assessment

Draft for @jwildfire to send. Written 2026-09-02 against the assessment dated 1 September; every factual claim below was checked against the repository and the data rather than taken from the assessment or from memory. The full plan it points to is at https://jwildfire.github.io/obot.roadmap/reports/decisions/2026-09-02-open-csr-replication-plan/.

---

Thanks for this — it is the most useful outside read the project has had, and the central finding is right. I checked it against the data rather than the document: preparing the subject-level dataset on the two lanes open.csr can read gives 86 / 84 / 84 subjects per arm from the pilot's own package and 86 / 96 / 72 from the pharmaverse re-derivation, in the actual-treatment column only. The six displays the project started with sit on the second lane; everything added since sits on the first. So yes: the assembled report describes two studies, and I am treating that as the first gate of the next release rather than one item in a list.

A few places where I read the evidence differently, in case they change anything on your side:

- **Version.** You reviewed a checkout stamped 0.2.0. The current release is 0.3.0 (27 August), and your counts — twenty-six displays, thirteen efficacy tables, the figure — are the 0.3.0 contents, so nothing in your substance is stale. The stamp is: the release bump was never folded back into `dev`. That is ours to fix and it is done first.

- **Race is a coding convention, not a data conflict.** Both packagings say 230 White, 23 Black, 1 American Indian, and separately 12 Hispanic by ethnicity. The 2006 report printed a combined "Race (Origin)" with Hispanic as a category, so 218 + 12 = 230. It reproduces exactly with a footnoted recode of two variables into one; no source-priority rule is needed for it.

- **Exposure needs no exposure dataset.** The pilot's package has no ADEX, which is the reason the pharmaverse lane was kept for it. But Table 14-4.01 summarises average daily dose and cumulative dose, and the pilot's own ADSL carries both as columns. Exposure moves lanes with no derivation, and the last reason to keep the second lane as a default goes with it.

- **"Rebuild four" is "move two, add two".** Demographics and exposure are close to the reference shape and need the lane flip plus small additions (the reference's demographics is intent-to-treat with a p-value column, MMSE, education and disease duration). The adverse-event and serious-event incidence tables are a different shape — organ class and preferred term, subject counts with event counts in brackets, Fisher's exact against placebo — so those are new displays. The FDA-standard AE tables stay in the library as variants that the pilot profile simply does not place.

- **The narrative gap is a review gap.** Ten of fifteen report blocks are approved; five agent-drafted ones and eighteen synopsis blocks have been waiting for a human read since July. Writing the missing sections is the cheap part; one person's reading time is the constraint, and the review workflow is the dependency. That is why the text release is sequenced after it.

- **SAP as input and SAP as output are the same object.** You want the SAP ingested and the methods bound to its sections; the plan of record renders SAP shells from the same display specifications the report uses. These are two ends of one model: the specification library is the machine-readable plan; a study run in open.csr from the start renders its SAP from it, and a study that arrives with a SAP has that document ingested and reconciled against it. The pilot's own SAP is not vendored because its redistribution rights are unestablished — the same reason the reference PDF is fetched and read at a pinned hash rather than copied.

- **Kenward-Roger.** Agreed on the five cells and the cause. The route is the `mmrm` package, which implements both the degrees of freedom and the adjusted standard errors, rather than recovered SAS output. It is a bounded spike with a pass mark of 769 / 769 and permission to fail with the residual stated.

- **Medications lineage.** Exactly as you describe. The study's SDTM CM domain is in the same public repository at the same pinned commit; we will derive from it with the derivation on record, and retire the remapped file only after the derived dataset reproduces every cell of the current table.

- **Rights.** Agreed, and the project already refuses harder than you ask: pages 154–409 of the reference carry Eli Lilly's copyright, and the agreement record declines to vendor the PDF for that reason. The appendix builder will register and cite those pages, not embed them.

- **A study-specific profile is one file.** The template library is already plural and display numbering is assigned at build time, so a CDISC Pilot profile with the reference's section order and 14-x.yy numbers is a fifth template object, not an engine change.

What we are adopting from the assessment, essentially unchanged, is the build order. It becomes four releases: v0.4.0 "one study" (your P0 + P1 — a study model, the lane flip, a consistency gate that fails the build on disagreement, and the seven missing displays); v0.5.0 "the whole text" (P2, after the review layer, with a source-and-fact registry and the SAP); v0.6.0 "the submission document" (P3 — the pilot profile, paged PDF with generated contents and bookmarks, a rights-first appendix manifest); v1.0.0 "the replication proven" (P4 — your acceptance checklist as a CI run). Your study-team intake table is right and most of it is after 1.0; we name it 1.1 and expect to prove it by running a second study rather than by describing one.

The first release is broken into nine issues that could start tomorrow, on the page linked above. Two things I would value your eye on: whether the reference agreement for the sixteen-page incidence table should be done by mechanical extraction (as the efficacy tables were) or by transcription, and whether you see a problem with the shift-by-visit laboratory table being the one item allowed to slip to a point release.

---

_This response was drafted by Claude Code using Fable 5.1 and reviewed by @jwildfire._
