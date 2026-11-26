// Writes index.html for the safety.viz v1.13.0 demo page from capture.json,
// which capture.cjs wrote. The labels, counts, names and times the page quotes
// from the app come from capture.json; none is typed here by hand.
//
//   node build.cjs [dir]        default: the folder this file is in
//
//   RELEASED_ON="27 November 2026" node build.cjs
//       after the release: the status word and the line under "Where it stands"
//       say released, with that date, and the steps link to the released app.
//
// It stops when a check in capture.json did not hold, when a still is missing,
// or when the page would carry a script.
const fs = require('node:fs');
const path = require('node:path');

const dir = process.argv[2] || __dirname;
const c = JSON.parse(fs.readFileSync(path.join(dir, 'capture.json'), 'utf8'));
const failed = Object.entries(c.checks).filter(([, v]) => !v.pass);
if (failed.length) throw new Error(`capture.json has checks that did not hold: ${failed.map(([n]) => n).join('; ')}`);
const held = Object.keys(c.checks).length;
for (const f of Object.keys(c.stills)) if (!fs.existsSync(path.join(dir, 'media', f))) throw new Error(`missing still: ${f}`);

// ---------------------------------------------------------------- addresses
const SV = 'https://github.com/jwildfire/safety.viz';
const SB = 'https://github.com/jwildfire/study.builder';
const HUB = 'https://github.com/jwildfire/obot.roadmap';
const DEV_APP = 'https://jwildfire.github.io/safety.viz/dev/demo/';
const RELEASED_APP = 'https://jwildfire.github.io/safety.viz/demo/';
const RELEASED_ON = process.env.RELEASED_ON || '';
const APP = RELEASED_ON ? RELEASED_APP : DEV_APP;
const HERE = `${HUB}/tree/main/reports/sv-v1.13.0-demo`;
const NEWS = `${SV}/blob/dev/NEWS.md`;
const STUDY_VIZ_PAGE = '../study-viz-v0.1.0-demo/';
const pr = (n) => `${SV}/pull/${n}`;

// ---------------------------------------------------------------- words
const esc = (t) => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const q = (t) => `“${esc(t)}”`;
const a = (href, text) => `<a href="${href}">${text}</a>`;
const cite = (href, text) => ` (${a(href, text)})`;
const n = (v) => Number(v).toLocaleString('en-US');
const secs = (v) => `${Math.round(Number(v))} seconds`;
const date = new Date(c.site.captured).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'America/New_York' });
const commit = c.site.commit ? c.site.commit.slice(0, 8) : 'unknown';
const key = (t) => `<span class="key">${esc(t)}</span>`;
const list = (items) => items.map(esc).join(', ');
const and = (items) => (items.length < 2 ? items.join('') : `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`);
const NOW = RELEASED_ON ? 'release 1.13.0' : 'release 1.13.0 (dev site)';
const THEN = 'release 1.12.0';

/** A still with its numbered markers. */
function shot(st, alt) {
  const marks = st.markers.map((m, i) => `<span class="mk" style="left:${m.left}%;top:${m.top}%" aria-hidden="true">${i + 1}</span>`).join('');
  return `<a class="frame" href="media/${st.file}"><img src="media/${st.file}" width="${st.width}" height="${st.height}" alt="${esc(alt)}" loading="lazy">${marks}</a>`;
}
const legendList = (st, legend) => {
  if (st.markers.length !== legend.length) throw new Error(`${st.file}: ${st.markers.length} markers, ${legend.length} legend lines`);
  return legend.length ? `<ol class="legend">${legend.map((l) => `<li>${l}</li>`).join('')}</ol>` : '';
};
/** One still on its own. A still narrower than the column keeps its own size. */
function solo(st, label, alt, legend, caption) {
  const cls = st.width >= 1100 ? 'solo wide' : 'solo own';
  return `<figure class="${cls}" style="--w:${st.width}px"><div class="lbl now">${esc(label)}</div>${shot(st, alt)}${legendList(st, legend)}</figure>
<p class="cap">${caption}</p>`;
}
/** Stills two to a row; one to a row on a phone. */
const grid = (figs) => `<div class="views">${figs.map((f) => `<figure${f.still.width < 560 ? ` class="own" style="--w:${f.still.width}px"` : ''}><div class="lbl${f.plain ? '' : ' now'}">${esc(f.label)}</div>${shot(f.still, f.alt)}${legendList(f.still, f.legend || [])}${f.cap ? `<p class="cap">${f.cap}</p>` : ''}</figure>`).join('\n')}</div>`;
const ul = (items, cls = 'list') => `<ul class="${cls}">${items.filter(Boolean).map((i) => `<li>${i}</li>`).join('')}</ul>`;
const steps = (items) => `<div class="note try"><div class="lbl">Try it</div><ol class="steps">${items.map(([d, s]) => `<li><span class="do">${d}</span><span class="see">${s}</span></li>`).join('')}</ol></div>`;

