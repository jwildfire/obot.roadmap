#!/usr/bin/env node
// Generate _site/roadmap-next.html — the refactored roadmap page (requirement #57).
//
// One at-a-glance operations page: standing goals, active requirements, open PRs,
// upcoming releases, recent releases, and the ideas queue, every row linking to
// its GitHub source, filterable by repo.
//
// This is the roadmap page. It was built as roadmap-next.html so it could be
// reviewed on the deployed site beside the page it replaced (Pages only deploys
// from main, so there is no branch preview); @jwildfire approved the flip on
// 2026-07-24 and it now writes roadmap.html. roadmap-next.html lives on as a
// redirect — that URL was shared while the page was staged.
//
// Every section comes from an independent collector wrapped in settle(): a failed
// source renders as a notice line in its own section instead of blanking a page
// that is the project's public record.
import fs from 'node:fs/promises';
import path from 'node:path';

import { esc, fmtET, age, settle, hasToken, day, clip } from './lib/gh.mjs';
import { REPOS, ROOT, HUB } from './lib/repos.mjs';
import { collectRequirements } from './lib/collect/requirements.mjs';
import { collectOpenPRs } from './lib/collect/prs.mjs';
import { collectReleases } from './lib/collect/releases.mjs';
import { collectDecisions } from './lib/collect/decisions.mjs';
import { collectIdeas } from './lib/collect/ideas.mjs';
import { collectGoals } from './lib/collect/goals.mjs';
import { collectHierarchy } from './lib/collect/hierarchy.mjs';
import { releaseKey } from './lib/rc.mjs';
import { hierarchySection } from './lib/hierarchy/render.mjs';
import { auditSection } from './lib/audit/render.mjs';
import { siteHeader } from './lib/nav.mjs';
import {
  VIEWS, DEFAULT_VIEW, T, goalViews, requirementViews, prViews,
  upcomingViews, releaseViews, openIdeaViews, promotedIdeaViews,
} from './lib/highlights.mjs';

const NOW = new Date();

const OUT = process.env.ROADMAP_OUT || 'roadmap.html';
const STAGED_ALIAS = 'roadmap-next.html'; // redirect kept for links shared during review
const RECENT_RELEASES = 10;
const PROJECT_URL = 'https://github.com/users/jwildfire/projects/1';
// Heartbeat-published session state (#57 D5): a session-state branch holding one
// small JSON, fetched client-side so the indicator refreshes without a deploy.
const SESSION_STATE_URL = `https://raw.githubusercontent.com/${HUB}/session-state/session.json`;

const shortRepo = (nameWithOwner) => nameWithOwner.split('/')[1];
const stageClass = (stage) => stage.toLowerCase().replace(/ /g, '-');
const repoAttr = (repos) => esc(repos.join(' '));

// ---------------------------------------------------------------- design links
async function designLink(number) {
  for (const ext of ['html', 'md']) {
    const rel = `requirements/design/${number}_design.${ext}`;
    try {
      await fs.access(path.join(ROOT, rel));
      return ext === 'html'
        ? `<a href="${rel}">design</a>`
        : `<a href="https://github.com/${HUB}/blob/main/${rel}">design</a>`;
    } catch {}
  }
  return '<span class="rm-none">—</span>';
}

// ---------------------------------------------------------------- section shell
function section(id, title, count, body, { notice = null, note = null, cls = '' } = {}) {
  const badge = count === null ? '' : ` <span class="rm-count">${count}</span>`;
  const sub = note ? `<p class="rm-note">${note}</p>` : '';
  const inner = notice ? `<p class="rm-notice">${esc(notice)}</p>` : body;
  return `<section class="rm-sec${cls ? ` ${cls}` : ''}" id="sec-${id}">
<h2>${title}${badge}</h2>
${sub}${inner}
</section>`;
}

const empty = (text) => `<p class="rm-empty">${text}</p>`;

// ---------------------------------------------------------------- todo
// What is waiting on @jwildfire, always first. Per the RC framework
// (obot.agent docs/rc-framework.md) he reviews exactly two kinds of thing:
// release candidates — review-requested PRs, plus draft releases where the
// integration branch IS the release branch — and decision artifacts, each
// answered in its hub Q&A thread. Rows carry every view tag so no filter can
// push the queue below the fold.
const REVIEWER = 'jwildfire';
const TODO_HL = 'live attention pulse';

