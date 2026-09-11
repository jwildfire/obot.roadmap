// Requirement issues from the hub, enriched with the signals agents actually
// maintain — sub-issue state (and the repos those sub-issues live in) and the
// discussion a requirement was promoted from.
//
// Status lives on the issue as a `status: …` label (issue contract → Status,
// 2026-09-10): the obot Roadmap project board is retired. A label is readable by
// any token — the board's Status field needed @jwildfire's own — and it is written
// through the same lane as every other issue edit. `drift` marks what the label
// cannot hide: an OPEN requirement labelled released, an open one carrying no
// status label at all, or one carrying two.
import { graphql } from '../gh.mjs';
import { HUB } from '../repos.mjs';

const [OWNER, NAME] = HUB.split('/');


/** The five statuses, label → stage name, in the order the contract moves them. */
export const STATUS_LABELS = {
  'status: backlog': 'Backlog',
  'status: ready': 'Ready',
  'status: in session': 'In session',
  'status: review': 'Review',
  'status: released': 'Released',
};
export const ACTIVE_STAGES = ['Ready', 'In session', 'Review'];
const STAGE_ORDER = ['In session', 'Review', 'Ready', 'Unstaged', 'Backlog', 'Released', 'Retired'];

const QUERY = `
query ($owner: String!, $name: String!, $cursor: String) {
  repository(owner: $owner, name: $name) {
    issues(first: 50, after: $cursor, labels: ["requirement"],
           states: [OPEN, CLOSED], orderBy: {field: CREATED_AT, direction: ASC}) {
      pageInfo { hasNextPage endCursor }
      nodes {
        number title url state stateReason body updatedAt createdAt
        milestone { title }
        labels(first: 20) { nodes { name } }
        subIssuesSummary { total completed }
        subIssues(first: 50) { nodes { number url state repository { nameWithOwner } } }
      }
    }
  }
}`;

/** Every status label an issue carries, as stage names. One is right; zero or two is drift. */
export function statusesOf(issue) {
  return issue.labels.nodes
    .map((l) => STATUS_LABELS[l.name.toLowerCase()])
    .filter(Boolean);
}

// The stage a row is shown under. A closed requirement reads from how it closed,
// whatever label it carries — closing is the fact, the label is the record: closed
// as completed is Released; closed as not planned (or as a duplicate) is Retired,
// so the forty-odd requirements of the autonomous prototype closed on 2026-09-11
// do not read as shipped work. An open one with no label is Unstaged, and says so
// on its pill rather than borrowing a stage.
function stageOf(issue, statuses) {
  if (issue.state === 'CLOSED') return issue.stateReason === 'NOT_PLANNED' || issue.stateReason === 'DUPLICATE' ? 'Retired' : 'Released';
  if (statuses.length === 1) return statuses[0];
  if (statuses.length > 1) return statuses.find((s) => s !== 'Released') ?? statuses[0];
  return 'Unstaged';
}

// "Open but released" is the drift the audit caught; an unlabelled open
// requirement and a doubly-labelled one are the two ways a label can lie.
function driftOf(issue, statuses) {
  if (statuses.length > 1) return 'two statuses';
  if (issue.state !== 'OPEN') return null;
  if (statuses[0] === 'Released') return 'open in Released';
  if (!statuses.length) return 'unstaged';
  return null;
}

function reposOf(issue) {
  const repos = new Set(issue.subIssues.nodes.map((n) => n?.repository?.nameWithOwner).filter(Boolean));
  if (!repos.size) repos.add(`${OWNER}/${NAME}`);
  return [...repos];
}

function taskProgress(issue) {
  const s = issue.subIssuesSummary;
  if (s?.total) return { done: s.completed, total: s.total, source: 'sub-issues' };
  // Legacy fallback: inline "### Tasks" checkboxes, for requirements filed before
  // sub-issues became the canonical tracker (requirement-tasks skill).
  const section = issue.body?.split(/^### Tasks/m)[1] ?? '';
  const done = (section.match(/- \[x\]/gi) || []).length;
  const open = (section.match(/- \[ \]/g) || []).length;
  return done + open ? { done, total: done + open, source: 'checklist' } : null;
}

/**
 * The pure half: raw issues in, page records out. Separated from the fetch so
 * what the page is allowed to call drift can be pinned by a test with no network
 * (requirements.test.mjs).
 */
export function buildRequirements(issues) {
  return issues.map((issue) => {
    const statuses = statusesOf(issue);
    const stage = stageOf(issue, statuses);
    const drift = driftOf(issue, statuses);
    const promotedFrom = (issue.body?.match(/Promoted from discussion #(\d+)/i) || [])[1] ?? null;
    return {
      number: issue.number,
      // Every requirement issue is titled "Requirement: …" by the drafting
      // skill; the column header already says so, and dropping it buys ~13
      // characters of title on every row.
      title: issue.title.replace(/^Requirement:\s*/i, ''),
      url: issue.url,
      state: issue.state,
      stage,
      status: statuses.length === 1 ? statuses[0] : null,
      drift,
      // Visible above the fold when the label says it is in flight, or when the
      // label is wrong in a way that would otherwise hide live work.
      active: issue.state === 'OPEN' && (ACTIVE_STAGES.includes(stage) || Boolean(drift)),
      labels: issue.labels.nodes.map((l) => l.name).filter((l) => l !== 'requirement' && !STATUS_LABELS[l.toLowerCase()]),
      milestone: issue.milestone?.title ?? null,
      repos: reposOf(issue),
      tasks: taskProgress(issue),
      updatedAt: issue.updatedAt,
      createdAt: issue.createdAt,
      promotedFrom: promotedFrom ? Number(promotedFrom) : null,
    };
  }).sort((a, b) => {
    const s = STAGE_ORDER.indexOf(a.stage) - STAGE_ORDER.indexOf(b.stage);
    return s !== 0 ? s : b.updatedAt.localeCompare(a.updatedAt);
  });
}

export async function collectRequirements() {
  const issues = [];
  let cursor = null;
  for (;;) {
    const data = await graphql(QUERY, { owner: OWNER, name: NAME, cursor });
    const conn = data?.repository?.issues;
    if (!conn) throw new Error('no issues returned for the hub repository');
    issues.push(...conn.nodes);
    if (!conn.pageInfo.hasNextPage) break;
    cursor = conn.pageInfo.endCursor;
  }

  return buildRequirements(issues);
}
