// Writes index.html for the safety.viz v1.12.0 demo page from capture.json,
// which capture.cjs wrote. Every title, count, column name and tooltip line read
// from the charts comes from capture.json; none is typed here by hand.
//
//   node build.cjs [dir]        default: the folder this file is in
//
// It stops when a check in capture.json did not hold, or when a still is missing.
const fs = require('node:fs');
const path = require('node:path');

const dir = process.argv[2] || __dirname;
const c = JSON.parse(fs.readFileSync(path.join(dir, 'capture.json'), 'utf8'));
const failed = Object.entries(c.checks).filter(([, v]) => !v.pass);
if (failed.length) throw new Error(`capture.json has checks that did not hold: ${failed.map(([n]) => n).join('; ')}`);
const held = Object.keys(c.checks).length;

const stills = [];
(function walk(o) {
  if (o && typeof o === 'object') {
    if (o.file && o.markers) stills.push(o.file);
    Object.values(o).forEach(walk);
  }
})(c);
for (const f of stills) if (!fs.existsSync(path.join(dir, 'media', f))) throw new Error(`missing still: ${f}`);

// ---------------------------------------------------------------- addresses
const SV = 'https://github.com/jwildfire/safety.viz';
const HUB = 'https://github.com/jwildfire/obot.roadmap';
const RELEASED = c.site.after_is === 'the released site';
const SITE = RELEASED ? 'https://jwildfire.github.io/safety.viz/' : 'https://jwildfire.github.io/safety.viz/dev/';
const PAGES = 'https://jwildfire.github.io/obot.roadmap/';
const HERE_URL = `${PAGES}reports/sv-v1.12.0-demo/`;
const HERE = `${HUB}/tree/main/reports/sv-v1.12.0-demo`;
const DESIGN = `${PAGES}requirements/design/436_design.html`;
const iss = (n) => `${SV}/issues/${n}`;
const pr = (n) => `${SV}/pull/${n}`;
const hub = (n) => `${HUB}/issues/${n}`;
const NEWS = `${SV}/blob/dev/NEWS.md`;
const harnessUrl = (bundle, kase) => `${HERE_URL}harness.html?bundle=${bundle}&case=${kase}`;

// ---------------------------------------------------------------- words
const esc = (t) => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const q = (t) => `“${esc(t)}”`;
const a = (href, text) => `<a href="${href}">${text}</a>`;
const cite = (href, text) => ` (${a(href, text)})`;
const n = (v) => Number(v).toLocaleString('en-US');
const date = new Date(c.site.captured).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'America/New_York' });
const commit = c.site.commit ? c.site.commit.slice(0, 8) : 'unknown';
const last = (l) => l[l.length - 1];
const NOW = RELEASED ? 'release 1.12.0' : c.site.after_is === 'the dev site' ? 'release 1.12.0 (dev site)' : 'release 1.12.0 (release candidate)';
const THEN = 'release 1.11.3';

/** A still with its numbered markers. */
function shot(st, alt) {
  const marks = st.markers.map((m, i) => `<span class="mk" style="left:${m.left}%;top:${m.top}%" aria-hidden="true">${i + 1}</span>`).join('');
  return `<a class="frame" href="media/${st.file}"><img src="media/${st.file}" width="${st.width}" height="${st.height}" alt="${esc(alt)}" loading="lazy">${marks}</a>`;
}
const legendList = (st, legend) => {
  if (st.markers.length !== legend.length) throw new Error(`${st.file}: ${st.markers.length} markers, ${legend.length} legend lines`);
  return legend.length ? `<ol class="legend">${legend.map((l) => `<li>${l}</li>`).join('')}</ol>` : '';
};

/** Before and after, side by side; stacked on a phone. Legend for the after markers. */
function pair(before, after, legend, caption, labels = {}) {
  return `<div class="pair">
  <figure><div class="lbl">${esc(labels.before || `Before · ${THEN}`)}</div>${shot(before.still, before.alt)}${legendList(before.still, [])}</figure>
  <figure><div class="lbl now">${esc(labels.after || `After · ${NOW}`)}</div>${shot(after.still, after.alt)}${legendList(after.still, legend)}</figure>
</div>
<p class="cap">${caption}</p>`;
}

