#!/usr/bin/env node
// The audit page — _site/audit/index.html (requirement #92).
//
// The roadmap page's Audit fold is for clearing the queue: collapsed, dense, two
// clicks from a decision. This page is for reading it — every finding expanded
// with its evidence and proposed change, filterable by confidence, kind and repo,
// with the full rule reference underneath.
//
// Generated at deploy time from the committed ledger, exactly like the other
// pages, so it cannot drift from what the nightly audit actually found.
import fs from 'node:fs/promises';
import path from 'node:path';

import { esc, fmtET, age } from './lib/gh.mjs';
import { ROOT, HUB } from './lib/repos.mjs';
import { decisionUrl } from './lib/audit/render.mjs';

const NOW = new Date();
const OUT = path.join(ROOT, '_site', 'audit', 'index.html');

const readAudit = async (name) => {
  try {
    return JSON.parse(await fs.readFile(path.join(ROOT, 'site', 'audit', name), 'utf8'));
  } catch {
    return null;
  }
};
const ledger = await readAudit('findings.json');
const decisions = await readAudit('decisions.json');

const shortRepo = (r) => (r ?? '').split('/')[1] ?? r ?? '';

// A button carries finding ids and nothing else. The page turns them into a
// repository_dispatch — authenticated as @jwildfire from his own browser — and the
// lane re-derives what they mean from a fresh audit (#109). What runs is never
// what the page said should run.
const btn = (decision, ids, label) => {
  if (!ids.length) return '';
  return `<button class="audit-btn ${decision}" data-decision="${decision}"`
    + ` data-ids="${esc(ids.join(' '))}">${esc(label)}</button>`;
};

// ------------------------------------------------------------------- findings
function findingCard(f) {
  const subj = f.subject.number
    ? `<a href="${esc(f.subject.url)}">${esc(shortRepo(f.subject.repo))}#${f.subject.number}</a>`
    : `<a href="${esc(f.subject.url)}">${esc(f.subject.kind)}</a>`;
  const ops = f.proposal.ops?.length
    ? `<ul class="ap-ops">${f.proposal.ops.map((o) => `<li>${esc(o.label)}</li>`).join('')}</ul>`
    : '';
  const history = f.decisions?.length
    ? `<p class="ap-history">Earlier decisions: ${f.decisions.map((d) => `${esc(d.decision)}${d.outcome ? ` (${esc(d.outcome)})` : ''} on ${esc((d.at ?? '').slice(0, 10))}`).join(' · ')}</p>`
    : '';
  const flags = [
    f.reappeared ? '<span class="rm-pill warn" title="Applied before, and the audit reports it again">back again</span>' : '',
    f.muted ? `<span class="rm-pill" title="Rejected — muted until ${esc(f.mutedUntil ?? '')}">muted until ${esc(f.mutedUntil ?? '')}</span>` : '',
  ].join('');

  return `<article class="ap-card${f.muted ? ' muted' : ''}" data-conf="${esc(f.confidence)}" data-kind="${esc(f.proposal.kind)}"
  data-repo="${esc(f.subject.repo)}" data-muted="${f.muted ? 'yes' : 'no'}"
  data-text="${esc([f.id, f.ruleTitle, f.subject.title, ...f.evidence, f.proposal.summary].join(' ').toLowerCase())}">
  <header class="ap-card-head">
    <span class="audit-conf ${esc(f.confidence)}">${esc(f.confidence)}</span>
    <span class="ap-subject">${subj}</span>
    <span class="ap-title">${esc(f.subject.title || f.ruleTitle)}</span>
    <span class="ap-seen">${f.firstSeen === f.lastSeen ? 'first seen today' : `open since ${esc(f.firstSeen)}`}${f.runs > 1 ? ` · ${f.runs} runs` : ''}</span>
  </header>
  <p class="ap-evidence"><strong>Evidence</strong> ${f.evidence.map(esc).join(' · ')}</p>
  <p class="ap-proposal"><span class="rm-pill ${f.proposal.kind === 'agentic' ? 'ready' : 'ok'}">${esc(f.proposal.kind)}</span> ${esc(f.proposal.summary)}</p>
  ${ops}${history}
  <footer class="ap-actions">${flags}<code>${esc(f.id)}</code>${btn('accept', [f.id], 'accept')}${btn('reject', [f.id], 'reject')}</footer>
</article>`;
}

