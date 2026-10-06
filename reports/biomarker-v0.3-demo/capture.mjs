// Captures for the bio.viz v0.3.0 and gsm.bio v0.3.0 demo page. Real webR on the
// live site: the group comparison starts R in the browser the first time a
// biomarker is opened. Needs Playwright, from a bio.viz or safety.viz checkout:
//   PLAYWRIGHT_PACKAGE=<checkout>/package.json node capture.mjs <out dir> <scratch dir>
// Sections 1-6 read the live bio.viz site. Section 7 opens the gsm.bio widget
// that gsm-bio.R saved into <scratch dir>/widgets, from disk with the network
// off, and the live gsm.bio reference page. Stills go to <out dir>/media, and
// every number read to <out dir>/capture-numbers.json. ONLY=1,3 runs some
// sections and keeps the others' numbers.
import { createRequire } from 'node:module';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
const { chromium } = createRequire(process.env.PLAYWRIGHT_PACKAGE || import.meta.url)('playwright');

// The dev site by default: it carries v0.3.0 from the day its release
// preparation merges. Before that, BASE=https://jwildfire.github.io/bio.viz/pr/109/.
const BASE = process.env.BASE || 'https://jwildfire.github.io/bio.viz/dev/';
const REFERENCE = 'https://jwildfire.github.io/gsm.bio/reference/Widget_GroupComparison.html';
const [out, scratch] = process.argv.slice(2);
const media = path.join(out, 'media');
mkdirSync(media, { recursive: true });
mkdirSync(scratch, { recursive: true });
const numbersFile = path.join(out, 'capture-numbers.json');
const readNumbers = () => (existsSync(numbersFile) ? JSON.parse(readFileSync(numbersFile, 'utf8')) : {});
const numbers = readNumbers();
const asRead = Object.fromEntries(Object.entries(numbers).map(([k, v]) => [k, JSON.stringify(v)]));
numbers.base = BASE;
const ONLY = (process.env.ONLY || '1,2,3,4,5,6,7').split(',');
for (const s of ONLY) (numbers.captured_at ||= {})[s] = new Date().toISOString();

const browser = await chromium.launch();
const desktop = { viewport: { width: 1280, height: 900 }, deviceScaleFactor: 1.5 };
const phone = { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true };

const shot = async (target, name, opts = {}) => {
  await target.screenshot({ path: path.join(media, `${name}.jpg`), type: 'jpeg', quality: 78, ...opts });
  console.log('captured', name);
};
const settle = (page, ms = 900) => page.waitForTimeout(ms);
const text = (page, sel) => page.locator(sel).first().innerText();
const texts = (page, sel) => page.locator(sel).allInnerTexts();
const open = async (context, slug) => {
  const page = await context.newPage();
  const errors = [];
  const rRequests = [];
  page.on('pageerror', (e) => errors.push(e.message));
  // Anything that would start R: webR itself, a WebAssembly file, the statistics file.
  page.on('request', (r) => { if (/webr|\.wasm|r-wasm|statistics\.R/i.test(r.url())) rRequests.push(r.url()); });
  await page.goto(`${BASE}${slug}/index.html`);
  await page.evaluate('window.BioVizDemo.ready');
  await page.evaluate(() => document.fonts.ready);
  return { page, errors, rRequests };
};
// The row of tests under the visits has R's answer (root: the chart's element).
const waitRow = (page, root, previous = null) =>
  page.waitForFunction(
    ([root, previous]) => {
      const row = document.querySelector(`${root} .bv-time-table tr[data-row="test"]`);
      return row && row.dataset.state === 'shown' && (previous === null || row.innerText !== previous);
    },
    [root, previous],
    { timeout: 400000 }
  );
// One visit's own statistics line has R's answer.
const waitLine = (page, root) =>
  page.waitForFunction(
    (root) => document.querySelector(`${root} .sv-main > .bv-statistic`)?.dataset.state === 'shown',
    root,
    { timeout: 400000 }
  );
