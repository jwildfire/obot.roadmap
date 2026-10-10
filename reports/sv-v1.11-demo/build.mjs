// Writes index.html for the safety.viz v1.11.0 demo page from
// capture-numbers.json, so that every sentence the page quotes from the app,
// and every number, is the one capture.mjs read from the live site.
//
//   node build.mjs
//
// Run from anywhere; it reads and writes beside itself and imports nothing
// but Node's own modules. It stops when a still is missing, or when a still's
// numbered markers and the legend under it do not match one for one.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const n = JSON.parse(readFileSync(path.join(here, 'capture-numbers.json'), 'utf8'));

// ---------------------------------------------------------------- small helpers
const esc = (value) =>
  String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const q = (value) => `“${esc(value)}”`;
const a = (href, words) => `<a href="${href}">${words}</a>`;
const hub = (number) => `https://github.com/jwildfire/obot.roadmap/issues/${number}`;
const task = (number) => `https://github.com/jwildfire/safety.viz/issues/${number}`;
const pull = (number) => `https://github.com/jwildfire/safety.viz/pull/${number}`;
const DESIGN = 'https://jwildfire.github.io/obot.roadmap/reports/sv-v1.11-design-2026-10-09/';
const mockup = (number) => a(`${DESIGN}#m${number}h`, `mockup ${number}`);
const DEMO = `${n.base}demo/`;
const list = (items, cls = 'list') => `<ul class="${cls}">\n${items.map((item) => `      <li>${item}</li>`).join('\n')}\n    </ul>`;
const rgb = (value) => {
  const [r, g, b] = value.match(/\d+/g).map(Number);
  return `#${[r, g, b].map((part) => part.toString(16).padStart(2, '0')).join('')}`;
};
const day = (iso) =>
  new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
const captured = Object.values(n.captured_at).sort().at(-1);

// A still, with its numbered markers laid over it where capture.mjs measured them.
// A marker in the app's header, on a still of the whole screen, is drawn small: the header's two rows
// are closer together than a marker is tall, and a full-size one would sit on the chart names.
const tight = (size, mark) => size.width === 1920 && size.height === 1200 && mark.y < 8;
const frame = (name, alt, { cls = '', marked = true } = {}) => {
  if (!existsSync(path.join(here, 'media', `${name}.jpg`))) throw new Error(`No still media/${name}.jpg`);
  const size = n.stills[name];
  const marks = marked ? n.marks[name] || [] : [];
  return `<a class="frame ${cls}" href="media/${name}.jpg" title="Open this picture at full size">
        <img src="media/${name}.jpg" alt="${esc(alt)}" loading="lazy" width="${size.width}" height="${size.height}">${marks
          .map(
            (mark) =>
              `<span class="mk${tight(size, mark) ? ' sm' : ''}" style="left:${mark.x}%;top:${mark.y}%" aria-hidden="true">${mark.n}</span>`
          )
          .join('')}
      </a>`;
};
const legendOf = (name, legend) => {
  const marks = n.marks[name] || [];
  if (marks.length !== legend.length)
    throw new Error(`Still ${name} has ${marks.length} markers and its legend ${legend.length} lines`);
  return legend.length
    ? `<ol class="legend">\n${legend.map((line) => `        <li>${line}</li>`).join('\n')}\n      </ol>`
    : '';
};
const fig = ({ name, alt, cap, legend = [], max = null }) => `
  <figure${max ? ` style="max-width:${max}px"` : ''}>
      ${frame(name, alt)}
      <figcaption>
      <p class="cap">${cap}</p>
      ${legendOf(name, legend)}
      </figcaption>
  </figure>`;
// The same page in release 1.10 and in release 1.11, swapped in place.
const swap = ({ id, before, after, altBefore, altAfter, cap, was, legend = [], max = null }) => `
  <figure class="swap"${max ? ` style="max-width:${max}px"` : ''}>
      <input type="radio" name="swap-${id}" id="swap-${id}-before" aria-label="Show release 1.10">
      <input type="radio" name="swap-${id}" id="swap-${id}-after" aria-label="Show release 1.11" checked>
      <div class="switch">
        <label for="swap-${id}-before">Release 1.10</label>
        <label for="swap-${id}-after">Release 1.11</label>
      </div>
      <div class="frames">
      ${frame(before, altBefore, { cls: 'before', marked: false })}
      ${frame(after, altAfter, { cls: 'after' })}
      </div>
      <figcaption>
      <p class="cap">${cap}</p>
      <p class="cap was">${was}</p>
      ${legendOf(after, legend)}
      </figcaption>
  </figure>`;
const section = (number, id, short, title, what, sources) => `
<!-- ============================================================ ${number} -->
<div class="cut"><span>${number} <em>· ${short}</em></span></div><section id="${id}">
  <div class="hd"><h2>${title}</h2></div>
  <p class="what">${what}</p>
  <p class="src">${sources.join(' <span class="dot"></span> ')}</p>`;

// A comment's own words, as written: paragraphs, lists and code, and nothing else.
const inline = (text) =>
  esc(text)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/(https:\/\/[^\s<]*[^\s<.,)])/g, '<a href="$1">$1</a>');
const blocks = (body) =>
  body
    .split(/\n---\n/)[0]
    .trim()
    .split(/\n\s*\n/)
    .map((block) => {
      const lines = block.split('\n');
      if (lines.every((line) => /^- /.test(line)))
        return `<ul>${lines.map((line) => `<li>${inline(line.slice(2))}</li>`).join('')}</ul>`;
      if (lines.every((line) => /^\d+\. /.test(line)))
        return `<ol>${lines.map((line) => `<li>${inline(line.replace(/^\d+\. /, ''))}</li>`).join('')}</ol>`;
      return `<p>${inline(lines.join(' '))}</p>`;
    });
// The two comments, cut into the parts the page shows. The build stops if a
// comment no longer has the shape it had when the page was written.
const shaped = (name, parts, shape) => {
  const got = parts.map((part) => part.slice(1, 3)).join(' ');
  if (got !== shape) throw new Error(`The ${name} comment has changed shape: ${got}, not ${shape}`);
  return parts;
};

// ---------------------------------------------------------------- what the capture read
const { first, first_before: first110, status, docs_labels: docs, r, r_before: r110, rbqm, rbqm_before: rbqm110 } = n;
const { rbqm_study: study, rbqm_phone: rbqmPhone, data, data_before: data110, defects, github } = n;
const { phone_link: link, phone_link_before: link110 } = n;
const footnote = shaped('footnote', blocks(github.comments.footnote.body), 'p> p> ul p> ol p>');
const statusAsk = shaped('status', blocks(github.comments.status.body), 'p> ul p>');
// The footnote: the question as it was asked, and the answer as its task records it.
const asked = github.comments.footnote.body.match(/^@jwildfire: (.+)$/m)[1];
const answeredOn = github.comments.answer.body.match(/answered in the session on (\d{4}-\d{2}-\d{2})/)[1];
const [footnoteWords, footnoteLink] = github.answer.says;
if (!github.answer.chose || !footnoteWords || !footnoteLink) throw new Error('The answer to the footnote question has changed shape');
const path8 = github.demo_path;
if (path8.steps.length !== 8) throw new Error(`The demo path has ${path8.steps.length} steps, not 8`);
const EVIDENCE = 'https://github.com/jwildfire/safety.viz/tree/dev/docs/evidence/basic-app/demo-path';
const MATRIX = 'https://github.com/jwildfire/safety.viz/blob/dev/requirements/demo-app.md';
const still = (name, words = 'the picture') => {
  if (!existsSync(path.join(here, 'media', `${name}.jpg`))) throw new Error(`No still media/${name}.jpg`);
  return a(`media/${name}.jpg`, words);
};
const welcomeCount = first.welcome.match(/(\d+) participants/)[1];
const synthetic = data.study_note.match(/carries (\d+) synthetic liver and kidney participants/)[1];
const activeArm = defects.waterfall.at(-1).hover.replace(/ \(n=\d+\)$/, '');
// Until the capture has a picture of the footnote, the page says why it has none.
const foot = n.footnote && n.footnote.after_run ? n.footnote : null;
if (foot && (foot.after_run.text !== footnoteWords.replace(/^"|"$/g, '') || foot.after_run.href !== footnoteLink))
  throw new Error('The footnote on the live app is not the one its task says was built');
const footnoteStill = foot
  ? ''
  : ' It merges in the last pull request before the release candidate, so the dev site this page was captured from does not show it yet.';
const closed = [402, 403, 404, 405, 406, 407, 408].filter((number) => github.issues[`obot.roadmap#${number}`].state === 'closed');
const checks = Object.entries(n.checks);
const failed = checks.filter(([, result]) => !result.pass);
const held = checks.length - failed.length;
const reasons = status.labels.map((one) => ({
  name: one.heading.replace(/ is experimental$/, ''),
  reason: one.reason
}));
const seconds = (text) => text.match(/in ([\d.]+ seconds?)/)[1];
const state = (key) => github.issues[key].state;
const homeWord = defects.home_description.split(' ')[0];
const homeWord110 = defects.home_description_before.split(' ')[0];
const versions = rbqm.details.versions.filter(([term]) => term !== 'Snapshot');
const tall = (value) => `${value} pixels`;
const phoneRows = [
  ['The QT Explorer, in the demo app', 'qt_app'],
  ['The QT Explorer’s page on the docs site', 'qt_docs'],
  ['The Hepatic Explorer’s page on the docs site', 'hep_docs'],
  ['A chart’s API reference page', 'api']
];