// ---------------------------------------------------------------- what was read
const CH = c.chip;
const SW = c.switch;
const SE = c.sections;
const ST = c.studies;
const FI = c.files;
const BU = c.build;
const OT = c.other;
const BS = c.build_settings;
const demo = CH.menu.items.filter((i) => /demo/i.test(i.kind));
const sim = CH.menu.items.filter((i) => /simulated/i.test(i.kind));
const walk = (sec, view) => SE.walk.find((w) => w.section === sec && w.view === view);
const pp = sim.find((i) => i.name === 'PILOT-PROTOCOL');
const plainName = 'READY-P1';
const info = (lines, label) => lines[lines.indexOf(label) + 1];
const versionSaid = CH.version;
const stepNames = BU.build.panel.steps;
const snapshotCarried = SE.snapshotAfterPlain && SE.snapshot && SE.snapshotAfterPlain !== SE.snapshot.chosen;
const railSaysNone = /No files loaded/.test(BU.form.rail) && BU.form.chip;
const firstBuildNote = (BU.form.panel || []).find((l) => /^First build/.test(l));
const noteAfterR = (OT.panelAfterR || []).find((l) => /^First build/.test(l));
const rbqmWords = BU.rbqm.before.words || [];
const M = FI.mapping;
const way = (button) => ST.ways.find((w) => w.button.toLowerCase() === button);

const css = fs.readFileSync(path.join(dir, 'page.css'), 'utf8');

const DESCRIPTION = 'What safety.viz v1.13.0 adds to its demo app, with stills and steps to try: a chip that names the study in use, a Studies page, simulated studies shown in sections, a study built with R in the browser, and what each loaded file holds.';
if (DESCRIPTION.length < 40 || DESCRIPTION.length > 260) throw new Error(`description is ${DESCRIPTION.length} characters`);

const STATUS_WORD = RELEASED_ON ? `Released ${esc(RELEASED_ON)}` : 'Release candidate';
const STANDS = RELEASED_ON
  ? `safety.viz v1.13.0 was released on ${esc(RELEASED_ON)}, on @jwildfire’s approval of its release candidate. The stills on this page are of the dev build the candidate was cut from.`
  : `safety.viz v1.13.0 is a release candidate. It is not released until @jwildfire approves the candidate. The stills on this page are of the dev build the candidate is cut from.`;

const html = `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>safety.viz v1.13.0 — annotated demo</title>
<meta name="description" content="${esc(DESCRIPTION)}">
<style>
${css}
</style>
</head><body>
<div class="wrap">

<header class="mast">
  <div class="eyebrow"><span>safety.viz</span><span class="dot"></span><span>v1.13.0</span><span class="dot"></span><span id="status-word">${STATUS_WORD}</span><span class="dot"></span><span>Annotated demo</span></div>
  <h1>safety.viz <span class="v">v1.13.0</span>: the demo app knows its studies</h1>
  <p class="lede">The demo app now says which study you are working with, and lists the others. A simulated study opens ready-made, or is built in the browser with R, and is shown in sections. Every loaded file shows what it holds. The release notes list changes to the demo app only.</p>
  <div class="facts"><span>Captured ${esc(date)}</span><span>${esc(c.site.after_is)}, ${esc(c.site.branch)} at ${esc(commit)}</span>${CH.before ? `<span>before: ${esc(THEN)}, the released site</span>` : ''}<span>${held} of ${held} checks held</span><span>1,400 by 900 window, light theme</span></div>

  <div class="note">
    <div class="lbl">Where it stands</div>
    <ul>
      <li id="rc-links">${STANDS}</li>
      <li>Until the release, the app with these changes is at ${a(DEV_APP, 'jwildfire.github.io/safety.viz/dev/demo/')}. After the release it is at ${a(RELEASED_APP, 'jwildfire.github.io/safety.viz/demo/')}.</li>
      <li>Every study on this page is public or made up. The demo studies come from the public CDISC pilot study, and every row of a simulated study is synthetic.</li>
      <li>The stills were captured on the dev build before the release's version number was set, so its footer read ${q(versionSaid)}. From the release on, the app's footer reads safety.viz 1.13.0.</li>
      <li>The release notes are short. The detail behind them is here.${cite(NEWS, 'NEWS.md on dev')}</li>
    </ul>
  </div>

  <div class="note">
    <div class="lbl">In short</div>
    <ul>
      <li>A chip in the header names the study in use. Pressing it lists ${n(CH.menu.items.length)} studies: ${n(demo.length)} marked Demo and ${n(sim.length)} marked Simulated.</li>
      <li>Choosing a study keeps you on the tab you were on. A ready-made simulated study opened in ${SW.ms < 1000 ? 'under a second' : `${n(SW.ms)} milliseconds`} on this capture, with no R.</li>
      <li>The Overview tab shows a simulated study in sections: ${list(SE.sections)}.</li>
      <li>A Studies page lists every study and the three ways to add one.</li>
      <li>A study can be built in the browser. You describe the trial, R simulates it, and one button hands it to the charts and the RBQM tab.</li>
      <li>Each loaded file has a Details section, and columns are mapped in the Columns view.</li>
      <li>R starts once. The RBQM tab and the builder share it.</li>
    </ul>
  </div>

  <div class="note">
    <div class="lbl">What to look at</div>
    <ol>
      <li>Press the chip that reads ${q(CH.chip)}. Read the list, then choose ${key(pp.name)}.</li>
      <li>Press ${key('Overview')}. Walk the sections: ${list(SE.sections)}.</li>
      <li>Press the chip, then ${key(CH.menu.foot[1])}. The Studies page has three ways to add a study.</li>
      <li>Press ${key(way('describe a study').button)}, keep the numbers small, and press ${key('Build the study')}. Allow about a minute the first time.</li>
      <li>Press ${key('Load into the demo')}, then open the RBQM tab and press ${key('Start R')}. It does not download R again.</li>
    </ol>
  </div>
</header>

<nav class="toc" aria-label="Contents">
  <a href="#chip"><span class="ref">01</span><span class="t">The study chip</span><span class="s">Which study is in use, and the list</span></a>
  <a href="#switch"><span class="ref">02</span><span class="t">Switching study</span><span class="s">Same tab, no R</span></a>
  <a href="#sections"><span class="ref">03</span><span class="t">A study in sections</span><span class="s">Overview, Design, Data, One participant, Reporting</span></a>
  <a href="#studies"><span class="ref">04</span><span class="t">The Studies page</span><span class="s">Every study, and three ways to add one</span></a>
  <a href="#build"><span class="ref">05</span><span class="t">Build a study</span><span class="s">Described, simulated by R, loaded</span></a>
  <a href="#files"><span class="ref">06</span><span class="t">Files and mapping</span><span class="s">What a file holds; columns set in place</span></a>
  <a href="#r"><span class="ref">07</span><span class="t">One R</span><span class="s">Started once, shared</span></a>
  <a href="#found"><span class="ref">08</span><span class="t">Noticed, and not checked</span><span class="s">What the capture saw, and what it did not try</span></a>
</nav>

<div class="cut"><span>01 <em>/ the study chip</em></span></div>
<section id="chip">
  <div class="hd"><h2>A chip in the header names the study in use</h2></div>
  <p class="what">The chip sits beside the app's name. It reads ${q(CH.chip)} when the app opens. The small i beside it says what the study is.</p>
  ${
    CH.before
      ? `<div class="pair">
  <figure><div class="lbl">Before · ${THEN}</div>${shot(CH.before.still, `The header of the demo app in release 1.12.0: the name safety.viz, then a Data tab labelled with the study, then the chart tabs. There is no chip.`)}</figure>
  <figure><div class="lbl now">After · ${NOW}</div>${shot(CH.header, `The header in release 1.13.0: the name safety.viz, a chip reading ${CH.chip} with an i beside it, then an Overview tab and the chart tabs.`)}${legendList(CH.header, ['The chip, with the i beside it.', 'The first tab is now called Overview.'])}</figure>