const readTime = async (page, root) => ({
  titles: await text(page, `${root} .bv-titles`),
  trail: await texts(page, `${root} .bv-trail li`),
  notes: await text(page, `${root} .sv-notes`),
  key: await text(page, `${root} .bv-time-key`),
  visits: await texts(page, `${root} .bv-time-visit`),
  n: await page.locator(`${root} .bv-time-table tr[data-row="n"]`).evaluateAll((rows) =>
    rows.map((r) => ({ group: r.dataset.group, n: [...r.querySelectorAll('td[data-visit]')].map((c) => c.innerText) }))),
  test_head: await text(page, `${root} .bv-time-table tr[data-row="test"] th`),
  test: await page.locator(`${root} .bv-time-table tr[data-row="test"] td[data-visit]`).evaluateAll((cells) =>
    cells.map((c) => ({ visit: c.dataset.visit, status: c.dataset.status, text: c.innerText, title: c.title }))),
  test_row: await text(page, `${root} .bv-time-table tr[data-row="test"]`),
  line: await text(page, `${root} .bv-time-line`),
  foot: await texts(page, `${root} .bv-foot-line`)
});
const readVisit = async (page, root) => ({
  titles: await text(page, `${root} .bv-titles`),
  trail: await texts(page, `${root} .bv-trail li`),
  notes: await text(page, `${root} .sv-notes`),
  statistics: await text(page, `${root} .sv-main > .bv-statistic`),
  foot: await texts(page, `${root} .bv-foot-line`)
});
const C = '#chart';

if (ONLY.includes('1')) // ---- 1. every biomarker: the trend tiles, and R asked for nothing
{
  const context = await browser.newContext(desktop);
  const { page, errors, rRequests } = await open(context, 'group-comparison');
  await settle(page, 1500);
  const read = async () => ({
    titles: await text(page, `${C} .bv-titles`),
    key: await text(page, `${C} .bv-tile-key`),
    caption: await text(page, `${C} .bv-tile-caption`),
    tiles: await page.locator(`${C} .bv-tile`).evaluateAll((tiles) =>
      tiles.map((t) => ({
        biomarker: t.dataset.measure,
        visits: [...t.querySelectorAll('.bv-tile-visits span')].map((s) => s.innerText),
        range: t.querySelector('.bv-tile-range').innerText,
        label: t.getAttribute('aria-label')
      }))),
    statistic_state: await page.locator(`${C} .sv-main > .bv-statistic`).getAttribute('data-state'),
    foot: await texts(page, `${C} .bv-foot-line`),
    disabled_controls: await page.locator(`${C} .sv-sidebar select[data-control]:disabled`).evaluateAll((s) => s.map((e) => e.dataset.control))
  });
  numbers.tiles = await read();
  numbers.tiles.version = await text(page, 'header').catch(() => null);
  numbers.tiles.r_requests_before_a_tile_is_opened = rRequests.slice();
  await shot(page.locator(`${C} .sv-main`), 'tiles');
  await page.locator(`${C} select[data-control="tile-summary"]`).selectOption('mean');
  await settle(page, 800);
  numbers.tiles_means = { key: await text(page, `${C} .bv-tile-key`), r_requests: rRequests.slice() };
  numbers.tiles.errors = errors;
  await context.close();

  // On a phone: the tiles as the chart lays them out at 390 pixels.
  const small = await browser.newContext(phone);
  const p = await open(small, 'group-comparison');
  await settle(p.page, 1500);
  await p.page.locator(`${C} .bv-tile-key`).evaluate((el) => window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 12, behavior: 'instant' }));
  await settle(p.page, 500);
  numbers.tiles_phone = {
    scroll_width: await p.page.evaluate(() => document.documentElement.scrollWidth),
    tiles_per_row: await p.page.locator(`${C} .bv-tile`).evaluateAll((t) => t.filter((e) => e.getBoundingClientRect().top === t[0].getBoundingClientRect().top).length)
  };
  await shot(p.page, 'tiles-phone');
  await small.close();
}