// The release-candidate queue, deduped. One release, one row: an open RC PR and
// the draft release of the same version in the same repo are the same release
// seen twice — the PR is the reviewable thing, so it wins and the draft is
// suppressed (lib/rc.mjs). The count badge and the build log both read this, so
// they cannot disagree with the rows.
function rcQueue(prRes, relRes) {
  const rcPrs = (prRes.value ?? []).filter((pr) => pr.reviewRequested?.includes(REVIEWER));
  const prKeys = new Set(rcPrs.map((pr) => releaseKey(pr.repo, pr.version)).filter(Boolean));
  const allDrafts = relRes.value?.drafts ?? [];
  const drafts = allDrafts.filter((d) => !prKeys.has(releaseKey(d.repo, d.version)));
  return { rcPrs, drafts, suppressed: allDrafts.length - drafts.length };
}

function todoSection(prRes, relRes, decRes) {
  const { rcPrs, drafts: rcDrafts } = rcQueue(prRes, relRes);
  const awaiting = decRes.ok ? decRes.value.awaiting : [];

  const prRows = rcPrs.map((pr) => `  <div class="rm-row" data-repo="${esc(pr.repo)}" data-hl="${TODO_HL}"${
    pr.version ? ` data-release="${esc(releaseKey(pr.repo, pr.version))}"` : ''
  }>
    <span class="rm-key"><a href="${pr.url}">${esc(shortRepo(pr.repo))}#${pr.number}</a></span>
    <span class="rm-main"><span class="rm-pill rc">rc pr</span> ${esc(pr.title)}</span>
    <span class="rm-meta">${age(pr.updatedAt)}</span>
  </div>`);
  const draftRows = rcDrafts.map((d) => `  <div class="rm-row" data-repo="${esc(d.repo)}" data-hl="${TODO_HL}" data-draft${
    d.version ? ` data-release="${esc(releaseKey(d.repo, d.version))}"` : ''
  }>
    <span class="rm-key"><a href="${d.url}" title="${esc(`${shortRepo(d.repo)} — draft release${d.tag ? ` ${d.tag}` : ''}`)}">${esc(shortRepo(d.repo))}${d.tag ? ` ${esc(d.tag)}` : ''}</a></span>
    <span class="rm-main"><span class="rm-pill rc">draft release</span> ${esc(d.name)}</span>
    <span class="rm-meta">${age(d.createdAt)}</span>
  </div>`);
  const decRows = awaiting.map((d) => `  <div class="rm-row" data-repo="${HUB}" data-hl="${TODO_HL}">
    <span class="rm-key">${esc(d.date)}</span>
    <span class="rm-main"><span class="rm-pill decision">decide</span> ${d.id ? `<a class="rm-did" href="${d.path ?? 'reports/decisions/'}">${esc(d.id)}</a> ` : ''}<a href="${d.path ?? 'reports/decisions/'}">${esc(d.title.replace(/\x60/g, ''))}</a>${
    d.goal ? ` <span class="rm-anchors"><a href="${d.goal.url}">${esc(d.goal.label)}</a></span>` : ''
  }${d.discussion ? ` · <a href="${d.discussion.url}"><strong>answer in Q&amp;A ${esc(d.discussion.label)}</strong></a>` : ''}</span>
    <span class="rm-meta">${esc(clip(d.statusPlain, 44))}</span>
  </div>`);

  const rcList = prRows.concat(draftRows);
  const rcNotice = !prRes.ok ? `<p class="rm-notice">${esc(prRes.notice)}</p>` : '';
  const decNotice = !decRes.ok ? `<p class="rm-notice">${esc(decRes.notice)}</p>` : '';

  const body = `<div class="rm-sub">
<h3>🚦 Release candidates needing review <span class="rm-count">${rcList.length}</span></h3>
${rcNotice}<div class="rm-rows" id="todo-rc-rows">
${rcList.length ? rcList.join('\n') : `  ${empty('No release candidates are waiting.')}`}
</div>
</div>
<div class="rm-sub">
<h3>🧭 Decisions needed <span class="rm-count">${decRows.length}</span></h3>
${decNotice}<div class="rm-rows">
${decRows.length ? decRows.join('\n') : `  ${empty('No open decisions.')}`}
</div>
</div>`;

  return section('todo', 'Todo', rcList.length + decRows.length, body, {
    cls: 'rm-todo',
    note: `Everything waiting on @jwildfire, per the <a href="https://github.com/jwildfire/obot.agent/blob/main/docs/rc-framework.md">RC framework</a>: ` +
      `release candidates (review-requested PRs and draft releases) and <a href="reports/decisions/">decision artifacts</a>, ` +
      `each decided in its <a href="https://github.com/${HUB}/discussions/categories/q-a">Q&amp;A thread</a>. ` +
      `The PR list re-checks GitHub on page load; drafts and decisions are as of the last deploy.`,
  });
}