// ---------------------------------------------------------------- the page
const css = `
:root{
  --paper:#faf7f0; --panel:#fffdf9; --ink:#17191c; --ink2:#454a51; --mute:#737882;
  --rule:#e2dccf; --rule2:#c8bfa9;
  --blue:#2f6fa8;        /* interactive: links, steps */
  --bronze:#6c3270;      /* accent: the demo app's plum */
  --ask:#a8640c; --askbg:#fff6e6;
  --bad:#a23b3b; --badbg:#fff3f0;
  --display:"Avenir Next","Avenir","Segoe UI Variable Display","Segoe UI",system-ui,sans-serif;
  --body:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;
  --mono:ui-monospace,SFMono-Regular,"SF Mono",Menlo,Consolas,monospace;
}
*{box-sizing:border-box}
html{-webkit-text-size-adjust:100%;scroll-behavior:smooth}
body{margin:0;background:var(--paper);color:var(--ink);font:16px/1.6 var(--body);-webkit-font-smoothing:antialiased}
.wrap{max-width:1080px;margin:0 auto;padding:0 24px}
a{color:var(--blue);text-decoration:none;border-bottom:1px solid rgba(47,111,168,.32);overflow-wrap:anywhere}
a:hover{border-bottom-color:var(--blue)}
a:focus-visible{outline:2px solid var(--blue);outline-offset:3px;border-radius:2px}
h1,h2,h3{font-family:var(--display);font-weight:700;letter-spacing:-.018em;line-height:1.15;margin:0}
code,.mono{font-family:var(--mono);font-size:.92em}
code{overflow-wrap:anywhere}
p{margin:0}

/* ---------- masthead ---------- */
.mast{padding:52px 0 26px}
.eyebrow{font:600 11px/1.4 var(--mono);letter-spacing:.16em;text-transform:uppercase;color:var(--mute);display:flex;gap:10px;align-items:center;flex-wrap:wrap}
.dot{display:inline-block;width:4px;height:4px;border-radius:50%;background:var(--rule2);vertical-align:middle}
h1{font-size:clamp(30px,5vw,46px);margin:14px 0 0}
h1 .v{color:var(--bronze)}
.lede{max-width:66ch;margin:14px 0 0;font-size:17.5px;color:var(--ink2)}
.rc{display:inline-block;margin:18px 0 0;padding:9px 14px;border:1px dashed var(--rule2);border-radius:5px;background:var(--panel);font:600 13px/1.4 var(--mono);color:var(--ink2)}
.facts{display:flex;flex-wrap:wrap;gap:6px 22px;margin:18px 0 0;font:500 12.5px/1.5 var(--mono);color:var(--mute)}
.facts b{color:var(--ink2);font-weight:600}

/* ---------- callouts ---------- */
.note{margin:22px 0 0;padding:16px 20px 18px;border:1px solid var(--rule);border-left:3px solid var(--bronze);border-radius:5px;background:var(--panel);font-size:15px;color:var(--ink2)}
.note>.lbl{margin-bottom:10px}
.note ol,.note ul{margin:0;padding-left:20px}
.note li+li{margin-top:7px}
.note p+p,.note p+ul,.note ul+p,.note ol+p,.note p+ol{margin-top:9px}
.ask{border-left-color:var(--ask);background:var(--askbg);border-color:#ecd9b4;border-left-color:var(--ask)}
.ask h3{font-size:17px;margin:20px 0 0;color:var(--ink)}
.ask h3:first-of-type{margin-top:16px}
.ask .cite{font-size:13.5px;color:var(--mute);margin:4px 0 10px}
.ask .said{padding:12px 16px;border:1px solid #ecd9b4;border-radius:5px;background:var(--panel)}
.ask dl{margin:10px 0 0;display:grid;grid-template-columns:minmax(120px,210px) 1fr;gap:8px 18px}
.ask dt{font:600 12px/1.5 var(--mono);letter-spacing:.03em;color:var(--ink2);padding-top:2px}
.ask dd{margin:0;color:var(--ink)}
.bad{border-color:#ecc7c0;border-left-color:var(--bad);background:var(--badbg)}
.bad code{font-size:12.5px}
.lbl{font:600 10.5px/1.3 var(--mono);letter-spacing:.14em;text-transform:uppercase;color:var(--mute);margin:0 0 10px}
.ask>.lbl{color:var(--ask)}
.bad>.lbl{color:var(--bad)}
.list{margin:14px 0 0;padding-left:20px;max-width:76ch;font-size:15.5px;color:var(--ink2)}
.list li+li{margin-top:7px}

/* ---------- steps to try ---------- */
.steps{margin:0;padding:0;list-style:none;counter-reset:s;display:grid;gap:12px}
.steps li{counter-increment:s;position:relative;padding-left:34px}
.steps li+li{margin-top:0}
.steps li::before{content:counter(s);position:absolute;left:0;top:1px;width:22px;height:22px;border-radius:50%;border:1px solid var(--blue);color:var(--blue);display:grid;place-items:center;font:600 11.5px/1 var(--mono)}
.steps .do{display:block;color:var(--ink)}
.steps .see{display:block;color:var(--ink2);font-size:14.5px}

/* ---------- contents ---------- */
.toc{border-top:1px solid var(--rule);border-bottom:1px solid var(--rule);margin:30px 0 0;display:grid;grid-template-columns:repeat(4,1fr)}
.toc a{display:block;padding:14px 16px 16px;border:0;border-left:1px solid var(--rule);border-top:1px solid var(--rule)}
.toc a:nth-child(-n+4){border-top:0}
.toc a:nth-child(4n+1){border-left:0}
.toc a:hover{background:var(--panel)}
.toc .ref{font:600 11px/1 var(--mono);color:var(--bronze);letter-spacing:.04em}
.toc .t{display:block;margin-top:7px;font-family:var(--display);font-weight:600;font-size:15px;color:var(--ink);line-height:1.25}
.toc .s{display:block;margin-top:5px;font-size:12.5px;color:var(--mute);line-height:1.4}

/* ---------- sections ---------- */
.cut{position:relative;margin:64px 0 0;height:0;border-top:1px dashed var(--rule2)}
.cut span{position:absolute;top:-9px;left:0;background:var(--paper);padding-right:14px;font:600 12px/1 var(--mono);color:var(--bronze);letter-spacing:.06em}
.cut span em{font-style:normal;color:var(--mute)}
section{padding-top:26px}
.hd{display:flex;gap:18px;align-items:baseline;flex-wrap:wrap}
h2{font-size:clamp(22px,3vw,29px)}
.what{max-width:70ch;margin:12px 0 0;font-size:17px;color:var(--ink2)}
.src{margin:10px 0 0;font-size:13.5px;color:var(--mute);max-width:86ch}
.src .dot{margin:0 6px}
h3{font-size:19px;margin:42px 0 0}
h3+.what{margin-top:8px;font-size:15.5px}

/* ---------- figures ---------- */
figure{margin:20px 0 0;position:relative}
a.frame{position:relative;display:block;border:1px solid var(--rule);border-radius:5px;overflow:hidden;background:var(--panel);line-height:0}
a.frame:hover{border-color:var(--rule2)}
.frame img{display:block;width:100%;height:auto}
.mk{position:absolute;transform:translate(-50%,-50%);width:22px;height:22px;border-radius:50%;background:var(--bronze);color:#fff;font:700 12px/22px var(--mono);text-align:center;box-shadow:0 0 0 2px #fff,0 1px 5px rgba(0,0,0,.4)}
.mk.sm{width:16px;height:16px;font-size:9.5px;line-height:16px;box-shadow:0 0 0 1.5px #fff,0 1px 3px rgba(0,0,0,.4)}
.cap{margin:12px 0 0;font-size:14.5px;color:var(--ink2);max-width:80ch}
.legend{list-style:none;counter-reset:l;margin:12px 0 0;padding:0;display:grid;grid-template-columns:1fr 1fr;gap:8px 28px;font-size:14.5px;color:var(--ink2)}
.legend li{counter-increment:l;position:relative;padding-left:30px}
.legend li::before{content:counter(l);position:absolute;left:0;top:1px;width:20px;height:20px;border-radius:50%;background:var(--bronze);color:#fff;font:700 11px/20px var(--mono);text-align:center}
.swap>input{position:absolute;opacity:0;pointer-events:none}
.switch{display:inline-flex;border:1px solid var(--rule2);border-radius:999px;overflow:hidden;margin:0 0 10px;background:var(--panel)}
.switch label{padding:8px 15px;font:600 12px/1 var(--mono);letter-spacing:.04em;color:var(--mute);cursor:pointer;user-select:none}
.swap>input:nth-of-type(1):checked~.switch label:nth-of-type(1),
.swap>input:nth-of-type(2):checked~.switch label:nth-of-type(2){background:var(--bronze);color:#fff}
.swap>input:focus-visible~.switch{outline:2px solid var(--blue);outline-offset:2px}
.swap>input:nth-of-type(1):checked~.frames .after,
.swap>input:nth-of-type(2):checked~.frames .before,
.swap>input:nth-of-type(2):checked~figcaption .was,
.swap>input:nth-of-type(1):checked~figcaption .legend,
.swap>input:nth-of-type(1):checked~figcaption .cap:not(.was){display:none}
.was{color:var(--ink2)}
.phones{display:grid;grid-template-columns:repeat(auto-fit,minmax(0,300px));gap:24px;margin-top:20px;align-items:start}
.phones figure{margin:0}
.states{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:20px 24px;margin-top:20px;align-items:start}
.states figure{margin:0}
.states .cap{margin-top:8px}
.states .lbl{margin:0 0 6px}
.states .legend,.phones .legend{grid-template-columns:1fr}
.seen li+li{margin-top:6px}
.said ol{margin:0;padding-left:20px}
.said ol li+li{margin-top:3px}
.said details{margin-top:9px}
.said summary{cursor:pointer;color:var(--blue);font-size:14px}
.said details ul{margin-top:8px}

/* ---------- tables ---------- */
.scroll{overflow-x:auto;margin:16px 0 0;max-width:100%}
table{border-collapse:collapse;font-size:14.5px;color:var(--ink2);min-width:100%}
th,td{text-align:left;padding:8px 14px 8px 0;border-bottom:1px solid var(--rule);vertical-align:top}
thead th{font:600 11px/1.3 var(--mono);letter-spacing:.06em;text-transform:uppercase;color:var(--mute)}
td.n{font-family:var(--mono);white-space:nowrap}
td.k{white-space:nowrap;color:var(--ink)}

/* ---------- closing ---------- */
.close{margin-top:26px;display:grid;grid-template-columns:1fr 1fr;gap:34px}
.close h3{margin-top:0}
.close ul{margin:12px 0 0;padding-left:18px;font-size:14.5px;color:var(--ink2)}
.close li+li{margin-top:6px}
footer{margin:64px 0 0;border-top:1px solid var(--rule);padding:22px 0 60px;font-size:13.5px;color:var(--mute)}
footer a{color:var(--mute);border-bottom-color:var(--rule2)}
footer hr{border:0;border-top:1px solid var(--rule);margin:18px 0 14px}

@media (max-width:900px){
  .toc{grid-template-columns:1fr 1fr}
  .toc a:nth-child(-n+4){border-top:1px solid var(--rule)}
  .toc a:nth-child(-n+2){border-top:0}
  .toc a:nth-child(4n+1){border-left:1px solid var(--rule)}
  .toc a:nth-child(2n+1){border-left:0}
  .close{grid-template-columns:1fr;gap:26px}
}
@media (max-width:640px){
  .wrap{padding:0 16px}
  .mast{padding-top:34px}
  .toc{grid-template-columns:1fr}
  .toc a,.toc a:nth-child(-n+4),.toc a:nth-child(4n+1){border-left:0;border-top:1px solid var(--rule)}
  .toc a:first-child{border-top:0}
  .legend{grid-template-columns:1fr}
  .states{grid-template-columns:1fr}
  .ask dl{grid-template-columns:1fr;gap:2px 0}
  .ask dd{margin-bottom:10px}
  .mk{width:16px;height:16px;font-size:9.5px;line-height:16px;box-shadow:0 0 0 1.5px #fff,0 1px 3px rgba(0,0,0,.4)}
  .note{padding:14px 15px 16px}
}
`;

