// Writes index.html from capture.json and the option text below.
//   node build.cjs
// Stops if a still or a marker is missing.
const fs = require('node:fs');
const path = require('node:path');

const dir = __dirname;
const cap = JSON.parse(fs.readFileSync(path.join(dir, 'capture.json'), 'utf8'));
const css = fs.readFileSync(path.join(dir, 'page.css'), 'utf8');

const PR = 'https://github.com/jwildfire/safety.viz/pull/358';
const DEMO = '../sv-v1.11.3-demo/';
const SITE = 'https://jwildfire.github.io/safety.viz/dev/histogram/';

const OPTIONS = [
  {
    id: 'a',
    tab: 'A · Today',
    title: 'Today: the title beside every panel',
    say: '“Number of results”, turned on its side, beside the count axis of every panel. This is release candidate 1, as it stands.',
    marks: [['label', 'The axis title, repeated on all 29 panels of the overview and on every grouped panel.']],
    phone: [['label', 'On a phone the title takes about a tenth of the panel’s width.']],
    good: ['The axis is named the same way as on the single-measure chart.', 'Nothing to learn: the title says what the bars count.'],
    bad: [
      'The same words 29 times in a view that is for scanning shapes.',
      'Each panel loses width to the title, so the bars are narrower.'
    ]
  },
  {
    id: 'b',
    tab: 'B · # on top',
    title: 'A “#” at the top of the count axis',
    say: 'No title beside the axis. A small “#” sits above the top tick on every panel, where the unit of an axis often goes.',
    marks: [['label', 'The “#” over the tick column. Pointing at it says “Number of results in each bar”.']],
    phone: [['label', 'The same “#” on a phone. The bars get their width back.']],
    good: ['Still says “these are counts” on every panel, phone included.', 'Takes no width: the bars are as wide as in release 1.11.2.'],
    bad: ['“#” is shorthand. A reader meets the full words only in the hint line, the panel title’s “(1914 results)” and the single-measure chart.']
  },
  {
    id: 'c',
    tab: 'C · Hover only',
    title: 'Nothing on the axis; the count on hover',
    say: 'No title and no mark. Pointing at a bar shows its range of values and how many results fall in it.',
    marks: [['tip', 'Hovering a bar: “13–23 U/L”, then “878 results”. Today the overview shows no tooltip at all.']],
    phone: [],
    phoneNote: 'On a phone there is no hover: a tap opens the measure. The phone shows a bare count axis with nothing to say what it counts.',
    good: ['The cleanest panels of the five.', 'Exact counts and the bar’s range, which no option gives today.'],
    bad: [
      'Nothing at all on a phone or in a screenshot.',
      'The panels are buttons that open the measure, so the hover has to share the panel with the click.'
    ]
  },
  {
    id: 'd',
    tab: 'D · One line',
    title: 'One line above the grid',
    say: 'No title on the panels. The hint line above the grid, which today says only how to open a measure, also says what the bars count.',
    marks: [['label', '“Each bar counts results in its range of values. Click a chart to view that measure.”']],
    phone: [['label', 'The same line on a phone, above the first panel.']],
    good: ['Said once, in words, for the whole grid.', 'Panels as clean as option C.'],
    bad: [
      'Easy to read past, and it scrolls away: from the third row down nothing on screen says what the axis is.',
      'A panel copied or captured on its own carries no label.'
    ]
  },
  {
    id: 'e',
    tab: 'E · # and hover',
    title: 'Recommended: the “#” and the count on hover',
    rec: true,
    say: 'Option B and option C together: the “#” on every panel, and a bar’s range and count when you point at it.',
    marks: [
      ['label', 'The “#” over the tick column, on every panel.'],
      ['tip', 'Hovering a bar shows its range and its count.']
    ],
    phone: [['label', 'On a phone the “#” is what remains. A tap still opens the measure.']],
    good: [
      'Every panel says it shows counts, on a phone too, at almost no cost in width.',
      'The exact count is one point away on a desktop.'
    ],
    bad: ['The most work of the five, though still small: a few lines for the mark and a tooltip, with their tests.']
  }
];

const missing = [];
const marker = (file, key, n) => {
  const s = cap.stills[file];
  if (!s) missing.push(file);
  const m = s && s[key];
  if (!m || m.x == null) {
    missing.push(`${file}:${key}`);
    return '';
  }
  return `<span class="mk" style="left:${m.x}%;top:${m.y}%">${n}</span>`;
};
const still = (file, alt, marks) => {
  const s = cap.stills[file];
  if (!s || !fs.existsSync(path.join(dir, 'media', file))) missing.push(file);
  return `<div class="shot"><img src="media/${file}" width="${s ? s.width : ''}" height="${s ? s.height : ''}" alt="${alt}" loading="lazy">${marks}</div>`;
};
const esc = (t) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;');

const panes = OPTIONS.map((o) => {
  const deskMarks = o.marks.map(([k], i) => marker(`${o.id}-desk.jpg`, k, i + 1)).join('');
  const phoneMarks = o.phone.map(([k], i) => marker(`${o.id}-phone.jpg`, k, i + 1)).join('');
  const legend = (items) => `<ol class="legend">${items.map(([, t]) => `<li>${esc(t)}</li>`).join('')}</ol>`;
  return `
<div class="pane" id="pane-${o.id}">
  <div class="pane-head">
    <p class="lbl${o.rec ? ' rec' : ''}">Option ${o.id.toUpperCase()}${o.rec ? ' · recommended' : ''}</p>
    <h2>${esc(o.title)}</h2>
    <p class="say">${esc(o.say)}</p>
  </div>
  <div class="views">
    <figure class="desk">
      <p class="lbl">Desktop, 1280px wide · the first two rows</p>
      ${still(`${o.id}-desk.jpg`, `Option ${o.id.toUpperCase()} on the overview at desktop width`, deskMarks)}
      ${legend(o.marks)}
    </figure>
    <figure class="phone">
      <p class="lbl">Phone, 390px wide · the first panel</p>
      ${still(`${o.id}-phone.jpg`, `Option ${o.id.toUpperCase()} on the overview at phone width`, phoneMarks)}
      ${o.phone.length ? legend(o.phone) : `<p class="pnote">${esc(o.phoneNote)}</p>`}
    </figure>
  </div>
  <div class="pc">
    <div><p class="lbl">For it</p><ul>${o.good.map((t) => `<li>${esc(t)}</li>`).join('')}</ul></div>
    <div><p class="lbl">Against it</p><ul>${o.bad.map((t) => `<li>${esc(t)}</li>`).join('')}</ul></div>
  </div>
</div>`;
}).join('\n');

