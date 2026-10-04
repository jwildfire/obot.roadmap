// Captures for the bio.viz v0.2.0 and gsm.bio v0.2.0 demo page. Real webR on the
// live dev site: each demo starts R in the browser the first time it needs a
// statistic. Needs Playwright on NODE_PATH (a safety.viz or bio.viz checkout's
// node_modules):
//   NODE_PATH=<checkout>/node_modules node capture.mjs <out dir> <scratch dir>
// Sections 1-4 read the live bio.viz dev site and write, into <scratch dir>, the
// files the chart downloads and the specifications it writes. Section 5 opens
// the gsm.bio widgets and batch output that gsm-bio.R wrote into <scratch dir>,
// and the live gsm.bio gallery. Stills go to <out dir>/media, and every number
// read to <out dir>/capture-numbers.json. ONLY=1,3 runs some sections and keeps
// the others' numbers.
import { createRequire } from 'node:module';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
const { chromium } = createRequire(import.meta.url)('playwright');

const BASE = 'https://jwildfire.github.io/bio.viz/dev/';
const GALLERY = 'https://jwildfire.github.io/gsm.bio/articles/gallery.html';
const [out, scratch] = process.argv.slice(2);
const media = path.join(out, 'media');
mkdirSync(media, { recursive: true });
mkdirSync(scratch, { recursive: true });
const numbersFile = path.join(out, 'capture-numbers.json');
const numbers = existsSync(numbersFile) ? JSON.parse(readFileSync(numbersFile, 'utf8')) : {};
numbers.base = BASE;
const ONLY = (process.env.ONLY || '1,2,3,4,5').split(',');
for (const s of ONLY) (numbers.captured_at ||= {})[s] = new Date().toISOString();

const browser = await chromium.launch();
const desktop = { viewport: { width: 1280, height: 900 }, deviceScaleFactor: 1.5, acceptDownloads: true };

const shot = async (target, name, opts = {}) => {
  await target.screenshot({ path: path.join(media, `${name}.jpg`), type: 'jpeg', quality: 78, ...opts });
  console.log('captured', name);
};
const settle = (page, ms = 900) => page.waitForTimeout(ms);
const text = (page, sel) => page.locator(sel).first().innerText();
const texts = (page, sel) => page.locator(sel).allInnerTexts();
// R has answered: the statistics line is shown and the footnote is not waiting.
const waitR = (page, previous = null) =>
  page.waitForFunction(
    (previous) => {
      const line = document.querySelector('#chart .sv-root:not(.sv-hidden) .bv-statistic');
      const foot = document.querySelector('#chart .sv-root:not(.sv-hidden) .bv-foot-line[data-automatic]');
      return (
        line && line.dataset.state === 'shown' && foot && !/waiting/i.test(foot.innerText) &&
        (previous === null || line.innerText !== previous)
      );
    },
    previous,
    { timeout: 200000 }
  );
const V = '#chart .sv-root:not(.sv-hidden)';
const statistics = (page) => page.locator(`${V} .bv-statistic`).first().innerText();
const foot = (page) => texts(page, `${V} .bv-foot-line`);
const titles = (page) => page.locator(`${V} .bv-titles`).first().innerText().catch(() => null);
const open = async (context, slug) => {
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(`${BASE}${slug}/index.html`);
  await page.evaluate('window.BioVizDemo.ready');
  await page.evaluate(() => document.fonts.ready);
  // What the page says the first test costs, from the demo's own settings.
  (numbers.waiting_notes ||= {})[slug] = await page.evaluate(() => {
    const d = Object.values(window.BioVizDemo).find((v) => v && v.settings && v.settings.waiting_note);
    return d ? d.settings.waiting_note : null;
  });
  return { page, errors };
};
// The chart's own frame, from its title to its downloads, without the page's chrome.
const main = (page) => page.locator(`${V} .sv-main`).first();

