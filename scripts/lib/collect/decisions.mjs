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

/**
 * Does this row still want an answer from @jwildfire?
 *
 * The emphasis has to come off first. Rows that were settled emphatically —
 * `**Decided 2026-08-15** — six of seven adopted` — read as still-open to a test
 * anchored on the literal start of the cell, and two answered decisions were
 * sitting in his waiting-on-you list because of it (found 2026-08-15 while
 * building the decision log). "Partially decided" stays awaiting on purpose:
 * some of its questions are still his.
 */
export function isAwaiting(status = '') {
  return !/^decided\b/i.test(status.replace(/[*_`]/g, '').trim());
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
      };
    });

  return {
    awaiting: decisions.filter((d) => d.awaiting),
    decided: decisions.filter((d) => !d.awaiting),
  };
}
