// The tracker's data: every objective on the hub, every requirement under it,
// every task under those — one tree, read from the sub-issue links GitHub
// records (issue contract → The tree, 2026-09-10).
//
// Two reads, both GraphQL: the objectives (label `objective`, open and closed),
// and the requirements (label `requirement`, open and closed) each carrying its
// `parent` pointer and its sub-issues with the task-level fields the page shows —
// repository, milestone, labels, state, the pull requests that close it. The
// requirement records themselves come from the requirements collector's pure
// half (`buildRequirements`), so the stage a requirement reads on the tracker is
// the same stage it reads everywhere else on the site, drift included.
//
// The pure half, `buildTracker(raw)`, is separated from the fetch so the page's
// roll-ups can be pinned by a test with no network (tracker.test.mjs) and the
// page can be rendered from a fixture (`build_tracker.mjs --fixture`).
import { graphql } from '../gh.mjs';
import { HUB } from '../repos.mjs';
import { buildRequirements, STATUS_LABELS } from './requirements.mjs';

const [OWNER, NAME] = HUB.split('/');

/** The stages a requirement can read, in lifecycle order, then the two closed readings and the one fault. */
export const STAGES = ['Backlog', 'Ready', 'In session', 'Review', 'Released', 'Retired', 'Unstaged'];
/** The five statuses of the contract, in the order they move — what the lifecycle strip draws. */
export const LIFECYCLE = Object.values(STATUS_LABELS);
/** The requirement's area label, per the contract. */
export const AREAS = ['safety', 'infrastructure', 'ai'];

const OBJECTIVES_QUERY = `
query ($owner: String!, $name: String!, $cursor: String) {
  repository(owner: $owner, name: $name) {
    issues(first: 50, after: $cursor, labels: ["objective"],
           states: [OPEN, CLOSED], orderBy: {field: CREATED_AT, direction: ASC}) {
      pageInfo { hasNextPage endCursor }
      nodes {
        number title url state stateReason body createdAt updatedAt closedAt
        milestone { title }
        labels(first: 20) { nodes { name } }
        subIssuesSummary { total completed }
      }
    }
  }
}`;

// The task fields, as a fragment so the query with and without the pull-request
// references (below) cannot drift apart in what else they ask for.
const TASK_FIELDS = `
        number title url state stateReason createdAt updatedAt closedAt
        repository { nameWithOwner }
        milestone { title }
        labels(first: 20) { nodes { name } }
        assignees(first: 5) { nodes { login } }`;

const requirementsQuery = (withPrs) => `
query ($owner: String!, $name: String!, $cursor: String) {
  repository(owner: $owner, name: $name) {
    issues(first: 40, after: $cursor, labels: ["requirement"],
           states: [OPEN, CLOSED], orderBy: {field: CREATED_AT, direction: ASC}) {
      pageInfo { hasNextPage endCursor }
      nodes {
        number title url state stateReason body createdAt updatedAt closedAt
        milestone { title }
        labels(first: 20) { nodes { name } }
        parent { number repository { nameWithOwner } }
        subIssuesSummary { total completed }
        subIssues(first: 100) { nodes {${TASK_FIELDS}${withPrs ? `
        closedByPullRequestsReferences(first: 5, includeClosedPrs: true) { nodes { number url state merged isDraft } }` : ''}
        } }
      }
    }
  }
}`;

async function pageThrough(query) {
  const nodes = [];
  let cursor = null;
  for (;;) {
    const data = await graphql(query, { owner: OWNER, name: NAME, cursor });
    const conn = data?.repository?.issues;
    if (!conn) throw new Error('no issues returned for the hub repository');
    nodes.push(...conn.nodes);
    if (!conn.pageInfo.hasNextPage) break;
    cursor = conn.pageInfo.endCursor;
  }
  return nodes;
}

/** The raw read: `{ objectives, requirements }` in the GraphQL shape `buildTracker` expects. */
export async function fetchTracker() {
  const objectives = await pageThrough(OBJECTIVES_QUERY);
  let requirements;
  try {
    requirements = await pageThrough(requirementsQuery(true));
  } catch (err) {
    // The pull-request references are the one field here that is not part of
    // the sub-issues API proper. If the schema the token sees refuses it, the
    // page still builds — tasks simply do not read "in review" from a PR.
    if (!/closedByPullRequestsReferences/i.test(err.message)) throw err;
    console.warn(`tracker: pull-request references unavailable (${err.message.slice(0, 120)}) — reading tasks without them`);
    requirements = await pageThrough(requirementsQuery(false));
  }
  return { objectives, requirements };
}

