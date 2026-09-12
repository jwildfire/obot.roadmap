// The tracker page — the roadmap's issue tree as one drill-down: objectives,
// each opening to its requirements, each opening to its tasks, with every
// node's state visible on its row and a sidebar that searches, filters and
// counts. The successor to the retired GitHub project board (@jwildfire,
// 2026-09-12): a list of objectives with drill-down to requirements and tasks,
// status and lifecycle visible, a sidebar with search and filters and the basic
// metrics of what status everything is in.
//
// Server-rendered rows, client-side filtering: the page reads complete with no
// script, and the script only hides rows and recounts. Filter state lives in
// the URL fragment so a filtered view can be sent as a link.
import { esc, age, fmtET } from '../gh.mjs';
import { HUB } from '../repos.mjs';
import { siteHeader } from '../nav.mjs';
import { STAGES, LIFECYCLE, AREAS } from '../collect/tracker.mjs';

export const DESCRIPTION = 'Every objective on the roadmap opened to its requirements and their tasks, with the status of each visible on its row, searchable and filterable by status, objective, area and milestone.';

const stageClass = (stage) => stage.toLowerCase().replace(/ /g, '-');
const attr = (parts) => esc(parts.filter(Boolean).join(' ').toLowerCase());
const plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

// A JSON literal inside <script> must not be able to close the tag.
const inlineJson = (value) => JSON.stringify(value).replace(/</g, '\\u003c');

// ------------------------------------------------------------------ pieces
// The lifecycle strip: the five statuses of the contract as dots, filled up to
// the one the requirement carries. Released fills all five; Retired and
// Unstaged say so with their own mark, since neither is a point on the line.
function lifecycle(stage) {
  const idx = LIFECYCLE.indexOf(stage);
  const dots = LIFECYCLE.map((s, i) => {
    const on = idx >= 0 && i <= idx;
    return `<i class="${on ? 'on' : ''}" title="${esc(s)}"></i>`;
  }).join('');
  const label = idx >= 0 ? `${stage}, stage ${idx + 1} of ${LIFECYCLE.length}` : stage;
  return `<span class="tk-life ${stageClass(stage)}" role="img" aria-label="${esc(label)}">${dots}</span>`;
}

const pill = (stage) => `<span class="status-pill ${stageClass(stage)}">${esc(stage)}</span>`;

// The stage bar: one segment per stage, widths proportional, each segment
// carrying its count as text and its stage as a title — the sidebar's status
// list is the legend. A 2px surface gap separates segments.
function stageBar(byStage, total) {
  if (!total) return '<span class="tk-none">no requirements</span>';
  const segs = STAGES.filter((s) => byStage[s]).map((s) =>
    `<span class="tk-seg ${stageClass(s)}" style="flex-grow:${byStage[s]}" title="${esc(`${s}: ${byStage[s]}`)}"><b>${byStage[s]}</b></span>`).join('');
  return `<span class="tk-bar" role="img" aria-label="${esc(STAGES.filter((s) => byStage[s]).map((s) => `${s} ${byStage[s]}`).join(', '))}">${segs}</span>`;
}

// Closed over total, as a thin meter with the fraction beside it.
function meter(done, total, what) {
  const pct = total ? Math.round((done / total) * 100) : 0;
  return `<span class="tk-meter" title="${esc(`${done} of ${total} ${what} closed`)}"><span class="tk-meter-track"><span class="tk-meter-fill" style="width:${pct}%"></span></span><span class="tk-meter-num">${done}/${total}</span></span>`;
}

const chip = (text, cls = '') => `<span class="rm-chip${cls ? ` ${cls}` : ''}">${esc(text)}</span>`;
const flag = (text, cls, title = '') => `<span class="rm-pill ${cls}"${title ? ` title="${esc(title)}"` : ''}>${esc(text)}</span>`;

