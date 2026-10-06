import { test } from 'node:test';
import assert from 'node:assert/strict';

import { coverageNote, usageSection, KNOWN_GAPS } from './render.mjs';

const local = { id: 'local', kind: 'local', generatedAt: '2026-10-06T01:00:00Z', first: '2026-07-09', last: '2026-10-06' };
const cloud = (day) => ({ id: `cloud:x:${day}`, kind: 'cloud', generatedAt: null, first: day, last: day });

test('the coverage block says which days each store covers', () => {
  const html = coverageNote([local, cloud('2026-09-12'), cloud('2026-09-20')], []);
  assert.match(html, /Local sessions, read on @jwildfire's machine: 2026-07-09 to 2026-10-06, last read 2026-10-06\./);
  assert.match(html, /Cloud sessions: 2 reported, 2026-09-12 to 2026-09-20\./);
});

test('one cloud day is a day, not a range, and no cloud session is said plainly', () => {
  assert.match(coverageNote([local, cloud('2026-09-12')], []), /Cloud sessions: 1 reported, 2026-09-12\./);
  assert.match(coverageNote([local], []), /Cloud sessions: none has reported\./);
});

test('the known gaps are on the page, the floor first', () => {
  const html = coverageNote([local]);
  assert.match(html, /20 August to 18 September is a floor/);
  assert.match(html, /Nothing is recorded for 19 to 30 September/);
  assert.ok(html.indexOf('is a floor') < html.indexOf('Nothing is recorded'));
  for (const g of KNOWN_GAPS) assert.ok(g.from <= g.to && /^\d{4}-\d{2}-\d{2}$/.test(g.from));
});

test('the section carries the block and names the cache-read exceptions', () => {
  const cell = { day: '2026-10-01', agent: 'A <b>', role: 'interactive', input: 1, output: 2, cacheRead: 3, cacheWrite: 4, cost: 1, calls: 1, subCalls: 0, subCost: 0 };
  const html = usageSection({
    cells: [cell],
    models: [{ model: 'claude-opus-5-5', calls: 1, input: 1, output: 2, cacheRead: 3, cacheWrite: 4, cost: 1, rateIn: 4, rateOut: 20 }],
    roleLabels: { interactive: 'Interactive / untagged' },
    cacheMultipliers: { read: 0.1, write5m: 1.25, write1h: 2 },
    cacheReadMultipliers: { 'claude-opus-5-5': 0.05 },
    sources: [local],
    totals: { input: 1, output: 2, cacheRead: 3, cacheWrite: 4, cost: 1, calls: 1, subCalls: 0, subCost: 0, agents: 1, activeDays: 1, first: '2026-10-01', last: '2026-10-01' },
  });
  assert.match(html, /class="uz-coverage"/);
  assert.match(html, /reads &times;0\.1 \(<code>claude-opus-5-5<\/code> &times;0\.05\)/);
  assert.match(html, /\$4\.00 \/ \$20\.00/);
  assert.ok(!html.includes('A <b>'), 'agent labels are escaped');
});
