#!/usr/bin/env node
// Render the shared site header into the hand-written pages.
//
// index.html and status.html are authored by hand, not generated — but their nav
// must not be. They each carry a `<!--SITE-HEADER-->` marker that this script
// replaces in the _site copy, so scripts/lib/nav.mjs is the only place the nav
// exists for generated and static pages alike. That is the whole point: before
// this, seven copies of the nav had drifted into seven different link sets.
//
// Runs after the workflow's `cp -r site/. _site/`, and overwrites the copies in
// place. A page that has lost its marker is an error, not a warning — silently
// publishing a navless page is exactly the failure this is meant to prevent.
import fs from 'node:fs/promises';
import path from 'node:path';

import { ROOT } from './lib/repos.mjs';
import { siteHeader } from './lib/nav.mjs';

const MARKER = '<!--SITE-HEADER-->';

// page key → the nav.mjs page this file is, and how deep it sits.
const PAGES = [
  { file: 'index.html', page: 'home', depth: 0 },
  { file: 'status.html', page: 'status', depth: 0 },
];

const site = path.join(ROOT, '_site');
let done = 0;

for (const { file, page, depth } of PAGES) {
  const target = path.join(site, file);
  const src = await fs.readFile(target, 'utf8');
  if (!src.includes(MARKER)) {
    throw new Error(`static: ${file} has no ${MARKER} — the shared nav cannot be injected`);
  }
  await fs.writeFile(target, src.replaceAll(MARKER, siteHeader({ page, depth })));
  done += 1;
}

console.log(`static: injected the shared header into ${done} page${done === 1 ? '' : 's'}`);
