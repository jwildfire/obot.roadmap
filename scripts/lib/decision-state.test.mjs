// The one authority for whether a decision has been made (#196, #255).
//
// Before this module the answer lived in two places — the Status cell of the index
// table and a `status` field a few sessions had written into the registry — and on
// the night of 2026-08-18 ten of twenty-one artifacts disagreed. The tests here pin
// the rule that replaced them: the artifact page declares its own state, the
// declaration is only valid if the page carries the evidence for it, and every other
// store is a generated view of that.
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  STATES, readArtifactState, indexRowState, coarse, isAwaiting, hasRuled, auditDecisionStatus, parseIndexTable, stampFor,
} from './decision-state.mjs';

const page = (attrs = '', body = '') => `<html><head><title>x</title></head><body>
<section id="decisions"${attrs}><h2>Decisions</h2>${body}</section></body></html>`;

const block = (date = '2026-08-15', resolves = 'A1') =>
  `<div class="verdict" data-date="${date}" data-channel="in chat" data-resolves="${resolves}">
<span class="k">@jwildfire &middot; ${date} &middot; in chat</span>
<p>&ldquo;Recommendations approved.&rdquo;</p></div>`;

// ---------------------------------------------------------------- the authority

test('a page with no Decisions section is open, and that is not a defect', () => {
  const s = readArtifactState('<html><body><h1>An open question</h1></body></html>');
  assert.equal(s.state, 'open');
  assert.equal(s.present, false);
  assert.equal(s.blocks, 0);
  assert.deepEqual(s.problems, []);
});

test('a page declares its state on the Decisions section', () => {
  for (const state of STATES.filter((s) => s !== 'open')) {
    const s = readArtifactState(page(` data-state="${state}"`, block()));
    assert.equal(s.state, state, state);
    assert.deepEqual(s.problems, [], state);
  }
});

// The whole point of putting the state on the evidence page: it cannot be written
// without the evidence being there too. A one-word claim in a JSON file is what got
// us here.
test('claiming a ruling with no recorded decision is a problem, not a state', () => {
  const s = readArtifactState(page(' data-state="decided"', '<p>nothing recorded</p>'));
  assert.equal(s.blocks, 0);
  assert.equal(s.problems.length, 1);
  assert.match(s.problems[0], /decided.*no dated decision/i);
});

test('claiming open while the page records his words is the same defect inverted', () => {
  const s = readArtifactState(page(' data-state="open"', block()));
  assert.equal(s.problems.length, 1);
  assert.match(s.problems[0], /open.*records 1/i);
});

test('a Decisions section that declares nothing is a problem, and falls back to the evidence', () => {
  const s = readArtifactState(page('', block()));
  assert.equal(s.declared, null);
  assert.equal(s.state, 'decided'); // so the site still renders while the check fails
  assert.equal(s.problems.length, 1);
  assert.match(s.problems[0], /does not declare/i);
});

test('a state outside the vocabulary is refused rather than believed', () => {
  const s = readArtifactState(page(' data-state="mostly decided"', block()));
  assert.equal(s.problems.length, 1);
  assert.match(s.problems[0], /mostly decided/);
});

// Two dates, two facts. Every hand-written decidedOn in the registry (six of them,
// written before this scheme) is the date of the FIRST block, and every closedOn is
// the date of the last — so deriving them that way reproduces the record rather than
// rewriting it.
test('every dated block counts: the first is when he ruled, the last is where it ended', () => {
  const s = readArtifactState(page(' data-state="decided"', block('2026-08-16') + block('2026-08-17', 'A2')));
  assert.equal(s.blocks, 2);
  assert.equal(s.first, '2026-08-16');
  assert.equal(s.latest, '2026-08-17');
  assert.equal(stampFor(s).decidedOn, '2026-08-16');
});

test('a closed page records both when he ruled and when he closed it', () => {
  const s = readArtifactState(page(' data-state="closed"', block('2026-08-15') + block('2026-08-16', 'A2')));
  assert.deepEqual(stampFor(s), { state: 'closed', status: 'closed', decidedOn: '2026-08-15', closedOn: '2026-08-16' });
});

