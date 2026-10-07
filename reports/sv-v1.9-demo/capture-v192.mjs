// Captures and number checks for the v1.9.2 note on the safety.viz v1.9 demo
// page: the demo app's Biomarkers tab rebuilt on bio.viz v0.3.0 and gsm.bio
// v0.3.0, walked with real webR, and the demo app as the installer serves it
// on this machine.
//
//   node capture-v192.mjs <out dir>
//
// Stills go to <out dir>/media as v192-*.jpg; every number read, and a check of
// each against what the note prints, goes to <out dir>/capture-v192-numbers.json.
// The script exits 1 when a check fails.
//
//   PLAYWRIGHT_FROM=<a package.json whose node_modules holds playwright>
//   BASE=<the demo app's address>   (default: the dev site's)
//   LOCAL=http://127.0.0.1:8711/    also captures the page the installer serves
//   ONLY=1,2,3                      1 desktop walk, 2 phone, 3 the local page
import { createRequire } from 'node:module';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const from = process.env.PLAYWRIGHT_FROM || path.resolve('package.json');
const { chromium } = createRequire(from)('playwright');

const BASE = process.env.BASE || 'https://jwildfire.github.io/safety.viz/dev/demo/';
const LOCAL = process.env.LOCAL || null;
const [out] = process.argv.slice(2);
if (!out) throw new Error('Usage: node capture-v192.mjs <out dir>');
const media = path.join(out, 'media');
mkdirSync(media, { recursive: true });
const ONLY = (process.env.ONLY || '1,2,3').split(',');
const numbersFile = path.join(out, 'capture-v192-numbers.json');
const numbers = existsSync(numbersFile) ? JSON.parse(readFileSync(numbersFile, 'utf8')) : {};
numbers.base = BASE;
(numbers.captured_at ||= {})[process.env.ONLY || 'all'] = new Date().toISOString();
const save = () => writeFileSync(numbersFile, JSON.stringify(numbers, null, 2) + '\n');

// What the note prints, held to what the page shows.
const checks = (numbers.checks ||= {});
const check = (name, actual, expected) => {
  const pass = JSON.stringify(actual) === JSON.stringify(expected);
  checks[name] = pass ? { pass } : { pass, actual, expected };
  if (!pass) console.error('CHECK FAILED', name, JSON.stringify(actual), '!=', JSON.stringify(expected));
};

const R_HOSTS = ['webr.r-wasm.org', 'repo.r-wasm.org'];
const ALT = 'Alanine Aminotransferase';
const VISITS = ['Baseline', 'Week 2', 'Week 4', 'Week 6', 'Week 8', 'Week 12', 'Week 16', 'Week 20', 'Week 24', 'Week 26'];
const P_VALUES = ['0.515', '0.127', '0.005', '0.037', '0.013', '0.380', '0.170', '0.050', '0.517', '0.252'].map((p) => `p = ${p}`);

const browser = await chromium.launch();
const desktop = { viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1.5 };
const phone = { viewport: { width: 390, height: 844 }, deviceScaleFactor: 1.5, hasTouch: true, isMobile: true };
const shot = async (page, name, opts = {}) => {
  await page.screenshot({ path: path.join(media, `${name}.jpg`), type: 'jpeg', quality: 72, ...opts });
  console.log('captured', name);
};
const settle = (page, ms = 900) => page.waitForTimeout(ms);
const squash = (s) => s.replace(/\s+/g, ' ').trim();
const tabs = (page) => page.locator('.sva-tab').evaluateAll((all) => all.map((t) => t.innerText.replace(/\s+/g, ' ').trim()));
const scrollTo = async (page, selector, above = 20) => {
  await page.evaluate(
    ([sel, gap]) => {
      const el = document.querySelector(sel);
      window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - gap, behavior: 'instant' });
    },
    [selector, above]
  );
  await settle(page, 500);
};
const openApp = async (page, address = BASE) => {
  await page.goto(address);
  await page.evaluate('window.__safetyVizApp.ready');
  await page.evaluate(() => document.fonts.ready);
  await settle(page, 1200);
};
const openBiomarkers = async (page) => {
  await page.locator('.sva-tab[data-domain="biomarkers"]').scrollIntoViewIfNeeded();
  await page.locator('.sva-tab[data-domain="biomarkers"]').click();
  await page.waitForSelector('.sva-chart .bv-tile', { timeout: 60000 });
  await settle(page, 1500);
};
const startR = async (page) => {
  await page.locator('.sva-action').click();
  await page.waitForFunction(() => /R started/.test(document.querySelector('.sva-action').textContent), null, { timeout: 240000 });
};
const trail = (page) =>
  page.locator('.sva-chart .bv-trail li').evaluateAll((items) => items.map((li) => li.innerText.trim()));
