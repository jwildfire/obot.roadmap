// Captures and checks for the study.viz v0.1.0 demo page: the app under its own
// name; the same studies and tabs as the safety.viz demo it was copied from;
// the chip's Simulated mark and snapshot, a study's card, a failed open; a
// simulated study shown in sections, with its Experimental label, its notes
// and CDISC's attribution; the names of the files the app saves; the snapshot
// chosen, as the RBQM tab's Run details names it; one build with R in the
// browser; the header at 1,280 pixels; and the records that hold the copy.
//
//   node capture.cjs [out dir]        default: the folder this file is in
//
// Run from the root of an `npm ci` checkout of study.viz or safety.viz, for its
// Playwright (or set PLAYWRIGHT to a folder that holds it). Stills go to
// <out dir>/media as PNG, from a 1,400 by 900 window in the light theme (the
// header still is from a window 1,280 wide). Everything read goes to
// <out dir>/capture.json, with a check of each thing the demo page states. The
// script exits 1 when a check fails. Then `node build.cjs` writes index.html
// from capture.json.
//
//   BASE=<the study.viz app under review>   default: the dev site
//   COMPARE=<the safety.viz demo app>       default: safety.viz's dev site
//   BUILD_IS=<words>  COMMIT=<sha>          when BASE is a build of your own:
//                                           what to call it on the page, and
//                                           its commit
//   PARTS=home,same,...                     take only these parts again and keep
//                                           the rest from the capture.json here.
//                                           The parts: home, same, chip,
//                                           sections, saved, snapshot, build,
//                                           held
//
// Two parts start real R in the browser (webR, from webr.r-wasm.org and
// repo.r-wasm.org) and take a minute or two each: snapshot and build. One part,
// chip, stops one ready-made study's file on its way to the page, as a dropped
// connection would, to read what the app says when a study does not open. The
// part "saved" presses the app's own download buttons and reads the names the
// files are offered under; the files are not kept. The part "held" reads
// public files and the public GitHub API with no token. It reads the commit
// and the result of the check's run the page cites for its tests; the counts of
// tests are that run's own, given below as TESTS_RAN and UNIT_TESTS, because a
// run's log cannot be read without signing in. Nothing is written anywhere but
// <out dir>, and the script signs in to nothing.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const { chromium } = require(
  require.resolve('playwright', { paths: [process.env.PLAYWRIGHT || process.cwd(), process.cwd(), __dirname] })
);

const DEV = 'https://jwildfire.github.io/study.viz/dev/';
const RELEASED = 'https://jwildfire.github.io/study.viz/';
const BASE = process.env.BASE || DEV;
const COMPARE = process.env.COMPARE || 'https://jwildfire.github.io/safety.viz/dev/demo/';
const ALL_PARTS = ['home', 'same', 'chip', 'sections', 'saved', 'snapshot', 'build', 'held'];
const PARTS = process.env.PARTS ? process.env.PARTS.split(',').map((p) => p.trim()) : ALL_PARTS;
const out = process.argv[2] || __dirname;
const media = path.join(out, 'media');
fs.mkdirSync(media, { recursive: true });
const jsonPath = path.join(out, 'capture.json');
const kept = fs.existsSync(jsonPath) ? JSON.parse(fs.readFileSync(jsonPath, 'utf8')) : {};

const W = 1400;
const H = 900;
const PROTOCOL_STUDY = 'PILOT-PROTOCOL';
const PLAIN_STUDY = 'READY-P1';
// The ready-made study whose file is stopped once, and the file.
const BLOCKED_STUDY = 'READY-P2';
const BLOCKED_FILE = '**/presets/phase2-oncology.study.json.gz';
// The studies the header is read on at 1,280 pixels: every study in the chip's list.
const HEADER_WIDTH = 1280;
const HEADER_STUDIES = ['Pilot study', 'Renamed columns', 'Liver cohort, labs only', 'RBQM study', 'READY-P1', 'READY-P2', 'PILOT-PROTOCOL'];
const BUILT_NAME = 'DEMO-BUILT';
// Small numbers, so the one build this script runs is quick.
const BUILD = { phase: '1', participants: 24, sites: 3, months: 3, seed: 11 };
const SECTIONS = ['Overview', 'Design', 'Data', 'One participant', 'Reporting'];
// The snapshot of PILOT-PROTOCOL chosen for the RBQM tab: the third.
const PICK = 2;
// The run of study.viz's required check that the page cites for its tests, and the
// counts its log gives ("617 passed", "Running 131 tests", "131 passed"). The script
// reads the run's commit and result from the public API; it cannot read the log,
// so the counts are given here. TEST_RUN, TESTS_RAN and UNIT_TESTS name another run.
const TEST_RUN = process.env.TEST_RUN || '46113608409';
const TESTS_RAN = Number(process.env.TESTS_RAN || 131);
const UNIT_TESTS = Number(process.env.UNIT_TESTS || 617);
// The stills of the study view in sections.
const SECTION_STILLS = [
  ['Overview', null, 'view-overview.png'],
  ['Design', 'Schedule', 'view-design.png'],
  ['Data', 'Pipeline', 'view-data.png'],
  ['One participant', null, 'view-participant.png'],
  ['Reporting', 'Efficacy', 'view-reporting.png']
];

const capture = { checks: {}, site: {}, stills: {} };
let part = 'run';
const check = (name, pass, detail) => {
  capture.checks[name] = detail === undefined ? { part, pass: !!pass } : { part, pass: !!pass, detail };
  console.log(`${pass ? 'ok  ' : 'FAIL'} ${name}${detail !== undefined ? ` — ${JSON.stringify(detail)}` : ''}`);
};
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const flat = (t) => String(t || '').replace(/\s+/g, ' ').trim();

// ---------------------------------------------------------------- page helpers
const hosts = new Set();
async function open(browser, url, width = W) {
  const context = await browser.newContext({ viewport: { width, height: H }, deviceScaleFactor: 1, colorScheme: 'light', acceptDownloads: true });
  const page = await context.newPage();
  const errors = [];
  const r = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (msg) => msg.type() === 'error' && errors.push(msg.text()));
  page.on('request', (req) => {
    if (/r-wasm\.org/.test(req.url())) r.push(req.url());
    try {
      if (/^https?:/.test(req.url())) hosts.add(new URL(req.url()).host);
    } catch {
      // not an address
    }
  });
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.waitForSelector('.sva-tab', { timeout: 60000 });
  await page.waitForTimeout(800);
  // Requests to R's two hosts so far: the runtime, and its packages.
  const rCount = () => ({ runtime: r.filter((u) => /webr\.r-wasm\.org/.test(u)).length, packages: r.filter((u) => /repo\.r-wasm\.org/.test(u)).length });
  return { context, page, errors, rCount };
}
const box = (page, selector) =>
  page.evaluate((sel) => {
    const el = document.querySelector(sel);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: r.left, y: r.top, width: r.width, height: r.height };
  }, selector);
const locBox = (locator) => locator.first().boundingBox();
const union = (...boxes) => {
  const b = boxes.filter(Boolean);
  const x = Math.min(...b.map((v) => v.x));
  const y = Math.min(...b.map((v) => v.y));
  return { x, y, width: Math.max(...b.map((v) => v.x + v.width)) - x, height: Math.max(...b.map((v) => v.y + v.height)) - y };
};
const pad = (b, n) => ({ x: b.x - n, y: b.y - n, width: b.width + 2 * n, height: b.height + 2 * n });

