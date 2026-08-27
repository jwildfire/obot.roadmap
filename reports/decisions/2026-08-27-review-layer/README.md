# D0029 — The review layer

**Status: Awaiting his answers** — RL1–RL6 (D0029.1–.6).

The app finds risks and then forgets that anyone looked. Of the ten review-workflow capabilities the platform survey scored across thirteen safety and monitoring platforms, this portfolio has none, and the survey called that its strongest single finding. This artifact designs the two smallest pieces that would change how a reviewer works — a durable record that a person looked, and a comparison against what that person last saw rather than against last week — and confronts the architectural problem the requirement names. Measuring that problem moved it: the difficulty is not that review state is mutable, but that the published snapshots are not immutable, which is what a review's key has to survive.

**Requirement:** [#139](https://github.com/jwildfire/obot.roadmap/issues/139) · **Answers:** the fifth question on [D0026](../2026-08-21-clinical-priorities/) · **Goal:** [#79](https://github.com/jwildfire/obot.roadmap/issues/79) · **Adjacent:** [#131](https://github.com/jwildfire/obot.roadmap/issues/131), [#144](https://github.com/jwildfire/obot.roadmap/issues/144), [#205](https://github.com/jwildfire/obot.roadmap/issues/205), [demo-301#8](https://github.com/jwildfire/demo-301/issues/8)

## The six questions, one line each

- **RL1 — where the record lives.** Authored on the study's source branch and projected to the site on publish, versus written straight to the published branch, versus issues, versus an external store. Recommendation: authored on the source branch.
- **RL2 — what a review points at.** A digest of the results the reviewer saw, versus the snapshot name, versus the data-cut date. Recommendation: the digest, because the name has already meant four different datasets and the date cannot tell two of the three published snapshots apart.
- **RL3 — what brings a finding back.** Three tiers (verdict always, magnitude beyond a declared tolerance, substrate noted only), versus any change at all, versus flag changes only. Recommendation: the three tiers.
- **RL4 — what becomes public.** Publish the fact and the controlled reason and hold free text behind a per-study switch, versus publish everything, versus publish nothing. Recommendation: the safe default, since the demo study is a world-readable repository.
- **RL5 — who is a reviewer.** Hosting-platform account holders only, said in writing, plus a publish check that refuses an entry whose named author is not its committer. Recommendation: yes, and say so.
- **RL6 — the number at the top.** Outstanding findings new or changed since that reviewer last signed, versus a percentage-reviewed tile. Recommendation: the outstanding count.

## Measured for this page, not relayed

- **The snapshot name is reused.** Every commit touching `ps-001` on demo-301's published branch was listed and its results file hashed at each: 1,898 rows → 1,898 (unchanged) → 1,918 → 1,920 → 3,835. Four distinct datasets under one name across five commits. The rebuild script additionally deletes every `ps-NNN` directory and the snapshot index, re-issuing names from one.
- **The server-free write path works, and has a hard ceiling.** A prefilled new-file link was opened against `jwildfire/demo-301`; the platform's editor prefilled both path and content under the browser's existing session, and nothing was committed. Binary search on the same link: 2,000 and 8,000 characters accepted with content echoed intact, 8,250 refused with a request-too-long status, 16,000 and 32,000 refused, 64,000 dropped before a reply. A realistic entry carrying the FDA RBM Q&A Q8 field set is 400 characters raw and 580 encoded, so one hand-off carries about thirteen findings.
- **What survives a publish.** `publish-snapshot.py` replaces only `workflows`, `config` and `output` and copies four named files; it never enumerates the published root, so an unknown directory beside them survives. `rebuild-snapshots.sh` deletes the `ps-NNN` directories and `snapshots.json` and nothing else.
- **The comparison already ships.** `flagDeltas(prevRows, currRows, groupLevel)` at `open.gismo/site/src/flags.js:175` takes both row sets as arguments and emits only when the flag *level* changes, skipping every finding whose level held.
- **Finding identity.** Verified against `gsm.core::reportingResults` and demo-301's published results: ten columns, no snapshot id among them; the four-part key is unique across all 4,273 rows; flag is unstable for a fixed key (310 findings carry two values across three snapshots, 13 carry three); 1,930 participant-level findings are already published through the identical columns; the bounds are recomputed per snapshot from that snapshot's own results, so a flag can move with no change to a site's own numbers.

## Claims found wrong

- **The finding key includes the flag** (requirement #139, both the risk and safety forms). It should not: the ecosystem's own `CalculateChange` declares the key without it, and keying on it detaches review state exactly when the flag flips.
- **Safety findings need a separate key** (requirement #139). They publish through the identical columns with the participant identifier in the group field; there is one key for all four levels.
- **Published snapshots are immutable** (stated on the site masthead and in the app design record). Contradicted by the measurement above.
- **Per-participant comparison against a last-reviewed snapshot is something surveyed platforms do.** It is not; the survey does not describe any platform doing it. It is the survey's own proposal and this page's, and the page says so rather than attributing it.

## Sources

- The platform gap analysis of thirteen platforms and two reference catalogues (2026-07-25), including its own statement that platforms were scored on documentation and that nothing was tested.
- The dashboard design session that filed the requirement (2026-07-28), whose recommendation on where state lives this page refines rather than replaces.
- demo-301's published `site` branch, its publisher and rebuild scripts, and its pipeline workflow.
- `open.gismo`'s `og_run`, payload writers, site source and stated requirements; the FDA RBM question-and-answer field set for the entry schema.

## Assumptions

1. Design only. Nothing was implemented, no code changed in any repository, and no issue was moved.
2. The study repository remains the distribution model, so "your study is a repository" is treated as a prerequisite rather than a new constraint.
3. The demo study is the validation vehicle, and it is public — which is why what a review publishes is a question on the page rather than an implementation detail.
4. No electronic-signature claim is made or implied, matching the posture the change-request work already adopted.

---

Drafted by 👯🤖 Claude Code (Claude Opus 5, worker W0139). Not reviewed by @jwildfire before publication.
