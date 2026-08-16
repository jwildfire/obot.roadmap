// Shared constants and the one shared component of the design spike (#202/#204).
//
// Deliberately minimal: the spike's value is three directions that differ in
// structure, so the only markup they share is the banner that labels a page as a
// spike direction — meta-chrome, not design. Everything below the banner belongs
// to the direction module alone.
import { esc } from '../lib/gh.mjs';

export const DIRECTIONS = ['queue', 'wire', 'board'];

// The decision artifact the spike feeds, relative to a page at depth 1.
export const ARTIFACT_HREF = '../reports/decisions/2026-08-16-roadmap-page-directions/';

// Heartbeat-published session state (same feed roadmap.html reads): a small JSON
// on the session-state branch, fetched client-side so it is fresher than the
// last deploy. Shape: { state, name, detail, agents: { total, working,
// needsInput }, updatedAt }. Raw CDN caches ~5 minutes; render its age, and stop
// asserting a live state when the reading is stale.
export const SESSION_STATE_URL =
  'https://raw.githubusercontent.com/jwildfire/obot.roadmap/session-state/session.json';

/**
 * The spike banner every direction page carries at the top, directly under the
 * site header. Identical across directions on purpose: a shared URL has to
 * explain itself, and the trade-off line is the direction's contract with the
 * reader. `spike-banner` is asserted by the deploy's validate step.
 */
export function spikeBanner(meta) {
  return `<div class="spike-banner" style="margin:10px auto 0;max-width:46rem;border:1px solid var(--rule);border-left:4px solid var(--accent,#d07a2d);border-radius:6px;background:var(--panel);padding:10px 14px;font-size:.85rem;line-height:1.45">
  <span style="font-family:var(--mono);font-size:.7rem;letter-spacing:.12em;text-transform:uppercase;color:var(--muted)">Design spike · one of three directions</span><br>
  <strong>${esc(meta.name)}</strong> puts ${esc(meta.putsFirst)} first · gives up: ${esc(meta.givesUp)}
  <br><a href="index.html">All directions</a> · <a href="${ARTIFACT_HREF}">the decision artifact</a> · <a href="../roadmap.html">the current page</a>
</div>`;
}
