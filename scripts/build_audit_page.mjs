#!/usr/bin/env node
// The audit page — _site/audit/index.html (requirements #92 and #109).
//
// This is where the roadmap's findings are decided. The shape is Option B of the
// 2026-07-25 design review (reports/audit-view-redesign-2026-07-25/): a compact
// table that never changes height, one finding per row, and a rail beside it
// carrying the reasoning for whichever row is selected. The card list it replaced
// repeated each rule's reasoning per finding and ran to 9.3 screens for 33
// findings; the table is 2.
//
// The decisions behind the details, all @jwildfire, 2026-07-25:
//   D1  the rail, not inline expansion
//   D2  a click dispatches immediately — no staging, no apply-all button
//   D3  a rule band may reject its whole rule, but confirms above three, because
//       an accept is visible in the roadmap tomorrow and a mute is invisible for
//       sixty days
//   D4  the activity log is a fold under the table — read after deciding
//   D5  grouped by rule, worst rule first
//   D6  the per-finding cards go; the rule reference and the quiet rules stay,
//       because an empty audit and a broken one must never look alike
//   D7  a click reports itself as a pill on its own row plus one run panel, and
//       the outcome shown is re-read from the ledger rather than assumed
//
// Generated at deploy time from the committed ledger, exactly like the other
// pages, so it cannot drift from what the nightly audit actually found.
import fs from 'node:fs/promises';
import path from 'node:path';

import { esc, fmtET, age } from './lib/gh.mjs';
import { ROOT, HUB } from './lib/repos.mjs';
import { siteHeader } from './lib/nav.mjs';
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
const CONF_RANK = { high: 0, medium: 1, low: 2 };
const GROUPS = ['Board integrity', 'Hierarchy', 'Linkage', 'Conventions'];

// A button carries finding ids and nothing else. The page turns them into a
// repository_dispatch — authenticated as @jwildfire from his own browser — and the
// lane re-derives what they mean from a fresh audit (#109). What runs is never
// what the page said should run.
const decideBtns = (ids, { size = '', label = '', bulk = false } = {}) => {
  if (!ids.length) return '';
  const d = esc(ids.join(' '));
  const n = ids.length;
  const yes = bulk ? `Accept all ${n}` : '✓';
  const no = bulk ? `Reject all ${n}` : '✗';
  return `<span class="ap-acts">
    <button class="ap-act yes${size}" data-decision="accept" data-ids="${d}" title="Accept — the lane re-validates, then applies${bulk ? ` all ${n}` : ''} (a)" aria-label="Accept ${esc(label || `${n} findings`)}">${yes}</button>
    <button class="ap-act no${size}" data-decision="reject" data-ids="${d}" title="Reject — nothing changes${bulk ? `; all ${n} are muted` : '; the finding is muted'} for 60 days (x)" aria-label="Reject ${esc(label || `${n} findings`)}">${no}</button>
  </span>`;
};

const confCell = (f) => {
  const dots = { high: '●●●', medium: '●●○', low: '●○○' }[f.confidence] ?? '';
  return `<span class="ap-conf ${esc(f.confidence)}" title="${esc(f.confidence)} confidence"><span class="ap-dots" aria-hidden="true">${dots}</span><span class="ap-cw">${esc(f.confidence)}</span></span>`;
};
const kindCell = (f) => (f.proposal.kind === 'agentic'
  ? '<span class="rm-pill ready" title="A bounded agent decides how — the summary states the call it will make">judgment</span>'
  : '<span class="rm-pill ok" title="A listed operation, applied exactly as written">mechanical</span>');

// ------------------------------------------------------------------- the table
function findingRow(f) {
  const subj = f.subject.number
    ? `${shortRepo(f.subject.repo)}#${f.subject.number}`
    : `${shortRepo(f.subject.repo)} · ${f.subject.kind}`;
  const flags = [
    f.reappeared ? '<span class="rm-pill warn" title="Applied before, and the audit reports it again">back again</span>' : '',
    f.muted ? `<span class="rm-pill" title="Rejected — muted until ${esc(f.mutedUntil ?? '')}">muted</span>` : '',
  ].join('');
  return `<tr class="ap-row${f.muted ? ' muted' : ''}" id="f-${esc(f.fingerprint)}" data-id="${esc(f.id)}"
  data-conf="${esc(f.confidence)}" data-kind="${esc(f.proposal.kind)}" data-repo="${esc(f.subject.repo)}"
  data-group="${esc(f.group)}" data-rule="${esc(f.rule)}" data-muted="${f.muted ? 'yes' : 'no'}"
  data-rank="${CONF_RANK[f.confidence] ?? 9}" data-num="${f.subject.number ?? 0}"
  data-seen="${esc(f.firstSeen)}" data-runs="${f.runs}"
  data-text="${esc([f.id, f.ruleTitle, f.subject.title, ...f.evidence, f.proposal.summary].join(' ').toLowerCase())}">
  <td class="ap-c-act">${f.muted ? '' : decideBtns([f.id], { label: subj })}</td>
  <td class="ap-c-conf">${confCell(f)}</td>
  <td class="ap-c-subj"><a class="ap-subj" href="${esc(f.subject.url)}" target="_blank" rel="noopener" title="${esc(f.subject.repo)}">${esc(subj)}</a></td>
  <td class="ap-c-title"><span class="ap-clip" title="${esc(f.subject.title || f.ruleTitle)}">${esc(f.subject.title || f.ruleTitle)}</span></td>
  <td class="ap-c-what"><span class="ap-clip" title="${esc(f.proposal.summary)}">${esc(f.proposal.summary)}</span></td>
  <td class="ap-c-kind">${kindCell(f)}${flags}</td>
  <td class="ap-c-state"><span class="ap-state" aria-live="polite"></span></td>
</tr>`;
}

function ruleBand(ruleMeta, findings) {
  const ids = findings.filter((f) => !f.muted).map((f) => f.id);
  // When a rule proposes the identical change for every finding it produced —
  // ten of the thirteen firing rules on the night this was built — saying it once
  // here is what turns the band's ✓ from a bulk action into an informed one.
  const changes = [...new Set(findings.map((f) => f.proposal.summary))];
  const same = changes.length === 1 && findings.length > 1
    ? `<span class="ap-same" title="Every finding under this rule proposes the same change">${esc(changes[0])}</span>`
    : '';
  return `<tr class="ap-band" data-rule="${esc(ruleMeta.id)}" id="rule-${esc(ruleMeta.id)}">
  <td colspan="7"><div class="ap-band-in">
    <button class="ap-caret" data-collapse="${esc(ruleMeta.id)}" aria-expanded="true" aria-label="Collapse ${esc(ruleMeta.id)}">▾</button>
    <code>${esc(ruleMeta.id)}</code>
    <span class="ap-rt">${esc(ruleMeta.title)}</span>
    <span class="rm-count">${findings.length}</span>
    ${same}
    <span class="ap-band-act">${ids.length > 1 ? decideBtns(ids, { size: ' sm', bulk: true, label: ruleMeta.id }) : ''}</span>
  </div></td>
</tr>`;
}