</div>
<p class="cap">Before, the study's name was a label on the Data tab. Now the chip carries it on every tab.</p>`
      : solo(CH.header, `After · ${NOW}`, `The header in release 1.13.0: a chip reading ${CH.chip} with an i beside it, then an Overview tab and the chart tabs.`, ['The chip, with the i beside it.', 'The first tab is now called Overview.'], 'The chip carries the study’s name on every tab.')
  }
  ${grid([
    {
      label: 'The chip, pressed',
      still: CH.menuStill,
      alt: `The list under the chip, headed ${CH.menu.label}: ${CH.menu.items.map((i) => `${i.name}, ${i.size}, ${i.kind}`).join('; ')}. Under the list, two buttons: ${CH.menu.foot.join(' and ')}.`,
      legend: [
        'The chip. A tick marks the study in use.',
        `${n(demo.length)} studies marked ${esc(demo[0].kind)}: ${list(demo.map((i) => i.name))}.`,
        `${n(sim.length)} marked ${esc(sim[0].kind)}: ${list(sim.map((i) => i.name))}. These are ready-made.`,
        `${key(CH.menu.foot[0])} and ${key(CH.menu.foot[1])} both lead to the Studies page.`
      ]
    },
    {
      label: 'The i, pressed',
      still: CH.infoStill,
      alt: `A card under the i: ${CH.info.join('. ')}.`,
      legend: [`The card names the study and its kind, counts its files, and says ${q(info(CH.info, 'Supports'))}.`]
    }
  ])}
  ${steps([
    [`Open the ${a(APP, 'demo app')} and press the chip that reads ${key(CH.chip)}.`, `A list headed ${esc(CH.menu.label)} opens: ${n(demo.length)} demo studies, then ${n(sim.length)} simulated ones.`],
    ['Press the i beside the chip.', `A card says what the study is, and ends with ${esc(CH.info[CH.info.length - 1])}.`]
  ])}
</section>