// ------------------------------------------------------------------ rows
function taskRow(t, now) {
  const phaseCls = t.phase.replace(' ', '-');
  const prs = t.prs.filter((pr) => pr.state === 'OPEN' || pr.merged).map((pr) =>
    `<a class="tk-pr" href="${esc(pr.url)}" title="${pr.merged ? 'merged' : pr.draft ? 'draft pull request' : 'open pull request'}">PR #${pr.number}</a>`).join(' ');
  const bits = [
    `<span class="tk-phase ${phaseCls}">${esc(t.phase)}</span>`,
    esc(t.title),
    t.isRequirement ? flag('requirement', 'draft', 'a hub requirement linked as a sub-issue of this one') : '',
    t.blocked && t.state === 'OPEN' ? flag('blocked', 'decision', 'carries the blocked label — one question for @jwildfire on the issue') : '',
    prs,
  ].filter(Boolean).join(' ');
  const meta = [t.milestone ? esc(t.milestone) : '<span class="tk-warn" title="a task with no milestone is not pickable">no milestone</span>', age(t.closedAt ?? t.updatedAt, now)].join(' · ');
  return `      <div class="rm-row tk-task" data-kind="task" data-phase="${phaseCls}" data-repo="${esc(t.repo)}" data-search="${attr([t.key, t.title, t.repoShort, t.milestone, ...t.labels])}">
        <span class="rm-key"><a href="${esc(t.url)}">${esc(t.key)}</a></span>
        <span class="rm-main">${bits}</span>
        <span class="rm-meta">${meta}</span>
      </div>`;
}

function requirementRow(r, now, { designs }) {
  const tr = r.taskRollup;
  const tasksHtml = r.tasks.length
    ? r.tasks.map((t) => taskRow(t, now)).join('\n')
    : `      <p class="rm-empty">No tasks linked as sub-issues${r.state === 'OPEN' && r.stage !== 'Backlog' ? ' — the Ready gate asks for them' : ''}.</p>`;
  const flags = [
    r.area ? chip(r.area, `tk-area ${r.area}`) : '',
    r.blocked ? flag('blocked', 'decision', 'carries the blocked label — one question for @jwildfire on the issue') : '',
    r.drift ? flag(r.drift, 'warn', 'the status label does not agree with the issue') : '',
    tr.blocked ? flag(`${tr.blocked} blocked`, 'decision', 'tasks under it carrying the blocked label') : '',
    tr.inReview ? flag(`${tr.inReview} in review`, 'ready', 'tasks with an open pull request') : '',
  ].filter(Boolean).join(' ');
  const design = designs.has(r.number) ? ` <a class="tk-design" href="requirements/design/${r.number}_design.html">design</a>` : '';
  const meta = [
    r.tasks.length ? meter(tr.done + tr.retired, tr.total, 'tasks') : '<span class="tk-none">no tasks</span>',
    r.milestone ? esc(r.milestone) : '<span class="tk-warn" title="a requirement with no milestone cannot be Ready">no milestone</span>',
    age(r.closedAt ?? r.updatedAt, now),
  ].join(' · ');
  const search = attr([`#${r.number}`, r.title, r.stage, r.area, r.milestone, ...r.labels, ...r.repos.map((x) => x.split('/')[1])]);
  return `    <details class="tk-req" data-kind="requirement" data-stage="${esc(r.stage)}" data-objective="${r.objective ?? 'none'}" data-area="${esc(r.area ?? 'none')}" data-milestone="${esc(r.milestone ?? 'none')}" data-blocked="${r.blocked || tr.blocked ? 1 : 0}" data-drift="${r.drift ? 1 : 0}" data-search="${search}">
      <summary class="rm-row">
        <span class="rm-key"><a href="${esc(r.url)}">#${r.number}</a> ${lifecycle(r.stage)}</span>
        <span class="rm-main">${pill(r.stage)} ${esc(r.title)}${design} ${flags}</span>
        <span class="rm-meta">${meta}</span>
      </summary>
      <div class="tk-tasks rm-rows">
${tasksHtml}
      </div>
    </details>`;
}

