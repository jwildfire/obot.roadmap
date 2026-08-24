# key: "repo#n" -> (klass, target, why, evidence, conf, qw)
# klass: migrate | covered | obsolete | unassessed
# conf: "code" (checked against safety.viz source/requirement row) | "text" (judged from the issue and the port's architecture)
C = {}
def a(k, klass, target, why, ev="", conf="text", qw=""):
    C[k] = dict(klass=klass, target=target, why=why, ev=ev, conf=conf, qw=qw)

R = "RhoInc/ae-timelines"
a(f"{R}#44","covered","ae-timelines","The lifecycle API the port carries includes destroy().",
  "src/ae-timelines.js destroy(); docs/ae-timelines-coverage.md — 'lifecycle API supports init, setData, setSettings, render, resize, destroy'.","code")
a(f"{R}#45","migrate","ae-timelines","No module-level reset. One of nine identical Reset requests across seven trackers.",
  "Reset exists only as hep-explorer.js:722 'Reset Chart' and hep-waterfall.js:586 'Reset chart'; the lab modules ship Reset Limits (axis only).","code","QW3")
a(f"{R}#70","obsolete","—","Webcharts y-domain logic. The port is Chart.js; there is no Webcharts filter pipeline to update.","","text")
a(f"{R}#74","obsolete","—","The port's ae-timelines has no numeric y-axis to format: y is a category axis of participants, one labelled row each.",
  "src/ae-timelines/getScales.js buildScales — y: { type: 'category', labels: subjects }. If the legacy AE-count-over-time view is ever ported the request returns with it.","code")
a(f"{R}#79","obsolete","—","A defect in the legacy defaultSettings.js. The port normalises highlight through syncSettings and arrayifies field-list settings.",
  "src/ae-timelines/configure.js syncSettings / arrayify.","code")
a(f"{R}#81","obsolete","—","Chart bombing inside an R Markdown htmlwidget of the legacy renderer. The R binding is now gsm.safety's Widget_* wrappers over the committed bundle.","","text")
a(f"{R}#83","migrate","all modules","Filters accept only value_col and label in ten of twelve modules; start / all / multiple are still not settable.",
  "src/ae-timelines/configure.js filters — '{ value_col, label } specs' only; outlier-explorer and ae-explorer are the two that normalise a start.","code","QW1")
a(f"{R}#84","obsolete","—","A support question about loading a CSV into the legacy demo page, unanswered since 2024. The port ships live demos and a documented data contract.","","text")

R = "RhoInc/aeexplorer"
a(f"{R}#60","covered","ae-explorer","The port renamed exactly these settings to the *_col convention the issue asks for.",
  "src/ae-explorer/configure.js: id_col, major_col, minor_col, group_col, total_col, diff_col, pref_terms.","code")
a(f"{R}#61","covered","ae-explorer","details accepts column names or { value_col, label } objects.",
  "src/ae-explorer/configure.js details — 'column names or { value_col, label } specs'; AE-REG-024.","code")
a(f"{R}#75","migrate","ae-explorer","Filtering on the group column still leaves an empty Difference column; the port has the same shape.",
  "columnPlan(groupCount, settings) keys the Difference column off shown-group count, but a participant-type filter on group_col is not excluded.","code")
a(f"{R}#90","migrate","ae-explorer","Prevalence and difference marks at the same value overplot.",
  "src/ae-explorer/getPlugins.js draws the inline row plots; no jitter or offset is applied.","code")
a(f"{R}#100","obsolete","—","An internal rename of the legacy repo's root function to match a sibling package.","","text")
a(f"{R}#101","covered","ae-explorer","destroy() is part of the port's lifecycle API.",
  "src/ae-explorer.js destroy(); AE-API-001.","code")
a(f"{R}#102","migrate","ae-explorer","No module-level reset control.","See QW3.","code","QW3")
a(f"{R}#107","migrate","ae-explorer","Difference-column significance shading is still drawn when summarizing by event, where the test is not valid.",
  "summarize_by accepts 'event' (AE-REG-033/035) and the difference diamonds' alpha is not conditioned on it.","code")
a(f"{R}#118","obsolete","—","Bootstrap style collisions in a Rho internal application (CAT). The port scopes its own CSS under safety-* / sv-* class names.","","text")
a(f"{R}#138","obsolete","—","The legacy groups option, which the maintainers resolved to deprecate ('I kind of just want to deprecate the groups option'). The port derives group levels from the data and caps them with max_groups.",
  "src/ae-explorer/configure.js groups — 'Null derives every level found in group_col, sorted'.","code")
a(f"{R}#146","migrate","ae-explorer","Risk ratio / odds ratio as alternatives to the risk difference, and comparison against a single reference arm.",
  "Only a difference of proportions is implemented; no ratio metric and no reference-arm setting.","code")
a(f"{R}#147","migrate","ae-explorer","Nesting beyond two levels (SOC / PT).",
  "src/ae-explorer/configure.js is fixed at major_col / minor_col.","code")
a(f"{R}#148","migrate","ae-explorer","Live defect carried into the port: a single-level group column with group_cols:false and total_col:true draws no count column at all.",
  "Executed: columnPlan(1,{group_cols:false,total_col:true,diff_col:true}) returns {groupCols:false,totalCol:false,diffCol:false} — configure.js:186 totalCol = total_col && groupCount > 1.","code","QW4")
a(f"{R}#149","covered","ae-explorer","The port documents the difference-diamond statistic in the generated API reference and the requirement matrix rather than a wiki.",
  "requirements/aeexplorer.md AE-USER-013; _api/ae-explorer.json diff_col.","code")
a(f"{R}#153","migrate","ae-explorer","One empty-state message where two are needed — no AEs for the selected participants, versus no participants at all.",
  "src/ae-explorer.js:40 is the single constant; the participant denominator totalN() is already computed at ae-explorer.js:654.","code","QW5")
a(f"{R}#155","migrate","ae-explorer","No message for a study that has no AE records yet, as distinct from filters that exclude them all.",
  "Same single constant at src/ae-explorer.js:40.","code","QW5")

R = "RhoInc/paneled-outlier-explorer"
a(f"{R}#22","migrate","paneled-outlier-explorer (planned)","A per-participant wide listing — one section per participant, one row per measure, visits across the columns.",
  "The shared listing (src/histogram/listing.js) is long-format only: search, sort, paginate, CSV export over flat rows.","code")
a(f"{R}#36","migrate","outlier-explorer","Clear-highlighting control. One of nine Reset requests.","See QW3.","code","QW3")
a(f"{R}#37","covered","outlier-explorer","The participant note reports the shown-of-total count and updates on filter.",
  "docs/outlier-explorer-coverage.md — 'participant note reports N and % and updates on filter'.","code")
a(f"{R}#38","covered","outlier-explorer","Point tooltips report participant, result and time.",
  "docs/outlier-explorer-coverage.md — 'point tooltips list participant, result, and time'.","code")
a(f"{R}#39","migrate","outlier-explorer","Hover highlighting of a whole participant line. The port highlights on click, not on hover.",
  "docs/outlier-explorer-coverage.md — 'clicking a point highlights the participant and opens a linked listing'; no hover-highlight behaviour is declared.","code")
a(f"{R}#40","covered","outlier-explorer","Lines are clickable: a click selects the participant, opens the linked listing and the railed profile.",
  "docs/outlier-explorer-coverage.md — 'clicking a point opens the railed profile ALONGSIDE the linked listing'.","code")
a(f"{R}#42","migrate","paneled-outlier-explorer (planned)","In a paneled view, the measure checkboxes should also narrow the listing. No paneled module exists yet.",
  "requirements/paneled-outlier-explorer.md is marked '(planned)' in requirements/README.md; no src/paneled-* module.","code")
a(f"{R}#43","obsolete","—","A layout defect in the legacy small-multiples markup. The port lays panels out with the shared shell and CSS grid.",
  "src/shell.js renderShell / applyShellStyles.","code")
a(f"{R}#44","migrate","outlier-explorer","Measures whose normal range varies by participant (age, sex, race) draw one band; the request is to render the spread.",
  "src/outlier-explorer/configure.js normal_range_method offers None / LLN-ULN / Standard Deviation / Quantiles — all of which resolve to a single band.","code")
