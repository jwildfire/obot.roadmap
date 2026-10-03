// Captures for the bio.viz v0.1.0 and gsm.bio v0.1.0 demo page. Real webR on the
// live dev site: each demo starts R in the browser the first time it needs a
// statistic. Run from a bio.viz checkout (for its Playwright install):
//   node capture.mjs <out dir> <dir of saved gsm.bio widgets>
// It writes the stills to <out dir>/media and every number the page prints to
// <out dir>/capture-numbers.json, read from the page that showed it.
import { chromium } from '@playwright/test';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const BASE = 'https://jwildfire.github.io/bio.viz/dev/';
const [out, widgets] = process.argv.slice(2);
const media = path.join(out, 'media');
mkdirSync(media, { recursive: true });
// Numbers from an earlier run of other sections are kept; a section run again replaces its own.
const numbersFile = path.join(out, 'capture-numbers.json');
const numbers = existsSync(numbersFile) ? JSON.parse(readFileSync(numbersFile, 'utf8')) : {};
numbers.base = BASE;
(numbers.captured_at ||= {})[process.env.ONLY || 'all'] = new Date().toISOString();
const ONLY = (process.env.ONLY || '1,2,3,4,5,6,7').split(',');
const R_HOSTS = ['webr.r-wasm.org', 'repo.r-wasm.org'];

const browser = await chromium.launch();
const desktop = { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1.5 };
const phone = { viewport: { width: 390, height: 844 }, deviceScaleFactor: 1.5, hasTouch: true, isMobile: true };

const shot = async (target, name, opts = {}) => {
  await target.screenshot({ path: path.join(media, `${name}.jpg`), type: 'jpeg', quality: 80, ...opts });
  console.log('captured', name);
};
const settle = (page, ms = 900) => page.waitForTimeout(ms);
const text = (page, sel) => page.locator(sel).first().innerText();
const texts = (page, sel) => page.locator(sel).allInnerTexts();
// Scroll the chart card to the top of the viewport.
const toChart = (page, offset = 12) =>
  page.evaluate((offset) => {
    const card = document.querySelector('#chart').closest('section, .demo, .card, main > div') || document.querySelector('#chart');
    const el = document.querySelector('#chart');
    window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - offset, behavior: 'instant' });
  }, offset);
// Counts R's own files as they cross the network, from the context's view
// (which sees the worker's requests).
function meter(context) {
  const m = { bytes: 0, requests: 0, reset() { this.bytes = 0; this.requests = 0; } };
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
const waitStats = (page, sel, min = 1) =>
  page.waitForFunction(
    ([sel, min]) => {
      const s = [...document.querySelectorAll(sel)].filter((e) => e.innerText.trim());
      return s.length >= min && s.every((e) => /p [<=]|r:|coefficient/i.test(e.innerText) && !/waiting|starting/i.test(e.innerText));
    },
    [sel, min],
    { timeout: 180000 }
  );

if (ONLY.includes('1')) // ---- 1. group comparison: the overview, then IL-6 with R's test
{
  const context = await browser.newContext(desktop);
  const m = meter(context);
  const page = await context.newPage();
  await page.goto(`${BASE}group-comparison/`);
  await page.evaluate('window.BioVizDemo.ready');
  await page.evaluate(() => document.fonts.ready);
  await settle(page, 1200);
  numbers.gc_overview = {
    count: await text(page, '.bv-overview-count'),
    biomarkers: (await page.locator('select[data-control="measure"] option').allInnerTexts()).slice(1),
    r_bytes_before_open: m.bytes
  };
  await toChart(page);
  await settle(page, 400);
  await shot(page, 'gc-overview');
  m.reset();
  const t0 = Date.now();
  await page.locator('select[data-control="measure"]').selectOption('IL-6');
  await page.locator('select[data-control="value-type"]').selectOption('change');
  await waitStats(page, '.bv-statistic', 4);
  const seconds = (Date.now() - t0) / 1000;
  await page.waitForTimeout(1500);
  numbers.gc_il6 = {
    first_r_seconds: seconds,
    r_megabytes: Number((m.bytes / 1e6).toFixed(2)),
    r_requests: m.requests,
    panels: await texts(page, '.bv-panel h3'),
    statistics: (await texts(page, '.bv-statistic')).filter((s) => s.trim()),
    notes: await text(page, '.sv-notes')
  };
  await page.evaluate(() => {
    const el = document.querySelector('.bv-panel');
    window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 12, behavior: 'instant' });
  });
  await settle(page, 600);
  await shot(page, 'gc-il6');
  await context.close();
}

