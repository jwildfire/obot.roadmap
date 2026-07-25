// One coherent read of everything the audit rules judge (requirement #92).
//
// The rules must be pure functions of a snapshot — that is what makes a finding
// reproducible, unit-testable against fixtures, and safe to re-validate before
// anything is applied. So all API access lives here and nowhere in rules.mjs.
//
// Four sources:
//   hub issues      every issue, open and closed, with labels, milestone,
//                   assignees, sub-issues (state + repo) and body
//   board           the obot Roadmap project's items, with their Status option
//                   AND their item ids — the executor needs the id to mutate
//   pull requests   open across the portfolio, plus recently merged, each with
//                   its closing references (cross-repo `Closes` never auto-closes,
//                   which is a rule)
//   ideas           Ideas discussions and the issue each was promoted to
//
// Plus one local read: which requirements have a design doc on disk.
import fs from 'node:fs/promises';
import path from 'node:path';

import { graphql } from '../gh.mjs';
import { REPOS, ROOT, HUB } from '../repos.mjs';

const [OWNER, NAME] = HUB.split('/');
export const PROJECT_NUMBER = 1;
export const MERGED_PR_WINDOW_DAYS = 21;

// ------------------------------------------------------------------ hub issues
const ISSUES_QUERY = `
query ($owner: String!, $name: String!, $cursor: String) {
  repository(owner: $owner, name: $name) {
    issues(first: 50, after: $cursor, states: [OPEN, CLOSED],
           orderBy: {field: CREATED_AT, direction: ASC}) {
      pageInfo { hasNextPage endCursor }
      nodes {
        id number title url state stateReason body createdAt updatedAt closedAt
        milestone { title }
        author { login }
        assignees(first: 5) { nodes { login } }
        labels(first: 20) { nodes { name } }
        subIssuesSummary { total completed }
        subIssues(first: 50) {
          nodes { number title url state repository { nameWithOwner } }
        }
      }
    }
  }
}`;

async function readIssues() {
  const nodes = [];
  let cursor = null;
  for (;;) {
    const data = await graphql(ISSUES_QUERY, { owner: OWNER, name: NAME, cursor });
    const conn = data?.repository?.issues;
    if (!conn) throw new Error('no issues returned for the hub repository');
    nodes.push(...conn.nodes);
    if (!conn.pageInfo.hasNextPage) break;
    cursor = conn.pageInfo.endCursor;
  }
  return nodes.map((i) => ({
    nodeId: i.id,
    repo: HUB,
    number: i.number,
    title: i.title,
    url: i.url,
    state: i.state,
    stateReason: i.stateReason,
    body: i.body ?? '',
    author: i.author?.login ?? 'unknown',
    labels: i.labels.nodes.map((l) => l.name),
    milestone: i.milestone?.title ?? null,
    assignees: i.assignees.nodes.map((a) => a.login),
    subIssues: i.subIssues.nodes.map((s) => ({
      repo: s.repository?.nameWithOwner ?? HUB,
      number: s.number,
      title: s.title,
      url: s.url,
      state: s.state,
    })),
    subSummary: { total: i.subIssuesSummary?.total ?? 0, completed: i.subIssuesSummary?.completed ?? 0 },
    createdAt: i.createdAt,
    updatedAt: i.updatedAt,
    closedAt: i.closedAt,
  }));
}

// ------------------------------------------------------------------ the board
// Read as a project, not through each issue's projectItems: only this shape
// exposes the item id (every board mutation needs it), items whose content lives
// in a spoke repo, and the same issue added twice.
const BOARD_QUERY = `
query ($login: String!, $number: Int!, $cursor: String) {
  user(login: $login) {
    projectV2(number: $number) {
      id title
      field(name: "Status") {
        ... on ProjectV2SingleSelectField { id name options { id name } }
      }
      items(first: 100, after: $cursor) {
        pageInfo { hasNextPage endCursor }
        nodes {
          id
          fieldValueByName(name: "Status") {
            ... on ProjectV2ItemFieldSingleSelectValue { name optionId }
          }
          content {
            __typename
            ... on Issue { number title url state repository { nameWithOwner } }
            ... on PullRequest { number title url state repository { nameWithOwner } }
            ... on DraftIssue { title }
          }
        }
      }
    }
  }
}`;

