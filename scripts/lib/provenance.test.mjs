// The property under test is narrow and it is the whole design: a requirement can
// say nobody approved it for free, and it cannot say @jwildfire approved it unless
// he did (#215).
//
// The cases that matter most are the ones where a lie is convenient — a citation
// that looks right, an artifact whose question is still open, a gloss that reads
// plausibly and does not match the record. Those are the tests a self-certifying
// field would pass.
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  EMPTY, parseCitation, parseProvenance, buildApprovalIndex,
  resolveCitation, glossFor, judge, reviewClaim,
} from './provenance.mjs';

// A decision log in the shape collectDecisionLog() returns: the registry supplies
// questions with codes, the artifact's own markup supplies the dated blocks and the
// codes each one resolves. The join between them is the thing being tested.
const LOG = {
  artifacts: [
    {
      id: 'D0018',
      slug: '2026-08-16-roadmap-page-directions',
      title: 'The roadmap page — three directions to react to',
      path: 'reports/decisions/2026-08-16-roadmap-page-directions/',
      questions: [
        { id: 'D0018.1', code: 'R1', question: 'Which direction becomes the roadmap page?' },
        { id: 'D0018.2', code: 'R2', question: 'Does the current inventory page survive behind it?' },
        { id: 'D0018.3', code: 'R3', question: 'Is a fixed recent window the accepted answer?' },
        { id: 'D0018.4', code: 'R4', question: 'Does the spike harness come down with it?' },
      ],
      entries: [
        { date: '2026-08-16', channel: 'in chat', resolves: ['R1', 'R2'], verbatim: true, quote: "i'm good with your rec  build" },
        { date: '2026-08-16', channel: 'in chat, a second exchange', resolves: ['R3'], verbatim: true, quote: 'R3 is fine, leave it as approved' },
      ],
    },
    {
      id: 'D0020',
      slug: '2026-08-17-goal-73-up-to-date',
      title: 'Goal #73 is out of date',
      path: 'reports/decisions/2026-08-17-goal-73-up-to-date/',
      questions: [{ id: 'D0020.4', code: 'G4', question: 'What does the goal get called?' }],
      entries: [
        { date: '2026-08-17', channel: 'in chat, relayed', resolves: ['G4'], verbatim: false, quote: 'The title becomes Increase Autonomy, as recommended.' },
      ],
    },
    {
      // Filed, questions claimed, nothing decided yet — the state most likely to be
      // cited too early, because the id exists and looks authoritative.
      id: 'D0021',
      slug: '2026-08-17-safetycensus-stay-or-go',
      title: 'SafetyCensus(): stays or goes',
      path: 'reports/decisions/2026-08-17-safetycensus-stay-or-go/',
      questions: [{ id: 'D0021.1', code: 'C1', question: 'Does SafetyCensus() ship in v1.1.0?' }],
      entries: [],
    },
  ],
};

const INDEX = buildApprovalIndex(LOG);

const body = (lines) => `### Business Requirement\n\nSomething.\n\n---\n\n${lines.join('\n')}\n`;

// ------------------------------------------------------------------- shape

test('a citation is classified by shape before anything is looked up', () => {
  assert.equal(parseCitation('EMPTY').kind, 'empty');
  assert.equal(parseCitation('D0018').kind, 'artifact');
  assert.equal(parseCitation('D0018.1').kind, 'question');
  assert.equal(parseCitation('jwildfire/gsm.safety#39 review').kind, 'review');
  assert.equal(parseCitation('jwildfire/gsm.safety#39 review').pr, 39);
});

test('prose is not a citation, however true it sounds', () => {
  for (const text of [
    'he said yes in chat',
    '@jwildfire, 2026-08-16',
    'approved in session',
    '#211',
    'D18',
    'D0018.0',
  ]) {
    const c = parseCitation(text);
    assert.equal(c.kind, 'unknown', `"${text}" must not parse as a citation`);
    assert.ok(c.why, 'an unknown citation says why');
  }
});

