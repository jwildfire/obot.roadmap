// Writes index.html for the safety.viz v1.11.3 demo page from capture.json,
// which capture.cjs wrote. Every title, column name and number read from the
// charts comes from capture.json; none is typed here by hand.
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
const A = c.after;
const B = c.before;
const AA = c.app_after;
const AB = c.app_before;
for (const s of [A.single.still, B.single.still, A.overview.still, B.overview.still, A.grouped.still, B.grouped.still, A.listing.still, B.listing.still, AA.single.still, AB.single.still, AA.listing.still, AB.listing.still]) {
  if (!fs.existsSync(path.join(dir, 'media', s.file))) throw new Error(`missing still: ${s.file}`);
}

// ---------------------------------------------------------------- addresses
const SV = 'https://github.com/jwildfire/safety.viz';
const HUB = 'https://github.com/jwildfire/obot.roadmap';
const RELEASED = c.site.after_is === 'the released site';
const SITE = RELEASED ? 'https://jwildfire.github.io/safety.viz/' : 'https://jwildfire.github.io/safety.viz/dev/';
const TRY = `${SITE}histogram/`;
const APP = `${SITE}demo/`;
const EVIDENCE = `${SITE}histogram/evidence.html`;
const OBJECTIVE = `${HUB}/issues/429`;
const REQ = `${HUB}/issues/430`;
const TITLES = `${SV}/issues/347`;
const TITLES_PR = `${SV}/pull/349`;
const HOVER = `${SV}/issues/359`;
const HOVER_PR = `${SV}/pull/360`;
const OPTIONS = 'https://jwildfire.github.io/obot.roadmap/reports/sv-overview-count-options-2026-11-08/';
const VISIT = `${SV}/issues/348`;
const VISIT_PR = `${SV}/pull/350`;
const PREP = `${SV}/issues/351`;
const MATRIX = `${SV}/blob/dev/requirements/safety-histogram.md`;
const NEWS = `${SV}/blob/dev/NEWS.md`;
const HERE = `${HUB}/tree/main/reports/sv-v1.11.3-demo`;

// ---------------------------------------------------------------- words
const esc = (t) => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const q = (t) => `“${esc(t)}”`;
const a = (href, text) => `<a href="${href}">${text}</a>`;
const n = (v) => Number(v).toLocaleString('en-US');
const date = new Date(c.site.captured).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'America/New_York' });
const commit = c.site.commit ? c.site.commit.slice(0, 8) : 'unknown';
const L = A.listing;
const visits = [...new Set(L.visits)];
const RELNOW = RELEASED ? 'release 1.11.3' : c.site.after_is === 'the dev site' ? 'release 1.11.3 (dev site)' : 'release 1.11.3 (release candidate)';

/** A still with its numbered markers. */
function shot(st, alt) {
  const marks = st.markers.map((m, i) => `<span class="mk" style="left:${m.left}%;top:${m.top}%" aria-hidden="true">${i + 1}</span>`).join('');
  return `<a class="frame" href="media/${st.file}"><img src="media/${st.file}" width="${st.width}" height="${st.height}" alt="${esc(alt)}" loading="lazy">${marks}</a>`;
}

/** Before and after, side by side; stacked on a phone. Legend for the after markers. */
function pair(before, after, legend, caption) {
  if (after.still.markers.length !== legend.length) throw new Error(`${after.still.file}: ${after.still.markers.length} markers, ${legend.length} legend lines`);
  return `<div class="pair">
  <figure><div class="lbl">Before · release 1.11.2</div>${shot(before.still, before.alt)}</figure>
  <figure><div class="lbl now">After · ${esc(RELNOW)}</div>${shot(after.still, after.alt)}${legend.length ? `<ol class="legend">${legend.map((l) => `<li>${l}</li>`).join('')}</ol>` : ''}</figure>
</div>
<p class="cap">${caption}</p>`;
}

const columns = (list) => `<ol class="cols">${list.map((h) => `<li>${esc(h)}</li>`).join('')}</ol>`;

const css = fs.readFileSync(path.join(dir, 'page.css'), 'utf8');

