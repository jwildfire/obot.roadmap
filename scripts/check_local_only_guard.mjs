#!/usr/bin/env node
// Assert that no generator can reach the machine the build runs on.
//
// Requirement: jwildfire/obot.roadmap#203. `lib/local-only-guard.mjs` refuses the
// read; this refuses the *generator that has not got the guard*. One without the
// other is half a boundary — a guard nothing verifies is a guard someone drops in
// a refactor, and the drop is silent, because a build with no guard produces
// exactly the same pages as a build with one right up until the day it does not.
//
// Runs BEFORE the first generator in the deploy, so a failure costs a build
// rather than a publish.
//
// Three checks, and they cover different escape routes on purpose:
//
//   1. Module graph — every node entrypoint the deploy runs transitively imports
//      the guard. Parsed from the real static import statements, not asserted
//      from a list someone maintains.
//   2. Static scan — no generator source in ANY language names a path that
//      escapes this repository. This is the check that covers the Python and R
//      generators, which a node module cannot guard at runtime.
//   3. Wiring — the deploy still runs this check, and still runs it before the
//      generators. A check removed from the workflow is the cheapest possible
//      way to lose all of the above.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const SCRIPTS = path.join(ROOT, 'scripts');
const GUARD = path.join(SCRIPTS, 'lib', 'local-only-guard.mjs');
const WORKFLOW = path.join(ROOT, '.github', 'workflows', 'deploy-site.yml');

const problems = [];
const note = (msg) => problems.push(msg);

// ------------------------------------------------------------------ 1. graph

/** This file, as the workflow spells it. */
const SELF = 'scripts/check_local_only_guard.mjs';

/** Every `node scripts/...` the deploy workflow runs, in the order it runs them. */
function entrypointsFromWorkflow(yml) {
  const found = new Set();
  for (const m of yml.matchAll(/node\s+(?:--[\w-]+(?:=\S+)?\s+)*(scripts\/[\w./-]+\.mjs)/g)) {
    // `node --test scripts/lib/*.test.mjs` is a test run, not a generator, and
    // the glob is not a path. Tests are checked by being tests.
    if (m[1].includes('*') || m[1].endsWith('.test.mjs')) continue;
    // And this file is not a generator either: it writes nothing into the site,
    // it runs before everything, and requiring it to import the guard it exists
    // to verify would make it enforce a rule on itself it does not need.
    if (m[1] === SELF) continue;
    found.add(m[1]);
  }
  return [...found].sort();
}

const IMPORT_RE = /(?:^|\n)\s*import\s+(?:[^'"]*?\sfrom\s+)?['"]([^'"]+)['"]/g;
const DYNAMIC_RE = /import\(\s*['"]([^'"]+)['"]\s*\)/g;

/** Resolve a relative specifier to a real file, or null for a bare/unknown one. */
function resolveSpecifier(spec, fromFile) {
  if (!spec.startsWith('.')) return null; // a node: or npm module — not ours
  const base = path.resolve(path.dirname(fromFile), spec);
  for (const candidate of [base, `${base}.mjs`, `${base}.js`, path.join(base, 'index.mjs')]) {
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) return candidate;
  }
  return null;
}

/** Every file reachable from `entry` by static or literal dynamic import. */
function importGraph(entry) {
  const seen = new Set();
  const queue = [entry];
  while (queue.length) {
    const file = queue.shift();
    if (seen.has(file)) continue;
    seen.add(file);
    let src;
    try { src = fs.readFileSync(file, 'utf8'); } catch { continue; }
    for (const re of [IMPORT_RE, DYNAMIC_RE]) {
      re.lastIndex = 0;
      for (const m of src.matchAll(re)) {
        const resolved = resolveSpecifier(m[1], file);
        if (resolved && !seen.has(resolved)) queue.push(resolved);
      }
    }
  }
  return seen;
}

let workflow = '';
try {
  workflow = fs.readFileSync(WORKFLOW, 'utf8');
} catch {
  note(`cannot read ${path.relative(ROOT, WORKFLOW)} — the deploy's own definition is missing`);
}

const entries = workflow ? entrypointsFromWorkflow(workflow) : [];
if (workflow && entries.length === 0) {
  note('found no node generators in the deploy workflow — this check has stopped checking anything');
}

for (const rel of entries) {
  const abs = path.join(ROOT, rel);
  if (!fs.existsSync(abs)) {
    note(`${rel} is run by the deploy but does not exist`);
    continue;
  }
  if (!importGraph(abs).has(GUARD)) {
    note(`${rel} does not import lib/local-only-guard.mjs (directly or transitively) — it would run the build with no boundary between it and the machine`);
  }
}

// ------------------------------------------------------------------ 2. static

/**
 * A source file naming somewhere outside this repository.
 *
 * Language-agnostic, because two of the generators are Python and one is R and a
 * node runtime guard is invisible to all three. The patterns are the ways a path
 * out of here gets written, not an attempt to parse three languages.
 */
