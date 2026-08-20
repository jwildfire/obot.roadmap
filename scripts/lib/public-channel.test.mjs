// The reader's job is to refuse. These tests are mostly refusals, because a
// channel that carries numbers is only a channel that carries numbers if the
// thing at the end of it cannot be talked into carrying anything else.
//
// Requirement: jwildfire/obot.roadmap#203.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import {
  readConfigCount,
  CONFIG_COUNT_PATH,
  CONFIG_COUNT_SCHEMA,
  CONFIG_COUNT_STALE_DAYS,
  SESSION_STATES,
  sessionStateValidatorScript,
} from './public-channel.mjs';

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'obot-channel-'));
let n = 0;
/** Write a payload to a scratch file and read it back through the validator. */
const round = (payload, now) => {
  const file = path.join(dir, `count-${n += 1}.json`);
  fs.writeFileSync(file, typeof payload === 'string' ? payload : JSON.stringify(payload));
  return readConfigCount({ file, now });
};

const good = (over = {}) => ({
  _schema: CONFIG_COUNT_SCHEMA,
  open: 6,
  critical: 1,
  asOf: '2026-08-17T21:00:00Z',
  ...over,
});

const NOW = new Date('2026-08-17T22:00:00Z');

test('a well-formed count is read', () => {
  const r = round(good(), NOW);
  assert.equal(r.ok, true);
  assert.equal(r.open, 6);
  assert.equal(r.critical, 1);
  assert.equal(r.stale, false);
});

test('a missing file is a stated absence, never a zero', () => {
  const r = readConfigCount({ file: path.join(dir, 'nope.json'), now: NOW });
  assert.equal(r.ok, false);
  assert.match(r.why, /no count has been published/);
  // The point of the whole test: nothing on the result can be mistaken for a count.
  assert.equal(r.open, undefined);
});

test('text in any field refuses the WHOLE payload', () => {
  // The leak this channel exists to prevent, in the shape it would actually
  // arrive: someone helpfully adds the headline beside the number.
  for (const bad of [
    good({ open: 'six' }),
    good({ critical: 'the SSO grant is still missing' }),
    good({ asOf: 'today' }),
  ]) {
    const r = round(bad, NOW);
    assert.equal(r.ok, false, `refused: ${JSON.stringify(bad)}`);
  }
});

test('an extra field refuses the payload rather than being ignored', () => {
  // "We ignore keys we do not know" is the door. A headline riding along in a
  // field the reader skips is still a headline in a file in a public repo, and
  // the next change to the page renders it.
  const r = round(good({ items: ['c0001 — enable SSO for the org'] }), NOW);
  assert.equal(r.ok, false);
  assert.match(r.why, /fields this site does not accept/);
  // And the refusal never echoes what it refused.
  assert.doesNotMatch(r.why, /SSO/);
});

test('the reason a payload was refused never quotes the payload', () => {
  // An error string is rendered on a page often enough that this has to hold: a
  // reader that refuses text and then prints the text has not refused anything.
  const secret = 'c0007 org SSO authorisation for Gilead-BioStats';
  for (const bad of [
    good({ open: secret }),
    good({ leak: secret }),
    `{"_schema":"x","open":"${secret}"}`,
    `not json at all — ${secret}`,
  ]) {
    const r = round(bad, NOW);
    assert.equal(r.ok, false);
    assert.doesNotMatch(r.why, /SSO|Gilead|c0007/);
  }
});

test('a wrong or absent schema string is refused', () => {
  assert.equal(round(good({ _schema: 'something-else' }), NOW).ok, false);
  const { _schema, ...without } = good();
  assert.equal(round(without, NOW).ok, false);
});

test('counts must be counts: no floats, no negatives, no nonsense', () => {
  for (const v of [1.5, -1, NaN, null, true, [], {}]) {
    assert.equal(round(good({ open: v }), NOW).ok, false, `open=${JSON.stringify(v)}`);
  }
});

test('a payload that contradicts itself is refused', () => {
  assert.equal(round(good({ open: 1, critical: 5 }), NOW).ok, false);
});

test('a stale count is flagged rather than dressed up as current', () => {
  const old = new Date(NOW.getTime() - (CONFIG_COUNT_STALE_DAYS + 1) * 86400000).toISOString().replace(/\.\d+Z$/, 'Z');
  const r = round(good({ asOf: old }), NOW);
  assert.equal(r.ok, true, 'still a real count');
  assert.equal(r.stale, true, 'and the page must say when it was taken');
});

test('a count from the future is stale, not fresh', () => {
  // A clock that moved is a real event on this machine, and the wrong answer is
  // to render it as the most current reading there has ever been.
  const ahead = new Date(NOW.getTime() + 3 * 86400000).toISOString().replace(/\.\d+Z$/, 'Z');
  assert.equal(round(good({ asOf: ahead }), NOW).stale, true);
});

