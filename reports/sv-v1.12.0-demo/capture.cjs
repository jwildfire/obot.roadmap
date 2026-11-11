// Captures and checks for the safety.viz v1.12.0 demo page: one x-axis toggle
// between Visit and Study day for every chart that shows change over time, the
// demo data with real study days, and hep-explorer's slider and 30-day timing.
// Each view is shot on the released site, release 1.11.3 ("before"), and on the
// site under review ("after"), with the same framing.
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
//   HARNESS=<harness.html>         default: harness.html beside this file
//
// The gallery's data has both a visit and a study day, so three cases are
// shown through harness.html instead: data with neither, data with no study
// day, and charts given no time setting. The harness loads a bundle from the
// safety.viz site (`bundle=dev` or `bundle=released`) and mounts charts on the
// gallery's own demo data with columns taken out.
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
const HARNESS = process.env.HARNESS || `file://${path.join(__dirname, 'harness.html')}`;
const media = path.join(out, 'media');
fs.mkdirSync(media, { recursive: true });
const jsonPath = path.join(out, 'capture.json');

// What the page says the release does, held to the live site.
const PID = '01-701-1028';
const NO_TIME = 'This data has no visit or study day, so there is no time axis to plot.';
const NO_DAY = 'No study day in this data';
const VISIT_DAY = /^(Baseline|Screening|Week \d+|Unscheduled [\d.]+) · Day -?\d+$/;

const capture = { checks: {}, site: {}, participant: PID };
const check = (name, pass, detail) => {
  capture.checks[name] = detail === undefined ? { pass: !!pass } : { pass: !!pass, detail };
  console.log(`${pass ? 'ok  ' : 'FAIL'} ${name}${detail !== undefined ? ` — ${JSON.stringify(detail)}` : ''}`);
};
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const last = (list) => list[list.length - 1];

// ---------------------------------------------------------------- page helpers
async function newPage(browser) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 1000 }, deviceScaleFactor: 1.5 });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (msg) => msg.type() === 'error' && errors.push(msg.text()));
  return { context, page, errors };
}

const bundle = (page) =>
  page.evaluate(() => [...document.scripts].map((s) => s.src).find((s) => /safety\.viz-[\d.]+\/safety\.viz\.js/.test(s)) || null);

async function open(browser, url, global) {
  const t = await newPage(browser);
  await t.page.goto(url, { waitUntil: 'networkidle' });
  if (global) await t.page.waitForFunction((g) => window[g] && window[g].root, global, { timeout: 60000 });
  await t.page.waitForTimeout(700);
  return t;
}

/** Scroll an element to the top of the viewport, so boxes and clips agree. */
async function toTop(page, selector) {
  await page.evaluate((sel) => {
    const el = typeof sel === 'string' ? document.querySelector(sel) : null;
    el.scrollIntoView({ block: 'start', behavior: 'instant' });
    window.scrollBy({ top: -16, behavior: 'instant' });
  }, selector);
  await page.waitForTimeout(250);
}

const box = (page, selector) =>
  page.evaluate((sel) => {
    const el = document.querySelector(sel);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: r.left, y: r.top, width: r.width, height: r.height };
  }, selector);

const union = (...boxes) => {
  const b = boxes.filter(Boolean);
  const x = Math.min(...b.map((v) => v.x));
  const y = Math.min(...b.map((v) => v.y));
  return { x, y, width: Math.max(...b.map((v) => v.x + v.width)) - x, height: Math.max(...b.map((v) => v.y + v.height)) - y };
};
const pad = (b, n) => ({ x: b.x - n, y: b.y - n, width: b.width + 2 * n, height: b.height + 2 * n });

