// Captures for the safety.viz v1.9.0 demo page: the demo app's Biomarkers tab,
// R started on request with real webR, the single file offline, the Domains
// page, and two stills at 390 px. Run from a safety.viz checkout (for its
// Playwright install and the pilot study's files under site/data/):
//   node capture.mjs <out dir>
// Stills go to <out dir>/media; every number read goes to <out dir>/capture-numbers.json.
// ONLY=1,3 runs some sections and keeps the numbers of the others.
import { chromium } from '@playwright/test';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const BASE = 'https://jwildfire.github.io/safety.viz/dev/';
const [out] = process.argv.slice(2);
const media = path.join(out, 'media');
mkdirSync(media, { recursive: true });
const ONLY = (process.env.ONLY || '1,2,3,4,5').split(',');
const numbersFile = path.join(out, 'capture-numbers.json');
const numbers = existsSync(numbersFile) ? JSON.parse(readFileSync(numbersFile, 'utf8')) : {};
numbers.base = BASE;
(numbers.captured_at ||= {})[process.env.ONLY || 'all'] = new Date().toISOString();
const R_HOSTS = ['webr.r-wasm.org', 'repo.r-wasm.org'];
const PILOT = ['adsl.csv', 'adae.csv', 'adbds.csv', 'adeg.csv'].map((f) => `site/data/${f}`);