const head = `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>safety.viz v1.11.0 — annotated demo</title>
<meta name="description" content="What safety.viz v1.11.0 changes in the demo app, shown on the live site beside release 1.10: the first screen, one status label, one control that starts R, the RBQM tab and the Data tab, with steps to try and what is yours to rule on at the review.">
<style>${css}</style>
</head>
<body>

<div class="wrap">
`;

const masthead = `
<header class="mast">
  <p class="eyebrow">safety.viz <span class="dot"></span> release candidate review <span class="dot"></span> ${day(captured)}</p>
  <h1>What <span class="v">v1.11.0</span> changes, annotated</h1>
  <p class="lede">Release 1.11 makes the demo app ready to show at the keynote on 21 October 2026: a first screen that says where you are, one label for how far to trust it, one control that starts R, an RBQM tab that reads like the other tabs, and one place to load files. It adds no chart and no metric, and nothing the app computes changes.</p>
  <p class="rc"><!-- RC-LINK --><a href="https://github.com/jwildfire/safety.viz/pull/306">Release candidate: the pull request to review, safety.viz #306</a></p>
  <p class="facts">
    <span><b>${held}</b> of <b>${checks.length}</b> things this page says, held to the live site by a script</span>
    <span>captured <b>${day(captured)}</b> from the dev site</span>
    <span>public pilot study: <b>254</b> participants <span class="dot"></span> synthetic RBQM study: <b>765</b> enrolled, <b>150</b> sites</span>
  </p>
${
  failed.length
    ? `
  <div class="note bad">
    <p class="lbl">Did not hold at capture</p>
    <p>The script beside this page checks what the page says against the live site. ${failed.length === 1 ? 'One check' : `${failed.length} checks`} did not hold on this capture:</p>
    <ul>
${failed
  .map(
    ([name, result]) =>
      `      <li>${esc(name)}. The live site said <code>${esc(JSON.stringify(result.actual))}</code>; the page expects <code>${esc(result.expected)}</code>.</li>`
  )
  .join('\n')}
    </ul>
  </div>`
    : ''
}

  <div class="note ask" id="rule">
    <p class="lbl">Yours to rule on at this review</p>
    <p>Three things from the build, and five seen while this page was captured. None holds the release. The words in the white boxes are the comments’ own.</p>

    <h3>1. The status words are drafts</h3>
    <p>You said the drafted words would ship and that you would correct them here. The disclaimer, the four rungs and the six reasons are printed in full in ${a('#words', 'section 02')}.</p>

    <h3>2. Three questions about status</h3>
    <p class="cite">From the requirement for the status ladder (${a(github.comments.status.url, 'the three questions, obot.roadmap #403')}).</p>
    <div class="said">
        ${statusAsk[1]}
        ${statusAsk[2]}
    </div>

    <h3>3. The order of the keynote’s demo path</h3>
    <p class="cite">A new test walks these eight steps on the deployed demo, in this order, which is yours to change (${a(github.comments.demo_path.url, 'the test’s task, safety.viz #287')}; ${a(path8.run.url, 'its passing run')}).</p>
    <div class="said">
        <ol>${path8.steps.map((step) => `<li>${inline(step)}</li>`).join('')}</ol>
    </div>

    <h3>4. Seen while capturing, yours to rule on</h3>
    <ul class="seen">
      <li>The first screen gives two counts: the welcome line says ${q(`${welcomeCount} participants`)} and the histogram under it ${q(first.histogram_line)} The labs file carries ${synthetic} synthetic liver and kidney participants, which the Data tab says and the first screen does not (${still('first')}).</li>
      <li>The Qualified rung’s meaning uses the word “Validated”: ${q(status.rungs[0].meaning)} (${still('status-panel')}).</li>
      <li>The RBQM tab’s reason still says “new in 1.10”: ${q(reasons.at(-1).reason)} (${still('status-tab')}).</li>
      <li>A chart below Exploratory shows its label twice on its docs demo page, at the title and on the chart. That is as built: the chart still draws its own label there, as it would embedded elsewhere (${a(MATRIX, 'requirement row APP-TIER-025')}; ${still('docs-title')}).</li>
      <li>The Hepatic ALT Waterfall’s active arm on the pilot study is named ${q(activeArm)}. The name is the pilot data’s, and it will show on a shared screen (${still('status-chart')}).</li>
    </ul>
  </div>

  <div class="note" id="try">
    <p class="lbl">Try it: seven steps, each under a minute</p>
    <ol class="steps">
      <li><span class="do">${a(DEMO, 'Open the demo app')} and read the first screen.</span><span class="see">A welcome line names the study, no tab is grey, and the Data tab reads ${q(first.data_tag)}.</span></li>
      <li><span class="do">Hover the label at the top right, then click it.</span><span class="see">On hover: ${q(status.tip)} On a click: a panel headed ${q(status.heading)}, with the four rungs.</span></li>
      <li><span class="do">${a(`${DEMO}#hep-waterfall`, 'Open the Hepatic ALT Waterfall')} and click the label on the corner of its card.</span><span class="see">Its reason, and titles over the chart that no longer print on each other.</span></li>
      <li><span class="do">${a(`${DEMO}#cross-tab`, 'Open the Cross-tabulation')} and press Start R, at the right end of the chart names.</span><span class="see">In a few seconds the control is a chip, ${q(r.ready.chip)}, and under the chart R’s test reads ${q(r.statistic.split('. ')[0] + '.')}</span></li>
      <li><span class="do">${a(`${DEMO}#rbqm`, 'Open the RBQM tab')} and press Start R, once.</span><span class="see">The control counts six steps. About half a minute later: ${q(rbqm.done.split('. ')[0].replace(/in [\d.]+ seconds?/, 'in a few seconds') + '.')} Click a cell to open that metric.</span></li>
      <li><span class="do">${a(`${DEMO}#data`, 'Open the Data tab')}, choose “RBQM study” from the menu, then press ${q(data.study.card.button)}.</span><span class="see">The card reads ${q(data.study.card.say)} With R running from step 5, all eight run with no second press, at ${study.table.rows} sites.</span></li>
      <li><span class="do">On a phone, ${a(`${DEMO}#rbqm`, 'open the link to the RBQM tab')}.</span><span class="see">The RBQM tab is in view in the row of tabs, and nothing scrolls sideways.</span></li>
    </ol>
  </div>

  <div class="note">
    <p class="lbl">How to read this page</p>
    <ul>
      <li>Where the app changed its look, a switch above the picture swaps release 1.10 and release 1.11 in place. Release 1.10 is the released site; release 1.11 is the dev site.</li>
      <li>A numbered marker on a picture is explained by the same number under it. Tap a picture to open it at full size.</li>
      <li>Every sentence quoted from the app, and every number, was read from the live page by the script beside this page (${a('https://github.com/jwildfire/obot.roadmap/blob/main/reports/sv-v1.11-demo/capture-numbers.json', 'what it read')}).</li>
    </ul>
  </div>
