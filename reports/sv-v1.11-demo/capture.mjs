// Captures and checks for the safety.viz v1.11.0 demo page: the demo app's
// first screen, its status labels, the R control, the RBQM tab and the Data
// tab, walked with real R in the browser on the dev site; the same pages on
// the released site, which is release 1.10, for the "before" of each pair; and
// the defects from the review of release 1.10.
//
//   node capture.mjs <out dir>
//
// Run from the root of an `npm ci` checkout of safety.viz (for its Playwright
// and the RBQM study's raw files). Stills go to <out dir>/media. Everything
// read from the live pages goes to <out dir>/capture-numbers.json, with a
// check of each thing the demo page says against what the live page shows.
// The script exits 1 when a check fails. Then `node build.mjs` writes
// index.html from capture-numbers.json.
//
//   BASE=<the site under review>     default: the dev site
//   BEFORE=<the site before it>      default: the released site
//   ONLY=1,2,3,4,5,6,7   1 the first screen, 2 the status labels, 3 the R
//                        control, 4 the RBQM tab, 5 the Data tab, 6 the
//                        defects, 7 what GitHub says (no browser)
//
// Once release 1.11 is on the released site there is no "before" to capture:
// the script sees the status label there, says so, and keeps the stills and
// numbers of release 1.10 it already has.
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const { chromium } = createRequire(path.resolve('package.json'))('playwright');

const BASE = process.env.BASE || 'https://jwildfire.github.io/safety.viz/dev/';
const BEFORE = process.env.BEFORE || 'https://jwildfire.github.io/safety.viz/';
const [out] = process.argv.slice(2);
if (!out) throw new Error('Usage: node capture.mjs <out dir>');
const media = path.join(out, 'media');
mkdirSync(media, { recursive: true });
const ONLY = (process.env.ONLY || '1,2,3,4,5,6,7').split(',');
const numbersFile = path.join(out, 'capture-numbers.json');
const numbers = existsSync(numbersFile) ? JSON.parse(readFileSync(numbersFile, 'utf8')) : {};
// A run of every section starts its record of checks again, so that a check
// that was renamed or dropped does not stay behind. A run of some sections
// keeps the others' numbers and checks.
if (!process.env.ONLY) {
  numbers.checks = {};
  numbers.captured_at = {};
  for (const key of ['marks', 'stills'])
    numbers[key] = Object.fromEntries(Object.entries(numbers[key] || {}).filter(([name]) => /-110$/.test(name)));
}
numbers.base = BASE;
numbers.before = BEFORE;
(numbers.captured_at ||= {})[process.env.ONLY || 'all'] = new Date().toISOString();
const save = () => writeFileSync(numbersFile, `${JSON.stringify(numbers, null, 2)}\n`);