// ---------------------------------------------------------------- goals
function goalsSection(res, requirements) {
  if (!res.ok) return section('goals', 'Goals', null, '', { notice: res.notice });
  const goals = res.value.filter((g) => g.status !== 'paused');
  if (!goals.length) return section('goals', 'Goals', 0, empty('No active goals.'));

  const byNumber = new Map(requirements.map((r) => [r.number, r]));
  const rows = goals.map((g) => {
    const anchors = g.anchors.map((a) => {
      const req = a.number ? byNumber.get(a.number) : null;
      if (!req) return `<a href="https://github.com/${HUB}/issues/${a.number ?? ''}">#${a.number ?? '?'}</a>`;
      return `<a href="${req.url}" title="${esc(req.title)}" class="rm-anchor ${req.active ? '' : 'done'}">#${req.number}</a>`;
    }).join(' ');
    const live = g.anchors.filter((a) => byNumber.get(a.number)?.active).length;
    // Scope a goal to the repos its anchors touch plus the repo backlogs it
    // names — otherwise a goal whose anchors have no sub-issues yet reads as
    // hub-only and vanishes under a repo filter.
    const repos = [...new Set([
      ...g.anchors.flatMap((a) => byNumber.get(a.number)?.repos ?? []),
      ...g.backlog.filter((b) => /^[\w.-]+\/[\w.-]+$/.test(b)),
    ])];
    // Title → the goal's own page (#53); the issue number stays the mono key, so
    // both the narrative and the source are one click away.
    const progress = g.progress?.total ? `${g.progress.done}/${g.progress.total} · ` : '';
    return `  <div class="rm-row rm-goal" data-repo="${repoAttr(repos.length ? repos : [HUB])}" data-hl="${goalViews()}">
    <span class="rm-key"><a href="${g.url}">#${g.number ?? ''}</a></span>
    <span class="rm-main"><strong><a href="${g.page ?? g.url}">${esc(g.title)}</a></strong> <span class="rm-anchors">${anchors}</span></span>
    <span class="rm-meta">${progress}${live} active</span>
  </div>`;
  }).join('\n');

  return section('goals', 'Goals', goals.length, `<div class="rm-rows">\n${rows}\n</div>`, {
    note: `Standing direction from the hub's <a href="https://github.com/${HUB}/issues?q=is%3Aissue+is%3Aopen+label%3Agoal"><code>goal</code>-labeled issues</a> — the same goals autonomous sessions select from (#53/#71); per-goal detail on the <a href="goals/index.html">goal pages</a>.`,
  });
}

// ---------------------------------------------------------------- requirements
async function requirementRow(req, prsByRequirement) {
  // 'unstaged' is already what the stage pill says — don't badge it twice.
  const drift = req.drift && req.drift !== 'unstaged'
    ? ` <span class="status-pill drift" title="Board Status disagrees with the issue state">${esc(req.drift)}</span>`
    : '';
  const prs = prsByRequirement.get(req.number) ?? [];
  const activity = prs.length
    ? ` <span class="rm-activity" title="${prs.map((p) => `${p.repo}#${p.number}`).join(', ')}">${prs.length} open PR${prs.length > 1 ? 's' : ''}</span>`
    : '';
  const tasks = req.tasks
    ? `${req.tasks.done}/${req.tasks.total}${req.tasks.source === 'checklist' ? '<span class="rm-none" title="from an inline checklist, not sub-issues">*</span>' : ''}`
    : '<span class="rm-none">—</span>';
  const repos = req.repos.map((r) => `<span class="rm-chip">${esc(shortRepo(r))}</span>`).join('');
  return `  <tr data-repo="${repoAttr(req.repos)}" data-hl="${requirementViews(req, prs, NOW)}">
    <td><a href="${req.url}">#${req.number}</a></td>
    <td>${esc(req.title)}${drift}${activity}</td>
    <td><span class="status-pill ${stageClass(req.stage)}">${esc(req.stage)}</span></td>
    <td>${repos}</td>
    <td>${tasks}</td>
    <td>${await designLink(req.number)}</td>
    <td class="rm-meta">${age(req.updatedAt)}</td>
  </tr>`;
}

// Seven columns cannot wrap into a phone's width, and `html { overflow-x: clip }`
// means anything past the viewport is not scrolled to — it is lost. So the table
// gets its own scroll container and the page keeps its width.
async function requirementTable(reqs, prsByRequirement) {
  if (!reqs.length) return empty('None.');
  const rows = [];
  for (const req of reqs) rows.push(await requirementRow(req, prsByRequirement));
  return `<div class="rm-scroll">
<table class="rm-table">
  <tr><th>#</th><th>Requirement</th><th>Stage</th><th>Repos</th><th>Tasks</th><th>Design</th><th>Updated</th></tr>
${rows.join('\n')}
</table>
</div>`;
}

