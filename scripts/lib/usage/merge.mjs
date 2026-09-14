// Merge usage fragments into the one document the Cost section renders.
//
// Two kinds of usage data reach the build, and neither can see the other:
//
// - site/usage/usage.json, the committed baseline: @jwildfire's local sessions,
//   aggregated on his machine by scripts/build_usage_data.py.
// - usage/sessions/<id>.json on the `session-state` branch, one per cloud session:
//   the session's own transcripts, aggregated inside its container by
//   scripts/usage/publish_session_usage.sh before the container is reclaimed.
//
// Every fragment has the same shape (schema 1, one `source` block), so the merge is
// a sum: cells by (day, agent, role), models by model, totals recomputed. A session
// that republishes overwrites its own file, so re-merging is idempotent.
//
// The ledger branch is writable by every session, so a fragment is validated to
// the key before it is summed: a wrong shape, a non-finite number, an unknown role
// or an oversized label rejects the whole fragment and the build warns and moves
// on. The baseline is trusted (it is committed through review) but goes through
// the same check, so a broken local run cannot publish a broken page either.

const DAY = /^\d{4}-\d{2}-\d{2}$/;
const CONTROL = /[\x00-\x1f]/;
const ROLES = new Set(['lead', 'sibling', 'ultracode', 'auto', 'interactive', 'cloud']);
const CELL_NUMBERS = ['input', 'output', 'cacheRead', 'cacheWrite', 'cost', 'calls', 'subCalls', 'subCost'];
const MODEL_NUMBERS = ['calls', 'input', 'output', 'cacheRead', 'cacheWrite', 'cost'];
const LIMITS = { cells: 20000, models: 50, agent: 80, model: 80, source: 120 };

const isCount = (v) => typeof v === 'number' && Number.isFinite(v) && v >= 0;
const isText = (v, max) => typeof v === 'string' && v.length > 0 && v.length <= max && !CONTROL.test(v);

// Returns the list of problems; an empty list means the fragment can be summed.
export function validateFragment(frag) {
  const errors = [];
  if (!frag || typeof frag !== 'object' || Array.isArray(frag)) return ['not an object'];
  if (frag.schema !== 1) errors.push(`schema ${JSON.stringify(frag.schema)} is not 1`);
  if (frag.source !== undefined) {
    if (!frag.source || typeof frag.source !== 'object' || !isText(frag.source.id, LIMITS.source)) {
      errors.push('source.id missing or malformed');
    }
    if (frag.source?.generatedAt !== undefined && !isText(frag.source.generatedAt, 40)) {
      errors.push('source.generatedAt malformed');
    }
  }
  if (!Array.isArray(frag.cells)) errors.push('cells is not an array');
  else if (frag.cells.length > LIMITS.cells) errors.push(`${frag.cells.length} cells exceeds ${LIMITS.cells}`);
  else {
    frag.cells.forEach((c, i) => {
      if (!c || typeof c !== 'object') { errors.push(`cells[${i}] is not an object`); return; }
      if (!DAY.test(c.day ?? '')) errors.push(`cells[${i}].day is not YYYY-MM-DD`);
      if (!isText(c.agent, LIMITS.agent)) errors.push(`cells[${i}].agent missing or over ${LIMITS.agent} chars`);
      if (!ROLES.has(c.role)) errors.push(`cells[${i}].role ${JSON.stringify(c.role)} is not a known role`);
      for (const k of CELL_NUMBERS) if (!isCount(c[k])) errors.push(`cells[${i}].${k} is not a non-negative number`);
    });
  }
  if (!Array.isArray(frag.models)) errors.push('models is not an array');
  else if (frag.models.length > LIMITS.models) errors.push(`${frag.models.length} models exceeds ${LIMITS.models}`);
  else {
    frag.models.forEach((m, i) => {
      if (!m || typeof m !== 'object') { errors.push(`models[${i}] is not an object`); return; }
      if (!isText(m.model, LIMITS.model)) errors.push(`models[${i}].model missing or over ${LIMITS.model} chars`);
      for (const k of MODEL_NUMBERS) if (!isCount(m[k])) errors.push(`models[${i}].${k} is not a non-negative number`);
      for (const k of ['rateIn', 'rateOut']) {
        if (!(m[k] === null || m[k] === undefined || isCount(m[k]))) errors.push(`models[${i}].${k} is not a rate or null`);
      }
    });
  }
  if (frag.roleLabels !== undefined) {
    if (!frag.roleLabels || typeof frag.roleLabels !== 'object' || Array.isArray(frag.roleLabels)) {
      errors.push('roleLabels is not an object');
    } else {
      for (const [k, v] of Object.entries(frag.roleLabels)) {
        if (!ROLES.has(k) || !isText(v, 40)) errors.push(`roleLabels.${k} is not a known role with a short label`);
      }
    }
  }
  return errors;
}

