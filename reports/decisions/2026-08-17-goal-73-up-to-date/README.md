# D0020 — Bringing the autonomy goal up to date

**Status: Decided** — G3 and G4 (D0020.3–.4) answered 2026-08-17; G1 and G2 (D0020.1–.2) answered 2026-08-18. All four settled.
**Requirement:** [jwildfire/obot.roadmap#226](https://github.com/jwildfire/obot.roadmap/issues/226) · **Goal:** [#73 increased autonomy](https://github.com/jwildfire/obot.roadmap/issues/73)
**Q&A:** [#228](https://github.com/jwildfire/obot.roadmap/discussions/228)

## What he decided

Recorded on the page in a `Decisions` section, which is the record — this file and the
Index row are views over it.

- G3, the historical orphans. He overruled the recommendation, and both the concierge
  and the operating officer with it. His words: *"i'm fine if some orphans stay
  orphaned, but fix the ones we can. Let's tag true orphans with a label. and just add
  comments on requirements that get retroactive updates. Again, we're pushing for
  transparency and continuous improvement. not perfection."* Refined once when the
  chronology problem was put to him — several orphans predate the requirement they
  would attach to, so a forced parent would be a fiction. Delivered the same morning
  under [#233](https://github.com/jwildfire/obot.roadmap/issues/233) and
  [obot.agent#164](https://github.com/jwildfire/obot.agent/pull/164): 51 attached and
  re-read to confirm, 146 labelled `orphan-accepted` across seven repos, 28
  requirements commented. Measured at 06:05 that morning, orphans across all recorded
  history stood at 1, down from 197; a day later the check reads 9, which is new work
  orphaning at the ordinary rate rather than the fix coming undone.
- G4, the title. Relayed rather than quoted, and marked as such on the page:
  "Increase Autonomy", as recommended, with the loop framing in the goal's opening
  sentence rather than in the name. Applying it is his — posted to
  [#73](https://github.com/jwildfire/obot.roadmap/issues/73) as a comment with the
  proposed body, for him to apply on his word.

Then, on 2026-08-18, the other two.

- G1, the done-condition, and G2, the five workstreams. Both approved as recommended,
  in one dictated message: *"I listen to the one about the goals, and I approve. Yeah.
  That all sounds fine. The goal groups makes sense. … so I approved both of your
  recommendations."* The goal's done-condition becomes the operating model rather than
  the pipeline, and the thirty-seven open requirements are grouped into the five named
  workstreams carried as labels, not as a new tier of issues. His words are on the page
  in full; this is an extract.
- The channel is part of the record. He listened to the audio episode of this page and
  dictated his answer into chat from his phone — the first decision this program has
  taken through a brief rather than a page — and it did not use the Siri lane: *"That
  seems easier than a than a Siri link."*
  [#265](https://github.com/jwildfire/obot.roadmap/issues/265), written that morning,
  assumes Siri and Reminders, and should be read against this. He quoted no identifier
  of any kind, which is the constraint #265 states.
- The five labels, already applied at the operating officer's direction under
  [#226](https://github.com/jwildfire/obot.roadmap/issues/226) rather than on an answer
  of his, are ratified by this. Their descriptions still say "proposed, pending his
  confirmation"; correcting them is follow-through, not part of the record.
- His one question, answered on the page: of the 45 open issues carrying a workstream
  label on 2026-08-18 — all of them children of #73 — 43 are requirements. The two that
  are not are [#94](https://github.com/jwildfire/obot.roadmap/issues/94) and
  [#152](https://github.com/jwildfire/obot.roadmap/issues/152), small items filed
  straight against the goal. Twelve further open children carry no workstream label:
  #229 deliberately, and eleven filed on 18 August after the labelling pass.

Nothing here is his any more. What follows from the approval is: the title and body are
posted on [#73](https://github.com/jwildfire/obot.roadmap/issues/73) for him to apply,
and [#226](https://github.com/jwildfire/obot.roadmap/issues/226) stays open until they
are.

## What produced this

@jwildfire, 2026-08-17, in chat, rejecting a proposal to file a fifth goal for the
operating system built this week:

> *"You own the strategy for the project with me, not the goals. I think the goals are
> mostly ok - I want to keep them very high level. i do agree with your sentiment that
> the work isn't wll tracked though. I think what you're describing are requirements
> under increased autonomy. We can maybe rename that goal "Increase Autonomy using
> goals and schedules" or just "Increase Autonomy" or even something around "Loop
> engineering". Go ahead and draft an artifact summarizing how to bring it up to date."*

The frame is his and is not re-litigated on the page: goals stay very high level and
there are four (autonomy #73, charts #78, the app #79, open.csr #112). The concierge's
diagnosis was right and its remedy was wrong, and the page says so rather than
presenting a clean story.

## Method

Every figure was measured on 2026-08-17 from live GitHub state and the machine's own
records. Nothing was carried from the commissioning brief.

- Goal membership: the GraphQL `subIssues` connection on #73 — 50 children, 37 open,
  24 (48%) filed between 14 and 16 August.
- Orphaned work: the same `ORPHAN_QUERY` the Navigator's discipline check uses
  (`obot.agent/tools/navigator/checks.mjs`), run against all seven project repos.
  Parenthood is taken from the structural field only, never from a prose reference.
  129 shipped in 14 days, 59 unparented; 101 more outside the window.
- The break: creation timestamps and parent links for all 29 obot.agent issues created
  since 14 August. 0 of 12 parented before 2026-08-15 20:00; 16 of 17 after.
- Rename cost: the public URL and the `--auto` binding key on the `goal-slug: autonomy`
  comment in the body, not on the title, so renaming breaks no link and no lane.
  Corrected 2026-08-18: the goal page's own heading is taken from the issue title
  (`scripts/lib/collect/goals.mjs`), so it follows the rename — which is the point, but
  the original wording said the page name came from the slug, and that was wrong.

## Corrections made against the brief

Two of the commissioning session's readings did not survive measurement, and the page
states both rather than quietly dropping them:

- The brief's suspicion that recent requirements are "one-off receipts filed to
  describe work already done" is wrong. They are well-formed, quote @jwildfire with a
  date, and 21 of the 24 filed 14–16 August are still open. The real defect is
  altitude — one requirement per remark, with no layer between the goal and 37 peers.
- The brief's four proposed groupings (surfaces, officer, provenance and identity,
  roadmap discipline) do not cover the set. Provenance does not hold together, and two
  clusters are missing entirely: seven requirements on how a session behaves (the whole
  of the standing July work) and six on how work reaches him. The page proposes five.

## What it asks

All four are answered; the questions are kept as the page put them.

- G1 (D0020.1) — the goal's done-condition becomes the operating model, not the pipeline.
- G2 (D0020.2) — the 37 open requirements grouped into five workstreams, carried as labels.
- G3 (D0020.3) — the 160 orphaned historical items bounded at a start line, not backfilled.
- G4 (D0020.4) — the rename, presented last because it matters least.

Recommendation on the rename: "Increase Autonomy", with the loop framing carried in
the goal's opening sentence. Option two ("using goals and schedules") is ruled out —
it names a mechanism that has never run, per D0019.

## Scope note

The page proposes; it does not edit. Goal #73's own text reserves direction and
membership to @jwildfire, and autonomous sessions propose as comments. The proposed
body is written out on the page so the change is concrete, but applying it is his.