function ruleBlock(ruleMeta, findings) {
  const ids = findings.filter((f) => !f.muted).map((f) => f.id);
  const state = findings.length
    ? `<span class="status-pill development">${findings.length} finding${findings.length === 1 ? '' : 's'}</span>`
    : '<span class="status-pill released">quiet</span>';
  return `<section class="ap-rule" id="rule-${esc(ruleMeta.id)}" data-fired="${findings.length ? 'yes' : 'no'}">
  <h3><code>${esc(ruleMeta.id)}</code> ${esc(ruleMeta.title)} ${state}
    ${ids.length > 1 ? btn('accept', ids, `accept all ${ids.length}`) : ''}</h3>
  <p class="ap-why">${esc(ruleMeta.why)}</p>
  <p class="ap-fix"><strong>Fix</strong> ${esc(ruleMeta.fix)}</p>
  ${findings.map(findingCard).join('\n')}
</section>`;
}

// -------------------------------------------------------------- activity log
// The ledger is the record of every decision; rendering it here is what makes the
// audit page the one surface (#109) — decisions are made and read in one place.
const OUTCOME_CLASS = {
  applied: 'released', rejected: 'design', delegated: 'development',
  blocked: 'unstaged', failed: 'drift', stale: 'unstaged',
};

function activityLog(ledger) {
  const decisions = [...(ledger?.decisions ?? [])].reverse();
  if (!decisions.length) {
    return `<section class="ap-group" id="activity">
<h2>Activity</h2>
<p class="ap-empty">No decisions yet. Accepting or rejecting a finding records it here.</p>
</section>`;
  }
  // Group by the batch that carried it — one run, or one fallback decision issue.
  const batches = [];
  for (const d of decisions) {
    const key = d.runId ? `run-${d.runId}` : d.issue ? `issue-${d.issue}` : `at-${d.at}`;
    const last = batches[batches.length - 1];
    if (last?.key === key) last.items.push(d);
    else batches.push({ key, items: [d] });
  }

  const rows = batches.slice(0, 40).map((b) => {
    const first = b.items[0];
    const outcomes = new Map();
    for (const d of b.items) outcomes.set(d.outcome, (outcomes.get(d.outcome) ?? 0) + 1);
    const pills = [...outcomes.entries()]
      .map(([o, n]) => `<span class="status-pill ${OUTCOME_CLASS[o] ?? ''}">${n} ${esc(o)}</span>`).join(' ');
    const where = first.run
      ? `<a href="${esc(first.run)}">run</a>`
      : first.issue ? `<a href="https://github.com/${HUB}/issues/${first.issue}">#${first.issue}</a>` : '';
    const detail = b.items.map((d) => {
      const subj = d.subject?.url
        ? `<a href="${esc(d.subject.url)}">${esc(shortRepo(d.subject.repo))}#${d.subject.number}</a>`
        : `<code>${esc(d.id)}</code>`;
      return `<li><span class="status-pill ${OUTCOME_CLASS[d.outcome] ?? ''}">${esc(d.outcome)}</span> ${subj} — ${esc(d.ruleTitle ?? d.rule ?? d.id)}${
        d.detail ? ` <span class="ap-seen">${esc(d.detail)}</span>` : ''}</li>`;
    }).join('\n');
    return `<details class="ap-batch">
  <summary><span class="ap-when">${esc(fmtET(first.at))}</span> <strong>${esc(first.decision)}</strong>
    <span class="rm-count">${b.items.length}</span> ${pills} ${where}
    <span class="ap-seen">by @${esc(first.by ?? 'unknown')}</span></summary>
  <ul class="ap-batch-items">
${detail}
  </ul>
</details>`;
  }).join('\n');

  return `<section class="ap-group" id="activity">
<h2>Activity <span class="rm-count">${decisions.length}</span></h2>
<p class="rm-note">Every accept and reject, newest first, from <a href="decisions.json">decisions.json</a> — the same ledger the audit reads to mute rejected findings. A rejection is recorded but changes nothing on GitHub.</p>
${rows}
</section>`;
}

