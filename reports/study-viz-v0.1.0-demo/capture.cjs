// Captures and checks for the study.viz v0.1.0 demo page: the app under its own
// name, the same studies and tabs as the safety.viz demo it was copied from,
// a simulated study shown in sections, one build with R in the browser, and
// the records that hold the copy.
//
//   node capture.cjs [out dir]        default: the folder this file is in
//
// Run from the root of an `npm ci` checkout of study.viz or safety.viz, for its
// Playwright (or set PLAYWRIGHT to a folder that holds it). Stills go to
// <out dir>/media as PNG, from a 1,400 by 900 window in the light theme.
// Everything read goes to <out dir>/capture.json, with a check of each thing
// the demo page states. The script exits 1 when a check fails. Then
// `node build.cjs` writes index.html from capture.json.
//
//   BASE=<the study.viz app under review>   default: the dev build
//   COMPARE=<the safety.viz demo app>       default: safety.viz's dev build
//   PARTS=home,same,...                     take only these parts again and keep
//                                           the rest from the capture.json here.
//                                           The parts: home, same, sections,
//                                           build, held
//
// The part "sections" needs study.builder v0.5.0 in the build under review. If
// the build still shows the older study view, the part is marked pending, the
// page is built with named placeholders, and this is the command that fills
// them once the build has caught up:
//
//   PARTS=sections node capture.cjs && node build.cjs
//
// The part "build" starts real R in the browser (webR, from webr.r-wasm.org and
// repo.r-wasm.org) and takes a minute or two. The part "held" reads public
// files and the public GitHub API with no token. It reads the commit and the
// result of the check's run the page cites for its browser tests; the count of
// tests is that run's own, given below as TESTS_RAN, because a run's log cannot
// be read without signing in. Nothing is written anywhere
// but <out dir>, and the script signs in to nothing.
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
const ALL_PARTS = ['home', 'same', 'sections', 'build', 'held'];
const PARTS = process.env.PARTS ? process.env.PARTS.split(',').map((p) => p.trim()) : ALL_PARTS;
const out = process.argv[2] || __dirname;
const media = path.join(out, 'media');
fs.mkdirSync(media, { recursive: true });
const jsonPath = path.join(out, 'capture.json');
const kept = fs.existsSync(jsonPath) ? JSON.parse(fs.readFileSync(jsonPath, 'utf8')) : {};

const W = 1400;
const H = 900;
const PROTOCOL_STUDY = 'PILOT-PROTOCOL';
const BUILT_NAME = 'DEMO-BUILT';
// Small numbers, so the one build this script runs is quick.
const BUILD = { phase: '1', participants: 24, sites: 3, months: 3, seed: 11 };
const SECTIONS = ['Overview', 'Design', 'Data', 'One participant', 'Reporting'];
// The run of study.viz's required check that the page cites for its browser tests, and
// the count its log gives ("Running 131 tests", "131 passed"). The script reads the
// run's commit and result from the public API; it cannot read the log, so the count
// is given here. TEST_RUN and TESTS_RAN name another run and its count.
const TEST_RUN = process.env.TEST_RUN || '45853688302';
const TESTS_RAN = Number(process.env.TESTS_RAN || 131);
// The stills of the study view in sections, named here so a pending capture can say which are missing.
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
async function open(browser, url) {
  const context = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1, colorScheme: 'light' });
  const page = await context.newPage();
  const errors = [];
  const r = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (msg) => msg.type() === 'error' && errors.push(msg.text()));
  page.on('request', (req) => /r-wasm\.org/.test(req.url()) && r.push(req.url()));
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.waitForSelector('.sva-tab', { timeout: 60000 });
  await page.waitForTimeout(800);
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