</header>

<nav class="toc" aria-label="Contents">
  <a href="#first"><span class="ref">01</span><span class="t">The first screen</span><span class="s">Tab colours, the study’s name, a welcome line</span></a>
  <a href="#status"><span class="ref">02</span><span class="t">The status ladder</span><span class="s">One Exploratory label, and six below it</span></a>
  <a href="#r"><span class="ref">03</span><span class="t">The R control</span><span class="s">One control, then a chip</span></a>
  <a href="#rbqm"><span class="ref">04</span><span class="t">The RBQM tab</span><span class="s">A row of metrics, one press, the result first</span></a>
  <a href="#data"><span class="ref">05</span><span class="t">Files on the Data tab</span><span class="s">gsm raw files recognised where every file goes</span></a>
  <a href="#broken"><span class="ref">06</span><span class="t">Nothing looks broken</span><span class="s">Defects from the review of release 1.10</span></a>
  <a href="#standards"><span class="ref">07</span><span class="t">The standards written down</span><span class="s">Where the next session will read them</span></a>
  <a href="#same"><span class="ref">08</span><span class="t">What did not change</span><span class="s">No chart, no metric, nothing computed</span></a>
</nav>
`;

// ---------------------------------------------------------------- 01
const s1 = `${section(
  '01',
  'first',
  'the first screen',
  'The first screen says where you are',
  'Someone opening the app for the first time is told whose data this is, how much is here and where to go. In release 1.10 two of the tabs were grey and read as switched off, and nothing on screen named the study.',
  [
    `Requirement: every tab has a colour, and the first screen says where you are (${a(hub(402), 'obot.roadmap #402')})`,
    `Pull request: tab colours, the first screen, wordmark and title (${a(pull(290), 'safety.viz #290')})`,
    `As drawn in ${mockup(1)}`
  ]
)}
${swap({
  id: 'first',
  before: 'first-110',
  after: 'first',
  altBefore: 'Release 1.10: the demo app as it opens. The Data tab reads 4 files, each tab reads a count such as 9 of 9, and the Biomarkers and RBQM tabs have grey hexes.',
  altAfter: 'Release 1.11: the demo app as it opens. The Data tab reads Pilot study, each tab reads one number, Biomarkers is pink and RBQM amber, a welcome line sits above the chart, and a label at the top right reads Exploratory.',
  cap: 'The app as it opens, on the pilot study.',
  was: `Release 1.10. The Data tab reads ${q(first110.data_tag)}, a tab reads ${q(first110.tabs[0].count)}, and Biomarkers and RBQM share one grey. There is no welcome line and no label, and the wordmark is not a link.`,
  legend: [
    `The Data tab names the loaded study: ${q(first.data_tag)}, where it read ${q(first110.data_tag)}.`,
    `A tab shows one number when every chart draws: ${q(first.tabs[0].count)}, where it read ${q(first110.tabs[0].count)}.`,
    'Biomarkers has a colour of its own, pink, and its chart names take it.',
    'RBQM is amber. Both were grey, and read as switched off.',
    `The welcome line, on first open: ${q(first.welcome)} The cross closes it, and it stays closed for the visit.`,
    `The wordmark is a link back to the docs site (${q(first.wordmark[1])}).`,
    `The app’s status label, the subject of ${a('#status', 'section 02')}.`
  ]
})}
  ${list([
    `The browser tab names the open view: ${q(first.title)}, then ${q(first.title_chart)}, then ${q(first.title_rbqm)}. Release 1.10 read ${q(first110.title)} on every view.`,
    'The app and the docs site share one favicon, the hex mark.',
    `The colours come from a rule, not a list of tabs. A module names its own colour or is given the first open one of pink, amber and green; none is ever grey, and red is never given out because it means missing. Biomarkers and RBQM name none, so the rule gave them ${rgb(first.tabs[3].hex)} and ${rgb(first.tabs[4].hex)}.`
  ])}

  <h3>On a phone</h3>
  <p class="what">A link to a tab now opens with that tab in view, and every tab and chart name is tall enough to press.</p>
  <div class="phones">
${swap({
  id: 'phone-link',
  before: 'phone-link-110',
  after: 'phone-link',
  altBefore: 'Release 1.10 at phone width, opened from a link to the RBQM tab. The row of tabs shows Data, Labs and vitals and ECG; the RBQM tab is off the screen.',
  altAfter: 'Release 1.11 at phone width, opened from the same link. The row of tabs has moved so that the RBQM tab is in view.',
  cap: 'A link to the RBQM tab, opened at 390 pixels wide.',
  was: `Release 1.10. The RBQM tab sits ${link110.tab_left} pixels from the left of a ${link110.width}-pixel screen, out of sight, and the shortest name is ${tall(link110.shortest)} tall.`,
  legend: [`The RBQM tab is in view, and every tab and name is at least ${tall(link.shortest)} tall.`],
  max: 300
})}
  </div>
  <h3 id="footnote">The RBQM tab’s footnote</h3>
  ${list([
    `Asked during the build: ${q(asked)} (${a(github.comments.footnote.url, 'the question, with its four choices, safety.viz #271')}).`,
    `You chose, in the session on ${day(answeredOn)}: ${q(github.answer.chose)} (${a(github.comments.answer.url, 'the answer, on the same task')}).`,
    `What it is: the RBQM tab ends with ${q(footnoteWords.replace(/^"|"$/g, ''))}, a link to ${a(footnoteLink, 'gsm.kri’s documentation site')} that opens in a new tab, in the same line a chart’s footnote uses.${footnoteStill}`,
    `A page on the docs site for the RBQM tab, the third choice, is filed as a follow-up (${a(hub(415), 'the requirement, obot.roadmap #415')}).`
  ])}
${
  foot
    ? fig({
        name: 'rbqm-footnote',
        alt: 'The foot of the RBQM tab after a run on the pilot study: the last rows of the site overview, then one line reading RBQM: gsm.kri documentation, then the app’s footer with its version.',
        cap: `The foot of the RBQM tab, after a run on the pilot study. The app’s footer under it reads ${q(foot.app_version)}.`,
        legend: [
          `The footnote: ${q(foot.after_run.text)}, ${foot.after_run.links === 1 ? 'one link' : `${foot.after_run.links} links`}, to ${esc(foot.after_run.href.replace('https://', ''))}, opening in a new tab. It sits under the tab’s page before R is started, after a run and on a metric’s page, and at 390 pixels it is on the page with nothing scrolling sideways.`
        ]
      })
    : ''
}
</section>`;

// ---------------------------------------------------------------- 02
const s2 = `${section(
  '02',
  'status',
  'the status ladder',
  'One label says how far to trust it',
  'The ladder has four rungs: Qualified, Exploratory, Experimental and Prototype. Nothing is Qualified. The app carries one label, Exploratory, and a chart or tab carries its own only when it is below that rung.',
  [
    `Requirement: one status ladder, with one label for the app and one for anything below it (${a(hub(403), 'obot.roadmap #403')})`,
    `Pull request: the status ladder (${a(pull(296), 'safety.viz #296')})`,
    `As drawn in ${mockup(1)} and ${mockup(2)}`
  ]
)}
  <div class="states">