/** A PNG still of a viewport region, with marker positions as percentages of the still. */
async function still(page, name, b, markers = []) {
  const vw = page.viewportSize().width;
  const region = b || { x: 0, y: 0, width: vw, height: H };
  const x = Math.max(0, Math.floor(region.x));
  const y = Math.max(0, Math.floor(region.y));
  const clip = { x, y, width: Math.ceil(Math.min(region.width + (region.x - x), vw - x)), height: Math.ceil(Math.min(region.height + (region.y - y), H - y)) };
  await page.screenshot({ path: path.join(media, name), clip, type: 'png' });
  const st = {
    file: name,
    width: clip.width,
    height: clip.height,
    bytes: fs.statSync(path.join(media, name)).size,
    part,
    markers: markers.filter(Boolean).map((m) => ({
      left: +(((m.x + (m.dx ?? m.width / 2) - clip.x) / clip.width) * 100).toFixed(2),
      top: +(((m.y + (m.dy ?? m.height / 2) - clip.y) / clip.height) * 100).toFixed(2)
    }))
  };
  capture.stills[name] = { part, bytes: st.bytes };
  return st;
}

const title = (page) => page.title();
// The study the chip names, and the line under the name: "Simulated" for a
// simulated study, then the snapshot drawn. A demo study has no such line.
const chip = (page) => page.evaluate(() => (document.querySelector('.sva-studychip .sva-chip-name')?.innerText || document.querySelector('.sva-studychip')?.innerText || '').replace(/[▾\s]+/g, ' ').trim());
const chipSnap = (page) => page.evaluate(() => (document.querySelector('.sva-studychip .sva-chip-under')?.innerText || '').replace(/\s+/g, ' ').trim() || null);
const tabs = (page) => page.evaluate(() => [...document.querySelectorAll('.sva-tab')].map((b) => b.innerText.replace(/\s+/g, ' ').trim()));
const items = (page) => page.evaluate(() => [...document.querySelectorAll('.sva-item')].filter((b) => b.offsetParent).map((b) => b.innerText.replace(/\s+/g, ' ').trim()));
const count = (page) => page.evaluate(() => (document.querySelector('.sva-count')?.innerText || '').replace(/\s+/g, ' ').trim());
const views = (page) => page.evaluate(() => [...document.querySelectorAll('button.sv-view')].map((b) => b.innerText.trim()));
const rbqmTab = (page) => page.evaluate(() => (document.querySelector('button.sva-view-tab')?.innerText || '').replace(/\s+/g, ' ').trim());
const bodyText = (page) => page.evaluate(() => document.body.innerText);
const footer = (page) => page.evaluate(() => (document.querySelector('footer')?.innerText || '').split('\n').map((l) => l.trim()).filter(Boolean));
/** CDISC's attribution wherever the page shows it now: each element that says it, and what comes just before. */
const attributions = (page) =>
  page.evaluate(() =>
    [...document.querySelectorAll('main *')]
      .filter((e) => e.offsetParent && /DDF-RA/.test(e.innerText || '') && /CC-BY-4\.0/.test(e.innerText || '') && ![...e.children].some((c) => /DDF-RA/.test(c.innerText || '')))
      .map((e) => {
        const before = e.previousElementSibling;
        return {
          text: e.innerText.replace(/\s+/g, ' ').trim(),
          after: !before ? null : before.matches('table') ? 'the schedule grid' : before.querySelector('[data-action="try-protocol"]') ? 'the example protocols' : before.innerText.replace(/\s+/g, ' ').trim().slice(0, 60)
        };
      })
  );
/** The card under the i: its facts as pairs, and its sentences. */
const readCard = (page) =>
  page.evaluate(() => {
    const card = document.querySelector('.sva-chip-card');
    const dts = [...card.querySelectorAll('dl dt')];
    return {
      lines: card.innerText.split('\n').map((l) => l.trim()).filter(Boolean),
      facts: Object.fromEntries(dts.map((dt) => [dt.innerText.trim(), dt.nextElementSibling.innerText.trim()])),
      about: [...card.querySelectorAll('p.sva-chip-about:not(.sva-chip-credit)')].map((p) => p.innerText.replace(/\s+/g, ' ').trim()),
      credit: [...card.querySelectorAll('p.sva-chip-credit')].map((p) => p.innerText.replace(/\s+/g, ' ').trim())
    };
  });
/** The header's row, measured: one row or more, and a name cut short. */
const readHeader = (page) =>
  page.evaluate(() => {
    const bar = document.querySelector('.sva-bar');
    const name = document.querySelector('.sva-chip-name');
    const tabs = [...document.querySelectorAll('.sva-tab')].map((t) => t.getBoundingClientRect());
    const status = document.querySelector('.sva-appstatus').getBoundingClientRect();
    const firstRowBottom = bar.firstElementChild.getBoundingClientRect().bottom;
    return { height: Math.round(bar.getBoundingClientRect().height), oneRow: tabs.every((t) => t.top < firstRowBottom) && status.top < firstRowBottom, name: name.innerText.trim(), cut: name.scrollWidth > name.clientWidth };
  });
/**
 * The Experimental label on the corner of the Overview tab, where the app
 * draws one: its word and its sentence, then the panel it opens, with a still.
 */
async function cornerLabel(page, file) {
  if (!(await page.locator('.sva-corner .sv-status-label').count())) return null;
  const r = await page.evaluate(() => {
    const b = document.querySelector('.sva-corner .sv-status-label');
    return { word: b.querySelector('.sv-status-word').textContent.trim(), says: b.querySelector('.sv-status-tip').textContent.replace(/\s+/g, ' ').trim() };
  });
  await page.click('.sva-corner .sv-status-label');
  await page.waitForSelector('.sva-corner .sv-status-panel', { state: 'visible' });
  await page.waitForTimeout(300);
  Object.assign(
    r,
    await page.evaluate(() => {
      const p = document.querySelector('.sva-corner .sv-status-panel');
      return {
        heading: p.querySelector('.sv-status-heading').textContent.trim(),
        text: [...p.querySelectorAll('.sv-status-text:not(.sv-status-foot)')].map((e) => e.textContent.replace(/\s+/g, ' ').trim())
      };
    })
  );
  const label = await box(page, '.sva-corner .sv-status-label');
  const panel = await box(page, '.sva-corner .sv-status-panel');
  const sentence = await box(page, '.sva-corner .sv-status-panel .sv-status-text');
  r.still = await still(page, file, { x: 0, y: 0, width: W, height: Math.min(H, panel.y + panel.height + 18) }, [label && { ...label, dx: -16 }, sentence && { ...sentence, dx: -25, dy: 10 }]);
  await page.click('.sva-corner .sv-status-close');
  await page.waitForTimeout(250);
  return r;
}

