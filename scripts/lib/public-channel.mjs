// Everything the local machine is allowed to tell the public site.
//
// Requirement: jwildfire/obot.roadmap#203 — one information architecture, two
// audiences. The spine is shared; the depth is not; and where symmetry and the
// security rule conflict, the rule wins and the symmetry breaks visibly.
//
// The rule (BL2/BL4, approved 2026-08-15): config item text never reaches a
// public surface — counts only. `local-only-guard.mjs` makes the *pull* direction
// impossible: a public generator cannot open a file outside this repository, so
// it cannot read the config list even if it tries. This module is the other
// direction — the *push*. Two channels carry information from that machine to
// this site, and both are declared here rather than discovered later:
//
//   config-count.json   written by the dashboard, read at build time, published
//                       as a count on the queue page and in the wire's pinned box
//   session.json        published to the orphan `session-state` branch by the
//                       heartbeat, fetched client-side by the NOW strip
//
// ## Why both are validated HERE, on the public side
//
// Because a channel is only as safe as its narrowest end, and the narrow end has
// to be the one that publishes.
//
// The session channel already demonstrates the problem, and it is not
// hypothetical — it is the state of the code today. `sessionState()` in
// obot.agent's session-hub is careful and says so: "Deliberately aggregate-only:
// the hub site is public, and agent-authored `detail` strings are free text, so
// this publishes counts and the session slug rather than forwarding whatever a
// running agent happened to write about itself." That comment is correct and the
// producer is safe. But the *consumer* — the NOW strip on the public roadmap page
// — takes `name` and `detail` from that payload and renders them verbatim. So the
// safety of a public page rests entirely on a comment in a different repository,
// and a one-line change there ("let's show what the session is doing") would put
// agent-authored text on the internet with nothing in the path to stop it. The
// text an agent writes about itself while clearing a config item is exactly the
// text that must never appear.
//
// So neither channel is trusted. Each is parsed into a fixed shape here, and
// anything that is not a number, a timestamp, or a member of a closed enum is
// dropped rather than rendered. A compromised, careless, or simply changed
// producer cannot publish prose through a reader that has nowhere to put prose.
// The sentence a reader sees is composed on this side, from the numbers.
//
// That is the requirement's "structurally impossible rather than merely avoided",
// applied to the push direction: not a promise that we will keep sending counts,
// but a reader that can only receive them.
import fs from 'node:fs';
import path from 'node:path';

import { ROOT } from './repos.mjs';

// --------------------------------------------------------------- config counts

/** Where the dashboard hands the count across. Inside this repo, so the guard allows it. */
export const CONFIG_COUNT_PATH = path.join(ROOT, 'data', 'config-count.json');

/** The contract string. A file that does not name it is not this channel. */
export const CONFIG_COUNT_SCHEMA = 'obot.roadmap/config-count@1';

/** Past this, the count is reported with its date rather than as a current fact. */
export const CONFIG_COUNT_STALE_DAYS = 3;

const isCount = (v) => Number.isInteger(v) && v >= 0 && v < 100000;
const ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/;

/**
 * The config count, or a stated reason there is none.
 *
 * Returns `{ ok: true, open, critical, asOf, ageDays, stale }` or
 * `{ ok: false, why }`. `why` is this site's own words, never the file's — a
 * rejected payload's contents are not echoed into an error that a page might
 * render, because that would reopen the channel this function exists to close.
 *
 * Every field is checked, and the whole payload is refused if any field is wrong
 * rather than the bad field being skipped. Partial acceptance is how a strict
 * reader becomes a lenient one: the first `?? 0` turns a refusal into a plausible
 * zero, and a plausible zero on this page says "nothing needs your hands" when
 * nobody knows.
 */
