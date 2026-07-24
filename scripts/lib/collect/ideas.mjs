// The Ideas queue: open idea discussions, plus ideas promoted to issues recently.
//
// Contract with the ideas-triage Action (requirement #48): on promotion it posts
// a comment reading "Filed as a requirement: <issue url>" and closes the thread
// as RESOLVED, and the filed issue's body carries "Promoted from discussion #N".
// Either side identifies a promotion; the comment is used here because it also
// covers ideas filed as plain issues rather than requirements. If #58/#61 change
// that contract, this is the one place that needs to follow.
import { graphql } from '../gh.mjs';
import { HUB } from '../repos.mjs';

const [OWNER, NAME] = HUB.split('/');
export const PROMOTED_WINDOW_DAYS = 14;

const QUERY = `
query ($owner: String!, $name: String!) {
  repository(owner: $owner, name: $name) {
    discussions(first: 50, orderBy: {field: UPDATED_AT, direction: DESC}) {
      nodes {
        number title url createdAt updatedAt closed closedAt stateReason
        category { name }
        author { login }
        comments(first: 30) { nodes { author { login } body } }
      }
    }
  }
}`;

// Promotion wording is not stable — the triage Action, headless runs, and
// interactive sessions have between them written "Filed as a requirement: <url>",
// "Filed as jwildfire/obot.roadmap#70.", "Filed as a small concrete task: <url>",
// "Promoted to a Requirement: <url>", "Promoted → #77 — …" and "Promoted → goal
// issue #73 — …". So match the marker phrase, then take the first issue reference
// that follows it in the same comment, in whatever form it appears. Scanning only
// after the marker keeps incidental mentions ("this continues #45") out.
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
    return { number, url: `https://github.com/${HUB}/issues/${number}` };
  }
  return null;
}

export async function collectIdeas({ windowDays = PROMOTED_WINDOW_DAYS, now = new Date() } = {}) {
  const data = await graphql(QUERY, { owner: OWNER, name: NAME });
  const nodes = (data?.repository?.discussions?.nodes ?? []).filter((d) => d.category?.name === 'Ideas');

  const open = [];
  const promoted = [];
  for (const d of nodes) {
    const base = {
      number: d.number,
      title: d.title,
      url: d.url,
      author: d.author?.login ?? 'unknown',
      createdAt: d.createdAt,
      updatedAt: d.updatedAt,
    };
    if (!d.closed) {
      open.push(base);
      continue;
    }
    const filed = promotion(d);
    const closedDays = d.closedAt ? (now - new Date(d.closedAt)) / 86400000 : Infinity;
    if (filed && closedDays <= windowDays) {
      promoted.push({ ...base, closedAt: d.closedAt, issue: filed });
    }
  }

  open.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  promoted.sort((a, b) => (b.closedAt || '').localeCompare(a.closedAt || ''));
  return { open, promoted, windowDays };
}
