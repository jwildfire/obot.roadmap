// Canonical portfolio repo list — the single source every generator reads.
//
// scripts/status-repos.csv is the file of record (it already drives the gh.dash
// status dashboard). Everything else reads it through here rather than keeping a
// private copy: that duplication is how build_news.mjs and build_metrics.py ended
// up still scoping to "safety.agent" long after the repo was renamed to
// obot.agent (2026-07-11), quietly dropping obot.agent and open.gismo from the
// homepage metrics and the news feed. Adding a repo stays a CSV edit.
import fs from 'node:fs';
import path from 'node:path';

export const ROOT = path.resolve(new URL('../..', import.meta.url).pathname);
export const HUB = 'jwildfire/obot.roadmap';

// GraphQL aliases must match /^[_A-Za-z][_0-9A-Za-z]*$/ — repo names carry dots
// and dashes, so batched queries key off `alias` rather than the name.
const aliasOf = (name) => `r_${name.replace(/[^0-9A-Za-z]/g, '_')}`;

export function readRepos(root = ROOT) {
  const csv = path.join(root, 'scripts', 'status-repos.csv');
  const lines = fs.readFileSync(csv, 'utf8').split(/\r?\n/).map((l) => l.trim());
  const header = lines.shift();
  if (header !== 'repo') throw new Error(`status-repos.csv: expected a "repo" header, got "${header}"`);
  const repos = lines
    .filter(Boolean)
    .map((nameWithOwner) => {
      const [owner, name] = nameWithOwner.split('/');
      if (!owner || !name) throw new Error(`status-repos.csv: "${nameWithOwner}" is not owner/name`);
      return { owner, name, nameWithOwner, alias: aliasOf(name) };
    });
  if (!repos.length) throw new Error('status-repos.csv lists no repos');
  return repos;
}

export const REPOS = readRepos();
export const REPO_NAMES = REPOS.map((r) => r.nameWithOwner);
