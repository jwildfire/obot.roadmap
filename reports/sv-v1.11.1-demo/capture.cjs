// Captures and checks for the safety.viz v1.11.1 demo page: the note at the
// top of a card where R can be started, in each of its states, on the site
// under review; and the same pages on the released site, which is release
// 1.11.0, for the "before" of each pair.
//
//   node capture.cjs [out dir]        default: the folder this file is in
//
// Run from the root of an `npm ci` checkout of safety.viz, for its Playwright.
// Stills go to <out dir>/media. Everything read from the live pages goes to
// <out dir>/capture.json, with a check of each sentence the demo page quotes
// against what the live page shows. The script exits 1 when a check fails.
// Then `node build.cjs` writes index.html from capture.json.
//
//   BASE=<the site under review>   default: the dev site
//   WAIT_MINUTES=<n>               how long to wait for BASE to show the release
//                                  under review before stopping (default 20)
//   FALLBACK=<a second site>       used when BASE never shows it; none by default
//   BEFORE=<the site before it>    default: the released site
//   ONLY=first,blue,...            some sections; the others' reads are kept
//
// Sections: first, blue, amber, views, starting, failed, ready, closed, rbqm,
// rbqm-starting, rbqm-failed, rbqm-done, rbqm-states, profile, cannot, phone.
//
// A run of some sections stops if the site has moved since the run of every
// section: the page quotes one version and one commit, and they are that run's.
//
// Once release 1.11.1 is on the released site there is no "before" left to
// capture: the script sees the note there, says so, and keeps the stills and
// reads of release 1.11.0 it already has. To show the released site as
// "after" then, run every section with
//   BASE=https://jwildfire.github.io/safety.viz/demo/
const fs = require('node:fs');
const path = require('node:path');

const { chromium } = require(
  require.resolve('playwright', { paths: [process.cwd(), '/Users/jwildfire/Documents/obot2/safety.viz'] })
);

const DEV = 'https://jwildfire.github.io/safety.viz/dev/demo/';
const BASE_ASKED = process.env.BASE || DEV;
const FALLBACK = process.env.FALLBACK || null;
const WAIT_MINUTES = Number(process.env.WAIT_MINUTES ?? 20);
const BEFORE = process.env.BEFORE || 'https://jwildfire.github.io/safety.viz/demo/';
const out = process.argv[2] || __dirname;
const media = path.join(out, 'media');
fs.mkdirSync(media, { recursive: true });
const ALL = [
  'first',
  'blue',
  'amber',
  'views',
  'starting',
  'failed',
  'ready',
  'closed',
  'rbqm',
  'rbqm-starting',
  'rbqm-failed',
  'rbqm-done',
  'rbqm-states',
  'profile',
  'cannot',
  'phone'
];
const ONLY = process.env.ONLY ? process.env.ONLY.split(',') : ALL;
const want = (id) => ONLY.includes(id);
const file = path.join(out, 'capture.json');
const read = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : {};
// A run of every section starts its record of checks again, so a check that
// was renamed or dropped does not stay behind. Stills and reads of release
// 1.11.0 are kept, for the day the released site is no longer that release.
if (!process.env.ONLY) {
  read.checks = {};
  for (const key of ['marks', 'stills'])
    read[key] = Object.fromEntries(Object.entries(read[key] || {}).filter(([name]) => /-1110$/.test(name)));
}
const save = () => fs.writeFileSync(file, `${JSON.stringify(read, null, 2)}\n`);

// What the demo page says, held to what the live page shows.
const checks = (read.checks ||= {});
const check = (name, actual, expected) => {
  const pass =
    expected instanceof RegExp
      ? expected.test(String(actual))
      : JSON.stringify(actual) === JSON.stringify(expected);
  checks[name] = pass ? { pass } : { pass, actual, expected: String(expected) };
  console.log(pass ? 'held  ' : 'FAILED', name);
  if (!pass) console.error('       ', JSON.stringify(actual), '!=', String(expected));
};

// The sentences the demo page quotes. Each is checked against the live app,
// and the page prints what the app said, not these.
const SAID = {
  welcome:
    /^You are looking at the CDISC pilot study, a public demo: 254 participants, 18 charts on five tabs\. To use your own files, open Data\. They are read in this browser and never leave it\./,
  blueOff:
    'This chart’s p-values need R. Start R to add them: about 13 MB, downloaded once. The study’s data stays in this browser.',
  amberOff:
    'This chart cannot be drawn without R. Start R to draw it: about 13 MB, downloaded once. The study’s data stays in this browser.',
  blueStarting: 'R is starting. The p-values appear under the chart when it is ready. 13 MB',
  amberStarting: 'R is starting. The chart is drawn when it is ready. 13 MB',
  blueFailed:
    'R did not start, so this chart has no p-values. Try again The reason is behind Why, at the top right.',
  amberFailed:
    'R did not start, so this chart cannot be drawn. Try again The reason is behind Why, at the top right.',
  lineNote: 'Statistics need R. Start R, in the note above.',
  lineControl: 'Statistics need R. Start R, at the top right.',
  lineFailed: 'R did not start, so there is no test. Try again, in the note above.',
  rbqmOff:
    'The site metrics cannot be worked out without R. Start R to run them: about 55 MB, downloaded once. The study’s data stays in this browser.',
  rbqmStarting: 'R is starting. The metrics run by themselves when it is ready. Step 1 of 6',
  rbqmFailed: 'R did not start, so no metric was run. Try again The reason is behind Why, at the top right.',
  rbqmReady: 'R is ready. Run the metrics on what is loaded now.',
  rbqmReadyBefore: 'R is ready. Run the metrics from the R chip, at the top right.',
  noFiles:
    'Nothing the metrics can run on is loaded. Load a study on the Data tab: the metrics run on its subject-level and adverse events files. Or load gsm raw files there.',
  nonePlaced:
    'None of the loaded files is a subject-level or adverse events file, or a gsm raw file, so there is nothing for R to run.',
  supports: 'The loaded study supports 3 of 8 metrics. Change the data on the Data tab.',
  singleFile:
    'The RBQM tab needs R, and this file loads nothing, so it cannot start R. The hosted demo app can start R in your browser.',
  profile: /^The participant profile opens beside a chart when you select a participant in it\. /,
  noFile: 'No file loaded for: Adverse events.',
  notMapped: 'Not mapped yet: Result.'
};

const NOTE = '.sva-chart > .sva-chart-note .sva-callout';
const RBQM_NOTE = '.sva-rbqm .sva-rbqm-status.sva-callout';
const CONTROL = '.sva-charts > .sva-r';
const LINE = '.sva-chart .bv-stat-result';
const R_HOSTS = /r-wasm\.org/;

const desktop = { viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1.5 };
const phone = { viewport: { width: 390, height: 844 }, deviceScaleFactor: 1.5, hasTouch: true, isMobile: true };
const settle = (page, ms = 700) => page.waitForTimeout(ms);
const squash = (text) => (text || '').replace(/\s+/g, ' ').trim();

/** What one note says and is: its sentence, its kind, its button, its cross, its ring and its colour. */
const noteAt = (page, selector) =>
  page.evaluate((sel) => {
    const node = document.querySelector(sel);
    if (!node || node.closest('[hidden]')) return null;
    const flat = (text) => (text || '').replace(/\s+/g, ' ').trim();
    const say = node.querySelector('.sva-callout-say');
    const button = node.querySelector('button.sva-action');
    const meta = node.querySelector('.sva-callout-meta');
    const style = getComputedStyle(node);
    return {
      says: flat((say || node).textContent),
      kind: node.dataset.kind || (node.classList.contains('sva-warning') ? 'warning' : 'info'),
      button: button ? flat(button.textContent) : null,
      meta: meta ? flat(meta.textContent) : null,
      cross: Boolean(node.querySelector('.sva-close')),
      ring: Boolean(node.querySelector('.sva-spin')),
      edge: style.borderLeftColor,
      width: Math.round(node.getBoundingClientRect().width)
    };
  }, selector);