/** One still on its own. */
function solo(st, label, alt, legend, caption) {
  return `<figure class="solo"><div class="lbl now">${esc(label)}</div>${shot(st, alt)}${legendList(st, legend)}</figure>
<p class="cap">${caption}</p>`;
}

const ul = (items, cls = 'list') => `<ul class="${cls}">${items.map((i) => `<li>${i}</li>`).join('')}</ul>`;
const steps = (items) => `<div class="note try"><div class="lbl">Try it</div><ol class="steps">${items.map(([d, s]) => `<li><span class="do">${d}</span><span class="see">${s}</span></li>`).join('')}</ol></div>`;
const key = (t) => `<span class="key">${esc(t)}</span>`;

// ---------------------------------------------------------------- what was read
const P = c.profile;
const PID = c.participant;
const R = c.rail;
const O = c.outlier;
const QT = c.qt;
const H = c.hep;
const NT = c.notime;
const ND = c.noday;
const AP = c.app;
const DF = c.defaults;
const SH = c.shift;
const DD = c.delta;
const hollow = c.hollow;
const timeCol = O.after.day.listing.headers.indexOf('Time');
const oeTimes = O.after.day.listing.rows.map((r) => r[timeCol]);
const oeTip = O.after.day.tip.lines.find((l) => / · Day /.test(l));
const ddDay = DD.after.lines.find((l) => /^Study day:/.test(l));
const ddVisit = DD.after.lines.find((l) => /^Visit:/.test(l));
const shDay = SH.after.listing.headers.indexOf('Study day');
const shVisit = SH.after.listing.headers.indexOf('Visit');
const ndTipNE = ND.after.tip.lines.find((l) => /Timing not evaluated/.test(l));
const ndTipNA = ND.after.tip.lines.filter((l) => /@ day NA/.test(l));
const stepEnds = H.after.visit.slider.ends;

const css = fs.readFileSync(path.join(dir, 'page.css'), 'utf8');

const DESCRIPTION = 'What safety.viz v1.12.0 changes, before and after: a Visit or Study day switch on the participant profile, its side panels, the outlier explorer and the QT drill-down, real study days in the demo data, and hep-explorer timing in days.';
if (DESCRIPTION.length < 40 || DESCRIPTION.length > 260) throw new Error(`description is ${DESCRIPTION.length} characters`);

