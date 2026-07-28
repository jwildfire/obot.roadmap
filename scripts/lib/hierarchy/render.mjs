// The Hierarchy section of the roadmap page: the goal → requirement → task
// forest as an expandable tree, rendered twice — Current (exactly the sub-issue
// links GitHub records today, orphans separate) and Proposed (the same tree
// with scripts/roadmap-proposal.json's links applied, each addition badged).
// The Proposed view is a review surface: nothing in it changes GitHub until
// @jwildfire approves and obot applies the links, at which point an applied
// edge stops being a diff because the live tree already contains it.
import { esc } from '../gh.mjs';
import { HUB } from '../repos.mjs';

const shortRepo = (key) => key.split('/')[1].split('#')[0];
const stageClass = (stage) => stage.toLowerCase().replace(/ /g, '-');
const cleanTitle = (t) => t.replace(/^(Requirement|Goal):\s*/i, '');
const issueRef = (key) => `${shortRepo(key)}#${key.split('#')[1]}`;
const issueUrl = (key) => {
  const [repo, n] = key.split('#');
  return `https://github.com/${repo}/issues/${n}`;
};

// One tree per view: effective parent = the recorded link, else (proposed view
// only) the proposal's edge. A recorded link always wins, so an applied
// proposal entry degrades to a no-op instead of double-parenting.
function buildForest(issues, extraEdges) {
  const parentOf = new Map();
  for (const issue of issues.values()) {
    const proposed = extraEdges.get(issue.key);
    if (issue.parentKey && issues.has(issue.parentKey)) {
      parentOf.set(issue.key, { parent: issue.parentKey, proposed: false });
    } else if (proposed && issues.has(proposed)) {
      parentOf.set(issue.key, { parent: proposed, proposed: true });
    }
  }
  const children = new Map();
  for (const [child, { parent }] of parentOf) {
    if (!children.has(parent)) children.set(parent, []);
    children.get(parent).push(child);
  }
  for (const list of children.values()) {
    list.sort((a, b) => {
      const ah = a.startsWith(HUB), bh = b.startsWith(HUB);
      if (ah !== bh) return ah ? -1 : 1; // hub requirements before repo tasks
      return Number(a.split('#')[1]) - Number(b.split('#')[1]);
    });
  }

  const goals = [...issues.values()].filter((i) => i.repo === HUB && i.labels.includes('goal'))
    .sort((a, b) => a.number - b.number);

  const reachable = new Set();
  const queue = goals.map((g) => g.key);
  while (queue.length) {
    const key = queue.shift();
    if (reachable.has(key)) continue;
    reachable.add(key);
    queue.push(...(children.get(key) ?? []));
  }

  // Orphan roots: not reachable from any goal and with no parent inside the
  // forest. A dangling parentKey (closed parent, or a repo the portfolio list
  // does not track) also lands here, annotated, instead of vanishing.
  const orphanRoots = [...issues.values()]
    .filter((i) => !reachable.has(i.key) && !parentOf.has(i.key) && !(i.repo === HUB && i.labels.includes('goal')))
    .sort((a, b) => (a.repo === b.repo ? a.number - b.number : a.repo === HUB ? -1 : b.repo === HUB ? 1 : a.repo.localeCompare(b.repo)));

  return { goals, children, parentOf, reachable, orphanRoots };
}

function nodeLine(issue, { stages, proposedWhy, danglingParent }) {
  const bits = [];
  if (issue.repo !== HUB) bits.push(`<span class="rm-chip">${esc(shortRepo(issue.key))}</span>`);
  bits.push(`<a href="${issue.url}" class="hy-key">#${issue.number}</a>`);
  bits.push(`<span class="hy-title">${esc(cleanTitle(issue.title))}</span>`);
  const stage = stages.get(issue.key);
  if (stage) bits.push(`<span class="status-pill ${stageClass(stage)}">${esc(stage)}</span>`);
  for (const l of issue.labels) {
    if (l === 'auto') bits.push('<span class="rm-pill ok">auto</span>');
    if (l === 'draft') bits.push('<span class="rm-pill draft">draft</span>');
  }
  if (issue.subs.total) bits.push(`<span class="hy-progress" title="closed sub-issues">${issue.subs.completed}/${issue.subs.total} done</span>`);
  if (danglingParent) bits.push(`<span class="rm-pill warn" title="its recorded parent is closed or in a repo the portfolio list does not track">parent ${esc(issueRef(danglingParent))} not open here</span>`);
  if (proposedWhy !== undefined) bits.push(`<span class="rm-pill ready" title="${esc(proposedWhy)}">proposed</span> <small class="hy-why">${esc(proposedWhy)}</small>`);
  return bits.join(' ');
}

function renderNode(key, forest, issues, opts, depth, seen) {
  if (seen.has(key)) return ''; // cycle guard — GitHub prevents these, belt and braces
  seen.add(key);
  const issue = issues.get(key);
  const kids = forest.children.get(key) ?? [];
  const edge = forest.parentOf.get(key);
  const line = nodeLine(issue, {
    stages: opts.stages,
    proposedWhy: edge?.proposed ? opts.whyOf.get(key) ?? '' : undefined,
    danglingParent: !edge && issue.parentKey && !issues.has(issue.parentKey) ? issue.parentKey : null,
  });
  const cls = `hy-node${edge?.proposed ? ' hy-proposed' : ''}`;
  if (!kids.length) return `<li class="${cls}"><span class="hy-leaf">${line}</span></li>`;
  const open = depth === 0 || (opts.openOrphans && depth === -1) ? ' open' : '';
  return `<li class="${cls}"><details${open}><summary>${line}</summary>
<ul class="hy-tree">
${kids.map((k) => renderNode(k, forest, issues, opts, depth + 1, seen)).join('\n')}
</ul>
</details></li>`;
}

