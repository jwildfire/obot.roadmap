// Captures and checks for the safety.viz v1.13.0 demo page: the study chip and
// the list of studies, a failed open, the Studies page, a simulated study shown
// in sections and at the snapshot chosen, building a study with R in the
// browser, what each loaded file holds, mapping in the Columns view, one R
// shared by the RBQM tab and the builder, the expanded participant profile,
// and the header, the status panel and the footer.
//
//   node capture.cjs [out dir]        default: the folder this file is in
//
// Run from the root of an `npm ci` checkout of safety.viz, for its Playwright
// (or set PLAYWRIGHT to a folder that holds it). Stills go to <out dir>/media as
// PNG, from a 1,400 by 900 window in the light theme. Everything read from the
// live app goes to <out dir>/capture.json, with a check of each thing the demo
// page states against what the app shows. The script exits 1 when a check
// fails. Then `node build.cjs` writes index.html from capture.json.
//
//   BASE=<the demo app under review>   default: the dev site's demo app
//   BEFORE=<the demo app before it>    default: the released site's demo app
//   PARTS=chip,switch,...              take only these parts again and keep the
//                                      rest from the capture.json already here.
//                                      The parts: chip, switch, sections,
//                                      snapshot, studies, files, build, other,
//                                      profile
//   BUILD_IS=<words>  COMMIT=<sha>     when BASE is a build of your own: what to
//                                      call it on the page, and its commit
//
// Three parts start real R in the browser (webR, from webr.r-wasm.org and
// repo.r-wasm.org) and take a minute or two each: snapshot, build and other.
// One part, switch, blocks one study's file on its way to the page, as a
// dropped connection would, to read what the app says when a study does not
// open. Nothing is written anywhere but <out dir>, and the script signs in to
// nothing.
const fs = require('node:fs');
const path = require('node:path');

const { chromium } = require(
  require.resolve('playwright', { paths: [process.env.PLAYWRIGHT || process.cwd(), process.cwd(), __dirname] })
);

const DEV = 'https://jwildfire.github.io/safety.viz/dev/demo/';
const RELEASED = 'https://jwildfire.github.io/safety.viz/demo/';
const BASE = process.env.BASE || DEV;
const BEFORE = process.env.BEFORE || RELEASED;
const ALL_PARTS = ['chip', 'switch', 'sections', 'snapshot', 'studies', 'files', 'build', 'other', 'profile'];
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
// The study whose file is blocked once, and the file.
const BLOCKED_STUDY = 'READY-P2';
const BLOCKED_FILE = '**/presets/phase2-oncology.study.json.gz';
// The participant whose profile is expanded, in the Hepatic Explorer on the Pilot study.
const PROFILE_OF = 'CLD-9002';
// The widths the header is read at, and the studies it is read on.
const HEADER_WIDTHS = [1440, 1439, 1280, 1200, 1199];
const HEADER_STUDIES = ['Pilot study', 'Renamed columns', 'Liver cohort, labs only', 'RBQM study', 'READY-P1', 'READY-P2', 'PILOT-PROTOCOL'];
const BUILT_NAME = 'DEMO-BUILT';
// Small numbers, so the one build this script runs is quick.
const BUILD = { phase: '1', participants: 24, sites: 3, months: 3, seed: 11 };

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
  const context = await browser.newContext({ viewport: { width, height: H }, deviceScaleFactor: 1, colorScheme: 'light' });
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
const locBox = async (locator) => {
  const b = await locator.first().boundingBox();
  return b;
};
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
// The study the chip names, and the words under the name when the study kept its snapshots.
const chip = (page) => page.evaluate(() => (document.querySelector('.sva-studychip .sva-chip-name')?.innerText || document.querySelector('.sva-studychip')?.innerText || '').replace(/[▾\s]+/g, ' ').trim());
const chipSnap = (page) => page.evaluate(() => (document.querySelector('.sva-studychip .sva-chip-snap')?.innerText || '').replace(/\s+/g, ' ').trim() || null);
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
/** What the chart in view says of how many participants it shows. */
const chartSays = (page) => page.evaluate(() => ((document.querySelector('.sv-main')?.innerText || '').match(/[\d,]+ of [\d,]+ participants shown/) || [null])[0]);
/** The header's row, measured: one row or more, the words "Demo app", and a name cut short. */
const readHeader = (page) =>
  page.evaluate(() => {
    const bar = document.querySelector('.sva-bar');
    const kicker = document.querySelector('.sva-kicker');
    const name = document.querySelector('.sva-chip-name');
    const tabs = [...document.querySelectorAll('.sva-tab')].map((t) => t.getBoundingClientRect());
    const status = document.querySelector('.sva-appstatus').getBoundingClientRect();
    // One row: every tab and the status label start above the foot of the app's name, the first thing in the row.
    const firstRowBottom = bar.firstElementChild.getBoundingClientRect().bottom;
    return {
      height: Math.round(bar.getBoundingClientRect().height),
      oneRow: tabs.every((t) => t.top < firstRowBottom) && status.top < firstRowBottom,
      demoApp: kicker ? getComputedStyle(kicker).display !== 'none' : false,
      name: name.innerText.trim(),
      cut: name.scrollWidth > name.clientWidth
    };
  });
const tabs = (page) => page.evaluate(() => [...document.querySelectorAll('.sva-tab')].map((b) => b.innerText.replace(/\s+/g, ' ').trim()));
const activeItem = (page) =>
  page.evaluate(() => {
    const on = [...document.querySelectorAll('.sva-item')].find((b) => b.getAttribute('aria-current') || /active|current|selected/.test(b.className));
    return on ? on.innerText.replace(/\s+/g, ' ').trim() : null;
  });
const count = (page) => page.evaluate(() => (document.querySelector('.sva-count')?.innerText || '').replace(/\s+/g, ' ').trim());
const footer = (page) => page.evaluate(() => (document.querySelector('footer')?.innerText || '').split('\n').map((l) => l.trim()).filter(Boolean));
const views = (page) => page.evaluate(() => [...document.querySelectorAll('button.sv-view')].map((b) => ({ name: b.innerText.trim(), on: b.getAttribute('aria-selected') === 'true' })));

async function readMenu(page) {
  await page.click('.sva-studychip');
  await page.waitForSelector('.sva-chip-menu');
  const menu = await page.evaluate(() => ({
    label: document.querySelector('.sva-chip-menu .sva-chip-label')?.innerText.trim(),
    items: [...document.querySelectorAll('.sva-chip-menu .sva-chip-item')].map((b) => ({
      id: b.dataset.study,
      name: b.querySelector('.sva-chip-study')?.innerText.trim(),
      size: b.querySelector('small')?.innerText.trim(),
      kind: b.querySelector('.sva-kind')?.innerText.trim(),
      inUse: b.getAttribute('aria-current') === 'true'
    })),
    foot: [...document.querySelectorAll('.sva-chip-menu .sva-chip-foot button')].map((b) => b.innerText.trim())
  }));
  return menu;
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
  const t0 = Date.now();
  await page.locator('.sva-chip-menu .sva-chip-item', { has: page.locator(`.sva-chip-study:text-is("${name}")`) }).click();
  await page.waitForFunction((n) => (document.querySelector('.sva-studychip')?.innerText || '').includes(n), name, { timeout: 60000 });
  const ms = Date.now() - t0;
  await page.waitForTimeout(1200);
  return ms;
}
const openOverview = async (page) => {
  await page.click('button.sva-item:has-text("Overview")');
  await page.waitForTimeout(1500);
};
/** Press a section of the study view, then a view of its second row. */
async function section(page, sec, sub) {
  await page.locator(`button.sv-view:text-is("${sec}")`).first().click();
  await page.waitForTimeout(700);
  if (sub) {
    await page.locator(`button.sv-view:text-is("${sub}")`).last().click();
    await page.waitForTimeout(1000);
  }
}
const setNumber = async (page, name, value) => {
  const sel = `input[name=${name}]`;
  await page.click(sel, { clickCount: 3 });
  await page.keyboard.type(String(value));
  await page.keyboard.press('Tab');
  await page.waitForTimeout(350);
  return page.evaluate((s) => document.querySelector(s).value, sel);
};
const rbqmTab = (page) => page.evaluate(() => (document.querySelector('button.sva-view-tab')?.innerText || '').replace(/\s+/g, ' ').trim());
const bodyText = (page) => page.evaluate(() => document.body.innerText);

