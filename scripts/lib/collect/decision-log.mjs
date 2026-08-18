// The decision log — every call @jwildfire has made, in the order he made them,
// derived from the artifacts rather than kept alongside them.
//
// @jwildfire approved this on 2026-08-15 ("I'm good with recs in …decision-recording");
// the recommendation it implements was explicit about *why* it is derived: a
// hand-maintained log needs two writes that can disagree, and its accuracy ends up
// resting on the least careful session that ever touched it. The sixteen-day-stale
// blocker that motivated the blockers list was exactly that failure. So the artifact
// stays the source of truth and the log is a view over it.
//
// What that requires of an artifact: when he decides, the page gets a
// `<section id="decisions">` at the top (the rule he set the same morning), and each
// decision inside it is one block carrying three attributes the generator reads:
//
//   <section id="decisions">
//     <h2>Decisions</h2>
//     <div class="verdict" data-date="2026-08-15" data-channel="in chat"
//          data-resolves="BL1,BL2,BL3,BL4">
//       <span class="k">@jwildfire · 2026-08-15 · in chat</span>
//       <p>&ldquo;his words, verbatim&rdquo;</p>
//       <p>what happened next …</p>
//     </div>
//   </section>
//
// The attributes sit on the *visible* block on purpose. A parallel JSON blob in the
// head would be a second copy that can disagree with the prose next to it — the drift
// this whole page argues against. `.verdict` alone is not enough of a signal: the
// artifacts use that class for findings and asides too, so the section id plus a
// `data-date` is what marks a block as a recorded decision.
//
// Decision IDs (`D0001`, and `D0001.2` for a single question) are allocated in
// `reports/decisions/registry.json`, owned by the artifact-identity lane. This module
// reads that file when it exists and degrades to unnumbered rows when it does not —
// the log must not be the thing that blocks on an ID scheme landing.
import fs from 'node:fs/promises';
import path from 'node:path';

import { ROOT } from '../repos.mjs';
import { collectDecisions } from './decisions.mjs';
import { readArtifactState } from '../decision-state.mjs';

const DIR = path.join(ROOT, 'reports', 'decisions');

/** A state that means he has ruled, in whole or in part. */
export const isDecided = (state = '') => state !== 'open';

/** …and one that means he has ruled on everything the artifact asked. */
export const isFullyDecided = (state = '') => state === 'decided';

const attr = (tag, name) => tag.match(new RegExp(`\\b${name}=["']([^"']*)["']`, 'i'))?.[1] ?? '';

// Markup → readable text. The artifacts are hand-written HTML with entities and
// inline links; the log renders its own markup, so everything comes in as plain text.
export const text = (html = '') => html
  .replace(/<[^>]+>/g, ' ')
  .replace(/&ldquo;|&rdquo;|&quot;/g, '"')
  .replace(/&lsquo;|&rsquo;/g, "'")
  .replace(/&mdash;/g, '—').replace(/&ndash;/g, '–').replace(/&middot;/g, '·')
  .replace(/&hellip;/g, '…').replace(/&nbsp;/g, ' ')
  .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  .replace(/&apos;/g, "'").replace(/&amp;/g, '&')
  .replace(/\s+/g, ' ')
  .trim();

// The byline — "@jwildfire · 2026-08-15 · in chat" — is chrome, not the thing he
// said. Most artifacts put it in a <span class="k">, which the paragraph scan skips
// for free; some put it in a <p>, and one of those shipped a byline as the quote on
// the published log (2026-08-15). Recognised by shape rather than by class, so it
// stays skipped whatever element the next artifact wraps it in.
const isByline = (s = '') => /^@?\w[\w.-]*\s*[·|]\s*\d{4}-\d{2}-\d{2}\b/.test(s.trim());

