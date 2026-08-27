// The queue — the roadmap page's front door, at roadmap.html (D0018, #211).
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
// catalog makes (lib/highlights.mjs thresholds, lib/rc.mjs release dedupe) — so
// this page differs in shape, never in what counts as waiting.
//
// It gives up the inventory on purpose: nothing here lets you browse everything
// that exists, and the catalog keeps that job one click away. The count in the
// headline is the number of things waiting on him and nothing else — the
// hierarchy line below the list links to work he may want to review, and is
// deliberately counted nowhere (🧭🤖 obot-navigator, 2026-08-16), because a
// headline that counts two kinds of thing stops meaning one thing.
//
// Grew out of the design spike's queue direction (#202/#204, worker W0004.1),
// which @jwildfire chose on 2026-08-16: "i'm good with your rec  build".
import { esc, age, fmtET, clip, daysAgo } from '../lib/gh.mjs';
import { siteHeader } from '../lib/nav.mjs';
import { releaseKey, browserReleaseKeySource } from '../lib/rc.mjs';
import { T } from '../lib/highlights.mjs';
import { nowStripHtml, nowStripStyle, nowStripScript } from './nowstrip.mjs';
import { readConfigCount, CONFIG_COUNT_STALE_DAYS } from '../lib/public-channel.mjs';

const REVIEWER = 'jwildfire';
const PROJECT_URL = 'https://github.com/users/jwildfire/projects/1';

export const meta = { slug: 'queue', out: 'roadmap.html' };

const short = (nameWithOwner) => (nameWithOwner || '').split('/')[1] ?? nameWithOwner;

