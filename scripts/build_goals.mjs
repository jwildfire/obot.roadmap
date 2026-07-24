#!/usr/bin/env node
// Generate the per-goal pages (requirement #53): _site/goals/index.html, one
// _site/goals/{slug}.html per open `goal`-labeled hub issue, and goals.json —
// the machine-readable summary the homepage (#57) can consume.
//
// A goal page shows the goal's direction (issue prose), its anchors, and its
// member requirements grouped by readiness: `auto` (ready for autonomous
// implementation) vs `draft` (needs @jwildfire input/steering), with closed
// members as a Done group. Requires the `marked` package (the deploy workflow
// runs `npm install --no-save marked`).
import fs from 'node:fs/promises';
import path from 'node:path';
import { marked } from 'marked';

import { esc, fmtET, settle } from './lib/gh.mjs';
import { ROOT, HUB } from './lib/repos.mjs';
import { collectGoals } from './lib/collect/goals.mjs';
import { collectRequirements } from './lib/collect/requirements.mjs';

const OUT = path.join(ROOT, '_site', 'goals');

const shell = (title, body) => `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)} · obot</title>
<link rel="stylesheet" href="../assets/styles.css">
</head>
<body>
<header class="site">
  <a class="brand" href="../index.html">🍊😺 obot</a>
  <nav class="site">
    <a href="../index.html">Home</a>
    <a href="../roadmap.html">Roadmap</a>
    <a href="index.html" class="current" aria-current="page">Goals</a>
    <a href="../status.html">Status</a>
    <a href="../news.html">News</a>
    <a href="https://github.com/${HUB}" aria-label="GitHub" title="GitHub" style="display:inline-flex;align-items:center"><svg viewBox="0 0 16 16" width="18" height="18" fill="currentColor" aria-hidden="true"><title>GitHub</title><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/></svg></a>
  </nav>
</header>
${body}
<footer class="site">Generated ${fmtET(new Date())} · goals are <a href="https://github.com/${HUB}/issues?q=is%3Aissue+is%3Aopen+label%3Agoal">goal-labeled issues</a> in jwildfire/obot.roadmap.</footer>
</body>
</html>`;

const memberRow = (m, stageOf) => {
  const stage = stageOf.get(m.number);
  const meta = [
    stage ? esc(stage) : null,
    ...m.labels.filter((l) => !['requirement', 'goal', 'auto', 'draft'].includes(l)).map(esc),
  ].filter(Boolean).join(' · ');
  return `<li><a href="${m.url}">#${m.number}</a> ${esc(m.title.replace(/^Requirement:\s*/i, ''))}${meta ? ` <small>(${meta})</small>` : ''}</li>`;
};

function memberGroups(goal, stageOf) {
  const open = goal.members.filter((m) => m.state === 'OPEN');
  const done = goal.members.filter((m) => m.state !== 'OPEN');
  const auto = open.filter((m) => m.labels.includes('auto'));
  const draft = open.filter((m) => m.labels.includes('draft'));
  const other = open.filter((m) => !m.labels.includes('auto') && !m.labels.includes('draft'));
  const group = (title, note, items) =>
    items.length
      ? `<h3>${title} <span class="rm-count">${items.length}</span></h3><p><small>${note}</small></p><ul>${items.map((m) => memberRow(m, stageOf)).join('\n')}</ul>`
      : '';
  return [
    group('🟢 Ready for auto', 'obot can implement these unattended (label <code>auto</code>).', auto),
    group('🟠 Needs steering', 'awaiting @jwildfire input or review (label <code>draft</code>).', draft),
    group('Other open members', 'no readiness label yet.', other),
    group('✅ Done', 'closed members.', done),
  ].join('\n');
}

function goalPage(goal, stageOf) {
  const progress = goal.progress.total
    ? `<p><strong>${goal.progress.done}/${goal.progress.total}</strong> member issues closed</p>`
    : '';
  const backlog = goal.backlog.length
    ? `<h3>Backlog feeds</h3><ul>${goal.backlog.map((b) => /^[\w.-]+\/[\w.-]+$/.test(b)
        ? `<li><a href="https://github.com/${esc(b)}/issues">${esc(b)}</a> <small>(repo issue backlog)</small></li>`
        : `<li>${esc(b)}</li>`).join('')}</ul>`
    : '';
  const body = `<p><a href="index.html">← All goals</a></p>
<h1>${esc(goal.title)}</h1>
<p><a href="${goal.url}">Goal issue #${goal.number}</a> · slug <code>${esc(goal.slug)}</code></p>
${progress}
${memberGroups(goal, stageOf)}
${backlog}
<h2>Direction</h2>
${marked.parse(goal.prose)}
<hr>
<p><small>Membership and direction live on the <a href="${goal.url}">goal issue</a>; the <code>--auto</code> policy binding (active/paused, grant profile) lives in <a href="https://github.com/jwildfire/obot.agent/blob/main/goals/registry.json">obot.agent/goals/registry.json</a>. Readiness labels: <code>auto</code> = ready for autonomous implementation, <code>draft</code> = needs @jwildfire steering (#53).</small></p>`;
  return shell(goal.title, body);
}

function indexPage(goals) {
  const cards = goals.map((g) => {
    const open = g.members.filter((m) => m.state === 'OPEN').length;
    const auto = g.members.filter((m) => m.state === 'OPEN' && m.labels.includes('auto')).length;
    return `<li><a href="${g.slug}.html"><strong>${esc(g.title)}</strong></a> — ${open} open member${open === 1 ? '' : 's'} (${auto} ready for auto), ${g.progress.done} done · <a href="${g.url}">#${g.number}</a></li>`;
  }).join('\n');
  const body = `<h1>Standing goals</h1>
<p>The broad directions the roadmap feeds. Each goal is a <a href="https://github.com/${HUB}/issues?q=is%3Aissue+is%3Aopen+label%3Agoal">hub issue labeled <code>goal</code></a> whose sub-issues are the requirements that advance it; readiness labels split members into <code>auto</code> (obot can implement unattended) and <code>draft</code> (needs @jwildfire's steering).</p>
<ul>
${cards}
</ul>`;
  return shell('Goals', body);
}

const goalRes = await settle('goals', collectGoals);
if (!goalRes.ok) {
  console.error(`build_goals: ${goalRes.notice}`);
  process.exit(1);
}
const goals = goalRes.value;
const reqRes = await settle('requirements', collectRequirements);
const stageOf = new Map((reqRes.value ?? []).map((r) => [r.number, r.stage]));

await fs.mkdir(OUT, { recursive: true });
for (const goal of goals) {
  await fs.writeFile(path.join(OUT, `${goal.slug}.html`), goalPage(goal, stageOf));
}
await fs.writeFile(path.join(OUT, 'index.html'), indexPage(goals));
await fs.writeFile(
  path.join(OUT, 'goals.json'),
  JSON.stringify({ generated: new Date().toISOString(), hub: HUB, goals: goals.map(({ prose, ...g }) => g) }, null, 2),
);
console.log(`build_goals: wrote ${goals.length} goal pages + index + goals.json to _site/goals/`);
