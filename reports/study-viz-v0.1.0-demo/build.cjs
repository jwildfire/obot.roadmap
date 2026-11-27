// Writes index.html for the study.viz v0.1.0 demo page from capture.json,
// which capture.cjs wrote. The labels, counts, checksums and times the page
// quotes come from capture.json; none is typed here by hand.
//
//   node build.cjs [dir]        default: the folder this file is in
//
//   RELEASED_ON="27 November 2026" node build.cjs
//       after the release: the status word and the line under "Where it stands"
//       say released, with that date, and the steps link to the released app.
//
// It stops when a check in capture.json did not hold, when a still is missing,
// or when the page would carry a script. When the capture marked the study
// view in sections as pending, the page is written with a named placeholder
// for each still that is missing.
const fs = require('node:fs');
const path = require('node:path');

const dir = process.argv[2] || __dirname;
const c = JSON.parse(fs.readFileSync(path.join(dir, 'capture.json'), 'utf8'));
const failed = Object.entries(c.checks).filter(([, v]) => !v.pass);
if (failed.length) throw new Error(`capture.json has checks that did not hold: ${failed.map(([n]) => n).join('; ')}`);
const held = Object.keys(c.checks).length;
for (const f of Object.keys(c.stills)) if (!fs.existsSync(path.join(dir, 'media', f))) throw new Error(`missing still: ${f}`);

// ---------------------------------------------------------------- addresses
const STV = 'https://github.com/jwildfire/study.viz';
const SV = 'https://github.com/jwildfire/safety.viz';
const HUB = 'https://github.com/jwildfire/obot.roadmap';
const DEV_APP = 'https://jwildfire.github.io/study.viz/dev/';
const RELEASED_APP = 'https://jwildfire.github.io/study.viz/';
const RELEASED_ON = process.env.RELEASED_ON || '';
const APP = RELEASED_ON ? RELEASED_APP : DEV_APP;
const HERE = `${HUB}/tree/main/reports/study-viz-v0.1.0-demo`;
const SV_PAGE = '../sv-v1.13.0-demo/';
const doc = (f) => `${STV}/blob/dev/${f}`;

// ---------------------------------------------------------------- words
const esc = (t) => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const q = (t) => `“${esc(t)}”`;
const a = (href, text) => `<a href="${href}">${text}</a>`;
const cite = (href, text) => ` (${a(href, text)})`;
const n = (v) => Number(v).toLocaleString('en-US');
const secs = (v) => `${Math.round(Number(v))} seconds`;
const date = new Date(c.site.captured).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'America/New_York' });
const short = (sha) => (sha ? sha.slice(0, 8) : 'unknown');
const key = (t) => `<span class="key">${esc(t)}</span>`;
const list = (items) => items.map(esc).join(', ');

function shot(st, alt) {
  const marks = st.markers.map((m, i) => `<span class="mk" style="left:${m.left}%;top:${m.top}%" aria-hidden="true">${i + 1}</span>`).join('');
  return `<a class="frame" href="media/${st.file}"><img src="media/${st.file}" width="${st.width}" height="${st.height}" alt="${esc(alt)}" loading="lazy">${marks}</a>`;
}
const legendList = (st, legend) => {
  if (st.markers.length !== legend.length) throw new Error(`${st.file}: ${st.markers.length} markers, ${legend.length} legend lines`);
  return legend.length ? `<ol class="legend">${legend.map((l) => `<li>${l}</li>`).join('')}</ol>` : '';
};
function solo(st, label, alt, legend, caption) {
  const cls = st.width >= 1100 ? 'solo wide' : 'solo own';
  return `<figure class="${cls}" style="--w:${st.width}px"><div class="lbl now">${esc(label)}</div>${shot(st, alt)}${legendList(st, legend)}</figure>
<p class="cap">${caption}</p>`;
}
const grid = (figs) => `<div class="views">${figs.map((f) => `<figure><div class="lbl now">${esc(f.label)}</div>${f.missing ? `<div class="missing">Still to come: ${esc(f.missing)}</div>` : `${shot(f.still, f.alt)}${legendList(f.still, f.legend || [])}`}${f.cap ? `<p class="cap">${f.cap}</p>` : ''}</figure>`).join('\n')}</div>`;
const ul = (items, cls = 'list') => `<ul class="${cls}">${items.filter(Boolean).map((i) => `<li>${i}</li>`).join('')}</ul>`;
const steps = (items) => `<div class="note try"><div class="lbl">Try it</div><ol class="steps">${items.map(([d, s]) => `<li><span class="do">${d}</span><span class="see">${s}</span></li>`).join('')}</ol></div>`;

