// Spike direction: "The queue" (requirement #202, task #204 — worker W0004.1).
//
// The page is @jwildfire's inbox, not a report. One ranked list of every item
// that cannot proceed without him, longest-waiting first. Each card carries a
// type pill (review / decide / triage / unstick / release), the thing itself in
// plain words, one line on why it is his — what stays blocked until he acts —
// and a single prominent verb-link as the action, plus the wait age. Items that
// have waited longer literally weigh more on the page: a card past one day gets
// an amber edge, past three days a red edge, a tinted ground and a bigger age.
//
// Membership reuses the house semantics exactly — the same computations the
// current roadmap page makes (lib/highlights.mjs thresholds, lib/rc.mjs release
// dedupe) — so this direction differs in shape, never in what counts as waiting.
//
// What it gives up: the inventory. Nothing here lets you browse everything that
// exists; the current page keeps that job.
import { esc, age, fmtET, clip, daysAgo } from '../lib/gh.mjs';
import { siteHeader } from '../lib/nav.mjs';
import { releaseKey } from '../lib/rc.mjs';
import { T } from '../lib/highlights.mjs';
import { spikeBanner } from './shared.mjs';

const REVIEWER = 'jwildfire';
const PROJECT_URL = 'https://github.com/users/jwildfire/projects/1';
const WORKER = 'W0004.1';

export const meta = {
  slug: 'queue',
  name: 'The queue',
  putsFirst: 'what needs him',
  givesUp: 'the inventory — nothing here lets you browse everything that exists; the current page keeps that job',
  blurb: 'One ranked inbox of everything that cannot move without you, longest wait first — each card says why it is yours and gives the one action that clears it.',
};

const short = (nameWithOwner) => (nameWithOwner || '').split('/')[1] ?? nameWithOwner;

