# D0031 — September: the last build month

**Status: Awaiting his answers** — S1–S4 (D0031.1–.4).

One development month before talk preparation. This is a plan built around what the keynote needs rather than what is next in the queue, and its harder half is what to deliberately not build.

The argument: three efforts are in good health — the report builder released v0.3.0 with a real efficacy section, the chart library has thirteen chart types, the R package has a rebuilt census and thirteen widget bindings. The talk is about none of them. The summer deliverable was open.gismo, *a full end-to-end environment*, and open.gismo is the thinnest thing in the programme. So September makes the headline claim demonstrable and stops doing anything else.

**Goal:** [#72](https://github.com/jwildfire/obot.roadmap/issues/72) · **Defers:** [D0030](../2026-08-27-sap-shells/), [D0029](../2026-08-27-review-layer/) · **Companion episode:** "September: the last build month" on *obot: the program*

## The four questions, one line each

- **S1 — the date.** The goal issue says the talk is September; the July notes say October with September preparation. Recommendation: confirm it rather than infer it, because it decides whether September is a build month at all.
- **S2 — where the month goes.** open.gismo, versus consolidating the three efforts already going well. Recommendation: open.gismo, because a talk that demonstrates the parts of a claim rather than the claim has a hole the audience finds during questions.
- **S3 — the omissions.** Recommendation: defer the SAP and the review layer in writing. Both have finished design pages, so deferring costs a date; leaving them ambiguous costs two weeks the first time a session picks one up.
- **S4 — the stop.** Recommendation: hard stop at the end of week three, with week four protected for rehearsal. If the month slips, slip week three.

## Measured for this page, not relayed

Everything below was checked on 31 August rather than carried from the queue.

- **Eight decision pages and four release candidates reduce to about seven real items.** D0028 is answered by the work — the two widgets shipped on 27 August using named table arguments, exactly the shape the page recommended. D0024 is mostly overtaken by the migration being called off. D0026 had its ranking half answered the night it was written. D0025 advanced: both CRAN pull requests are open upstream and now wait on other maintainers.
- **Branch protections are the most understated item in the queue.** Of the four repositories that matter, exactly one main branch is protected — and it is not the one holding the merge policy, the merge tool and the hooks.
- **The two gsm.safety candidates are one release train.** `release/v1.3.0` contains `release/v1.2.0` entirely, and both still carry five workflow files pointing at an organisation the templates moved away from on 4 August — fixed on `dev` and never carried across.
- **There is still no backup destination configured.** `tmutil` returns none. Roughly eleven megabytes that no repository can rebuild, on one drive, in the month before the talk.