// ---------------------------------------------------------------- what was read
const HO = c.home;
const SA = c.same;
const SE = c.sections;
const BU = c.build;
const HE = c.held;
const BS = c.build_settings;
const link = (re) => HO.links.find((l) => re.test(l.text)) || {};
const [appVersion, chartVersion] = HO.version.split(' · ');
const tabTitle = HO.title.split(' · ').slice(1).join(' · ');
const demo = SA.here.menu.items.filter((i) => /demo/i.test(i.kind));
const sim = SA.here.menu.items.filter((i) => /simulated/i.test(i.kind));
const charts = Object.values(SA.here.items).reduce((s, v) => s + v.length, 0);
const walk = (sec) => (SE.walk || []).find((w) => w.section === sec);
const pending = !!SE.pending;
const missing = (sec) => (SE.missing || []).find((m) => m.section === sec);
const check = (HE.checkRuns || []).find((r) => /Build, format, and test/.test(r.name));
const TR = HE.testRun;

const css = fs.readFileSync(path.join(dir, 'page.css'), 'utf8');

const DESCRIPTION = 'The first release candidate of study.viz, the demo app carved out of safety.viz into its own repository: its own name and address, the same studies and charts, a simulated study in sections, and the records that hold the copy to its source.';
if (DESCRIPTION.length < 40 || DESCRIPTION.length > 260) throw new Error(`description is ${DESCRIPTION.length} characters`);

const STATUS_WORD = RELEASED_ON ? `Released ${esc(RELEASED_ON)}` : 'Release candidate';
const STANDS = RELEASED_ON
  ? `study.viz v0.1.0 was released on ${esc(RELEASED_ON)}, on @jwildfire’s approval of its release candidate. It is the first release of this repository. The stills on this page are of the dev build the candidate was cut from.`
  : `study.viz v0.1.0 is a release candidate, the first for this repository. It is not released until @jwildfire approves the candidate. The stills on this page are of the dev build the candidate is cut from.`;

const sectionFigures = () => {
  const fig = (sec, label, alt, cap) => (pending ? { label, missing: `${missing(sec).file} (${sec}${missing(sec).view ? `, ${missing(sec).view}` : ''})`, cap } : { label, still: walk(sec).still, alt, cap });
  return grid([
    fig('Design', 'Design · Schedule', 'The Design section, Schedule view: the protocol’s visits across the top and its activities down the side, with a dot where an activity happens at a visit.', 'Design has two views, Protocol and Schedule. It appears only when the study followed a protocol.'),
    fig('Data', 'Data · Pipeline', 'The Data section, Pipeline view: the settings the study was asked to be, then every table by layer with the workflow that built it.', 'Data has three views: Pipeline, Tables and Columns.'),
    fig('One participant', 'One participant', 'The One participant section: a chooser for the participant, then that participant’s rows in each table.', 'One participant, followed across every table.'),
    fig('Reporting', 'Reporting · Efficacy', 'The Reporting section, Efficacy view: a line chart of a simulated score by arm, with a table under it.', 'Reporting has two views here: Efficacy and Adverse events.')
  ]);
};

