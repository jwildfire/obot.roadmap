#!/usr/bin/env node
// Fails when the decision-ID registry and the decision pages disagree.
//
//   node scripts/check_decision_ids.mjs
//
// Guards the one failure the scheme cannot tolerate: two artifacts claiming the same
// number. @jwildfire approves a decision by quoting its ID in chat ("D0004.2 is
// approved"), so a duplicate is not a cosmetic problem — it makes an approval
// ambiguous. Five agents were writing to this repo at once the morning the scheme was
// asked for, and two of them can compute the same next ID without seeing each other.
//
// The arbiter is git: the second push is rejected as non-fast-forward and has to
// rebase, at which point this check catches the collision before the deploy.
import { readRegistry, validate, nextId } from './lib/decision-ids.mjs';

const reg = readRegistry();
const problems = validate(reg);

if (problems.length) {
  for (const p of problems) console.error(`::error file=reports/decisions/registry.json,title=Decision id::${p}`);
  console.error('');
  console.error(`${problems.length} problem(s). Claim an id with: node scripts/claim_decision_id.mjs <slug>`);
  console.error('Then re-stamp the pages with: node scripts/stamp_decision_ids.mjs');
  process.exit(1);
}

const questions = reg.artifacts.reduce((n, a) => n + a.questions.length, 0);
console.log(`decision ids: ${reg.artifacts.length} artifacts, ${questions} questions, no collisions (next free: ${nextId(reg)})`);
