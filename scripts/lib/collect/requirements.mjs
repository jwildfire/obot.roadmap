// Requirement issues from the hub, enriched with the signals agents actually
// maintain — sub-issue state (and the repos those sub-issues live in) and the
// discussion a requirement was promoted from.
//
// The board's Status field stays the primary stage signal, but it is hand-moved,
// and the 2026-07-11 usage audit showed what that costs: on the biggest shipping
// day the Development lane was empty. So `drift` marks the cases the old page
// hid — an OPEN requirement parked in Released, or sitting on the board with no
// Status at all — and the page keeps those visible instead of folding them away.
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

function boardStatus(issue) {
  const item = issue.projectItems.nodes.find((n) => n?.project?.number === PROJECT_NUMBER);
  return item?.fieldValueByName?.name ?? null;
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

  // Self-calibrating: if any issue carries a Status, the project field is
  // readable, so an issue without one is genuinely unstaged rather than a
  // casualty of a token without project scope.
  const boardReadable = issues.some((i) => boardStatus(i));
  // Local files only; a decision log that cannot be read degrades every claim to
  // `unresolved` rather than to `approved`, which is the safe direction to fail.
  let approvals = null;
  try { approvals = buildApprovalIndex(await collectDecisionLog()); } catch { /* reported as unresolved */ }

  return issues.map((issue) => {
    const status = boardStatus(issue);
    const stage = boardReadable && !status && issue.state === 'OPEN' ? 'Unstaged' : stageOf(issue, status);
    const drift = driftOf(issue, status, boardReadable);
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
      drift,
      // Visible above the fold when the board says it is in flight, or when the
      // board is wrong in a way that would otherwise hide live work.
      active: issue.state === 'OPEN' && (ACTIVE_STAGES.includes(stage) || Boolean(drift)),
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