// ---------------------------------------------------------------------- page
const findings = ledger?.findings ?? [];
const rules = ledger?.rules ?? [];
const live = findings.filter((f) => !f.muted);
const byRule = new Map();
for (const f of findings) {
  if (!byRule.has(f.rule)) byRule.set(f.rule, []);
  byRule.get(f.rule).push(f);
}
const repos = [...new Set(findings.map((f) => f.subject.repo))].sort();
const groups = ['Board integrity', 'Hierarchy', 'Linkage', 'Conventions'];

const tile = (n, label, cls = '') => `<div class="ap-tile ${cls}"><span class="ap-n">${n}</span><span class="ap-l">${esc(label)}</span></div>`;

const stats = ledger
  ? [
    tile(live.length, 'open findings'),
    tile(ledger.counts.high, 'high', 'high'),
    tile(ledger.counts.medium, 'medium', 'medium'),
    tile(ledger.counts.low, 'low', 'low'),
    tile(ledger.counts.mechanical, 'mechanical'),
    tile(ledger.counts.agentic, 'need judgment'),
    tile(`${rules.filter((r) => r.fired).length}/${rules.length}`, 'rules firing'),
  ].join('')
  : '';

const chip = (group, value, label, current = false) =>
  `<button class="rm-chip-btn${current ? ' current' : ''}" data-group="${group}" data-value="${esc(value)}" aria-pressed="${current}">${esc(label)}</button>`;

const body = ledger
  ? `<div class="ap-tiles">${stats}</div>

<div class="ap-bar">
  <span class="ap-filter" data-group="conf">${['all', 'high', 'medium', 'low'].map((v) => chip('conf', v, v, v === 'all')).join('')}</span>
  <span class="ap-filter" data-group="kind">${['all', 'mechanical', 'agentic'].map((v) => chip('kind', v, v === 'agentic' ? 'needs judgment' : v, v === 'all')).join('')}</span>
  <span class="ap-filter" data-group="repo">${['all', ...repos].map((v) => chip('repo', v, v === 'all' ? 'all repos' : shortRepo(v), v === 'all')).join('')}</span>
  <label class="ap-search"><input type="search" id="ap-q" placeholder="filter text…" aria-label="Filter findings by text"></label>
  <label class="ap-toggle"><input type="checkbox" id="ap-muted"> show muted</label>
  <span class="ap-shown" id="ap-shown"></span>
  <span class="ap-conn" id="ap-conn"></span>
</div>

<div class="ap-run" id="ap-run" hidden></div>

<dialog id="ap-connect" class="audit-log">
  <form method="dialog"><button class="audit-close" aria-label="Close">&times;</button></form>
  <h2>Connect this browser</h2>
  <p class="meta">Applying a finding means writing to GitHub, so the page needs a token of yours. It is stored in this browser's <code>localStorage</code> and sent only to <code>api.github.com</code> — never to any other host, and never into the repository.</p>
  <ol>
    <li>Create a <a href="https://github.com/settings/personal-access-tokens/new" target="_blank" rel="noopener">fine-grained token</a> scoped to <strong>only</strong> <code>jwildfire/obot.roadmap</code>, with <strong>Contents: read and write</strong> (that is what <code>repository_dispatch</code> requires). Nothing else.</li>
    <li>Paste it below. A short expiry is fine — reconnecting is this dialog again.</li>
  </ol>
  <p><input type="password" id="ap-token" placeholder="github_pat_…" autocomplete="off" spellcheck="false"></p>
  <p><button class="audit-btn accept" id="ap-save">connect</button>
     <button class="audit-btn reject" id="ap-forget">forget this token</button></p>
  <p class="meta" id="ap-connect-msg"></p>
  <p class="meta">Prefer not to hold a token in a browser? Every finding can also be applied by <a href="${esc(decisionUrl('accept', ['RULE-ID:owner/repo#123']))}" target="_blank" rel="noopener">filing a decision issue</a> (edit the ids in the body) — the same lane handles both.</p>
</dialog>

${groups.map((group) => {
    const groupRules = rules.filter((r) => (byRule.get(r.id)?.[0]?.group ?? r.group) === group);
    if (!groupRules.length) return '';
    const withFindings = groupRules.filter((r) => (byRule.get(r.id) ?? []).length);
    const quiet = groupRules.filter((r) => !(byRule.get(r.id) ?? []).length);
    return `<section class="ap-group">