// ---------------------------------------------------------------- 1. the chip
async function partChip(browser) {
  const r = {};
  // Before: the released demo app, when it is still the release before this one.
  const b = await open(browser, BEFORE);
  const beforeHasChip = (await b.page.locator('.sva-studychip').count()) > 0;
  if (!beforeHasChip) {
    r.before = {
      site: BEFORE,
      version: (await footer(b.page)).pop(),
      pitch: flat(await b.page.evaluate(() => document.querySelector('footer .sva-pitch')?.innerText)),
      header: flat(await b.page.evaluate(() => document.querySelector('header .sva-bar, header')?.innerText)).slice(0, 160),
      still: await still(b.page, 'header-before.png', { x: 0, y: 0, width: 720, height: 100 })
    };
  } else if (kept.chip && kept.chip.before) {
    console.log('The released demo app already has the study chip: keeping the earlier "before" read and still.');
    r.before = kept.chip.before;
    capture.stills['header-before.png'] = kept.stills && kept.stills['header-before.png'];
  } else {
    r.before = null;
  }
  await b.context.close();

  const t = await open(browser, BASE);
  const { page } = t;
  r.title = await title(page);
  r.chip = await chip(page);
  r.tabs = await tabs(page);
  r.footer = await footer(page);
  r.version = r.footer[r.footer.length - 1];
  r.status = flat(await page.evaluate(() => document.querySelector('.sv-status-label')?.innerText));
  const chipBox = await box(page, '.sva-studychip');
  const infoBox = await box(page, '.sva-chip-info');
  const overviewBox = await locBox(page.locator('button.sva-item:has-text("Overview")'));
  r.header = await still(page, 'header-after.png', { x: 0, y: 0, width: 720, height: 100 }, [chipBox && { ...chipBox, dy: chipBox.height + 14 }, overviewBox && { ...overviewBox, dy: overviewBox.height + 14 }]);

  r.menu = await readMenu(page);
  const menuBox = await box(page, '.sva-chip-menu');
  const firstSim = await locBox(page.locator('.sva-chip-menu .sva-kind-sim'));
  const firstDemo = await locBox(page.locator('.sva-chip-menu .sva-kind-demo'));
  const foot = await box(page, '.sva-chip-menu .sva-chip-foot');
  r.menuStill = await still(page, 'chip-menu.png', { x: 0, y: 0, width: Math.max(760, menuBox.x + menuBox.width + 40), height: menuBox.y + menuBox.height + 18 }, [
    { ...infoBox, dx: infoBox.width + 12 },
    firstDemo && { ...firstDemo, dx: firstDemo.width + 14 },
    firstSim && { ...firstSim, dx: firstSim.width + 14 },
    foot && { ...foot, dx: foot.width + 4 }
  ]);
  await closeMenu(page);

  await page.click('.sva-chip-info');
  await page.waitForSelector('.sva-chip-card');
  r.info = await page.evaluate(() => document.querySelector('.sva-chip-card').innerText.split('\n').map((l) => l.trim()).filter(Boolean));
  r.card = await readCard(page);
  const card = await box(page, '.sva-chip-card');
  r.infoStill = await still(page, 'chip-info.png', { x: 0, y: 0, width: Math.max(760, card.x + card.width + 40), height: card.y + card.height + 18 }, [{ ...infoBox, dx: infoBox.width + 12 }]);
  await closeMenu(page);

  // The status label, pressed: what the app says of itself and of study.builder.
  await page.click('.sv-status-label');
  await page.waitForSelector('.sv-status-panel', { state: 'visible' });
  await page.waitForTimeout(300);
  r.statusPanel = await page.evaluate(() => ({
    heading: document.querySelector('.sv-status-panel .sv-status-heading')?.innerText.trim(),
    text: [...document.querySelectorAll('.sv-status-panel .sv-status-text')].map((e) => e.innerText.replace(/\s+/g, ' ').trim())
  }));
  const panelBox = await box(page, '.sv-status-panel');
  const builderLine = await page.evaluate(() => {
    const e = [...document.querySelectorAll('.sv-status-panel .sv-status-text')].find((x) => /study\.builder/.test(x.innerText));
    if (!e) return null;
    const b = e.getBoundingClientRect();
    return { x: b.left, y: b.top, width: b.width, height: b.height };
  });
  r.statusStill = await still(page, 'status-panel.png', pad({ x: panelBox.x, y: 0, width: panelBox.width, height: panelBox.y + panelBox.height }, 12), [builderLine && { ...builderLine, dx: -10 }]);
  await page.click('.sv-status-close');
  await page.waitForTimeout(200);

  // The footer: what is fetched, and from where; the version.
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(300);
  const pageFoot = await box(page, 'footer.sva-footer');
  const pitch = await box(page, 'footer.sva-footer .sva-pitch');
  const ver = await box(page, 'footer.sva-footer .sva-version');
  r.pitch = flat(await page.evaluate(() => document.querySelector('footer.sva-footer .sva-pitch')?.innerText));
  r.footerStill = await still(page, 'footer.png', { x: 0, y: pageFoot.y - 4, width: W, height: pageFoot.height + 4 }, [pitch && { ...pitch, dx: -14 }, ver && { ...ver, dy: -12 }]);
  await page.evaluate(() => window.scrollTo(0, 0));

  const names = (kind) => r.menu.items.filter((i) => i.kind && i.kind.toUpperCase() === kind).map((i) => i.name);
  check('the header has a chip naming the study in use', r.chip === 'Pilot study', r.chip);
  check('the menu is headed Studies and lists the demo studies', r.menu.label && /^studies$/i.test(r.menu.label) && same(names('DEMO'), ['Pilot study', 'Renamed columns', 'Liver cohort, labs only', 'RBQM study']), names('DEMO'));
  check('the menu lists three ready-made simulated studies', same(names('SIMULATED'), [PLAIN_STUDY, 'READY-P2', PROTOCOL_STUDY]), names('SIMULATED'));
  check('the menu ends with Add a study and All studies', same(r.menu.foot.map((f) => f.toLowerCase()), ['add a study', 'all studies']), r.menu.foot);
  check('the i beside the chip says what the study is', r.info[0] === 'Pilot study' && r.info.some((l) => /participants/.test(l)), r.info.slice(0, 3));
  check('the first tab is Overview', (await page.locator('button.sva-item').first().innerText()).trim() === 'Overview');
  check('the footer says what starting R downloads, and from where', /webr\.r-wasm\.org/.test(r.pitch) && /repo\.r-wasm\.org/.test(r.pitch) && /Build a study/.test(r.pitch) && /never uploaded/.test(r.pitch), r.pitch);
  check('the footer reads safety.viz 1.13.0', r.version === 'safety.viz 1.13.0', r.version);
  check('the status panel has a sentence about study.builder', r.statusPanel.text.some((l) => /study\.builder/.test(l) && /synthetic/.test(l)), r.statusPanel.text.find((l) => /study\.builder/.test(l)));
  r.errors = t.errors;
  await t.context.close();

  // The header at other widths: one row or more, the words "Demo app", a name cut short.
  r.widths = {};
  for (const width of HEADER_WIDTHS) {
    const w = await open(browser, BASE, width);
    const read = {};
    for (const name of HEADER_STUDIES) {
      if (name !== 'Pilot study') await chooseStudy(w.page, name);
      read[name] = await readHeader(w.page);
      if (width === 1280 && name === 'Pilot study') {
        const c = await box(w.page, '.sva-studychip');
        const st = await box(w.page, '.sva-appstatus');
        r.header1280 = await still(w.page, 'header-1280.png', { x: 0, y: 0, width, height: 100 }, [c && { ...c, dy: c.height + 14 }, st && { ...st, dy: st.height + 16 }]);
      }
      if (width === 1280 && name === 'Liver cohort, labs only') {
        const c = await box(w.page, '.sva-studychip');
        r.header1280Cut = await still(w.page, 'header-1280-cut.png', { x: 0, y: 0, width: 720, height: 100 }, [c && { ...c, dy: c.height + 14 }]);
        r.header1280Title = await w.page.evaluate(() => document.querySelector('.sva-studychip').title);
      }
      if (width === 1440 && name === 'Pilot study') {
        const k = await box(w.page, '.sva-kicker');
        r.header1440 = await still(w.page, 'header-1440.png', { x: 0, y: 0, width: 720, height: 100 }, [k && { ...k, dy: k.height + 16 }]);
      }
    }
    r.widths[width] = read;
    r.errors = r.errors.concat(w.errors);
    await w.context.close();
  }
  const at = (width) => Object.values(r.widths[width]);
  const cutAt1280 = HEADER_STUDIES.filter((n) => r.widths[1280][n].cut);
  check('at 1,280 pixels the header is one row on every study', at(1280).every((x) => x.oneRow), Object.fromEntries(HEADER_STUDIES.map((n) => [n, r.widths[1280][n].height])));
  check('from 1,200 to 1,439 pixels "Demo app" is not drawn, and at 1,440 it is', [1200, 1280, 1439].every((w) => at(w).every((x) => !x.demoApp)) && at(1440).every((x) => x.demoApp) && at(1199).every((x) => x.demoApp), Object.fromEntries(HEADER_WIDTHS.map((w) => [w, at(w)[0].demoApp])));
  check('at 1,280 pixels two demo studies have their name cut short', same(cutAt1280, ['Renamed columns', 'Liver cohort, labs only']), cutAt1280);
  return r;
}

