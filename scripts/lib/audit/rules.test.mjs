// node --test scripts/lib/audit/
//
// The rules are pure functions of a snapshot, so they are testable without the
// API — which is the point of keeping every fetch in snapshot.mjs. These fixtures
// are the real shapes the audit found on 2026-07-24 (a closed requirement parked
// in Development, open requirements the board calls Released, a closed parent with
// open sub-issues), plus the cases that must NOT fire.
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { RULES, RULE_BY_ID, hardWrapped } from './rules.mjs';
import { boardIndex, parentIndex, CONTROL_LABELS } from './snapshot.mjs';
import { runRules, reconcile, fingerprint, MUTE_DAYS } from './engine.mjs';

const HUB = 'jwildfire/obot.roadmap';
const NOW = new Date('2026-07-25T04:00:00Z');
const ago = (d) => new Date(NOW.getTime() - d * 86400000).toISOString();

function issue(number, over = {}) {
  return {
    nodeId: `I_${number}`,
    repo: HUB,
    number,
    title: `Requirement: thing ${number}`,
    url: `https://github.com/${HUB}/issues/${number}`,
    state: 'OPEN',
    stateReason: null,
    body: '### Business Requirement\nWhy.\n\n### Design\nA design long enough that the DESIGN-MISSING rule is satisfied by it, because the rule only fires under 120 characters of prose.\n',
    author: 'jwildfire',
    labels: ['requirement'],
    milestone: '2026q3',
    assignees: ['jwildfire'],
    subIssues: [],
    subSummary: { total: 0, completed: 0 },
    createdAt: ago(30),
    updatedAt: ago(1),
    closedAt: null,
    ...over,
  };
}

function item(number, status, over = {}) {
  return {
    itemId: `PVTI_${number}${status ?? 'none'}`,
    status,
    statusOptionId: status ? `opt_${status}` : null,
    type: 'Issue',
    repo: HUB,
    number,
    title: `Requirement: thing ${number}`,
    url: `https://github.com/${HUB}/issues/${number}`,
    contentState: 'OPEN',
    ...over,
  };
}

function snapshot({ issues = [], items = [], open = [], merged = [], ideas = [], design = [], boardReadable = true } = {}) {
  return {
    now: NOW,
    hub: HUB,
    repos: [HUB],
    issues,
    board: { readable: boardReadable, project: { id: 'P_1' }, statusField: { id: 'F_1', options: [] }, items },
    prs: { open, merged },
    ideas,
    designDocs: new Set(design),
    issueByNumber: new Map(issues.map((i) => [i.number, i])),
    boardByKey: boardIndex(items),
    parentOf: parentIndex(issues),
  };
}

const fire = (ruleId, snap) => RULE_BY_ID.get(ruleId).check(snap);

// ------------------------------------------------------------ board integrity
test('CLOSED-NOT-RELEASED: closed issue parked in Development', () => {
  const snap = snapshot({
    issues: [issue(46, { state: 'CLOSED', closedAt: ago(3) })],
    items: [item(46, 'Development', { contentState: 'CLOSED' })],
  });
  const [f] = fire('CLOSED-NOT-RELEASED', snap);
  assert.equal(f.confidence, 'high');
  assert.equal(f.proposal.ops[0].op, 'set-board-status');
  assert.equal(f.proposal.ops[0].value, 'Released');
  assert.equal(f.proposal.ops[0].itemId, 'PVTI_46Development');
});

test('CLOSED-NOT-RELEASED: stays quiet when the board already says Released', () => {
  const snap = snapshot({
    issues: [issue(46, { state: 'CLOSED' })],
    items: [item(46, 'Released', { contentState: 'CLOSED' })],
  });
  assert.equal(fire('CLOSED-NOT-RELEASED', snap).length, 0);
});

test('OPEN-IN-RELEASED: shipped-but-unclosed proposes the close, sure only when old', () => {
  const near = snapshot({ issues: [issue(2, { updatedAt: ago(14) })], items: [item(2, 'Released')] });
  const [a] = fire('OPEN-IN-RELEASED', near);
  assert.equal(a.confidence, 'medium');
  assert.equal(a.proposal.ops[0].op, 'close-issue');

  const old = snapshot({ issues: [issue(2, { updatedAt: ago(60) })], items: [item(2, 'Released')] });
  assert.equal(fire('OPEN-IN-RELEASED', old)[0].confidence, 'high');
});