if (ONLY.includes('2')) // ---- 2. one biomarker over time: R's test under each visit, and the adjustment
{
  const context = await browser.newContext(desktop);
  const { page, errors, rRequests } = await open(context, 'group-comparison');
  numbers.over_time_r_requests_before = rRequests.length;
  await page.locator(`${C} .bv-tile[data-measure="IL-6"]`).click();
  await settle(page, 400);
  numbers.over_time_waiting = await text(page, `${C} .bv-time-line`).catch(() => null);
  await waitRow(page, C);
  await settle(page, 1200);
  numbers.over_time_il6 = await readTime(page, C);
  numbers.over_time_r_requests_after = rRequests.length;
  await shot(page.locator(`${C} .sv-main`), 'over-time');
  // D-dimer, as medians with quartiles: unadjusted, then Holm, then Benjamini and Hochberg.
  let before = await text(page, `${C} .bv-time-table tr[data-row="test"]`);
  await page.locator(`${C} select[data-control="measure"]`).selectOption('D-dimer');
  await waitRow(page, C, before);
  await page.locator(`${C} select[data-control="time-mark"]`).selectOption('median_iqr');
  await settle(page, 1200);
  numbers.over_time_ddimer = await readTime(page, C);
  for (const [method, key] of [['holm', 'over_time_ddimer_holm'], ['BH', 'over_time_ddimer_bh']]) {
    before = await text(page, `${C} .bv-time-table tr[data-row="test"]`);
    await page.locator(`${C} select[data-control="visit-adjustment"]`).selectOption(method);
    await waitRow(page, C, before);
    await settle(page, 1200);
    numbers[key] = await readTime(page, C);
    if (method === 'holm') await shot(page.locator(`${C} .sv-main`), 'over-time-adjusted');
  }
  numbers.over_time_il6.errors = errors;
  await context.close();

  // On a phone: IL-6 over time, the picture and its table holding five visits.
  const small = await browser.newContext(phone);
  const p = await open(small, 'group-comparison');
  await p.page.locator(`${C} .bv-tile[data-measure="IL-6"]`).click();
  await waitRow(p.page, C);
  await settle(p.page, 1200);
  await p.page.locator(`${C} .bv-time-key`).evaluate((el) => window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 12, behavior: 'instant' }));
  await p.page.evaluate(() => document.activeElement && document.activeElement.blur());
  await settle(p.page, 500);
  numbers.over_time_phone = {
    scroll_width: await p.page.evaluate(() => document.documentElement.scrollWidth),
    test_row: await text(p.page, `${C} .bv-time-table tr[data-row="test"]`),
    table_scrolls_inside: await p.page.locator(`${C} .bv-time-scroll`).evaluate((el) => el.scrollWidth > el.clientWidth)
  };
  await shot(p.page, 'over-time-phone');
  await small.close();
}

if (ONLY.includes('3')) // ---- 3. one visit, opened from the picture, and the trail back up
{
  const context = await browser.newContext(desktop);
  const { page, errors } = await open(context, 'group-comparison');
  await page.locator(`${C} .bv-tile[data-measure="IL-6"]`).click();
  await waitRow(page, C);
  await page.locator(`${C} .bv-time-visit[data-visit="Week 4"]`).click();
  await waitLine(page, C);
  await settle(page, 1500);
  numbers.one_visit = await readVisit(page, C);
  numbers.one_visit.enabled_controls = await page.locator(`${C} .sv-sidebar select[data-control]:enabled`).evaluateAll((s) => s.map((e) => e.dataset.control));
  await shot(page.locator(`${C} .sv-main`), 'one-visit');
  // The trail leads back up, a level at a time.
  await page.locator(`${C} .bv-trail button`, { hasText: 'IL-6 over time' }).click();
  await waitRow(page, C);
  numbers.one_visit.trail_after_one_step_up = await texts(page, `${C} .bv-trail li`);
  await page.locator(`${C} .bv-trail button`, { hasText: 'All biomarkers' }).click();
  await page.waitForSelector(`${C} .bv-tile`, { timeout: 30000 });
  numbers.one_visit.tiles_after_two_steps_up = await page.locator(`${C} .bv-tile`).count();
  numbers.one_visit.errors = errors;
  await context.close();
}

// What sections 4 and 5 type into the page, as a reader can in the browser's
// console: a second chart beside the demo's, from the same study and settings.
const UNSCHEDULED = `const demo = BioVizDemo.groupComparison;
const study = await BioVizDemo.loadStudy('../data/synthetic-study/');
const el = document.createElement('div');
el.id = 'unscheduled';
document.querySelector('#chart').before(el);
const chart = BioViz.groupComparison('#unscheduled', {
  ...demo.settings,
  unscheduled_visit_values: ['Week 2'],
  connection: BioViz.r.createConnection({ browser: demo.browser })
});
await chart.init(demo.tables(study));`;
const SMALL = `const demo = BioVizDemo.crossTab;
const study = await BioVizDemo.loadStudy('../data/synthetic-study/');
const el = document.createElement('div');
el.id = 'small';
document.querySelector('#chart').before(el);
const chart = BioViz.crossTab('#small', {
  ...demo.settings,
  row_by: 'RESPONSE',
  col_by: { measure: 'CRP', visit: 'Baseline', cut: [9.5] },
  test: 'fisher',
  connection: BioViz.r.createConnection({ browser: demo.browser })
});
await chart.init(demo.tables(study));`;
const run = (page, code) => page.evaluate(`(async () => { ${code} })()`);

