#!/usr/bin/env node
// Build _site/tracker.html — the roadmap's issue tree as a drill-down with a
// search-and-filter sidebar (@jwildfire, 2026-09-12: the new and improved
// version of the retired GitHub project page).
//
// The read is fatal on purpose: a tracker with nothing on it must fail the
// deploy rather than publish a page that says the roadmap is empty.
//
//   node scripts/build_tracker.mjs                  read GitHub, write _site/tracker.html
//   node scripts/build_tracker.mjs --fixture f.json render from a saved {objectives, requirements}
//                                                   read (the raw GraphQL shape), no network
import fs from 'node:fs/promises';
import path from 'node:path';

import { ROOT } from './lib/repos.mjs';
import { fetchTracker, buildTracker } from './lib/collect/tracker.mjs';
import { renderTracker } from './lib/tracker/render.mjs';

const fixture = (() => {
  const i = process.argv.indexOf('--fixture');
  return i === -1 ? null : process.argv[i + 1];
})();

const raw = fixture
  ? JSON.parse(await fs.readFile(path.resolve(fixture), 'utf8'))
  : await fetchTracker();
const model = buildTracker(raw);

if (!model.objectives.length) throw new Error('tracker: no objective issues were read — refusing to publish an empty tracker');

// Requirements with a design page under requirements/design/ get a link on their row.
const designs = new Set();
try {
  for (const f of await fs.readdir(path.join(ROOT, 'requirements', 'design'))) {
    const m = f.match(/^(\d+)_design\.html$/);
    if (m) designs.add(Number(m[1]));
  }
} catch {}

const html = renderTracker(model, { now: new Date(), designs });
const outDir = path.join(ROOT, '_site');
await fs.mkdir(outDir, { recursive: true });
await fs.writeFile(path.join(outDir, 'tracker.html'), html);

const t = model.totals;
console.log(`tracker: ${t.objectives.total} objectives (${t.objectives.open} open), ${t.requirements.total} requirements (${t.requirements.open} open), ${t.tasks.total} tasks (${t.tasks.open + t.tasks.inReview} open)${t.unparented ? `, ${t.unparented} requirements under no objective` : ''}${fixture ? ' — from fixture' : ''}`);
