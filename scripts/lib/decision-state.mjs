// Whether @jwildfire has decided something — one authority, and the views over it.
//
// The problem this replaces (jwildfire/obot.roadmap#196, task #255): the answer was
// recorded in two places. The Status cell of the index table in
// reports/decisions/README.md was read by the site; a `status` field in
// reports/decisions/registry.json was written by whichever lane happened to apply an
// answer and read by nothing published. On the night of 2026-08-18 the Navigator
// sweep found ten of twenty-one artifacts where the two disagreed — more than half
// the decision log contradicting itself on the one surface he reads to know what he
// has already settled.
//
// The fix is not to pick the store that is easiest to write to. It is to put the
// state where the evidence is, because that is the copy that cannot be written
// without doing the work:
//
//   <section id="decisions" data-state="decided">
//     <div class="verdict" data-date="2026-08-15" data-channel="in chat" …>
//       <p>&ldquo;his words, verbatim&rdquo;</p>
//
// The page declares its state, and the declaration is refused unless the page
// carries a dated decision block to back it — so `decided` costs the same edit that
// records what he said, and `open` is falsified the moment his words land. Every
// other store is generated or checked against this one:
//
//   - registry.json  — `state`, `status` and `decidedOn` are stamped from here by
//                      scripts/stamp_decision_status.mjs, never hand-written.
//   - README.md      — the Status cell stays prose he can edit, and its leading word
//                      is checked against the page by scripts/check_decision_status.mjs.
//
// `status` is the coarse projection — open / decided / closed, with a partial
// landing on the decided side — because that is the yes/no question obot.agent's
// Navigator sweep asks of the registry (tools/navigator/checks.mjs). Fineness lives
// in `state`, which is what every hub surface reads.
//
// One thing deliberately NOT derived: which individual questions he answered. The
// `data-resolves` labels are free-form across the twenty-one artifacts — question
// IDs on some, the page's own codes on others, `rule` and `1` on D0012 — so
// per-question coverage cannot be computed from them today without inventing
// answers. Partial is therefore declared on the page next to the prose that explains
// which questions are still his, not inferred.

/** The four states an artifact can be in. Order matters: it is the lifecycle. */
export const STATES = ['open', 'partially decided', 'decided', 'closed'];

/** Still wants something from him. A partial does; a page he closed does not. */
export const isAwaiting = (state) => state === 'open' || state === 'partially decided';

/** He has ruled here at least once — including the ruling "close this page". */
export const hasRuled = (state) => state !== 'open';

/** The coarse yes/no the registry stores for consumers that ask one. */
export const coarse = (state) => (state === 'open' || state === 'closed' ? state : 'decided');

const norm = (s = '') => String(s).toLowerCase().replace(/\s+/g, ' ').trim();

