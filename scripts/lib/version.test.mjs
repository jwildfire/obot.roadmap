// node --test scripts/lib/version.test.mjs
//
// The defect these exist to prevent shipped, publicly, and nobody noticed for a day.
//
// On 2026-08-16 the deployed catalog page's header read "v2.12.0 – 2026-08-16 01:20
// EDT" on a page that was built at 18:15 EDT. Both halves of that string were true in
// isolation — 2.12.0 was the newest changelog version and 01:20 EDT was its date — and
// the sentence they made together was wrong by seventeen hours, on the one element
// whose whole job is to say whether you are looking at current work. Nothing failed.
// Every test passed. The badge simply read its launch time from a file that does not
// know when the site launched.
//
// So the assertions below pin the two things that stop it recurring: the launch time
// comes from the build and never from the changelog, and a changelog that has fallen
// behind the build says so in words rather than being silently resolved in favour of
// whichever half was easier to reach.
//
// This file sits at scripts/lib/*.test.mjs and must stay there — deploy-site.yml runs
// `node --test scripts/lib/*.test.mjs`, and that glob does not recurse.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildStamp, driftSummary, newestEntry, versionBadge, versionState,
} from './version.mjs';

// The real numbers from the day the lie shipped, so the case that motivated all of
// this is a literal in the suite rather than a story in a comment.
const CHANGELOG = {
  entries: [
    { version: '2.11.0', date: '2026-08-14T20:50:00Z', changes: ['older'] },
    { version: '2.12.0', date: '2026-08-16T05:20:00Z', changes: ['newest'] },
    { version: '2.10.0', date: '2026-08-13T12:00:00Z', changes: ['oldest'] },
  ],
};
const DEPLOY_ENV = {
  OBOT_BUILT_AT: '2026-08-16T22:15:14Z',
  OBOT_COMMIT: '8823cd5c0a8abcbcf89c49ad3365f41cd7067b36',
  OBOT_RUN_ID: '31975835210',
  OBOT_TRIGGER: 'push',
};
const NOW = new Date('2026-08-16T22:15:14Z');
const behind = (n) => ({ known: true, behind: n, since: '28cce81', sinceAt: '2026-08-16T05:01:46Z', subjects: [], more: 0 });

const state = (over = {}) => versionState({
  changelog: CHANGELOG, env: DEPLOY_ENV, now: NOW, drift: behind(0), ...over,
});

test('the newest entry is the newest by date, not the first in the file', () => {
  assert.equal(newestEntry(CHANGELOG).version, '2.12.0');
});

test('an empty or malformed changelog resolves to no entry rather than throwing', () => {
  assert.equal(newestEntry({ entries: [] }), null);
  assert.equal(newestEntry(undefined), null);
  assert.equal(newestEntry({ entries: [{ version: '1.0.0' }] }), null, 'an entry with no date cannot be the newest');
});

test('the launch time is the deploy\'s, not the changelog\'s', () => {
  const s = state();
  assert.equal(s.builtAt, '2026-08-16T22:15:14Z', 'the build stamp is what the workflow froze');
  assert.equal(s.changelogAt, '2026-08-16T05:20:00Z');
  assert.notEqual(s.builtAt, s.changelogAt,
    'these are the two instants that were conflated on 2026-08-16 — they must stay separate values');
});

test('the badge renders the build time and never the changelog date', () => {
  const { panel } = versionBadge(state(), { hubUrl: 'https://github.com/jwildfire/obot.roadmap' });
  assert.match(panel, /2026-08-16 18:15 EDT/, 'the panel shows the build converted to ET');
  assert.doesNotMatch(panel, /01:20/,
    'the changelog date must not appear as the launch time — this is the exact string that shipped wrong');
});

test('every generator in one deploy stamps the same instant', () => {
  // Nine node processes build one site. Without the frozen env they would each take
  // their own clock and the pages of a single deploy would disagree by minutes.
  const first = buildStamp(DEPLOY_ENV, new Date('2026-08-16T22:15:14Z'));
  const last = buildStamp(DEPLOY_ENV, new Date('2026-08-16T22:18:02Z'));
  assert.equal(first.at, last.at, 'the frozen stamp wins over each process\'s own clock');
  assert.equal(first.frozen, true);
});

