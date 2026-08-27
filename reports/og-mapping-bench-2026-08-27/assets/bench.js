/* The mapping bench — a working mockup.
 *
 * Nothing here is shipped code. It renders open.gismo's real data contract
 * (14 Raw_* domains, 126 columns, types and downstream consumers extracted from
 * demo-301's own workflow YAML) against a constructed CRO delivery, and lets you
 * work the bench: bind a column, derive one, declare a constant, decline a row.
 *
 * The suggestion engine below is deliberately dumb and fully disclosed: a
 * case-insensitive identity test, a hand-written alias list, and a containment
 * test. It runs at page load; its match rate is printed rather than claimed.
 * Its output is NEVER applied on its own — every non-identical suggestion needs
 * a click, which is the whole argument of this direction.
 */
(function () {
  'use strict';
  var B = window.BENCH;
  if (!B) return;

  // ------------------------------------------------------------------ alias
  // Hand-authored. Honest caveat printed on the page: the delivery on this
  // mock was written by the same person as this list, so the hit rate here is
  // an upper bound on a real one, not a measurement of one.
  var ALIAS = {
    subjid: ['usubjid', 'subject', 'subjectid', 'subjectname', 'patientid', 'subjectenrollmentnumber', 'pt'],
    subject_nsv: ['usubjid', 'subjectname', 'subject', 'subjectid'],
    subjectid: ['usubjid', 'subjectname', 'subjectnumber'],
    invid: ['siteid', 'sitenumber', 'site', 'pinumber', 'centreid', 'centrecode', 'invsiteid'],
    studyid: ['study', 'protocol', 'protocolnumber', 'protocolid'],
    country: ['ctry', 'sitecountry'],
    agerep: ['age', 'ageyears', 'ageatscreening'],
    sex: ['gender'],
    arm: ['armcd', 'trt', 'trt01p', 'trtp', 'treatment', 'treatmentgroup'],
    enrollyn: ['enrlfl', 'enrolledflag', 'saffl', 'randfl'],
    enroll_dt: ['rficdtc', 'enrolldate', 'consentdate'],
    firstdosedate: ['rfstdtc', 'trtsdt', 'firstdose'],
    timeonstudy: ['trtdurd', 'daysonstudy', 'studyduration'],
    timeontreatment: ['trtdurd', 'daysontreatment'],
    lbtstnam: ['lbtest', 'param', 'paramcd', 'lbtestcd', 'analyte', 'testname'],
    lbstresn: ['aval', 'lbstresn', 'result', 'resultnumeric'],
    lbstresu: ['avalu', 'lbstresu', 'units', 'unit'],
    lbstnrlo: ['anrlo', 'lbstnrlo', 'lownormal', 'refrangelow', 'lln'],
    lbstnrhi: ['anrhi', 'lbstnrhi', 'highnormal', 'refrangehigh', 'uln'],
    lb_dy: ['ady', 'lbdy', 'studyday'],
    lb_dt: ['lbdtc', 'adt', 'collectiondate'],
    lbblfl: ['ablfl', 'lbblfl', 'baselineflag'],
    battrnam: ['lbcat', 'panel', 'lbtstpanel'],
    toxgrg_nsv: ['atoxgr', 'lbtoxgr', 'ctcaegrade', 'toxgrade'],
    visnam: ['visit', 'avisit', 'foldername'],
    visnum: ['visitnum', 'avisitn'],
    aeterm: ['aeterm', 'verbatim'],
    mdrpt_nsv: ['aedecod', 'preferredterm', 'pt'],
    mdrsoc_nsv: ['aebodsys', 'soc', 'systemorganclass'],
    aesev: ['aesev', 'severity'],
    aetoxgr: ['atoxgr', 'aetoxgr', 'ctcaegrade'],
    aeser: ['aeser', 'seriousflag'],
    aerel: ['aerel', 'related', 'causality'],
    aeongo: ['aeenrtpt', 'ongoing', 'aeongo'],
    aest_dt: ['aestdtc', 'astdt', 'onsetdate'],
    aeen_dt: ['aeendtc', 'aendt', 'resolutiondate'],
    aest_dy: ['astdy', 'aestdy'],
    aeen_dy: ['aendy', 'aeendy'],
    aeseq: ['aeseq', 'eventnumber'],
    dvdecod: ['dvcat', 'dvdecod', 'deviationcategory', 'crocategory'],
    dvterm: ['dvterm', 'description', 'deviationtext'],
    dvdtm: ['dvstdtc', 'deviationdate'],
    deemedimportant: ['dvimpfl', 'important', 'major'],
    querystatus: ['querystate', 'status'],
    queryage: ['agedays', 'daysopen'],
    created: ['openedon', 'createddate'],
    InvestigatorFirstName: ['pifirstname'],
    InvestigatorLastName: ['pilastname'],
    site_status: ['status', 'sitestatus'],
    site_active_dt: ['activationdate', 'siteactivation'],
    City: ['city'], State: ['state', 'stateprovince'], Country: ['country'],
    mincreated_dts: ['createddts', 'recordcreated']
  };

  function norm(s) { return String(s || '').toLowerCase().replace(/[^a-z0-9]/g, ''); }

  // jsonlite's auto_unbox writes a one-element list as a scalar, so every
  // "list of ids" arrives as either an array or a bare string. Normalise once.
  function arr(x) { return x == null ? [] : (Array.isArray(x) ? x : [x]); }
  Object.keys(B.colConsumers).forEach(function (k) { B.colConsumers[k] = arr(B.colConsumers[k]); });
  Object.keys(B.domConsumers).forEach(function (k) { B.domConsumers[k] = arr(B.domConsumers[k]); });
  B.contract.forEach(function (r) {
    r.consumers = arr(r.consumers); r.domConsumers = arr(r.domConsumers);
    r.produces = arr(r.produces);   // a raw column can feed more than one mapped domain
  });
  B.delivery.forEach(function (f) { f.cols = arr(f.cols); f.cols.forEach(function (c) { c.samples = arr(c.samples); }); });

  var FILES = B.delivery;
  var CONTRACT = B.contract;
  var KEYCOLS = ['subjid', 'invid', 'studyid', 'subject_nsv', 'subjectid'];

  function scoreCol(target, srcName) {
    var t = norm(target), al = (ALIAS[target] || []).map(norm), n = norm(srcName);
    if (n === t) return [100, 'identical name'];
    if (al.indexOf(n) >= 0) return [78, 'alias list'];
    if (n.length > 3 && t.length > 3 && (n.indexOf(t) >= 0 || t.indexOf(n) >= 0)) return [52, 'name contains'];
    return [0, ''];
  }

  // Candidates are scoped to the file assigned to the domain. Matching a target
  // against every column of every delivered file is meaningless — nine of the
  // fourteen domains want a column called `studyid`, so every file "matches"
  // every domain. Assigning the file is a separate, earlier decision.
  function candidates(row) {
    var f = fileFor(row.domain); if (!f) return [];
    var file = FILES.filter(function (x) { return x.file === f; })[0]; if (!file) return [];
    var out = [];
    file.cols.forEach(function (c) {
      var s = scoreCol(row.col, c.name);
      if (s[0]) out.push({ file: file.file, col: c.name, samples: c.samples, distinct: c.distinct, score: s[0], why: s[1] });
    });
    return out.sort(function (a, b) { return b.score - a.score; });
  }

  // What the file proposer would say, and how confident it is. Computed at load
  // over the same data the grid shows; printed rather than claimed. On this
  // delivery it is confidently wrong five times in thirteen — see the page.
  var FILEPROP = {};
  function computeFileProposals() {
    var doms = {};
    CONTRACT.forEach(function (r) { (doms[r.domain] = doms[r.domain] || []).push(r); });
    Object.keys(doms).forEach(function (d) {
      var rs = doms[d], best = null;
      FILES.forEach(function (f) {
        var hit = 0;
        rs.forEach(function (r) { if (f.cols.some(function (c) { return scoreCol(r.col, c.name)[0] >= 52; })) hit++; });
        var cov = hit / rs.length;
        if (!best || cov > best.cov) best = { file: f.file, cov: cov, hit: hit, of: rs.length };
      });
      FILEPROP[d] = best;
    });
  }
  computeFileProposals();

  function fileFor(d) { return S.fileOf[d] || null; }
  function candKey(k) {
    var r = CONTRACT.filter(function (x) { return x.domain + '.' + x.col === k; })[0];
    return r ? candidates(r) : [];
  }
  function identicalKeys() {
    return CONTRACT.filter(function (r) {
      var c = candidates(r); return c.length && c[0].score === 100;
    }).map(function (r) { return r.domain + '.' + r.col; });
  }
  function proposedKeys() {
    return CONTRACT.filter(function (r) {
      var c = candidates(r); return c.length && c[0].score >= 52 && c[0].score < 100;
    }).map(function (r) { return r.domain + '.' + r.col; });
  }

  // ------------------------------------------------------------------ state
  var S = {
    bind: {},            // key -> {mode, file, src, expr, value, reason, via}
    fileOf: {},          // domain -> delivered file, or absent
    open: { Raw_LB: true },
    sel: null,
    edTab: 'bind',
    drTab: 'cost',
    dry: null,
    vmap: {},            // LBTEST value -> ALT|AST|TB|ALP|''
    filter: 'all',
    fileOnly: null
  };

  var DOMAINS = [];
  CONTRACT.forEach(function (r) { if (DOMAINS.indexOf(r.domain) < 0) DOMAINS.push(r.domain); });
  DOMAINS.sort();
  function rowsOf(d) { return CONTRACT.filter(function (r) { return r.domain === d; }); }
  function st(k) { return S.bind[k] || { mode: 'open' }; }
  function settled(k) { var m = st(k).mode; return m === 'bound' || m === 'derived' || m === 'const'; }

  function counts() {
    var c = { bound: 0, derived: 0, const: 0, declined: 0, open: 0 };
    CONTRACT.forEach(function (r) { c[st(r.domain + '.' + r.col).mode]++; });
    return c;
  }

  // --------------------------------------------------------- reach / effect
  // Which of the 46 metric, reporting and module workflows can run. A workflow
  // reads Mapped_* columns; each maps back to the Raw_* column that produced it.
  // Columns a workflow reads that arrive by the participant join (invid, arm,
  // sex, race, agerep on Mapped_AE / Mapped_LB) resolve against Raw_SUBJ.
  // demo-301's STUDY.yaml reads Raw_SUBJ to count participants and sites, so
  // Raw_SUBJ.subjid produces both Mapped_SUBJ$subjid and Mapped_STUDY$subjid.
  // One raw column, several mapped addresses.
  var BYPROD = {};
  CONTRACT.forEach(function (r) {
    r.produces.forEach(function (p) { BYPROD[p + '$' + r.col] = r; });
  });
  // A mapped domain built from other mapped domains rather than from a raw one
  // (demo-301: Mapped_COUNTRY comes entirely from Mapped_SUBJ) is an
  // intermediate, not a user input — resolve through it.
  var DERIVED = {};
  Object.keys(B.derivedDomains || {}).forEach(function (k) { DERIVED[k] = arr(B.derivedDomains[k]); });
  function realDomain(m) { return DERIVED[m] ? DERIVED[m][0] : m; }
  function resolveCol(mapped, col) {
    var m = realDomain(mapped);
    return BYPROD[m + '$' + col] || BYPROD['Mapped_SUBJ$' + col] || null;
  }
  // Five workflows name no raw column and no raw-derived domain: srs0001, the
  // Bounds and Metrics reporting steps, and the two KRI report modules. They are
  // downstream of other workflows, so they always "run" — srs0001 in particular
  // weights whatever kri* produced results and re-normalises, which means a
  // partial mapping changes its denominator instead of failing. The bench names
  // that class rather than counting it as five things that work.
  var DOWNSTREAM = {};
  B.workflows.forEach(function (w) {
    var named = Object.keys(B.colConsumers).some(function (k) { return B.colConsumers[k].indexOf(w.id) >= 0; }) ||
      Object.keys(B.domConsumers).some(function (k) { return B.domConsumers[k].indexOf(w.id) >= 0; });
    if (!named) DOWNSTREAM[w.id] = true;
  });

  // A mapping can produce a column that appears in no spec, because its own query
  // steps compute it: STUDY.yaml emits `studyid AS GroupID`, EG.yaml emits
  // `egbase` and `egchg`. Three such columns are read by downstream workflows.
  // A cost model built from spec blocks alone cannot see them, so they are
  // satisfied when their producing domain is.
  function domainSatisfied(mapped) {
    var m = realDomain(mapped);
    return CONTRACT.some(function (r) { return r.produces.indexOf(m) >= 0 && settled(r.domain + '.' + r.col); });
  }

  function workflowStatus() {
    var res = {};
    B.workflows.forEach(function (w) { res[w.id] = { ok: true, missing: [] }; });
    Object.keys(B.colConsumers).forEach(function (k) {
      var i = k.indexOf('$'), p = [k.slice(0, i), k.slice(i + 1)], r = resolveCol(p[0], p[1]);
      var ok = r ? settled(r.domain + '.' + r.col) : domainSatisfied(p[0]);
      if (!ok) {
        (B.colConsumers[k] || []).forEach(function (id) {
          if (res[id]) { res[id].ok = false; if (res[id].missing.indexOf(k) < 0) res[id].missing.push(k); }
        });
      }
    });
    // Modules name a domain rather than columns; a wholly unsettled domain
    // blocks them too.
    Object.keys(B.domConsumers).forEach(function (mapped) {
      var any = domainSatisfied(mapped);
      if (!any) (B.domConsumers[mapped] || []).forEach(function (id) {
        if (res[id]) { res[id].ok = false; if (res[id].missing.indexOf(mapped) < 0) res[id].missing.push(mapped); }
      });
    });
    return res;
  }

  // The eDISH reach, from the measured three-lab file.
  //   417 CENTRAL + 217 LOCAL + 131 SPEC = 765 participants delivered.
  //   LOCAL ids are site-prefixed; LOCAL rows carry no reference range at all.
  var LABS = { CENTRAL: 417, LOCAL: 217, SPEC: 131 };
  var LABOF = {};
  B.lbtest.forEach(function (v) { LABOF[v.value] = v.lab; });
  function edishReach() {
    var idFixed = st('Raw_LB.subjid').mode === 'derived';
    var groups = {};
    Object.keys(LABS).forEach(function (g) { groups[g] = { mapped: {}, joined: g !== 'LOCAL' || idFixed }; });
    Object.keys(S.vmap).forEach(function (v) {
      if (!S.vmap[v]) return;
      var g = LABOF[v]; if (g) groups[g].mapped[S.vmap[v]] = true;
    });
    var need = ['ALT', 'AST', 'TB', 'ALP'];
    var reach = 0, blocked = [];
    Object.keys(LABS).forEach(function (g) {
      var full = need.every(function (n) { return groups[g].mapped[n]; });
      var uln = g !== 'LOCAL';                       // LOCAL delivered no range
      if (full && groups[g].joined && uln) reach += LABS[g];
      else blocked.push({ lab: g, n: LABS[g], why: !groups[g].joined ? 'identifiers do not join' : !full ? 'measure names not mapped' : 'no reference range delivered' });
    });
    return { reach: reach, total: 765, blocked: blocked, idFixed: idFixed };
  }

  // ------------------------------------------------------------------ paint
  var el = {};
  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]; }); }
  function fmt(n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ','); }

  var MARK = {
    bound: ['m-bound', 'Bound'], derived: ['m-derived', 'Derived'], const: ['m-const', 'Constant'],
    declined: ['m-declined', 'Declined'], open: ['m-open', 'Open']
  };
  function markHTML(m) { return '<span class="mark ' + MARK[m][0] + '"><span class="dot"></span>' + MARK[m][1] + '</span>'; }

  function renderLedger() {
    var c = counts(), total = CONTRACT.length;
    var order = ['bound', 'derived', 'const', 'declined', 'open'];
    el.ledger.innerHTML = order.map(function (m) {
      return '<button class="chip' + (S.filter === m ? ' on' : '') + '" data-filter="' + m + '">' +
        '<span class="dot ' + m + '" style="background:' + ({ bound: 'var(--og-green)', derived: 'var(--og-blue)', const: '#6b21a8', declined: 'var(--og-mute)', open: 'transparent' })[m] +
        (m === 'open' ? ';border:1.5px dashed var(--og-amber)' : '') + '"></span>' +
        MARK[m][1] + ' <b>' + c[m] + '</b></button>';
    }).join('') + '<button class="chip' + (S.filter === 'all' ? ' on' : '') + '" data-filter="all">All <b>' + total + '</b></button>';

    var openN = c.open;
    var ws = workflowStatus();
    var dsN = Object.keys(DOWNSTREAM).length;
    var runnable = B.workflows.filter(function (w) { return ws[w.id].ok && !DOWNSTREAM[w.id]; }).length;
    var runTotal = B.workflows.length - dsN;
    var line;
    if (!S.dry) {
      line = openN > 0
        ? '<span class="mark m-open"><span class="dot"></span>Not run</span> &nbsp;<b>' + openN + '</b> of ' + total + ' columns still open. Readiness is not a count of filled boxes — it is what the mapping produced when it last ran.'
        : '<span class="mark m-open"><span class="dot"></span>Not run</span> &nbsp;Every column has a disposition. Nothing is green until the mapping has run against your files.';
    } else {
      var e = edishReach();
      line = '<span class="mark ' + (S.dry.hard ? 'm-declined' : 'm-bound') + '"><span class="dot"></span>Ran ' + S.dry.at + '</span> &nbsp;' +
        '<b>' + runnable + '</b> of ' + runTotal + ' data-driven workflows can run. ' +
        'Hepatic Safety Explorer reaches <b>' + e.reach + '</b> of ' + e.total + ' participants.';
    }
    el.verdict.innerHTML = '<div class="v-line">' + line + '</div>' +
      '<button class="btn ghost sm" id="btn-files">Assign ' + unassignedProposals() + ' proposed files</button>' +
      '<button class="btn ghost sm" id="btn-ident">Accept ' + identicalKeys().length + ' identical</button>' +
      '<button class="btn ghost sm" id="btn-prop">Show ' + proposedKeys().length + ' proposals</button>' +
      '<button class="btn accent" id="btn-dry">Dry run</button>';
    $('btn-files').onclick = assignProposedFiles;
    $('btn-ident').onclick = acceptIdentical;
    $('btn-prop').onclick = function () { S.filter = S.filter === 'proposed' ? 'all' : 'proposed'; paint(); };
    $('btn-dry').onclick = dryRun;
    Array.prototype.forEach.call(el.ledger.querySelectorAll('[data-filter]'), function (b) {
      b.onclick = function () { S.filter = b.dataset.filter; paint(); };
    });
  }

  function renderSources() {
    el.sources.innerHTML = '<p class="sec-h">Delivered files</p>' + FILES.map(function (f) {
      return '<div class="file' + (S.fileOnly === f.file ? ' on' : '') + '" data-file="' + esc(f.file) + '">' +
        '<div class="fn">' + esc(f.file) + '</div>' +
        '<div class="fm">' + fmt(f.rows) + ' rows &middot; ' + f.cols.length + ' cols</div></div>';
    }).join('') + '<div class="drop">Drop CSV, XPT or a folder</div>' +
      '<p class="sec-h" style="margin-top:1rem">Nothing delivered</p>' +
      '<div class="fm" style="font-size:.72rem;color:var(--og-mute);line-height:1.4">DATACHG, DATAENT, EG, IE, SDRGCOMP, STUDCOMP, STUDY — 7 domains, 54 columns, no candidate file. An EDC export does not contain data-change rates or study-completion records.</div>';
    Array.prototype.forEach.call(el.sources.querySelectorAll('[data-file]'), function (d) {
      d.onclick = function () { S.fileOnly = S.fileOnly === d.dataset.file ? null : d.dataset.file; paint(); };
    });
  }

  function rowVisible(r) {
    var k = r.domain + '.' + r.col, m = st(k).mode;
    if (S.filter === 'proposed') return proposedKeys().indexOf(k) >= 0 && m === 'open';
    if (S.filter !== 'all' && m !== S.filter) return false;
    if (S.fileOnly) {
      var b = st(k);
      if (b.file === S.fileOnly) return true;
      return fileFor(r.domain) === S.fileOnly;
    }
    return true;
  }

  function renderGrid() {
    el.grid.innerHTML = DOMAINS.map(function (d) {
      var rs = rowsOf(d), vis = rs.filter(rowVisible);
      var c = { bound: 0, derived: 0, const: 0, declined: 0, open: 0 };
      rs.forEach(function (r) { c[st(d + '.' + r.col).mode]++; });
      var w = function (n) { return (n / rs.length * 100).toFixed(1) + '%'; };
      var bar = '<span class="bar">' +
        '<i style="width:' + w(c.bound) + ';background:var(--og-green)"></i>' +
        '<i style="width:' + w(c.derived) + ';background:var(--og-blue)"></i>' +
        '<i style="width:' + w(c.const) + ';background:#6b21a8"></i>' +
        '<i style="width:' + w(c.declined) + ';background:var(--og-mute)"></i></span>';
      var open = S.open[d], f = fileFor(d), pr = FILEPROP[d];
      var fileCell;
      if (f) {
        fileCell = '<span class="dfile on"><code>' + esc(f) + '</code></span>';
      } else if (pr && pr.cov >= 0.35) {
        fileCell = '<span class="dfile prop">proposes <code>' + esc(pr.file) + '</code> &middot; ' +
          Math.round(pr.cov * 100) + '% of names</span>';
      } else {
        fileCell = '<span class="dfile none">no file &mdash; decline the domain?</span>';
      }
      var sel = '<select class="fsel" data-fsel="' + d + '" title="file for ' + d + '">' +
        '<option value="">— no file —</option>' +
        FILES.map(function (x) { return '<option value="' + esc(x.file) + '"' + (f === x.file ? ' selected' : '') + '>' + esc(x.file) + '</option>'; }).join('') +
        '</select>';
      return '<div class="dom' + (open ? ' open' : '') + (f ? '' : ' nofile') + '" data-dom="' + d + '">' +
        '<div class="dom-h"><span class="caret" data-toggle="' + d + '">' + (open ? '▼' : '▶') + '</span>' +
        '<span class="dn" data-toggle="' + d + '">' + d + '</span>' +
        fileCell + sel +
        '<span class="dmeta">' + (rs.length - c.open) + '/' + rs.length + ' settled ' + bar + '</span></div>' +
        '<div class="rows">' + (vis.length ? vis.map(rowHTML).join('') : '<div class="row"><span class="c-target faint">no rows match this filter</span></div>') + '</div></div>';
    }).join('');

    Array.prototype.forEach.call(el.grid.querySelectorAll('[data-toggle]'), function (h) {
      h.onclick = function () { var d = h.dataset.toggle; S.open[d] = !S.open[d]; paint(); };
    });
    Array.prototype.forEach.call(el.grid.querySelectorAll('[data-fsel]'), function (h) {
      h.onchange = function () {
        var d = h.dataset.fsel;
        if (h.value) S.fileOf[d] = h.value; else delete S.fileOf[d];
        // A domain's bindings belong to the file they were made against.
        Object.keys(S.bind).forEach(function (k) { if (k.split('.')[0] === d && S.bind[k].mode === 'bound') delete S.bind[k]; });
        S.open[d] = true; S.dry = null; paint();
      };
      h.onclick = function (e) { e.stopPropagation(); };
    });
    Array.prototype.forEach.call(el.grid.querySelectorAll('[data-row]'), function (h) {
      h.onclick = function (e) { if (e.target.closest('.ed')) return; select(h.dataset.row); };
    });
    if (S.sel) wireEditor();
  }

  function rowHTML(r) {
    var k = r.domain + '.' + r.col, b = st(k), cand = candidates(r), top = cand[0];
    var isKey = KEYCOLS.indexOf(r.col) >= 0;
    var src, samp = '';
    if (b.mode === 'bound') {
      src = markHTML('bound') + ' <code>' + esc(b.src) + '</code>';
      var f = FILES.filter(function (x) { return x.file === b.file; })[0];
      var cc = f && f.cols.filter(function (x) { return x.name === b.src; })[0];
      if (cc) samp = cc.samples.slice(0, 2).map(esc).join(' &middot; ');
    } else if (b.mode === 'derived') {
      src = markHTML('derived') + ' <code>' + esc((b.expr || '').slice(0, 40)) + '</code>';
      samp = b.preview || 'computed';
    } else if (b.mode === 'const') {
      src = markHTML('const') + ' <code>' + esc(b.value) + '</code>';
      samp = 'same on every row';
    } else if (b.mode === 'declined') {
      src = markHTML('declined') + ' <span class="empty">' + esc(b.reason || 'not supplied') + '</span>';
    } else if (top && top.score >= 52) {
      src = markHTML('open') + ' <span class="prop">proposes <code>' + esc(top.col) + '</code></span>';
      samp = '<span class="faint">' + esc(top.why) + '</span>';
    } else {
      src = markHTML('open') + ' <span class="empty">no candidate</span>';
    }
    var n = (r.consumers || []).length, dn = (r.domConsumers || []).length;
    var cost = n ? n + ' metric' + (n === 1 ? '' : 's') + ' name it' : dn ? 'domain feeds ' + dn : 'label only';
    return '<div class="row' + (S.sel === k ? ' sel' : '') + '" data-row="' + k + '">' +
      '<span class="c-target"><code>' + esc(r.col) + '</code><span class="ty">' + esc(r.type) + '</span>' +
      (isKey ? '<br><span class="key">KEY</span>' : '') + '</span>' +
      '<span class="c-arrow">&larr;</span>' +
      '<span class="c-source">' + src + '</span>' +
      '<span class="c-sample">' + samp + '</span>' +
      '<span class="c-cost">' + cost + '</span></div>' +
      (S.sel === k ? editorHTML(r) : '');
  }

  // ----------------------------------------------------------- row editor
  function editorHTML(r) {
    var k = r.domain + '.' + r.col, b = st(k), tabs = ['bind', 'derive', 'const', 'decline'];
    var lbl = { bind: 'Bind to a column', derive: 'Derive', const: 'Constant', decline: 'Decline' };
    var body = '';
    if (S.edTab === 'bind') {
      var cand = candidates(r).slice(0, 8);
      var others = [];
      FILES.forEach(function (f) {
        f.cols.forEach(function (c) {
          if (!cand.some(function (x) { return x.file === f.file && x.col === c.name; }))
            others.push({ file: f.file, col: c.name, samples: c.samples, score: 0, why: '' });
        });
      });
      var list = cand.concat(others);
      body = '<label>Source column</label>' +
        '<input type="text" id="ed-search" placeholder="filter the ' + list.length + ' delivered columns…" autocomplete="off">' +
        '<div class="cands" id="ed-cands">' + candListHTML(list) + '</div>' +
        '<p class="hint">Ranked by a case-insensitive identity test, a published alias list, and a containment test — in that order. A ranking is a proposal; it becomes a binding when you click it.</p>';
    } else if (S.edTab === 'derive') {
      var sug = derivationFor(r);
      body = '<label>SQL expression, evaluated by DuckDB inside the mapping step</label>' +
        '<textarea id="ed-expr">' + esc(b.expr || sug.expr) + '</textarea>' +
        '<p class="hint">' + sug.note + '</p>' +
        '<div class="ed-act"><button class="btn sm" id="ed-derive">Set as derived</button></div>';
    } else if (S.edTab === 'const') {
      body = '<label>One value, written on every row of ' + esc(r.domain) + '</label>' +
        '<input type="text" id="ed-const" value="' + esc(b.value || '') + '" placeholder="e.g. ' + esc(constHint(r)) + '">' +
        '<p class="hint">Use this when the study has one answer and the delivery does not carry it — a single-arm study’s <code>arm</code>, a protocol number, a lab’s upper limit of normal. It is recorded as a decision, not as data.</p>' +
        '<div class="ed-act"><button class="btn sm" id="ed-setconst">Set constant</button></div>';
    } else {
      var lost = lossFor(r);
      body = '<label>Why is this not supplied?</label>' +
        '<input type="text" id="ed-reason" value="' + esc(b.reason || '') + '" placeholder="e.g. this EDC does not capture CTCAE grades">' +
        '<p class="hint">Declining is a recorded judgement, not a blank. It is written into the project’s own YAML with your reason and travels with the study.</p>' +
        '<div class="banner ' + (lost.dead.length ? 'warn' : 'good') + '" style="margin-top:.5rem">' +
        (lost.dead.length
          ? '<b>Declining costs ' + lost.dead.length + '</b> ' + (lost.dead.length === 1 ? 'workflow' : 'workflows') + ': ' + lost.dead.map(function (w) { return '<span class="wf dead">' + esc(w) + '</span>'; }).join('')
          : '<b>Nothing downstream names this column.</b> It is carried for labels and listings only.') + '</div>' +
        '<div class="ed-act"><button class="btn sm" id="ed-decline">Decline</button></div>';
    }
    return '<div class="ed open">' +
      '<div class="ed-tabs">' + tabs.map(function (t) {
        return '<button data-tab="' + t + '" class="' + (S.edTab === t ? 'on' : '') + '">' + lbl[t] + '</button>';
      }).join('') + (b.mode !== 'open' ? '<button data-tab="clear" style="margin-left:auto">Clear</button>' : '') + '</div>' +
      '<div class="ed-body">' + body + '</div></div>';
  }

  function candListHTML(list) {
    var out = '', lastFile = null;
    list.forEach(function (c) {
      if (c.file !== lastFile) { out += '<div class="cand-file">' + esc(c.file) + '</div>'; lastFile = c.file; }
      out += '<div class="cand" data-pick="' + esc(c.file) + '|' + esc(c.col) + '">' +
        '<span class="cn">' + esc(c.col) + '</span>' +
        '<span class="cs">' + (c.samples || []).slice(0, 2).map(esc).join(' &middot; ') + '</span>' +
        '<span class="cw' + (c.score === 100 ? ' ident' : '') + '">' + (c.why ? esc(c.why) : '') + '</span></div>';
    });
    return out;
  }

  function derivationFor(r) {
    if (r.domain === 'Raw_LB' && r.col === 'subjid')
      return { expr: "regexp_replace(USUBJID, '^SITE[0-9]+-', '')", note: 'The lab vendor prefixes the site onto the participant identifier. Stripping it here is the same move demo-301’s own LB mapping makes with <code>CAST()</code> — a generated <code>gsm.core::RunQuery</code> step in the project’s YAML. No new spec key, no upstream change.' };
    if (r.col === 'agerep') return { expr: 'CAST(AGE AS INTEGER)', note: 'The spec wants an integer; the delivery is text.' };
    if (r.col === 'timeonstudy') return { expr: 'date_diff(\'day\', CAST(RFSTDTC AS DATE), CAST(RFENDTC AS DATE))', note: 'Not delivered directly; computable from two dates that are.' };
    if (r.col === 'toxgrg_nsv') return { expr: "CAST(CASE WHEN LBSTRESN > 5*LBSTNRHI THEN 4 WHEN LBSTRESN > 3*LBSTNRHI THEN 3 WHEN LBSTRESN > 1.5*LBSTNRHI THEN 2 WHEN LBSTRESN > LBSTNRHI THEN 1 ELSE 0 END AS VARCHAR)", note: 'CTCAE grade is not delivered. This is an <em>illustrative</em> derivation — a real one belongs to the study’s statistician, and the bench records who wrote it.' };
    return { expr: '', note: 'Any DuckDB expression over the columns of this file. It compiles to a <code>gsm.core::RunQuery</code> step in the project’s own mapping YAML.' };
  }
  function constHint(r) {
    if (r.col === 'studyid') return 'AA-AA-000-0000';
    if (r.col === 'arm') return 'Open label';
    if (r.col === 'lbstnrhi') return '41';
    return 'a single value';
  }
  function lossFor(r) {
    var direct = r.consumers || [];
    var names = {};
    B.workflows.forEach(function (w) { names[w.id] = w.name; });
    return { dead: direct };
  }

  function wireEditor() {
    var ed = el.grid.querySelector('.ed'); if (!ed) return;
    Array.prototype.forEach.call(ed.querySelectorAll('[data-tab]'), function (b) {
      b.onclick = function () {
        if (b.dataset.tab === 'clear') { delete S.bind[S.sel]; paint(); return; }
        S.edTab = b.dataset.tab; paint();
      };
    });
    var s = ed.querySelector('#ed-search');
    if (s) {
      s.oninput = function () {
        var q = norm(s.value), box = ed.querySelector('#ed-cands');
        Array.prototype.forEach.call(box.querySelectorAll('.cand'), function (c) {
          c.style.display = !q || norm(c.dataset.pick).indexOf(q) >= 0 ? '' : 'none';
        });
      };
      s.focus();
    }
    Array.prototype.forEach.call(ed.querySelectorAll('[data-pick]'), function (c) {
      c.onclick = function () {
        var p = c.dataset.pick.split('|');
        var cand = candKey(S.sel).filter(function (x) { return x.file === p[0] && x.col === p[1]; })[0];
        S.bind[S.sel] = { mode: 'bound', file: p[0], src: p[1], via: cand ? (cand.score === 100 ? 'identical' : 'accepted proposal') : 'manual' };
        S.dry = null; paint();
      };
    });
    var d = ed.querySelector('#ed-derive');
    if (d) d.onclick = function () {
      var e = ed.querySelector('#ed-expr').value.trim(); if (!e) return;
      S.bind[S.sel] = { mode: 'derived', expr: e, file: FILES[0].file, preview: 'S1000 · S10245', via: 'manual' };
      S.dry = null; paint();
    };
    var cs = ed.querySelector('#ed-setconst');
    if (cs) cs.onclick = function () {
      var v = ed.querySelector('#ed-const').value.trim(); if (!v) return;
      S.bind[S.sel] = { mode: 'const', value: v, via: 'manual' }; S.dry = null; paint();
    };
    var dc = ed.querySelector('#ed-decline');
    if (dc) dc.onclick = function () {
      S.bind[S.sel] = { mode: 'declined', reason: ed.querySelector('#ed-reason').value.trim() || 'not supplied', via: 'manual' };
      S.dry = null; paint();
    };
  }

  function select(k) {
    S.sel = S.sel === k ? null : k;
    S.edTab = 'bind';
    if (S.sel) { S.drTab = 'cost'; }
    paint();
  }

  // ------------------------------------------------------------- actions
  function unassignedProposals() {
    return DOMAINS.filter(function (d) {
      return !fileFor(d) && FILEPROP[d] && FILEPROP[d].cov >= 0.35;
    }).length;
  }
  function assignProposedFiles() {
    DOMAINS.forEach(function (d) {
      if (fileFor(d)) return;
      var p = FILEPROP[d];
      if (p && p.cov >= 0.35) S.fileOf[d] = p.file;
    });
    S.dry = null; paint();
  }

  function acceptIdentical() {
    identicalKeys().forEach(function (k) {
      if (st(k).mode !== 'open') return;
      var c = candKey(k)[0];
      S.bind[k] = { mode: 'bound', file: c.file, src: c.col, via: 'identical' };
    });
    S.dry = null; paint();
  }

  function dryRun() {
    var t = new Date();
    S.dry = {
      at: String(t.getHours()).padStart(2, '0') + ':' + String(t.getMinutes()).padStart(2, '0'),
      hard: counts().open > 0
    };
    S.drTab = 'keys';
    paint();
  }

  // -------------------------------------------------------------- drawer
  function renderDrawer() {
    var tabs = [['cost', 'Cost'], ['keys', 'Keys'], ['values', 'Values'], ['yaml', 'Project files']];
    el.drTabs.innerHTML = tabs.map(function (t) {
      return '<button data-dr="' + t[0] + '" class="' + (S.drTab === t[0] ? 'on' : '') + '">' + t[1] + '</button>';
    }).join('');
    Array.prototype.forEach.call(el.drTabs.querySelectorAll('[data-dr]'), function (b) {
      b.onclick = function () { S.drTab = b.dataset.dr; paint(); };
    });
    el.drBody.innerHTML = ({ cost: drCost, keys: drKeys, values: drValues, yaml: drYaml })[S.drTab]();
    if (S.drTab === 'keys') {
      var f = el.drBody.querySelector('#fix-key');
      if (f) f.onclick = function () {
        S.bind['Raw_LB.subjid'] = { mode: 'derived', expr: "regexp_replace(USUBJID, '^SITE[0-9]+-', '')", file: 'LAB_LIVER_ALL.csv', preview: 'S1000 · S10245', via: 'key fix' };
        paint();
      };
    }
    if (S.drTab === 'values') {
      Array.prototype.forEach.call(el.drBody.querySelectorAll('[data-vv]'), function (s) {
        s.onchange = function () { S.vmap[s.dataset.vv] = s.value; paint(); };
      });
      var a = el.drBody.querySelector('#vm-auto');
      if (a) a.onclick = function () {
        B.lbtest.forEach(function (v) {
          var n = norm(v.value);
          if (/^alt|alanine|sgpt/.test(n)) S.vmap[v.value] = 'ALT';
          else if (/^ast|aspartate|sgot/.test(n)) S.vmap[v.value] = 'AST';
          else if (/bili/.test(n)) S.vmap[v.value] = 'TB';
          else if (/^alp|alkaline|alkphos/.test(n)) S.vmap[v.value] = 'ALP';
        });
        paint();
      };
    }
  }

  function drCost() {
    var ws = workflowStatus();
    var pool = B.workflows.filter(function (w) { return !DOWNSTREAM[w.id]; });
    var dead = pool.filter(function (w) { return !ws[w.id].ok; });
    var live = pool.length - dead.length;
    var byGrp = { '2_metrics': [], '3_reporting': [], '4_modules': [] };
    dead.forEach(function (w) { (byGrp[w.grp] || []).push(w); });
    var lbl = { '2_metrics': 'Metrics', '3_reporting': 'Reporting', '4_modules': 'Charts and reports' };
    var out = '<h4>What runs</h4>' +
      '<div class="reach"><span class="track"><span class="fill' + (live < pool.length ? ' part' : '') + '" style="width:' + (live / pool.length * 100) + '%"></span></span>' +
      '<span class="n">' + live + '/' + pool.length + '</span></div>' +
      '<p>A workflow runs when every column it names has a disposition that produces a value. Declining a column is allowed; it just moves the workflow into this list.</p>';
    Object.keys(byGrp).forEach(function (g) {
      if (!byGrp[g].length) return;
      out += '<div class="loss"><div class="lh">' + lbl[g] + ' blocked: ' + byGrp[g].length + '</div>' +
        byGrp[g].map(function (w) { return '<span class="wf dead" title="' + esc(w.name) + '">' + esc(w.id) + '</span>'; }).join('') + '</div>';
    });
    if (!dead.length) out += '<div class="banner good"><b>Every data-driven workflow can run.</b></div>';
    out += '<div class="banner warn"><b>Five workflows are not on this list and cannot be.</b> ' +
      '<span class="wf">srs0001</span><span class="wf">Bounds</span><span class="wf">Metrics</span>' +
      '<span class="wf">report_kri_site</span><span class="wf">report_kri_country</span> name no raw column at all — ' +
      'they run over whatever else ran. The Site Risk Score stacks every <code>kri*</code> that produced results and ' +
      're-normalises, so declining a domain <em>moves its denominator</em> rather than failing. ' +
      'That is the one consequence of a mapping decision this screen can warn about but not prevent.</div>';
    if (S.sel) {
      var r = CONTRACT.filter(function (x) { return x.domain + '.' + x.col === S.sel; })[0];
      if (r) {
        var n = (r.consumers || []).length;
        out += '<h4 style="margin-top:1rem">Selected: <code>' + esc(r.domain) + '.' + esc(r.col) + '</code></h4>' +
          '<p>' + (n ? 'Named directly by ' + n + ': ' + (r.consumers || []).map(function (w) { return '<span class="wf">' + esc(w) + '</span>'; }).join('')
            : 'Named by no metric. It reaches reports as a label, a listing column or a grouping.') + '</p>' +
          '<p>It reaches ' + r.produces.map(function (x) { return '<code>' + esc(x) + '</code>'; }).join(' and ') +
          ', which feed ' + (r.domConsumers || []).length + ' workflows in all.</p>';
      }
    }
    return out;
  }

  function drKeys() {
    var lbBound = settled('Raw_LB.subjid'), subjBound = settled('Raw_SUBJ.subjid');
    if (!S.dry) return '<h4>Key overlap</h4><p>Measured on a dry run, not guessed from column names. Two files can both carry a column called <code>subjid</code>, both pass every type check, and share not one value.</p><div class="banner warn"><b>Not measured yet.</b> Run the mapping to see it.</div>';
    if (!lbBound || !subjBound) return '<h4>Key overlap</h4><div class="banner warn"><b>Both sides must be settled first.</b> Bind <code>Raw_SUBJ.subjid</code> and <code>Raw_LB.subjid</code>, then run again.</div>';
    var fixed = st('Raw_LB.subjid').mode === 'derived';
    var m = B.measured;
    if (fixed) {
      return '<h4>Key overlap</h4>' +
        '<div class="banner good"><b>Raw_LB &rarr; Raw_SUBJ on <code>subjid</code>: 14,300 of 14,300 rows match.</b> 765 of 765 participants.</div>' +
        '<dl class="kv"><dt>Rows delivered</dt><dd>14,300</dd><dt>Rows that join</dt><dd>14,300</dd><dt>Participants unmatched</dt><dd>0</dd></dl>' +
        '<p>The derivation is written into the project’s <code>workflows/1_mappings/LB.yaml</code> as a query step. Diff it, review it, commit it.</p>' +
        '<pre><span class="c"># added by the bench, 2026-08-27</span>\n<span class="k">- output:</span> Temp_LB_Keyed\n  <span class="k">name:</span> gsm.core::RunQuery\n  <span class="k">params:</span>\n    <span class="k">df:</span> Raw_LB\n    <span class="k">strQuery:</span> <span class="add">"SELECT * REPLACE (regexp_replace(subjid,\n      \'^SITE[0-9]+-\', \'\') AS subjid) FROM df"</span></pre>';
    }
    return '<h4>Key overlap</h4>' +
      '<div class="banner bad"><b>Raw_LB &rarr; Raw_SUBJ on <code>subjid</code>: ' + fmt(m.joined_rows) + ' of ' + fmt(m.delivered_rows) + ' rows match.</b> ' +
      m.lost_subjects + ' participants in the lab file match no one in demographics.</div>' +
      '<dl class="kv"><dt>Rows delivered</dt><dd>' + fmt(m.delivered_rows) + '</dd>' +
      '<dt>Rows the inner join keeps</dt><dd>' + fmt(m.joined_rows) + '</dd>' +
      '<dt>Participants dropped</dt><dd>' + m.lost_subjects + '</dd></dl>' +
      '<p>Both columns exist, both are character, both pass every type check. The unmatched values look like this:</p>' +
      '<pre>Raw_LB.subjid   SITE4275-S1000   SITE7543-S10245\nRaw_SUBJ.subjid S1000            S10245</pre>' +
      '<p>Today the pipeline drops these rows with no warning of any kind — the join is an <code>inner_join</code> and it is silent.</p>' +
      '<div class="ed-act"><button class="btn sm accent" id="fix-key">Derive: strip the site prefix</button></div>';
  }

  function drValues() {
    if (!settled('Raw_LB.lbtstnam'))
      return '<h4>Controlled values</h4><p>Some columns are only useful if their <em>values</em> are recognised. <code>lbtstnam</code> is one: the Hepatic Safety Explorer matches four literal strings.</p><div class="banner warn"><b>Bind <code>Raw_LB.lbtstnam</code> first.</b></div>';
    var need = { ALT: 'Alanine Aminotransferase', AST: 'Aspartate Aminotransferase', TB: 'Bilirubin', ALP: 'Alkaline Phosphatase' };
    var e = edishReach();
    var out = '<h4>Controlled values &mdash; <code>lbtstnam</code></h4>' +
      '<p>The delivery carries <b>12 spellings</b> for <b>4</b> analytes, because three laboratories contributed to it. <code>hep_explorer.yaml</code> matches literal strings, so an unmapped spelling is not an error — it is an absence.</p>' +
      '<div class="ed-act" style="margin:0 0 .55rem"><button class="btn sm ghost" id="vm-auto">Propose all 12</button></div>' +
      '<div class="vmap">' + B.lbtest.map(function (v) {
        var cur = S.vmap[v.value] || '';
        return '<div class="vrow ' + (cur ? 'set' : 'unset') + '">' +
          '<span><span class="vv">' + esc(v.value) + '</span><br><span class="vn">' + fmt(v.n) + ' rows &middot; ' + v.lab + ' lab &middot; ' + esc(v.units) + (v.noULN ? ' &middot; no ref range' : '') + '</span></span>' +
          '<select data-vv="' + esc(v.value) + '"><option value="">— unmapped</option>' +
          Object.keys(need).map(function (n) { return '<option value="' + n + '"' + (cur === n ? ' selected' : '') + '>' + n + '</option>'; }).join('') +
          '</select></div>';
      }).join('') + '</div>';
    out += '<h4>Reach</h4><div class="reach"><span class="track"><span class="fill' + (e.reach < e.total ? ' part' : '') + '" style="width:' + (e.reach / e.total * 100) + '%"></span></span><span class="n">' + e.reach + '/' + e.total + '</span></div>';
    if (e.blocked.length) {
      out += e.blocked.map(function (b) {
        return '<div class="banner warn"><b>' + b.n + ' participants</b> (' + b.lab + ' lab) — ' + esc(b.why) + '.</div>';
      }).join('');
    } else out += '<div class="banner good"><b>All 765 participants reach the plot.</b></div>';
    out += '<p>Mapping compiles to a <code>CASE WHEN</code> inside the existing query step. The spec keeps its two keys; nothing upstream changes.</p>' +
      '<pre><span class="k">strQuery:</span> <span class="add">"SELECT *, CASE\n  WHEN lbtstnam IN (\'ALT\',\'ALT (SGPT)\')\n    THEN \'Alanine Aminotransferase\'\n  ... END AS lbtstnam FROM df"</span></pre>';
    return out;
  }

  function drYaml() {
    var d = S.sel ? S.sel.split('.')[0] : 'Raw_LB';
    var rs = rowsOf(d);
    var body = rs.map(function (r) {
      var k = d + '.' + r.col, b = st(k);
      var line = '    <span class="k">' + esc(r.col) + ':</span>\n      <span class="k">type:</span> ' + esc(r.type);
      if (b.mode === 'bound' && norm(b.src) !== norm(r.col)) line += '\n      <span class="k">source_col:</span> <span class="add">' + esc(b.src) + '</span>';
      if (b.mode === 'bound') line += '  <span class="c"># ' + esc(b.via) + ', ' + esc(b.file) + '</span>';
      if (b.mode === 'derived') line = '    <span class="c"># ' + esc(r.col) + ': derived — see the query step below</span>';
      if (b.mode === 'const') line += '  <span class="c"># constant: ' + esc(b.value) + '</span>';
      if (b.mode === 'declined') line = '    <span class="c"># ' + esc(r.col) + ': DECLINED — ' + esc(b.reason) + '</span>';
      if (b.mode === 'open') line += '  <span class="c"># open</span>';
      return line;
    }).join('\n');
    return '<h4>What gets written</h4>' +
      '<p>The bench edits the project’s own files — the ones <code>og_init()</code> already put in <code>workflows/1_mappings/</code>. Not an app database. Diff it, review it, commit it, hand it to QA.</p>' +
      '<pre><span class="c"># workflows/1_mappings/' + esc(d.replace('Raw_', '')) + '.yaml</span>\n<span class="k">spec:</span>\n  <span class="k">' + esc(d) + ':</span>\n' + body + '</pre>' +
      '<p class="hint">Click a row in the grid to see its domain here.</p>';
  }

  // ------------------------------------------------------------------ boot
  function paint() { renderLedger(); renderSources(); renderGrid(); renderDrawer(); }

  function boot() {
    el.ledger = $('bench-ledger'); el.verdict = $('bench-verdict');
    el.sources = $('bench-sources'); el.grid = $('bench-grid');
    el.drTabs = $('bench-drtabs'); el.drBody = $('bench-drbody');
    if (!el.grid) return;
    // Figures printed in the prose, computed here so they cannot drift.
    // The two figures quoted in the prose are computed under the assignment a
    // person would actually make — the seven files that genuinely correspond to
    // a domain — not under whatever the reader has clicked. Stated on the page.
    var REF = {
      Raw_AE: 'AE.csv', Raw_SUBJ: 'DM.csv', Raw_ENROLL: 'DM.csv',
      Raw_LB: 'LAB_LIVER_ALL.csv', Raw_PD: 'DV.csv', Raw_SITE: 'SITES.csv',
      Raw_QUERY: 'QUERIES.csv'
    };
    var save = S.fileOf; S.fileOf = REF;
    var refIdent = identicalKeys().length, refProp = proposedKeys().length;
    S.fileOf = save;
    var f = $('f-identical'); if (f) f.textContent = refIdent;
    var p = $('f-proposed'); if (p) p.textContent = refProp;
    var t = $('f-total'); if (t) t.textContent = CONTRACT.length;
    var n = $('f-none'); if (n) n.textContent = CONTRACT.length - refIdent - refProp;
    var c = $('f-cols'); if (c) c.textContent = FILES.reduce(function (a, x) { return a + x.cols.length; }, 0);
    paint();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