// ------------------------------------------------------------- queue membership
// Every rule below is the house rule, stated where the current page states it:
// RC dedupe from lib/rc.mjs, thresholds from lib/highlights.mjs. An item is
// {type, since (ISO or null), prefix (the age verb), title, why (HTML),
//  act {label, href}, cite {label, href}, attrs (extra data- attributes)}.
function buildItems({ NOW, reqRes, prRes, relRes, ideaRes, decRes }) {
  const items = [];

  // Release candidates: review-requested PRs, plus draft releases deduped
  // against their RC PR — an open RC PR and the draft release of the same
  // version in the same repo are ONE release, and the PR is the reviewable half.
  const rcPrs = (prRes.value ?? []).filter((pr) => pr.reviewRequested?.includes(REVIEWER));
  const prKeys = new Set(rcPrs.map((pr) => releaseKey(pr.repo, pr.version)).filter(Boolean));
  for (const pr of rcPrs) {
    items.push({
      type: 'review',
      since: pr.updatedAt,
      prefix: 'waiting',
      title: pr.title,
      why: pr.version
        ? `Review is the gate: ${esc(short(pr.repo))} ${esc(pr.version)} does not ship until this lands.`
        : 'Review is the gate: nothing on this candidate merges until you look at it.',
      act: { label: 'Review the PR', href: pr.url },
      cite: { label: `${short(pr.repo)}#${pr.number}`, href: pr.url },
      attrs: ' data-rcpr',
    });
  }
  for (const d of relRes.value?.drafts ?? []) {
    const key = releaseKey(d.repo, d.version);
    if (key && prKeys.has(key)) continue; // same release as an RC PR above
    items.push({
      type: 'review',
      since: d.createdAt,
      prefix: 'waiting',
      title: d.name,
      why: 'The release is drafted and ready — it ships the moment you publish it.',
      act: { label: 'Publish or edit the draft', href: d.url },
      cite: { label: `${short(d.repo)}${d.tag ? ` ${d.tag}` : ''}`, href: d.url },
      attrs: ` data-draft${key ? ` data-release="${esc(key)}"` : ''}`,
    });
  }

  // Decisions awaiting him, straight from the committed decision index.
  for (const d of decRes.value?.awaiting ?? []) {
    const artifact = d.path ? `../${d.path}` : '../reports/decisions/';
    // statusPlain flattens links but keeps markdown emphasis; strip it or the
    // card reads "**Folded into D0017**" with literal asterisks.
    const status = clip((d.statusPlain || '').replace(/[*_`]/g, '').trim(), 110);
    items.push({
      type: 'decide',
      since: /^\d{4}-\d{2}-\d{2}/.test(d.date || '') ? d.date : null,
      prefix: 'open',
      title: (d.title || '').replace(/`/g, ''),
      why: status
        ? `${esc(status)} — work that hangs on this call stays parked until you answer.`
        : 'Open in the decision index — work that hangs on this call stays parked until you answer.',
      act: d.discussion
        ? { label: 'Decide in the Q&A thread', href: d.discussion.url }
        : { label: 'Read the artifact and decide', href: artifact },
      cite: { label: d.id ?? d.date ?? 'decision', href: artifact },
    });
  }

  // Un-triaged ideas older than the house triage window.
  for (const idea of ideaRes.value?.open ?? []) {
    if (daysAgo(idea.createdAt, NOW) <= T.ideaAgeDays) continue;
    items.push({
      type: 'triage',
      since: idea.createdAt,
      prefix: 'un-triaged',
      title: idea.title,
      why: 'Sitting in the ideas inbox with no triage — it becomes work, a note, or a no only when you answer or promote it.',
      act: { label: 'Answer or promote the idea', href: idea.url },
      cite: { label: `idea #${idea.number}`, href: idea.url },
    });
  }

  // Stalled in-flight requirements and board drift, one card per requirement —
  // a requirement can be both, and listing it twice would double its weight.
  for (const req of reqRes.value ?? []) {
    if (req.state !== 'OPEN') continue;
    const inFlight = req.stage === 'Development' || req.stage === 'Review';
    const stalled = inFlight && daysAgo(req.updatedAt, NOW) > T.stalledDays;
    if (!stalled && !req.drift) continue;
    const why = [];
    if (stalled) {
      why.push(`The board says ${esc(req.stage)}, but nothing has touched it in over ${T.stalledDays} days — in-flight work this quiet needs a nudge or a call to close.`);
    }
    if (req.drift === 'open in Released') {
      why.push('The issue is open but the board files it under Released, so the roadmap misreads this work until you restage it.');
    } else if (req.drift === 'unstaged') {
      why.push('It sits on the board with no stage at all, so it appears in no lane until you place it.');
    }
    items.push({
      type: 'unstick',
      since: req.updatedAt,
      prefix: 'quiet',
      title: req.title,
      why: why.join(' '),
      act: stalled
        ? { label: 'Nudge or close the issue', href: req.url }
        : { label: 'Fix its stage on the board', href: PROJECT_URL },
      cite: { label: `#${req.number}`, href: req.url },
    });
  }

  // Release decisions: upcoming rows hitting the house attention triggers
  // (backlog past the threshold, diverged branches, never-released real work).
  for (const u of relRes.value?.upcoming ?? []) {
    const backlogTrip = (u.unreleased ?? 0) >= T.releaseBacklog || (u.devAhead ?? 0) >= T.releaseBacklog;
    const diverged = (u.devBehind ?? 0) > 0;
    const neverWithWork = u.neverReleased && ((u.devAhead ?? 0) > 0 || (u.unreleased ?? 0) > 0);
    if (!backlogTrip && !diverged && !neverWithWork) continue;
    const s = short(u.repo);
    const parts = [];
    if ((u.unreleased ?? 0) >= T.releaseBacklog) {
      parts.push(`${u.unreleased} commits are merged past ${esc(u.latestTag)} with no release covering them`);
    }
    if ((u.devAhead ?? 0) >= T.releaseBacklog) {
      parts.push(`${u.devAhead} commits on dev are not promoted to ${esc(u.releaseBranch)}`);
    }
    if (diverged) {
      parts.push(`dev has fallen ${u.devBehind} commit${u.devBehind > 1 ? 's' : ''} behind ${esc(u.releaseBranch)} — the branches have diverged`);
    }
    if (u.neverReleased) parts.push('the repo has never shipped a release despite carrying real work');
    const backlog = Math.max(u.unreleased ?? 0, u.devAhead ?? 0);
    items.push({
      type: 'release',
      since: u.newestCommitAt, // the newest unreleased commit — the wait is at least this old
      prefix: 'waiting',
      noAge: u.neverReleased ? 'never shipped' : null,
      title: u.neverReleased ? `${s} has never shipped a release`
        : diverged && !backlogTrip ? `${s}: dev and ${u.releaseBranch} have diverged`
        : `${s} has ${backlog} unshipped commits`,
      why: `${parts.join('; ')}. Cutting or deferring the release is your call.`,
      act: { label: 'See the unshipped work', href: u.unreleasedUrl ?? u.devUrl ?? `https://github.com/${u.repo}` },
      cite: { label: s, href: `https://github.com/${u.repo}` },
    });
  }

  // Longest-waiting first: ascending "waiting since" timestamp, unknown ages
  // last — a card that cannot prove its wait never outranks one that can.
  items.sort((a, b) => {
    const ta = a.since ? new Date(a.since).getTime() : Infinity;
    const tb = b.since ? new Date(b.since).getTime() : Infinity;
    return ta - tb;
  });
  return items;
}

