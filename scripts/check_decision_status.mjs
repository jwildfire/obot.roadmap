#!/usr/bin/env node
// Fails when the stores that answer "has @jwildfire decided this" disagree.
//
//   node scripts/check_decision_status.mjs
//
// jwildfire/obot.roadmap#196, task #255. Whether a decision has been made used to be
// recorded in two places — the Status cell of the index table and a `status` field in
// the registry — with no authority between them and nothing comparing them inside
// this repo. On 2026-08-18 the Navigator sweep found ten of twenty-one artifacts
// where the two disagreed, on the surface he reads to know what he has already
// settled.
//
// The authority is now the artifact page, and this is what stops the other two
// drifting from it. It fails the deploy rather than publishing a log that is wrong
// about his own decisions — the same bar the decision log itself is held to.
//
// What it refuses, in the words it uses:
//
//   - a page that declares a state its own evidence does not support;
//   - a registry entry that has not been re-stamped since the page changed;
//   - an index row whose status word contradicts the page;
//   - an artifact with no index row, or an index row with no registry entry.
import fs from 'node:fs';
import path from 'node:path';

import { ROOT } from './lib/repos.mjs';
import { readRegistry, REGISTRY } from './lib/decision-ids.mjs';
import { auditDecisionStatus, parseIndexTable, isAwaiting } from './lib/decision-state.mjs';

const DIR = path.join(ROOT, 'reports', 'decisions');

const registry = readRegistry();
const indexRows = parseIndexTable(fs.readFileSync(path.join(DIR, 'README.md'), 'utf8'))
  .filter((r) => r.slug)
  .map((r) => ({ slug: r.slug, status: r.status ?? '' }));

const pages = new Map();
for (const a of registry.artifacts ?? []) {
  const file = path.join(DIR, a.slug, 'index.html');
  // Only ENOENT may read as "no page". Anything else is an unreadable file, and
  // reporting an unreadable page as a missing one would hide the real fault.
  try {
    pages.set(a.slug, fs.readFileSync(file, 'utf8'));
  } catch (err) {
    if (err.code !== 'ENOENT') {
      console.error(`::error file=${REGISTRY},title=Decision status::${a.id}: reports/decisions/${a.slug}/index.html could not be read (${err.code}) — this is not the same as it being absent`);
      process.exit(1);
    }
  }
}

const { states, problems } = auditDecisionStatus({ registry, indexRows, pages });

if (problems.length) {
  for (const p of problems) console.error(`::error file=${REGISTRY},title=Decision status::${p}`);
  console.error('');
  console.error(`${problems.length} disagreement(s) about whether a decision has been made.`);
  console.error('The artifact page is the authority: <section id="decisions" data-state="decided">.');
  console.error('Re-stamp the registry with: node scripts/stamp_decision_status.mjs');
  process.exit(1);
}

const tally = { open: 0, 'partially decided': 0, decided: 0, closed: 0 };
for (const s of states.values()) tally[s] = (tally[s] ?? 0) + 1;
const awaiting = [...states.values()].filter(isAwaiting).length;
console.log(`decision status: ${states.size} artifacts agree across page, index and registry — ${tally.decided} decided, ${tally['partially decided']} partial, ${tally.closed} closed, ${tally.open} open (${awaiting} still with him)`);
