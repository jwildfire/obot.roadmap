// Captures for the safety.viz v1.8.0 release demo page. Run from a safety.viz
// worktree (for its Playwright install and the renamed-column fixture):
//   node capture-v18.mjs <base url ending in /> <out dir>
import { chromium } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const [base, out] = process.argv.slice(2);
mkdirSync(out, { recursive: true });
const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 1.5,
  acceptDownloads: true
});
const shot = async (page, name, clip) => {
  await page.screenshot({ path: path.join(out, `${name}.jpg`), type: 'jpeg', quality: 82, clip });
  console.log('captured', name);
};
const settle = (page, ms = 900) => page.waitForTimeout(ms);
const STUDY = ['labs_final.csv', 'dm.csv', 'ae.csv', 'ecg.json'].map(
  (name) => `tests/e2e/fixtures/app/${name}`
);

// ---- the demo app on the demo study
{
  const page = await context.newPage();
  await page.goto(`${base}demo/index.html?capture=1`);
  await page.evaluate('window.__safetyVizApp.ready');
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate(() => window.__safetyVizApp.select('hep-explorer'));
  await settle(page, 1400);
  await shot(page, 'app-chart');
  await page.evaluate(() =>
    document
      .querySelector('.sva-chart .sv-root')
      .dispatchEvent(new CustomEvent('participantsSelected', { detail: { data: ['CLD-9031'] } }))
  );
  await settle(page, 1400);
  await shot(page, 'app-profile');
  await page.evaluate(() => window.__safetyVizApp.select('ae-timelines'));
  await settle(page);
  await shot(page, 'app-header', { x: 0, y: 0, width: 1440, height: 250 });
  await page.close();
}

// ---- loading a renamed-column study
{
  const page = await context.newPage();
  await page.goto(`${base}demo/index.html?capture=2`);
  await page.evaluate('window.__safetyVizApp.ready');
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate(() => window.__safetyVizApp.select('data'));
  // the Data view as it opens: the sidebar on the pilot demo study
  await settle(page);
  await shot(page, 'data-sidebar');
  // Reset, so the study's own files arrive on an empty view rather than replacing the demo's
  await page.locator('.sva-side [data-action="reset"]').click();
  await page.locator('.sva-file-input').setInputFiles([...STUDY, 'tests/e2e/fixtures/app/site_notes.csv']);
  await page.waitForSelector('.sva-file[data-domain="bds"]');
  await settle(page);
  await shot(page, 'load-placed');
  await page.locator('.sva-file[data-domain="bds"]').scrollIntoViewIfNeeded();
  await page.evaluate(() => {
    const card = document.querySelector('.sva-file[data-domain="bds"]');
    window.scrollTo(0, card.getBoundingClientRect().top + window.scrollY - 110);
  });
  await settle(page, 500);
  await shot(page, 'load-mapping');
  // what a chart says before the mapping is corrected
  await page.locator('.sva-tab[data-domain="bds"]').click();
  await page.locator('.sva-item[data-view="hep-explorer"]').click();
  await settle(page, 500);
  await shot(page, 'load-missing', { x: 0, y: 0, width: 1440, height: 260 });
  // correct the six rows by hand
  await page.locator('.sva-item[data-view="data"]').click();
  for (const [domain, kind, key, value] of [
    ['bds', 'column', 'STNRHI', 'ULN'],
    ['bds', 'column', 'ARM', 'TREATMENT'],
    ['bds', 'measure', 'TB', 'Tot. Bilirubin'],
    ['eg', 'column', 'ARM', 'TREATMENT'],
    ['ae', 'column', 'ARM', 'TREATMENT'],
    ['subject', 'column', 'EOSDY', 'LASTDAY']
  ]) {
    await page.locator(`.sva-file[data-domain="${domain}"] tr[data-${kind}="${key}"] select`).selectOption(value);
  }
  await page.locator('.sva-tab[data-domain="bds"]').click();
  await page.locator('.sva-item[data-view="hep-explorer"]').click();
  await settle(page, 1400);
  await shot(page, 'load-drawn');
  await page.close();
}

// ---- the single file, saved and opened from disk with the network off
{
  const response = await context.request.get(`${base}demo/safety.viz-app.html`);
  const file = path.resolve(out, 'safety.viz-app.html');
  writeFileSync(file, await response.body());
  const offline = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1.5, offline: true });
  const page = await offline.newPage();
  await page.goto(`file://${file}`);
  await settle(page, 600);
  await page.screenshot({ path: path.join(out, 'file-empty.jpg'), type: 'jpeg', quality: 82, clip: { x: 0, y: 0, width: 1440, height: 520 } });
  console.log('captured file-empty', (await response.body()).length, 'bytes');
  await offline.close();
}

// ---- the standard domain set
{
  const page = await context.newPage();
  await page.goto(`${base}domains/index.html`);
  await page.evaluate(() => document.fonts.ready);
  await settle(page);
  await shot(page, 'domains');
  await page.close();
}

// ---- the Patient Journey Explorer
{
  const page = await context.newPage();
  await page.goto(`${base}patient-journey-explorer/index.html`);
  await page.waitForSelector('#container canvas, #container svg, #container .sv-root');
  await settle(page, 2500);
  await page.evaluate(() => {
    const target = document.querySelector('#container');
    window.scrollTo(0, target.getBoundingClientRect().top + window.scrollY - 20);
  });
  await settle(page, 600);
  await shot(page, 'pje');
  await page.close();
}

// ---- three of the nine legacy requests
{
  const page = await context.newPage();
  await page.goto(`${base}shift-plot/index.html`);
  await page.waitForSelector('#container canvas');
  await settle(page, 1200);
  const axis = page.locator('.sv-control', { has: page.locator('label:text-is("Axis Type")') }).locator('select');
  if (await axis.count()) {
    await page.locator('.sv-control', { has: page.locator('label:text-is("Measure")') }).locator('select').selectOption({ label: 'Alkaline Phosphatase (U/L)' }).catch(() => {});
    await axis.selectOption('log');
  }
  await page.evaluate(() => window.scrollTo(0, document.querySelector('#container').getBoundingClientRect().top + window.scrollY - 20));
  await settle(page, 1000);
  await shot(page, 'legacy-shift-log');
  await page.goto(`${base}qt-explorer/index.html`);
  await page.waitForSelector('#container canvas');
  await settle(page, 1500);
  await page.evaluate(() => window.scrollTo(0, document.querySelector('#container').getBoundingClientRect().top + window.scrollY - 20));
  await settle(page, 600);
  await shot(page, 'legacy-qt-table');
  await page.goto(`${base}histogram/index.html`);
  await page.waitForSelector('#container .sv-root');
  await settle(page, 1500);
  await page.evaluate(() => window.scrollTo(0, document.querySelector('#container').getBoundingClientRect().top + window.scrollY - 20));
  await settle(page, 600);
  await shot(page, 'legacy-reset', { x: 0, y: 0, width: 700, height: 760 });
  await page.close();
}

await browser.close();