function objectiveBlock(o, now, opts) {
  const rr = o.reqRollup, tr = o.taskRollup;
  const active = rr.byStage['In session'] + rr.byStage.Review + rr.byStage.Ready;
  const stateCls = o.state === 'OPEN' ? 'open' : o.retired ? 'retired' : 'closed';
  const stateText = o.state === 'OPEN' ? (active ? `${plural(active, 'requirement')} in flight` : 'nothing in flight') : o.retired ? 'retired' : 'closed';
  const rows = o.requirements.length
    ? o.requirements.map((r) => requirementRow(r, now, opts)).join('\n')
    : '    <p class="rm-empty">No requirements are linked as sub-issues of this objective.</p>';
  const unread = o.subIssues.total - o.requirements.length;
  const note = unread > 0 ? `<p class="rm-note">${plural(unread, 'sub-issue')} of this objective ${unread === 1 ? 'is' : 'are'} not requirement issues and ${unread === 1 ? 'is' : 'are'} not shown.</p>` : '';
  return `  <details class="tk-obj ${stateCls}" id="obj-${o.number}" data-kind="objective" data-number="${o.number}" data-search="${attr([`#${o.number}`, o.title, o.milestone])}"${o.state === 'OPEN' ? ' open' : ''}>
    <summary>
      <span class="tk-obj-head">
        <span class="tk-obj-title"><a href="${esc(o.url)}" class="tk-obj-num">#${o.number}</a> ${esc(o.title)}</span>
        <span class="tk-obj-meta">${o.milestone ? chip(o.milestone) : ''} <span class="tk-obj-state ${stateCls}">${stateText}</span> · <a href="${esc(o.page)}">page</a></span>
      </span>
      <span class="tk-obj-stats">
        ${stageBar(rr.byStage, rr.total)}
        <span class="tk-obj-nums">${meter(rr.closed, rr.total, 'requirements')} requirements${tr.total ? ` · ${meter(tr.done + tr.retired, tr.total, 'tasks')} tasks` : ''}${rr.blocked + tr.blocked ? ` · ${flag(`${rr.blocked + tr.blocked} blocked`, 'decision')}` : ''}${rr.drift ? ` · ${flag(`${rr.drift} drift`, 'warn')}` : ''}</span>
      </span>
    </summary>
    ${note}<div class="tk-reqs">
${rows}
    </div>
    <p class="rm-empty tk-obj-empty" hidden>Every requirement under this objective is hidden by the current filters.</p>
  </details>`;
}

// ------------------------------------------------------------------ sidebar
function sidebar(model) {
  const t = model.totals;
  const stageRows = STAGES.filter((s) => t.requirements.byStage[s] || LIFECYCLE.includes(s)).map((s) => {
    const n = t.requirements.byStage[s];
    const on = s !== 'Released' && s !== 'Retired';
    return `      <label class="tk-f"><input type="checkbox" name="stage" value="${esc(s)}"${on ? ' checked' : ''}> <i class="tk-sw ${stageClass(s)}"></i>${esc(s)} <span class="count">${n}</span></label>`;
  }).join('\n');
  const objRows = model.objectives.map((o) =>
    `      <label class="tk-f"><input type="checkbox" name="objective" value="${o.number}" checked> <span class="tk-f-text">${esc(o.title)}</span> <span class="count">${o.reqRollup.total}</span></label>`)
    .concat(t.unparented ? [`      <label class="tk-f"><input type="checkbox" name="objective" value="none" checked> <span class="tk-f-text">No objective</span> <span class="count">${t.unparented}</span></label>`] : [])
    .join('\n');
  const areaCount = (a) => model.requirements.filter((r) => (r.area ?? 'none') === a).length;
  const areaRows = AREAS.concat(['none']).map((a) =>
    `      <label class="tk-f"><input type="checkbox" name="area" value="${a}" checked> ${a === 'none' ? 'No area label' : esc(a)} <span class="count">${areaCount(a)}</span></label>`).join('\n');
  const msCount = (m) => model.requirements.filter((r) => (r.milestone ?? 'none') === m).length;
  const msRows = model.milestones.concat(msCount('none') ? ['none'] : []).map((m) =>
    `      <label class="tk-f"><input type="checkbox" name="milestone" value="${esc(m)}" checked> ${m === 'none' ? 'No milestone' : esc(m)} <span class="count">${msCount(m)}</span></label>`).join('\n');

  return `<aside class="tk-side" id="tk-side">
  <div class="tk-metrics" aria-label="Totals">
    <div class="tk-tile"><strong>${t.objectives.open}</strong><span>open objectives</span></div>
    <div class="tk-tile"><strong>${t.requirements.open}</strong><span>open requirements</span></div>
    <div class="tk-tile"><strong>${t.tasks.open + t.tasks.inReview}</strong><span>open tasks</span></div>
    <div class="tk-tile${t.requirements.blocked + t.tasks.blocked ? ' warn' : ''}"><strong>${t.requirements.blocked + t.tasks.blocked}</strong><span>blocked</span></div>
  </div>
  <div class="filter-group">
    <label class="tk-search-label" for="tk-q">Search</label>
    <input type="search" id="tk-q" placeholder="title, number, repo, label…" autocomplete="off">
  </div>
  <details class="tk-filters" id="tk-filters" open>
  <summary>Filters</summary>
  <div class="filter-group" id="f-stage">
    <h3>Status <button type="button" class="tk-link" data-all="stage">all</button> <button type="button" class="tk-link" data-none="stage">none</button></h3>
${stageRows}
  </div>
  <div class="filter-group" id="f-flags">
    <h3>Flags</h3>
      <label class="tk-f"><input type="checkbox" name="blocked" value="1"> Blocked only <span class="count">${t.requirements.blocked + t.tasks.blocked}</span></label>
      <label class="tk-f"><input type="checkbox" name="drift" value="1"> Drift only <span class="count">${t.requirements.drift}</span></label>
  </div>
  <div class="filter-group" id="f-objective">
    <h3>Objective <button type="button" class="tk-link" data-all="objective">all</button> <button type="button" class="tk-link" data-none="objective">none</button></h3>
${objRows}
  </div>
  <div class="filter-group" id="f-area">
    <h3>Area</h3>
${areaRows}
  </div>
  <div class="filter-group" id="f-milestone">
    <h3>Milestone <button type="button" class="tk-link" data-all="milestone">all</button> <button type="button" class="tk-link" data-none="milestone">none</button></h3>
${msRows}
  </div>
  <p class="rm-note"><button type="button" class="tk-link" id="tk-reset">Reset filters</button></p>
  </details>
</aside>`;
}

// ------------------------------------------------------------------ page
/**
 * @param model   the tree from buildTracker()
 * @param opts    { now, designs: Set<number> of requirement numbers with a design page }
 */
export function renderTracker(model, { now = new Date(), designs = new Set() } = {}) {
  const t = model.totals;
  const blocks = model.objectives.map((o) => objectiveBlock(o, now, { designs })).join('\n');
  const unparented = model.unparented.length ? `  <details class="tk-obj none" id="obj-none" data-kind="objective" data-number="none" data-search="no objective unparented">
    <summary>
      <span class="tk-obj-head">
        <span class="tk-obj-title">Requirements under no objective</span>
        <span class="tk-obj-meta"><span class="tk-obj-state">not on the tree</span></span>
      </span>
      <span class="tk-obj-stats">
        ${stageBar(requirementStages(model.unparented), model.unparented.length)}
        <span class="tk-obj-nums">${plural(model.unparented.length, 'requirement')} whose parent is not an objective — most closed before the tree existed; an open one is a gap in the record</span>
      </span>
    </summary>
    <div class="tk-reqs">
${model.unparented.map((r) => requirementRow(r, now, { designs })).join('\n')}
    </div>
    <p class="rm-empty tk-obj-empty" hidden>Every requirement here is hidden by the current filters.</p>
  </details>` : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Tracker · obot</title>
<meta name="description" content="${esc(DESCRIPTION)}">
<link rel="stylesheet" href="assets/styles.css">
</head>
<body class="wide">
${siteHeader({ page: 'tracker' })}

<h1>Tracker</h1>
<p class="tagline">The roadmap as GitHub records it: every objective, its requirements, their tasks. Open a
row to drill down. Status is the <code>status:</code> label on the requirement; a task reads
from its issue and its pull request.</p>

<div class="tk-layout">
${sidebar(model)}
<div class="tk-main">
  <div class="tk-toolbar">
    <span class="tk-showing" id="tk-showing">Showing ${t.requirements.total} requirements</span>
    <span class="tk-tools"><button type="button" class="tk-link" id="tk-expand">expand all</button> · <button type="button" class="tk-link" id="tk-collapse">collapse all</button></span>
  </div>
  <div id="tk-list">
${blocks}
${unparented}
  </div>
  <p class="rm-empty" id="tk-empty" hidden>Nothing matches the current filters.</p>
</div>
</div>

<p class="rm-note">Read from the sub-issue links on <a href="https://github.com/${HUB}/issues?q=is%3Aissue+label%3Aobjective">the objective issues</a>
under the <a href="https://github.com/${HUB}/blob/main/docs/issue-contract.md">issue contract</a>.
${plural(t.objectives.total, 'objective')}, ${plural(t.requirements.total, 'requirement')}, ${plural(t.tasks.total, 'task')} across ${plural(model.repos.length, 'repository', 'repositories')}.</p>

<footer class="site">Generated ${fmtET(now)} by
<a href="https://github.com/${HUB}/blob/main/scripts/build_tracker.mjs"><code>build_tracker.mjs</code></a>
· regenerates via <code>deploy-site.yml</code>.</footer>
<script>${SCRIPT}</script>
<script type="application/json" id="tk-totals">${inlineJson(t)}</script>
</body>
</html>
`;
}