// ---------------------------------------------------------------- 2. switching study
async function partSwitch(browser) {
  const r = {};
  const t = await open(browser, BASE);
  const { page } = t;
  await page.click('.sva-item:has-text("Outlier Explorer")');
  await page.waitForTimeout(1500);
  r.before = { title: await title(page), chip: await chip(page), item: await activeItem(page), count: await count(page) };
  r.before.still = await still(page, 'switch-pilot.png', { x: 0, y: 0, width: W, height: 600 });
  r.ms = await chooseStudy(page, PROTOCOL_STUDY);
  await page.waitForTimeout(1200);
  r.after = { title: await title(page), chip: await chip(page), snap: await chipSnap(page), item: await activeItem(page), count: await count(page), r: t.rCount() };
  const chipBox = await box(page, '.sva-studychip');
  const itemBox = await locBox(page.locator('.sva-item:has-text("Outlier Explorer")'));
  r.after.still = await still(page, 'switch-protocol.png', { x: 0, y: 0, width: W, height: 600 }, [{ ...chipBox, dy: chipBox.height + 12 }, itemBox && { ...itemBox, dy: itemBox.height + 12 }]);
  await page.click('.sva-chip-info');
  await page.waitForSelector('.sva-chip-card');
  r.info = await page.evaluate(() => document.querySelector('.sva-chip-card').innerText.split('\n').map((l) => l.trim()).filter(Boolean));
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
    const snapLine = await mark('^Snapshot drawn$');
    const credit = await mark('DDF-RA');
    r.cardStill = await still(page, 'card-simulated.png', { x: 0, y: 0, width: Math.max(760, cardBox.x + cardBox.width + 40), height: Math.min(H, cardBox.y + cardBox.height + 18) }, [madeBy && { ...madeBy, dx: -17 }, snapLine && { ...snapLine, dx: -17 }, credit && { ...credit, dx: -17, dy: 12 }]);
  }
  await closeMenu(page);
  check('the card of a simulated study says what made it', r.card.facts['Made by'] === 'a modified copy of gsm.datasim 2.1.0', r.card.facts['Made by']);
  check('the card of a study that followed a protocol carries CDISC\'s attribution', r.card.credit.some((l) => /DDF-RA/.test(l) && /CC-BY-4\.0/.test(l) && /not endorsed by CDISC/.test(l)), r.card.credit);
  check('the chip says which snapshot is drawn', /^Snapshot \d+ of \d+$/.test(r.after.snap || ''), r.after.snap);
  check('choosing a study keeps the tab you were on', r.before.title === r.after.title && /Outlier Explorer/.test(r.after.title) && r.after.chip === PROTOCOL_STUDY, { before: r.before.title, after: r.after.title, chip: r.after.chip });
  check('a ready-made simulated study opens with no R', r.after.r.runtime === 0 && r.after.r.packages === 0, { ms: r.ms, ...r.after.r });
  check('the i says a simulated study is synthetic', r.info.some((l) => /Every row is synthetic/.test(l)), r.info.slice(-3));

  // One chart of each family on the simulated study, read only.
  r.charts = [];
  for (const tab of ['Adverse events', 'ECG']) {
    await page.locator(`button.sva-tab:has-text("${tab}")`).click();
    await page.waitForTimeout(2000);
    r.charts.push({ tab, title: await title(page) });
  }
  // The card of a ready-made study that followed no protocol: read, not shown.
  await chooseStudy(page, PLAIN_STUDY);
  await page.click('.sva-chip-info');
  await page.waitForSelector('.sva-chip-card');
  r.plainCard = await readCard(page);
  await closeMenu(page);
  check('the card of a study with no protocol carries no attribution', r.plainCard.credit.length === 0 && r.plainCard.facts['Made by'] === r.card.facts['Made by'], r.plainCard.facts);
  r.errors = t.errors;
  await t.context.close();

  // A study that does not open. Its file is stopped on the way to the page, as
  // a dropped connection would stop it; the page itself is left as it is.
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
  const fChip = await box(f.page, '.sva-studychip');
  r.failed.still = await still(f.page, 'open-failed.png', { x: 0, y: 0, width: Math.max(760, saidBox.x + saidBox.width + 60), height: saidBox.y + saidBox.height + 40 }, [fChip && { ...fChip, dx: -8 }, { ...saidBox, dx: saidBox.width + 14 }]);
  // The connection back: the same study opens.
  await f.page.unroute(BLOCKED_FILE);
  await chooseStudy(f.page, BLOCKED_STUDY);
  r.failed.then = { chip: await chip(f.page), said: await f.page.locator('.sva-chip-said.sva-problem').count() };
  check('a study that does not open is said under the chip, and the study in use stays', /could not be fetched/.test(r.failed.said) && r.failed.role === 'alert' && r.failed.chip === 'Pilot study' && /Outlier Explorer/.test(r.failed.title), r.failed);
  check('the same study opens once its file can be fetched', r.failed.then.chip === BLOCKED_STUDY && r.failed.then.said === 0, r.failed.then);
  // The one error this page raised is the blocked file itself.
  r.failed.errors = f.errors;
  r.errors = r.errors.concat(f.errors.filter((e) => !/ERR_INTERNET_DISCONNECTED/.test(e)));
  await f.context.close();
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
  r.url = page.url().replace(BASE, '');
  r.heading = flat(await page.evaluate(() => document.querySelector('h1.sva-title')?.innerText));
  r.ready = flat(await page.evaluate(() => [...document.querySelectorAll('summary')].map((s) => s.innerText).find((s) => /charts ready/.test(s))));
  r.facts = await page.evaluate(() => {
    const first = document.querySelector('.sv-view');
    let row = null;
    for (const el of document.querySelectorAll('*')) {
      if (el.children.length >= 4 && el.children.length <= 12 && /^Phase \d/.test((el.children[0].innerText || '').trim())) row = el;
    }
    return row ? [...row.children].map((c) => c.innerText.replace(/\s+/g, ' ').trim()).filter((s) => s && !/^Snapshot/.test(s)) : first ? [] : null;
  });
  r.snapshot = await page.evaluate(() => {
    const s = [...document.querySelectorAll('select')].find((x) => [...x.options].some((o) => / of \d+$/.test(o.text)));
    return s ? { chosen: s.options[s.selectedIndex].text, options: [...s.options].map((o) => o.text) } : null;
  });
  r.chipSnap = await chipSnap(page);
  r.layers = await page.evaluate(() => [...document.querySelectorAll('button.sv-group')].map((b) => b.innerText.replace(/\s+/g, ' ').trim()));
  r.sections = (await views(page)).map((v) => v.name);
  const secRow = await locBox(page.locator('button.sv-view:text-is("Overview")'));
  const lastSec = await locBox(page.locator('button.sv-view:text-is("Reporting")'));
  const rail = await locBox(page.locator('button.sv-group'));
  const snapBox = await page.evaluate(() => {
    const s = [...document.querySelectorAll('select')].find((x) => [...x.options].some((o) => / of \d+$/.test(o.text)));
    if (!s) return null;
    const b = s.getBoundingClientRect();
    return { x: b.left, y: b.top, width: b.width, height: b.height };
  });
  r.overview = await still(page, 'view-overview.png', null, [
    union(secRow, lastSec) && { ...union(secRow, lastSec), dx: union(secRow, lastSec).width + 16 },
    rail && { ...rail, dx: -2 },
    snapBox && { ...snapBox, dx: snapBox.width + 22 }
  ]);
  r.overviewText = flat(await page.evaluate(() => document.body.innerText)).slice(0, 2500);

  // The pane to the right of the table rail, from just above the row of sections.
  const pane = { x: 250, y: Math.max(0, secRow.y - 14), width: W - 250 - 18, height: H - Math.max(0, secRow.y - 14) };
  r.walk = [];
  const WALK = [
    ['Design', 'Protocol', 'view-design-protocol.png'],
    ['Design', 'Schedule', 'view-design-schedule.png'],
    ['Data', 'Pipeline', 'view-data-pipeline.png'],
    ['Data', 'Tables', 'view-data-tables.png'],
    ['Data', 'Columns', 'view-data-columns.png'],
    ['One participant', null, 'view-participant.png'],
    ['Reporting', 'Efficacy', 'view-reporting-efficacy.png'],
    ['Reporting', 'Adverse events', 'view-reporting-ae.png']
  ];
  r.subviews = {};
  for (const [sec, sub, file] of WALK) {
    await section(page, sec, sub);
    const v = await views(page);
    const second = v.slice(r.sections.length).map((x) => x.name);
    r.subviews[sec] = second;
    const heads = await page.evaluate(() => [...document.querySelectorAll('h4, h3.sv-title')].filter((h) => h.offsetParent).map((h) => h.innerText.replace(/\s+/g, ' ').trim()).slice(0, 8));
    const lead = await page.evaluate(() => {
      const v = [...document.querySelectorAll('button.sv-view')].pop();
      let el = v.parentElement;
      while (el && el.innerText.length < 500 && el.parentElement) el = el.parentElement;
      return el.innerText.replace(/\s+/g, ' ').trim().slice(0, 700);
    });
    r.walk.push({ section: sec, view: sub, heads, lead, still: await still(page, file, pane) });
  }
  check('a study that followed a protocol is shown in five sections', same(r.sections, ['Overview', 'Design', 'Data', 'One participant', 'Reporting']), r.sections);
  check('Design holds Protocol and Schedule', same(r.subviews.Design, ['Protocol', 'Schedule']), r.subviews.Design);
  check('Data holds Pipeline, Tables and Columns', same(r.subviews.Data, ['Pipeline', 'Tables', 'Columns']), r.subviews.Data);
  check('Reporting holds Efficacy and Adverse events', same(r.subviews.Reporting, ['Efficacy', 'Adverse events']), r.subviews.Reporting);
  check('the study view has no RBQM or Safety view of its own', !Object.values(r.subviews).flat().concat(r.sections).some((n) => /rbqm|safety/i.test(n)));
  check('the tab is headed Overview', r.heading === 'Overview' && /^Overview · /.test(r.title), { heading: r.heading, title: r.title });

  // A ready-made study with no protocol: no Design section.
  await chooseStudy(page, PLAIN_STUDY);
  await page.waitForTimeout(800);
  r.plain = { sections: (await views(page)).map((v) => v.name) };
  r.plain.snapshot = await page.evaluate(() => {
    const s = [...document.querySelectorAll('select')].find((x) => [...x.options].some((o) => / of \d+$/.test(o.text)));
    return s ? { chosen: s.options[s.selectedIndex].text, options: [...s.options].map((o) => o.text) } : null;
  });
  const a = await locBox(page.locator('button.sv-view:text-is("Overview")'));
  const z = await locBox(page.locator('button.sv-view:text-is("Reporting")'));
  r.plain.still = await still(page, 'view-plain-sections.png', { x: 250, y: a.y - 14, width: 760, height: a.height + 30 });
  await section(page, 'Reporting', null);
  r.plain.reporting = (await views(page)).slice(r.plain.sections.length).map((v) => v.name);
  r.plain.reportingHeads = await page.evaluate(() => [...document.querySelectorAll('h4')].filter((h) => h.offsetParent).map((h) => h.innerText.replace(/\s+/g, ' ').trim()).slice(0, 4));
  check('a study with no protocol has no Design section', same(r.plain.sections, ['Overview', 'Data', 'One participant', 'Reporting']), r.plain.sections);

  // Does the snapshot chosen for one study carry to the next? Read, not asserted.
  await chooseStudy(page, PROTOCOL_STUDY);
  await page.waitForTimeout(800);
  r.snapshotAfterPlain = await page.evaluate(() => {
    const s = [...document.querySelectorAll('select')].find((x) => [...x.options].some((o) => / of \d+$/.test(o.text)));
    return s ? s.options[s.selectedIndex].text : null;
  });
  r.errors = t.errors;
  await t.context.close();
  return r;
}

