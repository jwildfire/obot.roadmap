// The catalog — the complete public record of the roadmap (requirement #57).
//
// One page holding everything that exists: standing goals, the goal →
// requirement → task hierarchy with its review lane, active requirements, open
// PRs, upcoming releases, recent releases, the ideas queue and the audit fold,
// every row linking to its GitHub source, filterable by view crossed with repo.
//
// This page WAS the roadmap page, at roadmap.html, from the flip on 2026-07-24
// until D0018 on 2026-08-16. That decision made the queue the front door and
// moved this page one click behind it as the catalog: nothing it does was given
// up, it simply stopped being what he arrives at. `roadmap-next.html`, the URL
// this page was staged at during its own review in July, still redirects here —
// that URL always meant the inventory, and it still resolves to it.
//
// It must not converge toward the queue. The queue answers "what needs me" by
// leaving things out; this page answers "what exists" by leaving nothing out,
// and the two only stay useful while they stay different.
//
// Every section comes from an independent collector wrapped in settle() by the
// driver: a failed source renders as a notice line in its own section instead of
// blanking a page that is the project's public record.
import fs from 'node:fs/promises';
import path from 'node:path';

import { esc, fmtET, age, hasToken, day, clip } from '../lib/gh.mjs';
import { REPOS, ROOT, HUB } from '../lib/repos.mjs';
import { releaseKey, browserReleaseKeySource } from '../lib/rc.mjs';
import { hierarchySection } from '../lib/hierarchy/render.mjs';
import { siteHeader } from '../lib/nav.mjs';
import {
  VIEWS, DEFAULT_VIEW, goalViews, requirementViews, prViews,
  upcomingViews, releaseViews, openIdeaViews, promotedIdeaViews,
} from '../lib/highlights.mjs';

export const meta = { slug: 'catalog', out: 'catalog.html' };

const STAGED_ALIAS = 'roadmap-next.html'; // redirect kept for links shared during review
const RECENT_RELEASES = 10;

// The build clock, set once by render() from the driver's shared collection pass
// so every page in the set ages its rows against the same instant. Module-level
// rather than threaded through twenty render helpers: this file was a script
// with a module-level NOW before it became a module, and keeping the shape means
// the diff against that script is about the move and nothing else.
let NOW = new Date();

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
  if (!res.ok) return section('goals', 'Objectives', null, '', { notice: res.notice });
  const goals = res.value.filter((g) => g.status !== 'paused');
  if (!goals.length) return section('goals', 'Objectives', 0, empty('No active goals.'));

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

  return section('goals', 'Objectives', goals.length, `<div class="rm-rows">\n${rows}\n</div>`, {
    note: `Standing direction from the hub's <a href="https://github.com/${HUB}/issues?q=is%3Aissue+is%3Aopen+label%3Agoal"><code>goal</code>-labeled issues</a> — the same goals autonomous sessions select from (#53/#71); per-goal detail on the <a href="goals/index.html">goal pages</a>.`,
  });
}

// ---------------------------------------------------------------- requirements
const PILL = {
  approved: 'approved',
  unresolved: 'approval unresolved',
  undetermined: 'approval unconfirmed',
};