// ------------------------------------------------------------------ the model
const shortRepo = (nameWithOwner = '') => nameWithOwner.split('/')[1] ?? nameWithOwner;
const labelNames = (node) => (node.labels?.nodes ?? []).map((l) => l.name);
const isRetiredClose = (node) => node.stateReason === 'NOT_PLANNED' || node.stateReason === 'DUPLICATE';

// A task's reading, per the contract's state table: closed by its PR is done
// (or retired, if it closed as not planned); open with an open pull request is
// in review; otherwise open. `blocked` is an overlay, not a phase.
export function taskPhase(node) {
  if (node.state === 'CLOSED') return isRetiredClose(node) ? 'retired' : 'done';
  const prs = node.closedByPullRequestsReferences?.nodes ?? [];
  return prs.some((pr) => pr.state === 'OPEN') ? 'in review' : 'open';
}

function buildTask(node) {
  const repo = node.repository?.nameWithOwner ?? HUB;
  const labels = labelNames(node);
  return {
    key: `${shortRepo(repo)}#${node.number}`,
    repo,
    repoShort: shortRepo(repo),
    number: node.number,
    title: node.title,
    url: node.url,
    state: node.state,
    phase: taskPhase(node),
    blocked: labels.some((l) => l.toLowerCase() === 'blocked'),
    // A hub requirement linked under another requirement is a requirement, not a
    // task; the page says so rather than counting it as one PR's worth of work.
    isRequirement: repo === HUB && labels.includes('requirement'),
    milestone: node.milestone?.title ?? null,
    labels: labels.filter((l) => l.toLowerCase() !== 'blocked'),
    assignees: (node.assignees?.nodes ?? []).map((a) => a.login),
    prs: (node.closedByPullRequestsReferences?.nodes ?? []).map((pr) => ({
      number: pr.number, url: pr.url, state: pr.state, merged: Boolean(pr.merged), draft: Boolean(pr.isDraft),
    })),
    createdAt: node.createdAt,
    updatedAt: node.updatedAt,
    closedAt: node.closedAt ?? null,
  };
}

const zeroStages = () => Object.fromEntries(STAGES.map((s) => [s, 0]));

function taskRollup(tasks) {
  const r = { total: 0, open: 0, inReview: 0, done: 0, retired: 0, blocked: 0 };
  for (const t of tasks) {
    r.total += 1;
    if (t.phase === 'done') r.done += 1;
    else if (t.phase === 'retired') r.retired += 1;
    else if (t.phase === 'in review') r.inReview += 1;
    else r.open += 1;
    if (t.blocked && t.state === 'OPEN') r.blocked += 1;
  }
  return r;
}

function requirementRollup(reqs) {
  const byStage = zeroStages();
  let open = 0, closed = 0, drift = 0, blocked = 0;
  for (const r of reqs) {
    byStage[r.stage] = (byStage[r.stage] ?? 0) + 1;
    if (r.state === 'OPEN') open += 1; else closed += 1;
    if (r.drift) drift += 1;
    if (r.blocked) blocked += 1;
  }
  return { total: reqs.length, open, closed, drift, blocked, byStage };
}

const objectiveTitle = (t) => t.replace(/^(Objective|Goal):\s*/i, '');
const slugOf = (body = '', number) =>
  (body.match(/<!--\s*(?:objective|goal)-slug:\s*([a-z0-9-]+)\s*-->/) || [])[1] ?? `goal-${number}`;

// Objectives in reading order: open before closed; among the open, the
// scheduled ones (a delivery-target milestone) before the unscheduled
// (`backlog` or none); then by number, which is the order they were filed.
const unscheduled = (o) => !o.milestone || o.milestone.toLowerCase() === 'backlog';
function objectiveOrder(a, b) {
  if (a.state !== b.state) return a.state === 'OPEN' ? -1 : 1;
  if (a.state === 'OPEN' && unscheduled(a) !== unscheduled(b)) return unscheduled(a) ? 1 : -1;
  return a.number - b.number;
}

/**
 * The pure half: raw GraphQL nodes in, the page's tree out.
 *
 * @returns {{
 *   objectives: object[], unparented: object[], requirements: object[],
 *   totals: object, milestones: string[], repos: string[]
 * }}
 */
