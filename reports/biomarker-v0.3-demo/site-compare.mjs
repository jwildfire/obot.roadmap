// Side-by-side pictures of bio.viz's site and the matching safety.viz page, at 1280px and 390px.
import { createRequire } from 'node:module';
import fs from 'node:fs';
const require = createRequire('/Users/jwildfire/Documents/obot2/bio.viz/.claude/worktrees/43-cut/package.json');
const { chromium } = require('playwright');
const BV = process.argv[2] || 'https://jwildfire.github.io/bio.viz/dev/';
const SV = 'https://jwildfire.github.io/safety.viz/dev/';
const pairs = [
  ['gallery', 'gallery/', ''],
  ['demo', 'group-comparison/', 'results-over-time/'],
  ['evidence', 'group-comparison/evidence.html', 'results-over-time/evidence.html'],
  ['api', 'group-comparison/api.html', 'results-over-time/api.html'],
];
const sizes = [['desktop', 1280, 800], ['phone', 390, 844]];
const browser = await chromium.launch();
const facts = [];
for (const [label, w, h] of sizes) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
  for (const [name, b, s] of pairs) {
    const shots = [];
    for (const [who, url] of [['bio.viz', BV + b], ['safety.viz', SV + s]]) {
      const page = await ctx.newPage();
      const errors = [];
      page.on('pageerror', (e) => errors.push(String(e)));
      const res = await page.goto(url, { waitUntil: 'networkidle', timeout: 90000 });
      await page.waitForTimeout(name === 'demo' ? 6000 : 1200);
      const m = await page.evaluate(() => ({
        sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth,
        font: getComputedStyle(document.body).fontFamily.split(',')[0],
        header: !!document.querySelector('header'), footer: (document.querySelector('footer')?.innerText || '').slice(0, 80),
        version: (window.BioViz && window.BioViz.version) || null,
      }));
      facts.push({ label, name, who, url, status: res.status(), ...m, errors: errors.length });
      const f = `raw-${label}-${name}-${who}.png`;
      await page.screenshot({ path: f });
      shots.push([who, f, url]);
      await page.close();
    }
    const page = await ctx.newPage();
    await page.setViewportSize({ width: w * 2 + 60, height: h + 80 });
    const img = (f) => 'data:image/png;base64,' + fs.readFileSync(f).toString('base64');
    await page.setContent(`<body style="margin:0;background:#fff;font:14px/1.3 system-ui;color:#222">
      <div style="display:flex;gap:20px;padding:20px">
      ${shots.map(([who, f, url]) => `<div><div style="height:28px;font-weight:600">${who} <span style="font-weight:400;color:#666">${url.replace('https://jwildfire.github.io/', '')}</span></div><img src="${img(f)}" width="${w}" height="${h}" style="display:block;border:1px solid #ccc"></div>`).join('')}
      </div></body>`);
    await page.screenshot({ path: `site-${name}-${label}.jpg`, type: 'jpeg', quality: 78 });
    await page.close();
  }
  await ctx.close();
}
await browser.close();
fs.writeFileSync('facts.json', JSON.stringify(facts, null, 1));
for (const f of facts) console.log(f.label, f.name, f.who, f.status, 'scroll', f.sw, '/', f.cw, f.font, 'err', f.errors, f.version || '');