a(f"{R}#50","obsolete","—","Padding of the legacy small multiples, to be fixed via defineStyles(). Neither the panels nor defineStyles() exist in the port.","","text")
a(f"{R}#53","migrate","outlier-explorer","A percent-change y-axis with an interactive baseline picker. Jeremy's own comment says it 'might make more sense in the non-paneled version'.",
  "src/outlier-explorer/getScales.js plots raw results only; no change-from-baseline transform.","code")
a(f"{R}#65","covered","outlier-explorer","Filters naming an absent column are dropped with a console warning instead of throwing.",
  "src/outlier-explorer/configure.js filters — 'Filters whose column is absent from the data are dropped with a console warning'.","code")
a(f"{R}#71","covered","outlier-explorer","destroy() is part of the port's lifecycle API.",
  "docs/outlier-explorer-coverage.md — 'lifecycle API supports init, setData, setSettings, render, resize, and destroy'.","code")
a(f"{R}#72","migrate","outlier-explorer","Module-level reset. One of nine.","See QW3.","code","QW3")
a(f"{R}#74","covered","outlier-explorer","Every class in the port is namespaced already — sv-* on shared shell parts, safety-{module} on module roots.",
  "src/shell.js createElement/applyShellStyles; module style blocks (e.g. src/hep-explorer/styles.js '.safety-hep-explorer .hep-caution').","code")
a(f"{R}#77","covered","outlier-explorer","The port's listing shows the selected rows only; there is no residual highlighting to remove.",
  "docs/outlier-explorer-coverage.md — 'clicking a point highlights the participant and opens a linked listing'; src/histogram/listing.js renders the passed rows.","code")
a(f"{R}#78","covered","outlier-explorer","The settings merge the issue asks for is what syncSettings does in every module, with a deep clone of the defaults.",
  "src/outlier-explorer/configure.js syncSettings — 'preserving extra keys (e.g. a filter's start value)'.","code")
a(f"{R}#83","migrate","outlier-explorer","A dropdown listing the outlying participants, so an individual can be picked without hunting on the plot.",
  "Participant selection is click-on-point only; the participant multi-select exists in hep-explorer's composite view (compositeSelectSection) but not here.","code")
a(f"{R}#95","obsolete","—","Non-normal markers 'when zoomed in'. The port has no zoom/pan; axis range is set by typed limits.",
  "src/axis-limits.js is the only domain-narrowing affordance.","code")
a(f"{R}#108","obsolete","—","Bundle placement in the legacy build/ folder. The port commits versioned esbuild bundles to dist/safety.viz-{version}/.","","text")
a(f"{R}#116","migrate","all lab modules","Measure ordering other than alphanumeric.","See QW2.","code","QW2")
a(f"{R}#117","migrate","all modules","Filter start / all properties.","See QW1.","code","QW1")
a(f"{R}#118","migrate","paneled-outlier-explorer (planned)","Negative values not displayed. No paneled module exists yet; the single-measure outlier-explorer plots negatives.",
  "src/outlier-explorer/getScales.js derives the domain from the data with no zero floor.","code")

R = "RhoInc/safety-delta-delta"
a(f"{R}#1","migrate","delta-delta","'last' and 'max' as comparison-timepoint options, beside a named visit.",
  "src/delta-delta/configure.js takes explicit baseline/comparison visits only; qt-explorer's TIMEPOINT_MAX sentinel (QT-CFG-005) is the pattern to copy.","code")
a(f"{R}#4","migrate","delta-delta","Draw the delta itself on the sparkline — guide lines from baseline and comparison with an arrow between.",
  "src/participant-profile/sparkline.js draws the value series only.","code")
a(f"{R}#10","migrate","delta-delta","Suppress in-range values in the participant detail table so the abnormal ones stand out.",
  "src/participant-profile/measureTable.js lists every measure row.","code")
a(f"{R}#18","obsolete","—","Extracting inline styling into styles.js in the legacy repo. The port already keeps module CSS in a styles module or a single scoped block.",
  "src/hep-explorer/styles.js, src/participant-profile/styles.js.","code")
a(f"{R}#19","migrate","delta-delta","Sparklines should share an x domain, so a participant missing the comparison visit does not appear to have been measured at it.",
  "src/participant-profile/sparkline.js scales each series to its own extent.","code")
a(f"{R}#22","covered","delta-delta","The removed-record count is rendered on the page, not only logged.",
  "docs/delta-delta-coverage.md — 'missing and non-numeric results are dropped with a reported count'; SDD rows in requirements/safety-delta-delta.md.","code")
a(f"{R}#23","migrate","delta-delta","Still open in the port: the delta-delta measure options carry no unit, though the pattern exists next door.",
  "src/delta-delta/structureData.js:46 lists bare measure values; histogram/outlier-explorer/results-over-time all append the unit in measureLabel. unit_col exists in delta-delta but only feeds the docked profile.","code")
a(f"{R}#24","covered","delta-delta","A non-existent column for a required setting throws one named error instead of rendering an empty chart.",
  "src/delta-delta/checkInputs.js throws 'Required variable(s) missing: …' for measure_col, value_col, id_col, visit_col (src/data/schema/delta-delta.json). Optional columns still fail quietly, so the half of the report about non-required fields survives.","code")
a(f"{R}#25","migrate","delta-delta","A change of exactly zero should read 0.00 in black, not -0.00 in red.",
  "No negative-zero normalisation in src/delta-delta/structureData.js; qt-explorer's formatSigned (QT-SCL-006) is the nearest existing helper.","code")
a(f"{R}#26","covered","delta-delta","The visit settings are documented in the generated API reference, regenerated from the source on every release.",
  "_api/delta-delta.json; the published API page at /delta-delta/api.html.","code")
a(f"{R}#27","covered","delta-delta","participantsSelected is dispatched on selection and on clear.",
  "src/delta-delta/configure.js + src/delta-delta.js dispatch participantsSelected; docs/delta-delta-coverage.md.","code")
a(f"{R}#29","migrate","delta-delta","Choose sensible default baseline and comparison visits instead of the first two.",
  "src/delta-delta/configure.js falls back to the first / second measure and the given visits; no /baseline|screening/i heuristic.","code")
a(f"{R}#32","migrate","delta-delta","Annotate Pearson and Spearman correlation on the scatter.",
  "The port has an approximation-plus-disclaimer annotation pattern already — histogram's normality and ANOVA screens (SH-CHART-005).","code")
a(f"{R}#33","migrate","delta-delta","Brush or multi-click to define a subgroup on the scatter.",
  "shift-plot is the only module with a brush; it already boxes the selection, de-emphasises the rest and opens a worst-first rail stepper.","code")
a(f"{R}#34","migrate","delta-delta","Carry the brushed ids on participantsSelected.",
  "shift-plot already does exactly this — 'brushing dispatches participantsSelected on the shell root, bubbling to the element'.","code")
a(f"{R}#35","migrate","delta-delta","Plot an aggregate when several participants are selected.",
  "No aggregate-of-selection view in any module.","code")
a(f"{R}#36","migrate","delta-delta","Small multiples should plot visit or study day, not visit number.",
  "src/participant-profile/sparkline.js orders on the numeric visit column.","code")
a(f"{R}#37","migrate","delta-delta","Rename baseline / comparison to timepoint 1 / timepoint 2 in the UI.",
  "Control labels are 'Baseline Visit' / 'Comparison Visit' in src/delta-delta.js and src/shift-plot.js.","code")
a(f"{R}#38","migrate","all lab modules","Measure ordering; the comment adds that the order must reach the small multiples too.","See QW2.","code","QW2")
a(f"{R}#39","migrate","delta-delta","Stratify the scatter by a colour aesthetic.",
  "outlier-explorer, hep-explorer and qt-explorer all colour by group with a legend; delta-delta has no group control.","code")
a(f"{R}#40","migrate","all modules","Filter start / all. The comment's warning still applies: false is a valid value for all.","See QW1.","code","QW1")
a(f"{R}#41","migrate","delta-delta","Show the visit name, not the visit number, in small-multiple tooltips.",
  "Same sparkline path as #36.","code")

R = "RhoInc/safety-histogram"
a(f"{R}#14","migrate","all lab modules","Subset which measures appear in the dropdown.","See QW2.","code","QW2")
a(f"{R}#61","migrate","histogram","Module-level reset; histogram ships Reset Limits for the x-axis only.",
  "src/histogram.js:366 'Reset Limits'.","code","QW3")