if (ONLY.includes('2')) // ---- 2. association scatter: TNF-alpha against IL-10 at Baseline
{
  const context = await browser.newContext(desktop);
  const page = await context.newPage();
  await page.goto(`${BASE}association-scatter/`);
  await page.evaluate('window.BioVizDemo.ready');
  await waitStats(page, '.bv-statistic', 1);
  await settle(page, 1500);
  numbers.scatter = {
    x: await page.locator('[data-control="x-variable"]').inputValue(),
    y: await page.locator('[data-control="y-variable"]').inputValue(),
    visit: await page.locator('[data-control="x-visit"]').inputValue(),
    statistics: (await texts(page, '.bv-statistic')).filter((s) => s.trim()),
    notes: await text(page, '.sv-notes')
  };
  await toChart(page);
  await settle(page, 400);
  await shot(page, 'scatter');
  await context.close();
}

if (ONLY.includes('3')) // ---- 3. correlation matrix: the planted pair, and its cell opening the scatter
{
  const context = await browser.newContext(desktop);
  const page = await context.newPage();
  await page.goto(`${BASE}correlation-matrix/`);
  await page.evaluate('window.BioVizDemo.ready');
  await page.waitForFunction(() => document.querySelectorAll('.bv-cell[data-status="shown"]').length > 60, null, { timeout: 180000 });
  await settle(page, 1200);
  const cell = page.locator('.bv-cell[data-side="mark"][aria-label*="TNF-alpha"][aria-label*="IL-10"]').first();
  const label = await cell.getAttribute('aria-label');
  const upper = await page.locator('.bv-cell[data-side="number"][aria-label*="TNF-alpha"][aria-label*="IL-10"]').first().innerText().catch(() => null);
  const row = page.locator('.bv-pairs tr', { hasText: 'IL-10 and TNF-alpha' }).first();
  numbers.matrix = {
    cell_label: label,
    upper_cell_text: upper,
    pairs_row: (await row.count()) ? await row.innerText() : null,
    caption: await page.locator('.bv-statistic').first().innerText().catch(() => null)
  };
  await cell.hover();
  await settle(page, 500);
  await cell.scrollIntoViewIfNeeded();
  await page.evaluate(() => {
    const grid = document.querySelector('.bv-matrix');
    window.scrollTo({ top: grid.getBoundingClientRect().top + window.scrollY + 240, behavior: 'instant' });
  });
  await cell.hover();
  await settle(page, 500);
  numbers.matrix.footnote_on_hover = await text(page, '.sv-footnote').catch(() => null);
  await shot(page, 'matrix');
  await cell.click();
  await waitStats(page, '.bv-statistic', 1);
  await settle(page, 1500);
  numbers.matrix_drill = {
    back: await page.getByRole('button', { name: 'Back to the correlation matrix' }).count(),
    statistics: (await texts(page, '.bv-statistic')).filter((s) => s.trim())
  };
  await toChart(page);
  await settle(page, 400);
  await shot(page, 'matrix-drill');
  await context.close();
}

if (ONLY.includes('4')) // ---- 4. biomarker screen: IL-6 at the top, and its row opening the group comparison
{
  const context = await browser.newContext(desktop);
  const page = await context.newPage();
  await page.goto(`${BASE}biomarker-screen/`);
  await page.evaluate('window.BioVizDemo.ready');
  await page.waitForSelector('.bv-screen-row[data-biomarker="IL-6"][data-status="shown"]', { timeout: 180000 });
  await settle(page, 1200);
  numbers.screen = {
    title: await text(page, '.bv-screen-title').catch(() => null),
    caption: await text(page, '.bv-screen-caption').catch(() => null),
    order: await page.locator('.bv-screen-row').evaluateAll((rows) => rows.map((r) => r.dataset.biomarker)),
    top_row: await text(page, '.bv-screen-row'),
    frame: await text(page, '.sv-notes')
  };
  await toChart(page);
  await settle(page, 400);
  await shot(page, 'screen');
  // the statistics line under the rows: R's notes, the fourth on the pooled interval
  numbers.screen.notes = await page.locator('#chart .bv-statistic').first().innerText();
  const line = page.locator('#chart .bv-statistic').first();
  await line.scrollIntoViewIfNeeded();
  await shot(line, 'screen-notes');
  await page.locator('.bv-screen-row[data-biomarker="IL-6"]').click();
  await waitStats(page, '.bv-statistic', 1);
  await settle(page, 1500);
  numbers.screen_drill = {
    back: await page.getByRole('button', { name: 'Back to the biomarker screen' }).count(),
    statistics: (await texts(page, '.bv-statistic')).filter((s) => s.trim())
  };
  await toChart(page);
  await settle(page, 400);
  await shot(page, 'screen-drill');
  await context.close();
}

