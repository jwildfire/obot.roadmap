# qcthat for safety.viz (2026-10-30)

Recommendation asked for by @jwildfire on 30 October 2026: consider a JavaScript adapter for qcthat (something like `qcthat-js`), adopt it in safety.viz, and research whether similar JavaScript tools already exist. The core idea is that safety.viz evidence uses qcthat traceability matrices, with GitHub issues as the requirements and the current tests as the evidence.

Status: adapter decided; its shape is open in [qcthat evidence extensions](../qcthat-evidence-extensions-2026-10-30/). Private copy: https://claude.ai/artifact/EH5rr1gzXDHgUjcMJw8JiB

## Decisions

- 30 October 2026, in the working session. @jwildfire: "Agree with the approach, but I want to hear a bit more about the adapter. If possible, I'd like to make this a formal qcthat extension that adds to the framework." This settles the adapter over a JavaScript port and reopens what the adapter should be.

## What the page holds

- The recommendation in three lines, and the three decisions it needs.
- The proof: unmodified qcthat 1.1.3 given all 2,982 tests from the evidence files on safety.viz `dev` at `14c5847`, and the real issues of the repository.
- How the pipeline would work, what has to be cleaned up first, and a survey of existing tools.
- What the matrix does not do, the next steps, and how far to trust the numbers.

## Related

- Requirement: [qcthat-compatible QC reporting for safety.viz](https://github.com/jwildfire/obot.roadmap/issues/15)
- Upstream: [feedback on using qcthat in a non R package repository](https://github.com/Gilead-Public/qcthat/issues/285), [nest issues under parent](https://github.com/Gilead-Public/qcthat/issues/38)

## Assumptions and limits

- Measured from committed `evidence.json` files, not a fresh test run. Every record passed, so failures and skips were not exercised.
- Issue links use qcthat's own rule, any `#` followed by digits in the test name.
- Run on qcthat 1.1.3. Installing 1.2.0 was refused in the session, so the two were compared instead: eight R files changed, none of them the matrix code.
- Row counts are exact ID matches. Split rows are not credited by a test that names the base ID.
- The list of 18 release issues was made by matching titles.
- Tool health comes from the npm registry and GitHub on 30 October 2026. The pharma search was one query.

## Sources

- qcthat source at `dev` and the v1.2.0 release notes.
- safety.viz `scripts/evidence-lib.mjs`, `scripts/evidence.mjs`, `CONTRIBUTING.md`, `requirements/`, `docs/evidence/`.
- npm registry and download API, GitHub repository records, and the project documentation linked on the page.

---

This report was drafted by Claude Code using Opus 5.5 for review by @jwildfire. This is AI-generated content and has not yet been reviewed.