/** The words of the first element matching a selector, or null. */
const wordsAt = (page, selector) =>
  page.evaluate((sel) => {
    const node = document.querySelector(sel);
    return node ? node.textContent.replace(/\s+/g, ' ').trim() : null;
  }, selector);
/** The control at the right end of the chart names, as its parts say it: "Statistics need R · 13 MB, once · Start R". */
const controlSaid = (page) =>
  page.evaluate((sel) => {
    const row = document.querySelector(`${sel} .sva-r-row`);
    if (!row) return null;
    return [...row.children]
      .map((part) => part.textContent.replace(/[▾\s]+$/g, '').replace(/\s+/g, ' ').trim())
      .filter(Boolean)
      .join(' · ');
  }, CONTROL);
/** A colour as the page computed it, named: blue, amber or red. */
const hue = (rgb) => {
  const [r, g, b] = (rgb.match(/\d+/g) || []).map(Number);
  if (r > g * 1.5 && b > g * 1.5) return 'purple';
  if (b > r && b > g) return 'blue';
  if (r > g && g > b && g - b > 40) return 'amber';
  if (r > g && r > b) return 'red';
  return rgb;
};

// A still, and where on it each numbered marker of the demo page sits: a
// percentage of the still's width and height, read from the element's own box.
const marks = (read.marks ||= {});
const sizes = (read.stills ||= {});
const shot = async (page, name, { clip, mark = [] } = {}) => {
  await page.evaluate(() => document.fonts.ready);
  const view = clip || { x: 0, y: 0, ...page.viewportSize() };
  const placed = [];
  for (const [n, selector, anchor = 'l'] of mark) {
    const box = await page.locator(selector).first().boundingBox();
    if (!box) {
      check(`still ${name}: marker ${n} has its element`, selector, 'an element on the page');
      continue;
    }
    const gap = 18;
    const [x, y] = {
      l: [box.x - gap, box.y + box.height / 2],
      r: [box.x + box.width + gap, box.y + box.height / 2],
      t: [box.x + box.width / 2, box.y - gap],
      b: [box.x + box.width / 2, box.y + box.height + gap],
      // On the thing's own left edge, for a thing that runs the width of its card.
      in: [box.x + 2, box.y + box.height / 2],
      // On its top edge, a little in from the left: for a note on a phone, where its left edge is the screen's.
      top: [box.x + 40, box.y]
    }[anchor];
    const pct = (value, of) => Math.min(98, Math.max(2, Math.round((value / of) * 1000) / 10));
    placed.push({ n, x: pct(x - view.x, view.width), y: pct(y - view.y, view.height) });
  }
  marks[name] = placed;
  await page.screenshot({
    path: path.join(media, `${name}.jpg`),
    type: 'jpeg',
    quality: 78,
    ...(clip ? { clip } : {})
  });
  const scale = desktop.deviceScaleFactor;
  sizes[name] = { width: Math.round(view.width * scale), height: Math.round(view.height * scale) };
  console.log('captured', name);
};
/** The box around some elements, padded and kept inside the viewport, for a still of one part of a page. */
const around = async (page, selectors, pad = 12) => {
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

let browser;
/**
 * The app on one site at one view, in a browser context of its own with an
 * empty cache. `hold` keeps every request to R's addresses waiting that many
 * milliseconds, so R stays starting; `block` refuses them, so R does not start.
 */
const open = async (base, view, { size = desktop, hold = 0, block = false } = {}) => {
  const context = await browser.newContext(size);
  const page = await context.newPage();
  // How many times the page has asked anything of R's addresses.
  let asked = 0;
  page.on('request', (request) => {
    if (R_HOSTS.test(request.url())) asked += 1;
  });
  page.askedOfR = () => asked;
  if (block) await page.route(R_HOSTS, (route) => route.abort());
  if (hold)
    await page.route(R_HOSTS, async (route) => {
      await new Promise((resolve) => setTimeout(resolve, hold));
      route.continue().catch(() => {});
    });
  await page.goto(`${base}#${view}`, { waitUntil: 'networkidle' });
  await page.evaluate('window.__safetyVizApp.ready');
  await settle(page, 1200);
  return { page, context };
};
/**
 * The released site at one view, with its line on first open closed: every
 * still of release 1.11.0 but the first screen's shows the page under it.
 */
const openBefore = async (view, options) => {
  const opened = await open(BEFORE, view, options);
  const cross = opened.page.locator('.sva-welcome .sva-close');
  if ((await cross.count()) && (await cross.isVisible())) await cross.click();
  await settle(opened.page, 500);
  return opened;
};
/** Another view of the same visit: the address changes and the page does not load again. */
const go = async (page, view) => {
  await page.evaluate((id) => {
    window.location.hash = `#${id}`;
  }, view);
  await settle(page, 1300);
};
const versionOf = async (page) => {
  const foot = await page.evaluate(() => document.body.textContent.replace(/\s+/g, ' '));
  const found = foot.match(/safety\.viz (\d+\.\d+\.\d+)/);
  return found ? `safety.viz ${found[1]}` : null;
};
/** The RBQM tab's line under its note, as it says and looks: its words, its size and its colour. */
const supportsAt = (page) =>
  page.evaluate(() => {
    const line = document.querySelector('.sva-rbqm-supports');
    if (!line) return null;
    const style = getComputedStyle(line);
    return { says: line.textContent.replace(/\s+/g, ' ').trim(), size: style.fontSize, colour: style.color };
  });
/**
 * Whether a site shows the release under review: the note on a biomarker
 * chart, and the RBQM tab's line under its note small again, which the fix of
 * the release candidate's review put right. Answers with the app's version line.
 */
const isReady = async (base) => {
  const { page, context } = await open(`${base}?t=${Date.now()}`, 'cross-tab');
  const note = (await page.locator(NOTE).count()) > 0;
  await go(page, 'rbqm');
  const line = await supportsAt(page);
  const version = await versionOf(page);
  await context.close();
  return note && line && line.size === '14.72px' ? { version } : false;
};
const hasNote = async (base) => {
  const { page, context } = await open(`${base}?t=${Date.now()}`, 'cross-tab');
  const there = (await page.locator(NOTE).count()) > 0;
  await context.close();
  return there;
};

(async () => {
  browser = await chromium.launch();

  // Which site is "after": the one asked for, once it shows the release under review.
  let BASE = BASE_ASKED;
  const until = Date.now() + WAIT_MINUTES * 60000;
  let shows = await isReady(BASE).catch(() => false);
  while (!shows && Date.now() < until) {
    console.log(`${new Date().toISOString()} ${BASE} does not show the release under review yet; looking again in a minute.`);
    await new Promise((resolve) => setTimeout(resolve, 60000));
    shows = await isReady(BASE).catch(() => false);
  }
  if (!shows && FALLBACK) {
    console.log(`${BASE} did not show it in ${WAIT_MINUTES} minutes: using ${FALLBACK}.`);
    BASE = FALLBACK;
    shows = await isReady(BASE).catch(() => false);
  }
  if (!shows) throw new Error(`${BASE} did not show the release under review in ${WAIT_MINUTES} minutes.`);
  // What GitHub says, read from its public API with no token. It writes nothing.
  const github = async (address) => {
    try {
      const answer = await fetch(`https://api.github.com/repos/jwildfire/safety.viz/${address}`, {
        headers: { accept: 'application/vnd.github+json' }
      });
      return answer.ok ? await answer.json() : null;
    } catch {
      return null;
    }
  };
  // The commit the site's branch stood at: dev for the dev site, main for the released site.
  const branch = BASE === DEV ? 'dev' : BASE === BEFORE ? 'main' : null;
  const tip = branch ? await github(`commits/${branch}`) : null;
  const commit = tip ? tip.sha : null;
  // The pull request of the fixes the release candidate's review asked for, if there is one.
  const pulls = await github('pulls?head=jwildfire:328-rc1-review-fixes&state=all');
  if (Array.isArray(pulls))
    read.github = { fix_pull: pulls.length ? { number: pulls[0].number, url: pulls[0].html_url, title: pulls[0].title } : null };
  const site = {
    after: BASE,
    after_is:
      BASE === BEFORE
        ? 'the released site'
        : BASE === DEV
          ? 'the dev site'
          : /\/pr\/\d+\//.test(BASE)
            ? 'the pull request’s preview'
            : BASE,
    before: BEFORE,
    captured: new Date().toISOString(),
    branch,
    commit,
    version: shows.version
  };
  if (process.env.ONLY) {
    // The page quotes one site, one version and one commit: those of the run of every section.
    const was = read.site || {};
    for (const key of ['after', 'version', 'commit'])
      if (was[key] !== site[key])
        throw new Error(`The site has moved since every section was run (${key}: ${was[key]} then, ${site[key]} now). Run every section.`);
  } else {
    read.site = site;
  }
  // The released site, while it is still release 1.11.0: it has no note at the top of a biomarker chart.
  const beforeIs1110 = !(await hasNote(BEFORE));
  if (!beforeIs1110)
    console.log(`${BEFORE} is no longer release 1.11.0: its stills and reads are kept as they are.`);

  // ------------------------------------------------------------ the first screen
  if (want('first')) {
    if (beforeIs1110) {
      const { page, context } = await open(BEFORE, '');
      read.first_before = {
        version: await versionOf(page),
        welcome: squash((await wordsAt(page, '.sva-welcome')) || '').replace(/\s*×$/, ''),
        welcome_edge: hue(await page.evaluate(() => getComputedStyle(document.querySelector('.sva-welcome')).borderLeftColor)),
        welcome_edge_rgb: await page.evaluate(() => getComputedStyle(document.querySelector('.sva-welcome')).borderLeftColor),
        chart_top: Math.round((await page.locator('.sva-chart').first().boundingBox()).y)
      };
      check('release 1.11.0: the line on first open', read.first_before.welcome, SAID.welcome);
      await shot(page, 'first-1110', { mark: [[1, '.sva-welcome', 'in']] });
      await context.close();
    }
    const { page, context } = await open(BASE, '');
    read.first = {
      version: await versionOf(page),
      welcome: await page.locator('.sva-welcome').count(),
      title: await page.title(),
      data_tab: await wordsAt(page, '.sva-item[data-view="data"], .sva-tab[data-view="data"]'),
      chart_top: Math.round((await page.locator('.sva-chart').first().boundingBox()).y)
    };
    check('no line on first open', read.first.welcome, 0);
    check('the app’s footer names its version', read.first.version, /^safety\.viz \d+\.\d+\.\d+$/);
    check('the version is the one read when the capture began', read.first.version, read.site.version);
    await shot(page, 'first');
    await page.click('.sva-appstatus');
    await settle(page, 400);
    const panel = (await wordsAt(page, '.sv-status-panel')) || '';
    // The label's own word: the first text of the control, before its hover line and its panel.
    read.first.status_label = await page.evaluate(() => {
      const walker = document.createTreeWalker(document.querySelector('.sva-appstatus'), NodeFilter.SHOW_TEXT);
      let node = walker.nextNode();
      while (node && !node.textContent.trim()) node = walker.nextNode();
      return node ? node.textContent.trim() : null;
    });
    check('the app’s status label', read.first.status_label, 'Exploratory');
    read.first.status_counts = (panel.match(/\d+ charts are Exploratory\. \d+ charts and the RBQM tab are Experimental/) || [null])[0];
    check('the app is still Exploratory, and five charts and the RBQM tab Experimental', read.first.status_counts, '13 charts are Exploratory. 5 charts and the RBQM tab are Experimental');
    await go(page, 'data');
    read.first.study = await page.evaluate(() => {
      const select = document.querySelector('select.sva-study');
      return select ? select.options[select.selectedIndex].textContent.trim() : null;
    });
    read.first.study_note = await wordsAt(page, '.sva-study-note');
    check('the Data tab says whose data the pilot study is', read.first.study_note, /^254 participants from the CDISC pilot study.* 110 synthetic liver and kidney participants/);
    await context.close();
    save();
  }

  // ------------------------------------------------------------ the blue note
  if (want('blue')) {
    if (beforeIs1110) {
      const { page, context } = await openBefore('association-scatter');
      read.blue_before = {
        note: await page.locator(NOTE).count(),
        line: await wordsAt(page, LINE),
        control: await controlSaid(page)
      };
      check('release 1.11.0: no note on a biomarker chart', read.blue_before.note, 0);
      check('release 1.11.0: the chart’s line points at the control', read.blue_before.line, SAID.lineControl);
      await shot(page, 'blue-1110', {
        mark: [
          [1, CONTROL, 'b'],
          [2, LINE, 'l']
        ]
      });
      await context.close();
    }
    const { page, context } = await open(BASE, 'association-scatter');
    read.blue = { charts: {} };
    for (const view of ['association-scatter', 'cross-tab', 'group-comparison']) {
      if (view !== 'association-scatter') await go(page, view);
      const note = await noteAt(page, NOTE);
      read.blue.charts[view] = { name: (await page.title()).split(' · ')[0], note, line: await wordsAt(page, LINE) };
      check(`${view}: the note’s sentence`, note && note.says, SAID.blueOff);
      check(`${view}: the note is information`, note && [note.kind, hue(note.edge)], ['info', 'blue']);
      check(`${view}: the button in the sentence`, note && note.button, 'Start R');
      check(`${view}: the note has a cross`, note && note.cross, true);
    }
    await go(page, 'association-scatter');
    read.blue.line = await wordsAt(page, LINE);
    read.blue.control = await controlSaid(page);
    read.blue.foot = await wordsAt(page, '.sva-chart .bv-foot-line');
    read.blue.asked_of_r = page.askedOfR();
    check('before a press the page asks nothing of R’s addresses', read.blue.asked_of_r, 0);
    check('the chart is drawn by bio.viz 0.3.0', read.blue.foot, /by bio\.viz 0\.3\.0\./);
    read.blue.control_title = await page.evaluate(
      (sel) => (document.querySelector(`${sel} [title]`) || document.querySelector(sel)).getAttribute('title'),
      CONTROL
    );
    check('the chart’s line points at the note', read.blue.line, SAID.lineNote);
    check('the control at the top right is as it was', read.blue.control, (read.blue_before || {}).control || read.blue.control);
    await shot(page, 'blue', {
      mark: [
        [1, NOTE, 'in'],
        [2, `${NOTE} .sva-note-start`, 't'],
        [3, `${NOTE} .sva-close`, 'b'],
        [4, CONTROL, 'b'],
        [5, LINE, 'l']
      ]
    });
    await context.close();
    save();
  }

  // ------------------------------------------------------------ the amber note
  if (want('amber')) {
    if (beforeIs1110) {
      const { page, context } = await openBefore('correlation-matrix');
      read.amber_before = {
        note: await page.locator(NOTE).count(),
        line: await wordsAt(page, LINE),
        line_top: Math.round((await page.locator(LINE).first().boundingBox()).y)
      };
      check('release 1.11.0: no note on the correlation matrix', read.amber_before.note, 0);
      await shot(page, 'amber-1110', { mark: [[1, CONTROL, 'b']] });
      await context.close();
    }
    const { page, context } = await open(BASE, 'correlation-matrix');
    read.amber = { charts: {} };
    for (const view of ['correlation-matrix', 'biomarker-screen']) {
      if (view !== 'correlation-matrix') await go(page, view);
      const note = await noteAt(page, NOTE);
      read.amber.charts[view] = { name: (await page.title()).split(' · ')[0], note, line: await wordsAt(page, LINE) };
      check(`${view}: the note’s sentence`, note && note.says, SAID.amberOff);
      check(`${view}: the note is a warning`, note && [note.kind, hue(note.edge)], ['warning', 'amber']);
      check(`${view}: the button in the sentence`, note && note.button, 'Start R');
      check(`${view}: the note has no cross`, note && note.cross, false);
    }
    await go(page, 'correlation-matrix');
    read.amber.line_top = Math.round((await page.locator(LINE).first().boundingBox()).y);
    await shot(page, 'amber', {
      mark: [
        [1, NOTE, 'in'],
        [2, `${NOTE} .sva-note-start`, 't'],
        [3, CONTROL, 'b']
      ]
    });
    await context.close();
    save();
  }

  // ------------------------------------------------------------ each of the six views, before R
  if (want('views')) {
    const { page, context } = await open(BASE, 'group-comparison');
    const strip = { x: 0, y: 0, width: 1280, height: 268 };
    read.views = {};
    for (const view of ['group-comparison', 'association-scatter', 'cross-tab', 'correlation-matrix', 'biomarker-screen']) {
      await go(page, view);
      const note = await noteAt(page, NOTE);
      read.views[view] = { name: (await page.title()).split(' · ')[0], kind: note && note.kind, colour: note && hue(note.edge), says: note && note.says };
      await shot(page, `view-${view}`, { clip: strip });
    }
    await go(page, 'rbqm');
    let note = await noteAt(page, RBQM_NOTE);
    read.views.rbqm = { name: 'RBQM, the overview', kind: note && note.kind, colour: note && hue(note.edge), says: note && note.says };
    await shot(page, 'view-rbqm', { clip: strip });
    // A metric's page that can run, and one the loaded study cannot support.
    await page.click('.sva-item[data-item="kri0001"]');
    await settle(page, 1200);
    note = await noteAt(page, RBQM_NOTE);
    read.views['rbqm-metric'] = { name: `RBQM, ${await wordsAt(page, '.sva-rbqm-metric-name')}`, kind: note && note.kind, colour: note && hue(note.edge), says: note && note.says };
    check('a metric’s page opens on the same note', note && note.says, SAID.rbqmOff);
    await shot(page, 'view-rbqm-metric', { clip: strip });
    await page.click('.sva-item[data-item="kri0003"]');
    await settle(page, 1200);
    const why = await noteAt(page, '.sva-rbqm .sva-rbqm-whybox');
    read.views['rbqm-cannot'] = { name: `RBQM, ${await wordsAt(page, '.sva-rbqm-metric-name')}`, kind: why && why.kind, colour: why && hue(why.edge), says: why && why.says, start: await page.locator('.sva-rbqm .sva-note-start').count() };
    check('a metric the data cannot support says why in an amber note', why && [why.kind, hue(why.edge)], ['warning', 'amber']);
    await shot(page, 'view-rbqm-cannot', { clip: strip });
    await context.close();
    const counts = Object.values(read.views).reduce((all, one) => ({ ...all, [one.colour]: (all[one.colour] || 0) + 1 }), {});
    check('six views and two metric pages: three blue, five amber', counts, { blue: 3, amber: 5 });
    if (beforeIs1110) {
      const before = await openBefore('rbqm');
      await before.page.click('.sva-item[data-item="kri0003"]');
      await settle(before.page, 1200);
      read.views_before = await before.page.evaluate(() => {
        const node = document.querySelector('.sva-rbqm .sva-rbqm-whybox, .sva-rbqm .sva-rbqm-why');
        return node ? { says: node.textContent.replace(/\s+/g, ' ').trim(), classes: node.className, edge: getComputedStyle(node).borderLeftColor } : null;
      });
      if (read.views_before) read.views_before.colour = hue(read.views_before.edge);
      await before.context.close();
    }
    save();
  }

  // ------------------------------------------------------------ while R starts
  if (want('starting')) {
    const { page, context } = await open(BASE, 'association-scatter', { hold: 30000 });
    await page.click(`${NOTE} .sva-note-start`);
    await settle(page, 3300);
    const note = await noteAt(page, NOTE);
    read.starting = { note, control: await controlSaid(page), line: await wordsAt(page, LINE) };
    check('while R starts: the note’s sentence', note && note.says, SAID.blueStarting);
    check('while R starts: blue, a ring, no button, no cross', note && [note.kind, hue(note.edge), note.ring, note.button, note.cross], ['info', 'blue', true, null, false]);
    check('while R starts: the note counts no seconds', note && note.meta, '13 MB');
    check('while R starts: the control counts the seconds', read.starting.control, /^Starting R · 13 MB · \d+ s$/);
    await shot(page, 'starting', {
      mark: [
        [1, NOTE, 'in'],
        [2, `${NOTE} .sva-callout-meta`, 'b'],
        [3, CONTROL, 'b'],
        [4, LINE, 'l']
      ]
    });
    await context.close();
    // A chart that cannot be drawn without R says so while R starts. Here R is started from the control.
    const amber = await open(BASE, 'correlation-matrix', { hold: 30000 });
    await amber.page.click(`${CONTROL} button.sva-action`);
    await settle(amber.page, 1500);
    read.starting.amber = await noteAt(amber.page, NOTE);
    check('while R starts, on a chart that needs R: the note’s sentence', read.starting.amber && read.starting.amber.says, SAID.amberStarting);
    check('the control’s Start R turns the note too', read.starting.amber && [read.starting.amber.ring, read.starting.amber.button], [true, null]);
    await amber.context.close();
    save();
  }

  // ------------------------------------------------------------ when R did not start
  if (want('failed')) {
    const { page, context } = await open(BASE, 'association-scatter', { block: true });
    await page.click(`${NOTE} .sva-note-start`);
    await page.waitForSelector('.sva-r[data-phase=failed]', { timeout: 90000 });
    await settle(page);
    const note = await noteAt(page, NOTE);
    read.failed = {
      note,
      line: await wordsAt(page, LINE),
      control: await wordsAt(page, `${CONTROL} .sva-r-say`),
      control_colour: hue(await page.evaluate((sel) => getComputedStyle(document.querySelector(`${sel} .sva-r-say`)).color, CONTROL)),
      control_buttons: await page.locator(`${CONTROL} button`).evaluateAll((all) => all.map((b) => b.textContent.replace(/[▾\s]+$/g, '').trim()))
    };
    check('R did not start: the note’s sentence', note && note.says, SAID.blueFailed);
    check('R did not start: amber, Try again inside the sentence', note && [note.kind, hue(note.edge), note.button, note.ring], ['warning', 'amber', 'Try again', false]);
    check('R did not start: the chart’s line', read.failed.line, SAID.lineFailed);
    check('R did not start: the control says so in red', [read.failed.control, read.failed.control_colour], ['R did not start', 'red']);
    check('R did not start: the control keeps Try again and Why', read.failed.control_buttons, ['Try again', 'Why']);
    await shot(page, 'failed', {
      mark: [
        [1, NOTE, 'in'],
        [2, `${NOTE} .sva-note-start`, 't'],
        [3, `${CONTROL} .sva-r-why`, 'b'],
        [4, LINE, 'l']
      ]
    });
    await page.click(`${CONTROL} .sva-r-why`);
    await settle(page, 500);
    read.failed.why = await page.evaluate(() => {
      const box = document.querySelector('.sva-r-panel');
      if (!box) return null;
      const flat = (node) => (node ? node.textContent.replace(/\s+/g, ' ').trim() : null);
      return { heading: flat(box.querySelector('h1,h2,h3,h4,.sva-r-heading')), reason: flat(box.querySelector('p')), all: flat(box) };
    });
    check('R did not start: the reason is behind Why', read.failed.why && read.failed.why.all, /could not download R from webr\.r-wasm\.org/);
    await shot(page, 'failed-why', { clip: await around(page, [CONTROL, '.sva-r-panel'], 14) });
    await context.close();
    const amber = await open(BASE, 'correlation-matrix', { block: true });
    await amber.page.click(`${NOTE} .sva-note-start`);
    await amber.page.waitForSelector('.sva-r[data-phase=failed]', { timeout: 90000 });
    await settle(amber.page);
    read.failed.amber = await noteAt(amber.page, NOTE);
    check('R did not start, on a chart that needs R: the note’s sentence', read.failed.amber && read.failed.amber.says, SAID.amberFailed);
    await amber.context.close();
    // The same with the browser switched offline once the page has loaded: the try-it step of the demo page.
    const offline = await open(BASE, 'cross-tab');
    await offline.context.setOffline(true);
    await offline.page.click(`${NOTE} .sva-note-start`);
    await offline.page.waitForSelector('.sva-r[data-phase=failed]', { timeout: 90000 });
    await settle(offline.page);
    read.failed.offline = await noteAt(offline.page, NOTE);
    check('offline after the page has loaded: the same note', read.failed.offline && read.failed.offline.says, SAID.blueFailed);
    await offline.context.close();
    save();
  }

  // ------------------------------------------------------------ once R is ready
  if (want('ready')) {
    const { page, context } = await open(BASE, 'association-scatter');
    const pressed = Date.now();
    await page.click(`${NOTE} .sva-note-start`);
    await page.waitForSelector('.sva-r[data-phase=ready]', { timeout: 180000 });
    await page.waitForFunction((sel) => /p [=<]/.test((document.querySelector(sel) || {}).textContent || ''), LINE, { timeout: 60000 });
    const seconds = Math.round((Date.now() - pressed) / 100) / 10;
    await settle(page, 1200);
    read.ready = {
      seconds,
      note: await noteAt(page, NOTE),
      chip: squash(await wordsAt(page, `${CONTROL} .sva-r-ready`)).replace(/[▾\s]+$/g, ''),
      line: await wordsAt(page, LINE),
      others: {}
    };
    check('R is ready: no note', read.ready.note, null);
    check('R is ready: the control is a chip', read.ready.chip, 'R ready');
    check('R is ready: R’s test is under the chart', read.ready.line, /^Pearson's product-moment correlation: p [=<] [\d.]+ \(n = \d+\)\. Exploratory, unadjusted\.$/);
    await shot(page, 'ready', {
      mark: [
        [1, `${CONTROL} .sva-r-ready`, 'b'],
        [2, LINE, 'l']
      ]
    });
    for (const view of ['cross-tab', 'group-comparison', 'correlation-matrix', 'biomarker-screen']) {
      await go(page, view);
      await settle(page, 2500);
      read.ready.others[view] = { note: await noteAt(page, NOTE), line: await wordsAt(page, LINE) };
      check(`R is ready: no note on ${view}`, read.ready.others[view].note, null);
    }
    await shot(page, 'ready-screen');
    await context.close();
    if (beforeIs1110) {
      const before = await openBefore('association-scatter');
      await before.page.click(`${CONTROL} button.sva-action`);
      await before.page.waitForSelector('.sva-r[data-phase=ready]', { timeout: 180000 });
      await before.page.waitForFunction((sel) => /p [=<]/.test((document.querySelector(sel) || {}).textContent || ''), LINE, { timeout: 60000 });
      read.ready_before = { line: await wordsAt(before.page, LINE) };
      await go(before.page, 'cross-tab');
      await settle(before.page, 2500);
      read.ready_before.cross_tab = await wordsAt(before.page, LINE);
      await before.context.close();
    }
    if (read.ready_before) {
      check('R’s test on the Association scatter is release 1.11.0’s', read.ready.line, read.ready_before.line);
      check('R’s test on the Cross-tabulation is release 1.11.0’s', read.ready.others['cross-tab'].line, read.ready_before.cross_tab);
    }
    save();
  }

  // ------------------------------------------------------------ the blue note, closed
  if (want('closed')) {
    const { page, context } = await open(BASE, 'association-scatter');
    await page.click(`${NOTE} .sva-close`);
    await settle(page);
    read.closed = { note: await noteAt(page, NOTE), line: await wordsAt(page, LINE), control: await controlSaid(page), others: {} };
    check('closed: the note is gone', read.closed.note, null);
    check('closed: the chart’s line points at the control again', read.closed.line, SAID.lineControl);
    await shot(page, 'closed', {
      mark: [
        [1, CONTROL, 'b'],
        [2, LINE, 'l']
      ]
    });
    for (const view of ['cross-tab', 'group-comparison', 'correlation-matrix', 'biomarker-screen']) {
      await go(page, view);
      const note = await noteAt(page, NOTE);
      read.closed.others[view] = note && { kind: note.kind, says: note.says };
      (read.closed.lines ||= {})[view] = await wordsAt(page, LINE);
    }
    check('closed on one, closed on all three', [read.closed.others['cross-tab'], read.closed.others['group-comparison']], [null, null]);
    check('closed: the Cross-tabulation’s line points at the control too', read.closed.lines['cross-tab'], SAID.lineControl);
    check('closed: a chart that needs R still points at its own note', [read.closed.lines['correlation-matrix'], read.closed.lines['biomarker-screen']], [SAID.lineNote, SAID.lineNote]);
    check('closing the blue note leaves the amber one', [read.closed.others['correlation-matrix'], read.closed.others['biomarker-screen']].map((n) => n && n.kind), ['warning', 'warning']);
    // Another tab and back, in the same visit.
    await go(page, 'histogram');
    await go(page, 'association-scatter');
    read.closed.after_another_tab = await noteAt(page, NOTE);
    check('closed: still closed after another tab and back', read.closed.after_another_tab, null);
    // A new visit: the page loaded again.
    await page.reload({ waitUntil: 'networkidle' });
    await page.evaluate('window.__safetyVizApp.ready');
    await settle(page, 1200);
    const again = await noteAt(page, NOTE);
    read.closed.after_reload = again && again.says;
    // Closed again, then R started from the control: its addresses are held, and then refused.
    await page.click(`${NOTE} .sva-close`);
    let refuse;
    const held = new Promise((resolve) => {
      refuse = resolve;
    });
    await page.route(R_HOSTS, async (route) => {
      await held;
      route.abort().catch(() => {});
    });
    await page.click(`${CONTROL} button.sva-action`);
    await settle(page, 2500);
    const five = ['association-scatter', 'cross-tab', 'group-comparison', 'correlation-matrix', 'biomarker-screen'];
    read.closed.while_starting = { control: await controlSaid(page), line: await wordsAt(page, LINE), notes: {} };
    await shot(page, 'closed-starting', {
      mark: [
        [1, CONTROL, 'b'],
        [2, LINE, 'l']
      ]
    });
    for (const view of five) {
      await go(page, view);
      const note = await noteAt(page, NOTE);
      read.closed.while_starting.notes[view] = note && note.says;
    }
    check('closed stays closed while R starts, on all three', five.slice(0, 3).map((view) => read.closed.while_starting.notes[view]), [null, null, null]);
    check('closed: a chart that needs R still says R is starting', five.slice(3).map((view) => read.closed.while_starting.notes[view]), [SAID.amberStarting, SAID.amberStarting]);
    check('closed, while R starts: the control counts', read.closed.while_starting.control, /^Starting R · 13 MB · \d+ s$/);
    refuse();
    await page.waitForSelector('.sva-r[data-phase=failed]', { timeout: 90000 });
    await settle(page);
    read.closed.then_failed_on = {};
    for (const view of five) {
      await go(page, view);
      const note = await noteAt(page, NOTE);
      read.closed.then_failed_on[view] = note && note.says;
    }
    read.closed.then_failed = read.closed.then_failed_on['association-scatter'];
    check('closed, then R did not start: the note is back', read.closed.then_failed, SAID.blueFailed);
    check('R did not start is said on all five charts', five.map((view) => read.closed.then_failed_on[view]), [SAID.blueFailed, SAID.blueFailed, SAID.blueFailed, SAID.amberFailed, SAID.amberFailed]);
    await context.close();
    save();
  }

  // ------------------------------------------------------------ the RBQM tab
  if (want('rbqm')) {
    if (beforeIs1110) {
      const { page, context } = await openBefore('rbqm');
      read.rbqm_before = {
        body: await wordsAt(page, '.sva-rbqm .sva-rbqm-need'),
        is_note: await page.locator('.sva-rbqm .sva-rbqm-need.sva-callout').count(),
        supports: await supportsAt(page),
        control: await controlSaid(page)
      };
      check('release 1.11.0: the RBQM tab’s line is not a note', read.rbqm_before.is_note, 0);
      await shot(page, 'rbqm-1110', {
        mark: [
          [1, '.sva-rbqm .sva-rbqm-need', 'l'],
          [2, CONTROL, 'b']
        ]
      });
      await context.close();
    }
    const { page, context } = await open(BASE, 'rbqm');
    const note = await noteAt(page, RBQM_NOTE);
    read.rbqm = { note, control: await controlSaid(page), asked_of_r: page.askedOfR(), supports: await supportsAt(page) };
    check('RBQM: the line under the note', read.rbqm.supports && read.rbqm.supports.says, SAID.supports);
    check('RBQM: the line under the note is small and soft grey', read.rbqm.supports && [read.rbqm.supports.size, read.rbqm.supports.colour], ['14.72px', 'rgb(91, 100, 112)']);
    if (read.rbqm_before && read.rbqm_before.supports)
      check('RBQM: the line under the note is drawn as release 1.11.0 drew it', read.rbqm.supports, read.rbqm_before.supports);
    check('RBQM: the note’s sentence', note && note.says, SAID.rbqmOff);
    check('RBQM: a warning with Start R and no cross', note && [note.kind, hue(note.edge), note.button, note.cross], ['warning', 'amber', 'Start R', false]);
    check('RBQM: the control at the top right is as it was', read.rbqm.control, (read.rbqm_before || {}).control || read.rbqm.control);
    await shot(page, 'rbqm', {
      mark: [
        [1, RBQM_NOTE, 'in'],
        [2, `${RBQM_NOTE} .sva-note-start`, 't'],
        [3, CONTROL, 'b']
      ]
    });
    await context.close();
    save();
  }
  if (want('rbqm-starting')) {
    const { page, context } = await open(BASE, 'rbqm', { hold: 30000 });
    await page.click(`${RBQM_NOTE} .sva-note-start`);
    await settle(page, 3300);
    const note = await noteAt(page, RBQM_NOTE);
    read.rbqm_starting = {
      note,
      control: await wordsAt(page, `${CONTROL} .sva-r-say`),
      control_seconds: await wordsAt(page, `${CONTROL} .sva-r-meta`),
      steps: await page.locator('.sva-rbqm-steps li').evaluateAll((all) => all.map((li) => `${li.textContent.trim()} (${li.dataset.state})`))
    };
    check('RBQM, while R starts: the note’s sentence', note && note.says, SAID.rbqmStarting);
    check('RBQM, while R starts: blue, a ring, no button', note && [note.kind, hue(note.edge), note.ring, note.button], ['info', 'blue', true, null]);
    check('RBQM, while R starts: the note names the step and no seconds', note && note.meta, 'Step 1 of 6');
    check('RBQM, while R starts: the control counts the seconds', read.rbqm_starting.control_seconds, /^\d+ s$/);
    await shot(page, 'rbqm-starting', {
      mark: [
        [1, RBQM_NOTE, 'in'],
        [2, `${RBQM_NOTE} .sva-callout-meta`, 'b'],
        [3, CONTROL, 'b'],
        [4, '.sva-rbqm-steps', 'l']
      ]
    });
    await context.close();
    save();
  }
  if (want('rbqm-failed')) {
    if (beforeIs1110) {
      const before = await openBefore('rbqm', { block: true });
      await before.page.click(`${CONTROL} button.sva-action`);
      await before.page.waitForSelector('.sva-r[data-phase=failed]', { timeout: 120000 });
      await settle(before.page);
      read.rbqm_failed_before = await before.page.evaluate(() => {
        const node = document.querySelector('.sva-rbqm .sva-rbqm-need');
        return { says: node.textContent.replace(/\s+/g, ' ').trim(), classes: node.className, rgb: getComputedStyle(node).color };
      });
      read.rbqm_failed_before.colour = hue(read.rbqm_failed_before.rgb);
      await shot(before.page, 'rbqm-failed-1110', {
        mark: [
          [1, '.sva-rbqm .sva-rbqm-need', 'l'],
          [2, CONTROL, 'l']
        ]
      });
      await before.context.close();
    }
    const { page, context } = await open(BASE, 'rbqm', { block: true });
    await page.click(`${RBQM_NOTE} .sva-note-start`);
    await page.waitForSelector('.sva-r[data-phase=failed]', { timeout: 120000 });
    await settle(page);
    const note = await noteAt(page, RBQM_NOTE);
    read.rbqm_failed = { note, control: await wordsAt(page, `${CONTROL} .sva-r-say`) };
    check('RBQM, R did not start: the note’s sentence', note && note.says, SAID.rbqmFailed);
    check('RBQM, R did not start: amber, Try again inside the sentence', note && [note.kind, hue(note.edge), note.button], ['warning', 'amber', 'Try again']);
    await shot(page, 'rbqm-failed', {
      mark: [
        [1, RBQM_NOTE, 'in'],
        [2, `${RBQM_NOTE} .sva-note-start`, 't'],
        [3, CONTROL, 'l']
      ]
    });
    await context.close();
    save();
  }
  if (want('rbqm-done')) {
    const { page, context } = await open(BASE, 'rbqm');
    const pressed = Date.now();
    await page.click(`${RBQM_NOTE} .sva-note-start`);
    // What the note says on the way, each sentence once and in order.
    const onTheWay = [];
    while (!(await page.locator('.sva-rbqm-outcome').count())) {
      if (Date.now() - pressed > 300000) throw new Error('The RBQM run did not end in five minutes.');
      // R that did not start here is the network's doing, not the app's: say so and stop, to be run again.
      if (await page.locator('.sva-r[data-phase=failed]').count())
        throw new Error(`R did not start for the real RBQM run: ${(await noteAt(page, RBQM_NOTE) || {}).says}. Run ONLY=rbqm-done again.`);
      const now = await noteAt(page, RBQM_NOTE);
      if (now && !onTheWay.includes(now.says)) onTheWay.push(now.says);
      await page.waitForTimeout(300);
    }
    const seconds = Math.round((Date.now() - pressed) / 1000);
    await settle(page, 2500);
    read.rbqm_done = {
      seconds,
      on_the_way: onTheWay,
      note: await noteAt(page, RBQM_NOTE),
      need: await page.locator('.sva-rbqm .sva-rbqm-need').count(),
      outcome: squash(await wordsAt(page, '.sva-rbqm-outcome')),
      chip: squash(await wordsAt(page, `${CONTROL} .sva-r-ready`)).replace(/[▾\s]+$/g, '')
    };
    check('RBQM, after the run: no note', [read.rbqm_done.note, read.rbqm_done.need], [null, 0]);
    check('RBQM, after the run: the outcome line', read.rbqm_done.outcome, /^R ran 3 of 8 metrics on the Pilot study in /);
    check('RBQM, after the run: the control is a chip', read.rbqm_done.chip, 'R ready');
    check('RBQM, while R runs the metrics: the note says so', read.rbqm_done.on_the_way.find((line) => /^R is running/.test(line)), 'R is running the metrics. They appear here when it is done. Step 6 of 6');
    await shot(page, 'rbqm-done', {
      mark: [
        [1, CONTROL, 'l'],
        [2, '.sva-rbqm-outcome', 'l']
      ]
    });
    read.rbqm_done.first_row = squash(await wordsAt(page, '.sva-rbqm-table tbody tr'));
    await context.close();
    if (beforeIs1110) {
      const before = await openBefore('rbqm');
      await before.page.click(`${CONTROL} button.sva-action`);
      await before.page.waitForSelector('.sva-rbqm-outcome', { timeout: 420000 });
      await settle(before.page, 2500);
      read.rbqm_done_before = {
        outcome: squash(await wordsAt(before.page, '.sva-rbqm-outcome')),
        first_row: squash(await wordsAt(before.page, '.sva-rbqm-table tbody tr'))
      };
      await before.context.close();
    }
    if (read.rbqm_done_before) {
      const plain = (line) => line.replace(/ in (a few|[\d.]+) seconds\./, ' in some seconds.');
      check('the RBQM outcome line is release 1.11.0’s, but for its seconds', plain(read.rbqm_done.outcome), plain(read.rbqm_done_before.outcome));
      check('the first row of the site overview is release 1.11.0’s', read.rbqm_done.first_row, read.rbqm_done_before.first_row);
    }
    save();
  }

  // ------------------------------------------------------------ the RBQM tab's other states
  if (want('rbqm-states')) {
    const strip = { x: 0, y: 0, width: 1280, height: 268 };
    read.rbqm_states = {};
    // No file gsm reads: a demo study of one labs file.
    const { page, context } = await open(BASE, 'data');
    await page.selectOption('select.sva-study', 'liver');
    await settle(page, 2500);
    await go(page, 'rbqm');
    let note = await noteAt(page, RBQM_NOTE);
    read.rbqm_states.none_placed = note;
    check('RBQM, no file gsm reads: the note’s sentence', note && note.says, SAID.nonePlaced);
    check('RBQM, no file gsm reads: amber, no button', note && [note.kind, hue(note.edge), note.button], ['warning', 'amber', null]);
    await shot(page, 'rbqm-noneplaced', { clip: strip });
    // Nothing loaded: Reset, on the Data tab.
    await go(page, 'data');
    await page.click('.sva-content button.sva-button:has-text("Reset")');
    await settle(page, 1500);
    await go(page, 'rbqm');
    note = await noteAt(page, RBQM_NOTE);
    read.rbqm_states.no_files = note;
    check('RBQM, nothing loaded: the note’s sentence', note && note.says, SAID.noFiles);
    check('RBQM, nothing loaded: amber, no button', note && [note.kind, hue(note.edge), note.button], ['warning', 'amber', null]);
    await shot(page, 'rbqm-nofiles', { clip: strip });
    await context.close();
    // A page that cannot start R: the app as one file, which the app's footer offers as a download. It is opened from the site.
    const single = await browser.newContext(desktop);
    const file = await single.newPage();
    let elsewhere = 0;
    file.on('request', (request) => {
      if (!request.url().startsWith(`${BASE}safety.viz-app.html`)) elsewhere += 1;
    });
    await file.goto(`${BASE}safety.viz-app.html`, { waitUntil: 'networkidle' });
    await settle(file, 1500);
    await file.click('.sva-tab[data-tab="rbqm"]');
    await settle(file, 1200);
    note = await noteAt(file, RBQM_NOTE);
    read.rbqm_states.single_file = { note, control: await file.locator(CONTROL).count(), asked_elsewhere: elsewhere, tab: squash(await wordsAt(file, '.sva-tab[data-tab="rbqm"]')) };
    check('the app as one file, RBQM: the note’s sentence', note && note.says, SAID.singleFile);
    check('the app as one file, RBQM: amber, no button, no control, nothing loaded from anywhere', note && [note.kind, hue(note.edge), note.button, read.rbqm_states.single_file.control, elsewhere], ['warning', 'amber', null, 0, 0]);
    await shot(file, 'rbqm-singlefile', { clip: strip });
    await single.close();
    // R up and nothing yet run on what is loaded: R is started, the study is
    // cleared while it starts, and the study is chosen again once R is up.
    const upWithNothingRun = async (base, start) => {
      const opened = base === BEFORE ? await openBefore('rbqm') : await open(base, 'rbqm');
      await opened.page.click(start);
      await settle(opened.page, 1200);
      await go(opened.page, 'data');
      await opened.page.click('.sva-content button.sva-button:has-text("Reset")');
      await settle(opened.page, 500);
      await go(opened.page, 'rbqm');
      await opened.page.waitForSelector('.sva-r[data-phase=ready]', { timeout: 300000 });
      await go(opened.page, 'data');
      await opened.page.selectOption('select.sva-study', 'pilot');
      await settle(opened.page, 2500);
      await go(opened.page, 'rbqm');
      await settle(opened.page, 1500);
      return opened;
    };
    if (beforeIs1110) {
      const before = await upWithNothingRun(BEFORE, `${CONTROL} button.sva-action`);
      read.rbqm_ready_before = {
        says: await wordsAt(before.page, '.sva-rbqm .sva-rbqm-need'),
        is_note: await before.page.locator('.sva-rbqm .sva-rbqm-need.sva-callout').count()
      };
      check('release 1.11.0, R up and nothing run: a line that points at the chip', read.rbqm_ready_before, { says: SAID.rbqmReadyBefore, is_note: 0 });
      await shot(before.page, 'rbqm-ready-1110', {
        mark: [
          [1, '.sva-rbqm .sva-rbqm-need', 'l'],
          [2, CONTROL, 'l']
        ]
      });
      await before.context.close();
    }
    const after = await upWithNothingRun(BASE, `${RBQM_NOTE} .sva-note-start`);
    note = await noteAt(after.page, RBQM_NOTE);
    read.rbqm_states.ready = note;
    check('RBQM, R up and nothing run: the note’s sentence', note && note.says, SAID.rbqmReady);
    check('RBQM, R up and nothing run: blue, with its button and no cross', note && [note.kind, hue(note.edge), note.button, note.cross], ['info', 'blue', 'Run the metrics', false]);
    await shot(after.page, 'rbqm-ready', {
      mark: [
        [1, RBQM_NOTE, 'in'],
        [2, `${RBQM_NOTE} .sva-note-start`, 't'],
        [3, CONTROL, 'l']
      ]
    });
    await after.page.click(`${RBQM_NOTE} .sva-note-start`);
    await after.page.waitForSelector('.sva-rbqm-outcome', { state: 'attached', timeout: 120000 });
    await settle(after.page, 1500);
    read.rbqm_states.ready_then = { outcome: squash(await wordsAt(after.page, '.sva-rbqm-outcome')), note: await noteAt(after.page, RBQM_NOTE) };
    check('RBQM, Run the metrics in the note runs them, and the note goes', [/^R ran 3 of 8 metrics on the Pilot study in /.test(read.rbqm_states.ready_then.outcome), read.rbqm_states.ready_then.note], [true, null]);
    await after.context.close();
    save();
  }

  // ------------------------------------------------------------ the participant profile
  if (want('profile')) {
    if (beforeIs1110) {
      const { page, context } = await openBefore('participant-profile');
      read.profile_before = {
        says: await wordsAt(page, '.sva-content .sva-message'),
        is_note: await page.locator('.sva-content .sva-message.sva-callout').count(),
        edge: await page.evaluate(() => getComputedStyle(document.querySelector('.sva-content .sva-message')).borderLeftColor)
      };
      read.profile_before.colour = hue(read.profile_before.edge);
      check('release 1.11.0: the profile’s sentence is not the standard note', read.profile_before.is_note, 0);
      await shot(page, 'profile-1110', { mark: [[1, '.sva-content .sva-message', 'l']] });
      await context.close();
    }
    const { page, context } = await open(BASE, 'participant-profile');
    const note = await noteAt(page, '.sva-content .sva-callout.sva-message');
    read.profile = { note };
    check('the profile’s sentence', note && note.says, SAID.profile);
    check('the profile’s sentence is a blue note with no cross', note && [note.kind, hue(note.edge), note.cross], ['info', 'blue', false]);
    if (read.profile_before) check('the profile’s sentence is word for word release 1.11.0’s', note && note.says, read.profile_before.says);
    await shot(page, 'profile', { mark: [[1, '.sva-content .sva-callout.sva-message', 'in']] });
    await context.close();
    save();
  }

  // ------------------------------------------------------------ a chart that cannot be drawn
  if (want('cannot')) {
    const walk = async (base, kind) => {
      const { page, context } = base === BEFORE ? await openBefore('data') : await open(base, 'data');
      if (kind === 'nofile') {
        await page.selectOption('select.sva-study', 'liver');
        await settle(page, 2500);
        if (base !== BEFORE)
          read.liver = {
            name: await page.evaluate(() => {
              const select = document.querySelector('select.sva-study');
              return select.options[select.selectedIndex].textContent.trim();
            }),
            note: await wordsAt(page, '.sva-study-note')
          };
        await page.click('.sva-tab[data-domain="ae"]');
      } else {
        await page.selectOption('select[aria-label="Result in adbds.csv"]', { label: 'not mapped' });
        await settle(page, 1500);
        await page.click('.sva-tab[data-domain="bds"]');
      }
      await settle(page, 1500);
      const got = await page.evaluate(() => {
        const node = document.querySelector('.sva-content .sva-message');
        const style = getComputedStyle(node);
        return {
          says: node.textContent.replace(/\s+/g, ' ').trim(),
          classes: node.className,
          edge: style.borderLeftColor,
          chart: document.title.split(' · ')[0]
        };
      });
      return { page, context, got: { ...got, colour: hue(got.edge) } };
    };
    read.cannot = {};
    for (const [kind, said] of [
      ['nofile', SAID.noFile],
      ['notmapped', SAID.notMapped]
    ]) {
      if (beforeIs1110) {
        const before = await walk(BEFORE, kind);
        (read.cannot_before ||= {})[kind] = before.got;
        check(`release 1.11.0, ${kind}: a red card`, [before.got.says, before.got.colour], [said, 'red']);
        await shot(before.page, `${kind}-1110`, { mark: [[1, '.sva-content .sva-message', 'in']] });
        await before.context.close();
      }
      const after = await walk(BASE, kind);
      read.cannot[kind] = after.got;
      check(`${kind}: an amber note`, [after.got.says, after.got.colour, /sva-callout/.test(after.got.classes) && /sva-warning/.test(after.got.classes)], [said, 'amber', true]);
      await shot(after.page, kind, { mark: [[1, '.sva-content .sva-message', 'in']] });
      await after.context.close();
    }
    save();
  }

  // ------------------------------------------------------------ at phone width
  if (want('phone')) {
    read.phone = {};
    const wide = (page) => page.evaluate(() => document.documentElement.scrollWidth);
    // Each state of the note, as a still of the note alone: at this width its sentence is large enough to read.
    const states = [
      ['blue', 'association-scatter', NOTE, {}, null],
      ['amber', 'correlation-matrix', NOTE, {}, null],
      ['starting', 'association-scatter', NOTE, { hold: 30000 }, 'starting'],
      ['failed', 'association-scatter', NOTE, { block: true }, 'failed'],
      ['rbqm', 'rbqm', RBQM_NOTE, {}, null],
      ['rbqm-starting', 'rbqm', RBQM_NOTE, { hold: 30000 }, 'starting'],
      ['rbqm-failed', 'rbqm', RBQM_NOTE, { block: true }, 'failed']
    ];
    for (const [id, view, selector, how, phase] of states) {
      const { page, context } = await open(BASE, view, { size: phone, ...how });
      if (phase) {
        await page.click(`${selector} .sva-note-start`);
        if (phase === 'starting') await settle(page, 2600);
        else await page.waitForSelector('.sva-r[data-phase=failed]', { timeout: 120000 });
        await settle(page);
      }
      const note = await noteAt(page, selector);
      read.phone[id] = { note, scroll_width: await wide(page), line: await wordsAt(page, LINE) };
      check(`at 390 pixels, ${id}: a note, inside the screen`, note && note.width <= 390 && read.phone[id].scroll_width <= 390, true);
      if (!phase) {
        await shot(page, `phone-${id}`, { mark: [[1, selector, 'top']] });
      }
      await shot(page, `note-${id}`, { clip: await around(page, [selector], 8) });
      await context.close();
    }
    check('at 390 pixels: the blue note’s sentence', read.phone.blue.note.says, SAID.blueOff);
    check('at 390 pixels: the amber note’s sentence', read.phone.amber.note.says, SAID.amberOff);
    check('at 390 pixels: the RBQM note’s sentence', read.phone.rbqm.note.says, SAID.rbqmOff);
    check('at 390 pixels: the chart’s line points at the note', read.phone.blue.line, SAID.lineNote);
    save();
  }

  save();
  await browser.close();
  const failed = Object.entries(checks).filter(([, value]) => !value.pass);
  console.log(`${Object.keys(checks).length - failed.length} of ${Object.keys(checks).length} checks held, on ${BASE}`);
  if (failed.length) {
    console.error(`FAILED: ${failed.map(([name]) => name).join('; ')}`);
    process.exit(1);
  }
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
