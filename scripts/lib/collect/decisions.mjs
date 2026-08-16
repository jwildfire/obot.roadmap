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

const LINK = /\[([^\]]+)\]\(([^)]+)\)/; // first markdown link in a cell

function cell(cells, headers, name) {
  const i = headers.indexOf(name);
  return i === -1 ? '' : (cells[i] ?? '');
}

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
  const m = /\b(?:superseded|replaced|answered)\s+by\s+\[?([A-Z]\d{4})\]?\s*(?:\(([^)]+)\))?/i.exec(cell);
  return {
    id: m?.[1]?.toUpperCase() ?? null,
    slug: m?.[2] ? m[2].replace(/^\.?\//, '').replace(/\/$/, '') : null,
  };
}

/**
 * Does this row still want an answer from @jwildfire?
 *
 * The emphasis has to come off first. Rows that were settled emphatically —
 * `**Decided 2026-08-15** — six of seven adopted` — read as still-open to a test
 * anchored on the literal start of the cell, and two answered decisions were
 * sitting in his waiting-on-you list because of it (found 2026-08-15 while
 * building the decision log). "Partially decided" stays awaiting on purpose:
 * some of its questions are still his.
 *
 * A folded row wants nothing from him either — its questions are the successor's
 * now. It stays out of `awaiting` and, deliberately, inside `decided`, so every
 * surface that already lists the settled artifacts keeps listing it and a reader
 * who remembers D0015 can still find out where it went.
 *
 * A closed row wants nothing from him because he is the one who closed it.
 */
export function isAwaiting(status = '') {
  if (foldedInto(status) || closedInto(status)) return false;
  return !/^decided\b/i.test(bare(status));
}

export async function collectDecisions() {
  const md = await fs.readFile(path.join(ROOT, 'reports', 'decisions', 'README.md'), 'utf8');
  // The canonical id (D0001…) comes from the registry, not from this table, so
  // @jwildfire's own index stays prose he can edit without minding a key column.
  const registry = readRegistry();

  // The table under "## Index": a header row, a rule row, then data rows.
  const lines = md.split(/\r?\n/);
  const start = lines.findIndex((l) => /^##\s+Index\b/.test(l));
  if (start === -1) throw new Error('reports/decisions/README.md has no "## Index" section');
  const rows = lines.slice(start)
    .filter((l) => /^\s*\|/.test(l))
    .map((l) => l.replace(/^\s*\|/, '').replace(/\|\s*$/, '').split('|').map((c) => c.trim()));
  if (rows.length < 2) throw new Error('reports/decisions/README.md: the Index table has no rows');

  const headers = rows[0].map((h) => h.toLowerCase());
  const decisions = rows.slice(1)
    .filter((cells) => !/^[-\s:]+$/.test(cells.join(''))) // the |---|---| rule row
    .map((cells) => {
      const link = cell(cells, headers, 'decision').match(LINK);
      const discussion = cell(cells, headers, 'discussion').match(LINK);
      const goal = cell(cells, headers, 'goal').match(LINK);
      const status = cell(cells, headers, 'status');
      const slug = link ? link[2].replace(/^\.?\//, '').replace(/\/$/, '') : null;
      return {
        id: slug ? bySlug(registry, slug)?.id ?? null : null,
        title: link?.[1] ?? cell(cells, headers, 'decision'),
        // README-relative folder link → site path under the deployed reports tree
        path: link ? `reports/decisions/${link[2].replace(/^\.?\//, '')}` : null,
        date: cell(cells, headers, 'date'),
        goal: goal ? { label: goal[1], url: goal[2] } : null,
        discussion: discussion ? { label: discussion[1], url: discussion[2] } : null,
        status,
        // The status cell may carry markdown links; flatten them for meta columns.
        statusPlain: status.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1'),
        awaiting: isAwaiting(status),
        foldedInto: foldedInto(status),
        closedInto: closedInto(status),
      };
    });

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
