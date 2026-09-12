// What the tracker's roll-ups say, pinned with no network: which objective a
// requirement lands under, how a task reads its phase, what the sidebar's
// counts add up to. The raw shape is the GraphQL one fetchTracker returns.
import test from 'node:test';
import assert from 'node:assert/strict';

import { buildTracker, taskPhase, STAGES, LIFECYCLE } from './tracker.mjs';

const HUB = 'jwildfire/obot.roadmap';
const labels = (...names) => ({ nodes: names.map((name) => ({ name })) });

const objective = (n, over = {}) => ({
  number: n, title: `Objective: number ${n}`, url: `https://github.com/${HUB}/issues/${n}`,
  state: 'OPEN', stateReason: null, body: `<!-- objective-slug: obj-${n} -->\nIntent.`,
  createdAt: '2026-09-01T00:00:00Z', updatedAt: '2026-09-10T00:00:00Z', closedAt: null,
  milestone: { title: '2026-10-talk' }, labels: labels('objective'),
  subIssuesSummary: { total: 0, completed: 0 },
  ...over,
});

const task = (repo, n, over = {}) => ({
  number: n, title: `Do thing ${n}`, url: `https://github.com/${repo}/issues/${n}`,
  state: 'OPEN', stateReason: null, createdAt: '2026-09-02T00:00:00Z', updatedAt: '2026-09-09T00:00:00Z', closedAt: null,
  repository: { nameWithOwner: repo }, milestone: { title: 'v1.8.0' }, labels: labels('enhancement'),
  assignees: { nodes: [] }, closedByPullRequestsReferences: { nodes: [] },
  ...over,
});

const requirement = (n, parent, status, tasks = [], over = {}) => ({
  number: n, title: `Requirement: number ${n}`, url: `https://github.com/${HUB}/issues/${n}`,
  state: 'OPEN', stateReason: null, body: '', createdAt: '2026-09-01T00:00:00Z', updatedAt: `2026-09-0${(n % 9) + 1}T00:00:00Z`, closedAt: null,
  milestone: { title: '2026-10-talk' }, labels: labels('requirement', 'safety', ...(status ? [status] : [])),
  parent: parent ? { number: parent, repository: { nameWithOwner: HUB } } : null,
  subIssuesSummary: { total: tasks.length, completed: tasks.filter((t) => t.state === 'CLOSED').length },
  subIssues: { nodes: tasks },
  ...over,
});

test('the stages the sidebar lists are the five statuses, the two closed readings and the one fault', () => {
  assert.deepEqual(STAGES, ['Backlog', 'Ready', 'In session', 'Review', 'Released', 'Retired', 'Unstaged']);
  assert.deepEqual(LIFECYCLE, ['Backlog', 'Ready', 'In session', 'Review', 'Released']);
});

test('a task reads open, in review, done or retired from its issue and its pull request', () => {
  assert.equal(taskPhase(task('jwildfire/safety.viz', 1)), 'open');
  assert.equal(taskPhase(task('jwildfire/safety.viz', 2, {
    closedByPullRequestsReferences: { nodes: [{ number: 9, url: '', state: 'OPEN', merged: false, isDraft: true }] },
  })), 'in review', 'an open pull request, draft or not, is review');
  assert.equal(taskPhase(task('jwildfire/safety.viz', 3, { state: 'CLOSED', stateReason: 'COMPLETED' })), 'done');
  assert.equal(taskPhase(task('jwildfire/safety.viz', 4, { state: 'CLOSED', stateReason: 'NOT_PLANNED' })), 'retired');
});

test('requirements land under their parent objective; one with no objective parent is unparented, not dropped', () => {
  const model = buildTracker({
    objectives: [objective(10), objective(20)],
    requirements: [
      requirement(11, 10, 'status: ready'),
      requirement(12, 10, 'status: backlog'),
      requirement(21, 20, 'status: in session'),
      requirement(30, null, 'status: backlog'),
      requirement(31, 11, 'status: backlog'), // parent is a requirement, not an objective
    ],
  });
  assert.deepEqual(model.objectives.map((o) => o.number), [10, 20]);
  assert.deepEqual(model.objectives[0].requirements.map((r) => r.number), [11, 12], 'in flight before backlog');
  assert.deepEqual(model.unparented.map((r) => r.number).sort(), [30, 31]);
  assert.equal(model.totals.unparented, 2);
  assert.equal(model.requirements.length, 5, 'every requirement is in the flat list');
});

