// The site header and nav — one definition, used by every page.
//
// It used to be seven: five generators plus two static pages each carried their
// own copy, and they had drifted apart. Audit appeared in two navs of seven,
// Goals in one, Status in six, and the audit page had no GitHub link at all —
// so which pages existed depended on which page you were standing on.
//
// Shape (@jwildfire, 2026-09-12): one row, four pages, the ones he reads.
//
//   🍊😺 obot    Home   Tracker   Analytics   News   ⌗
//
// The second row that carried the roadmap group (Queue · Wire · Catalog ·
// Analytics · Status · Decisions, the shared spine with the retired operations
// dashboard) came down the same day: he uses the analytics page and the news
// feed, everything else in that row is noise, and the tracker replaces the
// project board the queue and the catalog were standing in for. Those pages
// still build at their URLs and the homepage lists them under Other pages until
// their retirement is approved; a page with no row here carries the header
// with nothing lit.
//
// The brand is the "obot" link, so there is no separate nav entry for it.
//
// Adding a page means adding one row to TOP here. Nothing else in the site
// defines nav, and the deploy asserts every page carries this markup.
//
// The version stamp sits at the end of the row, on every page, for the same
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

// The row. Every href is root-relative and gets the caller's depth prefix.
export const TOP = [
  { key: 'home', label: 'Home', href: 'index.html', blurb: 'The portfolio, and where everything else is' },
  { key: 'tracker', label: 'Tracker', href: 'tracker.html', blurb: 'Objectives → requirements → tasks, with status, search and filters' },
  { key: 'analytics', label: 'Analytics', href: 'analytics/index.html', blurb: 'Charts — token and dollar cost' },
  { key: 'news', label: 'News', href: 'news.html', blurb: 'What moved — issue transitions, artifacts, releases' },
];

export const TOP_KEYS = TOP.map((s) => s.key);

// The pages that lost their nav row on 2026-09-12 and still build. The homepage
// lists them, so a bookmark or a published link keeps a way in from the site.
export const OTHER = [
  { label: 'Queue', href: 'roadmap.html', blurb: 'what was waiting on @jwildfire — release candidates and decisions' },
  { label: 'Wire', href: 'wire.html', blurb: 'the last seven days, newest first' },
  { label: 'Catalog', href: 'catalog.html', blurb: 'the inventory page the tracker replaces — requirements, PRs, releases, hierarchy' },
  { label: 'Objectives', href: 'goals/index.html', blurb: 'one page per objective, its direction and members' },
  { label: 'Decisions', href: 'decisions/index.html', blurb: 'every call recorded in a decision artifact' },
  { label: 'Status', href: 'status.html', blurb: 'the per-repo package dashboard' },
  { label: 'Diary', href: 'diary/index.html', blurb: 'the obot diary, closed 2026-09-10' },
  { label: 'Reports', href: 'reports/', blurb: 'agent artifacts, one folder each' },
];

function link({ href, label, blurb }, { current, prefix }) {
  const attrs = current ? ' class="current" aria-current="page"' : '';
  const title = blurb ? ` title="${blurb}"` : '';
  return `<a href="${prefix}${href}"${attrs}${title}>${label}</a>`;
}

/**
 * Render the whole `<header class="site">` block.
 *
 * @param page   which page this is: a TOP key, or anything else for a page with
 *               no row of its own (the header renders with nothing lit)
 * @param depth  how many directories deep the page sits, for the `../` prefix
 * @param extra  markup appended inside the nav, after the version stamp
 */
export function siteHeader({ page, depth = 0, extra = '' } = {}) {
  const prefix = '../'.repeat(depth);
  const top = TOP.map((item) => link(item, { current: item.key === page, prefix })).join('\n    ');

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
  ${panel}
</header>
<script>${VERSION_BADGE_SCRIPT}</script>`;
}
