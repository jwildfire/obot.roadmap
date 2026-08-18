// The public build cannot read the machine it runs on.
//
// Requirement: jwildfire/obot.roadmap#203. Rule: config item text never reaches a
// public surface — counts only (BL2/BL4, approved by @jwildfire 2026-08-15). The
// config list is the workspace-local file outside every repo, and the reason it
// is local is that each entry names exactly which control stops an agent from
// acting. That is a map of the locks, so it never touches a repo the deploy
// publishes.
//
// ## Why another layer, when four already exist
//
// The blockers-list decision (BL2) wrapped the file in four defences, ordered by
// strength: location → sentinel → deploy guard → gitignore. All four hold. All
// four also sit DOWNSTREAM of the read, and each one assumes the leak arrives
// still carrying the marker:
//
//   location     the file is outside every repo, so no git operation reaches it
//                — but `fs.readFileSync` does not care about repository walls
//   sentinel     the file opens with a fixed local-only marker comment, so any
//                copy of its *content* is self-identifying
//   deploy guard the deploy greps the assembled site for that marker and fails
//   gitignore    a `blockers*` line, for the copy-the-file case
//
// A generator that opens the file, parses it, and renders the item headlines
// leaves the sentinel behind on line 1 — it is a comment, and a parser skips
// comments. Nothing downstream then sees a marker to catch. That is not a
// contrived attack; it is precisely what a well-meaning "publish the config
// count" change looks like halfway through being written, and #203 asks for the
// violation to be made structurally impossible rather than merely avoided.
//
// So this is the missing layer, and it is the only one upstream of the read: the
// build process cannot open the file at all. A public generator that cannot read
// the local file cannot leak it — that is the shape the requirement asked for.
//
// ## What it does
//
// Installed on import. It replaces the content-reading surface of `node:fs` and
// `node:fs/promises` with wrappers that resolve the target path and refuse
// anything outside an allowlist, and it wraps `node:child_process` so the same
// refusal cannot be bought by shelling out to `cat`.
//
// The allowlist is the repository and the toolchain, and nothing else:
//
//   ROOT             this repo — everything the public build legitimately reads
//   node's own tree  the runtime's install prefix, for its internals
//   node_modules     wherever npm put it (inside ROOT on CI, but not assumed)
//   os.tmpdir()      scratch space
//
// Everything else — the workspace, `$HOME`, `.claude/` in any of its forms — is
// refused with an error that names the requirement, so whoever trips it learns
// why in the failure rather than by reading this file.
//
// ## What it deliberately does not do
//
// It does not restrict `stat`/`access`/`existsSync`. Those leak existence, never
// content, and the build uses them for real work. It does not restrict writes:
// a public generator writing outside the repo is a different bug with different
// consequences, and widening the guard to cover it would weaken the argument
// this one makes. It does not sandbox Python or R — a node module cannot — which
// is why `check_local_only_guard.mjs` carries a language-agnostic static check
// over every generator source alongside the module-graph check for this one.
//
// ## Why this cannot be skipped by a new generator
//
// Importing it is not left to whoever adds the next page. `scripts/lib/repos.mjs`
// imports it, and every generator imports `repos.mjs` for the portfolio list; the
// deploy runs `check_local_only_guard.mjs` BEFORE the first generator, which walks
// each entrypoint's real static import graph and fails the build if this module is
// not in it. The check is the structural half — the guard stops the read, and the
// check stops a generator existing that has not got the guard.
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import cp from 'node:child_process';
import { pathToFileURL, fileURLToPath } from 'node:url';

/** This repository. Computed from this file, so it cannot be pointed elsewhere. */
export const ROOT = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));

// The toolchain. `process.execPath` is `<prefix>/bin/node`, so two levels up is
// the install prefix that holds its internals.
const NODE_PREFIX = path.resolve(path.dirname(process.execPath), '..');

const ALLOWED = [ROOT, NODE_PREFIX, os.tmpdir()].map((p) => path.resolve(p));

/** True when `target` sits inside `dir` (or is `dir`). */
const within = (dir, target) => target === dir || target.startsWith(dir + path.sep);

/**
 * May the build read this path?
 *
 * `node_modules` is allowed wherever it sits: npm's layout is its own business
 * and a build that cannot load its own dependencies fails for the wrong reason.
 * The config list can never be inside one, so this costs the guard nothing.
 */
export function allowedPath(target) {
  const abs = path.resolve(target);
  if (abs.split(path.sep).includes('node_modules')) return true;
  return ALLOWED.some((dir) => within(dir, abs));
}

class LocalOnlyViolation extends Error {
  constructor(target, how) {
    super(
      `local-only guard: the public build tried to ${how} "${target}", which is outside this repository.\n` +
      `  Nothing outside ${ROOT} may be read by a generator that writes to the published site.\n` +
      `  Config item text never reaches a public surface — counts only, and the count crosses as\n` +
      `  numbers through data/config-count.json (jwildfire/obot.roadmap#203, BL2/BL4).\n` +
      `  If you need something from the machine, hand it across as validated numbers; do not read it here.`,
    );
    this.name = 'LocalOnlyViolation';
    this.code = 'ELOCALONLY';
    this.target = target;
  }
}

/**
 * The first argument of an fs call, as a filesystem path — or null when it is a
 * file descriptor, which is already an opened handle this guard cannot re-judge.
 */
function pathOf(arg) {
  if (typeof arg === 'string') return arg;
  if (arg instanceof URL) return arg.protocol === 'file:' ? fileURLToPath(arg) : null;
  if (Buffer.isBuffer(arg)) return arg.toString('utf8');
  return null;
}

