// The premise strip's rules, as tests.
//
// jwildfire/obot.roadmap#266, task #301. What is asserted here is almost entirely
// about NOT collapsing states: the mechanism exists because five surfaces rendered
// "we do not know" as "it is fine", so the tests that matter are the ones that fail
// when a fourth surface starts doing it again.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import {
  HISTORY, LIVE, STALE_HOURS,
  agoPhrase, malformedPremises, parsePremiseContent, parsePremises,
  premiseFingerprint, premiseRows, premiseState, premiseStrip, premiseSummary, premiseScript,
} from './premise-status.mjs';
import { readPremiseStatus } from './public-channel.mjs';

const meta = (content, scope) => `<meta name="premise"${scope ? ` scope="${scope}"` : ''} content="${content}">`;
const page = (...tags) => `<!doctype html><html><head><title>t</title>${tags.join('')}</head><body><div class="wrap">argument</div></body></html>`;

const NOW = new Date('2026-08-21T12:00:00Z');
const minsAgo = (m) => new Date(NOW.getTime() - m * 60000).toISOString();
const reading = (id, sha, state, at, why = null) => [id, { state, at, why, sha }];

// ------------------------------------------------------------------ parsing

test('a premise is a sentence and a proof, split on the first bar', () => {
  const p = parsePremiseContent('the release is held | gh release view v1 --json isDraft → prints true');
  assert.equal(p.sentence, 'the release is held');
  assert.equal(p.command, 'gh release view v1 --json isDraft');
  assert.equal(p.expect, 'prints true');
  assert.equal(p.manual, false);
});

test('a manual premise says so and carries no command', () => {
  const p = parsePremiseContent('the board still shows this — manual — look at the project board');
  assert.equal(p.manual, false, 'the manual marker only counts after the bar');
  const q = parsePremiseContent('the board still shows this | manual — look at the project board');
  assert.equal(q.manual, true);
  assert.equal(q.command, null);
  assert.equal(q.expect, 'look at the project board');
});

test('a proof may contain quotes and arrows of its own without being truncated', () => {
  const html = page(meta('exported | gh api x --jq &#39;.a | test(&quot;export&quot;)&#39; → prints true', 'live'));
  const [p] = parsePremises(html);
  assert.equal(p.command, `gh api x --jq '.a | test("export")'`);
  assert.equal(p.expect, 'prints true');
});

test('scope is carried as written, and a scope that is neither word is refused rather than guessed', () => {
  const [live, hist, bad, none] = parsePremises(page(
    meta('a | test → ok', 'live'), meta('b | test → ok', 'history'),
    meta('c | test → ok', 'someday'), meta('d | test → ok'),
  ));
  assert.equal(live.scope, LIVE);
  assert.equal(hist.scope, HISTORY);
  assert.equal(bad.scope, null);
  assert.equal(bad.scopeError, 'someday');
  assert.equal(none.scope, null);
  assert.equal(none.scopeError, null);
});

test('a declaration that cannot be parsed is counted, not silently dropped', () => {
  const html = '<head><meta name="premise" content="unclosed></head><body></body>';
  assert.equal(parsePremises(html).length, 0);
  assert.equal(malformedPremises(html), 1);
});

// -------------------------------------------------------------- fingerprint

test('the fingerprint is twelve hex characters over the proof, and changes when the proof does', () => {
  const a = premiseFingerprint({ manual: false, command: 'gh api x', expect: 'prints true' });
  assert.match(a, /^[0-9a-f]{12}$/);
  assert.equal(a, premiseFingerprint({ manual: false, command: ' gh api x ', expect: 'prints true' }), 'whitespace only');
  assert.notEqual(a, premiseFingerprint({ manual: false, command: 'gh api y', expect: 'prints true' }));
  assert.notEqual(a, premiseFingerprint({ manual: false, command: 'gh api x', expect: 'prints false' }));
  assert.notEqual(a, premiseFingerprint({ manual: true, expect: 'gh api x prints true' }));
});

// ------------------------------------------------------------ channel reader

const tmp = (payload) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'premise-'));
  const file = path.join(dir, 'premise-status.json');
  fs.writeFileSync(file, typeof payload === 'string' ? payload : JSON.stringify(payload));
  return file;
};
const good = (over = {}) => ({
  _schema: 'obot.roadmap/premise-status@1',
  asOf: '2026-08-21T12:00:00Z',
  readings: [{ id: 'D0021.p2', sha: '0123456789ab', state: 'holds', at: '2026-08-21T11:59:00Z', why: null }],
  ...over,
});

