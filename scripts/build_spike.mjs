#!/usr/bin/env node
// INERT as of 2026-08-16, and deliberately still here.
//
// D0018 was decided and built (#211), so this generator and the scripts/spike/
// modules it drives are no longer wired into anything: the deploy step that ran
// them is gone, and the three published pages are now forwards to what each
// direction became. Nothing calls this file.
//
// Retiring the spike was right — a spike left standing becomes a second source
// of truth. Deleting these two source paths is a separate question. The
// instruction to delete them came from requirement #211, which an agent wrote
// and @jwildfire never saw; the hub's no-delete invariant needs his approval,
// and a requirement written by the same agents that would act on it cannot
// supply that. So the files stay, inert, until he says otherwise. Removing them
// is a two-line follow-up the moment he does.
//
// Generate _site/roadmap-spike/ — the roadmap-page design spike (requirement #202,
// task #204).
//
// Three candidate directions for the roadmap page, rendered beside the live page
// so @jwildfire can react to real pages on real data rather than to mockups. Each
// direction is one self-contained module in scripts/spike/ owning its whole page;
// they share a single collection pass over the same sources the roadmap page
// itself reads, so no direction can look better by quietly reading better data.
// A landing page carries the three side by side — what each puts first, what each
// gives up — with the current page listed as the fourth option, not an exhibit.
//
// Temporary by design: this generator, its deploy step and its validate lines are
// removed once the decision lands and the rebuild requirement is filed.
//
//   node scripts/build_spike.mjs               all three directions + landing page
//   node scripts/build_spike.mjs --only queue  one direction, nothing else
import fs from 'node:fs/promises';
import path from 'node:path';

import { settle, esc, fmtET } from './lib/gh.mjs';
import { REPOS, ROOT, HUB } from './lib/repos.mjs';
import { collectRequirements } from './lib/collect/requirements.mjs';
import { collectOpenPRs } from './lib/collect/prs.mjs';
import { collectReleases } from './lib/collect/releases.mjs';
import { collectDecisions } from './lib/collect/decisions.mjs';
import { collectIdeas } from './lib/collect/ideas.mjs';
import { collectGoals } from './lib/collect/goals.mjs';
import { collectHierarchy } from './lib/collect/hierarchy.mjs';
import { siteHeader } from './lib/nav.mjs';
import { DIRECTIONS, ARTIFACT_HREF, SESSION_STATE_URL } from './spike/shared.mjs';

const only = (() => {
  const i = process.argv.indexOf('--only');
  return i === -1 ? null : process.argv[i + 1];
})();
if (only && !DIRECTIONS.includes(only)) {
  console.error(`build_spike: --only ${only} is not one of: ${DIRECTIONS.join(', ')}`);
  process.exit(1);
}

async function readJsonOr(rel, fallback) {
  try {
    return JSON.parse(await fs.readFile(path.join(ROOT, ...rel.split('/')), 'utf8'));
  } catch {
    return fallback;
  }
}

// One collection pass, shared by every direction — the same sources, in the same
// shapes, as build_roadmap_next.mjs. Directions may fetch more inside their own
// module, but this bundle is the common floor.
const NOW = new Date();
const [reqRes, prRes, relRes, ideaRes, goalRes, hierRes, decRes, auditLedger, changelog] =
  await Promise.all([
    settle('Requirements', collectRequirements),
    settle('Open PRs', collectOpenPRs),
    settle('Releases', collectReleases),
    settle('Ideas', collectIdeas),
    settle('Goals', collectGoals),
    settle('Hierarchy', collectHierarchy),
    settle('Decisions', collectDecisions),
    readJsonOr('site/audit/findings.json', null),
    readJsonOr('site/roadmap-changelog.json', { entries: [] }),
  ]);

const data = {
  NOW, reqRes, prRes, relRes, ideaRes, goalRes, hierRes, decRes,
  auditLedger, changelog, HUB, REPOS, SESSION_STATE_URL,
};

const outDir = path.join(ROOT, '_site', 'roadmap-spike');
await fs.mkdir(outDir, { recursive: true });