a(f"{R}#105","migrate","histogram","Draw the filtered distribution over a faded full distribution, to compare them.",
  "src/histogram.js bins the filtered rows only; the overview already renders one panel per measure, so a second dataset per panel is the same drawing path.","code")
a(f"{R}#119","migrate","histogram","Overlay a density curve.",
  "Chart.js line datasets compose onto the bar chart; the port already mixes marks this way (results-over-time box marks, qt-explorer CI band).","code")
a(f"{R}#132","migrate","histogram","Brush the x-axis to select several bins at once.",
  "Selection is one bar at a time (SH-CHART-003); shift-plot's brush is the working precedent.","code")
a(f"{R}#141","obsolete","—","D3 throwing on resize over SVG elements. The port renders to canvas via Chart.js and has a tested resize() path.",
  "SH-API-001 — 'lifecycle API supports init, setData, setSettings, render, resize, destroy'.","code")
a(f"{R}#142","obsolete","—","Extracting inline styling in the legacy repo; the port's CSS is already in scoped modules.","","text")
a(f"{R}#144","obsolete","—","Replacing the legacy repo's R validation program with testthat. The port's evidence is Vitest plus Playwright keyed to requirement IDs, published per release.",
  "docs/histogram-coverage.md; the published evidence page.","code")
a(f"{R}#150","covered","histogram","participantsSelected is dispatched from the histogram.",
  "src/histogram/configure.js + src/histogram.js; PPRF-SH-001/002 route listing row clicks into the docked profile through it.","code")
a(f"{R}#151","migrate","all lab modules","Measure ordering.","See QW2.","code","QW2")
a(f"{R}#152","migrate","all modules","Filter start / all.","See QW1.","code","QW1")

R = "RhoInc/safety-outlier-explorer"
a(f"{R}#9","migrate","all lab modules","Subset the measure dropdown.","See QW2.","code","QW2")
a(f"{R}#39","covered","outlier-explorer","details configures the listing columns, as names or { value_col, label } specs.",
  "src/outlier-explorer/configure.js details — 'Columns for the linked participant listing'.","code")
a(f"{R}#66","covered","outlier-explorer","destroy() is part of the lifecycle API.",
  "docs/outlier-explorer-coverage.md lifecycle test.","code")
a(f"{R}#67","migrate","outlier-explorer","Module-level reset; only Reset Limits exists.",
  "src/outlier-explorer.js:403.","code","QW3")
a(f"{R}#128","covered","outlier-explorer","Defaults are cloned rather than shared — syncSettings deep-copies and merges.",
  "src/outlier-explorer/configure.js syncSettings.","code")
a(f"{R}#129","covered","outlier-explorer","Documentation is generated from the source: an API reference page and an evidence report per chart, per release.",
  "_api/outlier-explorer.json; the published /outlier-explorer/api.html and /evidence.html.","code")
a(f"{R}#130","covered","outlier-explorer","visit_col, visitn_col and studyday_col are all settings, and the x-axis toggles between the visit and study-day axes.",
  "All three are settings, and the port went further: time_cols takes { value_col, label, type: 'linear'|'ordinal', order_col } specs — the exact structure the issue proposes, generalised — defaulting to a derived measurement axis (src/outlier-explorer/configure.js:41,164-168). Evidence: 'the x-axis toggle switches between the visit and study-day axes'.","code")
a(f"{R}#145","obsolete","—","Documentation for the legacy custom_marks setting. The port has no custom_marks; mark styling is per-module Chart.js configuration and every setting it does have is documented in the generated API reference.",
  "_api/outlier-explorer.json settings list.","code")
a(f"{R}#155","covered","outlier-explorer","Per-participant normal ranges are read from the data, exactly as the legacy answer said they should be.",
  "src/outlier-explorer/configure.js normal_col_low='STNRLO' / normal_col_high='STNRHI' with normal_range_method='LLN-ULN' — the band follows each record's own limits.","code")

R = "RhoInc/safety-results-over-time"
a(f"{R}#5","migrate","all lab modules","Subset the measure dropdown. The oldest of the four duplicates, and the one the others point at.","See QW2.","code","QW2")
a(f"{R}#37","covered","results-over-time","destroy() exists on the module.",
  "src/results-over-time.js destroy(). Note: the coverage doc's lifecycle test name omits destroy, so the method is present but the browser evidence line does not name it.","code")
a(f"{R}#38","migrate","results-over-time","Module-level reset; only Reset Limits exists.",
  "src/results-over-time.js:275.","code","QW3")
a(f"{R}#50","covered","results-over-time","The removed-record count is shown on the page, not only in the console.",
  "docs/results-over-time-coverage.md — 'missing and non-numeric results are dropped with a reported count'.","code")
a(f"{R}#82","migrate","results-over-time","On a log scale, the count of dropped non-positive results is not reported beside the control.",
  "src/results-over-time.js:426 filters values &lt;= 0 out of the log domain silently; the general removed-count note counts missing and non-numeric records, not this filter.","code")
a(f"{R}#89","covered","results-over-time","Generated API reference and evidence page per release.",
  "_api/results-over-time.json.","code")
a(f"{R}#92","obsolete","—","Control overlap in the legacy floated layout. The port's controls live in the shared shell's sidebar, one control per row.",
  "src/shell.js controlBuilders — sv-control-section / sv-control-row / sv-control.","code")
a(f"{R}#94","migrate","results-over-time","An Overall box beside the per-group boxes at each visit.",
  "src/results-over-time.js groups draw side by side with a group-ordered legend; there is no all-groups series. ae-explorer's Total column is the nearest precedent.","code")
a(f"{R}#95","migrate","results-over-time","Log tick labels disagree with the plotted values when the interval is not a power of ten.",
  "src/results-over-time.js:536 sets type 'logarithmic' and leaves tick generation to Chart.js — a different tick generator from the reported one, so the defect needs re-running before it is scoped.","code")
a(f"{R}#98","migrate","all lab modules","Measure ordering.","See QW2.","code","QW2")
a(f"{R}#99","migrate","all modules","Filter start / all.","See QW1.","code","QW1")
a(f"{R}#101","covered","results-over-time","Tooltips are Chart.js tooltips, styleable in full, not <code>&lt;title&gt;</code> elements.",
  "src/results-over-time/getPlugins.js builds the summary-statistics tooltip; docs/results-over-time-coverage.md — 'hovering a box exposes the summary statistics tooltip'. The 2021 answer — 'we'd need to move to a more robust tooltip system' — is what the port did.","code")

R = "RhoInc/safety-shift-plot"
a(f"{R}#3","migrate","shift-plot","A log / linear axis toggle.",
  "src/shift-plot/getScales.js builds linear scales only; results-over-time has a Scale control and hep-explorer an Axis Type control with a log-base option.","code","QW8")
a(f"{R}#4","migrate","all lab modules","Subset the measure dropdown.","See QW2.","code","QW2")
a(f"{R}#16","migrate","shift-plot","Still open in a different form: the port's shift-plot has no colour-by at all, so there is nothing for a colour setting to fail at.",
  "src/shift-plot/configure.js declares no group/colour setting; outlier-explorer, hep-explorer and qt-explorer all colour by group with a legend. Pairs with delta-delta #39.","code")
a(f"{R}#17","covered","shift-plot","details drives the linked listing's columns.",
  "src/shift-plot/configure.js details — 'Columns for the linked participant listing; when null, defaults to participant ID, baseline …'.","code")
a(f"{R}#22","migrate","shift-plot","Measure options should carry units. shift-plot's measureLabel returns the bare measure.",
  "src/shift-plot/structureData.js:72 returns row[settings.measure_col]; histogram/outlier-explorer/results-over-time append the unit.","code")
a(f"{R}#23","covered","shift-plot","Executed: listVisits already drops empty and null visit labels.",
  "listVisits([{VISIT:'Baseline'},{VISIT:''},{VISIT:'Week 2'},{VISIT:null},{VISIT:'Week 10'}]) returns ['Baseline','Week 2','Week 10'] — unique() keeps first-seen non-empty values (SSP-REG-013/014).","code")
