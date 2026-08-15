// node --test scripts/lib/decision-ids.test.mjs
//
// The id rules that make "D0004.2 is approved" mean exactly one thing. Worth a test
// rather than a look at the site: a duplicate id is invisible on the page — both
// artifacts render fine — and only shows up as an ambiguous approval weeks later,
// by which time the number is already quoted in a chat log and cannot be changed.
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { nextId, ID_RE, QID_RE } from './decision-ids.mjs';

test('the next id is derived from the highest one taken, never a counter', () => {
  assert.equal(nextId({ prefix: 'D', artifacts: [] }), 'D0001');
  assert.equal(nextId({ prefix: 'D', artifacts: [{ id: 'D0001' }, { id: 'D0012' }] }), 'D0013');
});

test('a retired id still holds its number — gaps do not get refilled', () => {
  // D0002 removed from the list; the next id is still D0004, not D0002.
  assert.equal(nextId({ prefix: 'D', artifacts: [{ id: 'D0001' }, { id: 'D0003' }] }), 'D0004');
});

test('a second prefix would allocate independently', () => {
  // Not built — @jwildfire asked for decisions only. But the registry keys on the
  // full string, so adding one later must not renumber the D series.
  assert.equal(nextId({ prefix: 'D', artifacts: [{ id: 'D0002' }, { id: 'R0009' }] }), 'D0003');
});

test('the id shape is exactly one letter and four digits', () => {
  assert.ok(ID_RE.test('D0001'));
  assert.ok(!ID_RE.test('D001'), 'three digits is not the shape');
  assert.ok(!ID_RE.test('0001'), 'the prefix is not optional');
  assert.ok(!ID_RE.test('D0001.1'), 'a question id is not an artifact id');
});

test('a question id is its artifact plus a plain number', () => {
  assert.ok(QID_RE.test('D0004.2'));
  assert.ok(QID_RE.test('D0011.12'));
  assert.ok(!QID_RE.test('D0004.02'), 'the question number is not padded');
  assert.ok(!QID_RE.test('D0004-2'), 'the separator is a dot');
});