/** A PNG still of a viewport region, with marker positions as percentages of the still. */
async function still(page, name, b, markers = []) {
  const region = b || { x: 0, y: 0, width: W, height: H };
  const x = Math.max(0, Math.floor(region.x));
  const y = Math.max(0, Math.floor(region.y));
  const clip = { x, y, width: Math.ceil(Math.min(region.width + (region.x - x), W - x)), height: Math.ceil(Math.min(region.height + (region.y - y), H - y)) };
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
const chip = (page) => page.evaluate(() => (document.querySelector('.sva-studychip')?.innerText || '').replace(/[▾\s]+/g, ' ').trim());
const tabs = (page) => page.evaluate(() => [...document.querySelectorAll('.sva-tab')].map((b) => b.innerText.replace(/\s+/g, ' ').trim()));
const items = (page) => page.evaluate(() => [...document.querySelectorAll('.sva-item')].filter((b) => b.offsetParent).map((b) => b.innerText.replace(/\s+/g, ' ').trim()));
const count = (page) => page.evaluate(() => (document.querySelector('.sva-count')?.innerText || '').replace(/\s+/g, ' ').trim());
const views = (page) => page.evaluate(() => [...document.querySelectorAll('button.sv-view')].map((b) => b.innerText.trim()));
const rbqmTab = (page) => page.evaluate(() => (document.querySelector('button.sva-view-tab')?.innerText || '').replace(/\s+/g, ' ').trim());
const bodyText = (page) => page.evaluate(() => document.body.innerText);

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
  if (await page.locator('.sva-chip-pop').count()) await page.mouse.click(W - 40, H - 40);
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
  d.footer = await page.evaluate(() => (document.querySelector('footer')?.innerText || '').split('\n').map((l) => l.trim()).filter(Boolean));
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
  r.footer = await page.evaluate(() => (document.querySelector('footer')?.innerText || '').split('\n').map((l) => l.trim()).filter(Boolean));
  r.version = r.footer[r.footer.length - 1];
  r.links = await page.evaluate(() => [...document.querySelectorAll('footer a')].map((x) => ({ text: x.innerText.trim(), href: x.href })));
  r.scripts = await page.evaluate(() => [...document.scripts].map((s) => s.src).filter(Boolean).map((s) => s.split('/').slice(-1)[0]));
  const brand = await box(page, '.sva-brand');
  r.still = await still(page, 'home.png', { x: 0, y: 0, width: W, height: 560 }, [brand && { ...brand, dy: brand.height + 10 }]);
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(400);
  const f = await box(page, 'footer');
  const ver = await page.evaluate(() => {
    const el = [...document.querySelectorAll('footer *')].filter((e) => e.children.length === 0 && /study\.viz \d/.test(e.textContent)).pop();
    if (!el) return null;
    const b = el.getBoundingClientRect();
    return { x: b.left, y: b.top, width: b.width, height: b.height };
  });
  const docs = await locBox(page.locator('footer a').first());
  r.footerStill = await still(page, 'footer.png', { x: 0, y: f.y - 6, width: W, height: Math.min(H - f.y + 6, f.height + 6) }, [ver && { ...ver, dy: -8 }, docs && { ...docs, dy: -8 }]);
  const link = (re) => r.links.find((l) => re.test(l.text)) || {};
  check('the wordmark reads study.viz', r.brand && /^study\.viz/.test(r.brand.text), r.brand);
  check('the wordmark is not a link', r.brand && r.brand.tag !== 'a' && !r.brand.href, r.brand);
  check('the browser tab is titled study.viz demo', / · study\.viz demo$/.test(r.title), r.title);
  check('the footer names study.viz’s version, then the charts’', /^study\.viz \d+\.\d+\.\d+ · safety\.viz \d+\.\d+\.\d+$/.test(r.version), r.version);
  check('the footer’s docs link says the docs are safety.viz’s', /^safety\.viz chart docs/i.test(link(/docs/i).text || '') && /jwildfire\.github\.io\/safety\.viz\//.test(link(/docs/i).href || ''), link(/docs/i));
  check('Source on GitHub leads to the study.viz repository', /github\.com\/jwildfire\/study\.viz$/.test(link(/source/i).href || ''), link(/source/i).href);
  r.errors = t.errors;
  await t.context.close();
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

  // Stills of study.viz: the chip's list, the Studies page, a chart.
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

// ---------------------------------------------------------------- 3. the study view in sections
async function partSections(browser) {
  const r = {};
  const t = await open(browser, BASE);
  const { page } = t;
  await chooseStudy(page, PROTOCOL_STUDY);
  await openOverview(page);
  r.title = await title(page);
  r.all = await views(page);
  r.sections = r.all.filter((v) => SECTIONS.includes(v));
  // The older study view lists every view in one row: Schedule, Efficacy, Pipeline and the rest.
  r.pending = !same(r.all, SECTIONS);
  if (r.pending) {
    console.log(`The build under review still shows the older study view (${r.all.join(', ')}).`);
    console.log(`Pending stills: ${SECTION_STILLS.map((s) => s[2]).join(', ')}. Take them later with: PARTS=sections node capture.cjs && node build.cjs`);
    r.missing = SECTION_STILLS.map(([sec, sub, file]) => ({ section: sec, view: sub, file }));
    r.errors = t.errors;
    await t.context.close();
    return r;
  }
  r.facts = await page.evaluate(() => {
    let row = null;
    for (const el of document.querySelectorAll('*')) if (el.children.length >= 4 && el.children.length <= 12 && /^Phase \d/.test((el.children[0].innerText || '').trim())) row = el;
    return row ? [...row.children].map((c) => c.innerText.replace(/\s+/g, ' ').trim()).filter((s) => s && !/^Snapshot/.test(s)) : [];
  });
  r.layers = await page.evaluate(() => [...document.querySelectorAll('button.sv-group')].map((b) => b.innerText.replace(/\s+/g, ' ').trim()));
  r.ready = await count(page);
  r.r = t.rCount();
  const first = await locBox(page.locator('button.sv-view:text-is("Overview")'));
  const pane = { x: 250, y: Math.max(0, first.y - 14), width: W - 250 - 18, height: H - Math.max(0, first.y - 14) };
  r.subviews = {};
  r.walk = [];
  for (const [sec, sub, file] of SECTION_STILLS) {
    await section(page, sec, sub);
    const all = await views(page);
    r.subviews[sec] = all.slice(SECTIONS.length);
    const heads = await page.evaluate(() => [...document.querySelectorAll('h4')].filter((h) => h.offsetParent).map((h) => h.innerText.replace(/\s+/g, ' ').trim()).slice(0, 6));
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    r.walk.push({ section: sec, view: sub, heads, overflow, still: await still(page, file, sec === 'Overview' ? null : pane) });
  }
  check('a simulated study is shown in five sections', same(r.sections, SECTIONS), r.all);
  check('Design, Data and Reporting each have a second row of views', same(r.subviews.Design, ['Protocol', 'Schedule']) && same(r.subviews.Data, ['Pipeline', 'Tables', 'Columns']) && same(r.subviews.Reporting, ['Efficacy', 'Adverse events']), r.subviews);
  check('the study view has no RBQM or Safety view of its own', !Object.values(r.subviews).flat().concat(r.all).some((v) => /rbqm|safety/i.test(v)));
  check('the study view stays inside a page 1,400 wide', r.walk.every((w) => w.overflow <= 0), r.walk.map((w) => w.overflow));
  check('the ready-made study opened with no R', r.r.runtime === 0 && r.r.packages === 0, r.r);
  r.errors = t.errors;
  await t.context.close();
  return r;
}

// ---------------------------------------------------------------- 4. one build, with real R
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
    protocols: await page.evaluate(() => [...document.querySelectorAll('[data-action="try-protocol"]')].map((b) => b.innerText.trim()))
  };
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
  r.loaded = { chip: await chip(page), title: await title(page), count: await count(page) };

  await page.click('button.sva-view-tab');
  await page.waitForTimeout(1500);
  const r2 = t.rCount();
  const t1 = Date.now();
  if (await page.locator('button:text-is("Start R")').count()) await page.locator('button:text-is("Start R")').first().click();
  await page.waitForFunction(() => /\d+ OF \d+/i.test(document.querySelector('button.sva-view-tab')?.innerText || ''), null, { timeout: 300000 });
  await page.waitForTimeout(1500);
  const r3 = t.rCount();
  const said = flat(await bodyText(page)).match(/R ran \d+ of \d+ metrics.*?seconds\./);
  r.rbqm = { seconds: +((Date.now() - t1) / 1000).toFixed(1), runtime: r3.runtime - r2.runtime, packages: r3.packages - r2.packages, tab: await rbqmTab(page), said: said ? said[0] : null };
  r.rbqm.still = await still(page, 'rbqm.png', { x: 0, y: 0, width: W, height: 470 });
  check('a described study is built by R in the browser', !!r.built.builtIn && r.build.runtime > 0, { seconds: r.build.seconds, builtIn: r.built.builtIn });
  check('the built study has the size that was asked for', r.built.facts.includes(`${BUILD.participants} participants`) && r.built.facts.includes(`${BUILD.sites} sites`), r.built.facts);
  check('Load into the demo makes the built study the study in use', r.loaded.chip === BUILT_NAME, r.loaded);
  check('the RBQM tab runs every site metric on the built study', /8 OF 8/i.test(r.rbqm.tab), { tab: r.rbqm.tab, said: r.rbqm.said });
  check('the RBQM tab starts no second R after a build', r.rbqm.runtime === 0, r.rbqm);
  r.errors = t.errors;
  await t.context.close();
  return r;
}

