// Requirement issues from the hub, enriched with the signals agents actually
// maintain — sub-issue state (and the repos those sub-issues live in) and the
// discussion a requirement was promoted from.
//
// The board's Status field stays the primary stage signal, but it is hand-moved,
// and the 2026-07-11 usage audit showed what that costs: on the biggest shipping
// day the Development lane was empty. So `drift` marks the cases the old page
// hid — an OPEN requirement parked in Released, or sitting on the board with no
// Status at all — and the page keeps those visible instead of folding them away.
//
// `blocked` is the other half, and it exists because a count can lie by being
// true (#254). Since 2026-08-18 nothing can write to the obot Roadmap board:
// the obotclaw App is FORBIDDEN on a user-owned Project and the attribution
// guard denies the one credential that works (#252). A requirement filed since
// then has no Status because nothing could give it one — so counting it as
// drift makes a number that climbs by itself every time work is filed, and a
// drift number that rises on its own is indistinguishable from real discipline
// decay. These rows are still shown, still counted, and still say `Unstaged`;
// what changes is that they are counted as blocked rather than as drift, and
// the page says why beside the number.
import { graphql } from '../gh.mjs';
import { HUB } from '../repos.mjs';

const [OWNER, NAME] = HUB.split('/');

import { judge, glossFor, buildApprovalIndex } from '../provenance.mjs';
import { collectDecisionLog } from './decision-log.mjs';

export const PROJECT_NUMBER = 1;
export const ACTIVE_STAGES = ['Requirement Gathering', 'Design', 'Development', 'Review'];
const STAGE_ORDER = ['Development', 'Review', 'Design', 'Requirement Gathering', 'Unstaged', 'Backlog', 'Released'];

const QUERY = `
query ($owner: String!, $name: String!, $cursor: String) {
  repository(owner: $owner, name: $name) {
    issues(first: 50, after: $cursor, labels: ["requirement"],
           states: [OPEN, CLOSED], orderBy: {field: CREATED_AT, direction: ASC}) {
      pageInfo { hasNextPage endCursor }
      nodes {
        number title url state body updatedAt createdAt
        milestone { title }
        labels(first: 10) { nodes { name } }
        subIssuesSummary { total completed }
        subIssues(first: 50) { nodes { number url state repository { nameWithOwner } } }
        projectItems(first: 5) {
          nodes {
            project { number }
            fieldValueByName(name: "Status") {
              ... on ProjectV2ItemFieldSingleSelectValue { name }
            }
          }
        }
      }
    }
  }
}`;

/**
 * The board-write block, and the two facts a surface needs to describe it (#252).
 *
 * `measuredAt` is #251's filing — the first board write measured to be refused,
 * FORBIDDEN as the App and denied by the guard as @jwildfire, both within the
 * same minutes. It is deliberately the first *measured* refusal rather than a
 * guess at when App access lapsed: a requirement filed earlier stays counted as
 * ordinary drift, so the error falls on the side of reporting drift rather than
 * explaining it away.
 */
export const BOARD_WRITE_BLOCK = {
  issue: 252,
  url: `https://github.com/${OWNER}/${NAME}/issues/252`,
  measuredAt: '2026-08-18T06:14:41Z',
};

/**
 * Is the block still on? Read from the blocker issue itself rather than from a
 * flag in this file, so the day @jwildfire resolves #252 and closes it, drift
 * counting comes back with no code change and no second thing to remember.
 *
 * A blocker issue that cannot be found means NOT blocked: an excuse this page
 * cannot see the evidence for is one it does not get to make.
 */
export const boardWritesBlocked = (issues) =>
  issues.find((i) => i.number === BOARD_WRITE_BLOCK.issue)?.state === 'OPEN';

const boardItem = (issue) =>
  issue.projectItems.nodes.find((n) => n?.project?.number === PROJECT_NUMBER) ?? null;

function boardStatus(issue) {
  return boardItem(issue)?.fieldValueByName?.name ?? null;
}

// Without a project-scoped token the Status field is unreadable; fall back to
// state + milestone exactly as the previous generator did, so a token regression
// degrades the page rather than emptying it.
function stageOf(issue, status) {
  if (status) return status;
  if (issue.state === 'CLOSED') return 'Released';
  return issue.milestone && issue.milestone.title !== 'backlog' ? 'Requirement Gathering' : 'Backlog';
}

// "Open but staged Released" is the drift the audit caught; an unstaged issue
// says the same thing through its stage pill, so it does not also get a badge.
function driftOf(issue, status, boardReadable) {
  if (issue.state !== 'OPEN') return null;
  if (status === 'Released') return 'open in Released';
  if (!status && boardReadable) return 'unstaged';
  return null;
}

