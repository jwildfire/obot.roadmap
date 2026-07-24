// Which rows survive each view of the page (requirement #57).
//
// Everything renders once; a view is a filter over the rendered rows, applied
// client-side from the `data-hl` attribute this module computes. So switching
// views costs no request and composes with the repo filter.
//
// The three views are deliberately different questions, not three thresholds of
// the same one:
//
//   live       "what is being built right now"   — the project's front line
//   attention  "what is waiting on @jwildfire"   — the approval queue
//   pulse      "what moved since I last looked"  — the last 7 days
//
// A row can belong to several views. `all` is not computed — it means no filter.
export const VIEWS = [
  { key: 'live', label: 'Live', blurb: 'What is being built right now.' },
  { key: 'attention', label: 'Attention', blurb: 'What is waiting on @jwildfire.' },
  { key: 'pulse', label: 'Pulse', blurb: 'What moved in the last 7 days.' },
  { key: 'all', label: 'All', blurb: 'Everything the page tracks.' },
];

export const DEFAULT_VIEW = 'live';

// Thresholds, named so they are arguable rather than buried in a comparison.
export const T = {
  pulseDays: 7,          // "recent" for the Pulse view
  stalledDays: 10,       // in-flight but untouched this long → needs a nudge
  stalePrDays: 7,        // a draft PR nobody has touched → needs a decision
  releaseBacklog: 10,    // unreleased commits worth a release decision
  ideaAgeDays: 3,        // an un-triaged idea older than this is a queue, not an inbox
};

const daysSince = (iso, now) => (iso ? (now - new Date(iso)) / 86400000 : Infinity);
const tag = (set) => [...set].join(' ');

// Goals are the page's spine — two rows that frame everything below, so they
// appear in every view rather than being filtered against.
export function goalViews() {
  return 'live attention pulse';
}

export function requirementViews(req, prs, now) {
  const v = new Set();
  const idle = daysSince(req.updatedAt, now);
  const inFlight = req.stage === 'Development' || req.stage === 'Review';
  const openPrs = prs ?? [];

  // Live: the board says it is being built, or a PR proves it regardless of the
  // board — the audit's lesson was to trust the work signal over the field.
  if (inFlight || openPrs.length) v.add('live');

  // Attention: drift (the board is lying), in-flight work that has gone quiet,
  // or a PR that is ready and waiting on a review only @jwildfire gives.
  if (req.drift) v.add('attention');
  if (inFlight && idle > T.stalledDays) v.add('attention');
  if (openPrs.some((p) => !p.isDraft)) v.add('attention');

  if (idle <= T.pulseDays) v.add('pulse');
  return tag(v);
}

export function prViews(pr, now) {
  const v = new Set(['live']); // an open PR is in-flight by definition
  // Ready means the ball is in @jwildfire's court (nothing merges without him);
  // a draft nobody has touched in a week needs a decision too.
  if (!pr.isDraft) v.add('attention');
  if (pr.isDraft && daysSince(pr.updatedAt, now) > T.stalePrDays) v.add('attention');
  if (daysSince(pr.updatedAt, now) <= T.pulseDays) v.add('pulse');
  return tag(v);
}

export function upcomingViews(u, now) {
  const v = new Set();
  // Work merged but unpromoted is live work — it exists and is not shipped.
  if (u.devAhead > 0 || u.unreleased > 0) v.add('live');
  // A release decision is @jwildfire's: a big backlog, diverged branches, or a
  // repo carrying real work that has never shipped at all.
  if ((u.unreleased ?? 0) >= T.releaseBacklog) v.add('attention');
  if ((u.devAhead ?? 0) >= T.releaseBacklog) v.add('attention');
  if (u.devBehind > 0) v.add('attention');
  if (u.neverReleased && (u.devAhead > 0 || u.unreleased > 0)) v.add('attention');
  if (daysSince(u.newestCommitAt, now) <= T.pulseDays) v.add('pulse');
  return tag(v);
}

export function releaseViews(rel, now) {
  // A shipped release is neither in-flight nor waiting on anyone; it is news.
  return daysSince(rel.publishedAt, now) <= T.pulseDays ? 'pulse' : '';
}

export function openIdeaViews(idea, now) {
  const v = new Set();
  // An un-triaged idea is an inbox item — @jwildfire's to answer or promote.
  if (daysSince(idea.createdAt, now) > T.ideaAgeDays) v.add('attention');
  if (daysSince(idea.updatedAt, now) <= T.pulseDays) v.add('pulse');
  return tag(v);
}

export function promotedIdeaViews(idea, now) {
  return daysSince(idea.closedAt, now) <= T.pulseDays ? 'pulse' : '';
}
