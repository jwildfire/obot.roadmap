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
//               Overview · Audit · Analytics · Status
//
// The brand is the "obot" link, so there is no separate nav entry for it.
//
// Adding a page means adding one row to TOP or SUB here. Nothing else in the
// site defines nav, and the deploy asserts every page carries this markup.
import { HUB } from './repos.mjs';

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
const SUB = [
  { key: 'overview', label: 'Overview', href: 'roadmap.html', blurb: 'Goals, requirements, PRs, releases, ideas' },
  { key: 'audit', label: 'Audit', href: 'audit/index.html', blurb: 'Convention findings from the nightly audit' },
  { key: 'analytics', label: 'Analytics', href: 'analytics/index.html', blurb: 'Charts — token and dollar cost' },
  { key: 'status', label: 'Status', href: 'status.html', blurb: 'Per-repo releases, milestones, PR activity' },
];

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
 * @param extra  markup appended inside the top nav, after the GitHub icon
 *               (the roadmap page's audit-log version badge)
 */
export function siteHeader({ page, depth = 0, extra = '' } = {}) {
  const prefix = '../'.repeat(depth);
  const top = TOP.map((item) =>
    link(item, { current: item.key === page || (item.key === 'roadmap' && inRoadmap(page)), prefix })).join('\n    ');

  // The sub-row is rendered only inside the group. On other pages it would be
  // four links to somewhere else wearing the current page's chrome.
  const sub = inRoadmap(page)
    ? `\n  <nav class="site sub" aria-label="Roadmap sections">
    ${SUB.map((item) => link(item, { current: item.key === page, prefix })).join('\n    ')}
  </nav>`
    : '';

  return `<header class="site">
  <a class="brand" href="${prefix}index.html">🍊😺 obot</a>
  <nav class="site" aria-label="Site">
    ${top}
    <a href="https://github.com/${HUB}" aria-label="GitHub" title="GitHub" style="display:inline-flex;align-items:center">${GITHUB_ICON}</a>${extra ? `\n    ${extra}` : ''}
  </nav>${sub}
</header>`;
}