if (ONLY.includes('1')) // ---- 1. cross-tabulation: response by CRP cut at its median
{
  const context = await browser.newContext(desktop);
  const { page, errors } = await open(context, 'cross-tab');
  await waitR(page);
  numbers.crosstab_default = { titles: await titles(page), statistics: await statistics(page) };
  let before = await statistics(page);
  await page.locator('select[data-control="row-by"]').selectOption('RESPONSE');
  await settle(page, 300);
  await page.locator('select[data-control="col-by"]').selectOption('bv-cut:0');
  await waitR(page, before);
  await settle(page, 1200);
  numbers.crosstab = {
    titles: await titles(page),
    notes: await text(page, '#chart .sv-notes'),
    table: await text(page, '#chart table.bv-crosstab'),
    statistics: await statistics(page),
    footnote_hint: await text(page, '#chart .sv-footnote'),
    foot: await foot(page)
  };
  await shot(main(page), 'crosstab');
  before = await statistics(page);
  await page.locator('select[data-control="test"]').selectOption('fisher');
  await waitR(page, before);
  numbers.crosstab.fisher = await statistics(page);
  await page.locator('select[data-control="test"]').selectOption('chisq');
  await waitR(page, numbers.crosstab.fisher);
  // A cell lists its participants.
  await page.locator('#chart .bv-cell button[data-row="Non-responder"][data-col^=">"]').click();
  await page.waitForSelector('#chart .sv-listing table tbody tr', { timeout: 30000 });
  await settle(page, 800);
  numbers.crosstab_listing = {
    cell: await page.locator('#chart .bv-cell button[data-row="Non-responder"][data-col^=">"]').getAttribute('aria-label'),
    listing_head: (await text(page, '#chart .sv-listing')).slice(0, 600),
    rows_shown: await page.locator('#chart .sv-listing table tbody tr').count()
  };
  const listing = page.locator('#chart .sv-listing');
  await listing.scrollIntoViewIfNeeded();
  await shot(page, 'crosstab-listing');
  numbers.crosstab.errors = errors;
  await context.close();
}

if (ONLY.includes('2')) // ---- 2. stratified survival: the median cut, then the cut line dragged
{
  const context = await browser.newContext(desktop);
  const { page, errors } = await open(context, 'stratified-survival');
  await waitR(page);
  await settle(page, 1500);
  const read = async () => ({
    titles: await titles(page),
    risk: await text(page, '#chart table.bv-risk'),
    cut_counts: await text(page, '#chart .bv-cut-counts'),
    cut_value_now: await page.locator('#chart .bv-cut-handle').getAttribute('aria-valuenow'),
    cut_value_text: await page.locator('#chart .bv-cut-handle').getAttribute('aria-valuetext'),
    statistics: await statistics(page),
    foot: await foot(page)
  });
  numbers.survival = await read();
  await shot(main(page), 'survival');
  // Drag the cut line to the right with the mouse, in steps, and let go.
  const before = await statistics(page);
  const handle = page.locator('#chart .bv-cut-handle');
  await handle.scrollIntoViewIfNeeded();
  const box = await handle.boundingBox();
  const x = box.x + box.width / 2, y = box.y + box.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  for (let i = 1; i <= 12; i++) await page.mouse.move(x + i * 7, y, { steps: 2 });
  numbers.survival_during_drag = {
    cut_value_text: await handle.getAttribute('aria-valuetext'),
    statistics: await statistics(page)
  };
  await page.mouse.up();
  await waitR(page, before);
  await settle(page, 1500);
  numbers.survival_dragged = await read();
  await shot(main(page), 'survival-dragged');
  numbers.survival.errors = errors;
  await context.close();
}

if (ONLY.includes('3')) // ---- 3. biomarker screen: hazard-ratio rows, and the CRP row opened
{
  const context = await browser.newContext(desktop);
  const { page, errors } = await open(context, 'biomarker-screen');
  await waitR(page);
  let before = await statistics(page);
  await page.locator('select[data-control="comparison"]').selectOption('hazard');
  await settle(page, 600);
  await page.locator('select[data-control="value-type"]').selectOption('raw');
  await settle(page, 600);
  await page.locator('select[data-control="visit"]').selectOption('Baseline');
  await page.waitForFunction(
    () => /Result at Baseline: hazard ratio/.test(document.querySelector('#chart .bv-titles').innerText),
    null, { timeout: 60000 });
  await waitR(page, before);
  await page.waitForFunction(() => document.querySelectorAll('.bv-screen-row[data-status="shown"]').length === 12, null, { timeout: 120000 });
  await settle(page, 1500);
  numbers.screen_hazard = {
    titles: await titles(page),
    caption: await text(page, '#chart .bv-screen-caption').catch(() => null),
    rows: await page.locator('.bv-screen-row').evaluateAll((rows) =>
      rows.map((r) => ({
        biomarker: r.dataset.biomarker,
        value: r.querySelector('.bv-screen-value').innerText,
        p: [...r.querySelectorAll('.bv-screen-p')].map((e) => e.innerText),
        n: r.querySelector('.bv-screen-n').innerText,
        label: r.getAttribute('aria-label')
      }))),
    statistics: await statistics(page),
    foot: await foot(page)
  };
  await shot(main(page), 'screen-hazard');
  before = await statistics(page);
  await page.locator('.bv-screen-row[data-biomarker="CRP"]').click();
  await page.getByRole('button', { name: 'Back to the biomarker screen' }).waitFor({ timeout: 60000 });
  await waitR(page, before);
  await settle(page, 1500);
  numbers.screen_hazard_drill = {
    back: await page.getByRole('button', { name: 'Back to the biomarker screen' }).count(),
    titles: await titles(page),
    risk: await text(page, `${V} table.bv-risk`).catch(() => null),
    statistics: await statistics(page),
    foot: await foot(page)
  };
  await shot(main(page), 'screen-hazard-drill');
  numbers.screen_hazard.errors = errors;
  await context.close();
}

