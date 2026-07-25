// Standing goals, read from the hub's `goal`-labeled issues — the source of
// truth since #53/#71 moved goals out of obot.agent/goals/*.md (2026-07-24,
// superseding #18 design O2; v2 amendment same day: prose-only bodies).
// Membership is generated from the sub-issue links at read time — nothing
// list-like is hand-maintained in the body, whose only machine bit is a hidden
// `<!-- goal-slug: … -->` comment naming the page. Priority is the selecting
// session's judgment, not list order. The `--auto` policy binding (active/
// paused, grant profile, repo backlog feeds) lives in
// obot.agent/goals/registry.json and is deliberately not read here — the site
// renders every open goal issue.
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

const slugOf = (body = '', number) =>
  (body.match(/<!--\s*goal-slug:\s*([a-z0-9-]+)\s*-->/) || [])[1] ?? `goal-${number}`;

export async function collectGoals() {
  const data = await graphql(QUERY, { owner: OWNER, name: NAME });
  const nodes = data?.repository?.issues?.nodes;
  if (!nodes) throw new Error('no goal issues returned for the hub repository');

  const goals = nodes.map((issue) => {
    const members = (issue.subIssues?.nodes ?? []).map((s) => ({
      number: s.number,
      title: s.title,
      state: s.state,
      url: s.url,
      labels: s.labels.nodes.map((l) => l.name),
    }));
    // `anchors` (kept for the roadmap-page contract) = the open members. The
    // API returns sub-issues in list order, but order carries no priority
    // semantics — selection ranks by judgment (#53 v2).
    const anchors = members.filter((m) => m.state === 'OPEN').map((m) => ({ ref: `${HUB}#${m.number}`, number: m.number }));
    const slug = slugOf(issue.body, issue.number);
    return {
      slug,
      number: issue.number,
      title: issue.title.replace(/^Goal:\s*/i, ''),
      // Open goal issues are the standing set; pausing is a policy-side state
      // (obot.agent/goals/registry.json) not visible here. Retired = closed.
      status: 'active',
      anchors,
      // Repo-level backlog feeds moved to obot.agent/goals/registry.json (v2).
      backlog: [],
      url: issue.url,
      page: `goals/${slug}.html`,
      prose: (issue.body ?? '').replace(/<!--\s*goal-slug:[\s\S]*?-->/, '').trim(),
      members,
      progress: {
        done: members.filter((m) => m.state === 'CLOSED').length,
        total: members.length,
      },
    };
  });
  return goals.sort((a, b) => a.title.localeCompare(b.title));
}
