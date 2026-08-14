// Two release views over the same data pull:
//   recent   — what has shipped, newest first
//   upcoming — what is written but not released yet, per repo:
//                · a `dev` branch ahead of the release branch, and/or
//                · commits on the release branch since the newest release tag
//
// This is the computation hub #44 asks for on the Status page; gh.dash can only
// do the dev-vs-main half and renders "Unavailable" for main-only repos, so it
// is done here where the generator is ours and main-only is a first-class model.
import { rest } from '../gh.mjs';
import { REPOS } from '../repos.mjs';

async function repoReleases(repo) {
  const list = (await rest(`/repos/${repo.nameWithOwner}/releases?per_page=30`)) ?? [];
  // Release names are often just "<repo> <tag>" or the tag again — that is noise
  // next to a column already showing both, so only a name that says something
  // else survives.
  const meaningfulName = (name, tag) => {
    if (!name) return null;
    const stripped = name.replace(repo.name, '').replace(tag, '').replace(/[\s—·-]+/g, ' ').trim();
    return stripped.length > 2 ? name : null;
  };

  const published = list
    .filter((r) => !r.draft)
    .map((r) => ({
      repo: repo.nameWithOwner,
      tag: r.tag_name,
      name: meaningfulName(r.name, r.tag_name),
      url: r.html_url,
      prerelease: r.prerelease,
      publishedAt: r.published_at || r.created_at,
    }))
    .sort((a, b) => (b.publishedAt || '').localeCompare(a.publishedAt || ''));

  // Draft releases are release candidates for repos whose integration branch IS
  // the release branch (rc-framework: obot.agent, obot.roadmap, demo-301) —
  // proposed, awaiting @jwildfire's publish. The API only returns drafts when
  // the token has push access; without it this is simply empty, never an error.
  const drafts = list
    .filter((r) => r.draft)
    .map((r) => ({
      repo: repo.nameWithOwner,
      tag: r.tag_name || null,
      name: r.name || r.tag_name || 'untitled draft',
      url: r.html_url,
      createdAt: r.created_at,
    }));

  return { published, drafts };
}

async function compare(nameWithOwner, base, head) {
  const enc = (s) => encodeURIComponent(s);
  const data = await rest(`/repos/${nameWithOwner}/compare/${enc(base)}...${enc(head)}`, { tolerate404: true });
  if (!data) return null;
  return {
    ahead: data.ahead_by,
    behind: data.behind_by,
    status: data.status,
    // Newest commit in the range — the only honest "when did this work happen"
    // signal for unreleased work (a tag date would describe the last release).
    newestCommitAt: data.commits?.length
      ? data.commits[data.commits.length - 1].commit.committer.date
      : null,
    url: `https://github.com/${nameWithOwner}/compare/${base}...${head}`,
  };
}

export async function collectReleases() {
  const recent = [];
  const upcoming = [];
  const drafts = [];

  for (const repo of REPOS) {
    const meta = await rest(`/repos/${repo.nameWithOwner}`);
    const releaseBranch = meta.default_branch === 'dev' ? 'main' : meta.default_branch;
    const { published: releases, drafts: repoDrafts } = await repoReleases(repo);
    recent.push(...releases);
    drafts.push(...repoDrafts);

    const latest = releases.find((r) => !r.prerelease) ?? releases[0] ?? null;
    // `dev` drift is only meaningful when the repo actually keeps one; a 404 from
    // compare is the cheap way to ask (and covers master-named release branches).
    const devDrift = await compare(repo.nameWithOwner, releaseBranch, 'dev');
    const sinceTag = latest ? await compare(repo.nameWithOwner, latest.tag, releaseBranch) : null;

    const unreleasedOnRelease = sinceTag?.ahead ?? (latest ? 0 : null);
    const hasWork = (devDrift?.ahead ?? 0) > 0 || (unreleasedOnRelease ?? 0) > 0 || !latest;
    if (!hasWork) continue;

    upcoming.push({
      repo: repo.nameWithOwner,
      releaseBranch,
      neverReleased: !latest,
      latestTag: latest?.tag ?? null,
      latestUrl: latest?.url ?? null,
      // dev ahead of the release branch — work merged but not promoted
      devAhead: devDrift?.ahead ?? null,
      // dev behind it too — the branches have diverged, worth its own flag
      devBehind: devDrift?.behind ?? null,
      devUrl: devDrift?.url ?? null,
      // commits on the release branch that no release covers yet
      unreleased: unreleasedOnRelease,
      unreleasedUrl: latest ? `https://github.com/${repo.nameWithOwner}/compare/${latest.tag}...${releaseBranch}` : null,
      newestCommitAt: [devDrift?.newestCommitAt, sinceTag?.newestCommitAt]
        .filter(Boolean).sort().pop() ?? null,
    });
  }

  recent.sort((a, b) => (b.publishedAt || '').localeCompare(a.publishedAt || ''));
  upcoming.sort((a, b) => (b.devAhead ?? 0) + (b.unreleased ?? 0) - ((a.devAhead ?? 0) + (a.unreleased ?? 0)));
  drafts.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
  return { recent, upcoming, drafts };
}
