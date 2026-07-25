/* Platform gap analysis — frozen snapshot, 2026-07-25.
   Sources are external product docs, package references and published papers
   (see landscape.html for the per-platform citation). Our status column was
   established by reading the safety.viz dev branch (11 available renderers,
   2 planned), the gsm.kri metric workflows (17 KRIs), and every open and
   closed issue in jwildfire/obot.roadmap + jwildfire/safety.viz.
   Nothing here fetches at view time. */
window.GAPS = (() => {
  const platforms = [
    { key: 'SG',   name: 'safetyGraphics / ISG', kind: 'os', blurb: 'ASA Biopharm-DIA Interactive Safety Graphics workstream: the R Shiny app plus safetyCharts, safetyProfile, volcanoPlot, nepExplorer, qtexplorer. Our direct ancestor.' },
    { key: 'teal', name: 'teal / NEST (Roche)', kind: 'os', blurb: '40+ clinical modules over a shared Shiny framework, with a filter panel, snapshots, and a report builder.' },
    { key: 'DV',   name: 'DaVinci dv.* (Boehringer)', kind: 'os', blurb: '17 modules in a module-manager shell: eDISH, boxplot, clinical timelines, swimmer, spider, listings, patient profile, bookmark manager.' },
    { key: 'tCD',  name: 'tidyCDISC (Biogen)', kind: 'os', blurb: 'Table Generator, Population Explorer (7 plot types incl. KM and correlation heatmap), Individual Explorer.' },
    { key: 'CDR',  name: 'clinDataReview (Open Analytics)', kind: 'os', blurb: 'YAML-configured R Markdown medical-monitoring report: interactive TLFs, patient profiles, and comparison across two data batches.' },
    { key: 'JMP',  name: 'JMP Clinical (JMP/SAS)', kind: 'com', blurb: 'Domain-driven review reports, patient profiles and narratives, RBM dashboards, geographic risk maps, and a deep fraud/data-integrity family.' },
    { key: 'JR',   name: 'JReview / Integrated Review', kind: 'com', blurb: 'Web clinical data review: graphic patient profiles, patient review tracking (I-Reviewed), RBM data browser, multi-study pooling.' },
    { key: 'SPOT', name: 'Spotfire clinical (Roche CoreSV / Revvity Signals)', kind: 'com', blurb: 'Template set for safety scientists: demographics, AE, labs, vitals, ECG, CM, study drug, patient profile — every page with a linked listing.' },
    { key: 'ELL',  name: 'elluminate (eClinical Solutions)', kind: 'com', blurb: 'Data Central + Clinical Analytics: patient profiles, issue management, changes-since-last-review, and a digital Integrated Data Review Plan.' },
    { key: 'CP',   name: 'CluePoints', kind: 'com', blurb: 'RBQM: central statistical monitoring, KRI dashboard with peer benchmarking, QTLs, integrated issue tracking, chronological patient profiles.' },
    { key: 'MDD',  name: 'Medidata Clinical Data Studio (Detect)', kind: 'com', blurb: 'Centralized monitoring over Rave EDC: ML anomaly detection, risk surveillance, industry benchmark data.' },
    { key: 'VEE',  name: 'Veeva CDB', kind: 'com', blurb: 'Clinical data workbench: multi-source aggregation, change detection, automated query lifecycle, CQL, oversight dashboards.' },
    { key: 'EMP',  name: 'Oracle Empirica Signal', kind: 'com', blurb: 'Signal detection and management: EBGM / PRR / ROR / IC disproportionality, tracked alerts across successive data updates, review-completeness metrics, Topics.' },
    { key: 'FDA',  name: 'FDA Standard Safety Tables & Figures v2.0', kind: 'ref', blurb: 'Reference catalogue, not a platform: 60 tables and 22 figures across Core / Expanded / Optional tiers, April 2025.' },
    { key: 'CTS',  name: 'CTSpedia / PHUSE safety-display catalogues', kind: 'ref', blurb: 'Reference catalogues from the FDA-industry-academia safety graphics working group: AE, ECG and lab display best practice.' }
  ];

  // ourStatus: have | roadmap | missing | partial | oos (out of scope)
  const caps = [
    // ---- A. Chart and view types
    { id: 'A1',  fam: 'views', name: 'Lab / vital-sign distribution (histogram)', on: ['SG','teal','tCD','SPOT','CDR'], status: 'have', ours: 'safety.viz <b>histogram</b>' },
    { id: 'A2',  fam: 'views', name: 'Participant results over time (spaghetti, normal-range band)', on: ['SG','teal','DV','tCD','SPOT','CDR'], status: 'have', ours: 'safety.viz <b>outlier-explorer</b>, participant-profile labs track' },
    { id: 'A3',  fam: 'views', name: 'Population distribution by visit (box-and-whisker over time)', on: ['SG','DV','tCD','SPOT','FDA'], status: 'have', ours: 'safety.viz <b>results-over-time</b>' },
    { id: 'A4',  fam: 'views', name: 'Baseline vs post-baseline shift scatter', on: ['SG','teal','FDA'], status: 'have', ours: 'safety.viz <b>shift-plot</b>' },
    { id: 'A5',  fam: 'views', name: 'Paired change-from-baseline of two measures (delta-delta)', on: ['SG'], status: 'have', ours: 'safety.viz <b>delta-delta</b>' },
    { id: 'A6',  fam: 'views', name: 'eDISH / Hy&rsquo;s-law hepatic screening quadrant', on: ['SG','DV','SPOT','ELL','FDA','CTS'], status: 'have', ours: 'safety.viz <b>hep-explorer</b>' },
    { id: 'A7',  fam: 'views', name: 'Abnormal-baseline DILI tools (composite plot, ALT waterfall)', on: [], status: 'have', ours: 'safety.viz <b>hep-explorer composite</b> + <b>hep-waterfall</b>', note: 'Found on no surveyed platform. Ours implements Tesfaldet 2024 and Amirzadegan 2025 directly.' },
    { id: 'A8',  fam: 'views', name: 'QT / ECG cardiac safety (ICH-E14 central tendency, outliers, categorical)', on: ['SG','SPOT','CTS'], status: 'have', ours: 'safety.viz <b>qt-explorer</b>; Phase 2 filed as <a class="ref" href="https://github.com/jwildfire/obot.roadmap/issues/37">hub#37</a>' },
    { id: 'A9',  fam: 'views', name: 'Hierarchical AE incidence table with drill-down', on: ['SG','DV','teal','CDR','SPOT','JMP'], status: 'have', ours: 'safety.viz <b>ae-explorer</b>' },
    { id: 'A10', fam: 'views', name: 'Per-participant AE timeline', on: ['SG','DV','teal','tCD'], status: 'have', ours: 'safety.viz <b>ae-timelines</b>' },
    { id: 'A11', fam: 'views', name: 'Participant profile drill-down', on: ['SG','teal','DV','tCD','CDR','JMP','JR','SPOT','ELL','CP'], status: 'have', ours: 'safety.viz <b>participant-profile</b>; v2 filed as <a class="ref" href="https://github.com/jwildfire/obot.roadmap/issues/75">hub#75</a>', note: 'The single most universal capability in the survey — present on 10 of 13 platforms.' },
    { id: 'A12', fam: 'views', name: 'Renal / KDIGO kidney-safety explorer', on: ['SG'], status: 'roadmap', ours: '<a class="ref" href="https://github.com/jwildfire/obot.roadmap/issues/35">hub#35</a> nepExplorer migration' },
    { id: 'A13', fam: 'views', name: 'Recurrent-event AE analysis beyond first occurrence', on: [], status: 'roadmap', ours: '<a class="ref" href="https://github.com/jwildfire/obot.roadmap/issues/40">hub#40</a>' },
    { id: 'A14', fam: 'views', name: 'Benefit-risk forest plot / MCDA value tree', on: [], status: 'roadmap', ours: '<a class="ref" href="https://github.com/jwildfire/obot.roadmap/issues/38">hub#38</a>, <a class="ref" href="https://github.com/jwildfire/obot.roadmap/issues/39">hub#39</a>' },
    { id: 'A15', fam: 'views', name: 'Small-multiple panel across all measures at once', on: ['SG','DV','tCD'], status: 'roadmap', ours: 'gallery <i>planned</i>: paneled-outlier-explorer; <a class="ref" href="https://github.com/jwildfire/safety.viz/issues/86">sv#86</a> All-Measures overview', note: 'Goal-atlas candidate C1 proposes the migration requirement.' },
    { id: 'A16', fam: 'views', name: 'Data codebook / dataset quality overview', on: ['SG','CDR'], status: 'roadmap', ours: 'gallery <i>planned</i>: web-codebook', note: 'Goal-atlas candidate C2 proposes scoping-or-retiring it on the record.' },
    { id: 'A17', fam: 'views', name: 'Kaplan-Meier / time-to-event with risk table and CI band', on: ['teal','tCD','SPOT','JMP','FDA'], status: 'missing', ours: '&mdash;', note: 'FDA ST&amp;F names 5 KM figures (F1, F4, F11, F13, F14). Goal-atlas candidate C3 proposes exactly this; we defer to it.' },
    { id: 'A18', fam: 'views', name: 'AE risk-difference screening (volcano plot, dual dot + forest panel)', on: ['SG','teal','JMP','FDA','CTS'], status: 'missing', ours: '&mdash;', note: 'Distinct from hub#38, which is benefit-risk. The ISG already ships <code>SafetyGraphics/volcanoPlot</code> unmigrated; FDA F2/F3 is the static twin.' },
    { id: 'A19', fam: 'views', name: 'Exposure-adjusted incidence rate with confidence intervals', on: ['teal','CP','FDA'], status: 'missing', ours: '&mdash;', note: 'Goal-atlas candidate C4 proposes it; we defer.' },
    { id: 'A20', fam: 'views', name: 'Graded / categorical abnormality shift (CTCAE or normal-range grade)', on: ['teal','JMP','SPOT','FDA'], status: 'missing', ours: '&mdash;', note: 'No renderer takes a grade column. Goal-atlas candidate C5 proposes it; we defer.' },
    { id: 'A21', fam: 'views', name: 'Multi-domain subject timeline / swimmer (all domains on one study-day axis)', on: ['DV','teal','tCD','CP','JR','JMP','SPOT'], status: 'missing', ours: 'AE-only in ae-timelines; labs-only in participant-profile' },
    { id: 'A22', fam: 'views', name: 'Concomitant-medication and medical-history views', on: ['SG','teal','DV','SPOT','JMP'], status: 'missing', ours: '&mdash;', note: 'safetyCharts shipped cmExplorer and mhExplorer; neither was in the migration set. Goal-atlas C6 proposes a CM track on ae-timelines.' },
    { id: 'A23', fam: 'views', name: 'Exposure / study-drug intake and dose-modification display', on: ['teal','DV','SPOT','CP'], status: 'missing', ours: '<a class="ref" href="https://github.com/jwildfire/safety.viz/issues/49">sv#49</a> proposes an EX track inside hep-explorer only' },
    { id: 'A24', fam: 'views', name: 'Demographics, disposition and enrollment context views', on: ['teal','tCD','CDR','SPOT','JMP'], status: 'missing', ours: '&mdash;', note: 'Every platform opens on this and we have none of it. FDA ST&amp;F covers it as tables (hub#9), not as displays.' },
    { id: 'A25', fam: 'views', name: 'Mean / median change from baseline over time with CI error bars', on: ['teal','tCD','SPOT','FDA'], status: 'missing', ours: 'results-over-time draws quantile boxes, never a mean with an interval', note: 'FDA ST&amp;F Core figures F6 and F9 are exactly this display.' },
    { id: 'A26', fam: 'views', name: 'Tendril plot (AE onset direction and magnitude)', on: ['SG'], status: 'missing', ours: '&mdash;', low: true },
    { id: 'A27', fam: 'views', name: 'Correlation heatmap, scatter-plot matrix, ROC', on: ['DV','tCD'], status: 'missing', ours: '&mdash;', low: true, note: 'Biomarker exploration rather than safety review; noted for completeness.' },
    { id: 'A28', fam: 'views', name: 'Oncology response: waterfall, spider, response swimmer', on: ['DV','ELL'], status: 'missing', ours: '&mdash;', low: true, note: 'Efficacy-adjacent; out of the current safety scope but it is what an oncology reviewer opens next to the safety views.' },
    { id: 'A29', fam: 'views', name: 'Geographic site / country risk map', on: ['JMP','CP'], status: 'missing', ours: '&mdash;', low: true },
    { id: 'A30', fam: 'views', name: 'Data-integrity anomaly displays (digit preference, duplicate subjects, invariant results, multivariate outliers, visit-schedule anomalies)', on: ['JMP','CP','MDD'], status: 'missing', ours: 'gsm.kri covers rate-based site KRIs, not these displays' },

    // ---- B. Cross-cutting interaction
    { id: 'B1',  fam: 'interact', name: 'Per-chart filters, grouping and axis controls', on: ['SG','teal','DV','tCD','SPOT','JR','ELL'], status: 'have', ours: 'shared control sidebar on every renderer' },
    { id: 'B2',  fam: 'interact', name: 'Click a mark to open participant detail', on: ['SG','teal','DV','tCD','SPOT','JMP','JR','CDR'], status: 'have', ours: '<code>participantsSelected</code> event + participant-profile' },
    { id: 'B3',  fam: 'interact', name: 'Brush / rectangle multi-select', on: ['SPOT','tCD','DV'], status: 'roadmap', ours: '<a class="ref" href="https://github.com/jwildfire/obot.roadmap/issues/98">hub#98</a>; shift-plot already brushes' },
    { id: 'B4',  fam: 'interact', name: 'Legend click-to-filter', on: ['teal','DV','tCD','SPOT'], status: 'roadmap', ours: '<a class="ref" href="https://github.com/jwildfire/safety.viz/issues/83">sv#83</a>' },
    { id: 'B5',  fam: 'interact', name: 'Linked record listing beneath every display', on: ['SPOT','DV','JR','tCD','CDR','ELL'], status: 'partial', ours: 'histogram, shift-plot, delta-delta, participant-profile only &mdash; 4 of 11' },
    { id: 'B6',  fam: 'interact', name: 'Export the records currently on screen (CSV / Excel)', on: ['SPOT','tCD','CDR','JR','JMP'], status: 'partial', ours: 'ae-explorer summarised CSV; hep-explorer dropped-records CSV. No general listing export.' },
    { id: 'B7',  fam: 'interact', name: 'Study-wide shared filter across all displays, with a live participant count', on: ['SG','teal','DV','SPOT','JMP','CP','ELL'], status: 'missing', ours: 'filters are per-renderer; nothing spans displays', note: '<a class="ref" href="https://github.com/jwildfire/obot.roadmap/issues/29">hub#29</a> requires one shared <i>dataset</i> across charts and leaves the shared-filter mechanism to its Design stage.' },
    { id: 'B8',  fam: 'interact', name: 'Selection broadcast — pick a subject once, every open display follows', on: ['SG','teal','JMP','SPOT','DV'], status: 'missing', ours: 'the event exists inside one renderer; nothing wires it between renderers', note: 'JMP calls it the Review Subject Filter; also within hub#29&rsquo;s Design scope.' },
    { id: 'B9',  fam: 'interact', name: 'Saved views / bookmarks / named snapshots of filter + selection state', on: ['teal','DV','SPOT','JR'], status: 'missing', ours: '&mdash;', note: 'Goal-atlas A7 proposes app-level snapshots of config + results, which is adjacent but not the same object.' },
    { id: 'B10', fam: 'interact', name: 'Shareable deep link to a specific view', on: ['teal','DV','SPOT'], status: 'missing', ours: 'demo pages are static URLs with no state in them' },
    { id: 'B11', fam: 'interact', name: 'Publication-quality static image export', on: ['teal','tCD','SPOT','JMP','CDR'], status: 'missing', ours: '&mdash;', note: 'Goal-atlas C7 proposes it; we defer.' },
    { id: 'B12', fam: 'interact', name: 'Export the code that produced this chart', on: ['SG','teal','tCD'], status: 'missing', ours: '&mdash;' },
    { id: 'B13', fam: 'interact', name: 'Self-contained shareable report of the current review', on: ['SG','teal','tCD','CDR','ELL','JR'], status: 'missing', ours: 'the docs site publishes fixed demos, not a reviewer&rsquo;s own session', note: 'Goal-atlas A6 proposes a one-click report from an app run.' },

    // ---- C. Review workflow
    { id: 'C1', fam: 'workflow', name: 'Review-state tracking — mark a participant or record reviewed, see what is outstanding', on: ['JR','ELL','EMP','CP'], status: 'missing', ours: '&mdash;', note: 'JReview&rsquo;s I-Reviewed checkbox is the canonical form; Empirica tracks review completeness as a percentage per product.' },
    { id: 'C2', fam: 'workflow', name: 'What changed since my last review (data-batch diff, new-data highlighting)', on: ['JR','ELL','VEE','CDR','EMP'], status: 'missing', ours: '&mdash;', note: 'The one capability that appears in both the commercial platforms and the open-source medical-monitoring package.' },
    { id: 'C3', fam: 'workflow', name: 'Annotations — comments, colour-coding or flags on subjects and findings', on: ['JR','CP','ELL','JMP'], status: 'missing', ours: '&mdash;' },
    { id: 'C4', fam: 'workflow', name: 'Issue / action tracking with a lifecycle and documented resolution', on: ['CP','ELL','VEE','EMP','MDD'], status: 'missing', ours: 'GitHub issues track <i>our</i> work, nothing tracks a reviewer&rsquo;s findings' },
    { id: 'C5', fam: 'workflow', name: 'Review plan — objectives linked to specific displays, with completion tracking', on: ['ELL','EMP'], status: 'missing', ours: '&mdash;', note: 'elluminate&rsquo;s digital Integrated Data Review Plan. Rare, and the closest external analogue to our requirement-to-evidence traceability.' },
    { id: 'C6', fam: 'workflow', name: 'Participant-level alerts and threshold notifications', on: ['SPOT','JR','CP','ELL','EMP'], status: 'missing', ours: 'gsm.kri flags <i>sites</i> against thresholds; no participant-level safety alert' },
    { id: 'C7', fam: 'workflow', name: 'Role-based review assignment', on: ['ELL','CP','VEE'], status: 'missing', ours: '&mdash;', low: true },
    { id: 'C8', fam: 'workflow', name: 'Auto-drafted participant narrative', on: ['JMP','JR'], status: 'missing', ours: '&mdash;', note: 'Both platforms generate submission-shaped narrative text from the domains. Nothing in our portfolio writes prose.' },
    { id: 'C9', fam: 'workflow', name: 'Audit trail and e-signature on review actions', on: ['ELL','VEE','JMP'], status: 'missing', ours: '&mdash;', low: true, note: 'Table stakes for a validated system of record; a gate on adoption rather than a display.' },
    { id: 'C10', fam: 'workflow', name: 'Raise an EDC query from the review surface', on: ['ELL','VEE','JR'], status: 'oos', ours: 'we are not an EDC and should not become one' },

    // ---- D. Data and platform
    { id: 'D1', fam: 'platform', name: 'Data-mapping surface — point your columns at the standard domains', on: ['SG','JR','SPOT','tCD','ELL'], status: 'missing', ours: 'gsm.mapping does it in R; no user-facing surface', note: 'Goal-atlas A3 proposes it as an app requirement; we defer.' },
    { id: 'D2', fam: 'platform', name: 'Auto-detection of ADaM / SDTM conventions', on: ['SG','tCD','CDR'], status: 'partial', ours: 'renderer defaults assume ADaM-ish names (USUBJID, PARAM, AVAL) but nothing detects or reports the match' },
    { id: 'D3', fam: 'platform', name: 'Multi-source aggregation and reconciliation (EDC, labs, eCOA, imaging)', on: ['VEE','ELL','MDD'], status: 'oos', ours: 'upstream of us' },
    { id: 'D4', fam: 'platform', name: 'Site-level key risk indicators with a composite risk score', on: ['CP','MDD','JMP','JR'], status: 'have', ours: 'gsm.kri &mdash; 17 metric workflows plus Site Risk Score' },
    { id: 'D5', fam: 'platform', name: 'Quality tolerance limits with documented breaches', on: ['CP','MDD'], status: 'have', ours: 'gsm.qtl' },
    { id: 'D6', fam: 'platform', name: 'Cross-study pooling and peer benchmarking', on: ['JR','CP','MDD'], status: 'missing', ours: 'every renderer takes one study&rsquo;s data' },
    { id: 'D7', fam: 'platform', name: 'Disproportionality statistics (EBGM, PRR, ROR, IC)', on: ['EMP'], status: 'missing', ours: '&mdash;', low: true, note: 'Post-marketing method; the in-trial analogue is the risk-difference screening in A18.' },
    { id: 'D8', fam: 'platform', name: 'Config-driven assembly of a whole review from declarative files', on: ['CDR','SG'], status: 'have', ours: 'gsm YAML workflows (<code>inst/workflow/</code>) plus site config' },
    { id: 'D9', fam: 'platform', name: 'Published per-requirement validation evidence', on: ['CDR','JMP'], status: 'have', ours: 'evidence pages + requirement matrices + qcthat', note: 'CluePoints and JMP claim validation; nobody surveyed publishes requirement-keyed evidence for each display on a public site. This is ours.' },
    { id: 'D10', fam: 'platform', name: 'Stated performance envelope at real study size', on: ['VEE','MDD','CP'], status: 'missing', ours: 'unknown &mdash; every demo dataset is small by construction', note: 'Goal-atlas C8 proposes a performance budget; we defer.' }
  ];

  const fams = {
    views:    { label: 'Chart and view types', blurb: 'The displays a medical monitor or safety reviewer opens.' },
    interact: { label: 'Cross-cutting interaction', blurb: 'How displays connect to each other, to the records behind them, and to what leaves the tool.' },
    workflow: { label: 'Review workflow', blurb: 'The layer that turns a set of charts into a documented review.' },
    platform: { label: 'Data and platform', blurb: 'What has to be true before any display renders.' }
  };

  const proposals = [
    {
      id: 'P1', rank: 1, goal: 'app', size: 'L',
      title: 'Review state — mark it reviewed, and show me what changed since',
      caps: ['C1','C2','C3'],
      pitch: 'A reviewer who opens the same study every week needs two things no display gives them: a record of what they have already looked at, and a highlight on what has arrived or changed since. Give the portfolio a review-state layer — per-participant reviewed / not-reviewed with an optional comment, and a data-batch diff that marks participants whose records changed since the last reviewed snapshot — surfaced in the participant profile, in every linked listing, and as a filter (“show me only what is new”).',
      why: 'This is the strongest signal in the survey. Review tracking appears on JReview, elluminate, Empirica and CluePoints; change-since-last-review appears on those plus Veeva CDB <i>and</i> clinDataReview, the one open-source medical-monitoring package that competes with us directly. It is the difference between a chart library and a review tool, and it is filed nowhere — not on the hub, not in safety.viz, not in the goal atlas. It also lands squarely on the app goal’s unanswered question: what does “replacement” mean beyond drawing the same pictures?',
      risk: 'Needs a place to persist state and a notion of a data snapshot, so it is genuinely an app requirement rather than a renderer one. The renderer-side piece — accept and display a per-participant state column, emit state changes as events — is small and can ship first inside safety.viz.'
    },
    {
      id: 'P2', rank: 2, goal: 'app', size: 'M',
      title: 'Review plan as a first-class object — objectives linked to displays, with completion tracking',
      caps: ['C5','C4'],
      pitch: 'Let a study define its review objectives (“screen for Hy’s-law cases weekly”, “check every grade 3+ lab”), attach each objective to the specific display that answers it, and track completion per reviewer. Findings raised against an objective become tracked items with a documented resolution.',
      why: 'elluminate shipped a digital Integrated Data Review Plan and calls it an industry first; Empirica tracks review completeness as a percentage. Ours would be the open-source version — and it is an unusually good fit, because linking an objective to the display that satisfies it is structurally the same move as linking a requirement to its evidence page, which this portfolio already does better than anyone surveyed. It converts our traceability culture into a user-facing feature instead of a developer-facing one.',
      risk: 'Only two surveyed platforms have it, so it is a differentiation bet rather than parity. Scope it as a declarative plan file the app reads, not as a workflow engine.'
    },
    {
      id: 'P3', rank: 3, goal: 'charts', size: 'M',
      title: 'AE risk-difference screening — the volcano plot and the dual dot + forest panel',
      caps: ['A18'],
      pitch: 'Two linked views of the same question, “which preferred terms differ between arms and by how much”: a volcano of risk difference against significance for screening across hundreds of terms, and the paired dot-plus-forest panel — incidence per arm on the left, risk difference with 95% CI on the right, sorted by effect — for reading the top of that list. Click a term to drill to the participants behind it.',
      why: 'The AE portfolio counts and lists events but never <i>compares arms with an interval</i>, which is the first question asked of any imbalance. The display is in the FDA guide as two Core figures (F2, F3), in the CTSpedia catalogue, in teal, and in JMP Clinical; the ISG working group already built <code>SafetyGraphics/volcanoPlot</code> and it was never in our migration set. It is also distinct from hub#38, which is benefit-risk across endpoints, not AE screening within one.',
      risk: 'Needs a defensible statistics choice (unadjusted risk difference with Wald or Newcombe intervals; no multiplicity claim) and clear language that this is screening, not inference. Pairs naturally with the FDA static twins in hub#9 Phase 1.'
    },
    {
      id: 'P4', rank: 4, goal: 'charts', size: 'S',
      title: 'Mean change from baseline over time with confidence intervals',
      caps: ['A25'],
      pitch: 'A mean-or-median change-from-baseline trajectory per arm with CI error bars at each visit, over the measure families the guide names (chemistry, kidney, liver, lipids, haematology, vital signs), with the visit-level n reported below.',
      why: 'The cheapest genuine hole in the chart portfolio. results-over-time draws quantile boxes, which answer “what is the spread”; every surveyed platform also ships the mean-with-interval view, which answers “did the group move”, and reviewers use both. It is two FDA Core figures (F6, F9), it reuses the results-over-time data contract unchanged, and it is the natural interactive twin of a static chart hub#9 will build anyway.',
      risk: 'Almost none. The only real decision is mean-vs-median default and whether extreme-value exclusion follows the FDA rule (it should, and that rule is already scoped as a shared derivation in the hub#9 design).'
    },
    {
      id: 'P5', rank: 5, goal: 'charts', size: 'M',
      title: 'One participant, every domain, one axis — the multi-domain timeline',
      caps: ['A21','A22'],
      pitch: 'A subject-level timeline that puts adverse events, concomitant medications, exposure, visits and lab excursions on a single study-day axis, with duration bars for intervals and marks for point events. Standalone, and as a track inside the participant profile.',
      why: 'The most frequent missing <i>view</i> in the survey — seven platforms ship some form of it (DaVinci ships two, clinical timelines and swimmer). Our ae-timelines is AE-only and the participant profile is labs-only, so the question a hepatic signal always raises — what else was happening, and what were they taking — cannot be answered in one picture. CM and MH are the specific domains missing: safetyCharts shipped cmExplorer and mhExplorer and neither was in the migration set.',
      risk: 'Overlaps two filed items and one atlas candidate: hub#75 is already bringing AE tracks into the profile, and atlas C6 proposes a CM track on ae-timelines. Recommendation is to <b>fold C6 into this</b> and sequence it after hub#75 lands the shared study-day axis, rather than building a third timeline.'
    },
    {
      id: 'P6', rank: 6, goal: 'charts', size: 'M',
      title: 'The context set — demographics, disposition and enrollment',
      caps: ['A24'],
      pitch: 'The views every reviewer opens before any safety display: baseline characteristics by arm (discrete and continuous, with a linked listing on the outliers), disposition and discontinuation reasons, and enrollment over time by site and country.',
      why: 'Five platforms open on this and we ship none of it. Spotfire’s template set literally begins with two demographics pages; tidyCDISC’s Table Generator exists mostly to produce them. Without them a reviewer cannot answer “is this imbalance a safety signal or a population difference”, which is the standard first challenge to anything the rest of the portfolio shows. hub#9 covers this ground as static FDA tables — it is the interactive half that is absent.',
      risk: 'Risks looking like table-generation rather than safety graphics, which is a real scope question for a chart library. Frame it as three small renderers over ADSL, not a table builder.'
    },
    {
      id: 'P7', rank: 7, goal: 'autonomy', size: 'M',
      title: 'Participant-level safety alerting — an agent that watches the refreshed data',
      caps: ['C6','C2'],
      pitch: 'Declarative participant-level criteria (a new potential Hy’s-law case, a QTcF crossing 500 ms, a grade 3+ result, a first SAE at a site) evaluated on each data refresh, producing a digest of newly-flagged participants with a deep link into the display that shows why. Notification, not adjudication.',
      why: 'Five platforms alert on safety criteria; gsm.kri flags <i>sites</i> against thresholds and nothing in the portfolio flags a participant. It is also the most natural piece of external-platform parity that lands on the autonomy goal rather than the chart goal: the machinery to evaluate rules on a schedule and report unattended already exists in this project and is running tonight. The keynote version writes itself — the roadmap’s own automation, pointed at study data instead of at issues.',
      risk: 'The line between “notify a human” and “interpret a signal” must be drawn in the requirement and stay drawn. Depends on a notion of a data refresh, shared with P1’s snapshot diff — worth designing the two together.'
    },
    {
      id: 'P8', rank: 8, goal: 'keynote', size: 'M',
      title: 'Auto-drafted participant narrative',
      caps: ['C8'],
      pitch: 'From the data already assembled for the participant profile, draft the narrative paragraph a medical writer would write — demographics, exposure, the event and its course, concurrent medications, relevant labs with dates — as reviewable text with every claim traceable to the record that supports it.',
      why: 'Both JMP Clinical and JReview generate narratives, and it is the one capability in the survey where being an AI-native project is a structural advantage rather than a story about how the code got written. It is also the most demonstrable thing on this list for a September audience: a click on an eDISH point produces the paragraph, sourced.',
      risk: 'The published evidence on clinical summarisation is blunt about the failure mode — the primary risk is <i>omission</i> of true abnormalities rather than visible fabrication, and it worsens for exactly the rare high-stakes events safety review exists to catch. Any version of this ships as a draft for a human, with per-sentence provenance and a completeness check against the source records, or it does not ship.'
    },
    {
      id: 'P9', rank: 9, goal: 'charts', size: 'M',
      title: 'Listings everywhere, and export what is on screen',
      caps: ['B5','B6'],
      pitch: 'A linked record listing under every renderer, reflecting the current filters and selection, with a CSV download of exactly those rows and the columns as shown.',
      why: 'Six platforms put a listing under every display — in the Roche Spotfire template it is the defining interaction: mark a mark, read the records. We have it on 4 of 11 renderers and CSV export on 2, in both cases for special purposes. This is the capability that makes a display checkable, which matters more for us than for anyone else given the evidence culture.',
      risk: 'Partly covered already: sv#86 and sv#88 touch overview and selection-note consistency. Small enough to run as a cross-renderer sweep rather than a requirement, if @jwildfire prefers.'
    },
    {
      id: 'P10', rank: 10, goal: 'charts', size: 'M',
      title: 'Take it with you — chart code and a self-contained review report',
      caps: ['B12','B13','B9','B10'],
      pitch: 'Two exports and one link: the code that reproduces the current chart with its current settings; a self-contained HTML file of the reviewer’s current set of displays; and a URL that restores filter and selection state.',
      why: 'safetyGraphics ships all three (per-chart code export, standalone HTML report, session zip) and teal ships the report-card equivalent, so this is parity with our own ancestor rather than novelty. Reproducibility is the claim a regulated audience tests hardest, and “I explored, then handed someone exactly what I saw” is what actually leaves a review tool.',
      risk: 'Overlaps two atlas candidates — C7 (static image export) and A6 (one-click app report). This is the third leg, chart-level and state-level; the three should be scoped as one requirement rather than three, and the atlas versions have priority for the parts they name.'
    },
    {
      id: 'P11', rank: 11, goal: 'charts', size: 'L',
      title: 'Data-integrity displays — the fraud and implausibility family',
      caps: ['A30','A29'],
      pitch: 'The screening displays JMP Clinical and CluePoints are known for: terminal-digit preference by site as a volcano, duplicate-subject candidates from demographics and baseline measurements, invariant or repeated result sequences, multivariate outliers by site, visit-schedule and weekday/holiday anomalies, and a site map of the composite risk.',
      why: 'This is the largest coherent capability block in the survey that our portfolio does not touch at all, and it is the part of centralised monitoring reviewers find most striking in a demo. gsm.kri computes rate-based site metrics; none of these are rates.',
      risk: 'Ranked low deliberately: it is arguably a different product from safety review, it sits closer to gsm.core / gsm.kri than to safety.viz, and it is the one block where a poorly-worded display accuses a site of misconduct. Worth filing as a scoping requirement, not a build.'
    },
    {
      id: 'P12', rank: 12, goal: 'app', size: 'XL',
      title: 'Noted, not proposed — pooling, benchmarking, audit trail, EDC queries',
      caps: ['D6','C9','C7','C10','D3'],
      pitch: 'Four capabilities the survey found repeatedly that this project should decide <i>not</i> to build yet, on the record: cross-study pooling and peer benchmarking (JReview, CluePoints, Medidata), audit trail and e-signature on review actions (elluminate, Veeva, JMP), role-based review assignment, and query issuance back to the EDC.',
      why: 'Each is real and each would be a workstream. Writing down that they are out of scope for v1 — and what would bring them in — is cheaper than being asked in September why they are missing and having no answer.',
      risk: 'Not a build proposal. One short decision note under the app goal.'
    }
  ];

  const ours = [
    { title: 'Abnormal-baseline DILI tooling', body: 'The composite baseline-referenced eDISH (Tesfaldet 2024) and the ALT waterfall (Amirzadegan 2025) appear on none of the thirteen platforms surveyed. Both address the case where eDISH’s ×ULN quadrants stop meaning anything, which is a real and common trial population.' },
    { title: 'Published per-requirement evidence', body: 'Several platforms claim validation. None surveyed publishes, on a public site, a requirement-keyed evidence page per display with the screenshots and test identifiers behind it. This is the portfolio’s sharpest differentiator and it is a process artefact, not a feature.' },
    { title: 'Framework-free embeddable modules', body: 'teal needs Shiny, DaVinci needs dv.manager, the commercial tools need their platform. safety.viz modules are plain JavaScript with a documented data contract, wrapped as R htmlwidgets in gsm.safety — the same chart in a Shiny app, a Quarto report, or a plain web page.' },
    { title: 'One normative rule set behind static and interactive twins', body: 'The hub#9 design shares the FDA guide’s derivation rules between ggplot output and the JavaScript renderers instead of implementing them twice. No surveyed platform ships both halves from one rule layer; the pharmaverse static catalogue and the interactive tools are separate worlds.' }
  ];

  // derived
  const byId = Object.fromEntries(caps.map(c => [c.id, c]));
  // Headline = missing, not judged low priority, and shipped by at least four of
  // the thirteen platforms. Four rather than three is a readability cut, not a
  // finding: eight further rows sit at exactly three and stay in the matrix.
  const HEADLINE_MIN = 4;
  const headline = caps
    .filter(c => c.status === 'missing' && !c.low && c.on.filter(k => {
      const p = platforms.find(x => x.key === k); return p && p.kind !== 'ref';
    }).length >= HEADLINE_MIN)
    .map(c => ({ ...c, n: c.on.filter(k => (platforms.find(x => x.key === k) || {}).kind !== 'ref').length }))
    .sort((a, b) => b.n - a.n || a.id.localeCompare(b.id));

  const counts = ['have', 'roadmap', 'partial', 'missing', 'oos']
    .reduce((o, s) => (o[s] = caps.filter(c => c.status === s).length, o), {});
  counts.total = caps.length;
  counts.platforms = platforms.filter(p => p.kind !== 'ref').length;
  counts.sources = platforms.length;
  counts.headlineMin = HEADLINE_MIN;
  counts.atThree = caps.filter(c => c.status === 'missing' && !c.low &&
    c.on.filter(k => (platforms.find(x => x.key === k) || {}).kind !== 'ref').length === 3).length;

  return { platforms, caps, fams, proposals, ours, byId, headline, counts };
})();