${fig({
  name: 'status-hover',
  alt: 'The top right of the app with the pointer on the Exploratory label. A dark line under it reads: Nothing in this app is qualified. Confirm every result.',
  cap: `On hover, one line: ${q(status.tip)}`,
  legend: ['The label is a button: it takes focus from the keyboard, opens on Enter and closes on Escape.']
})}
${fig({
  name: 'phone-status',
  alt: 'The app at phone width with the Exploratory label’s panel open. The panel fits inside the screen.',
  cap: `On a phone the same panel opens on a tap, inside the screen: it sits ${status.phone.left} pixels in from each edge of a ${status.phone.width}-pixel screen.`,
  max: 300
})}
  </div>
${fig({
  name: 'status-panel',
  alt: 'The app with the Exploratory label’s panel open. It is headed This app is exploratory, gives the disclaimer and a count of charts on each rung, and lists the four rungs with Exploratory marked This app.',
  cap: `On a click, a panel headed ${q(status.heading)}.`,
  legend: [
    'The one label in the header.',
    `The disclaimer: ${q(status.disclaimer)}`,
    `What is on each rung: ${q(status.count_line)}`,
    'The four rungs, with the app’s marked. A link under them leads to what each rung means, in the hub’s developer guidelines.'
  ]
})}

  <h3>A chart below Exploratory says so on its card</h3>
  <p class="what">Five charts and the RBQM tab are Experimental. Each carries the label on the corner of its card, with its reason one click away. The other ${status.unlabelled} charts carry no second label.</p>
${swap({
  id: 'banner',
  before: 'waterfall-110',
  after: 'status-chart',
  altBefore: 'Release 1.10: the Hepatic ALT Waterfall with an amber banner drawn inside the chart reading This chart is experimental.',
  altAfter: 'Release 1.11: the Hepatic ALT Waterfall with an Experimental label on the corner of its card and its panel open, giving the reason and the four rungs.',
  cap: 'The Hepatic ALT Waterfall, with its label open.',
  was: `Release 1.10. An amber banner inside the chart said ${q(n.status_before.banner)} The header carried no label at all.`,
  legend: [
    'The label sits on the corner of the card, outside the chart. The banner inside the chart is gone.',
    `The chart’s own reason: ${q(reasons[0].reason)}`,
    'The same four rungs, with this chart’s marked and the app’s beside it.'
  ]
})}
  <div class="scroll">
  <table>
    <thead><tr><th>Experimental</th><th>The reason on its label, as shipped</th></tr></thead>
    <tbody>
${reasons.map((one) => `      <tr><td class="k">${esc(one.name)}</td><td>${q(one.reason)}</td></tr>`).join('\n')}
    </tbody>
  </table>
  </div>
${fig({
  name: 'status-tab',
  alt: 'The RBQM tab with the Experimental label on the corner of its card open: The RBQM tab is experimental, with its reason and the four rungs, Experimental marked This tab.',
  cap: `A tab carries the same label as a chart: ${q(status.labels.at(-1).heading)}.`,
  legend: [`The tab’s reason: ${q(status.labels.at(-1).reason)}`],
  max: 640
})}
  ${list([
    `No chart draws a status banner inside itself any more: the script opened all ${status.labels.length + status.unlabelled - 1} charts and found ${status.banners}.`,
    'The RBQM tab’s pill, and the one in its opening sentence, are gone. The tab carries the same label as a chart.',
    `A build stops with a sentence if any chart is marked Qualified. That is held by a unit test, not by this page (${a(`${hub(403)}#issuecomment-6098149252`, 'the requirement’s closing comment')}).`
  ])}

  <div class="note ask" id="words">
    <p class="lbl">The status words, in full, for you to correct</p>
    <p>These are drafts. You said they would ship and that you would correct them at the release candidate. All of them, as the live app prints them:</p>
    <dl>
      <dt>The label’s line on hover</dt><dd>${q(status.tip)}</dd>
      <dt>The disclaimer, in the panel</dt><dd>${q(status.disclaimer)}</dd>
      <dt>The count under it</dt><dd>${q(status.count_line)}</dd>
${status.rungs.map((step) => `      <dt>${esc(step.rung)}</dt><dd>${q(step.meaning)}</dd>`).join('\n')}
${reasons.map((one) => `      <dt>${esc(one.name)}</dt><dd>${q(one.reason)}</dd>`).join('\n')}
    </dl>
    <p style="margin-top:12px">Two things to notice as you read. The Qualified rung is described with the word “validated”, a word the standards keep for nothing here; the sentence does go on to say nothing is. The RBQM tab’s reason says “new in 1.10”, which now reads one release old.</p>
  </div>

  <h3>The same label on the docs site</h3>
  <p class="what">Every gallery card and every chart page’s title says its rung with the same component: ${docs.counts[0]} Exploratory, ${docs.counts[1]} Experimental and ${docs.counts[2]} Prototype. A Prototype is shown on the docs site only.</p>
${fig({
  name: 'docs-gallery',
  alt: 'The docs site’s gallery. The QT Safety Explorer’s card has an Experimental label with its panel open; the Patient Journey Explorer’s card has a Prototype label.',
  cap: `The gallery, with one card’s label open: ${q(docs.card_heading)}, ${q(docs.card_reason)}`
})}
${fig({
  name: 'docs-title',
  alt: 'The Time-to-Event Explorer’s page on the docs site. An Experimental label sits beside the page title, and a second one at the top right of the chart.',
  cap: `A chart’s page: ${q(docs.page_title[0])}, with ${q(docs.page_title[1])} beside the title.`,
  legend: [`The label beside the title. The page shows ${docs.page_labels} labels: the chart beneath draws its own as well, at its top right.`]
})}
</section>`;

// ---------------------------------------------------------------- 03
const s3 = `${section(
  '03',
  'r',
  'the R control',
  'One control starts R, then gets out of the way',
  'R is started from one control at the right end of the chart names, the same on the Biomarkers tab and the RBQM tab. Once R is running the control is a small chip that opens R’s details. R still starts only when you ask.',
  [
    `Requirement: one R control, in the same place on both tabs that use R (${a(hub(404), 'obot.roadmap #404')})`,
    `Pull request: one R control, one set of sentences, and a limit on waiting for R (${a(pull(297), 'safety.viz #297')})`,
    `As drawn in ${mockup(3)}`
  ]
)}
${swap({
  id: 'r',
  before: 'r-110',
  after: 'r-off',
  altBefore: 'Release 1.10: the Cross-tabulation chart. A Start R pill sits at the front of the row of chart names, which are grey.',
  altAfter: 'Release 1.11: the Cross-tabulation chart. The chart names are pink and come first; at the right end of the row a control reads Statistics need R, 13 MB, once, Start R.',
  cap: 'A biomarker chart before R is started.',
  was: `Release 1.10. The Start R pill is at the front of the row, ahead of the chart names, and the line inside the chart is a long sentence: ${q(r110.line)}`,
  legend: [
    `The control, at the right end of the row and outside the list of names that scrolls: ${q(`${r.off.say} · ${r.off.meta} · ${r.off.button}`)}. Its whole sentence is on hover: ${q(r.off.hover)}`,
    'The chart names come first, in their tab’s colour.'
  ]
})}

  <h3>Its four states</h3>
  <div class="states">
    <figure>
      <p class="lbl">Before a press</p>
      ${frame('r-state-off', 'The control before a press: Statistics need R, 13 MB, once, and a Start R button.')}
      <p class="cap">${q(`${r.off.say} · ${r.off.meta}`)} and one button. Until it is pressed the page asks nothing of R’s addresses (${r.requests_before_press} requests).</p>
    </figure>
    <figure>
      <p class="lbl">Starting</p>
      ${frame('r-state-starting', 'The control while R starts: a spinner, Starting R, and 13 MB with a count of seconds.')}
      <p class="cap">${q(r.starting.say)}, with the seconds counting. On this capture R’s test was on the chart ${r.seconds_to_statistic} seconds after the press.</p>
    </figure>
    <figure>
      <p class="lbl">Ready</p>
      ${frame('r-state-ready', 'The control as a chip reading R ready, with its panel open: R is running in this browser, with version, started, downloaded and your data.')}
      <p class="cap">A chip, ${q(r.ready.chip)}. A click opens ${q(r.panel_heading)}: ${r.panel.map(([term, said]) => `${esc(term.toLowerCase())}, ${q(said)}`).join('; ')}.</p>
    </figure>
    <figure>
      <p class="lbl">Did not start</p>
      ${frame('r-state-failed', 'The control when R did not start: the words R did not start in red, a Try again button and a Why chip, with a panel giving the reason.')}
      <p class="cap">With R’s addresses blocked: ${q(r.failed.biomarkers.say)}, ${q(r.failed.biomarkers.button)} beside it, and the reason one click away. The browser’s own message is folded under ${q(r.failed.biomarkers.more)}.</p>
    </figure>
  </div>
