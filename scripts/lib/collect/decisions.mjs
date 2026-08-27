// Decision artifacts awaiting @jwildfire, read from the committed index table in
// reports/decisions/README.md — the file of record the decision-artifact contract
// maintains (one row per artifact; Status starts with "Decided" once he has).
//
// A committed file, not an API read, on purpose: publishing or deciding an
// artifact edits this repo, and every push here redeploys the site — so the
// roadmap's Todo section is exactly as fresh as the queue it reports.
import fs from 'node:fs/promises';
import path from 'node:path';

import { ROOT } from '../repos.mjs';
import { readRegistry, bySlug } from '../decision-ids.mjs';
import { parseIndexTable, readArtifactState, isAwaiting as awaitingState } from '../decision-state.mjs';

// The status cell is markdown, and four surfaces render it as plain text: the
// decisions landing page's open list and its cards, the roadmap catalog's meta
// line, and the roadmap queue. Flattening links was never enough — emphasis
// reached all four as literal asterisks, so the first word on the page he
// triages from read `**Awaiting**` for every open decision.
//
// Underscores are deliberately the strict case. These cells are full of
// identifiers (package_snapshot, input_data_version), so a blunt strip of
// [*_`] corrupts them into packagesnapshot. Emphasis is paired and
// word-boundaried; a bare underscore inside a word is not emphasis.
export function plainStatus(status) {
  return (status ?? '')
    // Links first, so emphasis inside a label is still reachable afterwards.
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/(^|[\s(])_([^_]+)_(?=[\s.,;:)!?]|$)/g, '$1$2');
}


const LINK = /\[([^\]]+)\]\(([^)]+)\)/; // first markdown link in a cell

