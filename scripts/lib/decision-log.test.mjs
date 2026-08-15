// The decision log's parser, tested on the markup the artifacts actually carry.
//
// Lives at scripts/lib/ rather than scripts/lib/collect/ because the deploy's test
// step globs `scripts/lib/*.test.mjs` — a test one directory deeper would never run,
// which is the same silent-omission failure the log itself is built to avoid.
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { parseDecisionRecord, isDecided, isFullyDecided, text } from './collect/decision-log.mjs';

const wrap = (inner) => `<body><header>…</header>\n<section id="decisions">\n<h2>Decisions</h2>\n${inner}\n</section>\n<section><h2>The situation</h2><p>…</p></section></body>`;

test('an artifact with no Decisions section reports absent, not empty', () => {
  const r = parseDecisionRecord('<body><section><h2>The situation</h2></section></body>');
  assert.equal(r.present, false);
  assert.deepEqual(r.entries, []);
});

test('reads date, channel, resolves, quote and outcome off one decision block', () => {
  const r = parseDecisionRecord(wrap(`
    <div class="verdict" data-date="2026-08-15" data-channel="in chat" data-resolves="BL1,BL2, BL3 ,BL4">
      <span class="k">@jwildfire &middot; 2026-08-15 &middot; in chat</span>
      <p>&ldquo;BL1-4 look good. Recommendations approved.&rdquo;</p>
      <p>All four calls adopted as recommended.</p>
    </div>`));
  assert.equal(r.present, true);
  assert.equal(r.entries.length, 1);
  const e = r.entries[0];
  assert.equal(e.date, '2026-08-15');
  assert.equal(e.channel, 'in chat');
  assert.deepEqual(e.resolves, ['BL1', 'BL2', 'BL3', 'BL4']);
  assert.equal(e.quote, 'BL1-4 look good. Recommendations approved.');
  assert.equal(e.outcome, 'All four calls adopted as recommended.');
});

test('two decisions on one artifact stay in page order', () => {
  const r = parseDecisionRecord(wrap(`
    <div class="verdict" data-date="2026-08-15" data-resolves="1"><p>&ldquo;first&rdquo;</p></div>
    <div class="verdict" data-date="2026-08-16" data-resolves="2,3"><p>&ldquo;second&rdquo;</p><p>and its outcome</p></div>`));
  assert.deepEqual(r.entries.map((e) => e.quote), ['first', 'second']);
  assert.deepEqual(r.entries[1].resolves, ['2', '3']);
  assert.equal(r.entries[1].outcome, 'and its outcome');
});

test('a .verdict block outside the Decisions section is not a decision', () => {
  // The artifacts reuse .verdict for findings and asides — "The precise gap",
  // "Finding". Only the section id plus a data-date marks a recorded decision.
  const html = wrap('<div class="verdict" data-date="2026-08-15"><p>&ldquo;real&rdquo;</p></div>')
    + '<div class="verdict" data-date="2026-08-14"><div class="k">Finding</div><p>not a decision</p></div>';
  const r = parseDecisionRecord(html);
  assert.equal(r.entries.length, 1);
  assert.equal(r.entries[0].quote, 'real');
});

test('an undated block inside the section is ignored rather than logged blank', () => {
  const r = parseDecisionRecord(wrap('<div class="verdict"><p>a preamble with no date</p></div>'));
  assert.equal(r.present, true);
  assert.equal(r.entries.length, 0);
});

test('channel defaults to chat, which is where he decides', () => {
  const r = parseDecisionRecord(wrap('<div class="verdict" data-date="2026-08-15"><p>&ldquo;yes&rdquo;</p></div>'));
  assert.equal(r.entries[0].channel, 'in chat');
});

test('inline links and entities survive as readable text', () => {
  const r = parseDecisionRecord(wrap(`
    <div class="verdict" data-date="2026-08-15"><p>&ldquo;approved&rdquo;</p>
    <p>Implemented in <a href="https://example.test">obot.agent#91</a> &mdash; merged.</p></div>`));
  assert.equal(r.entries[0].outcome, 'Implemented in obot.agent#91 — merged.');
});

test('article is accepted as well as div', () => {
  const r = parseDecisionRecord(wrap('<article class="decided" data-date="2026-08-15"><p>&ldquo;ok&rdquo;</p></article>'));
  assert.equal(r.entries.length, 1);
});

test('status cells: partially decided counts as decided, awaiting does not', () => {
  assert.equal(isDecided('**Decided 2026-08-15** — six of seven adopted'), true);
  assert.equal(isDecided('Partially decided 2026-08-15 — A1–A2 accepted'), true);
  assert.equal(isDecided('Awaiting @jwildfire — E1–E4'), false);
  assert.equal(isFullyDecided('Partially decided 2026-08-15 — A1–A2 accepted'), false);
  assert.equal(isFullyDecided('**Decided 2026-08-15**'), true);
});

test('a relayed decision is marked non-verbatim so the log drops the quote marks', () => {
  const r = parseDecisionRecord(wrap(`
    <div class="verdict" data-date="2026-08-14" data-verbatim="false" data-channel="relayed via obot-prime">
      <p>Approved the recommendations; the settings edit stays his to make by hand.</p>
    </div>`));
  assert.equal(r.entries[0].verbatim, false);
  assert.equal(r.entries[0].channel, 'relayed via obot-prime');
});

test('verbatim is the default — most decisions are his own typed words', () => {
  const r = parseDecisionRecord(wrap('<div class="verdict" data-date="2026-08-15"><p>&ldquo;yes&rdquo;</p></div>'));
  assert.equal(r.entries[0].verbatim, true);
});

test('text() collapses markup to one readable line', () => {
  assert.equal(text('<p>a  <b>b</b>\n c &amp; d</p>'), 'a b c & d');
});

// The index table's Status column is the input to his waiting-on-you list, so how
// it is read is not a cosmetic question.
test('emphasis does not turn a settled decision back into an open one', async () => {
  const { isAwaiting } = await import('./collect/decisions.mjs');
  assert.equal(isAwaiting('**Decided 2026-08-15** — six of seven adopted'), false);
  assert.equal(isAwaiting('Decided 2026-08-14 — approved'), false);
  assert.equal(isAwaiting('Awaiting @jwildfire — E1–E4'), true);
  // Some questions still his: it stays on the list.
  assert.equal(isAwaiting('Partially decided 2026-08-15 — A1–A2 accepted'), true);
});
