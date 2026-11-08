// Captures and checks for the safety.viz v1.11.3 demo page: the Safety
// Histogram's axis titles and the visit in its bar listing. Each view is shot
// twice, with the same framing: on the released site, which is release 1.11.2
// ("before"), and on the site under review ("after").
//
//   node capture.cjs [out dir]        default: the folder this file is in
//
// Run from the root of an `npm ci` checkout of safety.viz, for its Playwright.
// Stills go to <out dir>/media. Everything read from the live pages goes to
// <out dir>/capture.json, with a check of each thing the demo page states
// against what the live page shows. The script exits 1 when a check fails.
// Then `node build.cjs` writes index.html from capture.json.
//
//   BASE=<the site under review>   default: the dev site
//   BEFORE=<the site before it>    default: the released site
//
// Once release 1.11.3 is on the released site there is no "before" left: the
// script sees the axis titles there, says so, and keeps the release 1.11.2
// stills and reads it already has. To show the released site as "after" then,
// run it with
//   BASE=https://jwildfire.github.io/safety.viz/
const fs = require('node:fs');
const path = require('node:path');

const { chromium } = require(
  require.resolve('playwright', { paths: [process.cwd(), '/Users/jwildfire/Documents/obot2/safety.viz'] })
);

const DEV = 'https://jwildfire.github.io/safety.viz/dev/';
const RELEASED = 'https://jwildfire.github.io/safety.viz/';
const BASE = process.env.BASE || DEV;
const BEFORE = process.env.BEFORE || RELEASED;
const out = process.argv[2] || __dirname;
const media = path.join(out, 'media');
fs.mkdirSync(media, { recursive: true });
const jsonPath = path.join(out, 'capture.json');
const previous = fs.existsSync(jsonPath) ? JSON.parse(fs.readFileSync(jsonPath, 'utf8')) : {};

// What the page says the release does, held to the live site.
const MEASURE = 'Alanine Aminotransferase (U/L)';
const COUNT = 'Number of results';
const GROUP = 'ARM';

const capture = { checks: {}, site: {} };
const check = (name, pass, detail) => {
  capture.checks[name] = detail === undefined ? { pass: !!pass } : { pass: !!pass, detail };
  console.log(`${pass ? 'ok  ' : 'FAIL'} ${name}${detail !== undefined ? ` — ${JSON.stringify(detail)}` : ''}`);
};
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

const bundle = (page) =>
  page.evaluate(() => {
    const src = [...document.scripts].map((s) => s.src).find((s) => /safety\.viz-[\d.]+\/safety\.viz\.js/.test(s));
    return src ? src.match(/safety\.viz-([\d.]+)\//)[1] : null;
  });

/** A still of a page region, with marker positions as percentages of the still. */
async function still(page, name, box, markers = []) {
  const clip = {
    x: Math.max(0, Math.floor(box.x)),
    y: Math.max(0, Math.floor(box.y)),
    width: Math.ceil(box.width),
    height: Math.ceil(box.height)
  };
  await page.screenshot({ path: path.join(media, name), clip, type: 'jpeg', quality: 84 });
  return {
    file: name,
    width: clip.width,
    height: clip.height,
    markers: markers.map((m) => ({
      left: +(((m.x - clip.x) / clip.width) * 100).toFixed(2),
      top: +(((m.y - clip.y) / clip.height) * 100).toFixed(2)
    }))
  };
}

const pad = (b, n) => ({ x: b.x - n, y: b.y - n, width: b.width + 2 * n, height: b.height + 2 * n });

/** Scroll an element to the top of the viewport, so boxes and clips agree. */
async function toTop(locator) {
  await locator.evaluate((el) => el.scrollIntoView({ block: 'start' }));
  await locator.page().evaluate(() => window.scrollBy(0, -16));
}

const control = (page, label) => page.locator('.sv-control', { has: page.locator(`label:text-is("${label}")`) }).first();

/** Pick an option by its value, or the first whose text starts with `text`. */
async function pick(page, label, value, text) {
  const select = control(page, label).locator('select');
  const v = text ? await select.evaluate((el, t) => [...el.options].find((o) => o.text.startsWith(t))?.value, text) : value;
  await select.selectOption(v);
  await page.waitForTimeout(600);
}

/** Each drawn chart's axis titles (null where none shows), bar counts and tick labels. */
const charts = (page) =>
  page.evaluate(() => {
    const C = window.SafetyViz.kit.Chart;
    return [...document.querySelectorAll('canvas')]
      .map((el) => C.getChart(el))
      .filter((ch) => ch && ch.canvas.offsetParent)
      .map((ch) => {
        const t = (axis) => (ch.options.scales[axis].title?.display ? ch.options.scales[axis].title.text : null);
        return { x: t('x'), y: t('y'), counts: ch.data.datasets[0].data, ticks: ch.data.labels };
      });
  });

/** Where the main chart draws its two axis titles, in page pixels. */
const titleSpots = (page) =>
  page.evaluate(() => {
    const chart = window.SafetyViz.kit.Chart.getChart(document.querySelector('canvas.sv-chart'));
    const rect = chart.canvas.getBoundingClientRect();
    const { x, y } = chart.scales;
    return {
      x: { x: rect.left + (x.left + x.right) / 2 + 80, y: rect.top + x.bottom - 9 },
      y: { x: rect.left + y.left + 9, y: rect.top + (y.top + y.bottom) / 2 - 62 }
    };
  });

/** Click the tallest bar of the single-measure chart and read the listing. */
async function clickTallest(page) {
  await page.locator('canvas.sv-chart').first().scrollIntoViewIfNeeded();
  const at = await page.evaluate(() => {
    const chart = window.SafetyViz.kit.Chart.getChart(document.querySelector('canvas.sv-chart'));
    const counts = chart.data.datasets[0].data;
    const index = counts.indexOf(Math.max(...counts));
    const bar = chart.getDatasetMeta(0).data[index];
    const rect = chart.canvas.getBoundingClientRect();
    return { x: rect.left + bar.x, y: rect.top + (bar.y + bar.base) / 2, count: counts[index] };
  });
  await page.mouse.click(at.x, at.y);
  await page.locator('.sv-listing table').waitFor();
  await page.waitForTimeout(300);
  const headers = (await page.locator('.sv-listing th').allTextContents()).map((h) => h.replace(/[▲▼]/g, '').trim());
  const rows = await page.locator('.sv-listing tbody tr').evaluateAll((trs) =>
    trs.map((tr) => [...tr.querySelectorAll('td')].map((td) => td.textContent.trim()))
  );
  return { headers, rows, bar: at.count };
}

async function newPage(browser) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 1000 }, deviceScaleFactor: 1.5 });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (msg) => msg.type() === 'error' && errors.push(msg.text()));
  return { context, page, errors };
}