if (ONLY.includes('5')) // ---- 5. the R check page, R started at the press of the button
{
  const context = await browser.newContext(desktop);
  const m = meter(context);
  const page = await context.newPage();
  await page.goto(`${BASE}r-check/`);
  await page.waitForFunction(() => window.rCheck && window.rCheck.ready, null, { timeout: 60000 });
  // The page's own record of what starting R cost, as it prints it.
  numbers.r_check_recorded = await page.evaluate(() => {
    const tables = [...document.querySelectorAll('table')];
    const t = tables.find((t) => /Cold/.test(t.innerText));
    return { table: t ? t.innerText : null, footnote: t && t.parentElement ? t.parentElement.innerText.slice(0, 1200) : null };
  });
  m.reset();
  await page.click('#start-r');
  await page.waitForFunction(() => ['done', 'failed'].includes(document.body.dataset.rState), null, { timeout: 200000 });
  await settle(page, 1000);
  const record = await page.evaluate(() => ({
    state: document.body.dataset.rState,
    status: document.getElementById('r-status').innerText,
    timings: window.rCheck.browser.timings,
    session: window.rCheck.browser.session,
    agree: window.rCheck.browser.results.map((r) => ({ name: r.name, values: r.rows.length, same: r.rows.every((x) => x.ok) }))
  }));
  numbers.r_check_now = { ...record, r_megabytes: Number((m.bytes / 1e6).toFixed(2)), r_requests: m.requests };
  await page.evaluate(() => {
    const el = document.getElementById('start-r');
    window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 140, behavior: 'instant' });
  });
  await settle(page, 400);
  await shot(page, 'r-check');
  await context.close();
}

if (ONLY.includes('6')) // ---- 6. two at phone width
{
  const context = await browser.newContext(phone);
  const page = await context.newPage();
  await page.goto(`${BASE}biomarker-screen/`);
  await page.evaluate('window.BioVizDemo.ready');
  await page.waitForSelector('.bv-screen-row[data-biomarker="IL-6"][data-status="shown"]', { timeout: 180000 });
  await settle(page, 1200);
  numbers.phone_screen_scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
  await page.evaluate(() => {
    const el = document.querySelector('.bv-screen');
    window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 8, behavior: 'instant' });
  });
  await settle(page, 400);
  await shot(page, 'phone-screen');
  await page.goto(`${BASE}association-scatter/`);
  await page.evaluate('window.BioVizDemo.ready');
  await waitStats(page, '.bv-statistic', 1);
  await settle(page, 1500);
  numbers.phone_scatter_scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
  await page.evaluate(() => {
    const el = document.querySelector('#chart canvas');
    window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 8, behavior: 'instant' });
  });
  await settle(page, 400);
  await shot(page, 'phone-scatter');
  await context.close();
}

if (ONLY.includes('7')) // ---- 7. gsm.bio widgets, saved by htmlwidgets::saveWidget(selfcontained = TRUE),
//         opened from disk with the network off
{
  const context = await browser.newContext({ ...desktop, offline: true });
  const requests = [];
  context.on('request', (r) => { if (/^https?:/.test(r.url())) requests.push(r.url()); });
  numbers.widgets = {};
  for (const name of ['group-comparison', 'association-scatter', 'correlation-matrix', 'biomarker-screen']) {
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(`file://${path.resolve(widgets, name + '.html')}`);
    await page.waitForSelector('.gsm-bio-provenance', { timeout: 60000 });
    await settle(page, 2500);
    const entry = (numbers.widgets[name] = {
      provenance: await text(page, '.gsm-bio-provenance'),
      statistics: (await texts(page, '.bv-statistic')).filter((s) => s.trim()).slice(0, 2),
      errors
    });
    if (name === 'group-comparison') {
      entry.panels = await texts(page, '.bv-panel h3');
      await page.evaluate(() => {
        const el = document.querySelector('.bv-panel');
        window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 12, behavior: 'instant' });
      });
      await settle(page, 400);
      await shot(page, 'widget-group-comparison');
      // A view the widget did not compute: a filter moved. R is not there to ask.
      await page.locator('select[data-filter="SEX"]').selectOption('F');
      await settle(page, 1500);
      entry.filtered_statistics = (await texts(page, '.bv-statistic')).filter((s) => s.trim());
      const panel = page.locator('.bv-panel').nth(1);
      await panel.scrollIntoViewIfNeeded();
      await shot(panel, 'widget-unavailable');
    }
    if (name === 'biomarker-screen') {
      entry.top_row = await text(page, '.bv-screen-row');
      await page.locator('.bv-screen-row[data-biomarker="IL-6"]').click();
      await settle(page, 2000);
      entry.drill_statistics = (await texts(page, '.bv-statistic')).filter((s) => s.trim());
      await page.evaluate(() => {
        const el = document.querySelector('.gsm-bio-provenance');
        window.scrollTo({ top: el.getBoundingClientRect().bottom + window.scrollY - 900 + 24, behavior: 'instant' });
      });
      await settle(page, 400);
      await shot(page, 'widget-screen-drill');
    }
    await page.close();
  }
  numbers.widgets_network_requests = requests;
  await context.close();
}

writeFileSync(numbersFile, JSON.stringify(numbers, null, 2) + '\n');
await browser.close();
console.log('done');