const html = `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>study.viz v0.1.0 — annotated demo</title>
<meta name="description" content="${esc(DESCRIPTION)}">
<style>
${css}
</style>
</head><body>
<div class="wrap">

<header class="mast">
  <div class="eyebrow"><span>study.viz</span><span class="dot"></span><span>v0.1.0</span><span class="dot"></span><span id="status-word">${STATUS_WORD}</span><span class="dot"></span><span>Annotated demo</span></div>
  <h1>study.viz <span class="v">v0.1.0</span>: the demo app, in a home of its own</h1>
  <p class="lede">study.viz is new. It is the demo app that lived inside safety.viz, copied into its own repository under its own name. safety.viz keeps the charts. study.viz keeps the app that hosts them. This page shows what is particular to study.viz; what the app does is walked in full on the ${a(SV_PAGE, 'safety.viz v1.13.0 demo page')}.</p>
  <div class="facts"><span>Captured ${esc(date)}</span><span>${esc(c.site.app_is)}, ${esc(c.site.branch)} at ${esc(short(c.site.commit))}</span><span>${held} of ${held} checks held</span><span>1,400 by 900 window, light theme</span></div>

  <div class="note">
    <div class="lbl">Where it stands</div>
    <ul>
      <li id="rc-links">${STANDS}</li>
      <li>Until the release, the app is at ${a(DEV_APP, 'jwildfire.github.io/study.viz/dev/')}. After the release it is at ${a(RELEASED_APP, 'jwildfire.github.io/study.viz/')}; that address has no page before then.</li>
      <li>Every study on this page is public or made up. The demo studies come from the public CDISC pilot study, and every row of a simulated study is synthetic.</li>
      <li>Nothing in the app is qualified. Its own label reads ${q(SA.here.status.charAt(0) + SA.here.status.slice(1).toLowerCase())}: every result should be confirmed.</li>
    </ul>
  </div>

  <div class="note">
    <div class="lbl">In short</div>
    <ul>
      <li>The app has its own address and its own name. Its header reads ${q('study.viz')}, its browser tab ${q(tabTitle)}, and its footer ${q(HO.version)}.</li>
      <li>It does what the safety.viz demo does. The capture read both apps and found the same tabs, the same ${n(charts)} charts, the same ${n(SA.here.menu.items.length)} studies and the same Studies page.</li>
      <li>A simulated study is shown in sections${pending ? ' once the dev build carries study.builder v0.5.0; the stills are still to come' : `: ${list(SE.sections)}`}.</li>
      <li>No chart's source is in study.viz. The charts are safety.viz's built file, copied byte for byte.</li>
      <li>Every copied file is recorded with a checksum against the safety.viz commit it came from, and a check fails when a file and the record disagree.</li>
    </ul>
  </div>

  <div class="note">
    <div class="lbl">What to look at</div>
    <ol>
      <li>Open the ${a(APP, 'app')}. Read the name in the header, the title of the browser tab, and the last line of the footer.</li>
      <li>Press the chip that reads ${q(SA.here.menu.items.find((i) => i.inUse).name)}. The list is the one the safety.viz demo shows.</li>
      <li>Choose ${key('PILOT-PROTOCOL')}, then press ${key('Overview')}, and walk the sections.</li>
      <li>Read section 5 of this page: what is recorded, and what was compared.</li>
    </ol>
  </div>
</header>

<nav class="toc" aria-label="Contents">
  <a href="#home"><span class="ref">01</span><span class="t">Its own home and name</span><span class="s">The header, the tab, the footer</span></a>
  <a href="#same"><span class="ref">02</span><span class="t">The same app</span><span class="s">Read beside the safety.viz demo</span></a>
  <a href="#sections"><span class="ref">03</span><span class="t">A study in sections</span><span class="s">study.builder's study view</span></a>
  <a href="#build"><span class="ref">04</span><span class="t">Built with R</span><span class="s">One study, built and scored</span></a>
  <a href="#held"><span class="ref">05</span><span class="t">How it is held</span><span class="s">The record, the charts, the tests</span></a>
  <a href="#not"><span class="ref">06</span><span class="t">Not checked</span><span class="s">What this page does not show</span></a>
</nav>

<div class="cut"><span>01 <em>/ its own home and name</em></span></div>
<section id="home">
  <div class="hd"><h2>The app has its own home and name</h2></div>
  <p class="what">In safety.viz the app was one page of the docs site, at <code>demo/</code>. Here the app is the site: it opens at the site's root.</p>
  ${solo(HO.still, 'The app as it opens', `The study.viz demo app as it opens: a header with the name study.viz and the words Demo app, a chip naming the study, the tabs, and the Safety Histogram on the Pilot study.`, ['The wordmark reads study.viz. It is not a link: there is no docs site behind it here.'], `The browser tab is titled ${q(HO.title)}.`)}
  ${solo(HO.footerStill, 'The footer', `The footer of the app: a line about files and R, then the links ${HO.links.map((l) => l.text).join(', ')}, then ${HO.version}.`, [`${q(HO.version)}: the app's own version, then the version of the charts it carries.`, `${q(link(/docs/i).text)}: the docs are safety.viz's, and the link says so.`], 'Two versions, because two things are here: the app, and the charts it hosts.')}
  <dl class="words">
    <dt>Header</dt><dd>${q(HO.brand.text.replace(/ DEMO APP$/i, ''))}, with the words ${q('Demo app')} beside it.</dd>
    <dt>Browser tab</dt><dd>${q(HO.title)}: the chart or page, then ${q(tabTitle)}.</dd>
    <dt>Footer</dt><dd>${q(HO.version)}.</dd>
    <dt>${esc(link(/docs/i).text)}</dt><dd>Leads to ${a(link(/docs/i).href, esc(link(/docs/i).href.replace(/^https:\/\//, '')))}. The chart gallery and each chart's own pages stay on safety.viz's site.</dd>
    <dt>${esc(link(/source/i).text)}</dt><dd>Leads to ${a(link(/source/i).href, esc(link(/source/i).href.replace(/^https:\/\//, '')))}.</dd>
    <dt>${esc(link(/one file/i).text)}</dt><dd>Leads to a file named <code>${esc((link(/one file/i).href || '').split('/').pop())}</code>. It was not opened here.</dd>
  </dl>
  ${steps([
    [`Open the ${a(APP, 'app')}.`, `The header reads study.viz. The browser tab reads ${q(HO.title)}.`],
    ['Scroll to the foot of the page.', `The last line reads ${q(HO.version)}.`]
  ])}
</section>

<div class="cut"><span>02 <em>/ the same app</em></span></div>
<section id="same">
  <div class="hd"><h2>It does what the safety.viz demo does</h2></div>
  <p class="what">The capture opened study.viz and the ${a(SA.compare, 'safety.viz demo')} built from its dev branch, read the same things from each, and compared them. They were the same.</p>
  <table class="reads">
    <thead><tr><th>What was read</th><th>In both apps</th></tr></thead>
    <tbody>
      <tr><td>The tabs</td><td data-h="Both">Overview, then ${list(SA.here.tabs.map((t) => t.replace(/ NOT RUN$/, '')))}</td></tr>
      <tr><td>The charts under the tabs</td><td data-h="Both">${n(charts)}, with the same names and the same ready marks</td></tr>
      <tr><td>The studies under the chip</td><td data-h="Both">${n(demo.length)} marked ${esc(demo[0].kind)} (${list(demo.map((i) => i.name))}) and ${n(sim.length)} marked ${esc(sim[0].kind)} (${list(sim.map((i) => i.name))})</td></tr>
      <tr><td>The Studies page</td><td data-h="Both">${n(SA.here.studies.ways.length)} ways to add a study (${list(SA.here.studies.ways.map((w) => w.head))}) and ${n(SA.here.studies.rows.length)} studies listed</td></tr>
      <tr><td>On the study it opens with</td><td data-h="Both">${q(SA.here.count)}</td></tr>
    </tbody>
  </table>
  <p class="cap">What differs is the name: the header, the tab title, the footer and its links, as section 1 shows.</p>
  ${grid([
    { label: 'The chip, pressed', still: SA.menuStill, alt: `The list under the chip in study.viz: ${SA.here.menu.items.map((i) => `${i.name}, ${i.kind}`).join('; ')}; then the buttons ${SA.here.menu.foot.join(' and ')}.`, cap: `The list of studies, with ${key(SA.here.menu.foot[0])} and ${key(SA.here.menu.foot[1])} under it.` },
    { label: 'The Studies page', still: SA.studiesStill, alt: `The Studies page in study.viz: three ways to add a study, then the list of studies.`, cap: `${list(SA.here.studies.ways.map((w) => w.button))}, then every study.` }
  ])}
  ${solo(SA.chart.still, 'A chart tab', `The ${SA.chart.title.split(' · ')[0]} in study.viz, on the Pilot study.`, [], `The ${esc(SA.chart.title.split(' · ')[0])}. The chart is safety.viz's; study.viz draws it from the copied bundle (section 5).`)}
  ${ul([`For the chip, the Studies page, the builder, the files and the mapping in detail, see the ${a(SV_PAGE, 'safety.viz v1.13.0 demo page')}. Each of its steps works the same here.`])}
  ${steps([
    [`In the ${a(APP, 'app')}, press the chip.`, `${n(SA.here.menu.items.length)} studies: ${n(demo.length)} demo, ${n(sim.length)} simulated.`],
    [`Press ${key(SA.here.menu.foot[1])}.`, `The Studies page, titled ${q(SA.here.studies.title)} in the browser tab.`]
  ])}