test('a well-formed payload is read', () => {
  const r = readPremiseStatus({ file: tmp(good()) });
  assert.equal(r.ok, true);
  assert.equal(r.readings.get('D0021.p2').state, 'holds');
});

test('an absent channel is a stated absence, never an empty pass', () => {
  const r = readPremiseStatus({ file: path.join(os.tmpdir(), 'nothing-here-at-all.json') });
  assert.equal(r.ok, false);
  assert.match(r.why, /no premise reading/);
});

test('the whole payload is refused rather than partly accepted', () => {
  const rows = (r) => good({ readings: [good().readings[0], r] });
  const cases = [
    ['an extra top-level field', good({ extra: 1 })],
    ['a version this site does not read', good({ _schema: 'obot.roadmap/premise-status@2' })],
    ['an undated payload', good({ asOf: 'yesterday' })],
    ['readings that are not a list', good({ readings: {} })],
    ['an extra row field', rows({ id: 'D0022.p1', sha: '0123456789ab', state: 'holds', at: '2026-08-21T11:00:00Z', why: null, note: 'hi' })],
    ['a state outside the enum', rows({ id: 'D0022.p1', sha: '0123456789ab', state: 'probably', at: '2026-08-21T11:00:00Z', why: null })],
    ['an id that is not a premise id', rows({ id: 'whatever', sha: '0123456789ab', state: 'holds', at: '2026-08-21T11:00:00Z', why: null })],
    ['a fingerprint that is not hex', rows({ id: 'D0022.p1', sha: 'not-a-hash!!', state: 'holds', at: '2026-08-21T11:00:00Z', why: null })],
    ['a reason outside the enum', rows({ id: 'D0022.p1', sha: '0123456789ab', state: 'unknown', at: null, why: 'the sweep said something in prose' })],
    ['an unknown with no reason', rows({ id: 'D0022.p1', sha: '0123456789ab', state: 'unknown', at: null, why: null })],
    ['a measured verdict carrying a reason', rows({ id: 'D0022.p1', sha: '0123456789ab', state: 'holds', at: '2026-08-21T11:00:00Z', why: 'manual' })],
    ['a verdict with no time', rows({ id: 'D0022.p1', sha: '0123456789ab', state: 'holds', at: null, why: null })],
    ['the same premise twice', good({ readings: [good().readings[0], good().readings[0]] })],
    ['not json at all', '{oh dear'],
  ];
  for (const [what, payload] of cases) {
    const r = readPremiseStatus({ file: tmp(payload) });
    assert.equal(r.ok, false, `${what} should be refused`);
    assert.equal(typeof r.why, 'string');
    // The reason is this site's own words. A rejected payload's contents never
    // travel into a message a page might render.
    assert.doesNotMatch(r.why, /oh dear|prose|not-a-hash/);
  }
});

test('a premise nothing could run may be dated null, and only when it is unknown', () => {
  const r = readPremiseStatus({ file: tmp(good({ readings: [{ id: 'D0021.p2', sha: '0123456789ab', state: 'unknown', at: null, why: 'manual' }] })) });
  assert.equal(r.ok, true);
  assert.equal(r.readings.get('D0021.p2').at, null);
});

// ------------------------------------------------------------------- rows

const HTML = page(
  meta('one | gh api one → prints true', 'live'),
  meta('two | gh api two → prints true', 'live'),
  meta('three | manual — go and look', 'live'),
);
const sha = (i) => premiseFingerprint(parsePremises(HTML)[i]);

test('the five row states are kept apart', () => {
  const rows = premiseRows(HTML, {
    artifactId: 'D0099',
    readings: new Map([
      reading('D0099.p1', sha(0), 'holds', minsAgo(5)),
      reading('D0099.p2', sha(1), 'fails', minsAgo(5)),
      reading('D0099.p3', sha(2), 'unknown', null, 'manual'),
    ]),
    awaiting: true,
  });
  assert.deepEqual(rows.map((r) => r.state), ['holds', 'broken', 'manual']);
});

test('a reading for a premise that has since been reworded does not apply to it', () => {
  const rows = premiseRows(HTML, {
    artifactId: 'D0099',
    readings: new Map([reading('D0099.p1', '000000000000', 'holds', minsAgo(5))]),
    awaiting: true,
  });
  assert.equal(rows[0].state, 'unread');
  assert.match(rows[0].why, /reworded/);
});

