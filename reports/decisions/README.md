# Decision artifacts

When an autonomous session hits a call it cannot make — an unsigned design, a
clinical judgement, a policy carve-out, a missing prerequisite — it does not stall
and it does not guess. It writes a **decision artifact** here and moves on to the
rest of its work.

The contract comes from the [release-candidate framework](https://github.com/jwildfire/obot.agent/blob/main/docs/rc-framework.md)
(obot.agent, 2026-08-14). @jwildfire reviews exactly two kinds of thing: release-candidate
PRs, and these.

## The contract

- One folder per decision at `reports/decisions/{YYYY-MM-DD}-{slug}/`, containing a
  self-contained `index.html` (no external assets) and a `README.md` recording
  provenance, sources and assumptions.
- Contents of the page, in order: **the situation in three sentences**; **the options**,
  each with what it costs and what it forecloses; **a recommendation, stated plainly**;
  and **what unblocks** on each choice.
- Linked from the blocked goal's hub issue, and surfaced in that night's executive
  summary under *Critical blockers*.
- **Posted to the hub's [Q&A discussions](https://github.com/jwildfire/obot.roadmap/discussions/categories/q-a)**
  (@jwildfire, 2026-08-14): a *brief* executive summary — the open question, the
  options in a line each, and the recommendation — linking the artifact for the
  full argument, never restating it in markdown. The discussion thread is the
  *place*: @jwildfire documents his decision there, and the thread link goes in
  the Index below and in the roadmap page's Todo section.
- **A one-line description in the page head**, written with the page:
  `<meta name="description" content="...">` directly on the line after `<title>`,
  40–260 characters. This is the line the hub's news feed shows, and therefore the
  line @jwildfire decides from before opening anything — say what the page contains
  and why he would open it, under the same plain-English bar as everything below. Not
  "AI-generated report." (the hardcoded feed fallback until 2026-08-15, now rejected
  by name) and not a restatement of the title. `node scripts/check_artifact_descriptions.mjs`
  fails the deploy without one; full contract in [`reports/README.md`](../README.md).
- **A permanent ID, claimed before the page is written** (@jwildfire, 2026-08-15:
  *"Give every decision artifact an ID and then give each question for me a sub ID…
  Use D0001 as the ID"*). The artifact is `D0001`; its questions are `D0001.1`,
  `D0001.2`, … numbered in the order they appear on the page. Claim it with:

  ```bash
  node scripts/claim_decision_id.mjs 2026-08-16-your-slug \
    --title "What the decision is called" \
    --q "A1: The first question, in words" --q "A2: The second"
  node scripts/stamp_decision_ids.mjs      # writes the ids onto the page
  ```

  The ID exists so he can approve one thing unambiguously in chat — *"D0004.2 is
  approved"* — without also naming the artifact. Rules:
  - **Never renumber and never reuse.** A superseded, retired or already-decided
    artifact keeps its number; the decision log has to cite it forever. Gaps are
    fine.
  - **The artifact's own codes stay** (A1–A4, BL1–BL4, M1–M5, …), shown beside the
    canonical ID rather than replaced, so questions he has already answered under
    those codes stay findable.
  - **The ID is a handle, not an explanation.** It never displaces the sentence
    saying what is being decided — that sentence is still the thing he reads.
  - The registry is [`registry.json`](registry.json); `node scripts/check_decision_ids.mjs`
    fails the deploy on a duplicate, a missing page or a question that is not
    anchored. Two sessions can compute the same next number without seeing each
    other — `git push` is the arbiter, and a rejected push means rebase and re-run
    the claim.
- **One artifact per decision topic.** Bundling unrelated questions into one page
  defeats the purpose; a single page may carry several decisions only when they gate
  each other and must be answered in one sitting.
- **Plain English is the bar** (@jwildfire, 2026-08-15: *"Executive summary references
  lots of issue numbers I don't have memorized … Links to issues are references for a
  deep dive (if I decide to do one), not a valid explanation."*). Concretely:
  - A reader who has memorized **nothing** — no issue numbers, no repo shorthand, no
    codenames — must be able to answer every question from the words alone. Name
    things, don't number them: *"the merge-gate hook that refuses agent edits"*, not
    *"#152"*.
  - Every question states **what is being decided and why it matters, in words,
    before any reference appears**. Issue/PR links come after the explanation, as
    optional citations. The test: delete every link and bare reference — if a
    paragraph becomes incomprehensible, rewrite it.
  - The **executive summary alone carries the decision, the stakes, and the
    recommendation** — it is the whole artifact for skim purposes. Decision codes
    (W1, BL2, …) are trailing tags for the Q&A thread, never the subject of a
    sentence, and never appear bare in a summary box.
- **No inline bold** (@jwildfire, 2026-08-16: *"I really don't like the randomly bolded
  sentences in the middle of paragraphs. Call things out in modals if they're super
  important, but no more random inline bold."*). He triages these pages fast, often on a
  phone; when a quarter of a page is bold, nothing is emphasised and the skim the bold was
  meant to help is the thing it destroys. Concretely:
  - No bolded sentence or clause **inside a body paragraph** — not as the paragraph's
    opening sentence, not mid-sentence, not on a number inside a table cell's prose.
    Rewrite the sentence so it carries its own weight, or promote it.
  - Anything that genuinely has to be seen goes in a **callout block** — a bordered,
    tinted element with its own label, which every artifact must define before it needs
    one. The current pages define theirs as `.callout`, `.card` or `.verdict`; the
    canonical minimum, which holds at 390px and inherits the page's own colours, is:

    ```html
    <style>
    .callout{margin:22px 0 0;border:1px solid var(--rule2);border-left:4px solid var(--flag);
      border-radius:6px;background:var(--panel);padding:16px 18px;max-width:100%}
    .callout .k{font:600 10.5px/1 var(--mono);letter-spacing:.12em;text-transform:uppercase;
      color:var(--flag)}
    .callout p{margin:8px 0 0}
    </style>
    <div class="callout"><div class="k">What this changes</div>
      <p>The sentence he has to see, in plain words.</p></div>
    ```

    A bolded lead sentence inside a callout is the callout doing its job twice — drop the
    bold, keep the callout.
  - Bold that is doing structural work stays, and stripping it would make the page worse:
    list-item and definition-list leads (`- **Name** — description`), table headers, a
    label or value at the *start* of a cell, key–value strips like the fact bar under the
    title, run-in labels that name what follows and end in a colon or period
    (`Recommendation:`, `Sources.`, `Why it is gone:`), and standalone bold lines used as
    sub-headings (the diary's section convention). The test for a run-in label is whether
    it names the material after it or makes a claim about the world — *"One caveat worth
    keeping."* is a label and stays; *"It does not reproduce."* is a claim and loses the
    bold.
  - Quotations from @jwildfire are untouchable, bold included — that text is his, not ours.
  - The rule is about everything he reads, not only these pages: artifacts, the diary,
    issue and PR bodies, and chat. The sweep that established it — 157 removals across the
    six newest pages and the day's diary entry, with no word of any page changed — is
    [requirement #198](https://github.com/jwildfire/obot.roadmap/issues/198).
- **When @jwildfire decides — in chat, in a Q&A thread, anywhere — the artifact gets
  a `Decisions` section at the top** (@jwildfire, 2026-08-15), added the same day,
  before any other section. One entry per decision: the date, **his words verbatim**
  (quoted), which questions it resolves, and what happened next (implementation
  links as they land). The artifact's README and the Index row below move to
  **Decided** in the same commit. The Q&A thread remains a valid place to decide,
  but it is no longer the only record — the artifact itself is.

- **The record is machine-readable, and the deploy enforces it.** A Decisions section
  is not just prose: each decision inside it is one block carrying `data-date`,
  `data-channel` and `data-resolves` (plus `data-verbatim="false"` when the words are
  a relay rather than a quotation), wrapped in `<section id="decisions">`. The
  deploy-time generator reads those blocks to build the site's
  [Decisions log](https://jwildfire.github.io/obot.roadmap/decisions/), and **fails the
  build** when an artifact this Index calls decided carries no readable section — a log
  that silently omits a decision reads as complete, which is worse than no log.
- **Never hand-maintain the log.** The artifacts are the source of truth; the log and
  its `decisions.json` feed are views assembled at deploy time. Recording a decision
  means editing the artifact, and nothing else.
- **Closing is not deciding, and folding is neither.** An artifact can leave his queue
  three ways, and the status cell says which: *Decided* (he answered its questions),
  *Folded into D00xx* (its live questions moved to a successor that will answer them),
  or *Closed* (he retired it — with a successor named as *superseded by D00xx* when
  the question lives on, and without one when it stopped mattering). He closed three
  artifacts in one line on 2026-08-16 (*"D14/15/16 all seem like a mess to me. Close
  them all"*), and closed is the state that was missing: without it those pages either
  stayed in his queue or borrowed the decided vocabulary and put a verdict in his mouth
  he never gave. A close is still a decision he made, so it gets the same Decisions
  section, quoting him, resolving the questions it retires — and it says plainly what
  state the page was actually in, rather than closing several pages in identical words.

## Index

| Decision | Date | Goal | Discussion | Status |
|---|---|---|---|---|
| [SafetyCensus(): stays or goes, before v1.1.0 publishes](2026-08-17-safetycensus-stay-or-go/) | 2026-08-17 | [#73](https://github.com/jwildfire/obot.roadmap/issues/73) | [#235](https://github.com/jwildfire/obot.roadmap/discussions/235) | Awaiting @jwildfire — C1–C2 (D0021.1–.2). The gsm.safety v1.1.0 release is merged and held one step short of publication over its new census function, which is exported and therefore about to become public API of a clinical package. Six reviewers briefed to argue it out and one steelman briefed to keep it — every claim independently fact-checked, 47 claims, none refuted outright — split the case cleanly: the correctness attacks landed (run on the ecosystem's own bundled study the function reports one death where the death records hold at least twelve, prints false zeros when a column is missing, and lets numerators pass their denominators), while the stranded-helper attack failed, because the deployed demo site really does fetch and render its output. The panel corrected the commissioning brief twice, both times in the function's favor, and the page says so. Recommends: pull the export before publication — the last moment removal is not a breaking change — and bring the census back lane-shaped under a real requirement, keeping the per-visit coverage idea nothing else in the ecosystem computes. Requirement [#229](https://github.com/jwildfire/obot.roadmap/issues/229), task [#230](https://github.com/jwildfire/obot.roadmap/issues/230) |
| [Bringing the autonomy goal up to date](2026-08-17-goal-73-up-to-date/) | 2026-08-17 | [#73](https://github.com/jwildfire/obot.roadmap/issues/73) | [#227](https://github.com/jwildfire/obot.roadmap/discussions/228) | Awaiting @jwildfire — G1–G4 (D0020.1–.4). He rejected a fifth goal for the operating system built this week and said the work belongs as requirements under increased autonomy; this page acts on that. The tracking gap is real and measured — 59 of 129 things shipped across the seven repositories in a fortnight had no requirement above them — but it largely closed itself on the evening of 15 August, and the rate since is 13% against 63% before. What did not catch up is the goal: its scope names five pieces of work, four of them untouched for a month; its done-condition describes a pipeline rather than the operating model with an officer in it; and its thirty-seven open requirements sit flat with nothing saying what any belongs to. Proposes a rewritten body, five workstreams carried as labels rather than a new tier of issues, a bounded start line for the 160 orphaned historical items instead of backfilling, and — last, because it matters least — "Increase Autonomy" as the title with the loop framing in the opening sentence. Two of the commissioning session's readings are corrected on the page rather than dropped: the recent requirements are not receipts, and its four proposed groupings miss two clusters entirely. Requirement [#226](https://github.com/jwildfire/obot.roadmap/issues/226) |
| [Scheduled sessions: what is ready, what is not, and what would make it ready](2026-08-16-scheduled-sessions-assessment/) | 2026-08-16 | [#73](https://github.com/jwildfire/obot.roadmap/issues/73) | [#222](https://github.com/jwildfire/obot.roadmap/discussions/222) | Awaiting @jwildfire — H1–H5 (D0019.1–.5). Supersedes [D0014](2026-08-15-scheduled-sessions-readiness/), which he closed along with two others. The answer is not yet, and the page is the finish line rather than the verdict: five gates, each with a check he can run himself, plus the observations that would falsify a later yes. The blocker that dwarfs the rest is the host — the lid was shut for eleven hours and fifty-three minutes today, the machine was conscious for four minutes of it, no agent worked for nine hours, and the five-minute watcher ran thirteen times of a hundred and forty-two while reporting health from failed queries. Gate one is his (a machine that does not sleep); the others are hard stops on the destructive routes, detection that survives the host, the trigger plus one supervised rehearsal, and a nightly cost ceiling |
| [The roadmap page — three directions to react to](2026-08-16-roadmap-page-directions/) | 2026-08-16 | [#202](https://github.com/jwildfire/obot.roadmap/issues/202) | [#208](https://github.com/jwildfire/obot.roadmap/discussions/208) | **Decided 2026-08-16** — R1–R3 (D0018.1–.3), in two exchanges. The spike's recommendation approved in chat ("i'm good with your rec  build"): the queue becomes the front page, the wire sits one click behind it, the board's NOW panel is absorbed as a slim strip, and the current inventory page survives as the catalog with its filters and hierarchy review lane intact (R1, R2). Those words did not touch R3 — the fixed labelled recent window as the public answer to "what changed", with the real "since you last looked" left to the local dashboard ([#205](https://github.com/jwildfire/obot.roadmap/issues/205)) — which the wire he approved only implied; the inference was put back to him rather than counted, and he answered it separately ("R3 is fine, leave it as approved"). Both quotes are on the artifact as separate dated entries. The recommendation is the spike's own, written by the worker who built the three directions; the concierge offered none. Follow-through: the rebuild is [#211](https://github.com/jwildfire/obot.roadmap/issues/211), and the commissioning requirement [#202](https://github.com/jwildfire/obot.roadmap/issues/202) closes out. The three spike pages ([queue](https://jwildfire.github.io/obot.roadmap/roadmap-spike/queue.html), [wire](https://jwildfire.github.io/obot.roadmap/roadmap-spike/wire.html), [board](https://jwildfire.github.io/obot.roadmap/roadmap-spike/board.html)) stay up until the rebuild ships |
| [The Navigator — how the operating officer works](2026-08-16-navigator-design/) | 2026-08-16 | [#73](https://github.com/jwildfire/obot.roadmap/issues/73) | [#197](https://github.com/jwildfire/obot.roadmap/discussions/197) | **Decided 2026-08-16** — N1–N8 (D0017.1–.8) all adopted as recommended in chat ("I'm good with D0017 recommendations. Implement. Let me know when the agent is active."), with one sequencing change accepted alongside them: the disagreement between the nightly audit and the wrapup verifier is resolved before the four new audit checks ship. The queued ask — the Operations Dashboard sessions page listing every agent with its identifier, status, cost and roadmap impact — becomes a requirement of its own rather than part of this decision, filed as [#199](https://github.com/jwildfire/obot.roadmap/issues/199). Implemented the same morning: the disagreement resolved (neither check was wrong — the audit had not run, and its day-old total was relayed as that morning's board state), the Navigator live as job `b510658b` ([obot.agent#135](https://github.com/jwildfire/obot.agent/pull/135)), and the checks shipped across all seven repos ([obot.agent#137](https://github.com/jwildfire/obot.agent/pull/137), under requirement [#200](https://github.com/jwildfire/obot.roadmap/issues/200)) — three checks, not four, since one was already live. Original recommendation, unchanged: the consolidated design for the operating-officer agent — what the session is, what it owns, what it decides alone, what it escalates, and what it must never touch. Folds in the worker-closeout (D0015) and supervision (D0016) questions at his request for one document. Recommends: the role is a builder that improves operations (templates, dashboards, the audit framework), not a clerk; requirement before worker with the concierge out of the filing business; plan-repair allowed and work-repair never; the separate supervisor folds in; day one ships the four audit checks that missed last night |
| [Who watches the workers](2026-08-15-worker-supervision/) | 2026-08-15 | [#73](https://github.com/jwildfire/obot.roadmap/issues/73) | [#187](https://github.com/jwildfire/obot.roadmap/discussions/187) | **Closed 2026-08-16** — answered by [D0017](2026-08-16-navigator-design/), superseded by [D0019](2026-08-16-scheduled-sessions-assessment/) for the readiness question it fed. He closed this page and two others in one line ("D14/15/16 all seem like a mess to me. Close them all"), and its central question was already settled inside the Navigator design: the separate supervisor folds in rather than being built beside it, and the standalone supervision requirement closes into the Navigator's. Its measurements carry forward — the silence distribution across thirty-eight background workers, the death that survived only in the event timeline while the job record read healthy, and the finding that a watcher living inside a session is not a watcher. Original recommendation, unchanged: F1–F7 (D0016.1–.7): add the supervisor role, but as eyes in the scheduled sweep plus a first mate that wakes on a detection — not as a fourth standing session |
| [Workers that finish into nothing](2026-08-15-worker-closeout-check/) | 2026-08-15 | [#73](https://github.com/jwildfire/obot.roadmap/issues/73) | [#188](https://github.com/jwildfire/obot.roadmap/discussions/188) | **Closed 2026-08-16** — answered by [D0017](2026-08-16-navigator-design/), superseded by [D0019](2026-08-16-scheduled-sessions-assessment/) for the readiness question it fed. Closed in the same line as the other two, and nothing was lost by it: W1–W4 had already been folded into the consolidated Navigator design that morning and he adopted all eight of its calls, so the three-outcome closeout rule, the closeout detection and the agent-attribution answer are live — and the worker identifiers this page said were needed shipped the same afternoon. Original recommendation, unchanged: W1–W4 (D0015.1–.4): the worker closeout contract (every worker finishes into a release PR, a question, or a config request), how the Navigator detects a closeout, and how to attribute a change to an agent when every write carries the same bot identity |
| [Scheduled sessions: go, after three fixes](2026-08-15-scheduled-sessions-readiness/) | 2026-08-15 | [#73](https://github.com/jwildfire/obot.roadmap/issues/73) | [#183](https://github.com/jwildfire/obot.roadmap/discussions/183) | **Closed 2026-08-16** — superseded by [D0019](2026-08-16-scheduled-sessions-assessment/). Closed without S1–S4 being answered, so its verdict (go, after three fixes) is superseded rather than adopted; the successor re-derives the answer from live state because most of what this page rested on changed inside a day. It was published on 15 August with four blocking fixes and corrected the next morning to three, after the most alarming of the four turned out to rest on a claim no agent could reproduce — struck through in place, so the page a reader opens is a page arguing with itself. That, and two sibling pages circling the same question, is what he was calling a mess. The evidence survives and the successor cites it |
| [Siblings stay — the two delegation lanes under obot-prime](2026-08-15-delegation-lanes/) | 2026-08-15 | Session framework | — (decided in chat) | **Decided 2026-08-15** — keep the current model: siblings for deliverable work, in-conversation subagents for answer-only research; the one-line routing rule shipped the same day into the session-prime and session-spawn skills |
| [Recording your decisions — in-doc, a derived log, and the "approve" button](2026-08-15-decision-recording/) | 2026-08-15 | Session framework | — (decided in chat) | **Decided 2026-08-15** — Decisions-section rule plus all three calls adopted ("I'm good with recs in …", in chat). Implemented same day: the [derived Decisions log](https://jwildfire.github.io/obot.roadmap/decisions/) is live and the deploy fails on an unrecorded decision; the local click-to-decide surface is [requirement #180](https://github.com/jwildfire/obot.roadmap/issues/180) |
| [The roadmap audit audits itself](2026-08-15-roadmap-audit/) | 2026-08-15 | roadmap audit [#92](https://github.com/jwildfire/obot.roadmap/issues/92) | [#163](https://github.com/jwildfire/obot.roadmap/discussions/163) | **Decided 2026-08-15** — six of seven adopted as recommended; R4 rejected and replaced by the one-requirement-one-release rule. Implemented same day: 4 closes, 7 requirements split and closed, 5 new requirements filed, rule folded into requirement authoring |
| [The blockers list — work only your hands can do](2026-08-15-blockers-list/) | 2026-08-15 | Session framework | [#162](https://github.com/jwildfire/obot.roadmap/discussions/162) | **Decided 2026-08-15** — BL1–BL4 all adopted ("BL1-4 look good. Recommendations approved.", in chat); guards + capture script implemented same day, read path filed as follow-up |
| [How to interview @jwildfire — the elicitation method](2026-08-15-app-elicitation-method/) | 2026-08-15 | [#79](https://github.com/jwildfire/obot.roadmap/issues/79) | [#159](https://github.com/jwildfire/obot.roadmap/discussions/159) | **Decided 2026-08-15** (D0008.1–.4) — all four calls left standing as recommended in the local Operations Dashboard ("sounds good. let's try it."): build things for him to correct first then ask targeted questions, small rounds per short sitting, the record published on this site, and the agent writes the ratified goal statement once he approves it. The `/grill-me` skill already shipped with exactly those defaults, so nothing needed amending. Follow-through filed under [#79](https://github.com/jwildfire/obot.roadmap/issues/79) (milestone 2026q3): [#192](https://github.com/jwildfire/obot.roadmap/issues/192) builds the prep artifacts, [#193](https://github.com/jwildfire/obot.roadmap/issues/193) runs the sittings and ratifies the goal |
| [Which repos are operational, which are clinical](2026-08-15-operational-clinical-classification/) | 2026-08-15 | [#73](https://github.com/jwildfire/obot.roadmap/issues/73) | [#160](https://github.com/jwildfire/obot.roadmap/discussions/160) | Decided 2026-08-15 (D0009.1–.4) — open.csr + open.gismo clinical, **demo-301 clinical (his override**, converts to operational if it becomes a plain template), class field in policy.json ([obot.agent#108](https://github.com/jwildfire/obot.agent/pull/108)); plus: retire safety-histogram (archived, deletion at the gate) |
| [The session model after obot-prime — five calls](2026-08-15-post-session-model/) | 2026-08-15 | session framework | [#158](https://github.com/jwildfire/obot.roadmap/discussions/158) | **Decided 2026-08-16** — M1–M5 (D0007.1–.5) all adopted as recommended in the local Operations Dashboard, then closed out the next morning at his instruction ("I thought I asked for D2/7/14/15/16 to all be closed."). Two dated entries, not one: recording only the closure would delete a decision he actually made. What he adopted: the seventeen-concept disposition, with one retirement and five re-homings; a content-gated morning fold at 07:00 replacing the wrapup's trigger, with a phone push reserved for two urgent classes; a daily briefing that is the queue he wakes to rather than a report of the day he lived; a weekly whose job is to keep the daily short; and audio held until the text briefing has usage to answer it. Filed 2026-08-17 so an adopted decision does not sit with nothing beneath it — [#238](https://github.com/jwildfire/obot.roadmap/issues/238) the fold and briefing, [#239](https://github.com/jwildfire/obot.roadmap/issues/239) the weekly, [#240](https://github.com/jwildfire/obot.roadmap/issues/240) the retirement and re-homing notes, [#242](https://github.com/jwildfire/obot.roadmap/issues/242) audio, carrying the finding from his own Spotify link that the only road into the app he listens in puts another model between our words and his ears. The page also says honestly what practice has and has not already done, because an adopted decision recorded as more finished than it is would be the same failure in the other direction: of the five wrapup duties the decision re-homed, hygiene has half moved (the merge tool refuses a merge whose issues carry no milestone; board and stage placement is still repaired in batches), and verification and hand-off only look moved — the Navigator is genuinely live and checking all seven repositories, but the 16 August wrapup still spawned its own verifier and still wrote its own hand-off. Nothing else on the page exists — no fold at any hour, no briefing page, no weekly machinery, no path to his phone. His answer sat unapplied for nine hours, which is why he had to ask; that gap is [#241](https://github.com/jwildfire/obot.roadmap/issues/241) |
| [Who gets to change the guardrails? One real decision, two rubber stamps](2026-08-14-hub140-one-question/) | 2026-08-14 | [#73](https://github.com/jwildfire/obot.roadmap/issues/73) | [#156](https://github.com/jwildfire/obot.roadmap/discussions/156) | **Decided 2026-08-15** (D0005.1–.3) — all three recommendations approved in chat ("#156 looks good. recommnendations approved."): the merge tool always demands the sign-off flag on a guardrail file, the seven engineering defaults stand, and the tracking issue closes against the v0.4.0 release. Implemented same day in [obot.agent#113](https://github.com/jwildfire/obot.agent/pull/113); [#140](https://github.com/jwildfire/obot.roadmap/issues/140) closed with two live pieces re-filed. **Scope corrected the same day** on the first PR the gate caught ("this isnt an RC or an artifact"): a decision he already recorded can carry a guardrail merge on an operational working branch — his in-session sign-off stays required for released surfaces and clinical repos |
| [obot.agent has no branch to open a release PR from](2026-08-14-obot-agent-rc-shape/) | 2026-08-14 | [#73](https://github.com/jwildfire/obot.roadmap/issues/73) | [#155](https://github.com/jwildfire/obot.roadmap/discussions/155) | Decided 2026-08-15 — **R2 accepted** ([record](https://github.com/jwildfire/obot.roadmap/discussions/155#discussioncomment-18022829)), plus the operational-vs-clinical governing principle; implemented same night (`stable` branch, policy.json, v0.4.0 RC PR) |
| [How prime remembers — context management, six calls](2026-08-14-prime-context-management/) | 2026-08-14 | session framework | [#154](https://github.com/jwildfire/obot.roadmap/discussions/154) | Decided 2026-08-14 — approved; implemented in [obot.agent#91](https://github.com/jwildfire/obot.agent/pull/91) (merged), Navigator requirement [#157](https://github.com/jwildfire/obot.roadmap/issues/157) |
| [The app plan rewrite — four calls to make](2026-08-14-app-plan-rewrite/) | 2026-08-14 | [#79](https://github.com/jwildfire/obot.roadmap/issues/79) | [#149](https://github.com/jwildfire/obot.roadmap/discussions/149) | **Closed 2026-08-16** — A1 and A2 (D0002.1–.2) accepted 2026-08-15; A3 and A4 (D0002.3–.4) never answered and transferred, not dropped. He closed it in the local Operations Dashboard ("I think I'm done with this Decision. Close it out. We'll work on improving the goal separately soon."). The two live questions — what ships in version 1.0 of the safetyGraphics replacement versus what is written down as deferred, and whether the demo study repo becomes the canonical template others fork — move to the app-goal interview, seeded in its prep round [#192](https://github.com/jwildfire/obot.roadmap/issues/192) and made a condition of done in its sittings [#193](https://github.com/jwildfire/obot.roadmap/issues/193); the answers now get recorded where the interview records them rather than back on this closed page. The close also puts on the record what nobody had noticed: A1 and A2's own follow-through never happened — the July plan report carries no supersession header, [#34](https://github.com/jwildfire/obot.roadmap/issues/34) is still open and untouched since 14 August, none of the four surface-anchored requirements was filed, and the goal body still says there is nothing implementation-ready to pick. Recorded 2026-08-17, nine hours after he answered, because nothing applied the answer — the pipeline gap is [#241](https://github.com/jwildfire/obot.roadmap/issues/241) |
| [demo-301's `site` branch — what the fork actually costs](2026-08-14-demo-301-site-size/) | 2026-08-14 | [#79](https://github.com/jwildfire/obot.roadmap/issues/79) | [#150](https://github.com/jwildfire/obot.roadmap/discussions/150) | **Decided 2026-08-15** (D0003.1–.6) — all six calls settled as recommended in the local Operations Dashboard ("I'm good with the recommendations here…"): drop the duplicate root copy, shrink what a fork downloads, bound the branch's growth; not the chart-eviction or orphan-branch options, and not accepting the size as-is. Follow-through filed against [#143](https://github.com/jwildfire/obot.roadmap/issues/143) (milestone 2026q3): [#189](https://github.com/jwildfire/obot.roadmap/issues/189), [#190](https://github.com/jwildfire/obot.roadmap/issues/190), [#191](https://github.com/jwildfire/obot.roadmap/issues/191). The second half of his answer — whether the program keeps GitHub itself as its datastore — is a separate, larger question, filed as a prep topic for the [goal #79 elicitation interview](https://github.com/jwildfire/obot.roadmap/issues/79#issuecomment-5304424574) |
| [The merge lane is not broken — one invocation form is](2026-08-14-merge-lane-classifier-denials/) | 2026-08-14 | [#73](https://github.com/jwildfire/obot.roadmap/issues/73) | — | Decided 2026-08-14 — approved; the permission rule is @jwildfire's edit to make |