${fig({
  name: 'r-statistic',
  alt: 'The Cross-tabulation chart after R has started. Under the bar chart a line gives Pearson’s Chi-squared test with its p-value.',
  cap: 'After the press, R’s test appears under the chart with nothing drawn again.',
  legend: [`${q(r.statistic)} Before the press the same line read ${q(r.line_before)}`]
})}
  ${list([
    `Both tabs say the same thing when R cannot start. On the Biomarkers tab the chart’s line reads ${q(r.failed.biomarkers.line)} On the RBQM tab the body reads ${q(r.failed.rbqm.line)}`,
    `The reason is in plain words: ${q(r.failed.biomarkers.panel)}`,
    `Starting R on the Biomarkers tab downloaded ${r.megabytes} MB on this capture; the control says 13 MB.`,
    `The RBQM tab now gives up on an R that stops answering: after ten minutes to start, three to load gsm’s packages or five to run, it says R stopped answering, closes that R and offers Try again. That is held by unit tests, since a browser test would have to wait a limit out (${a(`${hub(404)}#issuecomment-6098177054`, 'the requirement’s closing comment')}).`,
    `Not in this release: one R shared by both tabs. Each tab still starts its own, so a visitor who uses both downloads R twice (${a(hub(414), 'the follow-up requirement, obot.roadmap #414')}).`
  ])}
  <div class="phones">
${fig({
  name: 'phone-r',
  alt: 'The Cross-tabulation chart at phone width. The Start R control is first in the row of chart names, in view without scrolling.',
  cap: `At 390 pixels the control is first in the row, in view without scrolling, and the chart’s line reads ${q(r.phone.line)}`,
  legend: ['Start R, in view.'],
  max: 300
})}
  </div>
</section>`;

// ---------------------------------------------------------------- 04
const s4 = `${section(
  '04',
  'rbqm',
  'the RBQM tab',
  'The RBQM tab reads like the other tabs',
  'The tab has the same row of names every other tab has, with Overview first and then the eight site metrics, each marked with its state. One press of the R control runs everything. The result comes first, and the run’s details are folded behind the chip.',
  [
    `Requirement: the RBQM tab reads at a glance (${a(hub(405), 'obot.roadmap #405')})`,
    `Pull request: a row of metrics, the app’s R control, one page at a time (${a(pull(298), 'safety.viz #298')})`,
    `As drawn in ${mockup(4)} and ${mockup(5)}`
  ]
)}
${swap({
  id: 'rbqm-off',
  before: 'rbqm-off-110',
  after: 'rbqm-off',
  altBefore: 'Release 1.10: the RBQM tab before R is started. A paragraph, a box with a Start R button and three sentences, and a line about the files. There is no row of names under the header.',
  altAfter: 'Release 1.11: the RBQM tab before R is started. A row under the header reads Overview and eight metrics, with the R control at its right end. The body says Site metrics need R. Start R, at the top right.',
  cap: 'The RBQM tab on the pilot study, before R is started.',
  was: `Release 1.10. The tab has no row of names, so it looks like a different kind of page. It opens on a paragraph and a box: ${q(rbqm110.says)}`,
  legend: [
    'The row: Overview, then the eight metrics. A dashed hex is not started; a grey hex with a bar cannot run, because the study has no data for it. Each item’s name for a screen reader carries the state in words, such as “Adverse Event Rate: not started”.',
    `The same control as on the Biomarkers tab: ${q(`${rbqm.off.say} · ${rbqm.off.meta} · ${rbqm.off.button}`)}.`,
    `One line in the body, ${q(rbqm.need)}, and what the study supports: ${q(rbqm.supports)}`,
    'The tab’s status label, on the corner of its card.'
  ]
})}
${fig({
  name: 'rbqm-running',
  alt: 'The RBQM tab while R starts. The control reads a step number and name with six segments filling and a count of seconds. The body lists six steps, the first ticked.',
  cap: `After one press: ${q(rbqm.running.body)}`,
  legend: [
    `The control names the step and counts it: ${q(rbqm.running.say)}, with six segments and the seconds.`,
    `The body ticks six steps off: ${rbqm.running.steps.map((step) => esc(step)).join('; ')}. Only one is called the long one.`,
    'Each metric that will run turns in the row.'
  ]
})}
${swap({
  id: 'rbqm-done',
  before: 'rbqm-done-110',
  after: 'rbqm-done',
  altBefore: 'Release 1.10: the RBQM tab after the run. A box holds a paragraph of timings and versions; the site overview table spreads three metric columns across the whole card and its last row is cut through.',
  altAfter: 'Release 1.11: the RBQM tab after the run. The row shows three metrics ticked, the control is an R ready chip, one line says what ran, and the site overview is a narrow table with a key beside it.',
  cap: 'After the run, on the pilot study.',
  was: `Release 1.10. The run box outweighs the result: ${q(rbqm110.done)} The table is ${rbqm110.table.width} pixels wide, with a column as wide as ${Math.max(...rbqm110.table.widths)} pixels, and its last row is cut through.`,
  legend: [
    'Three metrics ran, each with a green tick; five did not, each with a grey bar. Grey, because missing data is not an error.',
    `The control is now a chip, ${q(rbqm.chip)}.`,
    `One line says what ran: ${q(rbqm.done.replace(/ Run details$/, ''))} It ends with a link to Run details.`,
    `The heading counts the sites: ${q(rbqm.count)}. The last row in view is whole.`,
    `No number or flag column is wider than 100 pixels, so the table is ${rbqm.table.table_width} pixels wide in a card of ${rbqm.table.card_width}.`,
    `A key to the flags: ${rbqm.key.map((line) => esc(line)).join('; ')}. ${q(rbqm.key_note)}`
  ]
})}
${fig({
  name: 'rbqm-details',
  alt: 'Run details, open under the R ready chip: the steps with their sizes, what R was handed, which metrics did not run and why, the versions of R and gsm’s packages, R’s warnings and a Run again button.',
  cap: `Run details, behind the chip and closed until asked for: ${q(rbqm.details.says)} ${q(rbqm.details.total[0])}`,
  legend: [
    `The panel’s headings are ${rbqm.details.titles.map((title) => q(title)).join(', ')}. ${q(rbqm.details.buttons[0])} sits at its foot.`
  ]
})}

  <h3>One page at a time</h3>
  <p class="what">The body shows the site overview or one metric’s two charts, never both. A metric opens from the row or from a cell of the overview, and has an address of its own.</p>
${fig({
  name: 'rbqm-metric',
  alt: 'The Study Discontinuation Rate’s page on the RBQM tab: a scatter plot and a bar chart, with its item marked in the row.',
  cap: `A click on a cell of the SDSC column opened ${q(rbqm.metric.name)} at the address ${q(rbqm.metric.address)}: ${rbqm.metric.charts} charts and no table.`,
  legend: ['The metric’s item is marked in the row.', `Its name and state: ${q(rbqm.metric.says)}.`]
})}
${fig({
  name: 'rbqm-cannot',
  alt: 'The Screen Failure Rate’s page: in place of charts, a sentence saying it needs Raw_ENROLL.csv, which is not loaded, and a link to change the data on the Data tab.',
  cap: `A metric that did not run has a page too (${q(rbqm.cannot.says)}).`,
  legend: [
    'Its item carries the grey bar.',
    `R’s own sentence, and where to go: ${q(rbqm.cannot.why)} ${q(rbqm.cannot.link)}`
  ]
})}

  <h3>All eight metrics, at ${study.table.rows} sites</h3>
  <p class="what">With the RBQM study chosen on the Data tab and R already running, the tab ran by itself: ${q(study.done.replace(/ Run details$/, ''))}</p>
${fig({
  name: 'rbqm-study',
  alt: 'The RBQM tab on the RBQM study: all eight metrics ticked in the row, and a site overview with eight metric columns that fills the card with no sideways scroll.',
  cap: 'The RBQM study: nine raw files in gsm’s format, for a synthetic study of 765 enrolled participants.',
  legend: [
    'All eight ran, and the row still fits beside the control.',
    `${q(study.count)}. With eight metrics the columns share the card evenly, the widest ${Math.max(...study.table.widths.slice(1))} pixels, and nothing scrolls sideways.`,
    `The Data tab names the study: ${q(data.study.tag)}.`
  ]
})}

  <h3>On a phone</h3>
  <div class="phones">
${fig({
  name: 'phone-rbqm',
  alt: 'The RBQM tab at phone width after the run: the outcome line and the site overview table fitted to the screen.',
  cap: `The overview at 390 pixels wide. Nothing scrolls sideways, and the table’s headings are ${rbqmPhone.smallest_heading} pixels.`,
  max: 300
})}
${fig({
  name: 'phone-rbqm-metric',
  alt: 'A metric’s page at phone width: its name and the top of its scatter plot.',
  cap: 'A metric’s page, opened from a cell.',
  max: 300
})}
  </div>