function renderView(viewKey, forest, issues, opts) {
  const openCount = issues.size;
  const goalKeys = new Set(forest.goals.map((g) => g.key));
  const inTree = [...forest.reachable].filter((k) => !goalKeys.has(k)).length;
  const orphanCount = openCount - forest.goals.length - inTree;
  const seen = new Set();

  const goalsHtml = forest.goals.map((g) => renderNode(g.key, forest, issues, opts, 0, seen)).join('\n');
  const orphansHtml = forest.orphanRoots.map((o) => renderNode(o.key, forest, issues, { ...opts, openOrphans: true }, -1, seen)).join('\n');

  // Proposed ships hidden so the pre-script (and script-less) render shows one
  // tree, not two; the toggle script flips visibility from there.
  return `<div class="hy-view" data-hyview="${viewKey}"${viewKey === 'proposed' ? ' hidden' : ''}>
<p class="hy-coverage"><strong>${inTree}</strong> of ${openCount - forest.goals.length} open issues reachable from a goal · <strong>${orphanCount}</strong> orphaned</p>
<ul class="hy-tree hy-root">
${goalsHtml}
</ul>
<h3 class="hy-orphans-head">Orphans <span class="rm-count">${orphanCount}</span></h3>
<p class="rm-note">Open issues no goal can reach — no sub-issue path connects them to a <code>goal</code>-labeled issue.</p>
<ul class="hy-tree hy-root">
${orphansHtml || '<li class="hy-node"><span class="hy-leaf rm-none">None — every open issue is reachable from a goal.</span></li>'}
</ul>
${opts.flagsHtml ?? ''}
</div>`;
}

export function hierarchySection(hierRes, { requirements, proposal }) {
  if (!hierRes.ok) {
    return `<section class="rm-sec" id="sec-hierarchy"><h2>Hierarchy</h2><p class="rm-notice">${esc(hierRes.notice)}</p></section>`;
  }
  const { issues, truncated } = hierRes.value;

  // Stage pills come from the requirements collector (board Status et al.) so
  // the tree agrees with the Requirements table above it.
  const stages = new Map(requirements.filter((r) => r.state === 'OPEN').map((r) => [`${HUB}#${r.number}`, r.stage]));

  const extraEdges = new Map((proposal.links ?? []).map((l) => [l.child, l.parent]));
  const whyOf = new Map((proposal.links ?? []).map((l) => [l.child, l.why ?? '']));

  const current = buildForest(issues, new Map());
  const proposed = buildForest(issues, extraEdges);

  const flagsHtml = (proposal.flags ?? []).length ? `<h3 class="hy-orphans-head">Cleanup flags <span class="rm-count">${proposal.flags.length}</span></h3>
<p class="rm-note">Calls that are not links — closes, restagings, and structure decisions proposed alongside the tree.</p>
<ul class="hy-flags">
${proposal.flags.map((f) => `<li>${(f.items ?? []).map((k) => `<a href="${issueUrl(k)}">${esc(issueRef(k))}</a>`).join(', ')} — ${esc(f.note ?? '')}</li>`).join('\n')}
</ul>` : '';

  const truncNote = truncated.length ? ` <strong>Note:</strong> ${esc(truncated.join(', '))} ha${truncated.length > 1 ? 've' : 's'} more than 100 open issues — the tree is truncated there.` : '';

  return `<section class="rm-sec" id="sec-hierarchy">
<h2>Hierarchy</h2>
<p class="rm-note">The goal → requirement → task forest from live sub-issue links, orphans separate.
<strong>Current</strong> is what GitHub records today; <strong>Proposed</strong> adds the links in
<a href="https://github.com/${HUB}/blob/main/scripts/roadmap-proposal.json"><code>roadmap-proposal.json</code></a>
(badged, with the reasoning) — on approval obot applies them as real sub-issue links and the views converge.${truncNote}</p>
<div class="hy-bar" role="group" aria-label="Hierarchy view">
<button class="hy-btn current" data-hyview="current" aria-pressed="true">Current</button>
<button class="hy-btn" data-hyview="proposed" aria-pressed="false">Proposed</button>
</div>
${renderView('current', current, issues, { stages, whyOf })}
${renderView('proposed', proposed, issues, { stages, whyOf, flagsHtml })}
<script>
(function () {
  var sec = document.getElementById('sec-hierarchy');
  var btns = Array.prototype.slice.call(sec.querySelectorAll('.hy-btn'));
  function set(v, fromClick) {
    sec.querySelectorAll('.hy-view').forEach(function (d) { d.hidden = d.dataset.hyview !== v; });
    btns.forEach(function (b) {
      var on = b.dataset.hyview === v;
      b.classList.toggle('current', on);
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
    if (fromClick && window.history && window.history.replaceState) {
      if (v === 'proposed') window.history.replaceState(null, '', '#hierarchy-proposed');
      else if (location.hash === '#hierarchy-proposed') window.history.replaceState(null, '', location.pathname + location.search);
    }
  }
  btns.forEach(function (b) { b.addEventListener('click', function () { set(b.dataset.hyview, true); }); });
  set(location.hash === '#hierarchy-proposed' ? 'proposed' : 'current', false);
})();
</script>
</section>`;
}
