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
export async function runOps(client, ops, ctx) {
  const done = [];
  for (const op of ops) {
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
