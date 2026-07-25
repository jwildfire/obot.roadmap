/* Platform gap analysis — view builders.
   Reads window.GAPS (data/gaps-data.js). No network, no dependencies.

   Views:
     capsules()   — one card per surveyed platform (landscape.html)
     matrix()     — the capability x status table, filterable (matrix.html)
     freq()       — single-series magnitude bars for the headline set (index.html)
     proposals()  — ranked requirement proposals (proposals.html)
     rollup()     — status counts by family (matrix.html + index.html)
*/
(function () {
  "use strict";

  var G = window.GAPS;
  var P = {};
  G.platforms.forEach(function (p) { P[p.key] = p; });

  var ST = {
    have:    { g: "✓", w: "Have",       cls: "st-have" },
    roadmap: { g: "◐", w: "On roadmap", cls: "st-roadmap" },
    partial: { g: "◐", w: "Partial",    cls: "st-partial" },
    missing: { g: "○", w: "Missing",    cls: "st-missing" },
    oos:     { g: "—", w: "Out of scope", cls: "st-oos" }
  };

  function el(tag, cls, html) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    return e;
  }

  function stChip(status) {
    var s = ST[status];
    return "<span class='st " + s.cls + "'><span class='g' aria-hidden='true'>" + s.g + "</span>" + s.w + "</span>";
  }

  /* platforms shipping a capability, excluding the reference catalogues */
  function realCount(cap) {
    return cap.on.filter(function (k) { return P[k] && P[k].kind !== "ref"; }).length;
  }

  /* ---------- tooltip (shared) ---------- */
  var tip;
  function tipEl() {
    if (!tip) { tip = el("div"); tip.id = "tip"; document.body.appendChild(tip); }
    return tip;
  }
  function bindTip(node, title, meta) {
    node.addEventListener("mouseenter", function () {
      var t = tipEl();
      t.innerHTML = "<span class='tt'></span><span class='tm'></span>";
      t.querySelector(".tt").textContent = title;
      t.querySelector(".tm").textContent = meta || "";
      t.classList.add("on");
    });
    node.addEventListener("mousemove", function (ev) {
      var t = tipEl(), pad = 14, r = t.getBoundingClientRect();
      var x = Math.min(ev.clientX + pad, window.innerWidth - r.width - 8);
      var y = Math.min(ev.clientY + pad, window.innerHeight - r.height - 8);
      t.style.left = x + "px"; t.style.top = y + "px";
    });
    node.addEventListener("mouseleave", function () { tipEl().classList.remove("on"); });
  }

  /* ---------- platform capsules ---------- */
  function capsules(mountId) {
    var mount = document.getElementById(mountId);
    if (!mount) return;
    var groups = [
      { kind: "os",  title: "Open-source R and JavaScript", lede: "The tools a team could adopt tomorrow without a purchase order — and the set this portfolio is measured against most directly." },
      { kind: "com", title: "Commercial review and monitoring platforms", lede: "What a sponsor or CRO actually buys. Detail here comes from product documentation, user guides and conference papers rather than sales pages, and is thinner where a vendor publishes less." },
      { kind: "ref", title: "Reference catalogues", lede: "Not platforms — the published display inventories that several of the platforms above implement." }
    ];
    groups.forEach(function (grp) {
      mount.appendChild(el("h2", null, grp.title));
      mount.appendChild(el("p", "lede", grp.lede));
      var grid = el("div", "caps-grid");
      G.platforms.filter(function (p) { return p.kind === grp.kind; }).forEach(function (p) {
        var c = el("article", "capsule " + p.kind);
        c.innerHTML =
          "<h3>" + p.name + " <span class='key'>" + p.key + "</span></h3>" +
          "<p class='what'>" + p.blurb + "</p>" +
          "<h4>Signature views and workflows</h4><ul>" +
          (CAPSULE[p.key] || []).map(function (s) { return "<li>" + s + "</li>"; }).join("") +
          "</ul>" +
          "<p class='src'>" + (SRC[p.key] || "") + "</p>";
        grid.appendChild(c);
      });
      mount.appendChild(grid);
    });
  }

  /* ---------- the matrix ---------- */
  function matrix(mountId, opts) {
    var mount = document.getElementById(mountId);
    if (!mount) return;
    opts = opts || {};
    var state = { status: "all", q: "" };

    var bar = el("div", "controls");
    bar.innerHTML =
      "<label>Status <select id='f-status'>" +
      "<option value='all'>all</option>" +
      "<option value='missing'>missing only</option>" +
      "<option value='gap'>missing + partial</option>" +
      "<option value='roadmap'>on roadmap</option>" +
      "<option value='have'>have</option></select></label>" +
      "<label>Find <input type='search' id='f-q' placeholder='capability or platform' size='22'></label>" +
      "<span class='result-count' id='f-count'></span>";
    mount.appendChild(bar);

    var body = el("div");
    mount.appendChild(body);

    function match(c) {
      if (state.status === "missing" && c.status !== "missing") return false;
      if (state.status === "gap" && c.status !== "missing" && c.status !== "partial") return false;
      if (state.status === "roadmap" && c.status !== "roadmap") return false;
      if (state.status === "have" && c.status !== "have") return false;
      if (state.q) {
        var hay = (c.name + " " + (c.note || "") + " " + (c.ours || "") + " " +
          c.on.map(function (k) { return P[k] ? P[k].name : k; }).join(" ")).toLowerCase();
        if (hay.indexOf(state.q.toLowerCase()) < 0) return false;
      }
      return true;
    }

    function render() {
      body.innerHTML = "";
      var shown = 0;
      Object.keys(G.fams).forEach(function (fk) {
        var rows = G.caps.filter(function (c) { return c.fam === fk && match(c); });
        if (!rows.length) return;
        shown += rows.length;
        body.appendChild(el("h3", null, G.fams[fk].label +
          " <span style='font-weight:400;color:var(--faint);font-size:.85rem'>· " + rows.length + "</span>"));
        body.appendChild(el("p", "lede", G.fams[fk].blurb));
        var wrap = el("div", "tablewrap");
        var t = el("table", "captable");
        t.innerHTML = "<thead><tr><th>#</th><th>Capability</th><th>Where we stand</th><th>Ours</th>" +
          "<th>Seen on</th></tr></thead>";
        var tb = el("tbody");
        rows.forEach(function (c) {
          var tr = el("tr", c.low ? "dim" : null);
          var chips = c.on.length
            ? c.on.map(function (k) {
                var p = P[k];
                return "<span class='pk" + (p && p.kind === "ref" ? " ref" : "") +
                  "' data-k='" + k + "'>" + k + "</span>";
              }).join("")
            : "<span class='pk-none'>none surveyed</span>";
          tr.innerHTML =
            "<td class='c-id'>" + c.id + "</td>" +
            "<td class='c-name'><span class='cn'>" + c.name + "</span>" +
            (c.note ? "<span class='rownote'>" + c.note + "</span>" : "") + "</td>" +
            "<td class='c-status'>" + stChip(c.status) + "</td>" +
            "<td class='c-ours'>" + (c.ours || "&mdash;") + "</td>" +
            "<td class='c-on'>" + chips + "</td>";
          tb.appendChild(tr);
        });
        t.appendChild(tb);
        wrap.appendChild(t);
        body.appendChild(wrap);
      });
      if (!shown) body.appendChild(el("p", "note", "Nothing matches that filter."));
      document.getElementById("f-count").textContent = shown + " of " + G.caps.length + " capabilities";
      body.querySelectorAll(".pk").forEach(function (n) {
        var p = P[n.dataset.k];
        if (p) bindTip(n, p.name, p.kind === "ref" ? "reference catalogue" : (p.kind === "os" ? "open source" : "commercial"));
      });
    }

    bar.querySelector("#f-status").addEventListener("change", function (e) { state.status = e.target.value; render(); });
    bar.querySelector("#f-q").addEventListener("input", function (e) { state.q = e.target.value.trim(); render(); });
    if (opts.status) { state.status = opts.status; bar.querySelector("#f-status").value = opts.status; }
    render();
  }

  /* ---------- headline frequency bars ---------- */
  function freq(mountId) {
    var mount = document.getElementById(mountId);
    if (!mount) return;
    var rows = G.headline;
    var max = Math.max.apply(null, rows.map(realCount));
    var box = el("div", "freq");
    rows.forEach(function (c) {
      var n = realCount(c);
      var r = el("div", "freq-row");
      r.innerHTML =
        "<div class='freq-lab'><span class='rid'>" + c.id + "</span>" + c.name + "</div>" +
        "<div class='freq-track'>" +
          "<span class='freq-bar' style='width:" + Math.round((n / max) * 150) + "px'></span>" +
          "<span class='freq-n'>" + n + " of 13</span>" +
        "</div>";
      box.appendChild(r);
    });
    mount.appendChild(box);
    mount.appendChild(el("p", "freq-axis",
      "Bar length is how many of the thirteen surveyed platforms ship the capability; the number is printed on every row, so the bar is a reading aid rather than the only encoding. The two reference catalogues are excluded from the count. Capabilities we already have, already have filed, or judged out of scope are excluded from the list."));
  }

  /* ---------- status rollup by family ---------- */
  function rollup(mountId) {
    var mount = document.getElementById(mountId);
    if (!mount) return;
    var order = ["have", "roadmap", "partial", "missing", "oos"];
    var wrap = el("div", "tablewrap");
    var t = el("table", "matrix");
    t.innerHTML = "<thead><tr><th>Family</th>" +
      order.map(function (s) { return "<th>" + ST[s].w + "</th>"; }).join("") +
      "<th>Total</th></tr></thead>";
    var tb = el("tbody");
    Object.keys(G.fams).forEach(function (fk) {
      var rows = G.caps.filter(function (c) { return c.fam === fk; });
      var tr = el("tr");
      tr.innerHTML = "<th scope='row'>" + G.fams[fk].label + "</th>" +
        order.map(function (s) {
          var n = rows.filter(function (c) { return c.status === s; }).length;
          return "<td class='" + (n ? "" : "zero") + "'>" + n + "</td>";
        }).join("") + "<td>" + rows.length + "</td>";
      tb.appendChild(tr);
    });
    var tot = el("tr", "total");
    tot.innerHTML = "<th scope='row'>All</th>" +
      order.map(function (s) { return "<td>" + (G.counts[s] || 0) + "</td>"; }).join("") +
      "<td>" + G.caps.length + "</td>";
    tb.appendChild(tot);
    t.appendChild(tb);
    wrap.appendChild(t);
    mount.appendChild(wrap);
  }

  /* ---------- proposals ---------- */
  function proposals(mountId) {
    var mount = document.getElementById(mountId);
    if (!mount) return;
    var GOALNUM = { charts: 78, app: 79, autonomy: 73, keynote: 72 };
    var GOALNAME = { charts: "Charts", app: "App", autonomy: "Autonomy", keynote: "Keynote" };
    var box = el("div", "props");
    G.proposals.forEach(function (p) {
      var c = el("article", "prop " + p.goal);
      c.innerHTML =
        "<h4><span class='rank'>" + p.rank + "</span>" + p.title + " <span class='id'>" + p.id + "</span></h4>" +
        "<p>" + p.pitch + "</p>" +
        "<p class='label'>Why this one</p><p class='why'>" + p.why + "</p>" +
        "<p class='label'>What makes it hard</p><p class='risk'>" + p.risk + "</p>" +
        "<div class='meta'>" +
          "<a class='ref' href='https://github.com/jwildfire/obot.roadmap/issues/" + GOALNUM[p.goal] + "'>#" +
            GOALNUM[p.goal] + "</a>" +
          "<span class='goalchip2 " + p.goal + "'>" + GOALNAME[p.goal] + "</span>" +
          "<span class='size'>size " + p.size + "</span>" +
          p.caps.map(function (id) {
            return "<span class='chip' title='" + (G.byId[id] ? G.byId[id].name.replace(/<[^>]+>/g, "") : id) + "'>" + id + "</span>";
          }).join("") +
        "</div>";
      box.appendChild(c);
    });
    mount.appendChild(box);
  }

  /* ---------- differentiators ---------- */
  function ours(mountId) {
    var mount = document.getElementById(mountId);
    if (!mount) return;
    var box = el("div", "diffs");
    G.ours.forEach(function (o) {
      box.appendChild(el("div", "diff", "<h4>" + o.title + "</h4><p>" + o.body + "</p>"));
    });
    mount.appendChild(box);
  }

  /* ---------- per-platform detail used by capsules() ---------- */
  var CAPSULE = {
    SG: [
      "Chart set (safetyCharts): hepExplorer, AE explorer, AE timelines, histogram, outlier explorer, results over time, shift plot, delta-delta, paneled outlier explorer — plus <b>cmExplorer</b>, <b>mhExplorer</b>, <b>labdist</b>, <b>tendril</b> and a demographics RTF, and QT variants of six of them.",
      "Separate ISG repositories: <b>volcanoPlot</b> (AE risk-difference screening), <b>safetyProfile</b> (patient profile), <b>nepExplorer</b> (renal), <b>qtexplorer</b>.",
      "App shell: Home / <b>Mapping</b> (auto-populates for ADaM) / <b>Filtering</b> (datamods, cross-domain, live participant count in the corner) / Charts / Settings.",
      "Every chart offers a standalone HTML report and the reproducible R code behind it; Settings exports a zip that reopens the app with the session's customisations."
    ],
    teal: [
      "20 table modules — events by term, by grade and by SMQ; abnormality by worst grade; shift by arm and by grade; exposure; event rates adjusted for patient-years; ANCOVA, Cox, logistic and time-to-event.",
      "7 graph modules — Kaplan-Meier, forest (response and survival), confidence-interval plot, line plot, individual patient plots, bar chart.",
      "8 patient-profile modules covering basic info, AEs, <b>therapy</b>, <b>prior medication</b>, <b>medical history</b>, laboratory, vitals and a patient timeline.",
      "Framework: the teal.slice filter panel with module-specific filters and <b>named snapshots</b>; teal.reporter report cards that persist into bookmarks and download as a report; teal.code for reproducibility."
    ],
    DV: [
      "17 modules in a gallery: eDISH, boxplot and violin, <b>clinical timelines</b> (AEs and medications per subject), <b>swimmer plot</b>, <b>spider plot</b>, waterfall plus heatmap, correlation heatmap, scatter-plot matrix, ROC, forest, line plot, hierarchical count table, Tplyr table, listings, patient profile.",
      "<b>dv.bookman</b> — a bookmark manager listing server-side bookmarks with descriptions; bookmarking is a framework contract every module supports.",
      "dv.manager as the shell, dv.loader for local and remote data, dv.teal to run teal modules inside it."
    ],
    tCD: [
      "<b>Table Generator</b> — drag variables and statistics into bins to build validated summary tables.",
      "<b>Population Explorer</b> — scatter, spaghetti, box, mean-over-time with 95% CI and user-placed reference lines, bar, correlation heatmap (Pearson or Spearman with significance labelling), and a <b>Kaplan-Meier</b> curve that appears when time-to-event data is loaded.",
      "<b>Individual Explorer</b> — patient metrics by visit, plus events on a timeline.",
      "Filters apply across modules; bulk download of outputs to HTML or PDF."
    ],
    CDR: [
      "Interactive TLFs via plotly and DT: sunburst and treemap of AE counts, scatter, line, bar, summary tables and listings.",
      "Patient-profile generation; drill-down from an aggregate to the records behind it.",
      "<b>Comparison across two data batches</b> — the interim-refresh diff, in an open-source package.",
      "Whole reports are declared in YAML config over R Markdown templates, so a non-R user can configure a study."
    ],
    JMP: [
      "Reports generated automatically across the Findings, Events and Interventions domains, plus customised <b>patient profiles</b> and <b>auto-generated AE narratives</b>.",
      "<b>Review Subject Filter</b> — one subject selection broadcast to every report in a review.",
      "RBM: site- and country-level risk indicators, a primary risk dashboard, and <b>geographic maps</b> of site and country risk.",
      "A distinctive data-integrity family: hierarchical clustering of sites; duplicate-subject detection by birth date and by baseline vitals; invariant-result detection; weekday and holiday visit anomalies; visit-attendance distributions; a <b>digit-preference volcano plot</b>; Mahalanobis and between-subject distance box plots by site."
    ],
    JR: [
      "Graphic patient profiles on a days-on-drug axis — duration bars for intervals, trend plots with normal ranges.",
      "<b>Patient review tracking</b>: an “I-Reviewed” checkbox per patient; patients with new data since the last review are highlighted; reviewers can colour-code and comment on patients.",
      "Dynamic patient-selection filters bound to different dashboard views, and parameter-aware selection (“patients with a 10% elevation of LDH from baseline”).",
      "RBM Data Browser — risk categories and indicators with thresholds and suggested actions, scheduled periodic analyses, sortable site ranking. Multi-study pooling and patient narratives."
    ],
    SPOT: [
      "Roche's Core Safety Visualization template set: Demographics (discrete and continuous), AE bar chart by SOC drilling to PT, AE summary tables, lab mean line plots, a <b>lab by-patient plot</b> annotated with AEs, spaghetti coloured by CTC grade, a <b>study-drug intake plot</b> marking dose modifications, and time-to-onset curves.",
      "A <b>linked listing under every page</b> — mark a mark, read the underlying records, with rule-based cell colouring (serious events in red).",
      "A right-hand filter panel applying to every visualization, a live selected-patient count, “Show Modified Filters” and “Reset Filters and Markings”, and <b>bookmarked filter selections</b> that persist between sessions.",
      "Web-player access for reviewers (no authoring), Excel export of tables and listings. The commercial packaging is Revvity Signals' Medical and Clinical Data Review, which adds alert criteria on safety, efficacy and medical outcomes."
    ],
    ELL: [
      "<b>Integrated Data Review Plan</b> — a digital review plan where each objective links to the listings, visualizations and dashboards that satisfy it, with automatic progress and completion tracking for audit readiness and highlighting of objectives tied to critical data.",
      "Data Central: patient profiles, role-based review, issue management, <b>identification of data changes since the last review</b>, and EDC query processing without leaving the tool.",
      "Clinical Analytics: self-service visualizations including oncology-specific Hy's Law and tumour-response views, AI anomaly detection, and ML-driven audit-trail review."
    ],
    CP: [
      "Central statistical monitoring across all clinical and operational data — flags problematic patients, sites and countries; targets fabrication, recording errors, equipment faults, rater bias and implausible accrual.",
      "KRI dashboard ranking sites on 10+ metrics with statistical and subjective thresholds, scoring each site <b>against its peers</b> as well as against tolerance limits.",
      "QTL module with automatic breach documentation, justification and evidence.",
      "<b>Integrated issue tracking</b> across detection modules — findings and corrective actions in one environment. Patient Profiles render a chronological view of visits, exposure, AEs and concomitant medications."
    ],
    MDD: [
      "Clinical Data Studio (formerly Detect): centralised monitoring over Rave EDC with machine-learning detection of outliers, anomalies and trends.",
      "Risk surveillance dashboards, targeted SDV driven by the identified risks, and industry benchmark data as a comparison set.",
      "Published feature detail is thin — this capsule is deliberately shorter than its neighbours rather than padded."
    ],
    VEE: [
      "Clinical data workbench: automated aggregation and reconciliation across EDC, RTSM, eCOA, labs and imaging into one harmonised package.",
      "<b>Change detection</b> plus an automated query lifecycle — discrepancies raise queries, and queries close when the issue resolves.",
      "Clinical Query Language for transformations; real-time cross-functional review with oversight dashboards."
    ],
    EMP: [
      "Disproportionality scoring — EBGM, IC, PRR, ROR — over a product-event safety database.",
      "<b>Signal Review</b>: tracked versus informational alerts, monitored across successive data updates, so a reviewer sees how a signal moves rather than only where it stands today.",
      "An “Alerts Reviewed” completeness measure per product, with a hierarchical Products / Product-Event Combinations interface for prioritisation. Topics documents the signal-management process itself."
    ],
    FDA: [
      "22 figures and 60 tables across Core / Expanded / Optional tiers, plus five appendix reference tables of abnormality and implausibility thresholds.",
      "The figure set: five Kaplan-Meier plots, two dual dot-plus-forest AE panels, two DILI screening scatters, two mean-change-with-CI plots, six box-plot-over-time figures, two shift scatters, two data-availability bar figures, one incidence-rate point-range.",
      "Already assessed and planned in <a class='ref' href='https://github.com/jwildfire/obot.roadmap/issues/9'>hub#9</a> — included here so the platform survey and the guidance survey can be read against each other."
    ],
    CTS: [
      "CTSpedia's clinical-graph catalogue, from a three-year FDA / industry / academia working group, covering AE, ECG and liver-focused laboratory displays.",
      "The AE volcano plot — risk difference against significance by preferred term, after Zink et al. 2013 — is the catalogue's signature screening display.",
      "PHUSE's AE white paper is the companion catalogue for tables, figures and listings in phase 2–4 trials and integrated summaries."
    ]
  };

  var SRC = {
    SG: "<a href='https://safetygraphics.github.io/safetyGraphics/'>safetyGraphics site</a> · <a href='https://safetygraphics.github.io/safetyGraphics/articles/Intro.html'>app intro</a> · <a href='https://github.com/SafetyGraphics/safetyCharts'>safetyCharts</a> · <a href='https://github.com/SafetyGraphics/volcanoPlot'>volcanoPlot</a> · <a href='https://github.com/SafetyGraphics/safetyProfile'>safetyProfile</a>",
    teal: "<a href='https://insightsengineering.github.io/teal.modules.clinical/main/reference/index.html'>module reference</a> · <a href='https://github.com/insightsengineering/teal/'>teal framework</a> · <a href='https://insightsengineering.github.io/teal/main/news/index.html'>changelog — snapshots, report cards in bookmarks</a>",
    DV: "<a href='https://boehringer-ingelheim.github.io/davinci/quarto/modules.html'>module gallery</a> · <a href='https://boehringer-ingelheim.github.io/davinci/'>DaVinci</a> · <a href='https://boehringer-ingelheim.github.io/dv.papo/'>dv.papo</a> · <a href='https://boehringer-ingelheim.github.io/dv.listings/'>dv.listings</a>",
    tCD: "<a href='https://biogen-inc.github.io/tidyCDISC/'>tidyCDISC site</a> · <a href='https://biogen-inc.github.io/tidyCDISC/articles/x02_Pop_Exp.html'>Population Explorer vignette</a>",
    CDR: "<a href='https://github.com/openanalytics/clinDataReview'>clinDataReview</a> · <a href='https://medical-monitoring.openanalytics.io/'>example report</a> · <a href='https://cran.r-project.org/web/packages/clinDataReview/clinDataReview.pdf'>reference manual</a>",
    JMP: "<a href='https://www.jmp.com/en/software/clinical-data-analysis-software'>JMP Clinical</a> · <a href='https://pharmasug.org/proceedings/2014/JP/PharmaSUG-2014-JP01-SAS.pdf'>PharmaSUG 2014 JP01 — risk-based monitoring and fraud detection in JMP Clinical</a>",
    JR: "<a href='https://www.i-review.com/'>Integrated Clinical Systems</a> · <a href='https://www.i-review.com/jreviewweb.html'>JReviewWeb</a> · <a href='https://www.clinicalresearchnewsonline.com/news/2014/03/03/integrated-clinical-systems-inc-launches-jreview-10-0-introducing-analytics-for-risk-based-monitoring'>JReview 10.0 RBM launch</a>",
    SPOT: "<a href='https://www.lexjansen.com/phuse/2016/sd/SD08.pdf'>PhUSE 2016 SD08 — Roche Core Safety Visualization</a> · <a href='https://community.spotfire.com/articles/spotfire/clinical-safety-monitoring/'>Spotfire clinical safety monitoring</a> · <a href='https://revvitysignals.com/medical-clinical-data-review-revvity-signals-software'>Revvity Signals</a>",
    ELL: "<a href='https://www.eclinicalsol.com/newsroom/eclinical-solutions-announces-integrated-data-review-plan-idrp-capabilities-within-elluminate-platform/'>IDRP announcement</a> · <a href='https://www.eclinicalsol.com/fact-sheets/elluminate-data-central-2/'>Data Central</a> · <a href='https://www.eclinicalsol.com/products/clinical-analytics/'>Clinical Analytics</a>",
    CP: "<a href='https://cluepoints.com/what-we-do/risk-based-quality-management-rbqm/detection/'>CluePoints detection</a> · <a href='https://cluepoints.com/what-we-do/risk-based-quality-management-rbqm/'>RBQM overview</a>",
    MDD: "<a href='https://www.medidata.com/en/clinical-trial-products/clinical-operations/rbqm/centralized-monitoring/'>Medidata centralized monitoring</a> · <a href='https://www.medidata.com/en/products/rbm/'>RBQM software</a>",
    VEE: "<a href='https://www.veeva.com/products/veeva-cdb/'>Veeva CDB</a> · <a href='https://www.veeva.com/resources/clinical-data-workbenches-a-buyers-guide/'>clinical data workbenches — a buyer's guide</a>",
    EMP: "<a href='https://docs.oracle.com/en/industries/life-sciences/empirica/2025.4.01/userguide/empirica-signal-application.html'>Empirica Signal user guide</a> · <a href='https://docs.oracle.com/en/industries/life-sciences/empirica/9.2.3/userguide/signal-review-basics.html'>Signal Review basics</a>",
    FDA: "<a href='https://www.fda.gov/media/187065/download'>FDA ST&amp;F Integrated Guide v2.0, April 2025</a> · <a href='https://jwildfire.github.io/obot.roadmap/reports/fda-stf-static-displays-plan-2026-07-21/'>our assessment of it</a>",
    CTS: "<a href='https://www.ctspedia.org/'>CTSpedia</a> · <a href='https://blogs.sas.com/content/graphicallyspeaking/2016/05/23/ctspedia-clinical-graphs-volcano-plot/'>CTSpedia volcano plot</a> · <a href='https://magazine.amstat.org/blog/2013/11/01/visualunderstandfda/'>Amstat News — a library of graphical approaches</a>"
  };

  window.REPORT = { capsules: capsules, matrix: matrix, freq: freq, rollup: rollup, proposals: proposals, ours: ours };
})();