test('an open page is stamped with no dates at all — there is nothing to date', () => {
  assert.deepEqual(stampFor(readArtifactState('<html><body>x</body></html>')), { state: 'open', status: 'open' });
});

// ---------------------------------------------------------------- the index cell

test('the index Status cell renders the same four states, emphasis and all', () => {
  assert.equal(indexRowState('Awaiting @jwildfire — C1–C2 (D0021.1–.2)'), 'open');
  assert.equal(indexRowState('**Decided 2026-08-16** — N1–N8 all adopted'), 'decided');
  assert.equal(indexRowState('Partially decided 2026-08-17 — G3 and G4 answered'), 'partially decided');
  assert.equal(indexRowState('**Closed 2026-08-16** — superseded by [D0019](x/)'), 'closed');
  assert.equal(indexRowState('Folded into [D0017](x/)'), 'closed');
});

// "Partially decided" starts with neither "partially" nor "decided" alone once the
// emphasis comes off, and reading it as plain Decided is exactly how the sweep and
// the site came to disagree about D0020.
test('partially decided is not decided', () => {
  assert.notEqual(indexRowState('Partially decided 2026-08-17'), 'decided');
});

test('a status cell nobody can classify is null, not a guess', () => {
  assert.equal(indexRowState('probably fine'), null);
  assert.equal(indexRowState(''), null);
});

// ---------------------------------------------------------------- the projections

test('awaiting means something is still his — open and partial both are', () => {
  assert.equal(isAwaiting('open'), true);
  assert.equal(isAwaiting('partially decided'), true);
  assert.equal(isAwaiting('decided'), false);
  assert.equal(isAwaiting('closed'), false);
});

test('he has ruled on anything that is not open, including what he closed', () => {
  assert.deepEqual(STATES.map(hasRuled), [false, true, true, true]);
});

// The registry's coarse field answers one yes/no question — has he ruled here — and
// the Navigator sweep compares it to the index. A partial has to land on the same
// side of that line as the index cell does, or the sweep reports a disagreement that
// is really a vocabulary mismatch.
test('the coarse projection puts a partial on the decided side of the line', () => {
  assert.equal(coarse('open'), 'open');
  assert.equal(coarse('partially decided'), 'decided');
  assert.equal(coarse('decided'), 'decided');
  assert.equal(coarse('closed'), 'closed');
});

// ---------------------------------------------------------------- the audit

const registry = (...artifacts) => ({ prefix: 'D', artifacts });
const entry = (id, slug, extra = {}) => ({ id, slug, questions: [{ id: `${id}.1`, code: 'A1', question: 'x' }], ...extra });

test('artifact, index and registry agreeing produces no problems', () => {
  const r = auditDecisionStatus({
    registry: registry(entry('D0001', 'a-slug', { state: 'decided', status: 'decided', decidedOn: '2026-08-15' })),
    indexRows: [{ slug: 'a-slug', status: '**Decided 2026-08-15** — approved' }],
    pages: new Map([['a-slug', page(' data-state="decided"', block())]]),
  });
  assert.deepEqual(r.problems, []);
  assert.equal(r.states.get('a-slug'), 'decided');
});

// This is the defect the issue was filed for, in one assertion.
test('an index row that says decided over a registry that does not is a problem', () => {
  const r = auditDecisionStatus({
    registry: registry(entry('D0001', 'a-slug')),
    indexRows: [{ slug: 'a-slug', status: '**Decided 2026-08-15** — approved' }],
    pages: new Map([['a-slug', page(' data-state="decided"', block())]]),
  });
  assert.equal(r.problems.length, 1);
  assert.match(r.problems[0], /D0001.*registry.*stale|D0001.*re-?stamp/i);
});

