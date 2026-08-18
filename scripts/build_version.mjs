#!/usr/bin/env node
// _site/version.json — the build's own account of itself, published as data.
//
// The header already renders this (lib/version.mjs, through lib/nav.mjs). This writes
// the same computed object to a file so that the Navigator sweep can READ THE VERDICT
// RATHER THAN RECOMPUTE IT.
//
// That distinction is the whole reason this file exists. The sweep runs every five
// minutes against @jwildfire's local hub clone, and that clone is not the deployed
// tree — it was measured five commits behind the deployed commit while this was being
// written. A drift figure computed there can contradict the figure on the page, on any
// morning where the clone has drifted, and then two surfaces disagree about one
// question and neither is obviously the liar. Two implementations of one judgement is
// the defect that forced classify.mjs into its own module; this is that lesson applied
// across a repo boundary, where the only way to share the answer is to publish it.
//
// So: the build computes, the page renders, the sweep relays. One judgement, one
// source, and the sweep's line about the site can never be newer or older than the
// site itself, because it IS the site's own line.
// The local-only guard (#203) — this generator writes into the published site,
// so it carries the boundary like every other. It reaches lib/version.mjs but not
// lib/repos.mjs, which is where the rest of them pick the guard up, so it says so
// itself rather than relying on an import it does not make.
import './lib/local-only-guard.mjs';

import { mkdir, writeFile } from 'node:fs/promises';
import { driftSummary, getVersionState } from './lib/version.mjs';

const state = getVersionState();
const drift = driftSummary(state);

const payload = {
  // A reader that finds this file has to be able to tell what it is without the repo.
  _readme: 'The obot hub build stamp. Written by scripts/build_version.mjs at deploy time and rendered by the header version badge; the Navigator sweep reads it to report changelog drift. `drift.behind` counts commits touching what the site shows since the commit that last touched site/roadmap-changelog.json.',
  version: state.version,
  changelogAt: state.changelogAt,
  builtAt: state.builtAt,
  commit: state.commit,
  short: state.short,
  run: state.run,
  trigger: state.trigger,
  ci: state.ci,
  drift: {
    ok: drift.ok,
    unknown: Boolean(drift.unknown),
    behind: state.drift?.known ? state.drift.behind : null,
    since: state.drift?.since ?? null,
    sinceAt: state.drift?.sinceAt ?? null,
    summary: drift.text,
    subjects: state.drift?.subjects ?? [],
    more: state.drift?.more ?? 0,
  },
};

await mkdir('_site', { recursive: true });
await writeFile('_site/version.json', `${JSON.stringify(payload, null, 2)}\n`);

// The build log is where a deploy is read back afterwards, so it says the same thing
// the page says — including on the healthy path, which is how anyone learns what the
// healthy path looks like.
console.log(`version: v${payload.version ?? '?'} · built ${payload.builtAt} · ${payload.short ?? 'no commit'}${payload.ci ? '' : ' (LOCAL — not a deploy)'}`);
console.log(`version: ${payload.drift.summary}`);