// ---------------------------------------------------------------- 3b. the snapshot chosen, with real R
const readRbqm = (page) =>
  page.evaluate(() => ({
    count: (document.querySelector('.sva-rbqm-overview .sva-rbqm-count, .sva-rbqm-count')?.innerText || '').replace(/\s+/g, ' ').trim(),
    sites: document.querySelectorAll('.sva-rbqm-table tbody tr').length,
    outcome: (document.querySelector('.sva-rbqm-outcome')?.innerText || '').replace(/\s+/g, ' ').trim()
  }));
const overviewTiles = (page) =>
  page.evaluate(() => {
    const text = (document.querySelector('main')?.innerText || '').replace(/\s+/g, ' ');
    const m = text.match(/([\d,]+) Participants ([\d,]+) enrolled ([\d,]+) Sites/);
    return m ? { participants: m[1], enrolled: m[2], sites: m[3] } : null;
  });
async function partSnapshot(browser) {
  const r = {};
  const t = await open(browser, BASE);
  const { page } = t;
  await chooseStudy(page, PROTOCOL_STUDY);
  await page.click('.sva-item:has-text("Outlier Explorer")');
  await page.waitForTimeout(1500);
  r.last = { snap: await chipSnap(page), chart: await chartSays(page) };
  await openOverview(page);
  r.last.tiles = await overviewTiles(page);
  r.options = await page.evaluate(() => [...document.querySelector('select[name=snapshot]').options].map((o) => o.text));
  const PICK = 2;
  await page.selectOption('select[name=snapshot]', { index: PICK });
  await page.waitForTimeout(2000);
  r.chosen = { option: r.options[PICK], snap: await chipSnap(page), chipTitle: await page.evaluate(() => document.querySelector('.sva-studychip').title), tiles: await overviewTiles(page) };
  const chipBox = await box(page, '.sva-studychip');
  const selBox = await box(page, 'select[name=snapshot]');
  const tile = await page.evaluate(() => {
    const e = [...document.querySelectorAll('main *')].find((x) => x.children.length === 0 && /^Participants$/.test((x.innerText || '').trim()) && x.offsetParent && !x.closest('button'));
    if (!e) return null;
    const b = e.parentElement.getBoundingClientRect();
    return { x: b.left, y: b.top, width: b.width, height: b.height };
  });
  r.overviewStill = await still(page, 'snapshot-overview.png', { x: 0, y: 0, width: W, height: 560 }, [selBox && { ...selBox, dx: selBox.width + 22 }, chipBox && { ...chipBox, dy: chipBox.height + 14 }, tile && { ...tile, dx: -6 }]);
  await page.click('.sva-chip-info');
  await page.waitForSelector('.sva-chip-card');
  r.chosen.card = (await readCard(page)).facts['Snapshot drawn'] || null;
  await closeMenu(page);

  // A chart, on the snapshot chosen.
  await page.click('button.sva-tab:has-text("Labs and vitals")');
  await page.waitForTimeout(600);
  await page.click('.sva-item:has-text("Outlier Explorer")');
  await page.waitForTimeout(1800);
  r.chosen.chart = await chartSays(page);
  r.chosen.snapOnChart = await chipSnap(page);
  const says = await page.evaluate(() => {
    const e = [...document.querySelectorAll('.sv-main *')].find((x) => x.children.length === 0 && /participants shown/.test(x.innerText || ''));
    if (!e) return null;
    const b = e.getBoundingClientRect();
    return { x: b.left, y: b.top, width: Math.min(b.width, 260), height: b.height };
  });
  const chipBox2 = await box(page, '.sva-studychip');
  r.chartStill = await still(page, 'snapshot-chart.png', { x: 0, y: 0, width: W, height: 600 }, [chipBox2 && { ...chipBox2, dy: chipBox2.height + 14 }, says && { ...says, dy: -10 }]);

  // The RBQM tab, on the snapshot chosen. Real R.
  r.rbqm = await startRbqm(page, t.rCount);
  r.rbqm.read = await readRbqm(page);
  r.rbqm.snap = await chipSnap(page);
  r.rbqmStill = await still(page, 'snapshot-rbqm.png', { x: 0, y: 0, width: W, height: 520 });

  // Back to the last snapshot: what the RBQM tab does then is read, not asserted.
  await openOverview(page);
  await page.selectOption('select[name=snapshot]', { index: r.options.length - 1 });
  await page.waitForTimeout(2000);
  r.back = { snap: await chipSnap(page), tiles: await overviewTiles(page) };
  await page.click('button.sva-view-tab');
  await page.waitForTimeout(1500);
  r.back.tabAtOnce = await rbqmTab(page);
  r.back.buttons = await page.evaluate(() => [...document.querySelectorAll('main button')].filter((b) => b.offsetParent).map((b) => b.innerText.trim()).filter((x) => /^(start r|run|run again|run the metrics)$/i.test(x)));
  if (r.back.buttons.length) await page.locator('main button', { hasText: new RegExp(`^${r.back.buttons[0]}$`, 'i') }).first().click();
  const t0 = Date.now();
  while (Date.now() - t0 < 120000) {
    await page.waitForTimeout(1000);
    const now = await readRbqm(page);
    if (/\d+ OF \d+/i.test(await rbqmTab(page)) && now.sites && now.sites !== r.rbqm.read.sites) break;
  }
  r.back.seconds = +((Date.now() - t0) / 1000).toFixed(1);
  await page.waitForTimeout(2500);
  r.back.tab = await rbqmTab(page);
  r.back.read = await readRbqm(page);

  const num = (v) => Number(String(v || '').replace(/[^\d]/g, ''));
  const shown = (v) => num(String(v || '').split(' of ')[0]);
  check('choosing a snapshot changes what the chip says', r.last.snap === `Snapshot ${r.options.length} of ${r.options.length}` && r.chosen.snap === `Snapshot ${PICK + 1} of ${r.options.length}`, { last: r.last.snap, chosen: r.chosen.snap, title: r.chosen.chipTitle });
  check('a chart draws the snapshot chosen', shown(r.chosen.chart) > 0 && shown(r.chosen.chart) < shown(r.last.chart) && r.chosen.snapOnChart === r.chosen.snap, { last: r.last.chart, chosen: r.chosen.chart });
  check('the RBQM tab runs on the snapshot chosen', r.rbqm.read.sites === num(r.chosen.tiles && r.chosen.tiles.sites) && r.rbqm.read.sites < num(r.last.tiles && r.last.tiles.sites), { sitesInTheTab: r.rbqm.read.sites, sitesAtTheSnapshot: r.chosen.tiles, sitesAtTheLast: r.last.tiles, tab: r.rbqm.tab });
  r.errors = t.errors;
  await t.context.close();
  return r;
}