// ---------------------------------------------------------------- open PRs
function prSection(res) {
  if (!res.ok) return section('prs', 'Open PRs', null, '', { notice: res.notice });
  const prs = res.value;
  if (!prs.length) return section('prs', 'Open PRs', 0, empty('Nothing open — every branch is merged or unopened.'));
  const rows = prs.map((pr) => {
    const state = pr.isDraft
      ? '<span class="rm-pill draft">draft</span>'
      : pr.reviewDecision === 'APPROVED'
        ? '<span class="rm-pill ok">approved</span>'
        : '<span class="rm-pill ready">ready</span>';
    const req = pr.requirements.length
      ? ` <span class="rm-anchors">${pr.requirements.map((n) => `<a href="https://github.com/${HUB}/issues/${n}">#${n}</a>`).join(' ')}</span>`
      : '';
    return `  <div class="rm-row" data-repo="${esc(pr.repo)}" data-hl="${prViews(pr, NOW)}">
    <span class="rm-key"><a href="${pr.url}">${esc(shortRepo(pr.repo))}#${pr.number}</a></span>
    <span class="rm-main">${state} ${esc(pr.title)}${req}</span>
    <span class="rm-meta">${age(pr.updatedAt)}</span>
  </div>`;
  }).join('\n');
  return section('prs', 'Open PRs', prs.length, `<div class="rm-rows">\n${rows}\n</div>`);
}

// ---------------------------------------------------------------- releases
function upcomingSection(res) {
  if (!res.ok) return section('upcoming', 'Upcoming releases', null, '', { notice: res.notice });
  const rows = res.value.upcoming;
  if (!rows.length) {
    return section('upcoming', 'Upcoming releases', 0, empty('Nothing unreleased — every repo ships what it has merged.'));
  }
  const html = rows.map((u) => {
    const bits = [];
    if (u.devAhead) bits.push(`<a href="${u.devUrl}"><strong>${u.devAhead}</strong> on dev</a>`);
    if (u.devBehind) bits.push(`<span class="rm-pill warn" title="dev is behind ${esc(u.releaseBranch)} — the branches have diverged">${u.devBehind} behind</span>`);
    if (u.unreleased) bits.push(`<a href="${u.unreleasedUrl}"><strong>${u.unreleased}</strong> since ${esc(u.latestTag)}</a>`);
    if (u.neverReleased) bits.push('<span class="rm-pill">never released</span>');
    return `  <div class="rm-row" data-repo="${esc(u.repo)}" data-hl="${upcomingViews(u, NOW)}">
    <span class="rm-key"><a href="https://github.com/${u.repo}">${esc(shortRepo(u.repo))}</a></span>
    <span class="rm-main">${bits.join(' · ')}</span>
    <span class="rm-meta">${u.latestTag ? esc(u.latestTag) : '—'}</span>
  </div>`;
  }).join('\n');
  return section('upcoming', 'Upcoming releases', rows.length, `<div class="rm-rows">\n${html}\n</div>`, {
    note: 'Commits merged but not released — <code>dev</code> ahead of the release branch, or the release branch ahead of its newest tag.',
  });
}

function recentSection(res) {
  if (!res.ok) return section('releases', 'Recent releases', null, '', { notice: res.notice });
  const rows = res.value.recent.slice(0, RECENT_RELEASES);
  if (!rows.length) return section('releases', 'Recent releases', 0, empty('No releases yet.'));
  const html = rows.map((r) => `  <div class="rm-row" data-repo="${esc(r.repo)}" data-hl="${releaseViews(r, NOW)}">
    <span class="rm-key"><a href="${r.url}">${esc(shortRepo(r.repo))} ${esc(r.tag)}</a></span>
    <span class="rm-main">${r.name ? esc(r.name) : '<span class="rm-none">—</span>'}</span>
    <span class="rm-meta">${day(r.publishedAt)}</span>
  </div>`).join('\n');
  return section('releases', 'Recent releases', res.value.recent.length, `<div class="rm-rows">\n${html}\n</div>`);
}