<div class="cut"><span>02 <em>/ switching study</em></span></div>
<section id="switch">
  <div class="hd"><h2>Choosing a study keeps you on the tab you were on</h2></div>
  <p class="what">Here the app is on the Outlier Explorer. ${esc(pp.name)} is chosen from the chip. The same chart is drawn again, on the new study.</p>
  ${grid([
    { label: `${SW.before.chip} · Outlier Explorer`, plain: true, still: SW.before.still, alt: `The Outlier Explorer on the ${SW.before.chip}: the chip reads ${SW.before.chip}.` },
    { label: `${SW.after.chip} · still the Outlier Explorer`, still: SW.after.still, alt: `The Outlier Explorer after ${SW.after.chip} was chosen: the chip reads ${SW.after.chip} and the Outlier Explorer is still the chart shown.`, legend: [`The chip now reads ${q(SW.after.chip)}.`, 'The Outlier Explorer is still the chart shown.'] }
  ])}
  ${ul([
    `The browser tab's title was ${q(SW.before.title)} before and after.`,
    `The switch took ${n(SW.ms)} milliseconds on this capture. The page made ${n(SW.after.r.runtime + SW.after.r.packages)} requests to R's hosts: a ready-made study is a stored file, not a build.`,
    `The app said ${q(SW.after.count)}. The Adverse events and ECG tabs were opened on it too (${SW.charts.map((x) => esc(x.title.split(' · ')[0])).join(', ')}); they are read here, not shown.`,
    `The i for a simulated study says how it was made, ${esc(info(SW.info, 'Made by') || 'by gsm.datasim')}, and that ${q('Every row is synthetic.')}`
  ])}
  ${steps([
    [`In the ${a(APP, 'demo app')}, choose ${key('Outlier Explorer')}.`, 'The chart draws the Pilot study.'],
    [`Press the chip and choose ${key(pp.name)}.`, 'The chip changes. You are still on the Outlier Explorer.']
  ])}
</section>

<div class="cut"><span>03 <em>/ a study in sections</em></span></div>
<section id="sections">
  <div class="hd"><h2>The Overview tab shows a simulated study in sections</h2></div>
  <p class="what">For a simulated study the Overview tab is study.builder's study view. One line gives the study's facts. Under it are the sections, and a section with more than one view has a second row of tabs.</p>
  ${solo(SE.overview, `${pp.name} · Overview`, `The Overview tab on ${pp.name}. A line of facts: ${SE.facts.join(', ')}, and a Snapshot chooser. On the left a list of tables by layer: ${SE.layers.join(', ')}. On the right the sections ${SE.sections.join(', ')}, with Overview open: counts of participants, sites, adverse events and visits, and three small tables.`, [
    `The sections: ${list(SE.sections)}.`,
    `The study's tables, by layer: ${list(SE.layers)}.`,
    `The snapshot chooser. This study kept ${n(SE.snapshot.options.length)} monthly snapshots.`
  ], `The facts in the line: ${list(SE.facts)}. The app said ${q(SE.ready.replace(/\. What each tab says$/, ''))}.`)}
  <table class="reads">
    <thead><tr><th>Section</th><th>Its views</th><th>What it holds</th></tr></thead>
    <tbody>
      <tr><td>Overview</td><td data-h="Views">one</td><td data-h="Holds">Counts, sites by country, what each layer holds, how the study grew.</td></tr>
      <tr><td>Design</td><td data-h="Views">${list(SE.subviews.Design)}</td><td data-h="Holds">The protocol the study followed, and its schedule of activities. Shown only when the study followed a protocol.</td></tr>
      <tr><td>Data</td><td data-h="Views">${list(SE.subviews.Data)}</td><td data-h="Holds">What built each table, the rows of a table, and a profile of each column.</td></tr>
      <tr><td>One participant</td><td data-h="Views">one</td><td data-h="Holds">One participant followed across every table.</td></tr>
      <tr><td>Reporting</td><td data-h="Views">${list(SE.subviews.Reporting)}</td><td data-h="Holds">The simulated score by arm, when the study simulated one, and adverse events by arm.</td></tr>
    </tbody>
  </table>
  ${grid([
    { label: 'Design · Protocol', still: walk('Design', 'Protocol').still, alt: `Design, Protocol: the protocol's name, phase, indication, arms and epochs, then ${walk('Design', 'Protocol').heads.slice(1).join('; ')}.`, cap: `Headings on this view: ${walk('Design', 'Protocol').heads.slice(1, 4).map(q).join(', ')}.` },
    { label: 'Design · Schedule', still: walk('Design', 'Schedule').still, alt: 'Design, Schedule: a grid of activities down the side and visits across the top, with a dot where an activity happens at a visit.', cap: 'Activities by visit. A dot marks an activity at a visit; activities the simulator leaves out are labelled so.' },
    { label: 'Data · Pipeline', still: walk('Data', 'Pipeline').still, alt: 'Data, Pipeline: the settings the study was asked to be, then every table by layer with the workflow that built it.', cap: `${q(walk('Data', 'Pipeline').heads[0])}.` },
    { label: 'Data · Tables', still: walk('Data', 'Tables').still, alt: 'Data, Tables: the rows of one table, with a Download CSV button and a filter.', cap: 'The rows of the table chosen on the left, with filters and sorting.' },
    { label: 'Data · Columns', still: walk('Data', 'Columns').still, alt: 'Data, Columns: one row per column of the table, with its label, kind, share filled, number of values and range.', cap: 'A profile of every column of the table.' },
    { label: 'One participant', still: walk('One participant', null).still, alt: 'One participant: a chooser for the participant, then that participant’s rows in each table.', cap: 'One participant across every table that holds them.' },
    { label: 'Reporting · Efficacy', still: walk('Reporting', 'Efficacy').still, alt: `Reporting, Efficacy: a line chart titled ${walk('Reporting', 'Efficacy').heads[0]}, one line per arm, and a table under it.`, cap: `${q(walk('Reporting', 'Efficacy').heads[0])}. The view says the numbers are simulated.` },
    { label: 'Reporting · Adverse events', still: walk('Reporting', 'Adverse events').still, alt: 'Reporting, Adverse events: a table of adverse event terms by body system, with the number and share of each arm.', cap: `${q(walk('Reporting', 'Adverse events').heads[0])}.` }
  ])}
  ${solo(SE.plain.still, `${plainName} · no protocol`, `The row of sections on ${plainName}: ${SE.plain.sections.join(', ')}. There is no Design section.`, [], `${esc(plainName)} did not follow a protocol, so it has no Design section: ${list(SE.plain.sections)}. Its Reporting section has one view, ${q(SE.plain.reportingHeads[0] || 'Adverse events by arm')}, because it simulated no score.`)}
  ${ul([
    'study.builder has RBQM and Safety views of its own. They are left out here. The app’s RBQM tab and its chart tabs show the same study.',
    `A demo study is not shown in sections. Its Overview tab has ${list(FI.viewerViews)} (section 6).`
  ])}
  ${steps([
    [`Choose ${key(pp.name)} from the chip, then press ${key('Overview')}.`, `The sections are ${list(SE.sections)}.`],
    [`Press ${key('Design')}, then ${key('Schedule')}.`, 'The protocol’s visits run across the top, its activities down the side.'],
    [`Choose ${key(plainName)} from the chip.`, 'The Design section is gone: that study followed no protocol.']
  ])}
