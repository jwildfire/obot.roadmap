// Spike direction: "The board" — a control room over the portfolio (#202/#204).
//
// The page answers "is the machine running, and on what" in a 30-second phone
// check, in three bands top to bottom:
//
//   NOW       the session-state feed as the page's biggest element, refetched
//             every 60s, with per-repo activity lights computed at build time.
//             Staleness is a first-class state: past 120 minutes the panel stops
//             asserting liveness — confident numbers from a dead feed are worse
//             than an honest "the feed died".
//   TODAY     what moved today, from the deploy-time snapshot, with an honest
//             deploy stamp. A quiet day says when the last motion was instead of
//             rendering an empty band.
//   STANDING  instruments, counts not lists — the waiting-on-@jwildfire gauge,
//             active requirements by stage, goals as meters, audit findings —
//             every one linking to the page that holds the detail.
//
// History and item-level browsing are deliberately not here; the current
// roadmap page and the news feed already do that well.
import { esc, age, fmtET, clip, settle, graphql } from '../lib/gh.mjs';
import { releaseKey } from '../lib/rc.mjs';
import { siteHeader } from '../lib/nav.mjs';
import { spikeBanner } from './shared.mjs';

export const meta = {
  slug: 'board',
  name: 'The board',
  putsFirst: 'what is running right now',
  givesUp: 'history and item-level browsing — the board is now and today; the past belongs to other pages.',
  blurb: 'A control room in three bands — the live session feed with per-repo activity lights, what moved today, and the standing gauges — built for a 30-second phone check.',
};

const REVIEWER = 'jwildfire';
const STALE_MINUTES = 120; // matches the roadmap page's session-pill threshold
const PIPELINE = ['Requirement Gathering', 'Design', 'Development', 'Review'];

// Stage colors: one orange ramp, light→dark in pipeline order — stage is an
// ordered position, not four identities, so lightness carries the order and the
// legend carries the names and counts (color is never the only signal). Drift
// (mis-staged on the board) is outside the pipeline and wears a neutral gray.
const STAGE_RAMP = {
  'Requirement Gathering': '#fed7aa',
  Design: '#fb923c',
  Development: '#ea580c',
  Review: '#7c2d12',
  drift: '#a3958a',
};

const shortRepo = (nameWithOwner) => nameWithOwner.split('/')[1];

// "3d ago" / "just now" — age() alone reads as "just now ago" in a sentence.
const agoPhrase = (iso, now) => {
  const a = age(iso, now);
  return a === 'just now' ? a : `${a} ago`;
};