export function readConfigCount({ file = CONFIG_COUNT_PATH, now = new Date() } = {}) {
  let raw;
  try {
    raw = fs.readFileSync(file, 'utf8');
  } catch {
    return { ok: false, why: 'no count has been published from the machine yet' };
  }

  let payload;
  try {
    payload = JSON.parse(raw);
  } catch {
    return { ok: false, why: 'the published count could not be read' };
  }

  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return { ok: false, why: 'the published count is not in the expected shape' };
  }

  // Exact key set. An extra key is a refusal, not a curiosity: this is the one
  // place a string could ride into the build, and "we ignore keys we do not know"
  // is precisely the door a later change walks through.
  const keys = Object.keys(payload).sort();
  const expected = ['_schema', 'asOf', 'critical', 'open'];
  if (keys.length !== expected.length || keys.some((k, i) => k !== expected[i])) {
    return { ok: false, why: 'the published count carries fields this site does not accept' };
  }

  if (payload._schema !== CONFIG_COUNT_SCHEMA) {
    return { ok: false, why: 'the published count is a version this site does not read' };
  }
  if (!isCount(payload.open) || !isCount(payload.critical)) {
    return { ok: false, why: 'the published count is not a count' };
  }
  if (typeof payload.asOf !== 'string' || !ISO.test(payload.asOf)) {
    return { ok: false, why: 'the published count is not dated' };
  }
  if (payload.critical > payload.open) {
    return { ok: false, why: 'the published count contradicts itself' };
  }

  const at = new Date(payload.asOf);
  if (Number.isNaN(at.getTime())) return { ok: false, why: 'the published count is not dated' };

  const ageDays = (now.getTime() - at.getTime()) / 86400000;
  // A count from the future is a clock problem, and a clock problem must not be
  // rendered as a fresh fact — the whole point of the staleness line.
  const stale = ageDays > CONFIG_COUNT_STALE_DAYS || ageDays < -0.5;

  return {
    ok: true,
    open: payload.open,
    critical: payload.critical,
    asOf: payload.asOf,
    ageDays,
    stale,
  };
}

// -------------------------------------------------------------- session state

/** The closed set of states the heartbeat may publish. Anything else is unknown. */
export const SESSION_STATES = ['working', 'idle', 'needs-input', 'done', 'unmeasured'];

/**
 * The browser-side validator for the session feed, as source.
 *
 * Emitted into the NOW strip's inline script rather than kept as a function here,
 * because this validation has to happen in the reader's browser — the feed is
 * fetched client-side, so the build never sees the payload that a visitor
 * actually renders. Anything the build validated would be the wrong copy.
 *
 * It returns `{state, total, working, needsInput, slug}` and NOTHING else. The
 * payload's `name` and `detail` are free text and are dropped on the floor here,
 * which is the entire point: the strip composes its own sentence from the
 * numbers, so there is no code path from an agent's words to a public pixel.
 */
export function sessionStateValidatorScript() {
  return `  // Validate the session feed before rendering any of it (#203). The producer is
  // aggregate-only today; this reader is aggregate-only by construction, so it
  // stays true if the producer ever changes. Free-text fields are dropped, never
  // rendered — the sentence below is composed here, from numbers.
  var nsStates = ${JSON.stringify(SESSION_STATES)};
  var nsInt = function (v) { return (typeof v === 'number' && isFinite(v) && v >= 0 && Math.floor(v) === v) ? v : null; };
  var nsClean = function (s) {
    if (!s || typeof s !== 'object') return null;
    var a = (s.agents && typeof s.agents === 'object') ? s.agents : {};
    return {
      state: nsStates.indexOf(s.state) === -1 ? null : s.state,
      total: nsInt(a.total),
      working: nsInt(a.working),
      needsInput: nsInt(a.needsInput),
      // The slug is a date, and it is matched as one. It is the only non-numeric
      // value that crosses, and a shape this narrow cannot carry a sentence.
      slug: (typeof s.slug === 'string' && /^\\d{4}-\\d{2}-\\d{2}(-\\d+)?$/.test(s.slug)) ? s.slug : null,
      updatedAt: (typeof s.updatedAt === 'string' && s.updatedAt.length < 40) ? s.updatedAt : null,
    };
  };`;
}
