// The op executor: the only code in the audit that changes anything (#92).
//
// A mechanical finding's proposal is a list of ops — a tiny, closed vocabulary,
// deliberately not "run this shell command". Every op is one API call whose
// effect can be read off the op itself, which is what makes the dashboard's
// "proposed change" honest: what the row says is exactly what runs.
//
// Two tokens, because they can differ in scope: issue and discussion writes go
// through the obotclaw GitHub App token, while the user-level obot Roadmap
// project needs a PAT with project write. If the project token cannot write,
// board ops fail loudly with that diagnosis instead of silently doing nothing.
const API = 'https://api.github.com';
const UA = 'obot-roadmap-audit';

export const OPS = [
  'set-board-status', 'add-to-board', 'remove-board-item',
  'close-issue', 'reopen-issue', 'add-label', 'remove-label',
  'assign', 'set-milestone', 'close-discussion', 'comment',
];

/**
 * The board writes, and why nothing can perform them (#252, #254).
 *
 * Measured on 2026-08-18, minutes apart on the same issue: as the obotclaw App,
 * `addProjectV2ItemById` returns FORBIDDEN, because a GitHub App cannot reach a
 * board owned by a user account; as @jwildfire, which does work, the attribution
 * guard denies the call before it is sent. There is no third credential.
 *
 * The ops stay in the vocabulary. They are not broken code and they are not a
 * design mistake — they are correct operations with no credential to run under,
 * and they work again the day #252 is answered. What changes is that every
 * surface offering one says so BEFORE it is accepted, and the executor refuses
 * up front instead of failing halfway through a chain.
 */
export const BOARD_WRITE_BLOCK = {
  issue: 252,
  url: 'https://github.com/jwildfire/obot.roadmap/issues/252',
  since: '2026-08-18',
  reason: 'no credential can write to the obot Roadmap board — the obotclaw App is FORBIDDEN on a user-owned project, and the attribution guard denies @jwildfire\'s own token',
};

const UNAVAILABLE = {
  'set-board-status': BOARD_WRITE_BLOCK,
  'add-to-board': BOARD_WRITE_BLOCK,
  'remove-board-item': BOARD_WRITE_BLOCK,
};

/** Which of these ops cannot run, in listed order, deduplicated. */
export const unavailableOps = (ops = []) =>
  [...new Set((ops ?? []).map((o) => o?.op).filter((op) => UNAVAILABLE[op]))];

/**
 * The marker a surface renders beside a repair it cannot perform: null when the
 * proposal can run, otherwise the ops that cannot, the reason, and the issue
 * that has to be answered before they can. Pure, so the roadmap fold and the
 * audit page can compute it from a ledger written before this existed.
 *
 * `partial` is the case worth keeping apart. Most blocked proposals are a board
 * write and nothing else, and there is no reason to start one. A few chain a
 * close in front of it — that half is real work that still lands, so the surface
 * says which half runs instead of writing the whole repair off.
 */
export function proposalUnavailable(proposal) {
  const ops = unavailableOps(proposal?.ops);
  if (!ops.length) return null;
  const { reason, issue, url, since } = UNAVAILABLE[ops[0]];
  const performable = (proposal.ops ?? []).filter((o) => !UNAVAILABLE[o?.op]).map((o) => o.label);
  return { ops, performable, partial: performable.length > 0, reason, issue, url, since };
}