if (ONLY.includes('4')) // ---- 4. results out of the browser: footnotes, the three downloads, the specification
{
  const context = await browser.newContext(desktop);
  const { page, errors } = await open(context, 'stratified-survival');
  await waitR(page);
  await settle(page, 1500);
  numbers.output = { titles: await titles(page), foot: await foot(page) };
  // The footnotes and the bar of downloads, as one still.
  const a = await page.locator('#chart .bv-statistic').boundingBox();
  await page.locator('#chart .bv-downloads').scrollIntoViewIfNeeded();
  const f = await page.locator('#chart .bv-foot').boundingBox();
  const d = await page.locator('#chart .bv-downloads').boundingBox();
  const left = f.x - 8, top = f.y - 10;
  await shot(page, 'footnotes', { clip: { x: left, y: top, width: Math.max(f.width, d.width) + 16, height: d.y + d.height - top + 10 } });
  const save = async (kind, file) => {
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.locator(`#chart .bv-downloads button[data-download="${kind}"]`).click()
    ]);
    const target = path.join(scratch, file);
    await download.saveAs(target);
    return { suggested: download.suggestedFilename(), saved: target };
  };
  const png = await save('png', 'survival.png');
  const stats = await save('statistics', 'survival-statistics.csv');
  const table = await save('table', 'survival-table.csv');
  // What the PNG file says about itself: size, resolution and text chunks.
  const buf = readFileSync(png.saved);
  const chunks = {};
  for (let i = 8; i < buf.length; ) {
    const len = buf.readUInt32BE(i), type = buf.toString('latin1', i + 4, i + 8);
    const data = buf.subarray(i + 8, i + 8 + len);
    if (type === 'IHDR') chunks.size = [data.readUInt32BE(0), data.readUInt32BE(4)];
    if (type === 'pHYs') chunks.pixels_per_metre = data.readUInt32BE(0);
    if (type === 'iTXt') {
      const k = data.indexOf(0);
      const key = data.toString('latin1', 0, k);
      let j = k + 3; j = data.indexOf(0, j) + 1; j = data.indexOf(0, j) + 1;
      (chunks.text ||= {})[key] = data.toString('utf8', j);
    }
    i += 12 + len;
  }
  const csvLines = (file) => readFileSync(file, 'utf8').split(/\r\n/).filter((l) => l !== '');
  numbers.output.downloads = {
    png: { name: png.suggested, bytes: buf.length, ...chunks },
    statistics: { name: stats.suggested, lines: csvLines(stats.saved).length, header: csvLines(stats.saved)[0], first: csvLines(stats.saved).slice(1, 3) },
    table: { name: table.suggested, lines: csvLines(table.saved).length, header: csvLines(table.saved)[0], first: csvLines(table.saved).slice(1, 3) }
  };
  // The specification this view writes, and the cross-tabulation's from its demo, for gsm.bio's batch runner.
  const spec = await page.evaluate(() => window.BioVizDemo.chart.specification());
  writeFileSync(path.join(scratch, 'spec-survival.json'), JSON.stringify(spec, null, 2) + '\n');
  // Rebuilt from its own specification, the chart writes the same one again.
  numbers.output.round_trip_equal = await page.evaluate(async (spec) => {
    const el = document.createElement('div');
    el.id = 'rebuilt';
    document.body.appendChild(el);
    const study = await window.BioVizDemo.loadStudy('../data/synthetic-study/');
    const outcomes = await window.BioVizDemo.loadOutcomes('../data/synthetic-study/');
    const chart = window.BioViz.fromSpecification('#rebuilt', JSON.stringify(spec), {});
    await chart.init({ results: study.results, participants: study.participants, outcomes });
    return JSON.stringify(chart.specification()) === JSON.stringify(spec);
  }, spec);
  numbers.output.specification = { chart: spec.chart, format: spec.format, format_version: spec.format_version, bio_viz_version: spec.bio_viz_version, group_by: spec.settings.group_by, endpoint: spec.settings.endpoint, title: spec.settings.title, filters: spec.filters, settings_count: Object.keys(spec.settings).length };
  numbers.output.errors = errors;
  await page.close();
  const ct = await open(context, 'cross-tab');
  await waitR(ct.page);
  await ct.page.locator('select[data-control="row-by"]').selectOption('RESPONSE');
  await ct.page.locator('select[data-control="col-by"]').selectOption('bv-cut:0');
  await settle(ct.page, 800);
  writeFileSync(path.join(scratch, 'spec-crosstab.json'),
    JSON.stringify(await ct.page.evaluate(() => window.BioVizDemo.chart.specification()), null, 2) + '\n');
  await context.close();
}

