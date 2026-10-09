// Captures and number checks for the safety.viz v1.10.0 demo page: the demo
// app's RBQM tab, walked with real R in the browser on the study the app opens
// with, on the RBQM study and on files chosen from disk; the chart footnote;
// and the histogram with the two removed settings passed.
//
//   node capture.mjs <out dir>
//
// Run from the root of an `npm ci` checkout of safety.viz (for its Playwright
// and the RBQM study's files). Stills go to <out dir>/media; every number read
// from the page, and a check of each against what the demo page prints, goes
// to <out dir>/capture-numbers.json. The script exits 1 when a check fails.
//
//   BASE=<the site's address>   default: the dev site's
//   ONLY=1,2,3,4,5              1 the pilot study, 2 the RBQM study and own
//                               files, 3 the phone, 4 the footnote, 5 the histogram
import { createRequire } from 'node:module';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const { chromium } = createRequire(path.resolve('package.json'))('playwright');

const BASE = process.env.BASE || 'https://jwildfire.github.io/safety.viz/dev/';
const DEMO = `${BASE}demo/`;
const [out] = process.argv.slice(2);
if (!out) throw new Error('Usage: node capture.mjs <out dir>');
const media = path.join(out, 'media');
mkdirSync(media, { recursive: true });
const ONLY = (process.env.ONLY || '1,2,3,4,5').split(',');
const numbersFile = path.join(out, 'capture-numbers.json');
const numbers = existsSync(numbersFile) ? JSON.parse(readFileSync(numbersFile, 'utf8')) : {};
numbers.base = BASE;
(numbers.captured_at ||= {})[process.env.ONLY || 'all'] = new Date().toISOString();
const save = () => writeFileSync(numbersFile, `${JSON.stringify(numbers, null, 2)}\n`);

// What the demo page prints, held to what the live page shows.
const checks = (numbers.checks ||= {});
const check = (name, actual, expected) => {
  const pass =
    expected instanceof RegExp
      ? expected.test(String(actual))
      : JSON.stringify(actual) === JSON.stringify(expected);
  checks[name] = pass ? { pass } : { pass, actual, expected: String(expected) };
  if (!pass) console.error('CHECK FAILED', name, JSON.stringify(actual), '!=', String(expected));
};

const R_HOSTS = ['webr.r-wasm.org', 'repo.r-wasm.org'];
const browser = await chromium.launch();
const desktop = { viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1.5 };
const phone = {
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 1.5,
  hasTouch: true,
  isMobile: true
};
const shot = async (page, name, opts = {}) => {
  await page.screenshot({ path: path.join(media, `${name}.jpg`), type: 'jpeg', quality: 74, ...opts });
  console.log('captured', name);
};
const settle = (page, ms = 900) => page.waitForTimeout(ms);
const squash = (text) => (text || '').replace(/\s+/g, ' ').trim();
const text = async (page, selector) => squash(await page.locator(selector).first().textContent());
const scrollTo = async (page, selector, above = 16) => {
  await page.evaluate(
    ([sel, gap]) => {
      const node = document.querySelector(sel);
      window.scrollTo({ top: node.getBoundingClientRect().top + window.scrollY - gap, behavior: 'instant' });
    },
    [selector, above]
  );
  await settle(page, 500);
};
const openApp = async (page, hash = '') => {
  await page.goto(`${DEMO}${hash}`);
  await page.evaluate('window.__safetyVizApp.ready');
  await page.evaluate(() => document.fonts.ready);
  await settle(page, 1200);
};
const rbqmTab = (page) => page.locator('.sva-tab[data-tab="rbqm"]');
const status = (page) => text(page, '.sva-rbqm-status');
const waitRan = (page, pattern) =>
  page.waitForFunction(
    (source) => new RegExp(source).test(document.querySelector('.sva-rbqm-status')?.textContent || ''),
    pattern.source,
    { timeout: 300000 }
  );
const inked = (page) =>
  page.waitForFunction(
    () => {
      const canvases = [...document.querySelectorAll('.sva-rbqm-figures canvas')];
      return (
        canvases.length === 2 &&
        canvases.every((canvas) => {
          const { data } = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height);
          for (let index = 3; index < data.length; index += 4) if (data[index]) return true;
          return false;
        })
      );
    },
    null,
    { timeout: 60000 }
  );
const overview = (page) =>
  page.evaluate(() => ({
    head: [...document.querySelectorAll('.sva-rbqm-table thead th')].map((cell) => cell.textContent.trim()),
    rows: document.querySelectorAll('.sva-rbqm-table tbody tr').length,
    first: [...document.querySelectorAll('.sva-rbqm-table tbody tr')]
      .slice(0, 4)
      .map((row) => [...row.children].slice(0, 4).map((cell) => cell.textContent.trim()))
  }));
