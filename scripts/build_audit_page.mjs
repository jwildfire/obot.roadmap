#!/usr/bin/env node
// The audit page — _site/audit/index.html (requirements #92 and #109).
//
// This is the surface the roadmap is maintained from: every finding is one 31px
// row that answers *which issue* and *what changes* without being opened, ✓/✗
// sits on the row and on the rule band above it, and the reasoning lives in a
// rail beside a table that never changes shape. The design and the seven
// decisions behind it: reports/audit-view-redesign-2026-07-25/ (@jwildfire,
// 2026-07-25, recorded on #109).
//
//   D1  Option B · Rail — compact table, detail in a persistent rail
//   D2  Dispatch per click; a rule band is one request carrying all of its ids
//   D3  ✗ on a rule band mutes the whole rule, with a confirm above 3
//   D4  The #109 activity log is a fold under the table
//   D5  Grouped by rule, worst first
//   D6  The long-form view survives as the rule reference only — the per-finding
//       cards are gone
//   D7  Between click and outcome: a pill on the row and one run panel, with the
//       outcome re-read from decisions.json rather than assumed
//
// It replaced a reading view of stacked cards that ran 7,646px for 33 findings —
// 125px each, four visible at a time. The same queue is now 31px a row.
//
// The page is generated at deploy time from the committed ledger, like every
// other page here, so it cannot drift from what the nightly audit found. The
// ledger is embedded rather than fetched: one document, no second request, no
// CDN copy to go stale against the HTML around it. The view itself is rendered
// in the browser, because sorting, filtering and grouping the queue is what this
// page is for; without JavaScript it degrades to a plain list that says so.
import fs from 'node:fs/promises';
import path from 'node:path';

import { esc, fmtET } from './lib/gh.mjs';
import { ROOT, HUB } from './lib/repos.mjs';
import { decisionUrl } from './lib/audit/render.mjs';
import { freshness, STALE_HOURS } from './lib/audit/freshness.mjs';
import { siteHeader } from './lib/nav.mjs';

const NOW = new Date();
const OUT = path.join(ROOT, '_site', 'audit', 'index.html');

// Two builds of one page (@jwildfire, 2026-07-27). The deployed copy is the
// read-only record — a public page holds no token and gets no write path, so
// the whole connect-a-PAT flow is gone. Deciding happens on the local session
// hub, whose server builds this same page with AUDIT_MODE=local: there ✓/✗
// POST finding ids to the loopback server, which spawns a Claude Code agent to
// run the apply lane on this machine. The lane's contract is unchanged — ids
// only, fresh-audit re-validation, outcomes re-read from the committed ledger.
const MODE = process.env.AUDIT_MODE === 'local' ? 'local' : 'readonly';

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

// -------------------------------------------------------------- activity log
// The ledger is the record of every decision; rendering it here is what makes
// this page the one surface (#109) — decisions are made and read in one place.
// D4 puts it in a fold under the table: read after deciding, never competing
// with the queue for space.
const OUTCOME_CLASS = {
  applied: 'released', rejected: 'design', delegated: 'development',
  blocked: 'unstaged', failed: 'drift', stale: 'unstaged',
};