</section>

<div class="cut"><span>04 <em>/ the Studies page</em></span></div>
<section id="studies">
  <div class="hd"><h2>All studies opens a Studies page</h2></div>
  <p class="what">The page is the chip's list, laid out in full, with the ways to add a study above it. ${q(ST.lead)}</p>
  ${solo(ST.still, 'The Studies page', `The Studies page. Under ${ST.subheads[0]}, three cards: ${ST.ways.map((w) => `${w.head}, with a button ${w.button}`).join('; ')}. Under them the heading ${ST.subheads[1]}.`, [
    `${esc(ST.subheads[0])}: three ways.`,
    `${esc(ST.subheads[1])}: every study, with its kind and size. The list is the next still.`
  ], `The three ways to add a study, as the page words them:`)}
  <dl class="words">
    ${ST.ways.map((w) => `<dt>${esc(w.head)}</dt><dd>${esc(w.text)} ${key(w.button)}</dd>`).join('\n    ')}
  </dl>
  ${solo(ST.listStill, 'The list', `The list of studies: ${ST.rows.map((r) => `${r.name}, ${r.kind}, ${r.size}`).join('; ')}.`, [`The study in use has ${key(ST.rows[0].button)} in place of ${key(ST.rows[1].button)}.`], `The list held ${n(ST.rows.length)} studies on this capture. A study you build is added to it (section 5).`)}
  ${steps([
    [`Press the chip, then ${key(CH.menu.foot[1])}.`, `The page is titled Studies. The browser tab reads ${q(ST.title)}.`],
    [`Press ${key('Open')} beside ${key('READY-P2')}.`, `The chip reads ${q(ST.opened.chip)}.${/^Studies/.test(ST.opened.title) ? ' You stay on the Studies page.' : ''}`]
  ])}
</section>

