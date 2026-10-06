// Holds the numbers the demo page prints to desktop R's in desktop-r.json:
//   1. each value desktop R computed is formatted as the chart prints it and
//      looked for in the text the live page showed (capture-numbers.json);
//   2. what gsm.bio's Analyze_GroupDifferenceBy() answered (gsm-bio.json) is
//      held to desktop R's numbers to 1 part in 10^8;
//   3. each of those formatted values is looked for in index.html, so a number
//      typed on the page that desktop R did not compute fails here.
//   node check-numbers.mjs
import { readFileSync } from 'node:fs';
const here = (f) => readFileSync(new URL('./' + f, import.meta.url), 'utf8');
const c = JSON.parse(here('capture-numbers.json'));
const r = JSON.parse(here('desktop-r.json'));
const g = JSON.parse(here('gsm-bio.json'));
const page = here('index.html').replace(/<[^>]+>/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').replace(/\s+/g, ' ');
const sig = (x, d = 4) => Number(Number(x).toPrecision(d)).toString();
const p3 = (x) => (x < 0.001 ? 'p < 0.001' : 'p = ' + x.toFixed(3));
const checks = [];
const ok = (label, pass, shown) => checks.push([label, !!pass, shown]);
const has = (label, hay, needle) => ok(label, hay.includes(needle), needle);
const onPage = (label, needle) => ok('page prints ' + label, page.includes(needle), needle);
const near = (a, b) => Math.abs(a - b) <= 1e-8 * Math.max(1, Math.abs(b));

// ---- the study
ok('12 tiles, one per biomarker', c.tiles.tiles.length === r.sizes.biomarkers, c.tiles.tiles.length);
has('the visits in the tiles title', c.tiles.titles, r.visits.join(', '));
ok('the study has no unscheduled visit', r.unscheduled_by_default.length === 0 && c.unscheduled.study_note === 0, r.unscheduled_by_default);
ok('the tiles asked R for nothing', c.tiles.r_requests_before_a_tile_is_opened.length === 0 && c.tiles_means.r_requests.length === 0 && c.over_time_r_requests_before === 0 && c.over_time_r_requests_after > 0, c.over_time_r_requests_after);
onPage('participants', `${r.sizes.participants} participants`);
onPage('biomarkers', `${r.sizes.biomarkers} biomarkers`);

// ---- one biomarker over time: the counts and R's test under each visit
const overTime = (label, rows, cap, adjusted = null) => {
  const tested = rows.filter((x) => x.tested);
  for (const [group, key] of [['Placebo', 'n_placebo'], ['Treatment', 'n_treatment']]) {
    const shown = cap.n.find((x) => x.group === group).n.join(', ');
    ok(`${label}: n ${group}`, shown === rows.map((x) => 'n = ' + x[key]).join(', '), shown);
  }
  for (const x of rows) {
    const cell = cap.test.find((t) => t.visit === x.visit);
    if (!x.tested) { ok(`${label}: ${x.visit} not tested`, cell.text === 'not tested', cell.text); continue; }
    const printed = adjusted ? x[adjusted] : x.p;
    ok(`${label}: ${x.visit}`, cell.text === p3(printed), `${cell.text} / ${printed}`);
    if (adjusted) has(`${label}: ${x.visit} both p-values`, cell.title, `${p3(x.p)} unadjusted, ${p3(printed)} adjusted across ${tested.length} visits`);
    has(`${label}: ${x.visit} counts`, cell.title, `Placebo n = ${x.n_placebo}, Treatment n = ${x.n_treatment}`);
  }
  has(`${label}: visits tested`, cap.line, `${tested.length} visits tested`);
  if (cap.notes) {
    const drawn = rows.map((x) => x.n_placebo + x.n_treatment);
    has(`${label}: drawn at each visit`, cap.notes, `${Math.min(...drawn)} to ${Math.max(...drawn)} of ${r.sizes.participants} participants drawn at each visit`);
    const sum = (k) => rows.reduce((a, x) => a + x[k], 0);
    has(`${label}: left out`, cap.notes, `${sum('no_result')}, No result at the visit; ${sum('missing')}, Result at the visit is missing or not a number`);
  }
};
overTime('IL-6', r.il6, c.over_time_il6);
overTime('D-dimer unadjusted', r.ddimer, c.over_time_ddimer);
overTime('D-dimer Holm', r.ddimer, c.over_time_ddimer_holm, 'p_holm');
overTime('D-dimer Benjamini-Hochberg', r.ddimer, c.over_time_ddimer_bh, 'p_bh');
has('Holm named by the row', c.over_time_ddimer_holm.test_head, 'adjusted (Holm)');
has('Holm named by R', c.over_time_ddimer_holm.line, "p.adjust(method = 'holm')");
has('Benjamini-Hochberg named by R', c.over_time_ddimer_bh.line, "p.adjust(method = 'BH')");
has('on a phone, the same row', c.over_time_phone.test_row.replace(/\s+/g, ' '), r.il6.map((x) => p3(x.p)).join(' '));
ok('on a phone, no sideways scroll', c.tiles_phone.scroll_width === 390 && c.over_time_phone.scroll_width === 390 && c.site.phone_scroll_width === 390, c.over_time_phone.scroll_width);
const list = (rows, k) => rows.map((x) => x[k]).join(', ');
const ps = (rows, k) => rows.filter((x) => x.tested).map((x) => p3(x[k]).replace('p = ', '')).join(', ');
onPage('IL-6 Placebo counts', list(r.il6, 'n_placebo'));
onPage('IL-6 Treatment counts', list(r.il6, 'n_treatment'));
onPage('IL-6 Baseline p', p3(r.il6[0].p));
onPage('D-dimer unadjusted', ps(r.ddimer, 'p'));
onPage('D-dimer Holm', ps(r.ddimer, 'p_holm'));
onPage('D-dimer Benjamini-Hochberg', ps(r.ddimer, 'p_bh'));

// ---- one visit: IL-6 at Week 4
const w4 = r.il6.find((x) => x.visit === 'Week 4');
const difference = (x) => `${sig(x.difference)}, 95% confidence interval ${sig(x.lower)} to ${sig(x.upper)}`;
has('one visit: p and counts', c.one_visit.statistics, `${w4.method}: ${p3(w4.p)} (Placebo n = ${w4.n_placebo}, Treatment n = ${w4.n_treatment})`);
has('one visit: difference in means', c.one_visit.statistics, `Difference in means (Placebo - Treatment): ${difference(w4)}`);
has('one visit: drawn', c.one_visit.notes, `${w4.n_placebo + w4.n_treatment} of ${r.sizes.participants} participants drawn`);
has('one visit: no result', c.one_visit.notes, `${w4.no_result} left out: No result at the visit`);
has('one visit: missing', c.one_visit.notes, `${w4.missing} left out: Result at the visit is missing or not a number`);
ok('one visit: the trail', c.one_visit.trail.join(' > ') === 'All biomarkers > IL-6 over time > Week 4' && c.one_visit.tiles_after_two_steps_up === r.sizes.biomarkers, c.one_visit.trail);
onPage('one visit difference', `${sig(w4.difference)} (${sig(w4.lower)} to ${sig(w4.upper)})`);
onPage('one visit drawn', `${w4.n_placebo + w4.n_treatment} of ${r.sizes.participants}`);

// ---- unscheduled visits: Week 2 named as one
overTime('IL-6 without Week 2', r.il6_without_week_2, c.unscheduled.over_time);
has('the note names the visit', c.unscheduled.note, '1 unscheduled visit not drawn: Week 2');
ok('switched on, five visits again', c.unscheduled.switched_on.visits.join() === r.visits.join(), c.unscheduled.switched_on.visits);

// ---- Fisher's exact test of a table with a small column
const f = r.fisher_small;
for (const row of f.counts) for (const k of ['low', 'high']) has(`Fisher count ${row._row} ${k}`, c.fisher_small.table, `\n${row[k]}\n`);
for (const row of f.row_percent) for (const k of ['low', 'high']) has(`Fisher percent ${row._row} ${k}`, c.fisher_small.table, row[k].toFixed(1) + '%');
has('Fisher totals', c.fisher_small.table, `Total\t${f.column_totals.low}\t${f.column_totals.high}\t${r.sizes.participants}`);
has('Fisher p', c.fisher_small.statistics, `${f.method}: ${p3(f.p)}`);
const odds = `${sig(f.odds_ratio)}, 95% confidence interval ${sig(f.or_ci[0])} to ${sig(f.or_ci[1])}`;
has('Fisher odds ratio', c.fisher_small.statistics, odds);
has('R names the small column', c.fisher_small.statistics, `> 9.5 has ${f.column_totals.high}`);
has('chi-square withheld', c.fisher_small.chisq, `Not computed: CRP at Baseline, cut at 9.5 = > 9.5 has ${f.column_totals.high}. The minimum group size is 5`);
onPage('Fisher p', p3(f.p));
onPage('Fisher odds ratio', `${sig(f.odds_ratio)} (${sig(f.or_ci[0])} to ${sig(f.or_ci[1])})`);
onPage('Fisher counts', `${f.counts[0].low} and ${f.counts[0].high}`);
onPage('Fisher counts', `${f.counts[1].low} and ${f.counts[1].high}`);

// ---- gsm.bio: the saved widget with the network off, and the live reference page
overTime('widget, Holm', r.il6_change, c.widget.over_time, 'p_holm');
overTime('widget, unadjusted', r.il6_change, c.widget.over_time_unadjusted);
overTime('reference page', r.il6_change, c.reference.over_time);
const c4 = r.il6_change.find((x) => x.visit === 'Week 4');
has('widget one visit: difference in means', c.widget.one_visit.statistics, `Difference in means (Placebo - Treatment): ${difference(c4)}`);
has('widget one visit: p and counts', c.widget.one_visit.statistics, `${p3(c4.p)} (Placebo n = ${c4.n_placebo}, Treatment n = ${c4.n_treatment})`);
ok('widget: no request but the file', c.widget.network_requests.length === 0 && c.widget.errors.length === 0, c.widget.network_requests);
has('widget: an adjustment not named is unavailable', c.widget.over_time_bh.line, 'Statistics are unavailable for this view');
has('widget: stored with the page', c.widget.over_time.foot.join(' '), `gsm.bio ${g.gsm_bio}`);
onPage('widget one visit difference', `${sig(c4.difference)} (${sig(c4.lower)} to ${sig(c4.upper)})`);

// ---- Analyze_GroupDifferenceBy(), called from R, against desktop R
for (const [key, adjusted] of [['by_visit_none', 'p'], ['by_visit_holm', 'p_holm']]) {
  g[key].rows.forEach((row, i) => {
    const x = r.ddimer[i];
    ok(`${key} ${row.by}`,
      row.by === x.visit && row.n_1 === x.n_placebo && row.n_2 === x.n_treatment && near(row.estimate, x.difference) &&
        near(row.lower, x.lower) && near(row.upper, x.upper) && near(row.p_unadjusted, x.p) && near(row.p_value, x[adjusted]),
      `${row.by} ${row.p_unadjusted} ${row.p_value}`);
  });
}
for (const row of g.by_visit_holm.rows) {
  onPage(`function row ${row.by}`, [row.by, row.n_1, row.n_2, sig(row.estimate), sig(row.p_unadjusted), sig(row.p_value)].join(' '));
}

const bad = checks.filter((x) => !x[1]);
console.log(`${checks.length} checks, ${bad.length} failed`);
for (const b of bad) console.log('FAIL', b);
process.exitCode = bad.length ? 1 : 0;