// ---------------------------------------------------------------- 8. the expanded participant profile
/** Open one participant's profile from the Hepatic Explorer, expand it, measure it and take the still. */
async function expandedProfile(page, file, markers) {
  await page.locator('.sva-item:has-text("Hepatic Explorer")').click();
  await page.waitForTimeout(2500);
  const b = await page.locator('.sv-main canvas').first().boundingBox();
  const id = async () => ((await page.locator('.sv-rail .sv-profile-id').count()) ? (await page.locator('.sv-rail .sv-profile-id').first().innerText()).trim() : null);
  // The point is found by pressing near where the participant sits on the chart.
  let at = null;
  let other = null;
  outer: for (let dy = 0; Math.abs(dy) <= 12; dy = dy <= 0 ? -dy + 2 : -dy) {
    for (let dx = 0; Math.abs(dx) <= 12; dx = dx <= 0 ? -dx + 2 : -dx) {
      const x = b.x + b.width * 0.36 + dx;
      const y = b.y + b.height * 0.72 + dy;
      await page.mouse.click(x, y);
      const now = await id();
      if (now === `Participant ${PROFILE_OF}`) {
        at = [x, y];
        break outer;
      }
      if (now && !other) other = [x, y];
    }
  }
  if (!at && other) await page.mouse.click(other[0], other[1]);
  await page.waitForTimeout(600);
  const who = await id();
  if (!who) return { who: null };
  await page.locator('.sv-rail button', { hasText: /^Expand$/ }).first().click();
  await page.waitForTimeout(1200);
  const top = await page.evaluate(() => document.querySelector('.sv-root > .sv-rail').getBoundingClientRect().top + window.scrollY);
  await page.evaluate((y) => window.scrollTo(0, Math.max(0, y - 16)), top);
  await page.waitForTimeout(400);
  const m = await page.evaluate(() => {
    const root = document.querySelector('.sv-root');
    const rail = root.querySelector(':scope > .sv-rail');
    const bx = (e) => {
      if (!e) return null;
      const r = e.getBoundingClientRect();
      return { x: r.left, y: r.top, width: r.width, height: r.height };
    };
    return {
      expanded: root.classList.contains('sv-rail-expanded'),
      button: [...rail.querySelectorAll('.sv-profile-rail-btn')].map((x) => x.innerText.trim())[0],
      panel: bx(rail),
      controls: bx(rail.querySelector('.sv-profile-controls')),
      chart: bx(rail.querySelector('.sv-profile-spaghetti canvas')),
      table: bx(rail.querySelector('.sv-profile-measure-wrap'))
    };
  });
  const round = (v) => (v ? Object.fromEntries(Object.entries(v).map(([k, n]) => [k, Math.round(n)])) : null);
  const r = { who, expanded: m.expanded, button: m.button, panel: round(m.panel), controls: round(m.controls), chart: round(m.chart), table: round(m.table) };
  r.beside = !!(m.controls && m.chart) && m.chart.x >= m.controls.x + m.controls.width;
  r.below = !!(m.controls && m.chart) && m.chart.y >= m.controls.y + m.controls.height - 1;
  r.overTable = !!(m.table && m.chart) && m.chart.y + m.chart.height > m.table.y + 1;
  r.tableBelowBoth = !!(m.table && m.chart && m.controls) && m.table.y >= m.chart.y + m.chart.height - 1 && m.table.y >= m.controls.y + m.controls.height - 1;
  r.still = await still(page, file, pad({ x: m.panel.x, y: m.panel.y, width: m.panel.width, height: Math.min(m.panel.height, H - m.panel.y - 12) }, 8), markers(m));
  return r;
}
async function partProfile(browser) {
  const r = {};
  // Before: the released demo app, while it is still the release before this one.
  const b = await open(browser, BEFORE);
  const beforeHasChip = (await b.page.locator('.sva-studychip').count()) > 0;
  if (!beforeHasChip) {
    r.before = await expandedProfile(b.page, 'profile-expanded-before.png', (m) => [m.controls && { ...m.controls, dx: m.controls.width + 14, dy: 20 }, m.chart && { ...m.chart, dy: 60 }, m.table && { ...m.table, dx: m.table.width / 2, dy: 12 }]);
    r.before.version = (await footer(b.page)).pop();
  } else if (kept.profile && kept.profile.before) {
    console.log('The released demo app is no longer the release before: keeping the earlier "before" read and still.');
    r.before = kept.profile.before;
    capture.stills['profile-expanded-before.png'] = kept.stills && kept.stills['profile-expanded-before.png'];
  } else {
    r.before = null;
  }
  await b.context.close();

  const t = await open(browser, BASE);
  r.after = await expandedProfile(t.page, 'profile-expanded.png', (m) => [m.controls && { ...m.controls, dx: m.controls.width + 4, dy: -10 }, m.chart && { ...m.chart, dy: 60 }, m.table && { ...m.table, dx: m.table.width / 2, dy: 12 }]);
  // Which charts carry the profile's panel is not walked here: one is.
  check('the expanded profile draws its chart beside its controls, and its table below both', r.after.expanded && r.after.beside && r.after.tableBelowBoth && !r.after.overTable, r.after);
  if (r.before && r.before.who) check('in release 1.12.0 the chart was below the controls and over the table', r.before.expanded && r.before.below && r.before.overTable, r.before);
  r.errors = t.errors;
  await t.context.close();
  return r;
}

// ---------------------------------------------------------------- 4. the Studies page
async function partStudies(browser) {
  const r = {};
  const t = await open(browser, BASE);
  const { page } = t;
  await page.click('.sva-studychip');
  await page.click('.sva-chip-menu [data-action="all-studies"]');
  await page.waitForTimeout(1200);
  r.title = await title(page);
  r.url = page.url().replace(BASE, '');
  r.lead = flat(await page.evaluate(() => [...document.querySelectorAll('p')].map((p) => p.innerText).find((s) => /Every study/.test(s))));
  r.subheads = await page.evaluate(() => [...document.querySelectorAll('h3.sva-studies-sub')].map((h) => h.innerText.trim()));
  r.ways = await page.evaluate(() => [...document.querySelectorAll('.sva-studies-way')].map((c) => ({ head: c.querySelector('strong').innerText.trim(), text: (c.querySelector('p')?.innerText || '').replace(/\s+/g, ' ').trim(), button: c.querySelector('button').innerText.trim() })));
  r.head = await page.evaluate(() => [...document.querySelectorAll('.sva-studies-top [role=columnheader]')].map((th) => th.innerText.trim()).filter(Boolean));
  r.rows = await page.evaluate(() =>
    [...document.querySelectorAll('.sva-studies-row:not(.sva-studies-top)')].map((row) => ({
      name: row.querySelector('strong').innerText.trim(),
      about: (row.querySelector('small')?.innerText || '').replace(/\s+/g, ' ').trim(),
      kind: (row.querySelector('.sva-kind')?.innerText || '').trim(),
      size: row.children[2].innerText.trim(),
      ready: row.children[3].innerText.trim(),
      button: (row.querySelector('button')?.innerText || '').trim(),
      inUse: row.dataset.current === 'true'
    }))
  );
  const addBox = await locBox(page.locator('h3.sva-studies-sub').first());
  const openBox = await locBox(page.locator('h3.sva-studies-sub').nth(1));
  const listTop = await box(page, '.sva-studies-list');
  r.still = await still(page, 'studies.png', { x: 0, y: 0, width: W, height: Math.min(H, listTop.y - 8) }, [addBox && { ...addBox, dx: addBox.width + 14 }, openBox && { ...openBox, dx: openBox.width + 14 }]);
  // The list, which runs below the fold.
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(400);
  const table = await box(page, '.sva-studies-list');
  const look = await locBox(page.locator('button:text-is("Look through the data")'));
  r.listStill = await still(page, 'studies-list.png', { x: 16, y: Math.max(0, table.y - 10), width: W - 32, height: Math.min(H - Math.max(0, table.y - 10), table.height + 20) }, [look && { ...look, dx: -14 }]);
  check('All studies opens a page titled Studies', /^Studies · /.test(r.title), r.title);
  check('the Studies page has Add a study and Open a study', same(r.subheads.map((s) => s.toLowerCase()), ['add a study', 'open a study']), r.subheads);
  check('Add a study offers files, a described study and a protocol', same(r.ways.map((w) => w.button.toLowerCase()), ['choose files', 'describe a study', 'open the builder']), r.ways.map((w) => `${w.head}: ${w.button}`));
  check('the Studies page lists seven studies', r.rows.length === 7, r.rows.map((x) => x.name));
  // Open one from the page.
  await page.locator('.sva-studies-row[data-study="preset:phase2-oncology"] button').click();
  await page.waitForFunction(() => (document.querySelector('.sva-studychip')?.innerText || '').includes('READY-P2'), null, { timeout: 60000 });
  await page.waitForTimeout(1000);
  r.opened = { chip: await chip(page), snap: await chipSnap(page), title: await title(page) };
  check('Open on the Studies page switches to that study', r.opened.chip === 'READY-P2', r.opened);
  r.errors = t.errors;
  await t.context.close();
  return r;
}

