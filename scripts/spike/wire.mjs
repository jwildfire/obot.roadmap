// Direction: "The wire" — the roadmap as a newspaper (spike #202/#204, worker W0004.2).
//
// A reverse-chronological, day-grouped stream of what actually happened in the
// last 7 days, newest first. The returning reader scrolls until they hit
// something they already know — that point IS "caught up". Every event is a
// dated fact from a real source: releases published, decisions recorded, ideas
// filed and promoted, roadmap-audit changelog lines, plus requirements filed and
// PRs merged in the window (one extra GraphQL search, made here).
//
// Last-visit honesty rule (hard): the site records nothing per-visitor. The only
// personal marker is a real localStorage timestamp written by this browser on a
// previous view — rendered inline where it falls in the stream. Nothing on this
// page computes or implies a "since you last looked" window from anything else.
import { esc, day, fmtET, clip, settle, graphql } from '../lib/gh.mjs';
import { siteHeader } from '../lib/nav.mjs';
import { releaseKey } from '../lib/rc.mjs';
import { spikeBanner } from './shared.mjs';

export const meta = {
  slug: 'wire',
  name: 'The wire',
  putsFirst: 'what changed since he last looked',
  givesUp: 'right-now operational depth — the wire reports what happened, not what is mid-flight; a thin waiting-on-you banner and one session line are its only present tense',
  blurb: 'A day-grouped newspaper of the last 7 days — releases, decisions, merges, filings — read newest-first until you hit something you already know.',
};

const WINDOW_DAYS = 7;
const REVIEWER = 'jwildfire';
const ET = 'America/New_York';

const shortRepo = (nameWithOwner) => String(nameWithOwner).split('/')[1] ?? nameWithOwner;
const cleanTitle = (t = '') => String(t).split('`').join('');

// ET calendar day of an ISO timestamp — the grouping key.
const etDayOf = (iso) =>
  new Intl.DateTimeFormat('sv-SE', { timeZone: ET, year: 'numeric', month: '2-digit', day: '2-digit' })
    .format(new Date(iso));

// "Sat 16 Aug" — the absolute label. Client JS adds "Today ·"/"Yesterday ·" when
// they are true at *read* time, so a page read days after its build never lies.
const etLabelOf = (dayStr) =>
  new Intl.DateTimeFormat('en-GB', { timeZone: ET, weekday: 'short', day: 'numeric', month: 'short' })
    .format(new Date(`${dayStr}T17:00:00Z`));

const cite = (href, label) => ` <a class="w-cite" href="${esc(href)}">${esc(label)}</a>`;

