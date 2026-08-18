// The NOW strip — "what is running right now", on whichever page he lands on.
//
// D0018 (2026-08-16) kept the board's NOW panel and retired the board: its
// content is one strip's worth, and a fourth page competing with the queue and
// the wire is exactly what the decision refused. So the panel is absorbed here
// and carried by the two front-door pages — the queue and the wire. The catalog
// keeps the small session pill it already had in its filter bar; the strip does
// not spread further than that (@jwildfire via 🧭🤖 obot-navigator, 2026-08-16).
//
// Two sources, and they are honest about being different ages:
//
//   the session feed   published by the session heartbeat to the session-state
//                      branch, fetched client-side so it is fresher than the
//                      deploy. The raw CDN caches for about five minutes.
//   the repo lights    last commit per default branch, one batched GraphQL query
//                      at build time, stamped "as of deploy" rather than dressed
//                      up as live.
//
// Staleness is a first-class state, not an edge case. Past STALE_MINUTES the
// strip stops asserting what is running and says how old the reading is: a
// confident "6 working" from a feed that died in the night is worse than
// silence, because it tells him not to look.
import { esc, age, fmtET, graphql } from '../lib/gh.mjs';
import { sessionStateValidatorScript } from '../lib/public-channel.mjs';

export const STALE_MINUTES = 120; // matches the catalog's session pill

// Heartbeat-published session state. Shape: { state, name, detail,
// agents: { total, working, needsInput }, updatedAt }.
export const SESSION_STATE_URL =
  'https://raw.githubusercontent.com/jwildfire/obot.roadmap/session-state/session.json';

const shortRepo = (nameWithOwner) => String(nameWithOwner).split('/')[1] ?? nameWithOwner;

/**
 * Last-commit age per portfolio repo — one batched GraphQL query using the
 * aliased-connection idiom the PR collector uses. One unreadable repo drops its
 * own light rather than the whole row.
 */
export async function collectRepoLights(REPOS) {
  const query = `query {
${REPOS.map((r) => `  ${r.alias}: repository(owner: "${r.owner}", name: "${r.name}") { nameWithOwner defaultBranchRef { name target { ... on Commit { committedDate } } } }`).join('\n')}
}`;
  const data = await graphql(query);
  const lights = [];
  for (const r of REPOS) {
    const node = data?.[r.alias];
    if (!node) continue;
    lights.push({
      repo: node.nameWithOwner,
      branch: node.defaultBranchRef?.name ?? null,
      committedDate: node.defaultBranchRef?.target?.committedDate ?? null,
    });
  }
  return lights.sort((a, b) => (b.committedDate || '').localeCompare(a.committedDate || ''));
}

function lightsHtml(lightsRes, NOW) {
  if (!lightsRes?.ok) {
    return `<p class="ns-notice">${esc(lightsRes?.notice ?? 'Repo activity unavailable on this build.')}</p>`;
  }
  const items = lightsRes.value.map((l) => {
    if (!l.committedDate) {
      return `    <span class="ns-light off"><i class="ns-dot"></i>${esc(shortRepo(l.repo))}<em>—</em></span>`;
    }
    const days = (NOW - new Date(l.committedDate)) / 86400000;
    const cls = days <= 1 ? 'hot' : days <= 7 ? 'warm' : 'dim';
    const title = `${l.repo} — last commit on ${l.branch ?? 'the default branch'} ${age(l.committedDate, NOW)} ago`;
    return `    <a class="ns-light ${cls}" href="https://github.com/${esc(l.repo)}" title="${esc(title)}"><i class="ns-dot"></i>${esc(shortRepo(l.repo))}<em>${age(l.committedDate, NOW)}</em></a>`;
  });
  return `  <div class="ns-lights">\n${items.join('\n')}\n  </div>`;
}

/** The strip's CSS. Pages inline it; there is one copy of it, here. */
export function nowStripStyle() {
  return `/* NOW strip — what is running, on whichever page he lands on (D0018). */
.ns { border: 1px solid var(--rule); border-left: 4px solid var(--accent-bright); border-radius: 10px;
  background: var(--panel); padding: .5rem .8rem .55rem; margin: 1rem 0 0; min-width: 0; }
.ns-head { display: flex; align-items: baseline; gap: .5rem; flex-wrap: wrap; }
.ns-label { font: 600 .64rem/1.6 var(--mono); letter-spacing: .14em; text-transform: uppercase; color: var(--muted); }
.ns-live { font-family: var(--mono); font-size: .78rem; color: var(--muted); overflow-wrap: anywhere; min-width: 0; }
.ns-live.live { color: var(--good); }
.ns-live.stale { color: var(--faint); font-style: italic; }
.ns-notice { margin: .3rem 0 0; font-family: var(--mono); font-size: .72rem; color: var(--warn); overflow-wrap: anywhere; }
.ns-lights { display: flex; flex-wrap: wrap; gap: .25rem .45rem; margin: .4rem 0 0; }
.ns-light { display: inline-flex; align-items: baseline; gap: .25rem; font-family: var(--mono); font-size: .68rem;
  color: var(--muted); text-decoration: none; border: 1px solid var(--rule); border-radius: 999px;
  padding: .05rem .45rem; background: var(--card); white-space: nowrap; }
.ns-light:hover { border-color: var(--accent-bright); color: var(--accent); text-decoration: none; }
.ns-light em { font-style: normal; color: var(--faint); }
.ns-dot { width: .45rem; height: .45rem; border-radius: 50%; background: var(--faint); flex: none; }
.ns-light.hot .ns-dot { background: var(--accent-bright); }
.ns-light.warm .ns-dot { background: #fdba74; }
.ns-light.dim .ns-dot { background: var(--rule); }
.ns-light.off { opacity: .6; }
.ns-stamp { margin: .35rem 0 0; font-family: var(--mono); font-size: .66rem; color: var(--faint); overflow-wrap: anywhere; }`;
}

