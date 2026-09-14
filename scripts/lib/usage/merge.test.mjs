import { test } from 'node:test';
import assert from 'node:assert/strict';

import { mergeUsage, validateFragment } from './merge.mjs';

const cell = (over = {}) => ({
  day: '2026-09-01', agent: 'A', role: 'lead',
  input: 10, output: 20, cacheRead: 300, cacheWrite: 40,
  cost: 1.5, calls: 2, subCalls: 0, subCost: 0, ...over,
});
const model = (over = {}) => ({
  model: 'claude-opus-5', calls: 2, input: 10, output: 20, cacheRead: 300, cacheWrite: 40,
  cost: 1.5, rateIn: 5, rateOut: 25, ...over,
});
const doc = (over = {}) => ({
  schema: 1, project: 'obot2', source: { id: 'local', generatedAt: '2026-09-12T00:00:00Z' },
  days: ['2026-09-01'], cells: [cell()], models: [model()],
  roleLabels: { lead: 'Lead session' }, cacheMultipliers: { read: 0.1, write5m: 1.25, write1h: 2 },
  totals: {}, ...over,
});

test('a well-formed fragment validates clean', () => {
  assert.deepEqual(validateFragment(doc()), []);
  assert.deepEqual(validateFragment(doc({ source: undefined, roleLabels: undefined })), []);
});

test('validation rejects the shapes a stray write to the ledger could carry', () => {
  assert.ok(validateFragment(null).length);
  assert.ok(validateFragment(doc({ schema: 2 })).some((e) => e.includes('schema')));
  assert.ok(validateFragment(doc({ cells: [cell({ day: 'yesterday' })] })).some((e) => e.includes('.day')));
  assert.ok(validateFragment(doc({ cells: [cell({ role: 'admin' })] })).some((e) => e.includes('.role')));
  assert.ok(validateFragment(doc({ cells: [cell({ cost: -1 })] })).some((e) => e.includes('.cost')));
  assert.ok(validateFragment(doc({ cells: [cell({ calls: 'many' })] })).some((e) => e.includes('.calls')));
  assert.ok(validateFragment(doc({ cells: [cell({ agent: 'x'.repeat(81) })] })).some((e) => e.includes('.agent')));
  assert.ok(validateFragment(doc({ cells: [cell({ agent: 'a\nb' })] })).some((e) => e.includes('.agent')));
  assert.ok(validateFragment(doc({ models: [model({ rateIn: 'free' })] })).some((e) => e.includes('rateIn')));
  assert.ok(validateFragment(doc({ roleLabels: { cloud: 'x'.repeat(41) } })).some((e) => e.includes('roleLabels')));
  assert.ok(validateFragment(doc({ source: { id: '' } })).some((e) => e.includes('source.id')));
});

test('merge sums cells by (day, agent, role) and models by model, and recomputes totals', () => {
  const base = doc();
  const frag = doc({
    source: { id: 'cloud:obot.roadmap:abc', generatedAt: '2026-09-12T10:00:00Z' },
    cells: [
      cell({ day: '2026-09-01' }), // the same key as the baseline's cell
      cell({ day: '2026-09-12', agent: 'obot.roadmap x', role: 'cloud', cost: 4.63, calls: 24 }),
    ],
    models: [model({ cost: 1.5 }), model({ model: 'claude-fable-5-1', cost: 4.63, calls: 24, rateIn: 10, rateOut: 50 })],
    roleLabels: { cloud: 'Cloud session' },
  });
  const m = mergeUsage(base, [{ id: 'cloud:obot.roadmap:abc', data: frag }]);

  assert.deepEqual(m.days, ['2026-09-01', '2026-09-12']);
  assert.equal(m.cells.length, 2);
  const same = m.cells.find((c) => c.day === '2026-09-01');
  assert.equal(same.calls, 4);
  assert.equal(same.cost, 3);
  assert.equal(same.cacheRead, 600);
  assert.equal(m.models.length, 2);
  assert.equal(m.models[0].model, 'claude-fable-5-1'); // sorted by cost, highest first
  assert.equal(m.models.find((x) => x.model === 'claude-opus-5').calls, 4);
  assert.deepEqual(m.roleLabels, { lead: 'Lead session', cloud: 'Cloud session' });
  assert.equal(m.totals.cost, 7.63);
  assert.equal(m.totals.calls, 28);
  assert.equal(m.totals.agents, 2);
  assert.equal(m.totals.activeDays, 2);
  assert.equal(m.totals.first, '2026-09-01');
  assert.equal(m.totals.last, '2026-09-12');
  assert.equal(m.sources.length, 2);
  assert.equal(m.sources[0].kind, 'local');
  assert.equal(m.sources[1].kind, 'cloud');
  assert.equal(m.sources[1].last, '2026-09-12');
  assert.equal(m.sources[1].cost, 6.13);
});

test('a fragment listed twice counts twice — the ledger keeps one file per session so this cannot happen there', () => {
  const frag = doc({ source: { id: 'cloud:x' } });
  const once = mergeUsage(doc(), [{ id: 'cloud:x', data: frag }]);
  const twice = mergeUsage(doc(), [{ id: 'cloud:x', data: frag }, { id: 'cloud:x', data: frag }]);
  assert.equal(once.totals.calls, 4);
  assert.equal(twice.totals.calls, 6);
});

test('a baseline alone merges to itself with one local source', () => {
  const m = mergeUsage(doc());
  assert.equal(m.totals.calls, 2);
  assert.equal(m.totals.cost, 1.5);
  assert.equal(m.sources.length, 1);
  assert.equal(m.sources[0].id, 'local');
  assert.equal(m.cacheMultipliers.read, 0.1);
});