a(f"{R}#27","covered","shift-plot","The derived listing columns are rounded and the table is the shared listing's markup, not hand-aligned text.",
  "src/shift-plot/structureData.js:167-170 rounds baseline, comparison and change to two decimals and formats percent change; src/histogram/listing.js renders the table. Source columns passed through `details` are still unformatted.","code")
a(f"{R}#29","migrate","shift-plot","Three requests in one: measure/visit-aware axis titles, a log option, and adjustable axis ranges. Only the third is done.",
  "Axis limits: src/axis-limits.js is shared and already used by histogram, outlier-explorer and results-over-time — but not by shift-plot.","code","QW8")
a(f"{R}#30","covered","shift-plot","The axes share one domain, and the identity line spans it.",
  "docs/shift-plot-coverage.md — 'the identity line spans a domain shared by both axes'.","code")
a(f"{R}#42","covered","shift-plot","destroy() is part of the lifecycle API.",
  "docs/shift-plot-coverage.md lifecycle test names destroy.","code")
a(f"{R}#43","migrate","shift-plot","Module-level reset.","See QW3.","code","QW3")
a(f"{R}#46","covered","shift-plot","The requested layout is the shared shell's layout, tested on the site.",
  "docs/shift-plot-coverage.md — 'shared shell: controls left of the chart, chart above the listing'.","code")
a(f"{R}#68","covered","shift-plot","An invalid starting measure warns and falls back to an existing one.",
  "src/shift-plot/configure.js start_value — 'falls back to the first measure (with a console warning) when absent from the data'.","code")
a(f"{R}#73","obsolete","—","Repointing the legacy test page from rawgit to jsdelivr. rawgit shut down in 2019; the port ships its own demo site and committed bundles.","","text")
a(f"{R}#74","obsolete","—","An SVG clip-path id collision in the legacy renderer. Chart.js clips to the chart area on canvas; there is no clip-path element.","","text")
a(f"{R}#75","obsolete","—","Bundle placement in the legacy build/ folder.","","text")
a(f"{R}#82","covered","shift-plot","Data manipulation is already staged: checkInputs, then configure, then structureData, before any chart is built.",
  "src/shift-plot/ — checkInputs.js / configure.js / structureData.js / getScales.js / getPlugins.js, the gsm.viz-style module flow the issue asks for.","code")
a(f"{R}#84","migrate","all lab modules","Measure ordering.","See QW2.","code","QW2")
a(f"{R}#85","migrate","all modules","Filter start / all.","See QW1.","code","QW1")
a(f"{R}#86","migrate","shift-plot","Rename baseline / comparison to timepoint 1 / timepoint 2 in the UI. Paired with delta-delta #37.",
  "Control labels in src/shift-plot.js.","code")
a(f"{R}#88","migrate","shift-plot","Panel the scatter by a categorical variable — from safetyGraphics v2 alpha testing.",
  "histogram's grouped small multiples (SH-CHART-004, SH-OVW-002) are the panelling precedent in the port.","code")

# web-codebook has no module in safety.viz. requirements/web-codebook.md exists and is
# marked "(planned)" in requirements/README.md, so "already covered" here means the
# capability exists elsewhere in the port and the planned module would inherit it.
R = "RhoInc/web-codebook"
a(f"{R}#28","covered","web-codebook (planned)","The legend format the issue asks for — 'Level Name (n=XX)' — is the port's group legend.",
  "src/hep-explorer/getPlugins.js:114 groupLegendEntries builds `${value} (n=${count}, ${percent}%)` (HEP-CTRL-013).","code")
a(f"{R}#86","covered","web-codebook (planned)","Stale-settings-on-re-render is what destroy() prevents, and every module in the port has one.",
  "src/main.js's thirteen modules each expose init/setData/setSettings/render/resize/destroy.","code")
a(f"{R}#118","covered","web-codebook (planned)","Charts resize to their container and expose resize(); the R side is an htmlwidget over the same bundle.",
  "resize() is in every module's lifecycle API; gsm.safety wraps the bundle as Widget_* htmlwidgets.","code")
a(f"{R}#144","migrate","web-codebook (planned)","A reset button. One of nine across the trackers.","See QW3.","code","QW3")
a(f"{R}#175","obsolete","—","A Save Settings button on the legacy settings page, to avoid re-rendering on every change. The port has no settings page; settings are a constructor argument plus setSettings().","","text")
a(f"{R}#188","migrate","web-codebook (planned)","User-defined tabs in the nav, each given an element and the codebook object.",
  "No extension point of this kind exists in the port; the nearest thing is the shell's view selector (src/shell.js renderViewSelector).","code")
a(f"{R}#215","obsolete","—","A grouping defect in the legacy dot plots, which the maintainer proposed removing outright ('I think that the dot plots are rarely used and have a few issues. Considering removing them altogether').","","text")
a(f"{R}#217","obsolete","—","A crash from the legacy defaultTab setting; no tab machinery is carried forward.","","text")
a(f"{R}#220","migrate","web-codebook (planned)","Independent axes per small multiple in the charting module.",
  "The port's small multiples go the other way — histogram's grouped panels deliberately SHARE bin boundaries (SH-CHART-004/SH-CTRL-006) — so this is a setting, and the choice matters either way.","code")
a(f"{R}#252","migrate","web-codebook (planned)","Make the missingness threshold that turns the % missing red configurable, default 0.1.",
  "requirements/web-codebook.md carries the summary-row rows; no module implements them yet.","code")
a(f"{R}#255","migrate","web-codebook (planned)","Sort the summary table by data order, alphabetically, by missingness, or by type.",
  "Same planned module. The shared listing sorts by column but the codebook's variable list is a different object.","code")
a(f"{R}#257","migrate","web-codebook (planned)","Search variable names and labels across several loaded files.","Same planned module.","code")
a(f"{R}#261","covered","web-codebook (planned)","Data-driven binning is in the port: six named algorithms, selectable, with Custom.",
  "src/histogram/configure.js ALGORITHMS — Square-root, Sturges, Rice, Scott, Freedman-Diaconis, Shimazaki-Shinomoto, Custom. Harrell's histboxp specifically is not among them.","code")
a(f"{R}#273","obsolete","—","Internet Explorer regression testing. IE reached end of support in 2022 and Chart.js v4 does not target it.","","text")
a(f"{R}#284","covered","web-codebook (planned)","Significant-digit handling rather than raw rounding is implemented in the port.",
  "src/histogram/structureData.js displayDigits; qt-explorer's formatNumber trims trailing zeros and guards non-finite values (QT-SCL-005).","code")
a(f"{R}#285","migrate","web-codebook (planned)","Grouping on a numeric column silently produces no grouped summary.",
  "The port's group controls treat group values as strings (src/hep-explorer/getPlugins.js groupLegendEntries keys on String(value)), which is the behaviour this issue wants — but the codebook's type inference is what failed and does not exist yet.","code")
a(f"{R}#286","migrate","web-codebook (planned)","Group-level summary statistics above each chart.",
  "results-over-time computes per-group box statistics already (src/box-whisker.js); the codebook's summary layout is the missing part.","code")
a(f"{R}#287","covered","web-codebook (planned)","Explanatory text on controls is the port's pattern.",
  "ae-explorer's 'E' superscript filter explanations (AE-USER-009/AE-REG-018); hep-explorer's point-size legend note (HEP-CTRL-014).","code")
a(f"{R}#289","covered","web-codebook (planned)","Pooled bin widths across grouped histograms is exactly what the port does.",
  "docs/histogram-coverage.md — 'grouped small multiples share the main chart's bin boundaries' and 'bin boundaries anchor to the measure results, not the filtered subset' (#19).","code")
a(f"{R}#295","migrate","web-codebook (planned)","A lone outlier is hard to hit with the pointer.",
  "Related and live: results-over-time already gives outlier points a larger hover radius than their resting radius. The same trick is the fix, and nepExplorer #172 is the same complaint from 2025.","code")
a(f"{R}#296","migrate","web-codebook (planned)","Min and max in the summary statistics, or configurable statistics.",
  "src/box-whisker.js computes the five-number summary; surfacing it as configurable summary stats is the planned module's work.","code")