function activityLog(led) {
  const all = [...(led?.decisions ?? [])].reverse();
  if (!all.length) {
    return `<details class="ap-fold" id="activity">
<summary>Activity <span class="ap-n">0</span> — no decisions yet</summary>
<p class="ap-note">Accepting or rejecting a finding records it here, with the run that carried it.</p>
</details>`;
  }
  // Group by the batch that carried it — one run, or one fallback decision issue.
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
    <span class="ap-n">${b.items.length}</span> ${pills} ${where}
    <span class="ap-meta">by @${esc(first.by ?? 'unknown')}</span></summary>
  <ul class="ap-batch-items">
${detail}
  </ul>
</details>`;
  }).join('\n');

  return `<details class="ap-fold" id="activity">
<summary>Activity <span class="ap-n">${all.length}</span> — every decision, newest first</summary>
<p class="ap-note">From <a href="decisions.json">decisions.json</a>, the same ledger the audit reads to mute rejected findings. A rejection is recorded but changes nothing on GitHub. This fold is regenerated each deploy, so a decision made a minute ago appears here a minute or two later — the run panel above the table is what reports it live.</p>
${rows}
</details>`;
}

// ------------------------------------------------------------ rule reference
// D6: the long-form view survives as this and nothing else. A rule that could
// not run says so — an empty findings list and a broken registry must not look
// alike.
function ruleReference(rules) {
  const rows = rules.map((r) => `<tr>
  <td><code>${esc(r.id)}</code></td>
  <td>${esc(r.group)}</td>
  <td>${r.error ? `<span class="status-pill drift" title="${esc(r.error)}">failed</span>`
    : r.skipped ? `<span class="status-pill unstaged" title="${esc(r.skipped)}">skipped</span>`
      : r.fired ? `<span class="status-pill development">${r.fired} firing</span>`
        : '<span class="status-pill released">quiet</span>'}</td>
  <td><strong>${esc(r.title)}</strong><br><span class="ap-note">${esc(r.why)}</span><br><span class="ap-note"><em>Fix:</em> ${esc(r.fix)}</span></td>
</tr>`).join('\n');
  const quiet = rules.filter((r) => !r.fired && !r.error && !r.skipped).length;
  return `<details class="ap-fold" id="rules">
<summary>Rules <span class="ap-n">${rules.length}</span> — ${rules.length - quiet} firing, ${quiet} quiet</summary>
<p class="ap-note">Every convention the audit knows about, and how it fared on the last run. Adding a rule is one object in <a href="https://github.com/${HUB}/blob/main/scripts/lib/audit/rules.mjs"><code>rules.mjs</code></a>.</p>
<div class="rm-scroll">
<table class="ap-rules">
<tr><th>Rule</th><th>Group</th><th>State</th><th>What it checks, and why</th></tr>
${rows}
</table>
</div>
</details>`;
}

// ------------------------------------------------------------------ noscript
// The queue is rendered in the browser. Without JavaScript this is the honest
// thing to show: the same findings, in the same order, with no way to decide
// them — rather than an empty page that reads like a clean audit.
function noscriptList(findings) {
  const rows = findings.filter((f) => !f.muted).map((f) => `<tr>
  <td><code>${esc(f.confidence)}</code></td>
  <td><a href="${esc(f.subject.url)}">${esc(shortRepo(f.subject.repo))}${f.subject.number ? `#${f.subject.number}` : ''}</a></td>
  <td>${esc(f.subject.title || f.ruleTitle)}</td>
  <td>${esc(f.proposal.summary)}</td>
</tr>`).join('\n');
  return `<noscript>
<div class="ap-noscript">
<p class="ap-notice"><strong>This page needs JavaScript to decide findings.</strong> The queue below is the same ledger, read-only. Any finding can also be applied by <a href="${esc(decisionUrl('accept', ['RULE-ID:owner/repo#123']))}">filing a decision issue</a> naming its id — the same lane handles both.</p>
<div class="rm-scroll">
<table class="ap-rules">
<tr><th>Confidence</th><th>Which issue</th><th>Title</th><th>What changes</th></tr>
${rows}
</table>
</div>
</div>
</noscript>`;
}

// ---------------------------------------------------------------------- page
const findings = ledger?.findings ?? [];
const rules = ledger?.rules ?? [];
const live = findings.filter((f) => !f.muted);
const firing = rules.filter((r) => r.fired).length;

// Only what the view reads. That is nearly all of the ledger — the rail shows
// evidence and agent prompts — but pinning the shape here means a field added to
// the audit does not silently grow the page.
const dataBlob = ledger
  ? JSON.stringify({
    generatedAt: ledger.generatedAt,
    counts: ledger.counts,
    boardReadable: ledger.boardReadable,
    rules: rules.map((r) => ({
      id: r.id, title: r.title, group: r.group, why: r.why, fix: r.fix,
      fired: r.fired ?? 0, error: r.error ?? null, skipped: r.skipped ?? null,
    })),
    findings: findings.map((f) => ({
      id: f.id, rule: f.rule, ruleTitle: f.ruleTitle, group: f.group,
      confidence: f.confidence, subject: f.subject, evidence: f.evidence ?? [],
      proposal: {
        kind: f.proposal.kind, summary: f.proposal.summary,
        ops: f.proposal.ops ?? [], prompt: f.proposal.prompt ?? '',
      },
      fingerprint: f.fingerprint, firstSeen: f.firstSeen, lastSeen: f.lastSeen,
      runs: f.runs, reappeared: f.reappeared, muted: f.muted,
      mutedUntil: f.mutedUntil, decisions: f.decisions ?? [],
    })),
  })
  : 'null';

// How old the ledger is, on the page and in both states (#201). Rendered here so
// a reader without JavaScript still gets it, and recomputed in the browser below
// against the viewer's own clock — this page is a static artifact, so a build-time
// age is the age it was published at, not the age it is being read at.
const fresh = freshness(ledger, NOW);
const freshLine = ledger
  ? `<p class="ap-fresh${fresh.ok ? '' : ' stale'}" id="ap-fresh">Last run ${esc(fmtET(ledger.generatedAt))}, ${esc(fresh.age)} before this page was built. Every count here describes the roadmap as it stood then; anything filed since is invisible to it.</p>`
  : '';

const boardNotice = ledger && !ledger.boardReadable
  ? '<p class="ap-notice">The obot Roadmap project was unreadable on the last run — every board rule was skipped, so this queue is incomplete rather than clear.</p>'
  : '';
const broken = rules.filter((r) => r.error);
const brokenNotice = broken.length
  ? `<p class="ap-notice">${broken.length} rule${broken.length === 1 ? '' : 's'} failed to run: ${broken.map((r) => esc(r.id)).join(', ')} — see the rule reference below.</p>`
  : '';

const shell = ledger
  ? `<div class="ap-shell" id="ap-shell">

  <aside class="ap-side" id="ap-side">
    <button class="ap-side-toggle" aria-expanded="true"><span aria-hidden="true">◧</span> <span class="lbl">hide filters</span></button>

    <h3>Search</h3>
    <div class="ap-search"><input type="search" data-q placeholder="issue, rule, evidence…" aria-label="Search findings"></div>

    <h3>Sweeps</h3>
    <button class="ap-sweep" data-sweep='{"conf":"high","kind":"mechanical","decided":"undecided","group":"all","repo":"all","q":""}'><b>the safe sweep</b>high confidence, mechanical, undecided</button>
    <button class="ap-sweep" data-sweep='{"kind":"agentic","conf":"all","decided":"undecided","group":"all","repo":"all","q":""}'><b>needs reading</b>every judgment call still open</button>
    <button class="ap-sweep" data-sweep='{"conf":"all","kind":"all","repo":"all","group":"all","decided":"all","q":""}'><b>everything</b>clear all filters</button>

    <h3>Confidence</h3>
    <div class="ap-facet" id="f-conf"></div>
    <h3>Change kind</h3>
    <div class="ap-facet" id="f-kind"></div>
    <h3>Rule group</h3>
    <div class="ap-facet" id="f-group"></div>
    <h3>Repository</h3>
    <div class="ap-facet" id="f-repo"></div>
    <h3>Decided</h3>
    <div class="ap-facet" id="f-decided"></div>

    <h3>Sort</h3>
    <select data-sort aria-label="Sort findings"></select>
    <label class="ap-check"><input type="checkbox" data-grouped checked> group by rule</label>
    <label class="ap-check"><input type="checkbox" data-muted> show muted</label>

    <h3>Keys</h3>
    <ul class="ap-keys">
      <li><kbd>j</kbd> <kbd>k</kbd> move</li>
      <li><kbd>a</kbd> accept · <kbd>x</kbd> reject</li>
      <li><kbd>u</kbd> clear mark · <kbd>/</kbd> search</li>
    </ul>
  </aside>

  <main class="ap-work">
    <div class="ap-workhead">
      <h1>Roadmap audit</h1>
      <span class="ap-stamp" id="ap-stamp"></span>
      <span class="ap-conn" id="ap-conn"></span>
    </div>
    ${freshLine}${boardNotice}${brokenNotice}
    <div class="ap-run" id="ap-run" hidden></div>
    <div class="ap-qbar" id="ap-qbar" hidden></div>
    <div class="ap-meter" id="ap-meter"></div>
    <div id="ap-queue"></div>
    ${noscriptList(findings)}

    <div class="ap-folds">
      ${activityLog(decisions)}
      ${ruleReference(rules)}
      <details class="ap-fold">
        <summary>How a decision travels <span class="ap-n">4 steps</span></summary>
        <p class="ap-note">Every finding here is a fact about GitHub state, produced by a deterministic rule rather than a model: the same state yields the same findings.</p>
        <ol class="ap-note">
          ${MODE === 'local'
    ? `<li><strong>✓/✗ stage a decision into a local queue</strong> — click again to unstage, and the queue survives reloads. Nothing runs until <strong>submit</strong>, which hands the batch (finding ids and nothing else) to the loopback hub server; it spawns a local Claude Code agent to run the <a href="https://github.com/${HUB}/blob/main/scripts/apply_audit_decision.mjs">apply lane</a> on this machine. No token is involved: the write authority is this machine's own, never the page's.</li>`
    : `<li>This deployed page is <strong>read-only</strong> — it holds no token and has no write path. Deciding happens on the local session hub's copy of this queue, where ✓/✗ hand finding ids to a local Claude Code agent; <a href="${esc(decisionUrl('accept', ['RULE-ID:owner/repo#123']))}" target="_blank" rel="noopener">filing a decision issue</a> naming the ids remains the fallback lane.</li>`}
          <li>The lane runs a <strong>fresh audit</strong> and re-derives what that id means. A finding the new audit no longer reports is refused as stale, and one whose source could not be read is reported blocked. What runs is never what this page said should run.</li>
          <li>A mechanical fix is applied as the operations listed in the rail; a judgment call goes to a bounded agent with the prompt shown there.</li>
          <li><strong>✗</strong> changes nothing and mutes the finding for 60 days, or until its evidence changes. Both land in the Activity fold above.</li>
        </ol>
      </details>
    </div>
  </main>

  <aside class="ap-rail" id="ap-rail"></aside>
</div>`
  : `<div class="ap-work"><h1>Roadmap audit</h1><p class="ap-notice">No audit has run yet — <code>site/audit/findings.json</code> is missing. It is written nightly by <a href="https://github.com/${HUB}/blob/main/.github/workflows/roadmap-audit.yml"><code>roadmap-audit.yml</code></a>.</p></div>`;

const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Roadmap audit · obot</title>
<link rel="stylesheet" href="../assets/styles.css">
<style>
/* The shared sheet styles the theme; this styles the queue. Every colour below
   is a token from that sheet or a status hue already used by it, so nothing here
   hard-codes a surface. */
body.audit { max-width: none; margin: 0; padding: 0; }
body.audit header.site { margin: 0; padding: .7rem 1rem .8rem; }
body.audit footer.site { margin: 0; padding: 1.2rem 1rem 1.4rem; }

.ap-notice { margin: .5rem 0; padding: .5rem .8rem; border-left: 3px solid var(--accent-bright);
  background: var(--panel); font-size: .88rem; }
.ap-note { font-size: .82rem; color: var(--muted); margin: .3rem 0; }
/* The freshness line reads as ordinary page furniture while the audit is
   current, and takes the notice treatment only once it is stale — but it is
   present either way, which is the whole point of it (#201). */
.ap-fresh { margin: .35rem 0; font-size: .82rem; color: var(--muted); }
.ap-fresh strong { color: var(--ink); font-weight: 600; }
.ap-fresh.stale { padding: .5rem .8rem; border-left: 3px solid #b42318; background: var(--panel); color: var(--ink); }
.ap-meta { font-family: var(--mono); font-size: .72rem; color: var(--faint); }
.ap-n { font: 500 .68rem/1.4 var(--mono); color: var(--muted); background: var(--card);
  border: 1px solid var(--rule); border-radius: 999px; padding: .04rem .42rem; }

/* Shell: filters | queue | rail. The queue is the only column that scrolls with
   the page, so reading a long detail never loses the controls. */
.ap-shell { display: grid; grid-template-columns: 14.5rem minmax(0, 1fr) 25rem; align-items: start; }
.ap-shell.side-out { grid-template-columns: 2.6rem minmax(0, 1fr) 25rem; }
.ap-shell.rail-out { grid-template-columns: 14.5rem minmax(0, 1fr) 2.4rem; }
.ap-shell.side-out.rail-out { grid-template-columns: 2.6rem minmax(0, 1fr) 2.4rem; }

/* ----------------------------------------------------------------- sidebar */
.ap-side { position: sticky; top: 0; height: 100vh; overflow-y: auto;
  border-right: 1px solid var(--rule); background: var(--panel); padding: .6rem .75rem 2rem; }
.side-out .ap-side { padding: .6rem .35rem; overflow: hidden; }
.side-out .ap-side > *:not(.ap-side-toggle) { display: none; }
.ap-side-toggle { display: flex; align-items: center; gap: .4rem; width: 100%; background: none;
  border: 0; padding: .15rem 0 .5rem; cursor: pointer; font: 600 .68rem/1.4 var(--mono);
  letter-spacing: .08em; text-transform: uppercase; color: var(--faint); }
.side-out .ap-side-toggle { writing-mode: vertical-rl; justify-content: flex-start; padding: .3rem 0; }
.ap-side-toggle:hover { color: var(--accent); }
.ap-side h3 { margin: .9rem 0 .3rem; font: 600 .66rem/1.4 var(--mono); letter-spacing: .09em;
  text-transform: uppercase; color: var(--faint); }
.ap-search input { width: 100%; font: 400 .82rem/1.6 var(--sans); color: var(--ink);
  background: var(--card); border: 1px solid var(--rule); border-radius: 6px; padding: .3rem .55rem; }
.ap-facet { display: flex; flex-wrap: wrap; gap: .22rem; }
.ap-facet button { font: 500 .72rem/1.4 var(--mono); color: var(--muted); cursor: pointer;
  background: var(--card); border: 1px solid var(--rule); border-radius: 999px; padding: .12rem .5rem; }
.ap-facet button:hover { border-color: var(--accent-bright); color: var(--accent); }
.ap-facet button[aria-pressed="true"] { background: var(--accent); border-color: var(--accent); color: #fff; }
.ap-facet button .n { color: inherit; opacity: .6; margin-left: .25rem; }
.ap-side select { width: 100%; font: 400 .78rem/1.5 var(--sans); color: var(--ink);
  background: var(--card); border: 1px solid var(--rule); border-radius: 6px; padding: .25rem .4rem; }
.ap-check { display: flex; align-items: center; gap: .4rem; margin-top: .35rem;
  font: 400 .76rem/1.5 var(--sans); color: var(--muted); cursor: pointer; }
.ap-keys { margin: .3rem 0 0; padding: 0; list-style: none; font: 400 .7rem/1.7 var(--mono); color: var(--faint); }
.ap-keys kbd { font: 500 .68rem/1 var(--mono); background: var(--card); border: 1px solid var(--rule);
  border-bottom-width: 2px; border-radius: 4px; padding: .08rem .3rem; color: var(--muted); }
.ap-sweep { display: block; width: 100%; text-align: left; margin: .18rem 0; cursor: pointer;
  font: 400 .76rem/1.4 var(--sans); color: var(--ink); background: var(--card);
  border: 1px solid var(--rule); border-radius: 6px; padding: .3rem .45rem; }
.ap-sweep:hover { border-color: var(--accent-bright); }
.ap-sweep b { display: block; font: 600 .72rem/1.4 var(--mono); color: var(--accent); }

/* --------------------------------------------------------------- work area */
.ap-work { min-width: 0; padding: .75rem 1rem 4rem; }
.ap-workhead { display: flex; align-items: flex-end; gap: .75rem; flex-wrap: wrap; margin-bottom: .3rem; }
.ap-workhead h1 { margin: 0; font: 400 1.45rem/1.1 var(--serif); }
.ap-stamp { font: 400 .76rem/1.5 var(--mono); color: var(--faint); }
.ap-conn { margin-left: auto; display: inline-flex; }
/* A state pill, not a control: the lane is decided at build time, so there is
   nothing here to click any more. */
.ap-conn span { font: 500 .72rem/1.4 var(--mono); color: var(--muted); cursor: help;
  background: var(--card); border: 1px solid var(--rule); border-radius: 999px; padding: .16rem .6rem; }
.ap-conn span.on { border-color: #166534; color: #166534; }

/* The queue meter: one tick per finding in table order — progress and minimap in
   the same object. Never colour alone; the readout beside it says the same thing
   in words, and every tick names its finding on hover. */
.ap-meter { display: flex; align-items: center; gap: .6rem; margin: .35rem 0 .5rem; }
.ap-meter .ticks { display: flex; gap: 2px; flex: 1 1 auto; min-width: 0; }
.ap-meter .tick { flex: 1 1 0; height: 1.1rem; min-width: 3px; padding: 0; cursor: pointer;
  background: var(--rule); border: 0; border-radius: 2px; }
.ap-meter .tick:hover { outline: 2px solid var(--accent-bright); outline-offset: 1px; }
.ap-meter .tick.accept { background: #166534; }
.ap-meter .tick.reject { background: var(--faint); }
.ap-meter .tick.working { background: var(--accent-bright); }
.ap-meter .tick.failed { background: #b42318; }
.ap-meter .tick.muted { background: repeating-linear-gradient(45deg, var(--rule) 0 3px, var(--panel) 3px 6px); }
.ap-meter .tick.hidden-by-filter { opacity: .35; }
.ap-meter .read { font: 500 .72rem/1.4 var(--mono); color: var(--muted); white-space: nowrap; }
.ap-meter .read .on { color: #166534; }

/* ------------------------------------------------------------------- table */
/* The shared sheet gives every table a 1px grid and .45rem cells; a 31px row
   wants neither, so both are re-stated rather than inherited. */
.ap-tbl { width: 100%; margin: 0; border-collapse: collapse; background: var(--card);
  border: 1px solid var(--rule); table-layout: fixed; font-size: .82rem; }
.ap-tbl th, .ap-tbl td { border: 0; padding: .18rem .45rem; vertical-align: middle; }
.ap-tbl thead th { position: sticky; top: 0; z-index: 3; background: var(--panel);
  font: 600 .64rem/1.5 var(--mono); letter-spacing: .09em; text-transform: uppercase;
  color: var(--faint); text-align: left; border-bottom: 1px solid var(--rule);
  cursor: pointer; user-select: none; white-space: nowrap; padding: .3rem .45rem; }
.ap-tbl thead th:hover { color: var(--accent); }
.ap-tbl thead th .dir { color: var(--accent); }
.ap-tbl thead th.plain, .ap-tbl thead th.plain:hover { cursor: default; color: var(--faint); }
.ap-tbl col.c-act { width: 4.1rem; }
.ap-tbl col.c-conf { width: 5.4rem; }
.ap-tbl col.c-subj { width: 8.6rem; }
.ap-tbl col.c-title { width: 28%; }
.ap-tbl col.c-kind { width: 8.4rem; }

/* Phone widths: the fixed column widths above add up to more than a 390px
   viewport, and the shared sheet's overflow-x:clip on html cuts the excess
   rather than letting it scroll. Give the queue its own scroller. Scoped to
   narrow viewports because a scroll container re-parents the sticky header,
   which is worth keeping as-is everywhere it already fits. */
@media (max-width: 40rem) {
  #ap-queue { overflow-x: auto; -webkit-overflow-scrolling: touch; }
  .ap-tbl { min-width: 34rem; }
  /* The rules and noscript tables sit in a .rm-scroll wrapper from the shared
     sheet; the floor is what stops four columns compressing to slivers. */
  .rm-scroll > .ap-rules { min-width: 30rem; }
}

/* Rule band — one line carrying the rule, its count, the single change it
   proposes when every finding under it proposes the same one, and ✓/✗ for the
   whole band. Ten of the thirteen rules that fire are that uniform. */
tr.ap-grp > td { position: sticky; top: 1.55rem; z-index: 2; background: #f4ece3;
  border-top: 1px solid var(--rule); border-bottom: 1px solid var(--rule); padding: .2rem .45rem; }
/* The band is one line: the single-change text is what gives, so ✓/✗ never
   move down a row and never move sideways between bands. */
tr.ap-grp .band { display: flex; align-items: center; gap: .5rem; flex-wrap: nowrap; }
tr.ap-grp .caret { background: none; border: 0; cursor: pointer; color: var(--muted); font-size: .8rem; padding: 0 .1rem; }
tr.ap-grp code { font: 500 .7rem/1.4 var(--mono); color: var(--accent); background: none;
  border: 0; padding: 0; white-space: nowrap; }
tr.ap-grp .rt { font: 500 .82rem/1.4 var(--sans); color: var(--ink); white-space: nowrap;
  overflow: hidden; text-overflow: ellipsis; }
tr.ap-grp .ap-n { flex: 0 0 auto; }
tr.ap-grp .same { flex: 1 1 4rem; min-width: 0; font: 400 .72rem/1.4 var(--mono); color: var(--muted);
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
tr.ap-grp .same b { color: var(--faint); font-weight: 500; }
tr.ap-grp .gact { margin-left: auto; flex: 0 0 auto; display: flex; align-items: center; gap: .3rem; }
tr.ap-grp .gact .lbl { font: 400 .68rem/1.4 var(--mono); color: var(--faint); }
tr.ap-grp .gdone { font: 500 .68rem/1.4 var(--mono); color: #166534; }

/* finding row */
tr.ap-fnd { border-bottom: 1px solid #f4ece3; cursor: pointer; }
tr.ap-fnd:hover > td { background: #fffdfa; }
tr.ap-fnd.cursor > td { background: #fff7ed; }
tr.ap-fnd.cursor > td:first-child { box-shadow: inset 3px 0 0 var(--accent-bright); }
tr.ap-fnd.s-accept > td:first-child { box-shadow: inset 3px 0 0 #166534; }
tr.ap-fnd.s-reject > td:first-child { box-shadow: inset 3px 0 0 var(--faint); }
tr.ap-fnd.s-working > td:first-child { box-shadow: inset 3px 0 0 var(--accent-bright); }
tr.ap-fnd.s-failed > td:first-child { box-shadow: inset 3px 0 0 #b42318; }
tr.ap-fnd.settled > td { color: var(--faint); }
tr.ap-fnd.settled .what, tr.ap-fnd.settled .title { text-decoration: line-through; text-decoration-color: var(--rule); }
tr.ap-fnd.is-muted { opacity: .62; }

.acts { display: flex; gap: .15rem; }
.act { width: 1.5rem; height: 1.5rem; display: grid; place-items: center; cursor: pointer;
  background: var(--card); border: 1px solid var(--rule); border-radius: 5px;
  font: 600 .8rem/1 var(--sans); color: var(--faint); padding: 0; }
.act:hover { border-color: var(--accent-bright); color: var(--accent); }
.act[disabled] { cursor: not-allowed; opacity: .45; }
.act.yes[aria-pressed="true"] { background: #166534; border-color: #166534; color: #fff; }
.act.no[aria-pressed="true"] { background: var(--muted); border-color: var(--muted); color: #fff; }
.act.sm { width: 1.3rem; height: 1.3rem; font-size: .72rem; }

/* Confidence is the one ordinal encoding on this page, and it is never colour
   alone: the dots carry the rank, the word carries the meaning, colour only
   reinforces. */
.conf { display: inline-flex; align-items: center; gap: .3rem; white-space: nowrap; }
.conf .dots { letter-spacing: -.04em; font: 500 .74rem/1 var(--mono); }
.conf .w { font: 500 .66rem/1.4 var(--mono); letter-spacing: .04em; }
.conf.high .dots, .conf.high .w { color: #b42318; }
.conf.medium .dots, .conf.medium .w { color: #92400e; }
.conf.low .dots, .conf.low .w { color: var(--muted); }

.subj { font: 500 .76rem/1.4 var(--mono); text-decoration: none; white-space: nowrap; }
.title, .what { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.title { color: var(--muted); }
.what { color: var(--ink); }

.pill { display: inline-block; font: 500 .64rem/1.5 var(--mono); letter-spacing: .04em;
  border-radius: 999px; padding: .04rem .42rem; white-space: nowrap; background: var(--panel);
  border: 1px solid var(--rule); color: var(--muted); }
.pill.judg { background: #fffbeb; border-color: #fde68a; color: #92400e; }
.pill.mech { background: var(--card); }
.pill.back { background: #fef2f2; border-color: #fecaca; color: #b42318; }
.pill.mutedp { background: var(--panel); border-style: dashed; }
/* D7 — the row says where its own decision is, between the click and the ledger. */
.pill.st-working { background: #fff7ed; border-color: var(--accent-bright); color: var(--accent); }
.pill.st-applied, .pill.st-delegated { background: #ecfdf3; border-color: #bbf7d0; color: #166534; }
.pill.st-rejected { background: var(--panel); color: var(--muted); }
.pill.st-failed, .pill.st-blocked, .pill.st-stale { background: #fef2f2; border-color: #fecaca; color: #b42318; }
.ap-spin { animation: ap-pulse 1.1s ease-in-out infinite; }
@keyframes ap-pulse { 0%, 100% { opacity: 1; } 50% { opacity: .3; } }
@media (prefers-reduced-motion: reduce) { .ap-spin { animation: none; } }

/* -------------------------------------------------------------------- rail */
.ap-rail { position: sticky; top: 0; height: 100vh; overflow-y: auto;
  border-left: 1px solid var(--rule); background: var(--card); padding: .6rem .8rem 3rem; }
.rail-out .ap-rail { padding: .6rem .3rem; overflow: hidden; }
.rail-out .ap-rail > *:not(.ap-rail-toggle) { display: none; }
.ap-rail-toggle { background: none; border: 0; cursor: pointer; padding: .1rem 0 .4rem;
  font: 600 .68rem/1.4 var(--mono); letter-spacing: .08em; text-transform: uppercase; color: var(--faint); }
.rail-out .ap-rail-toggle { writing-mode: vertical-rl; }
.ap-rail-toggle:hover { color: var(--accent); }
.ap-rail .rhead { border-bottom: 1px solid var(--rule); padding-bottom: .45rem; margin-bottom: .5rem; }
.ap-rail .rhead .line { display: flex; align-items: center; gap: .4rem; flex-wrap: wrap; }
.ap-rail .rhead h2 { margin: .25rem 0 0; font: 400 1.05rem/1.25 var(--serif); }
.ap-rail .rhead .pos { margin-left: auto; font: 400 .7rem/1.4 var(--mono); color: var(--faint); }
.ap-rail .decide { display: flex; gap: .4rem; margin: .55rem 0 .2rem; }
.ap-rail .decide button { flex: 1 1 0; cursor: pointer; padding: .35rem .4rem; border-radius: 6px;
  font: 600 .78rem/1.3 var(--sans); background: var(--card); border: 1px solid var(--rule); color: var(--muted); }
.ap-rail .decide button:hover { border-color: var(--accent-bright); color: var(--accent); }
.ap-rail .decide button[disabled] { cursor: not-allowed; opacity: .5; }
.ap-rail .decide .yes[aria-pressed="true"] { background: #166534; border-color: #166534; color: #fff; }
.ap-rail .decide .no[aria-pressed="true"] { background: var(--muted); border-color: var(--muted); color: #fff; }
.ap-rail .step { display: flex; gap: .3rem; margin-top: .35rem; }
.ap-rail .step button { flex: 1 1 0; cursor: pointer; background: var(--panel); border: 1px solid var(--rule);
  border-radius: 6px; padding: .2rem; font: 500 .7rem/1.4 var(--mono); color: var(--muted); }
.ap-rail .step button:hover { color: var(--accent); border-color: var(--accent-bright); }
.ap-rail .idle { color: var(--faint); font-size: .85rem; padding: 2rem .2rem; text-align: center; }
.ap-rail .idle b { display: block; font: 400 1.05rem/1.4 var(--serif); color: var(--muted); margin-bottom: .3rem; }

.detail { font-size: .82rem; color: var(--ink); }
.detail .dh { font: 600 .64rem/1.5 var(--mono); letter-spacing: .09em; text-transform: uppercase;
  color: var(--faint); margin: .5rem 0 .1rem; }
.detail .dh code { font-size: .9em; }
.detail p { margin: 0; }
.detail .why { color: var(--muted); }
.detail .ev { display: flex; flex-wrap: wrap; gap: .25rem; margin: 0; padding: 0; list-style: none; }
.detail .ev li { font: 400 .72rem/1.5 var(--mono); background: var(--panel); border: 1px solid var(--rule);
  border-radius: 4px; padding: .05rem .4rem; color: var(--muted); }
.detail .ops { margin: 0; padding: 0; list-style: none; }
.detail .ops li { font: 500 .74rem/1.7 var(--mono); color: var(--accent); }
.detail .ops li::before { content: "→ "; color: var(--faint); }
.detail pre.prompt { margin: 0; padding: .45rem .55rem; background: var(--panel); border: 1px solid var(--rule);
  border-left: 3px solid #fde68a; border-radius: 5px; font: 400 .73rem/1.6 var(--mono);
  color: var(--muted); white-space: pre-wrap; }
.detail .meta { font: 400 .72rem/1.6 var(--mono); color: var(--faint); }

/* --------------------------------------------------------------- run panel */
/* D7 — one panel, reporting one thing: what the lane is doing with the decision
   just sent. It is the only part of the page that moves, so it is the only part
   that gets to be loud. */
.ap-run { margin: .2rem 0 .5rem; padding: .45rem .8rem; border-radius: 6px; font-size: .84rem;
  border: 1px solid var(--rule); background: var(--card); }
.ap-run.working { border-color: var(--accent-bright); background: #fff7ed; }
.ap-run.done { border-color: #bbf7d0; background: #ecfdf3; }
.ap-run.warn { border-color: #fde68a; background: #fffbeb; }
.ap-run .ap-meta { display: block; margin-top: .2rem; }
.ap-run .ap-lane + .ap-lane { border-top: 1px dashed var(--rule); margin-top: .3rem; padding-top: .3rem; }
.ap-lane.done { color: #166534; }
.ap-lane.warn { color: #92400e; }

/* The queue bar — staged decisions waiting for an explicit submit
   (@jwildfire, 2026-07-27: "a queue of approved actions that i can submit
   whenever i want"). */
.ap-qbar { display: flex; align-items: center; gap: .6rem; flex-wrap: wrap; margin: .2rem 0 .5rem;
  padding: .45rem .8rem; border: 1px solid var(--accent-bright); border-radius: 6px;
  background: #fff7ed; font-size: .84rem; }
.ap-qbar .q-split { color: var(--muted); font-family: var(--mono); font-size: .76rem; }
.ap-qbar button { cursor: pointer; font: 600 .78rem/1.3 var(--sans); border-radius: 6px;
  padding: .3rem .7rem; border: 1px solid var(--rule); background: var(--card); color: var(--ink); }
.ap-qbar button.go { background: var(--accent); border-color: var(--accent); color: #fff; }
.ap-qbar button:hover { border-color: var(--accent-bright); }
.ap-qbar .ap-meta { flex-basis: 100%; margin: 0; }
.pill.q-accept { background: #dcfce7; border-color: #bbf7d0; color: #166534; }
.pill.q-reject { background: #f3e8dd; border-color: #e4d2bf; color: #6b4423; }

/* ------------------------------------------------------------- the folds */
.ap-folds { margin-top: 1.6rem; }
.ap-fold { border-top: 1px solid var(--rule); padding: .5rem 0; }
.ap-fold > summary { cursor: pointer; font: 500 .9rem/1.5 var(--sans); color: var(--ink); }
.ap-fold > summary:hover { color: var(--accent); }
.ap-rules { width: 100%; font-size: .82rem; margin: .4rem 0 0; }
.ap-rules th, .ap-rules td { padding: .3rem .45rem; }
details.ap-batch { border-bottom: 1px solid var(--rule); padding: .3rem 0; }
details.ap-batch > summary { cursor: pointer; display: flex; flex-wrap: wrap; align-items: baseline;
  gap: .4rem; font-size: .82rem; }
details.ap-batch > summary:hover { color: var(--accent); }
.ap-when { font-family: var(--mono); font-size: .74rem; color: var(--muted); }
.ap-batch-items { margin: .3rem 0 .2rem; padding-left: 1.1rem; font-size: .8rem; }
.ap-batch-items li { margin: .12rem 0; }
.ap-noscript { margin: 1rem 0; }
.ap-empty { padding: 2rem 1rem; text-align: center; color: var(--faint); font-size: .88rem;
  border: 1px solid var(--rule); background: var(--card); }
.ap-empty b { display: block; font: 400 1.1rem/1.4 var(--serif); color: var(--muted); margin-bottom: .2rem; }

/* ------------------------------------------------------------------ modals */
dialog.ap-dlg { border: 1px solid var(--rule); border-radius: 10px; padding: .9rem 1.1rem 1.1rem;
  max-width: 34rem; width: calc(100% - 2rem); background: var(--card); color: var(--ink); }
dialog.ap-dlg::backdrop { background: rgba(39, 24, 16, .45); }
dialog.ap-dlg h2 { margin: 0 0 .4rem; font: 400 1.15rem/1.2 var(--serif); }
dialog.ap-dlg p, dialog.ap-dlg li { font-size: .86rem; color: var(--muted); }
dialog.ap-dlg input[type="password"] { width: 100%; font: 400 .82rem/1.6 var(--mono);
  border: 1px solid var(--rule); border-radius: 6px; padding: .3rem .55rem; }
dialog.ap-dlg .row { display: flex; gap: .5rem; margin-top: .6rem; flex-wrap: wrap; }
dialog.ap-dlg button { cursor: pointer; font: 600 .8rem/1.3 var(--sans); border-radius: 6px;
  padding: .35rem .8rem; border: 1px solid var(--rule); background: var(--card); color: var(--ink); }
dialog.ap-dlg button.go { background: var(--accent); border-color: var(--accent); color: #fff; }
dialog.ap-dlg button.danger { background: #b42318; border-color: #b42318; color: #fff; }

/* Below the rail's width the three columns stack: the filters fold to the top,
   and the detail that lived beside the row renders under the table instead. */
@media (max-width: 78rem) {
  .ap-shell, .ap-shell.side-out, .ap-shell.rail-out, .ap-shell.side-out.rail-out {
    grid-template-columns: minmax(0, 1fr);
  }
  .ap-side { position: static; height: auto; border-right: 0; border-bottom: 1px solid var(--rule); }
  .ap-rail { position: static; height: auto; border-left: 0; border-top: 1px solid var(--rule); }
  /* Stacked, a collapsed pane is a row, not a column — a vertical label here
     would cost more height than the pane it hides. */
  .side-out .ap-side, .rail-out .ap-rail { padding: .5rem .8rem; overflow: visible; }
  .side-out .ap-side-toggle, .rail-out .ap-rail-toggle { writing-mode: horizontal-tb; padding: 0; }
  .ap-conn { margin-left: 0; }
}
</style>
</head>
<body class="audit">
${siteHeader({ page: 'audit', depth: 1 })}

${shell}

<dialog id="ap-confirm" class="ap-dlg">
  <h2 id="ap-confirm-title">Are you sure?</h2>
  <p id="ap-confirm-body"></p>
  <div class="row">
    <button class="danger" id="ap-confirm-yes">yes, mute them</button>
    <button id="ap-confirm-no">cancel</button>
  </div>
</dialog>

<script type="application/json" id="ap-data">${dataBlob.replace(/</g, '\\u003c')}</script>
<script>
(function () {
  'use strict';
  var raw = document.getElementById('ap-data');
  var ledger = raw ? JSON.parse(raw.textContent) : null;
  if (!ledger) return;

  var HUB = ${JSON.stringify(HUB)};
  var MODE = ${JSON.stringify(MODE)}; // 'readonly' (deployed) or 'local' (hub server)
  var CONF_RANK = { high: 0, medium: 1, low: 2 };
  var GROUP_ORDER = ['Board integrity', 'Hierarchy', 'Linkage', 'Conventions'];
  var MUTE_CONFIRM_OVER = 3; // D3

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function shortRepo(r) { return String(r || '').split('/')[1] || r || ''; }

  // -------------------------------------------------------------------- data
  var ruleById = {};
  ledger.rules.forEach(function (r) { ruleById[r.id] = r; });
  var findings = ledger.findings.map(function (f) {
    var rule = ruleById[f.rule] || { id: f.rule, title: f.ruleTitle, why: '', fix: '', group: f.group };
    var subj = f.subject.number
      ? shortRepo(f.subject.repo) + '#' + f.subject.number
      : shortRepo(f.subject.repo) + ' · convention';
    var out = {};
    for (var k in f) out[k] = f[k];
    out.rule_ = rule;
    out.subjLabel = subj;
    out.what = f.proposal.summary;
    out.ops = f.proposal.ops || [];
    out.blob = [f.id, subj, f.subject.title, f.ruleTitle, f.proposal.summary]
      .concat(f.evidence || [])
      .concat((f.proposal.ops || []).map(function (o) { return o.label; }))
      .join(' ').toLowerCase();
    return out;
  });
  var byId = {};
  findings.forEach(function (f) { byId[f.id] = f; });

  // D5: grouped by rule, worst first.
  var state = {
    q: '', conf: 'all', kind: 'all', repo: 'all', group: 'all', decided: 'all',
    sort: 'confidence', grouped: true, showMuted: false,
    collapsed: {}, cursor: null,
    // D2 revised (@jwildfire, 2026-07-27): in the local lane this IS a staging
    // area — ✓/✗ queue a decision, and nothing runs until submit hands the
    // batch to the agent. "queued" is the staged intent (persisted across
    // reloads); "sent" is what has actually gone to an agent: one entry per
    // finding, carrying the phase its run is in and, once the ledger has been
    // re-read, the outcome that actually landed.
    queued: {},
    sent: {},
  };

  // Decisions run concurrently (@jwildfire, 2026-07-27 follow-up: the lock is
  // per FINDING, never global — a row in flight disables itself and nothing
  // else). Each dispatch owns one line in the run panel until it lands.
  var lanes = {};
  var laneSeq = 0;
  var flat = [];

  function mark(id) { return state.sent[id] || null; }
  // Only these three outcomes mean the decision landed. A stale one (the fresh
  // audit no longer reports it) and a blocked one (a source could not be read)
  // both mean nothing changed, so the row stays live and decidable rather than
  // being struck through as done — the same distinction the lane draws.
  var LANDED = { applied: 1, rejected: 1, delegated: 1 };
  function settled(f) {
    var m = mark(f.id);
    return Boolean(m && m.phase === 'done' && LANDED[m.outcome]);
  }
  function actionable(f) { return !f.muted && !settled(f); }
  function inFlight(f) { var m = mark(f.id); return Boolean(m && m.phase !== 'done'); }

  // The queue survives a reload (the page regenerates whenever the ledger
  // moves) — staged intent is cheap to hold and annoying to lose. Ids that no
  // longer exist in the ledger are dropped on load.
  var QKEY = 'obot-audit-queue';
  function loadQueue() {
    if (MODE !== 'local') return;
    try {
      var q = JSON.parse(localStorage.getItem(QKEY) || '{}');
      Object.keys(q).forEach(function (id) {
        if (byId[id] && (q[id] === 'accept' || q[id] === 'reject')) state.queued[id] = q[id];
      });
    } catch (e) { /* fresh start */ }
  }
  function saveQueue() {
    if (MODE !== 'local') return;
    try { localStorage.setItem(QKEY, JSON.stringify(state.queued)); } catch (e) { /* unstored */ }
  }

  // --------------------------------------------------------------- filtering
  function pass(f) {
    var m = mark(f.id);
    var d = m ? m.decision : null;
    return (state.conf === 'all' || f.confidence === state.conf)
      && (state.kind === 'all' || f.proposal.kind === state.kind)
      && (state.repo === 'all' || f.subject.repo === state.repo)
      && (state.group === 'all' || f.group === state.group)
      && (state.decided === 'all'
        || (state.decided === 'undecided' && !d)
        || (state.decided === 'accepted' && d === 'accept')
        || (state.decided === 'rejected' && d === 'reject'))
      && (state.showMuted || !f.muted)
      && (!state.q || f.blob.indexOf(state.q) !== -1);
  }

  var SORTS = {
    confidence: function (a, b) {
      return CONF_RANK[a.confidence] - CONF_RANK[b.confidence]
        || a.rule.localeCompare(b.rule) || (a.subject.number || 0) - (b.subject.number || 0);
    },
    rule: function (a, b) {
      return GROUP_ORDER.indexOf(a.group) - GROUP_ORDER.indexOf(b.group)
        || a.rule.localeCompare(b.rule) || (a.subject.number || 0) - (b.subject.number || 0);
    },
    issue: function (a, b) {
      return a.subject.repo.localeCompare(b.subject.repo)
        || (a.subject.number || 0) - (b.subject.number || 0);
    },
    age: function (a, b) { return a.firstSeen.localeCompare(b.firstSeen) || b.runs - a.runs; },
    runs: function (a, b) { return b.runs - a.runs || CONF_RANK[a.confidence] - CONF_RANK[b.confidence]; },
    kind: function (a, b) {
      return a.proposal.kind.localeCompare(b.proposal.kind)
        || CONF_RANK[a.confidence] - CONF_RANK[b.confidence];
    },
  };
  var SORT_LABELS = {
    confidence: 'confidence, high first',
    rule: 'rule group, then rule',
    issue: 'repo and issue number',
    age: 'oldest finding first',
    runs: 'most audit runs first',
    kind: 'mechanical before judgment',
  };

  function view() {
    var list = findings.filter(pass).slice().sort(SORTS[state.sort] || SORTS.confidence);
    if (!state.grouped) return [{ rule: null, items: list }];
    var order = [];
    var groups = {};
    list.forEach(function (f) {
      if (!groups[f.rule]) { groups[f.rule] = []; order.push(f.rule); }
      groups[f.rule].push(f);
    });
    // Bands keep the order the sort produced, so sorting by confidence floats the
    // rule whose worst finding is worst — which is what "worst first" means.
    return order.map(function (r) {
      return { rule: r, ruleMeta: groups[r][0].rule_, items: groups[r] };
    });
  }

  // ---------------------------------------------------------------- fragments
  function confHTML(f) {
    var dots = { high: '●●●', medium: '●●○', low: '●○○' }[f.confidence];
    return '<span class="conf ' + f.confidence + '" title="' + esc(f.confidence) + ' confidence">'
      + '<span class="dots" aria-hidden="true">' + dots + '</span>'
      + '<span class="w">' + esc(f.confidence) + '</span></span>';
  }
  function kindHTML(f) {
    return f.proposal.kind === 'agentic'
      ? '<span class="pill judg" title="A bounded agent decides how — the summary states the call it will make">judgment</span>'
      : '<span class="pill mech" title="A listed operation, applied exactly as written">mechanical</span>';
  }
  function subjHTML(f) {
    return '<a class="subj" href="' + esc(f.subject.url) + '" target="_blank" rel="noopener" title="'
      + esc(f.subject.repo) + '">' + esc(f.subjLabel) + '</a>';
  }

  // D7 — where this row's decision has got to, between the click and the ledger.
  var PHASE_WORD = { sending: 'sending', queued: 'queued', running: 'running' };
  function statusHTML(f) {
    var m = mark(f.id);
    if (!m) {
      var q = state.queued[f.id];
      return q ? '<span class="pill q-' + q + '">queued ' + (q === 'accept' ? '\u2713' : '\u2717') + '</span>' : '';
    }
    if (m.phase !== 'done') {
      return '<span class="pill st-working"><span class="ap-spin">●</span> '
        + esc(PHASE_WORD[m.phase] || m.phase) + '</span>';
    }
    var o = m.outcome || (m.decision === 'reject' ? 'rejected' : 'applied');
    return '<span class="pill st-' + esc(o) + '" title="' + esc(m.detail || '') + '">' + esc(o) + '</span>';
  }

  function actsHTML(f, size) {
    if (MODE !== 'local') return '';
    var m = mark(f.id);
    var lock = f.muted || settled(f) || (m && m.phase !== 'done');
    var dis = lock ? ' disabled' : '';
    return '<span class="acts">'
      + '<button class="act yes ' + (size || '') + '" data-act="accept" data-id="' + esc(f.id) + '"'
      + ' aria-pressed="' + Boolean((m && m.decision === 'accept') || state.queued[f.id] === 'accept') + '"' + dis
      + ' title="Accept — queue this finding for the apply agent (a)" aria-label="Accept ' + esc(f.subjLabel) + '">✓</button>'
      + '<button class="act no ' + (size || '') + '" data-act="reject" data-id="' + esc(f.id) + '"'
      + ' aria-pressed="' + Boolean((m && m.decision === 'reject') || state.queued[f.id] === 'reject') + '"' + dis
      + ' title="Reject — queue a 60-day mute (x)" aria-label="Reject ' + esc(f.subjLabel) + '">✗</button>'
      + '</span>';
  }

  function detailHTML(f) {
    var r = f.rule_;
    var prior = (f.decisions || []).length
      ? '<p class="meta">Earlier decisions: ' + f.decisions.map(function (d) {
        return esc(d.decision) + (d.outcome ? ' (' + esc(d.outcome) + ')' : '') + ' ' + esc((d.at || '').slice(0, 10));
      }).join(' · ') + '</p>'
      : '';
    var doing = f.proposal.kind === 'mechanical'
      ? '<div class="dh">What runs</div><ul class="ops">'
        + f.ops.map(function (o) { return '<li>' + esc(o.label) + '</li>'; }).join('') + '</ul>'
      : '<div class="dh">What the agent is told</div><pre class="prompt">' + esc(f.proposal.prompt || '') + '</pre>';
    return '<div class="detail">'
      + '<div class="dh">Why this is a finding — <code>' + esc(r.id) + '</code></div>'
      + '<p class="why">' + esc(r.why) + '</p>'
      + '<div class="dh">Evidence on GitHub right now</div>'
      + '<ul class="ev">' + (f.evidence || []).map(function (e) { return '<li>' + esc(e) + '</li>'; }).join('') + '</ul>'
      + '<div class="dh">Proposed change</div><p>' + esc(f.proposal.summary) + '</p>'
      + doing
      + '<div class="dh">Provenance</div>'
      + '<p class="meta">' + esc(f.id) + ' · fingerprint ' + esc(f.fingerprint)
      + ' · seen in ' + f.runs + ' run' + (f.runs === 1 ? '' : 's') + ' since ' + esc(f.firstSeen)
      + (f.reappeared ? ' · applied before and back again' : '')
      + (f.muted ? ' · muted until ' + esc(f.mutedUntil || '') : '')
      + ' · <a href="' + esc(f.subject.url) + '" target="_blank" rel="noopener">open ' + esc(f.subjLabel) + '</a>'
      + ' · <a href="https://github.com/' + HUB + '/blob/main/scripts/lib/audit/rules.mjs" target="_blank" rel="noopener">rule source</a></p>'
      + prior + '</div>';
  }

  // --------------------------------------------------------------- the rows
  function rowHTML(f) {
    var m = mark(f.id);
    var cls = 'ap-fnd';
    if (m) cls += ' s-' + (m.phase !== 'done' ? 'working' : !LANDED[m.outcome] ? 'failed' : m.decision);
    if (settled(f)) cls += ' settled';
    if (f.muted) cls += ' is-muted';
    if (state.cursor === f.id) cls += ' cursor';
    var flags = (f.reappeared ? '<span class="pill back" title="Applied before, and the audit reports it again">back again</span>' : '')
      + (f.muted ? '<span class="pill mutedp" title="Rejected — muted until ' + esc(f.mutedUntil || '') + '">muted</span>' : '');
    return '<tr class="' + cls + '" data-id="' + esc(f.id) + '">'
      + '<td>' + actsHTML(f) + '</td>'
      + '<td>' + confHTML(f) + '</td>'
      + '<td>' + subjHTML(f) + '</td>'
      + '<td><span class="title" title="' + esc(f.subject.title) + '">' + esc(f.subject.title || f.ruleTitle) + '</span></td>'
      + '<td><span class="what" title="' + esc(f.what) + '">' + esc(f.what) + '</span></td>'
      + '<td>' + (m || state.queued[f.id] ? statusHTML(f) : kindHTML(f)) + flags + '</td>'
      + '</tr>';
  }

  function bandHTML(g) {
    var items = g.items;
    var open = items.filter(function (f) { return actionable(f) && !inFlight(f); });
    var done = items.length - open.length;
    var collapsed = Boolean(state.collapsed[g.rule]);
    // C's contribution to this build: when every finding under a rule proposes
    // the identical change, the band says it once instead of the rows saying it
    // N times. Eight of the thirteen firing rules read "Assign @jwildfire".
    var seen = {};
    items.forEach(function (f) { seen[f.what] = 1; });
    var only = Object.keys(seen);
    var same = only.length === 1
      ? '<span class="same" title="' + esc(only[0]) + '"><b>all ' + items.length + ' ·</b> ' + esc(only[0]) + '</span>'
      : '';
    var lock = !open.length;
    return '<tr class="ap-grp"><td colspan="6"><div class="band">'
      + '<button class="caret" data-collapse="' + esc(g.rule) + '" aria-expanded="' + !collapsed
      + '" aria-label="' + (collapsed ? 'Expand' : 'Collapse') + ' ' + esc(g.rule) + '">' + (collapsed ? '▸' : '▾') + '</button>'
      + '<code>' + esc(g.rule) + '</code>'
      + '<span class="rt">' + esc(g.ruleMeta.title) + '</span>'
      + '<span class="ap-n">' + items.length + '</span>'
      + same
      + '<span class="gact">'
      + (done ? '<span class="gdone">' + done + '/' + items.length + ' decided</span>' : '')
      + (MODE !== 'local' ? '' : (open.length ? '<span class="lbl">all ' + open.length + '</span>' : '')
      + '<button class="act yes sm" data-gact="accept" data-rule="' + esc(g.rule) + '"' + (lock ? ' disabled' : '')
      + ' title="Accept all ' + open.length + ' shown findings of this rule — one request" aria-label="Accept all ' + open.length + ' findings of ' + esc(g.rule) + '">✓</button>'
      + '<button class="act no sm" data-gact="reject" data-rule="' + esc(g.rule) + '"' + (lock ? ' disabled' : '')
      + ' title="Reject all ' + open.length + ' shown findings of this rule — mutes them for 60 days" aria-label="Reject all ' + open.length + ' findings of ' + esc(g.rule) + '">✗</button>')
      + '</span></div></td></tr>'
      + (collapsed ? '' : items.map(rowHTML).join(''));
  }

  function meterHTML() {
    var ticks = findings.map(function (f) {
      var m = mark(f.id);
      var cls = f.muted ? 'muted'
        : !m ? ''
          : m.phase !== 'done' ? 'working'
            : !LANDED[m.outcome] ? 'failed'
              : m.decision === 'accept' ? 'accept' : 'reject';
      var label = f.subjLabel + ' — ' + f.what + (m ? ' (' + (m.outcome || m.phase) + ')' : '');
      return '<button class="tick ' + cls + (pass(f) ? '' : ' hidden-by-filter') + '" data-jump="'
        + esc(f.id) + '" title="' + esc(label) + '" aria-label="' + esc(label) + '"></button>';
    }).join('');
    var a = 0; var r = 0; var lost = 0;
    Object.keys(state.sent).forEach(function (id) {
      var m = state.sent[id];
      // A decision that did not land is not a decision cleared — say so rather
      // than counting it as accepted.
      if (m.phase === 'done' && !LANDED[m.outcome]) { lost++; return; }
      if (m.decision === 'accept') a++; else r++;
    });
    var left = findings.filter(function (f) { return actionable(f) && !mark(f.id); }).length;
    var q = Object.keys(state.queued).length;
    return '<div class="ticks" role="group" aria-label="Decision queue">' + ticks + '</div>'
      + '<span class="read">' + (q ? '<span class="on">' + q + ' queued</span> · ' : '')
      + '<span class="on">' + a + ' accepted</span> · ' + r + ' rejected · '
      + (lost ? lost + ' did not land · ' : '') + left + ' to go</span>';
  }

  function railHTML() {
    var f = null;
    for (var i = 0; i < flat.length; i++) if (flat[i].id === state.cursor) f = flat[i];
    var toggle = '<button class="ap-rail-toggle" data-rail-toggle aria-expanded="true">detail ▸</button>';
    if (!f) {
      return toggle + '<div class="idle"><b>Nothing selected.</b>Click a row, or press <kbd>j</kbd> to start at the top of the queue.</div>';
    }
    var m = mark(f.id);
    var lock = f.muted || settled(f) || (m && m.phase !== 'done');
    var idx = flat.indexOf(f);
    return toggle
      + '<div class="rhead">'
      + '<div class="line">' + confHTML(f) + ' ' + subjHTML(f) + ' ' + kindHTML(f) + statusHTML(f)
      + '<span class="pos">' + (idx + 1) + ' of ' + flat.length + '</span></div>'
      + '<h2>' + esc(f.subject.title || f.ruleTitle) + '</h2>'
      + (MODE !== 'local' ? '' : '<div class="decide">'
      + '<button class="yes" data-act="accept" data-id="' + esc(f.id) + '" aria-pressed="'
      + Boolean(m && m.decision === 'accept') + '"' + (lock ? ' disabled' : '') + '>✓ Accept</button>'
      + '<button class="no" data-act="reject" data-id="' + esc(f.id) + '" aria-pressed="'
      + Boolean(m && m.decision === 'reject') + '"' + (lock ? ' disabled' : '') + '>✗ Reject</button>'
      + '</div>')
      + '<div class="step"><button data-step="-1">↑ previous</button><button data-step="1">next ↓</button></div>'
      + '</div>'
      + detailHTML(f);
  }

  // ------------------------------------------------------------------ render
  var queueEl = document.getElementById('ap-queue');
  var meterEl = document.getElementById('ap-meter');
  var railEl = document.getElementById('ap-rail');
  var runPanel = document.getElementById('ap-run');
  var qbarEl = document.getElementById('ap-qbar');
  var connSlot = document.getElementById('ap-conn');
  var shellEl = document.getElementById('ap-shell');

  function render() {
    var groups = view();
    flat = [];
    groups.forEach(function (g) {
      if (!g.rule || !state.collapsed[g.rule]) flat = flat.concat(g.items);
    });
    var stillThere = false;
    for (var i = 0; i < flat.length; i++) if (flat[i].id === state.cursor) stillThere = true;
    if (!stillThere) state.cursor = null;

    function th(key, label, plain) {
      return '<th' + (plain ? ' class="plain"' : ' data-sortby="' + key + '"') + '>' + label
        + (!plain && state.sort === key ? ' <span class="dir">↓</span>' : '') + '</th>';
    }

    queueEl.innerHTML = flat.length || groups.length
      ? '<table class="ap-tbl">'
        + '<colgroup><col class="c-act"><col class="c-conf"><col class="c-subj"><col class="c-title"><col><col class="c-kind"></colgroup>'
        + '<thead><tr>'
        + th('', MODE === 'local' ? 'decide' : '', true) + th('confidence', 'conf') + th('issue', 'which issue')
        + th('rule', 'title') + th('', 'what changes', true) + th('kind', 'kind / state')
        + '</tr></thead><tbody>'
        + groups.map(function (g) {
          return g.rule ? bandHTML(g) : g.items.map(rowHTML).join('');
        }).join('')
        + '</tbody></table>'
      : '<div class="ap-empty"><b>Nothing matches.</b>Loosen a filter, or clear the search.</div>';

    meterEl.innerHTML = meterHTML();
    railEl.innerHTML = railHTML();

    var qIds = Object.keys(state.queued);
    qbarEl.hidden = !qIds.length;
    if (qIds.length) {
      var qa = qIds.filter(function (id) { return state.queued[id] === 'accept'; }).length;
      qbarEl.innerHTML = '<b>' + qIds.length + ' queued</b><span class="q-split">'
        + (qa ? qa + ' accept' : '') + (qa && qIds.length - qa ? ' · ' : '') + (qIds.length - qa ? (qIds.length - qa) + ' reject' : '')
        + '</span><button class="go" id="ap-submit">submit to the agent</button>'
        + '<button id="ap-qclear">clear queue</button>'
        + '<span class="ap-meta">Nothing runs until you submit. The queue survives reloads.</span>';
    } else { qbarEl.innerHTML = ''; }
  }

  function move(step) {
    if (!flat.length) return;
    var i = -1;
    for (var n = 0; n < flat.length; n++) if (flat[n].id === state.cursor) i = n;
    var next = Math.max(0, Math.min(flat.length - 1, i < 0 ? 0 : i + step));
    state.cursor = flat[next].id;
    render();
    var row = document.querySelector('tr.ap-fnd.cursor');
    if (row) row.scrollIntoView({ block: 'nearest' });
  }

  // -------------------------------------------------------------- the lane
  // Click → POST to the loopback hub server → a local Claude Code agent runs
  // the apply lane on this machine → the outcome is re-read from the ledger the
  // agent committed, never assumed (D7). The decision carries finding ids and
  // nothing else, and the lane re-validates every one of them against a fresh
  // audit before it changes anything. A page cannot be trusted, and is not —
  // and it no longer holds anything worth stealing: the token flow is gone
  // (@jwildfire, 2026-07-27), so the deployed copy is simply read-only.
  var confirmDlg = document.getElementById('ap-confirm');

  function paintConnection() {
    connSlot.innerHTML = '';
    var b = document.createElement('span');
    if (MODE === 'local') {
      b.className = 'on';
      b.textContent = 'local lane — stage ✓/✗, submit when ready';
      b.title = 'Decisions POST to the loopback hub server, which spawns a Claude Code agent to re-validate ids against a fresh audit and apply. No token, no remote write path.';
    } else {
      b.textContent = 'read-only — decide from the local hub';
      b.title = 'The deployed page holds no token and cannot write. Open the session hub audit server locally to decide findings; filing an audit-decision issue remains the fallback.';
    }
    connSlot.appendChild(b);
  }

  function say(key, html, cls) {
    lanes[key] = { html: html, cls: cls || '' };
    var keys = Object.keys(lanes);
    runPanel.hidden = !keys.length;
    runPanel.className = 'ap-run';
    runPanel.innerHTML = keys.map(function (k) {
      return '<div class="ap-lane ' + lanes[k].cls + '">' + lanes[k].html + '</div>';
    }).join('');
  }

  function setPhase(ids, phase, extra) {
    ids.forEach(function (id) {
      var m = state.sent[id] || {};
      m.phase = phase;
      if (extra) for (var k in extra) m[k] = extra[k];
      state.sent[id] = m;
    });
  }

  // What actually landed comes from the ledger the agent commits, not from this
  // page's assumption — the server reads site/audit/decisions.json fresh from
  // the checkout on every poll, and reports the job's own state beside it.
  // Lane-keyed: several submits can be in flight, each with its own line.
  function poll(key, job, decisionOf, ids, label, started, tries) {
    return fetch('/api/audit/state?job=' + encodeURIComponent(job || '')
      + '&ids=' + encodeURIComponent(ids.join(',')))
      .then(function (r) { return r.json(); })
      .then(function (s) {
        var landed = {};
        (s.decisions || []).forEach(function (d) {
          if (new Date(d.at).getTime() >= started - 60000) landed[d.id] = d;
        });
        var all = ids.every(function (id) { return landed[id]; });
        var terminal = Boolean(s.job && s.job.terminal);
        if (!all && !terminal && tries > 0) {
          var word = (s.job && (s.job.detail || s.job.state)) || 'working';
          say(key, '<span class="ap-spin">●</span> ' + esc(label) + ' — agent <strong>' + esc(word) + '</strong>', 'working');
          return new Promise(function (res) { setTimeout(res, 5000); }).then(function () {
            return poll(key, job, decisionOf, ids, label, started, tries - 1);
          });
        }
        var tally = {};
        ids.forEach(function (id) {
          var d = landed[id];
          var outcome = d ? d.outcome : 'failed';
          state.sent[id] = Object.assign(state.sent[id] || {}, {
            phase: 'done', decision: decisionOf[id], outcome: outcome,
            detail: d ? d.detail
              : (terminal ? 'the agent finished without recording this id — check its job output'
                : 'timed out waiting for the agent — it may still be working; press u to clear and re-check later'),
          });
          tally[outcome] = (tally[outcome] || 0) + 1;
        });
        var ok = ids.every(function (id) { return landed[id] && LANDED[landed[id].outcome]; });
        var summary = Object.keys(tally).map(function (k) { return tally[k] + ' ' + k; }).join(' · ');
        say(key, (ok ? '\u2713 ' : '\u26a0 ') + esc(label) + ' — <strong>' + esc(summary) + '</strong>'
          + '<span class="ap-meta">Read from the ledger the agent committed. The deployed page catches up on its next deploy.</span>', ok ? 'done' : 'warn');
        return null;
      });
  }

  function send(batch, ids, label) {
    if (MODE !== 'local' || !ids.length) return;
    var key = 'd' + (++laneSeq);
    var started = Date.now();
    var decisionOf = {};
    batch.forEach(function (b) { b.findings.forEach(function (id) { decisionOf[id] = b.decision; }); });
    ids.forEach(function (id) {
      state.sent[id] = { phase: 'sending', decision: decisionOf[id], outcome: null, detail: null };
    });
    render();
    say(key, '<span class="ap-spin">●</span> handing ' + ids.length + ' finding' + (ids.length === 1 ? '' : 's') + ' to the apply agent…', 'working');

    fetch('/api/audit/decision', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ batch: batch, label: label }),
    }).then(function (res) {
      return res.json().catch(function () { return {}; }).then(function (b) {
        if (!res.ok) throw new Error(b.error || ('the hub server refused the decision (' + res.status + ')'));
        return b;
      });
    }).then(function (b) {
      ids.forEach(function (id) { state.sent[id].phase = 'running'; state.sent[id].job = b.job; });
      render();
      say(key, '<span class="ap-spin">●</span> ' + esc(label) + ' — agent <code>' + esc(b.job || '?') + '</code> spawned…', 'working');
      return poll(key, b.job, decisionOf, ids, label, started, 240); // ~20 min at 5s
    }).catch(function (err) {
      ids.forEach(function (id) {
        state.sent[id] = { phase: 'done', decision: decisionOf[id], outcome: 'failed', detail: String(err.message || err) };
      });
      say(key, '\u26a0 ' + esc(String(err.message || err))
        + '<span class="ap-meta">Is the hub audit server still running? Press <kbd>u</kbd> on a row to clear its mark and re-queue.</span>', 'warn');
    }).then(function () { render(); });
  }

  // Submit hands the whole queue over at once: one agent, one fresh audit, one
  // commit. Rejects above the D3 threshold still confirm — a mute is invisible
  // for 60 days, so the deliberate step survives the queue model.
  function submit() {
    var qIds = Object.keys(state.queued);
    if (!qIds.length) return;
    var acc = qIds.filter(function (id) { return state.queued[id] === 'accept'; });
    var rej = qIds.filter(function (id) { return state.queued[id] === 'reject'; });
    var go = function () {
      var batch = [];
      if (acc.length) batch.push({ decision: 'accept', findings: acc });
      if (rej.length) batch.push({ decision: 'reject', findings: rej });
      var label = 'submit ' + qIds.length + ' decision' + (qIds.length === 1 ? '' : 's')
        + (acc.length ? ' · ' + acc.length + ' accept' : '') + (rej.length ? ' · ' + rej.length + ' reject' : '');
      qIds.forEach(function (id) { delete state.queued[id]; });
      saveQueue();
      send(batch, qIds, label);
    };
    if (rej.length > MUTE_CONFIRM_OVER) {
      ask('Mute ' + rej.length + ' findings?',
        'This submit mutes ' + rej.length + ' findings for 60 days, or until their evidence changes'
        + (acc.length ? ', and applies ' + acc.length + ' accept' + (acc.length === 1 ? '' : 's') : '') + '.',
        go);
      return;
    }
    go();
  }

  function ask(title, body, onYes) {
    document.getElementById('ap-confirm-title').textContent = title;
    document.getElementById('ap-confirm-body').textContent = body;
    confirmDlg._yes = onYes;
    confirmDlg.showModal();
  }
  document.getElementById('ap-confirm-yes').addEventListener('click', function () {
    var fn = confirmDlg._yes;
    confirmDlg._yes = null;
    confirmDlg.close();
    if (fn) fn();
  });
  document.getElementById('ap-confirm-no').addEventListener('click', function () {
    confirmDlg._yes = null;
    confirmDlg.close();
  });

  function decideOne(id, decision) {
    var f = byId[id];
    if (MODE !== 'local' || !f || !actionable(f) || inFlight(f)) return;
    if (state.queued[id] === decision) delete state.queued[id];
    else state.queued[id] = decision;
    saveQueue();
    render();
  }

  // A band click stages every decidable finding under the rule; clicking the
  // same button again unstages them. The D3 mute-confirm moved to submit time —
  // staging is free and reversible, the submit is the deliberate act.
  function decideBand(rule, decision) {
    if (MODE !== 'local') return;
    var g = null;
    view().forEach(function (x) { if (x.rule === rule) g = x; });
    if (!g) return;
    var ids = g.items.filter(function (f) { return actionable(f) && !inFlight(f); }).map(function (f) { return f.id; });
    if (!ids.length) return;
    var allSet = ids.every(function (id) { return state.queued[id] === decision; });
    ids.forEach(function (id) { if (allSet) delete state.queued[id]; else state.queued[id] = decision; });
    saveQueue();
    render();
  }

  // ------------------------------------------------------------------ wiring
  shellEl.addEventListener('click', function (e) {
    var act = e.target.closest('[data-act]');
    if (act) {
      if (act.disabled) return;
      state.cursor = act.dataset.id;
      decideOne(act.dataset.id, act.dataset.act);
      return;
    }
    var gact = e.target.closest('[data-gact]');
    if (gact) { if (!gact.disabled) decideBand(gact.dataset.rule, gact.dataset.gact); return; }
    var col = e.target.closest('[data-collapse]');
    if (col) {
      var r = col.dataset.collapse;
      if (state.collapsed[r]) delete state.collapsed[r]; else state.collapsed[r] = 1;
      render();
      return;
    }
    var step = e.target.closest('[data-step]');
    if (step) { move(Number(step.dataset.step)); return; }
    var rt = e.target.closest('[data-rail-toggle]');
    if (rt) {
      shellEl.classList.toggle('rail-out');
      var railOut = shellEl.classList.contains('rail-out');
      rt.textContent = railOut ? 'detail ◂' : 'detail ▸';
      rt.setAttribute('aria-expanded', String(!railOut));
      return;
    }
    var st = e.target.closest('.ap-side-toggle');
    if (st) {
      shellEl.classList.toggle('side-out');
      var sideOut = shellEl.classList.contains('side-out');
      st.setAttribute('aria-expanded', String(!sideOut));
      st.querySelector('.lbl').textContent = sideOut ? 'filters' : 'hide filters';
      return;
    }
    var facet = e.target.closest('[data-facet]');
    if (facet) { state[facet.dataset.facet] = facet.dataset.value; paintFacets(); render(); return; }
    var sweep = e.target.closest('[data-sweep]');
    if (sweep) {
      Object.assign(state, JSON.parse(sweep.dataset.sweep));
      var qbox = document.querySelector('[data-q]');
      if (qbox) qbox.value = state.q;
      paintFacets();
      render();
      return;
    }
    var jump = e.target.closest('[data-jump]');
    if (jump) {
      state.cursor = jump.dataset.jump;
      render();
      var target = document.querySelector('tr.ap-fnd.cursor');
      if (target) target.scrollIntoView({ block: 'center', behavior: 'smooth' });
      return;
    }
    var row = e.target.closest('tr.ap-fnd');
    if (row && !e.target.closest('a')) { state.cursor = row.dataset.id; render(); return; }
    var sortBy = e.target.closest('[data-sortby]');
    if (sortBy && sortBy.dataset.sortby) {
      state.sort = sortBy.dataset.sortby;
      var sel = document.querySelector('[data-sort]');
      if (sel) sel.value = state.sort;
      render();
    }
  });

  shellEl.addEventListener('input', function (e) {
    if (e.target.matches('[data-q]')) { state.q = e.target.value.trim().toLowerCase(); render(); }
  });
  shellEl.addEventListener('change', function (e) {
    if (e.target.matches('[data-sort]')) { state.sort = e.target.value; render(); }
    if (e.target.matches('[data-grouped]')) { state.grouped = e.target.checked; render(); }
    if (e.target.matches('[data-muted]')) { state.showMuted = e.target.checked; render(); }
  });

  // j/k move, a/x decide, u clears a row's mark so a failed send can be retried,
  // Enter advances, / searches.
  document.addEventListener('keydown', function (e) {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (document.querySelector('dialog[open]')) return;
    var typing = /^(input|textarea|select)$/i.test(e.target.tagName);
    if (e.key === '/' && !typing) {
      e.preventDefault();
      var box = document.querySelector('[data-q]');
      if (box) box.focus();
      return;
    }
    if (typing) { if (e.key === 'Escape') e.target.blur(); return; }
    var map = {
      j: function () { move(1); }, ArrowDown: function () { move(1); },
      k: function () { move(-1); }, ArrowUp: function () { move(-1); },
      a: function () { if (state.cursor) decideOne(state.cursor, 'accept'); },
      x: function () { if (state.cursor) decideOne(state.cursor, 'reject'); },
      u: function () { if (!state.cursor) return; if (state.queued[state.cursor]) { delete state.queued[state.cursor]; saveQueue(); } else { delete state.sent[state.cursor]; } render(); },
      Enter: function () { move(1); },
      Escape: function () { state.cursor = null; render(); },
    };
    if (map[e.key]) { e.preventDefault(); map[e.key](); }
  });

  // ------------------------------------------------------------------ facets
  function facetHTML(groupName, values, counts) {
    return values.map(function (v) {
      var on = state[groupName] === v.value;
      var n = counts ? counts[v.value] : null;
      return '<button data-facet="' + groupName + '" data-value="' + esc(v.value) + '" aria-pressed="' + on + '">'
        + esc(v.label) + (n == null ? '' : '<span class="n">' + n + '</span>') + '</button>';
    }).join('');
  }

  var repos = [];
  findings.forEach(function (f) { if (repos.indexOf(f.subject.repo) === -1) repos.push(f.subject.repo); });
  repos.sort();
  function count(key, val) {
    return findings.filter(function (f) { return !f.muted && key(f) === val; }).length;
  }

  function paintFacets() {
    document.getElementById('f-conf').innerHTML = facetHTML('conf',
      [{ value: 'all', label: 'all' }, { value: 'high', label: 'high' },
        { value: 'medium', label: 'medium' }, { value: 'low', label: 'low' }],
      { high: ledger.counts.high, medium: ledger.counts.medium, low: ledger.counts.low });
    document.getElementById('f-kind').innerHTML = facetHTML('kind',
      [{ value: 'all', label: 'all' }, { value: 'mechanical', label: 'mechanical' },
        { value: 'agentic', label: 'judgment' }],
      { mechanical: ledger.counts.mechanical, agentic: ledger.counts.agentic });
    var groupCounts = {};
    GROUP_ORDER.forEach(function (g) { groupCounts[g] = count(function (f) { return f.group; }, g); });
    document.getElementById('f-group').innerHTML = facetHTML('group',
      [{ value: 'all', label: 'all' }].concat(GROUP_ORDER.map(function (g) {
        return { value: g, label: g.toLowerCase() };
      })), groupCounts);
    var repoCounts = {};
    repos.forEach(function (r) { repoCounts[r] = count(function (f) { return f.subject.repo; }, r); });
    document.getElementById('f-repo').innerHTML = facetHTML('repo',
      [{ value: 'all', label: 'all' }].concat(repos.map(function (r) {
        return { value: r, label: shortRepo(r) };
      })), repoCounts);
    document.getElementById('f-decided').innerHTML = facetHTML('decided',
      [{ value: 'all', label: 'all' }, { value: 'undecided', label: 'undecided' },
        { value: 'accepted', label: 'accepted' }, { value: 'rejected', label: 'rejected' }]);
  }

  var sortSel = document.querySelector('[data-sort]');
  sortSel.innerHTML = Object.keys(SORT_LABELS).map(function (v) {
    return '<option value="' + v + '">' + SORT_LABELS[v] + '</option>';
  }).join('');
  sortSel.value = state.sort;

  // #201 — the age, against the reader's clock rather than the builder's. This
  // page is a static artifact: a build-time age is how old the ledger was when
  // the page was published, which is not the question a reader is asking.
  var STALE_HOURS = ${STALE_HOURS};
  function ageWords(hours) {
    if (!isFinite(hours)) return null;
    if (hours < 1) return Math.max(0, Math.round(hours * 60)) + 'm';
    if (hours < 24) return Math.round(hours) + 'h';
    return Math.round(hours / 24) + 'd';
  }
  var stampedAt = Date.parse(ledger.generatedAt);
  var ageHours = (Date.now() - stampedAt) / 3600000;
  var ageText = ageWords(ageHours);
  var freshEl = document.getElementById('ap-fresh');
  if (freshEl && ageText) {
    var stale = ageHours > STALE_HOURS;
    freshEl.className = 'ap-fresh' + (stale ? ' stale' : '');
    freshEl.innerHTML = 'This audit last ran <strong>' + esc(ageText) + ' ago</strong> — '
      + esc(String(ledger.generatedAt)) + '. '
      + (stale
        ? 'That is past the ' + STALE_HOURS + '-hour mark for a nightly job, so the queue below describes the roadmap as it was, not as it is.'
        : 'Every count below describes the roadmap as it stood then; anything filed since is invisible to it.');
  }

  document.getElementById('ap-stamp').textContent = ledger.counts.total + ' findings · '
    + ledger.rules.filter(function (r) { return r.fired; }).length + ' of ' + ledger.rules.length
    + ' rules firing · run ' + String(ledger.generatedAt).slice(0, 10)
    + (ageText ? ', ' + ageText + ' ago' : '');

  // The roadmap page's Audit fold links here per rule (#rule-RULE-ID). Those
  // anchors used to be section headings; the queue has no sections, so the link
  // arrives as a search for that rule instead — same intent, one surface.
  var deep = /^#rule-(.+)$/.exec(String(location.hash || ''));
  if (deep) {
    state.q = decodeURIComponent(deep[1]).toLowerCase();
    var deepBox = document.querySelector('[data-q]');
    if (deepBox) deepBox.value = state.q;
  }

  qbarEl.addEventListener('click', function (e) {
    if (e.target.id === 'ap-submit') submit();
    else if (e.target.id === 'ap-qclear') { state.queued = {}; saveQueue(); render(); }
  });

  loadQueue();
  paintFacets();
  paintConnection();
  render();
}());
</script>

<footer class="site">Generated ${fmtET(NOW)} by <a href="https://github.com/${HUB}/blob/main/scripts/build_audit_page.mjs"><code>build_audit_page.mjs</code></a>
from the ledger the nightly <a href="https://github.com/${HUB}/blob/main/.github/workflows/roadmap-audit.yml">audit</a> commits ·
${live.length} live finding${live.length === 1 ? '' : 's'}, ${firing} of ${rules.length} rules firing ·
requirements <a href="https://github.com/${HUB}/issues/92">#92</a> and <a href="https://github.com/${HUB}/issues/109">#109</a> ·
rules in <a href="https://github.com/${HUB}/blob/main/scripts/lib/audit/rules.mjs"><code>rules.mjs</code></a></footer>
</body>
</html>
`;

await fs.mkdir(path.dirname(OUT), { recursive: true });
await fs.writeFile(OUT, html);
console.log(`audit page: ${live.length} live findings, ${firing}/${rules.length} rules firing → _site/audit/index.html`);
