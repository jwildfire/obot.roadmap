#!/usr/bin/env node
// The Decisions page (_site/decisions/index.html) and its data file
// (_site/decisions/decisions.json) — one chronological answer to "what have I
// decided, when, and where's the follow-through?"
//
// Approved by @jwildfire on 2026-08-15 as call 2 of the decision-recording artifact,
// with the maintenance model as the whole point: derived at deploy time from the
// artifacts' own Decisions sections, never hand-maintained. See
// scripts/lib/collect/decision-log.mjs for the markup contract that makes an
// artifact readable.
//
// It fails the deploy when an artifact the index calls Decided carries no readable
// Decisions section. A log that quietly omits a decision is worse than no log at
// all, because a reader takes it as complete.
//
// decisions.json is the feed, not a by-product: the local Operations Dashboard reads
// it for the queue @jwildfire answers from, so the shape here is the contract there.
import fs from 'node:fs/promises';
import path from 'node:path';

import { esc, fmtET } from './lib/gh.mjs';
import { ROOT, HUB } from './lib/repos.mjs';
import { collectDecisionLog, isFullyDecided } from './lib/collect/decision-log.mjs';
import { siteHeader } from './lib/nav.mjs';

const OUT = path.join(ROOT, '_site', 'decisions');
const DESCRIPTION = 'Every call @jwildfire has made on a decision artifact, newest first — his words, what each one resolved, and what shipped because of it. Derived from the artifacts at deploy time, never hand-maintained.';

const shell = (title, body) => `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)} · obot</title>
<meta name="description" content="${esc(DESCRIPTION)}">
<link rel="stylesheet" href="../assets/styles.css">
<style>
  .dl-entry { border:1px solid var(--line,#E2DACC); border-radius:12px; padding:1rem 1.15rem; margin:0 0 0.9rem; }
  .dl-entry blockquote { margin:0.5rem 0; font-size:1.02rem; line-height:1.5; }
  .dl-meta { font-size:0.8rem; opacity:0.75; display:flex; flex-wrap:wrap; gap:0.4rem 0.9rem; }
  .dl-id { font-family:ui-monospace,SFMono-Regular,Menlo,monospace; font-size:0.75rem; opacity:0.6; }
  .dl-outcome { font-size:0.9rem; margin:0.5rem 0 0; }
  .dl-open li { margin:0.45rem 0; }
  .dl-day { margin:1.8rem 0 0.6rem; font-size:0.8rem; letter-spacing:0.1em; text-transform:uppercase; opacity:0.6; }
</style>
</head>
<body>
${siteHeader({ page: 'decisions', depth: 1 })}
${body}
<footer class="site">Generated ${fmtET(new Date())} from the decision artifacts in <a href="https://github.com/${HUB}/tree/main/reports/decisions">reports/decisions/</a> — this page is a view, the artifacts are the record.</footer>
</body>
</html>`;

const entryBlock = (e) => {
  const codes = e.resolves.length ? `resolves ${e.resolves.map(esc).join(', ')}` : null;
  const meta = [
    esc(e.date),
    esc(e.channel),
    codes,
    e.artifact.goal ? `goal: <a href="${esc(e.artifact.goal.url)}">${esc(e.artifact.goal.label)}</a>` : null,
  ].filter(Boolean).map((s) => `<span>${s}</span>`).join('');
  return `<article class="dl-entry"${e.id ? ` id="${esc(e.id)}"` : ''}>
  <div class="dl-meta">${meta}${e.id ? `<span class="dl-id">${esc(e.id)}</span>` : ''}</div>
  <blockquote>${e.verbatim ? `&ldquo;${esc(e.quote)}&rdquo;` : `${esc(e.quote)} <span class="dl-id">(relayed, not verbatim)</span>`}</blockquote>
  ${e.outcome ? `<p class="dl-outcome">${esc(e.outcome)}</p>` : ''}
  <p class="dl-outcome"><a href="../${esc(e.artifact.path)}/">${esc(e.artifact.title)}</a>${e.artifact.id ? ` <span class="dl-id">${esc(e.artifact.id)}</span>` : ''}</p>
</article>`;
};

const openRow = (a) => `<li><a href="../${esc(a.path)}/">${esc(a.title)}</a>${a.id ? ` <span class="dl-id">${esc(a.id)}</span>` : ''}<br><small>${esc(a.statusPlain)}${a.discussion ? ` · <a href="${esc(a.discussion.url)}">${esc(a.discussion.label)}</a>` : ''}</small></li>`;

function page(log) {
  const byDay = new Map();
  for (const e of log.entries) {
    const day = e.date || 'undated';
    if (!byDay.has(day)) byDay.set(day, []);
    byDay.get(day).push(e);
  }
  const days = [...byDay.entries()]
    .map(([day, es]) => `<p class="dl-day">${esc(day)}</p>\n${es.map(entryBlock).join('\n')}`)
    .join('\n');

  const settled = log.artifacts.filter((a) => isFullyDecided(a.status)).length;
  const body = `<h1>Decisions</h1>
<p class="prose">Every call @jwildfire has made on a decision artifact, newest first — his words, what each one resolved, and what shipped because of it. The page is <strong>derived</strong>: each artifact carries its own Decisions section, and this log is assembled from them at deploy time, so it cannot drift from the pages it summarizes. Adding a decision means recording it on the artifact; nothing is maintained here.</p>
<p class="prose"><strong>${log.entries.length}</strong> decision${log.entries.length === 1 ? '' : 's'} recorded across <strong>${log.artifacts.length}</strong> artifacts — ${settled} fully settled, <strong>${log.open.length}</strong> still waiting on him.</p>

<h2>Still waiting on you <span class="rm-count">${log.open.length}</span></h2>
${log.open.length
    ? `<ul class="dl-open">\n${log.open.map(openRow).join('\n')}\n</ul>`
    : '<p>Nothing open — every decision artifact has been answered.</p>'}

<h2>The record</h2>
${log.entries.length ? days : '<p>No decisions recorded yet.</p>'}

<hr>
<p><small>An artifact records a decision by carrying a <code>&lt;section id="decisions"&gt;</code> at the top of the page, with one dated block per call — the rule @jwildfire set on 2026-08-15. The deploy fails if an artifact the <a href="https://github.com/${HUB}/blob/main/reports/decisions/README.md">index</a> calls decided has no such section, so a missing decision is a broken build rather than a quiet omission. The same data is published as <a href="decisions.json">decisions.json</a>, which is what the local Operations Dashboard reads.</small></p>`;
  return shell('Decisions', body);
}

const log = await collectDecisionLog();

if (log.problems.length) {
  for (const p of log.problems) console.error(`::error title=Decision log::${p}`);
  console.error(`build_decisions: ${log.problems.length} artifact(s) claim a decision the page does not record — see above`);
  process.exit(1);
}

await fs.mkdir(OUT, { recursive: true });
await fs.writeFile(path.join(OUT, 'index.html'), page(log));
await fs.writeFile(path.join(OUT, 'decisions.json'), JSON.stringify({
  generated: new Date().toISOString(),
  hub: HUB,
  hasRegistry: log.hasRegistry,
  counts: { artifacts: log.artifacts.length, decisions: log.entries.length, open: log.open.length },
  decisions: log.entries,
  artifacts: log.artifacts,
}, null, 2));

console.log(`build_decisions: ${log.entries.length} decisions across ${log.artifacts.length} artifacts (${log.open.length} open)`
  + `${log.hasRegistry ? '' : ' — no registry.json yet, rows are unnumbered'}`);
