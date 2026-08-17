// The hub's version stamp — what this page is, and when it actually shipped.
//
// @jwildfire, 2026-08-16: "Add a version # on the hub in the header and let me hover
// to see when it was launched."
//
// TWO HALVES, TWO SOURCES, AND THAT IS THE WHOLE DESIGN.
//
//   The VERSION is the newest semver in site/roadmap-changelog.json. He maintains that
//   file by hand and it is the only human-meaningful number in here, so it stays his.
//
//   WHEN IT LAUNCHED is the build — the moment these generators ran and the commit
//   they ran on — stamped here, never read from the changelog.
//
// The second half is not fussiness. On 2026-08-16 the newest changelog entry was dated
// 05:20Z and the deploy that published the site ran at 22:15Z on 8823cd5: sixteen
// hours and fifty-five minutes apart, because the roadmap rebuild (#211, D0018)
// shipped without a changelog bump. The badge that shipped that day read
//
//     v2.12.0 – 2026-08-16 01:20 EDT
//
// on a page built at 18:15 EDT. Confidently wrong by seventeen hours, in public, on
// the one element whose entire job is to say whether he is looking at current work. A
// stamp that lies about that is worse than no stamp, and it lied because it had only
// one source and picked the wrong one.
//
// WHEN THE TWO DISAGREE, SAY SO. A build carrying site changes the changelog has not
// recorded is a real condition with a real cause, and the badge reports it rather than
// choosing a half to believe. It is computed, not judged, so it cannot become an
// opinion nobody trusts.
//
// WHY THE DISAGREEMENT IS COUNTED IN COMMITS AND NOT IN HOURS. The obvious test —
// "the build is newer than the newest changelog entry" — is true of every healthy
// deploy, because the entry is written before the deploy that carries it. Worse, this
// site redeploys on a daily cron, so a pure time gap grows by twenty-four hours every
// morning on a site nobody has touched, and the warning would be permanent within a
// week and muted the week after. What actually went wrong on 2026-08-16 was that
// CONTENT CHANGED AND THE CHANGELOG DID NOT, so that is what gets measured: commits
// touching what the site shows, since the commit that last touched the changelog.
// A cron redeploy adds no commits and moves this number not at all.
//
// The two machine-written data artifacts are excluded. The nightly audit rewrites
// site/audit/findings.json and the usage refresh rewrites site/usage/usage.json; both
// land as commits nobody should have to write a changelog entry for, and leaving them
// in would put the count permanently above zero for reasons that are not the
// discipline this measures. That is the difference between a signal and a nag.
//
// EMIT ONCE, USE TWICE. Everything below is computed one time per build and written to
// _site/version.json. The header renders it and the Navigator sweep reads it, so the
// page and the sweep cannot come to different conclusions about the same build.
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { age, esc, fmtET } from './gh.mjs';

/** The repo root, from this module's own location: scripts/lib/version.mjs → ../../ */
const ROOT = new URL('../../', import.meta.url).pathname;

/**
 * What the changelog is supposed to be a record of.
 *
 * `site` and `scripts` are what the published pages are made of. The two exclusions
 * are machine-written artifacts (see the note above) — they change what the pages
 * *say*, but not by any decision a human made, and a changelog entry for them would be
 * a robot reporting its own weather.
 */
export const CONTENT_PATHS = [
  'site',
  'scripts',
  ':(exclude)site/audit/findings.json',
  ':(exclude)site/usage/usage.json',
];

const GIT_TIMEOUT = 8000;

/** One git command, or null. Never throws: the version badge must not fail a deploy. */
export function git(args, { cwd = ROOT } = {}) {
  try {
    return String(execFileSync('git', ['-C', cwd, ...args], {
      timeout: GIT_TIMEOUT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'],
    })).trim();
  } catch { return null; }
}

/** Newest changelog entry by date, or null when the file is empty or unreadable. */
export function newestEntry(changelog) {
  const entries = (changelog?.entries ?? []).filter((e) => e?.version && e?.date);
  if (!entries.length) return null;
  return [...entries].sort((a, b) => b.date.localeCompare(a.date))[0];
}

/**
 * The build: when these generators ran, and on what commit.
 *
 * In CI the commit is GITHUB_SHA — correct under every trigger this workflow has. A
 * push run stamps the pushed commit; the daily cron and a manual dispatch stamp the tip
 * of the branch they ran on. In all three that is exactly "the commit this build ran
 * on", which is the question being answered.
 *
 * Locally there is no run and no deploy, and the stamp says so rather than dressing a
 * developer's working tree up as a launch.
 */
