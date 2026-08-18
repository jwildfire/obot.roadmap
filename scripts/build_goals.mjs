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
import { siteHeader } from './lib/nav.mjs';

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
${siteHeader({ page: 'roadmap', depth: 1 })}
${body}
<footer class="site">Generated ${fmtET(new Date())} · goals are <a href="https://github.com/${HUB}/issues?q=is%3Aissue+is%3Aopen+label%3Agoal">goal-labeled issues</a> in jwildfire/obot.roadmap.</footer>
</body>
</html>`;

// The five workstream labels (D0020, requirement #226) group the autonomy goal's
// requirements. Rendered as their plain-English name rather than the raw slug: a
// column of `ws-officer` tokens is the label doing worse than nothing on the one page
// the grouping was built for.
const WORKSTREAMS = {
  'ws-surfaces': 'the surfaces you read',
  'ws-officer': 'the officer and the workers',
  'ws-sessions': 'how a session behaves',
  'ws-plan': 'whether the plan matches reality',
  'ws-delivery': 'how work reaches you',
};

const memberRow = (m, stageOf) => {
  const stage = stageOf.get(m.number);
  const meta = [
    stage ? esc(stage) : null,
    ...m.labels
      .filter((l) => !['requirement', 'goal', 'auto', 'draft'].includes(l))
      .map((l) => esc(WORKSTREAMS[l] ?? l)),
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
  const body = `<p><a href="index.html">← All goals</a></p>
<h1>${esc(goal.title)}</h1>
<p><a href="${goal.url}">Goal issue #${goal.number}</a> · slug <code>${esc(goal.slug)}</code></p>
${progress}
${memberGroups(goal, stageOf)}
<h2>Direction</h2>
${marked.parse(goal.prose)}
<hr>
<p><small>Members are generated from the goal issue's sub-issue links at build time; priority is the selecting session's judgment, not list order (#53 v2). The <code>--auto</code> policy binding — active/paused, grant profile, repo-level backlog feeds — lives in <a href="https://github.com/jwildfire/obot.agent/blob/main/goals/registry.json">obot.agent/goals/registry.json</a>. Readiness labels: <code>auto</code> = ready for autonomous implementation, <code>draft</code> = needs @jwildfire steering.</small></p>`;
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