a(f"{R}#302","obsolete","—","Sort order of files in the legacy explorer's file list. No multi-file explorer exists or is planned.","","text")
a(f"{R}#303","obsolete","—","Wording of the legacy file-picker's label after a load.","","text")
a(f"{R}#312","migrate","web-codebook (planned)","An example showing how to attach metadata to a codebook.",
  "Every ported module ships a live demo page plus a generated API reference; a metadata example would follow that pattern.","text")
a(f"{R}#320","migrate","web-codebook (planned)","100MB-plus data crashes the browser; the profiling in the thread names the hot paths.",
  "The port's data path is different (single cleanData pass per module, canvas rendering), so the numbers must be re-measured before the remedies in the thread are scoped. The suggestion to take column types from R rather than infer them survives intact.","text")
a(f"{R}#321","migrate","web-codebook (planned)","A date/time variable view; dates currently classify as free text.","Planned module.","text")
a(f"{R}#324","migrate","web-codebook (planned)","A nested-data-explorer tab.","Planned module.","text")
a(f"{R}#331","migrate","web-codebook (planned)","null coerced to 0, pulling a continuous variable's domain down to zero.",
  "The port is explicit about this class of bug — hep-explorer parses a blank study day to NaN rather than coercing it to 0 (HEP-DATA-004) — so the pattern to follow already exists.","code")

R = "SafetyGraphics/hep-explorer"
a(f"{R}#21","migrate","hep-explorer","Click a legend entry to filter that group out of the plot.",
  "The legend is drawn by src/hep-explorer/views/scatter.js:917 from groupLegendEntries; entries are not interactive. Pairs with #160.","code")
a(f"{R}#84","obsolete","—","A per-participant external profile URL. The port docks the participant profile in the page instead of linking out, so there is nothing for a URL template to point at.",
  "HEP-SELECT-002/008; src/profile-host.js mounts the shared participant-profile module in the shell's profile slot.","code")
a(f"{R}#106","covered","hep-explorer","A Quadrant Labels control turns the corner labels off, changing nothing else.",
  "HEP-QUAD-007, cited to this issue in requirements/hep-explorer.md.","code")
a(f"{R}#107","covered","hep-explorer","Each quadrant summary row states what landing there means clinically.",
  "HEP-QUAD-008, cited to this issue.","code")
a(f"{R}#108","covered","hep-explorer","Each legend entry carries the group's participant count and its share of the plotted points.",
  "HEP-CTRL-013, cited to this issue; src/hep-explorer/getPlugins.js:114.","code")
a(f"{R}#111","covered","hep-explorer","A numeric companion column (TRTN beside TRT) orders the legend in the protocol's order.",
  "HEP-CTRL-015, cited to this issue; src/hep-explorer/availability.js:72 groupOrder.","code")
a(f"{R}#112","covered","hep-explorer","A Log Base control offers log10 and log2, exactly the request.",
  "HEP-CTRL-017, cited to this issue.","code")
a(f"{R}#115","migrate","hep-explorer","A baseline-ALP filter for the clinical workflow.",
  "hep-explorer has categorical filters (HEP-CTRL-011) and one numeric range filter, for R Ratio (HEP-CTRL-010) — the numeric-range control exists and would be reused.","code")
a(f"{R}#140","migrate","hep-explorer","User-defined static ULNs overriding the data-driven ones.",
  "The port already carries a per-measure 'data-driven vs user-defined' configuration for the below-LLOQ limit (HEP-IMPUTE-001), which is the shape this asks for at the other end of the scale. The 2018 objection — that the standardisation is computed once at init — no longer holds: the display standardisation is recomputed per render (HEP-DISPLAY-001/006).","code")
a(f"{R}#160","covered","hep-explorer","Groups with no participants left after a filter no longer appear in the legend.",
  "src/hep-explorer/views/scatter.js:1239 derives host.groupValues from host.points — the SHOWN points — so a filtered-out arm drops out of the legend and the colour scale.","code")
a(f"{R}#164","covered","hep-explorer","The colour-by options accept { value_col, label }, so the dropdown can be labelled.",
  "src/hep-explorer/configure.js groups — Color-by options with a leading None (HEP-CTRL-009), normalised at configure.js:238 into { value_col, label } pairs.","code")
a(f"{R}#198","migrate","hep-explorer","Rule-based highlighting to surface Hy's Law candidates without drilling into each one.",
  "The port highlights on one rule only — the timing window, filled vs hollow points (HEP-CTRL-008 / HEP-DISPLAY-005) — and classifies every point into a quadrant already (HEP-QUAD-004), so the classification the rules would read is in hand.","code")
a(f"{R}#207","covered","hep-explorer","The mDISH mode is withdrawn when no participant has a derivable baseline, and the default is no longer study day 0.",
  "HEP-DISPLAY-006 — 'the baseline-adjusted (mDISH) mode is withdrawn when no participant has a derivable baseline'; HEP-DISPLAY-004.","code")
a(f"{R}#209","covered","hep-explorer","Axes are adjustable from the UI: Lower and Upper inputs per axis, showing the limit in force, with a per-axis Reset.",
  "HEP-AXIS-001..004. The matrix cites #238 for these rows; this issue is the same request, asked by a different user.","code")
a(f"{R}#212","migrate","hep-explorer","Download the cases you can see — and the harder half, filter by quadrant so a Temple's Corollary set can be picked out.",
  "Half of it exists: HEP-DROP-003 exports removed records, and the shared listing exports its rows to CSV. The quadrant filter does not exist, though every point is already classified (HEP-QUAD-004).","code")
a(f"{R}#228","migrate","hep-explorer","A SEND (nonclinical) example dataset.",
  "The port's demos run on pharmaverseadam ADaM extracts (docs/DATA_SOURCES.md); SEND would be a second data contract, not a settings change.","code")
a(f"{R}#229","migrate","hep-explorer","Handle unscheduled visits, using the approach the other renderers already settled on.",
  "results-over-time ships it: an 'Unscheduled visits' toggle, an unscheduled_visits pattern setting and isUnscheduledVisit in src/results-over-time/structureData.js. Jeremy's 2019 comment pointed at the sibling renderer; the sibling is now a shared function away.","code","QW7")
a(f"{R}#236","covered","hep-explorer","Past the base palette, groups take lightened then darkened variants rather than exact repeats.",
  "HEP-CTRL-016, cited to this issue; src/hep-explorer/getPlugins.js:50 paletteColor with PALETTE_TIERS = 3.","code")
a(f"{R}#237","obsolete","—","Minimising the legacy renderer's expandable message stack. The port has no message stack: notes are rendered in place and the one standing message is deliberately permanent.",
  "HEP-CAUTION-001.","code")
a(f"{R}#238","covered","hep-explorer","Manual axis limits, per axis, with reset and crossed-pair handling.",
  "HEP-AXIS-001..004, all four cited to this issue.","code")
a(f"{R}#239","migrate","hep-explorer","Performance on very large datasets.",
  "The remedies proposed in 2019 — hexbinning, hiding normal points — address SVG DOM pressure. The port draws to canvas, so the item needs re-measuring on the new renderer before it is scoped; it should not be filed as written.","code")
a(f"{R}#240","covered","hep-explorer","The caution is permanent: rendered once into the shell and shown in every view, not cleared by Clear.",
  "HEP-CAUTION-001, cited to this issue; src/hep-explorer.js:312-317 with CLINICAL_CAUTION at src/hep-explorer/getPlugins.js:102.","code")
a(f"{R}#248","covered","hep-explorer","The Display Type control offers only the modes the loaded data can be plotted in.",
  "HEP-DISPLAY-006, cited to this issue.","code")
a(f"{R}#251","obsolete","—","An export-style convention inside the legacy source tree.","","text")
a(f"{R}#262","migrate","hep-explorer","A quadrant-comparison view: how the participants in the Hy's Law quadrant differ over time from those in the normal quadrant.",
  "The pieces exist separately — every point is classified into a quadrant (HEP-QUAD-004) and results-over-time draws per-group boxes by visit — but nothing joins them. The 2019 comment already suspected this is its own renderer, and it is the largest genuinely new idea in the whole sweep.","code")
a(f"{R}#273","migrate","hep-explorer","Step the animation over the study days that exist, not every integer day.",
  "HEP-ANIM-005 runs 'at 100ms per remaining study day, capped at 30 seconds' — a day-count clock, so a long study with few visits still plays through the empty days. nepExplorer #173 is the same complaint from 2025 and asks for windowing.","code")