// ---------------------------------------------------------------- ideas
function ideasSection(res) {
  if (!res.ok) return section('ideas', 'Ideas', null, '', { notice: res.notice });
  const { open, promoted, windowDays } = res.value;
  const openRows = open.map((d) => `  <div class="rm-row" data-repo="${HUB}" data-hl="${openIdeaViews(d, NOW)}">
    <span class="rm-key"><a href="${d.url}">#${d.number}</a></span>
    <span class="rm-main">${esc(d.title)}</span>
    <span class="rm-meta">${age(d.updatedAt)}</span>
  </div>`).join('\n');
  const promotedRows = promoted.map((d) => `  <div class="rm-row rm-promoted" data-repo="${HUB}" data-hl="${promotedIdeaViews(d, NOW)}">
    <span class="rm-key"><a href="${d.url}">#${d.number}</a></span>
    <span class="rm-main">${esc(d.title)} <span class="rm-anchors">→ <a href="${d.issue.url}">#${d.issue.number}</a></span></span>
    <span class="rm-meta">${age(d.closedAt)}</span>
  </div>`).join('\n');

  const body = `<div class="rm-rows">
${open.length ? openRows : `  ${empty('Inbox empty.')}`}
</div>
<div class="rm-sub">
<h3>Promoted · last ${windowDays} days <span class="rm-count">${promoted.length}</span></h3>
<div class="rm-rows">
${promoted.length ? promotedRows : `  ${empty('None promoted in the window.')}`}
</div>
</div>`;

  return section('ideas', 'Ideas', open.length, body, {
    note: `Open threads in the <a href="https://github.com/${HUB}/discussions/categories/ideas">Ideas</a> board, plus what triage promoted to issues.`,
  });
}

// ---------------------------------------------------------------- page
// The audit ledger (#92) is a committed file, not an API read: it is written by
// the nightly audit and by the apply lane, and read here. A missing file renders
// as "no audit has run yet" rather than omitting the section.
async function readAuditLedger() {
  try {
    return JSON.parse(await fs.readFile(path.join(ROOT, 'site', 'audit', 'findings.json'), 'utf8'));
  } catch {
    return null;
  }
}

const changelog = JSON.parse(await fs.readFile(path.join(ROOT, 'site', 'roadmap-changelog.json'), 'utf8'));
const auditEntries = [...changelog.entries].sort((a, b) => b.date.localeCompare(a.date));
if (!auditEntries.length) throw new Error('site/roadmap-changelog.json has no entries');

if (!hasToken) console.warn('roadmap: no GITHUB_TOKEN — sections that need the API will degrade');

// The hierarchy proposal (Current vs Proposed views) is a committed file like
// the changelog: absent or unparseable renders an empty proposal, not a broken
// section — the Current tree is still the truth worth publishing.
async function readProposal() {
  try {
    return JSON.parse(await fs.readFile(path.join(ROOT, 'scripts', 'roadmap-proposal.json'), 'utf8'));
  } catch {
    return { links: [], flags: [] };
  }
}

const [reqRes, prRes, relRes, ideaRes, goalRes, hierRes, decRes, auditLedger, proposal] = await Promise.all([
  settle('Requirements', collectRequirements),
  settle('Open PRs', collectOpenPRs),
  settle('Releases', collectReleases),
  settle('Ideas', collectIdeas),
  settle('Goals', collectGoals),
  settle('Hierarchy', collectHierarchy),
  settle('Decisions', collectDecisions),
  readAuditLedger(),
  readProposal(),
]);

// The requirements section is the page's spine: if it is gone, the deploy should
// fail rather than publish a roadmap with no roadmap on it.
if (!reqRes.ok) throw new Error(`roadmap: requirements collector failed — ${reqRes.notice}`);

const requirements = reqRes.value;
const active = requirements.filter((r) => r.active);
const folded = requirements.filter((r) => !r.active);

const prsByRequirement = new Map();
for (const pr of prRes.value ?? []) {
  for (const n of pr.requirements) {
    if (!prsByRequirement.has(n)) prsByRequirement.set(n, []);
    prsByRequirement.get(n).push(pr);
  }
}

const driftCount = active.filter((r) => r.drift).length;
const requirementsNote = `Board Status from the <a href="${PROJECT_URL}">obot Roadmap project</a>${
  driftCount ? `, including <strong>${driftCount}</strong> open requirement${driftCount > 1 ? 's' : ''} the board has parked in <code>Released</code> or left unstaged — shown here rather than folded away` : ''
}.`;

const requirementsSection = section(
  'requirements',
  'Requirements',
  active.length,
  await requirementTable(active, prsByRequirement),
  { note: requirementsNote },
);

const foldedSection = `<details class="rm-fold">
<summary>Backlog &amp; closed (${folded.length})</summary>
${await requirementTable(folded, prsByRequirement)}
</details>`;

const viewChips = VIEWS.map((v) =>
  `<button class="rm-view-btn${v.key === DEFAULT_VIEW ? ' current' : ''}" data-view="${v.key}"` +
  ` aria-pressed="${v.key === DEFAULT_VIEW}" title="${esc(v.blurb)}">${esc(v.label)}</button>`).join('');

// data-filter, not data-repo: the filter hides every [data-repo] node, and the
// chips must not be able to hide themselves.
const filterChips = ['<button class="rm-chip-btn current" data-filter="all" aria-pressed="true">all</button>']
  .concat(REPOS.map((r) => `<button class="rm-chip-btn" data-filter="${r.nameWithOwner}" aria-pressed="false">${esc(r.name)}</button>`))
  .join('');