</section>

<div class="cut"><span>03 <em>/ a study in sections</em></span></div>
<section id="sections">
  <div class="hd"><h2>A simulated study is shown in sections</h2></div>
  <p class="what">For a simulated study the Overview tab is study.builder's study view, from its v0.5.0 release. The views are grouped into sections, and a section with more than one view has a second row of tabs.</p>
  ${
    pending
      ? `<div class="note decided"><div class="lbl">Stills still to come</div><ul><li>When this page was captured, the dev build still showed the older study view, with every view in one row: ${list(SE.all)}.</li><li>The stills of the sections are named below and are taken with <code>PARTS=sections node capture.cjs</code>, then <code>node build.cjs</code>.</li></ul></div>
  <figure class="solo wide"><div class="lbl now">PILOT-PROTOCOL · Overview</div><div class="missing">Still to come: ${esc(missing('Overview').file)} (Overview)</div></figure>`
      : solo(walk('Overview').still, 'PILOT-PROTOCOL · Overview', `The Overview tab on PILOT-PROTOCOL in study.viz. A line of facts: ${SE.facts.join(', ')}. On the left the study's tables by layer: ${SE.layers.join(', ')}. On the right the sections ${SE.sections.join(', ')}, with Overview open.`, [], `The sections: ${list(SE.sections)}. The facts in the line: ${list(SE.facts)}. This ready-made study opened with no R.`)
  }
  ${sectionFigures()}
  ${ul([
    'study.builder has RBQM and Safety views of its own. They are left out here, in the study view and in the builder. The app’s RBQM tab and its chart tabs show the same study.',
    pending ? null : 'On a window 1,400 wide, each of the five views stayed inside the page: none made it scroll sideways.'
  ])}
  ${steps([
    [`Choose ${key('PILOT-PROTOCOL')} from the chip, then press ${key('Overview')}.`, `The sections are ${list(pending ? ['Overview', 'Design', 'Data', 'One participant', 'Reporting'] : SE.sections)}.`],
    [`Press ${key('Design')}, then ${key('Schedule')}.`, 'The protocol’s visits run across the top, its activities down the side.']
  ])}