/**
 * The gallery's histogram page: the overview, the single-measure chart, the
 * grouped panels and the listing for one participant. `tag` is before|after;
 * markers are placed on the "after" stills only.
 */
async function gallery(browser, base, tag, participant) {
  const { context, page, errors } = await newPage(browser);
  const marks = tag === 'after';
  await page.goto(`${base}histogram/`, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => window.__safetyHistogramInstance && window.__safetyHistogramInstance.charts?.length);
  await page.waitForTimeout(500);
  const r = { site: `${base}histogram/`, version: await bundle(page) };

  // The all-measures overview, which the page opens on: the first two rows.
  r.overview = { charts: await charts(page) };
  {
    const first = page.locator('.sv-overview-panel').first();
    await toTop(first);
    const p = await first.boundingBox();
    const grid = await first.evaluate((el) => {
      const b = el.parentElement.getBoundingClientRect();
      return { x: b.left, width: b.width };
    });
    const canvas = await first.locator('canvas').boundingBox();
    r.overview.still = await still(page, `overview-${tag}.jpg`, pad({ x: grid.x, y: p.y, width: grid.width, height: p.height * 2 + 24 }, 6),
      marks ? [{ x: canvas.x + 7, y: canvas.y + canvas.height / 2 }] : []);
  }

  // The single-measure chart, ungrouped.
  await pick(page, 'Measure', MEASURE);
  await pick(page, 'Group charts by', 'sh_none');
  r.single = (await charts(page))[0];
  {
    const canvas = page.locator('canvas.sv-chart').first();
    await toTop(canvas);
    const spots = await titleSpots(page);
    r.single.still = await still(page, `single-${tag}.jpg`, pad(await canvas.boundingBox(), 10), marks ? [spots.x, spots.y] : []);
  }

  // Grouped by treatment group: the main chart, then a panel a group; the first row of panels.
  await pick(page, 'Group charts by', GROUP);
  const grouped = await charts(page);
  r.grouped = { main: grouped[0], panels: grouped.slice(1) };
  {
    const first = page.locator('.sv-multiple').first();
    await toTop(first);
    const p = await first.boundingBox();
    const wrap = await first.evaluate((el) => {
      const b = el.parentElement.getBoundingClientRect();
      return { x: b.left, width: b.width };
    });
    const canvas = await first.locator('canvas').boundingBox();
    r.grouped.still = await still(page, `grouped-${tag}.jpg`, pad({ x: wrap.x, y: p.y, width: wrap.width, height: p.height }, 6),
      marks ? [{ x: canvas.x + 7, y: canvas.y + canvas.height / 2 }] : []);
  }

  // One participant selected, the tallest bar clicked.
  await pick(page, 'Group charts by', 'sh_none');
  await pick(page, 'Participant ID', participant);
  r.listing = await clickTallest(page);
  {
    const table = page.locator('.sv-listing');
    await toTop(table);
    const box = await table.boundingBox();
    const markers = [];
    if (marks) {
      const th = (name) => page.locator('.sv-listing th', { hasText: new RegExp(`^${name}`) }).first().boundingBox();
      const a = await th('Participant ID');
      const v = await th('Visit');
      markers.push({ x: a.x + a.width - 12, y: a.y + 4 }, { x: v.x + v.width - 12, y: v.y + 4 });
    }
    r.listing.still = await still(page, `listing-${tag}.jpg`, pad(box, 6), markers);
  }
  r.errors = errors;
  await context.close();
  return r;
}