const round = (n, places) => Number(n.toFixed(places));

function summarize(frag) {
  const days = [...new Set(frag.cells.map((c) => c.day))].sort();
  return {
    first: days[0] ?? null,
    last: days[days.length - 1] ?? null,
    activeDays: days.length,
    calls: frag.cells.reduce((n, c) => n + c.calls, 0),
    cost: round(frag.cells.reduce((n, c) => n + c.cost, 0), 2),
  };
}

// `baseline` is the committed local file; `fragments` is [{ id, data }] in any
// order. Every input must already have passed validateFragment. The result is a
// schema-1 document plus `sources`, one row per input, the baseline first.
export function mergeUsage(baseline, fragments = []) {
  const inputs = [{ id: baseline.source?.id ?? 'local', kind: 'local', data: baseline }]
    .concat(fragments.map((f) => ({ id: f.id, kind: 'cloud', data: f.data })));

  const cells = new Map();
  const models = new Map();
  const roleLabels = {};
  const sources = [];

  for (const { id, kind, data } of inputs) {
    for (const c of data.cells) {
      const key = `${c.day}|${c.role}|${c.agent}`;
      let t = cells.get(key);
      if (!t) {
        t = { day: c.day, agent: c.agent, role: c.role };
        for (const k of CELL_NUMBERS) t[k] = 0;
        cells.set(key, t);
      }
      for (const k of CELL_NUMBERS) t[k] += c[k];
    }
    for (const m of data.models) {
      let t = models.get(m.model);
      if (!t) {
        t = { model: m.model, rateIn: m.rateIn ?? null, rateOut: m.rateOut ?? null };
        for (const k of MODEL_NUMBERS) t[k] = 0;
        models.set(m.model, t);
      }
      for (const k of MODEL_NUMBERS) t[k] += m[k];
      if (t.rateIn === null && m.rateIn != null) { t.rateIn = m.rateIn; t.rateOut = m.rateOut ?? null; }
    }
    Object.assign(roleLabels, data.roleLabels ?? {});
    sources.push({ id, kind, generatedAt: data.source?.generatedAt ?? null, ...summarize(data) });
  }

  const outCells = [...cells.values()]
    .sort((a, b) => a.day.localeCompare(b.day) || a.agent.localeCompare(b.agent) || a.role.localeCompare(b.role))
    .map((c) => ({ ...c, cost: round(c.cost, 4), subCost: round(c.subCost, 4) }));
  const outModels = [...models.values()]
    .sort((a, b) => b.cost - a.cost)
    .map((m) => ({ ...m, cost: round(m.cost, 4) }));
  const total = (key) => outCells.reduce((n, c) => n + c[key], 0);
  const days = [...new Set(outCells.map((c) => c.day))].sort();

  return {
    schema: 1,
    project: baseline.project ?? 'obot2',
    days,
    cells: outCells,
    models: outModels,
    roleLabels,
    cacheMultipliers: baseline.cacheMultipliers ?? {},
    sources,
    totals: {
      input: total('input'), output: total('output'),
      cacheRead: total('cacheRead'), cacheWrite: total('cacheWrite'),
      cost: round(total('cost'), 2),
      calls: total('calls'), subCalls: total('subCalls'),
      subCost: round(total('subCost'), 2),
      agents: new Set(outCells.map((c) => c.agent)).size,
      activeDays: days.length,
      first: days[0] ?? null,
      last: days[days.length - 1] ?? null,
    },
  };
}