/** Markdown emphasis off, so `**Decided 2026-08-15**` classifies as Decided. */
const bare = (s = '') => String(s).replace(/[*_`]/g, '').trim();

/**
 * The state an index Status cell renders, or null when nothing recognisable leads it.
 *
 * Null rather than a guess: an unclassifiable cell is a defect the check reports, and
 * defaulting it to "open" would put a decision back in his queue while defaulting it
 * to "decided" would drop one out of it.
 */
export function indexRowState(cell = '') {
  const s = bare(cell);
  if (/^partially\s+decided\b/i.test(s)) return 'partially decided';
  if (/^decided\b/i.test(s)) return 'decided';
  if (/^(closed|retired|folded)\b/i.test(s)) return 'closed';
  if (/^awaiting\b/i.test(s)) return 'open';
  return null;
}

/**
 * The rows of the Index table in reports/decisions/README.md, as objects keyed by
 * lowercase column name, with the artifact's slug pulled out of the Decision link.
 *
 * One parser, used by the collector that builds the site and by the check that
 * guards it — two parsers of the same table is the shape of defect this whole
 * module exists to remove.
 */
export function parseIndexTable(markdown = '') {
  const lines = String(markdown).split(/\r?\n/);
  const start = lines.findIndex((l) => /^##\s+Index\b/.test(l));
  if (start === -1) throw new Error('reports/decisions/README.md has no "## Index" section');
  const raw = lines.slice(start)
    .filter((l) => /^\s*\|/.test(l))
    .map((l) => l.replace(/^\s*\|/, '').replace(/\|\s*$/, '').split('|').map((c) => c.trim()));
  if (raw.length < 2) throw new Error('reports/decisions/README.md: the Index table has no rows');

  const headers = raw[0].map((h) => h.toLowerCase());
  return raw.slice(1)
    .filter((cells) => !/^[-\s:]+$/.test(cells.join(''))) // the |---|---| rule row
    .map((cells) => {
      const row = Object.fromEntries(headers.map((h, i) => [h, cells[i] ?? '']));
      const link = /\[([^\]]+)\]\(([^)]+)\)/.exec(row.decision ?? '');
      row.title = link?.[1] ?? row.decision ?? '';
      row.href = link?.[2] ?? null;
      row.slug = link ? link[2].replace(/^\.?\//, '').replace(/\/$/, '') : null;
      return row;
    });
}

const SECTION = /<section\b[^>]*\bid=["']decisions["'][^>]*>([\s\S]*?)<\/section>/i;
const OPEN_TAG = /<section\b[^>]*\bid=["']decisions["'][^>]*>/i;
const BLOCK = /<(?:div|article)\b[^>]*\bdata-date=["']([^"']+)["'][^>]*>/gi;

/**
 * What one artifact page says about itself, and whether it may say it.
 *
 * Returns `{ state, declared, present, blocks, latest, problems }`. `state` is always
 * usable — a page with a bad declaration falls back to what its evidence supports, so
 * the site keeps rendering while the check fails the deploy. `problems` is what makes
 * the failure loud.
 */
export function readArtifactState(html = '') {
  const problems = [];
  const section = SECTION.exec(html);
  if (!section) return { state: 'open', declared: null, present: false, blocks: 0, first: null, latest: null, dates: [], problems };

  const dates = [...section[1].matchAll(BLOCK)].map((m) => m[1]).filter(Boolean).sort();
  const blocks = dates.length;
  const sorted = dates;
  // Two dates, two different facts. The first is when he ruled — it is what the
  // index row says and what the six hand-written registry dates all recorded. The
  // last is when the page stopped moving, which for a closed page is when he closed
  // it. Deriving both from the same list is why neither can drift from the other.
  const first = sorted[0] ?? null;
  const latest = sorted[sorted.length - 1] ?? null;
  const evidenced = blocks > 0 ? 'decided' : 'open';

  const tag = OPEN_TAG.exec(html)?.[0] ?? '';
  const raw = tag.match(/\bdata-state=["']([^"']*)["']/i)?.[1];
  const declared = raw === undefined ? null : norm(raw);

  if (declared === null) {
    problems.push('carries a Decisions section but does not declare its state — add data-state="decided" (or "partially decided" / "closed") to the <section id="decisions"> tag');
    return { state: evidenced, declared, present: true, blocks, first, latest, dates, problems };
  }
  if (!STATES.includes(declared)) {
    problems.push(`declares data-state="${declared}", which is not one of: ${STATES.join(', ')}`);
    return { state: evidenced, declared, present: true, blocks, first, latest, dates, problems };
  }
  // The coupling that makes the declaration worth trusting.
  if (declared !== 'open' && blocks === 0) {
    problems.push(`declares "${declared}" but the page carries no dated decision block — a state is a claim about his words, and the words are not there`);
  }
  if (declared === 'open' && blocks > 0) {
    problems.push(`declares "open" but the page records ${blocks} decision${blocks === 1 ? '' : 's'} — a page he has ruled on is not open`);
  }
  return { state: declared, declared, present: true, blocks, first, latest, dates, problems };
}

/** What the registry should hold for an artifact, given what its page says. */
export function stampFor(artifactState) {
  const { state, first, latest } = artifactState;
  const out = { state, status: coarse(state) };
  if (state !== 'open' && first) out.decidedOn = first;
  if (state === 'closed' && latest) out.closedOn = latest;
  return out;
}

/** The registry fields this scheme owns. Everything else on an entry is left alone. */
export const STAMPED = ['state', 'status', 'decidedOn', 'closedOn'];

/**
 * Every artifact, its authoritative state, and everything that disagrees with it.
 *
 * `pages` is a Map of slug → page HTML, injected rather than read here so the rule is
 * testable without a filesystem; `loadPages()` builds the real one.
 */
export function auditDecisionStatus({ registry = {}, indexRows = [], pages = new Map() } = {}) {
  const problems = [];
  const states = new Map();
  const byIndex = new Map(indexRows.map((r) => [r.slug, r]));
  const known = new Set();

  for (const a of registry.artifacts ?? []) {
    known.add(a.slug);
    const html = pages.get(a.slug);
    if (html === undefined) {
      problems.push(`${a.id}: the registry points at reports/decisions/${a.slug}/, which has no index.html`);
      continue;
    }

    const art = readArtifactState(html);
    states.set(a.slug, art.state);
    for (const p of art.problems) problems.push(`${a.id}: reports/decisions/${a.slug}/index.html ${p}`);

    // The registry is a generated view. Anything else means someone hand-wrote it,
    // or the stamper has not run since the page changed.
    const want = stampFor(art);
    // One line per artifact rather than one per field: a stale entry is a single
    // fact about a single artifact, and three lines saying so reads as three faults.
    const stale = STAMPED
      .filter((k) => want[k] !== undefined && (a[k] ?? null) !== want[k])
      .map((k) => `${k}=${JSON.stringify(a[k] ?? null)} where the page says ${JSON.stringify(want[k])}`);
    if (stale.length) {
      problems.push(`${a.id}: the registry is stale — it holds ${stale.join(', ')}; re-stamp with node scripts/stamp_decision_status.mjs`);
    }
    // A field the stamp does not write is never removed — nothing in this repo
    // deletes a decision record — so it is checked instead. D0007 carries a
    // closedOn from before this scheme, on a page he decided rather than retired:
    // a real fact about a real day, kept, and held to naming a day the page records.
    for (const key of ['decidedOn', 'closedOn']) {
      if (want[key] !== undefined || !a[key]) continue;
      if (art.state === 'open') {
        problems.push(`${a.id}: the registry records ${key}=${a[key]} on an artifact its page says is still open — one of the two is wrong about whether he has ruled`);
      } else if (!art.dates.includes(a[key])) {
        problems.push(`${a.id}: the registry records ${key}=${a[key]}, which is not a date the page records a decision on (${art.dates.join(', ') || 'none'})`);
      }
    }
    const row = byIndex.get(a.slug);
    if (!row) {
      problems.push(`${a.id}: has no row in the published index (reports/decisions/README.md) — the decision log is built from that table, so the artifact would be omitted from it`);
      continue;
    }
    const rowState = indexRowState(row.status);
    if (rowState === null) {
      problems.push(`${a.id}: the index Status cell starts with nothing classifiable (${JSON.stringify(String(row.status).slice(0, 40))}) — it has to lead with Awaiting, Partially decided, Decided, Closed or Folded into`);
    } else if (rowState !== art.state) {
      problems.push(`${a.id}: the index says "${rowState}" and the page says "${art.state}" — one of the two is telling him the wrong thing about ${a.slug}`);
    }
  }

  for (const row of indexRows) {
    if (!known.has(row.slug)) {
      problems.push(`reports/decisions/${row.slug}/: the published index has a row for it and the registry has no registry entry — claim one with node scripts/claim_decision_id.mjs ${row.slug}`);
    }
  }

  return { states, problems };
}