export function buildStamp(env = process.env, now = new Date()) {
  const sha = env.GITHUB_SHA || git(['rev-parse', 'HEAD']) || null;
  const ci = Boolean(env.GITHUB_ACTIONS && env.GITHUB_SHA);
  return {
    at: now.toISOString(),
    commit: sha,
    short: sha ? sha.slice(0, 7) : null,
    run: env.GITHUB_RUN_ID || null,
    ci,
    dirty: ci ? false : Boolean(git(['status', '--porcelain'])),
  };
}

/**
 * How far the changelog is behind what this build carries.
 *
 * `behind` counts commits touching CONTENT_PATHS since the commit that last touched
 * the changelog itself. Zero is the healthy state and the state a bump restores.
 *
 * `known: false` means the question could not be answered — a shallow clone, no git,
 * a changelog never committed. It is not the same as zero and is never rendered as
 * one; the panel says the check could not run, the way the dashboard's provenance
 * line does rather than showing a reassuring blank.
 */
export function changelogDrift({ cwd = ROOT } = {}) {
  if (git(['rev-parse', '--is-shallow-repository'], { cwd }) === 'true') {
    return { known: false, why: 'the checkout is shallow, so the history behind the changelog is not present' };
  }
  const since = git(['log', '-1', '--format=%H', '--', 'site/roadmap-changelog.json'], { cwd });
  if (!since) return { known: false, why: 'no commit in this checkout has touched site/roadmap-changelog.json' };

  const count = git(['rev-list', '--count', `${since}..HEAD`, '--', ...CONTENT_PATHS], { cwd });
  if (count === null) return { known: false, why: 'the commits since the changelog could not be counted' };

  const behind = Number(count);
  const subjects = behind
    ? (git(['log', '--format=%s', `${since}..HEAD`, '--', ...CONTENT_PATHS], { cwd }) ?? '').split('\n').filter(Boolean)
    : [];
  return {
    known: true,
    behind,
    since: since.slice(0, 7),
    sinceAt: git(['log', '-1', '--format=%cI', since], { cwd }),
    subjects: subjects.slice(0, 10),
    more: Math.max(0, subjects.length - 10),
  };
}

/**
 * Everything the badge, the panel, the site validation and the sweep read — computed
 * once, so none of them can disagree about the same build.
 */
export function versionState({ changelog, env = process.env, now = new Date(), cwd = ROOT } = {}) {
  const entry = newestEntry(changelog);
  const build = buildStamp(env, now);
  const drift = changelogDrift({ cwd });
  return {
    version: entry?.version ?? null,
    changelogAt: entry?.date ?? null,
    builtAt: build.at,
    commit: build.commit,
    short: build.short,
    run: build.run,
    ci: build.ci,
    dirty: build.dirty,
    drift,
  };
}

/**
 * The state, computed once per process.
 *
 * lib/nav.mjs renders the badge into every page's header and the generators call it
 * many times per build; the git commands behind this run on the first call and not
 * again. Lazy rather than at import, so `node --test scripts/lib/*.test.mjs` does not
 * shell out to git merely for loading the module.
 */
let memo = null;
export function getVersionState({ cwd = ROOT, env = process.env, now = new Date() } = {}) {
  if (memo) return memo;
  let changelog = { entries: [] };
  try {
    changelog = JSON.parse(readFileSync(new URL('site/roadmap-changelog.json', `file://${cwd}`), 'utf8'));
  } catch { /* an unreadable changelog renders as "unversioned", not as a failed build */ }
  memo = versionState({ changelog, env, now, cwd });
  return memo;
}

/** Test seam: forget the memoised state. */
export function resetVersionState() { memo = null; }

/**
 * The one sentence about drift, in the shape auditFreshness settled on: the healthy
 * line still carries the numbers. A check that only speaks up when something is wrong
 * teaches nobody what right looks like, and the 2026-08-16 misreading happened well
 * inside any threshold a quiet check would have used.
 */
export function driftSummary(state, { now = new Date() } = {}) {
  const { drift, version, changelogAt } = state;
  if (!drift?.known) {
    return { ok: false, unknown: true, text: `changelog drift unknown — ${drift?.why ?? 'the check could not run'}` };
  }
  if (drift.behind === 0) {
    return { ok: true, text: `changelog v${version} is current with this build` };
  }
  const since = changelogAt ? age(changelogAt, now) : null;
  const n = drift.behind;
  return {
    ok: false,
    behind: n,
    text: `changelog v${version} is ${n} commit${n === 1 ? '' : 's'} behind this build`
      + `${since ? ` — last written ${since} ago` : ''}, so ${n === 1 ? 'one change' : `${n} changes`} to what the site shows ${n === 1 ? 'is' : 'are'} unrecorded`,
  };
}