function requirementStages(reqs) {
  const out = Object.fromEntries(STAGES.map((s) => [s, 0]));
  for (const r of reqs) out[r.stage] += 1;
  return out;
}

// The client half. Rows carry their facets as data attributes; the script
// reads the sidebar, hides what does not match, and recounts. A requirement
// shows when it matches or one of its tasks does; an objective shows when it
// matches by name or holds a visible requirement. The fragment carries the
// state, so a filtered view is a link.
const SCRIPT = `
(function () {
  var side = document.getElementById('tk-side');
  var q = document.getElementById('tk-q');
  var reqs = Array.prototype.slice.call(document.querySelectorAll('.tk-req'));
  var objs = Array.prototype.slice.call(document.querySelectorAll('.tk-obj'));
  var showing = document.getElementById('tk-showing');
  var empty = document.getElementById('tk-empty');
  var boxes = function (name) { return Array.prototype.slice.call(side.querySelectorAll('input[name="' + name + '"]')); };
  var checked = function (name) { return boxes(name).filter(function (b) { return b.checked; }).map(function (b) { return b.value; }); };
  var norm = function (s) { return (s || '').toLowerCase().trim(); };

  function apply(fromUser) {
    var text = norm(q.value);
    var terms = text ? text.split(/\\s+/) : [];
    var stage = checked('stage'), objective = checked('objective'), area = checked('area'), milestone = checked('milestone');
    var blockedOnly = checked('blocked').length > 0, driftOnly = checked('drift').length > 0;
    var matches = function (hay) { return terms.every(function (t) { return hay.indexOf(t) !== -1; }); };
    var visible = 0;
    reqs.forEach(function (r) {
      var d = r.dataset;
      var ok = stage.indexOf(d.stage) !== -1 && objective.indexOf(d.objective) !== -1
        && area.indexOf(d.area) !== -1 && milestone.indexOf(d.milestone) !== -1
        && (!blockedOnly || d.blocked === '1') && (!driftOnly || d.drift === '1');
      var tasks = Array.prototype.slice.call(r.querySelectorAll('.tk-task'));
      var selfHit = ok && matches(d.search);
      var taskHit = false;
      tasks.forEach(function (t) {
        var hit = ok && terms.length > 0 && matches(t.dataset.search);
        // With a search term, only the matching tasks stay when the requirement
        // itself does not match; with none, every task shows.
        t.hidden = terms.length > 0 && !selfHit && !hit;
        if (hit) taskHit = true;
      });
      var show = ok && (terms.length === 0 || selfHit || taskHit);
      r.hidden = !show;
      if (show) visible += 1;
      if (show && terms.length > 0 && taskHit && !selfHit && fromUser) r.open = true;
    });
    objs.forEach(function (o) {
      var any = Array.prototype.some.call(o.querySelectorAll('.tk-req'), function (r) { return !r.hidden; });
      var selfHit = terms.length > 0 && matches(o.dataset.search) && objective.indexOf(o.dataset.number) !== -1;
      o.hidden = !any && !selfHit;
      var note = o.querySelector('.tk-obj-empty');
      if (note) note.hidden = any || !selfHit;
    });
    showing.textContent = 'Showing ' + visible + ' of ' + reqs.length + ' requirements';
    empty.hidden = visible > 0 || objs.some(function (o) { return !o.hidden; });
    if (fromUser) writeHash();
  }

  // The fragment: q=…&stage=a,b&objective=…&area=…&milestone=…&blocked=1&drift=1.
  // Only facets that differ from their default are written, so a clean page has
  // a clean URL.
  function writeHash() {
    var parts = [];
    if (q.value.trim()) parts.push('q=' + encodeURIComponent(q.value.trim()));
    ['stage', 'objective', 'area', 'milestone'].forEach(function (name) {
      var all = boxes(name), on = all.filter(function (b) { return b.checked; });
      var dflt = all.filter(function (b) { return b.defaultChecked; });
      var same = on.length === dflt.length && on.every(function (b) { return b.defaultChecked; });
      if (!same) parts.push(name + '=' + on.map(function (b) { return encodeURIComponent(b.value); }).join(','));
    });
    if (checked('blocked').length) parts.push('blocked=1');
    if (checked('drift').length) parts.push('drift=1');
    var h = parts.length ? '#' + parts.join('&') : '';
    if (window.history && window.history.replaceState) window.history.replaceState(null, '', location.pathname + location.search + h);
  }
  function readHash() {
    var h = location.hash.replace(/^#/, '');
    if (!h || h.indexOf('=') === -1) return;
    h.split('&').forEach(function (kv) {
      var i = kv.indexOf('='), k = kv.slice(0, i), v = decodeURIComponent(kv.slice(i + 1));
      if (k === 'q') q.value = v;
      else if (k === 'blocked' || k === 'drift') boxes(k).forEach(function (b) { b.checked = v === '1'; });
      else if (['stage', 'objective', 'area', 'milestone'].indexOf(k) !== -1) {
        var on = v.split(',');
        boxes(k).forEach(function (b) { b.checked = on.indexOf(b.value) !== -1; });
      }
    });
  }

  side.addEventListener('change', function () { apply(true); });
  q.addEventListener('input', function () { apply(true); });
  side.querySelectorAll('[data-all],[data-none]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var name = btn.dataset.all || btn.dataset.none;
      boxes(name).forEach(function (b) { b.checked = Boolean(btn.dataset.all); });
      apply(true);
    });
  });
  document.getElementById('tk-reset').addEventListener('click', function () {
    q.value = '';
    side.querySelectorAll('input[type="checkbox"]').forEach(function (b) { b.checked = b.defaultChecked; });
    apply(true);
  });
  document.getElementById('tk-expand').addEventListener('click', function () {
    objs.concat(reqs).forEach(function (d) { if (!d.hidden) d.open = true; });
  });
  document.getElementById('tk-collapse').addEventListener('click', function () {
    reqs.forEach(function (d) { d.open = false; });
  });
  readHash();
  apply(false);
  // On a phone the sidebar sits above the list, so the filters start folded
  // there — the search box and the totals stay in view — unless the URL
  // carries a filter, in which case what is filtering the list must be visible.
  var filters = document.getElementById('tk-filters');
  if (filters && window.matchMedia && window.matchMedia('(max-width: 52rem)').matches
      && !/(^|[#&])(stage|objective|area|milestone|blocked|drift)=/.test(location.hash)) {
    filters.open = false;
  }
  // A link straight to an objective (#obj-78) opens it and scrolls there.
  if (/^#obj-/.test(location.hash)) {
    var target = document.getElementById(location.hash.slice(1));
    if (target) { target.open = true; target.scrollIntoView(); }
  }
})();
`;