a(f"{R}#274","covered","hep-explorer","When Point Size encodes R Ratio the legend says what size means and which way it runs.",
  "HEP-CTRL-014, cited to this issue.","code")
a(f"{R}#290","covered","participant-profile","The spaghetti lines are labelled at their own last point, deconflicted vertically, with full measure names in the legend.",
  "PPRF-SPAG-004 in requirements/participant-profile.md, cited to this issue; src/participant-profile/spaghetti.js measureAnnotationPlugin.","code")
a(f"{R}#296","migrate","hep-explorer","Hold one x domain across the per-measure summary-table charts so they can be read against each other.",
  "HEP-SELECT-008 draws a sparkline per measure row; src/participant-profile/sparkline.js:71 scales each row's x to [Math.min(...days), Math.max(...days)] — that row's own days.","code")
a(f"{R}#299","obsolete","—","Internet Explorer rendering. IE is out of support and Chart.js v4 does not target it.","","text")
a(f"{R}#302","covered","hep-explorer","There is a settings schema, and it is enforced rather than decorative.",
  "src/data/schema/hep-explorer.json is a JSON Schema data contract validated on init (HEP-DATA-005); the generated _api/hep-explorer.json documents every setting with its type and default.","code")
a(f"{R}#325","obsolete","—","A specific variable-name bug in the legacy onInit pipeline. That pipeline is gone; the port's drop path is specified and tested.",
  "HEP-DROP-001..003.","code")
a(f"{R}#327","migrate","hep-explorer","The revised PALT footnote wording, and pointing at the clinical workflow rather than the paper.",
  "src/hep-core/palt.js:86 carries a PALT footnote; whether it is the 2020 revised wording needs checking against the text in the issue before this is filed.","code")
a(f"{R}#328","covered","hep-explorer","The clinical guide is part of the UI.",
  "HEP-DOC-001 — the Clinical guide, carrying the R-Ratio and nR primary sources.","code")
a(f"{R}#335","covered","hep-explorer","The R and nR references are linked from the widget itself.",
  "HEP-DOC-001, cited to this issue — Robles-Diaz et al. 2014 and Suh 2020.","code")

R = "SafetyGraphics/nepExplorer"
a(f"{R}#1","covered","nep-explorer","The KDIGO scatter is Phase 1 of the port: fold change against absolute change, staged, zoned and summarised.",
  "NEP-SCAT-001, NEP-STAGE-001..004, NEP-ZONE-001..005. The remainder: the y-axis toggle to eGFR / eGFRcys is not there — see #68.","code")
a(f"{R}#10","migrate","nep-explorer","Hover a point and highlight the same timepoint across the time-series charts. Phase 1 has no time-series charts.",
  "docs/nep-explorer-coverage.md covers the scatter, the zones, the summary and the filters only.","code")
a(f"{R}#12","migrate","nep-explorer","Summary statistics on the time-series charts. Phase 2.",
  "results-over-time's box statistics (src/box-whisker.js) are the computation, once the time-series view exists.","code")
a(f"{R}#13","migrate","nep-explorer","Marginal box plots.",
  "hep-explorer ships them — a box strip above and to the right of the scatter, plus axis rugs, with a Marginal Distributions control (HEP-MARG-001..003).","code")
a(f"{R}#20","covered","nep-explorer","The per-participant measure table the issue points at exists in the port, as the docked participant profile's measure table.",
  "src/participant-profile/measureTable.js; HEP-SELECT-005/008.","code")
a(f"{R}#21","migrate","nep-explorer","A plot-style control — maximum values versus by-study-day. Phase 2.",
  "NEP-DATA-003 fixes the reduction at maximum post-baseline value.","code")
a(f"{R}#22","obsolete","—","Replacing tooltips with modals, to fit more information in. The port's tooltip already carries the six lines the modal was for.",
  "NEP-SCAT-002/003 — participant, stage, fold change with stage, absolute change with stage, baseline, maximum, visit and study day.","code")
a(f"{R}#28","migrate","nep-explorer","Accept pre-derived data instead of deriving in the module.",
  "The port always derives: baseline identification and the per-participant reduction are NEP-DATA-001..003, with no bypass.","code")
a(f"{R}#32","migrate","nep-explorer","A participant dropdown. Same request as paneled-outlier-explorer #83.",
  "hep-explorer's composite view has a participant multi-select (src/hep-explorer.js compositeSelectSection); nothing equivalent in nep-explorer.","code")
a(f"{R}#35","migrate","nep-explorer","Show the percent equivalent of a fold change on axis-tick hover. Still meaningful: the port kept the fold axis.",
  "NEP-UNIT-003 — 'the fold-change axis stays (it is a ratio and unit-free)'.","code")
a(f"{R}#36","obsolete","—","A defect in the legacy hysteresis plot. The port did not carry a hysteresis plot; see #52 for the design question that outlives the bug.","","text")
a(f"{R}#40","migrate","nep-explorer","Whether the creatinine and eGFR maxima must come from the same visit window — with a substantive clinical answer from Jim Buchanan in the thread. Phase 1 has no visit window at all.",
  "NEP-DATA-003 reduces to the maximum post-baseline value outright. File this as a design note before Phase 2, not as a code task.","code")
a(f"{R}#43","migrate","nep-explorer","Footnote when the visit window exceeds the KDIGO criteria window. Depends on #40.","","code")
a(f"{R}#44","migrate","nep-explorer","Toggle between maximal change and change from baseline.",
  "NEP-DATA-003 fixes the reduction; qt-explorer's timepoint control with its TIMEPOINT_MAX sentinel (QT-CFG-005) is the shape.","code")
a(f"{R}#45","migrate","nep-explorer","A schedule-of-events table with median study days.","","text")
a(f"{R}#50","obsolete","—","Updating the legacy repo's configuration and data-guidelines wikis. The port documents settings in a generated API reference and inputs in a JSON Schema data contract.",
  "src/data/schema/nep-explorer.json; NEP-CFG-001..008.","code")
a(f"{R}#51","obsolete","—","A wiki section describing the derived-data shape, which the port does not accept as input. See #28.","","text")
a(f"{R}#52","migrate","nep-explorer","'Reevaluate hysteresis plot. It's confusing.' The port answered it by omission; the reevaluation is the Phase 2 design note.","","text")
a(f"{R}#53","covered","nep-explorer","Point fill carries meaning: it is the combined stage.",
  "NEP-SCAT-001 — 'filled by the combined stage so the cloud reads by severity even with the zones hidden'.","code")
a(f"{R}#55","migrate","nep-explorer","A BUN / creatinine ratio time-series chart. Duplicated by #108, which carries Jim Buchanan's threshold lines at 10 and 20.","","text")
a(f"{R}#56","migrate","nep-explorer","A RIFLE scatter beside the KDIGO one.",
  "NEP-CFG-003 already makes the staging cut-points a setting, so a second criteria set is configuration plus a second zone painter, not a new engine.","code")
a(f"{R}#57","migrate","nep-explorer","Click a row of the KDIGO summary table to list the participants in that stage.",
  "Both halves exist: the summary table is NEP-TBL-001 and the shared listing (src/histogram/listing.js) is used by seven modules. Pairs with #105.","code")
a(f"{R}#58","migrate","nep-explorer","Panel the scatter — KDIGO beside KDIGO-DC, or beside RIFLE, or window-maximum beside baseline-change.","","text")
a(f"{R}#62","obsolete","—","A document drop, not a request: the AKI classification literature review and the nephrotoxicity notes. Worth keeping for Phase 2 reading; there is nothing to build.","","text")
a(f"{R}#68","migrate","nep-explorer","An eGFR helper. The issue carries the full CKD-EPI 2021 specification for both eGFRcr and eGFRcr-cys, which is the expensive part of the work already done.",
  "The port has no eGFR derivation; NEP-CFG-008 resolves creatinine only.","code")
a(f"{R}#74","covered","nep-explorer","Filters are in the port and restate the summary when applied.",
  "NEP-CFG-006; docs/nep-explorer-coverage.md — 'the filters narrow the plotted population and restate the summary'.","code")
