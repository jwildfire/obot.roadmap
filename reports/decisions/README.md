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

## Index

| Decision | Date | Goal | Discussion | Status |
|---|---|---|---|---|
| [The roadmap page — three directions to react to](2026-08-16-roadmap-page-directions/) | 2026-08-16 | [#202](https://github.com/jwildfire/obot.roadmap/issues/202) | [#208](https://github.com/jwildfire/obot.roadmap/discussions/208) | Awaiting @jwildfire — R1–R3 (D0018.1–.3): three working redesigns of the roadmap page are live beside the current one ([the queue](https://jwildfire.github.io/obot.roadmap/roadmap-spike/queue.html), [the wire](https://jwildfire.github.io/obot.roadmap/roadmap-spike/wire.html), [the board](https://jwildfire.github.io/obot.roadmap/roadmap-spike/board.html)); recommendation: the queue as the front page, the wire one click behind, the board's NOW panel absorbed as a strip, the current page kept as the catalog |
| [The Navigator — how the operating officer works](2026-08-16-navigator-design/) | 2026-08-16 | [#73](https://github.com/jwildfire/obot.roadmap/issues/73) | [#197](https://github.com/jwildfire/obot.roadmap/discussions/197) | **Decided 2026-08-16** — N1–N8 (D0017.1–.8) all adopted as recommended in chat ("I'm good with D0017 recommendations. Implement. Let me know when the agent is active."), with one sequencing change accepted alongside them: the disagreement between the nightly audit and the wrapup verifier is resolved before the four new audit checks ship. The queued ask — the Operations Dashboard sessions page listing every agent with its identifier, status, cost and roadmap impact — becomes a requirement of its own rather than part of this decision, filed as [#199](https://github.com/jwildfire/obot.roadmap/issues/199). Implemented the same morning: the disagreement resolved (neither check was wrong — the audit had not run, and its day-old total was relayed as that morning's board state), the Navigator live as job `b510658b` ([obot.agent#135](https://github.com/jwildfire/obot.agent/pull/135)), and the checks shipped across all seven repos ([obot.agent#137](https://github.com/jwildfire/obot.agent/pull/137), under requirement [#200](https://github.com/jwildfire/obot.roadmap/issues/200)) — three checks, not four, since one was already live. Original recommendation, unchanged: the consolidated design for the operating-officer agent — what the session is, what it owns, what it decides alone, what it escalates, and what it must never touch. Folds in the worker-closeout (D0015) and supervision (D0016) questions at his request for one document. Recommends: the role is a builder that improves operations (templates, dashboards, the audit framework), not a clerk; requirement before worker with the concierge out of the filing business; plan-repair allowed and work-repair never; the separate supervisor folds in; day one ships the four audit checks that missed last night |
| [Who watches the workers](2026-08-15-worker-supervision/) | 2026-08-15 | [#73](https://github.com/jwildfire/obot.roadmap/issues/73) | [#187](https://github.com/jwildfire/obot.roadmap/discussions/187) | **Folded into [D0017](2026-08-16-navigator-design/)** — its questions are carried forward into the consolidated Navigator design at @jwildfire's request (2026-08-16); answer there. Original recommendation, unchanged: F1–F7 (D0016.1–.7): add the supervisor role, but as eyes in the scheduled sweep plus a first mate that wakes on a detection — not as a fourth standing session; scheduled sessions are not delayed by it |
| [Workers that finish into nothing](2026-08-15-worker-closeout-check/) | 2026-08-15 | [#73](https://github.com/jwildfire/obot.roadmap/issues/73) | [#188](https://github.com/jwildfire/obot.roadmap/discussions/188) | **Folded into [D0017](2026-08-16-navigator-design/)** — its questions are carried forward into the consolidated Navigator design at @jwildfire's request (2026-08-16); answer there. Original recommendation, unchanged: W1–W4 (D0015.1–.4): the worker closeout contract (every worker finishes into a release PR, a question, or a config request), how the Navigator detects a closeout, and how to attribute a change to an agent when every write carries the same bot identity |
| [Scheduled sessions: go, after three fixes](2026-08-15-scheduled-sessions-readiness/) | 2026-08-15 | [#73](https://github.com/jwildfire/obot.roadmap/issues/73) | [#183](https://github.com/jwildfire/obot.roadmap/discussions/183) | Awaiting @jwildfire — S1–S4 (D0014.1–.4): go recommended, gated on three fixes + one supervised rehearsal. **Corrected 2026-08-16** — the permission-denial that justified the fourth fix did not reproduce for any of four agents and is withdrawn on the page (struck through, not deleted); the work it described as blocked merged overnight, and with it a gate that forces @jwildfire's sign-off on every future guardrail change. S2 now asks a smaller question |
| [Siblings stay — the two delegation lanes under obot-prime](2026-08-15-delegation-lanes/) | 2026-08-15 | Session framework | — (decided in chat) | **Decided 2026-08-15** — keep the current model: siblings for deliverable work, in-conversation subagents for answer-only research; the one-line routing rule shipped the same day into the session-prime and session-spawn skills |
| [Recording your decisions — in-doc, a derived log, and the "approve" button](2026-08-15-decision-recording/) | 2026-08-15 | Session framework | — (decided in chat) | **Decided 2026-08-15** — Decisions-section rule plus all three calls adopted ("I'm good with recs in …", in chat). Implemented same day: the [derived Decisions log](https://jwildfire.github.io/obot.roadmap/decisions/) is live and the deploy fails on an unrecorded decision; the local click-to-decide surface is [requirement #180](https://github.com/jwildfire/obot.roadmap/issues/180) |
| [The roadmap audit audits itself](2026-08-15-roadmap-audit/) | 2026-08-15 | roadmap audit [#92](https://github.com/jwildfire/obot.roadmap/issues/92) | [#163](https://github.com/jwildfire/obot.roadmap/discussions/163) | **Decided 2026-08-15** — six of seven adopted as recommended; R4 rejected and replaced by the one-requirement-one-release rule. Implemented same day: 4 closes, 7 requirements split and closed, 5 new requirements filed, rule folded into requirement authoring |
| [The blockers list — work only your hands can do](2026-08-15-blockers-list/) | 2026-08-15 | Session framework | [#162](https://github.com/jwildfire/obot.roadmap/discussions/162) | **Decided 2026-08-15** — BL1–BL4 all adopted ("BL1-4 look good. Recommendations approved.", in chat); guards + capture script implemented same day, read path filed as follow-up |
| [How to interview @jwildfire — the elicitation method](2026-08-15-app-elicitation-method/) | 2026-08-15 | [#79](https://github.com/jwildfire/obot.roadmap/issues/79) | [#159](https://github.com/jwildfire/obot.roadmap/discussions/159) | **Decided 2026-08-15** (D0008.1–.4) — all four calls left standing as recommended in the local Operations Dashboard ("sounds good. let's try it."): build things for him to correct first then ask targeted questions, small rounds per short sitting, the record published on this site, and the agent writes the ratified goal statement once he approves it. The `/grill-me` skill already shipped with exactly those defaults, so nothing needed amending. Follow-through filed under [#79](https://github.com/jwildfire/obot.roadmap/issues/79) (milestone 2026q3): [#192](https://github.com/jwildfire/obot.roadmap/issues/192) builds the prep artifacts, [#193](https://github.com/jwildfire/obot.roadmap/issues/193) runs the sittings and ratifies the goal |
| [Which repos are operational, which are clinical](2026-08-15-operational-clinical-classification/) | 2026-08-15 | [#73](https://github.com/jwildfire/obot.roadmap/issues/73) | [#160](https://github.com/jwildfire/obot.roadmap/discussions/160) | Decided 2026-08-15 (D0009.1–.4) — open.csr + open.gismo clinical, **demo-301 clinical (his override**, converts to operational if it becomes a plain template), class field in policy.json ([obot.agent#108](https://github.com/jwildfire/obot.agent/pull/108)); plus: retire safety-histogram (archived, deletion at the gate) |
| [The session model after obot-prime — five calls](2026-08-15-post-session-model/) | 2026-08-15 | session framework | [#158](https://github.com/jwildfire/obot.roadmap/discussions/158) | Awaiting @jwildfire — M1–M5 |
| [Who gets to change the guardrails? One real decision, two rubber stamps](2026-08-14-hub140-one-question/) | 2026-08-14 | [#73](https://github.com/jwildfire/obot.roadmap/issues/73) | [#156](https://github.com/jwildfire/obot.roadmap/discussions/156) | **Decided 2026-08-15** (D0005.1–.3) — all three recommendations approved in chat ("#156 looks good. recommnendations approved."): the merge tool always demands the sign-off flag on a guardrail file, the seven engineering defaults stand, and the tracking issue closes against the v0.4.0 release. Implemented same day in [obot.agent#113](https://github.com/jwildfire/obot.agent/pull/113); [#140](https://github.com/jwildfire/obot.roadmap/issues/140) closed with two live pieces re-filed. **Scope corrected the same day** on the first PR the gate caught ("this isnt an RC or an artifact"): a decision he already recorded can carry a guardrail merge on an operational working branch — his in-session sign-off stays required for released surfaces and clinical repos |
| [obot.agent has no branch to open a release PR from](2026-08-14-obot-agent-rc-shape/) | 2026-08-14 | [#73](https://github.com/jwildfire/obot.roadmap/issues/73) | [#155](https://github.com/jwildfire/obot.roadmap/discussions/155) | Decided 2026-08-15 — **R2 accepted** ([record](https://github.com/jwildfire/obot.roadmap/discussions/155#discussioncomment-18022829)), plus the operational-vs-clinical governing principle; implemented same night (`stable` branch, policy.json, v0.4.0 RC PR) |
| [How prime remembers — context management, six calls](2026-08-14-prime-context-management/) | 2026-08-14 | session framework | [#154](https://github.com/jwildfire/obot.roadmap/discussions/154) | Decided 2026-08-14 — approved; implemented in [obot.agent#91](https://github.com/jwildfire/obot.agent/pull/91) (merged), Navigator requirement [#157](https://github.com/jwildfire/obot.roadmap/issues/157) |
| [The app plan rewrite — four calls to make](2026-08-14-app-plan-rewrite/) | 2026-08-14 | [#79](https://github.com/jwildfire/obot.roadmap/issues/79) | [#149](https://github.com/jwildfire/obot.roadmap/discussions/149) | Partially decided 2026-08-15 — A1–A2 accepted; A3–A4 held open pending goal-#79 elicitation |
| [demo-301's `site` branch — what the fork actually costs](2026-08-14-demo-301-site-size/) | 2026-08-14 | [#79](https://github.com/jwildfire/obot.roadmap/issues/79) | [#150](https://github.com/jwildfire/obot.roadmap/discussions/150) | **Decided 2026-08-15** (D0003.1–.6) — all six calls settled as recommended in the local Operations Dashboard ("I'm good with the recommendations here…"): drop the duplicate root copy, shrink what a fork downloads, bound the branch's growth; not the chart-eviction or orphan-branch options, and not accepting the size as-is. Follow-through filed against [#143](https://github.com/jwildfire/obot.roadmap/issues/143) (milestone 2026q3): [#189](https://github.com/jwildfire/obot.roadmap/issues/189), [#190](https://github.com/jwildfire/obot.roadmap/issues/190), [#191](https://github.com/jwildfire/obot.roadmap/issues/191). The second half of his answer — whether the program keeps GitHub itself as its datastore — is a separate, larger question, filed as a prep topic for the [goal #79 elicitation interview](https://github.com/jwildfire/obot.roadmap/issues/79#issuecomment-5304424574) |
| [The merge lane is not broken — one invocation form is](2026-08-14-merge-lane-classifier-denials/) | 2026-08-14 | [#73](https://github.com/jwildfire/obot.roadmap/issues/73) | — | Decided 2026-08-14 — approved; the permission rule is @jwildfire's edit to make |
