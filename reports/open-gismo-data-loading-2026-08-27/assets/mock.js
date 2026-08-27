/* Fit — mockup behaviour.

   Screen 3 is the live one: the Raw_LB mapping grid. Changing any of the three
   consequential rows re-derives the readiness line, the preview rows and the
   diff on screen 4, so the mock demonstrates the loop rather than describing it.

   Target column names, their types and their downstream consumers are read from
   demo-301 (workflows/1_mappings/LB.yaml, 2_metrics/*.yaml, 4_modules/*.yaml).
   The incoming lab-vendor columns and the sample values are invented. */
(function () {
  "use strict";

  /* ---------- tabs ---------- */
  var tabs = Array.prototype.slice.call(document.querySelectorAll('.mock-steps button'));
  tabs.forEach(function (btn) {
    btn.addEventListener('click', function () {
      tabs.forEach(function (b) {
        var on = b === btn;
        b.setAttribute('aria-selected', on ? 'true' : 'false');
        document.getElementById(b.getAttribute('aria-controls')).hidden = !on;
      });
    });
  });

  /* ---------- the Raw_LB spec, and what needs each column ---------- */
  var SPEC = [
    { t: 'studyid',    ty: 'character', why: 'Study identifier — carried by every metric' },
    { t: 'subjid',     ty: 'character', why: 'Joins to Mapped_SUBJ (inner join) — the spine', live: 'subjid' },
    { t: 'visnam',     ty: 'character', why: 'results-over-time, shift-plot' },
    { t: 'visnum',     ty: 'integer',   why: 'Visit ordering on every longitudinal chart' },
    { t: 'lb_dy',      ty: 'integer',   why: 'Study day — hep-explorer, outlier-explorer' },
    { t: 'lb_dt',      ty: 'Date',      why: 'Snapshot date derives from the newest raw date' },
    { t: 'lbblfl',     ty: 'character', why: 'Baseline flag — shift-plot, delta-delta', live: 'lbblfl' },
    { t: 'battrnam',   ty: 'character', why: 'Measure grouping in the chart sidebars' },
    { t: 'lbtstnam',   ty: 'character', why: 'Measure name — all six LB charts' },
    { t: 'lbstresn',   ty: 'numeric',   why: 'The result itself — all six LB charts' },
    { t: 'lbstresu',   ty: 'character', why: 'Units on every axis label' },
    { t: 'lbstnrlo',   ty: 'numeric',   why: 'Lower limit of normal — normal-range bands' },
    { t: 'lbstnrhi',   ty: 'numeric',   why: 'Upper limit of normal — hep-explorer ×ULN' },
    { t: 'toxgrg_nsv', ty: 'character', why: 'CTCAE grade — kri0005 / cou0005 Grade 3+ Lab Abnormality', live: 'toxgrg' }
  ];

  /* straightforward renames the user would just confirm */
  var PLAIN = {
    studyid: 'STUDYID', visnam: 'VISIT', visnum: 'VISITNUM', lb_dy: 'LBDY',
    lb_dt: 'LBDTC', battrnam: 'LBCAT', lbtstnam: 'LBTEST', lbstresn: 'LBSTRESN',
    lbstresu: 'LBSTRESU', lbstnrlo: 'LBSTNRLO', lbstnrhi: 'LBSTNRHI'
  };
  var PLAIN_REASON = {
    lb_dt: 'Exact match after case-folding. ISO-8601 timestamps truncated to Date — 0 of 58,412 failed to coerce.',
    battrnam: 'Name similarity 0.42, but the only unmapped character column with 8 repeated levels; LBCAT is SDTM’s battery.',
    lbstnrlo: 'Exact match after case-folding. Numeric, and below LBSTNRHI on 100% of rows.',
    lbstnrhi: 'Exact match after case-folding. Numeric, and above LBSTNRLO on 100% of rows.',
    lbstresn: 'Exact match after case-folding. 58,412 of 58,412 coerce to numeric.'
  };

  /* the three rows that carry the argument */
  var LIVE = {
    subjid: {
      def: 'asis',
      opts: [
        { v: 'asis',  label: 'SUBJECT  (as supplied — proposed)',
          state: 'gap',
          reason: 'Proposed on the name, and open.gismo checked it: right type, no missing values, 812 distinct — and 0 of 812 match Mapped_SUBJ. The lab vendor prefixes the site, "0301-S036", where the demographics extract writes "S036". The inner join in LB.yaml would return no rows.' },
        { v: 'strip', label: 'SUBJECT → strip the site prefix',
          state: 'ok',
          reason: '765 of 812 join to Mapped_SUBJ. The 47 that do not are screen failures who never enrolled, dropped by the same inner join on purpose.' },
        { v: 'none',  label: '— not supplied —',
          state: 'gap',
          reason: 'Raw_LB cannot be mapped without a subject identifier. The whole domain is declined.' }
      ]
    },
    lbblfl: {
      def: 'asis',
      opts: [
        { v: 'asis',   label: 'BASELINE  (as supplied — proposed)',
          state: 'attn',
          reason: 'Proposed on the name. The values are "BASELINE" and "POST"; every LB workflow tests lbblfl == "Y", so nothing here would count as baseline and shift-plot and delta-delta would draw empty.' },
        { v: 'recode', label: 'BASELINE → recode to Y / blank',
          state: 'ok',
          reason: '"BASELINE" → "Y" (764 rows), "POST" → "" (57,648 rows). One value per subject per test, as the shift-plot expects.' },
        { v: 'none',   label: '— not supplied —',
          state: 'attn',
          reason: 'Shift-plot and delta-delta lose their baseline. The other four LB charts and both LB metrics still run.' }
      ]
    },
    toxgrg: {
      def: 'none',
      opts: [
        { v: 'none',   label: '— not supplied — decline the Grade 3+ KRI',
          state: 'declined',
          reason: 'No toxicity grade in the export. kri0005 / cou0005, the Grade 3+ Lab Abnormality Rate, are recorded as declined in the study config. The Hy\u2019s Law candidate metric and all six LB charts still render.' },
        { v: 'derive', label: 'derive from result and reference range',
          state: 'attn',
          reason: 'Normal-range severity is not CTCAE grade — CTCAE thresholds are per-analyte and not derivable from a reference range alone. Offering this at all is an open question.' }
      ]
    }
  };

  var state = { subjid: LIVE.subjid.def, lbblfl: LIVE.lbblfl.def, toxgrg: LIVE.toxgrg.def };

  function opt(key) {
    var live = LIVE[key];
    for (var i = 0; i < live.opts.length; i++) if (live.opts[i].v === state[key]) return live.opts[i];
    return live.opts[0];
  }

  var FLAG = {
    ok:       '<span class="m-flag m-ok">✓ fits</span>',
    attn:     '<span class="m-flag m-mid">◐ check this</span>',
    gap:      '<span class="m-flag m-no">✗ breaks the run</span>',
    declined: '<span class="m-flag m-off">— declined</span>'
  };
  var ROWCLASS = { ok: '', attn: ' attn', gap: ' gap', declined: '' };

  /* ---------- build the grid ---------- */
  function buildMap() {
    var host = document.getElementById('lb-map');
    host.innerHTML = '';
    SPEC.forEach(function (s) {
      var row = document.createElement('div');
      var right;

      if (s.live) {
        var o = opt(s.live);
        row.className = 'm-row' + ROWCLASS[o.state];
        var live = LIVE[s.live];
        var sel = '<select data-key="' + s.live + '" aria-label="Source for ' + s.t + '">' +
          live.opts.map(function (x) {
            return '<option value="' + x.v + '"' + (x.v === state[s.live] ? ' selected' : '') + '>' + x.label + '</option>';
          }).join('') + '</select>';
        right = sel + ' ' + FLAG[o.state] + '<span class="reason">' + o.reason + '</span>';
      } else {
        row.className = 'm-row';
        var src = PLAIN[s.t];
        var reason = PLAIN_REASON[s.t] || 'Exact match after case-folding.';
        right = '<span class="m-mono">' + src + '</span> ' + FLAG.ok +
                '<span class="reason">' + reason + '</span>';
      }

      row.innerHTML =
        '<div class="m-need"><span class="t">' + s.t + '</span> ' +
        '<span class="m-flag m-off">' + s.ty + '</span>' +
        '<span class="why">' + s.why + '</span></div>' +
        '<div class="arrow">←</div>' +
        '<div>' + right + '</div>';
      host.appendChild(row);
    });

    Array.prototype.forEach.call(host.querySelectorAll('select'), function (sel) {
      sel.addEventListener('change', function () {
        state[sel.getAttribute('data-key')] = sel.value;
        render();
      });
    });
  }

  /* ---------- readiness line ---------- */
  function buildStatus() {
    var s = opt('subjid'), b = opt('lbblfl'), g = opt('toxgrg');
    var mapped = 11 + (s.v === 'none' ? 0 : 1) + (b.v === 'none' ? 0 : 1) + (g.v === 'derive' ? 1 : 0);
    var join = s.v === 'strip' ? '765 of 812' : (s.v === 'asis' ? '0 of 812' : 'no key');
    var joinFlag = s.v === 'strip' ? FLAG.ok : FLAG.gap;

    var verdict, tone;
    if (s.state === 'gap') {
      verdict = 'Raw_LB will map to zero rows. Six of the nine safety charts, the Hy\u2019s Law candidate metric and the Grade 3+ Lab Abnormality Rate all render empty, and nothing reports an error.';
      tone = 'gap';
    } else if (b.state === 'attn' || g.state === 'attn') {
      verdict = 'Raw_LB will map. One column still needs a decision before the run means what you think it means.';
      tone = 'attn';
    } else {
      verdict = 'Raw_LB is ready. 58,412 rows over 765 participants, feeding six of the nine safety charts' + (g.v === 'none' ? ' and the Hy\u2019s Law candidate metric.' : ', the Hy\u2019s Law candidate metric and the Grade 3+ Lab Abnormality Rate.');
      tone = 'ok';
    }

    var css = tone === 'gap'
      ? 'border-color:var(--m-bad-rule);background:var(--m-bad-bg)'
      : (tone === 'attn' ? 'border-color:var(--m-warn-rule);background:var(--m-warn-bg)' : '');
    var host = document.getElementById('lb-status');
    host.setAttribute('style', 'margin-top:.9rem;' + css);
    host.innerHTML =
      '<span class="m-label">Readiness</span>' +
      '<div style="margin-top:.35rem;font-size:.9rem">' +
        '<b>' + mapped + ' of 14</b> columns mapped &nbsp;&middot;&nbsp; keys join <b>' + join + '</b> ' + joinFlag +
        (g.v === 'none' ? ' &nbsp;&middot;&nbsp; <span class="m-mono">toxgrg_nsv</span> declined' : '') +
      '</div>' +
      '<p style="font-size:.86rem;margin-top:.4rem">' + verdict + '</p>';
  }

  /* ---------- preview ---------- */
  var BASE = [
    { id: 'S036',  vis: 'Week 4',  test: 'Alanine Aminotransferase', val: '96',   unit: 'U/L',    bl: 'POST' },
    { id: 'S036',  vis: 'Screening', test: 'Alanine Aminotransferase', val: '31', unit: 'U/L',    bl: 'BASELINE' },
    { id: 'S1000', vis: 'Week 4',  test: 'Total Bilirubin',          val: '1.8',  unit: 'mg/dL',  bl: 'POST' },
    { id: 'S1000', vis: 'Week 8',  test: 'Total Bilirubin',          val: '2.4',  unit: 'mg/dL',  bl: 'POST' },
    { id: 'S10055', vis: 'Week 12', test: 'Creatinine',              val: '1.1',  unit: 'mg/dL',  bl: 'POST' }
  ];

  function buildPreview() {
    var s = opt('subjid'), b = opt('lbblfl'), g = opt('toxgrg');
    var t = document.getElementById('lb-preview');

    if (s.v === 'none') {
      t.innerHTML = '<tbody><tr><td style="padding:1rem;color:var(--m-bad)">' +
        '✗ No subject identifier — Raw_LB cannot be mapped, so there is nothing to preview.</td></tr></tbody>';
      return;
    }

    var cols = ['subjid', 'visnam', 'lbtstnam', 'lbstresn', 'lbstresu', 'lbblfl'];
    if (g.v === 'derive') cols.push('toxgrg_nsv');

    var head = '<thead><tr>' + cols.map(function (c) { return '<th>' + c + '</th>'; }).join('') +
               '<th>joins?</th></tr></thead>';

    var body = BASE.map(function (r) {
      var id = s.v === 'strip' ? r.id : '0301-' + r.id;
      var bl = b.v === 'recode' ? (r.bl === 'BASELINE' ? 'Y' : '') : (b.v === 'none' ? '—' : r.bl);
      var cells = [
        '<span class="m-mono">' + id + '</span>',
        r.vis, r.test, r.val, r.unit,
        '<span class="m-mono">' + (bl === '' ? '&nbsp;' : bl) + '</span>'
      ];
      if (g.v === 'derive') {
        cells.push('<span class="m-mono">' + (parseFloat(r.val) > 3 ? '?' : '0') + '</span>');
      }
      var j = s.v === 'strip'
        ? '<span class="m-flag m-ok">✓</span>'
        : '<span class="m-flag m-no">✗</span>';
      return '<tr><td>' + cells.join('</td><td>') + '</td><td>' + j + '</td></tr>';
    }).join('');

    var note = s.v === 'asis'
      ? '<tr><td colspan="' + (cols.length + 1) + '" style="color:var(--m-bad);font-size:.8rem">' +
        'None of these rows survive the inner join to Mapped_SUBJ. Mapped_LB would be 0 rows.</td></tr>'
      : '';

    t.innerHTML = head + '<tbody>' + body + note + '</tbody>';
  }

  /* ---------- the diff ---------- */
  function esc(s) { return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

  function buildDiff() {
    var s = opt('subjid'), b = opt('lbblfl'), g = opt('toxgrg');
    var L = [];
    function hd(x) { L.push('<span class="hd">' + esc(x) + '</span>'); }
    function ctx(x) { L.push('<span class="ctx">  ' + esc(x) + '</span>'); }
    function add(x) { L.push('<span class="add">+ ' + esc(x) + '</span>'); }
    function prop(x) { L.push('<span class="prop">+ ' + esc(x) + '</span>'); }
    function note(x) { L.push('<span class="note">+ ' + esc(x) + '</span>'); }

    hd('--- config/data-config.yaml');
    add('Raw_LB: input/Raw_LB.csv    # converted from lb_central.xpt, 2026-08-27');
    ctx('');
    hd('--- workflows/1_mappings/LB.yaml');
    ctx('spec:');
    ctx('  Raw_LB:');
    ctx('    studyid:');
    ctx('      type: character');
    add('      source_col: STUDYID');
    ctx('    subjid:');
    ctx('      type: character');

    if (s.v === 'none') {
      note('      # declined — no subject identifier supplied');
    } else {
      add('      source_col: SUBJECT');
      if (s.v === 'strip') {
        prop('      transform: strip_prefix        # PROPOSED KEY — see D4');
        prop('      pattern: "^[0-9]{4}-"          # "0301-S036" → "S036"');
      }
    }

    ctx('    visnam:');
    ctx('      type: character');
    add('      source_col: VISIT');
    ctx('    ... 8 further renames elided ...');
    ctx('    lbblfl:');
    ctx('      type: character');

    if (b.v === 'none') {
      note('      # declined — no baseline flag supplied');
    } else {
      add('      source_col: BASELINE');
      if (b.v === 'recode') {
        prop('      recode:                        # PROPOSED KEY — see D4');
        prop('        BASELINE: "Y"');
        prop('        POST: ""');
      }
    }

    ctx('    toxgrg_nsv:');
    ctx('      type: character');
    if (g.v === 'none') {
      note('      # declined — not supplied; kri0005 / cou0005 recorded as absent');
    } else {
      prop('      derive: normal_range_severity   # PROPOSED KEY — and not CTCAE; see D4');
    }

    if (g.v === 'none') {
      ctx('');
      hd('--- config/study-config.yaml');
      add('declined:');
      add('  domains: [Raw_DATACHG, Raw_DATAENT, Raw_SDRGCOMP, Raw_STUDCOMP, Raw_IE]');
      add('  columns: [Raw_LB.toxgrg_nsv]');
      note('  # the site prints "declined at setup" wherever these would have appeared');
    }

    document.getElementById('lb-diff').innerHTML = L.join('');
  }

  function render() { buildMap(); buildStatus(); buildPreview(); buildDiff(); }
  render();
})();