// The rail's contents, and everything the filters need, travel as one JSON island
// rather than as a second copy of every finding in the DOM.
function railData(f) {
  return {
    id: f.id,
    subj: f.subject.number ? `${shortRepo(f.subject.repo)}#${f.subject.number}` : `${shortRepo(f.subject.repo)} · ${f.subject.kind}`,
    url: f.subject.url,
    title: f.subject.title || f.ruleTitle,
    rule: f.rule,
    ruleTitle: f.ruleTitle,
    why: f.rule_?.why ?? '',
    fix: f.rule_?.fix ?? '',
    conf: f.confidence,
    kind: f.proposal.kind,
    summary: f.proposal.summary,
    ops: (f.proposal.ops ?? []).map((o) => o.label),
    prompt: f.proposal.prompt ?? '',
    evidence: f.evidence ?? [],
    fingerprint: f.fingerprint,
    firstSeen: f.firstSeen,
    runs: f.runs,
    reappeared: !!f.reappeared,
    muted: !!f.muted,
    mutedUntil: f.mutedUntil ?? null,
    history: (f.decisions ?? []).map((d) => `${d.decision}${d.outcome ? ` (${d.outcome})` : ''} ${String(d.at ?? '').slice(0, 10)}`),
  };
}

// -------------------------------------------------------------- activity log
// The ledger is the record of every decision; rendering it here is what makes the
// audit page the one surface (#109) — decisions are made and read in one place.
// D4 puts it in a fold under the table: it is read after deciding, not during.
const OUTCOME_CLASS = {
  applied: 'released', rejected: 'design', delegated: 'development',
  blocked: 'unstaged', failed: 'drift', stale: 'unstaged',
};

