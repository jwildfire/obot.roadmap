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
    <a href="${'../'.repeat(depth)}roadmap.html">Roadmap</a>
    <a href="${'../'.repeat(depth)}status.html">Status</a>
    <a href="${'../'.repeat(depth)}news.html" class="current" aria-current="page">News</a>
    <a href="https://github.com/jwildfire/obot.roadmap" aria-label="GitHub" title="GitHub" style="display:inline-flex;align-items:center"><svg viewBox="0 0 16 16" width="18" height="18" fill="currentColor" aria-hidden="true"><title>GitHub</title><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/></svg></a>
  </nav>
</header>
${/<h1[\s>]/.test(body) ? '' : `<h1>${title}</h1>\n`}${body}
<footer class="site">Source: <a href="https://github.com/jwildfire/obot.roadmap/tree/main/diary">diary/</a> in jwildfire/obot.roadmap.</footer>
</body>
</html>
`;

// Entries are one per working session: YYYY-MM-DD.md for a day's first session,
// YYYY-MM-DD-N.md (N = 2, 3, …) for later sessions the same day.
const files = (await fs.readdir(SRC))
  .filter((f) => /^\d{4}-\d{2}-\d{2}(-\d+)?\.md$/.test(f))
  .map((f) => f.replace('.md', ''))
  .sort();
await fs.mkdir(OUT, { recursive: true });

const label = (slug) => {
  const m = slug.match(/^(\d{4}-\d{2}-\d{2})-(\d+)$/);
  return m ? `${m[1]} — Session ${m[2]}` : slug;
};

const summaries = {};
for (const [i, slug] of files.entries()) {
  const md = await fs.readFile(path.join(SRC, `${slug}.md`), 'utf8');
  const meta = md.match(/<span class="meta">([^<]*)<\/span>/);
  summaries[slug] = meta ? meta[1] : '';
  const prev = files[i - 1];
  const next = files[i + 1];
  const nav = `<nav class="entry-nav">
  <span>${prev ? `<a href="${prev}.html">← ${label(prev)}</a>` : ''}</span>
  <span>${next ? `<a href="${next}.html">${label(next)} →</a>` : ''}</span>
</nav>`;
  const body = nav + marked.parse(md) + nav;
  await fs.writeFile(path.join(OUT, `${slug}.html`), page(label(slug), body));
}

const MIGRATION_CUTOFF = '2026-06-11'; // last hub nightly briefing
const items = files
  .slice()
  .reverse()
  .map((slug) => {
    const summary = summaries[slug] ? ` — <span class="meta">${summaries[slug]}</span>` : '';
    return `  <li><a href="${slug}.html">${label(slug)}</a>${summary}</li>`;
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