test('a premise with no reading at all is unread, never holding', () => {
  const rows = premiseRows(HTML, { artifactId: 'D0099', readings: new Map(), awaiting: true });
  assert.equal(rows[0].state, 'unread');
  assert.equal(rows[2].state, 'manual', 'a manual premise says so from the page itself');
});

test('a manual premise shows what a person is meant to look at, from the page itself', () => {
  const rows = premiseRows(HTML, { artifactId: 'D0099', readings: new Map(), awaiting: true });
  assert.equal(rows[2].state, 'manual');
  assert.equal(rows[2].why, 'go and look');
});

test('a strip with nothing to age carries no staleness line at all', () => {
  const s = premiseState(page(), { artifactId: 'D0099', now: NOW });
  const html = premiseStrip(s, {});
  assert.doesNotMatch(html, /pcx-stale-line/, 'a page with no reading has nothing that could go stale');
  assert.doesNotMatch(html, /an unknown time/);
});

test('an unknown reading says which kind of not-knowing it was', () => {
  const rows = premiseRows(HTML, {
    artifactId: 'D0099',
    readings: new Map([reading('D0099.p1', sha(0), 'unknown', null, 'refused')]),
    awaiting: true,
  });
  assert.equal(rows[0].state, 'unchecked');
  assert.match(rows[0].why, /read-only/);
});

test('the premise decides whether it is re-checked, and the artifact only where it said nothing', () => {
  const html = page(meta('a | gh api a → ok', 'live'), meta('b | gh api b → ok', 'history'), meta('c | gh api c → ok'));
  const settled = premiseRows(html, { artifactId: 'D0099', awaiting: false });
  assert.deepEqual(settled.map((r) => r.tracked), [true, false, false], 'live rides on a settled page; undeclared does not');
  const open = premiseRows(html, { artifactId: 'D0099', awaiting: true });
  assert.deepEqual(open.map((r) => r.tracked), [true, false, true], 'history never rides, whatever the page state');
});

// ---------------------------------------------------------------- summary

const summaryFor = (readings, over = {}) => premiseSummary(
  premiseRows(HTML, { artifactId: 'D0099', readings, awaiting: true }),
  { now: NOW, ...over },
);

test('an expired premise outranks everything else the strip could say', () => {
  const s = summaryFor(new Map([
    reading('D0099.p1', sha(0), 'fails', minsAgo(60 * 24 * 9)),
    reading('D0099.p2', sha(1), 'holds', minsAgo(3)),
    reading('D0099.p3', sha(2), 'unknown', null, 'manual'),
  ]));
  assert.equal(s.verdict, 'expired');
  assert.equal(s.broken, 1);
});

test('holding requires every premise on the cadence to have been measured and held', () => {
  const all = new Map([
    reading('D0099.p1', sha(0), 'holds', minsAgo(3)),
    reading('D0099.p2', sha(1), 'holds', minsAgo(4)),
    reading('D0099.p3', sha(2), 'unknown', null, 'manual'),
  ]);
  assert.equal(summaryFor(all).verdict, 'partial', 'a manual premise among them is not "all still hold"');
  all.set('D0099.p3', { state: 'holds', at: minsAgo(4), why: null, sha: sha(2) });
  assert.equal(summaryFor(all).verdict, 'holding');
});

test('the age quoted is the oldest reading, because that is the one the claim is bounded by', () => {
  const s = summaryFor(new Map([
    reading('D0099.p1', sha(0), 'holds', minsAgo(3)),
    reading('D0099.p2', sha(1), 'holds', minsAgo(600)),
    reading('D0099.p3', sha(2), 'holds', minsAgo(4)),
  ]));
  assert.equal(Math.round(s.ageMin), 600);
});

test('past the bar the strip stops asserting a verdict', () => {
  const old = minsAgo(STALE_HOURS * 60 + 60);
  const s = summaryFor(new Map([
    reading('D0099.p1', sha(0), 'holds', old),
    reading('D0099.p2', sha(1), 'holds', old),
    reading('D0099.p3', sha(2), 'holds', old),
  ]));
  assert.equal(s.stale, true);
  assert.equal(s.verdict, 'stale');
});

test('a reading from the future is a clock problem and does not read as fresh', () => {
  const s = summaryFor(new Map([reading('D0099.p1', sha(0), 'holds', minsAgo(-120))]));
  assert.equal(s.stale, true);
});

