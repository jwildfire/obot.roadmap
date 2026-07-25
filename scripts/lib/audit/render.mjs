// The roadmap page's Audit section (#92) — findings and rules, collapsed by
// default, each finding with an accept/reject control.
//
// The hard constraint: GitHub Pages is static, so a button cannot call an agent.
// What a static page CAN do is hand @jwildfire a prefilled GitHub issue. So
// "accept" opens a decision issue labelled `audit-decision` naming the finding
// ids; opening it fires roadmap-audit-apply.yml, which re-validates each finding
// against a fresh audit and applies it. Two clicks, no token in a public page,
// and the decision itself is the audit trail.
//
// The buttons carry finding IDS and never operations: a URL is user-editable
// input, so the only thing it is trusted to say is *which* finding was accepted.
// What that means is re-derived server-side.
import { esc, fmtET, age } from '../gh.mjs';
import { HUB } from '../repos.mjs';

// One URL should not carry an unbounded list; past this a bulk accept is split
// and the page says so rather than silently truncating.
export const MAX_BULK = 40;

const CONFIDENCE = [
  { key: 'high', label: 'High confidence', blurb: 'Deterministic detection and an unambiguous fix.' },
  { key: 'medium', label: 'Medium confidence', blurb: 'Detection is solid; the fix is a judgment call the proposal states outright.' },
  { key: 'low', label: 'Low confidence', blurb: 'Heuristic detection, or an open convention question.' },
];

const shortRepo = (r) => (r ?? '').split('/')[1] ?? r ?? '';

export function decisionUrl(decision, ids, { title = null } = {}) {
  const list = ids.slice(0, MAX_BULK);
  const subject = title ?? (list.length === 1 ? list[0] : `${list.length} findings`);
  const body = [
    `decision: ${decision}`,
    '',
    'findings:',
    ...list.map((id) => `- ${id}`),
    '',
    `Submitting this issue hands the ${decision === 'accept' ? 'accepted' : 'rejected'} finding${list.length === 1 ? '' : 's'} to the audit apply lane ([#92](https://github.com/${HUB}/issues/92)).`,
    decision === 'accept'
      ? 'Each one is re-validated against a fresh audit before anything changes; mechanical fixes run as listed ops, judgment calls go to a bounded agent. The lane comments what it did and closes this issue.'
      : 'Nothing is changed. Each rejected finding is muted for 60 days, or until its evidence changes.',
  ].join('\n');
  const params = new URLSearchParams({
    labels: 'audit-decision',
    title: `audit: ${decision} ${subject}`,
    body,
  });
  return `https://github.com/${HUB}/issues/new?${params.toString()}`;
}

const btn = (decision, ids, label, extra = '') => {
  if (!ids.length) return '';
  const url = decisionUrl(decision, ids);
  const overflow = ids.length > MAX_BULK ? ` (first ${MAX_BULK} of ${ids.length})` : '';
  return `<a class="audit-btn ${decision}" href="${esc(url)}" target="_blank" rel="noopener"` +
    ` title="Opens a prefilled decision issue${overflow}. ${decision === 'accept' ? 'The apply lane re-validates before changing anything.' : 'Nothing is changed; the finding is muted.'}"${extra}>${esc(label)}${overflow}</a>`;
};

