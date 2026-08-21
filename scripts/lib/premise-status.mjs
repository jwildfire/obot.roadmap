// The premise strip — what a decision artifact says about its own premises, on
// the page, above the argument.
//
// Requirement: jwildfire/obot.roadmap#266, task #301.
//
// The sweep on his machine has re-checked these premises every five minutes since
// obot.agent#262 landed, and says `PREMISE BROKEN` on the Navigator surface when
// one expires. The page said nothing. So a reader — him, or anyone on the public
// site — opened an artifact arguing from a premise that may have expired with no
// indication that anything had ever looked. That is the distance between a machine
// knowing and a reader knowing, and closing it is the whole of #266's first
// done-when clause.
//
// ## What this can honestly claim
//
// These are static pages on GitHub Pages and the check runs on a laptop against a
// live world, so the page cannot check itself at read time. It can carry the last
// reading. That is fine — a stamp saying "checked twelve minutes ago, all five
// hold" is exactly what a reader needs — and it is fine only while the page is
// honest about the reading's age. The same stamp four days old and silent about it
// is the defect this mechanism exists to prevent, one layer out from where the
// sweep prevents it.
//
// So age is computed twice and never trusted from a build:
//
//   at build time   the floor. A reading already stale when the page was generated
//                   renders stale, statically, for a reader with no JavaScript.
//   at read time    `premiseScript()` recomputes it in the reader's browser from
//                   the absolute timestamp in the markup, and can only ever
//                   escalate — a page cannot become fresher after it was built.
//
// ## The states, and why none of them may be collapsed
//
//   holds       measured, and the premise is true
//   broken      measured, and it is not — the page is framing an expired question
//   manual      the premise says `manual — …`. Nothing was ever going to check it
//   unchecked   something should have measured it and could not
//   unread      no reading for it has reached this page at all
//
// The first two are verdicts. The last three are three different ways of not
// knowing, and a page that renders any of them as "holds" has manufactured a
// measurement. #266 was written because five surfaces collapsed a state; this is
// the sixth surface and it does not.
//
// Scope is carried through as the author declared it and is never inferred:
// `history` premises are measured once at publish time and say so, `live` ones ride
// the cadence, and one that declares neither on a settled page is named as
// undeclared rather than quietly counted as either.
import crypto from 'node:crypto';

import { esc } from './gh.mjs';
import { PREMISE_UNKNOWN_REASONS } from './public-channel.mjs';

/** Past this, the strip stops asserting a verdict and reports the reading's age instead. */
export const STALE_HOURS = 24;

/** The scopes an author may declare. Anything else is refused, never defaulted. */
export const LIVE = 'live';
export const HISTORY = 'history';
const SCOPES = [LIVE, HISTORY];

// ------------------------------------------------------------------ parsing
//
// Deliberately the same shapes as obot.agent's tools/navigator/currency.mjs, and
// deliberately not shared with it: they are separate repositories and a build here
// cannot import from that clone (lib/local-only-guard.mjs makes it impossible on
// purpose). The fingerprint below is what makes the duplication safe — where the
// two parsers ever disagree about a premise, its reading stops applying and the
// strip says so, rather than showing yesterday's verdict against today's sentence.