<h2>${esc(group)} <span class="rm-count">${withFindings.reduce((n, r) => n + (byRule.get(r.id) ?? []).length, 0)}</span></h2>
${withFindings.map((r) => ruleBlock(r, byRule.get(r.id) ?? [])).join('\n')}
${quiet.length ? `<details class="rm-fold"><summary>Quiet in this group (${quiet.length}) — checked, nothing found</summary>
${quiet.map((r) => ruleBlock(r, [])).join('\n')}
</details>` : ''}
</section>`;
  }).join('\n')}

${activityLog(decisions)}

<section class="ap-group">
<h2>Rule reference <span class="rm-count">${rules.length}</span></h2>
<p class="rm-note">Every rule the audit knows, and how it fared on the last run. A rule that could not run says so — an empty findings list and a broken registry must never look alike.</p>
<table class="rm-table">
<tr><th>Rule</th><th>Group</th><th>State</th><th>Checks</th></tr>
${rules.map((r) => `<tr>
  <td><a href="#rule-${esc(r.id)}"><code>${esc(r.id)}</code></a></td>
  <td>${esc(r.group)}</td>
  <td>${r.error ? `<span class="status-pill drift" title="${esc(r.error)}">failed</span>`
    : r.skipped ? `<span class="status-pill unstaged" title="${esc(r.skipped)}">skipped</span>`
      : r.fired ? `<span class="status-pill development">${r.fired}</span>`
        : '<span class="status-pill released">quiet</span>'}</td>
  <td>${esc(r.title)}</td>
</tr>`).join('\n')}
</table>
</section>`
  : '<p class="rm-notice">No audit has run yet — <code>site/audit/findings.json</code> is missing.</p>';

const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Roadmap audit · obot</title>
<link rel="stylesheet" href="../assets/styles.css">
<style>
/* Page-specific: the shared sheet styles the theme, this styles the reading view. */
body.wide { max-width: 68rem; }
.ap-tiles { display: flex; flex-wrap: wrap; gap: .5rem; margin: .8rem 0 1rem; }
.ap-tile { border: 1px solid var(--rule); border-radius: .4rem; background: var(--card);
  padding: .45rem .8rem; min-width: 6.5rem; }