const bare = (status = '') => status.replace(/[*_`]/g, '').trim();

/**
 * The successor an artifact was folded into, or null.
 *
 * A third state neither "open" nor "decided" models: @jwildfire asked for two
 * artifacts to be answered inside a later one, so their questions were carried
 * forward and answered there (D0015 and D0016 into D0017, 2026-08-16). The index
 * row already said so in the only place a status is recorded — the status cell —
 * but nothing parsed it, so both stayed in the awaiting set and rendered as open
 * cards on every surface built on it (jwildfire/obot.roadmap#210).
 *
 * Read from the same cell as every other status, deliberately. #196 is the standing
 * argument against a second place to record whether a decision has been made; a
 * `folded` field in the registry would be exactly that, and this needs no new
 * mechanism — `**Folded into [D0017](2026-08-16-navigator-design/)**` is already
 * both the sentence a human reads and the data a collector can read.
 */
export function foldedInto(status = '') {
  const m = /^folded into\s+\[?([A-Z]\d{4})\]?\s*(?:\(([^)]+)\))?/i.exec(bare(status));
  if (!m) return null;
  return { id: m[1].toUpperCase(), slug: m[2] ? m[2].replace(/^\.?\//, '').replace(/\/$/, '') : null };
}

/**
 * An artifact he closed without answering, and the successor that carries the
 * question on — or null.
 *
 * The fourth state, and the one the vocabulary was missing on 2026-08-16 when he
 * read three pages circling one question and said "close them all". Closing is not
 * deciding: none of the three had its questions answered, and calling them decided
 * on the log would be the exact drift the log exists against. It is not folding
 * either — a fold carries live questions into a successor that will answer them,
 * where a close retires them, with or without a successor.
 *
 * Read from the status cell like every other state, for the reason #196 gives: one
 * place records whether a decision has been made. `**Closed 2026-08-16** —
 * superseded by [D0019](2026-08-16-scheduled-sessions-assessment/)` is both the
 * sentence he reads and the data the collectors read.
 */
export function closedInto(status = '') {
  const cell = bare(status);
  if (!/^(?:closed|retired)\b/i.test(cell)) return null;
  // The successor is optional — not every retirement has somewhere to send the
  // reader — so the state is decided by the opening word and the pointer is read
  // separately, from the first "superseded by D0019" it finds.
  // The verb is kept, not normalised: "answered by D0017" and "superseded by D0019"
  // are different fates, and a card that prints the wrong one is a small lie about
  // whether the questions ever got an answer.
  const m = /\b(superseded|replaced|answered)\s+by\s+\[?([A-Z]\d{4})\]?\s*(?:\(([^)]+)\))?/i.exec(cell);
  return {
    via: m?.[1]?.toLowerCase() ?? null,
    id: m?.[2]?.toUpperCase() ?? null,
    slug: m?.[3] ? m[3].replace(/^\.?\//, '').replace(/\/$/, '') : null,
  };
}

/**
 * Does this artifact still want an answer from @jwildfire?
 *
 * The state comes from the artifact page, not from this cell (#196, #255). It used
 * to be parsed out of the prose here, which meant the emphasis had to come off first
 * — rows settled emphatically (`**Decided 2026-08-15** — six of seven adopted`) read
 * as still-open to a test anchored on the literal start of the cell, and two answered
 * decisions sat in his waiting-on-you list because of it. The prose is still what he
 * reads; it is no longer what a collector believes.
 *
 * "Partially decided" stays awaiting on purpose: some of its questions are still his.
 * A folded row wants nothing from him — its questions are the successor's now — and
 * it stays inside `decided` so every surface that lists the settled artifacts keeps
 * listing it and a reader who remembers D0015 can still find where it went. A closed
 * row wants nothing from him because he is the one who closed it.
 *
 * Kept as an exported function over the status cell for the tests that pin the old
 * behaviour, and because a surface handed only a row still needs an answer.
 */
export function isAwaiting(status = '') {
  if (foldedInto(status) || closedInto(status)) return false;
  return !/^decided\b/i.test(bare(status));
}

export async function collectDecisions() {
  const dir = path.join(ROOT, 'reports', 'decisions');
  const md = await fs.readFile(path.join(dir, 'README.md'), 'utf8');
  // The canonical id (D0001…) comes from the registry, not from this table, so
  // @jwildfire's own index stays prose he can edit without minding a key column.
  const registry = readRegistry();

  const rows = parseIndexTable(md);
  const decisions = await Promise.all(rows.map(async (row) => {
    const link = (row.decision ?? '').match(LINK);
    const discussion = (row.discussion ?? '').match(LINK);
    const goal = (row.goal ?? '').match(LINK);
    const status = row.status ?? '';
    const slug = row.slug;

    // The state is the page's, not the cell's. Reading it here is what makes every
    // surface built on this collector derive from one authority (#196, #255): the
    // artifact carries his words and declares what they add up to, and
    // scripts/check_decision_status.mjs fails the deploy if this table disagrees.
    let html = '';
    if (slug) {
      try {
        html = await fs.readFile(path.join(dir, slug, 'index.html'), 'utf8');
      } catch (err) {
        // ENOENT is the only failure allowed to read as "no page". Anything else is
        // an unreadable file, and treating it as absent would silently reopen a
        // settled decision on every surface downstream.
        if (err.code !== 'ENOENT') throw err;
      }
    }
    const state = readArtifactState(html).state;
    const awaiting = awaitingState(state);

    return {
      id: slug ? bySlug(registry, slug)?.id ?? null : null,
      title: link?.[1] ?? row.decision ?? '',
      // README-relative folder link → site path under the deployed reports tree
      path: link ? `reports/decisions/${link[2].replace(/^\.?\//, '')}` : null,
      date: row.date ?? '',
      goal: goal ? { label: goal[1], url: goal[2] } : null,
      discussion: discussion ? { label: discussion[1], url: discussion[2] } : null,
      status,
      statusPlain: plainStatus(status),
      state,
      awaiting,
      // Which flavour of retirement, and where the reader is sent, still comes from
      // the cell — the successor is a link he wrote, not a state. Only consulted on
      // a page the authority says is closed, so prose can no longer retire an
      // artifact on its own.
      foldedInto: state === 'closed' ? foldedInto(status) : null,
      closedInto: state === 'closed' ? (foldedInto(status) ? null : closedInto(status) ?? { via: null, id: null, slug: null }) : null,
    };
  }));

  return {
    awaiting: decisions.filter((d) => d.awaiting),
    decided: decisions.filter((d) => !d.awaiting),
    // A named subset of `decided`, not a third bucket beside it: every surface that
    // already unions awaiting + decided keeps rendering these without knowing the
    // state exists, and the ones that want to say "folded into D0017" can.
    folded: decisions.filter((d) => d.foldedInto),
    // Same arrangement for the ones he retired without answering.
    closed: decisions.filter((d) => d.closedInto),
  };
}
