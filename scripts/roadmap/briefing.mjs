// The briefing — one stable URL, ten lines, the ask first (obot.roadmap#247,
// under the morning fold #238, from @jwildfire's adoption of D0007/M3).
//
// This is his queue, not a report of yesterday. It always shows current state:
// there are no dated briefings to catch up on, because the diary is the archive.
// Skip it for a week and the next one is still complete — that cumulative
// property is the most important thing on this page, because the documented
// failure mode is him not reading it.
//
// Every rule below is the inverse of something measured. The daily summaries this
// replaces were published by an unconditional cron and read afterwards: 559 words
// on a day they called quiet, seven real asks starting at line 38 behind ~500
// words of recap, and length growing 136 -> 865 against a fixed six-section
// template that had to be filled every night whatever had happened.
//
//   asks first          - the record is one trailing line, never the body
//   one line per item   - ~15-20 words, the verb at the front, every line a link
//   cumulative          - an item he has not closed carries every morning
//   ten lines           - a bound the generator enforces, not a habit
//   composed mechanically - nothing here is written by a model
//
// It is a second VIEW of the queue at /roadmap.html, not a second computation:
// buildItems() is imported, so the two surfaces cannot disagree about what counts
// as waiting. What differs is the cut — twenty items do not fit in ten lines.
//
// Two things are owed until the morning fold lands (obot.agent#200 shipped the
// gate; the writer is #202/#204): the overnight record line and the fold's own
// freshness stamp, both arriving via data/fold.json through lib/public-channel.mjs
// because a build-time generator here physically cannot read his machine. Until
// then they render as absent rather than faked.
import { esc, age, fmtET } from '../lib/gh.mjs';
import { readConfigCount } from '../lib/public-channel.mjs';

export const meta = { slug: 'briefing', out: 'reports/briefing/index.html' };

const HUB = 'https://jwildfire.github.io/obot.roadmap';

// The two headlines carry in full. Everything else is cut, because ten lines is
// the whole point — see LINE_BUDGET below.
const HEADLINE_TYPES = ['review', 'decide'];
const REST_TYPES = ['triage', 'unstick', 'release'];

// Ten content lines: the bound M3 sets, enforced here rather than trusted. The
// openclaw failure signature was monotonic growth against a template with slots
// that had to be filled, so the budget is checked against what was rendered.
export const LINE_BUDGET = 10;
const TODO_CAP = 2;

/**
 * The cut. Nothing is ever silently dropped — whatever does not fit is counted
 * on a line that links the page holding it. A ten-line briefing that lies by
 * omission is worse than the twenty-line one it replaced.
 */
export function cut(items, { budget = LINE_BUDGET } = {}) {
  const of = (t) => items.filter((i) => i.type === t);
  const rcs = of('review');
  const decisions = of('decide');
  const rest = items.filter((i) => REST_TYPES.includes(i.type));

  // Headlines are never cut. If they alone exceed the budget that is a real
  // signal about his queue, and shortening it would hide the thing the page is
  // for — so the budget yields to them and the overflow is reported.
  const headlineLines = rcs.length + decisions.length;
  const room = Math.max(0, budget - headlineLines);
  const todos = rest.slice(0, Math.min(TODO_CAP, room));
  const remainder = rest.length - todos.length;

  return { rcs, decisions, todos, remainder, headlineLines, overBudget: headlineLines > budget };
}

// One line per item: the verb at the front, the thing in plain words, the link at
// the end. `why` from the queue is a full sentence about consequence; here it is
// the wait instead, because at ten lines the reader has already accepted that
// everything listed is waiting on him.
function line(item, NOW) {
  const ts = item.since ? new Date(item.since).getTime() : NaN;
  const known = Number.isFinite(ts);
  const wait = known ? age(item.since, NOW) : (item.noAge ?? 'age not recorded');
  const href = item.act?.href ?? item.cite?.href ?? HUB;
  return `    <li><a href="${esc(href)}">${esc(item.title)}</a>`
       + ` <span class="b-wait">${esc(wait)}</span></li>`;
}

function section(emoji, label, items, NOW, ordered = true) {
  const tag = ordered ? 'ol' : 'ul';
  if (!items.length) {
    // Both headings are always present, even when empty. A missing heading is
    // indistinguishable from a dropped one, and this is the part he scans first.
    return `  <section class="b-sec">\n    <h2>${emoji} ${esc(label)} (0)</h2>\n`
         + `    <p class="b-none">None waiting on you.</p>\n  </section>`;
  }
  return `  <section class="b-sec">\n    <h2>${emoji} ${esc(label)} (${items.length})</h2>\n`
       + `    <${tag} class="b-list">\n${items.map((i) => line(i, NOW)).join('\n')}\n    </${tag}>\n  </section>`;
}

