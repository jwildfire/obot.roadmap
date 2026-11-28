// Writes index.html for the study.viz v0.1.0 demo page from capture.json,
// which capture.cjs wrote. The labels, counts, names, checksums and times the
// page quotes from the app and the repository come from capture.json; none is
// typed here by hand. The few things it states that the capture does not read
// are named in this folder's README.
//
//   node build.cjs [dir]        default: the folder this file is in
//
//   RELEASED_ON="29 November 2026" node build.cjs
//       after study.viz's release: the status word and the line under "Where
//       it stands" say released, with that date, and the steps link to the
//       released app.
//   SV_RELEASED_ON="28 November 2026" node build.cjs
//       after safety.viz v1.13.0's release: the sentences about the chart
//       bundle say it is safety.viz v1.13.0's, released on that date. Without
//       it they say what the capture read: whether safety.viz had tagged
//       v1.13.0 when the page was captured.
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
const STV = 'https://github.com/jwildfire/study.viz';
const SV = 'https://github.com/jwildfire/safety.viz';
const SB = 'https://github.com/jwildfire/study.builder';
const HUB = 'https://github.com/jwildfire/obot.roadmap';
const DEV_APP = 'https://jwildfire.github.io/study.viz/dev/';
const RELEASED_APP = 'https://jwildfire.github.io/study.viz/';
const RELEASED_ON = process.env.RELEASED_ON || '';
const SV_RELEASED_ON = process.env.SV_RELEASED_ON || '';
const APP = RELEASED_ON ? RELEASED_APP : DEV_APP;
const HERE = `${HUB}/tree/main/reports/study-viz-v0.1.0-demo`;
const SV_PAGE = '../sv-v1.13.0-demo/';
const doc = (f) => `${STV}/blob/dev/${f}`;
const svIssue = (n) => `${SV}/issues/${n}`;
const stvIssue = (n) => `${STV}/issues/${n}`;
// The comparison in comparison/: when it was made and of which builds. Not read
// by capture.cjs; see this folder's README.
const COMPARISON = { date: '28 November 2026', safety: '75b918cd', study: 'beee1a56' };

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
const sentence = (t) => (t ? t.charAt(0).toUpperCase() + t.slice(1).toLowerCase() : '');

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
const grid = (figs) => `<div class="views">${figs.map((f) => `<figure${f.still.width < 560 ? ` class="own" style="--w:${f.still.width}px"` : ''}><div class="lbl now">${esc(f.label)}</div>${shot(f.still, f.alt)}${legendList(f.still, f.legend || [])}${f.cap ? `<p class="cap">${f.cap}</p>` : ''}</figure>`).join('\n')}</div>`;
const ul = (items, cls = 'list') => `<ul class="${cls}">${items.filter(Boolean).map((i) => `<li>${i}</li>`).join('')}</ul>`;
const steps = (items) => `<div class="note try"><div class="lbl">Try it</div><ol class="steps">${items.map(([d, s]) => `<li><span class="do">${d}</span><span class="see">${s}</span></li>`).join('')}</ol></div>`;

// ---------------------------------------------------------------- what was read
const HO = c.home;
const SA = c.same;
const CH = c.chip;
const SE = c.sections;
const SD = c.saved;
const SN = c.snapshot;
const BU = c.build;
const HE = c.held;
const BS = c.build_settings;
const link = (re) => HO.links.find((l) => re.test(l.text)) || {};
const [appVersion, chartVersion] = HO.version.split(' · ');
const tabTitle = HO.title.split(' · ').slice(1).join(' · ');
const demo = SA.here.menu.items.filter((i) => /demo/i.test(i.kind));
const sim = SA.here.menu.items.filter((i) => /simulated/i.test(i.kind));
const charts = Object.values(SA.here.items).reduce((s, v) => s + v.length, 0);
const walk = (sec) => SE.walk.find((w) => w.section === sec);
const TR = HE.testRun;
const madeBy = CH.card.facts['Made by'];
const credit = CH.card.credit[0];
const regulated = (HO.statusPanel.all.match(/Validated for regulated use\. Nothing in safety\.viz is, yet\./) || [''])[0];
const OF = c.site.app ? `${esc(c.site.app_is)}, ${esc(c.site.branch)} at ${esc(short(c.site.commit))}` : `${esc(c.site.app_is)}, commit ${esc(short(c.site.commit))}`;
const otherHosts = (c.site.hosts || []).filter((h) => !/r-wasm\.org$/.test(h) && h !== 'the app’s own host');
if (otherHosts.length) throw new Error(`the capture asked a host the page does not account for: ${otherHosts.join(', ')}`);
const day = String(SN.chosen.option).split(' · ')[0];