/**
 * The strip's markup.
 *
 * @param lightsRes  settle() result from collectRepoLights
 * @param NOW        the build clock
 */
export function nowStripHtml({ lightsRes, NOW }) {
  return `<section class="ns" aria-label="Running now">
  <p class="ns-head"><span class="ns-label">Now</span><span class="ns-live" id="ns-live">Session feed not read — this readout needs JavaScript.</span></p>
${lightsHtml(lightsRes, NOW)}
  <p class="ns-stamp">Session feed rechecks every 60 seconds in this tab; repo lights are last-commit ages as of the ${esc(fmtET(NOW))} deploy.</p>
</section>`;
}

/**
 * The strip's browser script. Emitted into a page's own inline script, so it is
 * a bare statement list rather than an IIFE, and it declares nothing that could
 * collide with a host page (every name is ns-prefixed).
 */
export function nowStripScript() {
  return `  // ---- NOW strip: the heartbeat-published session state, refetched every 60s.
  // Every value lands via textContent — the feed is remote input.
  //
  // And it is validated before any of it is read (#203). The feed's producer is
  // careful today and says so in its own source: sessionState() in obot.agent is
  // "deliberately aggregate-only" because "the hub site is public, and
  // agent-authored detail strings are free text". That comment is correct — and it
  // was the only thing standing between an agent's words and this public page,
  // because this reader used to render s.name and s.detail verbatim. The safety of
  // a public page cannot rest on a comment in another repository, so the payload's
  // free-text fields are now dropped here and the sentence below is composed from
  // the numbers that survive.
${sessionStateValidatorScript()}
  var nsLive = document.getElementById('ns-live');
  if (nsLive) {
    var nsStale = ${STALE_MINUTES};
    var nsAgo = function (mins) {
      if (mins === null) return 'age unknown';
      if (mins < 1) return 'just now';
      if (mins < 60) return mins + 'm ago';
      if (mins < 1440) return Math.floor(mins / 60) + 'h ago';
      return Math.floor(mins / 1440) + 'd ago';
    };
    var nsRender = function (raw) {
      var s = nsClean(raw);
      if (!s || !s.state) {
        nsLive.className = 'ns-live stale';
        nsLive.textContent = 'No session state is published right now.';
        return;
      }
      var mins = s.updatedAt ? Math.floor((Date.now() - new Date(s.updatedAt)) / 60000) : null;
      if (mins === null || isNaN(mins) || mins > nsStale) {
        // Confident numbers from a dead feed are worse than an honest silence.
        nsLive.className = 'ns-live stale';
        nsLive.textContent = 'Session feed last updated ' + nsAgo(mins) + ' — too old to say what is running.';
        return;
      }
      var working = s.working;
      var idle = s.state === 'idle' || s.state === 'done' || working === 0;
      var bits = [];
      if (working !== null) {
        bits.push(working + (s.total !== null ? ' of ' + s.total : '') + (working === 1 ? ' agent working' : ' agents working'));
      }
      if (s.needsInput !== null && s.needsInput > 0) bits.push(s.needsInput + ' waiting on input');
      // The session's own words used to go here. Now the page says which session by
      // its date slug and what state it is in, both of which are closed shapes.
      bits.push('obot session' + (s.slug ? ' ' + s.slug : '') + ' — ' + s.state);
      nsLive.className = 'ns-live ' + (idle ? '' : 'live');
      nsLive.textContent = (idle ? '○ ' : '● ') + bits.join(' · ') + ' · ' + nsAgo(mins);
    };
    var nsPoll = function () {
      fetch(${JSON.stringify(SESSION_STATE_URL)}, { cache: 'no-store' })
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(nsRender)
        .catch(function () {
          nsLive.className = 'ns-live stale';
          nsLive.textContent = 'The session feed could not be read on this page load.';
        });
    };
    nsLive.textContent = 'Reading the session feed…';
    nsPoll();
    setInterval(nsPoll, 60000);
  }`;
}
