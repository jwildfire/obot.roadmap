// Audit view redesign — the parts every option shares.
//
// Data: the real ledger the nightly audit committed on 2026-07-25 (33 live
// findings + 1 muted, 22 rules), snapshotted into data/findings.json so the
// prototypes stay comparable as the live audit moves on.
//
// Decisions are held in memory only. The tray shows the exact
// `repository_dispatch` body the live page would send (PR #110's backend), and
// sends nothing.

export const HUB = 'jwildfire/obot.roadmap';

export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const CONF_RANK = { high: 0, medium: 1, low: 2 };
const GROUP_ORDER = ['Board integrity', 'Hierarchy', 'Linkage', 'Conventions'];
const shortRepo = (r) => (r ?? '').split('/')[1] ?? r ?? '';

export const state = {
  q: '', conf: 'all', kind: 'all', repo: 'all', group: 'all', decided: 'all',
  sort: 'confidence', grouped: true, showMuted: false,
  decisions: new Map(), // finding id -> 'accept' | 'reject'
  collapsed: new Set(), // rule ids
  open: new Set(),      // finding ids with detail showing
  cursor: null,         // finding id under the keyboard cursor
};

export async function load() {
  const ledger = await fetch('./data/findings.json').then((r) => r.json());
  const ruleById = new Map(ledger.rules.map((r) => [r.id, r]));
  const findings = ledger.findings.map((f) => {
    const rule = ruleById.get(f.rule) ?? { id: f.rule, title: f.ruleTitle, why: '', fix: '', group: f.group };
    const subj = f.subject.number ? `${shortRepo(f.subject.repo)}#${f.subject.number}`
      : `${shortRepo(f.subject.repo)} · convention`;
    return {
      ...f,
      rule_: rule,
      short: shortRepo(f.subject.repo),
      subjLabel: subj,
      what: f.proposal.summary,
      ops: f.proposal.ops ?? [],
      blob: [f.id, subj, f.subject.title, f.ruleTitle, f.proposal.summary, ...(f.evidence ?? []),
        ...(f.proposal.ops ?? []).map((o) => o.label)].join(' ').toLowerCase(),
    };
  });
  return { ledger, findings, rules: ledger.rules, ruleById };
}

// ------------------------------------------------------------------ filtering
export function pass(f) {
  return (state.conf === 'all' || f.confidence === state.conf)
    && (state.kind === 'all' || f.proposal.kind === state.kind)
    && (state.repo === 'all' || f.subject.repo === state.repo)
    && (state.group === 'all' || f.group === state.group)
    && (state.decided === 'all'
      || (state.decided === 'undecided' && !state.decisions.has(f.id))
      || (state.decided === 'accepted' && state.decisions.get(f.id) === 'accept')
      || (state.decided === 'rejected' && state.decisions.get(f.id) === 'reject'))
    && (state.showMuted || !f.muted)
    && (!state.q || f.blob.includes(state.q));
}

const SORTS = {
  confidence: (a, b) => CONF_RANK[a.confidence] - CONF_RANK[b.confidence]
    || a.rule.localeCompare(b.rule) || (a.subject.number ?? 0) - (b.subject.number ?? 0),
  rule: (a, b) => GROUP_ORDER.indexOf(a.group) - GROUP_ORDER.indexOf(b.group)
    || a.rule.localeCompare(b.rule) || (a.subject.number ?? 0) - (b.subject.number ?? 0),
  issue: (a, b) => a.subject.repo.localeCompare(b.subject.repo)
    || (a.subject.number ?? 0) - (b.subject.number ?? 0),
  age: (a, b) => a.firstSeen.localeCompare(b.firstSeen) || b.runs - a.runs,
  runs: (a, b) => b.runs - a.runs || CONF_RANK[a.confidence] - CONF_RANK[b.confidence],
  kind: (a, b) => a.proposal.kind.localeCompare(b.proposal.kind)
    || CONF_RANK[a.confidence] - CONF_RANK[b.confidence],
};
export const SORT_LABELS = {
  confidence: 'confidence, high first',
  rule: 'rule group, then rule',
  issue: 'repo and issue number',
  age: 'oldest finding first',
  runs: 'most audit runs first',
  kind: 'mechanical before judgment',
};

export function view(findings) {
  const list = findings.filter(pass).sort(SORTS[state.sort] ?? SORTS.confidence);
  if (!state.grouped) return [{ rule: null, items: list }];
  const byRule = new Map();
  for (const f of list) {
    if (!byRule.has(f.rule)) byRule.set(f.rule, []);
    byRule.get(f.rule).push(f);
  }
  // Groups keep the order the sort produced — sorting by confidence therefore
  // floats the rule whose first finding is most confident, which is what a
  // reader means by "worst first".
  return [...byRule.entries()].map(([rule, items]) => ({ rule, ruleMeta: items[0].rule_, items }));
}