</section>`;

// ---------------------------------------------------------------- 05
const s5 = `${section(
  '05',
  'data',
  'files on the Data tab',
  'All files come in on the Data tab',
  'There is now one place to load files. The Data tab recognises raw files in gsm’s format and keeps them as they are, one card says how many RBQM metrics the loaded data supports, and the RBQM tab’s own file box is gone.',
  [
    `Requirement: all files come in on the Data tab (${a(hub(406), 'obot.roadmap #406')})`,
    `Pull request: gsm raw files recognised there, one RBQM card, the file box gone (${a(pull(299), 'safety.viz #299')})`,
    `As drawn in ${mockup(6)}`
  ]
)}
${swap({
  id: 'data',
  before: 'data-raw-110',
  after: 'data-raw',
  altBefore: 'Release 1.10: the Data tab after three gsm raw files were dropped. Raw_SUBJ.csv is read as the subject-level file with columns to map, Raw_AE.csv as the adverse events file, and Raw_PD.csv is not placed.',
  altAfter: 'Release 1.11: the Data tab after the same three files were dropped. An RBQM card says This data supports 4 of 8 metrics, with an icon for each metric and the reasons for the four that cannot run; each file has a card naming its raw domain.',
  cap: 'Three raw files dropped on the Data tab: Raw_SUBJ.csv, Raw_AE.csv and Raw_PD.csv.',
  was: `Release 1.10, with the same three files. They are taken for a study’s standard files: ${data110.loaded.map((file) => q(file)).join(', ')}. The RBQM tab then said ${q(data110.rbqm_summary)}`,
  legend: [
    `The Data tab names what is loaded: ${q(data.own.tag)}.`,
    `Said once: ${q(data.own.cleared[0])}`,
    `The RBQM card: ${q(data.own.card.say)} Its button, ${q(data.own.card.button)}, opens the tab.`,
    'An icon for each metric, the same icons as the tab’s row.',
    `${q(data.own.card.why_title)}, in R’s own words: ${data.own.card.why.map((line) => q(line)).join(' ')}`,
    `Step three now reads ${q(data.own.step_three[0])} (${q(data.own.step_three[1])}), and step two says ${q(data.own.step_two)}.`,
    `Each raw file keeps a card of its own, with the raw domain it was read as: ${q(data.own.raw_tags[0])}.`
  ]
})}
${fig({
  name: 'rbqm-own',
  alt: 'The RBQM tab after running on the three dropped files: four metrics ticked in the row and a site overview with four metric columns. There is no file box on the tab.',
  cap: 'The card’s button opens the RBQM tab, and one press runs the four metrics the files support.',
  legend: [
    `${q(data.own.done.replace(/ Run details$/, ''))}`,
    `The four that ran are ticked. The tab has no drop zone and no file box (${data.own.file_boxes} found); its line links to the Data tab.`
  ]
})}
${fig({
  name: 'data-pilot',
  alt: 'The Data tab on the pilot study. The RBQM card says This data supports 3 of 8 metrics, lists why five cannot run, and says which raw tables R makes from adsl.csv and adae.csv.',
  cap: 'On a study of standard files, the same card says which of gsm’s raw tables R makes from which file.',
  legend: [
    `${q(data.pilot.say)} ${data.pilot.lines.map((line) => q(line)).join(' ')}`,
    `${q(data.pilot.button)} opens the tab.`
  ]
})}
${fig({
  name: 'data-study',
  alt: 'The Data tab with the RBQM study chosen: the RBQM card says This data supports 8 of 8 metrics, above nine raw file cards.',
  cap: `The RBQM study, chosen from the study menu: ${data.study.raw_tags.length} raw file cards.`,
  legend: [`${q(data.study.card.say)}`]
})}
  ${list([
    'A file is taken for a gsm raw file only when its name starts with “Raw_” or its columns match exactly one raw domain. Everything else is read as a study file, as before.',
    `The “Renamed columns” demo study has a file called ae.csv. It is still read as the adverse events file, and that study’s tabs count what they counted in release 1.10: ${data.renamed.tabs.map((tab) => esc(tab)).join(', ')}.`,
    `A raw file that is not CSV is refused with a sentence: ${q(data.not_csv.notes.at(-1))}`,
    `The drop zone says it takes both: ${q(data.drop_note)}`,
    'Reading gsm raw files in the app is an interim path, so this is the least that moving the loading needed. Your words on 9 October 2026: “I’m hoping to move to RAW -> SDTM -> ADaM for everything. Not in this releases though”.'
  ])}
  <div class="phones">
${fig({
  name: 'phone-data',
  alt: 'The Data tab’s RBQM card at phone width, fitted to the screen.',
  cap: 'The RBQM card at 390 pixels wide. Nothing scrolls sideways.',
  max: 300
})}
  </div>
</section>`;

// ---------------------------------------------------------------- 06
const s6 = `${section(
  '06',
  'broken',
  'nothing looks broken',
  'Nothing looks broken',
  'The review of release 1.10 found defects that were not matters of taste. Each is fixed in the chart or the site file that caused it, and a new browser test walks the path the keynote will take.',
  [
    `Requirement: nothing looks broken (${a(hub(407), 'obot.roadmap #407')})`,
    `Pull requests: the docs home page’s count (${a(pull(289), 'safety.viz #289')}), the waterfall’s titles and three phone-width defects (${a(pull(294), 'safety.viz #294')}), the demo path’s test (${a(pull(301), 'safety.viz #301')}), and the count again (${a(pull(303), 'safety.viz #303')})`,
    `Found in ${a('https://jwildfire.github.io/obot.roadmap/reports/sv-demo-design-review-2026-10-09/', 'the design review of release 1.10')}`
  ]
)}
  <h3>The Hepatic ALT Waterfall’s titles fit a long arm name</h3>
${swap({
  id: 'titles',
  before: 'waterfall-titles-110',
  after: 'waterfall-titles',
  altBefore: 'Release 1.10: the strip of titles over the waterfall. The active arm’s long title prints across the placebo arm’s, and the title of the right-hand panel is squeezed too small to read.',
  altAfter: 'Release 1.11: the same strip. The long arm name is cut short with three dots, its count is kept whole, and no title touches another.',
  cap: `The titles over the chart, on the pilot study. The long name is cut short with its count kept whole, and hovering shows all of it: ${q(defects.waterfall.at(-1).hover)}`,
  was: 'Release 1.10. The active arm’s title is every arm that is not placebo, joined together. It prints across the placebo title, and at the right it is squeezed too small to read.'
})}

  <h3>On a phone, a wide table scrolls inside its own box</h3>
  <p class="what">In release 1.10 a table wider than the screen pushed the whole page sideways, or was cut off where it could not be reached. Each page now lays out at the screen’s width.</p>
  <div class="phones">
${swap({
  id: 'phone-qt',
  before: 'phone-qt-110',
  after: 'phone-qt',
  altBefore: 'Release 1.10: the QT Explorer in the demo app at phone width. The whole page is laid out wider than the screen, so everything is shrunk.',
  altAfter: 'Release 1.11: the QT Explorer in the demo app at phone width. The page fits the screen and the table scrolls inside its own box.',
  cap: 'The QT Explorer’s table, in the demo app.',
  was: `Release 1.10. The page is laid out ${defects.phone_before.qt_app.laid_out} pixels wide on a 390-pixel screen.`,
  max: 300
})}
${swap({
  id: 'phone-api',
  before: 'phone-api-110',
  after: 'phone-api',
  altBefore: 'Release 1.10: a chart’s API reference page at phone width, laid out far wider than the screen.',
  altAfter: 'Release 1.11: the same page at phone width. It fits the screen and each table scrolls inside its own box.',
  cap: 'A chart’s API reference page, on the docs site.',
  was: `Release 1.10. The page is laid out ${defects.phone_before.api.laid_out} pixels wide on a 390-pixel screen.`,
  max: 300
})}
  </div>
  <div class="scroll">
  <table>
    <thead><tr><th>Page, at 390 pixels wide</th><th>Laid out, 1.10</th><th>Laid out, 1.11</th><th>Its widest table</th><th>The box it scrolls in</th></tr></thead>
    <tbody>
${phoneRows
  .map(
    ([name, key]) =>
      `      <tr><td>${name}</td><td class="n">${defects.phone_before[key].laid_out} px</td><td class="n">${defects.phone[key].laid_out} px</td><td class="n">${defects.phone[key].widest_table} px</td><td class="n">${defects.phone[key].its_box} px</td></tr>`
  )
  .join('\n')}
    </tbody>
  </table>
  </div>

  <h3>The docs home page’s count</h3>
  ${list([
    `The docs home page’s description counts the site’s charts from its configuration. It begins ${q(`${homeWord} classic clinical-safety graphics`)}, where release 1.10’s began ${q(`${homeWord110} classic clinical-safety graphics`)}. A Prototype is not counted.`,
    `The capture for this page found the count wrong again: the dev site read ${q(github.count_fix.read_before)}, with the Prototype counted. It was fixed the same day, ${day(github.pulls[303].at)} (${a(pull(303), 'the fix, safety.viz #303')}), and the script now holds the page to ${q(homeWord)}.`
  ])}

  <h3>A test walks the keynote’s demo path</h3>
  ${list([
    `A browser test now walks the path the keynote will take, on the deployed dev site at the size of a shared screen, with real R. It fails on any console error or failed request. Its task is ${state('safety.viz#287')} (${a(task(287), 'safety.viz #287')}; ${a(pull(301), 'its pull request, safety.viz #301')}).`,
    `It is run with <code>${esc(path8.command)}</code>. Its run on GitHub passed (${a(path8.run.url, 'the run')}), and its ${path8.screenshots.length === 9 ? 'nine' : path8.screenshots.length} screenshots are kept with the app’s evidence (${a(EVIDENCE, 'the screenshots')}).`,
    `The eight steps it walks, and their order, are yours to change: they are listed in ${a('#rule', 'the box at the top')}.`
  ])}
