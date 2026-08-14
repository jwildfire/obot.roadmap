// Open pull requests across the portfolio, in one batched GraphQL query.
//
// Deliberately not `gh search prs --owner jwildfire`: owner-wide search sweeps in
// unrelated forks (four 2021-22 dependabot PRs on forest-plot) and lags behind
// the index. Aliased per-repo connections are exact and cost one request.
import { graphql } from '../gh.mjs';
import { REPOS } from '../repos.mjs';

const FRAGMENT = `
fragment prFields on Repository {
  nameWithOwner
  pullRequests(states: OPEN, first: 25, orderBy: {field: UPDATED_AT, direction: DESC}) {
    nodes {
      number title url isDraft createdAt updatedAt body
      author { login }
      baseRefName headRefName reviewDecision
      reviewRequests(first: 10) { nodes { requestedReviewer { ... on User { login } } } }
      labels(first: 6) { nodes { name } }
    }
  }
}`;

// A PR's requirement link: "Closes #12" style keywords pointing at the hub, per
// the Issue–PR Link Convention. Repo-local numbers are ignored — the roadmap row
// only cares about hub requirements.
const HUB_REF = /(?:closes|fixes|resolves|requirement|hub)\s+(?:jwildfire\/obot\.roadmap)?#(\d+)/gi;
const HUB_URL = /github\.com\/jwildfire\/obot\.roadmap\/issues\/(\d+)/gi;

function requirementRefs(pr) {
  const text = `${pr.title}\n${pr.body ?? ''}`;
  const refs = new Set();
  for (const m of text.matchAll(HUB_REF)) refs.add(Number(m[1]));
  for (const m of text.matchAll(HUB_URL)) refs.add(Number(m[1]));
  return [...refs];
}

export async function collectOpenPRs() {
  const query = `query {
${REPOS.map((r) => `  ${r.alias}: repository(owner: "${r.owner}", name: "${r.name}") { ...prFields }`).join('\n')}
}
${FRAGMENT}`;

  const data = await graphql(query);
  const prs = [];
  for (const repo of REPOS) {
    const node = data?.[repo.alias];
    if (!node) continue; // one unreadable repo must not drop the rest
    for (const pr of node.pullRequests.nodes) {
      prs.push({
        repo: node.nameWithOwner,
        number: pr.number,
        title: pr.title,
        url: pr.url,
        isDraft: pr.isDraft,
        author: pr.author?.login ?? 'unknown',
        base: pr.baseRefName,
        head: pr.headRefName,
        reviewDecision: pr.reviewDecision,
        // Requested reviewers by login. Per the RC framework, review is only ever
        // requested from @jwildfire, and only on release-candidate PRs — this is
        // the discriminator the roadmap's Todo section filters on.
        reviewRequested: pr.reviewRequests.nodes.map((n) => n.requestedReviewer?.login).filter(Boolean),
        labels: pr.labels.nodes.map((l) => l.name),
        createdAt: pr.createdAt,
        updatedAt: pr.updatedAt,
        requirements: requirementRefs(pr),
      });
    }
  }
  return prs.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}
