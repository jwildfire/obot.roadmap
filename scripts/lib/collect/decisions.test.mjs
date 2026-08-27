// The status cell is markdown. Four surfaces render it as plain text — the
// decisions landing page's open list and its cards, the roadmap catalog's meta
// line, and the roadmap queue — and every one of them was showing the markup
// itself. `**Awaiting**` reached the page with its asterisks on all seven open
// decisions, which is the first word he reads on the page he triages from.
//
// The link flattening was already here and correct; emphasis was not handled at
// all. One consumer had noticed and stripped it locally (scripts/roadmap/queue.mjs),
// which is why the queue looked right while the landing page did not — a fix at
// one call site leaves the next reader to rediscover the same bug.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { plainStatus } from './decisions.mjs';

test('strong emphasis is removed, not rendered as asterisks', () => {
  assert.equal(plainStatus('**Awaiting** his answers'), 'Awaiting his answers');
});

test('single-asterisk emphasis is removed', () => {
  assert.equal(plainStatus('the night he called it off: *"not now"*'), 'the night he called it off: "not now"');
});

test('code spans lose their backticks but keep their text', () => {
  assert.equal(plainStatus('the `registry.json` carve-out'), 'the registry.json carve-out');
});

test('markdown links still flatten to their text', () => {
  assert.equal(plainStatus('see [the artifact](https://example.com/a/b)'), 'see the artifact');
});

test('emphasis inside a link label survives the flattening', () => {
  assert.equal(plainStatus('[**Awaiting**](https://x.y)'), 'Awaiting');
});

// The regression that a blunt /[*_`]/g strip would cause. Identifiers with
// underscores are all over these cells — package_snapshot, registry.json,
// input_data_version — and a wholesale strip silently corrupts them into
// packagesnapshot. Emphasis is a paired, word-boundaried construct; a bare
// underscore inside a word is not emphasis and must be left alone.
test('underscores inside identifiers are left alone', () => {
  assert.equal(plainStatus('both carry package_snapshot: local-2026-07-29'), 'both carry package_snapshot: local-2026-07-29');
});

test('paired underscore emphasis around a whole word is still removed', () => {
  assert.equal(plainStatus('it is _not_ implemented'), 'it is not implemented');
});

test('a cell with no markup is returned unchanged', () => {
  assert.equal(plainStatus('Decided 2026-08-20 — he chose Option A'), 'Decided 2026-08-20 — he chose Option A');
});

test('an empty or missing cell does not throw', () => {
  assert.equal(plainStatus(''), '');
  assert.equal(plainStatus(undefined), '');
});