function check(arg, how) {
  const target = pathOf(arg);
  if (target === null) return; // a file descriptor, or something fs will reject itself
  if (!allowedPath(target)) throw new LocalOnlyViolation(target, how);
}

// Every content-reading entry point on the public fs surface. Deliberately a
// list rather than a loop over the module: a name added to node's fs that is not
// here should be added here, and an explicit list is what makes that visible in
// review. `read`/`readSync` take a descriptor, so they are covered by `open`.
const READERS = [
  'readFile', 'readFileSync',
  'open', 'openSync',
  'createReadStream',
  'readdir', 'readdirSync',
  'opendir', 'opendirSync',
  'copyFile', 'copyFileSync',
  'readlink', 'readlinkSync',
];

/**
 * Wrap one method, refusing in the same shape the method itself would fail in.
 *
 * A guard that always threw synchronously would be a guard that changes the
 * contract of everything it protects: `fsp.readFile(p).catch(h)` would get an
 * uncaught synchronous throw straight past `h`, and a callback caller would never
 * see its callback run. Both would be reported as "the build crashed", not as
 * "the build was refused", and the difference is exactly what someone reads when
 * deciding whether the guard is working or in the way.
 *
 * @param kind 'promise' to reject, 'callback' when a trailing function should be
 *             invoked with the error, 'sync' to throw.
 */
function wrap(obj, name, how, kind) {
  const original = obj[name];
  if (typeof original !== 'function') return;
  const guarded = function guardedFsMethod(...args) {
    let violation = null;
    try { check(args[0], how); } catch (err) { violation = err; }
    if (violation) {
      if (kind === 'promise') return Promise.reject(violation);
      const cb = args[args.length - 1];
      if (kind === 'callback' && typeof cb === 'function') {
        process.nextTick(cb, violation);
        return undefined;
      }
      throw violation;
    }
    return original.apply(this, args);
  };
  Object.defineProperty(guarded, 'name', { value: name });
  obj[name] = guarded;
}

/**
 * An argument to a spawned process that names somewhere outside the repo.
 *
 * Resolution alone is the whole test, and it is precise for a reason worth
 * stating: a flag or a git ref is a relative string, so `-n5`,
 * `--pretty=format:%H` and `HEAD~3` all resolve *under* the cwd and are allowed
 * untouched. Only an argument that genuinely escapes — `../../.claude/...`, or an
 * absolute path outside the allowlist — is refused.
 *
 * An earlier draft additionally required the target to exist, on the theory that
 * it made flags safer. It did not: it made the guard fire only on machines where
 * the file was already sitting there, which is backwards. A guard whose strength
 * depends on the secret being present is one that passes its tests in CI and
 * fails on the one machine that matters. Existence is not consulted.
 */
function escapingArg(args, cwd) {
  for (const a of args ?? []) {
    if (typeof a !== 'string' || !a) continue;
    if (!allowedPath(path.resolve(cwd, a))) return a;
  }
  return null;
}

const SPAWNERS = ['exec', 'execSync', 'execFile', 'execFileSync', 'spawn', 'spawnSync', 'fork'];

/** Install the guard. Idempotent — importing twice does not double-wrap. */
export function installLocalOnlyGuard() {
  if (globalThis.__obotLocalOnlyGuard) return globalThis.__obotLocalOnlyGuard;

  for (const name of READERS) {
    // On `node:fs`, a name ending in `Sync` throws and everything else is
    // callback-style; on `node:fs/promises` everything rejects. `createReadStream`
    // is neither — it returns a stream — so it throws, which is what a bad path
    // does there anyway.
    wrap(fs, name, 'read', name.endsWith('Sync') || name === 'createReadStream' ? 'sync' : 'callback');
    wrap(fsp, name, 'read', 'promise');
    if (fs.promises && fs.promises !== fsp) wrap(fs.promises, name, 'read', 'promise');
  }

  // Shelling out is the other door to the same room. The subprocess itself is
  // outside this process's reach, so the check is on what it is *asked* to open:
  // a command whose arguments name a real file outside the repo is refused, and
  // `exec`'s single command string is scanned as whitespace-separated words.
  for (const name of SPAWNERS) {
    const original = cp[name];
    if (typeof original !== 'function') continue;
    const guarded = function guardedSpawn(...args) {
      const [command, second] = args;
      const opts = (Array.isArray(second) ? args[2] : second) ?? {};
      const cwd = opts && typeof opts === 'object' && typeof opts.cwd === 'string' ? opts.cwd : process.cwd();
      const words = Array.isArray(second)
        ? [command, ...second]
        : String(command ?? '').split(/\s+/);
      const bad = escapingArg(words, cwd);
      if (bad) throw new LocalOnlyViolation(bad, `run \`${String(command).split(/\s+/)[0]}\` against`);
      return original.apply(this, args);
    };
    Object.defineProperty(guarded, 'name', { value: name });
    cp[name] = guarded;
  }

  globalThis.__obotLocalOnlyGuard = { ROOT, installedAt: new Date().toISOString() };
  return globalThis.__obotLocalOnlyGuard;
}

export { LocalOnlyViolation };

// Self-installing: importing this module is what arms it, so a generator carries
// the guard by carrying the import and there is no second step to forget.
installLocalOnlyGuard();

// Also usable as a preload — `node --import ./scripts/lib/local-only-guard.mjs` —
// which is how a process that imports nothing of ours still gets it. The URL form
// keeps that working on Windows paths.
export const PRELOAD_SPECIFIER = pathToFileURL(fileURLToPath(import.meta.url)).href;
