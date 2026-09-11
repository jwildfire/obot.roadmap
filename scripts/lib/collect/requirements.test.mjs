// What the requirements collector reads as a status, and what it is allowed to
// call drift, now that status is a `status: …` label on the issue (issue contract
// → Status, 2026-09-10). Pinned here with no network so the pages' counts can be
// checked rather than trusted.
import test from 'node:test';
import assert from 'node:assert/strict';

import { buildRequirements, statusesOf, STATUS_LABELS, ACTIVE_STAGES } from './requirements.mjs';

// A requirement issue in the shape the GraphQL query returns.
const issue = (n, over = {}) => ({
  number: n,
  title: `Requirement: number ${n}`,
  url: `https://github.com/jwildfire/obot.roadmap/issues/${n}`,
  state: 'OPEN',
  body: '',
  updatedAt: '2026-09-10T08:00:00Z',
  createdAt: '2026-09-01T00:00:00Z',
  milestone: { title: '2026-10-talk' },
  labels: { nodes: [{ name: 'requirement' }] },
  subIssuesSummary: { total: 0, completed: 0 },
  subIssues: { nodes: [] },
  ...over,
});

// Carrying one or more status labels.
const labelled = (n, statuses, over = {}) => issue(n, {
  labels: { nodes: [{ name: 'requirement' }, ...statuses.map((s) => ({ name: s }))] },
  ...over,
});

const byNumber = (reqs, n) => reqs.find((r) => r.number === n);

test('the five labels map onto the five stages, case-insensitively', () => {
  assert.deepEqual(Object.values(STATUS_LABELS), ['Backlog', 'Ready', 'In session', 'Review', 'Released']);
  assert.deepEqual(statusesOf(labelled(1, ['Status: In Session'])), ['In session']);
  assert.deepEqual(statusesOf(issue(2)), []);
});

test('a labelled requirement is shown under its label, and only the in-flight ones are active', () => {
  const reqs = buildRequirements([
    labelled(1, ['status: backlog']), labelled(2, ['status: ready']),
    labelled(3, ['status: in session']), labelled(4, ['status: review']),
  ]);
  assert.equal(byNumber(reqs, 1).stage, 'Backlog');
  assert.equal(byNumber(reqs, 1).active, false, 'backlog is below the fold');
  for (const n of [2, 3, 4]) {
    assert.ok(ACTIVE_STAGES.includes(byNumber(reqs, n).stage));
    assert.equal(byNumber(reqs, n).active, true);
    assert.equal(byNumber(reqs, n).drift, null);
  }
});

test('an open requirement with no status label is Unstaged, and that is drift', () => {
  const r = byNumber(buildRequirements([issue(300)]), 300);
  assert.equal(r.stage, 'Unstaged', 'no stage is invented for an issue that has none');
  assert.equal(r.status, null);
  assert.equal(r.drift, 'unstaged');
  assert.equal(r.active, true, 'it stays visible above the fold rather than being hidden');
});

test('a closed requirement reads Released whether or not it carries the label', () => {
  const reqs = buildRequirements([issue(1, { state: 'CLOSED' }), labelled(2, ['status: released'], { state: 'CLOSED' })]);
  assert.equal(byNumber(reqs, 1).stage, 'Released');
  assert.equal(byNumber(reqs, 1).drift, null, 'closing is the fact; a missing label on a closed issue is not drift');
  assert.equal(byNumber(reqs, 2).stage, 'Released');
  assert.equal(byNumber(reqs, 2).active, false);
});

test('a requirement closed as not planned reads Retired, not Released, whatever label it kept', () => {
  const reqs = buildRequirements([
    labelled(7, ['status: backlog'], { state: 'CLOSED', stateReason: 'NOT_PLANNED' }),
    labelled(8, ['status: backlog'], { state: 'CLOSED', stateReason: 'DUPLICATE' }),
    labelled(9, ['status: backlog'], { state: 'CLOSED', stateReason: 'COMPLETED' }),
  ]);
  assert.equal(byNumber(reqs, 7).stage, 'Retired');
  assert.equal(byNumber(reqs, 7).drift, null, 'a retired requirement keeping its backlog label is not drift');
  assert.equal(byNumber(reqs, 7).active, false);
  assert.equal(byNumber(reqs, 8).stage, 'Retired');
  assert.equal(byNumber(reqs, 9).stage, 'Released', 'closed as completed is shipped work');
});

test('an open requirement labelled released is drift — the label contradicts the issue', () => {
  const r = byNumber(buildRequirements([labelled(400, ['status: released'])]), 400);
  assert.equal(r.drift, 'open in Released');
  assert.equal(r.active, true);
});

test('two status labels at once is drift, shown under the one that is not released', () => {
  const r = byNumber(buildRequirements([labelled(5, ['status: released', 'status: review'])]), 5);
  assert.equal(r.drift, 'two statuses');
  assert.equal(r.stage, 'Review');
  assert.equal(r.status, null, 'no single status can be claimed');
});

test('status labels are not repeated in the topic labels', () => {
  const r = byNumber(buildRequirements([labelled(6, ['status: ready'], {
    labels: { nodes: [{ name: 'requirement' }, { name: 'status: ready' }, { name: 'safety' }] },
  })]), 6);
  assert.deepEqual(r.labels, ['safety']);
});

test('rows sort in-flight first, then by the label order, newest first within a stage', () => {
  const reqs = buildRequirements([
    labelled(1, ['status: backlog'], { updatedAt: '2026-09-09T00:00:00Z' }),
    labelled(2, ['status: backlog'], { updatedAt: '2026-09-10T00:00:00Z' }),
    labelled(3, ['status: review']),
    labelled(4, ['status: in session']),
    issue(5, { state: 'CLOSED' }),
  ]);
  assert.deepEqual(reqs.map((r) => r.number), [4, 3, 2, 1, 5]);
  const retired = byNumber(buildRequirements([issue(6, { state: 'CLOSED', stateReason: 'NOT_PLANNED' }), issue(5, { state: 'CLOSED' })]), 6);
  assert.equal(retired.stage, 'Retired');
});