const html = `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>safety.viz v1.12.0 — annotated demo</title>
<meta name="description" content="${esc(DESCRIPTION)}">
<style>
${css}
</style>
</head><body>
<div class="wrap">

<header class="mast">
  <div class="eyebrow"><span>safety.viz</span><span class="dot"></span><span>${RELEASED ? 'Released' : 'Release candidate'}</span><span class="dot"></span><span>Annotated demo</span></div>
  <h1>safety.viz <span class="v">v1.12.0</span>: Visit or Study day</h1>
  <p class="lede">Every chart that shows change over time can now be read by visit or by study day, with one switch that works the same way everywhere. The demo data now carries real study days, and hep-explorer's 30-day timing test is measured in days.</p>
  <div class="facts"><span>Captured ${esc(date)}</span><span>after: ${esc(c.site.after_is)}, ${esc(c.site.branch)} at ${esc(commit)}</span><span>before: ${esc(THEN)}, the released site</span><span>${held} of ${held} checks held</span></div>
</header>

<div class="note">
  <div class="lbl">In short</div>
  <ul>
    <li>Before this release, several charts drew a time axis titled "Study Day" over numbers that were not study days: visit numbers in the side panels, the QT drill-down and hep-explorer's slider, and a day worked out from the visit name on the participant profile page.</li>
    <li>Now each of those charts has an X-axis control, Visit or Study day. The axis title always names what is plotted, and tooltips name both.</li>
    <li>A chart with neither a visit nor a study day says so instead of drawing.</li>
    <li>hep-explorer's slider steps by visit or by study day, and its 30-day timing test always uses study days. On the demo data that draws ${n(hollow.hollow)} of ${n(hollow.of)} participants hollow; release 1.11.3 drew none.</li>
    <li>The change was raised by a member of the working group, from a review of the Safety Histogram.</li>
  </ul>
</div>

<div class="cut"><span>01 <em>/ the participant profile</em></span></div>
<section>
  <div class="hd"><h2>The profile has an X-axis control: Visit or Study day</h2></div>
  <p class="what">The gallery's participant profile page, participant ${esc(PID)}. It opens on Visit.</p>
  ${pair(
    { still: P.before.first.still, alt: `The participant profile for ${PID} in release 1.11.3: one time axis titled ${P.before.first.chart.title}, running from ${P.before.first.chart.xs[0]} to ${last(P.before.first.chart.xs)}, with no X-axis control.` },
    { still: P.after.first.still, alt: `The same profile in release 1.12.0 in Visit view: the X-axis control with Visit pressed, one evenly spaced tick per visit from ${P.after.first.chart.ticks[0]} to ${last(P.after.first.chart.ticks)}, and the adverse events listed under the chart.` },
    [
      `The X-axis control: ${P.after.first.controls[0].options.map((o) => esc(o.title)).join(' | ')}.`,
      `Visit view: the visits evenly spaced, each tick a visit name (${esc(P.after.first.chart.ticks.slice(0, 3).join(', '))} … ${esc(last(P.after.first.chart.ticks))}).`,
      'The adverse events are listed, with their study days, not drawn: a visit axis has no days to draw them on.'
    ],
    `Before: the axis was titled ${q(P.before.first.chart.title)}, but on this page it plotted a day worked out from the visit name (Baseline day 1, Week N day 7N + 1), so the last ALT sat at ${last(P.before.first.chart.xs)}. The real study day is ${last(P.after.day.chart.xs)}.`
  )}
  ${solo(P.after.day.still, `After · Study day view`, `The same profile in Study day view: the axis titled Study day from ${P.after.day.chart.xs[0]} to ${last(P.after.day.chart.xs)}, a dotted line at day 1, the Week 8 point's tooltip reading ${P.after.day.tip.title[0]}, and the adverse-event track under the chart.`,
    [
      'A dotted line marks day 1, the first dose. Records before it have negative days.',
      `The tooltip names both: ${q(P.after.day.tip.title[0])}.`,
      'The adverse-event track shows only in this view, on the same day axis as the labs.'
    ],
    `The last ALT now sits at study day ${last(P.after.day.chart.xs)}, Week 26. The adverse events listed in Visit view: ${P.after.first.ae.listed.map(esc).join('; ')}.`)}
  ${steps([
    [`Open the ${a(`${SITE}participant-profile/`, 'participant profile demo')} and click a point in the chart at the top.`, 'The profile below opens on Visit, with the X-axis control in its controls.'],
    [`Press ${key('Study day')}.`, 'The axis turns into days, a line marks day 1, and the adverse-event track appears.'],
    ['Point at a dot on the ALT line.', `The tooltip reads like ${q(P.after.day.tip.title[0])}.`]
  ])}
</section>