// The chart bundle and safety.viz v1.13.0: the sentences that depend on its release.
const B = HE.bundle;
const BUNDLE_NAMED = `safety.viz's chart bundle from its dev branch at ${short(B.commit)}, named ${B.version}`;
const SV_STATUS = SV_RELEASED_ON
  ? `safety.viz v${B.version} was released on ${esc(SV_RELEASED_ON)}; the bundle is that release's.`
  : B.tagged
    ? `When this page was captured, safety.viz had released v${esc(B.version)}.`
    : `When this page was captured, safety.viz v${esc(B.version)} was a release candidate, not yet released. study.viz v0.1.0 is to be released after it.`;

const css = fs.readFileSync(path.join(dir, 'page.css'), 'utf8');

const DESCRIPTION = 'The first release candidate of study.viz, the demo app copied out of safety.viz into its own repository: its own name and address, the same studies and charts, what it says of a simulated study, and the records that hold the copy.';
if (DESCRIPTION.length < 40 || DESCRIPTION.length > 260) throw new Error(`description is ${DESCRIPTION.length} characters`);

const STATUS_WORD = RELEASED_ON ? `Released ${esc(RELEASED_ON)}` : 'Release candidate';
const STANDS = RELEASED_ON
  ? `study.viz v0.1.0 was released on ${esc(RELEASED_ON)}, on @jwildfire’s approval of its release candidate. It is the first release of this repository. The stills on this page are of the dev site the candidate was cut from.`
  : `study.viz v0.1.0 is a release candidate, the first for this repository. It is not released until @jwildfire approves the candidate. The stills on this page are of the dev site the candidate is cut from.`;

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
  <p class="lede">study.viz is new. It is the demo app that lived inside safety.viz, copied into its own repository under its own name. safety.viz keeps the charts. study.viz keeps the app that hosts them. This page shows what is particular to study.viz, and the things the app says of a simulated study. The app is walked in full on the ${a(SV_PAGE, 'safety.viz v1.13.0 demo page')}.</p>
  <div class="facts"><span>Captured ${esc(date)}</span><span>${OF}</span><span>${held} of ${held} checks held</span><span>1,400 by 900 window, light theme</span></div>

  <div class="note">
    <div class="lbl">Where it stands</div>
    <ul>
      <li id="rc-links">${STANDS}</li>
      <li>The charts are ${esc(BUNDLE_NAMED)}. ${SV_STATUS}</li>
      <li>Until the release, the app is at ${a(DEV_APP, 'jwildfire.github.io/study.viz/dev/')}. After the release it is at ${a(RELEASED_APP, 'jwildfire.github.io/study.viz/')}; that address has no page before then.</li>
      <li>Some studies are public data and some are made up; the footer of this page says which. Every simulated study is made by ${esc(madeBy)}.</li>
      <li>Nothing in the app is qualified. Its own label reads ${q(sentence(HO.status))}: every result should be confirmed.</li>
    </ul>
  </div>

  <div class="note">
    <div class="lbl">In short</div>
    <ul>
      <li>The app has its own address and its own name. Its header reads ${q('study.viz')}, its browser tab ${q(tabTitle)}, and its footer ${q(HO.version)}.</li>
      <li>It does what the safety.viz demo does. The capture read both apps and found the same tabs, the same ${n(charts)} charts, the same ${n(SA.here.menu.items.length)} studies and the same Studies page.</li>
      <li>A simulated study says so: ${q('Simulated')} and its snapshot on the chip, ${q('Made by')} on its card, the label ${q('Experimental')} on its view and on Build a study, and the files the app saves start with ${q('simulated-')}.</li>
      <li>No chart's source is in study.viz. The charts are safety.viz's built file, copied byte for byte.</li>
      <li>Every copied file is recorded with a checksum against the safety.viz commit it came from, and a check fails when a file and the record disagree.</li>
    </ul>
  </div>

  <div class="note">
    <div class="lbl">What to look at</div>
    <ol>
      <li>Open the ${a(APP, 'app')}. Read the name in the header, the title of the browser tab, and the last line of the footer.</li>
      <li>Press the chip that reads ${q(SA.here.menu.items.find((i) => i.inUse).name)} and choose ${key('PILOT-PROTOCOL')}. Read the line under its name, then press the ${key('i')} beside it.</li>
      <li>Press ${key('Overview')} and walk the sections.</li>
      <li>Read section 7 of this page: what is recorded, and what was checked.</li>
    </ol>
  </div>
</header>