test('the roll-ups count requirements by stage and tasks by phase, blocked as an overlay', () => {
  const tasks = [
    task('jwildfire/safety.viz', 1),
    task('jwildfire/safety.viz', 2, { labels: labels('blocked') }),
    task('jwildfire/gsm.safety', 3, { closedByPullRequestsReferences: { nodes: [{ number: 5, url: '', state: 'OPEN', merged: false, isDraft: false }] } }),
    task('jwildfire/gsm.safety', 4, { state: 'CLOSED', stateReason: 'COMPLETED' }),
    task('jwildfire/gsm.safety', 5, { state: 'CLOSED', stateReason: 'NOT_PLANNED' }),
  ];
  const model = buildTracker({
    objectives: [objective(10)],
    requirements: [
      requirement(11, 10, 'status: in session', tasks),
      requirement(12, 10, 'status: review'),
      requirement(13, 10, 'status: released', [], { state: 'CLOSED', stateReason: 'COMPLETED', closedAt: '2026-09-05T00:00:00Z' }),
      requirement(14, 10, 'status: backlog', [], { state: 'CLOSED', stateReason: 'NOT_PLANNED' }),
      requirement(15, 10, null), // open, unlabelled — drift
    ],
  });
  const o = model.objectives[0];
  assert.deepEqual(o.reqRollup.byStage, { Backlog: 0, Ready: 0, 'In session': 1, Review: 1, Released: 1, Retired: 1, Unstaged: 1 });
  assert.equal(o.reqRollup.open, 3);
  assert.equal(o.reqRollup.closed, 2);
  assert.equal(o.reqRollup.drift, 1, 'the unlabelled open one');
  assert.deepEqual(o.taskRollup, { total: 5, open: 2, inReview: 1, done: 1, retired: 1, blocked: 1 });
  assert.deepEqual(model.totals.tasks, o.taskRollup);
  assert.deepEqual(model.repos, ['jwildfire/gsm.safety', 'jwildfire/safety.viz']);
  const r11 = o.requirements.find((r) => r.number === 11);
  assert.equal(r11.area, 'safety');
  assert.equal(r11.stage, 'In session', 'the stage is the shared collector\'s reading');
  assert.equal(r11.tasks[1].blocked, true);
  assert.deepEqual(r11.tasks[1].labels, [], 'blocked is an overlay, not a label the row repeats');
});

test('a closed requirement reads Released or Retired from how it closed, whatever label it carries', () => {
  const model = buildTracker({
    objectives: [objective(10)],
    requirements: [
      requirement(11, 10, 'status: in session', [], { state: 'CLOSED', stateReason: 'COMPLETED' }),
      requirement(12, 10, 'status: released', [], { state: 'CLOSED', stateReason: 'NOT_PLANNED' }),
    ],
  });
  const [a, b] = model.objectives[0].requirements;
  assert.equal(a.stage, 'Released');
  assert.equal(b.stage, 'Retired');
});

test('objectives read open before closed, scheduled before unscheduled, then in filing order', () => {
  const model = buildTracker({
    objectives: [
      objective(72, { milestone: { title: 'backlog' } }),
      objective(78),
      objective(50, { state: 'CLOSED', stateReason: 'COMPLETED', closedAt: '2026-08-01T00:00:00Z' }),
      objective(112, { milestone: null }),
      objective(328),
    ],
    requirements: [],
  });
  assert.deepEqual(model.objectives.map((o) => o.number), [78, 328, 72, 112, 50]);
  assert.equal(model.objectives[0].slug, 'obj-78');
  assert.equal(model.objectives[0].page, 'goals/obj-78.html');
  assert.equal(model.objectives[0].title, 'number 78', 'the "Objective:" prefix is the heading\'s job');
});

test('a hub requirement linked as a sub-issue of a requirement is flagged, not counted as a task', () => {
  const nested = task(HUB, 131, { labels: labels('requirement', 'ai', 'status: backlog') });
  const model = buildTracker({
    objectives: [objective(10)],
    requirements: [requirement(11, 10, 'status: backlog', [nested])],
  });
  const t = model.objectives[0].requirements[0].tasks[0];
  assert.equal(t.isRequirement, true);
  assert.equal(t.key, 'obot.roadmap#131');
});