<div class="cut"><span>05 <em>/ build a study</em></span></div>
<section id="build">
  <div class="hd"><h2>A study can be built in the browser</h2></div>
  <p class="what">${key(way('describe a study').button)} opens study.builder's form in place of the loaded files. You describe a trial. gsm.datasim simulates it with R, in this browser. Nothing is sent anywhere.</p>
  ${solo(BU.form.still, 'The form', `The form, headed ${BU.form.heads.slice(0, 3).join(', ')}. Fields: ${BU.form.labels.slice(0, 5).join('; ')}; buttons for phase, therapeutic area and outliers. Under them, ${BU.form.protocols.length} buttons to try an example protocol, then the layers drawn as a pipeline: ${BU.form.layers.join('; ')}. At the right, a panel headed ${BU.form.panel[0]} with the button Build the study.`, [
    `The trial: a name, a phase, a therapeutic area, then ${list(BU.form.labels.slice(1, 5))}.`,
    `A protocol, in place of a description: ${key('Open a file…')} or one of ${n(BU.form.protocols.length)} examples.`,
    `The layers, drawn as the pipeline they are: ${list(BU.form.layers.map((l) => l.split(' ')[0]))}. Under them, the raw domains to include.`,
    `What you will get, and ${key('Build the study')}.`
  ], `This capture pressed phase ${esc(BS.phase)}, which filled in ${esc(BU.trial.typical.participants)} participants at ${esc(BU.trial.typical.sites)} sites over ${esc(BU.trial.typical.months)} months, then typed smaller numbers: ${n(BS.participants)} participants, ${n(BS.sites)} sites, ${n(BS.months)} months, seed ${n(BS.seed)}.`)}
  ${grid([
    {
      label: 'While it builds',
      still: BU.stepsStill,
      alt: `A panel headed ${BU.build.panel.head} with four steps: ${stepNames.join('; ')}. The first is under way.`,
      cap: `Each step is said as R takes it: ${stepNames.map(q).join(', ')}.`
    },
    {
      label: 'A protocol in the form',
      still: BU.protocol.still,
      alt: `The form after ${BU.protocol.button} was pressed: a section headed ${BU.protocol.head}, a grid with visits across the top, each with its study day in a box, and activities down the side with a tick box at each visit.`,
      cap: `After ${key(BU.protocol.button)}: ${q(BU.protocol.head)}. Each visit's day can be typed over, and each activity ticked or cleared. This capture did not build from a protocol.`
    }
  ])}
  ${solo(BU.built.still, 'Built', `The built study, ${BS.name}: a badge reading ${BU.built.builtIn}, the buttons ${BU.built.buttons.slice(0, 4).join(', ')}, the facts ${BU.built.facts.slice(0, 6).join(', ')}, and the study view with the sections ${BU.built.sections.join(', ')}.`, [
    `${q(BU.built.builtIn)}: the simulation itself, once R was ready.`,
    `${key('Load into the demo')} hands the study to the app.`,
    `The study view, in the builder: ${list(BU.built.sections)}.`
  ], `From pressing ${key('Build the study')} to this screen took ${secs(BU.build.seconds)} on this capture. The first three steps, starting R and fetching what it needs, took ${secs(BU.build.log[BU.build.log.length - 1].s)} of that: the page made ${n(BU.build.runtime)} requests to R's own host and ${n(BU.build.packages)} to its package host. The study has ${list(BU.built.layers)}.`)}
  ${grid([
    {
      label: 'Loaded: the chip',
      still: BU.loaded.still,
      alt: `The chip's list after Load into the demo: ${BS.name} is listed as Simulated, with a tick.`,
      legend: [`${esc(BS.name)} is in the list, marked ${esc((BU.loaded.menu.items.find((i) => i.name === BS.name) || {}).kind || 'Simulated')}, and in use.`]
    },
    {
      label: 'Loaded: a chart',
      still: BU.chart.still,
      alt: `The ${BU.chart.title.split(' · ')[0]} drawing the built study.`,
      cap: `The ${esc(BU.chart.title.split(' · ')[0])} on the built study. The app said ${q(BU.loaded.count)}.`
    }
  ])}
  ${ul([
    `After ${key('Load into the demo')} the app showed the Overview tab, with the chip reading ${q(BU.loaded.chip)}.`,
    BU.reload.kept
      ? `The built study is kept by this browser. After the page was reloaded it was still in the chip's list. The study in use after the reload was ${q(BU.reload.chip)}, not the built one.`
      : `After the page was reloaded the built study was not in the chip's list, and the study in use was ${q(BU.reload.chip)}.`,
    `The builder says what a simulated study is: ${q((BU.form.panelSet || BU.form.panel).find((l) => /^Every row is synthetic/.test(l)) || 'Every row is synthetic.')}`
  ])}
  ${steps([
    [`Press the chip, then ${key(CH.menu.foot[0])}, then ${key(way('describe a study').button)}.`, 'The form opens, headed New study.'],
    [`Press phase ${key(BS.phase)}. Set ${n(BS.participants)} participants, ${n(BS.sites)} sites and ${n(BS.months)} months. Press ${key('Build the study')}.`, `The four steps tick by. The first build took ${secs(BU.build.seconds)} here; yours depends on your connection.`],
    [`Press ${key('Load into the demo')}.`, 'The chip names your study. Every chart tab draws it.'],
    [`To see a protocol: press ${key(CH.menu.foot[0])} again, ${key(way('open the builder').button)}, then ${key(BU.protocol.button)}.`, 'The schedule of activities appears in the form, as a grid you can change.']
  ])}
</section>

