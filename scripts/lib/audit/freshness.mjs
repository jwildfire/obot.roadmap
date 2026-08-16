// How old the findings ledger is, said out loud on every surface that reads it
// (requirement #200, task #201).
//
// `findings.json` has always carried `generatedAt`. What it has never carried is
// a reason for a reader to look at it. On 2026-08-16 that produced a real
// misreading: the last successful run was 2026-08-15T07:51:52Z against a daily
// 07:30 UTC cron, so the freshest file on disk was about 22 hours old and
// predated every issue in the argument — the earliest, #184, was created
// 2026-08-15T20:40Z. Its four findings (one DESIGN-MISSING, three
// SUBS-DONE-PARENT-OPEN, not one of them about the board) were quoted upward as
// "the audit reported four requirements off the board", and set an agenda.
//
// Nothing in the audit's logic was wrong. It was asked a question it had not been
// run to answer, and nothing told the reader so. Hence the shape of this helper:
//
//   the age is reported on the healthy path too.
//
// A threshold alone does not fix this. Twenty-two hours is inside any sane
// threshold for a nightly job, so a line that only appears when something trips
// would have stayed silent through the whole misreading. What was missing was a
// sentence saying the snapshot predates the work being judged, sitting next to
// the number somebody was about to quote.
//
// This mirrors `auditFreshness` in obot.agent's Navigator sweep
// (tools/navigator/checks.mjs), deliberately: the two surfaces read the same
// file and should say the same thing about it in the same words.

// A full day plus slack — the audit is nightly, and GitHub's scheduler has run
// it as much as 90 minutes late.
export const STALE_HOURS = 30;

// The note the ledger carries about itself, for the reader who never gets as far
// as a rendered page: `cat site/audit/findings.json` is exactly how the 08-16
// misreading happened.
export const FRESHNESS_NOTE = 'These findings describe the roadmap as it was at generatedAt, not as it is now. Compute the age before quoting the counts: anything filed since that run is invisible to it, and a stale ledger reads exactly like a clean one.';

// "20m" / "22h" / "3d" — the same compact vocabulary as lib/gh.mjs `age`, kept
// local so this module has no dependencies and can be imported from anywhere.
function compactAge(hours) {
  if (hours < 1) return `${Math.max(0, Math.round(hours * 60))}m`;
  if (hours < 24) return `${Math.round(hours)}h`;
  return `${Math.round(hours / 24)}d`;
}

/**
 * Read a findings ledger's own timestamp and say how much to trust it.
 *
 * Returns `{ ok, state, generatedAt, hours, age, total, summary }`, where
 * `state` is 'missing' | 'fresh' | 'stale' and `summary` is one line that is
 * safe to print on any path — including the clean one.
 */
export function freshness(ledger, now = new Date()) {
  const stamp = ledger?.generatedAt ?? null;
  const at = stamp ? Date.parse(stamp) : NaN;
  const total = ledger?.counts?.total ?? (ledger?.findings ?? []).length;

  if (!Number.isFinite(at)) {
    return {
      ok: false,
      state: 'missing',
      generatedAt: null,
      hours: null,
      age: 'never',
      total: 0,
      summary: 'nightly audit: NO FINDINGS FILE — nothing has audited the roadmap, and an absent audit reads as a clean one',
    };
  }

  const hours = (now.getTime() - at) / 3600000;
  const age = compactAge(hours);
  const findings = `${total} finding${total === 1 ? '' : 's'}`;

  if (hours > STALE_HOURS) {
    return {
      ok: false,
      state: 'stale',
      generatedAt: stamp,
      hours,
      age,
      total,
      summary: `nightly audit: STALE — last run ${age} ago (${stamp}); its ${findings} describe the roadmap as it was, not as it is`,
    };
  }
  return {
    ok: true,
    state: 'fresh',
    generatedAt: stamp,
    hours,
    age,
    total,
    summary: `nightly audit: last run ${age} ago at ${stamp} — ${findings}; anything filed since then is invisible to it`,
  };
}