const save = () => writeFileSync(numbersFile, JSON.stringify(numbers, null, 2) + '\n');
const browser = await chromium.launch();
const desktop = { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1.5 };
const phone = { viewport: { width: 390, height: 844 }, deviceScaleFactor: 1.5, hasTouch: true, isMobile: true };
const shot = async (target, name, opts = {}) => {
  await target.screenshot({ path: path.join(media, `${name}.jpg`), type: 'jpeg', quality: 80, ...opts });
  console.log('captured', name);
};
const settle = (page, ms = 900) => page.waitForTimeout(ms);
const texts = (page, sel) => page.locator(sel).allInnerTexts();
function meter(context) {
  const m = { bytes: 0, requests: 0, urls: [], reset() { this.bytes = 0; this.requests = 0; this.urls = []; } };
  context.on('request', (r) => { try { if (R_HOSTS.includes(new URL(r.url()).hostname)) m.urls.push(r.url()); } catch {} });
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
const versionText = (page) =>
  page.evaluate(() => {
    const hit = [...document.querySelectorAll('body *')].filter((e) => e.children.length === 0 && /\b1\.\d+\.\d+\b/.test(e.textContent));
    return hit.map((e) => e.textContent.trim()).slice(0, 5);
  });
const biomarkerSelect = (page) =>
  page.locator('.sva-chart .sv-control', { has: page.locator('label:text-is("Biomarker")') }).locator('select');
const openApp = async (page) => {
  await page.goto(`${BASE}demo/`);
  await page.evaluate('window.__safetyVizApp.ready');
  await page.evaluate(() => document.fonts.ready);
};
const waitTested = (page) =>
  page.waitForFunction(
    () => {
      const lines = [...document.querySelectorAll('.sva-chart .bv-statistic')].map((e) => e.innerText);
      return lines.some((t) => /p [<=]/.test(t)) && !lines.some((t) => /waiting|starting/i.test(t));
    },
    null,
    { timeout: 200000 }
  );

if (ONLY.includes('1')) {
  // ---- the Biomarkers tab, a chart before the press, the press, and R's test after it
  const context = await browser.newContext(desktop);
  const m = meter(context);
  const page = await context.newPage();
  await openApp(page);
  numbers.tabs = await page.locator('.sva-tab').evaluateAll((tabs) => tabs.map((t) => t.innerText.replace(/\s+/g, ' ').trim()));
  numbers.version_on_app = await versionText(page);
  await page.locator('.sva-tab[data-domain="biomarkers"]').click();
  await settle(page, 1800);
  numbers.biomarker_items = await page.locator('.sva-item').evaluateAll((items) =>
    items.filter((i) => ['group-comparison', 'association-scatter', 'correlation-matrix', 'biomarker-screen'].includes(i.dataset.view)).map((i) => i.innerText.replace(/\s+/g, ' ').trim())
  );
  numbers.action_idle = { label: await page.locator('.sva-action').textContent(), title: await page.locator('.sva-action').getAttribute('title') };
  numbers.overview_count = await page.locator('.sva-chart .bv-overview-count').first().innerText().catch(() => null);
  await shot(page, 'bio-tab');
  // a biomarker chosen before the press: its lines say statistics need R
  await biomarkerSelect(page).selectOption({ label: 'Alanine Aminotransferase' });
  await settle(page, 1500);
  numbers.need_r_lines = [...new Set((await texts(page, '.sva-chart .bv-statistic')).filter((s) => s.trim()))];
  numbers.r_requests_before_press = m.urls.length;
  await page.evaluate(() => {
    const el = document.querySelector('.sva-chart .bv-panel');
    window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 140, behavior: 'instant' });
  });
  await settle(page, 400);
  await shot(page, 'bio-need-r');
  // the press
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  m.reset();
  const t0 = Date.now();
  await page.locator('.sva-action').click();
  await page.waitForFunction(() => /Starting R/.test(document.querySelector('.sva-action').textContent), null, { timeout: 5000 }).catch(() => {});
  numbers.action_starting = { label: await page.locator('.sva-action').textContent(), title: await page.locator('.sva-action').getAttribute('title') };
  await shot(page, 'bio-starting', { clip: { x: 0, y: 0, width: 1440, height: 300 } });
  await page.waitForFunction(() => /R started/.test(document.querySelector('.sva-action').textContent), null, { timeout: 200000 });
  numbers.r_started_seconds = (Date.now() - t0) / 1000;
  numbers.action_running = { label: await page.locator('.sva-action').textContent(), title: await page.locator('.sva-action').getAttribute('title') };
  await waitTested(page);
  await settle(page, 1500);
  numbers.r_megabytes = Number((m.bytes / 1e6).toFixed(2));
  numbers.r_requests = m.requests;
  numbers.r_hosts = [...new Set(m.urls.map((u) => new URL(u).hostname))];
  await shot(page, 'bio-started', { clip: { x: 0, y: 0, width: 1440, height: 300 } });
  const panels = await page.locator('.sva-chart .bv-panel').evaluateAll((ps) =>
    ps.map((p) => ({ visit: p.querySelector('h3')?.innerText, line: p.querySelector('.bv-statistic')?.innerText || '' }))
  );
  numbers.r_test_panels = panels;
  // scroll to the first panel with a test
  await page.evaluate(() => {
    // the scheduled visits' row that holds Week 4
    const p = [...document.querySelectorAll('.sva-chart .bv-panel')].find((p) => p.querySelector('h3')?.textContent === 'Week 4');
    window.scrollTo({ top: p.getBoundingClientRect().top + window.scrollY - 140, behavior: 'instant' });
  });
  await settle(page, 600);
  await shot(page, 'bio-r-test');
  // another biomarker chart on the same R: the biomarker screen
  await page.locator('.sva-item[data-view="biomarker-screen"]').click();
  await page.waitForSelector('.sva-chart .bv-screen-row[data-status="shown"]', { timeout: 200000 });
  await settle(page, 1500);
  numbers.screen = {
    title: await page.locator('.sva-chart .bv-screen-title').innerText().catch(() => null),
    rows: (await texts(page, '.sva-chart .bv-screen-row')).slice(0, 3),
    caption: await page.locator('.sva-chart .bv-screen-caption').innerText().catch(() => null),
    r_requests_total_after: m.requests
  };
  await page.evaluate(() => {
    const el = document.querySelector('.sva-chart .bv-screen');
    window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 140, behavior: 'instant' });
  });
  await settle(page, 400);
  await shot(page, 'bio-screen');
  await context.close();
  save();
}

if (ONLY.includes('2')) {
  // ---- the single file, opened from disk with the network off, the pilot study dropped on it
  const context = await browser.newContext(desktop);
  const response = await context.request.get(`${BASE}demo/safety.viz-app.html`);
  const body = await response.body();
  const file = path.resolve(out, 'safety.viz-app.html');
  writeFileSync(file, body);
  numbers.single_file_bytes = body.length;
  await context.close();
  const offline = await browser.newContext({ ...desktop, offline: true });
  const requests = [];
  offline.on('request', (r) => { if (/^https?:/.test(r.url())) requests.push(r.url()); });
  const page = await offline.newPage();
  await page.goto(`file://${file}`);
  await page.evaluate('window.__safetyVizApp.ready');
  await page.locator('.sva-file-input').setInputFiles(PILOT);
  await page.waitForSelector('.sva-file[data-domain="bds"]');
  await settle(page, 1000);
  numbers.single_file_tabs = await page.locator('.sva-tab').evaluateAll((tabs) => tabs.map((t) => t.innerText.replace(/\s+/g, ' ').trim()));
  await page.locator('.sva-tab[data-domain="biomarkers"]').click();
  await settle(page, 1500);
  numbers.single_file_action = await page.locator('.sva-action').count();
  await shot(page, 'file-header', { clip: { x: 0, y: 0, width: 1440, height: 300 } });
  await biomarkerSelect(page).selectOption({ label: 'Alanine Aminotransferase' });
  await settle(page, 1500);
  numbers.single_file_lines = [...new Set((await texts(page, '.sva-chart .bv-statistic')).filter((s) => s.trim()))];
  await page.evaluate(() => {
    const el = document.querySelector('.sva-chart .bv-panel');
    window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 140, behavior: 'instant' });
  });
  await settle(page, 400);
  await shot(page, 'file-offline');
  numbers.single_file_requests = requests;
  await offline.close();
  save();
}

