// Captures and checks for the safety.viz v1.11.2 demo page: the new R ratio
// (nR) in Hep Explorer, on the site under review, and the same chart on the
// released site, which is release 1.11.1, for the "before".
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
// Once release 1.11.2 is on the released site there is no "before" left: the
// script sees nrRatio there, says so, and keeps the release 1.11.1 stills and
// reads it already has. To show the released site as "after" then, run it with
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
const EXPECT = {
  optionsAfter: ['Uniform', 'rRatio', 'nrRatio'],
  optionsBefore: ['Uniform', 'rRatio'],
  noteR: 'Point size encodes R Ratio',
  noteNR: 'Point size encodes nR Ratio, which takes AST in place of ALT when AST is the higher',
  tooltipNR: /^nR Ratio: /
};

const capture = { checks: {}, site: {} };
const check = (name, pass, detail) => {
  capture.checks[name] = detail === undefined ? { pass: !!pass } : { pass: !!pass, detail };
  console.log(`${pass ? 'ok  ' : 'FAIL'} ${name}${detail !== undefined ? ` — ${JSON.stringify(detail)}` : ''}`);
};

async function open(browser, base) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 1000 }, deviceScaleFactor: 1.5 });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (msg) => msg.type() === 'error' && errors.push(msg.text()));
  await page.goto(`${base}hep-explorer/`, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => window.__safetyHepExplorerInstance);
  await page.getByRole('button', { name: 'eDISH / mDISH scatter' }).click();
  await page.waitForFunction(() => window.__safetyHepExplorerInstance.chart && window.__safetyHepExplorerInstance.points?.length);
  await page.waitForTimeout(600);
  return { context, page, errors };
}

