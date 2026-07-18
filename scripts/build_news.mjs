#!/usr/bin/env node
// Build _site/news.html — one feed of recent updates across four sources:
//   blog     — keynote blog posts from jwildfire.github.io (atom feed)
//   diary    — obot diary entries (diary/*.md)
//   artifact — agent artifacts: reports/* and requirements/design/*.html
//   release  — GitHub releases across the portfolio repos
// A sidebar filters the feed by type and by month (client-side, no data reload).
// Artifact dates come from git history — the deploy checkout needs fetch-depth: 0.
import fs from 'node:fs/promises';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const ROOT = path.resolve(new URL('..', import.meta.url).pathname);
const OWNER = 'jwildfire';
const REPOS = ['obot.roadmap', 'safety.agent', 'safety.viz', 'gsm.safety', 'safety-histogram'];
const BLOG_FEED = 'https://jwildfire.github.io/feed.xml';
const TOKEN = process.env.GITHUB_TOKEN || process.env.GH_TOKEN || '';

const TYPES = {
  blog: { label: 'Blog post', plural: 'Blog posts' },
  diary: { label: 'obot diary', plural: 'obot diary' },
  artifact: { label: 'Agent artifact', plural: 'Agent artifacts' },
  release: { label: 'Release', plural: 'Releases' },
};

const esc = (s = '') => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const unent = (s = '') => s
  .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
  .replace(/&#39;|&apos;/g, "'").replace(/&amp;/g, '&');
const stripTags = (s = '') => s.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
const clip = (s = '', n = 200) => (s.length > n ? s.slice(0, n).replace(/\s+\S*$/, '') + '…' : s);
const day = (iso) => (iso || '').slice(0, 10);
const fmtET = (d) => {
  const stamp = new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'America/New_York',
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
  }).format(d);
  const zone = new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', timeZoneName: 'short' })
    .formatToParts(d).find((p) => p.type === 'timeZoneName').value;
  return `${stamp} ${zone}`;
};

function gitAddedDate(rel) {
  try {
    const out = execFileSync('git', ['log', '--diff-filter=A', '--follow', '-1', '--format=%cI', '--', rel],
      { cwd: ROOT, encoding: 'utf8' }).trim();
    return day(out) || null;
  } catch {
    return null;
  }
}