test('an index row that contradicts the page is a problem naming both', () => {
  const r = auditDecisionStatus({
    registry: registry(entry('D0001', 'a-slug', { state: 'decided', status: 'decided', decidedOn: '2026-08-15' })),
    indexRows: [{ slug: 'a-slug', status: 'Awaiting @jwildfire — A1' }],
    pages: new Map([['a-slug', page(' data-state="decided"', block())]]),
  });
  assert.equal(r.problems.length, 1);
  assert.match(r.problems[0], /index says "open".*page.*"decided"/i);
});

test('a page problem is reported through the audit rather than swallowed', () => {
  const r = auditDecisionStatus({
    registry: registry(entry('D0001', 'a-slug', { state: 'decided', status: 'decided' })),
    indexRows: [{ slug: 'a-slug', status: '**Decided 2026-08-15**' }],
    pages: new Map([['a-slug', page(' data-state="decided"', '<p>no block</p>')]]),
  });
  assert.ok(r.problems.some((p) => /no dated decision/i.test(p)));
});

test('a registry artifact with no page, and an index row with no registry entry, are both named', () => {
  const r = auditDecisionStatus({
    registry: registry(entry('D0001', 'a-slug', { state: 'open', status: 'open' })),
    indexRows: [{ slug: 'a-slug', status: 'Awaiting @jwildfire' }, { slug: 'ghost', status: 'Awaiting @jwildfire' }],
    pages: new Map(),
  });
  assert.equal(r.problems.length, 2);
  assert.ok(r.problems.some((p) => /a-slug.*no index\.html/i.test(p)));
  assert.ok(r.problems.some((p) => /ghost.*no registry entry/i.test(p)));
});

test('an artifact missing from the published index is a problem — the log would omit it', () => {
  const r = auditDecisionStatus({
    registry: registry(entry('D0001', 'a-slug', { state: 'decided', status: 'decided', decidedOn: '2026-08-15' })),
    indexRows: [],
    pages: new Map([['a-slug', page(' data-state="decided"', block())]]),
  });
  assert.equal(r.problems.length, 1);
  assert.match(r.problems[0], /no row in the published index/i);
});

// closedOn and decidedOn were hand-written on six entries before this change. They
// are kept rather than deleted, and checked, so they cannot drift quietly either.
test('a recorded date that disagrees with the page is a problem', () => {
  const r = auditDecisionStatus({
    registry: registry(entry('D0001', 'a-slug', { state: 'decided', status: 'decided', decidedOn: '2026-08-11' })),
    indexRows: [{ slug: 'a-slug', status: '**Decided 2026-08-15**' }],
    pages: new Map([['a-slug', page(' data-state="decided"', block('2026-08-15'))]]),
    // decidedOn 2026-08-11 against a page whose only decision is dated 2026-08-15
  });
  assert.equal(r.problems.length, 1);
  assert.match(r.problems[0], /2026-08-11.*2026-08-15/);
});

// ---------------------------------------------------------------- the index table

test('the index table parses to rows keyed by column, with the slug pulled out', () => {
  const md = [
    '# Decision artifacts', '', '## Index', '',
    '| Decision | Date | Goal | Discussion | Status |',
    '|---|---|---|---|---|',
    '| [A title](2026-08-14-a-slug/) | 2026-08-14 | [#73](u) | [#155](u) | **Decided 2026-08-15** — yes |',
    '| [Another](2026-08-16-b-slug/) | 2026-08-16 | — | — | Awaiting @jwildfire |',
  ].join('\n');
  const rows = parseIndexTable(md);
  assert.equal(rows.length, 2);
  assert.equal(rows[0].slug, '2026-08-14-a-slug');
  assert.equal(rows[0].title, 'A title');
  assert.equal(rows[0].date, '2026-08-14');
  assert.equal(indexRowState(rows[0].status), 'decided');
  assert.equal(indexRowState(rows[1].status), 'open');
});

test('a README with no Index section fails loudly rather than returning nothing', () => {
  assert.throws(() => parseIndexTable('# Decisions\n\nno table here\n'), /no "## Index"/);
});