// What the demo page says, held to what the live page shows.
const checks = (numbers.checks ||= {});
const check = (name, actual, expected) => {
  const pass =
    expected instanceof RegExp
      ? expected.test(String(actual))
      : JSON.stringify(actual) === JSON.stringify(expected);
  checks[name] = pass ? { pass } : { pass, actual, expected: String(expected) };
  console.log(pass ? 'held  ' : 'FAILED', name);
  if (!pass) console.error('       ', JSON.stringify(actual), '!=', String(expected));
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
const settle = (page, ms = 900) => page.waitForTimeout(ms);
const squash = (text) => (text || '').replace(/\s+/g, ' ').trim();
const text = async (page, selector) => squash(await page.locator(selector).first().textContent());
const texts = (page, selector) =>
  page.locator(selector).evaluateAll((all) => all.map((node) => node.textContent.replace(/\s+/g, ' ').trim()));
const top = (page) => page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
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

// A still, and where on it each numbered marker of the demo page sits: a
// percentage of the still's width and height, read from the element's own box.
const marks = (numbers.marks ||= {});
const sizes = (numbers.stills ||= {});
const shot = async (page, name, { clip, mark = [], ...rest } = {}) => {
  const view = clip || { x: 0, y: 0, ...page.viewportSize() };
  const placed = [];
  for (const [n, selector, anchor = 'l'] of mark) {
    const box = await page.locator(selector).first().boundingBox();
    if (!box) {
      check(`still ${name}: marker ${n} has its element`, selector, 'an element on the page');
      continue;
    }
    const gap = 20;
    // 'h' is under a thing in the header's top row: on the line between that row and the chart names.
    const [x, y] = {
      h: [box.x + box.width / 2, 53],
      // 'rn' is just right of a thing, where what follows it is close.
      rn: [box.x + box.width + 14, box.y + box.height / 2],
      l: [box.x - gap, box.y + box.height / 2],
      r: [box.x + box.width + gap, box.y + box.height / 2],
      t: [box.x + box.width / 2, box.y - gap],
      b: [box.x + box.width / 2, box.y + box.height + gap],
      tl: [box.x - gap / 2, box.y - gap / 2],
      bl: [box.x + gap, box.y + box.height + gap]
    }[anchor];
    const pct = (value, of) => Math.min(98, Math.max(2, Math.round((value / of) * 1000) / 10));
    placed.push({ n, x: pct(x - view.x, view.width), y: pct(y - view.y, view.height) });
  }
  marks[name] = placed;
  await page.screenshot({
    path: path.join(media, `${name}.jpg`),
    type: 'jpeg',
    quality: 76,
    ...(clip ? { clip } : {}),
    ...rest
  });
  const scale = page.viewportSize().width < 500 ? phone.deviceScaleFactor : desktop.deviceScaleFactor;
  sizes[name] = { width: Math.round(view.width * scale), height: Math.round(view.height * scale) };
  console.log('captured', name);
};
// The box around some elements, padded and kept inside the viewport, for a still of one part of a page.
const around = async (page, selectors, pad = 16) => {
  const boxes = [];
  for (const selector of selectors) {
    const box = await page.locator(selector).first().boundingBox();
    if (box) boxes.push(box);
  }
  const { width, height } = page.viewportSize();
  const x0 = Math.max(0, Math.min(...boxes.map((box) => box.x)) - pad);
  const y0 = Math.max(0, Math.min(...boxes.map((box) => box.y)) - pad);
  const x1 = Math.min(width, Math.max(...boxes.map((box) => box.x + box.width)) + pad);
  const y1 = Math.min(height, Math.max(...boxes.map((box) => box.y + box.height)) + pad);
  return { x: Math.round(x0), y: Math.round(y0), width: Math.round(x1 - x0), height: Math.round(y1 - y0) };
};

const openApp = async (page, hash = '', base = BASE) => {
  await page.goto(`${base}demo/${hash}`);
  await page.evaluate('window.__safetyVizApp.ready');
  await page.evaluate(() => document.fonts.ready);
  await settle(page, 1200);
};
// The released site, while it is still release 1.10: it has no status label in its header.
const openBefore = async (page, hash = '') => {
  await openApp(page, hash, BEFORE);
  const is110 = (await page.locator('.sva-appstatus').count()) === 0;
  if (!is110) console.log(`${BEFORE} is no longer release 1.10: its stills and numbers are kept as they are.`);
  return is110;
};
// The welcome line, closed when it is showing, so a still shows the page beneath it.
const closeWelcome = async (page) => {
  const close = page.locator('.sva-welcome .sva-close');
  if ((await close.count()) && (await close.isVisible())) await close.click();
};
const go = async (page, view) => {
  await page.evaluate((id) => {
    window.location.hash = `#${id}`;
  }, view);
  await settle(page, 900);
};
const tabsOf = (page) =>
  page.locator('.sva-tab').evaluateAll((all) =>
    all.map((tab) => ({
      name: tab.querySelector('.sva-tab-title').textContent.trim(),
      count: tab.querySelector('.sva-tab-count').textContent.trim(),
      hex: getComputedStyle(tab.querySelector('.sva-hex')).backgroundColor
    }))
  );
const sideways = (page) => page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
const laidOut = (page) => page.evaluate(() => document.documentElement.scrollWidth);
const rbqmTab = (page) => page.locator('.sva-tab[data-tab="rbqm"]');
const control = '.sva-charts > .sva-r';
const controlSays = (page) =>
  page.locator(control).evaluate((node) => ({
    phase: node.dataset.phase,
    say: node.querySelector('.sva-r-say')?.textContent.trim() ?? null,
    meta: node.querySelector('.sva-r-meta')?.textContent.trim() ?? null,
    button: node.querySelector('.sva-action')?.textContent.trim() ?? null,
    chip: node.querySelector('.sva-chip')?.childNodes
      ? [...node.querySelector('.sva-chip').childNodes]
          .filter((child) => child.nodeType === 3)
          .map((child) => child.textContent.trim())
          .join('')
      : null,
    hover: node.querySelector('.sva-r-row')?.title || null
  }));
const outcome = (page) => text(page, '.sva-rbqm-status');
const waitRan = (page, pattern) =>
  page.waitForFunction(
    (source) => new RegExp(source).test(document.querySelector('.sva-rbqm-status')?.textContent || ''),
    pattern.source,
    { timeout: 420000 }
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
const rowOf = (page) =>
  page
    .locator('.sva-view-items .sva-view-item')
    .evaluateAll((all) => all.map((item) => item.getAttribute('aria-label') || item.textContent.trim()));
const overview = (page) =>
  page.evaluate(() => {
    const table = document.querySelector('.sva-rbqm-table table.group-overview');
    const card = document.querySelector('.sva-content');
    const box = document.querySelector('.sva-rbqm-table');
    const rows = [...table.querySelectorAll('tbody tr')];
    const boxTop = box.getBoundingClientRect().top;
    const boxBottom = box.getBoundingClientRect().bottom;
    const whole = rows.filter((row) => {
      const rect = row.getBoundingClientRect();
      return rect.top >= boxTop - 1 && rect.bottom <= boxBottom + 1;
    });
    const cut = rows.filter((row) => {
      const rect = row.getBoundingClientRect();
      return rect.top < boxBottom - 1 && rect.bottom > boxBottom + 1;
    });
    return {
      head: [...table.querySelectorAll('thead th')].map((cell) => cell.textContent.trim()),
      widths: [...table.querySelectorAll('thead th')].map((cell) => Math.round(cell.getBoundingClientRect().width)),
      rows: rows.length,
      rows_in_view: whole.length,
      rows_cut: cut.length,
      table_width: Math.round(table.getBoundingClientRect().width),
      card_width: Math.round(card.getBoundingClientRect().width),
      box_scrolls_sideways: box.scrollWidth - box.clientWidth,
      first: rows.slice(0, 2).map((row) => [...row.children].slice(0, 4).map((cell) => cell.textContent.trim()))
    };
  });
// Megabytes of R's downloads, counted as compressed response bodies.
function meter(context, own) {
  const seen = { 'webr.r-wasm.org': 0, 'repo.r-wasm.org': 0, page: 0, requests: 0 };
  context.on('requestfinished', async (request) => {
    try {
      const url = new URL(request.url());
      const { responseBodySize } = await request.sizes();
      const size = Math.max(0, responseBodySize);
      if (R_HOSTS.includes(url.hostname)) seen[url.hostname] += size;
      else if (url.origin === own && /\/r-wasm\//.test(url.pathname)) seen.page += size;
      else return;
      seen.requests += 1;
    } catch {
      // A request that never finished has no size.
    }
  });
  return seen;
}
// A megabyte here is 1,048,576 bytes, as in safety.viz's own measure of the download (APP-RBQM-021).
const megabytes = (bytes) => Math.round((bytes / 1048576) * 10) / 10;
const GRAPHITE = 'rgb(74, 82, 92)';
// Files dropped on the Data tab's drop zone, as a browser hands them over.
const drop = async (page, files) => {
  const transfer = await page.evaluateHandle((list) => {
    const data = new DataTransfer();
    for (const [name, body, type] of list) data.items.add(new File([body], name, { type }));
    return data;
  }, files);
  await page.dispatchEvent('.sva-drop', 'drop', { dataTransfer: transfer });
};
const raw = (name) => [name, readFileSync(path.resolve('site/data/rbqm', name), 'utf8'), 'text/csv'];

// ---------------------------------------------------------------- 1. the first screen
if (ONLY.includes('1')) {
  {
    const context = await browser.newContext(desktop);
    const page = await context.newPage();
    if (await openBefore(page)) {
      numbers.first_before = {
        title: await page.title(),
        tabs: await tabsOf(page),
        data_tag: await text(page, '.sva-item[data-view="data"] .sva-tag'),
        welcome_lines: await page.locator('.sva-welcome').count(),
        wordmark_links: await page.locator('a.sva-brand').count(),
        version: await text(page, '.sva-version'),
        footer: await text(page, '.sva-footer p')
      };
      await shot(page, 'first-110');
    }
    await context.close();
  }
  const context = await browser.newContext(desktop);
  const page = await context.newPage();
  await openApp(page);
  const first = (numbers.first = {
    title: await page.title(),
    tabs: await tabsOf(page),
    data_tag: await text(page, '.sva-item[data-view="data"] .sva-tag'),
    welcome: await text(page, '.sva-welcome p'),
    wordmark: await page.locator('a.sva-brand').evaluate((link) => [link.href, link.title]),
    favicon: await page.locator('link[rel~="icon"]').first().getAttribute('href'),
    version: await text(page, '.sva-version'),
    footer: await text(page, '.sva-footer p'),
    biomarker_names: [
      ...new Set(
        await page
          .locator('.sva-group[data-group="biomarkers"] .sva-item .sva-hex')
          .evaluateAll((all) => all.map((hex) => getComputedStyle(hex).backgroundColor))
      )
    ],
    histogram_line: (await page.locator('.sv-notes span', { hasText: 'participants shown' }).first().textContent()).trim()
  });
  // Seen while capturing, and put to the reviewer: the welcome line counts the study's participants,
  // and the histogram under it counts the labs file's, which carries synthetic ones as well.
  check('first screen: what the histogram under the welcome line counts', first.histogram_line, '364 of 364 participants shown (100.0%).');
  check(
    'first screen: the welcome line',
    first.welcome,
    'You are looking at the CDISC pilot study, a public demo: 254 participants, 18 charts on five tabs. To use your own files, open Data. They are read in this browser and never leave it.'
  );
  check(
    'first screen: each tab, with one number when every chart draws',
    first.tabs.map((tab) => `${tab.name} ${tab.count}`),
    ['Labs and vitals 9', 'ECG 1', 'Adverse events 3', 'Biomarkers 5', 'RBQM not run']
  );
  check(
    'first screen: no tab is grey',
    first.tabs.some((tab) => tab.hex === GRAPHITE),
    false
  );
  check(
    'first screen: Biomarkers is pink and RBQM is amber',
    first.tabs.slice(3).map((tab) => tab.hex),
    ['rgb(198, 123, 182)', 'rgb(199, 138, 59)']
  );
  check('first screen: the biomarker chart names take their tab’s colour', first.biomarker_names, [
    'rgb(198, 123, 182)'
  ]);
  check('first screen: the Data tab names the study', first.data_tag, 'Pilot study');
  check('first screen: the wordmark links to the docs', first.wordmark[0], `${BASE}index.html`);
  check('first screen: the browser tab names the open chart', first.title, 'Histogram · safety.viz demo');
  check(
    'nothing leaves the browser: the footer’s sentence',
    first.footer,
    'Files you load are read in this browser and never uploaded. Starting R downloads R from webr.r-wasm.org and, for the RBQM tab, its packages from repo.r-wasm.org; your data stays in the browser, and R runs here.'
  );
  await shot(page, 'first', {
    mark: [
      [1, '.sva-item[data-view="data"] .sva-tag', 'h'],
      [2, '.sva-tab[data-domain="bds"] .sva-tab-count', 'h'],
      [3, '.sva-tab[data-domain="biomarkers"] .sva-hex', 'h'],
      [4, '.sva-tab[data-tab="rbqm"] .sva-hex', 'h'],
      [5, '.sva-welcome', 'l'],
      [6, 'a.sva-brand .sva-wordmark', 'h'],
      [7, '.sva-appstatus', 'l']
    ]
  });
  // The welcome line closes, and stays closed for the visit.
  await closeWelcome(page);
  await go(page, 'ae-explorer');
  first.title_chart = await page.title();
  await rbqmTab(page).click();
  await settle(page);
  first.title_rbqm = await page.title();
  first.welcome_shown_after_close = await page.locator('.sva-welcome').isVisible();
  check('first screen: the welcome line closes and stays closed', first.welcome_shown_after_close, false);
  check('first screen: the browser tab follows the open view', [first.title_chart, first.title_rbqm], [
    'Adverse Event Explorer · safety.viz demo',
    'RBQM · safety.viz demo'
  ]);
  // One favicon: the docs home page's is the app's.
  await page.goto(BASE);
  first.docs_favicon = await page.locator('link[rel~="icon"]').first().getAttribute('href');
  check('first screen: the docs site and the app share one favicon', first.docs_favicon === first.favicon, true);
  await context.close();

  // A phone: a link to a tab opens with that tab in view, and tabs are 44 pixels tall.
  const link = async (base) => {
    const phoneContext = await browser.newContext(phone);
    const phonePage = await phoneContext.newPage();
    await openApp(phonePage, '#rbqm', base);
    const read = await phonePage.evaluate(() => {
      const rect = document.querySelector('.sva-tab[data-tab="rbqm"]').getBoundingClientRect();
      const heights = [...document.querySelectorAll('.sva-tab, .sva-tabs .sva-item, .sva-view-item')]
        .map((node) => Math.round(node.getBoundingClientRect().height))
        .filter(Boolean);
      return {
        tab_left: Math.round(rect.left),
        tab_right: Math.round(rect.right),
        width: window.innerWidth,
        shortest: Math.min(...heights)
      };
    });
    return { phonePage, phoneContext, read };
  };
  {
    const { phonePage, phoneContext, read } = await link(BEFORE);
    if ((await phonePage.locator('.sva-appstatus').count()) === 0) {
      numbers.phone_link_before = read;
      await shot(phonePage, 'phone-link-110');
    }
    await phoneContext.close();
  }
  {
    const { phonePage, phoneContext, read } = await link(BASE);
    numbers.phone_link = { ...read, sideways: await sideways(phonePage) };
    check(
      'phone: a link to the RBQM tab opens with that tab in view',
      read.tab_left >= 0 && read.tab_right <= read.width,
      true
    );
    check('phone: tabs and chart names are at least 44 pixels tall', read.shortest >= 44, true);
    check('phone: the first screen does not scroll sideways', numbers.phone_link.sideways <= 0, true);
    await shot(phonePage, 'phone-link', { mark: [[1, '.sva-tab[data-tab="rbqm"]', 'b']] });
    await phoneContext.close();
  }
  save();
}

// ---------------------------------------------------------------- 2. the status labels
if (ONLY.includes('2')) {
  {
    const context = await browser.newContext(desktop);
    const page = await context.newPage();
    if (await openBefore(page, '#hep-waterfall')) {
      await settle(page, 1500);
      numbers.status_before = {
        header_labels: await page.locator('.sva-appstatus').count(),
        banner: squash(
          await page
            .locator('.sva-chart')
            .getByText('This chart is experimental', { exact: false })
            .first()
            .textContent()
        )
      };
      await shot(page, 'waterfall-110');
    }
    await context.close();
  }
  const context = await browser.newContext(desktop);
  const page = await context.newPage();
  await openApp(page);
  const label = page.locator('.sva-appstatus .sv-status-label');
  const panel = page.locator('.sva-appstatus .sv-status-panel');
  const status = (numbers.status = {
    word: await text(page, '.sva-appstatus .sv-status-word'),
    tip: await text(page, '.sva-appstatus .sv-status-tip'),
    header_labels: await page.locator('.sva-appstatus .sv-status').count()
  });
  await label.hover();
  await settle(page, 500);
  await shot(page, 'status-hover', {
    clip: { x: 760, y: 0, width: 520, height: 150 },
    mark: [[1, '.sva-appstatus .sv-status-label', 'l']]
  });
  await page.mouse.move(300, 500);
  // From the keyboard: the label takes focus, opens on Enter and closes on Escape.
  await label.focus();
  await page.keyboard.press('Enter');
  await settle(page, 300);
  const opened = await label.getAttribute('aria-expanded');
  Object.assign(status, {
    heading: await text(page, '.sva-appstatus .sv-status-heading'),
    disclaimer: await text(page, '.sva-appstatus .sv-status-text:not(.sv-status-count):not(.sv-status-foot)'),
    count_line: await text(page, '.sva-appstatus .sv-status-count'),
    rungs: await page.locator('.sva-appstatus .sv-status-step').evaluateAll((all) =>
      all.map((step) => ({
        rung: step.querySelector('.sv-status-rung').textContent.trim(),
        mark: step.querySelector('.sv-status-mark')?.textContent.trim() ?? null,
        meaning: step.querySelector('.sv-status-meaning').textContent.trim()
      }))
    ),
    foot: await page.locator('.sva-appstatus .sv-status-foot a').evaluate((a) => [a.textContent.trim(), a.href])
  });
  await shot(page, 'status-panel', {
    mark: [
      [1, '.sva-appstatus .sv-status-label', 'l'],
      [2, '.sva-appstatus .sv-status-text', 'l'],
      [3, '.sva-appstatus .sv-status-count', 'l'],
      [4, '.sva-appstatus .sv-status-here', 'l']
    ]
  });
  await page.keyboard.press('Escape');
  await settle(page, 200);
  status.keyboard = [opened, await label.getAttribute('aria-expanded'), await panel.isHidden()];
  check('status: one label in the header, reading Exploratory', [status.header_labels, status.word], [1, 'Exploratory']);
  check('status: the line on hover', status.tip, 'Nothing in this app is qualified. Confirm every result.');
  check('status: the panel’s heading', status.heading, 'This app is exploratory');
  check(
    'status: the disclaimer',
    status.disclaimer,
    'Nothing here is qualified. The charts, statistics and site metrics are tested and documented, but none has been through qualification. Confirm every result in a qualified system before you rely on it.'
  );
  check(
    'status: the count of what is on each rung',
    status.count_line,
    '13 charts are Exploratory. 5 charts and the RBQM tab are Experimental, and say so when you open them.'
  );
  check(
    'status: four rungs, the app’s marked',
    status.rungs.map((step) => `${step.rung}${step.mark ? ` (${step.mark})` : ''}`),
    ['Qualified', 'Exploratory (This app)', 'Experimental', 'Prototype']
  );
  check('status: opens on Enter and closes on Escape', status.keyboard, ['true', 'false', true]);

  // Every view of the app: six carry a label of their own, with a reason.
  const views = (
    await page.locator('.sva-item').evaluateAll((all) => all.map((item) => [item.dataset.view, item.title]))
  ).filter(([view]) => view !== 'data');
  status.labels = [];
  status.unlabelled = 0;
  status.banners = 0;
  const own = '.sva-content .sva-corner .sv-status';
  const readOwn = async () => ({
    word: await text(page, `${own} .sv-status-word`),
    reason: await text(page, `${own} .sv-status-tip`),
    heading: await page.locator(`${own} .sv-status-panel`).getAttribute('aria-label')
  });
  for (const [view] of views) {
    await go(page, view);
    status.banners += await page.locator('.sva-chart').getByText('This chart is experimental').count();
    if (await page.locator(own).count()) status.labels.push({ view, ...(await readOwn()) });
    else status.unlabelled += 1;
    if (view === 'hep-waterfall') {
      await settle(page, 1500);
      await page.locator(`${own} .sv-status-label`).click();
      await settle(page, 400);
      status.chart_rungs = await page
        .locator(`${own} .sv-status-step`)
        .evaluateAll((all) =>
          all.map((step) => [
            step.querySelector('.sv-status-rung').textContent.trim(),
            step.querySelector('.sv-status-mark')?.textContent.trim() ?? null
          ])
        );
      await shot(page, 'status-chart', {
        mark: [
          [1, `${own} .sv-status-label`, 'l'],
          [2, `${own} .sv-status-text`, 'l'],
          [3, `${own} .sv-status-here`, 'l']
        ]
      });
      await page.keyboard.press('Escape');
    }
  }
  await rbqmTab(page).click();
  await settle(page);
  status.labels.push({ view: 'rbqm', ...(await readOwn()) });
  status.rbqm_pills = await page.locator('.sva-rbqm .sva-pill, .sva-rbqm [class*="experimental"]').count();
  await page.locator(`${own} .sv-status-label`).click();
  await settle(page, 400);
  await shot(page, 'status-tab', {
    clip: { x: 640, y: 96, width: 640, height: 480 },
    mark: [[1, `${own} .sv-status-label`, 'l']]
  });
  await page.keyboard.press('Escape');
  check(
    'status: six labels below the app’s, each with its reason',
    status.labels.map((one) => `${one.heading} | ${one.word} | ${one.reason}`),
    [
      'Hepatic ALT Waterfall is experimental | Experimental | Experimental: a new chart, drawn from a 2025 paper; its layout and settings may still change.',
      'Nephrotoxicity Explorer is experimental | Experimental | Experimental until its kidney-injury staging has had a clinical review.',
      'Participant Profile is experimental | Experimental | Experimental: what it lists for a participant, and how, may still change.',
      'QT Safety Explorer is experimental | Experimental | Experimental: its settings and its table may still change.',
      'Time-to-Event Explorer is experimental | Experimental | Experimental until an external clinical review confirms its Kaplan–Meier estimates.',
      'The RBQM tab is experimental | Experimental | Experimental: new in 1.10. R runs in the browser, and what the tab shows may still change.'
    ]
  );
  check('status: thirteen charts carry no second label', status.unlabelled, 13);
  check('status: no banner inside a chart', status.banners, 0);
  check('status: what each rung means, as the panel says it', status.rungs.map((step) => step.meaning), [
    'Validated for regulated use. Nothing in safety.viz is, yet.',
    'Tested and documented. Confirm every result.',
    'Tested and documented, but what it shows or how it behaves may still change.',
    'An early look, on the docs site only. Not in this app.'
  ]);

  // At a phone's width the label opens inside the window.
  const phoneContext = await browser.newContext(phone);
  const phonePage = await phoneContext.newPage();
  await openApp(phonePage);
  await phonePage.locator('.sva-appstatus .sv-status-label').click();
  await settle(phonePage, 400);
  status.phone = await phonePage.evaluate(() => {
    const rect = document.querySelector('.sva-appstatus .sv-status-panel').getBoundingClientRect();
    return {
      left: Math.round(rect.left),
      right: Math.round(rect.right),
      width: window.innerWidth,
      sideways: document.documentElement.scrollWidth - window.innerWidth
    };
  });
  check(
    'status: on a phone the panel opens inside the window',
    status.phone.left >= 0 && status.phone.right <= status.phone.width && status.phone.sideways <= 0,
    true
  );
  await shot(phonePage, 'phone-status');
  await phoneContext.close();

  // The docs site: the same label on gallery cards and page titles.
  await page.goto(BASE);
  await page.evaluate(() => document.fonts.ready);
  await settle(page);
  const docs = (numbers.docs_labels = {
    gallery: await texts(page, '.card-body .sv-status-word'),
    exploratory_tip: await text(page, '.card-body .sv-status-label[data-tier="exploratory"] .sv-status-tip'),
    prototype_tip: await text(page, '.card-body .sv-status-label[data-tier="prototype"] .sv-status-tip')
  });
  const tally = (word) => docs.gallery.filter((one) => one === word).length;
  docs.counts = [tally('Exploratory'), tally('Experimental'), tally('Prototype')];
  check('docs site: every gallery card says its rung', docs.counts, [8, 5, 1]);
  const card = page.locator('.card-body').filter({ hasText: 'QT Safety Explorer' }).first();
  await card.evaluate((node) => {
    window.scrollTo({ top: node.getBoundingClientRect().top + window.scrollY - 330, behavior: 'instant' });
  });
  await card.locator('.sv-status-label').click();
  await settle(page, 500);
  docs.card_heading = await card.locator('.sv-status-panel').getAttribute('aria-label');
  docs.card_reason = squash(await card.locator('.sv-status-panel .sv-status-text').first().textContent());
  await shot(page, 'docs-gallery');
  await page.goto(`${BASE}time-to-event/`);
  await page.evaluate(() => document.fonts.ready);
  await settle(page, 2000);
  docs.page_title = await page.locator('h1').evaluate((title) => [
    [...title.childNodes].filter((node) => node.nodeType === 3).map((node) => node.textContent.trim()).join(''),
    title.querySelector('.sv-status-word').textContent.trim(),
    title.querySelector('.sv-status-tip').textContent.trim()
  ]);
  docs.page_labels = await page.locator('.sv-status-word').count();
  check('docs site: a chart page’s title says its rung', docs.page_title, [
    'Time-to-Event Explorer',
    'Experimental',
    'Experimental until an external clinical review confirms its Kaplan–Meier estimates.'
  ]);
  await shot(page, 'docs-title', {
    clip: { x: 0, y: 60, width: 1280, height: 420 },
    mark: [[1, 'h1 .sv-status', 'r']]
  });
  save();
  await context.close();
}

// ---------------------------------------------------------------- 3. the R control
if (ONLY.includes('3')) {
  {
    const context = await browser.newContext(desktop);
    const page = await context.newPage();
    if (await openBefore(page, '#cross-tab')) {
      await settle(page, 800);
      numbers.r_before = {
        row: await page
          .locator('.sva-charts')
          .evaluate((row) => row.innerText.replace(/\s+/g, ' ').trim().slice(0, 60)),
        line: squash(await page.locator('.sva-chart .bv-statistic').first().textContent())
      };
      await shot(page, 'r-110');
    }
    await context.close();
  }
  const context = await browser.newContext(desktop);
  const page = await context.newPage();
  const seen = meter(context, new URL(BASE).origin);
  const asked = [];
  context.on('request', (request) => asked.push(request.url()));
  await openApp(page, '#cross-tab');
  const r = (numbers.r = {
    off: await controlSays(page),
    line_before: await text(page, '.sva-chart .bv-statistic'),
    requests_before_press: asked.filter((url) => /r-wasm\.org|\/r-wasm\//.test(url)).length,
    place: await page.evaluate(() => {
      const box = document.querySelector('.sva-charts > .sva-r').getBoundingClientRect();
      const names = [...document.querySelectorAll('.sva-charts .sva-item')].filter(
        (item) => item.getBoundingClientRect().width
      );
      const last = names.at(-1).getBoundingClientRect();
      return {
        right_of_names: box.left >= last.right,
        in_the_scrolling_list: Boolean(document.querySelector('.sva-charts > .sva-r').closest('.sva-group')),
        from_right_edge: Math.round(window.innerWidth - box.right)
      };
    })
  });
  check('R control: before a press', [r.off.say, r.off.meta, r.off.button], ['Statistics need R', '13 MB, once', 'Start R']);
  check(
    'R control: the whole sentence on hover',
    r.off.hover,
    'Statistics need R. Start R to compute them: about 13 MB, downloaded once from webr.r-wasm.org. The study’s data stays in this browser.'
  );
  check('R control: the line inside the chart points at it', r.line_before, 'Statistics need R. Start R, at the top right.');
  check('R control: at the right end of the chart names, outside the list', [r.place.right_of_names, r.place.in_the_scrolling_list], [true, false]);
  check('R control: nothing asked of R before the press', r.requests_before_press, 0);
  await shot(page, 'r-off', {
    mark: [
      [1, control, 'b'],
      [2, '.sva-group[data-group="biomarkers"] .sva-item:first-of-type', 'b']
    ]
  });
  const strip = { x: 720, y: 52, width: 560, height: 44 };
  await shot(page, 'r-state-off', { clip: strip });
  const pressed = Date.now();
  await page.locator(`${control} .sva-action`).click();
  await page.waitForSelector(`${control}[data-phase="starting"]`);
  r.starting = await controlSays(page);
  await shot(page, 'r-state-starting', { clip: strip });
  await page.waitForSelector(`${control} .sva-chip.sva-r-ready`, { timeout: 180000 });
  await page.waitForFunction(() => /p\s*[<=]/.test(document.querySelector('.sva-chart .bv-statistic')?.textContent || ''), null, {
    timeout: 120000
  });
  r.seconds_to_statistic = Math.round((Date.now() - pressed) / 100) / 10;
  await settle(page, 800);
  r.ready = await controlSays(page);
  r.disabled_buttons = await page.locator(`${control} button[disabled]`).count();
  r.statistic = await text(page, '.sva-chart .bv-statistic .bv-stat-result');
  r.megabytes = megabytes(seen['webr.r-wasm.org'] + seen['repo.r-wasm.org'] + seen.page);
  await page.locator(`${control} .sva-chip`).click();
  await settle(page, 400);
  r.panel_heading = await text(page, '.sva-header .sva-r-panel .sva-r-heading');
  r.panel = await page
    .locator('.sva-header .sva-r-panel dl')
    .evaluate((list) =>
      [...list.querySelectorAll('dt')].map((term) => [term.textContent.trim(), term.nextElementSibling.textContent.trim()])
    );
  check('R control: while R starts', [r.starting.say, r.starting.meta.replace(/\d+ s$/, 'N s')], ['Starting R', '13 MB · N s']);
  check('R control: a chip once R is ready, and no disabled button left', [r.ready.chip, r.disabled_buttons], ['R ready', 0]);
  check(
    'R control: R’s test appears in the chart',
    r.statistic,
    'Pearson\'s Chi-squared test: p < 0.001 (n = 254). Exploratory, unadjusted.'
  );
  check('R control: the chip opens R’s details', r.panel_heading, 'R is running in this browser');
  check(
    'R control: version, download and where R runs',
    r.panel.map(([term, said]) => `${term}: ${said.replace(/in [\d.]+ seconds?/, 'in N seconds')}`),
    [
      'Version: R 4.6.0, on webR 0.6.0',
      'Started: in N seconds',
      'Downloaded: 13 MB, once, from webr.r-wasm.org',
      'Your data: stays in this browser; R runs here'
    ]
  );
  check('R control: about 13 MB downloaded', r.megabytes > 11 && r.megabytes < 15, true);
  await shot(page, 'r-state-ready', { clip: { x: 720, y: 52, width: 560, height: 210 } });
  await page.keyboard.press('Escape');
  await scrollTo(page, '.sva-chart .bv-statistic', 420);
  await shot(page, 'r-statistic', { mark: [[1, '.sva-chart .bv-statistic', 'l']] });
  await context.close();

  // R's addresses blocked: both tabs say so the same way.
  const blocked = await browser.newContext(desktop);
  await blocked.route(/webr\.r-wasm\.org|repo\.r-wasm\.org/, (route) => route.abort());
  const blockedPage = await blocked.newPage();
  await openApp(blockedPage, '#cross-tab');
  await blockedPage.locator(`${control} .sva-action`).click();
  await blockedPage.waitForSelector(`${control}[data-phase="failed"]`, { timeout: 120000 });
  await settle(blockedPage, 400);
  const failed = (r.failed = {
    biomarkers: {
      ...(await controlSays(blockedPage)),
      why: await text(blockedPage, `${control} .sva-r-why`),
      line: await text(blockedPage, '.sva-chart .bv-statistic .bv-stat-result')
    }
  });
  await blockedPage.locator(`${control} .sva-r-why`).click();
  await settle(blockedPage, 400);
  failed.biomarkers.panel = await text(blockedPage, '.sva-header .sva-r-panel .sva-r-text');
  failed.biomarkers.more = await text(blockedPage, '.sva-header .sva-r-panel details summary');
  await shot(blockedPage, 'r-state-failed', { clip: { x: 720, y: 52, width: 560, height: 260 } });
  await blockedPage.keyboard.press('Escape');
  await rbqmTab(blockedPage).click();
  await settle(blockedPage);
  await blockedPage.locator(`${control} .sva-action`).click();
  await blockedPage.waitForSelector(`${control}[data-phase="failed"]`, { timeout: 120000 });
  await settle(blockedPage, 400);
  failed.rbqm = {
    ...(await controlSays(blockedPage)),
    why: await text(blockedPage, `${control} .sva-r-why`),
    line: await outcome(blockedPage)
  };
  check(
    'R control: R’s addresses blocked, the same words on both tabs',
    [failed.biomarkers, failed.rbqm].map((one) => [one.say, one.button, one.why.replace(/\s*▾$/, '')]),
    [
      ['R did not start', 'Try again', 'Why'],
      ['R did not start', 'Try again', 'Why']
    ]
  );
  check(
    'R control: what each tab’s body says then',
    [failed.biomarkers.line, failed.rbqm.line],
    [
      'R did not start, so there is no test. Try again, at the top right.',
      'R did not start, so no metric was run. Try again, at the top right.'
    ]
  );
  check(
    'R control: why, in plain words, with the browser’s own message behind a disclosure',
    [failed.biomarkers.panel, failed.biomarkers.more],
    [
      'The browser could not download R from webr.r-wasm.org. Check the connection, or whether this network blocks that address, and try again. The charts still draw; only the statistics are missing.',
      'What the browser said'
    ]
  );
  await blocked.close();

  // A phone: the control is in view without scrolling.
  const phoneContext = await browser.newContext(phone);
  const phonePage = await phoneContext.newPage();
  await openApp(phonePage, '#cross-tab');
  r.phone = {
    ...(await controlSays(phonePage)),
    in_view: await phonePage.evaluate(() => {
      const rect = document.querySelector('.sva-charts > .sva-r .sva-action').getBoundingClientRect();
      return rect.left >= 0 && rect.right <= window.innerWidth && rect.top >= 0 && rect.bottom <= window.innerHeight;
    }),
    sideways: await sideways(phonePage),
    line: await text(phonePage, '.sva-chart .bv-statistic')
  };
  check('R control: on a phone, in view with no sideways scroll', [r.phone.in_view, r.phone.sideways <= 0], [true, true]);
  check('R control: on a phone the chart’s line says “above”', r.phone.line, 'Statistics need R. Start R, above.');
  await shot(phonePage, 'phone-r', { mark: [[1, `${control} .sva-action`, 'b']] });
  await phoneContext.close();
  save();
}

// ---------------------------------------------------------------- 4. the RBQM tab
if (ONLY.includes('4')) {
  // The top of the page, for the stills of a tab that has little on it yet.
  const offClip = { x: 0, y: 0, width: 1280, height: 420 };
  {
    const context = await browser.newContext(desktop);
    const page = await context.newPage();
    if (await openBefore(page, '#rbqm')) {
      const before = (numbers.rbqm_before = {
        row_items: await page.locator('.sva-view-items .sva-view-item').count(),
        says: await outcome(page)
      });
      await shot(page, 'rbqm-off-110', { clip: offClip });
      await page.locator('.sva-rbqm-start').click();
      await waitRan(page, /^R ran 3 of 8 metrics/);
      await inked(page);
      await settle(page, 1500);
      before.done = await outcome(page);
      before.table = await page.evaluate(() => {
        const table = document.querySelector('.sva-rbqm-table table');
        return {
          width: Math.round(table.getBoundingClientRect().width),
          widths: [...table.querySelectorAll('thead th')].map((cell) => Math.round(cell.getBoundingClientRect().width))
        };
      });
      await top(page);
      await shot(page, 'rbqm-done-110');
    }
    await context.close();
  }
  const context = await browser.newContext(desktop);
  const page = await context.newPage();
  const seen = meter(context, new URL(BASE).origin);
  await openApp(page);
  await closeWelcome(page);
  await rbqmTab(page).click();
  await settle(page);
  const rbqm = (numbers.rbqm = {
    row_before: await rowOf(page),
    row_shows: await texts(page, '.sva-view-items .sva-view-item'),
    off: await controlSays(page),
    need: await outcome(page),
    supports: await text(page, '.sva-rbqm-supports'),
    placeholder: await text(page, '.sva-rbqm-placeholder'),
    file_boxes: await page.locator('.sva-rbqm-drop, .sva-rbqm-files, .sva-rbqm-input').count(),
    choice_buttons: await page.locator('.sva-rbqm-choice').count()
  });
  check('RBQM tab: a row of Overview and eight metrics, each with its state in words', rbqm.row_before, [
    'Overview',
    'Adverse Event Rate: not started',
    'Serious Adverse Event Rate: not started',
    'Non-Important Protocol Deviation Rate: cannot run',
    'Important Protocol Deviation Rate: cannot run',
    'Grade 3+ Lab Abnormality Rate: cannot run',
    'Study Discontinuation Rate: not started',
    'Treatment Discontinuation Rate: cannot run',
    'Screen Failure Rate: cannot run'
  ]);
  check('RBQM tab: the same control, before a press', [rbqm.off.say, rbqm.off.meta, rbqm.off.button], [
    'Site metrics need R',
    '55 MB, once',
    'Start R'
  ]);
  check('RBQM tab: the body’s one line', rbqm.need, 'Site metrics need R. Start R, at the top right.');
  check('RBQM tab: what the study supports, with a link to the Data tab', rbqm.supports, 'The loaded study supports 3 of 8 metrics. Change the data on the Data tab.');
  check('RBQM tab: no file box and no buttons to choose a metric', [rbqm.file_boxes, rbqm.choice_buttons], [0, 0]);
  await shot(page, 'rbqm-off', {
    clip: offClip,
    mark: [
      [1, '.sva-view-items', 'b'],
      [2, control, 'l'],
      [3, '.sva-rbqm-status', 'l'],
      [4, '.sva-content .sva-corner .sv-status', 'l']
    ]
  });

  // One press. The control names the step and the body ticks the six steps off.
  const pressed = Date.now();
  await page.locator(`${control} .sva-action`).click();
  await page.waitForFunction(
    () => /^[34] of 6/.test(document.querySelector('.sva-charts > .sva-r .sva-r-say')?.textContent || ''),
    null,
    { timeout: 240000 }
  );
  await settle(page, 300);
  rbqm.running = {
    ...(await controlSays(page)),
    segments: await page.locator(`${control} .sva-segs`).getAttribute('aria-label'),
    body: await outcome(page),
    steps: await texts(page, '.sva-rbqm-steps li, .sva-rbqm ol li'),
    tab: await text(page, '.sva-tab[data-tab="rbqm"] .sva-tab-count'),
    row: await rowOf(page)
  };
  await shot(page, 'rbqm-running', {
    clip: { x: 0, y: 0, width: 1280, height: 470 },
    mark: [
      [1, control, 'b'],
      [2, '.sva-rbqm ol', 'r'],
      [3, '.sva-view-items', 'b']
    ]
  });
  await waitRan(page, /^R ran 3 of 8 metrics/);
  rbqm.seconds_to_result = Math.round((Date.now() - pressed) / 1000);
  await settle(page, 2000);
  Object.assign(rbqm, {
    presses: 1,
    done: await outcome(page),
    done_links: await texts(page, '.sva-rbqm-status button'),
    row_after: await rowOf(page),
    tab_after: await text(page, '.sva-tab[data-tab="rbqm"] .sva-tab-count'),
    chip: (await controlSays(page)).chip,
    heading: await text(page, '.sva-rbqm-headrow .sva-rbqm-heading'),
    count: await text(page, '.sva-rbqm-headrow .sva-rbqm-count'),
    key: await texts(page, '.sva-rbqm-key li'),
    key_note: await text(page, '.sva-rbqm-key p'),
    table: await overview(page),
    megabytes: {
      'webr.r-wasm.org': megabytes(seen['webr.r-wasm.org']),
      'repo.r-wasm.org': megabytes(seen['repo.r-wasm.org']),
      page: megabytes(seen.page),
      total: megabytes(seen['webr.r-wasm.org'] + seen['repo.r-wasm.org'] + seen.page)
    },
    panel_open_before_click: await page.locator('.sva-header .sva-r-panel').count()
  });
  check(
    'RBQM tab: while R starts, the control names the step and counts it',
    `${rbqm.running.say} | ${rbqm.running.segments}`,
    /^([34]) of 6 · (Fetching gsm’s workflow files|Loading gsm’s packages) \| Step \1 of 6$/
  );
  check('RBQM tab: the body lists six steps, one called the long one', rbqm.running.steps, [
    'Downloading R',
    'Installing R packages',
    'Fetching gsm’s workflow files',
    'Loading gsm’s packages, the long one',
    'Reading the study',
    'Running the workflows'
  ]);
  check(
    'RBQM tab: one line says what ran',
    rbqm.done,
    /^R ran 3 of 8 metrics on the Pilot study in [\d.]+ seconds?\. The other 5 need data it does not have: change the data on the Data tab\. Run details$/
  );
  check('RBQM tab: each metric’s state after the run', rbqm.row_after, [
    'Overview',
    'Adverse Event Rate: ran',
    'Serious Adverse Event Rate: ran',
    'Non-Important Protocol Deviation Rate: did not run',
    'Important Protocol Deviation Rate: did not run',
    'Grade 3+ Lab Abnormality Rate: did not run',
    'Study Discontinuation Rate: ran',
    'Treatment Discontinuation Rate: did not run',
    'Screen Failure Rate: did not run'
  ]);
  check('RBQM tab: the tab counts what ran, and the control is a chip', [rbqm.tab_after, rbqm.chip], ['3 of 8', 'R ready']);
  check('RBQM tab: the heading counts the sites', [rbqm.heading, rbqm.count], ['Site overview', '17 sites, 12 shown here']);
  check('RBQM tab: 17 sites, and site 705 first with 16 enrolled and one red flag', [rbqm.table.rows, rbqm.table.first[0]], [
    17,
    ['705', '16', '1', '0']
  ]);
  check('RBQM tab: the columns', rbqm.table.head, ['Group', 'Enrolled', 'Red Flags', 'Amber Flags', 'AE', 'SAE', 'SDSC']);
  check(
    'RBQM tab: no number or flag column wider than 100 pixels, and the table narrower than its card',
    [Math.max(...rbqm.table.widths.slice(1)) <= 100, rbqm.table.table_width < rbqm.table.card_width],
    [true, true]
  );
  check('RBQM tab: the last row in view is whole', [rbqm.table.rows_in_view, rbqm.table.rows_cut], [12, 0]);
  check('RBQM tab: the key to the flags', rbqm.key, [
    'within limits',
    'amber flag: high, or low when it points down',
    'red flag: high, or low when it points down',
    'no score, so no flag'
  ]);
  check('RBQM tab: Run details is closed until asked for', rbqm.panel_open_before_click, 0);
  check('RBQM tab: about 55 MB downloaded', rbqm.megabytes.total > 52 && rbqm.megabytes.total < 58, true);
  await shot(page, 'rbqm-done', {
    mark: [
      [1, '.sva-view-items', 'b'],
      [2, `${control} .sva-chip`, 'l'],
      [3, '.sva-rbqm-status', 'l'],
      [4, '.sva-rbqm-count', 'r'],
      [5, '.sva-rbqm-table thead', 'rn'],
      [6, '.sva-rbqm-key p', 'b']
    ]
  });
  // Run details, behind the chip.
  await page.locator('.sva-rbqm-status .sva-rbqm-details').click();
  await settle(page, 500);
  rbqm.details = await page.locator('.sva-header .sva-r-panel').evaluate((panel) => ({
    heading: panel.querySelector('.sva-r-heading').textContent.trim(),
    says: panel.querySelector('.sva-r-text').textContent.trim(),
    titles: [...panel.querySelectorAll('.sva-r-title')].map((title) => title.textContent.trim()),
    steps: [...panel.querySelectorAll('.sva-r-steps li')].map((step) => step.textContent.replace(/\s+/g, ' ').trim()),
    handed: [...panel.querySelectorAll('.sva-r-col:nth-child(2) ul:first-of-type li')].map((item) => item.textContent.trim()),
    did_not_run: [...panel.querySelectorAll('.sva-r-col:nth-child(2) ul:last-of-type li')].map((item) => item.textContent.trim()),
    versions: [...panel.querySelectorAll('.sva-r-col:nth-child(3) dt')].map((term) => [
      term.textContent.trim(),
      term.nextElementSibling.textContent.trim()
    ]),
    warnings: [...panel.querySelectorAll('.sva-r-col:nth-child(3) ul li')].map((item) => item.textContent.trim()),
    total: [...panel.querySelectorAll('.sva-r-col:first-child .sva-r-text')].map((line) => line.textContent.trim()),
    buttons: [...panel.querySelectorAll('.sva-r-actions button')].map((button) => button.textContent.trim())
  }));
  check('RBQM tab: Run details holds the steps, what R was handed, the versions and R’s warnings', rbqm.details.titles, [
    'Steps',
    'What R was handed',
    'Did not run',
    'Versions',
    'Warnings from R'
  ]);
  check(
    'RBQM tab: the versions',
    rbqm.details.versions.filter(([term]) => term !== 'Snapshot').map(([term, said]) => `${term}: ${said}`),
    [
      'R: 4.6.0, on webR 0.6.0',
      'gsm: gsm.core 1.3.1, gsm.mapping 1.1.6, gsm.reporting 1.1.7, workr 1.1.0',
      'Metric workflows: gsm.kri 1.7.0',
      'Charts: gsm.viz 2.4.1'
    ]
  );
  check('RBQM tab: Run again sits in the same panel', rbqm.details.buttons, ['Run again']);
  check(
    'RBQM tab: why a metric did not run, in R’s words',
    rbqm.details.did_not_run.at(-1),
    'Screen Failure Rate needs Raw_ENROLL.csv, which is not loaded.'
  );
  await shot(page, 'rbqm-details', { mark: [[1, `${control} .sva-chip`, 'l']] });
  await page.keyboard.press('Escape');
  // A cell of the overview opens that metric's page: two charts and nothing else.
  await page.locator('.sva-rbqm-table tbody tr:first-child td:nth-child(7)').click();
  await inked(page);
  await settle(page, 1200);
  rbqm.metric = {
    address: await page.evaluate(() => window.location.hash),
    name: await text(page, '.sva-rbqm-metric-name'),
    says: await text(page, '.sva-rbqm-headrow .sva-rbqm-count'),
    charts: await page.locator('.sva-rbqm-figures canvas').count(),
    tables: await page.locator('.sva-rbqm table').count(),
    current: await page.locator('.sva-view-item[aria-current]').getAttribute('aria-label')
  };
  check('RBQM tab: a cell opens its metric’s page, at an address of its own', rbqm.metric, {
    address: '#rbqm/kri0006',
    name: 'Study Discontinuation Rate',
    says: 'SDSC, ran',
    charts: 2,
    tables: 0,
    current: 'Study Discontinuation Rate: ran'
  });
  await shot(page, 'rbqm-metric', {
    mark: [
      [1, '.sva-view-item[aria-current]', 'b'],
      [2, '.sva-rbqm-headrow', 'l']
    ]
  });
  await page.locator('.sva-view-item[data-item="kri0012"]').click();
  await settle(page, 900);
  rbqm.cannot = {
    name: await text(page, '.sva-rbqm-metric-name'),
    says: await text(page, '.sva-rbqm-headrow .sva-rbqm-count'),
    why: await text(page, '.sva-rbqm-why'),
    link: await text(page, '.sva-rbqm-whybox .sva-rbqm-data')
  };
  check('RBQM tab: a metric that did not run says what it needs', rbqm.cannot, {
    name: 'Screen Failure Rate',
    says: 'SF, did not run',
    why: 'Screen Failure Rate needs Raw_ENROLL.csv, which is not loaded.',
    link: 'Change the data on the Data tab.'
  });
  await shot(page, 'rbqm-cannot', {
    clip: { x: 0, y: 0, width: 1280, height: 330 },
    mark: [
      [1, '.sva-view-item[aria-current]', 'b'],
      [2, '.sva-rbqm-whybox', 'l']
    ]
  });

  // The RBQM study, chosen on the Data tab: R is up, so it runs by itself.
  await page.locator('.sva-item[data-view="data"]').click();
  await page.locator('.sva-side select.sva-study').selectOption('rbqm');
  await page.waitForFunction(() => document.querySelectorAll('.sva-loaded-name').length === 9);
  await rbqmTab(page).click();
  await waitRan(page, /^R ran 8 of 8 metrics/);
  await settle(page, 2000);
  await page.locator('.sva-view-item[data-item=""]').click();
  await settle(page, 800);
  const study = (numbers.rbqm_study = {
    done: await outcome(page),
    tab: await text(page, '.sva-tab[data-tab="rbqm"] .sva-tab-count'),
    count: await text(page, '.sva-rbqm-headrow .sva-rbqm-count'),
    row: await rowOf(page),
    table: await overview(page),
    sideways: await sideways(page),
    row_fits: await page.evaluate(() => {
      const row = document.querySelector('.sva-view-items');
      return row.scrollWidth <= row.clientWidth;
    })
  });
  check('RBQM study: all eight metrics, with no second press', study.done, /^R ran 8 of 8 metrics on the 9 loaded files in [\d.]+ seconds?\. To use other files, change the data on the Data tab\. Run details$/);
  check('RBQM study: 150 sites', `${study.table.rows} rows | ${study.count}`, /^150 rows \| 150 sites, \d+ shown here$/);
  check('RBQM study: eight metric columns', study.table.head.slice(4), ['AE', 'SAE', 'PD', 'IPD', 'LB', 'SDSC', 'TDSC', 'SF']);
  check(
    'RBQM study: the row and the table fit, with no sideways scroll',
    [study.row_fits, study.table.box_scrolls_sideways <= 0, study.sideways <= 0, Math.max(...study.table.widths.slice(1)) <= 100],
    [true, true, true, true]
  );
  await top(page);
  await shot(page, 'rbqm-study', {
    mark: [
      [1, '.sva-view-items', 'b'],
      [2, '.sva-rbqm-count', 'r'],
      [3, '.sva-item[data-view="data"] .sva-tag', 'h']
    ]
  });
  await context.close();

  // A link to one metric opens the tab on that metric.
  const linked = await browser.newContext(desktop);
  const linkedPage = await linked.newPage();
  await openApp(linkedPage, '#rbqm/kri0002');
  rbqm.link = {
    current: await linkedPage.locator('.sva-view-item[aria-current]').getAttribute('aria-label'),
    name: await text(linkedPage, '.sva-rbqm-metric-name')
  };
  check('RBQM tab: a link to a metric opens the tab on it', rbqm.link, {
    current: 'Serious Adverse Event Rate: not started',
    name: 'Serious Adverse Event Rate'
  });
  await linked.close();

  // A phone.
  const phoneContext = await browser.newContext(phone);
  const phonePage = await phoneContext.newPage();
  await openApp(phonePage, '#rbqm');
  await closeWelcome(phonePage);
  const before = await sideways(phonePage);
  await phonePage.locator(`${control} .sva-action`).click();
  await waitRan(phonePage, /^R ran 3 of 8 metrics/);
  await settle(phonePage, 2000);
  numbers.rbqm_phone = {
    sideways_before: before,
    sideways_after: await sideways(phonePage),
    smallest_heading: await phonePage
      .locator('.sva-rbqm-table thead th')
      .evaluateAll((all) => Math.min(...all.map((cell) => parseFloat(getComputedStyle(cell).fontSize)))),
    table: await overview(phonePage)
  };
  check(
    'phone: the RBQM tab does not scroll sideways, and its table fits its box',
    [numbers.rbqm_phone.sideways_before <= 0, numbers.rbqm_phone.sideways_after <= 0, numbers.rbqm_phone.table.box_scrolls_sideways <= 0],
    [true, true, true]
  );
  check('phone: the table’s headings are at least 10 pixels', numbers.rbqm_phone.smallest_heading >= 10, true);
  await top(phonePage);
  await shot(phonePage, 'phone-rbqm');
  await phonePage.locator('.sva-rbqm-table tbody tr:first-child td:nth-child(5)').click();
  await inked(phonePage);
  await settle(phonePage, 1200);
  await top(phonePage);
  await shot(phonePage, 'phone-rbqm-metric');
  await phoneContext.close();
  save();
}

// ---------------------------------------------------------------- 5. the Data tab
if (ONLY.includes('5')) {
  const three = [raw('Raw_SUBJ.csv'), raw('Raw_AE.csv'), raw('Raw_PD.csv')];
  {
    const context = await browser.newContext(desktop);
    const page = await context.newPage();
    if (await openBefore(page)) {
      await page.locator('.sva-item[data-view="data"]').click();
      await settle(page);
      await drop(page, three);
      await settle(page, 2500);
      const before = (numbers.data_before = {
        loaded: await page
          .locator('.sva-loaded-file')
          .evaluateAll((all) =>
            all.map((file) =>
              [file.querySelector('.sva-loaded-name'), file.querySelector('.sva-loaded-detail')]
                .map((node) => node.textContent.trim())
                .join(': ')
            )
          ),
        tag: await text(page, '.sva-item[data-view="data"] .sva-tag')
      });
      await top(page);
      await shot(page, 'data-raw-110');
      await rbqmTab(page).click();
      await settle(page);
      before.rbqm_summary = await text(page, '.sva-rbqm-files-summary');
      before.rbqm_says = await outcome(page);
    }
    await context.close();
  }
  const context = await browser.newContext(desktop);
  const page = await context.newPage();
  await openApp(page);
  await closeWelcome(page);
  await page.locator('.sva-item[data-view="data"]').click();
  await settle(page);
  const card = '.sva-data .sva-support[data-support="rbqm"]';
  const readCard = () =>
    page.locator(card).evaluate((node) => ({
      title: node.querySelector('.sva-support-title').textContent.trim(),
      say: node.querySelector('.sva-support-say').textContent.trim(),
      button: node.querySelector('[data-action="open-view"]').textContent.trim(),
      items: [...node.querySelectorAll('.sva-support-items li')].map(
        (item) => item.getAttribute('aria-label') || item.getAttribute('title') || item.textContent.replace(/\s+/g, ' ').trim()
      ),
      why_title: node.querySelector('.sva-support-why summary')?.textContent.trim() ?? null,
      why: [...node.querySelectorAll('.sva-support-why li')].map((item) => item.textContent.trim()),
      lines: [...node.querySelectorAll('.sva-support-lines li')].map((item) => item.textContent.trim()),
      note: node.querySelector('.sva-support-note')?.textContent.trim() ?? null,
      key: node.querySelector('.sva-support-key')?.textContent.replace(/\s+/g, ' ').trim() ?? null
    }));
  const data = (numbers.data = {
    drop_zone: await text(page, '.sva-drop'),
    pilot: await readCard(),
    drop_note: await text(page, '.sva-drop .sva-drop-note'),
    study_note: await text(page, '.sva-study-note'),
    pilot_step: await text(page, '.sva-step[data-step="open"] .sva-step-status')
  });
  check('Data tab: on the pilot study, one RBQM card', [data.pilot.title, data.pilot.say, data.pilot.button], [
    'RBQM',
    'This data supports 3 of 8 metrics.',
    'Open RBQM'
  ]);
  check('Data tab: the drop zone takes both kinds of file', data.drop_note, 'Study files or gsm raw files. They are read in this browser and sent nowhere.');
  check('Data tab: which raw tables R makes from which file', data.pilot.lines, [
    'adsl.csv, the Subject-level file, gives Raw_SITE, Raw_STUDCOMP, Raw_STUDY and Raw_SUBJ.',
    'adae.csv, the Adverse events file, gives Raw_AE.'
  ]);
  await scrollTo(page, card, 120);
  await shot(page, 'data-pilot', {
    mark: [
      [1, `${card} .sva-support-head`, 'l'],
      [2, `${card} [data-action="open-view"]`, 'l']
    ]
  });
  await top(page);

  // Three raw files of one's own, dropped where every other file goes.
  await drop(page, three);
  await page.waitForFunction(() => document.querySelectorAll('.sva-file.sva-raw').length === 3, null, { timeout: 30000 });
  await settle(page, 1500);
  data.own = {
    tag: await text(page, '.sva-item[data-view="data"] .sva-tag'),
    names: await texts(page, '.sva-loaded-name'),
    raw_tags: await texts(page, '.sva-file.sva-raw .sva-tag'),
    card: await readCard(),
    step_two: await text(page, '.sva-step[data-step="map"] .sva-step-status'),
    step_three: [
      await text(page, '.sva-step[data-step="open"] .sva-step-title'),
      await text(page, '.sva-step[data-step="open"] .sva-step-status')
    ],
    cleared: await texts(page, '.sva-notes .sva-note'),
    loaded: await page
      .locator('.sva-loaded-file')
      .evaluateAll((all) =>
        all.map((file) =>
          [file.querySelector('.sva-loaded-name'), file.querySelector('.sva-loaded-detail')]
            .map((node) => node.textContent.trim())
            .join(': ')
        )
      ),
    tabs: (await tabsOf(page)).map((tab) => `${tab.name} ${tab.count}`)
  };
  await page.locator(`${card} .sva-support-why summary`).click().catch(() => {});
  await settle(page, 400);
  data.own.card = await readCard();
  check('Data tab: three raw files, each read as its raw domain', data.own.raw_tags, [
    'gsm raw file: Raw_SUBJ, by its name',
    'gsm raw file: Raw_AE, by its name',
    'gsm raw file: Raw_PD, by its name'
  ]);
  check('Data tab: the tab names what is loaded', data.own.tag, 'Your 3 files');
  check('Data tab: it says once that the demo study was cleared', data.own.cleared, [
    'The demo study (Pilot study) was cleared to load your files.'
  ]);
  check('Data tab: the card counts what they support', data.own.card.say, 'This data supports 4 of 8 metrics.');
  check('Data tab: why the others cannot run, in R’s words', data.own.card.why, [
    'Grade 3+ Lab Abnormality Rate needs Raw_LB.csv, which is not loaded.',
    'Study Discontinuation Rate needs Raw_STUDCOMP.csv, which is not loaded.',
    'Treatment Discontinuation Rate needs Raw_SDRGCOMP.csv, which is not loaded.',
    'Screen Failure Rate needs Raw_ENROLL.csv, which is not loaded.',
    'The Groups table needs Raw_STUDY.csv and Raw_SITE.csv, which are not loaded.'
  ]);
  check('Data tab: step three reads “Open the RBQM tab”', data.own.step_three, [
    'Open the RBQM tab',
    '4 of 8 metrics supported · 0 of 18 charts ready'
  ]);
  check('Data tab: nothing to map for a raw file', data.own.step_two, 'Nothing to map: gsm’s raw files are kept as they are');
  await top(page);
  await shot(page, 'data-raw', {
    mark: [
      [1, '.sva-item[data-view="data"] .sva-tag', 'h'],
      [2, '.sva-notes .sva-note', 'r'],
      [3, `${card} .sva-support-head`, 'l'],
      [4, `${card} .sva-support-items`, 'l'],
      [5, `${card} .sva-support-why`, 'l'],
      [6, '.sva-step[data-step="open"] .sva-step-title', 'r'],
      [7, '.sva-file.sva-raw .sva-file-rows', 'r']
    ]
  });
  // The card's button opens the RBQM tab, and one press runs the four metrics.
  await page.locator(`${card} [data-action="open-view"]`).click();
  await settle(page);
  data.own.rbqm_before = await text(page, '.sva-rbqm-supports');
  data.own.file_boxes = await page.locator('.sva-rbqm-drop, .sva-rbqm-files, .sva-rbqm-input').count();
  await page.locator(`${control} .sva-action`).click();
  await waitRan(page, /^R ran 4 of 8 metrics/);
  await settle(page, 2000);
  data.own.done = await outcome(page);
  data.own.row = await rowOf(page);
  data.own.table = await overview(page);
  check('Data tab: the RBQM tab runs on the dropped files', data.own.done, /^R ran 4 of 8 metrics on the 3 loaded files in [\d.]+ seconds?\. The other 4 need data it does not have: change the data on the Data tab\. Run details$/);
  check('Data tab: the four that ran', data.own.row.filter((item) => /: ran$/.test(item)), [
    'Adverse Event Rate: ran',
    'Serious Adverse Event Rate: ran',
    'Non-Important Protocol Deviation Rate: ran',
    'Important Protocol Deviation Rate: ran'
  ]);
  check('Data tab: the RBQM tab has no file box', data.own.file_boxes, 0);
  await top(page);
  await shot(page, 'rbqm-own', {
    mark: [
      [1, '.sva-rbqm-status', 'l'],
      [2, '.sva-view-items', 'b']
    ]
  });

  // The RBQM study: nine raw file cards, and all eight metrics.
  await page.locator('.sva-item[data-view="data"]').click();
  await page.locator('.sva-side select.sva-study').selectOption('rbqm');
  await page.waitForFunction(() => document.querySelectorAll('.sva-loaded-name').length === 9);
  await settle(page, 1500);
  data.study = {
    tag: await text(page, '.sva-item[data-view="data"] .sva-tag'),
    raw_tags: await texts(page, '.sva-file.sva-raw .sva-tag'),
    card: await readCard()
  };
  check('Data tab: the RBQM study is nine raw files and supports all eight', [data.study.raw_tags.length, data.study.card.say], [
    9,
    'This data supports 8 of 8 metrics.'
  ]);
  await top(page);
  await shot(page, 'data-study', { mark: [[1, `${card} .sva-support-head`, 'l']] });

  // A study with its own column names: its ae.csv is still a standard file.
  await page.locator('.sva-side select.sva-study').selectOption('renamed');
  await page.waitForFunction(() => document.querySelectorAll('.sva-file.sva-raw').length === 0, null, { timeout: 30000 });
  await settle(page, 1500);
  data.renamed = {
    ae: await page
      .locator('.sva-loaded-file')
      .filter({ hasText: 'ae.csv' })
      .first()
      .evaluate((file) => [file.dataset.domain, file.querySelector('.sva-loaded-detail').textContent.trim()]),
    raw_cards: await page.locator('.sva-file.sva-raw').count(),
    tabs: (await tabsOf(page)).map((tab) => `${tab.name} ${tab.count}`)
  };
  check('Data tab: the “Renamed columns” study’s ae.csv is still read as the adverse events file', [data.renamed.ae[0], data.renamed.raw_cards], ['ae', 0]);
  check('Data tab: and that study’s tabs count what they counted in release 1.10', data.renamed.tabs, [
    'Labs and vitals 6 of 9',
    'ECG 0',
    'Adverse events 1 of 3',
    'Biomarkers 5',
    'RBQM not run'
  ]);

  // A raw file that is not CSV is refused with a sentence.
  await drop(page, [['Raw_AE.json', '[{"subjid":"1"}]', 'application/json']]);
  await settle(page, 1500);
  data.not_csv = {
    notes: await texts(page, '.sva-notes .sva-note'),
    files_left: await page.locator('.sva-loaded-file').count()
  };
  check(
    'Data tab: a raw file that is not CSV is refused with a sentence',
    data.not_csv.notes.at(-1),
    'Raw_AE.json is not a CSV file: the RBQM tab reads gsm’s raw files as CSV.'
  );
  await context.close();

  const phoneContext = await browser.newContext(phone);
  const phonePage = await phoneContext.newPage();
  await openApp(phonePage, '#data');
  await closeWelcome(phonePage);
  await scrollTo(phonePage, card, 70);
  data.phone_sideways = await sideways(phonePage);
  check('phone: the Data tab does not scroll sideways', data.phone_sideways <= 0, true);
  await shot(phonePage, 'phone-data');
  await phoneContext.close();
  save();
}

// ---------------------------------------------------------------- 6. the defects from the review of release 1.10
if (ONLY.includes('6')) {
  const context = await browser.newContext(desktop);
  const page = await context.newPage();
  // The docs home page's count of charts.
  await page.goto(BASE);
  const defects = (numbers.defects = {
    home_description: await page.locator('meta[name="description"]').getAttribute('content'),
    gallery_cards: await page.locator('.card-body').count()
  });
  await page.goto(BEFORE);
  defects.home_description_before = await page.locator('meta[name="description"]').getAttribute('content');
  check(
    'docs home page: its description counts thirteen charts',
    defects.home_description,
    /^Thirteen classic clinical-safety graphics/
  );

  // The Hepatic ALT Waterfall's titles, on the pilot study.
  const titles = '.sva-chart .hwf-title';
  if (await openBefore(page, '#hep-waterfall')) {
    await settle(page, 1500);
    await shot(page, 'waterfall-titles-110', { clip: { x: 320, y: 384, width: 920, height: 80 } });
  }
  await openApp(page, '#hep-waterfall');
  await closeWelcome(page);
  await settle(page, 1500);
  defects.waterfall = await page.locator(titles).evaluateAll((all) =>
    all.map((title) => {
      const rect = title.getBoundingClientRect();
      return {
        shown: title.innerText.replace(/\s+/g, ' ').trim(),
        hover: title.title,
        cut_short: [...title.querySelectorAll('.hwf-title-name')].some((name) => name.scrollWidth > name.clientWidth),
        count_whole: [...title.querySelectorAll('.hwf-title-n')].every((count) => count.scrollWidth <= count.clientWidth),
        left: Math.round(rect.left),
        right: Math.round(rect.right),
        top: Math.round(rect.top),
        bottom: Math.round(rect.bottom)
      };
    })
  );
  const overlap = (one, two) => one.left < two.right && two.left < one.right && one.top < two.bottom && two.top < one.bottom;
  defects.waterfall_overlaps = defects.waterfall.flatMap((one, index) =>
    defects.waterfall.slice(index + 1).filter((two) => overlap(one, two)).map((two) => [one.hover, two.hover])
  );
  check('waterfall: no title prints on another', defects.waterfall_overlaps, []);
  check(
    'waterfall: the long name is cut short and its count kept whole',
    defects.waterfall.filter((title) => /n=151/.test(title.hover)).map((title) => [title.cut_short, title.count_whole]),
    [
      [true, true],
      [true, true]
    ]
  );
  check(
    'waterfall: the long arm name is kept whole on hover, with its count',
    defects.waterfall.map((title) => title.hover).filter((hover) => /n=151/.test(hover)),
    [
      'CLD: Study Drug, CLD: Placebo, Xanomeline Low Dose, Xanomeline High Dose (n=151)',
      'CLD: Study Drug, CLD: Placebo, Xanomeline Low Dose, Xanomeline High Dose (n=151)'
    ]
  );
  const box = await around(page, [titles, `${titles} >> nth=3`, '.sva-chart .hwf-arm-caption >> nth=1'], 14);
  await shot(page, 'waterfall-titles', { clip: { x: 320, y: box.y, width: 920, height: 80 } });
  await context.close();

  // A phone's width: wide tables scroll inside their own boxes.
  const pages = [
    ['qt_app', 'demo/#qt-explorer', 'phone-qt', '.qt-table'],
    ['qt_docs', 'qt-explorer/', null, '.qt-table'],
    ['hep_docs', 'hep-explorer/', null, '.hep-migration'],
    ['api', 'histogram/api.html', 'phone-api', '.table-scroll']
  ];
  defects.phone = {};
  for (const [key, address, still, box] of pages) {
    const read = async (base, suffix) => {
      const phoneContext = await browser.newContext(phone);
      const phonePage = await phoneContext.newPage();
      await phonePage.goto(`${base}${address}`);
      if (/^demo/.test(address)) {
        await phonePage.evaluate('window.__safetyVizApp.ready');
        await closeWelcome(phonePage);
      }
      await phonePage.evaluate(() => document.fonts.ready);
      await settle(phonePage, 2500);
      const said = await phonePage.evaluate((selector) => {
        const wide = [...document.querySelectorAll('table')].sort(
          (one, two) => two.getBoundingClientRect().width - one.getBoundingClientRect().width
        )[0];
        const holder = wide.closest(selector) || wide.parentElement;
        return {
          laid_out: document.documentElement.scrollWidth,
          widest_table: Math.round(wide.getBoundingClientRect().width),
          its_box: Math.round(holder.clientWidth),
          box_scrolls: getComputedStyle(holder).overflowX
        };
      }, box);
      if (still) {
        const target = /^demo/.test(address) ? '.sva-chart table' : 'table.api';
        await phonePage.evaluate((selector) => {
          const node = document.querySelector(selector);
          if (node) window.scrollTo({ top: node.getBoundingClientRect().top + window.scrollY - 260, behavior: 'instant' });
        }, target);
        await settle(phonePage, 500);
        await shot(phonePage, `${still}${suffix}`);
      }
      await phoneContext.close();
      return said;
    };
    const beforeContext = await browser.newContext(desktop);
    const probe = await beforeContext.newPage();
    const is110 = await openBefore(probe);
    await beforeContext.close();
    if (is110) (defects.phone_before ||= {})[key] = await read(BEFORE, '-110');
    defects.phone[key] = await read(BASE, '');
  }
  check(
    'phone: each page lays out 390 pixels wide, with its wide table scrolling in its own box',
    Object.entries(defects.phone).map(([key, said]) => `${key}: ${said.laid_out}, ${said.box_scrolls}`),
    ['qt_app: 390, auto', 'qt_docs: 390, auto', 'hep_docs: 390, auto', 'api: 390, auto']
  );
  save();
}

// ---------------------------------------------------------------- 7. what GitHub says
// The questions the page puts to the reviewer are printed from the comments
// themselves, and the state of each requirement and task from its issue, read
// from GitHub's public API with no token.
if (ONLY.includes('7')) {
  const api = async (address) => {
    const response = await fetch(`https://api.github.com/repos/jwildfire/${address}`, {
      headers: { 'user-agent': 'sv-v1.11-demo-capture', accept: 'application/vnd.github+json' }
    });
    // Everything read here is public. GitHub answers 60 anonymous reads an hour from one address; past
    // that it says 403 or 429, and the same read is made with the `gh` command. Nothing is written.
    if (response.status === 403 || response.status === 429)
      return JSON.parse(execFileSync('gh', ['api', `repos/jwildfire/${address}`], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }));
    if (!response.ok) throw new Error(`GitHub said ${response.status} for ${address}`);
    return response.json();
  };
  // A run of this section alone starts its own checks again, so that one that was renamed does not stay behind.
  for (const name of Object.keys(checks)) if (/^(questions|footnote|demo path|standards|follow-up|nothing computed|defects: what the docs|status: the requirement row)/.test(name)) delete checks[name];
  const github = (numbers.github = { issues: {}, comments: {} });
  const issues = [
    ...[401, 402, 403, 404, 405, 406, 407, 408, 414, 415].map((n) => `obot.roadmap/issues/${n}`),
    ...[271, 287, 288].map((n) => `safety.viz/issues/${n}`)
  ];
  for (const address of issues) {
    const issue = await api(address);
    github.issues[address.replace('/issues/', '#')] = {
      state: issue.state,
      title: issue.title,
      labels: issue.labels.map((label) => label.name).filter((name) => /^status:/.test(name))
    };
  }
  for (const [key, address] of [
    ['footnote', 'safety.viz/issues/comments/6082538559'],
    ['answer', 'safety.viz/issues/comments/6098691387'],
    ['demo_path', 'safety.viz/issues/comments/6098514645'],
    ['status', 'obot.roadmap/issues/comments/6083229199']
  ]) {
    const comment = await api(address);
    github.comments[key] = { url: comment.html_url, by: comment.user.login, at: comment.created_at, body: comment.body };
  }
  const dev = await api('safety.viz/commits/dev');
  github.dev = { sha: dev.sha, date: dev.commit.committer.date, says: dev.commit.message.split('\n')[0] };
  // The footnote: what was asked, and what @jwildfire chose. The page prints both from the comments.
  check(
    'footnote: the question, as it was asked',
    github.comments.footnote.body,
    /what should the two links of the RBQM tab’s footnote open\?|what should the two links of the RBQM tab's footnote open\?/
  );
  const answer = github.comments.answer.body;
  github.answer = {
    chose: (answer.match(/choosing from the four above: "([^"]+)"/) || [])[1] || null,
    says: (answer.match(/the RBQM tab ends with ("[^"]+"), a link to (\S+) that opens in a new tab, in the same line a chart's footnote uses\./) || []).slice(1)
  };
  check('footnote: the answer is recorded on its task', github.answer.chose, 'One link, gsm.kri docs');
  check('footnote: what was built, as the answer says it', github.answer.says, ['"RBQM: gsm.kri documentation"', 'https://gilead-public.github.io/gsm.kri/']);
  check(
    'follow-up: a docs page for the RBQM tab is filed',
    github.issues['obot.roadmap#415'].title,
    /a page on the docs site for the RBQM tab/
  );
  check(
    'questions: the three status questions are still the ones the page prints',
    ['The Hepatic Explorer’s migration view loses its mark', 'The Time-to-Event Explorer’s reason is one sentence', 'The Participant Profile carries its label on its own page']
      .map((start) => github.comments.status.body.replace(/'/g, '’').includes(start)),
    [true, true, true]
  );
  // The keynote's demo path: its steps in the task's own words, the run that walked it, and its screenshots.
  const walk = (github.comments.demo_path.body.match(/^- The path it walks, in order, which is yours to change: (.+)\.\r?$/m) || [])[1] || '';
  const run = await api('safety.viz/actions/runs/38058471721');
  const shots = await api('safety.viz/contents/docs/evidence/basic-app/demo-path?ref=dev');
  github.demo_path = {
    steps: walk.split(/;\s+/).filter(Boolean),
    command: (github.comments.demo_path.body.match(/run by `(npm run [a-z-]+)`/) || [])[1] || null,
    run: { name: run.name, conclusion: run.conclusion, url: run.html_url, at: run.created_at },
    screenshots: shots.filter((file) => /\.png$/.test(file.name)).map((file) => file.name)
  };
  check('demo path: eight steps, in the task’s own words', github.demo_path.steps.length, 8);
  check('demo path: the command that runs it', github.demo_path.command, 'npm run demo-path');
  check('demo path: its run on GitHub passed', [github.demo_path.run.name, github.demo_path.run.conclusion], ['Demo path', 'success']);
  check('demo path: nine screenshots in the evidence folder', github.demo_path.screenshots.length, 9);
  // The pull requests the page names as merged, and the section the contributing guide gained.
  github.pulls = {};
  for (const number of [301, 303]) {
    const one = await api(`safety.viz/pulls/${number}`);
    github.pulls[number] = { merged: one.merged, at: one.merged_at, title: one.title, body: one.body };
  }
  // What the count fix says the dev site read before it: the capture for this page saw the same, and reads the fixed line now.
  github.count_fix = { read_before: (github.pulls[303].body.match(/said "([A-Z][a-z]+ classic clinical-safety graphics)"/) || [])[1] || null };
  delete github.pulls[301].body;
  delete github.pulls[303].body;
  check('defects: what the docs home page read before the count was fixed again', github.count_fix.read_before, 'Fourteen classic clinical-safety graphics');
  // The requirement row that says a chart below Exploratory draws its own label on its docs demo page.
  const matrix = Buffer.from((await api('safety.viz/contents/requirements/demo-app.md?ref=dev')).content, 'base64').toString('utf8');
  const row = (matrix.split('\n').find((line) => line.startsWith('| APP-TIER-025 |')) || '').split('|').map((cell) => cell.trim());
  github.requirement_rows = { 'APP-TIER-025': row[3] || null };
  check(
    'status: the requirement row that has a chart draw its own label on its docs demo page',
    /A chart below Exploratory still draws its own label on its demo page/.test(github.requirement_rows['APP-TIER-025'] || ''),
    true
  );
  check('standards: the pull requests the page calls merged are', [github.pulls[301].merged, github.pulls[303].merged], [true, true]);
  const guide = await api('safety.viz/contents/CONTRIBUTING.md?ref=dev');
  github.contributing = {
    headings: Buffer.from(guide.content, 'base64').toString('utf8').split('\n').filter((line) => /^## /.test(line)).map((line) => line.slice(3))
  };
  check('standards: the contributing guide has the section “Demo app conventions”', github.contributing.headings.includes('Demo app conventions'), true);
  // What changed since release 1.10 in the files R's answers are held to: the
  // rows desktop R returned, the R that runs the metrics, and gsm's copied workflows.
  const since = await api('safety.viz/compare/v1.10.0...dev');
  github.since_110 = {
    files: since.files.length,
    r_files: since.files
      .filter((file) => /^tests\/fixtures\/rbqm\/|^site\/rbqm\//.test(file.filename))
      .map((file) => ({ file: file.filename, added: file.additions, removed: file.deletions }))
  };
  check('nothing computed: the list of changed files is whole', github.since_110.files < 300, true);
  check(
    'nothing computed: desktop R’s rows, the R that runs the metrics and gsm’s workflows lost no line since release 1.10',
    github.since_110.r_files.map((one) => `${one.file}: ${one.removed} removed`),
    ['tests/fixtures/rbqm/expected-tab.json: 0 removed']
  );
  save();
}

save();
await browser.close();
const failed = Object.entries(checks).filter(([, result]) => !result.pass);
console.log(`${Object.keys(checks).length - failed.length} of ${Object.keys(checks).length} checks held.`);
if (failed.length) {
  console.log(`Failed: ${failed.map(([name]) => name).join('; ')}`);
  process.exit(1);
}