// ------------------------------------------------------------------ decisions
export function setDecision(id, d) {
  if (state.decisions.get(id) === d) state.decisions.delete(id);
  else state.decisions.set(id, d);
}
export function setGroup(items, d) {
  const all = items.every((f) => state.decisions.get(f.id) === d);
  for (const f of items) {
    if (all) state.decisions.delete(f.id);
    else state.decisions.set(f.id, d);
  }
}
export const tallies = () => {
  let a = 0; let r = 0;
  for (const d of state.decisions.values()) { if (d === 'accept') a++; else r++; }
  return { accept: a, reject: r, total: a + r };
};

// ----------------------------------------------------------------- fragments
export const confHTML = (f) => {
  const dots = { high: '●●●', medium: '●●○', low: '●○○' }[f.confidence];
  return `<span class="conf ${f.confidence}" title="${esc(f.confidence)} confidence"><span class="dots" aria-hidden="true">${dots}</span><span class="w">${esc(f.confidence)}</span></span>`;
};
export const kindHTML = (f) => f.proposal.kind === 'agentic'
  ? '<span class="pill judg" title="A bounded agent decides how — the summary states the call it will make">judgment</span>'
  : '<span class="pill mech" title="A listed operation, applied exactly as written">mechanical</span>';
export const subjHTML = (f) =>
  `<a class="subj" href="${esc(f.subject.url)}" target="_blank" rel="noopener" title="${esc(f.subject.repo)}">${esc(f.subjLabel)}</a>`;
export const actsHTML = (f, size = '') => {
  const d = state.decisions.get(f.id);
  return `<span class="acts">
    <button class="act yes ${size}" data-act="accept" data-id="${esc(f.id)}" aria-pressed="${d === 'accept'}" title="Accept — apply this change (a)" aria-label="Accept ${esc(f.subjLabel)}">✓</button>
    <button class="act no ${size}" data-act="reject" data-id="${esc(f.id)}" aria-pressed="${d === 'reject'}" title="Reject — change nothing, mute for 60 days (x)" aria-label="Reject ${esc(f.subjLabel)}">✗</button>
  </span>`;
};

export function detailHTML(f) {
  const r = f.rule_;
  const decided = f.decisions?.length
    ? `<p class="meta">Earlier decisions: ${f.decisions.map((d) => `${esc(d.decision)}${d.outcome ? ` (${esc(d.outcome)})` : ''} ${esc((d.at ?? '').slice(0, 10))}`).join(' · ')}</p>` : '';
  const doing = f.proposal.kind === 'mechanical'
    ? `<div class="dh">What runs</div><ul class="ops">${f.ops.map((o) => `<li>${esc(o.label)}</li>`).join('')}</ul>`
    : `<div class="dh">What the agent is told</div><pre class="prompt">${esc(f.proposal.prompt ?? '')}</pre>`;
  return `<div class="detail">
    <div class="dh">Why this is a finding — <code>${esc(r.id)}</code></div>
    <p class="why">${esc(r.why)}</p>
    <div class="dh">Evidence on GitHub right now</div>
    <ul class="ev">${(f.evidence ?? []).map((e) => `<li>${esc(e)}</li>`).join('')}</ul>
    <div class="dh">Proposed change</div>
    <p>${esc(f.proposal.summary)}</p>
    ${doing}
    <div class="dh">Provenance</div>
    <p class="meta">${esc(f.id)} · fingerprint ${esc(f.fingerprint)} · seen in ${f.runs} run${f.runs === 1 ? '' : 's'} since ${esc(f.firstSeen)}${f.reappeared ? ' · applied before and back again' : ''} ·
      <a href="${esc(f.subject.url)}" target="_blank" rel="noopener">open ${esc(f.subjLabel)}</a> ·
      <a href="https://github.com/${HUB}/blob/main/scripts/lib/audit/rules.mjs" target="_blank" rel="noopener">rule source</a></p>
    ${decided}
  </div>`;
}

// --------------------------------------------------------------- queue meter
export function meterHTML(findings) {
  const ticks = findings.map((f) => {
    const d = state.decisions.get(f.id);
    const cls = f.muted ? 'muted' : d === 'accept' ? 'accept' : d === 'reject' ? 'reject' : '';
    const label = `${f.subjLabel} — ${f.what}${d ? ` (${d}ed)` : ''}`;
    return `<button class="tick ${cls}${pass(f) ? '' : ' hidden-by-filter'}" data-jump="${esc(f.id)}" title="${esc(label)}" aria-label="${esc(label)}"></button>`;
  }).join('');
  const t = tallies();
  const left = findings.filter((f) => !f.muted && !state.decisions.has(f.id)).length;
  return `<div class="ticks" role="group" aria-label="Decision queue">${ticks}</div>
    <span class="read"><span class="on">${t.accept} accept</span> · <span class="off">${t.reject} reject</span> · ${left} to go</span>`;
}