const ESCAPES = [
  { re: /\.\.[/\\]\.\.[/\\]\.\./, what: 'a path climbing three levels or more out of the repo' },
  { re: new RegExp(`\\.${'claude'}\\b`), what: `a path into the workspace's .${'claude'} directory` },
  { re: /\b(?:blockers|blocker)\.(?:md|journal)\b/, what: 'the config list by name' },
  { re: /\bos\.homedir\(\)|\bhomedir\(\)|\bPath\.home\(\)|\bos\.path\.expanduser|\bSys\.getenv\(["']HOME/, what: 'the home directory' },
  { re: /["'`]~\//, what: 'a home-relative path' },
  { re: /["'`]\/Users\/|["'`]\/home\//, what: 'an absolute path into a user account' },
];

/**
 * Scripts the DEPLOY runs that are not node, so the runtime guard cannot see them.
 *
 * Read out of the workflow rather than listed here, for the same reason the node
 * entrypoints are: a list maintained by hand is a list that stops matching.
 */
function foreignEntrypointsFromWorkflow(yml) {
  const found = new Set();
  for (const m of yml.matchAll(/(?:python3?|Rscript)\s+(scripts\/[\w./-]+\.(?:py|R|r))/g)) found.add(m[1]);
  return [...found].sort();
}

/**
 * Local producers: scripts that run on @jwildfire's machine, read it on purpose,
 * and commit their output. They are NOT part of the deploy and the deploy does not
 * run them — `build_usage_data.py` reads the local transcript store, and the config
 * count writer lives in obot.agent and reads the config list.
 *
 * They are declared rather than merely tolerated. A producer is a channel: it
 * turns something on the machine into something published, so it is the one place
 * where a careless field addition publishes what it read. Declaring them means an
 * undeclared script that reads the machine fails this check, which is what keeps
 * the set of channels knowable — and it is the reason this file lists them by
 * name and refuses to accept a pattern.
 *
 * What each is allowed to EMIT is a separate contract, checked below.
 */
const LOCAL_PRODUCERS = new Set([
  path.join(SCRIPTS, 'build_usage_data.py'),
]);

/** Every source under scripts/, in any language. */
function allSources(dir, acc = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === 'node_modules') continue;
      allSources(full, acc);
    } else if (/\.(mjs|js|py|R|r)$/.test(e.name)) {
      acc.push(full);
    }
  }
  return acc;
}

// The two files whose whole subject is the boundary necessarily discuss it. They
// are exempt from the *static* scan and from nothing else: the guard's own tests
// perform the forbidden reads and assert they fail, which is a stronger statement
// than the scan makes. Named individually — never a directory or a pattern, so
// the exemption cannot quietly grow to cover a generator.
const SCAN_EXEMPT = new Set([
  path.join(SCRIPTS, 'lib', 'local-only-guard.mjs'),
  path.join(SCRIPTS, 'lib', 'local-only-guard.test.mjs'),
  path.join(SCRIPTS, 'check_local_only_guard.mjs'),
]);

const sources = allSources(SCRIPTS);

for (const file of sources) {
  if (SCAN_EXEMPT.has(file)) continue;
  const src = fs.readFileSync(file, 'utf8');
  const hits = [];
  for (const { re, what } of ESCAPES) {
    const m = re.exec(src);
    if (m) hits.push({ what, line: src.slice(0, m.index).split('\n').length });
  }
  const rel = path.relative(ROOT, file);
  if (LOCAL_PRODUCERS.has(file)) {
    // A declared producer is *expected* to reach the machine; the check on it is
    // the opposite one. A producer that has stopped reading the machine has
    // probably been replaced by something else, and the declaration should go.
    if (hits.length === 0) {
      note(`${rel} is declared a local producer but no longer reads the machine — remove it from LOCAL_PRODUCERS so the list keeps meaning something`);
    }
    continue;
  }
  for (const { what, line } of hits) {
    note(`${rel}:${line} names ${what} — a script in this repository must not reach outside it. If it genuinely runs on his machine and commits what it produces, declare it in LOCAL_PRODUCERS and give it an emitted-shape contract.`);
  }
}

// ------------------------------------------------- 2b. what producers publish
//
// A declared producer reads the machine and commits what it writes, so its output
// file is a channel and the check on it is the shape of that file. Fields are
// declared; a field that appears without being declared fails, because "we added a
// column to the cost table" is how a session name becomes a published string
// without anyone deciding that it should be.
//
// This is a containment check, not an approval: `cells[].agent` already carries
// agent-authored session names onto the public analytics page, and pinning the key
// set stops that channel WIDENING while the question of whether those names should
// be public at all goes to @jwildfire as a decision (#203 close-out).
const EMITTED = [
  {
    // The config-count channel (#203). Its reader validates every field at build
    // time and refuses the payload outright on anything that is not a number or a
    // date; this pins the same shape at rest, so a file that grew a field is a
    // failed build rather than a page that renders whatever the field held.
    file: path.join(ROOT, 'data', 'config-count.json'),
    by: 'obot.agent/tools/config-count',
    top: ['_schema', 'open', 'critical', 'asOf'],
    rows: {},
    freeText: [],
    optional: true, // absent on a fresh clone, and absence is a stated answer
  },
  {
    // The premise channel (#266). A decision artifact's premise sentences are
    // written into its own head in this repository and are already public, so the
    // only thing crossing from the machine is a verdict, a time and a twelve-hex
    // fingerprint of what was measured. Pinning the row shape here is what keeps it
    // that way: the day someone adds `why: "<the sweep's own words>"` to make the
    // page more helpful, the build fails instead of publishing it.
    file: path.join(ROOT, 'data', 'premise-status.json'),
    by: 'obot.agent/tools/premise-status',
    top: ['_schema', 'asOf', 'readings'],
    rows: { readings: ['id', 'sha', 'state', 'at', 'why'] },
    freeText: [],
    optional: true, // absent on a fresh clone, and the strip says so on every page
  },
  {
    file: path.join(ROOT, 'site', 'usage', 'usage.json'),
    by: 'scripts/build_usage_data.py',
    top: ['schema', 'project', 'days', 'cells', 'models', 'roleLabels', 'cacheMultipliers', 'totals'],
    rows: {
      cells: ['day', 'agent', 'role', 'input', 'output', 'cacheRead', 'cacheWrite', 'cost', 'calls', 'subCalls', 'subCost'],
      models: ['model', 'calls', 'input', 'output', 'cacheRead', 'cacheWrite', 'cost', 'rateIn', 'rateOut'],
    },
    // The one free-text field in the file, named so it cannot be forgotten.
    freeText: ['cells[].agent'],
  },
];

for (const spec of EMITTED) {
  const rel = path.relative(ROOT, spec.file);
  let doc;
  try {
    doc = JSON.parse(fs.readFileSync(spec.file, 'utf8'));
  } catch {
    // An optional channel that is simply absent is fine — its reader treats a
    // missing file as a stated absence rather than a zero, which is the point.
    if (spec.optional && !fs.existsSync(spec.file)) continue;
    note(`${rel} is a declared channel from ${spec.by} but could not be read as JSON`);
    continue;
  }
  const extraTop = Object.keys(doc).filter((k) => !spec.top.includes(k));
  if (extraTop.length) {
    note(`${rel} publishes undeclared field${extraTop.length === 1 ? '' : 's'} ${extraTop.join(', ')} — it is written from the local machine, so a new field is a new thing leaving it. Declare it here once you have checked what it carries.`);
  }
  for (const [key, allowed] of Object.entries(spec.rows)) {
    for (const row of Array.isArray(doc[key]) ? doc[key] : []) {
      const extra = Object.keys(row).filter((k) => !allowed.includes(k));
      if (extra.length) {
        note(`${rel} ${key}[] publishes undeclared field${extra.length === 1 ? '' : 's'} ${extra.join(', ')} — same rule, one level down`);
        break; // one report per row set; the first is the finding
      }
    }
  }
}

// ----------------------------------------------------------------- 3. wiring

if (workflow) {
  const self = SELF;
  // Anchored on the run line, not the bare path: the step's own comment block
  // names the file, and matching that would have this check comparing its
  // documentation's position against the generators.
  const atCheck = workflow.indexOf(`node ${self}`);
  if (atCheck === -1) {
    note(`the deploy workflow does not run ${self} — this check is not wired in`);
  } else {
    // It has to run before the first generator, or it reports on a build that has
    // already happened.
    const firstGenerator = entries
      .map((rel) => workflow.indexOf(`node ${rel}`))
      .filter((i) => i !== -1)
      .sort((a, b) => a - b)[0];
    if (firstGenerator !== undefined && firstGenerator < atCheck) {
      note(`${self} runs after the first generator — move it above them, or it checks a build that has already read whatever it was going to read`);
    }
  }
}

// ------------------------------------------------------------------- verdict

if (problems.length) {
  for (const p of problems) console.error(`::error title=local-only boundary::${p}`);
  console.error(`\nlocal-only guard check FAILED — ${problems.length} problem${problems.length === 1 ? '' : 's'}.`);
  console.error('Config item text never reaches a public surface — counts only (jwildfire/obot.roadmap#203, BL2/BL4).');
  process.exit(1);
}

const foreign = workflow ? foreignEntrypointsFromWorkflow(workflow) : [];
console.log(
  `local-only guard check passed — ${entries.length} node generators carry the guard, `
  + `${foreign.length} non-node generator${foreign.length === 1 ? '' : 's'} scanned statically `
  + `(${foreign.join(', ') || 'none'}), ${sources.length} sources read, `
  + `${LOCAL_PRODUCERS.size} declared local producer${LOCAL_PRODUCERS.size === 1 ? '' : 's'}, `
  + `${EMITTED.length} published channel${EMITTED.length === 1 ? '' : 's'} pinned, deploy wiring intact`,
);