a(f"{R}#75","migrate","nep-explorer","Axis-type and point-size controls. The author later decided against log but kept size open.",
  "hep-explorer has both — an Axis Type control (HEP-CTRL-006) and a Point Size control encoding R Ratio with a legend (HEP-CTRL-007/014).","code")
a(f"{R}#90","migrate","nep-explorer","Document the data assumptions and which chart reads which setting. Half of it is generated already.",
  "Generated: src/data/schema/nep-explorer.json plus the API reference. Missing: the clinical assumptions, and the per-chart settings map.","code")
a(f"{R}#92","covered","nep-explorer","The port took the standard long-format lab mapping rather than a custom derived domain.",
  "NEP-CFG-001 — 'the long-format lab mapping the KDIGO scatter needs'; the demo runs on the shared pharmaverseadam extract.","code")
a(f"{R}#93","obsolete","—","A readme for the legacy R package. Jim Buchanan's summary paragraph in the thread is still the best short description of the tool and is worth reusing.","","text")
a(f"{R}#99","covered","nep-explorer","Clicking a point dispatches the participant id on the shared event.",
  "NEP-SCAT-004 — 'dispatches the shared participantsSelected'; docs/nep-explorer-coverage.md.","code")
a(f"{R}#100","obsolete","—","Closed in substance by its own author's comment: 'duplicate'.","","text")
a(f"{R}#101","covered","nep-explorer","Moving off the custom domain is done — see #92.","NEP-CFG-001.","code")
a(f"{R}#105","migrate","nep-explorer","Click a point and highlight the stage cells that participant lands in.",
  "Both halves exist: NEP-SCAT-004 selection and NEP-TBL-001 summary table. Pairs with #57.","code")
a(f"{R}#108","migrate","nep-explorer","A BUN / serum-creatinine chart over time with threshold lines at 10 and 20 — asked for by the clinical author as a launch requirement.","","text")
a(f"{R}#111","migrate","nep-explorer","Restrict the window the scatter's maxima are computed over, by week and study day.",
  "NEP-DATA-003 takes the maximum over all post-baseline records. Related to #40 and #44.","code")
a(f"{R}#112","covered","nep-explorer","Demographic and vital-sign columns for the profile are settings, not hard-coded lab references.",
  "src/participant-profile/configure.js details — 'Header demographics: column names or { value_col, label } specs' (PPRF-2).","code")
a(f"{R}#115","covered","nep-explorer","The KDIGO derivation is unit-tested in the port.",
  "NEP-STAGE-001..004 and NEP-UNIT-001..003 are unit rows in requirements/nep-explorer.md with Vitest evidence in docs/nep-explorer-coverage.md.","code")
a(f"{R}#117","covered","nep-explorer","Every module renders through one shell and one stylesheet, so appearance is consistent by construction.",
  "src/shell.js applyShellStyles; the sv-* control and layout classes shared by all thirteen modules.","code")
a(f"{R}#118","obsolete","—","A test of the legacy Shiny app's patient-profile hand-off. The port docks the profile in-page and links modules through participantsSelected.","","text")
a(f"{R}#119","obsolete","—","A request for working-group file storage. Not a renderer feature.","","text")
a(f"{R}#122","migrate","nep-explorer","The half that survives: support for several data domains at once. The {safetyGraphics} integration half belongs to the R side.",
  "Phase 1 reads one lab domain (NEP-CFG-001). Exposure and vitals are #128 and #132.","code")
a(f"{R}#125","migrate","nep-explorer","A large creatinine change squashes stages 1 and 2 together; log-scale controls proposed.",
  "NEP-ZONE-005 keeps every cut-point on screen on a linear axis, which is what makes the squash. hep-explorer's Axis Type control is the precedent.","code")
a(f"{R}#128","migrate","nep-explorer","Pair lab results with dosing by optionally reading the exposure domain. Duplicated by #132.","","text")
a(f"{R}#129","obsolete","—","Test data for the legacy standalone R app. The port's demo data is the shared pharmaverseadam extract plus a deterministic synthetic AKI cohort.",
  "NEP-COHORT-001..012.","code")
a(f"{R}#130","obsolete","—","A planning item — 'develop roadmap to end of april' — from February 2024.","","text")
a(f"{R}#131","migrate","nep-explorer","Test with a larger dataset and measure. Worth doing on the new renderer, where the numbers will be different.","","text")
a(f"{R}#132","migrate","nep-explorer","Dosing on hover and a dosing-over-time chart in the participant profile, from the ISG Q1 2024 webinar.","","text")
a(f"{R}#138","obsolete","—","A settings argument on the legacy create_nepexplorer_app() R function.","","text")
a(f"{R}#139","obsolete","—","An renv.lock for the legacy R package.","","text")
a(f"{R}#141","obsolete","—","Robustness of the legacy R app's domain merge. The port validates its inputs against a JSON Schema contract and throws one named error.",
  "NEP-DATA-006 checkInputs.","code")
a(f"{R}#142","covered","nep-explorer","The profile's demographics come from configured columns, not from the lab settings.",
  "src/participant-profile/configure.js details (PPRF-2). Same as #112.","code")
a(f"{R}#149","obsolete","—","Verification of a legacy R patient-profile chart's behaviour when eGFR is absent.","","text")
a(f"{R}#150","obsolete","—","pkgdown reference organisation for the legacy R package.","","text")
a(f"{R}#151","migrate","nep-explorer","Scope, data-domain and unit assumptions, and a settings walkthrough. The generated reference covers the settings list; the clinical scope statements do not exist and matter.",
  "_api/ has no nep-explorer entry yet; the schema and matrix carry the mechanical half.","code")
a(f"{R}#152","obsolete","—","The legacy R package's DESCRIPTION file.","","text")
a(f"{R}#155","covered","nep-explorer","Units are a setting with a factor table, and the measure resolves through measure_values — so the parameter name need not carry the unit.",
  "NEP-CFG-005, NEP-CFG-008, NEP-UNIT-001/002.","code")
a(f"{R}#156","covered","nep-explorer","The profile's charts are one module with one layout, so widths do not vary chart to chart.",
  "src/participant-profile/ — header, measureTable, sparkline, spaghetti, inset and aeTracks all render into the one profile layout (src/participant-profile/styles.js).","code")
a(f"{R}#157","migrate","nep-explorer","Name the ratio in full and say what it means, rather than labelling it 'ratio'. Depends on #108.","","text")
a(f"{R}#164","migrate","nep-explorer","Turn the clinical workflow into a web document linked from the UI.",
  "hep-explorer already does this — the Clinical guide, in the UI, with its primary sources linked (HEP-DOC-001).","code")
a(f"{R}#165","obsolete","—","Testing the legacy R package against several R versions.","","text")
a(f"{R}#166","covered","nep-explorer","The profile's line charts are not plotly. They are Chart.js, in the same bundle as everything else.",
  "src/participant-profile/spaghetti.js and sparkline.js on Chart.js v4.","code")
a(f"{R}#171","obsolete","—","CRAN submission for the legacy R package. The R route for these charts is gsm.safety's Widget_* htmlwidgets over the safety.viz bundle.","","text")
a(f"{R}#172","migrate","nep-explorer","October 2025 beta feedback: points are hard to click.",
  "results-over-time already gives outlier points a larger hover radius than their resting radius (SROT-REG-011, tests/e2e/results-over-time.spec.js:133) — the same fix. Same complaint as web-codebook #295 from 2018.","code")
a(f"{R}#173","migrate","nep-explorer","October 2025 beta feedback: the time animation needs windowing controls for sparse data.",
  "hep-explorer's playback runs at 100ms per remaining study day (HEP-ANIM-005) and has the same weakness; hep-explorer #273 is the 2019 version of this. Fix them together.","code")
a(f"{R}#174","obsolete","—","A flashing checkbox in the legacy R app's safetyGraphicsInit() launcher.","","text")
a(f"{R}#175","covered","nep-explorer","The demographics box is configurable and the configuration is documented — which is what the reviewer asked for.",
  "src/participant-profile/configure.js details (PPRF-2), published in the generated API reference. The reviewer's actual ask — that users can find this out — is met by the reference page.","code")
a(f"{R}#176","migrate","nep-explorer","October 2025 beta feedback: Day 1 xULN values are not zero, so Day 1 may not be the true baseline.",
  "The port makes the rule explicit and configurable — a baseline_col/baseline_value pair, with earliest-record fallback by study day then visit number (NEP-DATA-001/002) — which answers 'which record is baseline'. What is left is saying so where the reviewer will read it.","code")