// ----------------------------------------------------------------- the tray
export function trayHTML() {
  const t = tallies();
  return `<span class="count"><b>${t.total}</b> decision${t.total === 1 ? '' : 's'} staged — <b>${t.accept}</b> to apply, <b>${t.reject}</b> to mute</span>
    <span class="spacer"></span>
    <button class="ghost" data-tray="clear"${t.total ? '' : ' disabled'}>clear</button>
    <button class="go" data-tray="send"${t.total ? '' : ' disabled'}>Apply ${t.total || ''} decision${t.total === 1 ? '' : 's'}</button>`;
}

export function payloadText() {
  const acc = [...state.decisions.entries()].filter(([, d]) => d === 'accept').map(([id]) => id);
  const rej = [...state.decisions.entries()].filter(([, d]) => d === 'reject').map(([id]) => id);
  const call = (decision, findings) => findings.length
    ? `POST https://api.github.com/repos/${HUB}/dispatches\n${JSON.stringify({ event_type: 'audit-decision', client_payload: { decision, findings } }, null, 2)}`
    : '';
  return [call('accept', acc), call('reject', rej)].filter(Boolean).join('\n\n');
}

export function wireTray(root, rerender) {
  root.addEventListener('click', (e) => {
    const b = e.target.closest('[data-tray]');
    if (!b) return;
    if (b.dataset.tray === 'clear') { state.decisions.clear(); rerender(); return; }
    const dlg = document.getElementById('payload');
    dlg.querySelector('pre').textContent = payloadText() || 'Nothing staged.';
    dlg.showModal();
  });
  const dlg = document.getElementById('payload');
  dlg?.addEventListener('click', (e) => { if (e.target.closest('[data-close]')) dlg.close(); });
}

// -------------------------------------------------------------------- facets
export function facetHTML(groupName, values, counts) {
  return values.map((v) => {
    const on = state[groupName] === v.value;
    const n = counts?.[v.value];
    return `<button data-facet="${groupName}" data-value="${esc(v.value)}" aria-pressed="${on}">${esc(v.label)}${n == null ? '' : `<span class="n">${n}</span>`}</button>`;
  }).join('');
}

export function wireSidebar(root, rerender) {
  root.addEventListener('click', (e) => {
    const b = e.target.closest('[data-facet]');
    if (b) { state[b.dataset.facet] = b.dataset.value; rerender(); return; }
    const s = e.target.closest('[data-sweep]');
    if (s) { Object.assign(state, JSON.parse(s.dataset.sweep)); rerender(); return; }
    const t = e.target.closest('.side-toggle');
    if (t) {
      const shell = document.querySelector('.shell');
      shell.classList.toggle('side-out');
      t.setAttribute('aria-expanded', String(!shell.classList.contains('side-out')));
      t.querySelector('.lbl').textContent = shell.classList.contains('side-out') ? 'filters' : 'hide filters';
    }
  });
  root.addEventListener('input', (e) => {
    if (e.target.matches('[data-q]')) { state.q = e.target.value.trim().toLowerCase(); rerender(); }
  });
  root.addEventListener('change', (e) => {
    if (e.target.matches('[data-sort]')) { state.sort = e.target.value; rerender(); }
    if (e.target.matches('[data-grouped]')) { state.grouped = e.target.checked; rerender(); }
    if (e.target.matches('[data-muted]')) { state.showMuted = e.target.checked; rerender(); }
  });
}

/** Shared keyboard contract: j/k move, a/x decide, u undo, Enter opens, / searches. */
export function keys(ctrl) {
  document.addEventListener('keydown', (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const typing = /^(input|textarea|select)$/i.test(e.target.tagName);
    if (e.key === '/' && !typing) { e.preventDefault(); document.querySelector('[data-q]')?.focus(); return; }
    if (typing) { if (e.key === 'Escape') e.target.blur(); return; }
    const map = {
      j: () => ctrl.move(1), ArrowDown: () => ctrl.move(1),
      k: () => ctrl.move(-1), ArrowUp: () => ctrl.move(-1),
      a: () => ctrl.decide('accept'), x: () => ctrl.decide('reject'),
      u: () => ctrl.undo(), Enter: () => ctrl.enter(), ' ': () => ctrl.enter(),
      Escape: () => ctrl.escape?.(),
    };
    if (map[e.key]) { e.preventDefault(); map[e.key](); }
  });
}
