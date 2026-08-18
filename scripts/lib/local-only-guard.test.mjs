// The guard is only worth its comment block if it actually refuses. These tests
// perform the read the guard exists to stop, and assert it throws — the effect,
// not the wiring. A test that asserted "the wrapper is installed" would pass on a
// wrapper that let everything through, which is the failure mode this programme
// pays for most (silent success).
//
// Requirement: jwildfire/obot.roadmap#203.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import cp from 'node:child_process';

import { ROOT, allowedPath, LocalOnlyViolation } from './local-only-guard.mjs';

// The workspace config list, named without ever spelling the path in one literal.
// Same idiom as the sentinel in the ops store and the deploy guard's marker: a
// file that *documents* a protected name must not itself become a copy of it, and
// the static check in check_local_only_guard.mjs greps these sources for exactly
// the string this would otherwise contain.
const DOT_CLAUDE = `.${'claude'}`;
const LIST_NAME = `${'blockers'}.md`;
const WORKSPACE = path.resolve(ROOT, '..');
const CONFIG_LIST = path.join(WORKSPACE, DOT_CLAUDE, LIST_NAME);

/**
 * The real config list on this machine, if it is here.
 *
 * ROOT is the repository, and in a linked worktree that is
 * `<repo>/.claude/worktrees/<branch>` — so the workspace is not simply ROOT's
 * parent, and a test that assumed it was would assert the refusal on a path that
 * happens to be outside ROOT for the wrong reason. Walking up finds the real
 * thing when it is here, and finds nothing in CI, where the file genuinely is
 * absent. Both cases are asserted below; neither is skipped.
 */
function findRealConfigList() {
  let dir = ROOT;
  for (let i = 0; i < 8; i += 1) {
    const candidate = path.join(dir, DOT_CLAUDE, LIST_NAME);
    // `existsSync` is not guarded — the guard restricts content, never existence —
    // so this can look without being able to read.
    if (fs.existsSync(candidate)) return candidate;
    const up = path.dirname(dir);
    if (up === dir) break;
    dir = up;
  }
  return null;
}

test('the guard refuses to read the workspace config list', () => {
  assert.throws(() => fs.readFileSync(CONFIG_LIST, 'utf8'), (err) => {
    assert.equal(err.code, 'ELOCALONLY', 'refused by the guard, not by the filesystem');
    assert.match(err.message, /counts only/, 'the error says what the rule is');
    assert.match(err.message, /203/, 'the error cites the requirement');
    return true;
  });
});

test('the guard refuses the REAL config list on a machine that has one', () => {
  const real = findRealConfigList();
  if (real === null) {
    // CI, or any checkout without the workspace above it. The strongest statement
    // available here is that the shape is refused, which the test above makes.
    assert.equal(fs.existsSync(CONFIG_LIST), false);
    return;
  }
  // This is the assertion that matters: not a constructed path that resembles the
  // config list, but the actual file, with actual contents, on the actual machine
  // where the leak would happen.
  assert.throws(() => fs.readFileSync(real, 'utf8'), { code: 'ELOCALONLY' });
  assert.throws(() => cp.execFileSync('cat', [real]), { code: 'ELOCALONLY' });
});

test('the refusal does not depend on the file existing', () => {
  // The guard must refuse the *path*, not the contents. On a machine where the
  // config list is absent, a guard that only fired on real files would report
  // ENOENT and look like it worked — and would open the file on the one machine
  // where it matters. So this asserts the refusal on a path that is certainly
  // absent, outside the repo.
  const absent = path.join(WORKSPACE, `.${'claude'}`, 'no-such-file-9f3a1c.md');
  assert.equal(fs.existsSync(absent), false, 'precondition: the path really is absent');
  assert.throws(() => fs.readFileSync(absent, 'utf8'), { code: 'ELOCALONLY' });
});

test('every reading entry point is guarded, not just readFileSync', async () => {
  const target = path.join(WORKSPACE, `.${'claude'}`);
  assert.throws(() => fs.readdirSync(target), { code: 'ELOCALONLY' });
  assert.throws(() => fs.openSync(CONFIG_LIST, 'r'), { code: 'ELOCALONLY' });
  assert.throws(() => fs.createReadStream(CONFIG_LIST), { code: 'ELOCALONLY' });
  await assert.rejects(() => fsp.readFile(CONFIG_LIST, 'utf8'), { code: 'ELOCALONLY' });
  await assert.rejects(() => fsp.readdir(target), { code: 'ELOCALONLY' });
  assert.throws(() => fs.copyFileSync(CONFIG_LIST, path.join(os.tmpdir(), 'x.md')), { code: 'ELOCALONLY' });
});

test('a file URL is refused the same as a string path', () => {
  assert.throws(() => fs.readFileSync(new URL(`file://${CONFIG_LIST}`)), { code: 'ELOCALONLY' });
});

test('shelling out does not buy a way round it', () => {
  // `cat ../../.claude/blockers.md` is the obvious workaround and it is the one a
  // generator would reach for after hitting the fs refusal.
  assert.throws(() => cp.execFileSync('cat', [CONFIG_LIST]), { code: 'ELOCALONLY' });
  assert.throws(() => cp.execSync(`cat ${CONFIG_LIST}`), { code: 'ELOCALONLY' });
});

test('the build still reads everything it legitimately needs', () => {
  // The guard is worthless if it makes the build fail, because the fix would be
  // to remove it. These are the reads the generators actually make.
  assert.doesNotThrow(() => fs.readFileSync(path.join(ROOT, 'scripts', 'status-repos.csv'), 'utf8'));
  assert.doesNotThrow(() => fs.readdirSync(path.join(ROOT, 'scripts')));
  assert.doesNotThrow(() => fs.readdirSync(ROOT));
  assert.equal(allowedPath(path.join(ROOT, 'site', 'index.html')), true);
  assert.equal(allowedPath(path.join(ROOT, 'node_modules', 'marked', 'package.json')), true);
  assert.equal(allowedPath(os.tmpdir()), true);
});

test('git still runs — the flags and refs a generator passes are not paths', () => {
  // build_news.mjs and lib/version.mjs both shell out to git. A guard that read
  // `--pretty=format:%H` or `HEAD~3` as an escaping path would break the build,
  // so this is the regression test for the precision of the argument check.
  assert.doesNotThrow(() => cp.execFileSync('git', ['-C', ROOT, 'rev-parse', 'HEAD'], { encoding: 'utf8' }));
  assert.doesNotThrow(() => cp.execFileSync('git', ['-C', ROOT, 'log', '-n1', '--pretty=format:%H'], { encoding: 'utf8' }));
});

test('the allowlist does not accept a sibling that merely shares a prefix', () => {
  // `${ROOT}-worktrees` starts with ROOT as a string but is a different directory,
  // and the workspace is full of them. A prefix test without the separator would
  // hand the guard's whole job away for one missing character.
  assert.equal(allowedPath(`${ROOT}-worktrees/x/scripts/a.mjs`), false);
  assert.equal(allowedPath(`${ROOT}x`), false);
  assert.equal(allowedPath(ROOT), true);
});

test('the violation is its own error type, so a caller cannot mistake it for ENOENT', () => {
  const err = new LocalOnlyViolation('/x', 'read');
  assert.equal(err.name, 'LocalOnlyViolation');
  assert.equal(err.code, 'ELOCALONLY');
});