async function readMenu(page) {
  await page.click('.sva-studychip');
  await page.waitForSelector('.sva-chip-menu');
  return page.evaluate(() => ({
    label: document.querySelector('.sva-chip-menu .sva-chip-label')?.innerText.trim(),
    items: [...document.querySelectorAll('.sva-chip-menu .sva-chip-item')].map((b) => ({
      name: b.querySelector('.sva-chip-study')?.innerText.trim(),
      size: b.querySelector('small')?.innerText.trim(),
      kind: b.querySelector('.sva-kind')?.innerText.trim(),
      inUse: b.getAttribute('aria-current') === 'true'
    })),
    foot: [...document.querySelectorAll('.sva-chip-menu .sva-chip-foot button')].map((b) => b.innerText.trim())
  }));
}
const closeMenu = async (page) => {
  await page.keyboard.press('Escape');
  await page.waitForTimeout(150);
  if (await page.locator('.sva-chip-pop').count()) await page.mouse.click(page.viewportSize().width - 40, H - 40);
  await page.waitForTimeout(150);
};
async function chooseStudy(page, name) {
  await page.click('.sva-studychip');
  await page.waitForSelector('.sva-chip-menu');
  await page.locator('.sva-chip-menu .sva-chip-item', { has: page.locator(`.sva-chip-study:text-is("${name}")`) }).click();
  await page.waitForFunction((n) => (document.querySelector('.sva-studychip')?.innerText || '').includes(n), name, { timeout: 60000 });
  await page.waitForTimeout(1200);
}
const openOverview = async (page) => {
  await page.click('button.sva-item:has-text("Overview")');
  await page.waitForTimeout(1500);
};
async function section(page, sec, sub) {
  await page.locator(`button.sv-view:text-is("${sec}")`).first().click();
  await page.waitForTimeout(700);
  if (sub) {
    await page.locator(`button.sv-view:text-is("${sub}")`).last().click();
    await page.waitForTimeout(1000);
  }
}
/** What an app says of itself and of its studies, read the same way on both apps. */
async function describe(page) {
  const d = {};
  d.title = await title(page);
  d.brand = await page.evaluate(() => {
    const b = document.querySelector('.sva-brand');
    return b ? { tag: b.tagName.toLowerCase(), href: b.getAttribute('href'), text: b.innerText.replace(/\s+/g, ' ').trim() } : null;
  });
  d.footer = await footer(page);
  d.version = d.footer[d.footer.length - 1];
  d.links = await page.evaluate(() => [...document.querySelectorAll('footer a')].map((x) => ({ text: x.innerText.trim(), href: x.href })));
  d.status = flat(await page.evaluate(() => document.querySelector('.sv-status-label')?.innerText));
  d.tabs = await tabs(page);
  d.count = await count(page);
  d.items = {};
  for (const t of d.tabs.filter((x) => !/^RBQM/.test(x))) {
    await page.locator('.sva-tab', { hasText: t.replace(/ \d+( OF \d+)?$/, '') }).first().click();
    await page.waitForTimeout(500);
    d.items[t] = (await items(page)).filter((x) => x !== 'Overview');
  }
  d.menu = await readMenu(page);
  await closeMenu(page);
  await page.click('.sva-studychip');
  await page.click('.sva-chip-menu [data-action="all-studies"]');
  await page.waitForTimeout(1000);
  d.studies = {
    title: await title(page),
    ways: await page.evaluate(() => [...document.querySelectorAll('.sva-studies-way')].map((c) => ({ head: c.querySelector('strong').innerText.trim(), button: c.querySelector('button').innerText.trim() }))),
    rows: await page.evaluate(() => [...document.querySelectorAll('.sva-studies-row:not(.sva-studies-top)')].map((row) => ({ name: row.querySelector('strong').innerText.trim(), kind: (row.querySelector('.sva-kind')?.innerText || '').trim(), size: row.children[2].innerText.trim() })))
  };
  return d;
}