export function buildTracker({ objectives = [], requirements = [] }) {
  // Requirement records from the shared collector, so stage and drift agree
  // with every other page; then the task detail this page adds.
  const shared = new Map(buildRequirements(requirements).map((r) => [r.number, r]));
  const reqs = requirements.map((node) => {
    const base = shared.get(node.number);
    const tasks = (node.subIssues?.nodes ?? []).map(buildTask);
    const labels = labelNames(node);
    const parent = node.parent?.number ?? null;
    return {
      ...base,
      area: AREAS.find((a) => labels.includes(a)) ?? null,
      blocked: labels.some((l) => l.toLowerCase() === 'blocked'),
      objective: parent,
      closedAt: node.closedAt ?? null,
      tasks,
      taskRollup: taskRollup(tasks),
      repos: [...new Set(tasks.map((t) => t.repo))],
    };
  });

  const byObjective = new Map();
  for (const r of reqs) {
    if (!byObjective.has(r.objective)) byObjective.set(r.objective, []);
    byObjective.get(r.objective).push(r);
  }
  const objectiveNumbers = new Set(objectives.map((o) => o.number));

  const objs = objectives.map((node) => {
    const members = (byObjective.get(node.number) ?? []).slice().sort(requirementOrder);
    const allTasks = members.flatMap((r) => r.tasks);
    return {
      number: node.number,
      title: objectiveTitle(node.title),
      url: node.url,
      state: node.state,
      retired: node.state === 'CLOSED' && isRetiredClose(node),
      milestone: node.milestone?.title ?? null,
      slug: slugOf(node.body, node.number),
      page: `goals/${slugOf(node.body, node.number)}.html`,
      createdAt: node.createdAt,
      updatedAt: node.updatedAt,
      closedAt: node.closedAt ?? null,
      requirements: members,
      // What GitHub counts as this objective's sub-issues, for the case where a
      // member is not a requirement (or is one the collector did not read).
      subIssues: node.subIssuesSummary ?? { total: members.length, completed: members.filter((r) => r.state === 'CLOSED').length },
      reqRollup: requirementRollup(members),
      taskRollup: taskRollup(allTasks),
    };
  }).sort(objectiveOrder);

  // A requirement whose parent is not an objective the read returned — no
  // parent at all, or a parent that is another requirement — is unparented
  // here. The tree does not hide it: a requirement nothing can reach is exactly
  // what the review lane exists to show.
  const unparented = reqs.filter((r) => !objectiveNumbers.has(r.objective)).sort(requirementOrder);

  const allTasks = reqs.flatMap((r) => r.tasks);
  const totals = {
    objectives: {
      total: objs.length,
      open: objs.filter((o) => o.state === 'OPEN').length,
      closed: objs.filter((o) => o.state !== 'OPEN').length,
    },
    requirements: requirementRollup(reqs),
    tasks: taskRollup(allTasks),
    unparented: unparented.length,
  };

  const milestones = [...new Set(reqs.map((r) => r.milestone).filter(Boolean))].sort(milestoneOrder);
  const repos = [...new Set(allTasks.map((t) => t.repo))].sort();

  return { objectives: objs, unparented, requirements: reqs, totals, milestones, repos };
}

// Requirements within an objective: the in-flight ones first, in lifecycle
// order, then the backlog, then the closed — and within a stage the most
// recently touched first. Same rule the catalog reads by.
const REQ_STAGE_ORDER = ['In session', 'Review', 'Ready', 'Unstaged', 'Backlog', 'Released', 'Retired'];
function requirementOrder(a, b) {
  const s = REQ_STAGE_ORDER.indexOf(a.stage) - REQ_STAGE_ORDER.indexOf(b.stage);
  return s !== 0 ? s : (b.updatedAt ?? '').localeCompare(a.updatedAt ?? '');
}

// Milestones: named delivery targets (2026-10-talk) and quarters (2026q3) sort
// as they read, `backlog` last.
function milestoneOrder(a, b) {
  const ab = a.toLowerCase() === 'backlog', bb = b.toLowerCase() === 'backlog';
  if (ab !== bb) return ab ? 1 : -1;
  return a.localeCompare(b);
}

export async function collectTracker() {
  return buildTracker(await fetchTracker());
}
