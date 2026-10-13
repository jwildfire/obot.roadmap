// Writes index.html for the safety.viz v1.11.1 demo page from capture.json,
// which capture.cjs wrote. No sentence quoted from the app and no number read
// from it is typed into the page by hand: each comes from capture.json.
//
//   node build.cjs [dir]        default: the folder this file is in
//
// It stops when a still is missing, when a still's markers and its legend do
// not match one for one, or when a check in capture.json did not hold.
const fs = require('node:fs');
const path = require('node:path');

const dir = process.argv[2] || __dirname;
const c = JSON.parse(fs.readFileSync(path.join(dir, 'capture.json'), 'utf8'));

const failed = Object.entries(c.checks).filter(([, value]) => !value.pass);
if (failed.length) throw new Error(`capture.json has checks that did not hold: ${failed.map(([name]) => name).join('; ')}`);
const held = Object.keys(c.checks).length;

// ---------------------------------------------------------------- addresses
const DEV = 'https://jwildfire.github.io/safety.viz/dev/demo/';
const TRY = /\/pr\/\d+\//.test(c.site.after) ? DEV : c.site.after;
const HUB = 'https://github.com/jwildfire/obot.roadmap';
const SV = 'https://github.com/jwildfire/safety.viz';
const DESIGN = 'https://jwildfire.github.io/obot.roadmap/reports/sv-v1.11.1-r-note-design-2026-10-13/';
const REQ = `${HUB}/issues/420`;
const OBJECTIVE = `${HUB}/issues/401`;
const T_NOTE = `${SV}/issues/321`;
const T_R = `${SV}/issues/322`;
const T_PREP = `${SV}/issues/323`;
const PR_NOTE = `${SV}/pull/324`;
const PR_R = `${SV}/pull/325`;
const ROWS = `${SV}/blob/dev/requirements/demo-app.md`;
const NEWS = `${SV}/blob/dev/NEWS.md`;
const HERE = `${HUB}/blob/main/reports/sv-v1.11.1-demo`;
const T_FIX = `${SV}/issues/328`;
const GUIDE = `${HUB}/blob/main/docs/developer-guidelines.md#designing-and-checking-what-people-look-at`;
const CONTRIBUTING = `${SV}/blob/dev/CONTRIBUTING.md`;

// Two sentences of the RBQM tab's note that no picture on this page shows:
// R has to stop answering, or stop mid-run, for a reader to meet them. They
// are quoted from the code, safety.viz src/app/rbqm.js (RBQM_NOTE.silent and
// RBQM_NOTE.stopped) with the button's words and the shared last sentence of
// src/app/r-words.js, as they stand at the commit the capture names, and are held there by
// unit tests (requirement row APP-RBQM-083). Nothing else quoted from the app
// is typed here.
const FROM_CODE = {
  silent: ['R stopped answering, so no metric was run. ', 'Try again', ' The reason is behind Why, at the top right.'],
  stopped: ['R stopped, so there are no results. ', 'Run again', ' The reason is behind Why, at the top right.']
};

// ---------------------------------------------------------------- words
const esc = (text) =>
  String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const q = (text) => `“${esc(text)}”`;