// ------------------------------------------------------------------ card render
function card(item, NOW) {
  const ts = item.since ? new Date(item.since).getTime() : NaN;
  const known = Number.isFinite(ts);
  const days = known ? (NOW - ts) / 86400000 : 0;
  const tier = known && days >= 3 ? 'w2' : known && days >= 1 ? 'w1' : 'w0';
  const a = known ? age(item.since, NOW) : null;
  const ageTxt = !known
    ? (item.noAge ?? 'age not recorded')
    : a === 'just now' ? 'just now' : `${item.prefix} ${a}`;
  const cite = item.cite ? ` <a class="q-cite" href="${item.cite.href}">${esc(item.cite.label)}</a>` : '';
  return `  <li class="q-card q-${tier}"${item.attrs ?? ''} data-wait="${known ? ts : ''}">
    <div class="q-top"><span class="q-pill ${item.type}">${item.type}</span><span class="q-age">${esc(ageTxt)}</span></div>
    <h3 class="q-title">${esc(item.title)}</h3>
    <p class="q-why">${item.why}${cite}</p>
    <p class="q-act"><a class="q-verb" href="${item.act.href}">${esc(item.act.label)}</a></p>
  </li>`;
}

// ------------------------------------------------------------------ recent strip
// Real counts over the pulse window, from the same bundle the queue reads. A
// source that failed says so instead of pretending zero happened.
function recentStrip({ relRes, decRes, ideaRes, NOW }) {
  const parts = [];
  if (relRes.ok) {
    const n = relRes.value.recent.filter((r) => r.publishedAt && daysAgo(r.publishedAt, NOW) <= T.pulseDays).length;
    parts.push(`${n} release${n === 1 ? '' : 's'} shipped`);
  } else parts.push('releases not readable');
  if (decRes.ok) {
    // "Decided 2026-08-15 — …" in the status cell is the decision date; the
    // Date column is the artifact's date and is only the fallback.
    const n = decRes.value.decided.filter((d) => {
      const m = (d.statusPlain || '').match(/decided\s+(\d{4}-\d{2}-\d{2})/i);
      const when = m ? m[1] : d.date;
      const t = new Date(when);
      return Number.isFinite(t.getTime()) && daysAgo(when, NOW) <= T.pulseDays;
    }).length;
    parts.push(`${n} decision${n === 1 ? '' : 's'} decided`);
  } else parts.push('decisions not readable');
  if (ideaRes.ok) {
    const n = ideaRes.value.promoted.filter((d) => d.closedAt && daysAgo(d.closedAt, NOW) <= T.pulseDays).length;
    parts.push(`${n} idea${n === 1 ? '' : 's'} promoted`);
  } else parts.push('promoted ideas not readable');
  return `Last ${T.pulseDays} days: ${parts.join(' · ')}. Detail lives on the <a href="../roadmap.html#pulse">current roadmap page</a>.`;
}