/** The demo app, which opens on the histogram: the single-measure chart and the listing. */
async function app(browser, base, tag) {
  const { context, page, errors } = await newPage(browser);
  const marks = tag === 'after';
  await page.goto(`${base}demo/`, { waitUntil: 'networkidle' });
  await page.waitForSelector('canvas', { state: 'attached', timeout: 60000 });
  await page.waitForTimeout(1500);
  const r = { site: `${base}demo/`, overview: await charts(page) };
  await pick(page, 'Measure', null, 'Alanine Aminotransferase');
  r.single = (await charts(page))[0];
  {
    const canvas = page.locator('canvas.sv-chart').first();
    await toTop(canvas);
    const spots = await titleSpots(page);
    r.single.still = await still(page, `app-${tag}.jpg`, pad(await canvas.boundingBox(), 10), marks ? [spots.x, spots.y] : []);
  }
  r.listing = await clickTallest(page);
  {
    const table = page.locator('.sv-listing');
    await toTop(table);
    const box = await table.boundingBox();
    // The header and the first rows are enough to show the columns.
    r.listing.still = await still(page, `app-listing-${tag}.jpg`, pad({ ...box, height: Math.min(box.height, 300) }, 6), []);
  }
  r.errors = errors;
  await context.close();
  return r;
}

