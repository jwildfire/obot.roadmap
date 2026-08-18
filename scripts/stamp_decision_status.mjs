#!/usr/bin/env node
// Writes each artifact's state from its own page into reports/decisions/registry.json.
//
//   node scripts/stamp_decision_status.mjs           # stamp every artifact
//   node scripts/stamp_decision_status.mjs --check   # fail if the registry is stale
//
// The registry's `state`, `status` and `decidedOn` are a generated view, not a place
// to record a decision. Before this existed the field was hand-written by whichever
// lane applied an answer, present on six of twenty-one artifacts, read by nothing
// published — and on 2026-08-18 ten artifacts disagreed with the index (#196, #255).
// A copy that is only ever generated cannot drift; a copy anyone may write always
// will, which is the whole argument.
//
// The authority is the page: `<section id="decisions" data-state="…">`, refused
// unless the page carries a dated decision block to back it. See lib/decision-state.mjs.
//
// Four fields are owned here and nothing else on an entry is touched: `state`,
// `status`, `decidedOn` and `closedOn`. The two dates come from the page's own
// decision blocks — the first block is when he ruled, the last is where the page
// ended — which reproduces every one of the six dates that were hand-written before
// this scheme rather than rewriting them. IDs, slugs, titles and questions belong to
// the identity lane (stamp_decision_ids.mjs) and are left exactly as they are.
import fs from 'node:fs';
import path from 'node:path';

import { ROOT } from './lib/repos.mjs';
import { readRegistry, REGISTRY } from './lib/decision-ids.mjs';
import { readArtifactState, stampFor, STAMPED } from './lib/decision-state.mjs';

const check = process.argv.includes('--check');
const DIR = path.join(ROOT, 'reports', 'decisions');

// Key order is fixed so the file reads the same after every stamp and a diff shows
// what changed rather than where the keys moved.
const ORDER = ['id', 'slug', 'date', 'title', 'state', 'status', 'decidedOn', 'closedOn', 'questions'];
const ordered = (o) => {
  const out = {};
  for (const k of ORDER) if (o[k] !== undefined) out[k] = o[k];
  for (const k of Object.keys(o)) if (!(k in out)) out[k] = o[k];
  return out;
};

const reg = readRegistry();
const stale = [];

reg.artifacts = reg.artifacts.map((a) => {
  const file = path.join(DIR, a.slug, 'index.html');
  if (!fs.existsSync(file)) {
    console.error(`::error file=${REGISTRY},title=Decision status::${a.id}: no page at reports/decisions/${a.slug}/index.html`);
    process.exitCode = 1;
    return a;
  }
  const want = stampFor(readArtifactState(fs.readFileSync(file, 'utf8')));
  const changed = STAMPED.filter((k) => want[k] !== undefined && (a[k] ?? null) !== want[k]);
  if (changed.length) {
    stale.push(`${a.id} ${a.slug}: ${changed.map((k) => `${k} ${JSON.stringify(a[k] ?? null)} → ${JSON.stringify(want[k] ?? null)}`).join(', ')}`);
  }
  // Merge, never replace: a field this stamp does not write stays exactly where it
  // is. D0007 carries a closedOn from before this scheme, on a page he decided
  // rather than retired — dropping it would delete a record of a real day, which
  // nothing here is allowed to do. check_decision_status.mjs holds it to naming a
  // day the page actually records instead.
  return ordered({ ...a, ...want });
});

if (check) {
  if (stale.length) {
    for (const s of stale) console.error(`::error file=${REGISTRY},title=Decision status::${s}`);
    console.error('');
    console.error(`${stale.length} artifact(s) stale. Re-stamp with: node scripts/stamp_decision_status.mjs`);
    process.exit(1);
  }
  console.log(`decision status: ${reg.artifacts.length} artifacts, registry current with the pages`);
  process.exit(process.exitCode ?? 0);
}

fs.writeFileSync(path.join(ROOT, REGISTRY), `${JSON.stringify(reg, null, 2)}\n`);
if (stale.length) for (const s of stale) console.log(`  ${s}`);
console.log(`decision status: stamped ${reg.artifacts.length} artifacts, ${stale.length} changed`);