// Decision statuses arrive as markdown ("**Decided 2026-08-16** — …"); the
// emphasis marks are noise on a rendered page.
const plain = (s = '') => s.replace(/[*_`]/g, '');

// "Today" is @jwildfire's calendar day, not UTC's — he checks this at 7am ET.
const etDay = (d) =>
  new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(d instanceof Date ? d : new Date(d));

const etTime = (iso) =>
  `${new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York', hour: 'numeric', minute: '2-digit',
  }).format(new Date(iso))} ET`;

// ---------------------------------------------------------------- repo lights
// Last-commit age per portfolio repo, one batched GraphQL query (the same
// aliased-connection idiom as the PR collector). Build-time by design: the
// lights are stamped "as of deploy" rather than pretending to be live.
async function collectRepoLights(REPOS) {
  const query = `query {
${REPOS.map((r) => `  ${r.alias}: repository(owner: "${r.owner}", name: "${r.name}") { nameWithOwner defaultBranchRef { name target { ... on Commit { committedDate } } } }`).join('\n')}
}`;
  const data = await graphql(query);
  const lights = [];
  for (const r of REPOS) {
    const node = data?.[r.alias];
    if (!node) continue; // one unreadable repo must not drop the wall
    lights.push({
      repo: node.nameWithOwner,
      branch: node.defaultBranchRef?.name ?? null,
      committedDate: node.defaultBranchRef?.target?.committedDate ?? null,
    });
  }
  return lights.sort((a, b) => (b.committedDate || '').localeCompare(a.committedDate || ''));
}

function lightsHtml(lightsRes, NOW) {
  if (!lightsRes.ok) return `<p class="bd-notice dark">${esc(lightsRes.notice)}</p>`;
  const items = lightsRes.value.map((l) => {
    if (!l.committedDate) {
      return `    <span class="bd-light off"><i class="bd-dot"></i><span class="bd-light-name">${esc(shortRepo(l.repo))}</span><em>no commits recorded</em></span>`;
    }
    const days = (NOW - new Date(l.committedDate)) / 86400000;
    const cls = days <= 1 ? 'hot' : days <= 7 ? 'warm' : 'dim';
    return `    <span class="bd-light ${cls}" title="${esc(`${l.repo} — last commit on ${l.branch ?? 'default branch'} ${agoPhrase(l.committedDate, NOW)}`)}"><i class="bd-dot"></i><a class="bd-light-name" href="https://github.com/${esc(l.repo)}">${esc(shortRepo(l.repo))}</a><em>${age(l.committedDate, NOW)}</em></span>`;
  });
  return `<div class="bd-lights">\n${items.join('\n')}\n</div>`;
}

// ---------------------------------------------------------------- last motion
// The newest real timestamp the build saw — the fallback line for every quiet
// state, so "nothing is running" always comes with "and this was the last thing
// that happened" instead of looking broken.
function lastMotion({ relRes, prRes, reqRes, ideaRes }) {
  const cands = [];
  for (const r of relRes.value?.recent ?? []) {
    if (r.publishedAt) cands.push({ ts: r.publishedAt, what: `the ${shortRepo(r.repo)} ${r.tag} release` });
  }
  for (const pr of prRes.value ?? []) {
    cands.push({ ts: pr.updatedAt, what: `a pull request in ${shortRepo(pr.repo)} (#${pr.number})` });
  }
  for (const req of reqRes.value ?? []) {
    cands.push({ ts: req.updatedAt, what: `the requirement "${clip(req.title, 44)}"` });
  }
  for (const i of ideaRes.value?.open ?? []) {
    cands.push({ ts: i.updatedAt, what: `the idea thread "${clip(i.title, 44)}"` });
  }
  cands.sort((a, b) => (b.ts || '').localeCompare(a.ts || ''));
  return cands[0] ?? null;
}

// ---------------------------------------------------------------- today band
function todayRows(data, NOW) {
  const { relRes, prRes, reqRes, decRes, ideaRes } = data;
  const today = etDay(NOW);
  const rows = [];

  for (const r of relRes.value?.recent ?? []) {
    if (r.publishedAt && etDay(r.publishedAt) === today) {
      rows.push({
        ts: r.publishedAt, pill: 'release', pillCls: 'rel',
        html: `<a href="${esc(r.url)}">${esc(shortRepo(r.repo))} ${esc(r.tag)}</a>${r.name ? ` — ${esc(r.name)}` : ''} shipped`,
        when: etTime(r.publishedAt),
      });
    }
  }
  for (const pr of prRes.value ?? []) {
    if (etDay(pr.updatedAt) !== today) continue;
    const opened = etDay(pr.createdAt) === today;
    rows.push({
      ts: pr.updatedAt, pill: pr.isDraft ? 'draft pr' : 'pr', pillCls: pr.isDraft ? 'draft' : 'pr',
      html: `<a href="${esc(pr.url)}">${esc(shortRepo(pr.repo))}#${pr.number}</a> ${esc(clip(pr.title, 80))} — ${opened ? 'opened' : 'touched'} today${pr.reviewDecision === 'APPROVED' ? ', approved' : ''}`,
      when: etTime(pr.updatedAt),
    });
  }
  for (const req of reqRes.value ?? []) {
    if (etDay(req.updatedAt) !== today) continue;
    rows.push({
      ts: req.updatedAt, pill: 'requirement', pillCls: 'req',
      html: `<a href="${esc(req.url)}">${esc(clip(req.title, 80))}</a> updated (${esc(req.stage.toLowerCase())})`,
      when: etTime(req.updatedAt),
    });
  }
  for (const d of [...(decRes.value?.awaiting ?? []), ...(decRes.value?.decided ?? [])]) {
    if (d.date !== today) continue;
    rows.push({
      ts: d.date, pill: 'decision', pillCls: 'dec',
      html: `<a href="../${esc(d.path ?? 'decisions/index.html')}">${esc(d.title)}</a> recorded — ${esc(clip(plain(d.statusPlain), 60))}`,
      when: 'today', // the decision index records a date, not a time
    });
  }
  for (const i of ideaRes.value?.open ?? []) {
    if (etDay(i.updatedAt) !== today) continue;
    rows.push({
      ts: i.updatedAt, pill: 'idea', pillCls: 'idea',
      html: `<a href="${esc(i.url)}">${esc(clip(i.title, 80))}</a> stirred in the ideas queue`,
      when: etTime(i.updatedAt),
    });
  }

  rows.sort((a, b) => (b.ts || '').localeCompare(a.ts || ''));
  return rows;
}