<div class="cut"><span>06 <em>/ files and mapping</em></span></div>
<section id="files">
  <div class="hd"><h2>Every loaded file shows what it holds, and columns are mapped in place</h2></div>
  <p class="what">For a demo study the Overview tab has two faces: ${list(FI.faces.map((f) => f.name))}. ${esc(FI.faces[1].name)} lists each file with a folded Details section. ${esc(FI.faces[0].name)} is where a column is set.</p>
  ${solo(FI.detailsStill, `${FI.faces[1].name} · Details, opened`, `The Details section of ${FI.details[0].file}, opened: a table of its columns with the kind of each (${FI.opened.kinds.map((k) => `${k[0]} ${k[1]}`).join(', ')}), its first 20 rows, and a Download CSV button.`, [`The fold reads ${q(FI.details[0].summary)}.`, `Under the first ${n(FI.opened.rows)} rows, ${key(FI.opened.buttons[0])}.`], `${esc(FI.details[0].file)} in the Pilot study. Each column has a kind: number, date or text. The other files read ${FI.details.slice(1).map((d) => q(d.summary)).join(', ')}.`)}
  ${solo(M.still, `${FI.faces[0].name} · Columns`, `The Columns view on the ${M.study} study: a Mapping box reading ${M.before.note}, with a chooser for each row still to set, one of them marked ${M.set.needed}; under it a profile of every column of the file.`, ['The Columns view.', `${q(M.before.note)}: the rows still to set come first.`, `A row that a chart waits on says so: ${q(M.set.needed)}.`], `The ${esc(M.study)} study, whose columns have other names. The app said ${q(M.before.count)}.`)}
  ${ul([
    `This capture set ${q(M.set.label)} to the column ${esc(M.set.to)}. The box then read ${q(M.after.note)}, and the app said ${q(M.after.count)}.`,
    `The same row on the ${esc(FI.faces[1].name)} face then read ${esc(M.filesFace)}: one mapping, set in either place.`
  ])}
  ${steps([
    [`Choose ${key('Pilot study')} from the chip, press ${key('Overview')}, then ${key(FI.faces[1].name)}. Open ${key('Details')} under a file.`, 'Its columns with their kinds, its first 20 rows, and a Download CSV button.'],
    [`Choose ${key(M.study)} from the chip, press ${key(FI.faces[0].name)}, then ${key('Columns')}.`, `The Mapping box reads ${q(M.before.note)}.`],
    [`Set ${key(M.set.label)} to ${key(M.set.to)}.`, `The count of charts the data supports goes up: ${esc(M.before.count.split(' ')[0])} to ${esc(M.after.count.split(' ')[0])} here.`]
  ])}
</section>

<div class="cut"><span>07 <em>/ one R</em></span></div>
<section id="r">
  <div class="hd"><h2>The app starts R once</h2></div>
  <p class="what">Two parts of the app use R in the browser: the RBQM tab and the builder. They share one R. Whichever starts it first pays for the download; the other does not download it again. Both orders were run, each in a fresh browser.</p>
  <table class="reads fit">
    <thead><tr><th>Order</th><th>Step</th><th class="num">Time</th><th class="num">Requests to R's host</th><th class="num">Requests for packages</th></tr></thead>
    <tbody>
      <tr><td>Build first</td><td data-h="Step">Build a study of ${n(BS.participants)} participants</td><td class="num" data-h="Time">${secs(BU.build.seconds)}</td><td class="num" data-h="R's host">${n(BU.build.runtime)}</td><td class="num" data-h="Packages">${n(BU.build.packages)}</td></tr>
      <tr><td></td><td data-h="Step">Then the RBQM tab, ${key('Start R')}, on the built study</td><td class="num" data-h="Time">${secs(BU.rbqm.seconds)}</td><td class="num" data-h="R's host">${n(BU.rbqm.runtime)}</td><td class="num" data-h="Packages">${n(BU.rbqm.packages)}</td></tr>
      <tr><td>RBQM first</td><td data-h="Step">The RBQM tab, ${key('Start R')}, on the Pilot study</td><td class="num" data-h="Time">${secs(OT.rbqm.seconds)}</td><td class="num" data-h="R's host">${n(OT.rbqm.runtime)}</td><td class="num" data-h="Packages">${n(OT.rbqm.packages)}</td></tr>
      <tr><td></td><td data-h="Step">Then build the same small study</td><td class="num" data-h="Time">${secs(OT.build.seconds)}</td><td class="num" data-h="R's host">${n(OT.build.runtime)}</td><td class="num" data-h="Packages">${n(OT.build.packages)}</td></tr>
    </tbody>
  </table>
  <p class="cap">Times are from one run on one machine and will differ on yours. The counts are requests the page made to webr.r-wasm.org, R's own host, and to repo.r-wasm.org, its packages. The second step in each order made no request to R's own host.</p>
  ${solo(BU.rbqm.before.still, 'After a build: the RBQM tab, before Start R', `The RBQM tab on the built study, after the builder had started R. It still reads ${rbqmWords[0] || 'Site metrics need R'}, with a Start R button.`, [], `R was already running here, started by the builder. The tab still asks for ${key('Start R')}, and still says ${q('55 MB, once')}. Pressing it downloaded nothing.`)}
  ${solo(BU.rbqm.still, `After Start R: ${BU.rbqm.tab.replace(/^RBQM /, '')}`, `The RBQM tab after Start R: the tab reads ${BU.rbqm.tab}, an R chip reads ${BU.rbqm.rChip.replace(/[▾\s]+$/, '')}, and a site overview table lists the built study's ${n(BS.sites)} sites with a mark for each metric.`, [], `${BU.rbqm.said ? `${q(BU.rbqm.said)} ` : ''}Every one of gsm's eight site metrics runs on a built study, because it carries gsm's raw files. On the Pilot study the tab ran ${esc(OT.rbqm.tab.replace(/^RBQM /, '').toLowerCase())}.`)}
  ${steps([
    ['Build a study and load it (section 5).', 'R is now running in the page.'],
    [`Open the ${key('RBQM')} tab and press ${key('Start R')}.`, `The site overview appears in seconds, not the minute a first start takes. Here: ${secs(BU.rbqm.seconds)}.`]
  ])}
