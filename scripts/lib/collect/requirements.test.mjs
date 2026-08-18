// What the requirements collector is allowed to call drift (#254).
//
// The rule this pins: while nothing can write to the board (#252), an open
// requirement with no board Status is a blocked mechanism, not discipline decay.
// Counting it as drift produces a number that climbs on its own every time a
// requirement is filed, and a count that reports drift nobody caused is worse
// than no count — it is indistinguishable from the real thing.
import test from 'node:test';
import assert from 'node:assert/strict';

import { buildRequirements, BOARD_WRITE_BLOCK, boardWritesBlocked } from './requirements.mjs';

const BEFORE = '2026-08-17T06:33:43Z'; // filed before the refusal was measured
const AFTER = '2026-08-18T07:00:00Z';  // filed after it

// A requirement issue in the shape the GraphQL query returns.
const issue = (n, over = {}) => ({
  number: n,
  title: `Requirement: number ${n}`,
  url: `https://github.com/jwildfire/obot.roadmap/issues/${n}`,
  state: 'OPEN',
  body: '',
  updatedAt: '2026-08-18T08:00:00Z',
  createdAt: AFTER,
  milestone: { title: '2026q3' },
  labels: { nodes: [{ name: 'requirement' }] },
  subIssuesSummary: { total: 0, completed: 0 },
  subIssues: { nodes: [] },
  projectItems: { nodes: [] },
  ...over,
});

// On the board, carrying a Status — the shape that makes the field readable.
const staged = (n, status, over = {}) => issue(n, {
  projectItems: { nodes: [{ project: { number: 1 }, fieldValueByName: { name: status } }] },
  ...over,
});

const blocker = (state) => issue(BOARD_WRITE_BLOCK.issue, { state, title: 'Requirement: nobody can write to the board' });
const byNumber = (reqs, n) => reqs.find((r) => r.number === n);

test('an off-board requirement filed under the block is not drift', () => {
  const reqs = buildRequirements([staged(1, 'Development'), blocker('OPEN'), issue(300)]);
  const r = byNumber(reqs, 300);
  assert.equal(r.drift, null, 'nothing could have placed it, so it is not drift');
  assert.ok(r.blocked, 'it is reported as blocked instead');
  assert.equal(r.blocked.filedAfterBlock, true, 'filed after the refusal was measured');
  assert.equal(r.blocked.issue, BOARD_WRITE_BLOCK.issue);
  assert.equal(r.stage, 'Unstaged', 'no stage is invented for an issue that has none');
  assert.equal(r.active, true, 'it stays visible above the fold rather than being hidden');
});

test('the same requirement counts as drift again once the block is lifted', () => {
  const reqs = buildRequirements([staged(1, 'Development'), blocker('CLOSED'), issue(300)]);
  const r = byNumber(reqs, 300);
  assert.equal(r.drift, 'unstaged');
  assert.equal(r.blocked, null);
});

test('a requirement filed before the refusal was measured is blocked but marked as such', () => {
  const reqs = buildRequirements([staged(1, 'Development'), blocker('OPEN'), issue(200, { createdAt: BEFORE })]);
  const r = byNumber(reqs, 200);
  assert.equal(r.drift, null);
  assert.equal(r.blocked.filedAfterBlock, false, 'it may have been missed then — but nothing can place it now');
});

test('the drift count does not climb as requirements are filed under the block', () => {
  const base = [staged(1, 'Development'), blocker('OPEN')];
  const one = buildRequirements([...base, issue(300)]).filter((r) => r.drift).length;
  const five = buildRequirements([...base, issue(300), issue(301), issue(302), issue(303), issue(304)])
    .filter((r) => r.drift).length;
  assert.equal(one, 0);
  assert.equal(five, one, 'five more filings, the same drift count');
});

test('drift the block does not explain is still drift', () => {
  const reqs = buildRequirements([blocker('OPEN'), staged(400, 'Released')]);
  const r = byNumber(reqs, 400);
  assert.equal(r.drift, 'open in Released', 'the board contradicts the issue — that is real, block or no block');
  assert.equal(r.blocked, null);
});

test('a closed requirement is neither drift nor blocked', () => {
  const reqs = buildRequirements([staged(1, 'Development'), blocker('OPEN'), issue(300, { state: 'CLOSED' })]);
  const r = byNumber(reqs, 300);
  assert.equal(r.drift, null);
  assert.equal(r.blocked, null);
});

test('an unreadable board suppresses both — a token that cannot look has no opinion', () => {
  // No issue carries a Status, so the project field is unreadable and the old
  // milestone fallback takes over; nothing here is evidence of anything.
  const reqs = buildRequirements([blocker('OPEN'), issue(300)]);
  const r = byNumber(reqs, 300);
  assert.equal(r.drift, null);
  assert.equal(r.blocked, null);
  assert.notEqual(r.stage, 'Unstaged');
});

test('the block is read from the blocker issue, and defaults to counting drift when it cannot be found', () => {
  assert.equal(boardWritesBlocked([blocker('OPEN')]), true);
  assert.equal(boardWritesBlocked([blocker('CLOSED')]), false);
  assert.equal(boardWritesBlocked([]), false, 'no blocker issue → no excuse; drift is counted');
});

test('an off-board requirement is told apart from one on the board with no Status', () => {
  const onBoardNoStatus = issue(301, {
    projectItems: { nodes: [{ project: { number: 1 }, fieldValueByName: null }] },
  });
  const reqs = buildRequirements([staged(1, 'Development'), blocker('OPEN'), issue(300), onBoardNoStatus]);
  assert.equal(byNumber(reqs, 300).onBoard, false, 'it has no item at all');
  assert.equal(byNumber(reqs, 301).onBoard, true, 'it has an item, and no Status on it');
});
