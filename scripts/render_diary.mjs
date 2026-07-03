#!/usr/bin/env node
// Render diary/*.md to static HTML under _site/diary/.
// Requires the `marked` package (the deploy workflow runs `npm install --no-save marked`).
import fs from 'node:fs/promises';
import path from 'node:path';
import { marked } from 'marked';

const ROOT = path.resolve(new URL('..', import.meta.url).pathname);
const SRC = path.join(ROOT, 'diary');
const OUT = path.join(ROOT, '_site', 'diary');

const page = (title, body, depth = 1) => `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title} · obot diary</title>
<link rel="stylesheet" href="${'../'.repeat(depth)}assets/styles.css">
</head>
<body>
<header class="site">
  <a class="brand" href="${'../'.repeat(depth)}index.html">🍊😺 obot</a>
  <nav class="site">
    <a href="${'../'.repeat(depth)}index.html">Home</a>
    <a href="index.html">Diary index</a>
    <a href="${'../'.repeat(depth)}dashboard.html">Dashboard</a>
    <a href="${'../'.repeat(depth)}roadmap.html">Roadmap</a>
  </nav>
</header>
${/<h1[\s>]/.test(body) ? '' : `<h1>${title}</h1>\n`}${body}
<footer class="site">Source: <a href="https://github.com/jwildfire/obot.roadmap/tree/main/diary">diary/</a> in jwildfire/obot.roadmap.</footer>
</body>
</html>
`;

const files = (await fs.readdir(SRC))
  .filter((f) => /^\d{4}-\d{2}-\d{2}\.md$/.test(f))
  .sort();
await fs.mkdir(OUT, { recursive: true });

const summaries = {};
for (const [i, file] of files.entries()) {
  const date = file.replace('.md', '');
  const md = await fs.readFile(path.join(SRC, file), 'utf8');
  const meta = md.match(/<span class="meta">([^<]*)<\/span>/);
  summaries[date] = meta ? meta[1] : '';
  const prev = files[i - 1]?.replace('.md', '');
  const next = files[i + 1]?.replace('.md', '');
  const nav = `<nav class="entry-nav">
  <span>${prev ? `<a href="${prev}.html">← ${prev}</a>` : ''}</span>
  <span>${next ? `<a href="${next}.html">${next} →</a>` : ''}</span>
</nav>`;
  const body = nav + marked.parse(md) + nav;
  await fs.writeFile(path.join(OUT, `${date}.html`), page(date, body));
}

const MIGRATION_CUTOFF = '2026-06-11'; // last hub nightly briefing
const items = files
  .slice()
  .reverse()
  .map((f) => {
    const date = f.replace('.md', '');
    const summary = summaries[date] ? ` — <span class="meta">${summaries[date]}</span>` : '';
    return `  <li><a href="${date}.html">${date}</a>${summary}</li>`;
  })
  .join('\n');
const indexBody = `
<p>AI-written session log. Entries through ${MIGRATION_CUTOFF} were migrated from the
<a href="https://github.com/obot-claw/obot-claw.github.io">archived obot-claw hub</a>'s nightly
briefings; later entries are written per working session
(<a href="https://github.com/jwildfire/obot.roadmap/blob/main/diary/README.md">conventions</a>).</p>
<ul>
${items}
</ul>`;
await fs.writeFile(path.join(OUT, 'index.html'), page('Diary', indexBody));
console.log(`diary: rendered ${files.length} entries + index`);

// Also render the reports index (reports/README.md) so /reports/ resolves on the site.
const reportsMd = await fs.readFile(path.join(ROOT, 'reports', 'README.md'), 'utf8');
await fs.mkdir(path.join(ROOT, '_site', 'reports'), { recursive: true });
await fs.writeFile(
  path.join(ROOT, '_site', 'reports', 'index.html'),
  page('Reports', marked.parse(reportsMd.replace(/^# Reports\n/, ''))),
);
console.log('reports: rendered index');
