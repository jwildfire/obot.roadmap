// Writes index.html for the safety.viz v1.11.2 demo page from capture.json,
// which capture.cjs wrote. Every sentence quoted from the chart and every
// number read from it comes from capture.json; none is typed here by hand.
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
for (const s of [c.by_r, c.by_nr, c.tooltip.still]) {
  if (!fs.existsSync(path.join(dir, 'media', s.file))) throw new Error(`missing still: ${s.file}`);
}

// ---------------------------------------------------------------- addresses
const SV = 'https://github.com/jwildfire/safety.viz';
const HUB = 'https://github.com/jwildfire/obot.roadmap';
const SITE = c.site.after_is === 'the released site' ? 'https://jwildfire.github.io/safety.viz/' : 'https://jwildfire.github.io/safety.viz/dev/';
const TRY = `${SITE}hep-explorer/`;
const EVIDENCE = `${SITE}hep-explorer/evidence.html`;
const GUIDE = `${SITE}hep-explorer/guide.html`;
const ISSUE = `${SV}/issues/334`;
const PR = `${SV}/pull/335`;
const PREP = `${SV}/issues/336`;
const MATRIX = `${SV}/blob/dev/requirements/hep-explorer.md`;
const NEWS = `${SV}/blob/dev/NEWS.md`;
const HERE = `${HUB}/tree/main/reports/sv-v1.11.2-demo`;
const ORIGINAL = 'https://github.com/SafetyGraphics/hep-explorer/blob/master/src/callbacks/onInit/cleanData/makeRRatio.js';
const ROBLES = 'https://www.gastrojournal.org/article/S0016-5085(14)01484-X/fulltext';

// ---------------------------------------------------------------- words
const esc = (t) => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const q = (t) => `“${esc(t)}”`;
const a = (href, text) => `<a href="${href}">${text}</a>`;
const n = (v) => Number(v).toLocaleString('en-US');
const r2 = (v) => Number(v).toFixed(2);
const date = new Date(c.site.captured).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'America/New_York' });
const commit = c.site.commit ? c.site.commit.slice(0, 8) : 'unknown';
const s = c.stats;
const ex = s.example;
const RELEASED = c.site.after_is === 'the released site';
// The rRatio still's largest point is one of the synthetic chronic liver
// disease participants (ids CLD-*), which the page says; stop if that moved.
if (!String(c.by_r.largest).startsWith('CLD-')) throw new Error(`the largest point under rRatio is ${c.by_r.largest}, not a CLD-* participant: reword the page`);
if (ex.id !== c.by_nr.largest) throw new Error(`the tooltip's participant ${ex.id} is not the largest under nrRatio (${c.by_nr.largest}): reword the page`);
const chips = (list) => list.map((o) => `<span class="key">${esc(o)}</span>`).join(' ');

/** A still with its numbered markers and their legend. */
function figure(st, alt, legend, caption) {
  if (st.markers.length !== legend.length) throw new Error(`${st.file}: ${st.markers.length} markers, ${legend.length} legend lines`);
  const marks = st.markers.map((m, i) => `<span class="mk" style="left:${m.left}%;top:${m.top}%" aria-hidden="true">${i + 1}</span>`).join('');
  return `<figure>
  <a class="frame" href="media/${st.file}"><img src="media/${st.file}" width="${st.width}" height="${st.height}" alt="${esc(alt)}" loading="lazy">${marks}</a>
  ${legend.length ? `<ol class="legend">${legend.map((l) => `<li>${l}</li>`).join('')}</ol>` : ''}
  ${caption ? `<figcaption class="cap">${caption}</figcaption>` : ''}
</figure>`;
}

const tooltipList = (lines) => `<ul class="tip">${lines.map((l) => `<li><code>${esc(l)}</code></li>`).join('')}</ul>`;

const css = fs.readFileSync(path.join(dir, 'page.css'), 'utf8');