export async function render(data) {
  const { NOW, prRes, relRes, ideaRes, decRes, changelog, HUB, REPOS, SESSION_STATE_URL } = data;
  const windowStart = new Date(NOW.getTime() - WINDOW_DAYS * 86400000);
  const inWindow = (iso) => Boolean(iso) && new Date(iso) >= windowStart;

  // ---------------------------------------------------------------- extra data
  // Two real searches in one GraphQL call: requirements filed on the hub in the
  // window, and PRs merged across the portfolio in the window. If it fails, both
  // event types render a notice line — never fake rows.
  const searchRes = await settle('Window search (requirements filed, PRs merged)', async () => {
    const since = day(windowStart.toISOString());
    // sort:updated-desc so that if the window ever outgrows a page, the page is
    // the recent end of it rather than search's best-match shuffle.
    const prQ = `is:pr is:merged merged:>=${since} sort:updated-desc ${REPOS.map((r) => `repo:${r.nameWithOwner}`).join(' ')}`;
    const reqQ = `repo:${HUB} is:issue label:requirement created:>=${since} sort:created-desc`;
    return graphql(`
query ($prQ: String!, $reqQ: String!) {
  merged: search(query: $prQ, type: ISSUE, first: 100) {
    issueCount
    nodes { ... on PullRequest { number title url mergedAt repository { nameWithOwner } } }
  }
  filed: search(query: $reqQ, type: ISSUE, first: 50) {
    issueCount
    nodes { ... on Issue { number title url createdAt } }
  }
}`, { prQ, reqQ });
  });

  // ------------------------------------------------------------------- events
  // { ts (UTC ISO — the sort key), cls/pill (the type glyph), html (escaped) }
  const events = [];
  const ev = (ts, cls, pill, html) => events.push({ ts, cls, pill, html });

  if (relRes.ok) {
    for (const r of relRes.value.recent) {
      if (!inWindow(r.publishedAt)) continue;
      const pre = r.prerelease ? ' (pre-release)' : '';
      // Release names often open with "repo vX.Y.Z — "; the sentence already
      // says both, so the duplicate lead-in goes.
      let name = r.name ?? '';
      for (const lead of [`${shortRepo(r.repo)} ${r.tag}`, `${shortRepo(r.repo)} ${String(r.tag).replace(/^v/, '')}`, r.tag]) {
        if (lead && name.startsWith(lead)) { name = name.slice(lead.length).replace(/^[\s—–:-]+/, ''); break; }
      }
      const named = name ? ` — ${esc(name)}` : '';
      ev(r.publishedAt, 'release', 'release',
        `${esc(shortRepo(r.repo))} shipped ${esc(r.tag)}${pre}${named}.${cite(r.url, r.tag)}`);
    }
  }

  let mergedShown = 0; let mergedTotal = 0; let filedShown = 0; let filedTotal = 0;
  if (searchRes.ok) {
    const merged = (searchRes.value.merged?.nodes ?? []).filter((n) => n && n.number);
    mergedTotal = searchRes.value.merged?.issueCount ?? merged.length;
    for (const pr of merged) {
      if (!inWindow(pr.mergedAt)) continue;
      mergedShown += 1;
      ev(pr.mergedAt, 'merged', 'merged',
        `${esc(shortRepo(pr.repository?.nameWithOwner ?? ''))} merged: ${esc(pr.title)}.${cite(pr.url, `#${pr.number}`)}`);
    }
    const filed = (searchRes.value.filed?.nodes ?? []).filter((n) => n && n.number);
    filedTotal = searchRes.value.filed?.issueCount ?? filed.length;
    for (const iss of filed) {
      if (!inWindow(iss.createdAt)) continue;
      filedShown += 1;
      const title = cleanTitle(iss.title).replace(/^Requirement:\s*/i, '');
      ev(iss.createdAt, 'req', 'req filed',
        `Requirement filed: ${esc(title)}.${cite(iss.url, `#${iss.number}`)}`);
    }
  }

  // Decisions — two real dated facts per artifact: the day it was put to
  // @jwildfire (the Date column of reports/decisions/README.md) and, once the
  // status opens with "Decided YYYY-MM-DD", the day he decided. Both are dates,
  // not timestamps, so they sort mid-afternoon within their day and no
  // time-of-day is ever displayed for them.
  if (decRes.ok) {
    const all = [...(decRes.value.awaiting ?? []), ...(decRes.value.decided ?? [])];
    for (const d of all) {
      const title = esc(cleanTitle(d.title));
      const href = d.path ? `../${d.path}` : '../decisions/index.html';
      const qa = d.discussion ? cite(d.discussion.url, `Q&A ${d.discussion.label}`) : '';
      const m = (d.statusPlain ?? '').match(/(partially\s+)?decided\s+(\d{4}-\d{2}-\d{2})/i);
      // Asked and decided the same day collapses to the decided line — two rows
      // an inch apart saying ask-then-answer is noise, not news.
      const sameDay = Boolean(m) && m[2] === d.date;
      if (!sameDay && /^\d{4}-\d{2}-\d{2}$/.test(d.date) && inWindow(`${d.date}T16:00:00Z`)) {
        ev(`${d.date}T16:00:00Z`, 'question', 'question',
          `A decision was put to @jwildfire: ${title}.${cite(href, 'artifact')}${qa}`);
      }
      if (m && inWindow(`${m[2]}T16:00:00Z`)) {
        ev(`${m[2]}T16:00:00Z`, 'decided', m[1] ? 'partial' : 'decided',
          `${m[1] ? 'Partially decided' : 'Decided'}: ${title}.${cite(href, 'artifact')}${qa}`);
      }
    }
  }

  if (ideaRes.ok) {
    const { open, promoted } = ideaRes.value;
    for (const i of [...open, ...promoted]) {
      if (!inWindow(i.createdAt)) continue;
      ev(i.createdAt, 'idea', 'idea', `Idea filed: ${esc(i.title)}.${cite(i.url, `#${i.number}`)}`);
    }
    for (const i of promoted) {
      if (!inWindow(i.closedAt)) continue;
      ev(i.closedAt, 'promoted', 'promoted',
        `Idea promoted to an issue: ${esc(i.title)}.${cite(i.url, `#${i.number}`)} →${cite(i.issue.url, `#${i.issue.number}`)}`);
    }
  }

  // Roadmap-audit changelog: each dated version's change lines are already
  // plain-English events. Long entries are clipped; the citation opens the full
  // file of record.
  const changelogUrl = `https://github.com/${HUB}/blob/main/site/roadmap-changelog.json`;
  for (const entry of changelog?.entries ?? []) {
    if (!inWindow(entry.date)) continue;
    for (const c of entry.changes ?? []) {
      ev(entry.date, 'audit', 'audit',
        `Roadmap audit v${esc(entry.version)}: ${esc(clip(c, 220))}${cite(changelogUrl, 'changelog')}`);
    }
  }

  // Newest first; JS sort is stable, so same-timestamp events (one audit
  // version's lines) keep their written order.
  events.sort((a, b) => b.ts.localeCompare(a.ts));

  // -------------------------------------------------------------- day groups
  const groups = [];
  for (const e of events) {
    const d = etDayOf(e.ts);
    if (!groups.length || groups[groups.length - 1].day !== d) groups.push({ day: d, events: [] });
    groups[groups.length - 1].events.push(e);
  }

  const streamItems = groups.map((g) => {
    const label = etLabelOf(g.day);
    const rows = g.events.map((e) =>
      `  <li class="w-ev" data-ts="${esc(e.ts)}"><span class="w-pill ${e.cls}">${esc(e.pill)}</span><span class="w-body">${e.html}</span></li>`);
    return [
      `  <li class="w-day" data-day="${esc(g.day)}"><span class="w-day-name" data-label="${esc(label)}">${esc(label)}</span><span class="w-day-date">${esc(g.day)}</span></li>`,
      ...rows,
    ].join('\n');
  }).join('\n');

  // ------------------------------------------------- degraded-source notices
  const missing = [];
  if (!relRes.ok) missing.push(`Releases are missing from this edition — ${relRes.notice}`);
  if (!decRes.ok) missing.push(`Decisions are missing from this edition — ${decRes.notice}`);
  if (!ideaRes.ok) missing.push(`Ideas are missing from this edition — ${ideaRes.notice}`);
  if (!searchRes.ok) missing.push(`Requirement filings and merged PRs are missing from this edition — ${searchRes.notice}`);
  const noticeHtml = missing.map((m) => `<p class="w-notice">${esc(m)}</p>`).join('\n');

  const endNotes = [];
  if (searchRes.ok && mergedTotal > mergedShown) {
    endNotes.push(`Merged-PR events show ${mergedShown} of ${mergedTotal} merges in the window (most recently updated first).`);
  }
  if (searchRes.ok && filedTotal > filedShown) {
    endNotes.push(`Requirement-filed events show ${filedShown} of ${filedTotal} in the window (newest first).`);
  }
  const endNoteHtml = endNotes.map((n) => `<p class="w-notice">${esc(n)}</p>`).join('\n');

  // --------------------------------------------------- pinned: waiting on you
  // Real counts via the same rc.mjs dedupe the roadmap page uses: an open RC PR
  // and the draft release of the same version are ONE release.
  const rcPrs = (prRes.value ?? []).filter((pr) => pr.reviewRequested?.includes(REVIEWER));
  const prKeys = new Set(rcPrs.map((pr) => releaseKey(pr.repo, pr.version)).filter(Boolean));
  const drafts = (relRes.value?.drafts ?? []).filter((d) => !prKeys.has(releaseKey(d.repo, d.version)));
  const awaiting = decRes.ok ? decRes.value.awaiting : [];

  const waitlist = [];
  for (const pr of rcPrs) {
    waitlist.push({ ts: pr.createdAt, html: `the release candidate <a href="${esc(pr.url)}">${esc(shortRepo(pr.repo))}#${pr.number}</a> — ${esc(pr.title)}` });
  }
  for (const d of drafts) {
    waitlist.push({ ts: d.createdAt, html: `the draft release <a href="${esc(d.url)}">${esc(shortRepo(d.repo))}${d.tag ? ` ${esc(d.tag)}` : ''}</a> — ${esc(d.name)}` });
  }
  for (const d of awaiting) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(d.date)) continue;
    waitlist.push({ ts: `${d.date}T16:00:00Z`, html: `the decision <a href="${d.path ? `../${esc(d.path)}` : '../decisions/index.html'}">${esc(cleanTitle(d.title))}</a>${d.discussion ? ` (answer in <a href="${esc(d.discussion.url)}">Q&amp;A ${esc(d.discussion.label)}</a>)` : ''}` });
  }
  waitlist.sort((a, b) => a.ts.localeCompare(b.ts));
  const oldest = waitlist[0] ?? null;

  const rcCount = rcPrs.length + drafts.length;
  const pinnedNotices = [];
  if (!prRes.ok) pinnedNotices.push(`Release-candidate PRs unknown — ${prRes.notice}`);
  if (!relRes.ok) pinnedNotices.push(`Draft releases unknown — ${relRes.notice}`);
  if (!decRes.ok) pinnedNotices.push(`Decisions unknown — ${decRes.notice}`);

  const countBits = [];
  if (prRes.ok || relRes.ok) countBits.push(`${rcCount} release candidate${rcCount === 1 ? '' : 's'} in the review queue`);
  if (decRes.ok) countBits.push(`${awaiting.length} decision${awaiting.length === 1 ? '' : 's'} waiting`);
  const allOk = prRes.ok && relRes.ok && decRes.ok;
  const pinnedLines = [];
  if (rcCount + awaiting.length > 0) {
    pinnedLines.push(`<p class="w-pin-line">${countBits.join(' and ')} — the full queue is on the <a href="../roadmap.html#sec-todo">roadmap's Todo</a>.</p>`);
  } else if (allOk) {
    pinnedLines.push('<p class="w-pin-line">Nothing is waiting on you right now.</p>');
  }
  if (oldest) {
    pinnedLines.push(`<p class="w-pin-line">Waiting longest: ${oldest.html}, since ${esc(day(oldest.ts))}.</p>`);
  }

  const emptyStream = events.length
    ? ''
    : '<p class="w-empty">Nothing recorded in the window — no releases, decisions, filings or merges landed in the last 7 days.</p>';

  // --------------------------------------------------------------------- page
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>The wire · obot</title>
<meta name="description" content="A reverse-chronological wire of the obot roadmap: releases, decisions, merges, requirement filings and ideas from the last 7 days, newest first — scroll until you hit something you already know.">
<link rel="stylesheet" href="../assets/styles.css">
<style>
.w-wrap { max-width: 46rem; margin: 0 auto; }
/* Masthead — a newspaper nameplate: centered serif over a double rule. */
.w-mast { text-align: center; margin: 1.4rem 0 .9rem; padding-bottom: .7rem; border-bottom: 4px double var(--ink); }
.w-kicker { margin: 0 0 .1rem; font-family: var(--mono); font-size: .68rem; letter-spacing: .18em; text-transform: uppercase; color: var(--muted); }
.w-mast h1 { margin: 0; font-size: 2.5rem; line-height: 1.05; }
.w-folio { margin: .4rem 0 0; font-family: var(--mono); font-size: .7rem; color: var(--faint); }
.w-how { margin: .55rem 0 1rem; text-align: center; font-size: .85rem; font-style: italic; color: var(--muted); }
/* Pinned above the stream: what needs him + one live session line. */
.w-pinned { border: 1px solid var(--rule); border-left: 4px solid var(--accent-bright); border-radius: 10px;
  background: var(--card); padding: .6rem .9rem .7rem; margin: 0 0 1.3rem; font-size: .85rem; line-height: 1.5; }
.w-pin-label { display: block; font-family: var(--mono); font-size: .66rem; font-weight: 600;
  letter-spacing: .14em; text-transform: uppercase; color: var(--muted); margin-bottom: .15rem; }
.w-pin-line { margin: .18rem 0; overflow-wrap: anywhere; }
.w-pin-asof { display: block; margin-top: .25rem; font-family: var(--mono); font-size: .68rem; color: var(--faint); }
.w-session-line { margin-top: .3rem; padding-top: .3rem; border-top: 1px solid var(--rule);
  font-family: var(--mono); font-size: .74rem; color: var(--muted); overflow-wrap: anywhere; }
#w-session.w-live { color: var(--good); }
#w-session.w-stale { color: var(--faint); }
/* The stream — one flat list; day headings are items so the visit marker can
   land anywhere in document order. */
ol.w-stream { list-style: none; margin: 0; padding: 0; }
li.w-day { display: flex; align-items: baseline; justify-content: space-between; gap: .6rem;
  margin: 1.35rem 0 .2rem; padding-bottom: .15rem; border-bottom: 2px solid var(--ink); }
li.w-day:first-child { margin-top: .4rem; }
.w-day-name { font-family: var(--serif); font-size: 1.25rem; }
.w-day-date { font-family: var(--mono); font-size: .68rem; color: var(--faint); white-space: nowrap; }
li.w-ev { display: grid; grid-template-columns: 5.6rem minmax(0, 1fr); gap: .55rem; align-items: baseline;
  padding: .32rem 0; border-bottom: 1px solid var(--rule); font-size: .85rem; line-height: 1.45; }
li.w-ev:hover { background: var(--panel); }
.w-body { min-width: 0; overflow-wrap: anywhere; }
.w-cite { font-family: var(--mono); font-size: .74rem; text-decoration: none; }
.w-pill { justify-self: start; display: inline-block; font: 600 .64rem/1.6 var(--mono); letter-spacing: .04em;
  text-transform: uppercase; border-radius: 999px; padding: 0 .45rem; border: 1px solid var(--rule);
  background: var(--panel); color: var(--muted); white-space: nowrap; }
.w-pill.release { background: #dcfce7; border-color: #bbf7d0; color: #166534; }
.w-pill.decided, .w-pill.promoted { background: #ede9fe; border-color: #ddd6fe; color: #5b21b6; }
.w-pill.question { background: #fee2e2; border-color: #fecaca; color: #991b1b; }
.w-pill.merged { background: #ffedd5; border-color: #fed7aa; color: #c2410c; }
.w-pill.req { background: #fef3c7; border-color: #fde68a; color: var(--warn); }
.w-pill.audit { background: #f3e8dd; border-color: #e4d2bf; color: #6b4423; }
/* The last-visit marker — a real record from this browser's localStorage. */
li.w-marker { margin: .45rem 0; padding: .28rem .4rem; border-top: 1px dashed var(--accent);
  border-bottom: 1px dashed var(--accent); text-align: center; font-family: var(--mono);
  font-size: .72rem; color: var(--accent); overflow-wrap: anywhere; }
.w-notice { margin: .3rem 0; font-family: var(--mono); font-size: .76rem; color: var(--warn); overflow-wrap: anywhere; }
.w-empty { margin: .8rem 0; color: var(--faint); font-size: .85rem; }
.w-footnote { margin: 1.3rem 0 0; padding-top: .5rem; border-top: 1px solid var(--rule);
  font-size: .78rem; color: var(--muted); }
@media (min-width: 60rem) {
  .w-mast h1 { font-size: 3rem; }
  li.w-ev { grid-template-columns: 6.2rem minmax(0, 1fr); }
}
</style>
</head>
<body>
${siteHeader({ page: 'roadmap', depth: 1 })}
${spikeBanner(meta)}
<div class="w-wrap">
<header class="w-mast">
  <p class="w-kicker">The obot roadmap, as it happened</p>
  <h1>The wire</h1>
  <p class="w-folio">The last ${WINDOW_DAYS} days · ${esc(day(windowStart.toISOString()))} → ${esc(day(NOW.toISOString()))} · newest first · compiled ${esc(fmtET(NOW))} <span id="w-age"></span></p>
</header>
<p class="w-how">Scroll until you hit something you already know — that point is caught up.</p>

<section class="w-pinned">
  <span class="w-pin-label">Waiting on you</span>
${pinnedNotices.map((n) => `  <p class="w-notice">${esc(n)}</p>`).join('\n')}
${pinnedLines.map((l) => `  ${l}`).join('\n')}
  <span class="w-pin-asof">Counts as of this edition (${esc(fmtET(NOW))}); a deploy refreshes them.</span>
  <p class="w-pin-line w-session-line">Running now: <span id="w-session">not checked — the live session feed loads with JavaScript</span></p>
</section>

${noticeHtml}
<ol class="w-stream" id="w-stream">
${streamItems}
</ol>
${emptyStream}
${endNoteHtml}
<p class="w-footnote">This page records nothing about you server-side; the visit marker, when one appears in the
stream, is a real timestamp this browser stored on your previous view and shows on this device only. A true
cross-device "since you last looked" needs the dashboard to record page views — that signal is pending
(<a href="https://github.com/${HUB}/issues/205">#205</a>).</p>
</div>

<script>
(function () {
  // No regex literals in this inline script: it is emitted through a template
  // literal, where backslash escapes are eaten (see build_roadmap_next.mjs).
  var BUILT = ${JSON.stringify(NOW.toISOString())};
  var WINDOW_START = ${JSON.stringify(windowStart.toISOString())};

  function rel(iso) {
    var ms = Date.now() - new Date(iso).getTime();
    if (!isFinite(ms) || ms < 60000) return 'just now';
    var mins = Math.floor(ms / 60000);
    if (mins < 60) return mins + 'm ago';
    var hours = Math.floor(mins / 60);
    if (hours < 48) return hours + 'h ago';
    return Math.floor(hours / 24) + 'd ago';
  }

  // Edition age next to the compiled stamp — honest about a page read long
  // after its build.
  var ageEl = document.getElementById('w-age');
  if (ageEl) ageEl.textContent = '(' + rel(BUILT) + ')';

  // Day labels: "Today"/"Yesterday" are computed at READ time, in ET, so a
  // stale page shows only its absolute dates rather than a wrong "Today".
  try {
    var dayFmt = new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit' });
    var todayEt = dayFmt.format(new Date());
    var yesterdayEt = dayFmt.format(new Date(Date.now() - 86400000));
    Array.prototype.forEach.call(document.querySelectorAll('.w-day'), function (el) {
      var name = el.querySelector('.w-day-name');
      if (!name) return;
      var d = el.getAttribute('data-day');
      if (d === todayEt) name.textContent = 'Today · ' + name.getAttribute('data-label');
      else if (d === yesterdayEt) name.textContent = 'Yesterday · ' + name.getAttribute('data-label');
    });
  } catch (e) { /* absolute labels stand */ }

  // Last-visit marker — the one personal signal, and it is a real record: a
  // timestamp this browser stored on a previous view. First visit stores and
  // shows nothing.
  try {
    var KEY = 'obot-wire-last-visit';
    var prev = localStorage.getItem(KEY);
    var stream = document.getElementById('w-stream');
    if (prev && stream) {
      var prevTs = new Date(prev);
      if (!isNaN(prevTs.getTime())) {
        var marker = document.createElement('li');
        marker.className = 'w-marker';
        if (prevTs < new Date(WINDOW_START)) {
          marker.textContent = '— your last visit, this browser (' + rel(prev) + '), was before this window —';
          stream.appendChild(marker);
        } else {
          marker.textContent = '— your last visit, this browser · ' + rel(prev) + ' —';
          var rows = Array.prototype.slice.call(stream.querySelectorAll('.w-ev'));
          var anchor = null;
          for (var i = 0; i < rows.length; i++) {
            var ts = new Date(rows[i].getAttribute('data-ts'));
            if (!isNaN(ts.getTime()) && ts <= prevTs) { anchor = rows[i]; break; }
          }
          if (anchor) stream.insertBefore(marker, anchor);
          else stream.appendChild(marker);
        }
      }
    }
    localStorage.setItem(KEY, new Date().toISOString());
  } catch (e) { /* storage unavailable — no marker, nothing implied */ }

  // Session feed — published by the heartbeat to a branch, cached ~5 min by the
  // raw CDN. Render its age; past 120 minutes stop asserting a live state.
  var sess = document.getElementById('w-session');
  if (sess) {
    sess.textContent = 'checking the session feed…';
    var STALE_MINUTES = 120;
    fetch(${JSON.stringify(SESSION_STATE_URL)}, { cache: 'no-store' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (s) {
        if (!s || !s.state) { sess.textContent = 'session feed has published nothing'; return; }
        var mins = s.updatedAt ? Math.floor((Date.now() - new Date(s.updatedAt)) / 60000) : null;
        var stale = mins === null || mins > STALE_MINUTES;
        var idle = s.state === 'idle' || s.state === 'done';
        var when = mins === null ? 'age unknown'
          : mins < 1 ? 'just now'
          : mins < 60 ? mins + 'm ago'
          : Math.floor(mins / 60) + 'h ago';
        if (stale) {
          sess.className = 'w-stale';
          sess.textContent = 'feed last updated ' + when + ' — not asserting a live state';
          return;
        }
        var agents = '';
        if (s.agents && typeof s.agents.working === 'number' && typeof s.agents.total === 'number') {
          agents = ' · ' + s.agents.working + ' of ' + s.agents.total + ' agents working';
        }
        sess.className = idle ? '' : 'w-live';
        sess.textContent = (idle ? '○ ' : '● ') + (s.name || 'obot') + ' — ' + (s.detail || s.state) + agents + ' · ' + when;
      })
      .catch(function () { sess.textContent = 'session feed unreachable from this page'; });
  }
})();
</script>

<footer class="site">Generated ${esc(fmtET(NOW))} · built by
<a href="https://github.com/${HUB}/blob/main/scripts/build_spike.mjs"><code>build_spike.mjs</code></a>
for <a href="https://github.com/${HUB}/issues/204">task #204</a> · Worker: W0004.2</footer>
</body>
</html>
`;
}