const timeTable = (page) =>
  page.locator('.sva-chart .bv-time-table tr').evaluateAll((rows) =>
    rows.map((row) => [...row.children].map((cell) => cell.innerText.replace(/\s+/g, ' ').trim()).filter(Boolean))
  );
const statisticLines = async (page) =>
  (await page.locator('.sva-chart .bv-statistic').allInnerTexts()).map(squash).filter(Boolean);
const waitTimeRow = (page) =>
  page.waitForFunction(() => /p [=<] ?0\.\d+/.test(document.querySelector('.sva-chart .bv-time-table')?.innerText || ''), null, { timeout: 240000 });
const waitStatistic = (page) =>
  page.waitForFunction(
    () => {
      const text = [...document.querySelectorAll('.sva-chart .bv-statistic')].map((e) => e.innerText).join(' ');
      return /p [=<]/.test(text) && !/waiting|starting/i.test(text);
    },
    null,
    { timeout: 240000 }
  );
function meter(context) {
  const m = { bytes: 0, requests: 0, urls: [] };
  context.on('request', (r) => {
    try {
      if (R_HOSTS.includes(new URL(r.url()).hostname)) m.urls.push(r.url());
    } catch {}
  });
  context.on('requestfinished', async (request) => {
    try {
      if (!R_HOSTS.includes(new URL(request.url()).hostname)) return;
      const sizes = await request.sizes();
      m.requests++;
      m.bytes += Math.max(0, sizes.responseBodySize);
    } catch {}
  });
  return m;
}