if (ONLY.includes('4')) // ---- 4. unscheduled visits: the study has none, so one visit is named as unscheduled
{
  const context = await browser.newContext(desktop);
  const { page, errors } = await open(context, 'group-comparison');
  numbers.unscheduled = { typed: UNSCHEDULED, study_note: await page.locator(`${C} .bv-hidden-visits`).count() };
  await run(page, UNSCHEDULED);
  const U = '#unscheduled';
  await page.waitForSelector(`${U} .bv-tile`);
  await settle(page, 1500);
  Object.assign(numbers.unscheduled, {
    titles: await text(page, `${U} .bv-titles`),
    note: await text(page, `${U} .bv-hidden-visits`),
    tile_visits: await texts(page, `${U} .bv-tile[data-measure="IL-6"] .bv-tile-visits span`),
    visit_control: await text(page, `${U} [data-control="visits"] summary`),
    controls: await page.locator(`${U} .sv-sidebar [data-control]`).evaluateAll((c) => c.map((e) => e.dataset.control))
  });
  // The chart's own frame down to the first row of tiles: the title, the note and the key.
  const top = await page.locator(`${U} .sv-main`).boundingBox();
  const row = await page.locator(`${U} .bv-tile`).first().boundingBox();
  await page.locator(`${U} .bv-titles`).scrollIntoViewIfNeeded();
  const now = await page.locator(`${U} .sv-main`).boundingBox();
  const first = await page.locator(`${U} .bv-tile`).first().boundingBox();
  await shot(page, 'unscheduled', { clip: { x: now.x - 8, y: now.y - 8, width: top.width + 16, height: first.y + row.height - now.y + 20 } });
  // Opened: IL-6 over time has four visits, and R tests four.
  await page.locator(`${U} .bv-tile[data-measure="IL-6"]`).click();
  await waitRow(page, U);
  numbers.unscheduled.over_time = await readTime(page, U);
  // Switched on: the visit is drawn again.
  const control = page.locator(`${U} .sv-sidebar input[data-control*="unscheduled"]`);
  numbers.unscheduled.control = await control.getAttribute('data-control');
  const before = await text(page, `${U} .bv-time-table tr[data-row="test"]`);
  await control.check();
  await waitRow(page, U, before);
  numbers.unscheduled.switched_on = { visits: await texts(page, `${U} .bv-time-visit`), note: await page.locator(`${U} .bv-hidden-visits`).innerText().catch(() => null), test_row: await text(page, `${U} .bv-time-table tr[data-row="test"]`) };
  numbers.unscheduled.errors = errors;
  await context.close();
}

if (ONLY.includes('5')) // ---- 5. Fisher's exact test of a table with a small category
{
  const context = await browser.newContext(desktop);
  const { page, errors } = await open(context, 'cross-tab');
  await run(page, SMALL);
  const S = '#small';
  const waitStat = (previous = null) =>
    page.waitForFunction(
      ([S, previous]) => {
        const line = document.querySelector(`${S} .bv-statistic`);
        // Shown, or R's reason for no number: anything but waiting.
        return line && !/waiting|empty/.test(line.dataset.state) && (previous === null || line.innerText !== previous);
      },
      [S, previous],
      { timeout: 400000 }
    );
  await waitStat();
  await settle(page, 1500);
  numbers.fisher_small = {
    typed: SMALL,
    titles: await text(page, `${S} .bv-titles`),
    table: await text(page, `${S} table.bv-crosstab`),
    statistics: await text(page, `${S} .bv-statistic`),
    foot: await texts(page, `${S} .bv-foot-line`)
  };
  await shot(page.locator(`${S} .sv-main`), 'fisher-small');
  // The chi-square test of the same table is still withheld.
  const fisher = numbers.fisher_small.statistics;
  await page.locator(`${S} select[data-control="test"]`).selectOption('chisq');
  await waitStat(fisher);
  numbers.fisher_small.chisq = await text(page, `${S} .bv-statistic`);
  numbers.fisher_small.chisq_state = await page.locator(`${S} .bv-statistic`).first().getAttribute('data-state');
  numbers.fisher_small.errors = errors;
  await context.close();
}

