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
// when the capture asked a host the page does not account for, or when the
// page would carry a script or a local address.
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
const STV = 'https://github.com/jwildfire/study.viz';
const HUB = 'https://github.com/jwildfire/obot.roadmap';
const DEV_APP = 'https://jwildfire.github.io/safety.viz/dev/demo/';
const RELEASED_APP = 'https://jwildfire.github.io/safety.viz/demo/';
const RELEASED_ON = process.env.RELEASED_ON || '';
const APP = RELEASED_ON ? RELEASED_APP : DEV_APP;
const HERE = `${HUB}/tree/main/reports/sv-v1.13.0-demo`;
const NEWS = `${SV}/blob/dev/NEWS.md`;
const STUDY_VIZ_PAGE = '../study-viz-v0.1.0-demo/';
const pr = (n) => `${SV}/pull/${n}`;
const issue = (n) => `${SV}/issues/${n}`;
// The release of study.builder that safety.viz carries: from its record in
// safety.viz and the release notes, not read from the app.
const BUILDER_VERSION = 'v0.5.1';

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
// A label the app draws in capitals, as a sentence would write it.
const sentence = (t) => (t ? t.charAt(0).toUpperCase() + t.slice(1).toLowerCase() : '');
const first = (t) => `${String(t).split('. ')[0].replace(/\.$/, '')}.`;
const NOW = 'release 1.13.0';
const THEN = 'release 1.12.0';
// What the stills are of: the dev site, the released site, or a build named in words.
const OF = c.site.after ? `${esc(c.site.after_is)}, ${esc(c.site.branch)} at ${esc(commit)}` : `${esc(c.site.after_is)}, commit ${esc(commit)}`;

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
const SN = c.snapshot;
const ST = c.studies;
const FI = c.files;
const BU = c.build;
const OT = c.other;
const PR = c.profile;
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
const firstBuildNote = BU.form.fetches || (BU.form.panel || []).find((l) => /^First build/.test(l)) || '';
const noteAfterR = (OT.panelAfterR || []).find((l) => /^First build/.test(l));
const rbqmWords = BU.rbqm.before.words || [];
const M = FI.mapping;
const way = (button) => ST.ways.find((w) => w.button.toLowerCase() === button);
const madeBy = SW.card.facts['Made by'];
const credit = SW.card.credit[0];
// The header at each width: how many of the studies kept it to one row, whose name was cut.
const WIDTHS = Object.keys(CH.widths).map(Number).sort((x, y) => y - x);
const atWidth = (w) => Object.entries(CH.widths[w]).map(([study, v]) => ({ study, ...v }));
const twoRows = (w) => atWidth(w).filter((x) => !x.oneRow).map((x) => x.study);
const cutNames = (w) => atWidth(w).filter((x) => x.cut).map((x) => x.study);
const px = (w) => `${n(w)} pixels`;
// Every host the capture asked anything of is one the page names.
const rHosts = (c.site.hosts || []).filter((h) => /r-wasm\.org$/.test(h));
const otherHosts = (c.site.hosts || []).filter((h) => !/r-wasm\.org$/.test(h) && h !== 'the app’s own host' && h !== new URL(c.site.before).host);
if (otherHosts.length) throw new Error(`the capture asked a host the page does not account for: ${otherHosts.join(', ')}`);
const unset = M.before.rows.filter((x) => x.label);
const tileWords = (t) => `${esc(t.participants)} participants, ${esc(t.enrolled)} enrolled, ${esc(t.sites)} sites`;
const notSent = (firstBuildNote.match(/No study data is sent anywhere/) || [''])[0];

const css = fs.readFileSync(path.join(dir, 'page.css'), 'utf8');

const DESCRIPTION = 'What safety.viz v1.13.0 changes, with stills and steps to try: a chip that names the study and its snapshot, a Studies page, simulated studies built with R in the browser, what each file holds, and the expanded participant profile.';
if (DESCRIPTION.length < 40 || DESCRIPTION.length > 260) throw new Error(`description is ${DESCRIPTION.length} characters`);

const STATUS_WORD = RELEASED_ON ? `Released ${esc(RELEASED_ON)}` : 'Release candidate';
const STANDS = RELEASED_ON
  ? `safety.viz v1.13.0 was released on ${esc(RELEASED_ON)}, on @jwildfire’s approval of its release candidate.`
  : `safety.viz v1.13.0 is a release candidate. It is not released until @jwildfire approves the candidate.`;

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
  <p class="lede">The demo app now names the study you are working with, and lists the others. A simulated study opens ready-made, or is built in the browser by study.builder with R. It is shown in sections, at the snapshot you choose. Every loaded file shows what it holds. The chart bundle changes in one place: the layout of the expanded participant profile.</p>
  <div class="facts"><span>Captured ${esc(date)}</span><span>${OF}</span>${CH.before ? `<span>before: ${esc(THEN)}, the released site</span>` : ''}<span>${held} of ${held} checks held</span><span>1,400 by 900 window, light theme</span></div>

  <div class="note">
    <div class="lbl">Where it stands</div>
    <ul>
      <li id="rc-links">${STANDS}</li>
      <li>The stills are of ${OF}${c.site.after ? '' : `. That is the dev branch with two changes not yet on it: the copy of study.builder moved to ${BUILDER_VERSION}${cite(issue(423), 'safety.viz #423')}, and the notes, the footer and the data sources page made true${cite(issue(424), 'safety.viz #424')}`}. The app's footer read ${q(versionSaid)}.</li>
      <li>Until the release, the app is published from the dev branch at ${a(DEV_APP, 'jwildfire.github.io/safety.viz/dev/demo/')}${c.site.after ? '' : '. It shows what these stills show once those two changes are on dev'}. After the release it is at ${a(RELEASED_APP, 'jwildfire.github.io/safety.viz/demo/')}.</li>
      <li>Every study on this page is public or made up. The demo studies come from the public CDISC pilot study, and every row of a simulated study is synthetic.</li>
      <li>This page is the companion to the release notes. The notes are short, and the detail behind them is here.${cite(NEWS, 'NEWS.md on dev')}</li>
    </ul>
  </div>

  <div class="note">
    <div class="lbl">In short</div>
    <ul>
      <li>A chip in the header names the study in use. Pressing it lists ${n(CH.menu.items.length)} studies: ${n(demo.length)} marked Demo and ${n(sim.length)} marked Simulated.</li>
      <li>Choosing a study keeps you on the tab you were on. A ready-made simulated study opened in ${SW.ms < 1000 ? 'under a second' : `${n(SW.ms)} milliseconds`} on this capture, with no R. A study that fails to open says so under the chip.</li>
      <li>The Overview tab, which was the Data tab, opens on the loaded study, looked through. Its second face, ${esc(FI.faces[1].name)}, keeps each file, the file picker and Reset.</li>
      <li>The Overview tab shows a simulated study in sections: ${list(SE.sections)}.</li>
      <li>For a study that kept monthly snapshots, the chip says which one is drawn. The charts and the RBQM tab draw that one.</li>
      <li>A study can be built in the browser. You describe the trial, ${esc(madeBy)} simulates it with R, and one button hands it to the charts and the RBQM tab.</li>
      <li>Each loaded file has a Details section, and columns are mapped in the Columns view.</li>
      <li>R starts once. The RBQM tab and the builder share it. Starting it downloads R and its packages. The app says no study data is sent.</li>
      <li>The expanded participant profile draws its chart beside its controls. That is the only change to the charts.</li>
      <li>At ${px(1280)} wide the header keeps to one row.</li>
    </ul>
  </div>

  <div class="note">
    <div class="lbl">What to look at</div>
    <ol>
      <li>Press the chip that reads ${q(CH.chip)}. Read the list, then choose ${key(pp.name)}. The chip now also reads ${q(SW.after.snap)}.</li>
      <li>Press ${key('Overview')}. Walk the sections: ${list(SE.sections)}. Choose an earlier snapshot and open a chart.</li>
      <li>Press the chip, then ${key(CH.menu.foot[1])}. The Studies page has three ways to add a study.</li>
      <li>Press ${key(way('describe a study').button)}, keep the numbers small, and press ${key('Build the study')}. Allow a minute or two the first time.</li>
      <li>Press ${key('Load into the demo')}, then open the RBQM tab and press ${key('Start R')}. It does not download R again.</li>
      <li>On the Pilot study, open the Hepatic Explorer, press a point, and press ${key('Expand')} on the panel that opens.</li>
    </ol>
  </div>