function findingRow(f) {
  const subj = f.subject.number
    ? `<a href="${esc(f.subject.url)}">${esc(shortRepo(f.subject.repo))}#${f.subject.number}</a>`
    : `<a href="${esc(f.subject.url)}">${esc(f.subject.kind)}</a>`;
  // One op says the same thing the summary already said in prose; a chain of
  // them is genuinely extra information, so only chains are printed.
  const ops = (f.proposal.ops?.length ?? 0) > 1
    ? `<span class="audit-ops">${f.proposal.ops.map((o) => esc(o.label)).join(' → ')}</span>`
    : '';
  const seen = f.firstSeen === f.lastSeen
    ? 'first seen today'
    : `open since ${esc(f.firstSeen)}`;
  const flags = [
    f.reappeared ? '<span class="rm-pill warn" title="This was accepted and applied before, and the audit reports it again">back again</span>' : '',
    f.muted ? `<span class="rm-pill" title="Rejected — muted until ${esc(f.mutedUntil ?? '')}">muted</span>` : '',
  ].join('');

  return `    <div class="audit-finding${f.muted ? ' muted' : ''}" data-repo="${esc(f.subject.repo)}" data-hl="live attention pulse">
      <div class="audit-line">
        <span class="audit-conf ${esc(f.confidence)}">${esc(f.confidence)}</span>
        <span class="audit-subject">${subj}</span>
        <span class="audit-what">${esc(f.subject.title || f.ruleTitle)}</span>
        <span class="rm-meta">${seen}</span>
      </div>
      <p class="audit-evidence">${f.evidence.map(esc).join(' · ')}</p>
      <p class="audit-proposal"><span class="rm-pill ${f.proposal.kind === 'agentic' ? 'ready' : 'ok'}">${esc(f.proposal.kind)}</span> ${esc(f.proposal.summary)} ${ops}</p>
      <div class="audit-actions">${flags}<code class="audit-id">${esc(f.id)}</code>${btn('accept', [f.id], 'accept')}${btn('reject', [f.id], 'reject')}</div>
    </div>`;
}

function ruleGroup(rule, findings) {
  const ids = findings.map((f) => f.id);
  const kinds = new Set(findings.map((f) => f.proposal.kind));
  return `  <details class="audit-rule">
    <summary><code>${esc(rule)}</code> <span class="audit-rule-title">${esc(findings[0].ruleTitle)}</span> <span class="rm-count">${findings.length}</span>${
      findings.length > 1 ? ` <span class="audit-bulk">${btn('accept', ids, `accept all ${findings.length}`)}</span>` : ''
    }</summary>
    <p class="rm-note">${esc([...kinds].join(' + '))} · <a href="#audit-rules">what this rule checks</a></p>
${findings.map(findingRow).join('\n')}
  </details>`;
}

function tier({ key, label, blurb }, findings) {
  const mine = findings.filter((f) => f.confidence === key && !f.muted);
  if (!mine.length) return '';
  const byRule = new Map();
  for (const f of mine) {
    if (!byRule.has(f.rule)) byRule.set(f.rule, []);
    byRule.get(f.rule).push(f);
  }
  const mechanical = mine.filter((f) => f.proposal.kind === 'mechanical').map((f) => f.id);
  return `<div class="audit-tier">
<h3>${esc(label)} <span class="rm-count">${mine.length}</span>
  <span class="audit-bulk">${btn('accept', mine.map((f) => f.id), `accept all ${mine.length}`)}${
    mechanical.length && mechanical.length !== mine.length ? btn('accept', mechanical, `accept the ${mechanical.length} mechanical`) : ''
  }</span></h3>
<p class="rm-note">${esc(blurb)}</p>
${[...byRule.entries()].map(([rule, fs]) => ruleGroup(rule, fs)).join('\n')}
</div>`;
}

function rulesTable(rules) {
  const rows = rules.map((r) => {
    const state = r.error
      ? `<span class="status-pill drift" title="${esc(r.error)}">rule failed</span>`
      : r.skipped
        ? `<span class="status-pill unstaged" title="${esc(r.skipped)}">skipped</span>`
        : r.fired
          ? `<span class="status-pill development">${r.fired} firing</span>`
          : '<span class="status-pill released">quiet</span>';
    return `  <tr>
    <td><code>${esc(r.id)}</code></td>
    <td>${state}</td>
    <td><strong>${esc(r.title)}</strong><br><span class="rm-note">${esc(r.why)}</span><br><span class="rm-note"><em>Fix:</em> ${esc(r.fix)}</span></td>
  </tr>`;
  }).join('\n');
  return `<table class="rm-table audit-rules">
  <tr><th>Rule</th><th>State</th><th>What it checks, and why</th></tr>
${rows}
</table>`;
}