</section>

<div class="cut"><span>04 <em>/ built with R</em></span></div>
<section id="build">
  <div class="hd"><h2>A study built with R, then scored on the RBQM tab</h2></div>
  <p class="what">One study was built here, small: ${n(BS.participants)} participants at ${n(BS.sites)} sites over ${n(BS.months)} months. R ran in the browser. The same R then ran the site metrics.</p>
  ${solo(BU.built.still, 'Built', `The built study, ${BS.name}, in study.viz: a badge reading ${BU.built.builtIn}, the button Load into the demo, the facts ${BU.built.facts.slice(0, 6).join(', ')}, and the study view under them.`, [`${key('Load into the demo')} hands the study to the charts and the RBQM tab.`], `${q(BU.built.builtIn)}. From pressing ${key('Build the study')} to this screen took ${secs(BU.build.seconds)}, which includes starting R.`)}
  ${solo(BU.rbqm.still, `The RBQM tab: ${BU.rbqm.tab.replace(/^RBQM /, '')}`, `The RBQM tab in study.viz on the built study: the tab reads ${BU.rbqm.tab} and a site overview table lists the study's sites with a mark for each metric.`, [], `${BU.rbqm.said ? `${q(BU.rbqm.said)} ` : ''}Starting it took ${secs(BU.rbqm.seconds)} and made ${n(BU.rbqm.runtime)} requests to R's own host: R was already running.`)}
  ${ul([
    `The build said its steps as R took them: ${BU.steps.map(q).join(', ')}.`,
    `After ${key('Load into the demo')} the chip read ${q(BU.loaded.chip)}, and the app said ${q(BU.loaded.count)}.`,
    `Times are from one run on one machine. The form, a protocol in the form, and both orders of starting R are on the ${a(`${SV_PAGE}#build`, 'safety.viz v1.13.0 demo page')}.`
  ])}
  ${steps([
    [`Press the chip, ${key(SA.here.menu.foot[0])}, then ${key('Describe a study')}. Keep the numbers small and press ${key('Build the study')}.`, 'Allow about a minute the first time, while R starts.'],
    [`Press ${key('Load into the demo')}, open the ${key('RBQM')} tab and press ${key('Start R')}.`, 'The site overview appears in seconds.']
  ])}
