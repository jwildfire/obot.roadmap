# D0020 — Bringing the autonomy goal up to date

**Status: Awaiting @jwildfire** — G1–G4 (D0020.1–.4).
**Requirement:** [jwildfire/obot.roadmap#226](https://github.com/jwildfire/obot.roadmap/issues/226) · **Goal:** [#73 increased autonomy](https://github.com/jwildfire/obot.roadmap/issues/73)
**Q&A:** [#228](https://github.com/jwildfire/obot.roadmap/discussions/228)

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
- Rename cost: confirmed that nothing keys on the goal title — the public page name
  comes from the `goal-slug: autonomy` comment in the body, and `policy.json` /
  `goals/registry.json` key on the same slug.

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
