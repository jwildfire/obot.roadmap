#!/usr/bin/env node
// Put every decision artifact's premise status on the artifact, above the argument.
//
//   node scripts/stamp_premise_status.mjs            # stamp the _site copies
//   node scripts/stamp_premise_status.mjs --check    # report, write nothing
//
// Requirement: jwildfire/obot.roadmap#266, task #301.
//
// Runs after `cp -r reports _site/reports` and rewrites the _site copies in place,
// exactly as build_static.mjs does for the shared nav. The committed pages are not
// touched, and that is not an implementation detail — an artifact's prose, its
// recommendation and its recorded decisions are the record, and a status that
// edited them would be this mechanism doing the thing it exists to prevent. What
// is injected is a rendered reading, regenerated on every deploy, owned by nobody.
//
// A page with no `<body>` is an error rather than a skip. Publishing an artifact
// with no premise strip because a regex missed is precisely the silent-success
// shape this programme keeps paying for: the page looks fine, and the one surface
// that was supposed to speak up is the one that went quiet.
import fs from 'node:fs';
import path from 'node:path';

import { ROOT } from './lib/repos.mjs';
import { readRegistry } from './lib/decision-ids.mjs';
import { readPremiseStatus } from './lib/public-channel.mjs';
import { premiseState, premiseStrip, premiseStyle, premiseScript } from './lib/premise-status.mjs';

const check = process.argv.includes('--check');
const SITE = path.join(ROOT, '_site', 'reports', 'decisions');

const BODY = /<body\b[^>]*>/i;
const HEAD_END = /<\/head>/i;
const BODY_END = /<\/body>/i;

const reading = readPremiseStatus();
const readings = reading.ok ? reading.readings : new Map();
if (!reading.ok) {
  // Not a failure. The channel is written on his machine and a fresh clone has
  // never had one, so "no reading has arrived" is a state the strip renders in
  // words — but it is said out loud here too, because a deploy that quietly
  // published twenty-five unmeasured pages would look identical to one that
  // published twenty-five current ones.
  console.log(`premise status: ${reading.why} — every artifact will say so on its own page`);
}

const reg = readRegistry();
const now = new Date();
const tally = {};
let stamped = 0;

for (const a of reg.artifacts ?? []) {
  const file = path.join(SITE, a.slug, 'index.html');
  let html;
  try {
    html = fs.readFileSync(file, 'utf8');
  } catch {
    console.error(`::error title=Premise status::${a.id}: no page at _site/reports/decisions/${a.slug}/index.html`);
    process.exitCode = 1;
    continue;
  }

  // `state` is the hub's own stamp, generated from the page's decision block. It is
  // the default a premise falls back to where its author declared no scope, and
  // never a second opinion about a premise that did declare one.
  const awaiting = a.state === 'open' || a.state === 'partially decided';
  const s = premiseState(html, { artifactId: a.id, readings, awaiting, now });
  tally[s.verdict] = (tally[s.verdict] ?? 0) + 1;

  if (check) {
    const detail = s.rows.length
      ? `${s.rows.length} declared, ${s.tracked.length} on cadence, ${s.holds} hold, ${s.broken} expired, ${s.unread + s.unchecked + s.manual} not measured`
      : 'no premise declared';
    console.log(`  ${a.id} ${String(s.verdict).padEnd(13)} ${detail}`);
    continue;
  }

  if (!BODY.test(html) || !HEAD_END.test(html) || !BODY_END.test(html)) {
    console.error(`::error title=Premise status::${a.id}: reports/decisions/${a.slug}/index.html has no <body> or </head> — the premise strip cannot be injected`);
    process.exitCode = 1;
    continue;
  }

  const strip = premiseStrip(s, { artifactId: a.id, slug: a.slug });
  html = html
    .replace(HEAD_END, `<style>\n${premiseStyle()}\n</style>\n</head>`)
    .replace(BODY, (m) => `${m}\n${strip}`)
    .replace(BODY_END, `<script>\n${premiseScript()}\n</script>\n</body>`);
  fs.writeFileSync(file, html);
  stamped += 1;
}

const words = Object.entries(tally).map(([k, v]) => `${v} ${k}`).join(' · ');
if (check) {
  console.log(`premise status: ${reg.artifacts.length} artifacts — ${words}`);
} else {
  console.log(`premise status: stamped ${stamped} of ${reg.artifacts.length} artifacts — ${words}`);
}
