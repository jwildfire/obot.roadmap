// Release identity — the key that says two Todo rows are one release.
//
// Since the operational repos ship via `main → stable` RC PRs (obot.agent
// docs/rc-framework.md), one release exists as two GitHub objects at the same
// time: the **RC PR** proposing it, and the **draft release** that is its
// published form waiting to be tagged. The Todo section collected both and
// listed the release twice — obot.agent v0.4.0 appeared as `obot.agent#99`
// (RC PR) and again as `obot.agent untagged-…` (DRAFT RELEASE) — and the count
// read 2 where the true answer was 1.
//
// The match rule, in precedence order per side:
//
//   RC PR          milestone title → PR title
//   draft release  tag name        → release name
//
// The **milestone is the primary key on the PR side**: the RC framework makes a
// milestone mandatory on every RC ("A milestone, and a `Closes #N` line per
// issue the release ships"), and its title is the version by construction. The
// draft release carries no milestone field, so the version it names is the only
// key the two objects can share — and a version *is* a release's identity, not
// incidental text: two release artifacts in the same repo naming the same
// version are the same release.
//
// Falling back to the titles keeps the rule working before a milestone exists,
// and it is safe in the direction that matters: suppression needs a positive
// match on both sides, so an unparseable version on either side leaves both rows
// standing. The failure mode is a duplicate row, never a release candidate
// silently missing from @jwildfire's queue.

// GitHub's placeholder tag for a draft release that has not chosen one
// (`untagged-f1b5d31d12eb2e45cf15`). Not a version — and not something to show a
// reader either, since it is an internal id.
export const UNTAGGED = /^untagged-[0-9a-f]+$/i;

const SEMVER = /\bv?(\d+)\.(\d+)(?:\.(\d+))?\b/;

// First candidate that yields a version wins; the result is normalised to
// `vMAJOR.MINOR.PATCH` so `v0.4` and `0.4.0` compare equal.
export function releaseVersion(...candidates) {
  for (const c of candidates) {
    if (!c || UNTAGGED.test(c)) continue;
    const m = String(c).match(SEMVER);
    if (m) return `v${m[1]}.${m[2]}.${m[3] ?? 0}`;
  }
  return null;
}

// The dedupe key. Null whenever either half is missing, so a keyless row can
// never match another keyless row.
export function releaseKey(repo, version) {
  return repo && version ? `${repo}@${version}` : null;
}