async function requirementRow(req, prsByRequirement) {
  // 'unstaged' is already what the stage pill says — don't badge it twice.
  const drift = req.drift && req.drift !== 'unstaged'
    ? ` <span class="status-pill drift" title="The status label disagrees with the issue state">${esc(req.drift)}</span>`
    : '';
  // Whose decision it carries (#215). A pill appears only where a requirement
  // claims an approval under the current convention — that is the claim a reader
  // can believe wrongly, and the legend below says what no pill means.
  //
  // `claimed` (the legacy drafted-by line asserting a review nothing records) is
  // deliberately NOT a pill: it is true of 74 rows, and 74 amber pills would drown
  // the one pill that matters. It is counted in the legend and named in the report,
  // which is the same boundary the audit rules draw by date.
  const prov = PILL[req.provenance?.state]
    ? ` <span class="status-pill prov-${req.provenance.state}" title="${esc(req.provenance.detail)}">${PILL[req.provenance.state]}</span>`
    : '';
  const prs = prsByRequirement.get(req.number) ?? [];
  const activity = prs.length
    ? ` <span class="rm-activity" title="${prs.map((p) => `${p.repo}#${p.number}`).join(', ')}">${prs.length} open PR${prs.length > 1 ? 's' : ''}</span>`
    : '';
  const tasks = req.tasks
    ? `${req.tasks.done}/${req.tasks.total}${req.tasks.source === 'checklist' ? '<span class="rm-none" title="from an inline checklist, not sub-issues">*</span>' : ''}`
    : '<span class="rm-none">—</span>';
  const repos = req.repos.map((r) => `<span class="rm-chip">${esc(shortRepo(r))}</span>`).join('');
  const stagePill = stageClass(req.stage);
  return `  <tr data-repo="${repoAttr(req.repos)}" data-hl="${requirementViews(req, prs, NOW)}">
    <td><a href="${req.url}">#${req.number}</a></td>
    <td>${esc(req.title)}${drift}${prov}${activity}</td>
    <td><span class="status-pill ${stagePill}">${esc(req.stage)}</span></td>
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

// ---------------------------------------------------------------- page
// The staged URL was shared in #57 and in review comments while this page was
// being built, and again in the D0018 rebuild; keep it resolving to the page it
// has always meant rather than breaking those links.
export function aliasRedirect() {
  return {
    name: STAGED_ALIAS,
    html: `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Catalog · obot</title>
<link rel="canonical" href="${meta.out}">
<meta http-equiv="refresh" content="0; url=${meta.out}">
</head>
<body>
<p>The full roadmap inventory is the catalog: <a href="${meta.out}">${meta.out}</a>.</p>
</body>
</html>
`,
  };
}

// The body below is deliberately left at column zero rather than indented into
// this function. Most of it is template literals whose leading whitespace is the
// emitted HTML, so re-indenting would rewrite the page's markup — and this move
// is proved by diffing the rendered bytes against the page it replaces. Layout
// that changes output is not cosmetic here.
export async function render(data) {
  const { reqRes, prRes, relRes, goalRes, hierRes, decRes, proposal, changelog } = data;
  NOW = data.NOW ?? new Date();

const auditEntries = [...changelog.entries].sort((a, b) => b.date.localeCompare(a.date));
if (!auditEntries.length) throw new Error('site/roadmap-changelog.json has no entries');

if (!hasToken) console.warn('roadmap: no GITHUB_TOKEN — sections that need the API will degrade');

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
// Whose decision each requirement carries (#215), stated once under the table
// people read. The legacy count is the whole population, not this table's share:
// a number that changes depending on which fold you are looking at is worse than
// no number, because it reads as a different fact each time.
const claimedCount = [...active, ...folded].filter((r) => r.provenance?.state === 'claimed').length;
const requirementsNote = `Status from each requirement's <code>status:</code> label — backlog, ready, in session, review, released — the one place it lives${
  driftCount ? `, including <strong>${driftCount}</strong> open requirement${driftCount > 1 ? 's' : ''} whose label disagrees with the issue — labelled released while open, unlabelled, or doubly labelled — shown here rather than folded away` : ''
}. No approval pill means nobody has approved that requirement — the normal state for work an agent wrote, and recorded on the issue as <code>Approved by: EMPTY</code> rather than left blank (<a href="https://github.com/${HUB}/issues/215">#215</a>); a pill appears only where a requirement claims an approval, because a claim is the thing that can be believed wrongly.${
  claimedCount ? ` Separately, ${claimedCount} requirements still end with the older attribution line asserting that @jwildfire reviewed them, and nothing on record says he did — counted in the <a href="reports/requirement-provenance/">provenance report</a> rather than rewritten.` : ''
}`;

const degraded = [
  ['PRs', prRes], ['releases', relRes], ['goals', goalRes], ['hierarchy', hierRes],
  ['decisions', decRes],
].filter(([, r]) => !r.ok).map(([n]) => n);
const todoRc = rcQueue(prRes, relRes);
const todoRcCount = todoRc.rcPrs.length + todoRc.drafts.length;
console.log(
  `catalog: todo ${todoRcCount} RCs` +
  (todoRc.suppressed ? ` (${todoRc.suppressed} draft release${todoRc.suppressed > 1 ? 's' : ''} folded into their RC PR)` : '') +
  ` + ${decRes.value?.awaiting.length ?? 0} decisions, ` +
  `${active.length} active (+${driftCount} drift), ${folded.length} folded, ` +
  `${prRes.value?.length ?? 0} PRs, ${relRes.value?.upcoming.length ?? 0} upcoming, ` +
  `${relRes.value?.recent.length ?? 0} releases` +
  (degraded.length ? ` — degraded: ${degraded.join(', ')}` : ''),
);

  return html;
}