/**
 * The header badge and its panel.
 *
 * Hover reveals the panel on a pointer; the button toggles it on a tap, because he
 * reads this on a phone and a hover-only affordance is not an affordance there. The
 * markup carries both and lib/nav.mjs renders it into every page's header, so no
 * generator can ship a page that forgot.
 */
export function versionBadge(state, { depth = 0, hubUrl = '', now = new Date() } = {}) {
  const prefix = '../'.repeat(depth);
  const drift = driftSummary(state, { now });
  const label = state.version ? `v${esc(state.version)}` : 'unversioned';
  const flag = drift.ok ? '' : '<span class="vs-flag" aria-hidden="true">•</span>';

  const rows = [];
  // The absolute stamp is rendered here; the "17h ago" beside it is computed in the
  // browser, against the reader's own clock. A relative age baked in at build time
  // would read "0m" on every page forever — which is not merely useless but is the
  // same class of confident falsehood this badge exists to stop, since "how old is
  // what I am looking at" is the entire question being asked. Without JS the row
  // still shows the real timestamp and says nothing it cannot support.
  rows.push(`<div class="vs-row"><span class="vs-k">Launched</span><span class="vs-v"><time datetime="${esc(state.builtAt)}" data-vs-at>${esc(fmtET(state.builtAt))}</time><span class="vs-ago" data-vs-ago></span></span></div>`);
  if (state.short) {
    const sha = hubUrl
      ? `<a href="${hubUrl}/commit/${esc(state.commit)}"><code>${esc(state.short)}</code></a>`
      : `<code>${esc(state.short)}</code>`;
    rows.push(`<div class="vs-row"><span class="vs-k">Build</span><span class="vs-v">${sha}${state.ci ? '' : ' <span class="vs-local">local</span>'}</span></div>`);
  }
  rows.push(`<p class="vs-note${drift.ok ? '' : ' vs-warn'}">${esc(drift.text)}</p>`);
  if (hubUrl) {
    rows.push(`<p class="vs-more"><a href="${hubUrl}/blob/main/site/roadmap-changelog.json">What changed</a> · <a href="${prefix}catalog.html">full log</a></p>`);
  }

  return `<span class="vs" data-vs>
      <button class="version-badge" id="version-badge" type="button" aria-expanded="false" aria-controls="vs-panel"
        title="${esc(`Launched ${fmtET(state.builtAt)}${state.short ? ` · ${state.short}` : ''}`)}">${label}${flag}</button>
      <span class="vs-panel" id="vs-panel" role="note">
        ${rows.join('\n        ')}
      </span>
    </span>`;
}

/**
 * The three lines of browser JS that make the tap half work.
 *
 * Hover is pure CSS; this is only the toggle, and it is emitted from here rather than
 * hand-typed into each generator's template literal — hub#209 shipped a hand-typed
 * mirror of a shared rule whose escapes were eaten on the way into the page, and it
 * matched nothing for weeks while every source-level test passed.
 */
export const VERSION_BADGE_SCRIPT = `
(function () {
  var wrap = document.querySelector('[data-vs]');
  if (!wrap) return;
  var btn = wrap.querySelector('.version-badge');
  if (!btn) return;

  // "17h ago", against the reader's clock rather than the builder's.
  var at = wrap.querySelector('[data-vs-at]');
  var ago = wrap.querySelector('[data-vs-ago]');
  if (at && ago) {
    var ms = Date.now() - Date.parse(at.getAttribute('datetime'));
    if (isFinite(ms) && ms >= 0) {
      var mins = Math.floor(ms / 60000), hours = Math.floor(mins / 60), days = Math.floor(hours / 24);
      var t = mins < 2 ? 'just now' : mins < 60 ? mins + 'm ago' : hours < 24 ? hours + 'h ago' : days + 'd ago';
      ago.textContent = ' \\u00b7 ' + t;
      // A build older than two days on a site that redeploys daily is itself the
      // news, so the age says so in the one place he is already looking.
      if (days >= 2) ago.className = 'vs-ago vs-warn';
    }
  }
  btn.addEventListener('click', function (e) {
    e.stopPropagation();
    var open = wrap.getAttribute('data-open') === 'true';
    wrap.setAttribute('data-open', open ? 'false' : 'true');
    btn.setAttribute('aria-expanded', open ? 'false' : 'true');
  });
  document.addEventListener('click', function (e) {
    if (wrap.getAttribute('data-open') !== 'true') return;
    if (wrap.contains(e.target)) return;
    wrap.setAttribute('data-open', 'false');
    btn.setAttribute('aria-expanded', 'false');
  });
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    wrap.setAttribute('data-open', 'false');
    btn.setAttribute('aria-expanded', 'false');
  });
})();
`.trim();
