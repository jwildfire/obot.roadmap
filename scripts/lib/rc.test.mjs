// node --test scripts/lib/rc.test.mjs
//
// The release-identity rule that keeps one release out of the Todo section
// twice. Worth a test rather than a look at the live page: the duplicate only
// exists while an RC PR and its draft release are both open, which is a window
// of hours — the day this was written the pair had already resolved by the time
// the fix was verified, and there was nothing left on GitHub to point at.
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { releaseVersion, releaseKey, UNTAGGED } from './rc.mjs';

test('a milestone title is the version', () => {
  assert.equal(releaseVersion('v0.4.0'), 'v0.4.0');
  assert.equal(releaseVersion('0.4.0'), 'v0.4.0');
  assert.equal(releaseVersion('v0.4'), 'v0.4.0'); // normalised to three parts
});

test('an RC PR title carries its version', () => {
  assert.equal(
    releaseVersion(null, "Release candidate: obot.agent v0.4.0 — fast sessions, one write policy, and runs that don't stall"),
    'v0.4.0',
  );
});

test('the milestone wins over the title', () => {
  assert.equal(releaseVersion('v1.7.0', 'Release candidate: safety.viz v1.6.0 leftovers'), 'v1.7.0');
});

test("GitHub's untagged- placeholder is not a version", () => {
  assert.ok(UNTAGGED.test('untagged-f1b5d31d12eb2e45cf15'));
  assert.equal(releaseVersion('untagged-f1b5d31d12eb2e45cf15'), null);
  // …and the draft's name is still read behind it
  assert.equal(
    releaseVersion('untagged-f1b5d31d12eb2e45cf15', "obot.agent v0.4.0 — fast sessions, one write policy, and runs that don't stall"),
    'v0.4.0',
  );
});

test('no version anywhere yields no version', () => {
  assert.equal(releaseVersion(null, undefined, '', 'Release candidate: the next one'), null);
});

test('a key needs both halves, so keyless rows never match each other', () => {
  assert.equal(releaseKey('jwildfire/obot.agent', 'v0.4.0'), 'jwildfire/obot.agent@v0.4.0');
  assert.equal(releaseKey('jwildfire/obot.agent', null), null);
  assert.equal(releaseKey(null, 'v0.4.0'), null);
});

// The case from the roadmap page on 2026-08-15: obot.agent v0.4.0 listed twice,
// once as RC PR #99 and once as `obot.agent untagged-…` DRAFT RELEASE, with the
// count reading 2.
test('an RC PR and its draft release resolve to one key', () => {
  const pr = { repo: 'jwildfire/obot.agent', milestone: 'v0.4.0', title: 'Release candidate: obot.agent v0.4.0 — fast sessions' };
  const draft = { repo: 'jwildfire/obot.agent', tag: 'untagged-f1b5d31d12eb2e45cf15', name: 'obot.agent v0.4.0 — fast sessions' };
  const prKey = releaseKey(pr.repo, releaseVersion(pr.milestone, pr.title));
  const draftKey = releaseKey(draft.repo, releaseVersion(draft.tag, draft.name));
  assert.equal(prKey, draftKey);
});

test('a different version, or a different repo, stays two rows', () => {
  const prKey = releaseKey('jwildfire/obot.agent', releaseVersion('v0.4.0'));
  assert.notEqual(prKey, releaseKey('jwildfire/obot.agent', releaseVersion('v0.5.0')));
  assert.notEqual(prKey, releaseKey('jwildfire/safety.viz', releaseVersion('v0.4.0')));
});