</section>`;

// ---------------------------------------------------------------- 07, 08, closing
// Where the seven requirements stand, said from their state on the hub when captured.
const firstOpen = state('obot.roadmap#402') === 'open';
const standing =
  closed.length === 7
    ? `All seven requirements are closed (${a('#close', 'the table at the foot of this page')}).`
    : closed.length === 6 && firstOpen
      ? `Six of the seven requirements are closed. The first, the first screen (${a(hub(402), 'obot.roadmap #402')}), closes when the footnote merges (${a('#close', 'the table at the foot of this page')}).`
      : `${closed.length} of the seven requirements are closed (${a('#close', 'the table at the foot of this page')}).`;
const s7 = `${section(
  '07',
  'standards',
  'the standards written down',
  'The standards this release set are written down',
  'What the release decided about how an app should look and read is now written where the next session will read it, so that the next chart or tab is built the same way. Documents and one skill; nothing in the app.',
  [`Requirement: the standards are written into the scaffold (${a(hub(408), 'obot.roadmap #408')})`]
)}
  ${list([
    `The hub’s developer guidelines carry the status ladder and how anything a person looks at is designed and checked (${a('https://github.com/jwildfire/obot.roadmap/blob/main/docs/developer-guidelines.md#status-ladder', 'the status ladder')}; ${a('https://github.com/jwildfire/obot.roadmap/blob/main/docs/developer-guidelines.md#designing-and-checking-what-people-look-at', 'designing and checking what people look at')}). The label’s panel in the app links the first.`,
    `safety.viz’s contributing guide has a new section, “Demo app conventions”, and its porting skill carries the same (${a('https://github.com/jwildfire/safety.viz/blob/dev/CONTRIBUTING.md#demo-app-conventions', 'the section')}; ${a(pull(301), 'merged in safety.viz #301')}; ${a(task(288), 'the task, safety.viz #288')}).`,
    `The session skill tells a session to build a visible change from its mockup and look at it in a browser before the task closes (${a('https://github.com/jwildfire/obot.agent/issues/361', 'the task, obot.agent #361')}).`,
    standing
  ])}
</section>`;

const s8 = `
<div class="cut"><span>08 <em>· what did not change</em></span></div><section id="same">
  <div class="hd"><h2>What did not change</h2></div>
  <p class="what">Release 1.11 changes how the app reads. It does not change what the app works out.</p>
  ${list([
    'No chart is added and no metric is added. The app still has 18 charts on five tabs and eight site metrics.',
    `Nothing computed changes. safety.viz has a browser test that holds every row R returns for the eight metrics on the RBQM study to the rows desktop R returns, to eight decimal places. It is in the check every pull request must pass before it merges, and it passed at each merge of this release with desktop R’s rows untouched (${a(`${hub(404)}#issuecomment-6098177054`, 'the R control’s closing comment says so for its merge')}).`,
    `What that test rests on is release 1.10’s. Of the ${github.since_110.files} files changed since the release 1.10 tag, one is among desktop R’s stored rows, the R that runs the metrics and gsm’s copied workflow files: the tab’s file of expected rows gained ${github.since_110.r_files[0].added} lines, the case for the three files dropped on the Data tab, and lost ${github.since_110.r_files[0].removed === 0 ? 'none' : github.since_110.r_files[0].removed}.`,
    `The versions are the same on both sites: ${versions.map(([term, said]) => `${esc(term === 'R' ? 'R' : term.toLowerCase() === 'gsm' ? 'gsm’s packages' : term.toLowerCase())}: ${esc(said)}`).join('; ')}. Release 1.10’s run box named the same ones.`,
    `The pilot study gives the same answer on both sites: ${rbqm.table.rows} sites, with site ${rbqm.table.first[0][0]} first at ${rbqm.table.first[0][1]} enrolled and ${rbqm.table.first[0][2]} red flag.`,
    `Starting R for the RBQM tab still downloads about 55 MB, once: ${rbqm.megabytes.total} MB on this capture, of which ${rbqm.megabytes['webr.r-wasm.org']} MB is R, ${rbqm.megabytes['repo.r-wasm.org']} MB its packages and ${rbqm.megabytes.page} MB gsm’s packages from the page’s own address.`,
    `Files still never leave the browser, and the footer’s sentence is word for word release 1.10’s: ${q(first.footer)}`
  ])}
</section>`;

const closing = `
<div class="cut"><span>before you approve</span></div><section id="close">
  <h3 style="margin-top:0">Where the seven requirements stand</h3>
  <div class="scroll">
  <table>
    <thead><tr><th>Requirement</th><th>On this page</th><th>On the hub, as captured</th></tr></thead>
    <tbody>
${[
  [402, 'The first screen', '#first', '01'],
  [403, 'The status ladder', '#status', '02'],
  [404, 'The R control', '#r', '03'],
  [405, 'The RBQM tab', '#rbqm', '04'],
  [406, 'Files on the Data tab', '#data', '05'],
  [407, 'Nothing looks broken', '#broken', '06'],
  [408, 'The standards written down', '#standards', '07']
]
  .map(
    ([number, name, anchor, ref]) =>
      `      <tr><td>${name} (${a(hub(number), `obot.roadmap #${number}`)})</td><td>${a(anchor, `section ${ref}`)}</td><td>${state(`obot.roadmap#${number}`)}${number === 402 && firstOpen ? ': it closes when the footnote merges' : ''}</td></tr>`
  )
  .join('\n')}
    </tbody>
  </table>
  </div>
  <div class="close" style="margin-top:40px">
    <div>
      <h3>What is not in this release</h3>
      <ul>
        <li>One R shared by the Biomarkers tab and the RBQM tab (${a(hub(414), 'the follow-up requirement, obot.roadmap #414')}).</li>
        <li>A page on the docs site for the RBQM tab, which its footnote would then link (${a(hub(415), 'the follow-up requirement, obot.roadmap #415')}).</li>
        <li>More RBQM metrics, country-level metrics, the time series chart and the report: on the backlog, and no part of this objective.</li>
        <li>One set of treatment-arm colours across charts, and one casing for chart names: left out by the objective.</li>
      </ul>
    </div>
    <div>
      <h3>Where to look further</h3>
      <ul>
        <li>${a(DEMO, 'The demo app on the dev site')}, and ${a(n.base, 'the docs site')}.</li>
        <li>${a('https://github.com/jwildfire/safety.viz/blob/dev/NEWS.md', 'The release notes')}, which are short; this page carries the detail.</li>
        <li>${a(hub(401), 'The objective: a demo app ready to show')}, with its seven requirements.</li>
        <li>${a(DESIGN, 'The design the release was built to')}: six mockups, approved on 9 October 2026.</li>
        <li>${a('https://jwildfire.github.io/obot.roadmap/reports/sv-v1.10-demo/', 'The demo page of release 1.10')}, for what the RBQM tab computes and whose code runs in R.</li>
      </ul>
    </div>
  </div>
</section>

<footer>
  <p>Pictures taken ${day(captured)} with Playwright in headless Chromium, running real R in the browser. Release 1.11 is the dev site, ${a(n.base, n.base.replace('https://', ''))}, whose branch stood at ${a(`https://github.com/jwildfire/safety.viz/commit/${github.dev.sha}`, github.dev.sha.slice(0, 7))} when captured; release 1.10 is the released site, ${a(n.before, n.before.replace('https://', ''))}. Stills are 1,280 by 800 pixels at 1.5 times, and 390 by 844 for a phone. The pilot study is 254 participants from the public CDISC pilot study; the RBQM study is synthetic, 765 enrolled participants at 150 sites. No real participant appears. How each picture and number was made is in ${a('https://github.com/jwildfire/obot.roadmap/blob/main/reports/sv-v1.11-demo/README.md', 'the README beside this page')}.</p>
  <hr>
  <p>This page was drafted by Claude Code using Opus 5.5.</p>
</footer>

</div>
</body>
</html>
`;

const page = [head, masthead, s1, s2, s3, s4, s5, s6, s7, s8, closing].join('\n');
if (/undefined|\[object Object\]|NaN/.test(page.replace(/<style>[\s\S]*?<\/style>/, '')))
  throw new Error('The page holds a value the capture did not read: look for “undefined”, “NaN” or “[object Object]”.');
writeFileSync(path.join(here, 'index.html'), page);
console.log(`index.html written: ${held} of ${checks.length} checks held, ${Object.keys(n.stills).length} stills.`);