async function readBoard() {
  const items = [];
  let cursor = null;
  let project = null;
  for (;;) {
    const data = await graphql(BOARD_QUERY, { login: OWNER, number: PROJECT_NUMBER, cursor });
    const p = data?.user?.projectV2;
    // A token without project scope reads null here. That is a degradation, not
    // a crash: board rules skip, everything else still audits.
    if (!p) return { readable: false, project: null, statusField: null, items: [] };
    project = project ?? { id: p.id, title: p.title };
    const field = p.field ?? null;
    items.push(...p.items.nodes.map((n) => ({
      itemId: n.id,
      status: n.fieldValueByName?.name ?? null,
      statusOptionId: n.fieldValueByName?.optionId ?? null,
      type: n.content?.__typename ?? 'Unknown',
      repo: n.content?.repository?.nameWithOwner ?? null,
      number: n.content?.number ?? null,
      title: n.content?.title ?? '',
      url: n.content?.url ?? null,
      contentState: n.content?.state ?? null,
    })));
    if (!p.items.pageInfo.hasNextPage) {
      return {
        readable: true,
        project,
        statusField: field ? { id: field.id, options: field.options } : null,
        items,
      };
    }
    cursor = p.items.pageInfo.endCursor;
  }
}

// ------------------------------------------------------------- pull requests
const PR_FRAGMENT = `
fragment prFields on Repository {
  nameWithOwner
  open: pullRequests(states: OPEN, first: 25, orderBy: {field: UPDATED_AT, direction: DESC}) {
    nodes { ...prCore }
  }
  merged: pullRequests(states: MERGED, first: 20, orderBy: {field: UPDATED_AT, direction: DESC}) {
    nodes { ...prCore }
  }
}
fragment prCore on PullRequest {
  number title url isDraft state body createdAt updatedAt mergedAt
  author { login }
  baseRefName reviewDecision
  labels(first: 10) { nodes { name } }
  closingIssuesReferences(first: 10) {
    nodes { number title url state repository { nameWithOwner } }
  }
}`;

// The hub reference conventions, same as the roadmap page's PR collector: a PR
// names its requirement with a closing keyword, a bare hub ref, or a URL.
const HUB_REF = /(?:closes|fixes|resolves|requirement|hub)\s+(?:jwildfire\/obot\.roadmap)?#(\d+)/gi;
const HUB_URL = /github\.com\/jwildfire\/obot\.roadmap\/issues\/(\d+)/gi;

function hubRefs(pr) {
  const text = `${pr.title}\n${pr.body ?? ''}`;
  const refs = new Set();
  for (const m of text.matchAll(HUB_REF)) refs.add(Number(m[1]));
  for (const m of text.matchAll(HUB_URL)) refs.add(Number(m[1]));
  return [...refs];
}

const shapePr = (repo, pr, merged) => ({
  repo,
  number: pr.number,
  title: pr.title,
  url: pr.url,
  isDraft: pr.isDraft,
  merged,
  author: pr.author?.login ?? 'unknown',
  base: pr.baseRefName,
  reviewDecision: pr.reviewDecision,
  labels: pr.labels.nodes.map((l) => l.name),
  body: pr.body ?? '',
  createdAt: pr.createdAt,
  updatedAt: pr.updatedAt,
  mergedAt: pr.mergedAt ?? null,
  closes: pr.closingIssuesReferences.nodes.map((n) => ({
    repo: n.repository?.nameWithOwner ?? repo,
    number: n.number,
    title: n.title,
    url: n.url,
    state: n.state,
  })),
  hubRefs: hubRefs(pr),
});

async function readPullRequests(now) {
  const query = `query {
${REPOS.map((r) => `  ${r.alias}: repository(owner: "${r.owner}", name: "${r.name}") { ...prFields }`).join('\n')}
}
${PR_FRAGMENT}`;
  const data = await graphql(query);
  const open = [];
  const merged = [];
  for (const repo of REPOS) {
    const node = data?.[repo.alias];
    if (!node) continue; // one unreadable repo must not drop the rest
    for (const pr of node.open.nodes) open.push(shapePr(node.nameWithOwner, pr, false));
    for (const pr of node.merged.nodes) {
      const days = (now - new Date(pr.mergedAt)) / 86400000;
      if (days <= MERGED_PR_WINDOW_DAYS) merged.push(shapePr(node.nameWithOwner, pr, true));
    }
  }
  return { open, merged };
}