// ---------------------------------------------------------------- 5. files and mapping
async function partFiles(browser) {
  const r = {};
  const t = await open(browser, BASE);
  const { page } = t;
  await openOverview(page);
  r.faces = await page.evaluate(() => [...document.querySelectorAll('button.sva-face')].map((b) => ({ name: b.innerText.trim(), on: b.getAttribute('aria-selected') === 'true' })));
  r.viewerViews = (await views(page)).map((v) => v.name);
  r.rail = await page.evaluate(() => [...document.querySelectorAll('.sv-pick')].map((b) => b.innerText.replace(/\s+/g, ' ').trim()));
  r.heading = flat(await page.evaluate(() => document.querySelector('h1.sva-title')?.innerText));
  r.viewerTitle = flat(await page.evaluate(() => document.querySelector('h3.sv-title')?.innerText));
  {
    const faceBox = await locBox(page.locator('button.sva-face').first());
    const pick = await locBox(page.locator('.sv-pick'));
    const firstView = await locBox(page.locator('button.sv-view').first());
    const lastView = await locBox(page.locator('button.sv-view').last());
    const views3 = union(firstView, lastView);
    r.viewerStill = await still(page, 'viewer-pilot.png', { x: 0, y: 0, width: W, height: 640 }, [faceBox && { ...faceBox, dy: -8 }, pick && { ...pick, dx: -2 }, views3 && { ...views3, dx: views3.width + 16 }]);
  }
  await page.click('[data-action="files"]');
  await page.waitForTimeout(900);
  // The Files face: each file, the file picker, Reset, and the source a library brought.
  r.filesButtons = await page.evaluate(() => [...document.querySelectorAll('aside.sva-side button[data-action]')].filter((b) => b.offsetParent).map((b) => ({ text: b.innerText.trim(), action: b.dataset.action })));
  r.filesCards = await page.evaluate(() => document.querySelectorAll('details.sva-file-details').length);
  {
    const side = await box(page, 'aside.sva-side');
    const choose = await box(page, 'aside.sva-side [data-action="choose-files"]');
    const source = await box(page, 'aside.sva-side [data-action="source-build"]');
    const reset = await box(page, 'aside.sva-side [data-action="reset"]');
    const faceBox = await locBox(page.locator('button.sva-face').nth(1));
    r.filesStill = await still(page, 'files-face.png', { x: 0, y: 0, width: W, height: 640 }, [faceBox && { ...faceBox, dy: -8 }, choose && { ...choose, dy: -8 }, source && { ...source, dy: source.height + 10 }, reset && { ...reset, dx: reset.width + 12 }]);
    r.sideWidth = side && side.width;
  }
  r.details = await page.evaluate(() => [...document.querySelectorAll('details.sva-file-details')].map((d) => ({ file: d.dataset.details, summary: d.querySelector('summary').innerText.trim() })));
  r.workflow = flat(await page.evaluate(() => document.querySelector('aside.sva-side')?.innerText)).slice(0, 500);
  const d = page.locator('details.sva-file-details').first();
  await d.locator('summary').click();
  await page.waitForTimeout(500);
  r.opened = await d.evaluate((el) => ({
    heads: [...el.querySelectorAll('h4')].map((h) => h.innerText.trim()),
    kinds: [...el.querySelectorAll('table')][0] ? [...el.querySelectorAll('table')[0].querySelectorAll('tbody tr')].map((tr) => [...tr.children].map((td) => td.innerText.trim())) : [],
    rows: el.querySelectorAll('table')[1] ? el.querySelectorAll('table')[1].querySelectorAll('tbody tr').length : 0,
    buttons: [...el.querySelectorAll('button, a')].map((b) => b.innerText.trim())
  }));
  await d.evaluate((el) => {
    el.scrollIntoView({ block: 'start', behavior: 'instant' });
    window.scrollBy({ top: -150, behavior: 'instant' });
  });
  await page.waitForTimeout(300);
  const db = await locBox(d);
  const sum = await locBox(d.locator('summary'));
  const dl = await locBox(d.locator('button, a').last());
  r.detailsStill = await still(page, 'file-details.png', { x: db.x - 8, y: Math.max(0, db.y - 150), width: db.width + 16, height: Math.min(H, db.y + db.height + 22) - Math.max(0, db.y - 150) }, [sum && { ...sum, dx: -2 }, dl && { ...dl, dx: dl.width + 14 }]);
  check('the Overview tab opens on the loaded study, looked through', r.heading === 'Overview' && same(r.viewerViews, ['Tables', 'Columns', 'One participant']) && r.rail.length === 4, { heading: r.heading, views: r.viewerViews, rail: r.rail });
  check('the Files face keeps each file, the file picker and Reset, and offers Build a study', r.filesCards === 4 && ['choose-files', 'source-build', 'reset'].every((a) => r.filesButtons.some((b) => b.action === a)), r.filesButtons.map((b) => b.text));

  // A source draws in place of the loaded files, and gives them back.
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.click('aside.sva-side [data-action="source-build"]');
  await page.waitForSelector('[data-action="build"]', { timeout: 30000 });
  await page.waitForTimeout(1000);
  r.source = {
    title: await title(page),
    heads: await page.evaluate(() => [...document.querySelectorAll('main h2, main h3')].filter((h) => h.offsetParent && !h.closest('aside')).map((h) => h.innerText.replace(/\s+/g, ' ').trim()).slice(0, 3)),
    back: await page.evaluate(() => [...document.querySelectorAll('button')].filter((b) => b.offsetParent && /back to the loaded files/i.test(b.innerText)).map((b) => b.innerText.trim())[0] || null),
    cardsWhileOpen: await page.evaluate(() => [...document.querySelectorAll('details.sva-file-details')].filter((d) => d.offsetParent).length)
  };
  await page.locator('button', { hasText: /back to the loaded files/i }).first().click();
  await page.waitForTimeout(900);
  r.source.cardsAfter = await page.evaluate(() => [...document.querySelectorAll('details.sva-file-details')].filter((d) => d.offsetParent).length);
  check('Build a study on the Files face draws in place of the loaded files', /Build a study/i.test(r.source.heads.join(' ')) && !!r.source.back && r.source.cardsWhileOpen === 0 && r.source.cardsAfter === 4, r.source);
  check('each loaded file has a Details section', r.details.length === 4 && r.details.every((x) => /^Details: [\d,]+ rows, \d+ columns$/i.test(x.summary)), r.details.map((x) => x.summary));
  check('Details lists columns with their kind, the first 20 rows and a Download CSV button', r.opened.kinds.length > 0 && r.opened.kinds.every((k) => /^(number|date|text)$/.test(k[1])) && r.opened.rows === 20 && r.opened.buttons.some((x) => /download csv/i.test(x)), { heads: r.opened.heads, rows: r.opened.rows, buttons: r.opened.buttons });

  // Mapping in the viewer's Columns view, on the demo study whose columns are renamed.
  await chooseStudy(page, 'Renamed columns');
  await openOverview(page);
  await page.click('[data-action="explore"]');
  await page.waitForTimeout(900);
  const readMap = () =>
    page.evaluate(() => ({
      note: document.querySelector('.sv-roles .sv-note')?.innerText.trim(),
      rows: [...document.querySelectorAll('.sv-roles .sv-role')].map((l) => ({ label: l.querySelector('.sv-role-label')?.innerText.trim(), needed: l.querySelector('small')?.innerText.trim() || null, value: l.querySelector('select')?.value })),
      text: document.querySelector('.sv-roles')?.innerText.split('\n').map((x) => x.trim()).filter(Boolean).slice(0, 40),
      rest: [...document.querySelectorAll('.sv-roles > *')].map((e) => e.innerText.trim()).filter((s) => /already set/.test(s))[0] || null
    }));
  await section(page, 'Columns', null);
  r.mapping = { study: await chip(page), table: flat(await page.evaluate(() => document.querySelector('h3.sv-title')?.innerText)), before: { count: await count(page), tabs: await tabs(page), ...(await readMap()) } };
  const roles = await box(page, '.sv-roles');
  const noteBox = await box(page, '.sv-roles .sv-note');
  const needed = await locBox(page.locator('.sv-roles .sv-role', { has: page.locator('small') }).locator('select'));
  const colsTab = await locBox(page.locator('button.sv-view:text-is("Columns")'));
  r.mapping.still = await still(page, 'columns-mapping.png', { x: 0, y: 0, width: W, height: Math.min(H, roles.y + roles.height + 150) }, [colsTab && { ...colsTab, dy: -8 }, noteBox && { ...noteBox, dx: noteBox.width + 14 }, needed && { ...needed, dx: -14 }]);
  const target = r.mapping.before.rows.find((x) => x.needed);
  if (target) {
    const sel = page.locator('.sv-roles .sv-role', { has: page.locator(`.sv-role-label:text-is("${target.label}")`) }).locator('select');
    const options = await sel.evaluate((s) => [...s.options].map((o) => o.value).filter(Boolean));
    const pick = options.find((o) => /LASTDAY|DAY/i.test(o)) || options[options.length - 1];
    await sel.selectOption(pick);
    await page.waitForTimeout(1200);
    r.mapping.set = { label: target.label, needed: target.needed, to: pick };
    r.mapping.after = { count: await count(page), tabs: await tabs(page), ...(await readMap()) };
    await page.click('[data-action="files"]');
    await page.waitForTimeout(800);
    r.mapping.filesFace = await page.evaluate(
      ([label]) => {
        const row = [...document.querySelectorAll('tr')].find((tr) => tr.children[0] && tr.children[0].innerText.trim() === label);
        return row ? row.querySelector('select')?.value : null;
      },
      [target.label]
    );
    check('setting a column in the Columns view sets the mapping', r.mapping.before.note !== r.mapping.after.note && r.mapping.filesFace === pick, { before: r.mapping.before.note, after: r.mapping.after.note, countBefore: r.mapping.before.count, countAfter: r.mapping.after.count, filesFace: r.mapping.filesFace });
  } else {
    check('setting a column in the Columns view sets the mapping', false, 'no row needed by a chart was found to set');
  }
  r.errors = t.errors;
  await t.context.close();
  return r;
}

// ---------------------------------------------------------------- 6. the builder, with real R
async function openBuilder(page, button) {
  await page.click('.sva-studychip');
  await page.click('.sva-chip-menu [data-action="add-study"]');
  await page.waitForTimeout(900);
  const landed = { title: await title(page), url: page.url().replace(BASE, '') };
  await page.locator(`button:text-is("${button}")`).click();
  await page.waitForSelector('[data-action="build"]', { timeout: 30000 });
  await page.waitForTimeout(1200);
  return landed;
}
const willGet = (page) =>
  page.evaluate(() => {
    const h = [...document.querySelectorAll('h3')].find((x) => /what you will get/i.test(x.innerText));
    return h ? h.parentElement.innerText.split('\n').map((l) => l.trim()).filter(Boolean) : null;
  });
async function fillTrial(page, name) {
  await page.fill('input[name=name]', name);
  await page.keyboard.press('Tab');
  const phase = await page.evaluate((p) => {
    const lab = [...document.querySelectorAll('*')].find((e) => e.children.length === 0 && /^Phase/.test(e.textContent.trim()));
    const b = lab && [...lab.parentElement.querySelectorAll('button')].find((x) => x.innerText.trim() === p);
    if (b) b.click();
    return lab ? lab.textContent.trim() : null;
  }, BUILD.phase);
  await page.waitForTimeout(500);
  const typical = await page.evaluate(() => Object.fromEntries(['participants', 'sites', 'months'].map((n) => [n, document.querySelector(`input[name=${n}]`).value])));
  const set = {};
  for (const k of ['participants', 'sites', 'months', 'seed']) set[k] = await setNumber(page, k, BUILD[k]);
  return { phaseLabel: phase, typical, set };
}
async function runBuild(page, rCount) {
  const r0 = rCount();
  const t0 = Date.now();
  await page.click('[data-action="build"]');
  const log = [];
  let last = '';
  let panel = null;
  while (Date.now() - t0 < 420000) {
    await page.waitForTimeout(500);
    const now = await page.evaluate(() => {
      const h = [...document.querySelectorAll('h3')].find((x) => /^building/i.test(x.innerText.trim()));
      if (!h) return null;
      const items = [...h.parentElement.querySelectorAll('li')];
      return { head: h.innerText.trim(), steps: items.map((li) => li.innerText.replace(/\s+/g, ' ').trim()), state: items.map((li) => li.getAttribute('data-step') || '').join('|') };
    });
    if (now && !panel) panel = now;
    if (now && now.state !== last) {
      log.push({ s: +((Date.now() - t0) / 1000).toFixed(1), state: now.state });
      last = now.state;
    }
    if (await page.evaluate(() => [...document.querySelectorAll('button')].some((b) => b.offsetParent && /^load into the demo$/i.test(b.innerText.trim())))) break;
  }
  const r1 = rCount();
  return { seconds: +((Date.now() - t0) / 1000).toFixed(1), panel, log, runtime: r1.runtime - r0.runtime, packages: r1.packages - r0.packages };
}
const builtHead = (page) =>
  page.evaluate(() => {
    const badge = [...document.querySelectorAll('*')].find((e) => e.children.length === 0 && /^built in /i.test(e.textContent.trim()));
    const chips = [...document.querySelectorAll('*')].filter((e) => e.children.length >= 4 && /^Phase \d/.test((e.children[0].innerText || '').trim())).pop();
    return {
      builtIn: badge ? badge.textContent.trim() : null,
      facts: chips ? [...chips.children].map((c) => c.innerText.replace(/\s+/g, ' ').trim()) : [],
      buttons: [...document.querySelectorAll('button.sb-button')].filter((b) => b.offsetParent).map((b) => b.innerText.trim()),
      layers: [...document.querySelectorAll('button.sv-group')].map((b) => b.innerText.replace(/\s+/g, ' ').trim()),
      sections: [...document.querySelectorAll('button.sv-view')].map((b) => b.innerText.trim())
    };
  });