if (ONLY.includes('3')) {
  // ---- the Domains page, at the biomarker charts
  const context = await browser.newContext(desktop);
  const page = await context.newPage();
  await page.goto(`${BASE}domains/index.html`);
  await page.evaluate(() => document.fonts.ready);
  await settle(page, 1200);
  numbers.version_on_domains = await versionText(page);
  numbers.domains_summary = await page.evaluate(() => document.body.innerText.match(/CHARTS\n[^\n]+/)?.[0] || null);
  numbers.domains_biomarker_mentions = await page.locator('body').evaluate((b) => (b.innerText.match(/Group comparison|Association scatter|Correlation matrix|Biomarker screen/g) || []).length);
  await shot(page, 'domains-top');
  // the section listing the second library's charts
  numbers.domains_biomarker_section = await page.evaluate(() => {
    const p = [...document.querySelectorAll('p')].find((e) => /carries beside these/.test(e.textContent));
    const head = p.previousElementSibling;
    window.scrollTo({ top: (head || p).getBoundingClientRect().top + window.scrollY - 40, behavior: 'instant' });
    return { heading: head ? head.textContent.trim() : null, text: p.textContent.trim() };
  });
  await settle(page, 400);
  await shot(page, 'domains-bio');
  await context.close();
  save();
}

if (ONLY.includes('4')) {
  // ---- at 390 px: the Biomarkers tab with Start R, and R's test after the press
  const context = await browser.newContext(phone);
  const page = await context.newPage();
  await openApp(page);
  await page.locator('.sva-tab[data-domain="biomarkers"]').scrollIntoViewIfNeeded();
  await page.locator('.sva-tab[data-domain="biomarkers"]').click();
  await settle(page, 1800);
  // At phone width the controls start folded: open them to choose, then fold them again.
  const toggle = page.locator('.sva-chart .sv-sidebar-toggle').first();
  const folded = !(await biomarkerSelect(page).isVisible());
  if (folded) await toggle.click();
  await biomarkerSelect(page).selectOption({ label: 'Alanine Aminotransferase' });
  await settle(page, 1200);
  if (folded) await toggle.click();
  await settle(page, 600);
  numbers.phone_need_r_scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  await settle(page, 400);
  await shot(page, 'phone-tab');
  await page.locator('.sva-action').click();
  await page.waitForFunction(() => /R started/.test(document.querySelector('.sva-action').textContent), null, { timeout: 200000 });
  await waitTested(page);
  await settle(page, 1500);
  numbers.phone_r_scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
  await page.evaluate(() => {
    const p = [...document.querySelectorAll('.sva-chart .bv-panel')].find((p) => /p [<=]/.test(p.innerText));
    window.scrollTo({ top: p.getBoundingClientRect().top + window.scrollY - 8, behavior: 'instant' });
  });
  await settle(page, 400);
  await shot(page, 'phone-r-test');
  await context.close();
  save();
}

if (ONLY.includes('5')) {
  // ---- the kit's reference page
  const context = await browser.newContext(desktop);
  const page = await context.newPage();
  await page.goto(`${BASE}kit/index.html`);
  await page.evaluate(() => document.fonts.ready);
  await settle(page, 800);
  numbers.kit_page = await page.evaluate(() => ({
    title: document.title,
    members: document.querySelectorAll('h3 code, h3[id], dt code').length,
    text: document.body.innerText.slice(0, 1500)
  }));
  numbers.kit_bundle = await page.evaluate(() => (window.SafetyViz && window.SafetyViz.kit ? Object.keys(window.SafetyViz.kit).length : null));
  await shot(page, 'kit');
  await context.close();
  save();
}

writeFileSync(numbersFile, JSON.stringify(numbers, null, 2) + '\n');
await browser.close();
console.log('done');