// The section. `ledger` is site/audit/findings.json; a missing file is a state to
// report (the nightly run has not landed yet), not a reason to omit the section.
export function auditSection(ledger, { now = new Date() } = {}) {
  const head = (body, count = null) => `<section class="rm-sec" id="sec-audit">
<h2>Audit${count === null ? '' : ` <span class="rm-count" title="Live findings — muted ones are not counted">${count}</span>`}</h2>
${body}
</section>`;

  if (!ledger) {
    return head(`<p class="rm-notice">No audit has run yet — <code>site/audit/findings.json</code> is missing. It is written nightly by <a href="https://github.com/${HUB}/blob/main/.github/workflows/roadmap-audit.yml"><code>roadmap-audit.yml</code></a>.</p>`);
  }

  const { findings, counts, rules } = ledger;
  const live = findings.filter((f) => !f.muted);
  const muted = findings.filter((f) => f.muted);
  const firing = rules.filter((r) => r.fired).length;
  const broken = rules.filter((r) => r.error);

  const note = `Nightly rule sweep of the roadmap's own conventions — ${rules.length} rules, ${firing} of them firing. Accept opens a prefilled decision issue; the <a href="https://github.com/${HUB}/blob/main/.github/workflows/roadmap-audit-apply.yml">apply lane</a> re-validates it against a fresh audit before anything changes, so nothing here is applied by looking at it. Last run ${esc(fmtET(ledger.generatedAt))} (${esc(age(ledger.generatedAt, now))} ago) · <a href="audit/index.html"><strong>full audit page</strong></a> · <a href="audit/findings.json">findings.json</a> · <a href="https://github.com/${HUB}/issues/92">#92</a>`;

  const boardNotice = ledger.boardReadable
    ? ''
    : '<p class="rm-notice">The obot Roadmap project was unreadable on the last run — every board rule was skipped, so this list is incomplete rather than clear.</p>';
  const brokenNotice = broken.length
    ? `<p class="rm-notice">${broken.length} rule${broken.length === 1 ? '' : 's'} failed to run: ${broken.map((r) => esc(r.id)).join(', ')} — see the rule list.</p>`
    : '';

  const summary = live.length
    ? `Findings (${live.length}) — ${counts.high} high · ${counts.medium} medium · ${counts.low} low${counts.muted ? ` · ${counts.muted} muted` : ''}`
    : `Findings (0) — the roadmap satisfies every rule${counts.muted ? `, with ${counts.muted} muted` : ''}`;

  const body = live.length
    ? `<div class="audit-top">${btn('accept', live.filter((f) => f.confidence === 'high' && f.proposal.kind === 'mechanical').map((f) => f.id), 'accept every high-confidence mechanical fix')}</div>
${CONFIDENCE.map((c) => tier(c, findings)).filter(Boolean).join('\n')}`
    : '<p class="rm-empty">Nothing to review — every rule is satisfied.</p>';

  const mutedBlock = muted.length
    ? `<details class="audit-rule">
<summary>Muted by an earlier rejection <span class="rm-count">${muted.length}</span></summary>
<p class="rm-note">Rejected findings stay out of the list for 60 days, or until their evidence changes.</p>
${muted.map(findingRow).join('\n')}
</details>`
    : '';

  return head(`<p class="rm-note">${note}</p>
${boardNotice}${brokenNotice}<details class="rm-fold audit-fold" id="audit-findings">
<summary>${esc(summary)}</summary>
${body}
${mutedBlock}
</details>
<details class="rm-fold audit-fold" id="audit-rules">
<summary>Rules (${rules.length}) — ${firing} firing, ${rules.length - firing} quiet</summary>
<p class="rm-note">The conventions the audit knows about. Adding a rule is one object in <a href="https://github.com/${HUB}/blob/main/scripts/lib/audit/rules.mjs"><code>rules.mjs</code></a>; a rule that cannot run says so here rather than reading as all-clear.</p>
${rulesTable(rules)}
</details>`, live.length);
}
