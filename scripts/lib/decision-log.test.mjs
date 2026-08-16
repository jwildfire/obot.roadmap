// The decision log's parser, tested on the markup the artifacts actually carry.
//
// Lives at scripts/lib/ rather than scripts/lib/collect/ because the deploy's test
// step globs `scripts/lib/*.test.mjs` — a test one directory deeper would never run,
// which is the same silent-omission failure the log itself is built to avoid.
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { parseDecisionRecord, isDecided, isFullyDecided, text } from './collect/decision-log.mjs';
import { foldedInto, closedInto, isAwaiting } from './collect/decisions.mjs';

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

// The exact status cells D0015 and D0016 carried on 2026-08-16, when both rendered
// as open cards on every surface built on the awaiting set (#210).
const FOLDED = '**Folded into [D0017](2026-08-16-navigator-design/)** — its questions are carried forward into the consolidated Navigator design at @jwildfire\'s request (2026-08-16); answer there. Original recommendation, unchanged: W1–W4';

test('a folded decision is not awaiting him — its questions belong to the successor', () => {
  assert.equal(isAwaiting(FOLDED), false);
  assert.deepEqual(foldedInto(FOLDED), { id: 'D0017', slug: '2026-08-16-navigator-design' });
});

test('a folded decision still resolves to what it was folded into', () => {
  // Dropping it silently would leave a reader who remembers D0015 with nowhere to go.
  assert.equal(foldedInto('Folded into D0017 — answer there').id, 'D0017');
  assert.equal(foldedInto('Folded into D0017').slug, null);
});

test('"folded" only counts at the start of the cell, not anywhere in the prose', () => {
  // A decided artifact that mentions folding another one in is decided, not folded.
  const mentions = '**Decided 2026-08-16** — N1–N8 all adopted. Folds in the worker-closeout (D0015) and supervision (D0016) questions at his request';
  assert.equal(foldedInto(mentions), null);
  assert.equal(isAwaiting(mentions), false);
  assert.equal(isDecided(mentions), true);
});

test('folding does not swallow an ordinary awaiting row', () => {
  assert.equal(foldedInto('Awaiting @jwildfire — R1–R3'), null);
  assert.equal(isAwaiting('Awaiting @jwildfire — R1–R3'), true);
});

// He closed three artifacts on 2026-08-16 without answering any of their questions
// ("D14/15/16 all seem like a mess to me. Close them all."). Closed is neither
// awaiting nor decided: reporting it as decided would put a verdict in his mouth,
// and reporting it as awaiting would keep three retired pages in his queue.
test('a closed decision leaves his queue without being called decided', () => {
  const closed = '**Closed 2026-08-16** — superseded by [D0019](2026-08-16-scheduled-sessions-assessment/). He read three pages circling one question and closed all three';
  assert.equal(isAwaiting(closed), false);
  assert.deepEqual(closedInto(closed), { id: 'D0019', slug: '2026-08-16-scheduled-sessions-assessment' });
});

test('a close with no successor is still a close', () => {
  // Not every retirement has somewhere to send the reader, and the state must not
  // depend on one existing.
  assert.equal(isAwaiting('Closed 2026-08-16 — the question stopped mattering'), false);
  assert.deepEqual(closedInto('Closed 2026-08-16 — the question stopped mattering'), { id: null, slug: null });
  assert.deepEqual(closedInto('Retired 2026-08-16'), { id: null, slug: null });
});

test('"closed" only counts at the start of the cell', () => {
  // A decided artifact whose prose mentions closing something else is decided.
  const mentions = '**Decided 2026-08-15** — all three approved; the tracking issue closed against the release';
  assert.equal(closedInto(mentions), null);
  assert.equal(isAwaiting(mentions), false);
  assert.equal(closedInto('Awaiting @jwildfire — S1–S4'), null);
  assert.equal(isAwaiting('Awaiting @jwildfire — S1–S4'), true);
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

test('a byline in a paragraph is chrome, not the quote', () => {
  // Most artifacts put the byline in a <span class="k">, which the paragraph scan
  // skips for free. One backfill put it in a <p> and shipped "@jwildfire · … · in
  // chat" as his words on the published log.
  const r = parseDecisionRecord(wrap(`
    <div class="verdict" data-date="2026-08-15" data-verbatim="false">
      <p><b>@jwildfire &middot; 2026-08-15 &middot; in chat</b></p>
      <p>A1 and A2 accepted as recommended; A3 and A4 held open.</p>
      <p>He also said the goal needs rework.</p>
    </div>`));
  assert.equal(r.entries[0].quote, 'A1 and A2 accepted as recommended; A3 and A4 held open.');
  assert.equal(r.entries[0].outcome, 'He also said the goal needs rework.');
});

test('entities the artifacts actually use come out as characters', () => {
  assert.equal(text('a &middot; b &hellip; c &#8212; d'), 'a · b … c — d');
});