const auditLogHtml = `<dialog id="audit-log" class="audit-log" aria-labelledby="audit-log-title">
  <form method="dialog"><button class="audit-close" aria-label="Close">&times;</button></form>
  <h2 id="audit-log-title">Audit log</h2>
  <p class="meta">What changed in each roadmap update — maintained in
  <a href="https://github.com/${HUB}/blob/main/site/roadmap-changelog.json"><code>roadmap-changelog.json</code></a>.</p>
${auditEntries.map((e) => `  <section class="audit-entry">
    <h3>v${esc(e.version)} <span class="audit-date">${fmtET(e.date)}</span></h3>
    <ul>
${e.changes.map((c) => `      <li>${esc(c)}</li>`).join('\n')}
    </ul>
  </section>`).join('\n')}
</dialog>`;

const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Roadmap · obot</title>
<link rel="stylesheet" href="assets/styles.css">
</head>
<body class="wide">
${siteHeader({
  page: 'overview',
  extra: `<button class="version-badge" id="version-badge" aria-haspopup="dialog" aria-controls="audit-log"
      title="Roadmap audit log">v${esc(auditEntries[0].version)} – ${fmtET(auditEntries[0].date)}</button>`,
})}

<div class="rm-bar">
  <span class="rm-views" id="rm-views" role="group" aria-label="View">${viewChips}</span>
  <span class="rm-session" id="rm-session" hidden></span>
  <span class="rm-filters" id="rm-filters" role="group" aria-label="Filter by repo">${filterChips}</span>
</div>
<p class="rm-blurb" id="rm-blurb"></p>

${todoSection(prRes, relRes, decRes)}
${goalsSection(goalRes, requirements)}
${hierarchySection(hierRes, { requirements, proposal })}
${requirementsSection}
${auditSection(auditLedger, { now: NOW })}

${prSection(prRes)}
${upcomingSection(relRes)}
${ideasSection(ideaRes)}
${recentSection(relRes)}

${foldedSection}
${auditLogHtml}