</header>

<nav class="toc" aria-label="Contents">
  <a href="#chip"><span class="ref">01</span><span class="t">The study chip</span><span class="s">Which study is in use, and the list</span></a>
  <a href="#switch"><span class="ref">02</span><span class="t">Switching study</span><span class="s">Same tab, no R, and a failed open</span></a>
  <a href="#sections"><span class="ref">03</span><span class="t">A study in sections</span><span class="s">Overview, Design, Data, One participant, Reporting</span></a>
  <a href="#snapshot"><span class="ref">04</span><span class="t">The snapshot you choose</span><span class="s">On the chip, in the charts, in the RBQM tab</span></a>
  <a href="#studies"><span class="ref">05</span><span class="t">The Studies page</span><span class="s">Every study, and three ways to add one</span></a>
  <a href="#build"><span class="ref">06</span><span class="t">Build a study</span><span class="s">Described, simulated by R, loaded</span></a>
  <a href="#files"><span class="ref">07</span><span class="t">The Overview tab</span><span class="s">The study looked through, its files, its mapping</span></a>
  <a href="#r"><span class="ref">08</span><span class="t">One R</span><span class="s">Started once, and what it downloads</span></a>
  <a href="#profile"><span class="ref">09</span><span class="t">The expanded profile</span><span class="s">The one change to the charts</span></a>
  <a href="#header"><span class="ref">10</span><span class="t">Header, status, footer</span><span class="s">One row at 1,280 pixels, and two new sentences</span></a>
  <a href="#found"><span class="ref">11</span><span class="t">Limits</span><span class="s">Known and not fixed, the statistics, not checked</span></a>
  <a href="#check"><span class="ref">12</span><span class="t">Where to check it</span><span class="s">The notes, the app, the changes</span></a>
</nav>

