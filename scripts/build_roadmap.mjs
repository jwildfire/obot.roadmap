#!/usr/bin/env node
// Build the roadmap page set — the queue, the wire, and the catalog (#211).
//
// D0018, decided by @jwildfire on 2026-08-16 ("i'm good with your rec  build"),
// re-front-ended the roadmap. What used to be one page is now three, in the
// order the decision put them:
//
//   roadmap.html   the QUEUE — what needs him, ranked by how long it has waited.
//                  The front door, and the URL everything already points at, so
//                  the front door changed without a bookmark changing.
//   wire.html      the WIRE — a day-grouped stream of the last 7 days. One click
//                  behind, because catching up is a reading he chooses rather
//                  than a state he triages.
//   catalog.html   the CATALOG — the complete public record, unchanged from the
//                  page that used to be the front door: inventory, both filters,
//                  the hierarchy review lane, the audit fold, the changelog.
//                  `roadmap-next.html` still redirects here.
//
// The board did not survive as a fourth page. Its NOW panel is absorbed as the
// slim strip carried by the queue and the wire (scripts/roadmap/nowstrip.mjs).
//
// One collection pass, shared by all three, for the reason the design spike
// found it: three pages reading three times can disagree about the same morning,
// and a reader who notices that stops trusting all of them. Directions may fetch
// more inside their own module — the wire's window search does — but this bundle
// is the common floor and every page ages its rows against the same NOW.
//
// Every source is wrapped in settle(): a failed collector renders as a notice
// line in the section that needed it, rather than blanking a page that is the
// project's public record. The exception is the requirements collector, which
// the catalog treats as fatal — a roadmap with no roadmap on it should fail the
// deploy loudly instead of publishing.
import fs from 'node:fs/promises';
import path from 'node:path';

import { settle } from './lib/gh.mjs';
import { REPOS, ROOT, HUB } from './lib/repos.mjs';
import { collectRequirements } from './lib/collect/requirements.mjs';
import { collectOpenPRs } from './lib/collect/prs.mjs';
import { collectReleases } from './lib/collect/releases.mjs';
import { collectDecisions } from './lib/collect/decisions.mjs';
import { collectIdeas } from './lib/collect/ideas.mjs';
import { collectGoals } from './lib/collect/goals.mjs';
import { collectHierarchy } from './lib/collect/hierarchy.mjs';
import { collectRepoLights, SESSION_STATE_URL } from './roadmap/nowstrip.mjs';

import * as queue from './roadmap/queue.mjs';
import * as wire from './roadmap/wire.mjs';
import * as catalog from './roadmap/catalog.mjs';

const PAGES = [queue, wire, catalog];

const only = (() => {
  const i = process.argv.indexOf('--only');
  return i === -1 ? null : process.argv[i + 1];
})();
if (only && !PAGES.some((p) => p.meta.slug === only)) {
  console.error(`build_roadmap: --only ${only} is not one of: ${PAGES.map((p) => p.meta.slug).join(', ')}`);
  process.exit(1);
}

async function readJsonOr(rel, fallback) {
  try {
    return JSON.parse(await fs.readFile(path.join(ROOT, ...rel.split('/')), 'utf8'));
  } catch {
    return fallback;
  }
}

const NOW = new Date();

const [
  reqRes, prRes, relRes, ideaRes, goalRes, hierRes, decRes, lightsRes, auditLedger, proposal, changelog,
] = await Promise.all([
  settle('Requirements', collectRequirements),
  settle('Open PRs', collectOpenPRs),
  settle('Releases', collectReleases),
  settle('Ideas', collectIdeas),
  settle('Goals', collectGoals),
  settle('Hierarchy', collectHierarchy),
  settle('Decisions', collectDecisions),
  settle('Repo activity', () => collectRepoLights(REPOS)),
  // The audit ledger (#92) is a committed file written by the nightly audit and
  // the apply lane; absent renders as "no audit has run yet", not a missing
  // section. The hierarchy proposal is the same kind of file — absent renders an
  // empty proposal, because the Current tree is still the truth worth publishing.
  readJsonOr('site/audit/findings.json', null),
  readJsonOr('scripts/roadmap-proposal.json', { links: [], flags: [] }),
  readJsonOr('site/roadmap-changelog.json', { entries: [] }),
]);

const data = {
  NOW, reqRes, prRes, relRes, ideaRes, goalRes, hierRes, decRes, lightsRes,
  auditLedger, proposal, changelog, HUB, REPOS, SESSION_STATE_URL,
};

const outDir = path.join(ROOT, '_site');
await fs.mkdir(outDir, { recursive: true });

const written = [];
for (const page of PAGES) {
  if (only && page.meta.slug !== only) continue;
  const html = await page.render(data);
  await fs.writeFile(path.join(outDir, page.meta.out), html);
  written.push(page.meta.out);
  // The staged URL a page was reviewed at, kept resolving to the page it meant.
  if (typeof page.aliasRedirect === 'function') {
    const alias = page.aliasRedirect();
    await fs.writeFile(path.join(outDir, alias.name), alias.html);
    written.push(alias.name);
  }
}

// The design spike's three pages (#202/#204) are retired by this build — a
// spike left standing becomes a second source of truth. But D0018's published
// artifact links to all three, and retiring them would leave a decision record
// carrying three dead links. So each URL forwards to what that direction
// actually became: the queue and the board both to the roadmap page, since the
// board's contribution was the NOW strip the queue now carries, and the wire to
// the wire. A reader following the artifact lands on the thing the option
// turned into, which is more useful than the option was.
const SPIKE_RETIRED = [
  ['index.html', 'roadmap.html', 'the roadmap page'],
  ['queue.html', 'roadmap.html', 'the roadmap page, which is the queue'],
  ['wire.html', 'wire.html', 'the wire'],
  ['board.html', 'roadmap.html', 'the roadmap page, whose NOW strip is what the board became'],
];
await fs.mkdir(path.join(outDir, 'roadmap-spike'), { recursive: true });
for (const [from, to, label] of SPIKE_RETIRED) {
  const href = `../${to}`;
  await fs.writeFile(
    path.join(outDir, 'roadmap-spike', from),
    `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Retired · obot</title>
<link rel="canonical" href="${href}">
<meta http-equiv="refresh" content="0; url=${href}">
</head>
<body>
<p>The roadmap-page design spike was retired when its decision (D0018) shipped as
<a href="https://github.com/jwildfire/obot.roadmap/issues/211">#211</a>. This preview now forwards to
${label}: <a href="${href}">${to}</a>.</p>
</body>
</html>
`,
  );
  written.push(`roadmap-spike/${from}`);
}

const degraded = [
  ['requirements', reqRes], ['PRs', prRes], ['releases', relRes], ['ideas', ideaRes],
  ['goals', goalRes], ['hierarchy', hierRes], ['decisions', decRes], ['repo activity', lightsRes],
].filter(([, r]) => !r.ok).map(([n]) => n);

console.log(
  `roadmap: wrote ${written.join(', ')}` + (degraded.length ? ` — degraded: ${degraded.join(', ')}` : ''),
);