test('the block is read out of the foot of the body, not a ### section', () => {
  const p = parseProvenance(body([
    'Authored by: 🧭🤖 obot-navigator (Claude Code using Opus 5)',
    'Approved by: EMPTY',
  ]));
  assert.equal(p.present, true);
  assert.equal(p.authoredBy, '🧭🤖 obot-navigator (Claude Code using Opus 5)');
  assert.equal(p.isEmpty, true);
});

test('a body with no block reports absence rather than inventing a value', () => {
  const p = parseProvenance('### Business Requirement\n\nSomething.\n');
  assert.equal(p.present, false);
  assert.equal(p.isEmpty, false);
  assert.deepEqual(p.approved, []);
});

test('several citations and a gloss come apart cleanly', () => {
  const p = parseProvenance(body([
    'Authored by: 👯🤖 W0046',
    'Approved by: D0018.1, D0018.2 — @jwildfire, 2026-08-16, in chat',
    'Beyond the approval: none',
  ]));
  assert.deepEqual(p.approved.map((c) => c.text), ['D0018.1', 'D0018.2']);
  assert.equal(p.gloss, '@jwildfire, 2026-08-16, in chat');
  assert.equal(p.beyond, 'none');
});

// -------------------------------------------------------------- resolution

test('a question citation resolves to what was asked AND what he said', () => {
  const r = resolveCitation('D0018.1', INDEX);
  assert.equal(r.ok, true);
  assert.equal(r.asked, 'Which direction becomes the roadmap page?');
  assert.equal(r.said.words, "i'm good with your rec  build");
  assert.equal(r.said.channel, 'in chat');
  assert.equal(r.said.date, '2026-08-16');
});

test('the right decision block is picked by code, not by position', () => {
  // R3 was a second, separate exchange. Citing D0018.3 must not return the first
  // block's words — two approvals a few hours apart, in the same shape, is the
  // confusion the second worked example on #215 turned on.
  const r = resolveCitation('D0018.3', INDEX);
  assert.equal(r.said.words, 'R3 is fine, leave it as approved');
  assert.equal(r.said.channel, 'in chat, a second exchange');
});

test('a real question with no recorded decision does NOT resolve', () => {
  const r = resolveCitation('D0021.1', INDEX);
  assert.equal(r.ok, false);
  assert.match(r.why, /records no decision resolving it/);
  // It still says what was asked: the fix is to go and get an answer, and the
  // question is the thing to ask.
  assert.equal(r.asked, 'Does SafetyCensus() ship in v1.1.0?');
});

test('a question that was never claimed does not resolve', () => {
  assert.equal(resolveCitation('D0018.9', INDEX).ok, false);
  assert.equal(resolveCitation('D9999.1', INDEX).ok, false);
  assert.equal(resolveCitation('D9999', INDEX).ok, false);
});

test('an artifact citation resolves but is marked weaker than a question citation', () => {
  const r = resolveCitation('D0018', INDEX);
  assert.equal(r.ok, true);
  assert.ok(r.weaker, 'an artifact citation says it is the weaker form');
  assert.equal(r.asked, undefined);
});

test('a review citation is undetermined offline, never false', () => {
  const r = resolveCitation('jwildfire/gsm.safety#39 review', INDEX);
  assert.equal(r.ok, null);
  assert.match(r.why, /needs GitHub/);
});

test('a relayed decision is glossed as relayed rather than quoted as his words', () => {
  const r = resolveCitation('D0020.4', INDEX);
  assert.equal(r.said.verbatim, false);
  assert.equal(glossFor(r), '@jwildfire, 2026-08-17, in chat, relayed (relayed, not verbatim)');
});

// ------------------------------------------------------------------ verdict

test('EMPTY is always valid and costs the filer nothing', () => {
  const v = judge(body(['Authored by: 🧭🤖 obot-navigator', 'Approved by: EMPTY']), INDEX);
  assert.equal(v.state, 'empty');
  assert.deepEqual(v.problems, []);
  // and it does not demand `Beyond the approval` — there is no approval to be beyond
});