test('unparseable JSON is a stated absence', () => {
  const r = round('{ this is not json', NOW);
  assert.equal(r.ok, false);
  assert.match(r.why, /could not be read/);
});

test('the browser-side session validator drops free text and keeps numbers', () => {
  const src = sessionStateValidatorScript();
  // The two fields that carry agent-authored prose must not be reachable at all.
  assert.doesNotMatch(src, /\bs\.detail\b/, 'detail is never read');
  assert.doesNotMatch(src, /\bs\.name\b/, 'name is never read');
  assert.match(src, /nsStates/, 'state is checked against a closed set');
  for (const s of SESSION_STATES) assert.ok(src.includes(`"${s}"`), `${s} is in the published enum`);

  // Run the emitted source and put a hostile payload through it — the validator
  // is shipped as text, so testing the text without executing it would assert
  // that a string contains some words.
  // eslint-disable-next-line no-new-func
  const clean = new Function(`${src}; return nsClean;`)();
  const hostile = clean({
    state: 'working',
    name: 'c0007 — org SSO authorisation',
    detail: 'blocked: the settings allowlist needs your keyboard',
    agents: { total: 40, working: 4, needsInput: 0 },
    slug: '2026-08-17',
    updatedAt: '2026-08-18T01:28:54.857Z',
  });
  assert.deepEqual(Object.keys(hostile).sort(), ['needsInput', 'slug', 'state', 'total', 'updatedAt', 'working']);
  assert.equal(JSON.stringify(hostile).includes('SSO'), false, 'nothing the agent wrote survives');
  assert.equal(hostile.working, 4);

  // And a state outside the enum becomes null rather than a rendered string.
  assert.equal(clean({ state: 'blocked on c0007' }).state, null);
  assert.equal(clean({ slug: 'clearing the SSO grant' }).slug, null);
  assert.equal(clean(null), null);
});

test('the NOW strip renders no field the validator drops', async () => {
  // The regression guard for the hole this closed: the strip used to render the
  // feed's `name` and `detail` verbatim. Comments are stripped before the check,
  // because the comment explaining the hole necessarily names the fields.
  const { nowStripScript } = await import('../roadmap/nowstrip.mjs');
  const code = nowStripScript().split('\n').filter((l) => !l.trim().startsWith('//')).join('\n');
  assert.doesNotMatch(code, /\.detail\b/, 'no code path reads the free-text detail');
  assert.doesNotMatch(code, /\.name\b/, 'no code path reads the free-text name');
  assert.match(code, /nsClean\(/, 'the payload goes through the validator before anything reads it');
});

test('the shared spine is four entities in one order', async () => {
  // #203: the same entities, in the same order, as the Operations Dashboard's tab
  // strip. The dashboard is in another repository and asserts the same list
  // against its own tabs, so this is one half of a contract kept in two places —
  // the closest to a cross-repo test that two repos can get.
  const { SPINE } = await import('./nav.mjs');
  assert.deepEqual(SPINE, ['Queue', 'Wire', 'Agents', 'Catalog']);
});

test('every spine entry precedes every surface-specific page in the nav', async () => {
  const { siteHeader } = await import('./nav.mjs');
  const html = siteHeader({ page: 'queue' });
  const order = [...html.matchAll(/>([A-Z][a-z]+)<\/a>/g)].map((m) => m[1]);
  const sub = order.slice(order.indexOf('Queue'));
  const spineAt = ['Queue', 'Wire', 'Agents', 'Catalog'].map((l) => sub.indexOf(l));
  const extrasAt = ['Audit', 'Analytics', 'Status', 'Decisions'].map((l) => sub.indexOf(l));
  assert.ok(spineAt.every((i) => i !== -1), 'every spine entry is in the nav');
  assert.ok(Math.max(...spineAt) < Math.min(...extrasAt.filter((i) => i !== -1)),
    'no surface-specific page comes between two spine entries — the order is the argument');
});

test('the count this repository actually ships is one this reader accepts', () => {
  // The one check that belongs against the LIVE file, and the only property of it
  // that is safe to assert: that the committed data/config-count.json is a
  // payload the strict reader takes. It is written by tools/config-count and
  // refreshed by an automatic commit, so anything asserted here about its VALUES
  // — the number, its age, whether it is stale — is a test pinned to data no test
  // controls, which is precisely what took the site's deploy down on 2026-08-20
  // (#287). This assertion cannot be tripped by a refresh; only by the file
  // actually becoming unreadable, which is a real failure and should be loud.
  // Rejected, the briefing simply drops the line, and a page that silently omits
  // "N config items on your keyboard" says nothing needs his hands when nobody
  // looked.
  //
  // `now` is the file's own asOf, so age plays no part in the verdict.
  const raw = fs.readFileSync(CONFIG_COUNT_PATH, 'utf8');
  const r = readConfigCount({ file: CONFIG_COUNT_PATH, now: new Date(JSON.parse(raw).asOf) });
  assert.equal(r.ok, true, `the committed count is not readable: ${r.why}`);
});
