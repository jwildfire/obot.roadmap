// Every open issue across the portfolio with its sub-issue parent pointer — the
// raw material for the roadmap page's hierarchy section (goal → requirement →
// task). Membership is the parent link itself (the same relationship the goal
// pages read from the other end), so the tree renders what GitHub actually
// records rather than a hand-maintained list; anything parentless and not
// reachable from a goal is an orphan, which is the point of the view.
import { graphql } from '../gh.mjs';
import { REPOS } from '../repos.mjs';

const FRAGMENT = `
fragment hierIssues on Repository {
  nameWithOwner
  issues(states: OPEN, first: 100, orderBy: {field: CREATED_AT, direction: ASC}) {
    pageInfo { hasNextPage }
    nodes {
      number title url updatedAt
      labels(first: 10) { nodes { name } }
      subIssuesSummary { total completed }
      parent { number repository { nameWithOwner } }
    }
  }
}`;

export async function collectHierarchy() {
  const query = `query {
${REPOS.map((r) => `  ${r.alias}: repository(owner: "${r.owner}", name: "${r.name}") { ...hierIssues }`).join('\n')}
}
${FRAGMENT}`;

  const data = await graphql(query);
  const issues = new Map(); // "owner/name#number" → node
  const truncated = [];
  for (const repo of REPOS) {
    const node = data?.[repo.alias];
    if (!node) continue; // partial GraphQL error — gh.mjs already warned
    if (node.issues.pageInfo.hasNextPage) truncated.push(repo.nameWithOwner);
    for (const i of node.issues.nodes) {
      const key = `${repo.nameWithOwner}#${i.number}`;
      issues.set(key, {
        key,
        repo: repo.nameWithOwner,
        number: i.number,
        title: i.title,
        url: i.url,
        updatedAt: i.updatedAt,
        labels: i.labels.nodes.map((l) => l.name),
        subs: i.subIssuesSummary ?? { total: 0, completed: 0 },
        // A parent outside REPOS (or a closed parent) resolves to a key that is
        // absent from `issues` — the renderer treats that child as rootless.
        parentKey: i.parent ? `${i.parent.repository.nameWithOwner}#${i.parent.number}` : null,
      });
    }
  }
  if (!issues.size) throw new Error('hierarchy: no open issues returned for any portfolio repo');
  return { issues, truncated };
}