function todayBand(data, NOW) {
  const rows = todayRows(data, NOW);
  const degraded = [
    ['releases', data.relRes], ['open PRs', data.prRes], ['requirements', data.reqRes],
    ['decisions', data.decRes], ['ideas', data.ideaRes],
  ].filter(([, r]) => !r.ok);
  const notices = degraded.map(([, r]) => `<p class="bd-notice">${esc(r.notice)}</p>`).join('\n');

  let body;
  if (rows.length) {
    body = `<div class="bd-moves">
${rows.map((r) => `  <div class="bd-mv">
    <span class="bd-mv-main"><span class="bd-pill ${r.pillCls}">${esc(r.pill)}</span> ${r.html}</span>
    <span class="bd-mv-when">${esc(r.when)}</span>
  </div>`).join('\n')}
</div>`;
  } else {
    const last = lastMotion(data);
    body = last
      ? `<p class="bd-quiet">Quiet so far today — the last motion was ${esc(last.what)}, ${agoPhrase(last.ts, NOW)} (${fmtET(last.ts)}).</p>`
      : '<p class="bd-quiet">Quiet so far today — and no earlier motion is recorded in this deploy’s feeds.</p>';
  }

  return `<section class="bd-band" id="today">
<h2><span class="bd-kicker">Today</span> What moved</h2>
<p class="bd-sub">Releases shipped, pull requests touched, requirements updated, decisions recorded — today, ${esc(etDay(NOW))} Eastern. As of the ${fmtET(NOW)} deploy; merged-and-gone items only reappear on the next build.</p>
${notices}${body}
</section>`;
}

// ---------------------------------------------------------------- instruments
function waitingInstrument(data) {
  const { prRes, relRes, decRes } = data;
  if (!prRes.ok || !relRes.ok) {
    return instrument('Waiting on @jwildfire', '<p class="bd-notice">' +
      esc(!prRes.ok ? prRes.notice : relRes.notice) + '</p>', 'release candidates and open decisions');
  }
  // The release-candidate queue, deduped per lib/rc.mjs: an open RC PR and the
  // draft release naming the same version are one release, and the PR wins.
  const rcPrs = (prRes.value ?? []).filter((pr) => pr.reviewRequested?.includes(REVIEWER));
  const prKeys = new Set(rcPrs.map((pr) => releaseKey(pr.repo, pr.version)).filter(Boolean));
  const rcDrafts = (relRes.value?.drafts ?? []).filter((d) => !prKeys.has(releaseKey(d.repo, d.version)));
  const rcCount = rcPrs.length + rcDrafts.length;
  const decCount = decRes.ok ? decRes.value.awaiting.length : null;
  const total = decCount === null ? rcCount : rcCount + decCount;

  const parts = [
    `<a href="../roadmap.html#attention">${rcCount} release candidate${rcCount === 1 ? '' : 's'}</a>`,
    decCount === null
      ? `<span class="bd-notice-inline">${esc(decRes.notice)}</span>`
      : `<a href="../decisions/index.html">${decCount} decision${decCount === 1 ? '' : 's'}</a>`,
  ];
  const body = `<div class="bd-big">${total}${decCount === null ? '<span class="bd-big-plus">+?</span>' : ''}</div>
<p class="bd-inst-sub">${parts.join(' · ')}</p>`;
  return instrument('Waiting on @jwildfire', body,
    'release candidates to review plus decisions awaiting an answer');
}