test('a local build is not given a launch time', () => {
  const s = state({ env: {} });
  assert.equal(s.ci, false);
  const { panel } = versionBadge(s, { hubUrl: 'https://x/y' });
  assert.match(panel, /local build/, 'the deploy greps published pages for exactly this phrase');
  assert.doesNotMatch(panel, /Launched/, 'a working tree never launched, so it is not given a launch time');
});

test('a deploy carrying unrecorded changes says so rather than picking a half', () => {
  const d = driftSummary(state({ drift: behind(11) }), { now: NOW });
  assert.equal(d.ok, false);
  assert.equal(d.behind, 11);
  assert.match(d.text, /11 commits behind/);
  assert.match(d.text, /unrecorded/);
  assert.match(d.text, /2\.12\.0/, 'the sentence names the version it is talking about');
});

test('one unrecorded commit is described in the singular', () => {
  const d = driftSummary(state({ drift: behind(1) }), { now: NOW });
  assert.match(d.text, /1 commit behind/);
  assert.match(d.text, /one change/);
  assert.doesNotMatch(d.text, /commits behind/);
});

test('the healthy line still carries the numbers', () => {
  // auditFreshness settled this and it is the reason the 2026-08-16 misreading is
  // preventable at all: a line that speaks only when something is late teaches nobody
  // what current looks like, and the misreading happened inside every sane threshold.
  const d = driftSummary(state({ drift: behind(0) }), { now: NOW });
  assert.equal(d.ok, true);
  assert.match(d.text, /2\.12\.0/, 'the aligned line still names the version');
  assert.match(d.text, /current with this build/);
});

test('drift that could not be computed is stated, not rendered as zero', () => {
  const d = driftSummary(state({ drift: { known: false, why: 'the checkout is shallow' } }), { now: NOW });
  assert.equal(d.ok, false);
  assert.equal(d.unknown, true);
  assert.match(d.text, /unknown/);
  assert.match(d.text, /shallow/, 'the reason travels with the verdict — a blank reads as agreement');
});

test('the badge label is the version alone, so it cannot push the nav onto a second line', () => {
  const { badge } = versionBadge(state(), { hubUrl: 'https://x/y' });
  assert.match(badge, />v2\.12\.0/);
  assert.doesNotMatch(badge, /EDT|2026-08/,
    'the date belongs in the panel; in the label it measured 247px and wrapped the nav at 390px');
  assert.doesNotMatch(badge, /\stitle=/,
    'a native tooltip would fight the panel on every desktop hover');
});

test('the badge and the panel are separate pieces, because they go in different places', () => {
  const { badge, panel } = versionBadge(state(), { hubUrl: 'https://x/y' });
  assert.match(badge, /^<button/, 'the badge is a child of nav.site and wraps with the links');
  assert.match(panel, /^<div class="version-panel"/, 'the panel is a sibling of the nav, anchored to header.site');
  assert.match(badge, /aria-controls="version-panel"/);
  assert.match(badge, /aria-expanded="false"/);
});

test('the drift flag appears on the badge only when there is drift', () => {
  assert.doesNotMatch(versionBadge(state({ drift: behind(0) }), {}).badge, /vs-flag/);
  assert.match(versionBadge(state({ drift: behind(3) }), {}).badge, /vs-flag/);
});

test('the header markup carries no second aria-label="Site"', () => {
  // Eleven pages are asserted for exactly one of these in deploy-site.yml, and
  // scripts/lib/audit/page.test.mjs asserts the same count independently.
  const { badge, panel } = versionBadge(state(), { hubUrl: 'https://x/y' });
  assert.equal(`${badge}${panel}`.includes('aria-label="Site'), false);
});

test('the commit link points at the deployed commit, and a local build does not link', () => {
  const hub = 'https://github.com/jwildfire/obot.roadmap';
  assert.match(versionBadge(state(), { hubUrl: hub }).panel,
    /href="https:\/\/github\.com\/jwildfire\/obot\.roadmap\/commit\/8823cd5c0a8abcbcf89c49ad3365f41cd7067b36"/);
  assert.doesNotMatch(versionBadge(state({ env: {} }), { hubUrl: hub }).panel, /\/commit\//,
    'a local sha is not on the remote, so linking it would 404');
});

test('the full-log link is depth-corrected so nested pages do not link into their own directory', () => {
  const deep = versionBadge(state(), { depth: 1, hubUrl: 'https://x/y' }).panel;
  assert.match(deep, /href="\.\.\/catalog\.html"/, 'audit/, goals/, decisions/ and analytics/ all sit one deep');
});