<nav class="toc" aria-label="Contents">
  <a href="#home"><span class="ref">01</span><span class="t">Its own home and name</span><span class="s">The header, the tab, the footer</span></a>
  <a href="#same"><span class="ref">02</span><span class="t">The same app</span><span class="s">Read beside the safety.viz demo</span></a>
  <a href="#simulated"><span class="ref">03</span><span class="t">A simulated study says so</span><span class="s">The chip, the card, a failed open</span></a>
  <a href="#sections"><span class="ref">04</span><span class="t">A study in sections</span><span class="s">study.builder's study view</span></a>
  <a href="#saved"><span class="ref">05</span><span class="t">Files it saves</span><span class="s">Named simulated- when they are</span></a>
  <a href="#build"><span class="ref">06</span><span class="t">Built with R</span><span class="s">One study built, two scored</span></a>
  <a href="#held"><span class="ref">07</span><span class="t">How it is held</span><span class="s">The record, the charts, the tests</span></a>
  <a href="#found"><span class="ref">08</span><span class="t">Limits</span><span class="s">Known, disclosed, not checked</span></a>
</nav>

<div class="cut"><span>01 <em>/ its own home and name</em></span></div>
<section id="home">
  <div class="hd"><h2>The app has its own home and name</h2></div>
  <p class="what">In safety.viz the app was one page of the docs site, at <code>demo/</code>. Here the app is the site: it opens at the site's root.</p>
  ${solo(HO.still, 'The app as it opens', `The study.viz demo app as it opens: a header with the name study.viz, a chip naming the study, the tabs, and the Histogram on the Pilot study.`, ['The wordmark reads study.viz. It is not a link: there is no docs site behind it here.'], `The browser tab is titled ${q(HO.title)}.`)}
  ${solo(HO.footerStill, 'The footer', `The footer of the app: a line about files and R, then the links ${HO.links.map((l) => l.text).join(', ')}, then ${HO.version}.`, [`${q(HO.version)}: the app's own version, then the name of the chart bundle it carries.`, `${q(link(/docs/i).text)}: the docs are safety.viz's, and the link says so.`], `Two versions, because two things are here: the app, and the charts it hosts. The bundle is named ${esc(chartVersion)}. ${SV_STATUS}`)}
  <dl class="words">
    <dt>Header</dt><dd>${q(HO.brand.text)}.</dd>
    <dt>Browser tab</dt><dd>${q(HO.title)}: the chart or page, then ${q(tabTitle)}.</dd>
    <dt>Footer</dt><dd>${q(HO.version)}.</dd>
    <dt>${esc(link(/docs/i).text)}</dt><dd>Leads to ${a(link(/docs/i).href, esc(link(/docs/i).href.replace(/^https:\/\//, '')))}. The chart gallery and each chart's own pages stay on safety.viz's site.</dd>
    <dt>${esc(link(/source/i).text)}</dt><dd>Leads to ${a(link(/source/i).href, esc(link(/source/i).href.replace(/^https:\/\//, '')))}.</dd>
    <dt>${esc(link(/one file/i).text)}</dt><dd>Leads to a file named <code>${esc((link(/one file/i).href || '').split('/').pop())}</code>. It was not opened here.</dd>
  </dl>
  ${solo(HO.statusStill, 'The status label, pressed', `The panel under the status label, headed ${HO.statusPanel.heading}. It lists the rungs, and under Qualified reads: ${regulated}`, [`Under ${q('Qualified')}: ${q(regulated)} The words come from the chart bundle, so they name safety.viz.`], `The panel opens from the label that reads ${q(sentence(HO.status))}. Its first sentence: ${q(HO.statusPanel.text[0].split('. ')[0] + '.')}`)}
  ${solo(HO.headerStill, 'The header at 1,280 pixels', `The app's header in a window 1,280 pixels wide, on PILOT-PROTOCOL: the wordmark, the chip, the tabs and the status label on one row.`, [], `In a window 1,280 pixels wide the header was one row on each of the ${n(Object.keys(HO.header).length)} studies in the list.`)}
  ${steps([
    [`Open the ${a(APP, 'app')}.`, `The header reads study.viz. The browser tab reads ${q(HO.title)}.`],
    ['Scroll to the foot of the page.', `The last line reads ${q(HO.version)}.`]
  ])}
</section>

<div class="cut"><span>02 <em>/ the same app</em></span></div>
<section id="same">
  <div class="hd"><h2>It does what the safety.viz demo does</h2></div>
  <p class="what">The capture opened study.viz and the ${a(SA.compare, 'safety.viz demo')} on safety.viz's dev site, read the same things from each, and compared them. They were the same.</p>
  <table class="reads">
    <thead><tr><th>What was read</th><th>In both apps</th></tr></thead>
    <tbody>
      <tr><td>The tabs</td><td data-h="Both">Overview, then ${list(SA.here.tabs.map((t) => t.replace(/ NOT RUN$/, '')))}</td></tr>
      <tr><td>The charts under the tabs</td><td data-h="Both">${n(charts)}, with the same names and the same ready marks</td></tr>
      <tr><td>The studies under the chip</td><td data-h="Both">${n(demo.length)} marked ${esc(demo[0].kind)} (${list(demo.map((i) => i.name))}) and ${n(sim.length)} marked ${esc(sim[0].kind)} (${list(sim.map((i) => i.name))})</td></tr>
      <tr><td>The Studies page</td><td data-h="Both">${n(SA.here.studies.ways.length)} ways to add a study (${list(SA.here.studies.ways.map((w) => w.head))}) and ${n(SA.here.studies.rows.length)} studies listed</td></tr>
      <tr><td>On the study it opens with</td><td data-h="Both">${q(SA.here.count)}</td></tr>
      <tr><td>The chart bundle the footer names</td><td data-h="Both">${esc(SA.there.version)}</td></tr>
    </tbody>
  </table>
  <p class="cap">What differs is the name: the header, the tab title, the footer and its links, as section 1 shows.</p>
  ${grid([
    { label: 'The chip, pressed', still: SA.menuStill, alt: `The list under the chip in study.viz: ${SA.here.menu.items.map((i) => `${i.name}, ${i.kind}`).join('; ')}; then the buttons ${SA.here.menu.foot.join(' and ')}.`, cap: `The list of studies, with ${key(SA.here.menu.foot[0])} and ${key(SA.here.menu.foot[1])} under it.` },
    { label: 'The Studies page', still: SA.studiesStill, alt: `The Studies page in study.viz: three ways to add a study, then the list of studies.`, cap: `${list(SA.here.studies.ways.map((w) => w.button))}, then every study.` }
  ])}
  ${solo(SA.chart.still, 'A chart tab', `The ${SA.chart.title.split(' · ')[0]} in study.viz, on the Pilot study.`, [], `The ${esc(SA.chart.title.split(' · ')[0])}. The chart is safety.viz's; study.viz draws it from the copied bundle (section 7).`)}
  ${ul([
    `A second comparison ran R in both apps. study.viz's <code>scripts/compare-demos.mjs</code> was run on ${esc(COMPARISON.date)} against both dev sites: safety.viz's at ${esc(COMPARISON.safety)} and study.viz's at ${esc(COMPARISON.study)}. On the Pilot study and on PILOT-PROTOCOL, R ran the same metrics in both apps, and the RBQM tab's site table was the same, cell for cell, at every site. Its table and screenshots are in ${a(`${HERE}/comparison`, 'this page’s comparison folder')}.`,
    `For the chip, the Studies page, the builder, the files and the mapping in detail, see the ${a(SV_PAGE, 'safety.viz v1.13.0 demo page')}. Each of its steps works the same here.`
  ])}
  ${steps([
    [`In the ${a(APP, 'app')}, press the chip.`, `${n(SA.here.menu.items.length)} studies: ${n(demo.length)} demo, ${n(sim.length)} simulated.`],
    [`Press ${key(SA.here.menu.foot[1])}.`, `The Studies page, titled ${q(SA.here.studies.title)} in the browser tab.`]
  ])}
</section>

<div class="cut"><span>03 <em>/ a simulated study says so</em></span></div>
<section id="simulated">
  <div class="hd"><h2>A simulated study says so</h2></div>
  <p class="what">Choose a simulated study from the chip and the app says what it is, under the study's name and in its card. When a study's file cannot be fetched, the app says that under the chip.</p>
  ${solo(CH.after.still, 'The chip, on a simulated study', `The chip in the header on a chart tab: PILOT-PROTOCOL, and under it ${CH.after.snap}.`, [], `On the ${esc(CH.after.title.split(' · ')[0])}, the chip reads ${q(CH.after.chip)} and, under it, ${q(CH.after.snap)}. On a demo study there is no second line. Choosing the study kept the tab that was open, and started no R.`)}
  ${solo(CH.cardStill, 'The card, under the i', `The card of PILOT-PROTOCOL: ${CH.card.lines.slice(0, 20).join(', ')}.`, [`${q('Made by')}: ${q(madeBy)}.`, 'CDISC’s attribution, because this study follows one of CDISC’s example protocols.'], `The card says what the study is, which snapshot is drawn, and ${q(CH.card.about[0] || 'Every row is synthetic.')}`)}
  ${solo(CH.failed.still, 'A study that did not open', `The header with the chip still reading Pilot study, and under it in a box: ${CH.failed.said}`, [`${q(CH.failed.said)}`], `To read this sentence, the capture stopped the file of ${esc(CH.failed.study)} on its way to the page, as a dropped connection would. The study in use stayed the Pilot study. When the file could be fetched again, ${esc(CH.failed.study)} opened.`)}
  ${steps([
    [`On a chart tab, choose ${key('PILOT-PROTOCOL')} from the chip.`, `The same chart, now on PILOT-PROTOCOL. Under the name: ${q(CH.after.snap)}.`],
    [`Press the ${key('i')} beside the chip.`, `${q('Made by')} reads ${q(madeBy)}.`]
  ])}
</section>

<div class="cut"><span>04 <em>/ a study in sections</em></span></div>
<section id="sections">
  <div class="hd"><h2>A simulated study is shown in sections</h2></div>
  <p class="what">For a simulated study the Overview tab is study.builder's study view, from its ${esc(HE.builder.tag)} release. The views are grouped into sections, and a section with more than one view has a second row of tabs. The view carries the label ${q(SE.label.word)}.</p>
  ${solo(walk('Overview').still, 'PILOT-PROTOCOL · Overview', `The Overview tab on PILOT-PROTOCOL in study.viz. A line of facts: ${SE.facts.join(', ')}. On the left the study's tables by layer: ${SE.layers.join(', ')}. On the right the sections ${SE.sections.join(', ')}, with Overview open.`, [], `The sections: ${list(SE.sections)}. The facts in the line: ${list(SE.facts)}. This ready-made study opened with no R.`)}
  ${solo(SE.label.still, 'The Experimental label, pressed', `The Overview tab on PILOT-PROTOCOL with the label Experimental pressed: a panel headed ${SE.label.heading}, which begins ${SE.label.says}`, ['The label, at the corner of the view.', `Its sentence: ${q(SE.label.says)}`], `The panel is headed ${q(SE.label.heading)}.`)}
  ${solo(SE.notes.still, 'The study’s own notes', `The study's notes, opened: ${SE.notes.items.slice(0, 2).join(' ')}`, [`The first note: ${q(SE.notes.items[0])}`], `The notes are folded under the Overview section, headed ${q(SE.notes.summary)}. ${n(SE.notes.items.length)} notes; each of the ${n(SE.notes.naming)} that names gsm.datasim names the modified copy.`)}
  ${grid([
    { label: 'Design · Schedule', still: walk('Design').still, alt: 'The Design section, Schedule view: the protocol’s visits across the top and its activities down the side, with a dot where an activity happens at a visit.', cap: 'Design has two views, Protocol and Schedule. It appears only when the study followed a protocol.' },
    { label: 'Data · Pipeline', still: walk('Data').still, alt: 'The Data section, Pipeline view: the settings the study was asked to be, then every table by layer with the workflow that built it.', cap: 'Data has three views: Pipeline, Tables and Columns.' },
    { label: 'One participant', still: walk('One participant').still, alt: 'The One participant section: a chooser for the participant, then that participant’s rows in each table.', cap: 'One participant, followed across every table.' },
    { label: 'Reporting · Efficacy', still: walk('Reporting').still, alt: 'The Reporting section, Efficacy view: a line chart of a simulated score by arm, with a table under it.', cap: 'Reporting has two views here: Efficacy and Adverse events.' }
  ])}
  ${solo(SE.scheduleCredit.still, 'Under the schedule grid', `The foot of the Schedule view: the last rows of the grid, then the line ${SE.scheduleCredit.text}`, [`${q(SE.scheduleCredit.text)}`], 'CDISC’s attribution, once, under the grid.')}
  ${ul([
    'study.builder has RBQM and Safety views of its own. They are left out here. The app’s RBQM tab and its chart tabs show the same study.',
    'On a window 1,400 wide, each of the five views stayed inside the page: none made it scroll sideways.'
  ])}
  ${steps([
    [`Choose ${key('PILOT-PROTOCOL')} from the chip, then press ${key('Overview')}.`, `The sections are ${list(SE.sections)}. The label ${q(SE.label.word)} is at the corner.`],
    [`Press ${key('Design')}, then ${key('Schedule')}.`, 'The protocol’s visits run across the top, its activities down the side, and CDISC’s attribution is under the grid.']
  ])}
</section>

<div class="cut"><span>05 <em>/ files it saves</em></span></div>
<section id="saved">
  <div class="hd"><h2>A file saved from a simulated study is named so</h2></div>
  <p class="what">A simulated study's files carry the standard names, such as <code>adsl.csv</code>. So that a saved file is not taken for a real study's, the app's own download buttons add ${q('simulated-')} to the name while a simulated study is in use. The capture pressed each button on the Overview tab's Files face and read the name the browser was offered.</p>
  <table class="reads">
    <thead><tr><th>Button</th><th>On ${esc(SD.demo.study)} (demo)</th><th>On ${esc(SD.simulated.study)} (simulated)</th></tr></thead>
    <tbody>
      <tr><td>${key('Download mapping')}</td><td data-h="Demo"><code>${esc(SD.demo.mapping)}</code></td><td data-h="Simulated"><code>${esc(SD.simulated.mapping)}</code></td></tr>
      <tr><td>${key('Download CSV')}, under Details of ${esc(SD.simulated.file)}</td><td data-h="Demo"><code>${esc(SD.demo.csv)}</code></td><td data-h="Simulated"><code>${esc(SD.simulated.csv)}</code></td></tr>
    </tbody>
  </table>
  <p class="cap">The mapping file is named for study.viz, not safety.viz. The files were not kept. study.builder's own buttons were not pressed: section 8.</p>
</section>

<div class="cut"><span>06 <em>/ built with R</em></span></div>
<section id="build">
  <div class="hd"><h2>A study built with R, then scored on the RBQM tab</h2></div>
  <p class="what">One study was built here, small: ${n(BS.participants)} participants at ${n(BS.sites)} sites over ${n(BS.months)} months. R ran in the browser. The same R then ran the site metrics. Build a study carries the label ${q(BU.form.label.word)}.</p>
  ${solo(BU.form.label.still, 'Build a study, its label pressed', `The builder's form with the label Experimental pressed: a panel headed ${BU.form.label.heading}, which begins ${BU.form.label.says}`, ['The label, at the corner of the form.', `Its sentence: ${q(BU.form.label.says)}`], `The panel is headed ${q(BU.form.label.heading)}.`)}
  ${solo(BU.form.creditStill, 'Under the example protocols', `The builder's example protocols, then the line ${BU.form.credit}`, [`${q(BU.form.credit)}`], `CDISC’s attribution sits inside the builder once, under the ${n(BU.form.protocols.length)} example protocols. The form names the simulator too: ${q(BU.form.terms)}`)}
  ${solo(BU.built.still, 'Built', `The built study, ${BS.name}, in study.viz: a badge reading ${BU.built.builtIn}, the button Load into the demo, the facts ${BU.built.facts.slice(0, 6).join(', ')}, and the study view under them.`, [`${key('Load into the demo')} hands the study to the charts and the RBQM tab.`], `${q(BU.built.builtIn)}. From pressing ${key('Build the study')} to this screen took ${secs(BU.build.seconds)} on this capture, which includes starting R.`)}
  ${solo(BU.rbqm.still, `The RBQM tab: ${BU.rbqm.tab.replace(/^RBQM /, '')}`, `The RBQM tab in study.viz on the built study: the tab reads ${BU.rbqm.tab} and a site overview table lists the study's sites with a mark for each metric.`, [], `${BU.rbqm.said ? `${q(BU.rbqm.said)} ` : ''}It took ${secs(BU.rbqm.seconds)} and made ${n(BU.rbqm.runtime)} requests to R's own host: R was already running.`)}
  ${solo(SN.rbqm.detailsStill, 'Run details, on a snapshot chosen', `The RBQM tab on PILOT-PROTOCOL at its third snapshot, with Run details open: ${Object.entries(SN.rbqm.details.versions).map(([k, v]) => `${k}: ${v}`).join('; ')}.`, [`${q('Snapshot')}: ${q(SN.rbqm.details.versions.Snapshot)}.`], `A second study, PILOT-PROTOCOL, on the snapshot chosen on its Overview tab, ${q(SN.chosen.option)}. The chip then read ${q(SN.chosen.snap)}, and Run details names the snapshot R was given by its date.`)}
  ${ul([
    `The build said its steps as R took them: ${BU.steps.map(q).join(', ')}.`,
    `After ${key('Load into the demo')} the chip read ${q(BU.loaded.chip)}, with ${q(BU.loaded.snap)} under it, and its card read ${q('Made by')} ${q(BU.loaded.card.facts['Made by'])}.`,
    `Times are from one run on one machine. A protocol in the form, and the other order of starting R, are on the ${a(`${SV_PAGE}#build`, 'safety.viz v1.13.0 demo page')}.`
  ])}
  ${steps([
    [`Press the chip, ${key(SA.here.menu.foot[0])}, then ${key('Describe a study')}. Keep the numbers small and press ${key('Build the study')}.`, 'Allow about a minute the first time, while R starts.'],
    [`Press ${key('Load into the demo')}, open the ${key('RBQM')} tab and press ${key('Start R')}.`, 'The site overview appears in seconds.']
  ])}
</section>

<div class="cut"><span>07 <em>/ how it is held</em></span></div>
<section id="held">
  <div class="hd"><h2>How the copy is held to its source</h2></div>
  <p class="what">study.viz began as a copy. A copy can drift without anyone noticing, so the repository keeps a record of what was copied and checks it on every change. The capture read the records from the repository at commit ${esc(short(HE.commit))} and tested two of them itself.</p>
  <table class="reads">
    <thead><tr><th>What</th><th>How it is held</th><th>Checked by this page</th></tr></thead>
    <tbody>
      <tr><td>The app's source, its tests and what they read</td><td data-h="Held">${n(HE.app.files)} files copied from safety.viz at commit ${a(`${SV}/commit/${HE.app.commit}`, esc(short(HE.app.commit)))}. The record, <code>SOURCE.json</code>, lists each with its checksum and size. ${n(HE.app.changedFiles)} of the files differ from safety.viz's: the record lists ${n(HE.app.changes)} changes in them, each with its reason, such as the name. <code>npm run copied:check</code> fails when a file and the record disagree.</td><td data-h="Checked">All ${n(HE.app.withChecksum)} entries carry a checksum, and every change its reason. ${n(HE.app.sample.length)} of the files were fetched and their checksums worked out again: ${HE.app.sample.every((s) => s.match) ? 'all matched' : 'not all matched'}. In a clone at ${esc(short(HE.commit))}, the command printed: ${q(`SOURCE.json: ${n(HE.app.files)} files match their recorded checksums (copied from jwildfire/safety.viz at ${HE.app.commit.slice(0, 7)}, ${n(HE.app.changedFiles)} of them changed by the ${n(HE.app.changes)} changes the record lists)`)}.</td></tr>
      <tr><td>The charts</td><td data-h="Held">No chart's source is in study.viz. The charts are ${esc(BUNDLE_NAMED)}: the built file <code>${esc(B.source)}</code>, copied from the same safety.viz commit as the app's files. <code>npm run safety-viz:check</code> holds the copy to its record.</td><td data-h="Checked">The copy and safety.viz's own file were both fetched. They are the same ${n(B.copyBytes)} bytes, with the checksum the record names (it begins ${esc(B.copy.slice(0, 12))}).</td></tr>
      <tr><td>The pictures and records left out</td><td data-h="Held">${n(HE.app.left)} files are listed as left out of the record, each with its reason. Among them are the stored pictures, which show the app's name, so study.viz draws its own.</td><td data-h="Checked">Counted in the record. ${n(HE.tests.pictures)} pictures are stored in the repository.</td></tr>
      <tr><td>study.builder</td><td data-h="Held">The copy is its ${esc(HE.builder.tag)} release, ${n(HE.builder.files)} files with a record of their own.</td><td data-h="Checked">Read from the record. Not compared with study.builder's release.</td></tr>
      <tr><td>The tests</td><td data-h="Held">One check, ${q('Build, format, and test')}, runs on every pull request and every change to dev. It runs the unit tests and the browser tests, and on its Linux runner each stored picture is compared with a fresh one. On commit ${esc(short(TR.commit))} it ran ${n(TR.unitTests)} unit tests and ${n(TR.browserTests)} browser tests, and all passed${cite(TR.url, 'the run')}.</td><td data-h="Checked">Not run here. The run's commit and its result were read; the counts are from the run's own log.</td></tr>
    </tbody>
  </table>
  ${ul([
    `One safety.viz commit is named: ${esc(short(HE.app.commit))}. The app's files and the chart bundle both name it, and the bundle there is byte for byte the copy.`,
    'The record is the proof of the copy, not a lock on the app. The repository says it will be retired once safety.viz no longer carries the app.',
    `What each release holds, and the commands above, are in study.viz's ${a(doc('NEWS.md'), 'NEWS')}, ${a(doc('README.md'), 'README')} and ${a(doc('CONTRIBUTING.md'), 'CONTRIBUTING')}.`
  ])}
</section>

<div class="cut"><span>08 <em>/ limits</em></span></div>
<section id="found">
  <div class="hd"><h2>Limits</h2></div>
  <div class="note found">
    <div class="lbl">Known, and not fixed</div>
    <ul>
      <li>The app's words about starting R stay after R is running${cite(stvIssue(19), 'study.viz #19')}. Captured: after the build had started R, the RBQM tab still read ${q((BU.rbqm.before.words[1] || BU.rbqm.before.words[0] || '').replace(/START R/g, 'Start R'))}, and offered ${key('Start R')}. Pressing it made no request to R's own host.</li>
      <li>A reload reopens the pilot study${cite(stvIssue(20), 'study.viz #20')}. Captured: after a reload the chip read ${q(BU.reload.chip)}, though ${esc(BS.name)} was in use before.</li>
      <li>The app carries safety.viz's app at ${esc(short(HE.app.commit))} and study.builder ${esc(HE.builder.tag)}, with their known faults: mapping by hand${cite(svIssue(432), 'safety.viz #432')} and study.builder's own list${cite(`${SB}/issues/1`, 'study.builder #1')}. Not captured here.</li>
    </ul>
  </div>
  <div class="note found">
    <div class="lbl">The statistics</div>
    <ul>
      <li>The charts' JavaScript statistics are safety.viz's, unchanged. A ruling on each is awaited${cite(svIssue(259), 'safety.viz #259')}.</li>
      <li>This page checks no statistic. It shows what the app does, not that a number is right.</li>
    </ul>
  </div>
  <div class="note found">
    <div class="lbl">Found by a reviewer, and disclosed here</div>
    <ul>
      <li>The status panel's line under Qualified reads ${q(regulated)} The words come from the chart bundle, so they name safety.viz, not study.viz (section 1).</li>
      <li>The RBQM study is synthetic, and its description in the app does not say so. It is marked ${q('Demo')} like the studies built from public data${cite(svIssue(434), 'safety.viz #434')}.</li>
      <li>The file <code>docs/DATA_SOURCES.md</code> in study.viz is safety.viz's, copied, and is still written for safety.viz${cite(stvIssue(28), 'study.viz #28')}.</li>
    </ul>
  </div>
  <div class="note">
    <div class="lbl">Not checked on this page</div>
    <ul>
      <li>The tests. They run in the repository's own check. This page ran none of them; the counts are from the check's own run, linked in section 7.</li>
      <li>The other places the app names itself: its console warnings, and the single file that opens from disk with no network. The repository's CONTRIBUTING lists them.</li>
      <li>study.builder's own download buttons, and what a saved file holds. Only the names of the app's own two downloads were read.</li>
      <li>Running it on your own machine with <code>npm run demo</code>.</li>
      <li>Files of your own, building from a protocol, a phone, any window narrower than 1,280 pixels, and any browser but Chromium.</li>
      <li>Whether a result is right. This page shows that the app is the same app under its own name, not that a chart or a simulated study is correct.</li>
    </ul>
  </div>
</section>

<div class="cut"><span>09 <em>/ where to check it</em></span></div>
<section>
  <div class="close">
    <div>
      <h3>The release</h3>
      <ul>
        <li>The ${a(doc('NEWS.md'), 'release notes')}, section v0.1.0.</li>
        <li>The app, until the release: ${a(DEV_APP, 'the dev site')}. After it: ${a(RELEASED_APP, 'the released app')}.</li>
        <li>The repository: ${a(STV, 'jwildfire/study.viz')}.</li>
        <li>The requirement it answers${cite(`${HUB}/issues/440`, 'roadmap #440')}; the study view in sections${cite(stvIssue(16), 'study.viz #16')}; the copy moved to safety.viz ${esc(short(HE.app.commit))} and study.builder ${esc(HE.builder.tag)}${cite(stvIssue(32), 'study.viz #32')}.</li>
      </ul>
    </div>
    <div>
      <h3>Beside it</h3>
      <ul>
        <li>${a(SV_PAGE, 'The safety.viz v1.13.0 demo page')}: what the app does, in detail.</li>
        <li>${a(SV, 'safety.viz')}: the charts, their gallery and their docs.</li>
        <li>${a(SB, 'study.builder')}: the builder and the study view.</li>
      </ul>
    </div>
  </div>
</section>

<footer>
  <p>Data: the Pilot study and the Renamed columns study are the public, de-identified CDISC Pilot 01 study (pharmaverseadam); the Pilot study's labs carry 110 synthetic liver and kidney participants. The Liver cohort is synthetic. The RBQM study is synthetic too, from jwildfire/demo-301, though the app does not say so. PILOT-PROTOCOL, READY-P1, READY-P2 and ${esc(BS.name)} are made by ${esc(madeBy)}, which study.builder carries: every row is made up. No real participant appears on this page.</p>
  <p>PILOT-PROTOCOL follows one of CDISC's example protocols, and stills of it show that protocol's name, visits and activities. The app's attribution, in full: ${esc(credit)}</p>
  <p>Captured with Playwright, headless Chromium, from ${c.site.app ? a(c.site.app, OF) : OF}, and compared with ${a(SA.compare, 'the safety.viz demo')}. Two parts of the capture start real R in the browser. One part stops one ready-made study's file on its way to the page, to read what the app says. The records in section 7 were read from the public repository with no sign-in. Every label, count, checksum and time quoted was read by the script, and ${held} checks held them. How it was made, and how to take the stills again: ${a(HERE, 'this page’s folder')}.</p>
  <hr>
  <p>This page was drafted by Claude Code using Fable 5.2.</p>
</footer>

</div>
</body></html>
`;
if (/<script/i.test(html)) throw new Error('the page must carry no script');
if (/127\.0\.0\.1|localhost|\/Users\//.test(html)) throw new Error('the page must carry no local address or path');
fs.writeFileSync(path.join(dir, 'index.html'), html);
console.log(`Wrote index.html: ${held} checks held, ${Object.keys(c.stills).length} stills, description ${DESCRIPTION.length} characters${RELEASED_ON ? `, released ${RELEASED_ON}` : ', release candidate'}${SV_RELEASED_ON ? `, safety.viz v${B.version} released ${SV_RELEASED_ON}` : ''}.`);
