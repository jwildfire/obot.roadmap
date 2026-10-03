import { chromium } from '@playwright/test';
import { readFileSync, writeFileSync } from 'node:fs';
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
await p.goto('https://jwildfire.github.io/safety.viz/dev/demo/#data'); await p.evaluate('window.__safetyVizApp.ready'); await p.waitForTimeout(1500);
const t = await p.evaluate(() => document.body.innerText);
const hits = t.match(/[^\n]*\bof 17\b[^\n]*/g); const ver = t.match(/[^\n]*1\.8\.0[^\n]*/g);
console.log(JSON.stringify({ hits, ver }));
const f = process.argv[2]; const n = JSON.parse(readFileSync(f, 'utf8')); n.data_view_of_17 = hits; n.app_version_lines = ver; writeFileSync(f, JSON.stringify(n, null, 2) + '\n');
await b.close();