const a = (href, text) => `<a href="${href}">${text}</a>`;
const must = (value, what) => {
  if (value === null || value === undefined || value === '') throw new Error(`capture.json has nothing for: ${what}`);
  return value;
};
/** A note's sentence as the app says it, with its button drawn as a button and its small print left off. */
const said = (note, what) => {
  must(note, what);
  let text = note.says;
  if (note.meta && text.endsWith(note.meta)) text = text.slice(0, -note.meta.length).trim();
  let html = esc(text);
  if (note.button) html = html.replace(esc(note.button), `<span class="key">${esc(note.button)}</span>`);
  return `“${html}”`;
};
/** A sentence read on its own, with the button it holds drawn as a button. */
const sayWith = (text, button) => `“${esc(must(text, `a sentence with ${button}`)).replace(esc(button), `<span class="key">${esc(button)}</span>`)}”`;
const swatch = (rgb) => `<span class="sw" style="background:${esc(rgb)}" aria-hidden="true"></span>`;
const date = new Date(c.site.captured).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'America/New_York' });
const siteName = c.site.after_is;
// The version and the commit are those read when the run of every section began.
const version = must(c.site.version, 'the app’s version, read when the capture began');
if (c.first.version !== version) throw new Error(`The first screen read ${c.first.version} and the capture began on ${version}: run every section.`);
// Once the release is out, "after" is the released site too, and "before" is what that site was.
const released = c.site.after === c.site.before;
const beforeName = released ? 'the released site as it stood before this release' : 'the released site';
const list = (names) => (names.length < 2 ? names.join('') : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`);

// ---------------------------------------------------------------- figures
const used = new Set();
const img = (name, alt) => {
  const size = c.stills[name];
  if (!size || !fs.existsSync(path.join(dir, 'media', `${name}.jpg`))) throw new Error(`No still: ${name}`);
  used.add(name);
  return `<img src="media/${name}.jpg" alt="${esc(alt)}" loading="lazy" width="${size.width}" height="${size.height}">`;
};
const markers = (name, legend, small) => {
  const placed = c.marks[name] || [];
  if (placed.length !== legend.length)
    throw new Error(`Still ${name} has ${placed.length} markers and its legend ${legend.length} lines.`);
  return placed
    .map((m) => `<span class="mk${small ? ' sm' : ''}" style="left:${m.x}%;top:${m.y}%" aria-hidden="true">${m.n}</span>`)
    .join('');
};
const frame = ({ name, alt, legend = [], small = false }, cls = '') =>
  `<a class="frame ${cls}" href="media/${name}.jpg" title="Open this picture at full size">
        ${img(name, alt)}${markers(name, legend, small)}
      </a>`;
const legendOf = (legend, cls = '') =>
  legend.length ? `<ol class="legend ${cls}">\n${legend.map((line) => `        <li>${line}</li>`).join('\n')}\n      </ol>` : '';
const figure = ({ name, alt, cap, legend = [], label, style = '', small = false }) => `
  <figure${style ? ` style="${style}"` : ''}>
      ${label ? `<p class="lbl">${label}</p>` : ''}
      ${frame({ name, alt, legend, small })}
      <figcaption>
      ${cap ? `<p class="cap">${cap}</p>` : ''}
      ${legendOf(legend)}
      </figcaption>
  </figure>`;
/** Two stills in one place, with a switch: release 1.11.0, and release 1.11.1. */
const swap = ({ id, cap, before, after, style = '' }) => `
  <figure class="swap"${style ? ` style="${style}"` : ''}>
      <input type="radio" name="swap-${id}" id="swap-${id}-before" aria-label="Show release 1.11.0">
      <input type="radio" name="swap-${id}" id="swap-${id}-after" aria-label="Show release 1.11.1" checked>
      <div class="switch">
        <label for="swap-${id}-before">Release 1.11.0</label>
        <label for="swap-${id}-after">Release 1.11.1</label>
      </div>
      <div class="frames">
      ${frame(before, 'before')}
      ${frame(after, 'after')}
      </div>
      <figcaption>
      <p class="cap">${cap}</p>
      ${before.cap ? `<p class="cap is-before">${before.cap}</p>` : ''}
      ${legendOf(before.legend || [], 'is-before')}
      ${after.cap ? `<p class="cap is-after">${after.cap}</p>` : ''}
      ${legendOf(after.legend || [], 'is-after')}
      </figcaption>
  </figure>`;
const tryIt = (steps) => `
  <div class="note try">
    <p class="lbl">Try it: under a minute</p>
    <ol class="steps">
${steps.map(([act, see]) => `      <li><span class="do">${act}</span><span class="see">${see}</span></li>`).join('\n')}
    </ol>
  </div>`;
const bullets = (lines) => `
  <ul class="list">
${lines.filter(Boolean).map((line) => `      <li>${line}</li>`).join('\n')}
    </ul>`;
const src = (parts) => `<p class="src">${parts.join(' <span class="dot"></span> ')}</p>`;
const section = (n, id, cut, title, body) => `
<!-- ============================================================ ${n} -->
<div class="cut"><span>${n} <em>· ${cut}</em></span></div><section id="${id}">
  <div class="hd"><h2>${title}</h2></div>${body}
</section>`;

// ---------------------------------------------------------------- what was read
const blue = c.blue.charts['association-scatter'].note;
const amber = c.amber.charts['correlation-matrix'].note;
const blueNames = Object.values(c.blue.charts).map((chart) => chart.name);
const amberNames = Object.values(c.amber.charts).map((chart) => chart.name);
const cost = must((blue.says.match(/about .*$/) || [])[0], 'the cost in the blue note');
const startingSmall = must(c.starting.note.meta, 'the small print while R starts');
const rbqmSmall = must(c.rbqm_starting.note.meta, 'the RBQM note’s small print while R starts');
const stepsSeen = [...new Set(c.rbqm_done.on_the_way.map((line) => (line.match(/Step \d+ of \d+$/) || [''])[0]).filter(Boolean))];
const runningSaid = must(
  (c.rbqm_done.on_the_way.find((line) => /^R is running/.test(line)) || '').replace(/ Step \d+ of \d+$/, ''),
  'the RBQM note while R runs the metrics'
);
const versionLine =
  version === 'safety.viz 1.11.1'
    ? `The app’s footer on ${siteName} reads ${q(version)}.`
    : `The app’s footer on ${siteName} still read ${q(version)} when this was captured. The number moves to 1.11.1 with the release preparation (${a(T_PREP, 'safety.viz #323')}).`;

const REQ_SRC = `Requirement: a standard note where R can be started (${a(REQ, 'obot.roadmap #420')})`;
const R_SRC = [
  REQ_SRC,
  `Task: put the R note on the biomarker charts and the RBQM tab (${a(T_R, 'safety.viz #322')})`,
  `Pull request: the note where R can be started (${a(PR_R, 'safety.viz #325')})`
];
const NOTE_SRC = [
  REQ_SRC,
  `Task: add the app’s standard note, use it for every note, and remove the line on first open (${a(T_NOTE, 'safety.viz #321')})`,
  `Pull request: the app’s notes are one standard note, blue or amber (${a(PR_NOTE, 'safety.viz #324')})`
];

// ================================================================ 01 the note
const viewTile = (id, alt) => {
  const view = must(c.views[id], `the view ${id}`);
  return figure({
    name: `view-${id}`,
    alt,
    label: `${esc(view.name)}`,
    cap: `${swatch(view.colour === 'blue' ? blue.edge : amber.edge)}${view.colour === 'blue' ? 'Blue' : 'Amber'}. ${sayWith(view.says, 'Start R')}`
  });
};
const s01 = section(
  '01',
  'note',
  'the note',
  'A note at the top of the card says why R is wanted',
  `
  <p class="what">A reader on a chart that can start R is now told so where they are looking, and can start R from that sentence. In release 1.11.0 the chart said ${q(c.blue_before.line)} and the reader had to find the control.</p>
  ${src([...R_SRC, `As drawn in ${a(`${DESIGN}#m1`, 'the design’s first mockup')}`])}

  <h3>Blue, where R adds p-values</h3>
  ${swap({
    id: 'blue',
    cap: `The ${esc(c.blue.charts['association-scatter'].name)}, before R is started.`,
    before: {
      name: 'blue-1110',
      alt: 'Release 1.11.0: the Association scatter chart. The only mention of R on the card is one line of text under the chart; the control that starts R is at the right end of the row of chart names.',
      legend: [
        `The control at the right end of the chart names is the only place R can be started: ${q(c.blue_before.control)}.`,
        `The chart’s own line sends the reader to it: ${q(c.blue_before.line)}`
      ]
    },
    after: {
      name: 'blue',
      alt: 'Release 1.11.1: the Association scatter chart. A blue note runs across the top of the card with a Start R button inside its sentence and a cross at its right end. The control at the right end of the chart names is unchanged.',
      legend: [
        `The note, at the top of the card, in blue with the information mark: ${said(blue, 'the blue note')}`,
        'Start R is a button inside the sentence. It is the same press as the control’s.',
        `The cross closes the note for the visit (${a('#closed', 'section 03')}).`,
        `The control is unchanged: ${q(c.blue.control)}.`,
        `The chart’s own line now points at the note: ${q(c.blue.line)}`
      ]
    }
  })}

  <h3>Amber, where nothing is drawn without R</h3>
  ${swap({
    id: 'amber',
    cap: `The ${esc(c.amber.charts['correlation-matrix'].name)}, before R is started.`,
    before: {
      name: 'amber-1110',
      alt: 'Release 1.11.0: the Correlation matrix chart. The grid is empty and nothing at the top of the card says why.',
      legend: [
        `An empty grid. The one sentence that says why is under it, ${c.amber_before.line_top.toLocaleString('en-US')} pixels down the page${c.amber_before.line_top > 800 ? ', below the first screen' : ''}: ${q(c.amber_before.line)}`
      ]
    },
    after: {
      name: 'amber',
      alt: 'Release 1.11.1: the Correlation matrix chart. An amber note with a warning mark runs across the top of the card, with a Start R button inside its sentence and no cross.',
      legend: [
        `The note, in amber with the warning mark: ${said(amber, 'the amber note')}`,
        'Start R, inside the sentence.',
        'The control is unchanged. An amber note has no cross: it stays until R is started.'
      ]
    }
  })}
  ${bullets([
    `Blue is on the charts that draw without R and gain p-values from it: ${list(blueNames)}.`,
    `Amber is on the charts that draw no result without R: ${list(amberNames)}. The RBQM tab has the same amber note (${a('#rbqm', 'section 04')}).`,
    `All five charts give the same cost: ${q(cost)}`,
    `The note’s button and the control are one press. With Start R pressed on the control, the note on the ${esc(c.amber.charts['correlation-matrix'].name)} turned to ${said(c.starting.amber, 'the amber note while R starts')} and lost its button, so R cannot be started a second time.`,
    `R still starts only when asked: until one of the two is pressed the page asks nothing of R’s addresses (${c.blue.asked_of_r} requests).`,
    `The sentence inside the chart is one the app hands to the chart, so the chart library did not change: the chart’s footer still reads ${q(c.blue.foot)}`
  ])}

  <h3 id="views">Each of the six views, before R is started</h3>
  <p class="what">The five biomarker charts and the RBQM tab, as each opens on ${esc(siteName)}. Tap a strip to open it at full size.</p>
  <div class="views">
    ${viewTile('group-comparison', 'The top of the Group comparison chart: a blue note with Start R inside its sentence.')}
    ${viewTile('association-scatter', 'The top of the Association scatter chart: a blue note with Start R inside its sentence.')}
    ${viewTile('cross-tab', 'The top of the Cross-tabulation chart: a blue note with Start R inside its sentence.')}
    ${viewTile('correlation-matrix', 'The top of the Correlation matrix chart: an amber note with Start R inside its sentence.')}
    ${viewTile('biomarker-screen', 'The top of the Biomarker screen chart: an amber note with Start R inside its sentence.')}
    ${viewTile('rbqm', 'The top of the RBQM tab’s overview: an amber note with Start R inside its sentence.')}
  </div>

  <h3>On a phone</h3>
  <p class="what">At 390 pixels the note wraps inside the card and nothing scrolls sideways: the note is ${c.phone.blue.note.width} pixels wide and the page ${c.phone.blue.scroll_width}.</p>
  <div class="phones">
    ${figure({
      name: 'phone-blue',
      style: 'max-width:300px',
      alt: 'The Association scatter chart at phone width. The blue note sits at the top of the card, its sentence on four lines with Start R inside it.',
      cap: 'The blue note at 390 pixels.',
      legend: [`The same sentence, wrapped. The chart’s line under the chart reads ${q(c.phone.blue.line)}`]
    })}
    ${figure({
      name: 'phone-amber',
      style: 'max-width:300px',
      alt: 'The Correlation matrix chart at phone width. The amber note sits at the top of the card with Start R inside its sentence.',
      cap: 'The amber note at 390 pixels.',
      legend: ['The same sentence, wrapped, with no cross.']
    })}
  </div>
  ${tryIt([
    [
      `${a(`${TRY}#association-scatter`, 'Open the Association scatter')}.`,
      `A blue note at the top of the card: ${said(blue, 'the blue note')}`
    ],
    [
      `${a(`${TRY}#correlation-matrix`, 'Open the Correlation matrix')}.`,
      `An amber note over an empty grid: ${said(amber, 'the amber note')}`
    ],
    ['Look at the right end of the chart names.', `The control is where it was: ${q(c.blue.control)}.`]
  ])}`
);

// ================================================================ 02 the note follows R
const stateTile = (id, label, note, extra = '') =>
  figure({
    name: `note-${id}`,
    style: 'max-width:356px',
    alt: `The note at phone width, ${label.toLowerCase()}.`,
    label,
    cap: `${said(note, `the note at phone width, ${id}`)}${note.meta ? ` Small print: ${q(note.meta)}.` : ''}${extra}`
  });
const words = (title, rows) => `
    <h4>${title}</h4>
    <dl class="words">
${rows.map(([when, what]) => `      <dt>${when}</dt><dd>${what}</dd>`).join('\n')}
    </dl>`;
const s02 = section(
  '02',
  'states',
  'the note follows R',
  'The note follows R: starting, did not start, ready',
  `
  <p class="what">While R starts the note says so, with a turning ring and no button. When R did not start it says what the chart is left without, with Try again inside the sentence. Once R is ready there is no note.</p>
  ${src([...R_SRC, `As drawn in ${a(`${DESIGN}#m2`, 'the design’s second mockup')}`])}

  <h3>While R starts</h3>
  ${figure({
    name: 'starting',
    alt: 'The Association scatter chart while R starts. The note at the top of the card is blue with a turning ring and no button. The control at the top right reads Starting R with a count of seconds.',
    cap: 'The Association scatter a few seconds after Start R was pressed in the note. R’s addresses were held back for this picture; on this connection R is ready about two seconds after the press.',
    legend: [
      `The note is blue, with a turning ring where the mark was and no button: ${said(c.starting.note, 'the note while R starts')}`,
      `Its small print gives the download, ${q(startingSmall)}, and counts no seconds.`,
      `The control counts them: ${q(c.starting.control)}.`,
      `The chart’s own line: ${q(c.starting.line)}`
    ]
  })}

  <h3>When R did not start</h3>
  ${figure({
    name: 'failed',
    alt: 'The Association scatter chart when R did not start. The note at the top of the card is amber with a Try again button inside its sentence. The control at the top right reads R did not start in red, with Try again and Why.',
    cap: 'The same chart with R’s addresses refused.',
    legend: [
      `The note is amber, with the warning mark: ${said(c.failed.note, 'the note when R did not start')}`,
      'Try again is a button inside the sentence. It makes one fresh attempt.',
      `The control says ${q(c.failed.control)} in red, with ${c.failed.control_buttons.map(q).join(' and ')}. Red is kept for this.`,
      `The chart’s own line: ${q(c.failed.line)}`
    ]
  })}
  ${figure({
    name: 'failed-why',
    style: 'max-width:520px',
    alt: 'The control at the top right with its Why panel open, headed R did not start, giving the reason in a sentence, with What the browser said folded beneath.',
    cap: `Behind Why: ${q(must(c.failed.why.reason, 'the reason behind Why'))}`
  })}

  <h3>Once R is ready</h3>
  ${figure({
    name: 'ready',
    alt: 'The Association scatter chart after R has started. There is no note at the top of the card. The control is a chip reading R ready, and under the chart a line gives Pearson’s correlation test with its p-value.',
    cap: `The Association scatter with real R, ${c.ready.seconds} seconds after Start R was pressed in the note. There is no note.`,
    legend: [`The control is a chip: ${q(c.ready.chip)}.`, `R’s test is under the chart: ${q(c.ready.line)}`]
  })}
  ${figure({
    name: 'ready-screen',
    alt: 'The Biomarker screen after R has started: a table of biomarkers, each with its estimate, interval and p-values, is drawn where there was nothing, and there is no note at the top of the card.',
    cap: `The Biomarker screen in the same visit: drawn, with no note. Its line reads ${q(c.ready.others['biomarker-screen'].line)}`
  })}
  ${bullets([
    `With R ready, none of the five charts has a note. The ${esc(c.blue.charts['cross-tab'].name)} read ${q(c.ready.others['cross-tab'].line)}`,
    `The ${esc(c.amber.charts['correlation-matrix'].name)}, which had drawn an empty grid, read ${q(c.ready.others['correlation-matrix'].line)}`,
    `A chart that cannot be drawn without R says so in each state. While R starts: ${said(c.starting.amber, 'the amber chart’s note while R starts')} When R did not start: ${said(c.failed.amber, 'the amber chart’s note when R did not start')}`,
    `Switching the browser offline once the page has loaded gives the same note as refusing R’s addresses: ${said(c.failed.offline, 'the note offline')}`
  ])}

  <h3>The note in each state, at phone width</h3>
  <p class="what">Stills of the note alone, taken at 390 pixels, where its sentence is large enough to read on this page. On a phone the control is first in the row of chart names, so the last sentence says ${q((c.phone.failed.note.says.match(/The reason .*$/) || [''])[0])} where the desktop says ${q((c.failed.note.says.match(/The reason .*$/) || [''])[0])}</p>
  <div class="states">
    ${stateTile('blue', 'Before R, where R adds p-values', c.phone.blue.note)}
    ${stateTile('amber', 'Before R, where nothing is drawn without it', c.phone.amber.note)}
    ${stateTile('starting', 'While R starts', c.phone.starting.note)}
    ${stateTile('failed', 'R did not start', c.phone.failed.note)}
  </div>

  <h3 id="words">Every sentence the note says</h3>
  <p class="what">As read from the app at 1,280 pixels. These are the drafts that are yours to correct (${a('#ruling', 'the first thing to rule on')}).</p>
  <div class="note said">
    ${words(`${list(blueNames)}`, [
      ['Before R is started', `${swatch(blue.edge)}${said(blue, 'blue, before')}`],
      ['While R starts', `${swatch(c.starting.note.edge)}${said(c.starting.note, 'blue, starting')} Small print: ${q(startingSmall)}.`],
      ['R did not start', `${swatch(c.failed.note.edge)}${said(c.failed.note, 'blue, failed')}`],
      ['R is ready', 'No note.']
    ])}
    ${words(`${list(amberNames)}`, [
      ['Before R is started', `${swatch(amber.edge)}${said(amber, 'amber, before')}`],
      ['While R starts', `${swatch(c.starting.amber.edge)}${said(c.starting.amber, 'amber, starting')} Small print: ${q(c.starting.amber.meta)}.`],
      ['R did not start', `${swatch(c.failed.amber.edge)}${said(c.failed.amber, 'amber, failed')}`],
      ['R is ready', 'No note.']
    ])}
    ${words('The RBQM tab', [
      ['Before R is started', `${swatch(c.rbqm.note.edge)}${said(c.rbqm.note, 'RBQM, before')}`],
      ['While R starts', `${swatch(c.rbqm_starting.note.edge)}${said(c.rbqm_starting.note, 'RBQM, starting')} Small print: ${q(rbqmSmall)}.`],
      ['While R runs the metrics', `${swatch(c.rbqm_starting.note.edge)}${q(runningSaid)} Small print: “Step 6 of 6”.`],
      ['R did not start', `${swatch(c.rbqm_failed.note.edge)}${said(c.rbqm_failed.note, 'RBQM, failed')}`],
      ['After the run', 'No note.'],
      ['R is up and nothing has run on what is loaded', `${swatch(c.rbqm_states.ready.edge)}${said(c.rbqm_states.ready, 'RBQM, R up and nothing run')}`],
      ['Nothing is loaded', `${swatch(c.rbqm_states.no_files.edge)}${said(c.rbqm_states.no_files, 'RBQM, nothing loaded')}`],
      ['No loaded file is one the metrics read', `${swatch(c.rbqm_states.none_placed.edge)}${said(c.rbqm_states.none_placed, 'RBQM, no file gsm reads')}`],
      ['The app as one file, which cannot start R', `${swatch(c.rbqm_states.single_file.note.edge)}${said(c.rbqm_states.single_file.note, 'RBQM, the single file')}`]
    ])}
    ${words('The line inside a biomarker chart', [
      ['Before R is started', q(c.blue.line)],
      ['With the blue note closed', q(c.closed.line)],
      ['While R starts', q(c.starting.line)],
      ['R did not start', q(c.failed.line)]
    ])}
  </div>

  <h3 id="unpictured">Sentences this page does not picture</h3>
  <p class="what">Two sentences of the RBQM tab’s note are met only when R goes wrong part way, which the capture cannot make happen on the live site. They are quoted from the code, not read from the site, and are held there by unit tests (${a(ROWS, 'requirement rows APP-RBQM-082 and APP-RBQM-083')}).</p>
  <div class="note said">
    <dl class="words">
      <dt>R stopped answering</dt><dd>${swatch(amber.edge)}“${esc(FROM_CODE.silent[0])}<span class="key">${esc(FROM_CODE.silent[1])}</span>${esc(FROM_CODE.silent[2])}” A reader meets it when R gives no answer for longer than the tab waits while R starts, loads gsm’s packages or runs; the tab then closes that R.</dd>
      <dt>R stopped</dt><dd>${swatch(amber.edge)}“${esc(FROM_CODE.stopped[0])}<span class="key">${esc(FROM_CODE.stopped[1])}</span>${esc(FROM_CODE.stopped[2])}” A reader meets it when R stops during the run of the metrics; R is kept, and the button runs them again without starting R again.</dd>
    </dl>
  </div>
  ${bullets([
    `Every other sentence of the RBQM tab’s note is pictured and read live: with R up and nothing run, with nothing loaded, with no file the metrics read, and in the app as one file (${a('#rbqm-states', 'section 04')}).`
  ])}
  ${tryIt([
    [
      `${a(`${TRY}#association-scatter`, 'Open the Association scatter')} and press Start R in the note.`,
      `For a moment the note is blue with a turning ring. Then it is gone, the control is a chip, ${q(c.ready.chip)}, and under the chart R’s test reads ${q(c.ready.line)}`
    ],
    [
      `${a(`${TRY}#biomarker-screen`, 'Open the Biomarker screen')} in the same visit.`,
      'It is drawn, with no note: R is already running.'
    ],
    [
      `To see R not start: ${a(`${TRY}#cross-tab`, 'open the Cross-tabulation')} in a new browser tab, switch the browser offline (developer tools, Network, Offline), then press Start R in the note.`,
      `The note turns amber: ${said(c.failed.offline, 'the note offline')}`
    ]
  ])}`
);

// ================================================================ 03 closing the blue note
const s03 = section(
  '03',
  'closed',
  'closing the blue note',
  'The blue note can be closed, and the chart points at the control again',
  `
  <p class="what">A reader who does not want p-values can put the blue note away. It is closed for the visit on all three charts that have it, and the control at the top right still starts R.</p>
  ${src(R_SRC)}
  ${figure({
    name: 'closed',
    alt: 'The Association scatter chart with the blue note closed. The chart sits at the top of the card, and the control at the right end of the chart names still reads Statistics need R with a Start R button.',
    cap: 'The Association scatter after the cross was clicked.',
    legend: [`The control is unchanged, and still starts R: ${q(c.closed.control)}.`, `The chart’s own line points at the control again: ${q(c.closed.line)}`]
  })}
  ${bullets([
    `Closed on one chart, it is closed on all three: neither the ${esc(c.blue.charts['cross-tab'].name)} nor the ${esc(c.blue.charts['group-comparison'].name)} showed a note afterwards, and the ${esc(c.blue.charts['cross-tab'].name)}’s line read ${q(c.closed.lines['cross-tab'])}`,
    'It stays closed through a visit to another tab and back.',
    `The amber note has no cross, and closing the blue one leaves it standing on the ${list(amberNames)}. Under their amber note those two charts keep pointing at it: ${q(c.closed.lines['correlation-matrix'])}`,
    c.closed.after_reload ? 'A reload is a new visit: the note is back.' : 'It was still closed after a reload.'
  ])}

  <h3>Closed stays closed while R starts</h3>
  ${figure({
    name: 'closed-starting',
    alt: 'The Association scatter with the blue note closed, while R starts. There is no note on the card. The control at the right end of the chart names reads Starting R with a count of seconds, and the line under the chart says R is starting.',
    cap: 'The Association scatter with the note closed, a few seconds after Start R was pressed on the control. R’s addresses were held back for the picture.',
    legend: [`The control says R is starting, and counts: ${q(c.closed.while_starting.control)}.`, `So does the chart’s own line: ${q(c.closed.while_starting.line)} There is no note.`]
  })}
  ${bullets([
    `None of the three blue charts showed a note while R started. The two that cannot be drawn without R still did: ${q(c.closed.while_starting.notes['correlation-matrix'].replace(/ \d+ MB$/, ''))}`,
    `That R did not start is always said. With R’s addresses then refused, the note was on all five charts: ${sayWith(c.closed.then_failed_on['association-scatter'], 'Try again')} on the three blue ones, the closed note back to say so, and ${sayWith(c.closed.then_failed_on['correlation-matrix'], 'Try again')} on the other two.`
  ])}
  ${tryIt([
    [`${a(`${TRY}#cross-tab`, 'Open the Cross-tabulation')} and click the cross at the right end of the note.`, `The note is gone, and the line under the chart reads ${q(c.closed.line)}`],
    [`Open the ${esc(c.blue.charts['association-scatter'].name)}, then the ${esc(c.amber.charts['correlation-matrix'].name)}.`, 'No note on the first. The amber note is still on the second.'],
    ['Go back to the Cross-tabulation and press Start R, at the right end of the chart names.', `No note comes back while R starts. A few seconds later R’s test is under the chart: ${q(c.ready.others['cross-tab'].line)}`],
    ['Reload the page.', 'The blue note is back.']
  ])}`
);

// ================================================================ 04 the RBQM tab
const s04 = section(
  '04',
  'rbqm',
  'the RBQM tab',
  'The RBQM tab opens on the same note',
  `
  <p class="what">The tab’s first line is now the note, amber because no metric can be worked out without R. One press in the note runs everything, as one press of the control does.</p>
  ${src([...R_SRC, `As drawn in ${a(`${DESIGN}#m3`, 'the design’s third mockup')}`])}
  ${swap({
    id: 'rbqm',
    cap: 'The RBQM tab on the pilot study, before R is started.',
    before: {
      name: 'rbqm-1110',
      alt: 'Release 1.11.0: the RBQM tab before R is started. The body opens with one line of plain text, and the control that starts R is at the right end of the row of metric names.',
      legend: [`One line of plain text: ${q(c.rbqm_before.body)}`, `The control: ${q(c.rbqm_before.control)}.`]
    },
    after: {
      name: 'rbqm',
      alt: 'Release 1.11.1: the RBQM tab before R is started. An amber note with a warning mark opens the body, with a Start R button inside its sentence.',
      legend: [
        `The note, in amber with the warning mark: ${said(c.rbqm.note, 'the RBQM note')}`,
        'Start R, inside the sentence. One press starts R and runs every metric the loaded study supports.',
        `The control is unchanged: ${q(c.rbqm.control)}.`
      ]
    }
  })}
  ${bullets([
    `Under the note, the line that says what the loaded study supports is as release 1.11.0 drew it, small and soft grey: ${q(c.rbqm.supports.says)}`
  ])}
  ${figure({
    name: 'rbqm-starting',
    alt: 'The RBQM tab while R starts. The note is blue with a turning ring and reads R is starting, with Step 1 of 6 in small print. Under it the six steps are listed, the first under way. The control at the top right names the step and counts the seconds.',
    cap: 'A few seconds after the press, with R’s addresses held back for the picture.',
    legend: [
      `The note is blue, with a turning ring and no button: ${said(c.rbqm_starting.note, 'the RBQM note while R starts')}`,
      `Its small print names the step, ${q(rbqmSmall)}, and counts no seconds.`,
      `The control names the same step and counts: ${q(c.rbqm_starting.control)}, ${q(c.rbqm_starting.control_seconds)}.`,
      `The six steps, as before: ${c.rbqm_starting.steps.map((step) => esc(step.replace(/ \((now|todo|done)\)$/, ''))).join('; ')}.`
    ]
  })}
  ${swap({
    id: 'rbqm-failed',
    cap: 'The RBQM tab with R’s addresses refused.',
    before: {
      name: 'rbqm-failed-1110',
      alt: 'Release 1.11.0: the RBQM tab when R did not start. The body says so in one line of coloured text, and the control at the top right reads R did not start in red, with Try again and Why.',
      legend: [
        `The body says so in ${esc(c.rbqm_failed_before.colour)} text: ${q(c.rbqm_failed_before.says)}`,
        'The control says the same in red, with the reason behind Why.'
      ]
    },
    after: {
      name: 'rbqm-failed',
      alt: 'Release 1.11.1: the RBQM tab when R did not start. The note is amber with a Try again button inside its sentence. The control at the top right reads R did not start in red, with Try again and Why.',
      legend: [
        `The note is amber: ${said(c.rbqm_failed.note, 'the RBQM note when R did not start')}`,
        'Try again, inside the sentence.',
        `The control still says ${q(c.rbqm_failed.control)} in red, with the reason behind Why.`
      ]
    }
  })}
  ${figure({
    name: 'rbqm-done',
    alt: 'The RBQM tab after a real run on the pilot study. There is no note. An outcome line says how many metrics R ran, above the site overview, and the control is a chip reading R ready.',
    cap: `After a real run on the pilot study, ${c.rbqm_done.seconds} seconds after Start R was pressed in the note. There is no note.`,
    legend: [`The control is a chip: ${q(c.rbqm_done.chip)}.`, `The outcome line: ${q(c.rbqm_done.outcome.replace(/ Run details$/, ''))}`]
  })}
  ${bullets([
    `On the way through a real run the note’s small print moved with the step: ${stepsSeen.map(q).join(', ')}.`,
    `Once R is up and running the metrics, the sentence changes: ${q(runningSaid)}`,
    `A metric’s page opens on the same note (${esc(c.views['rbqm-metric'].name)}, below).`,
    `A metric the loaded study cannot support says why in an amber note with no button, since starting R would not help: ${q(c.views['rbqm-cannot'].says)}${c.views_before && c.views_before.colour !== 'amber' ? ` Release 1.11.0 said the same in a box with a ${esc(c.views_before.colour)} edge.` : ''}`
  ])}
  <div class="views">
    ${viewTile('rbqm-metric', 'The top of a metric’s page on the RBQM tab, Adverse Event Rate: the same amber note with Start R inside its sentence.')}
    ${viewTile('rbqm-cannot', 'The top of a metric’s page for a metric the pilot study cannot support: an amber note says which file it needs.')}
  </div>

  <h3 id="rbqm-states">With R up and nothing yet run</h3>
  <p class="what">If the study is cleared while R starts, R comes up with nothing to run. When a study is chosen again, a blue note offers the run. This is the fourth thing to rule on (${a('#ruling', 'at the foot of this page')}).</p>
  ${swap({
    id: 'rbqm-ready',
    cap: 'The RBQM tab with R running and the pilot study chosen again after it was cleared.',
    before: {
      name: 'rbqm-ready-1110',
      alt: 'Release 1.11.0: the RBQM tab with R ready and nothing run. One line of plain text sends the reader to the R chip at the top right.',
      legend: [`One line of plain text, pointing at the chip: ${q(c.rbqm_ready_before.says)}`, 'The chip, whose panel holds the button that runs the metrics.']
    },
    after: {
      name: 'rbqm-ready',
      alt: 'Release 1.11.1: the same state. A blue note with the information mark reads R is ready, with a Run the metrics button inside its sentence.',
      legend: [
        `A blue note, with the information mark and no cross: ${said(c.rbqm_states.ready, 'the RBQM note with R up and nothing run')}`,
        'Run the metrics is a button inside the sentence. Pressed, it ran the three metrics the pilot study supports, and the note went.',
        'The chip is where it was.'
      ]
    }
  })}

  <h3>With nothing the metrics can run on</h3>
  <p class="what">Three amber notes with no button, because starting R would not help.</p>
  <div class="views">
    ${figure({
      name: 'rbqm-nofiles',
      alt: 'The top of the RBQM tab with nothing loaded: an amber note says nothing the metrics can run on is loaded.',
      label: 'Nothing loaded',
      cap: `${swatch(c.rbqm_states.no_files.edge)}After Reset on the Data tab. ${said(c.rbqm_states.no_files, 'RBQM, nothing loaded')}`
    })}
    ${figure({
      name: 'rbqm-noneplaced',
      alt: 'The top of the RBQM tab with one labs file loaded: an amber note says none of the loaded files is one the metrics read.',
      label: 'No file the metrics read',
      cap: `${swatch(c.rbqm_states.none_placed.edge)}With the demo study ${q(c.liver.name)}, one labs file. ${said(c.rbqm_states.none_placed, 'RBQM, no file gsm reads')}`
    })}
    ${figure({
      name: 'rbqm-singlefile',
      alt: 'The top of the RBQM tab in the app as one file: an amber note says the file cannot start R, and there is no control at the right end of the row.',
      label: 'The app as one file',
      cap: `${swatch(c.rbqm_states.single_file.note.edge)}The file the app’s footer offers as a download, opened from the site. It loads nothing from anywhere (${c.rbqm_states.single_file.asked_elsewhere} requests), so it has no control that starts R. ${said(c.rbqm_states.single_file.note, 'RBQM, the single file')}`
    })}
  </div>

  <h3>On a phone</h3>
  <div class="phones">
    ${figure({
      name: 'phone-rbqm',
      style: 'max-width:300px',
      alt: 'The RBQM tab at phone width. The amber note opens the body, its sentence wrapped, with Start R inside it.',
      cap: `The RBQM note at 390 pixels: ${c.phone.rbqm.note.width} pixels wide on a page ${c.phone.rbqm.scroll_width} wide.`,
      legend: ['The same sentence, wrapped.']
    })}
    ${stateTile('rbqm', 'Before R, at 390 pixels', c.phone.rbqm.note)}
    ${stateTile('rbqm-starting', 'While R starts, at 390 pixels', c.phone['rbqm-starting'].note)}
    ${stateTile('rbqm-failed', 'R did not start, at 390 pixels', c.phone['rbqm-failed'].note)}
  </div>
  ${tryIt([
    [`${a(`${TRY}#rbqm`, 'Open the RBQM tab')}.`, `An amber note: ${said(c.rbqm.note, 'the RBQM note')}`],
    ['Press Start R in the note, once.', `The note turns blue and names the step: ${q(rbqmSmall)}, then the next. The control at the top right counts the seconds.`],
    ['Wait about half a minute.', `The note is gone and the outcome line reads ${q(c.rbqm_done.outcome.replace(/ Run details$/, '').replace(/ in [\d.]+ seconds\./, ' in a few seconds.'))}`]
  ])}`
);

// ================================================================ 05 one note, two colours
const s05 = section(
  '05',
  'colours',
  'one note, two colours',
  'One note across the app: blue for information, amber for cannot run',
  `
  <p class="what">Every note the app draws is now one component with two looks. Blue is information. Amber is something that cannot run until the reader acts. Red is kept for a failure.</p>
  ${src([...NOTE_SRC, `As drawn in ${a(`${DESIGN}#all`, 'the design’s table of every note in the app')}`])}
  <div class="note key3">
    <p class="lbl">The colours, as read from the page</p>
    <ul>
      <li>${swatch(blue.edge)}Blue, information: the edge of the note is ${esc(blue.edge)}.</li>
      <li>${swatch(amber.edge)}Amber, cannot run: ${esc(amber.edge)}.</li>
      <li>${swatch(c.cannot_before.nofile.edge)}Red, in release 1.11.0, on a chart that could not be drawn: ${esc(c.cannot_before.nofile.edge)}.</li>
      <li>${swatch(c.first_before.welcome_edge_rgb)}${c.first_before.welcome_edge === 'purple' ? 'Purple' : esc(c.first_before.welcome_edge)}, in release 1.11.0, on the line on first open: ${esc(c.first_before.welcome_edge_rgb)}. No note has it now.</li>
    </ul>
  </div>

  <h3>A chart with no file loaded</h3>
  ${swap({
    id: 'nofile',
    cap: `The ${esc(c.cannot.nofile.chart)} with the demo study ${q(c.liver.name)} loaded, which has no adverse events file.`,
    before: {
      name: 'nofile-1110',
      alt: 'Release 1.11.0: the Adverse Event Explorer with no adverse events file loaded. A card with a red left edge says No file loaded for: Adverse events.',
      legend: [`A red card: ${q(c.cannot_before.nofile.says)}`]
    },
    after: {
      name: 'nofile',
      alt: 'Release 1.11.1: the same view. An amber note with a warning mark says No file loaded for: Adverse events.',
      legend: [`An amber note, with the warning mark and the same words: ${q(c.cannot.nofile.says)}`]
    }
  })}

  <h3>A column not mapped</h3>
  ${swap({
    id: 'notmapped',
    cap: `The ${esc(c.cannot.notmapped.chart)} on the pilot study, after the Result column of the labs file was set to “not mapped” on the Data tab.`,
    before: {
      name: 'notmapped-1110',
      alt: 'Release 1.11.0: the Histogram with the Result column not mapped. A card with a red left edge says Not mapped yet: Result.',
      legend: [`A red card: ${q(c.cannot_before.notmapped.says)}`]
    },
    after: {
      name: 'notmapped',
      alt: 'Release 1.11.1: the same view. An amber note with a warning mark says Not mapped yet: Result.',
      legend: [`An amber note: ${q(c.cannot.notmapped.says)}`]
    }
  })}

  <h3>The participant profile</h3>
  ${swap({
    id: 'profile',
    cap: 'The Participant Profile opened from its name in the row, with no participant chosen.',
    before: {
      name: 'profile-1110',
      alt: 'Release 1.11.0: the Participant Profile with no participant chosen. A card with a coloured left edge holds the sentence that says how to open it.',
      legend: [`The sentence that says how to open it, on a card with a ${esc(c.profile_before.colour)} left edge.`]
    },
    after: {
      name: 'profile',
      alt: 'Release 1.11.1: the same view. The sentence is a blue note with the information mark.',
      legend: [`A blue note with the information mark and no cross. The sentence is word for word release 1.11.0’s: ${q(c.profile.note.says)}`]
    }
  })}
  ${bullets([
    `Red is kept in two places. One is the control’s ${q(c.failed.control)}, pictured in ${a('#states', 'section 02')}.`,
    `The other is a chart that was ready and then failed, which keeps its red card. It is not pictured: the capture has no way to make a chart fail. The pull request says so, and requirement row APP-NOTE-002 records it (${a(PR_NOTE, 'safety.viz #324')}; ${a(ROWS, 'the demo app’s requirement rows')}).`,
    `The move of these two cases from red to amber is the third thing to rule on (${a('#ruling', 'at the foot of this page')}).`
  ])}
  ${tryIt([
    [`${a(`${TRY}#data`, 'Open the Data tab')} and choose ${q(c.liver.name)} from the menu of demo studies.`, `The Data tab says what it is: ${q(c.liver.note)}`],
    ['Open the Adverse events tab.', `An amber note: ${q(c.cannot.nofile.says)}`],
    [`Go back to the Data tab and choose ${q(c.first.study)} again.`, 'Every chart draws again.'],
    [`${a(`${TRY}#participant-profile`, 'Open the Participant Profile')} from its name in the Labs and vitals row.`, 'A blue note says how to open a profile.']
  ])}`
);

// ================================================================ 06 the first screen
const s06 = section(
  '06',
  'first',
  'the first screen',
  'The line on first open is gone',
  `
  <p class="what">Release 1.11.0 opened with a line above the first chart saying whose data this is. It is removed, and its purple edge with it. The Data tab still names the loaded study.</p>
  ${src(NOTE_SRC)}
  ${swap({
    id: 'first',
    cap: 'The demo app as it opens, on the pilot study.',
    before: {
      name: 'first-1110',
      alt: 'Release 1.11.0: the demo app as it opens. A line with a purple left edge sits above the first chart, saying You are looking at the CDISC pilot study.',
      legend: [`The line on first open, with a purple left edge and a cross: ${q(c.first_before.welcome)}`]
    },
    after: {
      name: 'first',
      alt: 'Release 1.11.1: the demo app as it opens. The first chart’s card starts directly under the row of chart names, with no line above it.',
      cap: `The app opens straight on its first chart. The chart’s card starts ${c.first.chart_top} pixels from the top of the page, where it started at ${c.first_before.chart_top}.`
    }
  })}
  ${bullets([
    `The Data tab still names the loaded study: ${q(c.first.study)}. On it, the study’s own note still says whose data this is: ${q(c.first.study_note)}`,
    'The line showed on any first visit, whichever chart was opened. The release 1.11.0 stills in the other sections of this page were taken with it closed, so each shows only its own change.'
  ])}
  ${tryIt([[`${a(TRY, 'Open the demo app')} in a private window, so that it is a first visit.`, 'The first chart is directly under the row of chart names. There is no line above it.']])}`
);

// ================================================================ 07 what did not change
const s07 = section(
  '07',
  'same',
  'what did not change',
  'What did not change',
  `
  <p class="what">Release 1.11.1 changes where the app says R can be started, and how its notes look. It does not change what the app works out.</p>
  ${bullets([
    'No chart is added and no metric is added.',
    `The app is still labelled ${q(c.first.status_label)}, and its status panel still counts: ${q(`${c.first.status_counts}.`)}`,
    `The control at the right end of the chart names reads the same on both sites: ${q(c.blue.control)} on the Biomarkers tab and ${q(c.rbqm.control)} on the RBQM tab.`,
    `R still starts only when asked. Before a press the page had asked nothing of R’s addresses, on the Biomarkers tab (${c.blue.asked_of_r} requests) and on the RBQM tab (${c.rbqm.asked_of_r}).`,
    `R’s answers read the same on both sites. On the ${esc(c.blue.charts['association-scatter'].name)}: ${q(c.ready_before.line)} On the ${esc(c.blue.charts['cross-tab'].name)}: ${q(c.ready_before.cross_tab)}`,
    `A real run of the RBQM tab on the pilot study ends in the same line on both sites, but for its seconds, and the first row of the site overview is the same: ${q(c.rbqm_done_before.outcome.replace(/ Run details$/, ''))}`,
    `No file of R’s changed, and no chart’s code changed: the release notes say so, and the footer of a biomarker chart still names the chart library as it was, ${q((c.blue.foot.match(/bio\.viz \d+(\.\d+)*/) || [''])[0])} (${a(NEWS, 'the release notes')}).`,
    `What holds the note in place is a set of browser tests named by requirement rows: APP-NOTE-003 and APP-PAGE-044 for the standard note and the first screen, APP-R-060 to APP-R-063 for the note on the biomarker charts, and APP-RBQM-082 for the RBQM tab (${a(PR_NOTE, 'safety.viz #324')}; ${a(PR_R, 'safety.viz #325')}).`
  ])}`
);

// ================================================================ for your ruling
const ruling = `
<div class="cut"><span>08 <em>· before you approve</em></span></div><section id="ruling">
  <div class="hd"><h2>For your ruling at review</h2></div>
  <div class="note ask">
    <p class="lbl">Six things, none of which holds the release</p>
    <ol class="rulings">
      <li>
        <h3>The sentences in the notes are drafts</h3>
        <p>They ship as drafted and are yours to correct. Every one is printed under ${a('#words', 'every sentence the note says')}, and the two this page cannot picture under ${a('#unpictured', 'sentences this page does not picture')}.</p>
      </li>
      <li>
        <h3>No seconds in the note while R starts</h3>
        <ul>
          <li>The design page drew seconds in the note: “13 MB · 4 s” (${a(`${DESIGN}#m2`, 'the design’s second mockup')}).</li>
          <li>The build leaves the seconds to the control. The note reads ${q(startingSmall)} and the control ${q(c.starting.control)} (${a('media/starting.jpg', 'the picture')}).</li>
          <li>The reason is a standing rule that keeps one count on the page (${a(ROWS, 'requirement row APP-RBQM-019')}).</li>
          <li>Say if you want the seconds in the note as well.</li>
        </ul>
      </li>
      <li>
        <h3>Three cases moved from red to amber</h3>
        <ul>
          <li>A chart with no file loaded, which was a red card: ${q(c.cannot.nofile.says)} (${a('media/nofile.jpg', 'the picture')}).</li>
          <li>A chart with a column not mapped, which was a red card: ${q(c.cannot.notmapped.says)} (${a('media/notmapped.jpg', 'the picture')}).</li>
          <li>The RBQM tab’s line when R did not start, stopped answering or stopped, which was ${esc(c.rbqm_failed_before.colour)} text: ${said(c.rbqm_failed.note, 'the RBQM note when R did not start')} (${a('media/rbqm-failed.jpg', 'the picture')}).</li>
          <li>Red is kept for a chart that was ready and failed, and for the control’s ${q(c.failed.control)}.</li>
          <li>One more move, not from red: a metric the loaded study cannot support said why in a box with a ${esc(c.views_before.colour)} edge, and now says it in an amber note (${a('media/view-rbqm-cannot.jpg', 'the picture')}).</li>
        </ul>
      </li>
      <li>
        <h3>The RBQM tab has one note while R is ready</h3>
        <ul>
          <li>The design said that once R is ready there is no note.</li>
          <li>The build has one, in one state: R is up and nothing has yet run on what is loaded. A blue note reads ${said(c.rbqm_states.ready, 'the RBQM note with R up and nothing run')} (${a('media/rbqm-ready.jpg', 'the picture')}).</li>
          <li>In release 1.11.0 this state was a line of text: ${q(c.rbqm_ready_before.says)}</li>
          <li>Say if you want it otherwise.</li>
        </ul>
      </li>
      <li>
        <h3>The hub’s line on one control that starts R</h3>
        <ul>
          <li>The hub’s developer guidelines say: “One way to do a thing across an app: one control that starts R, in one place” (${a(GUIDE, 'the guidelines, designing and checking what people look at')}).</li>
          <li>The approved design adds a second place to press, the note. Its button calls the control’s own press.</li>
          <li>safety.viz’s contributing guide was reworded to say so. The hub’s line was not (${a(CONTRIBUTING, 'the contributing guide’s demo app conventions')}).</li>
          <li>Proposed wording for the hub’s line, yours to accept: “one control that starts R, in one place; a note may repeat its press inside a sentence, and it is the same press”.</li>
        </ul>
      </li>
      <li>
        <h3>The requirement is not yet linked under the demo-ready objective</h3>
        <p>The requirement for the standard note names that objective, but is not yet one of its linked requirements. That link is yours (${a(OBJECTIVE, 'the objective: a demo app ready to show, obot.roadmap #401')}; ${a(REQ, 'the requirement, obot.roadmap #420')}).</p>
      </li>
    </ol>
  </div>
  <div class="close" style="margin-top:40px">
    <div>
      <h3>Not in this release</h3>
      <ul>
        <li>A button inside the chart’s own line. That line is drawn by the chart library, so it would need a release of the library; the app changes only the words it hands over (${a(`${DESIGN}#build`, 'the design’s list of what is left out')}).</li>
        <li>The chart library naming for itself which charts cannot be drawn without R. For now the app names the two (${a(REQ, 'the requirement’s design section')}).</li>
      </ul>
    </div>
    <div>
      <h3>Where to look further</h3>
      <ul>
        <li>${a(TRY, 'The demo app')}, on ${esc(siteName)}.</li>
        <li>${a(DESIGN, 'The design this was built from')}: annotated mockups of the note in each state.</li>
        <li>${a(NEWS, 'The release notes')}, which are short; this page carries the detail.</li>
        <li>${a('https://jwildfire.github.io/obot.roadmap/reports/sv-v1.11-demo/', 'The demo page of release 1.11.0')}, for the control that starts R and the RBQM tab.</li>
        <li>${a(`${HERE}/capture.json`, 'What the capture read')}, and ${a(`${HERE}/README.md`, 'how each picture was made')}.</li>
      </ul>
    </div>
  </div>
</section>`;

// ================================================================ the page
const css = fs.readFileSync(path.join(dir, 'page.css'), 'utf8');
const html = `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>safety.viz v1.11.1 — annotated demo</title>
<meta name="description" content="What safety.viz v1.11.1 changes in the demo app, shown beside release 1.11.0: a note at the top of each card where R can be started, blue or amber, in every state, with steps to try and six things that are yours to rule on at the review.">
<style>
${css}</style>
</head>
<body>

<div class="wrap">

<header class="mast">
  <p class="eyebrow">safety.viz <span class="dot"></span> release candidate review <span class="dot"></span> ${date}</p>
  <h1>What <span class="v">v1.11.1</span> changes, annotated</h1>
  <p class="lede">Release 1.11.1 is a patch to the demo app. Wherever R can be started, a note at the top of the card now says why R is wanted and what starting it costs, with Start R inside the sentence. Every note in the app is now blue for information or amber for something that cannot run, and the line on first open is removed. No chart and no metric is added, and nothing the app computes changes.</p>
  <!-- RC-LINK -->
  <p class="facts">
    <span>${held} of ${held} things this page says, held to the live site by a script</span>
    <span>captured ${date} from ${esc(siteName)}</span>
    <span>public pilot study: 254 participants <span class="dot"></span> with 110 synthetic participants in its labs file</span>
  </p>

  <div class="note" id="links">
    <p class="lbl">Where everything is</p>
    <ul>
      <li>The demo app, on ${esc(siteName)} (${a(TRY, esc(TRY.replace('https://', '').replace(/\/$/, '')))}).</li>
      <li>The design this was built from: annotated mockups of the note (${a(DESIGN, 'the design page')}).</li>
      <li>The requirement: a standard note where R can be started (${a(REQ, 'obot.roadmap #420')}).</li>
      <li>Task one: add the app’s standard note, use it for every note, and remove the line on first open (${a(T_NOTE, 'safety.viz #321')}).</li>
      <li>Task two: put the R note on the biomarker charts and the RBQM tab (${a(T_R, 'safety.viz #322')}).</li>
      <li>Task three: prepare release 1.11.1 (${a(T_PREP, 'safety.viz #323')}).</li>
      <li>Pull request one: the app’s notes are one standard note, blue or amber, and the first-open line is gone (${a(PR_NOTE, 'safety.viz #324')}).</li>
      <li>Pull request two: the note where R can be started, with Start R inside its sentence (${a(PR_R, 'safety.viz #325')}).</li>
      <li>Pull request three: release preparation, the version, the bundle and the notes (${a(`${SV}/pull/326`, 'safety.viz #326')}).</li>
      <li>The release candidate: safety.viz v1.11.1-RC1 (${a(`${SV}/pull/327`, 'safety.viz #327')}).</li>
      <li>Task four: fix what the review of the release candidate found (${a(T_FIX, 'safety.viz #328')}).</li>${
        c.github && c.github.fix_pull
          ? `\n      <li>Pull request four: the fixes from that review (${a(c.github.fix_pull.url, `safety.viz #${c.github.fix_pull.number}`)}).</li>`
          : ''
      }
    </ul>
  </div>

  <div class="note ask">
    <p class="lbl">Yours to rule on at this review</p>
    <p>Six things, set out at ${a('#ruling', 'the foot of this page')}:</p>
    <ul>
      <li>the notes’ sentences, which are drafts;</li>
      <li>no seconds in the note while R starts;</li>
      <li>three cases that moved from red to amber;</li>
      <li>a note on the RBQM tab while R is ready and nothing has run;</li>
      <li>the hub’s line on one control that starts R;</li>
      <li>a link on the hub, from the objective to this requirement.</li>
    </ul>
  </div>

  <div class="note">
    <p class="lbl">How to read this page</p>
    <ul>
      <li>Where the app changed its look, a switch above the picture swaps release 1.11.0 and release 1.11.1 in place. Release 1.11.0 is ${beforeName}; release 1.11.1 is ${esc(siteName)}.</li>
      <li>A numbered marker on a picture is explained by the same number under it. Tap a picture to open it at full size.</li>
      <li>Every sentence quoted from the app was read from the live page by the script beside this page, which stops when one differs from what is expected (${a(`${HERE}/capture.json`, 'what it read')}).</li>
      <li>A word drawn like <span class="key">Start R</span> inside a quoted sentence is a button in the app.</li>
      <li>${versionLine}</li>
    </ul>
  </div>
</header>

<nav class="toc" aria-label="Contents">
  <a href="#note"><span class="ref">01</span><span class="t">The note</span><span class="s">Blue where R adds p-values, amber where nothing runs without it</span></a>
  <a href="#states"><span class="ref">02</span><span class="t">The note follows R</span><span class="s">Starting, did not start, ready</span></a>
  <a href="#closed"><span class="ref">03</span><span class="t">Closing the blue note</span><span class="s">Closed on one chart, closed on all three</span></a>
  <a href="#rbqm"><span class="ref">04</span><span class="t">The RBQM tab</span><span class="s">The same note, with the step R is on</span></a>
  <a href="#colours"><span class="ref">05</span><span class="t">One note, two colours</span><span class="s">Blue for information, amber for cannot run</span></a>
  <a href="#first"><span class="ref">06</span><span class="t">The first screen</span><span class="s">The line on first open is gone</span></a>
  <a href="#same"><span class="ref">07</span><span class="t">What did not change</span><span class="s">No chart, no metric, nothing computed</span></a>
  <a href="#ruling"><span class="ref">08</span><span class="t">For your ruling</span><span class="s">Six things, at the review</span></a>
</nav>
${s01}
${s02}
${s03}
${s04}
${s05}
${s06}
${s07}
${ruling}

<footer>
  <p>Pictures taken ${date} with Playwright in headless Chromium, running real R in the browser where a picture shows R ready. Release 1.11.1 is ${esc(siteName)}, ${a(c.site.after, esc(c.site.after.replace('https://', '')))}. When the capture began its footer read ${q(version)}${c.site.commit ? ` and its branch, ${esc(c.site.branch)}, stood at ${a(`${SV}/commit/${c.site.commit}`, c.site.commit.slice(0, 7))}` : ''}; every picture of release 1.11.1 is from that one run. Release 1.11.0 is ${beforeName}, ${a(c.site.before, esc(c.site.before.replace('https://', '')))}. Stills are 1,280 by 800 pixels at 1.5 times, and 390 by 844 for a phone.</p>
  <p style="margin-top:10px">Data: the pilot study is 254 participants from the public CDISC pilot study; its labs file also carries 110 synthetic liver and kidney participants, as the app’s Data tab says. The demo study ${q(c.liver.name)} is synthetic. No real participant appears.</p>
  <hr>
  <p>This page was drafted by Claude Code using Opus 5.5.</p>
</footer>

</div>
</body>
</html>
`;

// Every still on disk is on the page, and the page names no other.
const onDisk = fs.readdirSync(path.join(dir, 'media')).filter((name) => name.endsWith('.jpg')).map((name) => name.replace(/\.jpg$/, ''));
const unused = onDisk.filter((name) => !used.has(name));
if (unused.length) throw new Error(`Stills on disk that the page does not show: ${unused.join(', ')}`);

fs.writeFileSync(path.join(dir, 'index.html'), html);
console.log(`index.html: ${html.length.toLocaleString('en-US')} characters, ${used.size} stills, ${held} checks held`);
