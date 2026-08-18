// node --test scripts/lib/audit/
//
// A repair the executor cannot perform must say so before it is offered, not
// fail when it is accepted (#254). Since 2026-08-18 no credential can write to
// the obot Roadmap board (#252), so the three board ops are dead — and an audit
// that detects board drift and proposes a fix that will fail is worse than one
// that stays quiet, because the failure only surfaces after the click.
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  runOps, makeClient, unavailableOps, proposalUnavailable, BOARD_WRITE_BLOCK, OPS,
} from './ops.mjs';

const client = makeClient({ token: 'x', dryRun: false });

test('the three board ops are declared unavailable, and the rest are not', () => {
  assert.deepEqual(
    OPS.filter((op) => unavailableOps([{ op }]).length),
    ['set-board-status', 'add-to-board', 'remove-board-item'],
  );
});

test('a proposal carrying a board op says so, with the reason and the issue', () => {
  const u = proposalUnavailable({
    kind: 'mechanical',
    ops: [{ op: 'add-to-board', label: 'add to the obot Roadmap project at Backlog' }],
  });
  assert.ok(u, 'the proposal is marked unavailable');
  assert.equal(u.issue, BOARD_WRITE_BLOCK.issue);
  assert.match(u.url, /issues\/252$/);
  assert.deepEqual(u.ops, ['add-to-board']);
  assert.match(u.reason, /board/i);
});

test('a proposal of ordinary ops is not marked', () => {
  assert.equal(proposalUnavailable({
    kind: 'mechanical',
    ops: [{ op: 'close-issue', label: 'close it' }, { op: 'comment', label: 'say so' }],
  }), null);
  assert.equal(proposalUnavailable({ kind: 'agentic', prompt: 'decide' }), null);
});

test('the executor refuses an unavailable op up front, naming why', async () => {
  await assert.rejects(
    () => runOps(client, [{ op: 'add-to-board', repo: 'jwildfire/obot.roadmap', number: 1, label: 'add to the board' }], { board: {} }),
    /#252/,
  );
});

test('a chain of nothing but blocked ops spends no request finding out', async () => {
  const calls = [];
  const spy = { ...client, rest: async (...a) => { calls.push(a); return null; }, graphql: async () => { calls.push('gql'); } };
  await assert.rejects(() => runOps(spy, [
    { op: 'add-to-board', repo: 'jwildfire/obot.roadmap', number: 1, label: 'add to the board' },
    { op: 'set-board-status', itemId: 'i', value: 'Backlog', label: 'board Status → Backlog' },
  ], { board: {} }), /Nothing was attempted/);
  assert.equal(calls.length, 0);
});

test('a mixed chain still applies the half that works, and says where it stopped', async () => {
  // SUBS-DONE-PARENT-OPEN proposes "close the parent, then stage it Released".
  // Closing it is real work and still possible; refusing the whole chain would
  // make this change remove a repair rather than describe one.
  const calls = [];
  const spy = { ...client, rest: async (...a) => { calls.push(a); return null; } };
  await assert.rejects(
    () => runOps(spy, [
      { op: 'close-issue', repo: 'jwildfire/obot.roadmap', number: 1, label: 'close it' },
      { op: 'set-board-status', itemId: 'i', value: 'Released', label: 'board Status → Released' },
    ], { board: {} }),
    /Applied first: closed jwildfire\/obot\.roadmap#1[\s\S]*#252/,
  );
  assert.equal(calls.length, 1, 'the close ran, the board write did not');
});

test('a mixed proposal is marked partial, and a board-only one is not', () => {
  const mixed = proposalUnavailable({
    ops: [{ op: 'close-issue', label: 'close it' }, { op: 'set-board-status', label: 'stage it' }],
  });
  assert.equal(mixed.partial, true);
  assert.deepEqual(mixed.performable, ['close it']);
  assert.equal(proposalUnavailable({ ops: [{ op: 'set-board-status', label: 'stage it' }] }).partial, false);
});

test('an op the executor does not know is still refused', async () => {
  await assert.rejects(() => runOps(client, [{ op: 'launch-missiles', label: 'no' }], {}), /unknown op/);
});