const html = `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>safety.viz v1.11.2 — annotated demo</title>
<meta name="description" content="What safety.viz v1.11.2 adds to the Hep Explorer: the new R ratio (nR), which takes AST in place of ALT when AST is higher, as a Point Size setting and a tooltip line, shown on the demo data with steps to try.">
<style>
${css}
</style>
</head><body>
<div class="wrap">

<header class="mast">
  <div class="eyebrow"><span>safety.viz</span><span class="dot"></span><span>${RELEASED ? 'Released' : 'Release candidate'}</span><span class="dot"></span><span>Annotated demo</span></div>
  <h1>safety.viz <span class="v">v1.11.2</span>: the new R ratio in Hep Explorer</h1>
  <p class="lede">A patch with one change. Hep Explorer can size its points by the new R ratio (nR), and each point's tooltip shows nR under R. The original Hep Explorer had this, and the safety.viz version had left it out.</p>
  <div class="facts"><span>Captured ${esc(date)} from ${esc(c.site.after_is)}</span><span>${esc(c.site.branch)} at ${esc(commit)}</span><span>${held} of ${held} checks held</span></div>
</header>

<div class="note">
  <div class="lbl">In one paragraph</div>
  <p>R tells a hepatocellular liver injury from a cholestatic one, using ALT. nR uses whichever of ALT and AST is higher, so an injury where AST rises more than ALT is not read as cholestatic. In this release, Point Size has a third setting, ${chips(['nrRatio'])}, and the tooltip has one more line. Everything that was there before, R and its filter included, works as it did.</p>
</div>

<div class="cut"><span>01 <em>/ what nR is</em></span></div>
<section>
  <div class="hd"><h2>The higher of ALT and AST, over ALP</h2></div>
  <p class="what">For each participant, nR is the higher of their peak ALT and peak AST, both as multiples of the upper limit of normal, divided by their peak ALP as a multiple of its upper limit. R is the same calculation with ALT alone. So nR is never below R, and it is above R whenever AST is the higher of the two.</p>
  <ul class="list">
    <li>Either ALT or AST alone is enough. A participant with neither, or with no ALP above zero, has no nR, and the chart draws them at the base size.</li>
    <li>nR is always computed against the upper limit of normal, even when the chart shows values against baseline (mDISH). R works the same way.</li>
    <li>nR is computed from each participant's peaks, the way R is in safety.viz. The ${a(ORIGINAL, 'original Hep Explorer')} took the ratio at each visit.</li>
    <li>nR comes from ${a(ROBLES, 'Robles-Diaz et al. 2014')}. The ${a(GUIDE, 'clinical guide')} has the bands: above 5 is hepatocellular, 2 to 5 is mixed, and below 2 is cholestatic.</li>
  </ul>
  <div class="note">
    <div class="lbl">On the demo data</div>
    <p>${n(s.plotted)} participants are plotted. All ${n(s.with_nr)} have an nR, and for ${n(s.nr_higher)} of them it is above their R. None is below. For ${n(s.moved_band)} participants, nR moves them into a higher band of the guide's table.</p>
    <table class="bands">
      <thead><tr><th>Band</th><th>By R</th><th>By nR</th></tr></thead>
      <tbody>
        <tr><td>Hepatocellular, above 5</td><td>${n(s.bands_r.hep)}</td><td>${n(s.bands_nr.hep)}</td></tr>
        <tr><td>Mixed, 2 to 5</td><td>${n(s.bands_r.mixed)}</td><td>${n(s.bands_nr.mixed)}</td></tr>
        <tr><td>Cholestatic, below 2</td><td>${n(s.bands_r.chol)}</td><td>${n(s.bands_nr.chol)}</td></tr>
      </tbody>
    </table>
  </div>
</section>

<div class="cut"><span>02 <em>/ point size</em></span></div>
<section>
  <div class="hd"><h2>Point Size → nrRatio</h2></div>
  <p class="what">Point Size used to offer ${chips(c.before.options)}. It now offers ${chips(c.options)}. Under ${chips(['nrRatio'])} each point is sized by its participant's nR, and the legend's note says so.</p>
  <figure class="swap">
    <input type="radio" name="size" id="size-nr" checked><input type="radio" name="size" id="size-r">
    <div class="switch" role="group" aria-label="Point Size"><label for="size-nr">nrRatio</label><label for="size-r">rRatio</label></div>
    <div class="frames">
      <div class="before">${figure(c.by_nr, `The eDISH scatter of the demo data with Point Size set to nrRatio. The legend note explains nR, and participant ${ex.id}'s point, below the bilirubin cut-line, is drawn largest.`, [`The note: ${q(c.note_nr)}`, `The largest point: participant ${esc(c.by_nr.largest)}, with the highest nR on the demo data.`], '')}</div>
      <div class="after">${figure(c.by_r, 'The same scatter with Point Size set to rRatio. The largest points sit among the synthetic chronic liver disease participants on the right.', [`The largest point under rRatio: participant ${esc(c.by_r.largest)}, with the highest R.`], `The note under rRatio: ${q(c.note_r)}`)}</div>
    </div>
  </figure>
  <p class="cap">Switch between the two settings. Under nrRatio, participant ${esc(ex.id)}'s point (marker 2) is the largest on the chart, because its AST is higher than its ALT. Under rRatio the largest points are in the synthetic chronic liver disease groups.</p>