// ---------------------------------------------------------------- 5. how it is held: the records, read from the repository
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
  const branch = BASE === RELEASED ? 'main' : 'dev';
  const head = await getJson(`${API}study.viz/commits/${branch}`);
  r.commit = head.sha;
  const at = `${RAW}study.viz/${r.commit}/`;
  r.package = JSON.parse(await getBytes(`${at}package.json`)).version;

  // The record of the copied app.
  const source = JSON.parse(await getBytes(`${at}SOURCE.json`));
  r.app = { from: source.repository, commit: source.commit, version: source.version, files: source.files.length, left: (source.left || []).length, withChecksum: source.files.filter((f) => /^[0-9a-f]{64}$/.test(f.sha256 || '')).length };
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
  // The same file at the commit the app's own files are held to.
  const atAppCommit = await getBytes(`${RAW}safety.viz/${source.commit}/${rec.source}`);
  r.bundle = { version: vendor.version, commit: vendor.commit, source: rec.source, bytes: rec.bytes, recorded: rec.sha256, copy: sha256(copy), original: sha256(original), copyBytes: copy.length, originalBytes: original.length, atAppCommit: sha256(atAppCommit) };

  const sb = JSON.parse(await getBytes(`${at}site/vendor/study.builder/SOURCE.json`));
  r.builder = { version: sb.version, tag: sb.tag || sb.ref, commit: sb.commit, files: sb.files.length };

  // The browser tests and their stored pictures, counted in the source. Not run here.
  const tree = await getJson(`${API}study.viz/git/trees/${r.commit}?recursive=1`);
  const paths = tree.tree.map((x) => x.path);
  r.tests = { specs: {}, pictures: paths.filter((p) => /^docs\/evidence\/.*\.png$/.test(p)).length, unitFiles: paths.filter((p) => /^tests\/unit\/.*\.test\.js$/.test(p)).length };
  for (const p of paths.filter((x) => /^tests\/e2e\/[^/]+\.spec\.js$/.test(x))) {
    const text = (await getBytes(`${at}${p}`)).toString('utf8');
    r.tests.specs[p] = (text.match(/^\s*test(\.skip|\.fixme)?\(/gm) || []).length;
  }
  r.tests.declared = Object.values(r.tests.specs).reduce((a, b) => a + b, 0);
  const runs = await getJson(`${API}study.viz/commits/${r.commit}/check-runs`);
  r.checkRuns = (runs.check_runs || []).map((x) => ({ name: x.name, status: x.status, conclusion: x.conclusion }));
  const run = await getJson(`${API}study.viz/actions/runs/${TEST_RUN}`);
  r.testRun = { id: TEST_RUN, url: run.html_url, name: run.name, commit: run.head_sha, status: run.status, conclusion: run.conclusion, browserTests: TESTS_RAN };

  check('every copied file is recorded with a checksum', r.app.files > 0 && r.app.withChecksum === r.app.files, { files: r.app.files, commit: r.app.commit.slice(0, 8) });
  check('a sample of the record matches the files', r.app.sample.every((s) => s.match), r.app.sample.filter((s) => !s.match).map((s) => s.file));
  check('the bundle is the same file at the commit the app’s files are held to', r.bundle.atAppCommit === r.bundle.copy, { app: r.app.commit.slice(0, 8), bundle: r.bundle.commit.slice(0, 8) });
  check('the check’s run that the page cites passed', r.testRun.status === 'completed' && r.testRun.conclusion === 'success', { run: r.testRun.id, commit: r.testRun.commit.slice(0, 8), name: r.testRun.name });
  check('the chart bundle is safety.viz’s, byte for byte', r.bundle.copy === r.bundle.original && r.bundle.copy === r.bundle.recorded && r.bundle.copyBytes === r.bundle.originalBytes, { sha256: r.bundle.copy.slice(0, 12), bytes: r.bundle.copyBytes, commit: r.bundle.commit.slice(0, 8) });
  return r;
}