<div class="cut"><span>02 <em>/ the side panel</em></span></div>
<section>
  <div class="hd"><h2>The profile as a side panel has its own toggle</h2></div>
  <p class="what">Selecting a participant in a host chart opens the profile beside it. It opens on the host's view, or on Visit where the host has no toggle, and keeps its own choice after that.</p>
  ${pair(
    { still: R.before.first.still, alt: `The histogram's side panel for ${PID} in release 1.11.3: the axis titled ${R.before.first.chart.title}, running 0 to ${last(R.before.first.chart.xs)}.` },
    { still: R.after.first.still, alt: `The same side panel in release 1.12.0: the X-axis control with Visit pressed, and visit names on the axis.` },
    ['The side panel\'s own X-axis control, opening on Visit.'],
    `The histogram, participant ${esc(PID)}. Before, the panel plotted the visit number under the title ${q(R.before.first.chart.title)}: the last ALT at ${last(R.before.first.chart.xs)}. In Study day view it now sits at day ${last(R.after.day.chart.xs)}.`
  )}
  ${ul([
    `In the outlier explorer, set to Study day, the panel opened on ${O.after.independent.railOpenedOn[0] === 'day' ? 'Study day' : 'Visit'}. Switching the panel to Visit left the main chart on ${esc(O.after.independent.mainAfterRailSwitch)}.`,
    `The same toggle is in the side panel of the histogram, outlier explorer, shift plot, delta-delta, hep-explorer and QT explorer. The AE explorer and AE timelines panels have none: see "Decided in the build".`
  ])}
  ${steps([
    [`Open the ${a(`${SITE}histogram/`, 'histogram demo')}, set Participant ID to ${key(PID)} and click a bar, then a row of the listing.`, 'The side panel opens on Visit, with its own X-axis control.'],
    [`Press ${key('Study day')} in the panel.`, `The panel's axis turns into days; the histogram does not change.`]
  ])}
</section>

<div class="cut"><span>03 <em>/ the outlier explorer</em></span></div>
<section>
  <div class="hd"><h2>The outlier explorer plots by visit or by study day</h2></div>
  <p class="what">Release 1.11.3 plotted each participant's results in the order they came, under the title "Measurement". The main axis now takes the same X-axis control, opening on Visit.</p>
  ${pair(
    { still: O.before.first.still, alt: `The outlier explorer in release 1.11.3: ALT for every participant over an axis titled ${O.before.first.chart.title}, numbered 1, 2, 3 and so on.` },
    { still: O.after.first.still, alt: `The outlier explorer in release 1.12.0: the X-axis control with Visit pressed, and one evenly spaced tick per visit, unscheduled visits included.` },
    ['The X-axis control, in the controls on the left.', `The axis title: ${q(O.after.first.chart.title)}, with ${n(O.after.first.chart.ticks.length)} visits, unscheduled ones after the visit they follow.`],
    'Alanine Aminotransferase, every participant.'
  )}
  <div class="pair">
    <figure><div class="lbl now">Study day view, ${esc(PID)} selected</div>${shot(O.after.day.still, `The outlier explorer in Study day view with participant ${PID} selected; a point's tooltip reads ${oeTip}.`)}${legendList(O.after.day.still, [`The tooltip names both: ${q(oeTip)}.`])}</figure>
    <figure><div class="lbl now">The listing</div>${shot(O.after.day.listing.still, `The listing for participant ${PID}: a Time column reading ${oeTimes.slice(0, 2).join(', ')} and so on.`)}${legendList(O.after.day.listing.still, [`The ${q('Time')} column names both: ${oeTimes.slice(0, 3).map(q).join(', ')} …`])}</figure>
  </div>
  <p class="cap">The listing's ${n(oeTimes.length)} records for ${esc(PID)} each name a visit and a study day, whichever view is on.</p>
  ${steps([
    [`Open the ${a(`${SITE}outlier-explorer/`, 'outlier explorer demo')}.`, 'The axis is titled Visit.'],
    [`Press ${key('Study day')}, then click a line.`, 'The axis is in days; the listing below names the visit and the day of each record.']
  ])}
</section>

