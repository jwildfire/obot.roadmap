#!/usr/bin/env node
// Claims the next decision ID for a new artifact, collision-safely.
//
//   node scripts/claim_decision_id.mjs 2026-08-16-some-slug \
//     --title "What the decision is called" \
//     --q "A1: The first question, in words" --q "A2: The second"
//
// Run it from the artifact's own branch or worktree, then commit and push. The ID is
// derived from the registry (max + 1), never from a counter — and `git push` is the
// compare-and-swap that makes concurrent claims safe: if another session landed the
// same number first, the push is rejected, and re-running after a rebase picks the
// next one up. `scripts/check_decision_ids.mjs` fails the deploy if a duplicate ever
// does get through, so the race cannot end in two artifacts sharing an ID silently.
//
// The original per-artifact code (A1, BL2, M3 …) is kept as a secondary label. That
// is deliberate: @jwildfire has already answered questions under those codes in chat
// and in discussion threads, and those answers must stay findable.
import fs from 'node:fs';
import path from 'node:path';

import { ROOT } from './lib/repos.mjs';
import { readRegistry, nextId, REGISTRY } from './lib/decision-ids.mjs';

const argv = process.argv.slice(2);
const slug = argv.find((a) => !a.startsWith('--'));
const flag = (name) => {
  const i = argv.indexOf(`--${name}`);
  return i === -1 ? null : argv[i + 1];
};
const questions = argv.reduce((acc, a, i) => (a === '--q' ? [...acc, argv[i + 1]] : acc), []);

if (!slug) {
  console.error('usage: node scripts/claim_decision_id.mjs <YYYY-MM-DD-slug> --title "…" --q "CODE: question" [--q …]');
  process.exit(2);
}

const reg = readRegistry();
if (reg.artifacts.some((a) => a.slug === slug)) {
  const existing = reg.artifacts.find((a) => a.slug === slug);
  console.log(`${slug} already holds ${existing.id} — ids are permanent, so nothing to claim.`);
  process.exit(0);
}

const id = nextId(reg);
const parsed = questions.map((q, i) => {
  const m = /^([^:]{1,12}):\s*(.+)$/.exec(q || '');
  return { id: `${id}.${i + 1}`, code: m ? m[1].trim() : String(i + 1), question: m ? m[2].trim() : (q || '').trim() };
});

reg.artifacts.push({
  id,
  slug,
  date: (slug.match(/^\d{4}-\d{2}-\d{2}/) || [new Date().toISOString().slice(0, 10)])[0],
  title: flag('title') || slug,
  questions: parsed,
});
reg.artifacts.sort((a, b) => a.id.localeCompare(b.id));

fs.writeFileSync(path.join(ROOT, REGISTRY), `${JSON.stringify(reg, null, 2)}\n`);
console.log(`claimed ${id} for ${slug} (${parsed.length} question(s))`);
console.log('next: node scripts/stamp_decision_ids.mjs   # writes the ids onto the page');
console.log('then commit and push — a rejected push means someone took this number; rebase and re-run.');