// ------------------------------------------------------------------- ideas
const IDEAS_QUERY = `
query ($owner: String!, $name: String!) {
  repository(owner: $owner, name: $name) {
    discussions(first: 50, orderBy: {field: UPDATED_AT, direction: DESC}) {
      nodes {
        id number title url createdAt updatedAt closed closedAt stateReason
        category { name }
        author { login }
        comments(first: 30) { nodes { author { login } body } }
      }
    }
  }
}`;

// Promotion wording is not stable across the triage Action, headless runs and
// interactive sessions — match the marker, then the first issue ref after it.
// (Same contract as scripts/lib/collect/ideas.mjs; kept local so a change there
// cannot silently retune the audit.)
const MARKER = /(?:filed as|promoted(?:\s+(?:to|into))?)\b/i;
const REF = /https:\/\/github\.com\/jwildfire\/obot\.roadmap\/issues\/(\d+)|jwildfire\/obot\.roadmap#(\d+)|#(\d+)/;

function promotion(discussion) {
  for (const c of discussion.comments.nodes) {
    const body = c.body ?? '';
    const marker = body.match(MARKER);
    if (!marker) continue;
    const ref = body.slice(marker.index + marker[0].length).match(REF);
    if (!ref) continue;
    const number = Number(ref[1] ?? ref[2] ?? ref[3]);
    if (!number || number === discussion.number) continue;
    return number;
  }
  return null;
}

async function readIdeas() {
  const data = await graphql(IDEAS_QUERY, { owner: OWNER, name: NAME });
  return (data?.repository?.discussions?.nodes ?? [])
    .filter((d) => d.category?.name === 'Ideas')
    .map((d) => ({
      nodeId: d.id,
      number: d.number,
      title: d.title,
      url: d.url,
      author: d.author?.login ?? 'unknown',
      createdAt: d.createdAt,
      updatedAt: d.updatedAt,
      closed: d.closed,
      closedAt: d.closedAt,
      stateReason: d.stateReason,
      promotedTo: promotion(d),
    }));
}

// -------------------------------------------------------------- design docs
async function readDesignDocs(root = ROOT) {
  try {
    const files = await fs.readdir(path.join(root, 'requirements', 'design'));
    const numbers = new Set();
    for (const f of files) {
      const m = f.match(/^(\d+)_design\.(html|md)$/);
      if (m) numbers.add(Number(m[1]));
    }
    return numbers;
  } catch {
    return new Set();
  }
}

// ------------------------------------------------------------------ assemble
export async function buildSnapshot({ now = new Date(), root = ROOT } = {}) {
  const [issues, board, prs, ideas, designDocs] = await Promise.all([
    readIssues(),
    readBoard(),
    readPullRequests(now),
    readIdeas(),
    readDesignDocs(root),
  ]);

  return {
    now,
    hub: HUB,
    repos: REPOS.map((r) => r.nameWithOwner),
    issues,
    board,
    prs,
    ideas,
    designDocs,
    // Indexes the rules would otherwise rebuild each time.
    issueByNumber: new Map(issues.map((i) => [i.number, i])),
    boardByKey: boardIndex(board.items),
    parentOf: parentIndex(issues),
  };
}

// `repo#number` → every board item for it (a list, because duplicates are a rule).
export function boardIndex(items) {
  const index = new Map();
  for (const it of items) {
    if (!it.repo || !it.number) continue;
    const key = `${it.repo}#${it.number}`;
    if (!index.has(key)) index.set(key, []);
    index.get(key).push(it);
  }
  return index;
}

// Child `repo#number` → its hub parents. Built from hub issues' sub-issue lists
// rather than the `parent` field so one query serves both directions.
export function parentIndex(issues) {
  const index = new Map();
  for (const issue of issues) {
    for (const sub of issue.subIssues) {
      const key = `${sub.repo}#${sub.number}`;
      if (!index.has(key)) index.set(key, []);
      index.get(key).push({ number: issue.number, title: issue.title, labels: issue.labels, url: issue.url });
    }
  }
  return index;
}