async function main() {
  const browser = await chromium.launch();

  // ---------------------------------------------------------------- the release under review
  capture.site.after = `${BASE}histogram/`;
  capture.site.after_is = BASE === RELEASED ? 'the released site' : BASE === DEV ? 'the dev site' : BASE;
  capture.site.captured = new Date().toISOString();
  const branch = BASE === RELEASED ? 'main' : 'dev';
  capture.site.branch = branch;
  try {
    const res = await fetch(`https://api.github.com/repos/jwildfire/safety.viz/commits/${branch}`, {
      headers: { Accept: 'application/vnd.github+json' }
    });
    capture.site.commit = res.ok ? (await res.json()).sha : null;
  } catch {
    capture.site.commit = null;
  }

  // The participant: the one with ALT results at the most distinct visits (ties by ID).
  {
    const { context, page } = await newPage(browser);
    await page.goto(`${BASE}histogram/`, { waitUntil: 'networkidle' });
    await page.waitForFunction(() => window.__safetyHistogramInstance && window.__safetyHistogramInstance.charts?.length);
    capture.participant = await page.evaluate((measure) => {
      const by = new Map();
      for (const row of window.__safetyHistogramInstance.cleanData) {
        if (`${row.TEST} (${row.STRESU})` !== measure) continue;
        if (!by.has(row.USUBJID)) by.set(row.USUBJID, new Set());
        by.get(row.USUBJID).add(row.VISIT);
      }
      return [...by.entries()].sort((a, b) => b[1].size - a[1].size || String(a[0]).localeCompare(b[0]))[0][0];
    }, MEASURE);
    await context.close();
  }

  const after = await gallery(browser, BASE, 'after', capture.participant);
  capture.after = after;
  capture.site.version = after.version;
  const ov = after.overview.charts;
  check('every overview panel titles its y-axis “Number of results”, and none its x-axis', ov.length > 0 && ov.every((c) => c.y === COUNT && c.x === null), ov.length);
  check('the single-measure x-axis is titled with the measure and its unit', after.single.x === MEASURE, after.single.x);
  check('the single-measure y-axis is titled “Number of results”', after.single.y === COUNT, after.single.y);
  check('the grouped view keeps the titled chart above its panels', after.grouped.main.x === MEASURE && after.grouped.main.y === COUNT);
  check('every grouped panel titles its y-axis “Number of results”', after.grouped.panels.length > 1 && after.grouped.panels.every((c) => c.y === COUNT && c.x === null), after.grouped.panels.length);
  const L = after.listing;
  check('the listing opens with Participant ID, then Visit', same(L.headers.slice(0, 2), ['Participant ID', 'Visit']), L.headers);
  check('the listing has one Participant ID column', L.headers.filter((h) => h === 'Participant ID').length === 1);
  check('the listing has no study-day column', !L.headers.some((h) => /study day|visitnum|ady/i.test(h)), L.headers);
  L.visits = L.rows.map((row) => row[L.headers.indexOf('Visit')]);
  check('each listed record names its visit', L.visits.length > 0 && L.visits.every((v) => v && !/^\d+(\.\d+)?$/.test(v)), L.visits);
  check('the gallery page under review logs no error', after.errors.length === 0, after.errors);

  const appAfter = await app(browser, BASE, 'after');
  capture.app_after = appAfter;
  check('the demo app’s overview panels title their y-axes', appAfter.overview.length > 0 && appAfter.overview.every((c) => c.y === COUNT), appAfter.overview.length);
  check('the demo app’s single-measure chart titles both axes', /^Alanine Aminotransferase/.test(appAfter.single.x) && appAfter.single.y === COUNT, { x: appAfter.single.x, y: appAfter.single.y });
  check('the demo app’s listing has Participant ID once, then Visit', same(appAfter.listing.headers.slice(0, 2), ['Participant ID', 'Visit']) && appAfter.listing.headers.filter((h) => h === 'Participant ID').length === 1, appAfter.listing.headers);
  check('the demo app logs no error', appAfter.errors.length === 0, appAfter.errors);

  // ---------------------------------------------------------------- the released site, before
  const probe = await newPage(browser);
  await probe.page.goto(`${BEFORE}histogram/`, { waitUntil: 'networkidle' });
  await probe.page.waitForFunction(() => window.__safetyHistogramInstance && window.__safetyHistogramInstance.charts?.length);
  const releasedTitled = (await charts(probe.page)).some((c) => c.y === COUNT);
  await probe.context.close();
  if (releasedTitled) {
    console.log('The released site already titles the axes: keeping the release 1.11.2 reads and stills.');
    capture.before = previous.before;
    capture.app_before = previous.app_before;
    if (!capture.before || !capture.app_before) throw new Error('No release 1.11.2 reads are kept, and the released site is no longer release 1.11.2.');
  } else {
    const before = await gallery(browser, BEFORE, 'before', capture.participant);
    capture.before = before;
    check('release 1.11.2 titles no axis in any view', [...before.overview.charts, before.single, before.grouped.main, ...before.grouped.panels].every((c) => c.x === null && c.y === null));
    check('the single-measure bars, counts and ticks are the same in both releases', same(before.single.counts, after.single.counts) && same(before.single.ticks, after.single.ticks), { before: before.single.counts.length, after: after.single.counts.length });
    check('the overview panels’ counts are the same in both releases', same(before.overview.charts.map((c) => c.counts), ov.map((c) => c.counts)));
    check('release 1.11.2 lists Participant ID twice and no visit', before.listing.headers.filter((h) => h === 'Participant ID').length === 2 && !before.listing.headers.includes('Visit'), before.listing.headers);
    check('the clicked bar holds the same records in both releases', before.listing.bar === L.bar && before.listing.rows.length === L.rows.length, { before: before.listing.bar, after: L.bar });
    const appBefore = await app(browser, BEFORE, 'before');
    capture.app_before = appBefore;
    check('release 1.11.2’s demo app titles no axis and lists no visit', appBefore.single.x === null && appBefore.single.y === null && !appBefore.listing.headers.includes('Visit'), appBefore.listing.headers);
  }
  await browser.close();

  // Charts' raw counts and ticks are not needed on the page.
  const slim = (r) => {
    if (!r) return;
    r.overview = Array.isArray(r.overview) ? { panels: r.overview.length } : { panels: r.overview.charts.length, still: r.overview.still };
    for (const c of [r.single, r.grouped?.main, ...(r.grouped?.panels || [])]) if (c) { c.bars = c.counts?.length; c.results = c.counts?.reduce((s, n) => s + n, 0); delete c.counts; delete c.ticks; }
    if (r.grouped) r.grouped.panels = r.grouped.panels.length;
  };
  if (!releasedTitled) [capture.after, capture.before, capture.app_after, capture.app_before].forEach(slim);
  else [capture.after, capture.app_after].forEach(slim);

  fs.writeFileSync(jsonPath, `${JSON.stringify(capture, null, 2)}\n`);
  const failed = Object.entries(capture.checks).filter(([, v]) => !v.pass);
  console.log(`${Object.keys(capture.checks).length - failed.length} of ${Object.keys(capture.checks).length} checks held.`);
  if (failed.length) process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
