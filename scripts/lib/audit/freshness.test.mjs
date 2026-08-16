// node --test scripts/lib/audit/
//
// The one property worth guarding here is that the healthy path still says how
// old the file is. A check that only speaks when a threshold trips is the check
// that was missing on 2026-08-16 — 22 hours is inside any sane threshold for a
// nightly job, and 22 hours was enough to set an evening's agenda from a file
// that predated every issue in it.
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { freshness, STALE_HOURS } from './freshness.mjs';

const NOW = new Date('2026-08-16T06:00:00Z');
const ledgerAt = (iso, total = 4) => ({ generatedAt: iso, counts: { total } });

test('freshness: a fresh ledger still reports its age and its blind spot', () => {
  const f = freshness(ledgerAt('2026-08-16T04:00:00Z'), NOW);
  assert.equal(f.ok, true);
  assert.equal(f.state, 'fresh');
  assert.equal(f.age, '2h');
  assert.match(f.summary, /last run 2h ago/);
  // The caveat is the point: a reader who quotes the count must see, in the same
  // sentence, that the count describes a world that may have moved on.
  assert.match(f.summary, /invisible to it/);
});

test('freshness: the 2026-08-16 file — 22h old, inside the threshold, still says so', () => {
  const f = freshness(ledgerAt('2026-08-15T07:51:52Z'), new Date('2026-08-16T06:00:00Z'));
  assert.equal(f.ok, true, '22h is not stale for a nightly job');
  assert.equal(f.age, '22h');
  assert.ok(f.hours > 21 && f.hours < 23);
  assert.match(f.summary, /22h ago/);
  assert.match(f.summary, /2026-08-15T07:51:52Z/);
});

test('freshness: past the threshold it is stale, and says the findings are historical', () => {
  const f = freshness(ledgerAt('2026-08-14T07:00:00Z'), NOW);
  assert.equal(f.ok, false);
  assert.equal(f.state, 'stale');
  assert.match(f.summary, /STALE/);
  assert.match(f.summary, /as it was, not as it is/);
});

test('freshness: an absent ledger is a state, never an all-clear', () => {
  const f = freshness(null, NOW);
  assert.equal(f.ok, false);
  assert.equal(f.state, 'missing');
  assert.equal(f.age, 'never');
  assert.match(f.summary, /absent audit reads as a clean one/);
  // A malformed or timestamp-less file is the same state, not a crash.
  assert.equal(freshness({ counts: { total: 0 } }, NOW).state, 'missing');
  assert.equal(freshness({ generatedAt: 'not-a-date' }, NOW).state, 'missing');
});

test('freshness: a clean ledger is still dated — zero findings is the dangerous case', () => {
  const f = freshness(ledgerAt('2026-08-16T04:00:00Z', 0), NOW);
  assert.equal(f.total, 0);
  assert.match(f.summary, /0 findings/);
  assert.match(f.summary, /2h ago/);
});

test('freshness: counts.total is preferred, but a raw findings array is counted', () => {
  const f = freshness({ generatedAt: '2026-08-16T04:00:00Z', findings: [{}, {}, {}] }, NOW);
  assert.equal(f.total, 3);
});

test('freshness: the threshold allows a nightly job plus a late scheduler', () => {
  assert.ok(STALE_HOURS > 24, 'a nightly job is not stale at 25 hours');
  assert.equal(freshness(ledgerAt(new Date(NOW.getTime() - 29 * 3600000).toISOString()), NOW).ok, true);
  assert.equal(freshness(ledgerAt(new Date(NOW.getTime() - 31 * 3600000).toISOString()), NOW).ok, false);
});

test('freshness: minutes below the hour, days above the day', () => {
  assert.equal(freshness(ledgerAt(new Date(NOW.getTime() - 20 * 60000).toISOString()), NOW).age, '20m');
  assert.equal(freshness(ledgerAt(new Date(NOW.getTime() - 3 * 86400000).toISOString()), NOW).age, '3d');
});
