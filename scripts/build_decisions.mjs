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
  /* His words are quoted as typed, and he types URLs — an unbroken one blew the
     Decisions page past a 390px viewport (found 2026-08-16 on the phone-width probe).
     Quotes wrap anywhere rather than being re-typed to fit. */
  .dl-entry blockquote { margin:0.5rem 0; font-size:1.02rem; line-height:1.5; overflow-wrap:anywhere; }
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

// The decisions folder's own landing page, rebuilt from the same data.
//
// It was hand-maintained and had drifted to listing 2 of 12 artifacts — @jwildfire
// could open the decisions index and see a sixth of his queue. That is the exact
// failure the derived log exists to prevent, so this page stops being written by
// hand too. The committed copy under reports/ is superseded at deploy time.
const landing = (log) => {
  // A folded artifact says so on its own card. It is neither open nor decided on its
  // own page — its questions were answered inside the successor — and reading
  // "decided" on a page that records no decision is the drift this log exists against.
  // A closed one says so too: he retired it without its questions being answered,
  // which is a third thing again.
  const state = (a) => {
    if (a.awaiting) return 'awaiting you';
    if (a.foldedInto) return `folded into ${a.foldedInto.id}`;
    if (a.closedInto) return a.closedInto.id ? `closed · superseded by ${a.closedInto.id}` : 'closed';
    return 'decided';
  };
  const card = (a) => `<a class="card" href="${esc(a.slug)}/">
  <span class="k">${esc(a.date)}${a.id ? ` · ${esc(a.id)}` : ''} · ${esc(state(a))}</span>
  <h3>${esc(a.title)}</h3>
  <p>${esc(a.statusPlain)}</p>
</a>`;
  const open = log.artifacts.filter((a) => a.awaiting);
  const done = log.artifacts.filter((a) => !a.awaiting);
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Decision artifacts</title>
<meta name="description" content="Every decision artifact in the obot portfolio — the ones still waiting on @jwildfire first, then the ones he has answered, each with what it is about and where it stands.">
<style>
  :root { --paper:#F4F1EC; --card:#FDFCFA; --ink:#26211B; --muted:#6F6558; --faint:#9C917F;
          --line:#E2DACC; --accent:#B4470E; --good:#2F6B4F;
          --serif:"Instrument Serif","Iowan Old Style",Georgia,serif;
          --sans:"Instrument Sans","Avenir Next","Segoe UI",system-ui,sans-serif;
          --mono:"IBM Plex Mono",ui-monospace,SFMono-Regular,Menlo,monospace; }
  @media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) {
    --paper:#1A1611; --card:#232019; --ink:#EAE4D8; --muted:#A69B89; --faint:#7E7462;
    --line:#383126; --accent:#E8843C; --good:#7FBF9B; } }
  * { box-sizing:border-box; }
  body { background:var(--paper); color:var(--ink); font-family:var(--sans); line-height:1.55; margin:0; padding:3rem 1.25rem 4.5rem; }
  .wrap { max-width:940px; margin:0 auto; }
  a { color:var(--accent); }
  h1 { font-family:var(--serif); font-weight:400; font-size:clamp(2rem,4.5vw,2.6rem); margin:0 0 0.8rem; }
  h2 { font-family:var(--serif); font-weight:400; font-size:1.5rem; margin:2.4rem 0 0.8rem; }
  .lede { color:var(--muted); max-width:70ch; }
  .grid { display:grid; gap:0.8rem; grid-template-columns:repeat(auto-fit,minmax(280px,1fr)); }
  .card { display:block; border:1px solid var(--line); border-radius:12px; background:var(--card);
          padding:1rem 1.1rem; text-decoration:none; color:inherit; }
  .card:hover { border-color:var(--accent); }
  .card .k { font-family:var(--mono); font-size:0.66rem; letter-spacing:0.09em; text-transform:uppercase; color:var(--accent); }
  .card h3 { font-family:var(--serif); font-weight:400; font-size:1.2rem; margin:0.3rem 0 0.35rem; }
  .card p { margin:0; font-size:0.85rem; color:var(--muted); }
  footer { margin-top:3rem; padding-top:1rem; border-top:1px solid var(--line); font-family:var(--mono); font-size:0.75rem; color:var(--faint); }
</style>
</head>
<body>
<div class="wrap">
<h1>Decision artifacts</h1>
<p class="lede">When an autonomous session hits a call it cannot make, it writes one of these and moves on. @jwildfire reviews exactly two kinds of thing: release candidates, and these. <a href="../../decisions/">The Decisions log</a> lists what he has already answered, in his words.</p>

<h2>Waiting on you <span class="k">${open.length}</span></h2>
<div class="grid">${open.length ? open.map(card).join('\n') : '<p class="lede">Nothing open.</p>'}</div>

<h2>Answered or closed <span class="k">${done.length}</span></h2>
<div class="grid">${done.map(card).join('\n')}</div>

<footer>Generated at deploy time from the artifacts and <a href="https://github.com/${HUB}/blob/main/reports/decisions/README.md">the index</a> — never hand-maintained. ${esc(fmtET(new Date()))}</footer>
</div>
</body>
</html>`;
};

const log = await collectDecisionLog();

if (log.problems.length) {
  for (const p of log.problems) console.error(`::error title=Decision log::${p}`);
  console.error(`build_decisions: ${log.problems.length} artifact(s) claim a decision the page does not record — see above`);
  process.exit(1);
}

await fs.mkdir(OUT, { recursive: true });
await fs.writeFile(path.join(OUT, 'index.html'), page(log));

// The decisions folder's landing page, into the already-copied _site tree.
const landingDir = path.join(ROOT, '_site', 'reports', 'decisions');
await fs.mkdir(landingDir, { recursive: true });
await fs.writeFile(path.join(landingDir, 'index.html'), landing(log));
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