// ---------------------------------------------------------------- run
(async () => {
  capture.site.captured = new Date().toISOString();
  capture.site.app = BASE;
  capture.site.app_is = BASE === RELEASED ? 'the released app' : BASE === DEV ? 'the dev build' : BASE;
  capture.site.branch = BASE === RELEASED ? 'main' : 'dev';
  capture.build_settings = { name: BUILT_NAME, ...BUILD };

  const browser = await chromium.launch();
  const run = { home: partHome, same: partSame, sections: partSections, build: partBuild, held: partHeld };
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
  capture.site.commit = capture.held ? capture.held.commit : null;

  const pageErrors = [capture.home, capture.same, capture.sections, capture.build].flatMap((p) => (p && p.errors) || []);
  check('no page raised an error while it was walked', pageErrors.length === 0, pageErrors.slice(0, 5));

  fs.writeFileSync(jsonPath, JSON.stringify(capture, null, 1));
  const failed = Object.entries(capture.checks).filter(([, v]) => !v.pass);
  const total = Object.values(capture.stills).reduce((a, b) => a + ((b && b.bytes) || 0), 0);
  console.log(`\n${Object.keys(capture.checks).length - failed.length} of ${Object.keys(capture.checks).length} checks held. ${Object.keys(capture.stills).length} stills, ${(total / 1024).toFixed(0)} KB.`);
  if (capture.sections && capture.sections.pending) console.log(`Pending: the stills of the study view in sections (${capture.sections.missing.map((m) => m.file).join(', ')}).`);
  if (failed.length) {
    console.log(`Did not hold: ${failed.map(([n]) => n).join('; ')}`);
    process.exit(1);
  }
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