<div class="cut"><span>04 <em>/ the QT drill-down</em></span></div>
<section>
  <div class="hd"><h2>The QT drill-down by visit or by study day</h2></div>
  <p class="what">Selecting a participant in the QT explorer opens their ECGs in the side panel. Release 1.11.3 passed the visit number there as the study day.</p>
  ${pair(
    { still: QT.before.first.still, alt: `The QT drill-down for ${PID} in release 1.11.3: an axis titled ${QT.before.first.chart.title} running 0 to ${last(QT.before.first.chart.xs)}.` },
    { still: QT.after.first.still, alt: 'The QT drill-down in release 1.12.0, Visit view: the X-axis control and visit names on the axis.' },
    ['The X-axis control, opening on Visit.'],
    `Before: ${q(QT.before.first.chart.title)} over the visit numbers ${esc(QT.before.first.chart.xs.join(', '))}. After, in Study day view, the same ECGs fall on days ${esc(QT.after.day.chart.xs.join(', '))}.`
  )}
  ${solo(QT.after.day.still, 'After · Study day view', `The QT drill-down in Study day view, the last ECG at day ${last(QT.after.day.chart.xs)}.`, [], `On the demo's ECG data no participant has two visits on one study day, so the two views differ here only in spacing. The design's case of several ECGs on one day, apart by visit and stacked by day, is not in this data.`)}
  ${steps([
    [`Open the ${a(`${SITE}qt-explorer/`, 'QT explorer demo')} and click a point.`, 'The side panel opens on Visit.'],
    [`Press ${key('Study day')} in the panel.`, 'The ECGs move to their study days.']
  ])}
</section>

<div class="cut"><span>05 <em>/ hep-explorer</em></span></div>
<section>
  <div class="hd"><h2>hep-explorer: step by visit or by study day, and timing in days</h2></div>
  <p class="what">The eDISH scatter. The slider under it now steps by visit or by study day, chosen with a control labelled "Step by". The 30-day timing test always measures study days.</p>
  ${pair(
    { still: H.before.scatter.still, alt: `hep-explorer's scatter in release 1.11.3: every point filled, and a slider from ${H.before.scatter.slider.min} to ${H.before.scatter.slider.max}.` },
    { still: H.after.scatter.still, alt: `hep-explorer's scatter in release 1.12.0: ${hollow.hollow} of ${hollow.of} points hollow, the slider in study days, and the Step by control with Study day pressed.` },
    ['A hollow point: this participant\'s peak ALT and peak bilirubin are more than 30 days apart.', 'The footnote says what filled means.', 'The Step by control: Visit | Study day, opening on Study day.'],
    `On the demo data ${n(hollow.hollow)} of ${n(hollow.of)} participants are hollow, read from the points as drawn. Before: ${n(H.before.scatter.hollow)} of ${n(H.before.scatter.points)}, because the test measured visit numbers, which are never 30 apart. The old slider ran from ${esc(H.before.scatter.slider.min)} to ${esc(H.before.scatter.slider.max)}, visit numbers, under the name "${esc(H.before.scatter.slider.label)}".`
  )}
  ${solo(H.after.visit.still, 'After · Step by Visit', `The playback bar stepping by visit, from ${stepEnds[0]} to ${last(stepEnds)}.`, [], `Step by Visit: the slider runs from ${esc(stepEnds[0])} to ${esc(last(stepEnds))}. By study day it runs from day ${esc(H.after.scatter.slider.min)} to day ${esc(H.after.scatter.slider.max)}.`)}
  ${steps([
    [`Open the ${a(`${SITE}hep-explorer/`, 'hep-explorer demo')} and choose ${key('eDISH / mDISH scatter')}.`, 'Some points are hollow; the footnote says why.'],
    [`Under the chart, press ${key('Visit')} beside "Step by", then play.`, 'The points step through the visits by name.']
  ])}
</section>