test('OPEN-IN-RELEASED: open sub-issues mean it spans two releases — propose the split, not a stage move', () => {
  const parent = issue(21, {
    subIssues: [{ repo: 'jwildfire/safety.viz', number: 9, title: 'sub', url: 'u', state: 'OPEN' }],
    subSummary: { total: 1, completed: 0 },
    updatedAt: ago(40),
  });
  const [f] = fire('OPEN-IN-RELEASED', snapshot({ issues: [parent], items: [item(21, 'Released')] }));
  // one requirement, one release (@jwildfire 2026-08-15): the delivered scope really did
  // ship, so this is a split, not a walk back to Review.
  assert.equal(f.proposal.kind, 'agentic');
  assert.equal(f.proposal.ops, undefined);
  assert.match(f.proposal.summary, /Split it/);
  assert.match(f.proposal.prompt, /TRANSFER the deferred sub-issues/);
  assert.match(f.proposal.prompt, /jwildfire\/safety\.viz#9/);
});

test('OPEN-IN-RELEASED: no escape hatch — a phased marker in the body does not silence it', () => {
  // R4-a proposed honouring a `phased` label or a stays-open marker. @jwildfire rejected it:
  // a hatch would restore exactly the ambiguity that made this rule marginal.
  const marked = issue(35, {
    body: 'Phase 1 shipped. <!-- stays-open: phase 2 pending -->',
    labels: ['requirement', 'phased'],
    updatedAt: ago(60),
  });
  const found = fire('OPEN-IN-RELEASED', snapshot({ issues: [marked], items: [item(35, 'Released')] }));
  assert.equal(found.length, 1);
  assert.equal(found[0].proposal.ops[0].op, 'close-issue');
});

test('UNSTAGED-BOARD-ITEM: closed → Released at high confidence, open → inferred', () => {
  const snap = snapshot({
    issues: [issue(70), issue(71, { state: 'CLOSED' })],
    items: [item(70, null), item(71, null, { contentState: 'CLOSED' })],
    design: [70],
  });
  const found = fire('UNSTAGED-BOARD-ITEM', snap);
  const closed = found.find((f) => f.subject.number === 71);
  const openOne = found.find((f) => f.subject.number === 70);
  assert.equal(closed.confidence, 'high');
  assert.equal(closed.proposal.ops[0].value, 'Released');
  assert.equal(openOne.confidence, 'medium');
  assert.equal(openOne.proposal.ops[0].value, 'Design'); // a design doc exists for #70
});

test('OFF-BOARD-REQUIREMENT: a requirement with no board item is added, goals are left alone', () => {
  const snap = snapshot({ issues: [issue(69), issue(78, { labels: ['goal'], title: 'Goal: charts' })] });
  const found = fire('OFF-BOARD-REQUIREMENT', snap);
  assert.deepEqual(found.map((f) => f.subject.number), [69]);
  assert.equal(found[0].proposal.ops[0].op, 'add-to-board');
});

test('BOARD-DUPLICATE: keeps the item carrying a Status, removes the rest', () => {
  const snap = snapshot({ issues: [issue(53)], items: [item(53, null), item(53, 'Development')] });
  const [f] = fire('BOARD-DUPLICATE', snap);
  assert.equal(f.confidence, 'high');
  assert.equal(f.proposal.ops.length, 1);
  assert.equal(f.proposal.ops[0].itemId, 'PVTI_53none');
});

// ------------------------------------------------------------------ hierarchy
test('CLOSED-PARENT-OPEN-SUBS: agentic when the remaining scope is real', () => {
  const parent = issue(17, {
    state: 'CLOSED',
    stateReason: 'COMPLETED',
    subIssues: [
      { repo: 'jwildfire/obot.agent', number: 14, title: 'a', url: 'u', state: 'OPEN' },
      { repo: 'jwildfire/obot.agent', number: 15, title: 'b', url: 'u', state: 'OPEN' },
    ],
    subSummary: { total: 2, completed: 0 },
  });
  const [f] = fire('CLOSED-PARENT-OPEN-SUBS', snapshot({ issues: [parent] }));
  assert.equal(f.confidence, 'medium');
  assert.equal(f.proposal.kind, 'agentic');
  assert.match(f.proposal.prompt, /obot\.agent#14/);
});

test('CLOSED-PARENT-OPEN-SUBS: mechanical when every open sub already has a merged PR', () => {
  const parent = issue(30, {
    state: 'CLOSED',
    subIssues: [{ repo: 'jwildfire/safety.viz', number: 45, title: 'a', url: 'u', state: 'OPEN' }],
    subSummary: { total: 1, completed: 0 },
  });
  const merged = [{
    repo: 'jwildfire/safety.viz', number: 100, title: 'pr', url: 'u', isDraft: false, merged: true,
    author: 'jwildfire', base: 'dev', reviewDecision: null, labels: [], body: '', createdAt: ago(6),
    updatedAt: ago(5), mergedAt: ago(5), hubRefs: [],
    closes: [{ repo: 'jwildfire/safety.viz', number: 45, title: 'a', url: 'u', state: 'OPEN' }],
  }];
  const [f] = fire('CLOSED-PARENT-OPEN-SUBS', snapshot({ issues: [parent], merged }));
  assert.equal(f.confidence, 'high');
  assert.equal(f.proposal.ops[0].op, 'close-issue');
});

test('SUBS-DONE-PARENT-OPEN: Review + all subs closed proposes closing it', () => {
  const parent = issue(43, { subSummary: { total: 3, completed: 3 }, updatedAt: ago(2) });
  const inReview = snapshot({ issues: [parent], items: [item(43, 'Review')] });
  const ops = fire('SUBS-DONE-PARENT-OPEN', inReview)[0].proposal.ops.map((o) => o.op);
  assert.deepEqual(ops, ['close-issue', 'set-board-status']);

  const earlier = snapshot({ issues: [parent], items: [item(43, 'Development')] });
  const [f] = fire('SUBS-DONE-PARENT-OPEN', earlier);
  assert.equal(f.proposal.ops[0].value, 'Review');
});

// R1-a made STALLED-IN-FLIGHT mechanical, which put it in direct conflict with
// SUBS-DONE-PARENT-OPEN: on 2026-08-15 both fired on #43 and #129 and proposed
// opposite stage moves (park to Backlog vs promote to Review/close). Two
// mechanical rules disagreeing about one issue makes the nightly apply order
// decide the board, which is exactly the nondeterminism the audit exists to
// remove. One rule owns one situation — the same precedent OPEN-IN-RELEASED
// already sets for the Released stage.
test('STALLED-IN-FLIGHT: yields to SUBS-DONE-PARENT-OPEN when every sub-issue is closed', () => {
  const finished = issue(43, {
    updatedAt: ago(23),
    subIssues: [{ repo: HUB, number: 44, title: 't', url: 'u', state: 'CLOSED' }],
    subSummary: { total: 1, completed: 1 },
  });
  const quiet = issue(22, { updatedAt: ago(32) });
  const snap = snapshot({
    issues: [finished, quiet],
    items: [item(43, 'Review'), item(22, 'Development')],
  });
  assert.deepEqual(
    fire('STALLED-IN-FLIGHT', snap).map((f) => f.subject.number),
    [22],
    'an issue whose tasks are all done is finished, not stalled — the other rule owns it',
  );
  assert.deepEqual(
    fire('SUBS-DONE-PARENT-OPEN', snap).map((f) => f.subject.number),
    [43],
    'and that rule still fires on it, so the situation is not lost',
  );
});

test('GOALLESS-REQUIREMENT: a requirement under a goal does not fire', () => {
  const goal = issue(78, {
    labels: ['goal'],
    title: 'Goal: charts',
    subIssues: [{ repo: HUB, number: 35, title: 'r', url: 'u', state: 'OPEN' }],
    subSummary: { total: 1, completed: 0 },
  });
  const snap = snapshot({ issues: [goal, issue(35), issue(36)] });
  const found = fire('GOALLESS-REQUIREMENT', snap);
  assert.deepEqual(found.map((f) => f.subject.number), [36]);
});

// Requirement-under-requirement nesting is legitimate and common: #122 sits under
// #18 which sits under goal #73, and #131 under #130 under goal #112. Checking
// only the direct parent called both of those goalless — two false positives out
// of three findings on 2026-08-15, each one landing in front of @jwildfire. The
// goal is reachable, just not in one hop.
test('GOALLESS-REQUIREMENT: a requirement whose goal is reachable through another requirement does not fire', () => {
  const goal = issue(73, {
    labels: ['goal'],
    title: 'Goal: autonomy',
    subIssues: [{ repo: HUB, number: 18, title: 'r', url: 'u', state: 'OPEN' }],
    subSummary: { total: 1, completed: 0 },
  });
  const middle = issue(18, {
    subIssues: [{ repo: HUB, number: 122, title: 'r', url: 'u', state: 'OPEN' }],
    subSummary: { total: 1, completed: 0 },
  });
  const snap = snapshot({ issues: [goal, middle, issue(122), issue(140)] });
  assert.deepEqual(
    fire('GOALLESS-REQUIREMENT', snap).map((f) => f.subject.number),
    [140],
    'only the requirement with no goal ancestor at any depth is goalless',
  );
});

// The walk is over GitHub data, not a tree we control, so a parent cycle must
// terminate rather than hang the whole audit.
test('GOALLESS-REQUIREMENT: a parent cycle terminates instead of hanging', () => {
  const a = issue(200, {
    subIssues: [{ repo: HUB, number: 201, title: 'r', url: 'u', state: 'OPEN' }],
    subSummary: { total: 1, completed: 0 },
  });
  const b = issue(201, {
    subIssues: [{ repo: HUB, number: 200, title: 'r', url: 'u', state: 'OPEN' }],
    subSummary: { total: 1, completed: 0 },
  });
  const snap = snapshot({ issues: [a, b] });
  assert.deepEqual(fire('GOALLESS-REQUIREMENT', snap).map((f) => f.subject.number), [200, 201]);
});

// The audit must not audit its own control plane: a decision issue is unlabelled,
// parentless and off the board by design, so UNTRACKED-TASK would flag every
// accept click. Caught live on decision #100.
test('control-plane issues are excluded from the snapshot entirely', () => {
  const decision = { id: 'I_100', number: 100, title: 'audit: accept 5 findings',
    labels: { nodes: [{ name: 'audit-decision' }] } };
  const real = { id: 'I_81', number: 81, title: 'Close out the fork', labels: { nodes: [] } };
  assert.deepEqual(
    [decision, real].filter((i) => !i.labels.nodes.some((l) => CONTROL_LABELS.includes(l.name))).map((i) => i.number),
    [81],
    'audit-decision issues must never reach the rules',
  );
  assert.ok(CONTROL_LABELS.includes('audit-decision'));
});

test('UNTRACKED-TASK: unlabelled, unparented, off-board issues only', () => {
  const parented = issue(66, { labels: [], title: 'task' });
  const goal = issue(78, {
    labels: ['goal'],
    subIssues: [{ repo: HUB, number: 66, title: 'task', url: 'u', state: 'OPEN' }],
    subSummary: { total: 1, completed: 0 },
  });
  const orphan = issue(81, { labels: [], title: 'Close out the fork' });
  const onBoard = issue(82, { labels: [], title: 'on the board' });
  const snap = snapshot({ issues: [goal, parented, orphan, onBoard], items: [item(82, 'Backlog')] });
  assert.deepEqual(fire('UNTRACKED-TASK', snap).map((f) => f.subject.number), [81]);
});

// -------------------------------------------------------------------- linkage
test('MERGED-PR-OPEN-TARGET: fires for a task, never for a requirement', () => {
  const pr = (closesNumber, repo) => ({
    repo, number: 108, title: 'pr', url: 'u', isDraft: false, merged: true, author: 'jwildfire',
    base: 'dev', reviewDecision: null, labels: [], body: '', createdAt: ago(9), updatedAt: ago(8),
    mergedAt: ago(8), hubRefs: [], closes: [{ repo: HUB, number: closesNumber, title: 't', url: 'u', state: 'OPEN' }],
  });
  const task = issue(81, { labels: [] });
  const req = issue(45);
  const snap = snapshot({ issues: [task, req], merged: [pr(81, 'jwildfire/safety.viz'), pr(45, 'jwildfire/safety.viz')] });
  const found = fire('MERGED-PR-OPEN-TARGET', snap);
  assert.deepEqual(found.map((f) => f.subject.number), [81]);
  assert.equal(found[0].confidence, 'high');
});

test('MERGED-PR-OPEN-TARGET: respects the auto-close grace window', () => {
  const fresh = {
    repo: 'jwildfire/safety.viz', number: 109, title: 'pr', url: 'u', isDraft: false, merged: true,
    author: 'jwildfire', base: 'dev', reviewDecision: null, labels: [], body: '', createdAt: ago(1),
    updatedAt: ago(0.5), mergedAt: new Date(NOW.getTime() - 3600_000).toISOString(), hubRefs: [],
    closes: [{ repo: HUB, number: 81, title: 't', url: 'u', state: 'OPEN' }],
  };
  assert.equal(fire('MERGED-PR-OPEN-TARGET', snapshot({ issues: [issue(81, { labels: [] })], merged: [fresh] })).length, 0);
});

// ---------------------------------------------------------------- conventions
test('REQUIREMENT-LABEL-MISSING: title says Requirement, label does not', () => {
  const snap = snapshot({ issues: [issue(90, { labels: ['ai'] })] });
  const [f] = fire('REQUIREMENT-LABEL-MISSING', snap);
  assert.equal(f.proposal.ops[0].name, 'requirement');
});

test('ASSIGNEE-MISSING: open tracked issues only', () => {
  const snap = snapshot({
    issues: [
      issue(9, { assignees: [] }),
      issue(8, { assignees: [], state: 'CLOSED' }),
      issue(7, { assignees: [], labels: [] }),
    ],
  });
  assert.deepEqual(fire('ASSIGNEE-MISSING', snap).map((f) => f.subject.number), [9]);
});

test('DESIGN-MISSING: a stub Design section past the Design gate', () => {
  const stub = issue(25, { body: '### Business Requirement\nWhy.\n\n### Design\nTBD.\n' });
  const snap = snapshot({ issues: [stub], items: [item(25, 'Development')] });
  assert.equal(fire('DESIGN-MISSING', snap).length, 1);

  const withDoc = snapshot({ issues: [stub], items: [item(25, 'Development')], design: [25] });
  assert.equal(fire('DESIGN-MISSING', withDoc).length, 0);
});

test('PROMOTED-IDEA-OPEN: promoted thread still open, excluding the pinned explainer', () => {
  const idea = (number, promotedTo) => ({
    nodeId: `D_${number}`, number, title: 'idea', url: 'u', author: 'jwildfire',
    createdAt: ago(3), updatedAt: ago(1), closed: false, closedAt: null, stateReason: null, promotedTo,
  });
  const snap = snapshot({ issues: [issue(77)], ideas: [idea(76, 77), idea(47, 77), idea(80, null)] });
  const found = fire('PROMOTED-IDEA-OPEN', snap);
  assert.deepEqual(found.map((f) => f.subject.number), [76]);
  assert.equal(found[0].proposal.ops[0].op, 'close-discussion');
});

test('STALLED-IN-FLIGHT: an open PR means it is not stalled', () => {
  const req = issue(29, { updatedAt: ago(30) });
  const stalled = snapshot({ issues: [req], items: [item(29, 'Development')] });
  assert.equal(fire('STALLED-IN-FLIGHT', stalled).length, 1);

  const pr = {
    repo: 'jwildfire/safety.viz', number: 99, title: 'pr', url: 'u', isDraft: true, merged: false,
    author: 'jwildfire', base: 'dev', reviewDecision: null, labels: [], body: '', createdAt: ago(4),
    updatedAt: ago(1), mergedAt: null, hubRefs: [29], closes: [],
  };
  const moving = snapshot({ issues: [req], items: [item(29, 'Development')], open: [pr] });
  assert.equal(fire('STALLED-IN-FLIGHT', moving).length, 0);
});

test('STALLED-IN-FLIGHT: parks the item automatically instead of asking why it stalled', () => {
  // R1-a (@jwildfire, 2026-08-15): a rule that ends in a question re-fires every night.
  const req = issue(29, { updatedAt: ago(30) });
  const [f] = fire('STALLED-IN-FLIGHT', snapshot({ issues: [req], items: [item(29, 'Development')] }));
  assert.equal(f.proposal.kind, 'mechanical');
  assert.equal(f.proposal.ops[0].op, 'set-board-status');
  assert.equal(f.proposal.ops[0].value, 'Backlog');
});

test('GOAL-BOARD-INCONSISTENT: every goal on the board comes off it, one finding each', () => {
  // R3-a (@jwildfire, 2026-08-15): goals are not board items. The rule enforces the
  // convention per goal rather than comparing goals against each other and asking.
  const onBoard = issue(72, { labels: ['goal'], title: 'Goal: keynote' });
  const alsoOn = issue(73, { labels: ['goal'], title: 'Goal: autonomy' });
  const offBoard = issue(78, { labels: ['goal'], title: 'Goal: charts' });
  const snap = snapshot({
    issues: [onBoard, alsoOn, offBoard],
    items: [item(72, 'Backlog'), item(73, 'Development')],
  });
  const found = fire('GOAL-BOARD-INCONSISTENT', snap);
  assert.deepEqual(found.map((f) => f.subject.number).sort(), [72, 73]);
  for (const f of found) {
    assert.equal(f.confidence, 'high');
    assert.equal(f.proposal.ops[0].op, 'remove-board-item');
  }
});

test('GOAL-BOARD-INCONSISTENT: silent when no goal is on the board', () => {
  const snap = snapshot({ issues: [issue(78, { labels: ['goal'], title: 'Goal: charts' })] });
  assert.equal(fire('GOAL-BOARD-INCONSISTENT', snap).length, 0);
});

test('hardWrapped: catches wrapped prose, spares lists, tables and fences', () => {
  assert.equal(hardWrapped('This is a body that someone wrapped\nat eighty columns because their\neditor told them to and it reads\nragged on GitHub'), true);
  assert.equal(hardWrapped('One line per paragraph, as it should be, however long that line happens to run in the raw markdown.'), false);
  assert.equal(hardWrapped('- a bullet that is short\n- another short bullet\n- a third short bullet\n- a fourth'), false);
  assert.equal(hardWrapped('| a | b |\n| - | - |\n| 1 | 2 |\n| 3 | 4 |'), false);
  assert.equal(hardWrapped('```\nshort\nlines\nin\na\nfence\n```'), false);
});

// ------------------------------------------------------------------- engine
test('board rules are skipped, not silently passed, when the project is unreadable', () => {
  const snap = snapshot({ issues: [issue(46, { state: 'CLOSED' })], boardReadable: false });
  const { rules } = runRules(snap);
  const skipped = rules.filter((r) => r.skipped);
  assert.ok(skipped.length >= 5);
  assert.ok(skipped.every((r) => r.fired === 0));
  assert.match(skipped[0].skipped, /project was unreadable/);
});

// The apply lane's worst possible failure, caught on the first live decision
// (run 30142448481): the re-validation could not read the project, every board
// rule skipped, and five accepted findings were reported as stale — a decision
// silently thrown away. `needs` is what tells the lane the difference between
// "not there" and "could not look", so it has to hold for every board rule.
test('every rule whose findings depend on the board declares needs: board', () => {
  const boardDependent = [
    'CLOSED-NOT-RELEASED', 'OPEN-IN-RELEASED', 'UNSTAGED-BOARD-ITEM',
    'OFF-BOARD-REQUIREMENT', 'BOARD-DUPLICATE', 'GOAL-BOARD-INCONSISTENT',
    'STALLED-IN-FLIGHT',
  ];
  for (const id of boardDependent) {
    assert.equal(RULE_BY_ID.get(id)?.needs, 'board', `${id} must declare needs: 'board'`);
  }
  // …and a rule that reads the board must produce nothing when it cannot.
  const blind = snapshot({
    issues: [issue(46, { state: 'CLOSED' })],
    items: [item(46, 'Development', { contentState: 'CLOSED' })],
    boardReadable: false,
  });
  const { findings, rules } = runRules(blind);
  assert.equal(findings.filter((f) => boardDependent.includes(f.rule)).length, 0);
  for (const id of boardDependent) {
    assert.ok(rules.find((r) => r.id === id)?.skipped, `${id} must report as skipped, not quiet`);
  }
});

test('a rule that throws is reported in its place, and the rest still run', () => {
  const boom = { id: 'BOOM', title: 'boom', group: 'test', why: '', fix: '', check() { throw new Error('kaput'); } };
  const { findings, rules } = runRules(snapshot({ issues: [issue(9, { assignees: [] })] }), {
    rules: [boom, RULE_BY_ID.get('ASSIGNEE-MISSING')],
  });
  assert.equal(rules.find((r) => r.id === 'BOOM').error, 'kaput');
  assert.equal(findings.length, 1);
});

test('reconcile: a rejection mutes the same situation and only for MUTE_DAYS', () => {
  const snap = snapshot({ issues: [issue(9, { assignees: [] })] });
  const { findings } = runRules(snap, { rules: [RULE_BY_ID.get('ASSIGNEE-MISSING')] });
  const f = findings[0];

  const fresh = reconcile(findings, {
    ledger: { decisions: [{ id: f.id, decision: 'reject', at: ago(2), fingerprint: f.fingerprint }] },
    now: NOW,
  });
  assert.equal(fresh.findings[0].muted, true);
  assert.equal(fresh.muted, 1);

  const expired = reconcile(findings, {
    ledger: { decisions: [{ id: f.id, decision: 'reject', at: ago(MUTE_DAYS + 1), fingerprint: f.fingerprint }] },
    now: NOW,
  });
  assert.equal(expired.findings[0].muted, false);

  const changed = reconcile(findings, {
    ledger: { decisions: [{ id: f.id, decision: 'reject', at: ago(2), fingerprint: 'somethingelse' }] },
    now: NOW,
  });
  assert.equal(changed.findings[0].muted, false, 'changed evidence un-mutes the finding');
});

test('reconcile: firstSeen survives runs and an applied fix that comes back is flagged', () => {
  const snap = snapshot({ issues: [issue(9, { assignees: [] })] });
  const { findings } = runRules(snap, { rules: [RULE_BY_ID.get('ASSIGNEE-MISSING')] });
  const prior = { findings: [{ id: findings[0].id, firstSeen: '2026-07-01', runs: 4 }] };
  const out = reconcile(findings, {
    prior,
    ledger: { decisions: [{ id: findings[0].id, decision: 'accept', at: ago(3), outcome: 'applied', fingerprint: findings[0].fingerprint }] },
    now: NOW,
  });
  assert.equal(out.findings[0].firstSeen, '2026-07-01');
  assert.equal(out.findings[0].runs, 5);
  assert.equal(out.findings[0].reappeared, true);
});

test('fingerprint changes with the evidence and nothing else', () => {
  const base = { rule: 'R', subject: { repo: HUB, number: 1 }, evidence: ['a'], proposal: { summary: 's' } };
  assert.equal(fingerprint(base), fingerprint({ ...base }));
  assert.notEqual(fingerprint(base), fingerprint({ ...base, evidence: ['b'] }));
});

test('every rule declares the metadata the dashboard renders', () => {
  for (const rule of RULES) {
    assert.match(rule.id, /^[A-Z][A-Z-]+$/, `${rule.id} is not a SCREAMING-KEBAB id`);
    assert.ok(rule.group?.length > 3, `${rule.id} is missing group`);
    for (const field of ['title', 'why', 'fix']) {
      assert.ok(rule[field]?.length > 10, `${rule.id} is missing ${field}`);
    }
    assert.equal(typeof rule.check, 'function');
  }
  assert.equal(new Set(RULES.map((r) => r.id)).size, RULES.length, 'rule ids must be unique');
});

test('every rule returns findings the engine and executor understand', () => {
  // One snapshot rigged to trip as many rules as possible at once.
  const goal = issue(78, { labels: ['goal'], title: 'Goal: charts', assignees: [], subSummary: { total: 0, completed: 0 } });
  const snap = snapshot({
    issues: [goal, issue(2, { updatedAt: ago(40) }), issue(46, { state: 'CLOSED' }), issue(81, { labels: [] })],
    items: [item(2, 'Released'), item(46, 'Development', { contentState: 'CLOSED' }), item(9, null)],
  });
  const { findings } = runRules(snap);
  assert.ok(findings.length > 5);
  for (const f of findings) {
    assert.ok(['high', 'medium', 'low'].includes(f.confidence), `${f.id} has confidence ${f.confidence}`);
    assert.ok(['mechanical', 'agentic'].includes(f.proposal.kind), `${f.id} has kind ${f.proposal.kind}`);
    assert.ok(f.evidence.length, `${f.id} has no evidence`);
    assert.ok(f.proposal.summary?.length > 10, `${f.id} has no proposal summary`);
    if (f.proposal.kind === 'mechanical') {
      assert.ok(f.proposal.ops.length, `${f.id} is mechanical with no ops`);
      for (const op of f.proposal.ops) assert.ok(op.op && op.label, `${f.id} has a malformed op`);
    } else {
      assert.ok(f.proposal.prompt?.length > 40, `${f.id} is agentic with no usable prompt`);
    }
  }
});