export async function render(data) {
  const { NOW, prRes, relRes, decRes, ideaRes, reqRes } = data;
  const { buildItems } = await import('./queue.mjs');
  const items = buildItems(data);
  const { rcs, decisions, todos, remainder, overBudget } = cut(items);

  const config = readConfigCount({ now: NOW });
  // The COUNT is the entire permitted payload. That list is local-only by design
  // and the deploy greps the assembled site for its sentinel, so no item text
  // reaches this page by any route.
  // The count carries WHEN IT WAS COUNTED unless it is same-day fresh. It comes
  // from a committed file that nothing refreshes on a schedule — it updates only
  // when a session runs tools/config-count by hand — so "9 config items" can be a
  // day old and read as a current fact. That matters more than tidiness right
  // now: with obot.agent#206 open, his dashboard shows no config items at all, so
  // this line is the only surface telling him about them (obot.agent#212).
  const countAge = config.ok && config.asOf
    ? Math.floor((NOW - new Date(config.asOf)) / 3600000) : null;
  const asOf = countAge !== null && countAge >= 6
    ? ` <span class="b-wait">counted ${countAge >= 48 ? `${Math.floor(countAge / 24)}d` : `${countAge}h`} ago</span>` : '';
  const configLine = config.ok && config.open > 0
    ? `  <p class="b-line"><a href="${HUB}/roadmap.html">${config.open} config item${config.open === 1 ? '' : 's'} on your keyboard</a>${asOf}</p>`
    : '';

  const restLine = remainder > 0
    ? `  <p class="b-line"><a href="${HUB}/roadmap.html">${remainder} more waiting — triage, stalled work, release calls</a></p>`
    : '';

  // A source that did not answer is named. A short, tidy briefing composed from
  // failed queries is the failure this programme keeps having, and the queue's
  // own collectors already carry their notices.
  const failed = [
    ['review-requested PRs', prRes], ['draft releases', relRes],
    ['decisions', decRes], ['ideas', ideaRes], ['requirements', reqRes],
  ].filter(([, r]) => r && !r.ok).map(([label]) => label);
  const notice = failed.length
    ? `  <p class="b-warn">Incomplete: ${esc(failed.join(', '))} could not be read on this build. Nothing below is a claim that they are clear.</p>`
    : '';

  // Everything on his plate, not just the two headlines — a footer that counts
  // four beside a page showing eleven teaches him not to trust either number.
  const waiting = rcs.length + decisions.length + todos.length + remainder
    + (config.ok ? config.open : 0);
  const date = NOW.toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric', timeZone: 'America/New_York',
  });

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>obot briefing</title>
<meta name="description" content="What is waiting on @jwildfire right now, in ten lines he can act on from a phone: release candidates, open decisions, and a count of everything else still queued.">
<style>
  :root {
    --paper: #FBF9F4; --ink: #1B1A17; --faint: #6E6A61; --rule: #E2DDD1;
    --card: #FFFFFF; --flag: #C4622D; --link: #1F4E6B;
  }
  @media (prefers-color-scheme: dark) {
    :root:not([data-theme="light"]) {
      --paper: #16150F; --ink: #F1EDE2; --faint: #9C968A; --rule: #322F27;
      --card: #1E1C16; --flag: #E08A52; --link: #7FB4D4;
    }
  }
  :root[data-theme="dark"] {
    --paper: #16150F; --ink: #F1EDE2; --faint: #9C968A; --rule: #322F27;
    --card: #1E1C16; --flag: #E08A52; --link: #7FB4D4;
  }
  /* On html only. On body it would clip the full-bleed bands, and page overflow
     here is not recoverable by scrolling: whatever runs past the viewport is
     simply gone, which on a phone once ate four of seven columns. */
  html { overflow-x: clip; }
  body {
    margin: 0; background: var(--paper); color: var(--ink);
    font: 16px/1.5 ui-sans-serif, -apple-system, "Segoe UI", system-ui, sans-serif;
  }
  main { max-width: 34rem; margin: 0 auto; padding: 1.1rem 1rem 2.5rem; }
  .b-bar {
    font-size: 1.05rem; font-weight: 650; letter-spacing: .01em;
    padding-bottom: .6rem; border-bottom: 1px solid var(--rule); margin: 0 0 1rem;
  }
  .b-sec { margin: 0 0 1.15rem; }
  .b-sec h2 {
    font-size: .74rem; text-transform: uppercase; letter-spacing: .08em;
    color: var(--faint); margin: 0 0 .4rem; font-weight: 650;
  }
  .b-list { margin: 0; padding-left: 1.15rem; }
  .b-list li { margin: 0 0 .42rem; }
  /* Anything that can carry a pasted URL or a release tag wraps rather than
     pushing the page past the viewport. An unbroken one blew the Decisions page
     past 390px once already. */
  .b-list a, .b-line a { color: var(--link); overflow-wrap: anywhere; }
  .b-wait { color: var(--faint); font-size: .8rem; white-space: nowrap; }
  .b-none { margin: 0; color: var(--faint); font-size: .88rem; }
  .b-line { margin: 0 0 .5rem; font-size: .92rem; }
  .b-warn {
    margin: 0 0 1rem; padding: .55rem .7rem; max-width: 100%;
    border-left: 4px solid var(--flag); background: var(--card); font-size: .88rem;
  }
  .b-rec {
    margin: 1.3rem 0 0; padding-top: .7rem; border-top: 1px solid var(--rule);
    color: var(--faint); font-size: .88rem; overflow-wrap: anywhere;
  }
  .b-rec a { color: var(--link); }
  .b-foot {
    margin: 1.6rem 0 0; padding-top: .7rem; border-top: 1px solid var(--rule);
    color: var(--faint); font-size: .74rem; overflow-wrap: anywhere;
  }
  .b-foot a { color: var(--faint); }
</style>
</head>
<body>
<main>
  <p class="b-bar">☀️ obot briefing — ${esc(date)}</p>
${notice}
${section('🚦', 'Release candidates', rcs, NOW)}
${section('🧭', 'Decisions', decisions, NOW)}
${section('🙋', 'Also waiting', todos, NOW, false)}
${restLine}
${configLine}
  <p class="b-rec">Overnight: the record of what shipped arrives with the morning fold — until then the <a href="${HUB}/diary/">diary</a> is the archive.</p>
  <p class="b-foot">${waiting} waiting${overBudget ? ', more than this page is meant to hold' : ''} · cumulative, so missing a morning costs nothing · ${esc(fmtET(NOW.toISOString()))} · <a href="${HUB}/roadmap.html">full queue</a></p>
</main>
</body>
</html>
`;
}
