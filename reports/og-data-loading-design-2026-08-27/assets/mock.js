/* mock.js — the matcher behind the mockup.

   This is a real function, not a set of hardcoded screens: it takes the user's
   column names and the 90 target declarations read out of the project's own
   workflow YAMLs, and proposes a `source_col` for each. Every suggestion the
   mockup shows was computed here when the page loaded. That is deliberate —
   a mapping screen whose suggestions are faked proves nothing about whether
   the suggestions are achievable.

   Nothing here ships. It is the argument in executable form. */
(function (glb) {
  'use strict';

  var norm = function (s) {
    return String(s == null ? '' : s).toLowerCase().replace(/[^a-z0-9]/g, '');
  };

  /* The ground truth is serialised from R with auto_unbox, so a length-1
     character vector arrives as a bare string rather than an array. Coerce
     once here: treating "SUBJ" as an array yields four one-character entries,
     which silently turns "declared in 1 file" into "declared in 4 files". */
  var arr = function (v) {
    if (v == null) return [];
    return Array.isArray(v) ? v : [v];
  };

  /* Confidence tiers, best first. `kind` drives the colour and the printed reason. */
  var TIERS = [
    { kind: 'exact', conf: 'auto', why: 'exact name' },
    { kind: 'name', conf: 'auto', why: 'same name, different case' },
    { kind: 'adam', conf: 'auto', why: 'ADaM' },
    { kind: 'sdtm', conf: 'auto', why: 'SDTM' },
    { kind: 'alias', conf: 'guess', why: 'known alias' },
    { kind: 'fuzzy', conf: 'guess', why: 'similar name' },
    { kind: 'none', conf: 'none', why: 'no candidate' }
  ];
  var tier = function (k) {
    for (var i = 0; i < TIERS.length; i++) if (TIERS[i].kind === k) return TIERS[i];
    return TIERS[TIERS.length - 1];
  };

  /* Score one target column against the user's available columns. */
  function matchColumn(target, userCols) {
    var byNorm = {};
    userCols.forEach(function (c) { if (!(norm(c) in byNorm)) byNorm[norm(c)] = c; });

    var hit = function (candidate) {
      if (!candidate) return null;
      if (userCols.indexOf(candidate) !== -1) return candidate;
      var n = byNorm[norm(candidate)];
      return n || null;
    };

    var m;
    if (userCols.indexOf(target.col) !== -1) return { source: target.col, kind: 'exact' };
    if ((m = byNorm[norm(target.col)])) return { source: m, kind: 'name' };
    if ((m = hit(target.adam))) return { source: m, kind: 'adam' };
    if ((m = hit(target.sdtm))) return { source: m, kind: 'sdtm' };
    for (var i = 0; i < (target.aliases || []).length; i++) {
      if ((m = hit(target.aliases[i]))) return { source: m, kind: 'alias' };
    }
    /* Last resort: longest shared prefix of at least 4 characters, unique winner only. */
    var t = norm(target.col), best = null, bestLen = 0, tie = false;
    userCols.forEach(function (c) {
      var u = norm(c), k = 0;
      while (k < t.length && k < u.length && t[k] === u[k]) k++;
      if (k >= 4) {
        if (k > bestLen) { bestLen = k; best = c; tie = false; }
        else if (k === bestLen) { tie = true; }
      }
    });
    if (best && !tie) return { source: best, kind: 'fuzzy' };
    return { source: null, kind: 'none' };
  }

  /* Propose a whole domain. Returns rows plus the tallies the screen prints. */
  function proposeDomain(domain, userCols) {
    var delivered = Array.isArray(userCols);
    var rows = (domain.columns || []).map(function (t) {
      var r = delivered ? matchColumn(t, userCols) : { source: null, kind: 'none' };
      var tr = tier(r.kind);
      return {
        col: t.col, type: t.type, declared_in: arr(t.declared_in),
        adam: t.adam, sdtm: t.sdtm, critical: !!t.critical,
        source: r.source, kind: r.kind, conf: tr.conf, why: tr.why
      };
    });

    /* A source column claimed by two targets is an ambiguity a person must settle. */
    var claims = {};
    rows.forEach(function (r) { if (r.source) (claims[r.source] = claims[r.source] || []).push(r.col); });
    rows.forEach(function (r) {
      if (r.source && claims[r.source].length > 1) {
        r.conflict = claims[r.source].filter(function (c) { return c !== r.col; });
      }
    });

    var auto = rows.filter(function (r) { return r.conf === 'auto'; }).length;
    var guess = rows.filter(function (r) { return r.conf === 'guess'; }).length;
    var none = rows.filter(function (r) { return r.conf === 'none'; }).length;
    var used = {};
    rows.forEach(function (r) { if (r.source) used[r.source] = 1; });
    var unused = delivered ? userCols.filter(function (c) { return !used[c]; }) : [];

    return {
      domain: domain.domain, delivered: delivered, rows: rows,
      auto: auto, guess: guess, none: none, total: rows.length,
      unusedCols: unused, n_metrics: domain.n_metrics, metrics: domain.metrics,
      status: !delivered ? 'missing' : (none > 0 ? 'crit' : (guess > 0 ? 'warn' : 'good'))
    };
  }

  /* Which standard does the delivery look like? The safetyGraphics move: score
     every known standard and label the best one, rather than assuming. */
  function detectStandard(domains, userExport) {
    var tallies = { adam: { hit: 0, tot: 0 }, sdtm: { hit: 0, tot: 0 } };
    domains.forEach(function (d) {
      var cols = userExport[d.domain];
      if (!cols) return;
      var byNorm = {};
      cols.forEach(function (c) { byNorm[norm(c)] = 1; });
      (d.columns || []).forEach(function (t) {
        ['adam', 'sdtm'].forEach(function (std) {
          if (!t[std]) return;
          tallies[std].tot++;
          if (byNorm[norm(t[std])]) tallies[std].hit++;
        });
      });
    });
    var best = null;
    Object.keys(tallies).forEach(function (k) {
      var t = tallies[k];
      var pct = t.tot ? t.hit / t.tot : 0;
      if (!best || pct > best.pct) best = { std: k, pct: pct, hit: t.hit, tot: t.tot };
    });
    if (!best || best.pct === 0) return { label: 'No standard detected', std: null, pct: 0, hit: 0, tot: 0 };
    var name = best.std === 'adam' ? 'ADaM' : 'SDTM';
    best.label = best.pct === 1 ? name : 'Partial ' + name;
    return best;
  }

  /* Which metrics survive, scored at COLUMN level rather than domain level.

     A metric needs every column it names and nothing else. kri0001 reads four:
     Raw_AE$subjid, Raw_SUBJ$subjid, Raw_SUBJ$invid, Raw_SUBJ$timeonstudy — not
     all fourteen columns declared for Raw_SUBJ. Scoring whole domains would
     make the screen demand 90 mappings when 23 carry every metric, and would
     report a study as unusable while the metrics it wants are already reachable.

     `mapped` is a set of "Raw_DOM$col" strings that currently have a source. */
  function metricReach(metrics, mapped) {
    var live = [], dead = [], missingFor = {};
    Object.keys(metrics).forEach(function (m) {
      var need = metrics[m].needsCols || [];
      var gaps = need.filter(function (k) { return !mapped[k]; });
      if (gaps.length) { dead.push(m); missingFor[m] = gaps; }
      else { live.push(m); }
    });
    return { live: live, dead: dead, missingFor: missingFor };
  }

  /* Which metrics does one column control? Used to price a single dropdown. */
  function columnLeverage(metrics, key) {
    return Object.keys(metrics).filter(function (m) {
      return (metrics[m].needsCols || []).indexOf(key) !== -1;
    });
  }

  glb.OGMOCK = {
    norm: norm,
    matchColumn: matchColumn,
    proposeDomain: proposeDomain,
    detectStandard: detectStandard,
    metricReach: metricReach,
    columnLeverage: columnLeverage
  };
})(window);
