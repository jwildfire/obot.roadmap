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

// Audit log (site/roadmap-changelog.json) — the header version badge and modal
// render from it; append an entry whenever roadmap content changes (AGENTS.md, Key files).
const changelog = JSON.parse(
  await fs.readFile(path.join(ROOT, 'site', 'roadmap-changelog.json'), 'utf8'),
);
const auditEntries = [...changelog.entries].sort((a, b) => b.date.localeCompare(a.date));
if (!auditEntries.length) throw new Error('site/roadmap-changelog.json has no entries');
const fmtDate = (iso) => {
  const d = new Date(iso);
  const stamp = new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'America/New_York',
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
  }).format(d);
  const zone = new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', timeZoneName: 'short' })
    .formatToParts(d).find((p) => p.type === 'timeZoneName').value;
  return `${stamp} ${zone}`;
};

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

const auditLogHtml = `<dialog id="audit-log" class="audit-log" aria-labelledby="audit-log-title">
  <form method="dialog"><button class="audit-close" aria-label="Close">&times;</button></form>
  <h2 id="audit-log-title">Audit log</h2>
  <p class="meta">What changed in each roadmap update — maintained in
  <a href="https://github.com/${REPO}/blob/main/site/roadmap-changelog.json"><code>roadmap-changelog.json</code></a>.</p>
${auditEntries
  .map(
    (e) => `  <section class="audit-entry">
    <h3>v${esc(e.version)} <span class="audit-date">${fmtDate(e.date)}</span></h3>
    <ul>
${e.changes.map((c) => `      <li>${esc(c)}</li>`).join('\n')}
    </ul>
  </section>`,
  )
  .join('\n')}
</dialog>`;

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
  <a class="brand" href="index.html">🍊😺 obot</a>
  <nav class="site">
    <a href="index.html">Home</a>
    <a href="roadmap.html" class="current" aria-current="page">Roadmap</a>
    <a href="news.html">News</a>
    <a href="https://github.com/jwildfire/obot.roadmap" aria-label="GitHub" title="GitHub" style="display:inline-flex;align-items:center"><svg viewBox="0 0 16 16" width="18" height="18" fill="currentColor" aria-hidden="true"><title>GitHub</title><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/></svg></a>
    <button class="version-badge" id="version-badge" aria-haspopup="dialog" aria-controls="audit-log"
      title="Roadmap audit log">v${esc(auditEntries[0].version)} – ${fmtDate(auditEntries[0].date)}</button>
  </nav>
</header>
<h1>Roadmap</h1>
<p>Requirement status across the portfolio, grouped by lifecycle stage
(<a href="https://github.com/${REPO}#lifecycle">stage definitions</a>). Generated from
GitHub issues and the <a href="https://github.com/users/${owner}/projects/${PROJECT_NUMBER}">obot
Roadmap project</a>.</p>
${sections}
${auditLogHtml}
<script>
  const versionBadge = document.getElementById('version-badge');
  const auditLog = document.getElementById('audit-log');
  versionBadge.addEventListener('click', () => auditLog.showModal());
  auditLog.addEventListener('click', (e) => { if (e.target === auditLog) auditLog.close(); });
</script>
<footer class="site">Generated ${fmtDate(new Date().toISOString())} ·
regenerates daily via <code>deploy-site.yml</code>.</footer>
</body>
</html>
`;

await fs.mkdir(path.join(ROOT, '_site'), { recursive: true });
await fs.writeFile(path.join(ROOT, '_site', 'roadmap.html'), html);
console.log(`roadmap: ${issues.length} requirements across ${STAGES.length} stages`);