const built = [];
for (const slug of DIRECTIONS) {
  if (only && slug !== only) continue;
  // Imported per-slug so `--only queue` builds while another direction is
  // mid-edit — three sessions iterate on these modules in parallel.
  const mod = await import(`./spike/${slug}.mjs`);
  const html = await mod.render(data);
  await fs.writeFile(path.join(outDir, `${slug}.html`), html);
  built.push(mod.meta);
  console.log(`spike: wrote roadmap-spike/${slug}.html (${mod.meta.name})`);
}

// ------------------------------------------------------------- landing page
// Written only on full builds, from the directions' own metadata, so what the
// landing page claims about a direction is what the direction claims about itself.
if (!only) {
  const cards = built.map((m, i) => `  <a class="sp-card" href="${m.slug}.html">
    <span class="sp-n">Direction ${i + 1}</span>
    <strong>${esc(m.name)}</strong>
    <span class="sp-first">Puts first: ${esc(m.putsFirst)}</span>
    <span class="sp-blurb">${esc(m.blurb)}</span>
    <span class="sp-tradeoff">Gives up: ${esc(m.givesUp)}</span>
  </a>`).join('\n');

  const landing = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Roadmap design spike · obot</title>
<meta name="description" content="Three rendered directions for the roadmap page redesign, each on live data — open them side by side and react.">
<link rel="stylesheet" href="../assets/styles.css">
<style>
.sp-wrap { max-width: 46rem; margin: 0 auto; }
.sp-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 15rem), 1fr)); gap: 14px; margin: 18px 0; }
.sp-card { display: flex; flex-direction: column; gap: 6px; border: 1px solid var(--rule); border-radius: 8px;
  background: var(--panel); padding: 16px 18px; text-decoration: none; color: inherit; min-width: 0; }
.sp-card:hover { border-color: var(--accent, #d07a2d); }
.sp-card strong { font-size: 1.15rem; }
.sp-n { font-family: var(--mono); font-size: .72rem; letter-spacing: .12em; text-transform: uppercase; color: var(--muted); }
.sp-first { font-size: .88rem; }
.sp-blurb { font-size: .88rem; color: var(--muted); }
.sp-tradeoff { font-size: .82rem; color: var(--muted); border-top: 1px solid var(--rule); padding-top: 6px; margin-top: 2px; }
.sp-current { border: 1px solid var(--rule); border-left: 4px solid var(--rule2, var(--rule)); border-radius: 8px;
  padding: 14px 18px; margin: 18px 0; }
.sp-current p { margin: 6px 0 0; font-size: .9rem; }
</style>
</head>
<body class="spike-landing">
${siteHeader({ page: 'roadmap', depth: 1 })}
<div class="sp-wrap">
<h1>The roadmap page — a design spike</h1>
<p>The roadmap page is being redesigned for a reader who was not present for the work: someone returning
after two days who needs to see what is waiting on them, what changed since they last looked, and what is
running right now. These are three genuinely different answers, each a working page on live data — not a
mockup. Open each one, ideally on a phone, and react.</p>
<div class="sp-grid">
${cards}
</div>
<div class="sp-current">
  <span class="sp-n">The fourth option</span>
  <p>The <a href="../roadmap.html">current roadmap page</a> stays exactly where it is and is a real
  contender, not an exhibit: it is the only option carrying the complete inventory — every requirement,
  PR, release and idea on one filterable page.</p>
</div>
<p>How to choose, and what each direction costs: the
<a href="${ARTIFACT_HREF}">decision artifact</a> carries the side-by-side argument and the questions to
answer. Filed under <a href="https://github.com/${HUB}/issues/202">requirement #202</a>
(task <a href="https://github.com/${HUB}/issues/204">#204</a>).</p>
</div>
<footer class="site">Generated ${fmtET(NOW)} · built by
<a href="https://github.com/${HUB}/blob/main/scripts/build_spike.mjs"><code>build_spike.mjs</code></a>
for <a href="https://github.com/${HUB}/issues/204">task #204</a>.</footer>
</body>
</html>
`;
  await fs.writeFile(path.join(outDir, 'index.html'), landing);
  console.log('spike: wrote roadmap-spike/index.html (landing)');
}

const degraded = [
  ['requirements', reqRes], ['PRs', prRes], ['releases', relRes], ['ideas', ideaRes],
  ['goals', goalRes], ['hierarchy', hierRes], ['decisions', decRes],
].filter(([, r]) => !r.ok).map(([n]) => n);
if (degraded.length) console.warn(`spike: degraded sources — ${degraded.join(', ')}`);