function stageInstrument(reqRes) {
  if (!reqRes.ok) {
    return instrument('Active requirements', `<p class="bd-notice">${esc(reqRes.notice)}</p>`,
      'open requirements by pipeline stage');
  }
  const active = (reqRes.value ?? []).filter((r) => r.active);
  const buckets = PIPELINE.map((stage) => ({
    key: stage, label: stage === 'Requirement Gathering' ? 'Gathering' : stage,
    count: active.filter((r) => r.stage === stage).length, color: STAGE_RAMP[stage],
  }));
  const driftCount = active.filter((r) => !PIPELINE.includes(r.stage)).length;
  if (driftCount) buckets.push({ key: 'drift', label: 'Board drift', count: driftCount, color: STAGE_RAMP.drift });
  const total = active.length;

  const segs = buckets.filter((b) => b.count > 0).map((b) =>
    `<i class="bd-seg" style="flex-grow:${b.count};background:${b.color}" title="${esc(`${b.label} — ${b.count} requirement${b.count === 1 ? '' : 's'}`)}"></i>`).join('');
  const legend = buckets.map((b) =>
    `<span class="bd-leg"><i class="bd-sw" style="background:${b.color}"></i>${esc(b.label)} <b>${b.count}</b></span>`).join('');

  const body = `<div class="bd-big"><a href="../roadmap.html">${total}</a></div>
${total ? `<div class="bd-bar" role="img" aria-label="${esc(buckets.map((b) => `${b.label} ${b.count}`).join(', '))}">${segs}</div>` : ''}
<p class="bd-inst-sub bd-legend">${legend}</p>`;
  return instrument('Active requirements', body,
    'open requirements the board says are in flight, by stage — light to dark tracks the pipeline; drift means the board mis-stages an open item');
}

function goalsInstrument(goalRes) {
  if (!goalRes.ok) {
    return instrument('Goals', `<p class="bd-notice">${esc(goalRes.notice)}</p>`, 'standing goals and their shipped share');
  }
  const goals = (goalRes.value ?? []).filter((g) => g.status !== 'paused');
  if (!goals.length) return instrument('Goals', '<p class="bd-quiet">No active goals.</p>', 'standing goals and their shipped share');
  const rows = goals.map((g) => {
    const { done, total } = g.progress ?? { done: 0, total: 0 };
    const pct = total ? Math.round((done / total) * 100) : 0;
    return `  <div class="bd-goal">
    <a class="bd-goal-name" href="../${esc(g.page)}">${esc(g.title)}</a>
    <span class="bd-goal-n">${total ? `${done}/${total}` : 'no members yet'}</span>
    ${total ? `<span class="bd-meter"><i style="width:${pct}%"></i></span>` : ''}
  </div>`;
  }).join('\n');
  return instrument('Goals', `<div class="bd-goals">\n${rows}\n</div>`,
    'each standing goal with its shipped members over its total');
}