async function startRbqm(page, rCount) {
  await page.click('button.sva-view-tab');
  await page.waitForTimeout(1500);
  const before = { tab: await rbqmTab(page), note: flat(await page.evaluate(() => document.querySelector('.sva-rbqm-note, .sva-note')?.innerText || '')), startButton: (await page.locator('button:text-is("Start R")').count()) > 0 };
  before.words = flat(await bodyText(page)).match(/Site metrics need R[^.]*?START R|The site metrics cannot be worked out without R\.[^.]*\.[^.]*\./g) || [];
  const r0 = rCount();
  const t0 = Date.now();
  const log = [];
  let last = '';
  if (before.startButton) await page.locator('button:text-is("Start R")').first().click();
  while (Date.now() - t0 < 300000) {
    await page.waitForTimeout(500);
    const tab = await rbqmTab(page);
    if (tab !== last) {
      log.push({ s: +((Date.now() - t0) / 1000).toFixed(1), tab });
      last = tab;
    }
    if (/\d+ OF \d+/i.test(tab)) break;
  }
  await page.waitForTimeout(1500);
  const r1 = rCount();
  const said = flat(await bodyText(page)).match(/R ran \d+ of \d+ metrics.*?seconds\./);
  return { before, seconds: +((Date.now() - t0) / 1000).toFixed(1), log, runtime: r1.runtime - r0.runtime, packages: r1.packages - r0.packages, tab: await rbqmTab(page), said: said ? said[0] : null, rChip: flat(await page.evaluate(() => [...document.querySelectorAll('button')].map((b) => b.innerText).find((s) => /^\s*R READY/i.test(s)) || '')) };
}

async function partBuild(browser) {
  const r = {};
  const t = await open(browser, BASE);
  const { page } = t;
  r.addStudy = await openBuilder(page, 'Describe a study');
  r.form = {
    title: await title(page),
    url: page.url().replace(BASE, ''),
    heads: await page.evaluate(() => [...document.querySelectorAll('h2, h3')].filter((h) => h.offsetParent && !h.closest('header') && !h.closest('aside')).map((h) => h.innerText.replace(/\s+/g, ' ').trim())),
    labels: await page.evaluate(() => [...document.querySelectorAll('label.sb-field')].map((l) => l.innerText.replace(/\s+/g, ' ').trim())),
    protocols: await page.evaluate(() => [...document.querySelectorAll('[data-action="try-protocol"]')].map((b) => b.innerText.trim())),
    layers: await page.evaluate(() => [...document.querySelectorAll('button.sb-layer')].map((b) => b.innerText.replace(/\s+/g, ' ').trim())),
    domains: await page.evaluate(() => [...document.querySelectorAll('button.sb-chip')].map((b) => ({ name: b.innerText.trim(), on: b.getAttribute('aria-pressed') === 'true' }))),
    panel: await willGet(page),
    rail: flat(await page.evaluate(() => document.querySelector('aside.sva-side')?.innerText)).slice(0, 400),
    chip: await chip(page)
  };
  r.form.credit = flat(await page.evaluate(() => [...document.querySelectorAll('main p, main div')].filter((e) => e.offsetParent && /DDF-RA/.test(e.innerText) && ![...e.children].some((c) => /DDF-RA/.test(c.innerText))).map((e) => e.innerText)[0] || ''));
  r.form.terms = flat(await page.evaluate(() => [...document.querySelectorAll('main p')].filter((e) => e.offsetParent && /MedDRA/.test(e.innerText)).map((e) => e.innerText)[0] || ''));
  r.form.fetches = (r.form.panel || []).find((l) => /^First build/.test(l)) || '';
  r.trial = await fillTrial(page, BUILT_NAME);
  r.form.panelSet = await willGet(page);
  const buildBtn = await box(page, '[data-action="build"]');
  const proto = await locBox(page.locator('[data-action="try-protocol"]'));
  const layer = await locBox(page.locator('button.sb-layer'));
  const nameBox = await box(page, 'input[name=name]');
  r.form.still = await still(page, 'builder-form.png', null, [nameBox && { ...nameBox, dy: -10 }, proto && { ...proto, dy: -8 }, layer && { ...layer, dx: -2 }, buildBtn && { ...buildBtn, dx: -6 }]);
  // The panel at the right of the form, and the foot of the form: what a first
  // build fetches, and CDISC's attribution.
  {
    const rect = (pick, block) =>
      page.evaluate(
        ([which, where]) => {
          const finders = {
            panel: () => [...document.querySelectorAll('h3')].find((x) => /what you will get/i.test(x.innerText)).parentElement,
            note: () => [...document.querySelectorAll('p')].find((x) => x.offsetParent && /^First build/.test(x.innerText.trim())),
            credit: () => [...document.querySelectorAll('main p, main div')].filter((x) => x.offsetParent && /DDF-RA/.test(x.innerText) && ![...x.children].some((c) => /DDF-RA/.test(c.innerText)))[0],
            terms: () => [...document.querySelectorAll('main p')].find((x) => x.offsetParent && /MedDRA/.test(x.innerText))
          };
          const e = finders[which]();
          if (!e) return null;
          if (where) e.scrollIntoView({ block: where, behavior: 'instant' });
          const b = e.getBoundingClientRect();
          return { x: b.left, y: b.top, width: b.width, height: b.height };
        },
        [pick, block]
      );
    await rect('panel', 'center');
    await page.waitForTimeout(300);
    const panel = await rect('panel');
    const note = await rect('note');
    if (panel) r.form.panelStill = await still(page, 'builder-panel.png', pad(panel, 10), [note && { ...note, dx: -4, dy: 10 }]);
    await rect('credit', 'center');
    await page.waitForTimeout(300);
    const creditBox = await rect('credit');
    const terms = await rect('terms');
    if (creditBox) r.form.creditStill = await still(page, 'builder-credit.png', pad(union(creditBox, terms), 12), [{ ...creditBox, dx: -2, dy: 10 }]);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(300);
  }
  check('the builder says what a first build fetches, and that no study data is sent', /No study data is sent anywhere/.test(r.form.fetches) && /webr\.r-wasm\.org/.test(r.form.fetches) && /repo\.r-wasm\.org/.test(r.form.fetches), r.form.fetches);
  check('CDISC\'s attribution is under the builder', /DDF-RA/.test(r.form.credit) && /CC-BY-4\.0/.test(r.form.credit), r.form.credit.slice(0, 140));
  check('the builder names the simulator as a modified copy of gsm.datasim', /modified copy of gsm\.datasim/.test(r.form.terms), r.form.terms);

  // Build, and take the steps as R takes them.
  const pending = runBuild(page, t.rCount);
  await page.waitForFunction(() => [...document.querySelectorAll('h3')].some((x) => /^building/i.test(x.innerText.trim())), null, { timeout: 15000 });
  await page.waitForTimeout(1500);
  const stepsBox = await page.evaluate(() => {
    const h = [...document.querySelectorAll('h3')].find((x) => /^building/i.test(x.innerText.trim()));
    const el = h.parentElement;
    const b = el.getBoundingClientRect();
    return { x: b.left, y: b.top, width: b.width, height: b.height };
  });
  r.stepsStill = await still(page, 'build-steps.png', pad({ x: stepsBox.x, y: stepsBox.y, width: stepsBox.width, height: Math.min(stepsBox.height, 300) }, 6));
  r.build = await pending;
  await page.waitForTimeout(800);
  r.built = await builtHead(page);
  r.built.chipWhileBuilt = await chip(page);
  const load = await locBox(page.locator('button:text-is("Load into the demo")'));
  const builtBadge = await page.evaluate(() => {
    const e = [...document.querySelectorAll('*')].find((x) => x.children.length === 0 && /^built in /i.test(x.textContent.trim()));
    if (!e) return null;
    const b = e.getBoundingClientRect();
    return { x: b.left, y: b.top, width: b.width, height: b.height };
  });
  const secs = await locBox(page.locator('button.sv-view').first());
  r.built.still = await still(page, 'built.png', null, [builtBadge && { ...builtBadge, dy: -10 }, load && { ...load, dy: load.height + 12 }, secs && { ...secs, dx: -12 }]);
  check('the build says its four steps', r.build.panel && r.build.panel.steps.length === 4, r.build.panel);
  check('a described study is built by R in the browser', !!r.built.builtIn && r.build.runtime > 0, { seconds: r.build.seconds, builtIn: r.built.builtIn, runtime: r.build.runtime, packages: r.build.packages });
  check('the built study has the size that was asked for', r.built.facts.includes(`${BUILD.participants} participants`) && r.built.facts.includes(`${BUILD.sites} sites`), r.built.facts);

  // Load into the demo.
  await page.locator('button:text-is("Load into the demo")').click();
  await page.waitForFunction((n) => (document.querySelector('.sva-studychip')?.innerText || '').includes(n), BUILT_NAME, { timeout: 60000 });
  await page.waitForTimeout(2500);
  r.loaded = { title: await title(page), url: page.url().replace(BASE, ''), chip: await chip(page), count: await count(page), tabs: await tabs(page), sections: (await views(page)).map((v) => v.name) };
  r.loaded.menu = await readMenu(page);
  const menuBox = await box(page, '.sva-chip-menu');
  const mine = await locBox(page.locator('.sva-chip-menu .sva-chip-item', { has: page.locator(`.sva-chip-study:text-is("${BUILT_NAME}")`) }));
  r.loaded.still = await still(page, 'loaded-menu.png', { x: 0, y: 0, width: Math.max(760, menuBox.x + menuBox.width + 40), height: menuBox.y + menuBox.height + 18 }, [mine && { ...mine, dx: mine.width + 12 }]);
  await closeMenu(page);
  r.loaded.snap = await chipSnap(page);
  await page.click('.sva-chip-info');
  await page.waitForSelector('.sva-chip-card');
  r.loaded.card = await readCard(page);
  await closeMenu(page);
  check('the card of the built study says what made it', /modified copy of gsm\.datasim/.test(r.loaded.card.facts['Made by'] || ''), r.loaded.card.facts);
  check('Load into the demo makes the built study the study in use', r.loaded.chip === BUILT_NAME && r.loaded.menu.items.some((i) => i.name === BUILT_NAME && i.inUse && /simulated/i.test(i.kind)), { chip: r.loaded.chip, count: r.loaded.count });

  // A chart on the built study.
  await page.locator('button.sva-tab:has-text("Adverse events")').click();
  await page.waitForTimeout(2500);
  r.chart = { title: await title(page), item: await activeItem(page) };
  r.chart.still = await still(page, 'built-chart.png', { x: 0, y: 0, width: W, height: 620 });

  // The RBQM tab, after the builder has already started R.
  const rb = await startRbqmWithStill(page, t.rCount, 'rbqm-needs-r.png');
  r.rbqm = rb;
  r.rbqm.still = await still(page, 'rbqm-built.png', { x: 0, y: 0, width: W, height: 470 });
  check('the RBQM tab runs every site metric on the built study', /8 OF 8/i.test(r.rbqm.tab), { tab: r.rbqm.tab, said: r.rbqm.said });
  check('after a build, the RBQM tab starts no second R', r.rbqm.runtime === 0, { seconds: r.rbqm.seconds, runtime: r.rbqm.runtime, packages: r.rbqm.packages });

  // Is the built study kept by this browser? Reload and read the list.
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForSelector('.sva-tab');
  await page.waitForTimeout(1500);
  r.reload = { chip: await chip(page), title: await title(page) };
  r.reload.menu = await readMenu(page);
  await closeMenu(page);
  r.reload.kept = r.reload.menu.items.some((i) => i.name === BUILT_NAME);

  // A protocol in the form: no R until Build is pressed, and it is not pressed here.
  await openBuilder(page, 'Open the builder');
  const tp = page.locator('[data-action="try-protocol"]').first();
  r.protocol = { button: (await tp.innerText()).trim() };
  await tp.click();
  await page.waitForFunction(() => /SCHEDULE OF ACTIVITIES/i.test(document.body.innerText), null, { timeout: 60000 });
  await page.waitForTimeout(1200);
  r.protocol.note = flat(await page.evaluate(() => [...document.querySelectorAll('p, div')].filter((e) => e.children.length === 0 || e.tagName === 'P').map((e) => e.innerText).find((s) => /^The protocol /.test((s || '').trim()))));
  r.protocol.head = flat(await page.evaluate(() => [...document.querySelectorAll('h3')].map((h) => h.innerText).find((s) => /SCHEDULE OF ACTIVITIES/i.test(s))));
  r.protocol.lead = flat(await page.evaluate(() => {
    const h = [...document.querySelectorAll('h3')].find((x) => /SCHEDULE OF ACTIVITIES/i.test(x.innerText));
    return h && h.nextElementSibling ? h.nextElementSibling.innerText : '';
  })).slice(0, 300);
  await page.evaluate(() => {
    const h = [...document.querySelectorAll('h3')].find((x) => /SCHEDULE OF ACTIVITIES/i.test(x.innerText));
    h.scrollIntoView({ block: 'start', behavior: 'instant' });
    window.scrollBy({ top: -40, behavior: 'instant' });
  });
  await page.waitForTimeout(400);
  r.protocol.still = await still(page, 'builder-protocol.png', { x: 318, y: 0, width: 700, height: 640 });
  r.protocol.chance = await page.evaluate(() => {
    const th = [...document.querySelectorAll('th')].find((x) => /Chance of seeing it/.test(x.innerText));
    if (!th) return null;
    const table = th.closest('table');
    return { heads: [...table.querySelectorAll('th')].map((x) => x.innerText.replace(/\s+/g, ' ').trim()), rows: [...table.querySelectorAll('tbody tr')].map((tr) => [...tr.children].map((td) => td.innerText.replace(/\s+/g, ' ').trim())) };
  });
  r.protocol.credit = flat(await page.evaluate(() => [...document.querySelectorAll('main p, main div')].filter((e) => e.offsetParent && /DDF-RA/.test(e.innerText) && ![...e.children].some((c) => /DDF-RA/.test(c.innerText))).map((e) => e.innerText)[0] || ''));
  check('the builder offers five example protocols', r.form.protocols.length === 5, r.form.protocols);
  check('a protocol puts its schedule of activities in the form', /SCHEDULE OF ACTIVITIES/i.test(r.protocol.head), r.protocol.head);
  r.errors = t.errors;
  await t.context.close();
  return r;
}
async function startRbqmWithStill(page, rCount, file) {
  await page.click('button.sva-view-tab');
  await page.waitForTimeout(1500);
  const st = await still(page, file, { x: 0, y: 0, width: W, height: 330 });
  const rb = await startRbqm(page, rCount);
  rb.before.still = st;
  return rb;
}