.ap-tile .ap-n { display: block; font: 400 1.5rem/1.1 var(--serif); }
.ap-tile .ap-l { font: 500 .68rem/1.4 var(--mono); color: var(--muted); text-transform: uppercase; letter-spacing: .04em; }
.ap-tile.high { border-color: #fecaca; background: #fef2f2; }
.ap-tile.medium { border-color: #fde68a; background: #fffbeb; }
.ap-tile.low { background: var(--panel); }

.ap-bar { position: sticky; top: 0; z-index: 5; display: flex; flex-wrap: wrap; gap: .4rem .8rem;
  align-items: center; padding: .5rem 0; margin-bottom: .6rem;
  background: var(--paper); border-bottom: 1px solid var(--rule); }
.ap-filter { display: flex; gap: .2rem; }
.ap-search input, .ap-toggle { font: 400 .74rem/1.5 var(--mono); color: var(--muted); }
.ap-search input { border: 1px solid var(--rule); border-radius: 999px; padding: .12rem .7rem;
  background: var(--panel); min-width: 11rem; }
.ap-toggle { display: inline-flex; align-items: center; gap: .3rem; }
.ap-shown { margin-left: auto; font: 500 .72rem/1.5 var(--mono); color: var(--faint); }

.ap-group { margin: 1.6rem 0 0; }
.ap-group > h2 { font-size: 1.2rem; margin: 0 0 .2rem; border-bottom: 2px solid var(--accent-bright);
  padding-bottom: .2rem; }
.ap-rule { margin: 1rem 0 0; }
.ap-rule h3 { font-size: .95rem; margin: 0 0 .2rem; display: flex; flex-wrap: wrap; align-items: baseline; gap: .4rem; }
.ap-rule h3 code { font-size: .8rem; }
.ap-why, .ap-fix { margin: .1rem 0; font-size: .82rem; color: var(--muted); max-width: 58rem; }
.ap-fix strong, .ap-evidence strong { font: 600 .66rem/1.5 var(--mono); text-transform: uppercase;
  letter-spacing: .04em; color: var(--faint); margin-right: .3rem; }

.ap-card { border: 1px solid var(--rule); border-left: 3px solid var(--accent-bright);
  border-radius: .3rem; background: var(--card); padding: .45rem .7rem .5rem; margin: .45rem 0; }
.ap-card.muted { opacity: .6; border-left-color: var(--faint); }
.ap-card[hidden] { display: none; }
.ap-card-head { display: flex; flex-wrap: wrap; align-items: baseline; gap: .4rem; }
.ap-subject { font-family: var(--mono); font-size: .78rem; }
.ap-subject a { text-decoration: none; font-weight: 600; }
.ap-title { flex: 1 1 14rem; min-width: 0; font-size: .88rem; }
.ap-seen, .ap-history { font-family: var(--mono); font-size: .7rem; color: var(--faint); }
.ap-evidence { margin: .25rem 0 0; font-size: .78rem; color: var(--muted); }
.ap-proposal { margin: .2rem 0 0; font-size: .84rem; }
.ap-ops { margin: .2rem 0 0; padding-left: 1.1rem; font-family: var(--mono); font-size: .72rem; color: var(--accent); }
.ap-actions { display: flex; flex-wrap: wrap; align-items: center; gap: .4rem; margin-top: .35rem; }
.ap-actions code { font-size: .68rem; color: var(--faint); background: none; padding: 0; margin-right: auto; }
.ap-empty { font-size: .82rem; color: var(--faint); }
.ap-card.settled { opacity: .45; }
.ap-card.settled .audit-btn { display: none; }

/* The run panel is the only part of this page that moves, so it is the only part
   that gets to be loud. It sits under the sticky bar and reports one thing: what
   the pipeline is doing with the decision just made. */
.ap-run { position: sticky; top: 3.4rem; z-index: 4; margin: .3rem 0 .7rem;
  padding: .45rem .8rem; border-radius: .3rem; font-size: .84rem;
  border: 1px solid var(--rule); background: var(--card); }
.ap-run.working { border-color: var(--accent-bright); background: #fff7ed; }
.ap-run.done { border-color: #bbf7d0; background: #f0fdf4; }
.ap-run.warn { border-color: #fde68a; background: #fffbeb; }
.ap-run .ap-seen { display: inline-block; margin-top: .2rem; }
.ap-spin { color: var(--accent-bright); animation: ap-pulse 1.1s ease-in-out infinite; }
@keyframes ap-pulse { 0%, 100% { opacity: 1; } 50% { opacity: .25; } }
@media (prefers-reduced-motion: reduce) { .ap-spin { animation: none; } }
.audit-btn { cursor: pointer; font-family: var(--mono); }
.ap-conn { display: inline-flex; }

details.ap-batch { border-bottom: 1px solid var(--rule); padding: .3rem 0; }
details.ap-batch > summary { cursor: pointer; display: flex; flex-wrap: wrap; align-items: baseline;
  gap: .4rem; font-size: .82rem; }
details.ap-batch > summary:hover { color: var(--accent); }
.ap-when { font-family: var(--mono); font-size: .74rem; color: var(--muted); }
.ap-batch-items { margin: .3rem 0 .2rem; padding-left: 1.1rem; font-size: .8rem; }
.ap-batch-items li { margin: .12rem 0; }
@media (max-width: 40rem) { .ap-shown { margin-left: 0; } }
</style>
</head>
<body class="wide">
<header class="site">
  <a class="brand" href="../index.html">🍊😺 obot</a>
  <nav class="site">
    <a href="../index.html">Home</a>
    <a href="../roadmap.html">Roadmap</a>
    <a href="index.html" class="current" aria-current="page">Audit</a>
    <a href="../status.html">Status</a>
    <a href="../news.html">News</a>
    <a href="https://github.com/${HUB}/issues/92" aria-label="Requirement #92" title="Requirement #92">#92</a>
  </nav>
</header>

<h1>Roadmap audit</h1>
<p class="tagline">What the roadmap says about itself, checked against the conventions it is supposed to follow. ${
  ledger ? `Last run ${esc(fmtET(ledger.generatedAt))} — ${esc(age(ledger.generatedAt, NOW))} ago.` : ''
}</p>

<p>Every finding below is a fact about GitHub state, produced by a deterministic rule rather than a model: the same state yields the same findings. <strong>Accept</strong> triggers the <a href="https://github.com/${HUB}/blob/main/.github/workflows/roadmap-audit-apply.yml">apply lane</a> from this page and reports the run above — the lane re-validates the finding against a fresh audit, then applies it, using a listed operation for a mechanical fix and a bounded agent for a judgment call. <strong>Reject</strong> changes nothing and mutes the finding for 60 days, or until its evidence changes. Every decision lands in the <a href="#activity">Activity log</a>. Nothing is applied without an explicit accept.</p>

<p class="rm-note">Confidence: <strong>high</strong> — deterministic detection and an unambiguous fix · <strong>medium</strong> — detection is solid, the fix is a judgment call the proposal states outright · <strong>low</strong> — heuristic detection, or an open convention question. Machine-readable: <a href="findings.json">findings.json</a> · <a href="decisions.json">decisions.json</a>.</p>

${body}

<script>
(function () {
  var state = { conf: 'all', kind: 'all', repo: 'all', q: '', muted: false };
  var cards = Array.prototype.slice.call(document.querySelectorAll('.ap-card'));
  var shown = document.getElementById('ap-shown');

  function apply() {
    var n = 0;
    cards.forEach(function (c) {
      var ok = (state.conf === 'all' || c.dataset.conf === state.conf)
        && (state.kind === 'all' || c.dataset.kind === state.kind)
        && (state.repo === 'all' || c.dataset.repo === state.repo)
        && (state.muted || c.dataset.muted === 'no')
        && (!state.q || c.dataset.text.indexOf(state.q) !== -1);
      c.hidden = !ok;
      if (ok) n++;
    });
    // A rule with nothing left to show should not strand its heading.
    document.querySelectorAll('.ap-rule').forEach(function (r) {
      if (r.dataset.fired !== 'yes') return;
      var own = r.querySelectorAll('.ap-card');
      r.hidden = !Array.prototype.some.call(own, function (c) { return !c.hidden; });
    });
    document.querySelectorAll('.ap-group').forEach(function (g) {
      var rules = g.querySelectorAll('.ap-rule[data-fired="yes"]');
      if (!rules.length) return;
      g.hidden = !Array.prototype.some.call(rules, function (r) { return !r.hidden; });
    });
    shown.textContent = n + ' of ' + cards.length + ' findings';
  }

  document.querySelectorAll('.rm-chip-btn').forEach(function (b) {
    b.addEventListener('click', function () {
      var group = b.dataset.group;
      state[group] = b.dataset.value;
      document.querySelectorAll('.rm-chip-btn[data-group="' + group + '"]').forEach(function (o) {
        var on = o === b;
        o.classList.toggle('current', on);
        o.setAttribute('aria-pressed', on ? 'true' : 'false');
      });
      apply();
    });
  });
  var q = document.getElementById('ap-q');
  if (q) q.addEventListener('input', function () { state.q = q.value.trim().toLowerCase(); apply(); });
  var m = document.getElementById('ap-muted');
  if (m) m.addEventListener('change', function () { state.muted = m.checked; apply(); });
  apply();

  // ---------------------------------------------------------------- the loop
  // Click → repository_dispatch → poll the run → report here (#109). The token is
  // @jwildfire's own, kept in this browser only; the dispatch carries finding ids
  // and nothing else, and the lane re-validates every one of them against a fresh
  // audit before it changes anything. A page cannot be trusted, and is not.
  var REPO = 'jwildfire/obot.roadmap';
  var WORKFLOW = 'roadmap-audit-apply.yml';
  var KEY = 'obot-audit-token';
  var runPanel = document.getElementById('ap-run');
  var connSlot = document.getElementById('ap-conn');
  var dialog = document.getElementById('ap-connect');
  var busy = false;

  function token() { try { return localStorage.getItem(KEY) || ''; } catch (e) { return ''; } }

  function paintConnection() {
    var has = Boolean(token());
    connSlot.innerHTML = '';
    var b = document.createElement('button');
    b.className = 'rm-chip-btn' + (has ? ' current' : '');
    b.textContent = has ? 'connected' : 'connect to apply';
    b.title = has
      ? 'This browser holds a token that can apply findings. Click to replace or forget it.'
      : 'Findings are read-only until this browser is connected.';
    b.addEventListener('click', function () { dialog.showModal(); });
    connSlot.appendChild(b);
  }

  function gh(path, options) {
    var o = options || {};
    o.headers = Object.assign({
      Accept: 'application/vnd.github+json',
      Authorization: 'Bearer ' + token(),
      'X-GitHub-Api-Version': '2022-11-28',
    }, o.headers || {});
    return fetch('https://api.github.com' + path, o);
  }

  function say(html, cls) {
    runPanel.hidden = false;
    runPanel.className = 'ap-run' + (cls ? ' ' + cls : '');
    runPanel.innerHTML = html;
  }

  // The run is found by looking for a dispatch run created after the click; the
  // dispatch API returns 204 with no run id of its own.
  function findRun(since, tries) {
    return gh('/repos/' + REPO + '/actions/workflows/' + WORKFLOW + '/runs?event=repository_dispatch&per_page=5')
      .then(function (r) { return r.ok ? r.json() : { workflow_runs: [] }; })
      .then(function (data) {
        var run = (data.workflow_runs || []).filter(function (w) {
          return new Date(w.created_at).getTime() >= since - 60000;
        })[0];
        if (run) return run;
        if (tries <= 0) return null;
        return new Promise(function (res) { setTimeout(res, 3000); }).then(function () {
          return findRun(since, tries - 1);
        });
      });
  }

  function watchRun(run, label) {
    return gh('/repos/' + REPO + '/actions/runs/' + run.id)
      .then(function (r) { return r.json(); })
      .then(function (w) {
        if (w.status !== 'completed') {
          say('<span class="ap-spin">●</span> ' + label + ' — <strong>' + w.status.replace('_', ' ')
            + '</strong> · <a href="' + w.html_url + '" target="_blank" rel="noopener">run log</a>', 'working');
          return new Promise(function (res) { setTimeout(res, 5000); }).then(function () { return watchRun(w, label); });
        }
        return w;
      });
  }

  // What actually landed comes from the ledger the lane commits, not from the
  // page's assumption — read through the API, since the CDN caches raw files.
  function outcomes(runId) {
    return gh('/repos/' + REPO + '/contents/site/audit/decisions.json?ref=main', {
      headers: { Accept: 'application/vnd.github.raw' },
    }).then(function (r) { return r.ok ? r.json() : null; }).then(function (led) {
      if (!led) return null;
      var mine = (led.decisions || []).filter(function (d) { return String(d.runId) === String(runId); });
      if (!mine.length) return null;
      var byOutcome = {};
      mine.forEach(function (d) { byOutcome[d.outcome] = (byOutcome[d.outcome] || 0) + 1; });
      return byOutcome;
    });
  }

  function summarize(byOutcome) {
    return Object.keys(byOutcome).map(function (k) { return byOutcome[k] + ' ' + k; }).join(' · ');
  }

  function send(decision, ids, label) {
    if (busy) return;
    if (!token()) { dialog.showModal(); return; }
    busy = true;
    var started = Date.now();
    say('<span class="ap-spin">●</span> sending ' + ids.length + ' finding' + (ids.length === 1 ? '' : 's') + '…', 'working');
    gh('/repos/' + REPO + '/dispatches', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event_type: 'audit-decision', client_payload: { decision: decision, findings: ids } }),
    }).then(function (res) {
      if (res.status === 401 || res.status === 403) {
        throw new Error('GitHub rejected the token (' + res.status + '). It may be expired, or missing Contents: read and write on this repository.');
      }
      if (res.status !== 204) {
        return res.text().then(function (t) { throw new Error('dispatch failed (' + res.status + ') ' + t.slice(0, 200)); });
      }
      say('<span class="ap-spin">●</span> ' + label + ' — waiting for the lane to pick it up…', 'working');
      return findRun(started, 12);
    }).then(function (run) {
      if (!run) {
        say('Dispatched, but no run appeared within a minute. Check <a href="https://github.com/' + REPO
          + '/actions/workflows/' + WORKFLOW + '" target="_blank" rel="noopener">the workflow</a> — the decision was sent, so nothing is lost.', 'warn');
        return null;
      }
      return watchRun(run, label);
    }).then(function (done) {
      if (!done) return;
      return outcomes(done.id).then(function (byOutcome) {
        var ok = done.conclusion === 'success';
        var detail = byOutcome ? summarize(byOutcome) : (ok ? 'completed' : 'see the run log');
        say((ok ? '✓ ' : '⚠ ') + label + ' — <strong>' + detail + '</strong> · <a href="' + done.html_url
          + '" target="_blank" rel="noopener">run log</a>'
          + '<br><span class="ap-seen">Recorded in the Activity log below on the next deploy (a minute or two). '
          + 'Findings already applied are dropped from this page then too.</span>',
        ok ? 'done' : 'warn');
        if (ok && byOutcome && byOutcome.applied) {
          // Mark what landed immediately, rather than making him reload to believe it.
          ids.forEach(function (id) {
            var card = Array.prototype.filter.call(cards, function (c) {
              return c.querySelector('.ap-actions code') && c.querySelector('.ap-actions code').textContent === id;
            })[0];
            if (card) { card.classList.add('settled'); card.dataset.muted = 'yes'; }
          });
          apply();
        }
      });
    }).catch(function (err) {
      say('⚠ ' + String(err.message || err), 'warn');
    }).then(function () { busy = false; });
  }

  document.querySelectorAll('.audit-btn[data-ids]').forEach(function (b) {
    b.addEventListener('click', function () {
      var ids = b.dataset.ids.split(' ').filter(Boolean);
      send(b.dataset.decision, ids, b.dataset.decision + ' ' + ids.length + ' finding' + (ids.length === 1 ? '' : 's'));
    });
  });

  document.getElementById('ap-save').addEventListener('click', function (e) {
    e.preventDefault();
    var input = document.getElementById('ap-token');
    var msg = document.getElementById('ap-connect-msg');
    var value = input.value.trim();
    if (!value) { msg.textContent = 'Paste a token first.'; return; }
    msg.textContent = 'checking…';
    // Verified before it is stored, so a bad paste fails here rather than on the
    // first thing he tries to apply.
    fetch('https://api.github.com/repos/' + REPO, {
      headers: { Authorization: 'Bearer ' + value, Accept: 'application/vnd.github+json' },
    }).then(function (r) {
      if (!r.ok) throw new Error('GitHub rejected it (' + r.status + ')');
      try { localStorage.setItem(KEY, value); } catch (err) { throw new Error('this browser refused to store it'); }
      input.value = '';
      msg.textContent = 'Connected. Accept and reject are live.';
      paintConnection();
      setTimeout(function () { dialog.close(); }, 900);
    }).catch(function (err) { msg.textContent = String(err.message || err); });
  });

  document.getElementById('ap-forget').addEventListener('click', function (e) {
    e.preventDefault();
    try { localStorage.removeItem(KEY); } catch (err) { /* nothing to forget */ }
    document.getElementById('ap-connect-msg').textContent = 'Token forgotten. The page is read-only again.';
    paintConnection();
  });

  paintConnection();
})();
</script>

<footer class="site">Generated ${fmtET(NOW)} by <a href="https://github.com/${HUB}/blob/main/scripts/build_audit_page.mjs"><code>build_audit_page.mjs</code></a>
from the ledger the nightly <a href="https://github.com/${HUB}/blob/main/.github/workflows/roadmap-audit.yml">audit</a> commits ·
requirement <a href="https://github.com/${HUB}/issues/92">#92</a> ·
rules in <a href="https://github.com/${HUB}/blob/main/scripts/lib/audit/rules.mjs"><code>rules.mjs</code></a></footer>
</body>
</html>
`;

await fs.mkdir(path.dirname(OUT), { recursive: true });
await fs.writeFile(OUT, html);
console.log(`audit page: ${live.length} live findings across ${byRule.size} firing rules → _site/audit/index.html`);