// The blocked class: an open requirement with no Status, while no credential can
// give it one. `filedAfterBlock` says whether it arrived after the refusal was
// measured — true means no agent could ever have placed it, false means it may
// have been missed while placing it still worked. Either way nothing can place
// it now, and the two are counted separately so the page can say which is which
// instead of flattening them into one word.
function blockedOf(issue, status, boardReadable, blocked) {
  if (!blocked || !boardReadable) return null;
  if (issue.state !== 'OPEN' || status) return null;
  return {
    filedAfterBlock: issue.createdAt >= BOARD_WRITE_BLOCK.measuredAt,
    onBoard: Boolean(boardItem(issue)),
    issue: BOARD_WRITE_BLOCK.issue,
    url: BOARD_WRITE_BLOCK.url,
  };
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
 * Whose decision a requirement carries, resolved rather than repeated (#215).
 *
 * The catalog shows a pill only when a requirement CLAIMS an approval, because a
 * claim is the thing that can mislead — 113 rows each carrying an "EMPTY" chip is
 * noise, and the table legend says what no pill means so the absence is explained
 * on the surface rather than left to be inferred.
 *
 * `claimed` is the legacy state and it is deliberately visible: the drafted-by line
 * asserts "reviewed by @jwildfire" on 75 requirements that carry no record of it.
 * Those rows say so instead of reading like the approved ones.
 */
function provenanceOf(issue, approvals) {
  const v = judge(issue.body ?? '', approvals, { requireBlock: false });
  if (v.state === 'missing') {
    return v.reviewClaim === 'asserted'
      ? { state: 'claimed', detail: 'the drafted-by line says @jwildfire reviewed it — no record of it exists' }
      : null;
  }
  if (v.state === 'empty') return { state: 'empty', detail: 'nobody has approved this' };
  if (v.state === 'unresolved') {
    return { state: 'unresolved', detail: v.problems[0] ?? 'the approval citation does not resolve' };
  }
  const cited = v.approved.map((c) => c.text).join(', ');
  const first = v.resolved.find((r) => r.said);
  const gloss = first ? glossFor(first) : '';
  return {
    state: v.state,
    detail: `${cited}${gloss ? ` — ${gloss}` : ''}${v.beyond && v.beyond !== 'none' ? ` · beyond it: ${v.beyond}` : ''}`,
  };
}

/**
 * The pure half: raw issues in, page records out. Separated from the fetch so
 * what the page is allowed to call drift can be pinned by a test with no network
 * (requirements.test.mjs) — the whole point of #254 is a count nobody can check.
 */
export function buildRequirements(issues, { approvals = null } = {}) {
  // Self-calibrating: if any issue carries a Status, the project field is
  // readable, so an issue without one is genuinely unstaged rather than a
  // casualty of a token without project scope.
  const boardReadable = issues.some((i) => boardStatus(i));
  const blocked = boardWritesBlocked(issues);

  return issues.map((issue) => {
    const status = boardStatus(issue);
    const stage = boardReadable && !status && issue.state === 'OPEN' ? 'Unstaged' : stageOf(issue, status);
    // One row is never both: a requirement nothing could place is described by
    // the block, and calling it drift as well would count the same fact twice.
    const blockedBy = blockedOf(issue, status, boardReadable, blocked);
    const drift = blockedBy ? null : driftOf(issue, status, boardReadable);
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
      status,
      // Whether it has an item on the board at all, which `status: null` alone
      // cannot say — "off the board" and "on it with no Status" are different
      // sentences, and the page was printing the second for rows that are the
      // first (all 11 of them, on 2026-08-18).
      onBoard: Boolean(boardItem(issue)),
      drift,
      blocked: blockedBy,
      // Visible above the fold when the board says it is in flight, or when the
      // board is wrong in a way that would otherwise hide live work — including
      // work the block stranded, which is shown rather than folded away.
      active: issue.state === 'OPEN' && (ACTIVE_STAGES.includes(stage) || Boolean(drift) || Boolean(blockedBy)),
      labels: issue.labels.nodes.map((l) => l.name).filter((l) => l !== 'requirement'),
      milestone: issue.milestone?.title ?? null,
      repos: reposOf(issue),
      tasks: taskProgress(issue),
      updatedAt: issue.updatedAt,
      createdAt: issue.createdAt,
      promotedFrom: promotedFrom ? Number(promotedFrom) : null,
      provenance: provenanceOf(issue, approvals),
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

  // Local files only; a decision log that cannot be read degrades every claim to
  // `unresolved` rather than to `approved`, which is the safe direction to fail.
  let approvals = null;
  try { approvals = buildApprovalIndex(await collectDecisionLog()); } catch { /* reported as unresolved */ }

  return buildRequirements(issues, { approvals });
}