<script>
(function () {
  var badge = document.getElementById('version-badge');
  var log = document.getElementById('audit-log');
  badge.addEventListener('click', function () { log.showModal(); });
  log.addEventListener('click', function (e) { if (e.target === log) log.close(); });

  // Repo filter — rows carry a space-separated data-repo list; a section with no
  // surviving rows hides itself so the page stays dense when filtered.
  // Two independent filters — view (what kind of row) and repo — composed into
  // one predicate. Rows carry data-hl (the views they belong to) and data-repo.
  var repoButtons = Array.prototype.slice.call(document.querySelectorAll('.rm-chip-btn'));
  var viewButtons = Array.prototype.slice.call(document.querySelectorAll('.rm-view-btn'));
  var blurbs = ${JSON.stringify(Object.fromEntries(VIEWS.map((v) => [v.key, v.blurb])))};
  var view = ${JSON.stringify(DEFAULT_VIEW)};
  var repo = 'all';

  // A count badge counts the rows of the first list or table after its heading,
  // so the numbers keep telling the truth once a filter is on.
  function scopesOf(badge) {
    var head = badge.closest('h2, h3');
    for (var el = head; el; el = el.nextElementSibling) {
      // rm-scroll is the overflow container a wide table sits in — count through
      // it, or a wrapped table silently loses its badge.
      if (el.classList && (el.classList.contains('rm-rows') || el.classList.contains('rm-scroll') || el.tagName === 'TABLE')) return [el];
    }
    // No list right after the heading: a section that groups its rows into
    // subsections instead. Todo is the one that does, and its heading badge sat
    // frozen at the build-time number — after the live RC refresh replaced the
    // rows under it, the header said 8 while the two subsections said 2 and 8.
    // Count every row list in the section. A section whose heading counts
    // something other than rows (Audit counts findings) has no .rm-rows and
    // keeps its build-time number.
    var sec = badge.closest('.rm-sec');
    var lists = sec ? sec.querySelectorAll('.rm-rows') : [];
    return lists.length ? Array.prototype.slice.call(lists) : null;
  }
  var badges = Array.prototype.slice.call(document.querySelectorAll('.rm-count')).map(function (b) {
    return { el: b, scope: scopesOf(b) };
  });

  function apply() {
    document.querySelectorAll('[data-repo]').forEach(function (row) {
      // split(' ') not a regex: this script is inside a template literal, where
      // a lone backslash is eaten before it reaches the page.
      var repoOk = repo === 'all' || (row.dataset.repo || '').split(' ').indexOf(repo) !== -1;
      var viewOk = view === 'all' || (row.dataset.hl || '').split(' ').indexOf(view) !== -1;
      row.hidden = !(repoOk && viewOk);
    });
    badges.forEach(function (b) {
      if (!b.scope) return;
      var n = 0;
      b.scope.forEach(function (s) {
        Array.prototype.forEach.call(s.querySelectorAll('[data-repo]'), function (r) { if (!r.hidden) n++; });
      });
      b.el.textContent = n;
    });
    // Hide a subsection, then a section, once nothing in it survives — a
    // highlights view should be shorter, not the same page full of empty headings.
    document.querySelectorAll('.rm-sub').forEach(function (sub) {
      var rows = sub.querySelectorAll('[data-repo]');
      sub.hidden = rows.length > 0 && !Array.prototype.some.call(rows, function (r) { return !r.hidden; });
    });
    document.querySelectorAll('.rm-sec').forEach(function (sec) {
      var rows = sec.querySelectorAll('[data-repo]');
      var visible = Array.prototype.some.call(rows, function (r) { return !r.hidden; });
      sec.classList.toggle('rm-dim', rows.length > 0 && !visible);
    });
    repoButtons.forEach(function (b) {
      var on = b.dataset.filter === repo;
      b.classList.toggle('current', on);
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
    viewButtons.forEach(function (b) {
      var on = b.dataset.view === view;
      b.classList.toggle('current', on);
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
    var blurb = document.getElementById('rm-blurb');
    blurb.textContent = blurbs[view] || '';
    if (window.history && window.history.replaceState) {
      window.history.replaceState(null, '', view === ${JSON.stringify(DEFAULT_VIEW)} ? location.pathname : '#' + view);
    }
  }
  repoButtons.forEach(function (b) {
    b.addEventListener('click', function () { repo = b.dataset.filter; apply(); });
  });
  viewButtons.forEach(function (b) {
    b.addEventListener('click', function () { view = b.dataset.view; apply(); });
  });
  // A #live / #attention / #pulse / #all fragment deep-links a view, so a
  // particular reading of the page is a shareable URL.
  var hash = (location.hash || '').replace('#', '');
  if (blurbs.hasOwnProperty(hash)) view = hash;
  apply();

  // Session indicator — published by the session heartbeat to a branch, not by a
  // deploy, so it stays current between site builds. Renders its own timestamp
  // rather than claiming to be live: the raw CDN caches for up to 5 minutes.
  var pill = document.getElementById('rm-session');
  // The publisher can only fail quietly (a Stop hook must not break a session),
  // so the page is where a breakage becomes visible: past STALE_MINUTES the pill
  // stops asserting a live state and says how old the reading is. Showing a
  // confident "2 working" from a feed that died hours ago is worse than silence.
  var STALE_MINUTES = 120;
  fetch(${JSON.stringify(SESSION_STATE_URL)}, { cache: 'no-store' })
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (s) {
      if (!s || !s.state) return;
      var mins = s.updatedAt ? Math.floor((Date.now() - new Date(s.updatedAt)) / 60000) : null;
      var stale = mins === null || mins > STALE_MINUTES;
      var idle = s.state === 'idle' || s.state === 'done';
      var when = mins === null ? 'age unknown'
        : mins < 1 ? 'just now'
        : mins < 60 ? mins + 'm ago'
        : Math.floor(mins / 60) + 'h ago';
      pill.className = 'rm-session ' + (stale ? 'stale' : idle ? 'idle' : 'live');
      pill.title = stale
        ? 'The session feed has not updated recently — it may have stopped publishing.'
        : 'Published by the session heartbeat.';
      pill.textContent = stale
        ? '○ session feed last updated ' + when
        : (idle ? '○ ' : '● ') + (s.name || 'obot') + ' — ' + (s.detail || s.state) + ' · ' + when;
      pill.hidden = false;
    })
    .catch(function () { /* no session state published yet — stay hidden */ });

  // Todo live refresh — the RC PR list re-checks GitHub on load, because PRs
  // open and close without a push to this repo and the section's whole job is
  // "always know what is waiting". One unauthenticated search per page view;
  // a failure just leaves the build-time list standing. Draft-release rows
  // (data-draft) are kept as built: drafts are invisible without a token.
  var rcRows = document.getElementById('todo-rc-rows');
  if (rcRows) {
    var rcQuery = 'is:pr is:open archived:false user:jwildfire review-requested:jwildfire';
    fetch('https://api.github.com/search/issues?per_page=30&q=' + encodeURIComponent(rcQuery))
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (data) {
        if (!data || !Array.isArray(data.items)) return;
        var escape = function (s) {
          return String(s).replace(/[&<>"]/g, function (c) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
          });
        };
        var freshAge = function (iso) {
          var mins = Math.floor((Date.now() - new Date(iso)) / 60000);
          if (mins < 60) return mins <= 1 ? 'just now' : mins + 'm';
          if (mins < 1440) return Math.floor(mins / 60) + 'h';
          return Math.floor(mins / 1440) + 'd';
        };
        // Mirrors lib/rc.mjs — same precedence (milestone, then title), same
        // normalisation. Kept in sync by hand because this script runs in the
        // browser and cannot import the module.
        var releaseKeyOf = function (repo, candidates) {
          for (var i = 0; i < candidates.length; i++) {
            var c = candidates[i];
            if (!c || /^untagged-[0-9a-f]+$/i.test(c)) continue;
            var m = String(c).match(/\bv?(\d+)\.(\d+)(?:\.(\d+))?\b/);
            if (m) return repo + '@v' + m[1] + '.' + m[2] + '.' + (m[3] || 0);
          }
          return null;
        };
        var prKeys = {};
        var fresh = data.items.map(function (it) {
          var repo = it.repository_url.replace('https://api.github.com/repos/', '');
          var key = releaseKeyOf(repo, [it.milestone && it.milestone.title, it.title]);
          if (key) prKeys[key] = true;
          return '<div class="rm-row" data-repo="' + escape(repo) + '" data-hl="live attention pulse"' +
            (key ? ' data-release="' + escape(key) + '"' : '') + '>' +
            '<span class="rm-key"><a href="' + escape(it.html_url) + '">' + escape(repo.split('/')[1]) + '#' + it.number + '</a></span>' +
            '<span class="rm-main"><span class="rm-pill rc">rc pr</span> ' + escape(it.title) + '</span>' +
            '<span class="rm-meta">' + freshAge(it.updated_at) + '</span></div>';
        });
        // Re-run the build-time dedupe over the fresh list: a draft release whose
        // RC PR is in this response is the same release, and listing it again
        // would put the duplicate straight back after the fetch.
        var drafts = Array.prototype.filter.call(rcRows.children, function (el) {
          if (!el.hasAttribute || !el.hasAttribute('data-draft')) return false;
          var key = el.getAttribute('data-release');
          return !(key && prKeys[key]);
        }).map(function (el) { return el.outerHTML; });
        var all = fresh.concat(drafts);
        rcRows.innerHTML = all.length ? all.join('') : '<p class="rm-empty">No release candidates are waiting.</p>';
        apply(); // recount badges and re-apply active filters over the fresh rows
      })
      .catch(function () { /* offline or rate-limited — the build-time list stands */ });
  }
})();
</script>

<footer class="site">Generated ${fmtET(new Date())} · regenerates via <code>deploy-site.yml</code> ·
built by <a href="https://github.com/${HUB}/blob/main/scripts/build_roadmap_next.mjs"><code>build_roadmap_next.mjs</code></a>
for <a href="https://github.com/${HUB}/issues/57">requirement #57</a>.</footer>
</body>
</html>
`;

await fs.mkdir(path.join(ROOT, '_site'), { recursive: true });
await fs.writeFile(path.join(ROOT, '_site', OUT), html);

// The staged URL was shared in #57 and in review comments while the page was
// being built; keep it resolving rather than breaking those links.
if (OUT === 'roadmap.html') {
  await fs.writeFile(path.join(ROOT, '_site', STAGED_ALIAS), `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Roadmap · obot</title>
<link rel="canonical" href="roadmap.html">
<meta http-equiv="refresh" content="0; url=roadmap.html">
</head>
<body>
<p>The staged roadmap page is now the roadmap: <a href="roadmap.html">roadmap.html</a>.</p>
</body>
</html>
`);
}

const degraded = [
  ['PRs', prRes], ['releases', relRes], ['ideas', ideaRes], ['goals', goalRes], ['hierarchy', hierRes],
  ['decisions', decRes],
].filter(([, r]) => !r.ok).map(([n]) => n);
const todoRc = rcQueue(prRes, relRes);
const todoRcCount = todoRc.rcPrs.length + todoRc.drafts.length;
console.log(
  `roadmap-next: todo ${todoRcCount} RCs` +
  (todoRc.suppressed ? ` (${todoRc.suppressed} draft release${todoRc.suppressed > 1 ? 's' : ''} folded into their RC PR)` : '') +
  ` + ${decRes.value?.awaiting.length ?? 0} decisions, ` +
  `${active.length} active (+${driftCount} drift), ${folded.length} folded, ` +
  `${prRes.value?.length ?? 0} PRs, ${relRes.value?.upcoming.length ?? 0} upcoming, ` +
  `${relRes.value?.recent.length ?? 0} releases, ${ideaRes.value?.open.length ?? 0} ideas, ` +
  `${auditLedger ? `${auditLedger.counts.total} audit findings` : 'no audit ledger'}` +
  (degraded.length ? ` — degraded: ${degraded.join(', ')}` : ''),
);