/** Quote-aware on both halves: a proof may legitimately contain `>` and quotes. */
export const PREMISE_META = /<meta\b(?:[^>"']|"[^"]*"|'[^']*')*>/gi;
const IS_PREMISE = /\bname=(["'])premise\1/i;
const CONTENT = /\bcontent=(["'])([\s\S]*?)\1/i;
const SCOPE = /\bscope=(["'])([\s\S]*?)\1/i;
const PREMISE_LOOSE = /\bname=["']premise["']/gi;

const unescapeAttr = (s) => String(s)
  .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&apos;/g, "'")
  .replace(/&rarr;/g, '→').replace(/&#8594;/g, '→').replace(/&#x2192;/gi, '→')
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');

const trim = (s) => String(s ?? '').trim();

/**
 * `<what the page assumes> | <command> → <what its output should say>`
 *
 * The sentence is what a reader sees; the command is what was measured. Both come
 * off the page itself, which is why no prose has to cross the channel to render
 * this: the words were written by the artifact's author, in this repository, and
 * are already published.
 */
export function parsePremiseContent(text = '') {
  const raw = trim(text);
  const bar = raw.indexOf('|');
  const sentence = bar === -1 ? null : trim(raw.slice(0, bar)) || null;
  const rest = trim(bar === -1 ? raw : raw.slice(bar + 1));
  if (/^manual\b/i.test(rest)) {
    return { sentence, manual: true, command: null, expect: rest.replace(/^manual\s*[—:-]?\s*/i, '') };
  }
  const [cmd, ...tail] = rest.split('→');
  return { sentence, manual: false, command: trim(cmd).replace(/^`|`$/g, '') || null, expect: trim(tail.join('→')) };
}

/** Every premise one page declares, in the order it declares them. */
export function parsePremises(html = '') {
  const out = [];
  for (const tag of String(html).match(PREMISE_META) ?? []) {
    if (!IS_PREMISE.test(tag)) continue;
    const content = CONTENT.exec(tag)?.[2];
    if (!content) continue;
    const said = SCOPE.exec(tag)?.[2];
    const scope = said === undefined ? null : unescapeAttr(said).trim().toLowerCase();
    const ok = scope === null || SCOPES.includes(scope);
    out.push({
      ...parsePremiseContent(unescapeAttr(content)),
      scope: ok ? scope : null,
      scopeError: ok ? null : unescapeAttr(said).trim(),
    });
  }
  return out;
}

/**
 * How many declarations on this page could not be read at all.
 *
 * A broken quote makes a premise vanish from the strict parse, and a premise that
 * vanishes is worse than one that fails: nothing says it was ever there.
 */
export function malformedPremises(html = '') {
  const declared = (String(html).match(PREMISE_LOOSE) ?? []).length;
  return Math.max(0, declared - parsePremises(html).length);
}

/**
 * The fingerprint a reading is matched against.
 *
 * Twelve hex characters over the exact proof — the command and what it was
 * expected to say, or the manual instruction. It is the seam between two
 * repositories: the machine publishes the fingerprint of what it measured, this
 * side computes the fingerprint of what the page now says, and a mismatch means
 * the premise has been reworded since. That renders as "the reading no longer
 * applies", which is an honest unknown; carrying the old verdict forward against
 * new words would be a measurement nobody took.
 *
 * It is also why nothing but hex has to cross: a fingerprint has nowhere to put a
 * sentence, so the channel stays numbers and closed enums while still being able
 * to tell one premise from another.
 */
export function premiseFingerprint(premise) {
  const proof = premise?.manual
    ? `manual ${trim(premise?.expect)}`
    : `${trim(premise?.command)} ${trim(premise?.expect)}`;
  return crypto.createHash('sha256').update(proof, 'utf8').digest('hex').slice(0, 12);
}

// ------------------------------------------------------------------ reading

/** How long ago, in words. Mirrored in `premiseScript()` so both agree. */
export function agoPhrase(min) {
  if (min === null || min === undefined || !Number.isFinite(min)) return null;
  if (min < 1) return 'just now';
  const r = Math.round(min);
  if (r < 60) return `${r} minute${r === 1 ? '' : 's'} ago`;
  const h = Math.round(min / 60);
  if (h < 48) return `${h} hour${h === 1 ? '' : 's'} ago`;
  const d = Math.round(h / 24);
  return `${d} day${d === 1 ? '' : 's'} ago`;
}

/** The sentence for each reason an auto-check produced no verdict. Composed here, never sent. */
const UNKNOWN_WHY = {
  manual: 'a person has to look at this one — nothing can check it',
  refused: 'its proof is not a recognised read-only command, so nothing ran it',
  errored: 'the check ran and did not produce an answer to judge',
};

/**
 * One page's premises joined to what the machine last measured.
 *
 * `awaiting` is the artifact's own state, from the registry the hub stamps off the
 * page. It is consulted only where the author declared no scope — the same
 * precedence the sweep uses, so a premise cannot be re-checked on one surface and
 * undeclared on the other.
 */
export function premiseRows(html, { artifactId, readings = new Map(), awaiting = false } = {}) {
  return parsePremises(html).map((p, i) => {
    const id = `${artifactId}.p${i + 1}`;
    const sha = premiseFingerprint(p);
    const rec = readings.get(id) ?? null;
    // A premise the author called history is measured at publish time and never
    // again, by design. One with no scope on a settled page is not re-checked
    // either — and it is a third thing, not history, so it is named as its own.
    const tracked = p.scope === LIVE ? true
      : p.scope === HISTORY ? false
        : awaiting && !p.scopeError;
    const applies = rec ? rec.sha === sha : false;

    let state; let why = null;
    if (!rec) {
      state = 'unread';
      why = 'no reading for this premise has reached the page';
    } else if (!applies) {
      state = 'unread';
      why = 'the premise has been reworded since it was last measured, so that reading no longer applies';
    } else if (rec.state === 'holds') {
      state = 'holds';
    } else if (rec.state === 'fails') {
      state = 'broken';
    } else {
      state = rec.why === 'manual' ? 'manual' : 'unchecked';
      why = UNKNOWN_WHY[rec.why] ?? UNKNOWN_WHY.errored;
    }
    // A manual premise is declared uncheckable on the page itself, so it reads as
    // manual even before any reading arrives. "Nobody can check this" and "nobody
    // has checked this" are different sentences and only one of them is a gap.
    if (p.manual && state === 'unread') { state = 'manual'; why = UNKNOWN_WHY.manual; }
    // And what a person is supposed to look at is on the page already, written by
    // the artifact's author after `manual —`. It is more use than the generic
    // sentence and it costs nothing: it never crossed the channel, because it was
    // published here in the first place.
    if (state === 'manual' && trim(p.expect)) why = trim(p.expect);

    return {
      id,
      sha,
      sentence: p.sentence,
      command: p.command,
      expect: p.expect,
      manual: p.manual,
      scope: p.scope,
      scopeError: p.scopeError,
      tracked,
      state,
      why,
      at: applies ? rec.at : null,
    };
  });
}

/**
 * One page's premise state, end to end. What the stamper calls.
 */
export function premiseState(html, { artifactId, readings = new Map(), awaiting = false, now = new Date(), staleHours = STALE_HOURS } = {}) {
  const rows = premiseRows(html, { artifactId, readings, awaiting });
  return premiseSummary(rows, { now, staleHours, malformed: malformedPremises(html) });
}

/**
 * What the strip says at the top, from the rows.
 *
 * The age quoted is that of the OLDEST reading among the premises being re-checked,
 * not the newest. The strip is asserting something about all of them at once, and
 * the newest reading is the one that says least about the set: four fresh readings
 * and one from Tuesday would headline as "checked a minute ago" and be wrong about
 * the only premise that mattered. The oldest is the bound that is actually true.
 */
export function premiseSummary(rows, { now = new Date(), staleHours = STALE_HOURS, malformed = 0 } = {}) {
  const tracked = rows.filter((r) => r.tracked);
  const history = rows.filter((r) => !r.tracked && r.scope === HISTORY);
  const undeclared = rows.filter((r) => !r.tracked && r.scope !== HISTORY && !r.scopeError);
  const scopeErrors = rows.filter((r) => r.scopeError);
  const count = (set, s) => set.filter((r) => r.state === s).length;

  const times = tracked.map((r) => r.at).filter(Boolean).map((t) => Date.parse(t)).filter((t) => !Number.isNaN(t));
  const oldest = times.length ? Math.min(...times) : null;
  const ageMin = oldest === null ? null : (now.getTime() - oldest) / 60000;
  // A reading from the future is a clock problem and must not read as fresh.
  //
  // `stale` is a property of a reading that exists and has aged. Where nothing was
  // ever measured there is no reading to be stale, and saying "nothing has
  // re-checked these recently" would imply something once did. That case gets its
  // own verdict below — the third state again, one level up from the rows.

  const broken = count(tracked, 'broken');
  const holds = count(tracked, 'holds');
  const unread = count(tracked, 'unread');
  const unchecked = count(tracked, 'unchecked');
  const manual = count(tracked, 'manual');

  const measured = times.length > 0;
  const stale = measured && (ageMin > staleHours * 60 || ageMin < -30);

  const verdict = rows.length === 0 ? (malformed ? 'unreadable' : 'none')
    : broken ? 'expired'
      : tracked.length === 0 ? 'not-rechecked'
        : !measured ? 'unmeasured'
          : stale ? 'stale'
            // `holding` is reserved for the case where every premise on the cadence
            // was measured and held. A manual one among them has not been checked by
            // anything, and letting it ride under "all five still hold" is the exact
            // collapse the row states exist to prevent — one level up.
            : holds === tracked.length ? 'holding'
              : 'partial';

  return {
    rows,
    malformed,
    tracked,
    history,
    undeclared,
    scopeErrors,
    broken,
    holds,
    unread,
    unchecked,
    manual,
    oldestAt: oldest === null ? null : new Date(oldest).toISOString(),
    ageMin,
    measured,
    stale,
    verdict,
  };
}

// ---------------------------------------------------------------- rendering

const n = (k, one, many) => `${k} ${k === 1 ? one : many}`;

/** The verdict line, in the sweep's own vocabulary. `{AGE}` is filled in by the reader's browser. */
function headline(s) {
  const t = s.tracked.length;
  switch (s.verdict) {
    case 'expired':
      return s.broken === 1
        ? 'One of the assumptions this page argues from no longer holds, measured {AGE}.'
        : `${s.broken} of the assumptions this page argues from no longer hold, measured {AGE}.`;
    case 'holding':
      return t === 1
        ? 'The one assumption this page argues from still holds, re-checked {AGE}.'
        : `All ${t} assumptions this page argues from still hold, re-checked {AGE}.`;
    case 'partial':
      return `${n(s.holds, 'assumption', 'assumptions')} still ${s.holds === 1 ? 'holds' : 'hold'}, re-checked {AGE}. ${
        n(s.unread + s.unchecked + s.manual, 'other', 'others')} ${s.unread + s.unchecked + s.manual === 1 ? 'was' : 'were'} not measured — see below.`;
    case 'stale':
      return 'Nothing has re-checked this page’s assumptions recently, so nothing here says whether they still hold.';
    case 'unmeasured':
      return t === 1
        ? 'The assumption this page argues from is on the re-check cadence and has no reading at all — nothing here says whether it holds.'
        : `The ${t} assumptions this page argues from are on the re-check cadence and none of them has a reading — nothing here says whether they hold.`;
    case 'not-rechecked':
      return 'The assumptions this page argues from are not on the re-check cadence — see below for which kind each one is.';
    case 'unreadable':
      return 'This page declares assumptions that could not be read, so nothing has checked any of them.';
    default:
      return 'This page states no assumption in a form anything can check.';
  }
}

/** The single line the strip falls back to once the reading is too old to assert anything. */
const STALE_LINE = 'Nothing has re-checked this page’s assumptions since {AGE}, so nothing here says whether they still hold.';

const LABEL = {
  expired: 'Premise expired',
  holding: 'Premise check',
  partial: 'Premise check',
  stale: 'Premise check — no recent reading',
  'not-rechecked': 'Premise check',
  none: 'Premise check',
  unmeasured: 'Premise check — no reading',
  unreadable: 'Premise check — declaration unreadable',
};

// Two tenses for the two verdicts. Once the strip has gone stale the rows stop
// claiming anything about the present too, or the headline says "nothing here says
// whether they still hold" over five lines that each say one still does.
const ROW_WORDS = {
  holds: ['still holds', 'held when it was last checked'],
  broken: ['no longer holds', 'did not hold when it was last checked'],
  manual: ['a person has to check this', 'a person has to check this'],
  unchecked: ['could not be checked', 'could not be checked'],
  unread: ['not measured', 'not measured'],
};

const ROW_MARK = { holds: '✓', broken: '✕', manual: '?', unchecked: '?', unread: '?' };

function rowHtml(r) {
  const when = r.at
    ? ` <span class="pcx-when" data-pcx-age="${esc(r.at)}">checked ${esc(r.at.slice(0, 16).replace('T', ' '))} UTC</span>`
    : '';
  const scope = r.scopeError
    ? ' <span class="pcx-scope pcx-bad">scope not understood</span>'
    : r.scope === HISTORY
      ? ' <span class="pcx-scope">measured when the decision was made</span>'
      : r.tracked ? '' : ' <span class="pcx-scope">no scope declared — nobody has said whether it still claims something about today</span>';
  return `      <li class="pcx-row pcx-${r.state}">
        <span class="pcx-mark" aria-hidden="true">${ROW_MARK[r.state]}</span>
        <span class="pcx-body"><span class="pcx-said">${esc(r.sentence ?? r.command ?? 'an unnamed premise')}</span>
          <span class="pcx-verdict pcx-w-live">${esc(ROW_WORDS[r.state][0])}</span><span class="pcx-verdict pcx-w-stale">${esc(ROW_WORDS[r.state][1])}</span>${r.why ? ` <span class="pcx-why">— ${esc(r.why)}</span>` : ''}${scope}${when}</span>
      </li>`;
}

/**
 * The strip, as HTML.
 *
 * It goes at the very top of the page, above the masthead, because an expired
 * premise is a reason to distrust what follows and a reader meets what follows
 * first. A footer would be a record; this is a warning.
 *
 * Everything a reader needs in the worst case is in the static markup: the verdict,
 * the absolute time of the reading, and the premise sentences. The script upgrades
 * the timestamps to ages and escalates a reading that has gone stale since the
 * build. With no JavaScript at all the page still says what was measured and when.
 */
export function premiseStrip(summary, { artifactId = null, slug = null } = {}) {
  const s = summary;
  const at = s.oldestAt ?? '';
  const open = s.verdict === 'expired' || s.verdict === 'stale' || s.verdict === 'unreadable' || s.verdict === 'unmeasured';
  const rows = s.rows.length ? `    <ul class="pcx-list">\n${s.rows.map(rowHtml).join('\n')}\n    </ul>` : '';
  const notes = [];
  if (s.verdict === 'none') {
    notes.push('Nothing here is watching this page’s framing. A decision artifact states its premises in its own head so they can be re-checked; this one states none.');
  }
  if (s.verdict === 'expired') {
    notes.push('The evidence and the recommendation below may be perfectly sound. What has changed is the question they answer.');
  }
  if (s.malformed) {
    notes.push(`${n(s.malformed, 'premise declaration', 'premise declarations')} on this page could not be read at all, so ${s.malformed === 1 ? 'it is' : 'they are'} not checked and nothing above accounts for ${s.malformed === 1 ? 'it' : 'them'}.`);
  }
  const summaryLine = s.rows.length
    ? `${n(s.rows.length, 'premise', 'premises')} declared · ${n(s.tracked.length, 'on the re-check cadence', 'on the re-check cadence')}${
      s.history.length ? ` · ${n(s.history.length, 'measured at publish time', 'measured at publish time')}` : ''}${
      s.undeclared.length ? ` · ${n(s.undeclared.length, 'with no scope declared', 'with no scope declared')}` : ''}`
    : '';

  // An expired premise keeps its alarm however old the reading is. A measurement
  // that something has broken does not decay into "nobody knows" — premises very
  // rarely un-break, and of the two ways to be wrong here, still warning about a
  // premise that has since been fixed is the survivable one. The age rides in the
  // headline instead, so an old alarm is still visibly old.
  const showStale = s.stale && s.verdict !== 'none' && s.verdict !== 'expired';
  return `<aside class="pcx pcx-v-${s.verdict}${showStale ? ' pcx-is-stale' : ''}" data-pcx${at ? ` data-pcx-at="${esc(at)}"` : ''} data-pcx-stale-hours="${STALE_HOURS}" aria-label="Premise check">
  <div class="pcx-in">
    <p class="pcx-head"><span class="pcx-tag">${esc(LABEL[s.verdict] ?? LABEL.none)}</span>
      <span class="pcx-line pcx-live-line">${esc(headline(s)).replace('{AGE}', `<span class="pcx-age" data-pcx-age="${esc(at)}">${esc(agoPhrase(s.ageMin) ?? 'at an unknown time')}</span>`)}</span>
${at ? `
      <span class="pcx-line pcx-stale-line">${esc(STALE_LINE).replace('{AGE}', `<span class="pcx-age" data-pcx-age="${esc(at)}">${esc(agoPhrase(s.ageMin) ?? 'an unknown time')}</span>`)}</span>` : ''}</p>
${notes.map((t) => `    <p class="pcx-note">${esc(t)}</p>`).join('\n')}
${rows ? `    <details class="pcx-det"${open ? ' open' : ''}>
      <summary>${esc(summaryLine)}</summary>
${rows}
      <p class="pcx-foot">Re-checked by the claim sweep on @jwildfire’s machine and carried here with the build — the page cannot check itself as you read it, so it tells you how old the reading is instead. <a href="https://github.com/jwildfire/obot.roadmap/issues/266">#266</a>${slug ? ` · <span class="pcx-slug">${esc(slug)}</span>` : ''}</p>
    </details>` : ''}
  </div>
</aside>`;
}

/**
 * The strip's CSS, self-contained.
 *
 * A decision artifact is one file with no external assets, and it carries its own
 * palette — twenty-five of them, all warm paper. So this hard-codes colours from
 * that family rather than reading variables it cannot be sure a page defines: a
 * strip that inherits `--flag` from one page and nothing from the next is a strip
 * that is invisible on the page that needed it most.
 */
export function premiseStyle() {
  return `/* Premise check (#266) — injected at deploy time by scripts/stamp_premise_status.mjs. */
.pcx{--pcx-ink:#17191c;--pcx-mute:#6f747d;--pcx-rule:#e2dccf;--pcx-flag:#b83a2e;--pcx-go:#2b7a4b;--pcx-amber:#a95d10;
  border-bottom:1px solid var(--pcx-rule);background:#f4efe3;color:var(--pcx-ink);
  font:14px/1.55 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}
.pcx-in{max-width:960px;margin:0 auto;padding:10px 24px 11px}
.pcx-head{margin:0;display:flex;flex-wrap:wrap;gap:.35rem .6rem;align-items:baseline}
.pcx-tag{font:700 10.5px/1.5 ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:.13em;text-transform:uppercase;
  color:var(--pcx-mute);white-space:nowrap}
.pcx-line{flex:1 1 16rem;min-width:0}
.pcx-stale-line{display:none}
.pcx-is-stale .pcx-live-line{display:none}
.pcx-is-stale .pcx-stale-line{display:inline}
.pcx-w-stale{display:none}
.pcx-is-stale .pcx-w-live{display:none}
.pcx-is-stale .pcx-w-stale{display:inline}
.pcx-note{margin:.35rem 0 0;color:var(--pcx-mute)}
.pcx-det{margin:.45rem 0 0}
.pcx-det>summary{cursor:pointer;font:600 11.5px/1.6 ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:.04em;
  color:var(--pcx-mute);list-style:none}
.pcx-det>summary::-webkit-details-marker{display:none}
.pcx-det>summary::before{content:"\\25b8 ";display:inline-block;transition:transform .12s}
.pcx-det[open]>summary::before{content:"\\25be "}
.pcx-list{list-style:none;margin:.4rem 0 0;padding:0}
.pcx-row{display:flex;gap:.5rem;align-items:baseline;margin:.3rem 0;padding:0 0 0 0;min-width:0}
.pcx-mark{font:700 12px/1.5 ui-monospace,SFMono-Regular,Menlo,monospace;width:1em;flex:0 0 auto;color:var(--pcx-mute)}
.pcx-row.pcx-holds .pcx-mark{color:var(--pcx-go)}
.pcx-row.pcx-broken .pcx-mark{color:var(--pcx-flag)}
.pcx-body{min-width:0;overflow-wrap:anywhere}
.pcx-said{}
.pcx-verdict{font-weight:700}
.pcx-row.pcx-holds .pcx-verdict{color:var(--pcx-go)}
.pcx-row.pcx-broken .pcx-verdict{color:var(--pcx-flag)}
.pcx-row.pcx-manual .pcx-verdict,.pcx-row.pcx-unchecked .pcx-verdict,.pcx-row.pcx-unread .pcx-verdict{color:var(--pcx-amber)}
.pcx-why,.pcx-scope,.pcx-when{color:var(--pcx-mute)}
.pcx-scope{font-style:italic}
.pcx-when{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:11.5px;white-space:nowrap}
.pcx-bad{color:var(--pcx-flag);font-style:normal;font-weight:700}
.pcx-foot{margin:.5rem 0 0;color:var(--pcx-mute);font-size:12px}
.pcx-foot a{color:inherit}
.pcx-slug{font-family:ui-monospace,SFMono-Regular,Menlo,monospace}
/* Expired is the one state that is allowed to be loud. It is a reason to distrust
   everything below it, so it does not sit quietly above the masthead. */
.pcx-v-expired{background:#fbeae7;border-bottom:2px solid var(--pcx-flag)}
.pcx-v-expired .pcx-tag{color:var(--pcx-flag)}
.pcx-v-expired .pcx-line{font-weight:600}
.pcx-v-holding{background:#f3f2e7}
.pcx-is-stale{background:#f7f0e2}
.pcx-is-stale .pcx-tag{color:var(--pcx-amber)}
@media (max-width:520px){
  .pcx-in{padding:9px 16px 10px}
  .pcx-tag{flex:1 1 100%}
  .pcx-when{white-space:normal}
}`;
}

/**
 * The reader's-browser half, inlined.
 *
 * Two jobs, and it is deliberately incapable of a third. It rewrites every
 * timestamp into an age computed at the moment of reading, and if that age has
 * crossed the staleness bar it swaps the verdict line for one that stops asserting
 * anything. It can escalate and it cannot de-escalate: a page that was built stale
 * stays stale, because time only moves one way and the build already applied the
 * same test with the earliest `now` any reader could have.
 *
 * If it does not run, the static markup still carries the verdict and the absolute
 * time of the reading. Nothing here is load-bearing for honesty; it is load-bearing
 * for a reading not silently ageing into a lie.
 */
export function premiseScript() {
  return `(function(){
  var box = document.querySelector('[data-pcx]');
  if (!box) return;
  function ago(min){
    if (min === null || !isFinite(min)) return null;
    if (min < 1) return 'just now';
    var r = Math.round(min);
    if (r < 60) return r + ' minute' + (r === 1 ? '' : 's') + ' ago';
    var h = Math.round(min / 60);
    if (h < 48) return h + ' hour' + (h === 1 ? '' : 's') + ' ago';
    var d = Math.round(h / 24);
    return d + ' day' + (d === 1 ? '' : 's') + ' ago';
  }
  var now = Date.now();
  var els = box.querySelectorAll('[data-pcx-age]');
  for (var i = 0; i < els.length; i++) {
    var t = Date.parse(els[i].getAttribute('data-pcx-age') || '');
    if (isNaN(t)) continue;
    var phrase = ago((now - t) / 60000);
    if (!phrase) continue;
    // A per-premise stamp reads "checked <when>"; the headline is the phrase alone.
    els[i].textContent = els[i].className === 'pcx-when' ? 'checked ' + phrase : phrase;
  }
  // Same rule as the build: an expired verdict is never downgraded to "no recent
  // reading", whatever the clock says.
  if (box.className.indexOf('pcx-v-expired') !== -1) return;
  var at = Date.parse(box.getAttribute('data-pcx-at') || '');
  var hours = parseFloat(box.getAttribute('data-pcx-stale-hours') || '24');
  if (!isNaN(at)) {
    var mins = (now - at) / 60000;
    // Escalate only. The build already decided the floor, and nothing a reader's
    // clock says can make a reading younger than it was when the page was made.
    if (mins > hours * 60 || mins < -30) box.classList.add('pcx-is-stale');
  }
})();`;
}

export { PREMISE_UNKNOWN_REASONS };