</section>

<div class="cut"><span>03 <em>/ tooltip</em></span></div>
<section>
  <div class="hd"><h2>nR under R in the tooltip</h2></div>
  <p class="what">Every point's tooltip now has an nR line under R. Here is participant ${esc(ex.id)}: R is ${r2(ex.r)}, in the mixed band, and nR is ${r2(ex.nr)}, in the hepatocellular band.</p>
  <div class="narrow">${figure(c.tooltip.still, `The tooltip of participant ${ex.id}, hovered on the scatter, listing R Ratio ${r2(ex.r)} and nR Ratio ${r2(ex.nr)}.`, [`Participant ${esc(ex.id)}'s point, hovered.`], '')}</div>
  <div class="states">
    <div><div class="lbl">Release 1.11.1</div>${tooltipList(c.before.tooltip.lines)}</div>
    <div><div class="lbl">Release 1.11.2</div>${tooltipList(c.tooltip.lines)}</div>
  </div>
</section>

<div class="cut"><span>04 <em>/ try it</em></span></div>
<section>
  <div class="note try">
    <div class="lbl">Try it on ${esc(c.site.after_is)}</div>
    <ol class="steps">
      <li><span class="do">Open the ${a(TRY, 'Hep Explorer demo')} and choose <span class="key">eDISH / mDISH scatter</span> under View.</span><span class="see">The scatter of peak ALT against peak bilirubin.</span></li>
      <li><span class="do">Under Settings, set Point Size to <span class="key">nrRatio</span>.</span><span class="see">The note above the chart explains nR. One point below the bilirubin cut-line, left of the ALT cut-line, becomes the largest: participant ${esc(ex.id)}.</span></li>
      <li><span class="do">Hover that point.</span><span class="see">The tooltip shows R ${r2(ex.r)} and, under it, nR ${r2(ex.nr)}.</span></li>
      <li><span class="do">Set Point Size to <span class="key">rRatio</span>, then back.</span><span class="see">The largest points move to the synthetic chronic liver disease groups.</span></li>
    </ol>
  </div>
</section>

<div class="cut"><span>05 <em>/ the rest</em></span></div>
<section>
  <div class="close">
    <div>
      <h3>What did not change</h3>
      <ul>
        <li>R, its range filter and its tooltip line are as they were. The filter still works on R only, because the original had no filter for nR.</li>
        <li>No other chart changes. The demo app's Hep Explorer gets the same setting and tooltip line, because it draws the same chart.</li>
        <li>The participant profile's header shows R only. Adding nR there would be a follow-up.</li>
        <li>The gsm.safety widget needs no change, because Point Size is chosen on the chart, not passed in as a setting.</li>
      </ul>
    </div>
    <div>
      <h3>Where to check it</h3>
      <ul>
        <li>The ${a(EVIDENCE, 'Hep Explorer evidence page')}, which lists the new requirement row and its screenshot.</li>
        <li>The task: ${a(ISSUE, 'add nR to Point Size and the tooltip (#334)')}, and its pull request (${a(PR, '#335')}).</li>
        <li>The ${a(MATRIX, 'requirement matrix')}, with the new row for nR and three rows that now name it.</li>
        <li>The ${a(NEWS, 'release notes')}, and the release preparation (${a(PREP, '#336')}).</li>
      </ul>
    </div>
  </div>
</section>

<footer>
  <p>Data: the demo's lab file is the public CDISC Pilot 01 study (pharmaverseadam), with two synthetic groups added: participants with chronic liver disease and with acute kidney injury. No real participant appears. The largest points under rRatio belong to the synthetic liver disease groups.</p>
  <p>Captured with Playwright, headless Chromium, from ${a(c.site.after, esc(c.site.after_is))} and, for release 1.11.1, from ${a(c.before.site, 'the released site')}. Every quoted sentence and number on this page was read from those pages, and ${held} checks held them. How it was made: ${a(HERE, 'this page’s folder')}.</p>
  <hr>
  <p>This page was drafted by Claude Code using Opus 5.5.</p>
</footer>

</div>
</body></html>
`;
fs.writeFileSync(path.join(dir, 'index.html'), html);
console.log(`Wrote index.html: ${held} checks held.`);