<div class="cut"><span>06 <em>/ no time axis</em></span></div>
<section>
  <div class="hd"><h2>With neither a visit nor a study day, a message</h2></div>
  <p class="what">The gallery's data has both, so this is shown in a small harness page: the gallery's own demo data with its visit and study-day columns taken out, loaded into the dev site's bundle and into release 1.11.3's.</p>
  ${pair(
    { still: NT.before.outlier.still, alt: `The outlier explorer in release 1.11.3 on data with no visit and no study day: lines drawn over an axis titled ${NT.before.outlier.chart.title}.` },
    { still: NT.after.outlier.still, alt: `The outlier explorer in release 1.12.0 on the same data: in place of the chart, the message ${NT.after.outlier.message}` },
    [`In place of the chart: ${q(NT.after.outlier.message)}`],
    `The outlier explorer. The participant profile shows the same message (read, not shown). Before, the profile drew an empty axis titled ${q(NT.before.profile.chart.title)}. Open the harness: ${a(harnessUrl('dev', 'neither'), 'release 1.12.0')}, ${a(harnessUrl('released', 'neither'), 'release 1.11.3')}.`,
    { before: `Before · ${THEN}, harness`, after: `After · ${NOW}, harness` }
  )}
</section>

<div class="cut"><span>07 <em>/ hep-explorer, no study day</em></span></div>
<section>
  <div class="hd"><h2>hep-explorer with no study day: crosses, and a footnote</h2></div>
  <p class="what">With visits but no study day, the timing test cannot be run. Every point is drawn as a cross, neither filled nor hollow, and the chart says why. Shown in the harness: the gallery's demo data with its study-day column taken out.</p>
  ${pair(
    { still: ND.before.scatter.still, alt: `hep-explorer in release 1.11.3 on data with no study day: all ${ND.before.scatter.points} points filled.` },
    { still: ND.after.scatter.still, alt: `hep-explorer in release 1.12.0 on the same data: every point a cross, a tooltip reading ${ndTipNE}, the footnote saying timing was not evaluated, and Study day greyed beside Step by.` },
    [`A point's tooltip: ${q(ndTipNE)}.`, `The footnote: ${q(ND.after.scatter.footnote.replace(/^Use controls[^.]*\. /, ''))}`, `Step by: Study day greyed, titled ${q(ND.after.scatter.controls[0].options.find((o) => o.key === 'day').reason)}.`],
    `All ${n(ND.after.scatter.crosses)} points are crosses, and the timing-window input (${esc(ND.after.scatter.windowInput.label)}) is disabled. Before, release 1.11.3 drew all ${n(ND.before.scatter.withinWindow)} filled, as if each had passed a test it never ran. Open the harness: ${a(harnessUrl('dev', 'noday'), 'release 1.12.0')}, ${a(harnessUrl('released', 'noday'), 'release 1.11.3')}.`,
    { before: `Before · ${THEN}, harness`, after: `After · ${NOW}, harness` }
  )}
</section>

<div class="cut"><span>08 <em>/ the demo app</em></span></div>
<section>
  <div class="hd"><h2>The demo app passes the toggle and remembers the view</h2></div>
  <p class="what">The demo app's charts are given the same X-axis setting, built from the columns mapped on the Data tab. Each chart remembers the view you last chose while the page is open; a new page opens on each chart's own default.</p>
  ${pair(
    { still: AP.before.first.still, alt: `The demo app's outlier explorer in release 1.11.3: no X-axis control, an axis titled ${AP.before.first.chart.title}.` },
    { still: AP.after.back.still, alt: 'The demo app\'s outlier explorer in release 1.12.0, after Study day was chosen, the Histogram opened, and the Outlier Explorer opened again: Study day is still pressed.' },
    ['Study day, still chosen after leaving the chart and coming back.'],
    `The Outlier Explorer opens on ${esc(AP.after.first.chart.title)}. The capture pressed Study day, opened the Histogram, and came back: the chart was still on ${esc(AP.after.back.chart.title)}. Clicking a participant then opened the side panel on ${esc(AP.after.rail.chart.title)}, with its own toggle.`
  )}
  ${steps([
    [`Open the ${a(`${SITE}demo/`, 'demo app')}, choose Outlier Explorer and press ${key('Study day')}.`, 'The axis is in days.'],
    ['Choose Histogram, then Outlier Explorer again.', 'Study day is still chosen. Reload the page, and it opens on Visit.']
  ])}
</section>

