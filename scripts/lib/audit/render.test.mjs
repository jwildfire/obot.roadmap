// node --test scripts/lib/audit/
//
// The roadmap page's Audit fold, asserted on the one property #201 exists for:
// the age of the ledger is on the surface in every state, including the state
// where there is nothing to report. "Findings (0) — the roadmap satisfies every
// rule" was true of a 22-hour-old file and false of the roadmap.
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { auditSection } from './render.mjs';
import { STALE_HOURS } from './freshness.mjs';

const NOW = new Date('2026-08-16T06:00:00Z');

const ledger = (over = {}) => ({
  version: 1,
  generatedAt: '2026-08-15T07:51:52Z', // the real 2026-08-16 file: 22h old
  source: 'run 1',
  boardReadable: true,
  counts: { total: 0, high: 0, medium: 0, low: 0, mechanical: 0, agentic: 0, muted: 0 },
  rules: [{ id: 'OFF-BOARD-REQUIREMENT', title: 'Hub issue missing from the board', group: 'Board integrity', why: 'w', fix: 'f', fired: 0 }],
  findings: [],
  ...over,
});

const finding = {
  id: 'OFF-BOARD-REQUIREMENT:jwildfire/obot.roadmap#189',
  rule: 'OFF-BOARD-REQUIREMENT',
  ruleTitle: 'Hub issue missing from the board',
  group: 'Board integrity',
  confidence: 'high',
  subject: { kind: 'issue', repo: 'jwildfire/obot.roadmap', number: 189, title: 'demo-301 publishes the snapshot twice', url: 'https://example.invalid/189' },
  evidence: ['labelled `infrastructure`', 'no item on the obot Roadmap project', 'issue is OPEN'],
  proposal: { kind: 'mechanical', summary: 'Add it to the obot Roadmap project at Backlog.', ops: [{ op: 'add-to-board', label: 'add to the obot Roadmap project at Backlog' }] },
  firstSeen: '2026-08-15', lastSeen: '2026-08-15', runs: 1, reappeared: false, muted: false, mutedUntil: null, decisions: [],
};

test('a clean audit still says how old it is — the 0-findings case is the dangerous one', () => {
  const html = auditSection(ledger(), { now: NOW });
  assert.match(html, /22h ago/);
  assert.match(html, /Findings \(0\) as of 22h ago/);
  // The bare "satisfies every rule" claim, which is what got quoted, is gone.
  assert.doesNotMatch(html, /the roadmap satisfies every rule/);
  assert.match(html, /anything filed since is invisible to it/);
});

test('the age sits above the fold, not inside it', () => {
  const html = auditSection(ledger(), { now: NOW });
  assert.ok(html.indexOf('audit-fresh') < html.indexOf('id="audit-findings"'),
    'a reader who never opens the fold must still see the date');
});

test('findings carry the same as-of stamp in the fold headline', () => {
  const html = auditSection(ledger({
    counts: { total: 1, high: 1, medium: 0, low: 0, mechanical: 1, agentic: 0, muted: 0 },
    findings: [finding],
  }), { now: NOW });
  assert.match(html, /Findings \(1\) as of 22h ago/);
  assert.match(html, /labelled `infrastructure`/);
});

test('past the threshold the line escalates to a notice and says the findings are history', () => {
  const html = auditSection(ledger({ generatedAt: '2026-08-14T00:00:00Z' }), { now: NOW });
  assert.match(html, /rm-notice audit-fresh/);
  assert.match(html, new RegExp(`past the ${STALE_HOURS}-hour mark`));
  assert.match(html, /as it was, not as it is/);
});

test('a missing ledger still renders the section, and says nothing has run', () => {
  const html = auditSection(null, { now: NOW });
  assert.match(html, /No audit has run yet/);
  assert.doesNotMatch(html, /satisfies every rule/);
});
