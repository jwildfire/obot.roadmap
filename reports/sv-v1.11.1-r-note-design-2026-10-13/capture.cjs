const fs = require('fs');
const { chromium } = require('/Users/jwildfire/Documents/obot2/safety.viz/node_modules/playwright');
const out = process.argv[2];
const only = process.argv[3] ? process.argv[3].split(',') : null;
const BASE = 'https://jwildfire.github.io/safety.viz/demo/';
const CSS = fs.readFileSync(__dirname + '/note.css', 'utf8');
const rects = fs.existsSync(out + '/rects.json') ? JSON.parse(fs.readFileSync(out + '/rects.json', 'utf8')) : {};
const said = {};

// Runs in the page: the proposed note, and the recolour.
const inPage = `
window.__mk = (() => {
  const I = '<svg class="sva-callout-mark" viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="6.4" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M8 7.3v3.9" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/><circle cx="8" cy="4.9" r="1" fill="currentColor"/></svg>';
  const W = '<svg class="sva-callout-mark" viewBox="0 0 16 16" aria-hidden="true"><path d="M8 2l6.4 11.2H1.6z" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><path d="M8 6.4v3.3" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/><circle cx="8" cy="11.4" r=".95" fill="currentColor"/></svg>';
  const SPIN = '<span class="sva-spin" aria-hidden="true"></span>';
  const note = (kind, html, { spin = false, close = false } = {}) => {
    const d = document.createElement('div');
    d.className = 'sva-callout ' + (kind === 'warning' ? 'sva-warning' : 'sva-info');
    d.dataset.mk = 'note';
    d.innerHTML = (spin ? SPIN : kind === 'warning' ? W : I) + '<p>' + html + '</p>' + (close ? '<button class="sva-close" type="button">×</button>' : '');
    return d;
  };
  return {
    css(text) { const s = document.createElement('style'); s.textContent = text; document.head.append(s); },
    blue() {
      const w = document.querySelector('.sva-welcome');
      if (w && !w.hidden && !w.querySelector('.sva-callout-mark')) { w.classList.add('sva-callout', 'sva-info'); w.style.alignItems = 'center'; w.style.fontSize = '.86rem'; w.style.padding = '.5rem .5rem .5rem .8rem'; w.insertAdjacentHTML('afterbegin', I); w.querySelector('.sva-callout-mark').style.marginTop = '0'; }
      for (const m of document.querySelectorAll('p.sva-message:not(.sva-problem):not(.sva-busy)')) {
        const d = note('info', m.innerHTML); d.style.maxWidth = '62rem'; d.dataset.mk = 'message'; m.replaceWith(d);
      }
    },
    top(kind, html, opts) { const card = document.querySelector('.sva-content .sva-chart'); const d = note(kind, html, opts); card.prepend(d); return d; },
    swap(selector, kind, html, opts) { const el = document.querySelector(selector); const d = note(kind, html, opts); el.replaceWith(d); return d; },
    say(selector, text) { const el = document.querySelector(selector); if (el) el.textContent = text; },
    rects(map) { const o = {}; for (const [k, sel] of Object.entries(map)) { const e = document.querySelector(sel); if (e) { const r = e.getBoundingClientRect(); o[k] = [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)]; } } return o; }
  };
})();`;

const WHERE = { note: '[data-mk=note]', button: '[data-mk=note] .sva-action', welcome: '.sva-welcome', control: '.sva-r', stat: '.bv-stat-result', message: '[data-mk=message]', close: '[data-mk=note] .sva-close' };

const BIO = 'about 13 MB, downloaded once. The study’s data stays in this browser.';
const RBQM = 'about 55 MB, downloaded once. The study’s data stays in this browser.';
const N = {
  infoOff: `This chart’s p-values need R. <button class="sva-action" type="button">Start R</button> to add them: ${BIO}`,
  warnOff: `This chart cannot be drawn without R. <button class="sva-action" type="button">Start R</button> to draw it: ${BIO}`,
  rbqmOff: `The site metrics cannot be worked out without R. <button class="sva-action" type="button">Start R</button> to run them: ${RBQM}`,
  infoStarting: 'R is starting. The p-values appear under the chart when it is ready. <span class="sva-callout-meta">13 MB · 4 s</span>',
  rbqmStarting: 'R is starting. The metrics run by themselves when it is ready. <span class="sva-callout-meta">Step 1 of 6 · 4 s</span>',
  infoFailed: 'R did not start, so this chart has no p-values. <button class="sva-action" type="button">Try again</button> The reason is behind Why, at the top right.',
  rbqmFailed: 'R did not start, so no metric was run. <button class="sva-action" type="button">Try again</button> The reason is behind Why, at the top right.'
};