const choices = (page) =>
  page
    .locator('.sva-rbqm-choice')
    .evaluateAll((all) => all.map((button) => [button.dataset.metric, button.title]));
// Megabytes of R's downloads, counted as compressed response bodies.
function meter(context, own) {
  const seen = { 'webr.r-wasm.org': 0, 'repo.r-wasm.org': 0, page: 0, requests: 0, hosts: new Set() };
  context.on('requestfinished', async (request) => {
    try {
      const url = new URL(request.url());
      const { responseBodySize } = await request.sizes();
      const size = Math.max(0, responseBodySize);
      if (R_HOSTS.includes(url.hostname)) seen[url.hostname] += size;
      else if (url.origin === own && /\/r-wasm\//.test(url.pathname)) seen.page += size;
      else return;
      seen.requests += 1;
      seen.hosts.add(url.hostname);
    } catch {
      // A request that never finished has no size.
    }
  });
  return seen;
}
// A megabyte here is 1,048,576 bytes, as in safety.viz's own measure of the download (APP-RBQM-021).
const megabytes = (bytes) => Math.round((bytes / 1048576) * 10) / 10;

// ---------------------------------------------------------------- 1. the pilot study
if (ONLY.includes('1')) {
  const context = await browser.newContext(desktop);
  const page = await context.newPage();
  const seen = meter(context, new URL(BASE).origin);
  const asked = [];
  context.on('request', (request) => asked.push(request.url()));
  await openApp(page);
  numbers.version_line = await text(page, '.sva-version');
  numbers.tabs = await page
    .locator('.sva-tab')
    .evaluateAll((all) => all.map((tab) => tab.innerText.replace(/\s+/g, ' ').trim()));
  await rbqmTab(page).click();
  await settle(page);
  numbers.pilot_before = await status(page);
  numbers.pilot_summary = await text(page, '.sva-rbqm-files-summary');
  numbers.r_requests_before_press = asked.filter((url) => /r-wasm\.org|\/r-wasm\//.test(url)).length;
  check(
    'pilot: before the press',
    numbers.pilot_before,
    /^Start R to run gsm’s workflows on the loaded study’s adsl\.csv and adae\.csv\. It downloads about 55 MB, once/
  );
  check(
    'pilot: what the study supports',
    numbers.pilot_summary,
    'The loaded study supports 3 of 8 metrics. R makes gsm’s raw tables from its adsl.csv and adae.csv.'
  );
  check('pilot: nothing asked of R before the press', numbers.r_requests_before_press, 0);
  await shot(page, 'rbqm-before');
  await page.locator('.sva-rbqm-files-summary').click();
  await settle(page, 500);
  numbers.pilot_gives = await page.locator('.sva-rbqm-study-file').allInnerTexts();
  numbers.pilot_support = await page
    .locator('.sva-rbqm-support li[data-metric]')
    .evaluateAll((all) => all.map((item) => item.innerText.replace(/\s+/g, ' ').trim()));
  await scrollTo(page, '.sva-rbqm-files');
  await shot(page, 'rbqm-supports');
  await page.locator('.sva-rbqm-files-summary').click();
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));

  const pressed = Date.now();
  await page.locator('.sva-rbqm-start').click();
  await page.waitForFunction(
    () => /installing its packages/.test(document.querySelector('.sva-rbqm-status')?.textContent || ''),
    null,
    { timeout: 120000 }
  );
  numbers.pilot_starting = (await status(page)).replace(/ \d+ seconds? so far\.$/, '');
  await shot(page, 'rbqm-starting');
  await waitRan(page, /^R ran 3 of 8 metrics/);
  numbers.pilot_seconds_to_first_result = Math.round((Date.now() - pressed) / 1000);
  await inked(page);
  await settle(page, 1500);
  numbers.pilot_done = await status(page);
  numbers.pilot_overview = await overview(page);
  numbers.pilot_choices = await choices(page);
  numbers.megabytes = {
    'webr.r-wasm.org': megabytes(seen['webr.r-wasm.org']),
    'repo.r-wasm.org': megabytes(seen['repo.r-wasm.org']),
    page: megabytes(seen.page),
    total: megabytes(seen['webr.r-wasm.org'] + seen['repo.r-wasm.org'] + seen.page)
  };
  numbers.r_hosts = [...seen.hosts].sort();
  check(
    'pilot: after the press',
    numbers.pilot_done,
    /^R ran 3 of 8 metrics on the loaded study’s adsl\.csv and adae\.csv in [\d.]+ seconds?, \d+ seconds after Start R was pressed\./
  );
  check(
    'pilot: the copied versions are named',
    numbers.pilot_done,
    /The metric workflows are gsm\.kri 1\.7\.0’s and the charts gsm\.viz 2\.4\.1’s\.$/
  );
  check('pilot: 17 sites', numbers.pilot_overview.rows, 17);
  check('pilot: the columns', numbers.pilot_overview.head, [
    'Group',
    'Enrolled',
    'Red Flags',
    'Amber Flags',
    'AE',
    'SAE',
    'SDSC'
  ]);
  check('pilot: the first site', numbers.pilot_overview.first[0], ['705', '16', '1', '0']);
  check(
    'pilot: screen failure says what it needs',
    numbers.pilot_choices.find(([id]) => id === 'kri0012')[1],
    'Screen Failure Rate needs Raw_ENROLL.csv, which is not loaded.'
  );
  check('pilot: about 55 MB', numbers.megabytes.total > 52 && numbers.megabytes.total < 58, true);
  await shot(page, 'rbqm-pilot', { fullPage: true });
  await scrollTo(page, '.sva-rbqm-metric', 70);
  await shot(page, 'rbqm-pilot-charts');
  // The study discontinuation rate, from the overview's own cell.
  await page.locator('.sva-rbqm-choice[data-metric="kri0006"]').click();
  await inked(page);
  await settle(page, 1200);
  await scrollTo(page, '.sva-rbqm-metric', 70);
  await shot(page, 'rbqm-pilot-sdsc');
  // A metric that did not run.
  await page.locator('.sva-rbqm-choice[data-metric="kri0012"]').click();
  await settle(page, 600);
  numbers.pilot_why = await text(page, '.sva-rbqm-why');
  await scrollTo(page, '.sva-rbqm-metric', 70);
  await shot(page, 'rbqm-did-not-run');

  // The site's row of the mapping cleared on the Data tab: R runs at once.
  await page.locator('.sva-item[data-view="data"]').click();
  await page.evaluate("window.__safetyVizApp.setColumn('subject', 'SITEID', null)");
  await rbqmTab(page).click();
  await waitRan(page, /^R ran 0 of 8 metrics/);
  await page.locator('.sva-rbqm-choice[data-metric="kri0001"]').click();
  numbers.unmapped_why = await text(page, '.sva-rbqm-why');
  check(
    'pilot: the site not mapped',
    numbers.unmapped_why,
    'Adverse Event Rate needs the column SITEID, which no column of adsl.csv is mapped to.'
  );
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  await shot(page, 'rbqm-not-mapped');
  save();
  await context.close();
}

