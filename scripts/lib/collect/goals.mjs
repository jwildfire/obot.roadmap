// Standing goals, read from the hub's `goal`-labeled issues — the source of
// truth since #53/#71 moved goals out of obot.agent/goals/*.md (2026-07-24,
// superseding #18 design O2). Direction + membership live in the goal issue
// (fenced YAML block + sub-issue links); the `--auto` policy binding
// (active/paused, grant profile) lives in obot.agent/goals/registry.json and is
// deliberately not read here — the site renders every open goal issue.
//
// Output contract (consumed by build_roadmap_next.mjs and build_goals.mjs):
// {slug, number, title, status, anchors:[{ref,number}], backlog:[], url, page,
//  prose, members:[{number,title,state,url,labels}], progress:{done,total}}.
import { graphql } from '../gh.mjs';
import { HUB } from '../repos.mjs';

const [OWNER, NAME] = HUB.split('/');

const QUERY = `
query($owner: String!, $name: String!) {
  repository(owner: $owner, name: $name) {
    issues(labels: ["goal"], states: [OPEN], first: 20, orderBy: {field: CREATED_AT, direction: ASC}) {
      nodes {
        number
        title
        url
        body
        subIssues(first: 50) {
          nodes {
            number
            title
            state
            url
            labels(first: 20) { nodes { name } }
          }
        }
      }
    }
  }
}`;

// The YAML block is a fixed, shallow shape (scalars plus two string lists), so
// it is parsed directly rather than adding a YAML dependency to a zero-dep build.
function yamlBlock(body = '') {
  const m = body.match(/```yaml\n([\s\S]*?)```/);
  if (!m) return null;
  const out = {};
  let listKey = null;
  for (const raw of m[1].split('\n')) {
    const line = raw.replace(/\s+#.*$/, '').trimEnd();
    if (!line.trim()) continue;
    const item = line.match(/^\s+-\s+(.*)$/);
    if (item && listKey) {
      out[listKey].push(item[1].trim());
      continue;
    }
    const kv = line.match(/^([A-Za-z_]+):\s*(.*)$/);
    if (!kv) continue;
    const [, key, value] = kv;
    if (value === '' || value === '[]') {
      listKey = value === '' ? key : null;
      out[key] = [];
    } else {
      listKey = null;
      out[key] = value.replace(/^["']|["']$/g, '');
    }
  }
  return out;
}

const hubRef = (ref) => {
  const m = ref.match(new RegExp(`^${HUB.replace('.', '\\.')}#(\\d+)$`));
  return m ? Number(m[1]) : null;
};

export async function collectGoals() {
  const data = await graphql(QUERY, { owner: OWNER, name: NAME });
  const nodes = data?.repository?.issues?.nodes;
  if (!nodes) throw new Error('no goal issues returned for the hub repository');

  const goals = nodes.map((issue) => {
    const yaml = yamlBlock(issue.body) ?? {};
    const members = (issue.subIssues?.nodes ?? []).map((s) => ({
      number: s.number,
      title: s.title,
      state: s.state,
      url: s.url,
      labels: s.labels.nodes.map((l) => l.name),
    }));
    const anchors = (yaml.anchors ?? []).length
      ? yaml.anchors.map((a) => ({ ref: a, number: hubRef(a) }))
      : members.filter((m) => m.state === 'OPEN').map((m) => ({ ref: `${HUB}#${m.number}`, number: m.number }));
    const slug = yaml.slug ?? `goal-${issue.number}`;
    return {
      slug,
      number: issue.number,
      title: issue.title.replace(/^Goal:\s*/i, ''),
      // Open goal issues are the standing set; pausing is a policy-side state
      // (obot.agent/goals/registry.json) not visible here. Retired = closed.
      status: 'active',
      anchors,
      backlog: yaml.backlog ?? [],
      url: issue.url,
      page: `goals/${slug}.html`,
      prose: (issue.body ?? '').replace(/```yaml\n[\s\S]*?```\n?/, '').trim(),
      members,
      progress: {
        done: members.filter((m) => m.state === 'CLOSED').length,
        total: members.length,
      },
    };
  });
  return goals.sort((a, b) => a.title.localeCompare(b.title));
}