export function makeClient({ token, projectToken = null, dryRun = false } = {}) {
  const project = projectToken || token;

  async function rest(method, path, body = null, { tok = token } = {}) {
    if (dryRun && method !== 'GET') return { dryRun: true, method, path, body };
    const res = await fetch(path.startsWith('http') ? path : `${API}${path}`, {
      method,
      headers: {
        Accept: 'application/vnd.github+json',
        'User-Agent': UA,
        ...(tok ? { Authorization: `Bearer ${tok}` } : {}),
        ...(body ? { 'Content-Type': 'application/json' } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) throw new Error(`REST ${method} ${path} → ${res.status} ${(await res.text()).slice(0, 200)}`);
    return res.status === 204 ? null : res.json();
  }

  async function graphql(query, variables = {}, { tok = token } = {}) {
    if (dryRun && /mutation/.test(query)) return { dryRun: true, query: query.slice(0, 60), variables };
    const res = await fetch(`${API}/graphql`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tok}`, 'Content-Type': 'application/json', 'User-Agent': UA },
      body: JSON.stringify({ query, variables }),
    });
    if (!res.ok) throw new Error(`GraphQL HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
    const body = await res.json();
    if (body.errors?.length) throw new Error(`GraphQL: ${body.errors.map((e) => e.message).join('; ').slice(0, 300)}`);
    return body.data;
  }

  return { rest, graphql, projectToken: project, dryRun };
}

// ------------------------------------------------------------------ board ops
async function setBoardStatus(client, op, ctx) {
  const { projectId, statusField } = ctx.board;
  if (!projectId || !statusField) throw new Error('the board is unreadable with this token — cannot set a Status');
  const option = statusField.options.find((o) => o.name === op.value);
  if (!option) throw new Error(`no Status option named "${op.value}" on the obot Roadmap project`);
  await client.graphql(
    `mutation ($project: ID!, $item: ID!, $field: ID!, $option: String!) {
      updateProjectV2ItemFieldValue(input: {
        projectId: $project, itemId: $item, fieldId: $field,
        value: { singleSelectOptionId: $option }
      }) { projectV2Item { id } }
    }`,
    { project: projectId, item: op.itemId, field: statusField.id, option: option.id },
    { tok: client.projectToken },
  );
  return `board Status set to ${op.value}`;
}

async function addToBoard(client, op, ctx) {
  const { projectId } = ctx.board;
  if (!projectId) throw new Error('the board is unreadable with this token — cannot add an item');
  const [owner, name] = op.repo.split('/');
  const data = await client.graphql(
    `query ($owner: String!, $name: String!, $number: Int!) {
      repository(owner: $owner, name: $name) { issue(number: $number) { id } }
    }`,
    { owner, name, number: op.number },
    { tok: client.projectToken },
  );
  const contentId = data?.repository?.issue?.id;
  if (!contentId) throw new Error(`could not resolve ${op.repo}#${op.number}`);
  const added = await client.graphql(
    `mutation ($project: ID!, $content: ID!) {
      addProjectV2ItemById(input: { projectId: $project, contentId: $content }) { item { id } }
    }`,
    { project: projectId, content: contentId },
    { tok: client.projectToken },
  );
  const itemId = added?.addProjectV2ItemById?.item?.id;
  if (op.value && itemId) {
    await setBoardStatus(client, { ...op, op: 'set-board-status', itemId }, ctx);
    return `added to the board at ${op.value}`;
  }
  return 'added to the board';
}

async function removeBoardItem(client, op, ctx) {
  const { projectId } = ctx.board;
  if (!projectId) throw new Error('the board is unreadable with this token — cannot remove an item');
  await client.graphql(
    `mutation ($project: ID!, $item: ID!) {
      deleteProjectV2Item(input: { projectId: $project, itemId: $item }) { deletedItemId }
    }`,
    { project: projectId, item: op.itemId },
    { tok: client.projectToken },
  );
  return 'duplicate board item removed';
}

// ------------------------------------------------------------------ issue ops
const closeIssue = async (client, op) => {
  await client.rest('PATCH', `/repos/${op.repo}/issues/${op.number}`, {
    state: 'closed', state_reason: op.reason ?? 'completed',
  });
  return `closed ${op.repo}#${op.number} as ${op.reason ?? 'completed'}`;
};

const reopenIssue = async (client, op) => {
  await client.rest('PATCH', `/repos/${op.repo}/issues/${op.number}`, { state: 'open' });
  return `reopened ${op.repo}#${op.number}`;
};

const addLabel = async (client, op) => {
  await client.rest('POST', `/repos/${op.repo}/issues/${op.number}/labels`, { labels: [op.name] });
  return `added the ${op.name} label`;
};

const removeLabel = async (client, op) => {
  await client.rest('DELETE', `/repos/${op.repo}/issues/${op.number}/labels/${encodeURIComponent(op.name)}`);
  return `removed the ${op.name} label`;
};

const assign = async (client, op) => {
  await client.rest('POST', `/repos/${op.repo}/issues/${op.number}/assignees`, { assignees: [op.login] });
  return `assigned @${op.login}`;
};

async function setMilestone(client, op) {
  const milestones = await client.rest('GET', `/repos/${op.repo}/milestones?state=all&per_page=100`);
  const found = (milestones ?? []).find((m) => m.title === op.title);
  if (!found) throw new Error(`no milestone titled "${op.title}" in ${op.repo}`);
  await client.rest('PATCH', `/repos/${op.repo}/issues/${op.number}`, { milestone: found.number });
  return `milestone set to ${op.title}`;
}

async function closeDiscussion(client, op) {
  let nodeId = op.nodeId;
  if (!nodeId) {
    const data = await client.graphql(
      `query ($owner: String!, $name: String!, $number: Int!) {
        repository(owner: $owner, name: $name) { discussion(number: $number) { id } }
      }`,
      { owner: 'jwildfire', name: 'obot.roadmap', number: op.number },
    );
    nodeId = data?.repository?.discussion?.id;
  }
  if (!nodeId) throw new Error(`could not resolve discussion #${op.number}`);
  await client.graphql(
    `mutation ($id: ID!) {
      closeDiscussion(input: { discussionId: $id, reason: RESOLVED }) { discussion { number } }
    }`,
    { id: nodeId },
  );
  return `discussion #${op.number} closed as resolved`;
}

const comment = async (client, op) => {
  await client.rest('POST', `/repos/${op.repo}/issues/${op.number}/comments`, { body: op.body });
  return `commented on ${op.repo}#${op.number}`;
};

const HANDLERS = {
  'set-board-status': setBoardStatus,
  'add-to-board': addToBoard,
  'remove-board-item': removeBoardItem,
  'close-issue': closeIssue,
  'reopen-issue': reopenIssue,
  'add-label': addLabel,
  'remove-label': removeLabel,
  assign,
  'set-milestone': setMilestone,
  'close-discussion': closeDiscussion,
  comment,
};

// Runs one finding's ops in order, stopping at the first failure so a half-applied
// change is reported as exactly that rather than as a success.
//
// An op that cannot run under any credential is refused rather than attempted
// (#254). A chain of nothing but blocked ops is refused before the first call
// goes out — starting it would spend a request to learn what the vocabulary
// already knows. A chain whose earlier ops CAN run still runs them, and stops at
// the blocked one saying what landed, because refusing the performable half
// would be this change removing a repair rather than describing one.
export async function runOps(client, ops, ctx) {
  const blocked = unavailableOps(ops);
  const marker = blocked.length ? proposalUnavailable({ ops }) : null;
  const cannotRun = (m, done) =>
    new Error(
      `${m.ops.join(', ')} cannot run — ${m.reason}. `
      + `${done.length ? `Applied first: ${done.join('; ')}. ` : 'Nothing was attempted. '}`
      + `See #${m.issue} (${m.url}); the op works again when that is answered.`,
    );
  if (marker && !marker.partial) throw cannotRun(marker, []);

  const done = [];
  for (const op of ops) {
    if (UNAVAILABLE[op.op]) throw cannotRun(marker, done);
    const handler = HANDLERS[op.op];
    if (!handler) throw new Error(`unknown op "${op.op}" — the executor refuses anything outside ${OPS.join(', ')}`);
    try {
      done.push(client.dryRun ? `[dry run] ${op.label}` : await handler(client, op, ctx));
    } catch (err) {
      const applied = done.length ? ` (already applied: ${done.join('; ')})` : '';
      throw new Error(`${op.label} failed — ${err.message}${applied}`);
    }
  }
  return done;
}