// ---------------------------------------------------------------- 2. the RBQM study, and files of one's own
if (ONLY.includes('2')) {
  const context = await browser.newContext(desktop);
  const page = await context.newPage();
  await openApp(page);
  await page.locator('.sva-item[data-view="data"]').click();
  await page.locator('.sva-side select.sva-study').selectOption('rbqm');
  await page.waitForFunction(() => document.querySelectorAll('.sva-loaded-name').length === 9);
  await settle(page);
  await shot(page, 'rbqm-study-data');
  await rbqmTab(page).click();
  numbers.study_before = await status(page);
  numbers.study_summary = await text(page, '.sva-rbqm-files-summary');
  await page.locator('.sva-rbqm-start').click();
  await waitRan(page, /^R ran 8 of 8 metrics/);
  await inked(page);
  await settle(page, 1500);
  numbers.study_done = await status(page);
  numbers.study_overview = await overview(page);
  check('RBQM study: 9 files, 8 metrics', numbers.study_done, /^R ran 8 of 8 metrics on the 9 loaded files in /);
  check('RBQM study: 150 sites', numbers.study_overview.rows, 150);
  check('RBQM study: the columns', numbers.study_overview.head.slice(4), [
    'AE',
    'SAE',
    'PD',
    'IPD',
    'LB',
    'SDSC',
    'TDSC',
    'SF'
  ]);
  await shot(page, 'rbqm-study');

  // Files of one's own, chosen from disk: two of the study's files and one of no raw domain.
  const notes = path.join(out, 'site_notes.csv');
  writeFileSync(notes, 'SITE,NOTE\n01,Visited in March\n');
  await page.locator('.sva-rbqm-input').setInputFiles([
    path.resolve('site/data/rbqm/Raw_SUBJ.csv'),
    path.resolve('site/data/rbqm/Raw_AE.csv'),
    notes
  ]);
  await waitRan(page, /^R ran 2 of 8 metrics/);
  await settle(page, 1200);
  numbers.own_done = await status(page);
  await page.locator('.sva-rbqm-files-summary').click();
  await settle(page, 500);
  numbers.own_summary = await text(page, '.sva-rbqm-files-summary');
  numbers.own_files = await page.locator('.sva-rbqm-file').allInnerTexts();
  check(
    'own files: placed and counted',
    numbers.own_summary,
    '3 files loaded, 2 placed in a gsm raw domain. They support 2 of 8 metrics.'
  );
  check('own files: the file of no raw domain is named', numbers.own_files.at(-1), 'site_notes.csv is not recognised: its name and its columns match no gsm raw domain.');
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  await shot(page, 'rbqm-own-files');
  save();
  await context.close();
}