// ------------------------------------------------------------------------- page
export async function render(data) {
  const { NOW, reqRes, prRes, relRes, ideaRes, decRes, HUB, SESSION_STATE_URL } = data;
  const items = buildItems(data);
  const n = items.length;
  const allOk = [prRes, relRes, decRes, ideaRes, reqRes].every((r) => r.ok);

  const notices = [];
  if (!prRes.ok) notices.push(`${prRes.notice} — review-requested PRs may be missing (the live re-check below still runs).`);
  if (!relRes.ok) notices.push(`${relRes.notice} — draft releases and release decisions are missing.`);
  if (!decRes.ok) notices.push(`${decRes.notice} — open decisions are missing.`);
  if (!ideaRes.ok) notices.push(`${ideaRes.notice} — un-triaged ideas are missing.`);
  if (!reqRes.ok) notices.push(`${reqRes.notice} — stalled and drifted requirements are missing.`);

  const countTxt = n === 1 ? '1 item is waiting' : `${n} items are waiting`;
  const longestTxt = n && items[0].since ? ` · longest wait ${age(items[0].since, NOW)}` : '';

  const emptyHero = allOk
    ? `<p class="q-zero">Nothing is waiting on you.</p>
    <p>No reviews, no open decisions, no un-triaged ideas, no stalled work, no release calls. The strips below still say what is running and what recently landed.</p>`
    : `<p class="q-zero">Nothing readable is waiting.</p>
    <p>Some sources failed on this build (see the notes above), so the queue may be incomplete rather than clear.</p>`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>The queue · obot</title>
<meta name="description" content="Everything that cannot proceed without @jwildfire, ranked by wait — release reviews, decisions, idea triage, stalled work and release calls, on live data.">
<link rel="stylesheet" href="../assets/styles.css">
<style>
/* The queue — an inbox, so a single narrow column even on desktop. Mobile-first:
   nothing here has a fixed width, long GitHub titles wrap, and the only
   horizontal arrangement (pill · age) is two short nowrap tokens. */
.q-wrap { max-width: 46rem; margin: 0 auto; }
.q-head h1 { margin: 1rem 0 .15rem; }
.q-sum { margin: 0; color: var(--muted); font-size: .95rem; }
.q-note { margin: .25rem 0 0; font-size: .76rem; color: var(--faint); }
.q-notice { margin: .45rem 0 0; font-family: var(--mono); font-size: .78rem; color: var(--warn); overflow-wrap: anywhere; }

.q-list { list-style: none; margin: 1.1rem 0 0; padding: 0; display: flex; flex-direction: column; gap: .65rem; }
.q-card {
  border: 1px solid var(--rule);
  border-left: 3px solid var(--rule);
  border-radius: 10px;
  background: var(--card);
  padding: .6rem .85rem .7rem;
  min-width: 0;
}
/* Wait-age weight: the longer it has waited, the heavier the card reads. */
.q-card.q-w1 { border-left: 3px solid #fdba74; }
.q-card.q-w2 { border-left: 4px solid #c2410c; background: #fdf1ec; }
.q-top { display: flex; align-items: baseline; justify-content: space-between; gap: .5rem; }
.q-pill {
  display: inline-block;
  font: 600 .66rem/1.6 var(--mono);
  letter-spacing: .05em;
  text-transform: uppercase;
  border-radius: 999px;
  padding: 0 .5rem;
  border: 1px solid var(--rule);
  background: var(--panel);
  color: var(--muted);
  white-space: nowrap;
}
.q-pill.review { background: #ffedd5; border-color: #fdba74; color: #9a3412; }
.q-pill.decide { background: #fee2e2; border-color: #fecaca; color: #991b1b; }
.q-pill.triage { background: #ede9fe; border-color: #ddd6fe; color: #5b21b6; }
.q-pill.unstick { background: #fef3c7; border-color: #fde68a; color: #92400e; }
.q-pill.release { background: #dcfce7; border-color: #bbf7d0; color: #166534; }
.q-age { font-family: var(--mono); font-size: .72rem; color: var(--faint); white-space: nowrap; }
.q-w1 .q-age { color: var(--warn); font-size: .78rem; }
.q-w2 .q-age { color: #991b1b; font-size: .9rem; font-weight: 600; }
.q-title { font-family: var(--serif); font-weight: 400; font-size: 1.12rem; line-height: 1.2; margin: .3rem 0 .15rem; overflow-wrap: anywhere; }
.q-w2 .q-title { font-size: 1.22rem; }
.q-why { margin: 0; font-size: .85rem; color: var(--muted); overflow-wrap: anywhere; }
.q-cite { font-family: var(--mono); font-size: .74rem; text-decoration: none; }
.q-act { margin: .5rem 0 0; }
.q-verb {
  display: inline-block;
  font: 600 .8rem/1.7 var(--mono);
  color: var(--paper);
  background: var(--accent);
  border-radius: 999px;
  padding: .12rem .85rem;
  text-decoration: none;
}
.q-verb:hover { background: var(--accent-bright); color: var(--paper); text-decoration: none; }

/* The empty state is the goal state, so it gets the biggest type on the page. */
.q-empty { border: 1px solid var(--rule); border-radius: 12px; background: var(--card); padding: 1.6rem 1.2rem; text-align: center; margin: 1.2rem 0 0; }
.q-zero { font-family: var(--serif); font-size: 1.9rem; line-height: 1.15; margin: 0 0 .45rem; }
.q-empty p { margin: 0; color: var(--muted); font-size: .9rem; }
.q-empty p.q-zero { color: var(--ink); }

/* The other two questions, answered small: Running now · Recent. */
.q-strips { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 17rem), 1fr)); gap: .8rem; margin: 1.5rem 0 0; }
.q-strip { border: 1px solid var(--rule); border-radius: 10px; background: var(--panel); padding: .6rem .85rem .7rem; min-width: 0; }
.q-strip h2 { font: 600 .68rem/1.5 var(--mono); letter-spacing: .12em; text-transform: uppercase; color: var(--muted); margin: 0 0 .3rem; }
.q-strip p { margin: 0; font-size: .84rem; overflow-wrap: anywhere; }
.q-live.live { color: var(--good); }
.q-live.idle { color: var(--muted); }
.q-live.stale { color: var(--faint); font-style: italic; }
.q-fine { margin: .3rem 0 0 !important; font-size: .7rem !important; color: var(--faint); }
</style>
</head>
<body>
${siteHeader({ page: 'roadmap', depth: 1 })}
${spikeBanner(meta)}
<main class="q-wrap">
<header class="q-head">
  <h1>Waiting on you</h1>
  <p class="q-sum"><span id="q-count">${countTxt}</span><span id="q-longest">${longestTxt}</span></p>
  <p class="q-note">Longest wait first. Review items re-check GitHub on every page load; everything else is as of ${fmtET(NOW)}. Ages measure each item's last recorded activity.</p>
${notices.map((t) => `  <p class="q-notice">${esc(t)}</p>`).join('\n')}
</header>

<div class="q-empty" id="q-empty"${n ? ' hidden' : ''}>
  ${emptyHero}
</div>

<ol class="q-list" id="q-list" aria-label="Items waiting on @jwildfire, longest wait first">
${items.map((item) => card(item, NOW)).join('\n')}
</ol>

<div class="q-strips">
  <section class="q-strip">
    <h2>Running now</h2>
    <p class="q-live" id="q-live">Session feed not read — this readout needs JavaScript.</p>
    <p class="q-fine">Published by the session heartbeat to the session-state branch; the raw feed caches for about five minutes.</p>
  </section>
  <section class="q-strip">
    <h2>Recent</h2>
    <p>${recentStrip(data)}</p>
  </section>
</div>
</main>

<script>
(function () {
  // ---- Running now: the heartbeat-published session state, fetched fresh so it
  // is newer than the deploy. Never asserts liveness from a stale reading.
  var live = document.getElementById('q-live');
  var STALE_MINUTES = 120;
  var agoTxt = function (mins) {
    if (mins === null) return 'age unknown';
    if (mins < 1) return 'just now';
    if (mins < 60) return mins + 'm ago';
    if (mins < 2880) return Math.floor(mins / 60) + 'h ago';
    return Math.floor(mins / 1440) + 'd ago';
  };
  live.textContent = 'Reading the session feed…';
  fetch(${JSON.stringify(SESSION_STATE_URL)}, { cache: 'no-store' })
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (s) {
      if (!s || !s.state) {
        live.className = 'q-live stale';
        live.textContent = 'No session state is published right now.';
        return;
      }
      var mins = s.updatedAt ? Math.floor((Date.now() - new Date(s.updatedAt)) / 60000) : null;
      if (mins === null || mins > STALE_MINUTES) {
        live.className = 'q-live stale';
        live.textContent = 'The session feed last updated ' + agoTxt(mins) + ' — treated as unknown, not as live.';
        return;
      }
      var idle = s.state === 'idle' || s.state === 'done';
      var agents = s.agents && s.agents.total
        ? ' · ' + s.agents.working + ' of ' + s.agents.total + ' agents working'
        : '';
      live.className = 'q-live ' + (idle ? 'idle' : 'live');
      live.textContent = (idle ? '○ ' : '● ') + (s.name || 'obot') + ' — ' + (s.detail || s.state) + agents + ' · updated ' + agoTxt(mins);
    })
    .catch(function () {
      live.className = 'q-live stale';
      live.textContent = 'The session feed could not be read on this page load.';
    });

  // ---- Review re-check: PRs open and close without a push to this repo, and
  // the top of the queue must be as current as a page load. One unauthenticated
  // search; on failure the build-time cards stand untouched.
  var list = document.getElementById('q-list');
  if (!list) return;
  var escape = function (s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  };
  var waitTxt = function (ts) {
    var mins = Math.floor((Date.now() - ts) / 60000);
    if (mins <= 1) return 'just now';
    if (mins < 60) return 'waiting ' + mins + 'm';
    if (mins < 1440) return 'waiting ' + Math.floor(mins / 60) + 'h';
    return 'waiting ' + Math.floor(mins / 1440) + 'd';
  };
  var spanTxt = function (ts) {
    var mins = Math.floor((Date.now() - ts) / 60000);
    if (mins < 60) return mins <= 1 ? 'under a minute' : mins + 'm';
    if (mins < 1440) return Math.floor(mins / 60) + 'h';
    return Math.floor(mins / 1440) + 'd';
  };
  // Mirrors lib/rc.mjs (milestone title, then PR title; normalised version).
  // Written without backslash escapes on purpose: this script lives inside a
  // template literal, where a lone backslash is eaten before it reaches the page.
  var releaseKeyOf = function (repo, candidates) {
    for (var i = 0; i < candidates.length; i++) {
      var c = candidates[i];
      if (!c || /^untagged-[0-9a-f]+$/i.test(c)) continue;
      var m = String(c).match(/v?([0-9]+)[.]([0-9]+)(?:[.]([0-9]+))?/);
      if (m) return repo + '@v' + m[1] + '.' + m[2] + '.' + (m[3] || 0);
    }
    return null;
  };
  var insertSorted = function (li, ts) {
    var kids = list.children;
    for (var i = 0; i < kids.length; i++) {
      var w = kids[i].getAttribute('data-wait');
      var wv = w ? Number(w) : Infinity;
      if (ts < wv) { list.insertBefore(li, kids[i]); return; }
    }
    list.appendChild(li);
  };
  var refreshSummary = function () {
    var count = list.children.length;
    var countEl = document.getElementById('q-count');
    if (countEl) countEl.textContent = count === 1 ? '1 item is waiting' : count + ' items are waiting';
    var longestEl = document.getElementById('q-longest');
    if (longestEl) {
      var first = list.children[0];
      var w = first ? first.getAttribute('data-wait') : null;
      longestEl.textContent = w ? ' · longest wait ' + spanTxt(Number(w)) : '';
    }
    var emptyEl = document.getElementById('q-empty');
    if (emptyEl) emptyEl.hidden = count > 0;
  };
  var rcQuery = 'is:pr is:open archived:false user:jwildfire review-requested:jwildfire';
  fetch('https://api.github.com/search/issues?per_page=30&q=' + encodeURIComponent(rcQuery))
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (data) {
      if (!data || !Array.isArray(data.items)) return;
      var prKeys = {};
      var fresh = data.items.map(function (it) {
        var repo = it.repository_url.replace('https://api.github.com/repos/', '');
        var key = releaseKeyOf(repo, [it.milestone && it.milestone.title, it.title]);
        if (key) prKeys[key] = true;
        return { repo: repo, number: it.number, url: it.html_url, title: it.title, since: it.updated_at };
      });
      // Replace the build-time review cards with the fresh truth…
      Array.prototype.slice.call(list.querySelectorAll('[data-rcpr]')).forEach(function (el) {
        el.parentNode.removeChild(el);
      });
      // …and re-run the release dedupe: a draft whose RC PR is in this response
      // is the same release seen twice.
      Array.prototype.slice.call(list.querySelectorAll('[data-draft]')).forEach(function (el) {
        var k = el.getAttribute('data-release');
        if (k && prKeys[k]) el.parentNode.removeChild(el);
      });
      fresh.forEach(function (p) {
        var ts = new Date(p.since).getTime();
        var days = (Date.now() - ts) / 86400000;
        var tier = days >= 3 ? 'w2' : days >= 1 ? 'w1' : 'w0';
        var name = p.repo.split('/')[1];
        var li = document.createElement('li');
        li.className = 'q-card q-' + tier;
        li.setAttribute('data-rcpr', '');
        li.setAttribute('data-wait', String(ts));
        li.innerHTML = '<div class="q-top"><span class="q-pill review">review</span><span class="q-age">' + waitTxt(ts) + '</span></div>' +
          '<h3 class="q-title">' + escape(p.title) + '</h3>' +
          '<p class="q-why">Review is the gate: nothing on this candidate merges until you look at it. <a class="q-cite" href="' + escape(p.url) + '">' + escape(name) + '#' + p.number + '</a></p>' +
          '<p class="q-act"><a class="q-verb" href="' + escape(p.url) + '">Review the PR</a></p>';
        insertSorted(li, ts);
      });
      refreshSummary();
    })
    .catch(function () { /* offline or rate-limited — the build-time queue stands */ });
})();
</script>

<footer class="site">Generated ${fmtET(NOW)} · built by
<a href="https://github.com/${HUB}/blob/main/scripts/build_spike.mjs"><code>build_spike.mjs</code></a>
for <a href="https://github.com/${HUB}/issues/204">task #204</a> · Worker: ${WORKER}</footer>
</body>
</html>
`;
  return html;
}