// ---------------------------------------------------------------- 1. its own home and name
async function partHome(browser) {
  const r = {};
  const t = await open(browser, BASE);
  const { page } = t;
  r.url = BASE;
  r.title = await title(page);
  r.brand = await page.evaluate(() => {
    const b = document.querySelector('.sva-brand');
    return b ? { tag: b.tagName.toLowerCase(), href: b.getAttribute('href'), text: b.innerText.replace(/\s+/g, ' ').trim() } : null;
  });
  r.footer = await footer(page);
  r.version = r.footer[r.footer.length - 1];
  r.pitch = flat(await page.evaluate(() => document.querySelector('footer .sva-pitch')?.innerText));
  r.links = await page.evaluate(() => [...document.querySelectorAll('footer a')].map((x) => ({ text: x.innerText.trim(), href: x.href })));
  r.scripts = await page.evaluate(() => [...document.scripts].map((s) => s.src).filter(Boolean).map((s) => s.split('/').slice(-1)[0]));
  r.status = flat(await page.evaluate(() => document.querySelector('.sv-status-label')?.innerText));
  const brand = await box(page, '.sva-brand');
  r.still = await still(page, 'home.png', { x: 0, y: 0, width: W, height: 560 }, [brand && { ...brand, dy: brand.height + 10 }]);

  // The status label, pressed: what the app says of itself. The panel's words come from the chart bundle.
  await page.click('.sv-status-label');
  await page.waitForSelector('.sv-status-panel', { state: 'visible' });
  await page.waitForTimeout(300);
  r.statusPanel = await page.evaluate(() => ({
    heading: document.querySelector('.sv-status-panel .sv-status-heading')?.innerText.trim(),
    text: [...document.querySelectorAll('.sv-status-panel .sv-status-text')].map((e) => e.innerText.replace(/\s+/g, ' ').trim()),
    rungs: [...document.querySelectorAll('.sv-status-panel .sv-status-rung')].map((e) => e.innerText.replace(/\s+/g, ' ').trim())
  }));
  r.statusPanel.all = flat(await page.evaluate(() => document.querySelector('.sv-status-panel')?.innerText));
  {
    const panelBox = await box(page, '.sv-status-panel');
    const named = await page.evaluate(() => {
      const e = [...document.querySelectorAll('.sv-status-panel *')].filter((x) => x.children.length === 0 && /Nothing in safety\.viz is/.test(x.textContent)).pop();
      if (!e) return null;
      const b = e.getBoundingClientRect();
      return { x: b.left, y: b.top, width: b.width, height: b.height };
    });
    r.statusStill = await still(page, 'status-panel.png', pad({ x: panelBox.x, y: 0, width: panelBox.width, height: panelBox.y + panelBox.height }, 12), [named && { ...named, dx: -10 }]);
  }
  await page.click('.sv-status-close');
  await page.waitForTimeout(200);

  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(400);
  const f = await box(page, 'footer');
  const ver = await box(page, 'footer .sva-version');
  const docs = await locBox(page.locator('footer a').first());
  r.footerStill = await still(page, 'footer.png', { x: 0, y: f.y - 6, width: W, height: Math.min(H - f.y + 6, f.height + 6) }, [ver && { ...ver, dy: -8 }, docs && { ...docs, dy: -8 }]);
  const link = (re) => r.links.find((l) => re.test(l.text)) || {};
  check('the wordmark reads study.viz', r.brand && /^study\.viz/.test(r.brand.text), r.brand);
  check('the wordmark is not a link', r.brand && r.brand.tag !== 'a' && !r.brand.href, r.brand);
  check('the browser tab is titled study.viz demo', / · study\.viz demo$/.test(r.title), r.title);
  check('the footer reads study.viz 0.1.0 · safety.viz 1.13.0', r.version === 'study.viz 0.1.0 · safety.viz 1.13.0', r.version);
  check('the footer’s docs link says the docs are safety.viz’s', /^safety\.viz chart docs/i.test(link(/docs/i).text || '') && /jwildfire\.github\.io\/safety\.viz\//.test(link(/docs/i).href || ''), link(/docs/i));
  check('Source on GitHub leads to the study.viz repository', /github\.com\/jwildfire\/study\.viz$/.test(link(/source/i).href || ''), link(/source/i).href);
  check('the footer says what starting R downloads, and from where', /webr\.r-wasm\.org/.test(r.pitch) && /repo\.r-wasm\.org/.test(r.pitch) && /never uploaded/.test(r.pitch), r.pitch);
  check('the status panel names safety.viz, not study.viz, in its line on regulated use', /Validated for regulated use\. Nothing in safety\.viz is, yet\./.test(r.statusPanel.all) && !/Nothing in study\.viz/.test(r.statusPanel.all), r.statusPanel.text);
  r.errors = t.errors;
  await t.context.close();

  // The header 1,280 pixels wide, on every study in the list.
  const w = await open(browser, BASE, HEADER_WIDTH);
  r.header = {};
  for (const name of HEADER_STUDIES) {
    if (name !== 'Pilot study') await chooseStudy(w.page, name);
    r.header[name] = await readHeader(w.page);
    if (name === PROTOCOL_STUDY) {
      // No markers: the row under the header is full of words, and a marker would cover them.
      r.headerStill = await still(w.page, 'header-1280.png', { x: 0, y: 0, width: HEADER_WIDTH, height: 100 });
    }
  }
  r.errors = r.errors.concat(w.errors);
  await w.context.close();
  check('at 1,280 pixels the header is one row on every study', HEADER_STUDIES.every((n) => r.header[n].oneRow), Object.fromEntries(HEADER_STUDIES.map((n) => [n, r.header[n].height])));
  return r;
}

// ---------------------------------------------------------------- 2. the same app as safety.viz's demo
async function partSame(browser) {
  const r = { compare: COMPARE };
  const mine = await open(browser, BASE);
  r.here = await describe(mine.page);
  const theirs = await open(browser, COMPARE);
  r.there = await describe(theirs.page);
  await theirs.context.close();

  check('the same tabs as the safety.viz demo', same(r.here.tabs, r.there.tabs), r.here.tabs);
  check('the same charts under each tab', same(r.here.items, r.there.items), Object.fromEntries(Object.entries(r.here.items).map(([k, v]) => [k, v.length])));
  check('the same list of studies under the chip', same(r.here.menu, r.there.menu), r.here.menu.items.map((i) => i.name));
  check('the same Studies page', same(r.here.studies.ways, r.there.studies.ways) && same(r.here.studies.rows, r.there.studies.rows), r.here.studies.rows.length);
  check('the same count of charts ready on the study it opens with', r.here.count === r.there.count, r.here.count);
  check('both footers name the same chart bundle', r.here.version.split(' · ').pop() === r.there.version, { here: r.here.version, there: r.there.version });

  const { page } = mine;
  r.studiesStill = await still(page, 'studies.png', { x: 0, y: 0, width: W, height: 640 });
  await page.locator('.sva-tab', { hasText: 'Labs and vitals' }).first().click();
  await page.waitForTimeout(600);
  await page.locator('.sva-item', { hasText: 'Hepatic Explorer' }).first().click();
  await page.waitForTimeout(2500);
  r.chart = { title: await title(page) };
  r.chart.still = await still(page, 'chart.png', { x: 0, y: 0, width: W, height: 640 });
  await page.click('.sva-studychip');
  await page.waitForSelector('.sva-chip-menu');
  const menuBox = await box(page, '.sva-chip-menu');
  r.menuStill = await still(page, 'chip-menu.png', { x: 0, y: 0, width: Math.max(760, menuBox.x + menuBox.width + 40), height: menuBox.y + menuBox.height + 18 });
  await closeMenu(page);
  r.errors = mine.errors.concat(theirs.errors);
  await mine.context.close();
  return r;
}

// ---------------------------------------------------------------- 3. the chip: the Simulated mark, the card, a failed open
async function partChip(browser) {
  const r = {};
  const t = await open(browser, BASE);
  const { page } = t;
  await page.click('.sva-item:has-text("Outlier Explorer")');
  await page.waitForTimeout(1500);
  r.before = { title: await title(page), chip: await chip(page), snap: await chipSnap(page) };
  await chooseStudy(page, PROTOCOL_STUDY);
  r.after = { title: await title(page), chip: await chip(page), snap: await chipSnap(page), spoken: await page.evaluate(() => document.querySelector('.sva-studychip').getAttribute('aria-label')), r: t.rCount() };
  // The chip close up: the line under the study's name. No marker: there is no clear space beside the chip.
  r.after.still = await still(page, 'chip-simulated.png', { x: 0, y: 0, width: 720, height: 100 });
  await page.click('.sva-chip-info');
  await page.waitForSelector('.sva-chip-card');
  r.card = await readCard(page);
  {
    const cardBox = await box(page, '.sva-chip-card');
    const mark = (re) =>
      page.evaluate((src) => {
        const e = [...document.querySelectorAll('.sva-chip-card dt, .sva-chip-card p')].find((x) => new RegExp(src).test(x.innerText));
        if (!e) return null;
        const b = e.getBoundingClientRect();
        return { x: b.left, y: b.top, width: b.width, height: b.height };
      }, re);
    const madeBy = await mark('^Made by$');
    const credit = await mark('DDF-RA');
    r.cardStill = await still(page, 'card-simulated.png', { x: 0, y: 0, width: Math.max(760, cardBox.x + cardBox.width + 40), height: Math.min(H, cardBox.y + cardBox.height + 18) }, [madeBy && { ...madeBy, dx: -27 }, credit && { ...credit, dx: -27, dy: 12 }]);
  }
  await closeMenu(page);
  check('on a chart tab the chip marks a simulated study Simulated, and says which snapshot is drawn', /^Simulated · Snapshot \d+ of \d+$/.test(r.after.snap || '') && /Outlier Explorer/.test(r.after.title), { chip: r.after.snap, tab: r.after.title });
  check('the chip of a demo study has no such line', r.before.snap === null, { study: r.before.chip, line: r.before.snap });
  check('choosing a study keeps the tab you were on', r.before.title === r.after.title && r.after.chip === PROTOCOL_STUDY, { before: r.before.title, after: r.after.title });
  check('a ready-made simulated study opens with no R', r.after.r.runtime === 0 && r.after.r.packages === 0, r.after.r);
  check('the card of a simulated study says what made it: a modified copy of gsm.datasim 2.1.0', r.card.facts['Made by'] === 'a modified copy of gsm.datasim 2.1.0', r.card.facts['Made by']);
  check('the card of a study that followed a protocol carries CDISC’s attribution', r.card.credit.some((l) => /DDF-RA/.test(l) && /CC-BY-4\.0/.test(l)), r.card.credit);
  r.errors = t.errors;
  await t.context.close();

  // A study that does not open. Its file is stopped on the way to the page, as a dropped connection would stop it.
  const f = await open(browser, BASE);
  await f.page.click('.sva-item:has-text("Outlier Explorer")');
  await f.page.waitForTimeout(1200);
  await f.page.route(BLOCKED_FILE, (route) => route.abort('internetdisconnected'));
  await f.page.click('.sva-studychip');
  await f.page.waitForSelector('.sva-chip-menu');
  await f.page.locator('.sva-chip-menu .sva-chip-item', { has: f.page.locator(`.sva-chip-study:text-is("${BLOCKED_STUDY}")`) }).click();
  await f.page.waitForSelector('.sva-chip-said.sva-problem', { timeout: 30000 });
  await f.page.waitForTimeout(600);
  r.failed = {
    study: BLOCKED_STUDY,
    said: flat(await f.page.evaluate(() => document.querySelector('.sva-chip-said.sva-problem').innerText)),
    role: await f.page.evaluate(() => document.querySelector('.sva-chip-said.sva-problem').getAttribute('role')),
    chip: await chip(f.page),
    title: await title(f.page)
  };
  const saidBox = await box(f.page, '.sva-chip-said.sva-problem');
  r.failed.still = await still(f.page, 'open-failed.png', { x: 0, y: 0, width: Math.max(760, saidBox.x + saidBox.width + 60), height: saidBox.y + saidBox.height + 40 }, [{ ...saidBox, dx: saidBox.width + 14 }]);
  await f.page.unroute(BLOCKED_FILE);
  await chooseStudy(f.page, BLOCKED_STUDY);
  r.failed.then = { chip: await chip(f.page), said: await f.page.locator('.sva-chip-said.sva-problem').count() };
  check('a study that does not open is said under the chip, and the study in use stays', r.failed.said.startsWith(`${BLOCKED_STUDY} did not open. `) && r.failed.said.endsWith(' The study in use is unchanged.') && r.failed.role === 'alert' && r.failed.chip === 'Pilot study', r.failed);
  check('the same study opens once its file can be fetched', r.failed.then.chip === BLOCKED_STUDY && r.failed.then.said === 0, r.failed.then);
  // The errors this page raised are the stopped file itself.
  r.failed.errors = f.errors;
  r.errors = r.errors.concat(f.errors.filter((e) => !/ERR_INTERNET_DISCONNECTED/.test(e)));
  await f.context.close();
  return r;
}

// ---------------------------------------------------------------- 4. the study view in sections
async function partSections(browser) {
  const r = {};
  const t = await open(browser, BASE);
  const { page } = t;
  await chooseStudy(page, PROTOCOL_STUDY);
  await openOverview(page);
  r.title = await title(page);
  r.all = await views(page);
  r.sections = r.all.filter((v) => SECTIONS.includes(v));
  r.facts = await page.evaluate(() => {
    let row = null;
    for (const el of document.querySelectorAll('*')) if (el.children.length >= 4 && el.children.length <= 12 && /^Phase \d/.test((el.children[0].innerText || '').trim())) row = el;
    return row ? [...row.children].map((c) => c.innerText.replace(/\s+/g, ' ').trim()).filter((s) => s && !/^Snapshot/.test(s)) : [];
  });
  r.layers = await page.evaluate(() => [...document.querySelectorAll('button.sv-group')].map((b) => b.innerText.replace(/\s+/g, ' ').trim()));
  r.ready = await count(page);
  r.chipSnap = await chipSnap(page);
  r.r = t.rCount();
  const first = await locBox(page.locator('button.sv-view:text-is("Overview")'));
  const pane = { x: 250, y: Math.max(0, first.y - 14), width: W - 250 - 18, height: H - Math.max(0, first.y - 14) };

  // The Experimental label on the corner of a simulated study's view.
  r.label = await cornerLabel(page, 'view-experimental.png');
  check('the view of a simulated study carries the Experimental label, with a sentence', !!r.label && r.label.word === 'Experimental' && /^Experimental: /.test(r.label.says) && /study\.builder/.test(r.label.says) && r.label.text[0] === r.label.says, r.label && { word: r.label.word, heading: r.label.heading, says: r.label.says });
  check('study.viz’s Experimental sentence leaves out “new in 1.13”', !!r.label && !/new in 1\.13/i.test(r.label.says + r.label.text.join(' ')), r.label && r.label.says);

  // The study's own notes, folded under the Overview section.
  {
    const fold = page.locator('details.sb-caveats');
    r.notes = { summary: flat(await fold.locator('summary').innerText()), openAtFirst: await fold.evaluate((d) => d.open) };
    if (!r.notes.openAtFirst) await fold.locator('summary').click();
    await page.waitForTimeout(400);
    r.notes.items = await fold.evaluate((d) => [...d.querySelectorAll('li')].map((li) => li.innerText.replace(/\s+/g, ' ').trim()));
    await fold.evaluate((d) => {
      d.scrollIntoView({ block: 'start', behavior: 'instant' });
      window.scrollBy({ top: -90, behavior: 'instant' });
    });
    await page.waitForTimeout(300);
    const foldBox = await locBox(fold);
    const firstItem = await locBox(fold.locator('li').first());
    const naming = r.notes.items.filter((x) => /gsm\.datasim/.test(x));
    r.notes.naming = naming.length;
    r.notes.still = await still(page, 'view-notes.png', { x: foldBox.x - 34, y: foldBox.y - 12, width: foldBox.width + 46, height: Math.min(foldBox.height + 24, 330) }, [firstItem && { ...firstItem, dx: -26, dy: 11 }]);
    check('every sentence of a simulated study’s notes that names gsm.datasim names the modified copy', naming.length > 0 && naming.every((x) => /\b(the|a) modified copy of gsm\.datasim/i.test(x)), { sentences: r.notes.items.length, naming: naming.length, first: r.notes.items[0] });
    await fold.locator('summary').click();
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(300);
  }

  r.subviews = {};
  r.walk = [];
  for (const [sec, sub, file] of SECTION_STILLS) {
    await section(page, sec, sub);
    const all = await views(page);
    r.subviews[sec] = all.slice(SECTIONS.length);
    const heads = await page.evaluate(() => [...document.querySelectorAll('h4')].filter((h) => h.offsetParent).map((h) => h.innerText.replace(/\s+/g, ' ').trim()).slice(0, 6));
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    r.walk.push({ section: sec, view: sub, heads, overflow, attributions: await attributions(page), still: await still(page, file, sec === 'Overview' ? null : pane) });
  }
  // The foot of the Schedule view: the grid, and the attribution under it.
  await section(page, 'Design', 'Schedule');
  {
    const line = page.locator('main .sb-attribution').first();
    if (await line.count()) {
      await line.evaluate((e) => e.scrollIntoView({ block: 'center', behavior: 'instant' }));
      await page.waitForTimeout(300);
      const lb = await locBox(line);
      r.scheduleCredit = { text: flat(await line.innerText()) };
      r.scheduleCredit.still = await still(page, 'schedule-credit.png', { x: lb.x - 36, y: lb.y - 160, width: lb.width + 48, height: 160 + lb.height + 16 }, [{ ...lb, dx: -19, dy: 10 }]);
    }
    await page.evaluate(() => window.scrollTo(0, 0));
  }
  const inSchedule = r.walk.find((w) => w.view === 'Schedule').attributions;
  check('the Schedule view carries CDISC’s attribution, once, under the grid', inSchedule.length === 1 && inSchedule[0].after === 'the schedule grid' && !!r.scheduleCredit, inSchedule);
  check('a simulated study that followed a protocol is shown in five sections', same(r.sections, SECTIONS), r.all);
  check('Design, Data and Reporting each have a second row of views', same(r.subviews.Design, ['Protocol', 'Schedule']) && same(r.subviews.Data, ['Pipeline', 'Tables', 'Columns']) && same(r.subviews.Reporting, ['Efficacy', 'Adverse events']), r.subviews);
  check('the study view has no RBQM or Safety view of its own', !Object.values(r.subviews).flat().concat(r.all).some((v) => /rbqm|safety/i.test(v)));
  check('the study view stays inside a page 1,400 wide', r.walk.every((w) => w.overflow <= 0), r.walk.map((w) => w.overflow));
  check('the ready-made study opened with no R', r.r.runtime === 0 && r.r.packages === 0, r.r);
  r.errors = t.errors;
  await t.context.close();
  return r;
}

// ---------------------------------------------------------------- 5. the names the app saves files under
/** Press a button and read the name the browser is offered the file under. The file is not kept. */
async function savedName(page, locator) {
  const [download] = await Promise.all([page.waitForEvent('download', { timeout: 20000 }), locator.first().click()]);
  const name = download.suggestedFilename();
  await download.cancel().catch(() => {});
  return name;
}
async function partSaved(browser) {
  const r = {};
  const t = await open(browser, BASE);
  const { page } = t;
  const read = async () => {
    await openOverview(page);
    await page.click('[data-action="files"]');
    await page.waitForTimeout(900);
    const mapping = await savedName(page, page.locator('[data-action="download-mapping"]:visible'));
    const d = page.locator('details.sva-file-details').first();
    const file = await d.getAttribute('data-details');
    await d.locator('summary').click();
    await page.waitForTimeout(500);
    const csv = await savedName(page, d.locator('button:has-text("Download CSV")'));
    await d.locator('summary').click();
    return { study: await chip(page), mapping, file, csv };
  };
  r.demo = await read();
  await chooseStudy(page, PROTOCOL_STUDY);
  r.simulated = await read();
  check('with a demo study in use, the mapping file is study-viz-mapping.json', r.demo.mapping === 'study-viz-mapping.json', r.demo);
  check('with a simulated study in use, the mapping file is simulated-study-viz-mapping.json', r.simulated.mapping === 'simulated-study-viz-mapping.json', r.simulated);
  check('with a simulated study in use, Download CSV saves a file named simulated-', /^simulated-/.test(r.simulated.csv) && !/^simulated-/.test(r.demo.csv), { demo: r.demo.csv, simulated: r.simulated.csv });
  r.errors = t.errors;
  await t.context.close();
  return r;
}

// ---------------------------------------------------------------- 6. the snapshot chosen, with real R
const readRbqm = (page) =>
  page.evaluate(() => ({
    count: (document.querySelector('.sva-rbqm-overview .sva-rbqm-count, .sva-rbqm-count')?.innerText || '').replace(/\s+/g, ' ').trim(),
    sites: document.querySelectorAll('.sva-rbqm-table tbody tr').length
  }));
async function startRbqm(page, rCount) {
  await page.click('button.sva-view-tab');
  await page.waitForTimeout(1500);
  const before = { tab: await rbqmTab(page), startButton: (await page.locator('button:text-is("Start R")').count()) > 0 };
  before.words = flat(await bodyText(page)).match(/Site metrics need R[^.]*?START R|The site metrics cannot be worked out without R\.[^.]*\.[^.]*\./g) || [];
  const r0 = rCount();
  const t0 = Date.now();
  if (before.startButton) await page.locator('button:text-is("Start R")').first().click();
  while (Date.now() - t0 < 300000) {
    await page.waitForTimeout(500);
    if (/\d+ OF \d+/i.test(await rbqmTab(page))) break;
  }
  await page.waitForTimeout(1500);
  const r1 = rCount();
  const said = flat(await bodyText(page)).match(/R ran \d+ of \d+ metrics.*?seconds\./);
  return { before, seconds: +((Date.now() - t0) / 1000).toFixed(1), runtime: r1.runtime - r0.runtime, packages: r1.packages - r0.packages, tab: await rbqmTab(page), said: said ? said[0] : null };
}
async function partSnapshot(browser) {
  const r = {};
  const t = await open(browser, BASE);
  const { page } = t;
  await chooseStudy(page, PROTOCOL_STUDY);
  await openOverview(page);
  r.last = { snap: await chipSnap(page) };
  r.options = await page.evaluate(() => [...document.querySelector('select[name=snapshot]').options].map((o) => o.text));
  await page.selectOption('select[name=snapshot]', { index: PICK });
  await page.waitForTimeout(2000);
  r.chosen = { option: r.options[PICK], snap: await chipSnap(page) };
  r.rbqm = await startRbqm(page, t.rCount);
  r.rbqm.read = await readRbqm(page);
  r.rbqm.snap = await chipSnap(page);
  await page.click('.sva-rbqm-details');
  await page.waitForSelector('.sva-r-panel', { state: 'visible' });
  await page.waitForTimeout(400);
  r.rbqm.details = await page.evaluate(() => {
    const p = document.querySelector('.sva-r-panel');
    return {
      heading: p.querySelector('.sva-r-heading').innerText.trim(),
      text: p.querySelector('.sva-r-text').innerText.replace(/\s+/g, ' ').trim(),
      versions: Object.fromEntries([...p.querySelectorAll('dl.sva-r-list dt')].map((dt) => [dt.textContent.trim(), dt.nextElementSibling.textContent.replace(/\s+/g, ' ').trim()]))
    };
  });
  {
    const panel = await box(page, '.sva-r-panel');
    const snapDt = await page.evaluate(() => {
      const dt = [...document.querySelectorAll('.sva-r-panel dl.sva-r-list dt')].find((x) => x.textContent.trim() === 'Snapshot');
      if (!dt) return null;
      const b = dt.getBoundingClientRect();
      return { x: b.left, y: b.top, width: b.width, height: b.height };
    });
    r.rbqm.detailsStill = await still(page, 'snapshot-rbqm-details.png', { x: 0, y: 0, width: W, height: Math.min(H, panel.y + panel.height + 16) }, [snapDt && { ...snapDt, dx: -22 }]);
  }
  await page.click('.sva-r-panel .sva-r-x');
  const day = String(r.chosen.option).split(' · ')[0];
  check('choosing a snapshot changes what the chip says', r.last.snap === `Simulated · Snapshot ${r.options.length} of ${r.options.length}` && r.chosen.snap === `Simulated · Snapshot ${PICK + 1} of ${r.options.length}`, { last: r.last.snap, chosen: r.chosen.snap });
  check('the RBQM tab’s Run details names the snapshot chosen, by its date', r.rbqm.details.versions.Snapshot === `${day} · snapshot ${PICK + 1} of ${r.options.length} of the study`, { snapshot: r.rbqm.details.versions.Snapshot, chosen: r.chosen.option });
  check('the RBQM tab runs every site metric on the snapshot chosen', /8 OF 8/i.test(r.rbqm.tab), { tab: r.rbqm.tab, said: r.rbqm.said });
  r.errors = t.errors;
  await t.context.close();
  return r;
}

// ---------------------------------------------------------------- 7. one build, with real R
async function partBuild(browser) {
  const r = {};
  const t = await open(browser, BASE);
  const { page } = t;
  await page.click('.sva-studychip');
  await page.click('.sva-chip-menu [data-action="add-study"]');
  await page.waitForTimeout(900);
  await page.locator('button:text-is("Describe a study")').click();
  await page.waitForSelector('[data-action="build"]', { timeout: 30000 });
  await page.waitForTimeout(1200);
  r.form = {
    heads: await page.evaluate(() => [...document.querySelectorAll('h2, h3')].filter((h) => h.offsetParent && !h.closest('header') && !h.closest('aside.sva-side')).map((h) => h.innerText.replace(/\s+/g, ' ').trim())),
    protocols: await page.evaluate(() => [...document.querySelectorAll('[data-action="try-protocol"]')].map((b) => b.innerText.trim())),
    terms: flat(await page.evaluate(() => [...document.querySelectorAll('main p')].filter((e) => e.offsetParent && /MedDRA/.test(e.innerText)).map((e) => e.innerText)[0] || ''))
  };
  // The Experimental label on the corner of Build a study.
  r.form.label = await cornerLabel(page, 'builder-experimental.png');
  check('Build a study carries the Experimental label, with a sentence', !!r.form.label && r.form.label.word === 'Experimental' && /^Experimental: /.test(r.form.label.says) && /study\.builder/.test(r.form.label.says) && r.form.label.text[0] === r.form.label.says, r.form.label && { word: r.form.label.word, heading: r.form.label.heading, says: r.form.label.says });
  check('study.viz’s Experimental sentence on Build a study leaves out “new in 1.13”', !!r.form.label && !/new in 1\.13/i.test(r.form.label.says + r.form.label.text.join(' ')), r.form.label && r.form.label.says);
  // CDISC's attribution, under the example protocols.
  r.form.credits = await attributions(page);
  r.form.credit = r.form.credits.length ? r.form.credits[0].text : '';
  {
    const creditBox = await page.evaluate(() => {
      const e = [...document.querySelectorAll('main p, main div')].filter((x) => x.offsetParent && /DDF-RA/.test(x.innerText) && ![...x.children].some((c) => /DDF-RA/.test(c.innerText)))[0];
      if (!e) return null;
      e.scrollIntoView({ block: 'center', behavior: 'instant' });
      return true;
    });
    await page.waitForTimeout(300);
    if (creditBox) {
      const cb = await page.evaluate(() => {
        const e = [...document.querySelectorAll('main p, main div')].filter((x) => x.offsetParent && /DDF-RA/.test(x.innerText) && ![...x.children].some((c) => /DDF-RA/.test(c.innerText)))[0];
        const b = e.getBoundingClientRect();
        return { x: b.left, y: b.top, width: b.width, height: b.height };
      });
      const ask = await box(page, '.sb-protocol-ask');
      const both = union(cb, ask);
      r.form.creditStill = await still(page, 'builder-credit.png', { x: both.x - 36, y: both.y - 12, width: both.width + 48, height: both.height + 24 }, [{ ...cb, dx: -19, dy: 10 }]);
    }
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(300);
  }
  check('CDISC’s attribution is inside the builder, once, under the example protocols', r.form.credits.length === 1 && r.form.credits[0].after === 'the example protocols' && /DDF-RA/.test(r.form.credit) && /CC-BY-4\.0/.test(r.form.credit), r.form.credits);
  check('the builder names the simulator as a modified copy of gsm.datasim', /modified copy of gsm\.datasim/.test(r.form.terms), r.form.terms);

  await page.fill('input[name=name]', BUILT_NAME);
  await page.keyboard.press('Tab');
  await page.evaluate((p) => {
    const lab = [...document.querySelectorAll('*')].find((e) => e.children.length === 0 && /^Phase/.test(e.textContent.trim()));
    const b = lab && [...lab.parentElement.querySelectorAll('button')].find((x) => x.innerText.trim() === p);
    if (b) b.click();
  }, BUILD.phase);
  await page.waitForTimeout(500);
  r.set = {};
  for (const k of ['participants', 'sites', 'months', 'seed']) {
    const sel = `input[name=${k}]`;
    await page.click(sel, { clickCount: 3 });
    await page.keyboard.type(String(BUILD[k]));
    await page.keyboard.press('Tab');
    await page.waitForTimeout(350);
    r.set[k] = await page.evaluate((s) => document.querySelector(s).value, sel);
  }
  const r0 = t.rCount();
  const t0 = Date.now();
  await page.click('[data-action="build"]');
  await page.waitForFunction(() => [...document.querySelectorAll('h3')].some((x) => /^building/i.test(x.innerText.trim())), null, { timeout: 15000 });
  r.steps = await page.evaluate(() => [...document.querySelectorAll('ol.sb-steps li')].map((li) => li.innerText.replace(/\s+/g, ' ').trim()));
  await page.waitForFunction(() => [...document.querySelectorAll('button')].some((b) => b.offsetParent && /^load into the demo$/i.test(b.innerText.trim())), null, { timeout: 420000 });
  const r1 = t.rCount();
  r.build = { seconds: +((Date.now() - t0) / 1000).toFixed(1), runtime: r1.runtime - r0.runtime, packages: r1.packages - r0.packages };
  await page.waitForTimeout(800);
  r.built = await page.evaluate(() => {
    const badge = [...document.querySelectorAll('*')].find((e) => e.children.length === 0 && /^built in /i.test(e.textContent.trim()));
    const chips = [...document.querySelectorAll('*')].filter((e) => e.children.length >= 4 && /^Phase \d/.test((e.children[0].innerText || '').trim())).pop();
    return { builtIn: badge ? badge.textContent.trim() : null, facts: chips ? [...chips.children].map((c) => c.innerText.replace(/\s+/g, ' ').trim()) : [], sections: [...document.querySelectorAll('button.sv-view')].map((b) => b.innerText.trim()) };
  });
  const load = await locBox(page.locator('button:text-is("Load into the demo")'));
  r.built.still = await still(page, 'built.png', { x: 0, y: 0, width: W, height: 760 }, [load && { ...load, dy: load.height + 12 }]);
  await page.locator('button:text-is("Load into the demo")').click();
  await page.waitForFunction((n) => (document.querySelector('.sva-studychip')?.innerText || '').includes(n), BUILT_NAME, { timeout: 60000 });
  await page.waitForTimeout(2000);
  r.loaded = { chip: await chip(page), snap: await chipSnap(page), title: await title(page), count: await count(page) };
  await page.click('.sva-chip-info');
  await page.waitForSelector('.sva-chip-card');
  r.loaded.card = await readCard(page);
  await closeMenu(page);

  r.rbqm = await startRbqm(page, t.rCount);
  r.rbqm.still = await still(page, 'rbqm.png', { x: 0, y: 0, width: W, height: 470 });
  check('a described study is built by R in the browser', !!r.built.builtIn && r.build.runtime > 0, { seconds: r.build.seconds, builtIn: r.built.builtIn });
  check('the built study has the size that was asked for', r.built.facts.includes(`${BUILD.participants} participants`) && r.built.facts.includes(`${BUILD.sites} sites`), r.built.facts);
  check('Load into the demo makes the built study the study in use', r.loaded.chip === BUILT_NAME, r.loaded);
  check('the card of the built study says what made it', /modified copy of gsm\.datasim/.test(r.loaded.card.facts['Made by'] || ''), r.loaded.card.facts);
  check('the RBQM tab runs every site metric on the built study', /8 OF 8/i.test(r.rbqm.tab), { tab: r.rbqm.tab, said: r.rbqm.said });
  check('the RBQM tab starts no second R after a build', r.rbqm.runtime === 0, r.rbqm);

  // A reload: which study does the app open on? Read, not asserted (study.viz issue 20).
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForSelector('.sva-tab');
  await page.waitForTimeout(1500);
  r.reload = { chip: await chip(page) };
  r.errors = t.errors;
  await t.context.close();
  return r;
}

// ---------------------------------------------------------------- 8. how it is held: the records, read from the repository
const API = 'https://api.github.com/repos/jwildfire/';
const RAW = 'https://raw.githubusercontent.com/jwildfire/';
const UA = { 'User-Agent': 'demo-page-capture', Accept: 'application/vnd.github+json' };
const sha256 = (buf) => crypto.createHash('sha256').update(buf).digest('hex');
async function getJson(url) {
  const res = await fetch(url, { headers: UA });
  if (!res.ok) throw new Error(`${res.status} for ${url}`);
  return res.json();
}
async function getBytes(url) {
  const res = await fetch(url, { headers: { 'User-Agent': UA['User-Agent'] } });
  if (!res.ok) throw new Error(`${res.status} for ${url}`);
  return Buffer.from(await res.arrayBuffer());
}
async function partHeld() {
  const r = {};
  r.commit = capture.site.commit;
  const at = `${RAW}study.viz/${r.commit}/`;
  r.package = JSON.parse(await getBytes(`${at}package.json`)).version;

  // The record of the copied app.
  const source = JSON.parse(await getBytes(`${at}SOURCE.json`));
  const changed = source.files.filter((f) => Array.isArray(f.changes) && f.changes.length);
  r.app = {
    from: source.repository,
    commit: source.commit,
    version: source.version,
    files: source.files.length,
    left: (source.left || []).length,
    withChecksum: source.files.filter((f) => /^[0-9a-f]{64}$/.test(f.sha256 || '')).length,
    changedFiles: changed.length,
    changes: changed.reduce((s, f) => s + f.changes.length, 0),
    withReason: changed.every((f) => f.changes.every((x) => x.reason))
  };
  // A sample of the record, held to the files themselves: the first, the last and every 30th.
  const sample = source.files.filter((_, i) => i === 0 || i === source.files.length - 1 || i % 30 === 0);
  r.app.sample = [];
  for (const f of sample) {
    const bytes = await getBytes(`${at}${f.file}`);
    r.app.sample.push({ file: f.file, match: sha256(bytes) === f.sha256 && bytes.length === f.bytes });
  }

  // The chart bundle: the record, the copy, and safety.viz's own file at the commit the record names.
  const vendor = JSON.parse(await getBytes(`${at}site/vendor/safety.viz/SOURCE.json`));
  const rec = vendor.files.find((f) => /safety\.viz\.esm\.js$/.test(f.file));
  const copy = await getBytes(`${at}site/vendor/safety.viz/${rec.file}`);
  const original = await getBytes(`${RAW}safety.viz/${vendor.commit}/${rec.source}`);
  r.bundle = { version: vendor.version, ref: vendor.ref, commit: vendor.commit, source: rec.source, bytes: rec.bytes, recorded: rec.sha256, copy: sha256(copy), original: sha256(original), copyBytes: copy.length, originalBytes: original.length };
  // Is the bundle's version released? Read from safety.viz's public tags.
  const svTags = await getJson(`${API}safety.viz/tags?per_page=100`);
  r.bundle.tagged = svTags.some((x) => x.name === `v${vendor.version}`);

  const sb = JSON.parse(await getBytes(`${at}site/vendor/study.builder/SOURCE.json`));
  r.builder = { version: sb.version, tag: sb.tag || sb.ref, commit: sb.commit, files: sb.files.length };

  // The browser tests and their stored pictures, counted in the source. Not run here.
  const tree = await getJson(`${API}study.viz/git/trees/${r.commit}?recursive=1`);
  const paths = tree.tree.map((x) => x.path);
  r.tests = { pictures: paths.filter((p) => /^docs\/evidence\/.*\.png$/.test(p)).length };
  const runs = await getJson(`${API}study.viz/commits/${r.commit}/check-runs`);
  r.checkRuns = (runs.check_runs || []).map((x) => ({ name: x.name, status: x.status, conclusion: x.conclusion }));
  const run = await getJson(`${API}study.viz/actions/runs/${TEST_RUN}`);
  r.testRun = { id: TEST_RUN, url: run.html_url, name: run.name, event: run.event, commit: run.head_sha, status: run.status, conclusion: run.conclusion, browserTests: TESTS_RAN, unitTests: UNIT_TESTS };

  check('every copied file is recorded with a checksum', r.app.files > 0 && r.app.withChecksum === r.app.files, { files: r.app.files, commit: r.app.commit.slice(0, 8) });
  check('every listed change carries its reason', r.app.withReason, { changes: r.app.changes, files: r.app.changedFiles });
  check('a sample of the record matches the files', r.app.sample.every((s) => s.match), r.app.sample.filter((s) => !s.match).map((s) => s.file));
  check('the chart bundle and the app’s files name the same safety.viz commit', r.bundle.commit === r.app.commit, { app: r.app.commit.slice(0, 8), bundle: r.bundle.commit.slice(0, 8) });
  check('the chart bundle is safety.viz’s, byte for byte', r.bundle.copy === r.bundle.original && r.bundle.copy === r.bundle.recorded && r.bundle.copyBytes === r.bundle.originalBytes, { sha256: r.bundle.copy.slice(0, 12), bytes: r.bundle.copyBytes, commit: r.bundle.commit.slice(0, 8) });
  check('the check’s run that the page cites passed, on the commit captured', r.testRun.status === 'completed' && r.testRun.conclusion === 'success' && r.testRun.commit === r.commit, { run: r.testRun.id, commit: r.testRun.commit.slice(0, 8), name: r.testRun.name });
  return r;
}

// ---------------------------------------------------------------- run
(async () => {
  capture.site.captured = new Date().toISOString();
  // A build of your own is named in words, not by where it was served from.
  const own = BASE !== RELEASED && BASE !== DEV;
  capture.site.app = own ? null : BASE;
  capture.site.app_is = process.env.BUILD_IS || (BASE === RELEASED ? 'the released app' : BASE === DEV ? 'the dev site' : 'a build of the candidate');
  capture.site.branch = own ? null : BASE === RELEASED ? 'main' : 'dev';
  if (process.env.COMMIT) {
    capture.site.commit = process.env.COMMIT;
  } else {
    const head = await getJson(`${API}study.viz/commits/${capture.site.branch || 'dev'}`);
    capture.site.commit = head.sha;
  }
  capture.build_settings = { name: BUILT_NAME, ...BUILD };

  const browser = await chromium.launch();
  const run = { home: partHome, same: partSame, chip: partChip, sections: partSections, saved: partSaved, snapshot: partSnapshot, build: partBuild, held: partHeld };
  for (const name of ALL_PARTS) {
    part = name;
    if (PARTS.includes(name)) {
      console.log(`\n== ${name}`);
      capture[name] = await run[name](browser);
    } else if (kept[name]) {
      console.log(`\n== ${name}: kept from the capture.json already here`);
      capture[name] = kept[name];
      for (const [k, v] of Object.entries(kept.checks || {})) if (v.part === name) capture.checks[k] = v;
      for (const [k, v] of Object.entries(kept.stills || {})) if (v && v.part === name) capture.stills[k] = v;
    } else {
      check(`the part "${name}" was captured`, false, 'left out by PARTS, and no earlier capture.json holds it');
    }
  }
  part = 'run';
  await browser.close();

  const pageErrors = ALL_PARTS.map((n) => capture[n]).flatMap((p) => (p && p.errors) || []);
  check('no page raised an error while it was walked', pageErrors.length === 0, pageErrors.slice(0, 5));
  // Every host the walk asked anything of. The app's own is named in words.
  const appHost = new URL(BASE).host;
  const asked = [...hosts].map((h) => (h === appHost ? 'the app’s own host' : h)).sort();
  capture.site.hosts = [...new Set([...(PARTS.length === ALL_PARTS.length ? [] : (kept.site && kept.site.hosts) || []), ...asked])].sort();
  const allowed = ['the app’s own host', 'webr.r-wasm.org', 'repo.r-wasm.org', new URL(COMPARE).host];
  check('the app asked only its own host and R’s two', capture.site.hosts.every((h) => allowed.includes(h)), capture.site.hosts);
  for (const f of Object.keys(capture.stills)) if (!fs.existsSync(path.join(media, f))) check(`still present: ${f}`, false);

  fs.writeFileSync(jsonPath, JSON.stringify(capture, null, 1));
  const failed = Object.entries(capture.checks).filter(([, v]) => !v.pass);
  const total = Object.values(capture.stills).reduce((a, b) => a + ((b && b.bytes) || 0), 0);
  console.log(`\n${Object.keys(capture.checks).length - failed.length} of ${Object.keys(capture.checks).length} checks held. ${Object.keys(capture.stills).length} stills, ${(total / 1024).toFixed(0)} KB.`);
  if (failed.length) {
    console.log(`Did not hold: ${failed.map(([n]) => n).join('; ')}`);
    process.exit(1);
  }
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