</section>

<div class="cut"><span>08 <em>/ noticed, and not checked</em></span></div>
<section id="found">
  <div class="note found">
    <div class="lbl">Noticed while capturing</div>
    <ul>
      ${rbqmWords.length ? `<li>After the builder had started R, the RBQM tab still read ${q(rbqmWords[0].replace(/ START R$/, ''))} and still asked for ${key('Start R')}.${noteAfterR ? ` After the RBQM tab had started R, the builder still read ${q(noteAfterR.split('.')[0] + '.')}` : ''} In both cases R was not downloaded a second time (section 7).</li>` : ''}
      ${firstBuildNote && BU.build.seconds > 45 ? `<li>The first build took ${secs(BU.build.seconds)} on this capture. The builder's own note reads ${q(firstBuildNote.split('.')[0] + '.')}</li>` : ''}
      ${railSaysNone ? `<li>While the builder is open, the panel on the left reads ${q('No files loaded')}, though the chip still names ${q(BU.form.chip)} and its charts still draw.</li>` : ''}
      ${snapshotCarried ? `<li>${esc(pp.name)} opened on its last snapshot, ${q(SE.snapshot.chosen)}. Opened after ${esc(plainName)}, whose last snapshot is ${q(SE.plain.snapshot.chosen)}, it showed ${q(SE.snapshotAfterPlain)}: the snapshot chosen for one study carried to the next.</li>` : ''}
      <li>After a reload the app opens on ${q(BU.reload.chip)}, whichever study was in use before.</li>
    </ul>
  </div>
  <div class="note">
    <div class="lbl">Not checked on this page</div>
    <ul>
      <li>Files of your own. Every still is of a demo study, a ready-made study or the study built here.</li>
      <li>Building from a protocol. The form was opened on ${q(BU.protocol.button.replace(/^Try the /, 'the '))} and not built. The other ${n(BU.form.protocols.length - 1)} examples and ${key('Open a file…')} were not pressed.</li>
      <li>The builder's ${list(BU.built.buttons.slice(0, 3))} buttons, the app's ${q('Download as one file')}, and the Biomarkers tab on a simulated study.</li>
      <li>A phone, and any browser but Chromium. The stills are of a 1,400 by 900 window.</li>
      <li>Whether a result is right. This page shows what the app does, not that a simulated study is a good one. Nothing in the app is qualified; its own label says ${q(CH.status.charAt(0) + CH.status.slice(1).toLowerCase())}.</li>
    </ul>
  </div>
</section>

<div class="cut"><span>09 <em>/ where to check it</em></span></div>
<section>
  <div class="close">
    <div>
      <h3>The release</h3>
      <ul>
        <li>The ${a(NEWS, 'release notes')}, section v1.13.0.</li>
        <li>The app, until the release: ${a(DEV_APP, 'the dev build')}. After it: ${a(RELEASED_APP, 'the released app')}.</li>
        <li>Studies, the chip and the study view as the Overview tab${cite(pr(395), 'safety.viz pull request #395')}.</li>
        <li>The copy of study.builder moved to its v0.5.0 release${cite(pr(398), '#398')}${cite(pr(399), '#399')}.</li>
      </ul>
    </div>
    <div>
      <h3>Beside it</h3>
      <ul>
        <li>${a(SB, 'study.builder')}: the builder and the study view. safety.viz carries a copy of its v0.5.0 release.</li>
        <li>${a(STUDY_VIZ_PAGE, 'The study.viz v0.1.0 demo page')}: the same app in a repository of its own.</li>
        <li>${a('../sv-v1.12.0-demo/', 'The safety.viz v1.12.0 demo page')}: the release before this one.</li>
      </ul>
    </div>
  </div>
</section>

<footer>
  <p>Data: the Pilot study and the Renamed columns study are the public, de-identified CDISC Pilot 01 study (pharmaverseadam), with synthetic liver and kidney groups added to the labs. ${esc(pp.name)}, ${esc(plainName)} and ${esc(BS.name)} are simulated by gsm.datasim: every row is made up. No real participant appears on this page.</p>
  <p>Captured with Playwright, headless Chromium, from ${a(c.site.after, esc(c.site.after_is))}${CH.before ? `; the one before still is from ${a(c.site.before, 'the released site')}, ${esc(THEN)}` : ''}. Two parts of the capture start real R in the browser. Every label, count and time quoted from the app was read by the script, and ${held} checks held them. How it was made, and how to take the stills again: ${a(HERE, 'this page’s folder')}.</p>
  <hr>
  <p>This page was drafted by Claude Code using Fable 5.2.</p>
</footer>

</div>
</body></html>
`;
if (/<script/i.test(html)) throw new Error('the page must carry no script');
fs.writeFileSync(path.join(dir, 'index.html'), html);
console.log(`Wrote index.html: ${held} checks held, ${Object.keys(c.stills).length} stills, description ${DESCRIPTION.length} characters${RELEASED_ON ? `, released ${RELEASED_ON}` : ', release candidate'}.`);