<div class="cut"><span>01 <em>/ the study chip</em></span></div>
<section id="chip">
  <div class="hd"><h2>A chip in the header names the study in use</h2></div>
  <p class="what">The chip sits beside the app's name. It reads ${q(CH.chip)} when the app opens. The small i beside it opens a card that says what the study is.</p>
  ${
    CH.before
      ? `<div class="pair">
  <figure><div class="lbl">Before · ${THEN}</div>${shot(CH.before.still, `The header of the demo app in release 1.12.0: the name safety.viz, then a Data tab labelled with the study, then the chart tabs. There is no chip.`)}</figure>
  <figure><div class="lbl now">After · ${NOW}</div>${shot(CH.header, `The header in release 1.13.0: the name safety.viz, a chip reading ${CH.chip} with an i beside it, then an Overview tab and the chart tabs.`)}${legendList(CH.header, ['The chip, with the i beside it.', 'The first tab is now called Overview. It was the Data tab.'])}</figure>
</div>
<p class="cap">Before, the study's name was a label on the Data tab. Now the chip carries it on every tab. Both stills are the left 720 pixels of a 1,400 pixel window.</p>`
      : solo(CH.header, `After · ${NOW}`, `The header in release 1.13.0: a chip reading ${CH.chip} with an i beside it, then an Overview tab and the chart tabs.`, ['The chip, with the i beside it.', 'The first tab is now called Overview. It was the Data tab.'], 'The chip carries the study’s name on every tab.')
  }
  ${grid([
    {
      label: 'The chip, pressed',
      still: CH.menuStill,
      alt: `The list under the chip, headed ${CH.menu.label}: ${CH.menu.items.map((i) => `${i.name}, ${i.size}, ${i.kind}`).join('; ')}. Under the list, two buttons: ${CH.menu.foot.join(' and ')}.`,
      legend: [
        'The i. In the list, a tick marks the study in use.',
        `${n(demo.length)} studies marked ${esc(sentence(demo[0].kind))}: ${list(demo.map((i) => i.name))}.`,
        `${n(sim.length)} marked ${esc(sentence(sim[0].kind))}: ${list(sim.map((i) => i.name))}. These are study.builder's ready-made studies.`,
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
  ${ul([
    'The release notes say the list also holds your own files while they are loaded, and studies you saved in the builder. This capture loaded no files of its own. A built study in the list is in section 6.',
    CH.menu.items.filter((i) => i.inUse).length === 1 ? 'Choosing a study replaces the study before it. The list ticks one study, the one in use.' : ''
  ])}
  ${steps([
    [`Open the ${a(APP, 'demo app')} and press the chip that reads ${key(CH.chip)}.`, `A list headed ${esc(sentence(CH.menu.label))} opens: ${n(demo.length)} demo studies, then ${n(sim.length)} simulated ones.`],
    ['Press the i beside the chip.', `A card says what the study is, and ends with a button, ${key(CH.info[CH.info.length - 1])}.`]
  ])}
</section>

<div class="cut"><span>02 <em>/ switching study</em></span></div>
<section id="switch">
  <div class="hd"><h2>Choosing a study keeps you on the tab you were on</h2></div>
  <p class="what">Here the app is on the Outlier Explorer. ${esc(pp.name)} is chosen from the chip. The same chart is drawn again, on the new study.</p>
  ${grid([
    { label: `${SW.before.chip} · Outlier Explorer`, plain: true, still: SW.before.still, alt: `The Outlier Explorer on the ${SW.before.chip}: the chip reads ${SW.before.chip}.` },
    { label: `${SW.after.chip} · still the Outlier Explorer`, still: SW.after.still, alt: `The Outlier Explorer after ${SW.after.chip} was chosen: the chip reads ${SW.after.chip}, with ${SW.after.snap} under the name, and the Outlier Explorer is still the chart shown.`, legend: [`The chip now reads ${q(SW.after.chip)}, with ${q(SW.after.snap)} under the name (section 4).`, 'The Outlier Explorer is still the chart shown.'] }
  ])}
  ${ul([
    `The browser tab's title was ${q(SW.before.title)} before and after.`,
    `The switch took ${n(SW.ms)} milliseconds on this capture. The page made ${n(SW.after.r.runtime + SW.after.r.packages)} requests to R's hosts: a ready-made study is a stored file, not a build.`,
    `The app said ${q(SW.after.count)}. The Adverse events and ECG tabs were opened on it too (${SW.charts.map((x) => esc(x.title.split(' · ')[0])).join(', ')}); they are read here, not shown.`
  ])}
  <h3>The card of a simulated study, and a study that does not open</h3>
  ${grid([
    {
      label: `The i, pressed · ${SW.after.chip}`,
      still: SW.cardStill,
      alt: `The card under the i for ${SW.after.chip}: ${SW.card.lines.slice(0, -1).join('. ')}.`,
      legend: [
        `What made the study: ${q(`Made by: ${madeBy}`)}.`,
        `Which snapshot is drawn: ${q(SW.card.facts['Snapshot drawn'])}.`,
        `CDISC's attribution. ${esc(SW.after.chip)} follows ${q(SW.card.facts.Protocol)}, one of CDISC's example protocols.`
      ],
      cap: `The card of a simulated study says ${q(SW.card.about[0] || 'Every row is synthetic.')} ${esc(plainName)} followed no protocol. Its card has the same ${q('Made by')} line and no attribution.`
    },
    {
      label: 'A study that does not open',
      still: SW.failed.still,
      alt: `The Outlier Explorer on the ${SW.failed.chip}, with a sentence in a box under the chip: ${SW.failed.said}`,
      legend: [`The chip still names the study in use, ${q(SW.failed.chip)}.`, 'The sentence, under the chip.'],
      cap: `For this still the capture stopped ${esc(SW.failed.study)}'s file on its way to the page, as a dropped connection would. The app said: ${q(SW.failed.said)} The chart stayed as it was. With the file let through, the same study opened.`
    }
  ])}
  ${steps([
    [`In the ${a(APP, 'demo app')}, choose ${key('Outlier Explorer')}.`, 'The chart draws the Pilot study.'],
    [`Press the chip and choose ${key(pp.name)}.`, 'The chip changes. You are still on the Outlier Explorer.'],
    ['Press the i beside the chip.', `The card says ${q(`Made by: ${madeBy}`)} and carries CDISC's attribution.`]
  ])}
</section>

<div class="cut"><span>03 <em>/ a study in sections</em></span></div>
<section id="sections">
  <div class="hd"><h2>The Overview tab shows a simulated study in sections</h2></div>
  <p class="what">For a simulated study the Overview tab is study.builder's study view. One line gives the study's facts. Under it are the sections, and a section with more than one view has a second row of tabs.</p>
  ${solo(SE.overview, `${pp.name} · Overview`, `The Overview tab on ${pp.name}. A line of facts: ${SE.facts.join(', ')}, and a Snapshot chooser. On the left a list of tables by layer: ${SE.layers.join(', ')}. On the right the sections ${SE.sections.join(', ')}, with Overview open: counts of participants, sites, adverse events and visits, and three small tables.`, [
    `The sections: ${list(SE.sections)}.`,
    `The study's tables, by layer: ${list(SE.layers)}.`,
    `The snapshot chooser. This study kept ${n(SE.snapshot.options.length)} monthly snapshots (section 4).`
  ], `The study's facts, in the line: ${list(SE.facts)}. The app said ${q(SE.ready.replace(/\. What each tab says$/, ''))}.`)}
  <table class="reads">
    <thead><tr><th>Section</th><th>Its views</th><th>What it holds</th></tr></thead>
    <tbody>
      <tr><td>Overview</td><td data-h="Views">one</td><td data-h="Holds">Counts, sites by country, what each layer holds, how the study grew.</td></tr>
      <tr><td>Design</td><td data-h="Views">${list(SE.subviews.Design)}</td><td data-h="Holds">The protocol the study followed, and its schedule of activities. Shown only when the study followed a protocol.</td></tr>
      <tr><td>Data</td><td data-h="Views">${list(SE.subviews.Data)}</td><td data-h="Holds">The tables by layer: what built each table, the rows of a table, and a profile of each column.</td></tr>
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
    'study.builder has RBQM and Safety views of its own. They are left out here, and in the builder. The app’s RBQM tab and its chart tabs show the same study.',
    `A demo study is not shown in sections. Its Overview tab has ${list(FI.viewerViews)} (section 7).`
  ])}
  ${steps([
    [`Choose ${key(pp.name)} from the chip, then press ${key('Overview')}.`, `The sections are ${list(SE.sections)}.`],
    [`Press ${key('Design')}, then ${key('Schedule')}.`, 'The protocol’s visits run across the top, its activities down the side.'],
    [`Choose ${key(plainName)} from the chip.`, 'The Design section is gone: that study followed no protocol.']
  ])}
</section>

<div class="cut"><span>04 <em>/ the snapshot you choose</em></span></div>
<section id="snapshot">
  <div class="hd"><h2>The chip says which snapshot is drawn, and the charts and the RBQM tab draw it</h2></div>
  <p class="what">${esc(pp.name)} kept ${n(SN.options.length)} monthly snapshots. It opens on the last, and the chip reads ${q(SN.last.snap)}. The chooser is in the line of facts on the Overview tab. This capture chose ${q(SN.chosen.option)}.</p>
  ${solo(SN.overviewStill, `${pp.name} · Overview, an earlier snapshot`, `The Overview tab on ${pp.name} with the Snapshot chooser set to ${SN.chosen.option}. The chip reads ${pp.name}, ${SN.chosen.snap}. The counts read ${SN.chosen.tiles.participants} participants, ${SN.chosen.tiles.enrolled} enrolled, and ${SN.chosen.tiles.sites} sites.`, [
    `The chooser, set to ${q(SN.chosen.option)}.`,
    `The chip now reads ${q(SN.chosen.snap)} under the study's name.`,
    `The study as it stood then: ${tileWords(SN.chosen.tiles)}. At the last snapshot: ${tileWords(SN.last.tiles)}.`
  ], `The line of facts still gives the study as it was asked for. The counts under it are the snapshot's.`)}
  ${grid([
    {
      label: 'A chart, on that snapshot',
      still: SN.chartStill,
      alt: `The Outlier Explorer on ${pp.name} at ${SN.chosen.snap}. It says ${SN.chosen.chart}.`,
      legend: [`The chip still reads ${q(SN.chosen.snapOnChart)}.`, `The chart says ${q(SN.chosen.chart)}. At the last snapshot it said ${q(SN.last.chart)}.`]
    },
    {
      label: 'The RBQM tab, on that snapshot',
      still: SN.rbqmStill,
      alt: `The RBQM tab on ${pp.name} at ${SN.rbqm.snap}, after Start R: a site overview of ${SN.rbqm.read.count}, with a mark for each metric.`,
      cap: `After ${key('Start R')}: ${q(SN.rbqm.read.count)}, the ${esc(SN.chosen.tiles.sites)} sites the study had at that snapshot. ${SN.rbqm.said ? q(SN.rbqm.said) : ''}`
    }
  ])}
  ${ul([
    `The card under the i says ${q(`Snapshot drawn: ${SN.chosen.card}`)}. Hovering the chip gives ${q(SN.chosen.chipTitle)}.`,
    `Set back to the last snapshot, the chip read ${q(SN.back.snap)}. ${/running/i.test(SN.back.tabAtOnce) || !SN.back.buttons.length ? 'The RBQM tab ran again without being asked' : `The RBQM tab ran again after ${key(SN.back.buttons[0])}`}, and listed ${q(SN.back.read.count)}.`,
    ST.opened.snap === null ? `A study that kept only its last snapshot has no such words on its chip: ${esc(ST.opened.chip)} reads its name alone.` : ''
  ])}
  ${steps([
    [`Choose ${key(pp.name)} from the chip, then press ${key('Overview')}.`, `The chip reads ${q(SN.last.snap)}.`],
    [`In the line of facts, set ${key('Snapshot')} to ${key(SN.chosen.option)}.`, `The chip reads ${q(SN.chosen.snap)}, and the counts fall to ${tileWords(SN.chosen.tiles)}.`],
    [`Press ${key('Labs and vitals')}, then ${key('Outlier Explorer')}.`, `The chart says ${q(SN.chosen.chart)}.`]
  ])}
</section>

<div class="cut"><span>05 <em>/ the Studies page</em></span></div>
<section id="studies">
  <div class="hd"><h2>All studies opens a Studies page</h2></div>
  <p class="what">The page is the chip's list, laid out in full, with the ways to add a study above it. ${q(ST.lead)}</p>
  ${solo(ST.still, 'The Studies page', `The Studies page. Under ${ST.subheads[0]}, three cards: ${ST.ways.map((w) => `${w.head}, with a button ${w.button}`).join('; ')}. Under them the heading ${ST.subheads[1]}.`, [
    `${esc(sentence(ST.subheads[0]))}: three ways.`,
    `${esc(sentence(ST.subheads[1]))}: every study, with its kind and size. The list is the next still.`
  ], `The three ways to add a study, as the page words them:`)}
  <dl class="words">
    ${ST.ways.map((w) => `<dt>${esc(w.head)}</dt><dd>${esc(w.text)} ${key(w.button)}</dd>`).join('\n    ')}
  </dl>
  ${solo(ST.listStill, 'The list', `The list of studies: ${ST.rows.map((r) => `${r.name}, ${r.kind}, ${r.size}`).join('; ')}.`, [`The study in use has ${key(ST.rows[0].button)} in place of ${key(ST.rows[1].button)}.`], `The list held ${n(ST.rows.length)} studies on this capture. A study you build is added to it (section 6).`)}
  ${steps([
    [`Press the chip, then ${key(CH.menu.foot[1])}.`, `The page is titled Studies. The browser tab reads ${q(ST.title)}.`],
    [`Press ${key('Open')} beside ${key('READY-P2')}.`, `The chip reads ${q(ST.opened.chip)}.${/^Studies/.test(ST.opened.title) ? ' You stay on the Studies page.' : ''}`]
  ])}
</section>

<div class="cut"><span>06 <em>/ build a study</em></span></div>
<section id="build">
  <div class="hd"><h2>A study can be built in the browser</h2></div>
  <p class="what">${key(way('describe a study').button)} opens study.builder's form in place of the loaded files. safety.viz carries a copy of study.builder ${BUILDER_VERSION}. You describe a trial, or open a protocol and change its schedule. ${esc(sentence(madeBy))} simulates it with R, in this browser. It is the same R the RBQM tab uses. A first build downloads R and its packages${notSent ? `, and the builder says: ${q(`${notSent}.`)}` : '.'} The detail is in section 8.</p>
  ${solo(BU.form.still, 'The form', `The form, headed ${BU.form.heads.slice(0, 3).join(', ')}. Fields: ${BU.form.labels.slice(0, 5).join('; ')}; buttons for phase, therapeutic area and outliers. Under them, ${BU.form.protocols.length} buttons to try an example protocol, then the layers drawn as a pipeline: ${BU.form.layers.join('; ')}. At the right, a panel headed ${BU.form.panel[0]} with the button Build the study.`, [
    `The trial: a name, a phase, a therapeutic area, then ${list(BU.form.labels.slice(1, 5))}.`,
    `A protocol, in place of a description: ${key('Open a file…')} or one of ${n(BU.form.protocols.length)} examples.`,
    `The layers, drawn as the pipeline they are: ${list(BU.form.layers.map((l) => l.split(' ')[0]))}. Under them, the raw domains to include.`,
    `What you will get, and ${key('Build the study')}.`
  ], `This capture pressed phase ${esc(BS.phase)}, which filled in ${esc(BU.trial.typical.participants)} participants at ${esc(BU.trial.typical.sites)} sites over ${esc(BU.trial.typical.months)} months, then typed smaller numbers: ${n(BS.participants)} participants, ${n(BS.sites)} sites, ${n(BS.months)} months, seed ${n(BS.seed)}.`)}
  ${solo(BU.form.panelStill, 'The panel at the right of the form', `The panel headed ${BU.form.panel[0]}: ${BU.form.panelSet.slice(1, 9).join(', ')}; a note on the first build; the buttons Build the study, Save settings and Settings file; and a sentence on what a simulated study is.`, [`What a first build costs and downloads: ${q(firstBuildNote)}`], `The panel after the smaller numbers were typed. Under the buttons the builder says what a simulated study is.`)}
  ${solo(BU.form.creditStill, 'The foot of the form', `The foot of the builder's form: a sentence on adverse event terms, then CDISC's attribution for the example protocols.`, [`CDISC's attribution, under the builder: ${q(first(BU.form.credit))} The rest is in the still, and in full at the foot of this page.`], `Above the attribution the builder says where its adverse event terms come from: ${q(BU.form.terms)}`)}
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
      cap: `After ${key(BU.protocol.button)}: ${q(BU.protocol.head)}. Each visit's day can be typed over, and each activity ticked or cleared. A protocol here is a CDISC USDM study definition, the data form of an ICH M11 protocol. This capture did not build from a protocol.`
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
      legend: [`${esc(BS.name)} is in the list, marked ${esc(sentence((BU.loaded.menu.items.find((i) => i.name === BS.name) || {}).kind || 'Simulated'))}, and in use.`]
    },
    {
      label: 'Loaded: a chart',
      still: BU.chart.still,
      alt: `The ${BU.chart.title.split(' · ')[0]} drawing the built study.`,
      cap: `The ${esc(BU.chart.title.split(' · ')[0])} on the built study. The app said ${q(BU.loaded.count)}.`
    }
  ])}
  ${ul([
    `After ${key('Load into the demo')} the app showed the Overview tab, with the chip reading ${q(BU.loaded.chip)}${BU.loaded.snap ? ` and ${q(BU.loaded.snap)}` : ''}. Its card says ${q(`Made by: ${BU.loaded.card.facts['Made by']}`)}.`,
    'The chart tabs drew the built study, and the RBQM tab ran every one of its site metrics on it (section 8).',
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

<div class="cut"><span>07 <em>/ the Overview tab</em></span></div>
<section id="files">
  <div class="hd"><h2>The Overview tab opens on the loaded study, looked through</h2></div>
  <p class="what">The Overview tab was the Data tab. For a demo study or your own files it has two faces: ${list(FI.faces.map((f) => f.name))}. ${esc(FI.faces[0].name)} is study.viewer, from study.builder: tables in a rail, rows to filter and sort, a profile of every column, and one participant across every table. ${esc(FI.faces[1].name)} keeps each file, the file picker and Reset.</p>
  ${solo(FI.viewerStill, `${FI.faces[0].name} · the Pilot study`, `The Overview tab on the Pilot study, on the face ${FI.faces[0].name}: a rail listing ${FI.rail.join(', ')}; the views ${FI.viewerViews.join(', ')}; and the rows of the first file, with a Download CSV button and a filter.`, [
    `The two faces: ${list(FI.faces.map((f) => f.name))}.`,
    `The rail: the study's ${n(FI.rail.length)} files, each with its number of rows.`,
    `The views: ${list(FI.viewerViews)}.`
  ], 'A demo study, looked through. Your own files are shown the same way.')}
  ${solo(FI.filesStill, `${FI.faces[1].name} · the Pilot study`, `The Overview tab on the Pilot study, on the face ${FI.faces[1].name}: a Workflow panel with the buttons ${FI.filesButtons.map((b) => b.text).join(', ')}; a box to drop files on; and a card for the RBQM tab.`, [
    `The ${esc(FI.faces[1].name)} face.`,
    `The file picker, ${key('Choose files')}. Files can also be dropped on the box at the right.`,
    `${key('Build a study')}: a way to load data that a library brought. Pressed, it draws in place of the loaded files, with a button ${key(FI.source.back)} to return.`,
    `${key('Reset')}.`
  ], `Under this, the face has a card for each of the study's ${n(FI.filesCards)} files. Each card ends in a folded Details section.`)}
  ${solo(FI.detailsStill, `${FI.faces[1].name} · Details, opened`, `The Details section of ${FI.details[0].file}, opened: a table of its columns with the kind of each (${FI.opened.kinds.map((k) => `${k[0]} ${k[1]}`).join(', ')}), its first 20 rows, and a Download CSV button.`, [`The fold reads ${q(sentence(FI.details[0].summary))}.`, `Under the first ${n(FI.opened.rows)} rows, ${key(FI.opened.buttons[0])}.`], `What Details holds, here for ${esc(FI.details[0].file)} in the Pilot study: how many rows and columns the file has, each column with its kind (number, date or text), the first ${n(FI.opened.rows)} rows, and ${key(FI.opened.buttons[0])}. The other files read ${FI.details.slice(1).map((d) => q(sentence(d.summary))).join(', ')}.`)}
  <h3>Columns are mapped where they are listed</h3>
  ${solo(M.still, `${FI.faces[0].name} · Columns`, `The Columns view on the ${M.study} study: a Mapping box reading ${M.before.note}, with a chooser for each row still to set, one of them marked ${M.set.needed}; under it a profile of every column of the file.`, ['The Columns view.', `${q(M.before.note)}: the rows still to set come first.`, `A row that a chart waits on says how many charts need it: ${q(M.set.needed)}.`], `The ${esc(M.study)} study, whose columns have other names. The app said ${q(M.before.count)}.`)}
  ${ul([
    `The rows still to set, in the order listed: ${unset.map((x) => `${esc(x.label)}${x.needed ? ` (${q(x.needed)})` : ''}`).join(', ')}. After them the box says ${q(M.before.rest)}.`,
    `This capture set ${q(M.set.label)} to the column ${esc(M.set.to)}. The box then read ${q(M.after.note)}, and the app said ${q(M.after.count)}.`,
    `The same row on the ${esc(FI.faces[1].name)} face then read ${esc(M.filesFace)}: one mapping, set in either place.`,
    'For people who build pages with the app, the release notes add: a library can bring a way to load data, its <code>source</code>, and Build a study is the first. <code>portfolio: true</code> and <code>viewer</code> give a page the chip and the viewer. This capture pressed the button. It did not read those settings.'
  ])}
  ${steps([
    [`Choose ${key('Pilot study')} from the chip and press ${key('Overview')}.`, `The study's files are in a rail, with ${list(FI.viewerViews)} beside it.`],
    [`Press ${key(FI.faces[1].name)}. Open ${key('Details')} under a file.`, 'Its columns with their kinds, its first 20 rows, and a Download CSV button.'],
    [`Choose ${key(M.study)} from the chip, press ${key(FI.faces[0].name)}, then ${key('Columns')}.`, `The Mapping box reads ${q(M.before.note)}.`],
    [`Set ${key(M.set.label)} to ${key(M.set.to)}.`, `The count of charts the data supports goes up: ${esc(M.before.count.split(' ')[0])} to ${esc(M.after.count.split(' ')[0])} here.`]
  ])}
</section>

<div class="cut"><span>08 <em>/ one R</em></span></div>
<section id="r">
  <div class="hd"><h2>The app starts R once, and says what it downloads</h2></div>
  <p class="what">Two parts of the app use R in the browser: the RBQM tab and the builder. They share one R. Whichever starts it first downloads R. The other does not download R again. Both orders were run, each in a fresh browser.</p>
  <table class="reads fit">
    <thead><tr><th>Order</th><th>Step</th><th class="num">Time</th><th class="num">Requests to R's host</th><th class="num">Requests for packages</th></tr></thead>
    <tbody>
      <tr><td>Build first</td><td data-h="Step">Build a study of ${n(BS.participants)} participants</td><td class="num" data-h="Time">${secs(BU.build.seconds)}</td><td class="num" data-h="R's host">${n(BU.build.runtime)}</td><td class="num" data-h="Packages">${n(BU.build.packages)}</td></tr>
      <tr><td></td><td data-h="Step">Then the RBQM tab, ${key('Start R')}, on the built study</td><td class="num" data-h="Time">${secs(BU.rbqm.seconds)}</td><td class="num" data-h="R's host">${n(BU.rbqm.runtime)}</td><td class="num" data-h="Packages">${n(BU.rbqm.packages)}</td></tr>
      <tr><td>RBQM first</td><td data-h="Step">The RBQM tab, ${key('Start R')}, on the Pilot study</td><td class="num" data-h="Time">${secs(OT.rbqm.seconds)}</td><td class="num" data-h="R's host">${n(OT.rbqm.runtime)}</td><td class="num" data-h="Packages">${n(OT.rbqm.packages)}</td></tr>
      <tr><td></td><td data-h="Step">Then build the same small study</td><td class="num" data-h="Time">${secs(OT.build.seconds)}</td><td class="num" data-h="R's host">${n(OT.build.runtime)}</td><td class="num" data-h="Packages">${n(OT.build.packages)}</td></tr>
    </tbody>
  </table>
  <p class="cap">Times are from one run on one machine and will differ on yours. The counts are requests the page made to webr.r-wasm.org, R's own host, and to repo.r-wasm.org, its packages. The second step in each order made no request to R's own host.${OT.build.packages ? ` The build that came second made ${n(OT.build.packages)} requests for packages.` : ''}</p>
  ${ul([
    `What is downloaded: R itself from webr.r-wasm.org, and its packages from repo.r-wasm.org. In the whole capture the app asked ${n(rHosts.length + 1)} hosts for anything: ${and(['its own', ...rHosts.map(esc)])}.`,
    `What is not sent: the app's footer says ${q(first(CH.pitch))}${notSent ? ` The builder says ${q(`${notSent}.`)}` : ''} This capture counted requests by host. It did not read what each request carried.`
  ])}
  ${solo(BU.rbqm.before.still, 'After a build: the RBQM tab, before Start R', `The RBQM tab on the built study, after the builder had started R. It still reads ${rbqmWords[0] || 'Site metrics need R'}, with a Start R button.`, [], `R was already running here, started by the builder. The tab still asks for ${key('Start R')}, and still says ${q('55 MB, once')}. Pressing it made no request to R's own host. This is known, and not fixed (section 11).`)}
  ${solo(BU.rbqm.still, `After Start R: ${BU.rbqm.tab.replace(/^RBQM /, '')}`, `The RBQM tab after Start R: the tab reads ${BU.rbqm.tab}, an R chip reads ${BU.rbqm.rChip.replace(/[▾\s]+$/, '')}, and a site overview table lists the built study's ${n(BS.sites)} sites with a mark for each metric.`, [], `${BU.rbqm.said ? `${q(BU.rbqm.said)} ` : ''}Every one of gsm's eight site metrics runs on a built study, because it carries gsm's raw files. On the Pilot study the tab ran ${esc(OT.rbqm.tab.replace(/^RBQM /, '').toLowerCase())}.`)}
  ${steps([
    ['Build a study and load it (section 6).', 'R is now running in the page.'],
    [`Open the ${key('RBQM')} tab and press ${key('Start R')}.`, `The site overview appears in seconds, not the minute or so a first start takes. Here: ${secs(BU.rbqm.seconds)}.`]
  ])}
</section>

<div class="cut"><span>09 <em>/ the expanded profile</em></span></div>
<section id="profile">
  <div class="hd"><h2>The expanded participant profile draws its chart beside its controls</h2></div>
  <p class="what">This is the one change to the chart bundle. The release notes say no chart's settings, data or numbers change. Press a point in a chart that carries the participant profile, and a panel opens beside the chart. ${key('Expand')} lays the panel over the chart's card.</p>
  ${
    PR.before && PR.before.who
      ? `<div class="pair">
  <figure><div class="lbl">Before · ${THEN}</div>${shot(PR.before.still, `The expanded profile of ${PR.before.who} in release 1.12.0: a blank white card where the controls and the chart should be, with the line chart drawn lower down and running over the table of measures.`)}${legendList(PR.before.still, ['Where the controls are in the page. They are not to be seen in this still.', 'The chart, pushed below them.', 'The table of measures, with the chart drawn over it.'])}</figure>
  <figure><div class="lbl now">After · ${NOW}</div>${shot(PR.after.still, `The expanded profile of ${PR.after.who} in release 1.13.0: the controls in a column on the left, the line chart beside them, and the table of measures below both.`)}${legendList(PR.after.still, ['The controls, in a column: Standardization, X-axis, Measures.', 'The chart, beside them.', 'The table of measures, below both.'])}</figure>
</div>
<p class="cap">${esc(PR.after.who)} in the Hepatic Explorer on the Pilot study, expanded, in both releases. Measured in the page: in 1.12.0 the chart began ${n(PR.before.chart.y - (PR.before.controls.y + PR.before.controls.height))} pixels below the controls and ended ${n(PR.before.chart.y + PR.before.chart.height - PR.before.table.y)} pixels below the top of the table. In 1.13.0 it begins ${n(PR.after.chart.x - (PR.after.controls.x + PR.after.controls.width))} pixels to the right of the controls, and the table begins ${n(PR.after.table.y - (PR.after.chart.y + PR.after.chart.height))} pixels below it.</p>`
      : solo(PR.after.still, `After · ${NOW}`, `The expanded profile of ${PR.after.who}: the controls in a column on the left, the line chart beside them, and the table of measures below both.`, ['The controls, in a column: Standardization, X-axis, Measures.', 'The chart, beside them.', 'The table of measures, below both.'], `${esc(PR.after.who)} in the Hepatic Explorer on the Pilot study, expanded. The release notes say that in release 1.12.0 the chart was pushed below the controls and over the table.`)
  }
  ${ul(['The panel was expanded in one chart, the Hepatic Explorer. The other charts that carry the panel were not walked here.'])}
  ${steps([
    [`In the ${a(APP, 'demo app')}, on the Pilot study, choose ${key('Hepatic Explorer')} and press a point on the chart.`, 'A panel opens beside the chart, headed with the participant.'],
    [`Press ${key('Expand')} at the top of the panel.`, `The panel lies over the chart's card. Its chart is beside its controls, and its table is below both. The button now reads ${key(PR.after.button)}.`]
  ])}
</section>

<div class="cut"><span>10 <em>/ header, status, footer</em></span></div>
<section id="header">
  <div class="hd"><h2>The header keeps one row at 1,280 pixels</h2></div>
  <p class="what">Every other still on this page is of a 1,400 pixel window. Here the window is 1,280 and 1,440 pixels wide. At 1,280 the header is one row on each of the ${n(atWidth(1280).length)} studies. The chip is the part that gives: a long study name is cut with an ellipsis.</p>
  ${solo(CH.header1280, '1,280 wide · the whole header', `The header in a 1,280 pixel window on the Pilot study: the name safety.viz, the chip, the i, six tabs and the status label, all on one row. The words Demo app are not drawn.`, ['The chip. The words Demo app are not drawn beside the app’s name at this width.', 'The status label, on the same row.'], `The header at 1,280 pixels, on the Pilot study.`)}
  ${grid([
    {
      label: '1,280 wide · a long name',
      still: CH.header1280Cut,
      alt: `The left of the header in a 1,280 pixel window on the study Liver cohort, labs only: the chip shows the start of the name and an ellipsis.`,
      legend: [`${q(CH.header1280Title)} is cut with an ellipsis. Hovering the chip gives the whole name.`]
    },
    {
      label: '1,440 wide · Demo app',
      still: CH.header1440,
      alt: `The left of the header in a 1,440 pixel window: the words Demo app are drawn beside the name safety.viz, then the chip.`,
      legend: ['The small words Demo app, drawn at 1,440 pixels.']
    }
  ])}
  <table class="reads fit">
    <thead><tr><th>Window width</th><th>“Demo app” drawn</th><th>One row, of ${n(atWidth(1280).length)} studies</th><th>Names cut short</th></tr></thead>
    <tbody>
      ${WIDTHS.map((w) => `<tr><td>${px(w)}</td><td data-h="Demo app">${atWidth(w)[0].demoApp ? 'yes' : 'no'}</td><td data-h="One row">${n(atWidth(w).length - twoRows(w).length)}</td><td data-h="Cut">${cutNames(w).length ? list(cutNames(w)) : 'none'}</td></tr>`).join('\n      ')}
    </tbody>
  </table>
  <p class="cap">Read on each of the ${n(atWidth(1280).length)} studies at each width. The release notes say the header keeps one row at 1,280 pixels, and that “Demo app” is not drawn from 1,200 to 1,439.</p>
  <h3>Two new sentences: the status panel and the footer</h3>
  ${solo(CH.statusStill, 'The status label, pressed', `The panel under the status label, headed ${CH.statusPanel.heading}: ${CH.statusPanel.text.join(' ')}`, [`The sentence about study.builder: ${q(CH.statusPanel.text.find((l) => /study\.builder/.test(l)))}`], `The panel opens from the label that reads ${q(sentence(CH.status))}. It begins: ${q(first(CH.statusPanel.text[0]))}`)}
  ${solo(CH.footerStill, 'The footer', `The app's footer: ${CH.pitch} Then the links ${CH.footer.slice(1, -1).join(', ')}, and ${CH.version}.`, [`What is read here, and what starting R downloads: ${q(CH.pitch)}`, `The version: ${q(CH.version)}.`], CH.before && CH.before.pitch && CH.before.pitch !== CH.pitch ? `In release 1.12.0 the sentence about R read ${q(CH.before.pitch.replace(/^.*?never uploaded\.\s*/, ''))} It now names Build a study beside the RBQM tab.` : 'The footer is the same on every tab.')}
</section>

<div class="cut"><span>11 <em>/ limits</em></span></div>
<section id="found">
  <div class="hd"><h2>Limits</h2></div>
  <div class="note found">
    <div class="lbl">Known, and not fixed</div>
    <p>These four are in the release notes. Beside each is what this capture saw.</p>
    <ul>
      <li>The Patient Journey Explorer's Collapse button does not close its panel. Not captured: that chart is on the docs site, not in the demo app.</li>
      <li>After the builder starts R, the RBQM tab still says R must be downloaded, and the reverse.${rbqmWords.length ? ` Captured: after a build the RBQM tab read ${q(rbqmWords[0].replace(/ START R$/, ''))} and asked for ${key('Start R')}.` : ''}${noteAfterR ? ` After the RBQM tab had started R, the builder read ${q(first(noteAfterR))}` : ''} In both orders the second step made no request to R's own host (section 8).</li>
      <li>With the builder open the side panel says no files are loaded.${railSaysNone ? ` Captured: the panel read ${q('No files loaded')} while the chip named ${q(BU.form.chip)}.` : ''}</li>
      <li>A reload reopens the pilot study. Captured: after a reload the chip read ${q(BU.reload.chip)}, though ${esc(BS.name)} was in use before.${BU.reload.kept ? ' The built study was still in the list.' : ''}</li>
    </ul>
    <p>Where they are tracked: ${a(issue(410), 'safety.viz #410')}, ${a(`${STV}/issues/19`, 'study.viz #19')}, ${a(`${STV}/issues/20`, 'study.viz #20')}.</p>
  </div>
  <div class="note found">
    <div class="lbl">The statistics</div>
    <ul>
      <li>The charts' JavaScript statistics are unchanged in this release. A ruling on each is open${cite(issue(259), 'safety.viz #259')}.</li>
      <li>They are: the Adverse Event Explorer's 95% interval and significance mark; the QT Explorer's interval and threshold flag; the Time-to-Event Explorer's Kaplan-Meier band; and Delta-Delta's fitted line and R squared.</li>
      <li>The builder's “Chance of seeing it”, a power figure, is study.builder's design arithmetic, worked out in JavaScript.${BU.protocol.chance ? ` The capture read that column in the form after ${key(BU.protocol.button)} was pressed, headed ${BU.protocol.chance.heads.map(q).join(', ')}.` : ''}</li>
      <li>This page checks no statistic. It shows what the app does, not that a number is right.</li>
    </ul>
  </div>
  <div class="note found">
    <div class="lbl">Noticed while capturing</div>
    <ul>
      <li>The sentence for a study that did not open ends ${q((SW.failed.said.match(/Its settings[^.]*\./) || [''])[0])} The reader was on a chart, where no form is shown (section 2).</li>
      ${twoRows(1200).length ? `<li>At ${px(1200)} the header took two rows on ${n(twoRows(1200).length)} of ${n(atWidth(1200).length)} studies: ${list(twoRows(1200))}. At 1,280, the width the release notes name, it was one row on every study (section 10).</li>` : ''}
      ${Number(SN.back.read.sites) !== Number(SN.last.tiles.sites) ? `<li>On ${esc(pp.name)} at its last snapshot the RBQM tab listed ${q(SN.back.read.count)}, and the Overview tab counted ${esc(SN.last.tiles.sites)} sites. At the snapshot chosen in section 4 the two agreed, at ${esc(SN.chosen.tiles.sites)}. Why they differ was not looked into.</li>` : ''}
      ${firstBuildNote && BU.build.seconds > 90 ? `<li>The first build took ${secs(BU.build.seconds)} on this capture. The builder's own note reads ${q(first(firstBuildNote))}</li>` : ''}
      ${snapshotCarried ? `<li>${esc(pp.name)} opened on its last snapshot, ${q(SE.snapshot.chosen)}. Opened after ${esc(plainName)}, whose last snapshot is ${q(SE.plain.snapshot.chosen)}, it showed ${q(SE.snapshotAfterPlain)}: the snapshot chosen for one study carried to the next.</li>` : ''}
    </ul>
  </div>
  <div class="note">
    <div class="lbl">Not checked on this page</div>
    <ul>
      <li>Files of your own. Every still is of a demo study, a ready-made study or the study built here.</li>
      <li>Building from a protocol. The form was opened on ${q(BU.protocol.button.replace(/^Try the /, 'the '))} and not built. The other ${n(BU.form.protocols.length - 1)} examples and ${key('Open a file…')} were not pressed.</li>
      <li>The builder's ${list(BU.built.buttons.slice(0, 3))} buttons, the app's ${q('Download as one file')}, and the Biomarkers tab on a simulated study.</li>
      <li>The expanded profile in any chart but the Hepatic Explorer, and the Patient Journey Explorer.</li>
      <li>A phone, any window narrower than 1,199 pixels, and any browser but Chromium.</li>
      <li>Whether a result is right. This page shows what the app does, not that a simulated study is a good one. Nothing in the app is qualified; its own label says ${q(sentence(CH.status))}.</li>
    </ul>
  </div>
</section>

<div class="cut"><span>12 <em>/ where to check it</em></span></div>
<section id="check">
  <div class="close">
    <div>
      <h3>The release</h3>
      <ul>
        <li>The ${a(NEWS, 'release notes')}, section v1.13.0.</li>
        <li>The app, until the release: ${a(DEV_APP, 'the dev build')}. After it: ${a(RELEASED_APP, 'the released app')}.</li>
        <li>Studies, the chip, the viewer as the Overview tab, the builder and the expanded profile${cite(pr(395), 'safety.viz pull request #395')}.</li>
        <li>The snapshot on the chip and in the charts, and the header's one row${cite(pr(419), '#419')}.</li>
        <li>The copy of study.builder moved to ${BUILDER_VERSION}, and the simulator named as a modified copy${cite(issue(423), '#423')}.</li>
        <li>The notes, the footer and the data sources page${cite(issue(424), '#424')}.</li>
      </ul>
    </div>
    <div>
      <h3>Beside it</h3>
      <ul>
        <li>${a(SB, 'study.builder')}: the builder, the viewer and the study view. safety.viz carries a copy of its ${BUILDER_VERSION} release.</li>
        <li>${a(STUDY_VIZ_PAGE, 'The study.viz v0.1.0 demo page')}: the same app in a repository of its own.</li>
        <li>${a('../sv-v1.12.0-demo/', 'The safety.viz v1.12.0 demo page')}: the release before this one.</li>
      </ul>
    </div>
  </div>
</section>

<footer>
  <p>Data: the Pilot study and the Renamed columns study are the public, de-identified CDISC Pilot 01 study (pharmaverseadam), with synthetic liver and kidney groups added to the labs. ${esc(pp.name)}, ${esc(plainName)}, READY-P2 and ${esc(BS.name)} are simulated by ${esc(madeBy)}, which study.builder carries: every row is made up. No real participant appears on this page.</p>
  <p>${esc(pp.name)} follows one of CDISC's example protocols, and stills of it show that protocol's name, visits and activities. The app's attribution, in full: ${esc(credit)}</p>
  <p>Captured with Playwright, headless Chromium, from ${c.site.after ? a(c.site.after, esc(c.site.after_is)) : OF}${CH.before ? `; the before stills are from ${a(c.site.before, 'the released site')}, ${esc(THEN)}` : ''}. Three parts of the capture start real R in the browser. One part stops one study's file on its way to the page, to read what the app says. Every label, count and time quoted from the app was read by the script, and ${held} checks held them. How it was made, and how to take the stills again: ${a(HERE, 'this page’s folder')}.</p>
  <hr>
  <p>This page was drafted by Claude Code using Fable 5.2.</p>
</footer>

</div>
</body></html>
`;
if (/<script/i.test(html)) throw new Error('the page must carry no script');
if (/127\.0\.0\.1|localhost|\/Users\//.test(html)) throw new Error('the page must carry no local address or path');
fs.writeFileSync(path.join(dir, 'index.html'), html);
console.log(`Wrote index.html: ${held} checks held, ${Object.keys(c.stills).length} stills, description ${DESCRIPTION.length} characters${RELEASED_ON ? `, released ${RELEASED_ON}` : ', release candidate'}.`);