test('never measured is its own verdict and is not staleness', () => {
  const s = summaryFor(new Map());
  assert.equal(s.verdict, 'unmeasured');
  assert.equal(s.stale, false, 'nothing has aged, because nothing was ever read');
});

test('a page with no premise says so, and one whose declarations are unreadable says something else', () => {
  assert.equal(premiseState(page(), { artifactId: 'D0099', now: NOW }).verdict, 'none');
  const broken = '<head><meta name="premise" content="unclosed></head><body></body>';
  const s = premiseState(broken, { artifactId: 'D0099', now: NOW });
  assert.equal(s.verdict, 'unreadable');
  assert.equal(s.malformed, 1);
});

// ---------------------------------------------------------------- rendering

test('the strip carries the verdict, the premise sentences and an absolute time with no script at all', () => {
  const s = summaryFor(new Map([
    reading('D0099.p1', sha(0), 'fails', minsAgo(6)),
    reading('D0099.p2', sha(1), 'holds', minsAgo(6)),
    reading('D0099.p3', sha(2), 'unknown', null, 'manual'),
  ]));
  const html = premiseStrip(s, { artifactId: 'D0099', slug: 'a-slug' });
  assert.match(html, /pcx-v-expired/);
  assert.match(html, /Premise expired/);
  assert.match(html, /no longer holds/);
  assert.match(html, /<details[^>]* open>/, 'an expired premise is not folded away behind a click');
  assert.match(html, /checked 2026-08-21 11:54 UTC/, 'an absolute time, readable without javascript');
  assert.match(html, /a person has to check this/);
});

test('a premise sentence is escaped into the strip, never interpolated', () => {
  const html = page(meta('a &lt;script&gt;alert(1)&lt;/script&gt; premise | gh api x → ok', 'live'));
  const s = premiseState(html, { artifactId: 'D0099', awaiting: true, now: NOW });
  const out = premiseStrip(s, { artifactId: 'D0099' });
  assert.doesNotMatch(out, /<script>alert/);
  assert.match(out, /&lt;script&gt;alert/);
});

test('a strip built from a stale reading renders stale statically, before any script runs', () => {
  const old = minsAgo(STALE_HOURS * 60 + 60);
  const s = summaryFor(new Map([
    reading('D0099.p1', sha(0), 'holds', old),
    reading('D0099.p2', sha(1), 'holds', old),
    reading('D0099.p3', sha(2), 'holds', old),
  ]));
  assert.match(premiseStrip(s, {}), /pcx-is-stale/);
});

test('an expired verdict never decays into "no recent reading", however old the measurement', () => {
  const ancient = minsAgo(60 * 24 * 40);
  const s = summaryFor(new Map([
    reading('D0099.p1', sha(0), 'fails', ancient),
    reading('D0099.p2', sha(1), 'holds', ancient),
    reading('D0099.p3', sha(2), 'holds', ancient),
  ]));
  assert.equal(s.verdict, 'expired');
  assert.equal(s.stale, true, 'the reading really is old');
  const html = premiseStrip(s, {});
  assert.doesNotMatch(html, /pcx-is-stale/, 'the alarm survives its own age');
  assert.match(html, /no longer holds, measured <span[^>]*>40 days ago/, 'and says how old it is');
});

test('a stale strip stops asserting the present tense on its rows too', () => {
  const old = minsAgo(STALE_HOURS * 60 + 60);
  const s = summaryFor(new Map([
    reading('D0099.p1', sha(0), 'holds', old),
    reading('D0099.p2', sha(1), 'holds', old),
    reading('D0099.p3', sha(2), 'holds', old),
  ]));
  const html = premiseStrip(s, {});
  assert.match(html, /pcx-is-stale/);
  assert.match(html, /held when it was last checked/);
});

test('the reader-side script can only ever escalate', () => {
  const src = premiseScript();
  assert.match(src, /classList\.add\('pcx-is-stale'\)/);
  assert.doesNotMatch(src, /classList\.remove/, 'a page cannot become fresher after it was built');
  assert.match(src, /data-pcx-stale-hours/);
  assert.match(src, /pcx-v-expired/, 'and never downgrades an alarm');
});

test('the age phrase is the same one the sweep uses', () => {
  assert.equal(agoPhrase(0.5), 'just now');
  assert.equal(agoPhrase(1), '1 minute ago');
  assert.equal(agoPhrase(90), '2 hours ago');
  assert.equal(agoPhrase(60 * 72), '3 days ago');
  assert.equal(agoPhrase(null), null);
});