<div class="cut"><span>09 <em>/ changed defaults</em></span></div>
<section>
  <div class="hd"><h2>Four charts read the study day from DY by default</h2></div>
  <p class="what">The histogram, outlier explorer, shift plot and delta-delta now look for the study day in a column called DY when they are not told otherwise. A page that names its own study-day column is unaffected; a page whose data has a DY column it did not mean as a study day should set it to none. The release notes say so.</p>
  <table class="reads">
    <thead><tr><th>What</th><th>${esc(THEN)}</th><th>${esc(NOW)}</th></tr></thead>
    <tbody>
      <tr><td>Study-day column, given no setting</td><td data-h="Before">${Object.entries(DF.before.studyday_col).map(([k, v]) => `${esc(k)}: ${v == null ? 'none' : esc(v)}`).join(', ')}</td><td data-h="After">${Object.entries(DF.after.studyday_col).map(([k, v]) => `${esc(k)}: ${esc(v)}`).join(', ')}</td></tr>
      <tr><td>An outlier explorer given no time setting plots by</td><td data-h="Before">${q(DF.before.outlier.title)}, a sequence</td><td data-h="After">${q(DF.after.outlier.title)}</td></tr>
      <tr><td>Shift-plot listing columns</td><td data-h="Before">${SH.before.listing.headers.map(esc).join(', ')}</td><td data-h="After">${SH.after.listing.headers.map(esc).join(', ')}</td></tr>
      <tr><td>Delta-delta tooltip, participant ${esc(PID)}</td><td data-h="Before">${DD.before.lines.map(esc).join('<br>')}</td><td data-h="After">${DD.after.lines.map(esc).join('<br>')}</td></tr>
    </tbody>
  </table>
  <p class="cap">The first two rows were read in the harness, each chart mounted with no settings beyond its measures ${a(harnessUrl('dev', 'defaults'), 'release 1.12.0')}, ${a(harnessUrl('released', 'defaults'), 'release 1.11.3')}. The last two were read on the gallery pages.</p>
  ${pair(
    { still: SH.before.listing.still, alt: `The shift-plot listing for ${PID} in release 1.11.3, with no Study day column.` },
    { still: SH.after.listing.still, alt: `The shift-plot listing in release 1.12.0, with Visit reading ${SH.after.listing.rows[0][shVisit]} and Study day reading ${SH.after.listing.rows[0][shDay]}.` },
    [`Study day: ${q(SH.after.listing.rows[0][shDay])}, beside Visit: ${q(SH.after.listing.rows[0][shVisit])}.`],
    `The shift plot, Baseline against Week 26, participant ${esc(PID)} selected. Delta-delta's tooltip now adds ${q(ddDay)} under ${q(ddVisit)}.`
  )}
</section>

<div class="cut"><span>10 <em>/ decided in the build</em></span></div>
<section>
  <div class="note decided">
    <div class="lbl">Two calls made while building, for the reviewer</div>
    <ul>
      <li>The AE explorer and AE timelines side panels have no X-axis toggle. They show adverse events only, which are drawn in days, so they open on Study day. A Visit option there would have nothing to draw. The requirement's definition of done asked for an X-axis control in all eight hosts; six have one.${cite(pr(379), 'safety.viz pull request #379')}</li>
      <li>hep-explorer's control is labelled "Step by", not "X-axis": the scatter's own axes are ALT and bilirubin, and the control changes only what the slider steps through. Points whose timing was not evaluated are drawn as crosses, and the timing-window input is disabled.${cite(pr(381), 'safety.viz pull request #381')}</li>
    </ul>
  </div>
  <div class="note found">
    <div class="lbl">Noticed while capturing</div>
    <ul>
      <li>The data pull request says participant ${esc(PID)}'s last ALT on the profile demo moved from 13 to 180. On the gallery's participant profile page, release 1.11.3 put it at ${last(P.before.first.chart.xs)}, a day worked out from the visit name. The 13, a visit number, is what the side panels plotted.${cite(pr(378), 'safety.viz pull request #378')}</li>
      <li>With no study day, hep-explorer's tooltip still gives each peak "@ day NA" (${ndTipNA.map(q).join(', ')}), above the line saying timing was not evaluated.</li>
      <li>Switching the outlier explorer's main axis clears the selected participant and closes the side panel.</li>
      <li>Not captured here: the Visit and Study day columns added to the hep-explorer and hep-waterfall listings${cite(iss(377), 'safety.viz #377')}, and the gsm.safety widgets, which follow in their own release${cite(hub(438), 'hub #438')}.</li>
    </ul>
  </div>