</section>

<div class="cut"><span>05 <em>/ how it is held</em></span></div>
<section id="held">
  <div class="hd"><h2>How the copy is held to its source</h2></div>
  <p class="what">study.viz began as a copy. A copy can drift without anyone noticing, so the repository keeps a record of what was copied and checks it on every change. The capture read the records from the repository at commit ${esc(short(HE.commit))} and tested two of them itself.</p>
  <table class="reads">
    <thead><tr><th>What</th><th>How it is held</th><th>Checked by this page</th></tr></thead>
    <tbody>
      <tr><td>The app's source, its tests and what they read</td><td data-h="Held">${n(HE.app.files)} files copied from safety.viz at commit ${a(`${SV}/commit/${HE.app.commit}`, esc(short(HE.app.commit)))}. The record, <code>SOURCE.json</code>, lists each with its checksum and size. A line that differs from safety.viz's, such as the name, is listed with its reason. <code>npm run copied:check</code> fails when a file and the record disagree.</td><td data-h="Checked">All ${n(HE.app.withChecksum)} entries carry a checksum. ${n(HE.app.sample.length)} of the files were fetched and their checksums worked out again: ${HE.app.sample.every((s) => s.match) ? 'all matched' : 'not all matched'}. The command itself was not run.</td></tr>
      <tr><td>The charts</td><td data-h="Held">No chart's source is in study.viz. The charts are safety.viz ${esc(HE.bundle.version)}'s built file, <code>${esc(HE.bundle.source.split('/').pop())}</code>, copied from safety.viz at commit ${a(`${SV}/commit/${HE.bundle.commit}`, esc(short(HE.bundle.commit)))}. <code>npm run safety-viz:check</code> holds the copy to its record.</td><td data-h="Checked">The copy and safety.viz's own file were both fetched. They are the same ${n(HE.bundle.copyBytes)} bytes, with the checksum the record names (it begins ${esc(HE.bundle.copy.slice(0, 12))}).</td></tr>
      <tr><td>The pictures the browser tests are compared with</td><td data-h="Held">${n(HE.app.left)} pictures are listed as left out of the record, each with its reason: they show the app's name, so study.viz draws its own.</td><td data-h="Checked">Counted in the record. ${n(HE.tests.pictures)} pictures are stored in the repository.</td></tr>
      <tr><td>study.builder</td><td data-h="Held">The copy is its ${esc(HE.builder.tag)} release, ${n(HE.builder.files)} files with a record of their own, taken from safety.viz with the app.</td><td data-h="Checked">Read from the record. Not compared with study.builder's release.</td></tr>
      <tr><td>The tests</td><td data-h="Held">One check, ${q('Build, format, and test')}, runs on every pull request. It runs the unit tests and the browser tests, and on its Linux runner each stored picture is compared with a fresh one. On commit ${esc(short(TR.commit))} it ran ${n(TR.browserTests)} browser tests and all passed${cite(TR.url, 'the run')}.</td><td data-h="Checked">Not run here. The run's commit and its result were read; the count of ${n(TR.browserTests)} is from the run's own log.</td></tr>
    </tbody>
  </table>
  ${ul([
    `Two safety.viz commits are named, and each record names its own. The app's files are held to safety.viz at ${esc(short(HE.app.commit))}: ${n(HE.app.files)} files with checksums. The chart bundle's record names ${esc(short(HE.bundle.commit))}, and the bundle there is byte for byte the copy.${HE.bundle.atAppCommit === HE.bundle.copy && HE.app.commit !== HE.bundle.commit ? ` The capture fetched the bundle at ${esc(short(HE.app.commit))} too: it is the same file.` : ''}`,
    'The record is the proof of the copy, not a lock on the app. The repository says it will be retired once safety.viz no longer carries the app.',
    `What each release holds, and the commands above, are in study.viz's ${a(doc('NEWS.md'), 'NEWS')}, ${a(doc('README.md'), 'README')} and ${a(doc('CONTRIBUTING.md'), 'CONTRIBUTING')}.`
  ])}