const html = `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>safety.viz v1.11.3 — annotated demo</title>
<meta name="description" content="What safety.viz v1.11.3 changes in the Safety Histogram, before and after: titled axes on the single-measure chart, the count on hover on the small panels, and the visit in the bar listing with the participant ID listed once, on the gallery page and in the demo app, with steps to try.">
<style>
${css}
</style>
</head><body>
<div class="wrap">

<header class="mast">
  <div class="eyebrow"><span>safety.viz</span><span class="dot"></span><span>${RELEASED ? 'Released' : 'Release candidate'}</span><span class="dot"></span><span>Annotated demo</span></div>
  <h1>safety.viz <span class="v">v1.11.3</span>: the Safety Histogram, labelled</h1>
  <p class="lede">A patch with two display changes to the Safety Histogram. Its charts now say what their axes and bars show. Clicking a bar lists the visit of each record. No value, bin or count changes.</p>
  <div class="facts"><span>Captured ${esc(date)}</span><span>after: ${esc(c.site.after_is)}, ${esc(c.site.branch)} at ${esc(commit)}</span><span>before: release 1.11.2</span><span>${held} of ${held} checks held</span></div>
</header>

<div class="note">
  <div class="lbl">In one paragraph</div>
  <p>A member of the Interactive Safety Graphics working group reviewed the histogram on 3 November 2026. The axes had no titles, and with one participant selected nothing said when each record was taken. This release titles the single-measure chart's axes, as the original safety-histogram did, gives each bar's count on hover on the small panels, and adds a Visit column to the bar listing. Each pair below is the same view in release 1.11.2 and in this release.</p>
</div>

<div class="cut"><span>01 <em>/ one measure</em></span></div>
<section>
  <div class="hd"><h2>Both axes are titled</h2></div>
  <p class="what">The x-axis names the measure and its unit. The y-axis says what each bar counts.</p>
  ${pair(
    { still: B.single.still, alt: `The histogram of ${A.single.x} in release 1.11.2, with no axis titles.` },
    { still: A.single.still, alt: `The same histogram in release 1.11.3, with the x-axis titled ${A.single.x} and the y-axis titled ${A.single.y}.` },
    [`${q(A.single.x)}`, `${q(A.single.y)}`],
    `${esc(A.single.x)}, all participants. The ${n(A.single.bars)} bars and their counts are the same in both.`
  )}
</section>

<div class="cut"><span>02 <em>/ all measures</em></span></div>
<section>
  <div class="hd"><h2>The overview says what the bars count</h2></div>
  <p class="what">The histogram opens on one panel for each measure. The line above the panels now says what each bar counts, and pointing at a bar shows its range and its count. The panels carry no axis title.</p>
  ${pair(
    { still: B.overview.still, alt: 'The first six panels of the all-measures overview in release 1.11.2, under the line Click a chart to view that measure.' },
    { still: A.overview.still, alt: `The same panels in release 1.11.3, under the line ${A.overview.hint} One bar is pointed at, and its tooltip reads ${A.overview.hover.title[0]}, ${A.overview.hover.lines[0]}.` },
    [`The line: ${q(A.overview.hint)}`, `Pointing at a bar: ${q(A.overview.hover.title[0])}, ${q(A.overview.hover.lines[0])}.`],
    `The first six of ${n(A.overview.panels)} panels. The counts are the same in both. Click a panel, or press Enter on it, to open its measure, as before. A phone shows no tooltip.`
  )}
</section>

<div class="cut"><span>03 <em>/ grouped</em></span></div>
<section>
  <div class="hd"><h2>Grouped panels give the count on hover</h2></div>
  <p class="what">Grouping by treatment group draws a panel for each group under the titled chart. Pointing at a bar shows its range and count, as on the overview.</p>
  ${pair(
    { still: B.grouped.still, alt: 'The first row of grouped panels in release 1.11.2.' },
    { still: A.grouped.still, alt: `The same panels in release 1.11.3, one bar pointed at, its tooltip reading ${A.grouped.hover.title[0]}, ${A.grouped.hover.lines[0]}.` },
    [`Pointing at a bar: ${q(A.grouped.hover.title[0])}, ${q(A.grouped.hover.lines[0])}.`],
    `${esc(A.single.x)}, grouped by treatment group: the first row of ${n(A.grouped.panels)} panels. The chart above them keeps both axis titles.`
  )}
</section>

<div class="cut"><span>04 <em>/ the bar listing</em></span></div>
<section>
  <div class="hd"><h2>The listing names the visit</h2></div>
  <p class="what">Select one participant, click a bar: each record now says which visit it is from. The participant ID, which the gallery page also offers as a filter, is listed once.</p>
  ${pair(
    { still: B.listing.still, alt: `The bar listing for participant ${c.participant} in release 1.11.2: Participant ID appears twice, and there is no visit.` },
    { still: L.still, alt: `The same listing in release 1.11.3: Participant ID once, then Visit, with a visit name on each row.` },
    ['Participant ID, once.', `Visit: ${visits.map(esc).join(', ')}.`],
    `Participant ${esc(c.participant)}, ${esc(A.single.x)}, the tallest bar: the same ${n(L.bar)} records in both.`
  )}
</section>

<div class="cut"><span>05 <em>/ the demo app</em></span></div>
<section>
  <div class="hd"><h2>The same in the demo app</h2></div>
  <p class="what">The demo app opens on the histogram, so it gets both changes.</p>
  ${pair(
    { still: AB.single.still, alt: 'The demo app’s histogram of Alanine Aminotransferase in release 1.11.2, with no axis titles.' },
    { still: AA.single.still, alt: `The demo app’s histogram in release 1.11.3, with the x-axis titled ${AA.single.x} and the y-axis titled ${AA.single.y}.` },
    [`${q(AA.single.x)}`, `${q(AA.single.y)}`],
    'Alanine Aminotransferase in the demo app.'
  )}
  ${pair(
    { still: AB.listing.still, alt: 'The demo app’s bar listing in release 1.11.2, with no visit column.' },
    { still: AA.listing.still, alt: 'The demo app’s bar listing in release 1.11.3, with a Visit column after the participant ID.' },
    [],
    `The tallest bar, clicked: the app offers no participant filter, so these are all ${n(AA.listing.bar)} records in that bar. At a 1,280-pixel window the wider listing now runs past the card on the right; that is filed for the backlog (${a(`${SV}/issues/355`, 'safety.viz #355')}).`
  )}
  <div class="states">
    <div><div class="lbl">Columns before</div>${columns(AB.listing.headers)}</div>
    <div><div class="lbl">Columns after</div>${columns(AA.listing.headers)}</div>
  </div>
</section>

<div class="cut"><span>06 <em>/ try it</em></span></div>
<section>
  <div class="note try">
    <div class="lbl">Try it on ${esc(c.site.after_is)}</div>
    <ol class="steps">
      <li><span class="do">Open the ${a(TRY, 'histogram demo')} and point at a bar.</span><span class="see">Its range and its count of results.</span></li>
      <li><span class="do">Set Measure to <span class="key">${esc(A.single.x)}</span>, Group charts by to <span class="key">None</span>.</span><span class="see">Both axes are titled.</span></li>
      <li><span class="do">Set Participant ID to <span class="key">${esc(c.participant)}</span>, click the tallest bar.</span><span class="see">The listing shows Participant ID, then Visit.</span></li>
      <li><span class="do">Open the ${a(APP, 'demo app')}.</span><span class="see">The same titles and the same Visit column.</span></li>
    </ol>
  </div>
</section>

<div class="cut"><span>07 <em>/ the rest</em></span></div>
<section>
  <div class="note">
    <div class="lbl">Not in this release: the study day</div>
    <p>The participant profile's time axis says "Study Day" but, on the demo data, plots visit numbers. It is unchanged here, and the listing has no study-day column for the same reason. Fixing it is its own development cycle: requirement 2 of the ${a(OBJECTIVE, 'objective to firm up the tools for the ISG relaunch (obot.roadmap #429)')}.</p>
  </div>
  <div class="close">
    <div>
      <h3>What did not change</h3>
      <ul>
        <li>Bins, tick labels and counts. The capture compared them in both releases.</li>
        <li>A listing given its own columns (the ${'<span class="key">details</span>'} setting) is used as given.</li>
        <li>The participant profile, every time axis, the demo data, and every other chart.</li>
        <li>The gsm.safety widget gets both changes when it next copies in the bundle.</li>
      </ul>
    </div>
    <div>
      <h3>Where to check it</h3>
      <ul>
        <li>The ${a(EVIDENCE, 'histogram evidence page')}.</li>
        <li>The requirement: ${a(REQ, 'the Safety Histogram’s quick wins (obot.roadmap #430)')}.</li>
        <li>The tasks: ${a(TITLES, 'axis titles (#347)')}, pull request ${a(TITLES_PR, '#349')}; ${a(HOVER, 'the count on hover (#359)')}, pull request ${a(HOVER_PR, '#360')}, chosen from ${a(OPTIONS, 'the options page')}; ${a(VISIT, 'the visit in the listing (#348)')}, pull request ${a(VISIT_PR, '#350')}.</li>
        <li>The ${a(MATRIX, 'requirement matrix')}, the ${a(NEWS, 'release notes')}, the ${a(PREP, 'release preparation (#351)')}.</li>
      </ul>
    </div>
  </div>
</section>

<footer>
  <p>Data: the demo's lab file is the public, de-identified CDISC Pilot 01 study (pharmaverseadam), with synthetic groups added for liver and kidney injury.</p>
  <p>Captured with Playwright, headless Chromium: after from ${a(c.site.after, esc(c.site.after_is))} and ${a(AA.site, 'its demo app')}; before from ${a(B.site, 'the released site')} and ${a(AB.site, 'its demo app')}${RELEASED ? ', before this release' : ''}, release 1.11.2. Every title, column name and number on this page was read from those pages, and ${held} checks held them. How it was made: ${a(HERE, 'this page’s folder')}.</p>
  <hr>
  <p>This page was drafted by Claude Code using Opus 5.5.</p>
</footer>

</div>
</body></html>
`;
fs.writeFileSync(path.join(dir, 'index.html'), html);
console.log(`Wrote index.html: ${held} checks held.`);