const radios = OPTIONS.map(
  (o) => `<input type="radio" name="opt" id="opt-${o.id}"${o.rec ? ' checked' : ''}>`
).join('');
const tabs = OPTIONS.map((o) => `<label for="opt-${o.id}" class="tab${o.rec ? ' rec' : ''}">${o.tab}</label>`).join('');
const switchCss = OPTIONS.map(
  (o) => `#opt-${o.id}:checked~.panes #pane-${o.id}{display:block}#opt-${o.id}:checked~.tabs label[for=opt-${o.id}]{background:var(--ink);color:var(--paper);border-color:var(--ink)}`
).join('\n');

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Overview count label · safety.viz options</title>
<meta name="description" content="Five ways to say what the bars count in the Safety Histogram's all-measures overview, each drawn on the live dev overview at desktop and phone width. Recommends a small # over each count axis plus the count on hover.">
<style>
${css}
${switchCss}
</style>
</head>
<body>
<div class="wrap">
<header class="mast">
  <p class="eyebrow">safety.viz <span class="dot"></span> Safety Histogram <span class="dot"></span> 8 November 2026 <span class="dot"></span> options</p>
  <h1>What the overview’s count axis should say</h1>
  <p class="lede">You don’t like “Number of results” turned on its side beside every panel of the all-measures overview. Here are five options, each drawn on the live dev overview, with the one I recommend open first.</p>
  <p class="facts"><span>Release candidate: <a href="${PR}">safety.viz v1.11.3-RC1</a></span><span>Before and after: <a href="${DEMO}">the v1.11.3 demo page</a></span><span>Live: <a href="${SITE}">the dev overview</a></span></p>
</header>

<div class="note ask">
  <p class="lbl">Recommendation</p>
  <p>Option E: a small “#” at the top of every panel’s count axis, and a bar’s range and count when you point at it. Every panel still says it shows counts, on a phone too, and the bars get their width back. The single-measure chart keeps its two full titles either way.</p>
  <h3>Your two calls</h3>
  <ol>
    <li>Which option. Recommended: E.</li>
    <li>Whether the grouped panels follow. They share the overview’s axis code and already show a count on hover. Recommended: yes, the same “#”, so the small multiples read alike.</li>
  </ol>
</div>

<section class="switch">
  ${radios}
  <div class="tabs" role="tablist" aria-label="Options">${tabs}</div>
  <div class="panes">${panes}
  </div>
</section>

<section>
  <h2>Side by side</h2>
  <div class="tbl"><table>
    <thead><tr><th></th><th>A · Today</th><th>B · #</th><th>C · Hover</th><th>D · One line</th><th>E · # and hover</th></tr></thead>
    <tbody>
      <tr><th>Says “counts” on every panel</th><td>Yes, in words</td><td>Yes, as “#”</td><td>No</td><td>No, once above</td><td>Yes, as “#”</td></tr>
      <tr><th>On a phone</th><td>Yes</td><td>Yes</td><td>Nothing</td><td>The line</td><td>The “#”</td></tr>
      <tr><th>Exact count of a bar</th><td>No</td><td>No</td><td>On hover</td><td>No</td><td>On hover</td></tr>
      <tr><th>Width the bars lose</th><td>About 16px a panel</td><td>None</td><td>None</td><td>None</td><td>None</td></tr>
      <tr><th>Work</th><td>Done</td><td>Small</td><td>Small</td><td>Smallest</td><td>Small</td></tr>
    </tbody>
  </table></div>
</section>

<section>
  <h2>What any change does to the release</h2>
  <ul class="plain">
    <li>It is display only. No count, bar or range changes.</li>
    <li>It lands on dev as one more small pull request, with its tests, the requirement rows for the overview’s axis (SH-AXIS-006) reworded, and the screenshot baselines refreshed. That refresh needs one more pair of runs approved by you.</li>
    <li>The release candidate then becomes RC2 on the same pull request, with the demo page’s overview stills retaken. Barbara’s email waits for the release either way.</li>
  </ul>
</section>

<section>
  <h2>How these were made</h2>
  <p class="small">Each still is the live dev overview (<a href="${SITE}">safety.viz dev</a>, the v1.11.3 release candidate) in headless Chromium, with the running charts changed in the page to show the option: nothing here is built into safety.viz yet. Option A is the page as it is. The hover in options C and E is set on the tallest bar of the first panel. The tooltip in the build would round its range with the same digits as the chart’s ticks. <code>capture.cjs</code> takes the stills; <code>build.cjs</code> writes this page.</p>
</section>

<footer class="foot">
  <hr>
  <p>This page was drafted by Claude Code using Opus 5.5.</p>
</footer>
</div>
</body>
</html>
`;

if (missing.length) {
  console.error('Missing:', missing.join(', '));
  process.exit(1);
}
fs.writeFileSync(path.join(dir, 'index.html'), html);
console.log('wrote index.html');