test('a resolvable approval passes', () => {
  const v = judge(body([
    'Authored by: 👯🤖 W0046',
    'Approved by: D0018.1 — @jwildfire, 2026-08-16, in chat',
    'Beyond the approval: none',
  ]), INDEX);
  assert.equal(v.state, 'approved');
  assert.deepEqual(v.problems, []);
});

test('an approval that cannot be shown is the finding', () => {
  const v = judge(body([
    'Authored by: 🧭🤖 obot-navigator',
    'Approved by: he said build',
    'Beyond the approval: none',
  ]), INDEX);
  assert.equal(v.state, 'unresolved');
  assert.match(v.problems[0], /does not resolve/);
});

test('citing a decision he has not made yet is caught, not waved through', () => {
  const v = judge(body([
    'Authored by: 🧭🤖 obot-navigator',
    'Approved by: D0021.1',
    'Beyond the approval: none',
  ]), INDEX);
  assert.equal(v.state, 'unresolved');
  assert.match(v.problems[0], /still open/);
});

test('claiming an approval without saying what it does not cover is a problem', () => {
  // #211 in one line: the citation was true for the front half and silent about the
  // teardown, and the issue read identically either way.
  const v = judge(body([
    'Authored by: 🧭🤖 obot-navigator',
    'Approved by: D0018.1',
  ]), INDEX);
  assert.equal(v.state, 'approved');
  assert.equal(v.problems.length, 1);
  assert.match(v.problems[0], /Beyond the approval/);
});

test('a gloss that disagrees with the record is a problem, not a decoration', () => {
  const v = judge(body([
    'Authored by: 🧭🤖 obot-navigator',
    'Approved by: D0018.1 — @jwildfire, 2026-08-17, in the review call',
    'Beyond the approval: none',
  ]), INDEX);
  assert.match(v.problems.join('\n'), /the gloss reads/);
});

test('a blank Approved by is a skipped line, and says to write EMPTY', () => {
  const v = judge(body(['Authored by: 👯🤖 W0046', 'Approved by:']), INDEX);
  assert.match(v.problems.join('\n'), new RegExp(`write \`${EMPTY}\``));
});

test('a missing block is missing, and is not reported as unapproved', () => {
  const v = judge('### Business Requirement\n\nSomething.\n', INDEX);
  assert.equal(v.state, 'missing');
  assert.notEqual(v.state, 'empty');
});

test('requireBlock:false leaves pre-convention requirements alone', () => {
  const v = judge('### Business Requirement\n\nSomething.\n', INDEX, { requireBlock: false });
  assert.equal(v.state, 'missing');
  assert.deepEqual(v.problems, []);
});

// ------------------------------------------------------------------- legacy

test('the drafted-by line is read for the approval claim it already makes', () => {
  assert.equal(
    reviewClaim('This Issue was drafted by 🧭🤖 obot-navigator (Claude Code using Opus 5) and reviewed by @jwildfire.'),
    'asserted',
  );
  assert.equal(
    reviewClaim('This Issue was drafted by 👯🤖 W0041 in an unattended session and not yet reviewed by @jwildfire.'),
    'disclaimed',
  );
  assert.equal(reviewClaim('This Issue was drafted by obot ideas-triage.'), 'none');
  assert.equal(reviewClaim('no attribution at all'), 'none');
});

test('an unattended body that asserts his review, with an EMPTY block, is still surfaced', () => {
  // Both facts are true at once and they contradict each other. The block is the
  // one that resolves, so the state is `empty` — and the stale claim stays visible
  // rather than being silently outvoted.
  const v = judge(`${body(['Authored by: 👯🤖 W0046', 'Approved by: EMPTY'])}\nThis Issue was drafted by 👯🤖 W0046 and reviewed by @jwildfire.`, INDEX);
  assert.equal(v.state, 'empty');
  assert.equal(v.reviewClaim, 'asserted');
});