// ---------------------------------------------------------------- 3. the phone
if (ONLY.includes('3')) {
  const context = await browser.newContext(phone);
  const page = await context.newPage();
  await openApp(page, '#rbqm');
  await settle(page);
  numbers.phone_scroll_before = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth
  );
  await shot(page, 'phone-before');
  await page.locator('.sva-rbqm-start').click();
  await waitRan(page, /^R ran 3 of 8 metrics/);
  await inked(page);
  await settle(page, 1500);
  numbers.phone_scroll_after = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth
  );
  check('phone: no sideways scroll', [numbers.phone_scroll_before <= 0, numbers.phone_scroll_after <= 0], [true, true]);
  await shot(page, 'phone-overview');
  await scrollTo(page, '.sva-rbqm-metric', 60);
  await shot(page, 'phone-charts');
  save();
  await context.close();
}

// ---------------------------------------------------------------- 4. the footnote under a chart
if (ONLY.includes('4')) {
  const context = await browser.newContext(desktop);
  const page = await context.newPage();
  await openApp(page);
  // A chart that has both a clinical guide and test evidence.
  await page.locator('.sva-tab[data-domain]').first().click();
  await page.locator('.sva-item[data-view="hep-explorer"]').click();
  await page.waitForSelector('.sva-chart-links a[data-link="guide"]', { timeout: 60000 });
  await settle(page, 1500);
  numbers.footnote = await text(page, '.sva-chart-links');
  numbers.footnote_links = await page
    .locator('.sva-chart-links a')
    .evaluateAll((all) => all.map((link) => [link.textContent.trim(), link.href, link.target]));
  check('footnote: links open in a new tab', numbers.footnote_links.every(([, , target]) => target === '_blank'), true);
  check('footnote: a guide and the evidence', numbers.footnote_links.map(([words]) => words), ['Clinical guide', 'Test evidence']);
  await scrollTo(page, '.sva-chart-links', 520);
  await shot(page, 'footnote');
  save();
  await context.close();
}

// ---------------------------------------------------------------- 5. the histogram, with the removed settings
if (ONLY.includes('5')) {
  const context = await browser.newContext(desktop);
  const page = await context.newPage();
  const warnings = [];
  page.on('console', (message) => {
    if (message.type() === 'warning') warnings.push(message.text());
  });
  // The chart's own page on the site, which mounts the committed bundle on the
  // pilot study's labs file. The same bundle and rows, given both settings.
  await page.goto(`${BASE}histogram/`);
  await page.waitForFunction(() => window.__safetyHistogramInstance?.rawData?.length > 0, null, {
    timeout: 60000
  });
  await page.evaluate(() => document.fonts.ready);
  numbers.histogram = await page.evaluate(async () => {
    const rows = window.__safetyHistogramInstance.rawData;
    const host = document.querySelector('#container');
    host.replaceChildren();
    const chart = window.SafetyViz.histogram('#container', {
      start_value: 'Alanine Aminotransferase (U/L)',
      groups: [{ value_col: 'ARM', label: 'Treatment Group' }],
      group_by: 'ARM',
      test_normality: true,
      compare_distributions: true
    });
    chart.init(rows);
    await new Promise((resolve) => setTimeout(resolve, 1500));
    return {
      rows: rows.length,
      settings: ['test_normality', 'compare_distributions'].map((name) => name in chart.settings),
      panels: host.querySelectorAll('.sv-multiple').length,
      annotations: host.querySelectorAll('.sv-annotation, .sv-deprecation').length,
      p: /p\s*[=<]|Normality|Group comparison/.test(host.innerText)
    };
  });
  numbers.histogram_warnings = warnings.filter((line) => /was removed in v1\.10\.0/.test(line));
  check('histogram: neither setting is kept', numbers.histogram.settings, [false, false]);
  check('histogram: no p-value is drawn', [numbers.histogram.annotations, numbers.histogram.p], [0, false]);
  check('histogram: the console says so, once each', numbers.histogram_warnings, [
    'safety.viz histogram: `test_normality` was removed in v1.10.0 and is ignored. The histogram draws no p-value: run the test in R.',
    'safety.viz histogram: `compare_distributions` was removed in v1.10.0 and is ignored. The histogram draws no p-value: run the test in R.'
  ]);
  check('histogram: a panel a treatment group', numbers.histogram.panels > 1, true);
  await scrollTo(page, '#container', 12);
  await shot(page, 'histogram-no-p');
  save();
  await context.close();
}

save();
await browser.close();
const failed = Object.entries(checks).filter(([, result]) => !result.pass);
console.log(`${Object.keys(checks).length - failed.length} of ${Object.keys(checks).length} checks held.`);
if (failed.length) process.exit(1);