// --- diary -------------------------------------------------------------------
async function diaryItems() {
  // YYYY-MM-DD.md plus same-day session posts YYYY-MM-DD-N.md; the slug's fixed
  // date prefix keeps dayLabel/month slices correct and sorts sessions newest-first.
  const files = (await fs.readdir(path.join(ROOT, 'diary'))).filter((f) => /^\d{4}-\d{2}-\d{2}(-\d+)?\.md$/.test(f));
  const items = [];
  for (const f of files) {
    const date = f.replace('.md', '');
    const md = await fs.readFile(path.join(ROOT, 'diary', f), 'utf8');
    const meta = md.match(/<span class="meta">([^<]*)<\/span>/);
    const h1 = md.match(/^#\s+(.+)$/m);
    const para = md.split(/\n{2,}/).map((b) => b.trim())
      .find((b) => b && !b.startsWith('#') && !b.startsWith('>') && !b.startsWith('<'));
    items.push({
      type: 'diary',
      date,
      title: h1 ? h1[1].trim() : `Diary · ${date}`,
      url: `diary/${date}.html`,
      summary: clip(stripTags(meta ? meta[1] : (para || ''))),
    });
  }
  return items;
}

// --- blog (atom feed) ----------------------------------------------------------
async function blogItems() {
  try {
    const res = await fetch(BLOG_FEED, { headers: { 'User-Agent': 'obot-news-builder' } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const xml = await res.text();
    const items = [];
    for (const [, entry] of xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)) {
      const title = stripTags(unent((entry.match(/<title[^>]*>([\s\S]*?)<\/title>/) || [])[1] || ''));
      const url = (entry.match(/<link[^>]*href="([^"]+)"/) || [])[1] || '';
      const date = day((entry.match(/<published>([^<]+)<\/published>/) || entry.match(/<updated>([^<]+)<\/updated>/) || [])[1]);
      const summary = clip(stripTags(unent((entry.match(/<summary[^>]*>([\s\S]*?)<\/summary>/) || [])[1] || '')));
      if (title && url && date) items.push({ type: 'blog', date, title, url, summary });
    }
    if (!items.length) console.warn('news: blog feed parsed to 0 entries');
    return items;
  } catch (err) {
    console.warn(`news: blog feed unavailable (${err.message}); continuing without blog posts`);
    return [];
  }
}

// --- agent artifacts -------------------------------------------------------------
async function pageTitle(file, fallback) {
  try {
    const html = await fs.readFile(file, 'utf8');
    const m = html.match(/<title[^>]*>([\s\S]*?)<\/title>/) || html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/);
    const t = m ? stripTags(unent(m[1])).replace(/\s*·\s*obot.*$/i, '') : '';
    return t || fallback;
  } catch {
    return fallback;
  }
}

async function artifactItems() {
  const items = [];
  const reportsDir = path.join(ROOT, 'reports');
  for (const entry of await fs.readdir(reportsDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    if (entry.name === 'sessions') continue; // per-session operational reports are linked from diary entries, not standalone news artifacts
    const rel = `reports/${entry.name}`;
    const nameDate = (entry.name.match(/\d{4}-\d{2}-\d{2}/) || [])[0];
    const date = nameDate || gitAddedDate(rel) || gitAddedDate(`${rel}/index.html`);
    if (!date) continue;
    items.push({
      type: 'artifact',
      date,
      title: await pageTitle(path.join(reportsDir, entry.name, 'index.html'), entry.name),
      url: `${rel}/`,
      summary: 'AI-generated report.',
    });
  }
  const designDir = path.join(ROOT, 'requirements', 'design');
  for (const f of (await fs.readdir(designDir)).filter((f) => f.endsWith('.html'))) {
    const rel = `requirements/design/${f}`;
    const date = gitAddedDate(rel);
    if (!date) continue;
    const issue = (f.match(/^(\d+)_/) || [])[1];
    items.push({
      type: 'artifact',
      date,
      title: await pageTitle(path.join(designDir, f), f),
      url: rel,
      summary: issue ? `Design document for Requirement #${issue}.` : 'Design document.',
    });
  }
  return items;
}

// --- releases --------------------------------------------------------------------
async function releaseItems() {
  const headers = { 'Accept': 'application/vnd.github+json', 'User-Agent': 'obot-news-builder' };
  if (TOKEN) headers.Authorization = `Bearer ${TOKEN}`;
  const items = [];
  for (const repo of REPOS) {
    try {
      const res = await fetch(`https://api.github.com/repos/${OWNER}/${repo}/releases?per_page=30`, { headers });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      for (const r of await res.json()) {
        if (r.draft) continue;
        const name = r.name && r.name !== r.tag_name ? ` — ${r.name}` : '';
        items.push({
          type: 'release',
          date: day(r.published_at || r.created_at),
          title: `${repo} ${r.tag_name}${name}`,
          url: r.html_url,
          summary: clip(stripTags((r.body || '').split('\n').find((l) => l.trim() && !l.startsWith('#')) || '')),
        });
      }
    } catch (err) {
      console.warn(`news: releases unavailable for ${repo} (${err.message})`);
    }
  }
  return items;
}

// --- render ------------------------------------------------------------------------
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];
const monthName = (ym) => `${MONTHS[Number(ym.slice(5, 7)) - 1]} ${ym.slice(0, 4)}`;
const dayLabel = (date) => `${MONTHS[Number(date.slice(5, 7)) - 1].slice(0, 3)} ${date.slice(8, 10)}`;

function renderItem(it) {
  const summary = it.summary ? `\n    <p class="news-summary">${esc(it.summary)}</p>` : '';
  return `  <article class="news-item" data-type="${it.type}" data-month="${it.date.slice(0, 7)}">
    <span class="news-date">${dayLabel(it.date)}</span>
    <div class="news-body">
      <span class="news-pill ${it.type}">${TYPES[it.type].label}</span>
      <a href="${esc(it.url)}">${esc(it.title)}</a>${summary}
    </div>
  </article>`;
}

const all = (await Promise.all([blogItems(), diaryItems(), artifactItems(), releaseItems()]))
  .flat()
  .filter((it) => it.date)
  .sort((a, b) => b.date.localeCompare(a.date));

const months = [...new Set(all.map((it) => it.date.slice(0, 7)))];
const counts = Object.fromEntries(Object.keys(TYPES).map((t) => [t, all.filter((i) => i.type === t).length]));

let feed = '';
for (const ym of months) {
  const section = all.filter((it) => it.date.slice(0, 7) === ym).map(renderItem).join('\n');
  feed += `<section class="news-month" data-month="${ym}">\n  <h2>${monthName(ym)}</h2>\n${section}\n</section>\n`;
}

const typeFilters = Object.entries(TYPES).map(([key, t]) =>
  `      <label><input type="checkbox" value="${key}" checked> ${t.plural} <span class="count">${counts[key]}</span></label>`).join('\n');
const monthFilters = [`      <a href="#" data-month="all" class="current" aria-current="true">All months</a>`]
  .concat(months.map((ym) => `      <a href="#" data-month="${ym}">${monthName(ym)}</a>`)).join('\n');

const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>News · obot</title>
<link rel="stylesheet" href="assets/styles.css">
</head>
<body>
<header class="site">
  <a class="brand" href="index.html">🍊😺 obot</a>
  <nav class="site">
    <a href="index.html">Home</a>
    <a href="roadmap.html">Roadmap</a>
    <a href="news.html" class="current" aria-current="page">News</a>
    <a href="https://github.com/${OWNER}/obot.roadmap" aria-label="GitHub" title="GitHub" style="display:inline-flex;align-items:center"><svg viewBox="0 0 16 16" width="18" height="18" fill="currentColor" aria-hidden="true"><title>GitHub</title><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/></svg></a>
  </nav>
</header>
<h1>News</h1>
<p class="meta">One feed for the whole portfolio: keynote blog posts, the obot diary, agent
artifacts (reports and design docs), and releases across the project repos.</p>
<div class="news-layout">
<aside class="news-sidebar">
  <div class="filter-group" id="type-filters">
    <h3>Type</h3>
${typeFilters}
  </div>
  <div class="filter-group" id="month-filters">
    <h3>Month</h3>
${monthFilters}
  </div>
</aside>
<div class="news-feed">
${feed}<p class="meta news-empty" hidden>Nothing matches the current filters.</p>
</div>
</div>
<footer class="site">Generated ${fmtET(new Date())} ·
Source: <a href="https://github.com/${OWNER}/obot.roadmap">jwildfire/obot.roadmap</a></footer>
<script>
(function () {
  var boxes = Array.prototype.slice.call(document.querySelectorAll('#type-filters input'));
  var links = Array.prototype.slice.call(document.querySelectorAll('#month-filters a'));
  var month = 'all';
  function apply() {
    var types = boxes.filter(function (b) { return b.checked; }).map(function (b) { return b.value; });
    var visible = 0;
    document.querySelectorAll('.news-item').forEach(function (it) {
      var show = types.indexOf(it.dataset.type) !== -1 && (month === 'all' || it.dataset.month === month);
      it.hidden = !show;
      if (show) visible += 1;
    });
    document.querySelectorAll('.news-month').forEach(function (sec) {
      sec.hidden = !Array.prototype.some.call(sec.querySelectorAll('.news-item'), function (it) { return !it.hidden; });
    });
    document.querySelector('.news-empty').hidden = visible > 0;
  }
  boxes.forEach(function (b) { b.addEventListener('change', apply); });
  links.forEach(function (a) {
    a.addEventListener('click', function (e) {
      e.preventDefault();
      month = a.dataset.month;
      links.forEach(function (x) {
        x.classList.toggle('current', x === a);
        if (x === a) { x.setAttribute('aria-current', 'true'); } else { x.removeAttribute('aria-current'); }
      });
      apply();
    });
  });
})();
</script>
</body>
</html>
`;

await fs.mkdir(path.join(ROOT, '_site'), { recursive: true });
await fs.writeFile(path.join(ROOT, '_site', 'news.html'), html);
console.log(`news: ${all.length} items (${Object.entries(counts).map(([t, n]) => `${t} ${n}`).join(', ')}) across ${months.length} months`);