R = "SafetyGraphics/qtexplorer"
a(f"{R}#2","covered","qt-explorer","The absolute-QTc diagonals are drawn AND labelled with their threshold in ms — and the defaults are the three the user asked for.",
  "src/qt-explorer/getPlugins.js:153 ctx.fillText(`${threshold} ms`, …); QT-OUT-003 draws the 450/480/500 ms diagonals.","code")
a(f"{R}#4","covered","qt-explorer","Both plots live in one module behind a View control, with the filters in the same sidebar.",
  "QT-CTRL-001 puts all three views in one module behind a View control, with the filters in the same sidebar (QT-CTRL-003) — so the tab-hopping between a global filter tab and a chart tab is gone, which is what #43 says the pain was. The literal request, both plots visible at once, is #28 and is not done.","code")
a(f"{R}#5","migrate","qt-explorer","Typed entry boxes for an age range and for an exact time on the outlier plot's x-axis.",
  "Filters are categorical selects (QT-CTRL-003). hep-explorer's R-Ratio min/max number inputs (HEP-CTRL-010) are the numeric-range precedent.","code")
a(f"{R}#6","migrate","qt-explorer","Reference material in the visualisation itself, so a reader has the context without the workflow document.",
  "hep-explorer carries a Clinical guide in the UI with its primary sources (HEP-DOC-001); qt-explorer carries the ICH E14 threshold but no reference. Pairs with #52.","code")
a(f"{R}#7","migrate","qt-explorer","A four-quadrant view: absolute current value on x, change from baseline on y.",
  "The outlier scatter is baseline value on x, change on y (QT-SCL-004) — a different pairing. hep-explorer's eDISH/mDISH Display Type control is the shape a second pairing would take.","code")
a(f"{R}#8","migrate","qt-explorer","Space the x-axis by visit, and handle pre-dose and post-dose ECGs at one visit.",
  "The central-tendency view orders visits by numeric visit (QT-CT-001); the outlier view has a timepoint selector (QT-OUT-002). Neither models two readings at one visit.","code")
a(f"{R}#9","migrate","qt-explorer","A box plot and a histogram of the ECG parameter, with sample size and a per-visit filter.",
  "The port has both displays as separate modules — results-over-time draws per-visit box marks, histogram draws distributions — but neither is wired to the ECG data contract (src/data/schema/qt-explorer.json).","code")
a(f"{R}#11","migrate","qt-explorer","Aggregate the central tendency by a second variable — separate lines by treatment and sex, or facet.",
  "QT-CT-001 draws one series per treatment arm only.","code")
a(f"{R}#12","migrate","qt-explorer","Visit-to-visit 'cloud' movement of the whole population. Duplicate of #13.","","text")
a(f"{R}#13","migrate","qt-explorer","Plot every data point and watch the cloud shift over time, with good and bad regions marked.",
  "The pieces exist elsewhere: hep-explorer's study-day playback with motion trails (HEP-ANIM-001..008) and nep-explorer's painted stage zones (NEP-ZONE-001..005). Nothing joins them on ECG data.","code")
a(f"{R}#15","covered","qt-explorer","The outlier-scatter tooltip leads with the subject id.",
  "QT-OUT-006 / QT-PLG-003 — id, arm, baseline, value, change, visit.","code")
a(f"{R}#25","covered","qt-explorer","The port does not depend on BASEFL: baseline and change are their own column settings.",
  "QT-DATA-001 maps baseline_col and change_col; QT-DATA-004 derives change as value − baseline when the change column is blank.","code")
a(f"{R}#26","migrate","qt-explorer","Say 'change from baseline' rather than 'change', and leave room for 'change from comparator'.",
  "QT-SCL-003 builds the central-tendency axis title from a Δ/ΔΔ prefix; the wording change is in that one builder.","code")
a(f"{R}#27","migrate","qt-explorer","An animation panel that adapts to whether the data is by day, by hour or by visit.",
  "qt-explorer has no animation; hep-explorer's playback (HEP-ANIM-001..008) is day-based and would need the same flexibility. Related to nepExplorer #173.","code")
a(f"{R}#28","migrate","qt-explorer","Superimpose the central tendency on the outlier panel.",
  "They are separate views behind the View control (QT-CTRL-001). Related to #4, which the port did answer.","code")
a(f"{R}#30","migrate","qt-explorer","Hover text on the reference lines, and change-from-baseline diagonals.",
  "Half done: QT-OUT-003 adds the 30/60 ms change-from-baseline lines in per-visit mode, and the absolute diagonals carry printed labels. Hover text on the lines does not exist.","code")
a(f"{R}#34","obsolete","—","A request to the safetyGraphics Shiny app's maintainers about its global filter indicator. The port's filters sit in the module's own sidebar beside the chart, which is what the thread was reaching for.",
  "src/shell.js renderShell — controls left of the chart.","code")
a(f"{R}#36","covered","qt-explorer","BASE and CHG are the preferred inputs, with derivation as the fallback — the resolution this thread proposed.",
  "QT-DATA-001, QT-DATA-004, QT-DATA-005 (the baseline record is identified from the mapped columns).","code")
a(f"{R}#41","migrate","qt-explorer","A table of the confidence intervals below the central-tendency plot.",
  "The numbers are already computed for the CI band (QT-CT-002) and the module already renders a by-arm table in the categorical view (QT-CAT-001). This is tabulating values that exist.","code","QW9")
a(f"{R}#42","migrate","qt-explorer","Standard labels — 'Observed Value' and 'Change from Baseline Value' — whatever the source column is called. Consolidated with #26.",
  "QT-SCL-003/004 build the axis titles.","code")
a(f"{R}#43","migrate","qt-explorer","A filter modal reachable from each chart page rather than a separate tab.",
  "The port's filters are already beside the chart rather than on another tab (src/shell.js), so the tab-hopping this describes is gone; a modal is a further step.","code")
a(f"{R}#45","obsolete","—","A landing page for the legacy Shiny app. The port's equivalent is the module's own demo page on the documentation site.","","text")
a(f"{R}#46","covered","qt-explorer","The scatter carries its no-change reference line.",
  "QT-OUT-005 — 'a zero no-change reference line'. On a baseline-versus-change scatter, zero change IS the x=y line of the observed-versus-baseline framing; if the #7 four-quadrant view is built, the literal diagonal returns with it.","code")
a(f"{R}#48","migrate","qt-explorer","Lower and upper limits of normal on the scatter drill-down, drawn only when present in the data.",
  "outlier-explorer already draws a normal-range band from per-record LLN/ULN columns (normal_col_low / normal_col_high, normal_range_method).","code")
a(f"{R}#49","migrate","qt-explorer","Let users supply their own horizontal reference lines.",
  "The thresholds are already settings — absolute_thresholds and change_thresholds, sorted and numified on merge (QT-CFG-002) — so user-supplied cut-lines are configuration, and the line drawer is generic.","code")
a(f"{R}#51","migrate","qt-explorer","Warn about unnecessary unblinding when treatment-arm information is loaded.",
  "The port colours by arm throughout (QT-PLG-002) and has the standing-caution mechanism to hang this on (HEP-CAUTION-001). Pairs with #52.","code","QW6")
a(f"{R}#52","migrate","qt-explorer","A standing disclaimer that the tool is exploratory and not validated.",
  "hep-explorer ships exactly this: CLINICAL_CAUTION rendered once into the shell and shown in every view (src/hep-explorer.js:312-317, HEP-CAUTION-001). qt-explorer has a narrower ΔΔ approximation note (src/qt-explorer.js:713) but no standing caution.","code","QW6")
a(f"{R}#53","covered","qt-explorer","Duplicated widget sources are gone: one library, one committed bundle, one module per chart.",
  "src/main.js exposes all thirteen renderers from one build; gsm.safety wraps that same bundle for R.","code")
a(f"{R}#54","covered","qt-explorer","The documentation the issue asks for is generated and published per release: input format, settings and evidence.",
  "src/data/schema/qt-explorer.json (input contract), _api/qt-explorer.json (settings), docs/qt-explorer-coverage.md (evidence). The TQT-versus-phase-3 guidance is not written.","code")