if (ONLY.includes('1')) {
  // ---- the walk: tiles, one biomarker over time, R, one visit, the trail,
  // the cross-tabulation and the biomarker screen's sentence
  const context = await browser.newContext(desktop);
  const m = meter(context);
  const page = await context.newPage();
  await openApp(page);
  numbers.tabs = await tabs(page);
  numbers.charts_line = await page.evaluate(() => document.body.innerText.match(/\d+ of \d+ charts[^\n]*/)?.[0] || null);
  numbers.app_version = await page.evaluate(() => document.body.innerText.match(/safety\.viz \d+\.\d+\.\d+/)?.[0] || null);
  numbers.bio_viz_version = await page.evaluate(() => window.BioViz && window.BioViz.version);
  check('biomarkers tab', numbers.tabs.find((t) => /^Biomarkers/.test(t)), 'Biomarkers 5 OF 5');
  check('charts line', numbers.charts_line, '18 of 18 charts supported by the loaded data');
  check('bio.viz version', numbers.bio_viz_version, '0.3.0');

  await openBiomarkers(page);
  numbers.biomarker_charts = await page.locator('.sva-item').evaluateAll((items) =>
    items.filter((i) => /READY/.test(i.innerText) && !i.dataset.view.includes('-explorer')).map((i) => i.innerText.replace(/\s+/g, ' ').trim())
  );
  numbers.biomarker_charts = numbers.biomarker_charts.filter((t) => /^(Group comparison|Association scatter|Correlation matrix|Biomarker screen|Cross-tabulation) /.test(t));
  check('five biomarker charts', numbers.biomarker_charts, ['Group comparison READY', 'Association scatter READY', 'Correlation matrix READY', 'Biomarker screen READY', 'Cross-tabulation READY']);
  numbers.start_r = { label: await page.locator('.sva-action').textContent(), title: await page.locator('.sva-action').getAttribute('title') };
  numbers.tiles = await page.locator('.sva-chart .bv-tile').count();
  numbers.tiles_hidden_visits = squash(await page.locator('.sva-chart .bv-hidden-visits').first().innerText());
  numbers.tiles_statistic = await statisticLines(page);
  numbers.tiles_foot = squash(await page.locator('.sva-chart .bv-foot').innerText());
  numbers.r_requests_at_tiles = m.urls.length;
  check('28 trend tiles', numbers.tiles, 28);
  check('9 unscheduled visits not drawn', /^9 unscheduled visits not drawn/.test(numbers.tiles_hidden_visits), true);
  check('tiles print no statistic', numbers.tiles_statistic, []);
  check('no request to R at the tiles', numbers.r_requests_at_tiles, 0);
  await shot(page, 'v192-tiles');

  // a tile opens that biomarker across the visits; before R the row says so
  await page.locator(`.sva-chart .bv-tile[data-measure="${ALT}"]`).click();
  await page.waitForSelector('.sva-chart .bv-time-table');
  await settle(page, 1500);
  numbers.over_time_trail = await trail(page);
  numbers.over_time_before_r = await timeTable(page);
  numbers.over_time_before_r_line = await statisticLines(page);
  check('over time: trail', numbers.over_time_trail, ['All biomarkers', `${ALT} over time`]);
  check('over time: ten visits', numbers.over_time_before_r[0].slice(1), VISITS);
  check('over time: unavailable before R', numbers.over_time_before_r.at(-1).at(-1), 'Statistics unavailable');
  check('no request to R before the press', m.urls.length, 0);

  const t0 = Date.now();
  await startR(page);
  numbers.r_started_seconds = (Date.now() - t0) / 1000;
  await waitTimeRow(page);
  await settle(page, 2000);
  numbers.r_megabytes = Number((m.bytes / 1e6).toFixed(2));
  numbers.r_requests = m.requests;
  numbers.r_hosts = [...new Set(m.urls.map((u) => new URL(u).hostname))];
  numbers.over_time = await timeTable(page);
  numbers.over_time_lines = await statisticLines(page);
  check('over time: R’s p under each visit', numbers.over_time.at(-1).slice(1), P_VALUES);
  check('over time: test row label', numbers.over_time.at(-1)[0], 'One-way ANOVA p, unadjusted');
  await scrollTo(page, '.sva-chart .bv-trail');
  await shot(page, 'v192-over-time');

  // a visit under the picture opens that visit alone
  await page.locator('.sva-chart .bv-time-visit[data-visit="Week 4"]').click();
  await waitStatistic(page);
  await settle(page, 1500);
  numbers.one_visit_trail = await trail(page);
  numbers.one_visit_control = await page.locator('.sva-chart details[data-control="visits"] summary').innerText();
  numbers.one_visit_lines = await statisticLines(page);
  check('one visit: trail', numbers.one_visit_trail, ['All biomarkers', `${ALT} over time`, 'Week 4']);
  check('one visit: Visit control', numbers.one_visit_control, '1 of 10');
  check(
    'one visit: R’s test',
    numbers.one_visit_lines.some((l) => l.startsWith('One-way analysis of variance: p = 0.005 (Placebo n = 75, Xanomeline High Dose n = 67, Xanomeline Low Dose n = 65)')),
    true
  );
  await scrollTo(page, '.sva-chart .bv-trail');
  await shot(page, 'v192-one-visit');

  // each step of the trail leads back
  await page.locator('.sva-chart .bv-trail button', { hasText: 'over time' }).click();
  await page.waitForSelector('.sva-chart .bv-time-table');
  await settle(page, 800);
  numbers.trail_back_one = { trail: await trail(page), level: await page.locator('.sva-chart .bv-trail').getAttribute('data-level') };
  await page.locator('.sva-chart .bv-trail button', { hasText: 'All biomarkers' }).click();
  await page.waitForSelector('.sva-chart .bv-tile');
  await settle(page, 800);
  numbers.trail_back_two = { tiles: await page.locator('.sva-chart .bv-tile').count(), trail: await page.locator('.sva-chart .bv-trail').count() };
  check('trail: back to over time', numbers.trail_back_one.trail, ['All biomarkers', `${ALT} over time`]);
  check('trail: back to the tiles', numbers.trail_back_two.tiles, 28);

  // the cross-tabulation: counts, R's chi-square test, then Fisher's exact test
  await page.locator('.sva-item[data-view="cross-tab"]').click();
  await waitStatistic(page);
  await settle(page, 1500);
  numbers.cross_tab = {
    title: squash(await page.locator('.sva-chart .bv-titles').innerText().catch(() => '')),
    rows: await page.locator('.sva-chart .bv-crosstab tr').evaluateAll((rows) =>
      rows.map((row) => [...row.children].map((cell) => cell.innerText.replace(/\s+/g, ' ').trim()))
    ),
    chi_square: await statisticLines(page)
  };
  check('cross-tabulation: counts', numbers.cross_tab.rows, [
    ['ARM \\ EOSSTT', 'COMPLETED', 'DISCONTINUED', 'Total'],
    ['Placebo', '58 67.4%', '28 32.6%', '86'],
    ['Xanomeline High Dose', '27 37.5%', '45 62.5%', '72'],
    ['Xanomeline Low Dose', '25 26.0%', '71 74.0%', '96'],
    ['Total', '110', '144', '254']
  ]);
  check('cross-tabulation: chi-square', numbers.cross_tab.chi_square.some((l) => l.startsWith("Pearson's Chi-squared test: p < 0.001 (n = 254)")), true);
  // one still, tall enough to hold the table, its bars and R's line beneath them
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  const lineBottom = await page.locator('.sva-chart .bv-statistic').last().evaluate((e) => e.getBoundingClientRect().bottom + window.scrollY);
  await page.setViewportSize({ width: desktop.viewport.width, height: Math.ceil(lineBottom) + 28 });
  await settle(page, 800);
  await shot(page, 'v192-cross-tab');
  await page.setViewportSize(desktop.viewport);
  await settle(page, 600);
  await page
    .locator('.sva-chart .sv-control', { has: page.locator('label:text-is("Test")') })
    .locator('select')
    .selectOption({ label: "Fisher's exact test" });
  await page.waitForFunction(() => /Fisher/.test([...document.querySelectorAll('.sva-chart .bv-statistic')].map((e) => e.innerText).join(' ')), null, { timeout: 240000 });
  await waitStatistic(page);
  await settle(page, 1000);
  numbers.cross_tab.fisher = await statisticLines(page);
  check('cross-tabulation: Fisher', numbers.cross_tab.fisher.some((l) => l.startsWith("Fisher's Exact Test for Count Data: p < 0.001 (n = 254)")), true);

  // the biomarker screen's sentence a reader of the app cannot act on (bio.viz#119)
  await page.locator('.sva-item[data-view="biomarker-screen"]').click();
  await page.waitForSelector('.sva-chart .bv-screen-row', { timeout: 240000 });
  await settle(page, 1500);
  const control = page.locator('.sva-chart .sv-control', { has: page.locator('label:text-is("Compare")') });
  numbers.screen_sentence = (await page.locator('.sva-chart').innerText()).split('\n').filter((l) => /init\(/.test(l)).map(squash);
  check('biomarker screen: the init() sentence is there', numbers.screen_sentence.length, 1);
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  await settle(page, 400);
  const box = await control.boundingBox();
  const note = await page.locator('.sva-chart .bv-control-note').first().boundingBox();
  const bottom = Math.max(box.y + box.height, note ? note.y + note.height : 0);
  await shot(page, 'v192-screen-note', { clip: { x: box.x - 16, y: box.y - 8, width: box.width + 32, height: bottom - box.y + 16 } });
  numbers.r_requests_after_walk = m.requests;
  await context.close();
  save();
}

if (ONLY.includes('2')) {
  // ---- at 390 px: the tiles, and one biomarker over time with R's row
  const context = await browser.newContext(phone);
  const page = await context.newPage();
  await openApp(page);
  await openBiomarkers(page);
  numbers.phone = { tiles: await page.locator('.sva-chart .bv-tile').count() };
  numbers.phone.tiles_scroll_width = await page.evaluate(() => document.documentElement.scrollWidth);
  await scrollTo(page, '.sva-chart .bv-tiles', 150);
  await shot(page, 'v192-phone-tiles');
  await page.locator(`.sva-chart .bv-tile[data-measure="${ALT}"]`).click();
  await page.waitForSelector('.sva-chart .bv-time-table');
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  await startR(page);
  await waitTimeRow(page);
  await settle(page, 2000);
  numbers.phone.over_time_scroll_width = await page.evaluate(() => document.documentElement.scrollWidth);
  numbers.phone.over_time_row = (await timeTable(page)).at(-1);
  await scrollTo(page, '.sva-chart .bv-time-scroll', 60);
  await shot(page, 'v192-phone-over-time');
  check('phone: no sideways scroll at the tiles', numbers.phone.tiles_scroll_width, 390);
  check('phone: no sideways scroll over time', numbers.phone.over_time_scroll_width, 390);
  check('phone: R’s p under each visit', numbers.phone.over_time_row.slice(1), P_VALUES);
  await context.close();
  save();
}

if (ONLY.includes('3') && LOCAL) {
  // ---- the page the installer serves on this machine
  const context = await browser.newContext(desktop);
  const requests = [];
  context.on('request', (r) => requests.push(new URL(r.url()).host));
  const page = await context.newPage();
  await openApp(page, LOCAL);
  numbers.local = {
    address: page.url(),
    tabs: await tabs(page),
    charts_line: await page.evaluate(() => document.body.innerText.match(/\d+ of \d+ charts[^\n]*/)?.[0] || null),
    app_version: await page.evaluate(() => document.body.innerText.match(/safety\.viz \d+\.\d+\.\d+/)?.[0] || null),
    bio_viz_version: await page.evaluate(() => window.BioViz && window.BioViz.version)
  };
  await openBiomarkers(page);
  numbers.local.tiles = await page.locator('.sva-chart .bv-tile').count();
  numbers.local.hosts_asked = [...new Set(requests)];
  check('local: biomarkers tab', numbers.local.tabs.find((t) => /^Biomarkers/.test(t)), 'Biomarkers 5 OF 5');
  check('local: charts line', numbers.local.charts_line, '18 of 18 charts supported by the loaded data');
  check('local: 28 trend tiles', numbers.local.tiles, 28);
  check('local: the page asked this machine only', numbers.local.hosts_asked, [new URL(LOCAL).host]);
  await page.locator('.sva-item[data-view="data"]').click();
  await settle(page, 1500);
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  await shot(page, 'v192-local');
  await context.close();
  save();
}

save();
await browser.close();
const failed = Object.entries(checks).filter(([, c]) => !c.pass);
console.log(`${Object.keys(checks).length - failed.length} of ${Object.keys(checks).length} checks passed`);
process.exit(failed.length ? 1 : 0);