if (ONLY.includes('6')) // ---- 6. the site, laid out as safety.viz's
{
  const context = await browser.newContext(desktop);
  const page = await context.newPage();
  await page.goto(`${BASE}gallery/index.html`);
  await page.waitForLoadState('networkidle');
  await page.evaluate(() => document.fonts.ready);
  await settle(page, 1200);
  numbers.site = {
    header: await text(page, 'header'),
    charts: await page.locator('main h2, main h3').allInnerTexts(),
    pictures: await page.locator('main img').count(),
    footer: await text(page, 'footer'),
    stylesheets: await page.locator('link[rel="stylesheet"]').evaluateAll((l) => l.map((e) => e.getAttribute('href')))
  };
  await shot(page, 'site-gallery');
  await context.close();
  const small = await browser.newContext(phone);
  const p = await small.newPage();
  await p.goto(`${BASE}gallery/index.html`);
  await p.waitForLoadState('networkidle');
  await settle(p, 1200);
  numbers.site.phone_scroll_width = await p.evaluate(() => document.documentElement.scrollWidth);
  await shot(p, 'site-phone');
  await small.close();
}

if (ONLY.includes('7')) // ---- 7. gsm.bio: the saved widget with the network off, and the live reference page
{
  const context = await browser.newContext({ ...desktop, offline: true });
  const requests = [];
  // Any request beyond the file itself: the network, or a file beside it.
  context.on('request', (r) => { if (!/^(data|blob):/.test(r.url()) && !/\/widgets\/widget-[a-z-]+\.html$/.test(r.url())) requests.push(r.url()); });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(`file://${path.resolve(scratch, 'widgets', 'widget-group-comparison.html')}`);
  const W = '.html-widget';
  await page.waitForSelector(`${W} .bv-tile`, { timeout: 60000 });
  await settle(page, 2000);
  numbers.widget = {
    tiles: await page.locator(`${W} .bv-tile`).count(),
    titles: await text(page, `${W} .bv-titles`),
    tiles_foot: await texts(page, `${W} .bv-foot-line`)
  };
  await page.locator(`${W} .bv-tile[data-measure="IL-6"]`).click();
  await waitRow(page, W);
  await settle(page, 1500);
  numbers.widget.over_time = await readTime(page, W);
  await shot(page.locator(`${W} .sv-main`), 'widget-over-time');
  // The call named Holm, so the page opens adjusted; the unadjusted row is stored too.
  numbers.widget.adjustment_opened_on = await page.locator(`${W} select[data-control="visit-adjustment"]`).inputValue();
  let before = await text(page, `${W} .bv-time-table tr[data-row="test"]`);
  await page.locator(`${W} select[data-control="visit-adjustment"]`).selectOption('none');
  await waitRow(page, W, before);
  numbers.widget.over_time_unadjusted = await readTime(page, W);
  // An adjustment the call did not name was not computed, and the page says so.
  await page.locator(`${W} select[data-control="visit-adjustment"]`).selectOption('BH');
  await settle(page, 1500);
  numbers.widget.over_time_bh = { test_row: await text(page, `${W} .bv-time-table tr[data-row="test"]`), line: await text(page, `${W} .bv-time-line`) };
  await page.locator(`${W} select[data-control="visit-adjustment"]`).selectOption('holm');
  await waitRow(page, W);
  await settle(page, 800);
  await page.locator(`${W} .bv-time-visit[data-visit="Week 4"]`).click();
  await waitLine(page, W);
  await settle(page, 1500);
  numbers.widget.one_visit = await readVisit(page, W);
  await shot(page.locator(`${W} .sv-main`), 'widget-one-visit');
  numbers.widget.errors = errors;
  numbers.widget.network_requests = requests;
  await context.close();

  // The live reference page: its example is the widget, with its tests stored.
  const live = await browser.newContext(desktop);
  const g = await live.newPage();
  await g.goto(REFERENCE);
  await g.waitForLoadState('networkidle');
  await g.waitForSelector(`${W} .bv-tile`, { timeout: 60000 });
  await settle(g, 2000);
  await g.locator(`${W} .bv-tile[data-measure="IL-6"]`).click();
  await waitRow(g, W);
  await settle(g, 1200);
  numbers.reference = {
    site_version: await g.locator('.navbar small, small.nav-text').first().innerText().catch(() => null),
    over_time: await readTime(g, W)
  };
  await g.locator(`${W} .bv-titles`).evaluate((el) => window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 70, behavior: 'instant' }));
  await settle(g, 800);
  await shot(g, 'reference');
  await live.close();
}

// Sections may be run side by side: write only what this run read, over the file as it is now.
const latest = readNumbers();
for (const [k, v] of Object.entries(numbers)) {
  if (k === 'captured_at') latest[k] = { ...(latest[k] || {}), ...Object.fromEntries(ONLY.map((s) => [s, v[s]])) };
  else if (JSON.stringify(v) !== asRead[k]) latest[k] = v;
}
writeFileSync(numbersFile, JSON.stringify(latest, null, 2) + '\n');
await browser.close();
console.log('done');