// ------------------------------------------------------------- queue membership
// Every rule below is the house rule, stated where the catalog states it: RC
// dedupe from lib/rc.mjs, thresholds from lib/highlights.mjs. An item is
// {type, since (ISO or null), prefix (the age verb), title, why (HTML),
//  act {label, href}, cite {label, href}, attrs (extra data- attributes)}.
// Exported for the briefing (obot.roadmap#247), which is a second VIEW of this
// same list rather than a second computation of it. Two inboxes that disagree
// would be worse than one, so the briefing cuts what it shows and never
// changes what counts as waiting.
export function buildItems({ NOW, reqRes, prRes, relRes, ideaRes, decRes }) {
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
    const artifact = d.path ?? 'reports/decisions/';
    // statusPlain is plain now — links flattened and emphasis removed at the
    // source in collect/decisions.mjs, which is where the other three readers
    // of this field were getting the markup raw.
    const status = clip((d.statusPlain || '').trim(), 110);
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
      why.push(req.onBoard
        ? 'It sits on the board with no stage at all, so it appears in no lane until you place it.'
        : 'It is not on the board, so it appears in no lane until you add it.');
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

  // The board block, as one card rather than one per requirement (#254). Every
  // requirement filed while nothing can write to the board is off it, so a card
  // each would grow a queue entry a day for a single cause — and the thing that
  // actually needs him is the cause. He is also the only one who can act on it:
  // the board is his, and his own credential is the one the guard denies.
  const boardBlocked = (reqRes.value ?? []).filter((r) => r.state === 'OPEN' && r.blocked);
  if (boardBlocked.length) {
    const oldest = boardBlocked.reduce((a, b) => (a.createdAt <= b.createdAt ? a : b));
    const cite = boardBlocked[0].blocked;
    items.push({
      type: 'unstick',
      since: oldest.createdAt,
      prefix: 'stranded',
      title: `${boardBlocked.length} requirement${boardBlocked.length > 1 ? 's are' : ' is'} off the board, and no agent can put ${boardBlocked.length > 1 ? 'them' : 'it'} there`,
      why: `The obotclaw App is refused on a user-owned project and the guard denies your own token, so board writes are impossible for everyone but you. Until that is settled the stage lanes are missing this work, and the count grows with every requirement filed.`,
      act: { label: 'Decide how board writes happen', href: cite.url },
      cite: { label: `#${cite.issue}`, href: cite.url },
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

// ---------------------------------------------------------- the review lane line
// The hierarchy's Current-versus-Proposed lane lives on the catalog, where it
// edits the tree it sits beside. Losing the front door cost it discoverability,
// so the queue names it — as a link, never as a card and never in the count.
// "Pending" mirrors buildForest's effective-parent rule exactly: an edge whose
// child already has a recorded parent has been applied and is not a diff.
function reviewLaneLine(hierRes, proposal) {
  if (!hierRes?.ok) return '';
  const issues = hierRes.value.issues;
  const pending = (proposal?.links ?? []).filter((l) => {
    const child = issues.get(l.child);
    if (!child) return false; // closed, or outside the tracked portfolio
    return !(child.parentKey && issues.has(child.parentKey));
  }).length;
  const flags = (proposal?.flags ?? []).length;
  if (!pending && !flags) return '';
  const bits = [];
  if (pending) bits.push(`${pending} proposed structure change${pending === 1 ? '' : 's'}`);
  if (flags) bits.push(`${flags} cleanup flag${flags === 1 ? '' : 's'}`);
  return `<p class="q-lane">${bits.join(' and ')} sit in the hierarchy review lane on the
  <a href="catalog.html#hierarchy-proposed">catalog</a>. Not counted above: reviewing the roadmap's own
  structure is work you may want, not work that is blocked on you.</p>`;
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
  return `Last ${T.pulseDays} days: ${parts.join(' · ')}. Every event, dated and cited, is on the <a href="wire.html">wire</a>.`;
}

// ------------------------------------------------------------------------- page
/**
 * The config bucket, as a count and never as items (#203, BL4).
 *
 * The third of his three buckets — release candidates, decisions, config — and
 * the only one this site cannot show. Each config item names exactly which
 * control stops an agent from acting, so the list is a map of the locks and it
 * lives in a workspace-local file outside every repo; the number reaches this
 * page through data/config-count.json, which carries two integers and a date and
 * is refused by lib/public-channel.mjs if it ever carries anything else.
 *
 * The omission is stated rather than hidden. A bucket that silently vanished from
 * one of the two surfaces would break the spine the surfaces share, and a reader
 * comparing them would be left to guess whether there were no config items or no
 * config section — which are opposite facts.
 */
function configStrip(count) {
  const dash = 'the <a href="https://github.com/jwildfire/obot.roadmap/issues/180">Operations Dashboard</a>';
  if (!count.ok) {
    return `Config items are cleared on ${dash}, on his own machine. No count has reached this page — `
      + `${esc(count.why)}, so this page is not saying there are none.`;
  }
  const n = count.open;
  const crit = count.critical ? ` ${count.critical} of them critical.` : '';
  const when = count.stale
    ? ` Counted ${esc(fmtET(new Date(count.asOf)))}, which is more than ${CONFIG_COUNT_STALE_DAYS} days ago — treat it as the last reading, not as now.`
    : '';
  // Second person, like every other line on this page: its h1 is "Waiting on you".
  return `<b>${n}</b> item${n === 1 ? '' : 's'} need${n === 1 ? 's' : ''} your keyboard.${crit}${when} `
    + `What each one is stays off this site by design — every entry names a control that stops an agent, `
    + `so the text never leaves your machine and only the number crosses. You clear them on ${dash}.`;
}

export async function render(data) {
  const configCount = readConfigCount({ now: data.NOW });
  const { NOW, reqRes, prRes, relRes, ideaRes, decRes, hierRes, proposal, HUB, lightsRes } = data;
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
    <p>No reviews, no open decisions, no un-triaged ideas, no stalled work, no release calls. The strip above still says what is running, and the catalog still holds everything that exists.</p>`
    : `<p class="q-zero">Nothing readable is waiting.</p>
    <p>Some sources failed on this build (see the notes above), so the queue may be incomplete rather than clear.</p>`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Queue · obot</title>
<meta name="description" content="Everything that cannot proceed without @jwildfire, ranked by wait — release reviews, decisions, idea triage, stalled work and release calls, on live data.">
<link rel="stylesheet" href="assets/styles.css">
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

/* The review lane pointer — a link, never a card, and counted nowhere. */
.q-lane { margin: 1rem 0 0; padding: .5rem .8rem .55rem; border: 1px dashed var(--rule);
  border-radius: 10px; font-size: .82rem; color: var(--muted); overflow-wrap: anywhere; }

/* The other two questions, answered small. */
.q-strips { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 17rem), 1fr)); gap: .8rem; margin: 1.2rem 0 0; }
.q-strip { border: 1px solid var(--rule); border-radius: 10px; background: var(--panel); padding: .6rem .85rem .7rem; min-width: 0; }
.q-strip h2 { font: 600 .68rem/1.5 var(--mono); letter-spacing: .12em; text-transform: uppercase; color: var(--muted); margin: 0 0 .3rem; }
.q-strip p { margin: 0; font-size: .84rem; overflow-wrap: anywhere; }

${nowStripStyle()}
</style>
</head>
<body>
${siteHeader({ page: 'queue' })}
<main class="q-wrap">
${nowStripHtml({ lightsRes, NOW })}
<header class="q-head">
  <h1>Waiting on you</h1>
  <p class="q-sum"><span id="q-count">${countTxt}</span><span id="q-longest">${longestTxt}</span></p>
  <p class="q-note">Longest wait first. Review items re-check GitHub on every page load; everything else is as of ${fmtET(NOW)}. Ages measure each item's last recorded activity. The same queue cut to ten lines for a phone is the <a href="reports/briefing/">briefing</a>.</p>
${notices.map((t) => `  <p class="q-notice">${esc(t)}</p>`).join('\n')}
</header>

<div class="q-empty" id="q-empty"${n ? ' hidden' : ''}>
  ${emptyHero}
</div>

<ol class="q-list" id="q-list" aria-label="Items waiting on @jwildfire, longest wait first">
${items.map((item) => card(item, NOW)).join('\n')}
</ol>

${reviewLaneLine(hierRes, proposal)}

<div class="q-strips">
  <section class="q-strip">
    <h2>Config</h2>
    <p>${configStrip(configCount)}</p>
  </section>
  <section class="q-strip">
    <h2>Recent</h2>
    <p>${recentStrip(data)}</p>
  </section>
  <section class="q-strip">
    <h2>Everything else</h2>
    <p>Goals, the requirement hierarchy, every open PR, unreleased work and the ideas queue are on the
    <a href="catalog.html">catalog</a> — the complete record, filterable by view and repo.</p>
  </section>
</div>
</main>

<script>
(function () {
  // ---- Fragment forwarder. This page used to be the inventory, and published
  // links point into sections that now live on the catalog: README links
  // #sec-audit and the 2026-07-27 diary links #hierarchy-proposed. Those land
  // here, on a real page with no such section, where nothing looks broken — so
  // the anchor is forwarded with the fragment intact rather than swallowed.
  // #sec-todo is deliberately absent: the queue IS the Todo section.
  var FORWARD = {
    'sec-requirements': 'catalog.html', 'sec-hierarchy': 'catalog.html',
    'hierarchy-proposed': 'catalog.html', 'sec-goals': 'catalog.html',
    'sec-prs': 'catalog.html', 'sec-upcoming': 'catalog.html',
    'sec-ideas': 'catalog.html', 'sec-releases': 'catalog.html',
    'sec-audit': 'catalog.html',
    // The four view deep-links (lib/highlights.mjs) — a shared URL for a
    // particular reading of the inventory.
    live: 'catalog.html', attention: 'catalog.html', pulse: 'catalog.html', all: 'catalog.html',
    // Pre-existing rot: Cost moved to the analytics page long before this
    // rebuild, and diary/2026-07-25.md still points at the old anchor.
    'sec-usage': 'analytics/index.html'
  };
  var frag = (location.hash || '').replace('#', '');
  if (frag && Object.prototype.hasOwnProperty.call(FORWARD, frag)) {
    // replace(), not assign(): a forwarded link must not put a dead anchor in
    // the back-button history.
    location.replace(FORWARD[frag] + '#' + frag);
    return;
  }

${nowStripScript()}

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
  // lib/rc.mjs's rule, emitted from lib/rc.mjs rather than retyped (hub#209).
${browserReleaseKeySource()}
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

<footer class="site">Generated ${fmtET(NOW)} · regenerates via <code>deploy-site.yml</code> ·
built by <a href="https://github.com/${HUB}/blob/main/scripts/roadmap/queue.mjs"><code>roadmap/queue.mjs</code></a>
for <a href="https://github.com/${HUB}/issues/211">requirement #211</a>.</footer>
</body>
</html>
`;

  const byType = items.reduce((acc, i) => { acc[i.type] = (acc[i.type] ?? 0) + 1; return acc; }, {});
  console.log(
    `queue: ${n} waiting (${Object.entries(byType).map(([k, v]) => `${v} ${k}`).join(', ') || 'none'})` +
    (n && items[0].since ? ` · longest ${age(items[0].since, NOW)}` : ''),
  );
  return html;
}
