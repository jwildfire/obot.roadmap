// Stills for the overview count-label options page. Each option is drawn on
// the live dev site's all-measures overview (safety.viz dev, the v1.11.3
// release candidate), by changing the running charts in the page: nothing
// here is built into safety.viz. Option A is the page as it is.
//
//   node capture.cjs [out dir]        default: the folder this file is in
//
// Run with a safety.viz checkout's Playwright on the module path. Stills go to
// <out dir>/media; marker positions (percent of each still) go to capture.json.
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require(
  require.resolve('playwright', { paths: [process.cwd(), '/Users/jwildfire/Documents/obot2/safety.viz'] })
);

const SITE = process.env.BASE || 'https://jwildfire.github.io/safety.viz/dev/histogram/';
const out = process.argv[2] || __dirname;
const media = path.join(out, 'media');
fs.mkdirSync(media, { recursive: true });

const OPTIONS = ['a', 'b', 'c', 'd', 'e'];
const VIEWPORTS = { desk: { width: 1280, height: 900 }, phone: { width: 390, height: 844 } };

/** Change the running overview to show one option; return marker boxes (page coords). */
function apply(option) {
  const inst = window.__safetyHistogramInstance;
  const charts = inst.charts.filter((c) => c.canvas.closest('.sv-overview-panel'));
  const marks = {};
  const box = (el) => {
    const r = el.getBoundingClientRect();
    return { x: r.x + scrollX, y: r.y + scrollY, width: r.width, height: r.height };
  };
  const canvasBox = (chart, x, y, w, h) => {
    const r = chart.canvas.getBoundingClientRect();
    return { x: r.x + scrollX + x, y: r.y + scrollY + y, width: w, height: h };
  };
  if (option === 'a') {
    const c = charts[0];
    const s = c.scales.y;
    marks.label = canvasBox(c, s.left + 8, c.chartArea.top - 6, 0, 0);
    return marks;
  }
  const hash = option === 'b' || option === 'e';
  const hover = option === 'c' || option === 'e';
  charts.forEach((c) => {
    c.options.scales.y.title.display = false;
    if (hash) c.options.layout.padding = { top: 16 };
    c.update('none');
  });
  if (hash) {
    charts.forEach((c, i) => {
      const wrap = c.canvas.parentElement;
      wrap.style.position = 'relative';
      const s = c.scales.y;
      const tag = document.createElement('span');
      tag.textContent = '#';
      tag.title = 'Number of results in each bar';
      tag.style.cssText =
        `position:absolute;left:${s.left}px;width:${s.width - 8}px;top:${c.chartArea.top - 17}px;` +
        'text-align:right;font:600 12px/1 system-ui,sans-serif;color:#666;pointer-events:none';
      wrap.append(tag);
      if (i === 0) {
        const b = box(tag);
        marks.label = { x: b.x + b.width + 26, y: b.y + b.height / 2, width: 0, height: 0 };
      }
    });
  }
  if (option === 'd') {
    const note = document.querySelector('.sv-footnote');
    note.textContent = 'Each bar counts results in its range of values. Click a chart to view that measure.';
    marks.label = box(note);
  }
  if (hover && innerWidth > 600) {
    const c = charts[0];
    const data = c.data.datasets[0].data;
    const i = data.indexOf(Math.max(...data));
    const tip = c.config.options.plugins.tooltip;
    tip.enabled = true;
    tip.displayColors = false;
    tip.callbacks = {
      title: (items) => {
        const b = c.$shBins[items[0].dataIndex];
        return `${Math.round(b.lower)}–${Math.round(b.upper)} U/L`;
      },
      label: (item) => `${item.raw} results`
    };
    c.update('none');
    const bar = c.getDatasetMeta(0).data[i];
    c.tooltip.setActiveElements([{ datasetIndex: 0, index: i }], { x: bar.x, y: bar.y });
    c.setActiveElements([{ datasetIndex: 0, index: i }]);
    c.update('none');
    marks.tip = canvasBox(c, bar.x + 84, bar.y + 22, 0, 0);
    marks.bins = { count: data[i], lower: c.$shBins[i].lower, upper: c.$shBins[i].upper };
  }
  return marks;
}

(async () => {
  const browser = await chromium.launch();
  const result = { site: SITE, taken: new Date().toISOString(), stills: {} };
  for (const [vp, size] of Object.entries(VIEWPORTS)) {
    for (const option of OPTIONS) {
      const page = await browser.newPage({ viewport: size, deviceScaleFactor: 2 });
      await page.goto(SITE, { waitUntil: 'networkidle' });
      await page.waitForSelector('.sv-overview-panel canvas');
      await page.waitForTimeout(600);
      const marks = await page.evaluate(apply, option);
      await page.waitForTimeout(300);
      const panels = await page.$$eval('.sv-overview-panel', (els) =>
        els.slice(0, 8).map((el) => {
          const r = el.getBoundingClientRect();
          return { x: r.x + scrollX, y: r.y + scrollY, width: r.width, height: r.height };
        })
      );
      const take = vp === 'desk' ? panels.slice(0, 6) : panels.slice(0, 1);
      let top = Math.min(...take.map((p) => p.y));
      const foot = await page.$eval('.sv-footnote', (el) => el.getBoundingClientRect().y + scrollY);
      top = Math.min(top, foot);
      const left = Math.min(...take.map((p) => p.x));
      const right = Math.max(...take.map((p) => p.x + p.width));
      const bottom = Math.max(...take.map((p) => p.y + p.height));
      const clip = { x: Math.max(0, left - 8), y: Math.max(0, top - 8), width: right - left + 16, height: bottom - top + 16 };
      clip.width = Math.min(clip.width, size.width - clip.x);
      const file = `${option}-${vp}.jpg`;
      await page.screenshot({ path: path.join(media, file), clip, fullPage: true, type: 'jpeg', quality: 86 });
      const pct = (b) =>
        b && {
          x: +(((b.x + b.width / 2 - clip.x) / clip.width) * 100).toFixed(1),
          y: +(((b.y + b.height / 2 - clip.y) / clip.height) * 100).toFixed(1)
        };
      result.stills[file] = {
        width: Math.round(clip.width),
        height: Math.round(clip.height),
        label: pct(marks.label),
        tip: pct(marks.tip),
        bin: marks.bins || null
      };
      console.log(file, JSON.stringify(result.stills[file]));
      await page.close();
    }
  }
  fs.writeFileSync(path.join(out, 'capture.json'), JSON.stringify(result, null, 2) + '\n');
  await browser.close();
})();