if (ONLY.includes('5')) // ---- 5. gsm.bio: the two new widgets offline, the gallery, an RTF table and a batch figure
{
  const context = await browser.newContext({ ...desktop, offline: true });
  const requests = [];
  // Any request beyond the file itself: the network, or a file beside it.
  context.on('request', (r) => { if (!/^(data|blob):/.test(r.url()) && !/\/widgets\/widget-[a-z]+\.html$/.test(r.url())) requests.push(r.url()); });
  numbers.widgets = {};
  for (const name of ['widget-survival', 'widget-crosstab']) {
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(`file://${path.resolve(scratch, 'widgets', name + '.html')}`);
    await page.waitForSelector('.bv-statistic[data-state="shown"]', { timeout: 60000 });
    await settle(page, 2500);
    numbers.widgets[name] = {
      titles: await page.locator('.bv-titles').first().innerText().catch(() => null),
      statistics: await page.locator('.bv-statistic').first().innerText(),
      foot: await texts(page, '.bv-foot-line'),
      provenance: await page.locator('.gsm-bio-provenance').first().innerText().catch(() => null),
      errors
    };
    if (name === 'widget-survival') await shot(page.locator('.sv-main').first(), 'widget-survival');
    await page.close();
  }
  numbers.widgets_network_requests = requests;
  await context.close();

  // The RTF table the batch run wrote for CRP, read back from the file: each
  // row's cells, with RTF's \uN escapes decoded.
  const local = await browser.newContext(desktop);
  const rtfFile = path.join(scratch, 'batch', '01-stratified-survival-crp.rtf');
  if (existsSync(rtfFile)) {
    const rtf = readFileSync(rtfFile, 'latin1');
    const decode = (t) => t.replace(/\\u(-?\d+)\??/g, (_, n) => String.fromCharCode((+n + 65536) % 65536)).replace(/\\line/g, ' / ').trim();
    numbers.rtf_rows = rtf.split(/\\row/).map((chunk) =>
      [...chunk.matchAll(/\{\\f\d+ ((?:[^{}]|\\[{}])*)\}\\cell/g)].map((m) => decode(m[1]))).filter((r) => r.length);
    numbers.rtf_paragraphs = [...rtf.matchAll(/\{\\f\d+ ((?:[^{}])*)\}(?:\\line|\\par)/g)].map((m) => decode(m[1]));
  }
  // The gallery, live: one figure beside its widget.
  const g = await local.newPage();
  await g.goto(GALLERY);
  await g.waitForLoadState('networkidle');
  await settle(g, 3000);
  numbers.gallery = {
    headings: await texts(g, 'main h2, main h3'),
    figures: await g.locator('main img').count(),
    widgets: await g.locator('main .html-widget').count(),
    survival_figure_alt: await g.locator('main img[alt*="urviv"]').first().getAttribute('alt').catch(() => null)
  };
  const heading = g.locator('main h2, main h3', { hasText: /survival/i }).first();
  await g.evaluate((el) => window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 16, behavior: 'instant' }), await heading.elementHandle());
  await settle(g, 800);
  await shot(g, 'gallery');
  await local.close();
}

writeFileSync(numbersFile, JSON.stringify(numbers, null, 2) + '\n');
await browser.close();
console.log('done');