</section>

<div class="cut"><span>06 <em>/ not checked</em></span></div>
<section id="not">
  <div class="note">
    <div class="lbl">Not checked on this page</div>
    <ul>
      <li>The tests. They run in the repository's own check. This page ran none of them; the count is from the check's own run, linked in section 5.</li>
      <li>The other places the app names itself: the mapping file it saves, its console warnings, and the single file that opens from disk with no network. The repository's CONTRIBUTING lists them.</li>
      <li>Running it on your own machine with <code>npm run demo</code>.</li>
      <li>Files of your own, building from a protocol, a phone, and any browser but Chromium.</li>
      <li>Whether a result is right. This page shows that the app is the same app under its own name, not that a chart or a simulated study is correct.</li>
    </ul>
  </div>
  <div class="note found">
    <div class="lbl">Noticed while capturing</div>
    <ul>
      <li>The footer names safety.viz ${esc(chartVersion.replace(/^safety\.viz /, ''))}. That is the chart bundle study.viz carries, not the newest safety.viz.</li>
      <li>The released address, ${esc(RELEASED_APP.replace(/^https:\/\//, ''))}, ${RELEASED_ON ? 'opened after the release' : 'has no page until the release'}.</li>
      <li>What the safety.viz page notes about the app's wording applies here too, because it is the same app: see ${a(`${SV_PAGE}#found`, 'its section on limits')}.</li>
    </ul>
  </div>
</section>

<div class="cut"><span>07 <em>/ where to check it</em></span></div>
<section>
  <div class="close">
    <div>
      <h3>The release</h3>
      <ul>
        <li>The ${a(doc('NEWS.md'), 'release notes')}, section v0.1.0.</li>
        <li>The app, until the release: ${a(DEV_APP, 'the dev build')}. After it: ${a(RELEASED_APP, 'the released app')}.</li>
        <li>The repository: ${a(STV, 'jwildfire/study.viz')}.</li>
        <li>The requirement it answers${cite(`${HUB}/issues/440`, 'hub #440')}; the study view in sections${cite(`${STV}/issues/16`, 'study.viz #16')}.</li>
      </ul>
    </div>
    <div>
      <h3>Beside it</h3>
      <ul>
        <li>${a(SV_PAGE, 'The safety.viz v1.13.0 demo page')}: what the app does, in detail.</li>
        <li>${a(SV, 'safety.viz')}: the charts, their gallery and their docs.</li>
        <li>${a('https://github.com/jwildfire/study.builder', 'study.builder')}: the builder and the study view.</li>
      </ul>
    </div>
  </div>
</section>

<footer>
  <p>Data: the Pilot study is the public, de-identified CDISC Pilot 01 study (pharmaverseadam), with synthetic liver and kidney groups added to the labs. PILOT-PROTOCOL and ${esc(BS.name)} are simulated by gsm.datasim: every row is made up. No real participant appears on this page.</p>
  <p>Captured with Playwright, headless Chromium, from ${a(c.site.app, esc(c.site.app_is))}, and compared with ${a(SA.compare, 'the safety.viz demo')}. One part of the capture starts real R in the browser. The records in section 5 were read from the public repository with no sign-in. Every label, count, checksum and time quoted was read by the script, and ${held} checks held them. How it was made, and how to take the stills again: ${a(HERE, 'this page’s folder')}.</p>
  <hr>
  <p>This page was drafted by Claude Code using Fable 5.2.</p>
</footer>

</div>
</body></html>
`;
if (/<script/i.test(html)) throw new Error('the page must carry no script');
fs.writeFileSync(path.join(dir, 'index.html'), html);
console.log(`Wrote index.html: ${held} checks held, ${Object.keys(c.stills).length} stills, description ${DESCRIPTION.length} characters${pending ? ', the stills of the study view in sections PENDING' : ''}${RELEASED_ON ? `, released ${RELEASED_ON}` : ', release candidate'}.`);
