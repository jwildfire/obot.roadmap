// Standing goals, read from obot.agent/goals/*.md — the same files `--auto`
// selects from (#18 design §2), so the page shows the real standing direction
// rather than a second copy of it.
//
// Source resolution, first hit wins: $GOALS_DIR → an obot.agent checked out
// beside the site build (deploy-site.yml) → the sibling clone in the local
// workspace. When none exists the section degrades to a notice.
//
// Hub #53 (goal pages) will own the goal model and its own per-goal pages; this
// collector's shape — {slug, title, status, anchors, backlog, url} — is the
// contract the page renders, whoever produces it.
import fs from 'node:fs/promises';
import path from 'node:path';
import { ROOT, HUB } from '../repos.mjs';

const SOURCE = 'jwildfire/obot.agent';

const CANDIDATES = [
  process.env.GOALS_DIR,
  path.join(ROOT, 'obot.agent-src', 'goals'),      // deploy-site.yml checkout
  path.join(ROOT, '..', 'obot.agent', 'goals'),    // sibling clone in the workspace
  path.join(ROOT, '..', '..', 'obot.agent', 'goals'), // ...when building from a worktree
].filter(Boolean);

async function goalsDir() {
  for (const dir of CANDIDATES) {
    try {
      await fs.access(dir);
      return dir;
    } catch {}
  }
  throw new Error(`no goals directory found (looked in ${CANDIDATES.length} locations)`);
}

// Frontmatter is a fixed, shallow shape (scalars plus two string lists), so it is
// parsed directly rather than adding a YAML dependency to a zero-dep build.
function frontmatter(md) {
  const m = md.match(/^---\n([\s\S]*?)\n---/);
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
    if (value === '') {
      listKey = key;
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
  const dir = await goalsDir();
  const files = (await fs.readdir(dir)).filter((f) => f.endsWith('.md') && f !== 'README.md');
  const goals = [];
  for (const file of files) {
    const fm = frontmatter(await fs.readFile(path.join(dir, file), 'utf8'));
    if (!fm?.name) continue;
    goals.push({
      slug: fm.name,
      title: fm.title ?? fm.name,
      status: fm.status ?? 'active',
      anchors: (fm.anchors ?? []).map((a) => ({ ref: a, number: hubRef(a) })),
      backlog: fm.backlog ?? [],
      url: `https://github.com/${SOURCE}/blob/main/goals/${file}`,
    });
  }
  return goals.sort((a, b) => a.title.localeCompare(b.title));
}