/** The quote marks are the artifact's; the log adds its own. */
const unquote = (s = '') => s.replace(/^["'“‘]+/, '').replace(/["'”’]+$/, '').trim();

/**
 * Pull the recorded decisions out of one artifact's markup.
 *
 * Returns `{ present, entries }` — `present` false means the page has no Decisions
 * section at all, which is a defect on a Decided artifact and normal on an open one.
 */
export function parseDecisionRecord(html = '') {
  const section = html.match(/<section\b[^>]*\bid=["']decisions["'][^>]*>([\s\S]*?)<\/section>/i);
  if (!section) return { present: false, entries: [] };

  const entries = [];
  // Each recorded decision is a block with a data-date. Non-greedy to the next block
  // start or the end of the section, so a nested <div> inside the prose is harmless.
  const re = /<(div|article)\b([^>]*\bdata-date=["'][^"']+["'][^>]*)>([\s\S]*?)(?=<(?:div|article)\b[^>]*\bdata-date=|$)/gi;
  let m;
  while ((m = re.exec(section[1])) !== null) {
    const tag = m[2];
    const body = m[3];
    const paras = [...body.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)]
      .map((p) => text(p[1])).filter(Boolean).filter((t) => !isByline(t));
    entries.push({
      date: attr(tag, 'data-date'),
      channel: attr(tag, 'data-channel') || 'in chat',
      resolves: attr(tag, 'data-resolves').split(',').map((s) => s.trim()).filter(Boolean),
      // Some early decisions reached the artifact relayed rather than typed — a
      // summary of what he said, not the words he said. `data-verbatim="false"`
      // marks those, and the log renders them without quote marks. The alternative,
      // dressing a paraphrase in quotation marks, puts words in his mouth.
      verbatim: attr(tag, 'data-verbatim').toLowerCase() !== 'false',
      quote: unquote(paras[0] ?? ''),
      outcome: paras.slice(1).join(' '),
    });
  }
  return { present: true, entries };
}

/**
 * The ID allocation record, indexed by slug.
 *
 * Read through the identity lane's own module rather than parsing the same JSON a
 * second time — two readers of one file is how the two drift.
 */
export async function readRegistry() {
  try {
    const { readRegistry: read } = await import('../decision-ids.mjs');
    const reg = read();
    return new Map((reg.artifacts ?? []).filter((a) => a?.slug).map((a) => [a.slug, a]));
  } catch {
    return new Map();
  }
}

/** The folder name an index row points at — the artifact's slug. */
const slugOf = (d) => (d.path ?? '').replace(/^reports\/decisions\//, '').replace(/\/$/, '');

/**
 * Every artifact, with whatever it records, newest decision first.
 *
 * `problems` lists artifacts the index calls Decided but whose page carries no
 * readable Decisions section. The generator turns that into a failed deploy: a log
 * that silently omits a decision is worse than no log, because it reads as complete.
 */
export async function collectDecisionLog() {
  const { awaiting, decided } = await collectDecisions();
  const registry = await readRegistry();
  const problems = [];

  const artifacts = await Promise.all([...decided, ...awaiting].map(async (d) => {
    const slug = slugOf(d);
    let html = '';
    try {
      html = await fs.readFile(path.join(DIR, slug, 'index.html'), 'utf8');
    } catch { /* an index row with no page — reported below */ }
    const record = parseDecisionRecord(html);
    const reg = registry.get(slug) ?? null;
    // The page's own declaration, which is the authority every surface reads (#196,
    // #255). collectDecisions already resolved it; re-derived here only when this
    // module is handed an artifact the collector could not slug.
    const state = d.state ?? readArtifactState(html).state;

    if (!html) problems.push(`${slug || d.title}: the index links a folder with no index.html`);
    else for (const p of readArtifactState(html).problems) problems.push(`${slug}: ${p}`);

    return {
      id: reg?.id ?? null,
      slug,
      title: d.title,
      date: d.date,
      goal: d.goal,
      discussion: d.discussion,
      status: d.status,
      statusPlain: d.statusPlain,
      state,
      path: d.path,
      awaiting: d.awaiting,
      foldedInto: d.foldedInto ?? null,
      closedInto: d.closedInto ?? null,
      questions: reg?.questions ?? [],
      entries: record.entries,
    };
  }));

  // The log's spine: one row per recorded decision, newest first. Ties break on the
  // artifact date so a day's worth of decisions keeps a stable order between deploys.
  const entries = artifacts
    .flatMap((a) => a.entries.map((e, i) => ({
      ...e,
      n: i + 1,
      id: a.id ? `${a.id}.d${i + 1}` : null,
      artifact: { id: a.id, slug: a.slug, title: a.title, path: a.path, goal: a.goal },
    })))
    .sort((x, y) => (y.date || '').localeCompare(x.date || '') || (x.artifact.slug < y.artifact.slug ? -1 : 1));

  return {
    artifacts,
    entries,
    open: artifacts.filter((a) => a.awaiting),
    // Answered inside a successor rather than on their own page. Out of `open`, and
    // named here so a surface can show where they went instead of dropping them.
    folded: artifacts.filter((a) => a.foldedInto),
    // Retired without their questions being answered — out of `open` for the same
    // reason as `folded`, and named so a surface can say so rather than drop them.
    closed: artifacts.filter((a) => a.closedInto),
    problems,
    hasRegistry: registry.size > 0,
  };
}
