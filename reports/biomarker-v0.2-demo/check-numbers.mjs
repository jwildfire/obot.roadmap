// Holds the live numbers in capture-numbers.json to desktop R's in desktop-r.json:
// each value desktop R computed is formatted as the chart prints it and looked
// for in the text the page showed.   node check-numbers.mjs
import { readFileSync } from 'node:fs';
const c = JSON.parse(readFileSync(new URL('./capture-numbers.json', import.meta.url)));
const r = JSON.parse(readFileSync(new URL('./desktop-r.json', import.meta.url)));
const sig = (x, d = 4) => Number(Number(x).toPrecision(d)).toString();
const p3 = (x) => (x < 0.001 ? 'p < 0.001' : 'p = ' + x.toFixed(3));
const checks = [];
const has = (label, hay, needle) => checks.push([label, hay.includes(needle), needle]);
const ct = r.crosstab_response_crp, ca = r.crosstab_arm_response;
has('arm by response p', c.crosstab_default.statistics, p3(ca.chisq_p));
for (const row of ct.counts) for (const k of ['low', 'high']) has(`count ${row._row} ${k}`, c.crosstab.table, `\n${row[k]}\n`);
for (const row of ct.row_percent) for (const k of ['low', 'high']) has(`percent ${row._row} ${k}`, c.crosstab.table, row[k].toFixed(1) + '%');
has('median cut', c.crosstab.footnote_hint, String(r.crp_cut.median));
has('chi-square p', c.crosstab.statistics, p3(ct.chisq_p));
has('chi-square method', c.crosstab.statistics, ct.chisq_method);
has('Fisher p', c.crosstab.fisher, p3(ct.fisher_p));
has('odds ratio', c.crosstab.fisher, `${sig(ct.odds_ratio)}, 95% confidence interval ${sig(ct.or_ci[0])} to ${sig(ct.or_ci[1])}`);
has('listing n', c.crosstab_listing.cell, r.listing_nonresponder_high.n + ' participants');
for (const id of r.listing_nonresponder_high.first_ten) has('listed ' + id, c.crosstab_listing.listing_head, id);
const surv = (s, cap, lab) => {
  has(lab + ' counts', cap.statistics, `n = ${s.n.high}, ≤ ${s.cut} n = ${s.n.low}`);
  has(lab + ' median low', cap.statistics, `Median (≤ ${s.cut}): ${s.median[0]}, 95% confidence interval ${s.lower[0]} to ${s.upper[0] === 'NA' ? 'not reached' : s.upper[0]}`);
  has(lab + ' median high', cap.statistics, `Median (> ${s.cut}): ${s.median[1]}, 95% confidence interval ${s.lower[1]} to ${s.upper[1]}`);
  has(lab + ' hazard ratio', cap.statistics, `${sig(s.hazard_ratio)}, 95% confidence interval ${sig(s.hr_ci[0][0])} to ${sig(s.hr_ci[0][1])}`);
  has(lab + ' log-rank', cap.statistics, p3(s.logrank_p));
  has(lab + ' at risk low', cap.risk.replace(/\s+/g, ' '), s.at_risk['g=low'].join(' '));
  has(lab + ' at risk high', cap.risk.replace(/\s+/g, ' '), s.at_risk['g=high'].join(' '));
};
surv(r.survival_crp_median, c.survival, 'survival at the median');
surv(r.survival_crp_dragged, c.survival_dragged, 'survival dragged');
surv(r.survival_crp_median, c.screen_hazard_drill, 'screen row opened');
const rows = Object.fromEntries(c.screen_hazard.rows.map((x) => [x.biomarker, x]));
const order = c.screen_hazard.rows.map((x) => x.biomarker).join(), rorder = r.screen_hazard.map((x) => x.biomarker).join();
checks.push(['screen order', order === rorder, rorder]);
for (const s of r.screen_hazard) {
  const x = rows[s.biomarker];
  checks.push(['screen ' + s.biomarker,
    x.value === `${sig(s.hr)} (${sig(s.lower)} to ${sig(s.upper)})` && x.p[0] === p3(s.p) && x.p[1] === p3(s.p_bh) && x.n === `${s.n_high} / ${s.n_low}`,
    `${x.value} ${x.p} ${x.n}`]);
}
checks.push(['statistics CSV log-rank p', c.output.downloads.statistics.first[0].includes(String(r.survival_crp_median.logrank_p).slice(0, 14)), r.survival_crp_median.logrank_p]);
checks.push(['table CSV rows', c.output.downloads.table.lines - 1 === r.sizes.participants, c.output.downloads.table.lines]);
const bad = checks.filter((x) => !x[1]);
console.log(`${checks.length} checks, ${bad.length} failed`);
for (const b of bad) console.log('FAIL', b);
process.exitCode = bad.length ? 1 : 0;
