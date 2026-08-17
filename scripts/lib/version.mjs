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
 * THE STAMP IS FROZEN BY THE WORKFLOW, NOT TAKEN HERE. One deploy runs nine separate
 * node processes — build_static, build_roadmap, build_audit_page, build_goals,
 * build_analytics, build_decisions, build_news, render_diary and the metrics script —
 * with an R toolchain install sitting between some of them. If each took its own
 * `new Date()`, the eighty-odd pages of one deploy would carry launch times spread
 * across several minutes, and two pages of the same site would disagree about when the
 * site shipped. So `Stamp the build` in deploy-site.yml writes OBOT_BUILT_AT once into
 * $GITHUB_ENV, immediately after checkout, and every generator reads that same value.
 *
 * OBOT_COMMIT is GITHUB_SHA, which is the right commit under all three triggers this
 * workflow has: a push run stamps the pushed commit, and the daily cron and a manual
 * dispatch stamp the tip of the branch they ran on. In each case that is exactly "the
 * commit this build ran on".
 *
 * Locally there is no run and no deploy. The stamp says `local` and withholds the
 * launch time rather than dressing a developer's working tree up as something that
 * shipped — and the deploy asserts that no published page ever says it.
 */
export function buildStamp(env = process.env, now = new Date()) {
  const ci = Boolean(env.OBOT_BUILT_AT && env.OBOT_COMMIT);
  const sha = env.OBOT_COMMIT || env.GITHUB_SHA || git(['rev-parse', 'HEAD']) || null;
  return {
    at: env.OBOT_BUILT_AT || now.toISOString(),
    frozen: Boolean(env.OBOT_BUILT_AT),
    commit: sha,
    short: sha ? sha.slice(0, 7) : null,
    run: env.OBOT_RUN_ID || env.GITHUB_RUN_ID || null,
    trigger: env.OBOT_TRIGGER || env.GITHUB_EVENT_NAME || null,
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
export function versionState({ changelog, env = process.env, now = new Date(), cwd = ROOT, drift } = {}) {
  const entry = newestEntry(changelog);
  const build = buildStamp(env, now);
  return {
    version: entry?.version ?? null,
    changelogAt: entry?.date ?? null,
    builtAt: build.at,
    commit: build.commit,
    short: build.short,
    run: build.run,
    trigger: build.trigger,
    ci: build.ci,
    dirty: build.dirty,
    drift: drift ?? changelogDrift({ cwd }),
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
 * The header badge and its panel, as two pieces.
 *
 * They are returned separately because they belong in different places, and that is
 * load-bearing rather than tidy. The BADGE is a child of `nav.site`, so it wraps with
 * the links. The PANEL is a sibling of the nav and a direct child of `header.site`, so
 * it can be positioned against the header's own padding.
 *
 * Anchoring it to the badge instead was measured and fails on his phone. At 390px a
 * panel with `left: 0` runs 131px past the viewport and one with `right: 0` runs 33px
 * off the left edge — and because this stylesheet sets `html { overflow-x: clip }`,
 * what runs past the edge is not scrollable, it is simply gone. Anchored to the header
 * with the header's own padding expression it is clean at 320, 390, 430, 768, 1200 and
 * 1600, with no layout shift when it opens.
 *
 * Hover is pure CSS behind `(hover: hover) and (pointer: fine)`, so iOS never fires the
 * synthesised mouseenter that would make the panel flash open and shut on his first
 * tap. The tap path is the button, which is a real button and so answers Enter and
 * Space too. The label is deliberately just `v2.12.0`: the old badge carried the date
 * in its label, which made it 247px wide and pushed the whole nav onto a second line
 * on a phone.
 */
export function versionBadge(state, { depth = 0, hubUrl = '', now = new Date() } = {}) {
  const prefix = '../'.repeat(depth);
  const drift = driftSummary(state, { now });
  const label = state.version ? `v${esc(state.version)}` : 'unversioned';
  const flag = drift.ok ? '' : '<span class="vs-flag" aria-hidden="true">•</span>';

  const rows = [];
  if (state.ci) {
    // The absolute stamp is rendered here; the "17h ago" beside it is computed in the
    // browser, against the reader's own clock. A relative age baked in at build time
    // would read "0m" on every page forever — which is not merely useless but is the
    // same class of confident falsehood this badge exists to stop, since "how old is
    // what I am looking at" is the entire question being asked. Without JS the row
    // still shows the real timestamp and says nothing it cannot support.
    rows.push(`<div class="vs-row"><span class="vs-k">Launched</span><span class="vs-v"><time datetime="${esc(state.builtAt)}" data-vs-at>${esc(fmtET(state.builtAt))}</time><span class="vs-ago" data-vs-ago></span></span></div>`);
  } else {
    // A developer's working tree never launched, so it is not given a launch time. The
    // deploy greps every published page for this phrase and fails on it: if the
    // workflow's stamping step is ever dropped or renamed, the site would still build
    // and every page would quietly claim to be somebody's laptop, which is precisely
    // the kind of success-shaped failure this whole change exists to make impossible.
    rows.push(`<div class="vs-row"><span class="vs-k">Built</span><span class="vs-v">local build — not a deploy</span></div>`);
  }
  if (state.short) {
    const sha = hubUrl && state.ci
      ? `<a href="${hubUrl}/commit/${esc(state.commit)}"><code>${esc(state.short)}</code></a>`
      : `<code>${esc(state.short)}</code>`;
    rows.push(`<div class="vs-row"><span class="vs-k">Commit</span><span class="vs-v">${sha}${state.dirty ? ' <span class="vs-local">+ uncommitted</span>' : ''}</span></div>`);
  }
  rows.push(`<p class="vs-note${drift.ok ? '' : ' vs-warn'}">${esc(drift.text)}</p>`);
  if (hubUrl) {
    // "full log" is the audit log — a dialog on the catalog page, a link from
    // everywhere else. catalog.mjs binds [data-vs-log] to showModal(); on every other
    // page the href is what happens, so the link is never dead and never needs JS.
    rows.push(`<p class="vs-more"><a href="${hubUrl}/blob/main/site/roadmap-changelog.json">What changed</a> · <a href="${prefix}catalog.html" data-vs-log>full log</a></p>`);
  }

  // No `title` attribute: the browser's own tooltip would fight the panel on every
  // desktop hover, showing two different boxes for one gesture.
  const badge = `<button class="version-badge" id="version-badge" type="button"
      aria-expanded="false" aria-controls="version-panel">${label}${flag}</button>`;

  const panel = `<div class="version-panel" id="version-panel">
    ${rows.join('\n    ')}
  </div>`;

  return { badge, panel };
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
  var head = document.querySelector('header.site');
  if (!head) return;
  var btn = head.querySelector('.version-badge');
  var panel = head.querySelector('.version-panel');
  if (!btn || !panel) return;

  // "17h ago", against the reader's clock rather than the builder's. Baking a
  // relative age in at build time would print "0m" on every page forever.
  var at = panel.querySelector('[data-vs-at]');
  var ago = panel.querySelector('[data-vs-ago]');
  if (at && ago) {
    var ms = Date.now() - Date.parse(at.getAttribute('datetime'));
    if (isFinite(ms) && ms >= 0) {
      var mins = Math.floor(ms / 60000), hours = Math.floor(mins / 60), days = Math.floor(hours / 24);
      ago.textContent = ' \\u00b7 ' + (mins < 2 ? 'just now'
        : mins < 60 ? mins + 'm ago'
        : hours < 24 ? hours + 'h ago'
        : days + 'd ago');
      // This site redeploys on a daily cron, so a build more than two days old means
      // the deploy itself has stopped running. That is worth saying where he is
      // already looking rather than leaving it to be inferred from a date.
      if (days >= 2) ago.className = 'vs-ago vs-warn';
    }
  }

  // Hover is CSS. This is only the tap path — and it is a real <button>, so it
  // answers Enter and Space as well as a finger.
  function set(open) {
    head.setAttribute('data-vs-open', open ? 'true' : 'false');
    btn.setAttribute('aria-expanded', open ? 'true' : 'false');
  }
  btn.addEventListener('click', function (e) {
    e.stopPropagation();
    set(head.getAttribute('data-vs-open') !== 'true');
  });
  // pointerdown rather than click: on the status page the panel would otherwise
  // outlive a tap that landed in the embedded dashboard iframe.
  document.addEventListener('pointerdown', function (e) {
    if (head.getAttribute('data-vs-open') !== 'true') return;
    if (head.contains(e.target)) return;
    set(false);
  });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') set(false); });
  window.addEventListener('blur', function () { set(false); });
})();
`.trim();