/** A still of a viewport region, with marker positions as percentages of the still. */
async function still(page, name, b, markers = []) {
  const clip = {
    x: Math.max(0, Math.floor(b.x)),
    y: Math.max(0, Math.floor(b.y)),
    width: Math.ceil(Math.min(b.width, 1280 - Math.max(0, b.x))),
    height: Math.ceil(Math.min(b.height, 1000 - Math.max(0, b.y)))
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

/** The first drawn Chart.js chart inside `scope`: its x-axis title, ticks and first series' x values. */
const lineChart = (page, scope) =>
  page.evaluate((sel) => {
    const C = window.SafetyViz.kit.Chart;
    const root = document.querySelector(sel);
    if (!root) return null;
    const ch = [...root.querySelectorAll('canvas')].map((c) => C.getChart(c)).find((c) => c && c.canvas.offsetParent);
    if (!ch) return null;
    const x = ch.scales.x;
    return {
      title: ch.options.scales.x.title && ch.options.scales.x.title.display !== false ? ch.options.scales.x.title.text : null,
      type: x.type,
      ticks: x.ticks.map((t) => (Array.isArray(t.label) ? t.label.join(' ') : String(t.label))),
      series: ch.data.datasets.map((d) => d.label),
      xs: (ch.data.datasets[0].data || []).map((d) => (d && typeof d === 'object' ? d.x : d)),
      plugins: (ch.config.plugins || []).map((p) => p.id)
    };
  }, scope);

/** The X-axis (or Step by) controls inside `scope`: label, buttons, pressed, greyed with reason. */
const controls = (page, scope) =>
  page.evaluate((sel) =>
    [...document.querySelectorAll(`${sel} .sv-xaxis-control`)].map((c) => ({
      label: c.querySelector('label').textContent,
      inRail: Boolean(c.closest('.sv-rail')),
      options: [...c.querySelectorAll('.sv-xaxis-option')].map((b) => ({
        title: b.textContent,
        key: b.dataset.key,
        pressed: b.getAttribute('aria-pressed') === 'true',
        disabled: b.disabled,
        reason: b.disabled ? b.title : null
      }))
    })), scope);

/** Show the tooltip of one point, as a hover would, and read it. Returns where it is, in viewport pixels. */
const tooltip = (page, scope, datasetIndex, index) =>
  page.evaluate(({ sel, datasetIndex, index }) => {
    const C = window.SafetyViz.kit.Chart;
    const ch = [...document.querySelector(sel).querySelectorAll('canvas')].map((c) => C.getChart(c)).find((c) => c && c.canvas.offsetParent);
    const el = ch.getDatasetMeta(datasetIndex).data[index];
    ch.tooltip.setActiveElements([{ datasetIndex, index }], { x: el.x, y: el.y });
    ch.setActiveElements([{ datasetIndex, index }]);
    ch.update('none');
    const t = ch.tooltip;
    const r = ch.canvas.getBoundingClientRect();
    return {
      title: t.title || [],
      lines: (t.body || []).flatMap((b) => [...b.before, ...b.lines, ...b.after]).concat(t.afterBody || []),
      at: { x: r.left + t.x + t.width - 8, y: r.top + t.y + 8 },
      point: { x: r.left + el.x, y: r.top + el.y }
    };
  }, { sel: scope, datasetIndex, index });

const click = async (page, selector) => {
  await page.locator(selector).first().click();
  await page.waitForTimeout(900);
};

// ---------------------------------------------------------------- 1. the participant profile
async function profilePage(browser, base, tag) {
  const { context, page, errors } = await open(browser, `${base}participant-profile/`);
  await page.waitForFunction(() => window.__safetyParticipantProfileInstance);
  await page.evaluate((id) => window.__safetyParticipantProfileInstance.setSelected([id]), PID);
  await page.waitForTimeout(1200);
  const r = { site: `${base}participant-profile/`, bundle: await bundle(page) };
  const frame = async () => {
    await toTop(page, '#linked-profile .sv-profile-root');
    const root = await box(page, '#linked-profile .sv-profile-root');
    const side = await box(page, '#linked-profile .sv-sidebar');
    const ae = await box(page, '#linked-profile .sv-profile-ae-timeline, #linked-profile .sv-profile-ae-list-wrap');
    const top = root.y;
    const bottom = ae ? ae.y + ae.height : top + 900;
    return pad({ x: side.x, y: top, width: root.x + root.width - side.x, height: bottom - top }, 8);
  };
  const ae = () =>
    page.evaluate(() => ({
      track: Boolean(document.querySelector('#linked-profile .sv-profile-ae-timeline')),
      listed: [...document.querySelectorAll('#linked-profile .sv-profile-ae-list li')].map((li) => li.textContent.trim()),
      note: document.querySelector('#linked-profile .sv-profile-ae-list-note')?.textContent.trim() || null
    }));
  r.first = { chart: await lineChart(page, '#linked-profile'), controls: await controls(page, '#linked-profile'), ae: await ae() };
  if (tag === 'before') {
    r.first.still = await still(page, 'profile-before.jpg', await frame());
  } else {
    const f = await frame();
    const ctl = await box(page, '#linked-profile .sv-xaxis-control');
    const ticks = await page.evaluate(() => {
      const C = window.SafetyViz.kit.Chart;
      const ch = C.getChart(document.querySelector('#linked-profile .sv-profile-spaghetti canvas'));
      const r = ch.canvas.getBoundingClientRect();
      return { x: r.left + ch.scales.x.getPixelForValue(4), y: r.top + ch.scales.x.bottom - 22 };
    });
    const note = await box(page, '#linked-profile .sv-profile-ae-list-note');
    r.first.still = await still(page, 'profile-visit.jpg', f, [
      { x: ctl.x + ctl.width - 10, y: ctl.y + 8 },
      ticks,
      note && { x: note.x + 10, y: note.y + 8 }
    ].filter(Boolean));
    // Study day view, the Week 8 point's tooltip open.
    await click(page, '#linked-profile .sv-xaxis-option[data-key=day]');
    r.day = { chart: await lineChart(page, '#linked-profile'), controls: await controls(page, '#linked-profile'), ae: await ae() };
    const f2 = await frame();
    const week8 = await page.evaluate(() => {
      const C = window.SafetyViz.kit.Chart;
      const ch = C.getChart(document.querySelector('#linked-profile .sv-profile-spaghetti canvas'));
      return ch.data.datasets[0].data.findIndex((d) => d && d.raw && /Week 8$/.test(String(d.raw.VISIT || '')));
    });
    const dayOne = await page.evaluate(() => {
      const C = window.SafetyViz.kit.Chart;
      const ch = C.getChart(document.querySelector('#linked-profile .sv-profile-spaghetti canvas'));
      const r = ch.canvas.getBoundingClientRect();
      return { x: r.left + ch.scales.x.getPixelForValue(1) + 1, y: r.top + ch.chartArea.top + 40 };
    });
    r.day.tip = await tooltip(page, '#linked-profile .sv-profile-spaghetti', 0, week8 >= 0 ? week8 : 4);
    await page.waitForTimeout(500);
    const track = await box(page, '#linked-profile .sv-profile-ae-timeline');
    r.day.still = await still(page, 'profile-day.jpg', f2, [dayOne, r.day.tip.at, { x: track.x + 14, y: track.y + 10 }]);
    delete r.day.tip.at;
  }
  r.errors = errors;
  await context.close();
  return r;
}

// ---------------------------------------------------------------- 2. the side panel in a host
async function railPage(browser, base, tag, chart, global) {
  const { context, page, errors } = await open(browser, `${base}${chart}/`, global);
  await page.evaluate(({ g, id }) => window[g].root.dispatchEvent(new CustomEvent('participantsSelected', { detail: { data: [id] } })), { g: global, id: PID });
  await page.waitForTimeout(1200);
  const r = { site: `${base}${chart}/`, bundle: await bundle(page) };
  r.first = { chart: await lineChart(page, '.sv-rail'), controls: await controls(page, '.sv-rail') };
  await toTop(page, '.sv-rail');
  const rail = await box(page, '.sv-rail');
  const card = await box(page, '.sv-rail .sv-profile-spaghetti');
  const frame = pad({ x: rail.x, y: rail.y, width: rail.width, height: card.y + card.height - rail.y }, 6);
  const markers = [];
  if (tag === 'after') {
    const ctl = await box(page, '.sv-rail .sv-xaxis-control');
    markers.push({ x: ctl.x + ctl.width - 10, y: ctl.y + 8 });
  }
  r.first.still = await still(page, `${chart}-rail-${tag}.jpg`, frame, markers);
  if (tag === 'after') {
    await click(page, '.sv-rail .sv-xaxis-option[data-key=day]');
    r.day = { chart: await lineChart(page, '.sv-rail'), controls: await controls(page, '.sv-rail') };
  }
  r.errors = errors;
  await context.close();
  return r;
}

// ---------------------------------------------------------------- 3. the outlier explorer
async function outlierPage(browser, base, tag) {
  const g = '__safetyOutlierExplorerInstance';
  const { context, page, errors } = await open(browser, `${base}outlier-explorer/`, g);
  const r = { site: `${base}outlier-explorer/`, bundle: await bundle(page) };
  const main = 'canvas.sv-chart';
  const frame = async () => {
    await toTop(page, '.sv-chart-wrap, .sv-main');
    const chartBox = await page.evaluate((sel) => {
      const c = document.querySelector(sel);
      const card = c.closest('.sv-chart-wrap') || c.parentElement;
      const r = card.getBoundingClientRect();
      return { x: r.left, y: r.top, width: r.width, height: r.height };
    }, main);
    const side = await box(page, '.sv-sidebar');
    const ctl = await box(page, '.sv-sidebar .sv-xaxis-control');
    const bottom = Math.max(chartBox.y + chartBox.height, ctl ? ctl.y + ctl.height : 0);
    return pad({ x: side.x, y: chartBox.y, width: chartBox.x + chartBox.width - side.x, height: bottom - chartBox.y }, 8);
  };
  r.first = { chart: await lineChart(page, '.sv-main'), controls: await controls(page, '.sv-sidebar') };
  // Visits that share a name but not a number are kept apart, named with the number.
  r.first.numberedTicks = r.first.chart.ticks.filter((t) => /\(\d+(\.\d+)?\)$/.test(t));
  const f = await frame();
  const markers = [];
  if (tag === 'after') {
    const ctl = await box(page, '.sv-sidebar .sv-xaxis-control');
    const title = await page.evaluate((sel) => {
      const ch = window.SafetyViz.kit.Chart.getChart(document.querySelector(sel));
      const rc = ch.canvas.getBoundingClientRect();
      return { x: rc.left + (ch.scales.x.left + ch.scales.x.right) / 2 + 26, y: rc.top + ch.scales.x.bottom - 8 };
    }, main);
    markers.push({ x: ctl.x + ctl.width - 10, y: ctl.y + 8 }, title);
  }
  r.first.still = await still(page, `outlier-${tag}.jpg`, f, markers);
  if (tag === 'after') {
    // Study day view, one participant selected: the listing and a point's tooltip.
    await click(page, '.sv-sidebar .sv-xaxis-option[data-key=day]');
    await page.evaluate(({ g, id }) => window[g].selectParticipant(id), { g, id: PID });
    await page.waitForTimeout(900);
    r.day = { chart: await lineChart(page, '.sv-main'), controls: await controls(page, '.sv-sidebar') };
    r.day.listing = await page.evaluate(() => ({
      headers: [...document.querySelectorAll('.sv-listing th')].map((h) => h.textContent.replace(/[▲▼]/g, '').trim()),
      rows: [...document.querySelectorAll('.sv-listing tbody tr')].map((tr) => [...tr.querySelectorAll('td')].map((td) => td.textContent.trim()))
    }));
    const f2 = await frame();
    r.day.tip = await tooltip(page, '.sv-main', 1, 4);
    await page.waitForTimeout(500);
    r.day.still = await still(page, 'outlier-day.jpg', f2, [r.day.tip.at]);
    delete r.day.tip.at;
    await toTop(page, '.sv-listing');
    const lb = await box(page, '.sv-listing');
    const th = await box(page, '.sv-listing th');
    r.day.listing.still = await still(page, 'outlier-listing.jpg', pad({ ...lb, height: Math.min(lb.height, 330) }, 6), [{ x: th.x + th.width - 12, y: th.y + 6 }]);
    // The side panel opens on the main chart's view (Study day here) and keeps
    // its own after that: switch it to Visit, and the main axis stays put.
    const railOpened = await controls(page, '.sv-rail');
    const mainBefore = (await lineChart(page, '.sv-main')).title;
    await click(page, '.sv-rail .sv-xaxis-option[data-key=visit]');
    r.independent = {
      railOpenedOn: railOpened.map((c) => c.options.find((o) => o.pressed)?.key),
      mainBefore,
      railNow: (await controls(page, '.sv-rail')).map((c) => c.options.find((o) => o.pressed)?.key),
      railTitle: (await lineChart(page, '.sv-rail'))?.title,
      mainAfterRailSwitch: (await lineChart(page, '.sv-main')).title
    };
    // Does switching the main axis keep the selected participant and the side panel?
    await click(page, '.sv-sidebar .sv-xaxis-option[data-key=visit]');
    r.mainSwitch = await page.evaluate((g) => ({
      selected: window[g].state.selectedId,
      panelOpen: Boolean(document.querySelector('.sv-rail .sv-profile-root')),
      listing: document.querySelectorAll('.sv-listing tbody tr').length
    }), g);
  }
  r.errors = errors;
  await context.close();
  return r;
}

// ---------------------------------------------------------------- 4. the QT explorer drill-down
async function qtPage(browser, base, tag) {
  const g = '__safetyQtExplorerInstance';
  const { context, page, errors } = await open(browser, `${base}qt-explorer/`, g);
  await page.evaluate(({ g, id }) => window[g].selectParticipant(id), { g, id: PID });
  await page.waitForTimeout(1200);
  const r = { site: `${base}qt-explorer/`, bundle: await bundle(page) };
  const frame = async () => {
    await toTop(page, '.sv-rail');
    const rail = await box(page, '.sv-rail');
    const card = await box(page, '.sv-rail .sv-profile-spaghetti');
    return pad({ x: rail.x, y: rail.y, width: rail.width, height: card.y + card.height - rail.y }, 6);
  };
  r.first = { chart: await lineChart(page, '.sv-rail'), controls: await controls(page, '.sv-rail') };
  const markers = [];
  const f = await frame();
  if (tag === 'after') {
    const ctl = await box(page, '.sv-rail .sv-xaxis-control');
    markers.push({ x: ctl.x + ctl.width - 10, y: ctl.y + 8 });
  }
  r.first.still = await still(page, `qt-${tag}.jpg`, f, markers);
  if (tag === 'after') {
    await click(page, '.sv-rail .sv-xaxis-option[data-key=day]');
    r.day = { chart: await lineChart(page, '.sv-rail'), controls: await controls(page, '.sv-rail') };
    r.day.still = await still(page, 'qt-day.jpg', await frame());
    // Does the demo's ECG data have two visits on one study day for any participant?
    r.sameDay = await page.evaluate((g) => {
      const rows = window[g].rawData || [];
      const m = new Map();
      for (const row of rows) {
        if (row.DY === '' || row.DY === undefined) continue;
        const k = `${row.USUBJID}|${row.PARAMCD}|${row.DY}`;
        if (!m.has(k)) m.set(k, new Set());
        m.get(k).add(row.VISIT);
      }
      return { records: rows.length, participantDaysWithTwoVisits: [...m.values()].filter((v) => v.size > 1).length };
    }, g);
  }
  r.errors = errors;
  await context.close();
  return r;
}

// ---------------------------------------------------------------- 5. hep-explorer
/** Counts read from the scatter as drawn: filled, hollow and cross points. */
const hepDrawn = (page, g) =>
  page.evaluate((g) => {
    const I = window[g];
    const C = window.SafetyViz.kit.Chart;
    const ch = C.getChart(I.root.querySelector('canvas.sv-chart') || I.root.querySelector('canvas'));
    const meta = ch.getDatasetMeta(0);
    const pts = I.points || [];
    const opts = meta.data.map((el) => el.options);
    const clear = (c) => c === 'rgba(0,0,0,0)' || c === 'transparent';
    return {
      points: pts.length,
      drawn: meta.data.length,
      hollow: opts.filter((o) => clear(o.backgroundColor) && !/cross/i.test(String(o.pointStyle))).length,
      filled: opts.filter((o) => !clear(o.backgroundColor) && !/cross/i.test(String(o.pointStyle))).length,
      crosses: opts.filter((o) => /cross/i.test(String(o.pointStyle))).length,
      timing: pts.reduce((m, p) => ((m[p.timing ?? 'none'] = (m[p.timing ?? 'none'] || 0) + 1), m), {}),
      withinWindow: pts.filter((p) => p.withinWindow === true).length,
      footnote: I.root.querySelector('.sv-footnote')?.textContent.trim() || null,
      windowInput: [...I.root.querySelectorAll('.sv-control')]
        .filter((c) => /Timing/.test(c.querySelector('label')?.textContent || ''))
        .map((c) => ({ label: c.querySelector('label').textContent, value: c.querySelector('input')?.value, disabled: c.querySelector('input')?.disabled }))[0] || null,
      slider: (() => {
        const s = I.root.querySelector('.hep-animation-slider');
        const ends = [...I.root.querySelectorAll('.hep-animation-end')].map((e) => e.textContent);
        return s ? { min: s.min, max: s.max, label: s.getAttribute('aria-label'), valuetext: s.getAttribute('aria-valuetext'), ends } : null;
      })()
    };
  }, g);

async function hepFrame(page, g) {
  return page.evaluate((g) => {
    const root = window[g].root;
    const canvas = root.querySelector('canvas.sv-chart') || root.querySelector('canvas');
    const card = canvas.closest('.sv-chart-wrap') || canvas.parentElement;
    const bottomEl = root.querySelector('.hep-animation-axis') || root.querySelector('.hep-animation-bar') || root.querySelector('.sv-footnote');
    const a = card.getBoundingClientRect();
    const b = bottomEl.getBoundingClientRect();
    return { x: a.left, y: a.top, width: a.width, height: b.bottom - a.top };
  }, g);
}

async function scrollHep(page, g) {
  await page.evaluate((g) => {
    const root = window[g].root;
    const canvas = root.querySelector('canvas.sv-chart') || root.querySelector('canvas');
    (canvas.closest('.sv-chart-wrap') || canvas.parentElement).scrollIntoView({ block: 'start', behavior: 'instant' });
    window.scrollBy({ top: -16, behavior: 'instant' });
  }, g);
  await page.waitForTimeout(300);
}

async function hepPage(browser, base, tag) {
  const g = '__safetyHepExplorerInstance';
  const { context, page, errors } = await open(browser, `${base}hep-explorer/`, g);
  await page.getByRole('button', { name: 'eDISH / mDISH scatter' }).click();
  await page.waitForTimeout(1500);
  const r = { site: `${base}hep-explorer/`, bundle: await bundle(page) };
  r.scatter = await hepDrawn(page, g);
  r.scatter.controls = await controls(page, '.sv-root');
  await scrollHep(page, g);
  const f = pad(await hepFrame(page, g), 8);
  const markers = [];
  if (tag === 'after') {
    const hollow = await page.evaluate((g) => {
      const I = window[g];
      const ch = window.SafetyViz.kit.Chart.getChart(I.root.querySelector('canvas.sv-chart') || I.root.querySelector('canvas'));
      const rc = ch.canvas.getBoundingClientRect();
      const meta = ch.getDatasetMeta(0);
      // The hollow point furthest up and right, away from the crowd.
      let best = null;
      meta.data.forEach((el, i) => {
        if (I.points[i].timing !== 'outside') return;
        const score = el.x - el.y;
        if (!best || score > best.score) best = { score, x: rc.left + el.x, y: rc.top + el.y - 14 };
      });
      return best;
    }, g);
    const foot = await box(page, '.sv-footnote');
    const ctl = await box(page, '.hep-animation-axis');
    markers.push(hollow, { x: foot.x + 8, y: foot.y + 8 }, { x: ctl.x + 8, y: ctl.y + 8 });
  }
  r.scatter.still = await still(page, `hep-${tag}.jpg`, f, markers);
  if (tag === 'after') {
    // Step by Visit: the slider steps through the visits.
    await click(page, '.hep-animation-axis .sv-xaxis-option[data-key=visit]');
    r.visit = { slider: (await hepDrawn(page, g)).slider, controls: await controls(page, '.hep-animation-axis') };
    await scrollHep(page, g);
    const bar = union(await box(page, '.hep-animation-bar'), await box(page, '.hep-animation-axis'));
    r.visit.still = await still(page, 'hep-stepby-visit.jpg', pad(bar, 10), []);
  }
  r.errors = errors;
  await context.close();
  return r;
}

// ---------------------------------------------------------------- 6, 7, 9. the harness
async function harness(browser, which, kase, tries = 2) {
  const { context, page, errors } = await newPage(browser);
  const url = `${HARNESS}?bundle=${which}&case=${kase}`;
  await page.goto(url);
  try {
    await page.waitForFunction(() => window.__harness && (window.__harness.ready || window.__harness.error), null, { timeout: 90000 });
  } catch (error) {
    // The harness fetches a 6 MB file from GitHub Pages; one slow fetch is retried once.
    await context.close();
    if (tries > 1) return harness(browser, which, kase, tries - 1);
    throw error;
  }
  await page.waitForTimeout(1200);
  const meta = await page.evaluate(() => ({ src: window.__harness.src, data: window.__harness.data, dropped: window.__harness.dropped, columns: window.__harness.columns, rows: window.__harness.rows, error: window.__harness.error || null }));
  return { context, page, errors, meta, url };
}

async function noTimeAxis(browser, which, tag) {
  const { context, page, errors, meta } = await harness(browser, which, 'neither');
  const r = { harness: meta };
  r.outlier = {
    chart: await lineChart(page, '#oe'),
    message: await page.evaluate(() => document.querySelector('#oe .sv-no-time-axis')?.textContent.trim() || null),
    controls: await controls(page, '#oe')
  };
  r.profile = {
    chart: await lineChart(page, '#pp'),
    message: await page.evaluate(() => document.querySelector('#pp .sv-no-time-axis')?.textContent.trim() || null)
  };
  await toTop(page, '#oe');
  const oe = await box(page, '#oe');
  const markers = [];
  if (tag === 'after') {
    const msg = await box(page, '#oe .sv-no-time-axis');
    markers.push({ x: msg.x + 10, y: msg.y + msg.height / 2 });
  }
  r.outlier.still = await still(page, `notime-${tag}.jpg`, pad({ ...oe, height: Math.min(oe.height, 620) }, 6), markers);
  r.errors = errors;
  await context.close();
  return r;
}

async function noStudyDay(browser, which, tag) {
  const { context, page, errors, meta } = await harness(browser, which, 'noday');
  const g = '__harnessHep';
  await page.evaluate((g) => (window[g] = window.__harness.hep), g);
  const r = { harness: meta, scatter: await hepDrawn(page, g) };
  r.scatter.controls = await controls(page, '#hep');
  if (tag === 'after') {
    // A point's tooltip says the timing was not evaluated.
    r.tip = await tooltip(page, '#hep', 0, 0);
    await page.waitForTimeout(400);
  }
  await scrollHep(page, g);
  const f = pad(await hepFrame(page, g), 8);
  const markers = [];
  if (tag === 'after') {
    const foot = await box(page, '#hep .sv-footnote');
    const ctl = await box(page, '#hep .hep-animation-axis');
    const tipAt = await page.evaluate(() => {
      const ch = window.SafetyViz.kit.Chart.getChart(window.__harnessHep.root.querySelector('canvas.sv-chart') || window.__harnessHep.root.querySelector('canvas'));
      const rc = ch.canvas.getBoundingClientRect();
      const t = ch.tooltip;
      return { x: rc.left + t.x + t.width - 8, y: rc.top + t.y + 8 };
    });
    const day = await box(page, '#hep .hep-animation-axis .sv-xaxis-option[data-key=day]');
    markers.push(tipAt, { x: foot.x + 8, y: foot.y + 8 }, { x: day.x + day.width - 8, y: day.y + 6 });
    delete r.tip.at;
  }
  r.scatter.still = await still(page, `noday-${tag}.jpg`, f, markers);
  r.errors = errors;
  await context.close();
  return r;
}

async function panels(browser, which) {
  const { context, page, errors, meta } = await harness(browser, which, 'panels');
  const r = { harness: meta };
  await page.evaluate((id) => window.__harness.histogram.root.dispatchEvent(new CustomEvent('participantsSelected', { detail: { data: [id] } })), PID);
  await page.waitForTimeout(1200);
  r.histogramPanel = {
    chart: await lineChart(page, '#sh .sv-rail'),
    message: await page.evaluate(() => document.querySelector('#sh .sv-rail .sv-no-time-axis')?.textContent.trim() || null),
    controls: await controls(page, '#sh .sv-rail')
  };
  await page.evaluate((id) => {
    const I = window.__harness.shift;
    const pair = I.chartPairs.find((p) => String(p[I.settings.id_col]) === id);
    I.brushValues(pair.x - 0.01, pair.x + 0.01, pair.y - 0.01, pair.y + 0.01);
  }, PID);
  await page.waitForTimeout(800);
  r.shiftListing = await page.evaluate(() => [...document.querySelectorAll('#ssp .sv-listing th')].map((h) => h.textContent.replace(/[▲▼]/g, '').trim()));
  r.errors = errors;
  await context.close();
  return r;
}

async function defaults(browser, which) {
  const { context, page, errors, meta } = await harness(browser, which, 'defaults');
  const r = { harness: meta };
  r.studyday_col = await page.evaluate(() => {
    const H = window.__harness;
    return { histogram: H.histogram.settings.studyday_col, outlier: H.outlier.settings.studyday_col, shift: H.shift.settings.studyday_col, delta: H.delta.settings.studyday_col };
  });
  r.outlier = await lineChart(page, '#oe');
  r.outlierControls = await controls(page, '#oe');
  r.outlierVisitCols = await page.evaluate(() => ({ visit_col: window.__harness.outlier.settings.visit_col ?? null, visitn_col: window.__harness.outlier.settings.visitn_col ?? null }));
  r.errors = errors;
  await context.close();
  return r;
}

// ---------------------------------------------------------------- 9. the shift plot and delta-delta in the gallery
async function shiftListing(browser, base, tag) {
  const g = '__safetyShiftPlotInstance';
  const { context, page, errors } = await open(browser, `${base}shift-plot/`, g);
  const r = { site: `${base}shift-plot/` };
  await page.evaluate(({ g, id }) => {
    const I = window[g];
    const pair = I.chartPairs.find((p) => String(p[I.settings.id_col]) === id);
    I.brushValues(pair.x - 0.01, pair.x + 0.01, pair.y - 0.01, pair.y + 0.01);
  }, { g, id: PID });
  await page.waitForTimeout(800);
  r.listing = await page.evaluate(() => ({
    headers: [...document.querySelectorAll('.sv-listing th')].map((h) => h.textContent.replace(/[▲▼]/g, '').trim()),
    rows: [...document.querySelectorAll('.sv-listing tbody tr')].map((tr) => [...tr.querySelectorAll('td')].map((td) => td.textContent.trim()))
  }));
  await toTop(page, '.sv-listing');
  const lb = await box(page, '.sv-listing');
  const markers = [];
  if (tag === 'after') {
    const th = await page.evaluate(() => {
      const h = [...document.querySelectorAll('.sv-listing th')].find((e) => /^Study day/.test(e.textContent.trim()));
      const b = h.getBoundingClientRect();
      return { x: b.right - 12, y: b.top + 6 };
    });
    markers.push(th);
  }
  r.listing.still = await still(page, `shift-listing-${tag}.jpg`, pad({ ...lb, height: Math.min(lb.height, 240) }, 6), markers);
  r.errors = errors;
  await context.close();
  return r;
}

async function deltaTooltip(browser, base) {
  const g = '__safetyDeltaDeltaInstance';
  const { context, page, errors } = await open(browser, `${base}delta-delta/`, g);
  await page.waitForTimeout(600);
  const index = await page.evaluate(({ g, id }) => {
    const C = window.SafetyViz.kit.Chart;
    const ch = C.getChart(window[g].root.querySelector('canvas'));
    const ds = ch.data.datasets[0];
    for (let i = 0; i < ds.data.length; i += 1) {
      ch.tooltip.setActiveElements([{ datasetIndex: 0, index: i }], { x: 0, y: 0 });
      ch.update('none');
      if ((ch.tooltip.body || []).some((b) => b.lines.some((l) => l.includes(id)))) return i;
    }
    return 0;
  }, { g, id: PID });
  const tip = await tooltip(page, '.sv-main', 0, index);
  await context.close();
  return { site: `${base}delta-delta/`, lines: tip.lines, errors };
}

// ---------------------------------------------------------------- 8. the demo app
async function app(browser, base, tag) {
  const { context, page, errors } = await newPage(browser);
  await page.goto(`${base}demo/`, { waitUntil: 'networkidle' });
  await page.waitForSelector('canvas', { state: 'attached', timeout: 60000 });
  await page.waitForTimeout(1500);
  const r = { site: `${base}demo/` };
  const state = async () => ({ chart: await lineChart(page, '.sva-chart .sv-main'), controls: await controls(page, '.sva-chart') });
  const go = async (name) => {
    await page.getByRole('button', { name: new RegExp(`^${name}`) }).click();
    await page.waitForTimeout(2200);
  };
  await go('Outlier Explorer');
  r.first = await state();
  const frame = async () => {
    await toTop(page, '.sva-chart');
    const card = await box(page, '.sva-chart');
    return pad({ ...card, height: Math.min(card.height, 700) }, 4);
  };
  if (tag === 'after') {
    await click(page, '.sva-chart .sv-sidebar .sv-xaxis-option[data-key=day]');
    r.picked = await state();
    await go('Histogram');
    await go('Outlier Explorer');
    r.back = await state();
    const f = await frame();
    const ctl = await box(page, '.sva-chart .sv-sidebar .sv-xaxis-control');
    r.back.still = await still(page, 'app-after.jpg', f, [{ x: ctl.x + ctl.width - 10, y: ctl.y + 8 }]);
    // Click a participant's point: the side panel opens on the chart's view, with its own control.
    const at = await page.evaluate(() => {
      const ch = window.SafetyViz.kit.Chart.getChart(document.querySelector('.sva-chart canvas.sv-chart'));
      const el = ch.getDatasetMeta(0).data.find((e) => e && Number.isFinite(e.x) && Number.isFinite(e.y));
      const rc = ch.canvas.getBoundingClientRect();
      return { x: rc.left + el.x, y: rc.top + el.y };
    });
    await page.mouse.click(at.x, at.y);
    await page.waitForTimeout(1500);
    r.rail = { controls: await controls(page, '.sva-chart .sv-rail'), chart: await lineChart(page, '.sva-chart .sv-rail') };
  } else {
    r.first.still = await still(page, 'app-before.jpg', await frame());
  }
  r.errors = errors;
  await context.close();
  return r;
}

// ---------------------------------------------------------------- main
async function main() {
  const browser = await chromium.launch();
  capture.site.after = BASE;
  capture.site.before = BEFORE;
  capture.site.after_is = BASE === RELEASED ? 'the released site' : BASE === DEV ? 'the dev site' : /\/pr\/\d+\/$/.test(BASE) ? 'the release candidate’s preview' : BASE;
  capture.site.harness = HARNESS.startsWith('file:') ? 'harness.html (local copy)' : HARNESS;
  capture.site.captured = new Date().toISOString();
  const branch = BASE === RELEASED ? 'main' : 'dev';
  capture.site.branch = branch;
  try {
    const res = await fetch(`https://api.github.com/repos/jwildfire/safety.viz/commits/${branch}`, { headers: { Accept: 'application/vnd.github+json' } });
    capture.site.commit = res.ok ? (await res.json()).sha : null;
  } catch {
    capture.site.commit = null;
  }
  const visitPressed = (cs) => cs.length > 0 && cs[0].options.find((o) => o.pressed)?.key;

  // 1. The participant profile.
  const ppA = await profilePage(browser, BASE, 'after');
  const ppB = await profilePage(browser, BEFORE, 'before');
  capture.profile = { after: ppA, before: ppB };
  capture.site.bundle = ppA.bundle;
  // Pages caches for ten minutes: hold the bundle the site serves to the one committed at the branch head.
  if (capture.site.commit && ppA.bundle) {
    const rel = ppA.bundle.replace(BASE, '');
    const [served, committed] = await Promise.all([
      fetch(`${ppA.bundle}?nocache=${Date.now()}`).then((res) => res.text()),
      fetch(`https://raw.githubusercontent.com/jwildfire/safety.viz/${capture.site.commit}/${rel}`).then((res) => (res.ok ? res.text() : null))
    ]);
    check(`the site serves the bundle committed at ${branch} ${capture.site.commit.slice(0, 8)}`, committed !== null && served === committed, { bundle: rel, served: served.length, committed: committed && committed.length });
  }
  check('the profile has an X-axis control: Visit | Study day, opening on Visit',
    ppA.first.controls.length === 1 && ppA.first.controls[0].label === 'X-axis' && same(ppA.first.controls[0].options.map((o) => o.title), ['Visit', 'Study day']) && visitPressed(ppA.first.controls) === 'visit', ppA.first.controls);
  const vTicks = ppA.first.chart.ticks;
  check('Visit view spaces visits evenly, ticks named by visit', ppA.first.chart.title === 'Visit' && same(ppA.first.chart.xs, ppA.first.chart.xs.map((_, i) => i)) && vTicks.every((t) => /^(Baseline|Week \d+|Screening|Unscheduled [\d.]+)$/.test(t)), { title: ppA.first.chart.title, xs: ppA.first.chart.xs, ticks: vTicks });
  check('Visit view draws no day-1 line', !ppA.first.chart.plugins.includes('sv-profile-day-one'), ppA.first.chart.plugins);
  check('Study day view is titled “Study day” and has a day-1 line', ppA.day.chart.title === 'Study day' && ppA.day.chart.plugins.includes('sv-profile-day-one'), { title: ppA.day.chart.title, plugins: ppA.day.chart.plugins });
  check(`participant ${PID}’s last ALT sits at study day 180 in Study day view`, last(ppA.day.chart.xs) === 180, ppA.day.chart.xs);
  check('the tooltip names the visit and the study day, like “Week 8 · Day 57”', /^Week 8 · Day -?\d+$/.test(ppA.day.tip.title[0] || ''), ppA.day.tip.title);
  check('the adverse-event track shows only in Study day view', ppA.day.ae.track && !ppA.first.ae.track, { visit: ppA.first.ae.track, day: ppA.day.ae.track });
  check('in Visit view the adverse events are listed with their study days', ppA.first.ae.listed.length > 0 && ppA.first.ae.listed.every((t) => /study day -?\d+/.test(t)), ppA.first.ae.listed);
  check('before: release 1.11.3’s profile page has no X-axis control', ppB.first.controls.length === 0);
  check('before: the profile page titled its axis “Study Day” over a day worked out from the visit name (Week 26 = 183)', ppB.first.chart.title === 'Study Day' && last(ppB.first.chart.xs) === 183, { title: ppB.first.chart.title, xs: ppB.first.chart.xs });
  check('the gallery profile pages log no error', ppA.errors.length === 0 && ppB.errors.length === 0, [...ppA.errors, ...ppB.errors]);

  // 2. The side panel, in the histogram.
  const railA = await railPage(browser, BASE, 'after', 'histogram', '__safetyHistogramInstance');
  const railB = await railPage(browser, BEFORE, 'before', 'histogram', '__safetyHistogramInstance');
  capture.rail = { after: railA, before: railB };
  check('the histogram’s side panel opens on Visit, with its own X-axis control', railA.first.controls.length === 1 && railA.first.controls[0].inRail && visitPressed(railA.first.controls) === 'visit' && railA.first.chart.title === 'Visit', railA.first.controls);
  check('the side panel switches to Study day: the last ALT at day 180', railA.day.chart.title === 'Study day' && last(railA.day.chart.xs) === 180, { title: railA.day.chart.title, xs: railA.day.chart.xs });
  check('before: the histogram’s side panel plotted the visit number as “Study Day”: the last ALT at 13', railB.first.chart.title === 'Study Day' && last(railB.first.chart.xs) === 13 && railB.first.controls.length === 0, { title: railB.first.chart.title, xs: railB.first.chart.xs });

  // 3. The outlier explorer.
  const oeA = await outlierPage(browser, BASE, 'after');
  const oeB = await outlierPage(browser, BEFORE, 'before');
  capture.outlier = { after: oeA, before: oeB };
  check('the outlier explorer has an X-axis control: Visit | Study day, opening on Visit', oeA.first.controls.length === 1 && same(oeA.first.controls[0].options.map((o) => o.title), ['Visit', 'Study day']) && visitPressed(oeA.first.controls) === 'visit', oeA.first.controls);
  check('Visit view: one evenly spaced tick per visit, named', oeA.first.chart.title === 'Visit' && oeA.first.chart.type === 'category' && oeA.first.chart.ticks.length > 5 && oeA.first.chart.ticks[0] === 'Baseline', { type: oeA.first.chart.type, ticks: oeA.first.chart.ticks.length });
  check('Study day view: a linear axis titled “Study day”', oeA.day.chart.title === 'Study day' && oeA.day.chart.type === 'linear', oeA.day.chart.title);
  const timeCol = oeA.day.listing.headers.indexOf('Time');
  check('the listing names both: “Week 2 · Day 14”', timeCol >= 0 && oeA.day.listing.rows.length > 0 && oeA.day.listing.rows.every((row) => VISIT_DAY.test(row[timeCol])), oeA.day.listing.rows.map((row) => row[timeCol]));
  check('a point’s tooltip names both', oeA.day.tip.lines.some((l) => VISIT_DAY.test(l)), oeA.day.tip.lines);
  check('the side panel opens on the main chart’s view, then keeps its own: switching it leaves the main axis as it was', same(oeA.independent.railOpenedOn, ['day']) && oeA.independent.mainBefore === 'Study day' && same(oeA.independent.railNow, ['visit']) && oeA.independent.railTitle === 'Visit' && oeA.independent.mainAfterRailSwitch === 'Study day', oeA.independent);
  check('before: release 1.11.3 plotted a “Measurement” sequence, with no control', oeB.first.chart.title === 'Measurement' && oeB.first.controls.length === 0, oeB.first.chart.title);

  // 4. The QT explorer's drill-down.
  const qtA = await qtPage(browser, BASE, 'after');
  const qtB = await qtPage(browser, BEFORE, 'before');
  capture.qt = { after: qtA, before: qtB };
  check('the QT drill-down opens on Visit, with an X-axis control', visitPressed(qtA.first.controls) === 'visit' && qtA.first.chart.title === 'Visit' && qtA.first.chart.ticks[0] === 'Baseline', { title: qtA.first.chart.title, ticks: qtA.first.chart.ticks });
  check('the QT drill-down by study day: the last ECG at day 180', qtA.day.chart.title === 'Study day' && last(qtA.day.chart.xs) === 180, qtA.day.chart.xs);
  check('the demo ECG data has no participant with two visits on one study day', qtA.sameDay.records > 0 && qtA.sameDay.participantDaysWithTwoVisits === 0, qtA.sameDay);
  check('before: the QT drill-down plotted the visit number as “Study Day”', qtB.first.chart.title === 'Study Day' && last(qtB.first.chart.xs) === 26 && qtB.first.controls.length === 0, { title: qtB.first.chart.title, xs: qtB.first.chart.xs });

  // 5. hep-explorer.
  const hepA = await hepPage(browser, BASE, 'after');
  const hepB = await hepPage(browser, BEFORE, 'before');
  capture.hep = { after: hepA, before: hepB };
  const sA = hepA.scatter;
  capture.hollow = { hollow: sA.hollow, of: sA.points };
  check('hep-explorer’s control in the playback bar is labelled “Step by”: Visit | Study day, on Study day', sA.controls.length === 1 && sA.controls[0].label === 'Step by' && same(sA.controls[0].options.map((o) => o.title), ['Visit', 'Study day']) && visitPressed(sA.controls) === 'day', sA.controls);
  check('by study day the slider runs in days', sA.slider && sA.slider.label === 'Study day' && /^Day -?\d+$/.test(sA.slider.valuetext || ''), sA.slider);
  check('Step by Visit: the slider steps through the visits', hepA.visit.slider && hepA.visit.slider.label === 'Visit' && hepA.visit.slider.ends[0] === 'Baseline', hepA.visit.slider);
  check('the drawn hollow points are the participants outside the 30-day window', sA.hollow === (sA.timing.outside || 0) && sA.filled === (sA.timing.within || 0) && sA.crosses === 0 && sA.hollow > 0, { hollow: sA.hollow, filled: sA.filled, of: sA.points, timing: sA.timing });
  check('before: release 1.11.3 drew no point hollow on the demo data', hepB.scatter.hollow === 0 && hepB.scatter.points === sA.points, { hollow: hepB.scatter.hollow, of: hepB.scatter.points });
  check('before: release 1.11.3’s slider ran over visit numbers 0 to 13, called “Study day”', hepB.scatter.slider && hepB.scatter.slider.min === '0' && hepB.scatter.slider.max === '13' && hepB.scatter.slider.label === 'Study day', hepB.scatter.slider);

  // 6. Neither a visit nor a study day.
  const ntA = await noTimeAxis(browser, 'dev', 'after');
  const ntB = await noTimeAxis(browser, 'released', 'before');
  capture.notime = { after: ntA, before: ntB };
  check('the harness data has no VISIT, VISITNUM or DY column', !ntA.harness.columns.some((c) => ['VISIT', 'VISITNUM', 'DY'].includes(c)), ntA.harness.columns);
  check('with neither, the outlier explorer shows the message instead of a chart', ntA.outlier.message === NO_TIME && ntA.outlier.chart === null, ntA.outlier.message);
  check('with neither, the participant profile shows the message instead of a chart', ntA.profile.message === NO_TIME && ntA.profile.chart === null, ntA.profile.message);
  check('before: release 1.11.3 drew a “Measurement” sequence, and a profile titled “Study Day” with nothing to plot', ntB.outlier.chart && ntB.outlier.chart.title === 'Measurement' && ntB.profile.chart && ntB.profile.chart.title === 'Study Day', { outlier: ntB.outlier.chart?.title, profile: ntB.profile.chart?.title });

  // 7. hep-explorer with no study day.
  const ndA = await noStudyDay(browser, 'dev', 'after');
  const ndB = await noStudyDay(browser, 'released', 'before');
  capture.noday = { after: ndA, before: ndB };
  const nA = ndA.scatter;
  check('the harness data has a visit and no DY column', ndA.harness.columns.includes('VISIT') && !ndA.harness.columns.includes('DY'), ndA.harness.columns);
  check('with no study day, every point is drawn as a cross', nA.crosses === nA.points && nA.points > 0 && (nA.timing.not_evaluated || 0) === nA.points, { crosses: nA.crosses, of: nA.points });
  check('the footnote says timing was not evaluated', /Timing was not evaluated: the data has no study day/.test(nA.footnote || ''), nA.footnote);
  check('the timing-window input is disabled', nA.windowInput && nA.windowInput.disabled === true, nA.windowInput);
  check('Step by: Study day is greyed and says why', nA.controls.length === 1 && nA.controls[0].options.some((o) => o.key === 'day' && o.disabled && o.reason === NO_DAY), nA.controls);
  check('a point’s tooltip says timing was not evaluated', ndA.tip.lines.some((l) => /Timing not evaluated/.test(l)), ndA.tip.lines);
  check('with no study day the tooltip gives no “@ day NA”', ndA.tip.lines.length > 0 && !ndA.tip.lines.some((l) => /@ day NA|day NA/.test(l)), ndA.tip.lines);

  // Side panels and the shift-plot listing on data with no study day.
  const pnA = await panels(browser, 'dev');
  const pnB = await panels(browser, 'released');
  capture.panels = { after: pnA, before: pnB };
  check('with no study day, the histogram’s side panel still draws by Visit, Study day greyed', pnA.histogramPanel.chart && pnA.histogramPanel.chart.title === 'Visit' && !pnA.histogramPanel.message && pnA.histogramPanel.controls.length === 1 && pnA.histogramPanel.controls[0].options.some((o) => o.key === 'day' && o.disabled && o.reason === NO_DAY), pnA.histogramPanel);
  check('with no study day, the shift-plot listing leaves out the Study day column', pnA.shiftListing.length > 0 && !pnA.shiftListing.includes('Study day') && pnA.shiftListing.includes('Visit'), pnA.shiftListing);
  check('the harness panels pages log no error', pnA.errors.length === 0, pnA.errors);
  check('before: release 1.11.3 with no study day drew every point filled', ndB.scatter.withinWindow === ndB.scatter.points && ndB.scatter.crosses === 0 && ndB.scatter.hollow === 0, { filled: ndB.scatter.filled, of: ndB.scatter.points });

  // 8. The demo app.
  const appA = await app(browser, BASE, 'after');
  const appB = await app(browser, BEFORE, 'before');
  capture.app = { after: appA, before: appB };
  check('the demo app’s outlier explorer has Visit | Study day, opening on Visit', visitPressed(appA.first.controls.filter((c) => !c.inRail)) === 'visit' && appA.first.chart.title === 'Visit', appA.first.controls);
  check('the app remembers the view: Study day still chosen after leaving the chart and coming back', visitPressed(appA.back.controls.filter((c) => !c.inRail)) === 'day' && appA.back.chart.title === 'Study day', { picked: appA.picked.chart.title, back: appA.back.chart.title });
  check('in the demo app, the side panel opens on the chart’s view, with its own Visit | Study day control', appA.rail.controls.length === 1 && same(appA.rail.controls[0].options.map((o) => o.title), ['Visit', 'Study day']) && visitPressed(appA.rail.controls) === 'day' && appA.rail.chart && appA.rail.chart.title === 'Study day', { controls: appA.rail.controls, title: appA.rail.chart && appA.rail.chart.title });
  check('before: the demo app’s outlier explorer had no control and a “Measurement” axis', appB.first.controls.filter((c) => !c.inRail).length === 0 && appB.first.chart.title === 'Measurement', appB.first.chart.title);
  check('the demo app logs no error', appA.errors.length === 0, appA.errors);

  // 9. Changed defaults.
  const dfA = await defaults(browser, 'dev');
  const dfB = await defaults(browser, 'released');
  capture.defaults = { after: dfA, before: dfB };
  check('the histogram, outlier explorer, shift plot and delta-delta read DY by default', Object.values(dfA.studyday_col).every((v) => v === 'DY'), dfA.studyday_col);
  check('before: none of the four had a study-day default', Object.values(dfB.studyday_col).every((v) => v === null || v === undefined), dfB.studyday_col);
  check('an outlier explorer given no time setting offers Visit and Study day and opens on Visit', dfA.outlier && dfA.outlier.title === 'Visit' && dfA.outlierControls.length === 1 && same(dfA.outlierControls[0].options.map((o) => [o.key, o.disabled]), [['visit', false], ['day', false]]) && visitPressed(dfA.outlierControls) === 'visit', { title: dfA.outlier?.title, controls: dfA.outlierControls });
  check('the outlier explorer reads VISIT and VISITNUM by default', dfA.outlierVisitCols.visit_col === 'VISIT' && dfA.outlierVisitCols.visitn_col === 'VISITNUM', dfA.outlierVisitCols);
  check('before: an outlier explorer given no time setting plotted a “Measurement” sequence', dfB.outlier && dfB.outlier.title === 'Measurement', dfB.outlier?.title);
  const shA = await shiftListing(browser, BASE, 'after');
  const shB = await shiftListing(browser, BEFORE, 'before');
  capture.shift = { after: shA, before: shB };
  const dayCol = shA.listing.headers.indexOf('Study day');
  check('the shift-plot listing gains a Study day column', dayCol >= 0 && !shB.listing.headers.includes('Study day') && shA.listing.rows.length > 0 && /^-?\d+ → -?\d+/.test(shA.listing.rows[0][dayCol]), { after: shA.listing.headers, before: shB.listing.headers, row: shA.listing.rows[0] });
  const ddA = await deltaTooltip(browser, BASE);
  const ddB = await deltaTooltip(browser, BEFORE);
  capture.delta = { after: ddA, before: ddB };
  check('delta-delta’s tooltip shows the study days', ddA.lines.some((l) => /^Study day: -?\d+ → -?\d+$/.test(l)) && !ddB.lines.some((l) => /^Study day/.test(l)), { after: ddA.lines, before: ddB.lines });

  await browser.close();
  fs.writeFileSync(jsonPath, `${JSON.stringify(capture, null, 2)}\n`);
  const failed = Object.entries(capture.checks).filter(([, v]) => !v.pass);
  console.log(`${Object.keys(capture.checks).length - failed.length} of ${Object.keys(capture.checks).length} checks held. Hollow: ${capture.hollow.hollow} of ${capture.hollow.of}.`);
  if (failed.length) process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