function auditInstrument(auditLedger, NOW) {
  if (!auditLedger) {
    return instrument('Audit findings', '<p class="bd-quiet">Not recorded — no audit ledger in this deploy.</p>',
      'open findings from the nightly convention audit');
  }
  const c = auditLedger.counts ?? {};
  const detail = ['high', 'medium', 'low'].filter((k) => (c[k] ?? 0) > 0)
    .map((k) => `${c[k]} ${k}`).join(' · ') || 'none by severity';
  const body = `<div class="bd-big"><a href="../audit/index.html">${c.total ?? 0}</a></div>
<p class="bd-inst-sub">${esc(detail)} · from the nightly audit ${auditLedger.generatedAt ? `${age(auditLedger.generatedAt, NOW)} ago` : '(time not recorded)'}</p>`;
  return instrument('Audit findings', body, 'open findings from the nightly convention audit');
}

function instrument(title, body, counts) {
  return `<div class="bd-inst">
<h3>${esc(title)}</h3>
<p class="bd-inst-what">${esc(counts)}</p>
${body}
</div>`;
}

// ---------------------------------------------------------------- page
export async function render(data) {
  const { NOW, HUB, REPOS, SESSION_STATE_URL } = data;
  const lightsRes = await settle('Repo activity', () => collectRepoLights(REPOS));
  const last = lastMotion(data);
  const lastMotionLine = last
    ? `Last motion as of deploy: ${last.what}, ${fmtET(last.ts)}.`
    : 'No earlier motion is recorded in this deploy’s feeds.';

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>The board · obot</title>
<meta name="description" content="A control room over the obot portfolio: the live session feed with per-repo activity lights, what moved today, and the standing gauges — release candidates, decisions, requirement stages, goals, audit findings.">
<link rel="stylesheet" href="../assets/styles.css">
<style>
.bd-wrap { max-width: 46rem; margin: 0 auto; }
.bd-band { margin: 1.6rem 0 0; }
.bd-band > h2 { font-size: 1.3rem; margin: 0 0 .3rem; }
.bd-kicker { display: block; font: 600 .68rem/1.4 var(--mono); letter-spacing: .16em;
  text-transform: uppercase; color: var(--accent); }
.bd-sub { margin: 0 0 .7rem; font-size: .8rem; color: var(--muted); }
.bd-stamp { margin: .6rem 0 0; font-family: var(--mono); font-size: .7rem; color: var(--faint); }
.bd-notice { margin: .3rem 0; font-family: var(--mono); font-size: .76rem; color: var(--warn); }
.bd-notice.dark { color: #fbbf77; }
.bd-notice-inline { font-family: var(--mono); font-size: .76rem; color: var(--warn); }
.bd-quiet { margin: .3rem 0; font-size: .88rem; color: var(--muted); }

/* NOW — the espresso wall. The page's biggest element on purpose. */
.bd-now { border-radius: 14px; background: var(--side-bg); color: var(--side-ink);
  border-top: 4px solid var(--accent-bright); padding: 1rem 1.2rem 1.1rem; margin-top: 1.2rem; }
.bd-now h2 { color: var(--side-ink); font-size: 1.3rem; margin: 0 0 .5rem; }
.bd-now .bd-kicker { color: var(--accent-bright); }
.bd-session { display: flex; flex-wrap: wrap; align-items: baseline; gap: .2rem 1rem; min-width: 0; }
.bd-hero { font: 600 3.4rem/1 var(--sans); letter-spacing: -.02em; }
.bd-hero-label { font: 600 .72rem/1.4 var(--mono); letter-spacing: .12em; text-transform: uppercase; color: var(--side-soft); }
.bd-sess-text { flex: 1 1 14rem; min-width: 0; }
.bd-sess-detail { margin: .1rem 0 0; font-size: .95rem; overflow-wrap: anywhere; }
.bd-sess-counts { margin: .15rem 0 0; font-family: var(--mono); font-size: .76rem; color: var(--side-soft); }
.bd-sess-age { margin: .15rem 0 0; font-family: var(--mono); font-size: .72rem; color: var(--side-soft); }
.bd-deploying { display: none; margin: .5rem 0 0; font-family: var(--mono); font-size: .76rem; color: var(--accent-bright); }
.bd-deploying.on { display: block; }

/* Per-repo activity lights: dot + name + age. The age text is the signal; the
   dot only repeats it, so color is never the only channel. */
.bd-lights { display: flex; flex-wrap: wrap; gap: .35rem .9rem; margin-top: .9rem;
  padding-top: .7rem; border-top: 1px solid rgba(196, 169, 149, .25); }
.bd-light { display: inline-flex; align-items: baseline; gap: .35rem; min-width: 0; }
.bd-dot { width: 9px; height: 9px; border-radius: 50%; flex: none; align-self: center; }
.bd-light.hot .bd-dot { background: var(--accent-bright); }
.bd-light.warm .bd-dot { background: var(--side-soft); }
.bd-light.dim .bd-dot, .bd-light.off .bd-dot { background: none; border: 1px solid #5f4a3a; }
.bd-light-name { font-family: var(--mono); font-size: .74rem; color: var(--side-ink); text-decoration: none; }
a.bd-light-name:hover { color: var(--accent-bright); }
.bd-light.dim .bd-light-name, .bd-light.off .bd-light-name { color: var(--side-soft); }
.bd-light em { font: 400 .7rem/1.4 var(--mono); font-style: normal; color: var(--side-soft); }
.bd-now .bd-stamp { color: #8a715d; }

/* TODAY — one hairline row per move. Phone-first: the timestamp shares the top
   line with nothing; main text wraps freely, nothing is nowrap. */
.bd-moves { border-top: 1px solid var(--rule); }
.bd-mv { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: .6rem;
  align-items: baseline; padding: .32rem 0; border-bottom: 1px solid var(--rule);
  font-size: .85rem; line-height: 1.4; }
.bd-mv:hover { background: var(--panel); }
.bd-mv-main { min-width: 0; overflow-wrap: anywhere; }
.bd-mv-when { font-family: var(--mono); font-size: .7rem; color: var(--faint); white-space: nowrap; }
.bd-pill { display: inline-block; font: 600 .64rem/1.5 var(--mono); letter-spacing: .04em;
  text-transform: uppercase; border-radius: 999px; padding: 0 .4rem; border: 1px solid var(--rule);
  background: var(--panel); color: var(--muted); white-space: nowrap; }
.bd-pill.rel { background: #dcfce7; border-color: #bbf7d0; color: var(--good); }
.bd-pill.pr { background: #ffedd5; border-color: #fed7aa; color: #c2410c; }
.bd-pill.draft { background: #f3e8dd; border-color: #e4d2bf; color: #6b4423; }
.bd-pill.req { background: #fef3c7; border-color: #fde68a; color: var(--warn); }
.bd-pill.dec { background: #fee2e2; border-color: #fecaca; color: #991b1b; }
.bd-pill.idea { background: #ede9fe; border-color: #ddd6fe; color: #5b21b6; }

/* STANDING — instrument cards. Numbers are text; every card says in words what
   it counts, and links to the page holding the detail. */
.bd-insts { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 16rem), 1fr));
  gap: .8rem; margin-top: .2rem; }
.bd-inst { border: 1px solid var(--rule); border-radius: 12px; background: var(--card);
  padding: .8rem 1rem .9rem; min-width: 0; }
.bd-inst h3 { margin: 0; font-size: 1.05rem; }
.bd-inst-what { margin: .1rem 0 .4rem; font-size: .74rem; color: var(--muted); }
.bd-big { font: 600 2.1rem/1.1 var(--sans); letter-spacing: -.01em; }
.bd-big a { color: inherit; text-decoration: none; }
.bd-big a:hover { color: var(--accent); }
.bd-big-plus { font-size: 1rem; color: var(--warn); vertical-align: .5em; margin-left: .15rem; }
.bd-inst-sub { margin: .25rem 0 0; font-size: .8rem; color: var(--muted); overflow-wrap: anywhere; }

/* Stage bar: one sequential ramp; 2px card-surface gaps separate segments. */
.bd-bar { display: flex; gap: 2px; height: 14px; margin-top: .45rem; border-radius: 4px; overflow: hidden; }
.bd-seg { flex-basis: 0; min-width: 5px; }
.bd-legend { display: flex; flex-wrap: wrap; gap: .15rem .8rem; }
.bd-leg { display: inline-flex; align-items: baseline; gap: .3rem; white-space: nowrap; }
.bd-leg b { font-family: var(--mono); font-size: .76rem; }
.bd-sw { width: 10px; height: 10px; border-radius: 2px; border: 1px solid var(--rule); flex: none; align-self: center; }

/* Goal meters: accent fill on a lighter step of the same ramp. */
.bd-goals { display: flex; flex-direction: column; gap: .45rem; margin-top: .2rem; }
.bd-goal { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: .1rem .6rem; align-items: baseline; }
.bd-goal-name { font-size: .85rem; text-decoration: none; overflow-wrap: anywhere; }
.bd-goal-n { font-family: var(--mono); font-size: .74rem; color: var(--muted); white-space: nowrap; }
.bd-meter { grid-column: 1 / -1; display: block; height: 6px; border-radius: 3px; background: #ffedd5; overflow: hidden; }
.bd-meter i { display: block; height: 100%; border-radius: 3px; background: var(--accent); }

@media (max-width: 40rem) {
  .bd-hero { font-size: 2.7rem; }
  .bd-mv-when { white-space: normal; text-align: right; }
}
</style>
</head>
<body>
${siteHeader({ page: 'roadmap', depth: 1 })}
${spikeBanner(meta)}
<div class="bd-wrap">

<section class="bd-band bd-now" id="now">
<h2><span class="bd-kicker">Now</span> Is the machine running?</h2>
<div class="bd-session" id="bd-session">
  <div>
    <div class="bd-hero" id="bd-hero">–</div>
    <div class="bd-hero-label" id="bd-hero-label">agents working</div>
  </div>
  <div class="bd-sess-text">
    <p class="bd-sess-detail" id="bd-sess-detail">Reading the session feed…</p>
    <p class="bd-sess-counts" id="bd-sess-counts"></p>
    <p class="bd-sess-age" id="bd-sess-age"></p>
  </div>
  <noscript><p class="bd-sess-detail">JavaScript is off, so the live feed cannot be read here — everything else on this page is as of the last deploy.</p></noscript>
</div>
<p class="bd-deploying" id="bd-deploying"></p>
${lightsHtml(lightsRes, NOW)}
<p class="bd-stamp">Session feed rechecks every 60 seconds in this tab · repo lights (last commit per default branch) as of deploy ${fmtET(NOW)}</p>
</section>

${todayBand(data, NOW)}

<section class="bd-band" id="standing">
<h2><span class="bd-kicker">The standing state</span> The gauges</h2>
<p class="bd-sub">Counts, not lists — each instrument links to the page that holds the detail: the <a href="../roadmap.html">roadmap</a>, the <a href="../decisions/index.html">decision log</a>, the <a href="../goals/index.html">goal pages</a>, the <a href="../audit/index.html">audit</a>.</p>
<div class="bd-insts">
${waitingInstrument(data)}
${stageInstrument(data.reqRes)}
${goalsInstrument(data.goalRes)}
${auditInstrument(data.auditLedger, NOW)}
</div>
</section>

</div>

<script>
(function () {
  var hero = document.getElementById('bd-hero');
  var heroLabel = document.getElementById('bd-hero-label');
  var detail = document.getElementById('bd-sess-detail');
  var counts = document.getElementById('bd-sess-counts');
  var ageEl = document.getElementById('bd-sess-age');
  var LAST_MOTION = ${JSON.stringify(lastMotionLine)};
  var STALE_MINUTES = ${STALE_MINUTES};

  function whenOf(mins) {
    if (mins === null) return 'age unknown';
    if (mins < 1) return 'just now';
    if (mins < 60) return mins + 'm ago';
    if (mins < 1440) return Math.floor(mins / 60) + 'h ago';
    return Math.floor(mins / 1440) + 'd ago';
  }

  // All text lands via textContent, never markup — the feed is remote input.
  function renderSession(s) {
    if (!s) {
      hero.textContent = '—';
      heroLabel.textContent = 'session feed';
      detail.textContent = 'The session feed could not be read from this page load.';
      counts.textContent = LAST_MOTION;
      ageEl.textContent = '';
      return;
    }
    var mins = s.updatedAt ? Math.floor((Date.now() - new Date(s.updatedAt)) / 60000) : null;
    var when = whenOf(mins);
    if (mins === null || mins > STALE_MINUTES) {
      // A control room showing confident numbers from a dead feed is worse than
      // one that says the feed died.
      hero.textContent = '—';
      heroLabel.textContent = 'liveness unknown';
      detail.textContent = 'Feed last updated ' + when + ' — too old to say what is running.';
      counts.textContent = LAST_MOTION;
      ageEl.textContent = '';
      return;
    }
    var a = s.agents || {};
    var working = typeof a.working === 'number' ? a.working : null;
    var idle = s.state === 'idle' || s.state === 'done' || working === 0;
    if (working === null) {
      hero.textContent = '—';
      heroLabel.textContent = 'agent count not in feed';
      detail.textContent = (s.name || 'obot') + ' — ' + (s.detail || s.state || 'state not recorded');
      counts.textContent = '';
    } else if (idle) {
      hero.textContent = '0';
      heroLabel.textContent = 'agents working';
      detail.textContent = 'No agents working right now — a deliberate quiet, not a breakage.';
      counts.textContent = LAST_MOTION;
    } else {
      hero.textContent = String(working);
      heroLabel.textContent = working === 1 ? 'agent working' : 'agents working';
      detail.textContent = (s.name || 'obot') + ' — ' + (s.detail || s.state || 'working');
      var bits = [working + ' working'];
      if (typeof a.needsInput === 'number') bits.push(a.needsInput + ' waiting on input');
      if (typeof a.total === 'number') bits.push(a.total + ' total');
      counts.textContent = bits.join(' · ');
    }
    ageEl.textContent = 'reading ' + when + ' · rechecks every 60s';
  }

  function poll() {
    fetch(${JSON.stringify(SESSION_STATE_URL)}, { cache: 'no-store' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(renderSession)
      .catch(function () { renderSession(null); });
  }
  poll();
  setInterval(poll, 60000);

  // One unauthenticated API request per load: is a deploy of this site running
  // right now? Absence renders as nothing — no deploy is the normal state.
  var dep = document.getElementById('bd-deploying');
  fetch('https://api.github.com/repos/${HUB}/actions/runs?status=in_progress&per_page=5')
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (d) {
      if (!d || !d.workflow_runs || !d.workflow_runs.length) return;
      var names = d.workflow_runs.map(function (w) { return w.name || 'workflow'; }).join(', ');
      dep.textContent = '● deploying now — ' + names + ' in progress';
      dep.className = 'bd-deploying on';
    })
    .catch(function () { /* rate-limited or offline — the light stays off */ });
})();
</script>

<footer class="site">Generated ${fmtET(NOW)} · built by
<a href="https://github.com/${HUB}/blob/main/scripts/build_spike.mjs"><code>build_spike.mjs</code></a> · Worker: W0004.3</footer>
</body>
</html>
`;
}