// ---------------------------------------------------------------- 7. the other order: RBQM first, then a build
async function partOtherOrder(browser) {
  const r = {};
  const t = await open(browser, BASE);
  const { page } = t;
  r.rbqm = await startRbqm(page, t.rCount);
  await openBuilder(page, 'Describe a study');
  r.panelAfterR = await willGet(page);
  r.trial = await fillTrial(page, 'DEMO-SECOND');
  r.build = await runBuild(page, t.rCount);
  r.built = await builtHead(page);
  // Save, then reload: is a saved study in the list?
  const save = page.locator('button.sb-button:text-is("Save")');
  r.saveButton = (await save.count()) > 0;
  if (r.saveButton) {
    await save.click();
    await page.waitForTimeout(1500);
    r.afterSave = await page.evaluate(() => [...document.querySelectorAll('button.sb-button')].filter((b) => b.offsetParent).map((b) => b.innerText.trim()));
  }
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForSelector('.sva-tab');
  await page.waitForTimeout(1500);
  r.reload = { chip: await chip(page), menu: await readMenu(page) };
  r.reload.kept = r.reload.menu.items.some((i) => i.name === 'DEMO-SECOND');
  await closeMenu(page);
  check('after the RBQM tab has started R, a build starts no second R', r.build.runtime === 0 && r.rbqm.runtime > 0, { rbqm: { seconds: r.rbqm.seconds, runtime: r.rbqm.runtime, packages: r.rbqm.packages }, build: { seconds: r.build.seconds, runtime: r.build.runtime, packages: r.build.packages } });
  r.errors = t.errors;
  await t.context.close();
  return r;
}

// ---------------------------------------------------------------- run
(async () => {
  capture.site.captured = new Date().toISOString();
  // A build of your own is named in words, not by where it was served from.
  const own = BASE !== RELEASED && BASE !== DEV;
  capture.site.after = own ? null : BASE;
  capture.site.before = BEFORE;
  capture.site.after_is = process.env.BUILD_IS || (BASE === RELEASED ? 'the released site' : BASE === DEV ? 'the dev site' : 'a build of the candidate');
  const branch = BASE === RELEASED ? 'main' : 'dev';
  capture.site.branch = own ? null : branch;
  if (process.env.COMMIT) {
    capture.site.commit = process.env.COMMIT;
  } else try {
    // Public API, no token.
    const res = await fetch(`https://api.github.com/repos/jwildfire/safety.viz/commits/${branch}`, { headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'demo-page-capture' } });
    const j = res.ok ? await res.json() : null;
    capture.site.commit = j ? j.sha : null;
    capture.site.commit_message = j ? j.commit.message.split('\n')[0] : null;
  } catch {
    capture.site.commit = null;
  }
  capture.build_settings = { name: BUILT_NAME, ...BUILD };

  const browser = await chromium.launch();
  const run = { chip: partChip, switch: partSwitch, sections: partSections, snapshot: partSnapshot, studies: partStudies, files: partFiles, build: partBuild, other: partOtherOrder, profile: partProfile };
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
  const allowed = ['the app’s own host', 'webr.r-wasm.org', 'repo.r-wasm.org', new URL(BEFORE).host];
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
