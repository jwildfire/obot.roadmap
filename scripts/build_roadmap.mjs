#!/usr/bin/env node
// Generate _site/roadmap.html — one row per Requirement issue, grouped by lifecycle
// stage, from GitHub issues + the obot Roadmap project (users/jwildfire/projects/1).
//
// Successor to the obot-claw hub's generate-roadmap.mjs. Requires GITHUB_TOKEN.
// Note: reading the user-level Project's Status field needs a token with `project`
// read scope (e.g. a ROADMAP_TOKEN PAT); with a plain repo token the script falls
// back to grouping by issue state + milestone.
import fs from 'node:fs/promises';
import path from 'node:path';

const ROOT = path.resolve(new URL('..', import.meta.url).pathname);
const REPO = process.env.ROADMAP_REPO || 'jwildfire/obot.roadmap';
const PROJECT_NUMBER = 1;
const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN || '';
const [owner, name] = REPO.split('/');

const STAGES = ['Backlog', 'Requirement Gathering', 'Design', 'Development', 'Review', 'Released'];

async function graphql(query, variables) {
  const res = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'User-Agent': 'obot-roadmap-builder',
    },
    body: JSON.stringify({ query, variables }),
  });
  if (!res.ok) throw new Error(`GraphQL HTTP ${res.status}: ${(await res.text()).slice(0, 300)}`);
  return res.json();
}

const QUERY = `
query ($owner: String!, $name: String!, $cursor: String) {
  repository(owner: $owner, name: $name) {
    issues(first: 50, after: $cursor, labels: ["requirement"],
           states: [OPEN, CLOSED], orderBy: {field: CREATED_AT, direction: ASC}) {
      pageInfo { hasNextPage endCursor }
      nodes {
        number title url state body
        milestone { title }
        labels(first: 10) { nodes { name } }
        projectItems(first: 5) {
          nodes {
            project { number }
            fieldValueByName(name: "Status") {
              ... on ProjectV2ItemFieldSingleSelectValue { name }
            }
          }
        }
      }
    }
  }
}`;

async function fetchRequirements() {
  const issues = [];
  let cursor = null;
  for (;;) {
    const { data, errors } = await graphql(QUERY, { owner, name, cursor });
    if (!data?.repository) throw new Error(`GraphQL errors: ${JSON.stringify(errors)?.slice(0, 300)}`);
    const conn = data.repository.issues;
    issues.push(...conn.nodes);
    if (!conn.pageInfo.hasNextPage) break;
    cursor = conn.pageInfo.endCursor;
  }
  return issues;
}

function stageOf(issue) {
  // Project Status when readable; otherwise fall back to state + milestone.
  const item = issue.projectItems.nodes.find((n) => n?.project?.number === PROJECT_NUMBER);
  const status = item?.fieldValueByName?.name;
  if (status) return status;
  if (issue.state === 'CLOSED') return 'Released';
  return issue.milestone && issue.milestone.title !== 'backlog' ? 'Requirement Gathering' : 'Backlog';
}

function taskProgress(body) {
  const section = body?.split(/^### Tasks/m)[1] ?? '';
  const done = (section.match(/- \[x\]/gi) || []).length;
  const open = (section.match(/- \[ \]/g) || []).length;
  return done + open ? `${done}/${done + open}` : '—';
}

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

async function designLink(number) {
  for (const ext of ['html', 'md']) {
    const rel = `requirements/design/${number}_design.${ext}`;
    try {
      await fs.access(path.join(ROOT, rel));
      return ext === 'html'
        ? `<a href="${rel}">design</a>`
        : `<a href="https://github.com/${REPO}/blob/main/${rel}">design</a>`;
    } catch {}
  }
  return '—';
}

async function row(issue) {
  const labels = issue.labels.nodes.map((l) => l.name).filter((l) => l !== 'requirement');
  return `  <tr>
    <td><a href="${issue.url}">#${issue.number}</a></td>
    <td>${esc(issue.title)}</td>
    <td>${labels.map((l) => `<code>${esc(l)}</code>`).join(' ') || '—'}</td>
    <td>${issue.milestone ? esc(issue.milestone.title) : '—'}</td>
    <td>${await designLink(issue.number)}</td>
    <td>${taskProgress(issue.body)}</td>
  </tr>`;
}

async function table(issues) {
  if (!issues.length) return '<p class="meta">None.</p>';
  const rows = await Promise.all(issues.map(row));
  return `<table>
  <tr><th>#</th><th>Requirement</th><th>Labels</th><th>Milestone</th><th>Design</th><th>Tasks</th></tr>
${rows.join('\n')}
</table>`;
}

const issues = await fetchRequirements();
const byStage = new Map(STAGES.map((s) => [s, []]));
for (const issue of issues) {
  const stage = stageOf(issue);
  (byStage.get(stage) ?? byStage.get('Backlog')).push(issue);
}

let sections = '';
for (const stage of STAGES.slice(0, -1)) {
  const group = byStage.get(stage);
  sections += `<h2>${stage} <span class="status-pill ${stage.toLowerCase().replace(/ /g, '-')}">${group.length}</span></h2>\n${await table(group)}\n`;
}
const released = byStage.get('Released');
sections += `<details class="closed-reqs"><summary>Released / closed (${released.length})</summary>\n${await table(released)}\n</details>\n`;

const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Roadmap · obot</title>
<link rel="stylesheet" href="assets/styles.css">
</head>
<body>
<header class="site">
  <h1>Roadmap</h1>
  <nav class="site">
    <a href="index.html">Home</a>
    <a href="dashboard.html">Dashboard</a>
    <a href="diary/">Diary</a>
    <a href="reports/">Reports</a>
  </nav>
</header>
<p>Requirement status across the portfolio, grouped by lifecycle stage
(<a href="https://github.com/${REPO}#lifecycle">stage definitions</a>). Generated from
GitHub issues and the <a href="https://github.com/users/${owner}/projects/${PROJECT_NUMBER}">obot
Roadmap project</a>.</p>
${sections}
<footer class="site">Generated ${new Date().toISOString().slice(0, 16).replace('T', ' ')} UTC ·
regenerates daily via <code>deploy-site.yml</code>.</footer>
</body>
</html>
`;

await fs.mkdir(path.join(ROOT, '_site'), { recursive: true });
await fs.writeFile(path.join(ROOT, '_site', 'roadmap.html'), html);
console.log(`roadmap: ${issues.length} requirements across ${STAGES.length} stages`);
