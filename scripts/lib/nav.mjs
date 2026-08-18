// The site header and nav — one definition, used by every page.
//
// It used to be seven: five generators plus two static pages each carried their
// own copy, and they had drifted apart. Audit appeared in two navs of seven,
// Goals in one, Status in six, and the audit page had no GitHub link at all —
// so which pages existed depended on which page you were standing on.
//
// Shape (@jwildfire, 2026-07-25): one top row, and a second row that appears
// only on the pages inside the roadmap group.
//
//   🍊😺 obot    Home   Roadmap   News   ⌗
//               Queue · Wire · Catalog · Audit · Analytics · Status · Decisions
//
// The first three are the roadmap page set as D0018 settled it (2026-08-16):
// the Queue is the front door and keeps `roadmap.html`, the Wire is one click
// behind it, and the Catalog is the inventory page that used to be the front
// door. They lead the row in that order because the order is the argument —
// what needs you, then what changed, then what exists.
//
// The brand is the "obot" link, so there is no separate nav entry for it.
//
// Adding a page means adding one row to TOP or SUB here. Nothing else in the
// site defines nav, and the deploy asserts every page carries this markup.
//
// The version stamp sits at the end of the top row, on every page, for the same
// reason the nav itself is defined once. It used to be passed in as `extra` by a
// single generator, so it appeared on catalog.html and on none of the other ten
// published pages — including roadmap.html, which D0018 made the front door the
// day before @jwildfire asked for it. A badge only the least-visited page carries
// is a badge he was right to say was missing.
import { HUB } from './repos.mjs';
import { getVersionState, versionBadge, VERSION_BADGE_SCRIPT } from './version.mjs';

const GITHUB_ICON =
  '<svg viewBox="0 0 16 16" width="18" height="18" fill="currentColor" aria-hidden="true">' +
  '<title>GitHub</title><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/></svg>';

// Top row. Every href is root-relative and gets the caller's depth prefix.
const TOP = [
  { key: 'home', label: 'Home', href: 'index.html' },
  { key: 'roadmap', label: 'Roadmap', href: 'roadmap.html' },
  { key: 'news', label: 'News', href: 'news.html' },
];

// The roadmap group's second row. Membership here is what makes a page show the
// sub-nav and light up 'Roadmap' above it.
//
// THE SHARED SPINE (#203). The first four are the same four entities, in the same
// order, as the Operations Dashboard's tab strip — so a reader who knows one
// surface can navigate the other without being told. They answer the three
// questions every surface built for his absence has to answer, and then point at
// the record:
//
//   Queue    what needs you
//   Wire     what changed
//   Agents   what is running
//   Catalog  the record
//
// `spine: true` is what marks them, and the rule they carry is that neither
// surface gets an entity the other lacks a place for. Where a surface renders one
// as a summary rather than a page, the entry points at the summary rather than
// being dropped: Agents here is the NOW strip on the queue page, because the fleet
// itself is a local surface and this site is a record.
//
// Everything after the divider is this surface's own, and sits after the spine
// rather than inside it — an extra page must never come between two spine entries,
// or the order stops carrying meaning across the two surfaces.
const SUB = [
  { key: 'queue', label: 'Queue', href: 'roadmap.html', spine: true, blurb: 'What needs you — release candidates, then decisions, longest wait first' },
  { key: 'wire', label: 'Wire', href: 'wire.html', spine: true, blurb: 'What changed — the last 7 days, newest first' },
  { key: 'agents', label: 'Agents', href: 'roadmap.html#now', spine: true, blurb: 'What is running — counts only here; the fleet itself is on the local dashboard' },
  { key: 'catalog', label: 'Catalog', href: 'catalog.html', spine: true, blurb: 'The complete record — goals, requirements, hierarchy, PRs, releases, ideas' },
  { key: 'audit', label: 'Audit', href: 'audit/index.html', blurb: 'Convention findings from the nightly audit' },
  { key: 'analytics', label: 'Analytics', href: 'analytics/index.html', blurb: 'Charts — token and dollar cost' },
  { key: 'status', label: 'Status', href: 'status.html', blurb: 'Per-repo releases, milestones, PR activity' },
  { key: 'decisions', label: 'Decisions', href: 'decisions/index.html', blurb: 'Every call @jwildfire has made, newest first' },
];

/** The spine, in order — exported so both surfaces can be asserted against it. */
export const SPINE = SUB.filter((s) => s.spine).map((s) => s.label);

export const SUB_KEYS = SUB.map((s) => s.key);

/** True for any page inside the roadmap group, including the group itself. */
const inRoadmap = (page) => page === 'roadmap' || SUB_KEYS.includes(page);

function link({ href, label, blurb }, { current, prefix }) {
  const attrs = current ? ' class="current" aria-current="page"' : '';
  const title = blurb ? ` title="${blurb}"` : '';
  return `<a href="${prefix}${href}"${attrs}${title}>${label}</a>`;
}

/**
 * Render the whole `<header class="site">` block.
 *
 * @param page   which page this is: 'home' | 'news' | a SUB key | 'roadmap'
 *               ('roadmap' for pages in the group with no row of their own,
 *               e.g. the per-goal pages — the group lights up, no sub-item does)
 * @param depth  how many directories deep the page sits, for the `../` prefix
 * @param extra  markup appended inside the top nav, after the version stamp
 */
export function siteHeader({ page, depth = 0, extra = '' } = {}) {
  const prefix = '../'.repeat(depth);
  const top = TOP.map((item) =>
    link(item, { current: item.key === page || (item.key === 'roadmap' && inRoadmap(page)), prefix })).join('\n    ');

  // The sub-row is rendered only inside the group. On other pages it would be
  // four links to somewhere else wearing the current page's chrome.
  // The divider after the last spine entry is not decoration: it is where this
  // surface's own pages begin, and it is what lets the four shared names be read
  // as one group rather than as the first four of eight (#203).
  const subLinks = SUB.map((item, i) => {
    const rendered = link(item, { current: item.key === page, prefix });
    const lastOfSpine = item.spine && !SUB[i + 1]?.spine;
    return lastOfSpine ? `${rendered}\n    <span class="sub-div" aria-hidden="true">·</span>` : rendered;
  });
  const sub = inRoadmap(page)
    ? `\n  <nav class="site sub" aria-label="Roadmap sections">
    ${subLinks.join('\n    ')}
  </nav>`
    : '';

  // The badge wraps with the nav links; the panel hangs off the header itself so it
  // can be positioned against the header's own padding rather than off the badge,
  // which is what keeps it inside a 390px viewport. See lib/version.mjs.
  const { badge, panel } = versionBadge(getVersionState(), { depth, hubUrl: `https://github.com/${HUB}` });

  return `<header class="site">
  <a class="brand" href="${prefix}index.html">🍊😺 obot</a>
  <nav class="site" aria-label="Site">
    ${top}
    <a href="https://github.com/${HUB}" aria-label="GitHub" title="GitHub" style="display:inline-flex;align-items:center">${GITHUB_ICON}</a>
    ${badge}${extra ? `\n    ${extra}` : ''}
  </nav>
  ${panel}${sub}
</header>
<script>${VERSION_BADGE_SCRIPT}</script>`;
}
