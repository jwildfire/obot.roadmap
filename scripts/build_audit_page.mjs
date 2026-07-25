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
import { siteHeader } from './lib/nav.mjs';

const NOW = new Date();
const OUT = path.join(ROOT, '_site', 'audit', 'index.html');

const ledger = await (async () => {
  try {
    return JSON.parse(await fs.readFile(path.join(ROOT, 'site', 'audit', 'findings.json'), 'utf8'));
  } catch {
    return null;
  }
})();

const shortRepo = (r) => (r ?? '').split('/')[1] ?? r ?? '';

const btn = (decision, ids, label) => {
  if (!ids.length) return '';
  return `<a class="audit-btn ${decision}" href="${esc(decisionUrl(decision, ids))}" target="_blank" rel="noopener">${esc(label)}</a>`;
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
</div>

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
@media (max-width: 40rem) { .ap-shown { margin-left: 0; } }
</style>
</head>
<body class="wide">
${siteHeader({ page: 'audit', depth: 1 })}

<h1>Roadmap audit</h1>
<p class="tagline">What the roadmap says about itself, checked against the conventions it is supposed to follow. ${
  ledger ? `Last run ${esc(fmtET(ledger.generatedAt))} — ${esc(age(ledger.generatedAt, NOW))} ago.` : ''
}</p>

<p>Every finding below is a fact about GitHub state, produced by a deterministic rule rather than a model: the same state yields the same findings. <strong>Accept</strong> opens a prefilled decision issue; the <a href="https://github.com/${HUB}/blob/main/.github/workflows/roadmap-audit-apply.yml">apply lane</a> re-validates the finding against a fresh audit, then applies it — a listed operation for a mechanical fix, a bounded agent for a judgment call. <strong>Reject</strong> changes nothing and mutes the finding for 60 days, or until its evidence changes. Nothing is applied without an explicit accept.</p>

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