</section>

<div class="cut"><span>11 <em>/ where to check it</em></span></div>
<section>
  <div class="close">
    <div>
      <h3>The requirements</h3>
      <ul>
        <li>The objective: firm up the tools for the ISG relaunch${cite(hub(429), 'hub #429')}.</li>
        <li>Both visit and study day in the demo data${cite(hub(435), 'hub #435')}.</li>
        <li>One x-axis toggle between Visit and Study day${cite(hub(436), 'hub #436')}.</li>
        <li>hep-explorer's slider and 30-day timing in study days${cite(hub(437), 'hub #437')}.</li>
        <li>The design, approved 11 November${cite(DESIGN, 'the x-axis toggle design')}.</li>
      </ul>
    </div>
    <div>
      <h3>The tasks and pull requests</h3>
      <ul>
        <li>Demo data: the visit, study day and baseline flag${cite(iss(365), '#365')}; the synthetic cohorts' days and one visit numbering${cite(iss(366), '#366')}; the baseline rule reads the flag${cite(iss(367), '#367')}. Pull request${cite(pr(378), '#378')}.</li>
        <li>The toggle: one setting and control${cite(iss(368), '#368')}; the profile${cite(iss(369), '#369')}; the side panels${cite(iss(370), '#370')}; the outlier explorer${cite(iss(371), '#371')}; the QT drill-down${cite(iss(372), '#372')}; the demo app${cite(iss(373), '#373')}; axis names on the charts without it${cite(iss(374), '#374')}. Pull request${cite(pr(379), '#379')}.</li>
        <li>hep-explorer: the slider${cite(iss(375), '#375')}; timing on study days only${cite(iss(376), '#376')}; both columns in the liver listings${cite(iss(377), '#377')}. Pull request${cite(pr(381), '#381')}.</li>
        <li>Release preparation${cite(iss(380), '#380')}, pull request${cite(pr(382), '#382')}; the ${a(NEWS, 'release notes')}; the release candidate${cite(pr(383), 'pull request #383')}.</li>
      </ul>
    </div>
  </div>
</section>

<footer>
  <p>Data: the gallery's demo data is the public, de-identified CDISC Pilot 01 study (pharmaverseadam), with synthetic groups added for liver and kidney injury.</p>
  <p>Captured with Playwright, headless Chromium: after from ${a(c.site.after, esc(c.site.after_is))}, before from ${a(c.site.before, 'the released site')}, ${esc(THEN)}. Sections 6, 7 and the first two rows of section 9 come from ${a(`${HERE_URL}harness.html`, 'a harness page')} beside this one, which loads each release's bundle from the safety.viz site and the gallery's data with columns taken out. The harness used ${a(NT.after.harness.src, esc(NT.after.harness.src.replace(/^https:\/\/jwildfire\.github\.io\//, '')))} and ${a(NT.before.harness.src, esc(NT.before.harness.src.replace(/^https:\/\/jwildfire\.github\.io\//, '')))}. Every title, count, column and tooltip line on this page was read from those pages, and ${held} checks held them. How it was made: ${a(HERE, 'this page’s folder')}.</p>
  <hr>
  <p>This page was drafted by Claude Code using Opus 5.5.</p>
</footer>

</div>
</body></html>
`;
if (/<script/i.test(html)) throw new Error('the page must carry no script');
fs.writeFileSync(path.join(dir, 'index.html'), html);
console.log(`Wrote index.html: ${held} checks held, ${stills.length} stills.`);