function activityLog(led) {
  const all = [...(led?.decisions ?? [])].reverse();
  if (!all.length) {
    return `<details class="ap-fold" id="activity">
<summary><span class="ap-fold-t">Activity</span> <span class="ap-empty">no decisions recorded yet</span></summary>
<p class="ap-empty">Accepting or rejecting a finding records it here, with what the lane did about it.</p>
</details>`;
  }
  const batches = [];
  for (const d of all) {
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
        d.detail ? ` <span class="ap-meta">${esc(d.detail)}</span>` : ''}</li>`;
    }).join('\n');
    return `<details class="ap-batch">
  <summary><span class="ap-when">${esc(fmtET(first.at))}</span> <strong>${esc(first.decision)}</strong>
    <span class="rm-count">${b.items.length}</span> ${pills} ${where}
    <span class="ap-meta">by @${esc(first.by ?? 'unknown')}</span></summary>
  <ul class="ap-batch-items">
${detail}
  </ul>
</details>`;
  }).join('\n');

  const applied = all.filter((d) => d.outcome === 'applied').length;
  return `<details class="ap-fold" id="activity">
<summary><span class="ap-fold-t">Activity</span> <span class="rm-count">${all.length}</span>
  <span class="ap-meta">${applied} applied · newest first</span></summary>
<p class="rm-note">Every accept and reject, from <a href="decisions.json">decisions.json</a> — the same ledger the audit reads to mute rejected findings. A rejection is recorded but changes nothing on GitHub.</p>
${rows}
</details>`;
}

// ---------------------------------------------------------------------- page
const rules = ledger?.rules ?? [];
const ruleById = new Map(rules.map((r) => [r.id, r]));
const findings = (ledger?.findings ?? []).map((f) => ({ ...f, rule_: ruleById.get(f.rule) }));
const live = findings.filter((f) => !f.muted);

const byRule = new Map();
for (const f of findings) {
  if (!byRule.has(f.rule)) byRule.set(f.rule, []);
  byRule.get(f.rule).push(f);
}
// D5: grouped by rule, worst rule first — a rule ranks by its most confident
// finding, so the eight-finding assignee sweep does not outrank a board error.
const firingRules = [...byRule.keys()].sort((a, b) => {
  const rank = (id) => Math.min(...byRule.get(id).map((f) => CONF_RANK[f.confidence] ?? 9));
  return rank(a) - rank(b)
    || GROUPS.indexOf(byRule.get(a)[0].group) - GROUPS.indexOf(byRule.get(b)[0].group)
    || a.localeCompare(b);
});
const quietRules = rules.filter((r) => !byRule.has(r.id));
const repos = [...new Set(findings.map((f) => f.subject.repo))].sort();
const groupsPresent = GROUPS.filter((g) => findings.some((f) => f.group === g));
const countOf = (pred) => findings.filter((f) => !f.muted && pred(f)).length;

const chip = (group, value, label, current = false, n = null) =>
  `<button class="ap-chip${current ? ' current' : ''}" data-group="${group}" data-value="${esc(value)}" aria-pressed="${current}">${esc(label)}${n == null ? '' : `<span class="ap-n">${n}</span>`}</button>`;

const sweep = (label, blurb, state) =>
  `<button class="ap-sweep" data-sweep='${esc(JSON.stringify(state))}'><b>${esc(label)}</b>${esc(blurb)}</button>`;

const tableBody = firingRules.map((id) => {
  const fs_ = byRule.get(id).slice().sort((a, b) => (CONF_RANK[a.confidence] ?? 9) - (CONF_RANK[b.confidence] ?? 9)
    || (a.subject.number ?? 0) - (b.subject.number ?? 0));
  return `${ruleBand(ruleById.get(id) ?? { id, title: fs_[0].ruleTitle }, fs_)}\n${fs_.map(findingRow).join('\n')}`;
}).join('\n');

const body = ledger
  ? `<div class="ap-shell" id="ap-shell">

  <aside class="ap-side" id="ap-side">
    <button class="ap-side-toggle" aria-expanded="true"><span aria-hidden="true">◧</span> <span class="ap-lbl">hide filters</span></button>

    <h3>Connection</h3>
    <span class="ap-conn" id="ap-conn"></span>

    <h3>Search</h3>
    <label class="ap-search"><input type="search" id="ap-q" placeholder="issue, rule, evidence…" aria-label="Search findings"></label>

    <h3>Sweeps</h3>
    ${sweep('the safe sweep', 'high confidence, mechanical', { conf: 'high', kind: 'mechanical', repo: 'all', group: 'all', q: '' })}
    ${sweep('needs reading', 'every judgment call', { conf: 'all', kind: 'agentic', repo: 'all', group: 'all', q: '' })}
    ${sweep('everything', 'clear all filters', { conf: 'all', kind: 'all', repo: 'all', group: 'all', q: '' })}

    <h3>Confidence</h3>
    <div class="ap-facet">${['all', 'high', 'medium', 'low'].map((v) => chip('conf', v, v, v === 'all', v === 'all' ? null : ledger.counts[v])).join('')}</div>

    <h3>Change kind</h3>
    <div class="ap-facet">${[['all', 'all', null], ['mechanical', 'mechanical', ledger.counts.mechanical], ['agentic', 'judgment', ledger.counts.agentic]]
    .map(([v, l, n]) => chip('kind', v, l, v === 'all', n)).join('')}</div>

    <h3>Rule group</h3>
    <div class="ap-facet">${['all', ...groupsPresent].map((v) => chip('group', v, v === 'all' ? 'all' : v.toLowerCase(), v === 'all', v === 'all' ? null : countOf((f) => f.group === v))).join('')}</div>

    <h3>Repository</h3>
    <div class="ap-facet">${['all', ...repos].map((v) => chip('repo', v, v === 'all' ? 'all' : shortRepo(v), v === 'all', v === 'all' ? null : countOf((f) => f.subject.repo === v))).join('')}</div>

    <h3>Sort</h3>
    <select id="ap-sort" aria-label="Sort findings">
      <option value="confidence">confidence, high first</option>
      <option value="issue">repo and issue number</option>
      <option value="age">oldest finding first</option>
      <option value="runs">most audit runs first</option>
      <option value="kind">mechanical before judgment</option>
    </select>
    <label class="ap-check"><input type="checkbox" id="ap-grouped" checked> group by rule</label>
    <label class="ap-check"><input type="checkbox" id="ap-muted"> show muted</label>

    <h3>Keys</h3>
    <ul class="ap-keys">
      <li><kbd>j</kbd> <kbd>k</kbd> move</li>
      <li><kbd>a</kbd> accept · <kbd>x</kbd> reject</li>
      <li><kbd>/</kbd> search · <kbd>esc</kbd> clear</li>
    </ul>
  </aside>

  <main class="ap-main">
    <div class="ap-run" id="ap-run" hidden></div>

    <div class="ap-meter" id="ap-meter"></div>

    <table class="ap-tbl" id="ap-tbl">
      <caption class="ap-cap" id="audit-findings">The queue — ${live.length} open finding${live.length === 1 ? '' : 's'}, worst rule first. Selecting a row fills the rail; ✓ and ✗ decide it.</caption>
      <colgroup><col class="ap-c-act"><col class="ap-c-conf"><col class="ap-c-subj"><col class="ap-c-title"><col><col class="ap-c-kind"><col class="ap-c-state"></colgroup>
      <thead><tr>
        <th>decide</th><th>conf</th><th>which issue</th><th>title</th><th>what changes</th><th>kind</th><th>state</th>
      </tr></thead>
      <tbody id="ap-body">${tableBody}</tbody>
    </table>
    <p class="ap-empty" id="ap-none" hidden>Nothing matches. Loosen a filter, or clear the search.</p>

    ${activityLog(decisions)}

    <details class="ap-fold" id="rules">
      <summary><span class="ap-fold-t">Rule reference</span> <span class="rm-count">${rules.length}</span>
        <span class="ap-meta">${rules.filter((r) => r.fired).length} firing · ${quietRules.length} quiet</span></summary>
      <p class="rm-note">Every rule the audit knows, and how it fared on the last run. A rule that could not run says so — an empty findings list and a broken registry must never look alike.</p>
      <table class="rm-table">
      <tr><th>Rule</th><th>Group</th><th>State</th><th>Checks</th><th>Why it matters</th></tr>
      ${rules.map((r) => `<tr>
        <td>${byRule.has(r.id) ? `<a href="#rule-${esc(r.id)}"><code>${esc(r.id)}</code></a>` : `<code>${esc(r.id)}</code>`}</td>
        <td>${esc(r.group)}</td>
        <td>${r.error ? `<span class="status-pill drift" title="${esc(r.error)}">failed</span>`
    : r.skipped ? `<span class="status-pill unstaged" title="${esc(r.skipped)}">skipped</span>`
      : r.fired ? `<span class="status-pill development">${r.fired}</span>`
        : '<span class="status-pill released">quiet</span>'}</td>
        <td>${esc(r.title)}</td>
        <td class="ap-why">${esc(r.why)}</td>
      </tr>`).join('\n')}
      </table>
    </details>
  </main>

  <aside class="ap-rail" id="ap-rail"></aside>
</div>

<dialog id="ap-connect" class="audit-log">
  <form method="dialog"><button class="audit-close" aria-label="Close">&times;</button></form>
  <h2>Connect this browser</h2>
  <p class="ap-meta">Applying a finding means writing to GitHub, so the page needs a token of yours. It is stored in this browser's <code>localStorage</code> and sent only to <code>api.github.com</code> — never to any other host, and never into the repository.</p>
  <ol>
    <li>Create a <a href="https://github.com/settings/personal-access-tokens/new" target="_blank" rel="noopener">fine-grained token</a> scoped to <strong>only</strong> <code>${HUB}</code>, with <strong>Contents: read and write</strong> (that is what <code>repository_dispatch</code> requires). Nothing else.</li>
    <li>Paste it below. A short expiry is fine — reconnecting is this dialog again.</li>
  </ol>
  <p><input type="password" id="ap-token" placeholder="github_pat_…" autocomplete="off" spellcheck="false"></p>
  <p><button class="audit-btn accept" id="ap-save">connect</button>
     <button class="audit-btn reject" id="ap-forget">forget this token</button></p>
  <p class="ap-meta" id="ap-connect-msg"></p>
  <p class="ap-meta">Prefer not to hold a token in a browser? Every finding can also be applied by <a href="${esc(decisionUrl('accept', ['RULE-ID:owner/repo#123']))}" target="_blank" rel="noopener">filing a decision issue</a> (edit the ids in the body) — the same lane handles both.</p>
</dialog>

<script type="application/json" id="ap-data">${JSON.stringify(findings.map(railData)).replace(/</g, '\\u003c')}</script>`
  : '<p class="rm-notice">No audit has run yet — <code>site/audit/findings.json</code> is missing.</p>';

const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Roadmap audit · obot</title>
<link rel="stylesheet" href="../assets/styles.css">
<style>
/* Page-specific: the shared sheet styles the theme, this styles the queue.
   The audit is the widest thing on the site — sidebar, table and rail — so the
   measure and the full-bleed band padding are both re-derived here. */
body.wide { max-width: 92rem; }
body.wide header.site { padding-left: max(calc(50vw - 44.5rem), 1.5rem); padding-right: max(calc(50vw - 44.5rem), 1.5rem); }
body.wide footer.site { padding-left: max(calc(50vw - 44.5rem), 1.5rem); padding-right: max(calc(50vw - 44.5rem), 1.5rem); }
h1 { margin-bottom: .1rem; }
.ap-meta { font-family: var(--mono); font-size: .72rem; color: var(--faint); }

.ap-shell { display: grid; grid-template-columns: 12rem minmax(0, 1fr) 19.5rem; gap: 0 .85rem; align-items: start; }
.ap-shell.side-out { grid-template-columns: 2.2rem minmax(0, 1fr) 19.5rem; }
.ap-shell.rail-out { grid-template-columns: 12rem minmax(0, 1fr) 2rem; }
.ap-shell.side-out.rail-out { grid-template-columns: 2.2rem minmax(0, 1fr) 2rem; }

/* sidebar */
.ap-side { position: sticky; top: 0; max-height: 100vh; overflow-y: auto; padding: .5rem .6rem 2rem 0; }
.side-out .ap-side { padding-right: 0; overflow: hidden; }
.side-out .ap-side > *:not(.ap-side-toggle) { display: none; }
.ap-side-toggle, .ap-rail-toggle { display: flex; align-items: center; gap: .35rem; background: none; border: 0;
  cursor: pointer; padding: .1rem 0 .4rem; font: 600 .66rem/1.4 var(--mono); letter-spacing: .08em;
  text-transform: uppercase; color: var(--faint); }
.side-out .ap-side-toggle, .rail-out .ap-rail-toggle { writing-mode: vertical-rl; }
.ap-side-toggle:hover, .ap-rail-toggle:hover { color: var(--accent); }
.ap-side h3 { margin: .8rem 0 .25rem; font: 600 .64rem/1.4 var(--mono); letter-spacing: .09em;
  text-transform: uppercase; color: var(--faint); }
.ap-search input { width: 100%; font: 400 .8rem/1.6 var(--sans); color: var(--ink); background: var(--card);
  border: 1px solid var(--rule); border-radius: 6px; padding: .25rem .5rem; }
.ap-facet { display: flex; flex-wrap: wrap; gap: .2rem; }
.ap-chip { font: 500 .7rem/1.4 var(--mono); color: var(--muted); cursor: pointer; background: var(--card);
  border: 1px solid var(--rule); border-radius: 999px; padding: .1rem .45rem; }
.ap-chip:hover { border-color: var(--accent-bright); color: var(--accent); }
.ap-chip.current { background: var(--accent); border-color: var(--accent); color: #fff; }
.ap-chip .ap-n { opacity: .65; margin-left: .22rem; }
.ap-sweep { display: block; width: 100%; text-align: left; margin: .15rem 0; cursor: pointer;
  font: 400 .74rem/1.4 var(--sans); color: var(--ink); background: var(--card);
  border: 1px solid var(--rule); border-radius: 6px; padding: .25rem .4rem; }
.ap-sweep:hover { border-color: var(--accent-bright); }
.ap-sweep b { display: block; font: 600 .7rem/1.4 var(--mono); color: var(--accent); }
#ap-sort { width: 100%; font: 400 .76rem/1.5 var(--sans); background: var(--card);
  border: 1px solid var(--rule); border-radius: 6px; padding: .2rem .35rem; color: var(--ink); }
.ap-check { display: flex; align-items: center; gap: .35rem; margin-top: .3rem;
  font: 400 .74rem/1.5 var(--sans); color: var(--muted); cursor: pointer; }
.ap-keys { margin: .2rem 0 0; padding: 0; list-style: none; font: 400 .7rem/1.7 var(--mono); color: var(--faint); }
.ap-keys kbd { font: 500 .66rem/1 var(--mono); background: var(--card); border: 1px solid var(--rule);
  border-bottom-width: 2px; border-radius: 4px; padding: .06rem .28rem; color: var(--muted); }
.ap-conn { display: block; }
.ap-conn .ap-chip { width: 100%; text-align: center; }

/* the queue meter — one tick per finding, in table order; progress and minimap
   in the same object. Colour is never the only carrier: the readout says it. */
.ap-meter { display: flex; align-items: center; gap: .5rem; margin: 0 0 .4rem; }
.ap-ticks { display: flex; gap: 2px; flex: 1 1 auto; min-width: 0; }
.ap-tick { flex: 1 1 0; height: 1rem; min-width: 3px; padding: 0; border: 0; border-radius: 2px;
  background: var(--rule); cursor: pointer; }
.ap-tick:hover { outline: 2px solid var(--accent-bright); outline-offset: 1px; }
.ap-tick.applied { background: var(--good); }
.ap-tick.rejected, .ap-tick.mutedt { background: var(--faint); }
.ap-tick.working { background: var(--accent-bright); }
.ap-tick.problem { background: #b42318; }
.ap-tick.hid { opacity: .3; }
.ap-read { font: 500 .7rem/1.4 var(--mono); color: var(--muted); white-space: nowrap; }

/* table */
.ap-tbl { width: 100%; border-collapse: collapse; table-layout: fixed; background: var(--card);
  border: 1px solid var(--rule); margin: 0; font-size: .82rem; }
.ap-tbl thead th { position: sticky; top: 0; z-index: 3; background: var(--panel); text-align: left;
  font: 600 .62rem/1.5 var(--mono); letter-spacing: .09em; text-transform: uppercase; color: var(--faint);
  padding: .25rem .4rem; border-bottom: 1px solid var(--rule); white-space: nowrap; }
col.ap-c-act { width: 3.7rem; } col.ap-c-conf { width: 4.9rem; } col.ap-c-subj { width: 8rem; }
col.ap-c-title { width: 24%; } col.ap-c-kind { width: 5.6rem; } col.ap-c-state { width: 5.2rem; }
tr.ap-band > td { position: sticky; top: 1.45rem; z-index: 2; background: #f4ece3;
  border-top: 1px solid var(--rule); border-bottom: 1px solid var(--rule); padding: .15rem .4rem; }
.ap-band-in { display: flex; align-items: center; gap: .45rem; flex-wrap: wrap; }
.ap-band-in code { font: 500 .68rem/1.4 var(--mono); color: var(--accent); background: none; border: 0; padding: 0; }
.ap-rt { font: 500 .8rem/1.4 var(--sans); }
.ap-same { flex: 1 1 8rem; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  font: 400 .72rem/1.4 var(--mono); color: var(--muted); border-left: 1px solid var(--rule); padding-left: .45rem; }
.ap-band-act { margin-left: auto; flex: none; }
.ap-caret { background: none; border: 0; cursor: pointer; color: var(--muted); padding: 0 .1rem; font-size: .78rem; }
tr.ap-row > td { padding: .14rem .4rem; border-bottom: 1px solid #f4ece3; vertical-align: middle; }
tr.ap-row:hover > td { background: #fffdfa; }
tr.ap-row.cursor > td { background: #fff7ed; }
tr.ap-row.cursor > td:first-child { box-shadow: inset 3px 0 0 var(--accent-bright); }
tr.ap-row.muted { opacity: .6; }
tr.ap-row.settled { opacity: .55; }
tr.ap-row.settled .ap-acts { display: none; }
tr.ap-row.working > td:first-child { box-shadow: inset 3px 0 0 var(--accent-bright); }
.ap-clip { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ap-c-title .ap-clip { color: var(--muted); }
.ap-c-subj { overflow: hidden; }
.ap-subj { display: block; font: 500 .74rem/1.4 var(--mono); text-decoration: none;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.ap-acts { display: flex; gap: .15rem; }
.ap-act { width: 1.45rem; height: 1.45rem; display: grid; place-items: center; cursor: pointer; padding: 0;
  background: var(--card); border: 1px solid var(--rule); border-radius: 5px; color: var(--faint);
  font: 600 .78rem/1 var(--sans); }
.ap-act:hover { border-color: var(--accent-bright); color: var(--accent); }
.ap-act.sm { width: auto; height: auto; padding: .08rem .45rem; font: 500 .68rem/1.5 var(--mono); }
.ap-act[disabled] { opacity: .4; cursor: not-allowed; }
.ap-conf { display: inline-flex; align-items: center; gap: .25rem; white-space: nowrap; }
.ap-dots { font: 500 .72rem/1 var(--mono); letter-spacing: -.04em; }
.ap-cw { font: 500 .64rem/1.4 var(--mono); }
.ap-conf.high .ap-dots, .ap-conf.high .ap-cw { color: #b42318; }
.ap-conf.medium .ap-dots, .ap-conf.medium .ap-cw { color: var(--warn); }
.ap-conf.low .ap-dots, .ap-conf.low .ap-cw { color: var(--muted); }
.ap-state { font: 500 .66rem/1.5 var(--mono); color: var(--muted); }
.ap-state.working { color: var(--accent); }
.ap-state.ok { color: var(--good); }
.ap-state.bad { color: #b42318; }

/* rail */
.ap-rail { position: sticky; top: 0; max-height: 100vh; overflow-y: auto; padding: .5rem 0 3rem .9rem;
  border-left: 1px solid var(--rule); }
.rail-out .ap-rail { padding-left: .2rem; overflow: hidden; }
.rail-out .ap-rail > *:not(.ap-rail-toggle) { display: none; }
.ap-rail h2 { margin: .2rem 0 0; font: 400 1.05rem/1.25 var(--serif); }
.ap-rail .ap-rhead { border-bottom: 1px solid var(--rule); padding-bottom: .45rem; }
.ap-rail .ap-line { display: flex; align-items: center; gap: .4rem; flex-wrap: wrap; }
.ap-rail .ap-pos { margin-left: auto; font: 400 .68rem/1.4 var(--mono); color: var(--faint); }
.ap-rail .ap-decide { display: flex; gap: .35rem; margin: .5rem 0 .2rem; }
.ap-rail .ap-decide button { flex: 1 1 0; cursor: pointer; padding: .3rem .4rem; border-radius: 6px;
  font: 600 .76rem/1.3 var(--sans); background: var(--card); border: 1px solid var(--rule); color: var(--muted); }
.ap-rail .ap-decide button:hover { border-color: var(--accent-bright); color: var(--accent); }
.ap-rail .ap-step { display: flex; gap: .3rem; }
.ap-rail .ap-step button { flex: 1 1 0; cursor: pointer; background: var(--panel); border: 1px solid var(--rule);
  border-radius: 6px; padding: .15rem; font: 500 .68rem/1.4 var(--mono); color: var(--muted); }
.ap-rail .ap-dh { font: 600 .62rem/1.5 var(--mono); letter-spacing: .09em; text-transform: uppercase;
  color: var(--faint); margin: .5rem 0 .1rem; }
.ap-rail p { margin: 0; font-size: .8rem; }
.ap-rail .ap-why { color: var(--muted); }
.ap-rail ul.ap-ev { display: flex; flex-wrap: wrap; gap: .2rem; margin: 0; padding: 0; list-style: none; }
.ap-rail ul.ap-ev li { font: 400 .7rem/1.5 var(--mono); background: var(--card); border: 1px solid var(--rule);
  border-radius: 4px; padding: .04rem .35rem; color: var(--muted); }
.ap-rail ul.ap-ops { margin: 0; padding: 0; list-style: none; font: 500 .72rem/1.7 var(--mono); color: var(--accent); }
.ap-rail ul.ap-ops li::before { content: "→ "; color: var(--faint); }
.ap-rail pre.ap-prompt { margin: 0; padding: .4rem .5rem; background: var(--card); border: 1px solid var(--rule);
  border-left: 3px solid #fde68a; border-radius: 5px; font: 400 .71rem/1.6 var(--mono); color: var(--muted);
  white-space: pre-wrap; }
.ap-rail .ap-idle { color: var(--faint); font-size: .82rem; padding: 1.5rem .2rem; text-align: center; }
.ap-rail .ap-idle b { display: block; font: 400 1rem/1.4 var(--serif); color: var(--muted); margin-bottom: .25rem; }

/* the run panel — the only part of the page that moves, so the only loud part */
.ap-run { position: sticky; top: 0; z-index: 4; margin: 0 0 .4rem; padding: .4rem .7rem;
  border-radius: .3rem; font-size: .82rem; border: 1px solid var(--rule); background: var(--card); }
.ap-run.working { border-color: var(--accent-bright); background: #fff7ed; }
.ap-run.done { border-color: #bbf7d0; background: #f0fdf4; }
.ap-run.warn { border-color: #fde68a; background: #fffbeb; }
.ap-spin { color: var(--accent-bright); animation: ap-pulse 1.1s ease-in-out infinite; }
@keyframes ap-pulse { 0%, 100% { opacity: 1; } 50% { opacity: .25; } }
@media (prefers-reduced-motion: reduce) { .ap-spin { animation: none; } }
.audit-btn { cursor: pointer; font-family: var(--mono); }
footer.site code { background: rgba(245, 237, 228, .12); border-color: #46301f; color: var(--side-ink); }

/* folds under the table: activity (D4) and the rule reference (D6) */
.ap-fold { margin: 1.1rem 0 0; border-top: 1px solid var(--rule); padding-top: .5rem; }
.ap-fold > summary { cursor: pointer; display: flex; align-items: baseline; gap: .5rem; }
.ap-fold > summary:hover { color: var(--accent); }
.ap-fold-t { font: 400 1.15rem/1.3 var(--serif); }
.ap-fold .rm-table td.ap-why { font-size: .76rem; color: var(--muted); }
details.ap-batch { border-bottom: 1px solid var(--rule); padding: .25rem 0; }
details.ap-batch > summary { cursor: pointer; display: flex; flex-wrap: wrap; align-items: baseline;
  gap: .4rem; font-size: .8rem; }
details.ap-batch > summary:hover { color: var(--accent); }
.ap-when { font-family: var(--mono); font-size: .72rem; color: var(--muted); }
.ap-batch-items { margin: .25rem 0 .2rem; padding-left: 1.1rem; font-size: .78rem; }
.ap-batch-items li { margin: .1rem 0; }
.ap-cap { caption-side: top; text-align: left; padding: .25rem .4rem; font: 400 .72rem/1.5 var(--mono);
  color: var(--faint); background: var(--panel); border: 1px solid var(--rule); border-bottom: 0; }
.ap-empty { font-size: .82rem; color: var(--faint); }

@media (max-width: 76rem) {
  .ap-shell, .ap-shell.side-out, .ap-shell.rail-out { grid-template-columns: minmax(0, 1fr); }
  .ap-side, .ap-rail { position: static; max-height: none; border-left: 0; padding-left: 0; }
  .ap-rail { border-top: 1px solid var(--rule); padding-top: .5rem; }
}
</style>
</head>
<body class="wide">
${siteHeader({ page: 'audit', depth: 1 })}

<h1>Roadmap audit</h1>
<p class="tagline">What the roadmap says about itself, checked against the conventions it is supposed to follow. ${
  ledger ? `Last run ${esc(fmtET(ledger.generatedAt))} — ${esc(age(ledger.generatedAt, NOW))} ago · ${live.length} open finding${live.length === 1 ? '' : 's'} across ${firingRules.length} of ${rules.length} rules.` : ''
}</p>

<p class="rm-note">Every row is a fact about GitHub state, produced by a deterministic rule rather than a model. <strong>✓</strong> triggers the <a href="https://github.com/${HUB}/blob/main/.github/workflows/roadmap-audit-apply.yml">apply lane</a> straight away — it re-validates the finding against a fresh audit, then applies it, using a listed operation for a mechanical fix and a bounded agent for a judgment call. <strong>✗</strong> changes nothing and mutes the finding for 60 days, or until its evidence changes. Every decision lands in the <a href="#activity">activity log</a>. Confidence: <strong>high</strong> — deterministic detection, unambiguous fix · <strong>medium</strong> — detection solid, the fix is the judgment call the proposal states · <strong>low</strong> — heuristic, or an open convention question. Machine-readable: <a href="findings.json">findings.json</a> · <a href="decisions.json">decisions.json</a>.</p>

${body}

<script>
(function () {
  var data = document.getElementById('ap-data');
  if (!data) return;
  var FINDINGS = JSON.parse(data.textContent);
  var BY_ID = {};
  FINDINGS.forEach(function (f) { BY_ID[f.id] = f; });

  var shell = document.getElementById('ap-shell');
  var tbody = document.getElementById('ap-body');
  var railEl = document.getElementById('ap-rail');
  var meterEl = document.getElementById('ap-meter');
  var runPanel = document.getElementById('ap-run');
  var noneEl = document.getElementById('ap-none');
  var rows = Array.prototype.slice.call(tbody.querySelectorAll('tr.ap-row'));
  var bands = Array.prototype.slice.call(tbody.querySelectorAll('tr.ap-band'));
  var state = { conf: 'all', kind: 'all', repo: 'all', group: 'all', q: '', muted: false,
    sort: 'confidence', grouped: true, collapsed: {}, cursor: null };
  var outcome = {};   // finding id -> what the lane recorded, this session

  function visible() { return rows.filter(function (r) { return !r.hidden; }); }

  var SORTS = {
    confidence: function (a, b) { return num(a, 'rank') - num(b, 'rank') || num(a, 'num') - num(b, 'num'); },
    issue: function (a, b) { return a.dataset.repo.localeCompare(b.dataset.repo) || num(a, 'num') - num(b, 'num'); },
    age: function (a, b) { return a.dataset.seen.localeCompare(b.dataset.seen) || num(b, 'runs') - num(a, 'runs'); },
    runs: function (a, b) { return num(b, 'runs') - num(a, 'runs') || num(a, 'rank') - num(b, 'rank'); },
    kind: function (a, b) { return a.dataset.kind.localeCompare(b.dataset.kind) || num(a, 'rank') - num(b, 'rank'); }
  };
  function num(el, key) { return Number(el.dataset[key] || 0); }

  function apply() {
    var shown = 0;
    rows.forEach(function (r) {
      var ok = (state.conf === 'all' || r.dataset.conf === state.conf)
        && (state.kind === 'all' || r.dataset.kind === state.kind)
        && (state.repo === 'all' || r.dataset.repo === state.repo)
        && (state.group === 'all' || r.dataset.group === state.group)
        && (state.muted || r.dataset.muted === 'no')
        && (!state.q || r.dataset.text.indexOf(state.q) !== -1)
        && (!state.grouped || !state.collapsed[r.dataset.rule]);
      r.hidden = !ok;
      if (ok) shown++;
    });

    // Re-lay the body out: grouped keeps each band with its own rows, flat drops
    // the bands entirely. Sorting reorders rows inside a band, and orders the
    // bands by their best row, so "worst first" holds at both levels.
    var frag = document.createDocumentFragment();
    var sorter = SORTS[state.sort] || SORTS.confidence;
    if (state.grouped) {
      var ordered = bands.slice().sort(function (a, b) {
        var ra = rowsOf(a.dataset.rule), rb = rowsOf(b.dataset.rule);
        if (!ra.length || !rb.length) return rb.length - ra.length;
        return sorter(ra.sort(sorter)[0], rb.sort(sorter)[0]);
      });
      ordered.forEach(function (band) {
        var own = rowsOf(band.dataset.rule);
        var live = own.filter(function (r) { return !r.hidden; });
        band.hidden = !live.length && !state.collapsed[band.dataset.rule];
        if (state.collapsed[band.dataset.rule]) band.hidden = !own.length;
        frag.appendChild(band);
        own.sort(sorter).forEach(function (r) { frag.appendChild(r); });
      });
    } else {
      bands.forEach(function (b) { b.hidden = true; frag.appendChild(b); });
      rows.slice().sort(sorter).forEach(function (r) { frag.appendChild(r); });
    }
    tbody.appendChild(frag);

    noneEl.hidden = shown > 0;
    paintMeter();
    if (state.cursor && BY_ID[state.cursor]) paintRail(); else paintRail();
  }

  function rowsOf(rule) {
    return rows.filter(function (r) { return r.dataset.rule === rule; });
  }
  function rowFor(id) {
    return rows.filter(function (r) { return r.dataset.id === id; })[0];
  }

  // ------------------------------------------------------------------- meter
  function paintMeter() {
    var ticks = rows.map(function (r) {
      var f = BY_ID[r.dataset.id] || {};
      var o = outcome[r.dataset.id];
      var cls = r.dataset.muted === 'yes' ? 'mutedt'
        : o === 'applied' ? 'applied'
          : o === 'rejected' ? 'rejected'
            : o === 'working' ? 'working'
              : (o ? 'problem' : '');
      var label = (f.subj || '') + ' — ' + (f.summary || '') + (o ? ' (' + o + ')' : '');
      return '<button class="ap-tick ' + cls + (r.hidden ? ' hid' : '') + '" data-jump="'
        + r.dataset.id.replace(/"/g, '&quot;') + '" title="' + label.replace(/"/g, '&quot;')
        + '" aria-label="' + label.replace(/"/g, '&quot;') + '"></button>';
    }).join('');
    var settled = Object.keys(outcome).filter(function (k) { return outcome[k] !== 'working'; }).length;
    var open = rows.filter(function (r) { return r.dataset.muted === 'no' && !outcome[r.dataset.id]; }).length;
    meterEl.innerHTML = '<div class="ap-ticks" role="group" aria-label="Finding queue">' + ticks + '</div>'
      + '<span class="ap-read">' + settled + ' decided this session · ' + open + ' to go</span>';
  }

  // -------------------------------------------------------------------- rail
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c];
    });
  }
  var TOGGLE = '<button class="ap-rail-toggle" data-rail-toggle aria-expanded="true">detail ▸</button>';

  function paintRail() {
    var f = state.cursor ? BY_ID[state.cursor] : null;
    if (!f) {
      railEl.innerHTML = TOGGLE + '<div class="ap-idle"><b>Nothing selected.</b>Click a row, or press <kbd>j</kbd> to start at the top of the queue.</div>';
      return;
    }
    var vis = visible();
    var i = vis.indexOf(rowFor(f.id));
    var dots = { high: '●●●', medium: '●●○', low: '●○○' }[f.conf] || '';
    var doing = f.kind === 'mechanical'
      ? '<div class="ap-dh">What runs</div><ul class="ap-ops">' + f.ops.map(function (o) { return '<li>' + esc(o) + '</li>'; }).join('') + '</ul>'
      : '<div class="ap-dh">What the agent is told</div><pre class="ap-prompt">' + esc(f.prompt) + '</pre>';
    railEl.innerHTML = TOGGLE
      + '<div class="ap-rhead">'
      + '<div class="ap-line"><span class="ap-conf ' + f.conf + '"><span class="ap-dots">' + dots + '</span><span class="ap-cw">' + esc(f.conf) + '</span></span>'
      + '<a class="ap-subj" href="' + esc(f.url) + '" target="_blank" rel="noopener">' + esc(f.subj) + '</a>'
      + '<span class="rm-pill ' + (f.kind === 'agentic' ? 'ready' : 'ok') + '">' + (f.kind === 'agentic' ? 'judgment' : 'mechanical') + '</span>'
      + (i >= 0 ? '<span class="ap-pos">' + (i + 1) + ' of ' + vis.length + '</span>' : '') + '</div>'
      + '<h2>' + esc(f.title) + '</h2>'
      + (f.muted ? '<p class="ap-meta">Muted until ' + esc(f.mutedUntil) + ' — rejected earlier.</p>'
        : '<div class="ap-decide"><button data-decision="accept" data-ids="' + esc(f.id) + '">✓ Accept</button>'
          + '<button data-decision="reject" data-ids="' + esc(f.id) + '">✗ Reject</button></div>')
      + '<div class="ap-step"><button data-step="-1">↑ previous</button><button data-step="1">next ↓</button></div>'
      + '</div>'
      + '<div class="ap-dh">Why this is a finding — ' + esc(f.rule) + '</div><p class="ap-why">' + esc(f.why) + '</p>'
      + '<div class="ap-dh">Evidence on GitHub right now</div><ul class="ap-ev">'
      + f.evidence.map(function (e) { return '<li>' + esc(e) + '</li>'; }).join('') + '</ul>'
      + '<div class="ap-dh">Proposed change</div><p>' + esc(f.summary) + '</p>'
      + doing
      + '<div class="ap-dh">Provenance</div><p class="ap-meta">' + esc(f.id) + ' · fingerprint ' + esc(f.fingerprint)
      + ' · seen in ' + f.runs + ' run' + (f.runs === 1 ? '' : 's') + ' since ' + esc(f.firstSeen)
      + (f.reappeared ? ' · applied before and back again' : '') + '</p>'
      + (f.history.length ? '<p class="ap-meta">Earlier decisions: ' + f.history.map(esc).join(' · ') + '</p>' : '');
  }

  function select(id) {
    state.cursor = id;
    rows.forEach(function (r) { r.classList.toggle('cursor', r.dataset.id === id); });
    paintRail();
  }
  function move(step) {
    var vis = visible();
    if (!vis.length) return;
    var i = vis.indexOf(rowFor(state.cursor));
    var next = vis[Math.max(0, Math.min(vis.length - 1, i < 0 ? 0 : i + step))];
    select(next.dataset.id);
    next.scrollIntoView({ block: 'nearest' });
  }

  // -------------------------------------------------------------- the filters
  document.querySelectorAll('.ap-chip[data-group]').forEach(function (b) {
    b.addEventListener('click', function () {
      var g = b.dataset.group;
      state[g] = b.dataset.value;
      document.querySelectorAll('.ap-chip[data-group="' + g + '"]').forEach(function (o) {
        var on = o === b;
        o.classList.toggle('current', on);
        o.setAttribute('aria-pressed', on ? 'true' : 'false');
      });
      apply();
    });
  });
  document.querySelectorAll('[data-sweep]').forEach(function (b) {
    b.addEventListener('click', function () {
      var s = JSON.parse(b.dataset.sweep);
      Object.keys(s).forEach(function (k) { state[k] = s[k]; });
      document.getElementById('ap-q').value = state.q;
      document.querySelectorAll('.ap-chip[data-group]').forEach(function (o) {
        var on = state[o.dataset.group] === o.dataset.value;
        o.classList.toggle('current', on);
        o.setAttribute('aria-pressed', on ? 'true' : 'false');
      });
      apply();
    });
  });
  document.getElementById('ap-q').addEventListener('input', function (e) {
    state.q = e.target.value.trim().toLowerCase(); apply();
  });
  document.getElementById('ap-sort').addEventListener('change', function (e) { state.sort = e.target.value; apply(); });
  document.getElementById('ap-grouped').addEventListener('change', function (e) { state.grouped = e.target.checked; apply(); });
  document.getElementById('ap-muted').addEventListener('change', function (e) { state.muted = e.target.checked; apply(); });
  document.querySelector('.ap-side-toggle').addEventListener('click', function (e) {
    shell.classList.toggle('side-out');
    var out = shell.classList.contains('side-out');
    e.currentTarget.setAttribute('aria-expanded', String(!out));
    e.currentTarget.querySelector('.ap-lbl').textContent = out ? 'filters' : 'hide filters';
  });

  tbody.addEventListener('click', function (e) {
    var caret = e.target.closest('[data-collapse]');
    if (caret) {
      var rule = caret.dataset.collapse;
      state.collapsed[rule] = !state.collapsed[rule];
      caret.textContent = state.collapsed[rule] ? '▸' : '▾';
      caret.setAttribute('aria-expanded', String(!state.collapsed[rule]));
      apply();
      return;
    }
    if (e.target.closest('[data-decision]') || e.target.closest('a')) return;
    var row = e.target.closest('tr.ap-row');
    if (row) select(row.dataset.id);
  });

  meterEl.addEventListener('click', function (e) {
    var t = e.target.closest('[data-jump]');
    if (!t) return;
    select(t.dataset.jump);
    var r = rowFor(t.dataset.jump);
    if (r) r.scrollIntoView({ block: 'center', behavior: 'smooth' });
  });

  railEl.addEventListener('click', function (e) {
    var step = e.target.closest('[data-step]');
    if (step) { move(Number(step.dataset.step)); return; }
    var rt = e.target.closest('[data-rail-toggle]');
    if (rt) {
      shell.classList.toggle('rail-out');
      rt.textContent = shell.classList.contains('rail-out') ? 'detail ◂' : 'detail ▸';
    }
  });

  document.addEventListener('keydown', function (e) {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    var typing = /^(input|textarea|select)$/i.test(e.target.tagName);
    if (e.key === '/' && !typing) { e.preventDefault(); document.getElementById('ap-q').focus(); return; }
    if (typing) { if (e.key === 'Escape') e.target.blur(); return; }
    if (e.key === 'j' || e.key === 'ArrowDown') { e.preventDefault(); move(1); }
    else if (e.key === 'k' || e.key === 'ArrowUp') { e.preventDefault(); move(-1); }
    else if (e.key === 'a' && state.cursor) { e.preventDefault(); send('accept', [state.cursor], 'accept 1 finding'); }
    else if (e.key === 'x' && state.cursor) { e.preventDefault(); send('reject', [state.cursor], 'reject 1 finding'); }
    else if (e.key === 'Escape') { state.cursor = null; rows.forEach(function (r) { r.classList.remove('cursor'); }); paintRail(); }
  });

  // ---------------------------------------------------------------- the loop
  // Click → repository_dispatch → poll the run → report it on the row and in the
  // panel (#109, D2 and D7). The token is @jwildfire's own, kept in this browser
  // only; the dispatch carries finding ids and nothing else, and the lane
  // re-validates every one of them against a fresh audit before it changes
  // anything. A page cannot be trusted, and is not.
  var REPO = '${HUB}';
  var WORKFLOW = 'roadmap-audit-apply.yml';
  var KEY = 'obot-audit-token';
  var connSlot = document.getElementById('ap-conn');
  var dialog = document.getElementById('ap-connect');
  var busy = false;

  function token() { try { return localStorage.getItem(KEY) || ''; } catch (e) { return ''; } }

  function paintConnection() {
    var has = Boolean(token());
    connSlot.innerHTML = '';
    var b = document.createElement('button');
    b.className = 'ap-chip' + (has ? ' current' : '');
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
      'X-GitHub-Api-Version': '2022-11-28'
    }, o.headers || {});
    return fetch('https://api.github.com' + path, o);
  }

  function say(html, cls) {
    runPanel.hidden = false;
    runPanel.className = 'ap-run' + (cls ? ' ' + cls : '');
    runPanel.innerHTML = html;
  }

  function mark(ids, text, cls) {
    ids.forEach(function (id) {
      var r = rowFor(id);
      if (!r) return;
      var s = r.querySelector('.ap-state');
      if (s) { s.textContent = text; s.className = 'ap-state' + (cls ? ' ' + cls : ''); }
      r.classList.toggle('working', cls === 'working');
    });
  }
  function lockButtons(on) {
    document.querySelectorAll('[data-decision]').forEach(function (b) { b.disabled = on; });
  }

  function findRun(since, tries) {
    return gh('/repos/' + REPO + '/actions/workflows/' + WORKFLOW + '/runs?event=repository_dispatch&per_page=5')
      .then(function (r) { return r.ok ? r.json() : { workflow_runs: [] }; })
      .then(function (data) {
        var run = (data.workflow_runs || []).filter(function (w) {
          return new Date(w.created_at).getTime() >= since - 60000;
        })[0];
        if (run) return run;
        if (tries <= 0) return null;
        return new Promise(function (res) { setTimeout(res, 3000); }).then(function () { return findRun(since, tries - 1); });
      });
  }

  function watchRun(run, label, ids) {
    return gh('/repos/' + REPO + '/actions/runs/' + run.id)
      .then(function (r) { return r.json(); })
      .then(function (w) {
        if (w.status !== 'completed') {
          mark(ids, w.status.replace('_', ' '), 'working');
          say('<span class="ap-spin">●</span> ' + label + ' — <strong>' + w.status.replace('_', ' ')
            + '</strong> · <a href="' + w.html_url + '" target="_blank" rel="noopener">run log</a>', 'working');
          return new Promise(function (res) { setTimeout(res, 5000); }).then(function () { return watchRun(w, label, ids); });
        }
        return w;
      });
  }

  // What actually landed comes from the ledger the lane commits, not from the
  // page's assumption — read through the API, since the CDN caches raw files.
  function outcomes(runId) {
    return gh('/repos/' + REPO + '/contents/site/audit/decisions.json?ref=main', {
      headers: { Accept: 'application/vnd.github.raw' }
    }).then(function (r) { return r.ok ? r.json() : null; }).then(function (led) {
      if (!led) return null;
      var mine = (led.decisions || []).filter(function (d) { return String(d.runId) === String(runId); });
      return mine.length ? mine : null;
    });
  }

  function send(decision, ids, label) {
    if (busy) { say('One decision at a time — the lane runs them in a single queue. Waiting for the current run.', 'warn'); return; }
    if (!token()) { dialog.showModal(); return; }
    // D3: rejecting a whole rule mutes every finding under it for sixty days, and
    // unlike an accept nothing about it shows up in the roadmap tomorrow.
    if (decision === 'reject' && ids.length > 3) {
      var until = new Date(Date.now() + 60 * 864e5).toISOString().slice(0, 10);
      if (!window.confirm('Reject all ' + ids.length + ' findings? Nothing changes on GitHub, and they stay off this page until ' + until + ' or until their evidence changes.')) return;
    }
    busy = true;
    lockButtons(true);
    var started = Date.now();
    ids.forEach(function (id) { outcome[id] = 'working'; });
    mark(ids, 'sending…', 'working');
    paintMeter();
    say('<span class="ap-spin">●</span> sending ' + ids.length + ' finding' + (ids.length === 1 ? '' : 's') + '…', 'working');
    gh('/repos/' + REPO + '/dispatches', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event_type: 'audit-decision', client_payload: { decision: decision, findings: ids } })
    }).then(function (res) {
      if (res.status === 401 || res.status === 403) {
        throw new Error('GitHub rejected the token (' + res.status + '). It may be expired, or missing Contents: read and write on this repository.');
      }
      if (res.status !== 204) {
        return res.text().then(function (t) { throw new Error('dispatch failed (' + res.status + ') ' + t.slice(0, 200)); });
      }
      mark(ids, 'queued', 'working');
      say('<span class="ap-spin">●</span> ' + label + ' — waiting for the lane to pick it up…', 'working');
      return findRun(started, 12);
    }).then(function (run) {
      if (!run) {
        mark(ids, 'dispatched', 'working');
        say('Dispatched, but no run appeared within a minute. Check <a href="https://github.com/' + REPO
          + '/actions/workflows/' + WORKFLOW + '" target="_blank" rel="noopener">the workflow</a> — the decision was sent, so nothing is lost.', 'warn');
        return null;
      }
      return watchRun(run, label, ids);
    }).then(function (done) {
      if (!done) return null;
      return outcomes(done.id).then(function (recorded) {
        var ok = done.conclusion === 'success';
        var tally = {};
        (recorded || []).forEach(function (d) {
          outcome[d.id] = d.outcome;
          tally[d.outcome] = (tally[d.outcome] || 0) + 1;
          var r = rowFor(d.id);
          if (r) {
            var s = r.querySelector('.ap-state');
            if (s) {
              s.textContent = d.outcome;
              s.className = 'ap-state ' + (d.outcome === 'applied' || d.outcome === 'rejected' ? 'ok' : 'bad');
            }
            r.classList.remove('working');
            if (d.outcome === 'applied' || d.outcome === 'rejected') r.classList.add('settled');
          }
        });
        if (!recorded) {
          // The run finished but the ledger has not caught up; say so rather than
          // claiming an outcome the lane never recorded.
          ids.forEach(function (id) { delete outcome[id]; });
          mark(ids, ok ? 'ran' : 'see log', ok ? 'ok' : 'bad');
        }
        var detail = recorded
          ? Object.keys(tally).map(function (k) { return tally[k] + ' ' + k; }).join(' · ')
          : (ok ? 'completed — ledger not updated yet' : 'see the run log');
        say((ok ? '✓ ' : '⚠ ') + label + ' — <strong>' + detail + '</strong> · <a href="' + done.html_url
          + '" target="_blank" rel="noopener">run log</a>'
          + '<br><span class="ap-meta">The activity log below picks this up on the next deploy, a minute or two from now.</span>',
        ok ? 'done' : 'warn');
        paintMeter();
        return null;
      });
    }).catch(function (err) {
      ids.forEach(function (id) { outcome[id] = 'failed'; });
      mark(ids, 'failed', 'bad');
      paintMeter();
      say('⚠ ' + String(err.message || err), 'warn');
    }).then(function () { busy = false; lockButtons(false); });
  }

  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-decision]');
    if (!b || b.disabled) return;
    var ids = b.dataset.ids.split(' ').filter(Boolean);
    send(b.dataset.decision, ids, b.dataset.decision + ' ' + ids.length + ' finding' + (ids.length === 1 ? '' : 's'));
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
      headers: { Authorization: 'Bearer ' + value, Accept: 'application/vnd.github+json' }
    }).then(function (r) {
      if (!r.ok) throw new Error('GitHub rejected it (' + r.status + ')');
      try { localStorage.setItem(KEY, value); } catch (err) { throw new Error('this browser refused to store it'); }
      input.value = '';
      msg.textContent = 'Connected. ✓ and ✗ are live.';
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
  apply();
})();
</script>

<footer class="site">Generated ${fmtET(NOW)} by <a href="https://github.com/${HUB}/blob/main/scripts/build_audit_page.mjs"><code>build_audit_page.mjs</code></a>
from the ledger the nightly <a href="https://github.com/${HUB}/blob/main/.github/workflows/roadmap-audit.yml">audit</a> commits ·
requirements <a href="https://github.com/${HUB}/issues/92">#92</a> and <a href="https://github.com/${HUB}/issues/109">#109</a> ·
view from the <a href="../reports/audit-view-redesign-2026-07-25/">2026-07-25 design review</a> ·
rules in <a href="https://github.com/${HUB}/blob/main/scripts/lib/audit/rules.mjs"><code>rules.mjs</code></a></footer>
</body>
</html>
`;

await fs.mkdir(path.dirname(OUT), { recursive: true });
await fs.writeFile(OUT, html);
console.log(`audit page: ${live.length} live findings across ${byRule.size} firing rules → _site/audit/index.html`);
