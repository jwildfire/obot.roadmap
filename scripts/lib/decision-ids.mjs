// Decision-artifact IDs — the registry, and the rules that keep them unique.
//
// @jwildfire, 2026-08-15: "Give every decision artifact an ID and then give each
// question for me a sub ID… Use D0001 as the ID."
//
// Why: every artifact used to invent its own question codes — A1–A4 here, C1–C6
// there, R1–R4 somewhere else — so three different "C1"s were live at once and none
// of them said which page it belonged to. He could not approve one in chat without
// naming the artifact too. `D0004.2` is unambiguous on its own.
//
// The registry (reports/decisions/registry.json) is the record; each page also
// carries `<meta name="decision-id">` and renders its IDs, so the page and the
// registry can be checked against each other.
//
// IDs are permanent. A superseded or retired artifact keeps its number, and the
// number is never reused — the decision log has to be able to cite it forever.
import fs from 'node:fs';
import path from 'node:path';

import { ROOT } from './repos.mjs';

export const REGISTRY = 'reports/decisions/registry.json';

// D + four digits. The prefix is a namespace: if designs or reports ever want their
// own series, a second letter drops in without changing the shape or this parser.
// @jwildfire asked for decisions only — do not invent the others.
export const ID_RE = /^[A-Z]\d{4}$/;
export const QID_RE = /^[A-Z]\d{4}\.[1-9]\d*$/; // the question number is plain, not padded

export function readRegistry(root = ROOT) {
  const file = path.join(root, REGISTRY);
  const reg = JSON.parse(fs.readFileSync(file, 'utf8'));
  reg.artifacts ||= [];
  return reg;
}

/** The next free ID, derived from the registry — never from a stored counter. */
export function nextId(reg) {
  const prefix = reg.prefix || 'D';
  const max = reg.artifacts
    .filter((a) => a.id.startsWith(prefix))
    .reduce((n, a) => Math.max(n, Number(a.id.slice(prefix.length))), 0);
  return `${prefix}${String(max + 1).padStart(4, '0')}`;
}

/**
 * Everything wrong with the registry, as a list of sentences. Empty means clean.
 *
 * Concurrency: two siblings can both compute the same nextId, and neither can see
 * the other's uncommitted file. The arbiter is `git push` — the second one is
 * rejected as non-fast-forward, rebases, and re-derives. That only works if a
 * duplicate is caught rather than silently merged, which is what this is for.
 */
export function validate(reg, root = ROOT) {
  const problems = [];
  const seen = new Map();
  const seenSlug = new Map();
  for (const a of reg.artifacts) {
    if (!ID_RE.test(a.id)) problems.push(`${a.id}: not a valid id (expected D0001 shape)`);
    if (seen.has(a.id)) problems.push(`${a.id}: claimed by both ${seen.get(a.id)} and ${a.slug} — one of them must take the next free id`);
    seen.set(a.id, a.slug);
    if (seenSlug.has(a.slug)) problems.push(`${a.slug}: listed twice, as ${seenSlug.get(a.slug)} and ${a.id}`);
    seenSlug.set(a.slug, a.id);

    const dir = path.join(root, 'reports', 'decisions', a.slug);
    if (!fs.existsSync(path.join(dir, 'index.html'))) {
      problems.push(`${a.id}: registry points at reports/decisions/${a.slug}/, which has no index.html`);
      continue;
    }
    const html = fs.readFileSync(path.join(dir, 'index.html'), 'utf8');
    const stamped = (html.match(/<meta\s+name=["']decision-id["']\s+content=["']([^"']+)["']/i) || [])[1];
    if (!stamped) problems.push(`${a.id}: reports/decisions/${a.slug}/index.html carries no decision-id — run node scripts/stamp_decision_ids.mjs`);
    else if (stamped !== a.id) problems.push(`${a.id}: the page claims ${stamped} instead`);

    const qids = (a.questions || []).map((q) => q.id);
    if (!qids.length) problems.push(`${a.id}: no questions listed — an artifact with nothing to decide should not be here`);
    qids.forEach((qid, i) => {
      if (!QID_RE.test(qid)) problems.push(`${qid}: not a valid question id`);
      const want = `${a.id}.${i + 1}`;
      if (qid !== want) problems.push(`${qid}: questions are numbered in page order, so this should be ${want}`);
      if (!html.includes(`id="${qid}"`)) problems.push(`${qid}: not anchored on the page — run node scripts/stamp_decision_ids.mjs`);
    });
    for (const q of a.questions || []) {
      if (!q.question || q.question.length < 20) problems.push(`${q.id}: the question text has to state what is being decided, in words`);
      if (!q.code) problems.push(`${q.id}: missing the artifact's original code — it is kept as a secondary label so answers already given stay findable`);
    }
  }

  // Every decision folder must be in the registry, or it has no ID at all.
  const dir = path.join(root, 'reports', 'decisions');
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (!e.isDirectory()) continue;
    if (!fs.existsSync(path.join(dir, e.name, 'index.html'))) continue;
    if (!seenSlug.has(e.name)) problems.push(`reports/decisions/${e.name}/ has no id — claim one with node scripts/claim_decision_id.mjs ${e.name}`);
  }
  return problems;
}

/** Registry entry for a slug, or undefined. */
export const bySlug = (reg, slug) => reg.artifacts.find((a) => a.slug === slug);