const bundle = (page) =>
  page.evaluate(() => {
    const src = [...document.scripts].map((s) => s.src).find((s) => /safety\.viz-[\d.]+\/safety\.viz\.js/.test(s));
    return src ? src.match(/safety\.viz-([\d.]+)\//)[1] : null;
  });

const pointSize = (page) => page.locator('.sv-control', { has: page.locator('label:text-is("Point Size")') });

async function setPointSize(page, value) {
  await pointSize(page).locator('select').selectOption(value);
  await page.waitForTimeout(700);
}

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

const centre = (b) => ({ x: b.x + b.width / 2, y: b.y + b.height / 2 });
const union = (...boxes) => {
  const x = Math.min(...boxes.map((b) => b.x));
  const y = Math.min(...boxes.map((b) => b.y));
  const r = Math.max(...boxes.map((b) => b.x + b.width));
  const btm = Math.max(...boxes.map((b) => b.y + b.height));
  return { x, y, width: r - x, height: btm - y };
};
const pad = (b, n) => ({ x: b.x - n, y: b.y - n, width: b.width + 2 * n, height: b.height + 2 * n });

/** The plot's region: the legend's note (when there is one) down to the canvas's foot. */
async function plotBox(page) {
  // Bounding boxes and the screenshot's clip are both in viewport pixels, so
  // the region is scrolled to the top of the viewport first.
  await page.locator('.hep-legend, canvas.sv-chart').first().evaluate((el) => el.scrollIntoView({ block: 'start' }));
  await page.evaluate(() => window.scrollBy(0, -12));
  const canvas = await page.locator('canvas.sv-chart').first().boundingBox();
  const legend = await page.locator('.hep-legend').first().boundingBox().catch(() => null);
  return pad(legend ? union(legend, canvas) : canvas, 8);
}

/** Where a participant's point is drawn, in page pixels. */
const pointAt = (page, id) =>
  page.evaluate((pid) => {
    const inst = window.__safetyHepExplorerInstance;
    const index = inst.points.findIndex((p) => String(p.id) === String(pid));
    const el = inst.chart.getDatasetMeta(0).data[index];
    const rect = inst.chart.canvas.getBoundingClientRect();
    return { x: rect.left + el.x, y: rect.top + el.y, index };
  }, id);

const tooltipFor = (page, id) =>
  page.evaluate((pid) => {
    const inst = window.__safetyHepExplorerInstance;
    const dataIndex = inst.points.findIndex((p) => String(p.id) === String(pid));
    return inst.chart.options.plugins.tooltip.callbacks.label({ datasetIndex: 0, dataIndex });
  }, id);

const radiusOf = (page, id) =>
  page.evaluate((pid) => {
    const inst = window.__safetyHepExplorerInstance;
    const dataIndex = inst.points.findIndex((p) => String(p.id) === String(pid));
    return inst.chart.data.datasets[0].pointRadius({ dataIndex });
  }, id);

async function main() {
  const browser = await chromium.launch();

  // ---------------------------------------------------------------- the release under review
  const after = await open(browser, BASE);
  const page = after.page;
  capture.site.after = `${BASE}hep-explorer/`;
  capture.site.after_is = BASE === RELEASED ? 'the released site' : BASE === DEV ? 'the dev site' : BASE;
  capture.site.version = await bundle(page);
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

  const options = await pointSize(page).locator('option').allTextContents();
  capture.options = options;
  check('Point Size offers Uniform, rRatio and nrRatio', JSON.stringify(options) === JSON.stringify(EXPECT.optionsAfter), options);

  // The numbers on the demo data.
  const stats = await page.evaluate(() => {
    const pts = window.__safetyHepExplorerInstance.points;
    const fin = (v) => Number.isFinite(v);
    const both = pts.filter((p) => fin(p.rRatio) && fin(p.nrRatio));
    const higher = both.filter((p) => p.nrRatio > p.rRatio + 1e-9);
    const below = both.filter((p) => p.nrRatio < p.rRatio - 1e-9);
    const byNR = [...pts].filter((p) => fin(p.nrRatio)).sort((a, b) => b.nrRatio - a.nrRatio);
    const byR = [...pts].filter((p) => fin(p.rRatio)).sort((a, b) => b.rRatio - a.rRatio);
    // Bands from the guide's R table, for both ratios.
    const band = (v) => (v > 5 ? 'hep' : v >= 2 ? 'mixed' : 'chol');
    const moved = both.filter((p) => band(p.rRatio) !== band(p.nrRatio));
    const count = (key) => ({
      hep: pts.filter((p) => fin(p[key]) && band(p[key]) === 'hep').length,
      mixed: pts.filter((p) => fin(p[key]) && band(p[key]) === 'mixed').length,
      chol: pts.filter((p) => fin(p[key]) && band(p[key]) === 'chol').length
    });
    return {
      plotted: pts.length,
      with_r: pts.filter((p) => fin(p.rRatio)).length,
      with_nr: pts.filter((p) => fin(p.nrRatio)).length,
      nr_higher: higher.length,
      nr_below: below.length,
      moved_band: moved.length,
      bands_r: count('rRatio'),
      bands_nr: count('nrRatio'),
      // The example: of the participants nR moves into a higher band of the
      // guide's table, the one with the highest nR.
      example: (() => {
        const e = [...moved].sort((a, b) => b.nrRatio - a.nrRatio)[0];
        return e ? { id: String(e.id), r: e.rRatio, nr: e.nrRatio } : null;
      })(),
      largest_nr: byNR.length ? String(byNR[0].id) : null,
      largest_r: byR.length ? String(byR[0].id) : null
    };
  });
  capture.stats = stats;
  check('every participant with an R has an nR', stats.with_nr >= stats.with_r, { with_r: stats.with_r, with_nr: stats.with_nr });
  check('no participant’s nR is below their R', stats.nr_below === 0, stats.nr_below);
  check('some participant’s nR is above their R on the demo data', stats.nr_higher > 0, stats.nr_higher);

  // Sized by R, then by nR.
  await setPointSize(page, 'rRatio');
  const noteR = (await page.locator('.hep-legend-note').first().textContent())?.trim();
  capture.note_r = noteR;
  check('the R note', noteR?.startsWith(EXPECT.noteR), noteR);
  {
    const box = await plotBox(page);
    const top = await pointAt(page, stats.largest_r);
    capture.by_r = { ...(await still(page, 'by-r.jpg', box, [top])), largest: stats.largest_r };
  }
  await setPointSize(page, 'nrRatio');
  const noteNR = (await page.locator('.hep-legend-note').first().textContent())?.trim();
  capture.note_nr = noteNR;
  check('the nR note', noteNR?.startsWith(EXPECT.noteNR), noteNR);
  check('the largest nR is drawn at the largest size', (await radiusOf(page, stats.largest_nr)) === 10, stats.largest_nr);
  {
    const box = await plotBox(page);
    const noteBox = await page.locator('.hep-legend-note').first().boundingBox();
    const top = await pointAt(page, stats.largest_nr);
    capture.by_nr = { ...(await still(page, 'by-nr.jpg', box, [{ x: noteBox.x + 14, y: centre(noteBox).y }, top])), largest: stats.largest_nr };
  }

  // The tooltip on the participant whose nR most outruns their R.
  const ex = stats.example.id;
  const lines = await tooltipFor(page, ex);
  capture.tooltip = { id: ex, lines };
  check('the tooltip shows nR on the line under R', /^R Ratio: /.test(lines[1]) && EXPECT.tooltipNR.test(lines[2]), lines.slice(1, 3));
  {
    const at = await pointAt(page, ex);
    await page.mouse.move(at.x, at.y);
    await page.waitForTimeout(500);
    const canvas = await page.locator('canvas.sv-chart').first().boundingBox();
    // A window around the point, inside the canvas, wide enough for the tooltip.
    const w = 520;
    const h = 300;
    const x = Math.min(Math.max(at.x - w / 2, canvas.x), canvas.x + canvas.width - w);
    const y = Math.min(Math.max(at.y - h / 2, canvas.y), canvas.y + canvas.height - h);
    capture.tooltip.still = await still(page, 'tooltip.jpg', { x, y, width: w, height: h }, [at]);
  }
  check('the page under review logs no error', after.errors.length === 0, after.errors);
  await after.context.close();

  // ---------------------------------------------------------------- the released site, before
  const before = await open(browser, BEFORE);
  const beforeOptions = await pointSize(before.page).locator('option').allTextContents();
  if (beforeOptions.includes('nrRatio') && BEFORE !== BASE) {
    console.log('The released site already offers nrRatio: keeping the release 1.11.1 reads and stills.');
    capture.before = previous.before;
    if (!capture.before) throw new Error('No release 1.11.1 reads are kept, and the released site is no longer release 1.11.1.');
  } else {
    const b = { site: `${BEFORE}hep-explorer/`, version: await bundle(before.page), options: beforeOptions };
    check('release 1.11.1 offers Uniform and rRatio only', JSON.stringify(beforeOptions) === JSON.stringify(EXPECT.optionsBefore), beforeOptions);
    b.tooltip = { id: ex, lines: await tooltipFor(before.page, ex) };
    check('release 1.11.1’s tooltip has no nR line', !b.tooltip.lines.some((l) => EXPECT.tooltipNR.test(l)), b.tooltip.lines);
    capture.before = b;
  }
  await before.context.close();
  await browser.close();

  fs.writeFileSync(jsonPath, `${JSON.stringify(capture, null, 2)}\n`);
  const failed = Object.entries(capture.checks).filter(([, v]) => !v.pass);
  console.log(`${Object.keys(capture.checks).length - failed.length} of ${Object.keys(capture.checks).length} checks held.`);
  if (failed.length) process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