(async () => {
  const browser = await chromium.launch();
  const fresh = async (hash, { block = null, delay = null } = {}) => {
    const context = await browser.newContext({ viewport: { width: 1280, height: 820 }, deviceScaleFactor: 1.5 });
    const page = await context.newPage();
    const hosts = /(webr|repo)\.r-wasm\.org|\/r-wasm\//;
    if (block) await page.route(hosts, (route) => route.abort());
    if (delay) await page.route(hosts, async (route) => { await new Promise((r) => setTimeout(r, delay)); route.continue().catch(() => {}); });
    await page.goto(BASE + '#' + hash, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1200);
    await page.evaluate(inPage);
    return { page, context };
  };
  const shot = async (page, name, where = WHERE) => {
    await page.waitForTimeout(250);
    await page.screenshot({ path: `${out}/${name}.jpg`, type: 'jpeg', quality: 76 });
    rects[name] = await page.evaluate((map) => window.__mk.rects(map), where);
    said[name] = await page.evaluate(() => [...document.querySelectorAll('.bv-stat-result,.sva-rbqm-need,.sva-r,.bv-foot-line,.sva-message')].map((e) => e.className + ' :: ' + e.textContent.trim().slice(0, 260)));
    console.log('shot', name);
  };
  const propose = (page) => page.evaluate((css) => { window.__mk.css(css); window.__mk.blue(); }, CSS);
  const want = (id) => !only || only.includes(id);

  // Biomarker charts, before R.
  const before = [
    ['scatter', 'association-scatter', 'info', N.infoOff],
    ['group', 'group-comparison', 'info', N.infoOff],
    ['crosstab', 'cross-tab', 'info', N.infoOff],
    ['screen', 'biomarker-screen', 'warning', N.warnOff],
    ['matrix', 'correlation-matrix', 'warning', N.warnOff]
  ];
  for (const [id, hash, kind, html] of before) {
    if (!want(id)) continue;
    const { page, context } = await fresh(hash);
    await shot(page, `today-${id}-before`);
    await propose(page);
    await page.evaluate(([k, h]) => { window.__mk.top(k, h, { close: k !== 'warning' }); window.__mk.say('.bv-stat-result', 'Statistics need R. Start R, in the note above.'); }, [kind, html]);
    await shot(page, `new-${id}-before`);
    if (id === 'scatter') {
      // Option: the control at the top right hidden until R is started.
      await page.evaluate(() => window.__mk.css('.sva-r{display:none!important}'));
      await shot(page, 'optb-scatter-before');
    }
    await context.close();
    if (id === 'scatter') {
      // Option: the note where the statistics will appear.
      const again = await fresh(hash);
      await propose(again.page);
      await again.page.evaluate((h) => window.__mk.swap('.bv-stat-result', 'info', h, { close: false }), html);
      await shot(again.page, 'optc-scatter-before');
      await again.context.close();
    }
  }

  if (want('scatter-starting')) {
    const { page, context } = await fresh('association-scatter', { delay: 20000 });
    await page.click('.sva-r .sva-action');
    await page.waitForTimeout(4200);
    await shot(page, 'today-scatter-starting');
    await propose(page);
    await page.evaluate((h) => { window.__mk.top('info', h, { spin: true }); }, N.infoStarting);
    await shot(page, 'new-scatter-starting');
    await context.close();
  }
  if (want('scatter-ready')) {
    const { page, context } = await fresh('association-scatter');
    await page.click('.sva-r .sva-action');
    await page.waitForSelector('.sva-r[data-phase=ready]', { timeout: 150000 });
    await page.waitForTimeout(6000);
    await shot(page, 'today-scatter-ready');
    await propose(page);
    await shot(page, 'new-scatter-ready');
    await context.close();
  }
  if (want('scatter-failed')) {
    const { page, context } = await fresh('association-scatter', { block: true });
    await page.click('.sva-r .sva-action');
    await page.waitForSelector('.sva-r[data-phase=failed]', { timeout: 60000 });
    await page.waitForTimeout(800);
    await shot(page, 'today-scatter-failed');
    await propose(page);
    await page.evaluate((h) => { window.__mk.top('warning', h); window.__mk.say('.bv-stat-result', 'R did not start, so there is no test. Try again, in the note above.'); }, N.infoFailed);
    await shot(page, 'new-scatter-failed');
    await context.close();
  }

  if (want('rbqm')) {
    const { page, context } = await fresh('rbqm');
    await shot(page, 'today-rbqm-before');
    await propose(page);
    await page.evaluate((h) => window.__mk.swap('p.sva-rbqm-need', 'warning', h), N.rbqmOff);
    await shot(page, 'new-rbqm-before');
    await context.close();
  }
  if (want('rbqm-starting')) {
    const { page, context } = await fresh('rbqm', { delay: 20000 });
    await page.click('.sva-r .sva-action');
    await page.waitForTimeout(4200);
    await shot(page, 'today-rbqm-starting');
    await propose(page);
    await page.evaluate((h) => window.__mk.swap('p.sva-rbqm-need', 'info', h, { spin: true }), N.rbqmStarting);
    await shot(page, 'new-rbqm-starting');
    await context.close();
  }
  if (want('rbqm-failed')) {
    const { page, context } = await fresh('rbqm', { block: true });
    await page.click('.sva-r .sva-action');
    await page.waitForSelector('.sva-r[data-phase=failed]', { timeout: 90000 });
    await page.waitForTimeout(800);
    await shot(page, 'today-rbqm-failed');
    await propose(page);
    await page.evaluate((h) => window.__mk.swap('p.sva-rbqm-need', 'warning', h), N.rbqmFailed);
    await shot(page, 'new-rbqm-failed');
    await context.close();
  }
  if (want('rbqm-done')) {
    const { page, context } = await fresh('rbqm');
    await page.click('.sva-r .sva-action');
    await page.waitForSelector('.sva-r[data-phase=ready]', { timeout: 400000 });
    await page.waitForFunction(() => !document.querySelector('.sva-rbqm-need') && !document.querySelector('.sva-r-steps, .sva-rbqm-steps'), null, { timeout: 400000 }).catch(() => {});
    await page.waitForTimeout(5000);
    await shot(page, 'today-rbqm-done');
    await propose(page);
    await shot(page, 'new-rbqm-done');
    await context.close();
  }
  if (want('profile')) {
    const { page, context } = await fresh('participant-profile');
    await shot(page, 'today-profile');
    await propose(page);
    await shot(page, 'new-profile');
    await context.close();
  }
  fs.writeFileSync(out + '/rects.json', JSON.stringify(rects, null, 1));
  fs.writeFileSync(out + '/said-' + Date.now() + '.json', JSON.stringify(said, null, 1));
  console.log(JSON.stringify(said, null, 1));
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
