/* Guided setup walkthrough — the interview, mocked.
 *
 * State lives in one object. Steps 2, 3 and 5 are genuinely live: the join
 * count, the preview highlight and the ledger all recompute from the answers.
 * Every number quoted as measured came from the runs on evidence.html; the
 * mock never invents a count.
 */
(function () {
  'use strict';

  var D = window.DELIVERY;
  var esc = function (s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  };

  // ---- measured facts, quoted not computed ----------------------------
  var OVERLAP = [
    { a: 'SUBJID',  b: 'SUBJECT', shared: 765, note: 'proposed', kind: 'ok' },
    { a: 'TRTSDT',  b: 'LBDTC',   shared: 88,  note: 'two date columns — a decoy', kind: 'hm' },
    { a: 'STUDYID', b: 'STUDY',   shared: 1,   note: 'one study id, shared by everything', kind: '' },
    { a: 'USUBJID', b: 'SUBJECT', shared: 0,   note: 'what a name detector picks', kind: 'no' }
  ];

  var TRIPLES = [
    { value: 'LBORRES', lo: 'LBORNRLO', hi: 'LBORNRHI', measure: 'LBTEST',
      purity: 1.00, inrange: 0.85, correct: true },
    { value: 'LBORNRLO', lo: 'LBORRES', hi: 'LBORNRHI', measure: null,
      purity: 0.00, inrange: 0.62, correct: false }
  ];

  var HEP = [
    { key: 'ALT', label: 'Alanine aminotransferase', gsm: 'Alanine Aminotransferase', guess: 'ALT' },
    { key: 'AST', label: 'Aspartate aminotransferase', gsm: 'Aspartate Aminotransferase', guess: 'SGOT' },
    { key: 'TB',  label: 'Total bilirubin', gsm: 'Bilirubin', guess: 'TBILI' },
    { key: 'ALP', label: 'Alkaline phosphatase', gsm: 'Alkaline Phosphatase', guess: 'Alk Phos' }
  ];

  // ---- interview state -------------------------------------------------
  var S = {
    step: 0,
    kinds: { adsl: 'people', lab: 'measure' },
    joinA: 'SUBJID', joinB: 'SUBJECT',
    value: 'LBORRES', lo: 'LBORNRLO', hi: 'LBORNRHI',
    measure: 'LBTEST', visit: 'VISIT',
    grade: null,          // 'none' | 'derive' | 'proceed'
    hep: {}               // key -> chosen LBTEST value
  };
  HEP.forEach(function (h) { S.hep[h.key] = h.guess; });

  function joinShared() {
    var r = OVERLAP.filter(function (o) { return o.a === S.joinA && o.b === S.joinB; })[0];
    return r ? r.shared : 0;
  }
  function tripleOk() {
    return S.value === 'LBORRES' && S.lo === 'LBORNRLO' && S.hi === 'LBORNRHI';
  }

  // ---- small builders --------------------------------------------------
  function preview(which, hi) {
    var f = D[which];
    var hiSet = {};
    (hi || []).forEach(function (c) { hiSet[c] = 1; });
    var head = f.cols.map(function (c) {
      return '<th class="' + (hiSet[c] ? 'hi' : '') + '">' + esc(c) + '</th>';
    }).join('');
    var body = f.rows.map(function (r) {
      return '<tr>' + r.map(function (v, i) {
        var c = f.cols[i];
        return '<td class="' + (hiSet[c] ? 'hi' : '') + '">' +
          (v === '' || v === 'NA' ? '<span class="dimc">·</span>' : esc(v)) + '</td>';
      }).join('') + '</tr>';
    }).join('');
    return '<div class="dtw"><table class="dt"><thead><tr>' + head +
      '</tr></thead><tbody>' + body + '</tbody></table></div>';
  }

  function sampleOf(which, col, n) {
    var f = D[which], i = f.cols.indexOf(col);
    if (i < 0) return '';
    var seen = [], out = [];
    f.rows.forEach(function (r) {
      if (out.length >= (n || 3)) return;
      if (r[i] !== '' && r[i] !== 'NA' && seen.indexOf(r[i]) < 0) { seen.push(r[i]); out.push(r[i]); }
    });
    return out.join('  ·  ');
  }

  function choice(opts) {
    // opts: {name, value, label, sample, why, mark, markKind, sel, onpick}
    return '<label class="choice' + (opts.sel ? ' sel' : '') + '" data-pick="' + esc(opts.pick) + '">' +
      '<input type="radio" name="' + esc(opts.name) + '"' + (opts.sel ? ' checked' : '') + '>' +
      '<span><span class="cn">' + esc(opts.label) + '</span>' +
      (opts.sample ? '<span class="cv">' + esc(opts.sample) + '</span>' : '') +
      (opts.why ? '<span class="cwhy">' + opts.why + '</span>' : '') + '</span>' +
      (opts.mark ? '<span class="cmark ' + (opts.markKind || '') + '">' + opts.mark + '</span>' : '<span></span>') +
      '</label>';
  }

  // ---- the ledger ------------------------------------------------------
  function ledger() {
    var rows = [];
    var joined = joinShared();

    if (joined === 0) {
      rows.push({ k: 'err', g: '■', t: 'The two files share <b>no participants</b> — nothing can run', p: 'all 6 charts off' });
    } else if (!tripleOk()) {
      rows.push({ k: 'err', g: '■', t: 'The chosen result column is not a lab result', p: 'charts draw nonsense' });
    } else {
      rows.push({ k: 'on', g: '●', t: 'Six safety charts drawing over <b>' + joined + '</b> participants', p: '57,200 results' });
    }

    rows.push({ k: 'off', g: '△', t: 'Nothing here looks like a <b>toxicity grade</b>' +
      (S.grade === 'proceed' ? ' <span class="pill hm">acknowledged</span>' : ''),
      p: 'Grade 3+ Lab KRI off' });
    rows.push({ k: 'off', g: '△', t: 'Nothing marks which visit is <b>baseline</b>', p: 'shift plot assumes visit 1' });

    var hepMissing = HEP.filter(function (h) { return !S.hep[h.key]; }).length;
    if (hepMissing) {
      rows.push({ k: 'off', g: '△', t: 'The hepatic explorer is missing <b>' + hepMissing + ' of 4</b> analytes', p: '1 chart off' });
    } else {
      rows.push({ k: 'on', g: '●', t: 'All four hepatic analytes named', p: 'eDISH on' });
    }

    rows.push({ k: 'err', g: '■', t: 'Site Risk Score would be computed over <b>1 of 12</b> KRIs', p: 'suppressed' });

    return '<div class="pledger">' + rows.map(function (r) {
      return '<div class="plrow ' + r.k + '"><span class="pg">' + r.g + '</span><span>' + r.t +
        '</span><span class="pp">' + esc(r.p) + '</span></div>';
    }).join('') + '</div>';
  }

  // ---- the eight steps -------------------------------------------------
  var STEPS = [

  { id: 'drop', rail: 'Your files', note: 'Nothing is asked yet.',
    render: function () {
      return '' +
      '<p class="q-kicker">Step 1 of 8 &middot; no question yet</p>' +
      '<h3 class="q">Two files, read and profiled</h3>' +
      '<p class="q-sub">You pointed open.gismo at a folder. It has looked at every column in both files ' +
      '— type, how many different values, what those values look like — before asking you anything.</p>' +
      '<div class="pgrid">' +
        '<div class="pcard"><div class="filehead"><span class="fname">adsl.csv</span>' +
          '<span class="fmeta">1,005 rows &times; 16 cols</span></div>' +
          '<p style="margin:0;font-size:.84rem" class="dim">One row per person. 4 date-shaped columns, ' +
          '5 that only ever hold two values, 1 that is different on every row.</p></div>' +
        '<div class="pcard"><div class="filehead"><span class="fname">lab_central.csv</span>' +
          '<span class="fmeta">57,200 rows &times; 11 cols</span></div>' +
          '<p style="margin:0;font-size:.84rem" class="dim">Many rows per person. One column holds ' +
          '16 repeating names, three hold numbers that move together.</p></div>' +
      '</div>' +
      '<div class="why"><p><b>What it will not do:</b> guess a data standard from the column names. ' +
      'Run against these files, the published name detector finds 3 of 9 lab roles and announces ' +
      '&ldquo;SDTM&rdquo; anyway. Names are used to rank guesses, never to fill one in.</p></div>' +
      preview('lab');
    }},

  { id: 'kind', rail: 'What they are', note: 'Question 1. Answerable by anyone.',
    render: function () {
      return '' +
      '<p class="q-kicker">Step 2 of 8 &middot; question 1</p>' +
      '<h3 class="q">Is this one row per person, or many?</h3>' +
      '<p class="q-sub">The only thing open.gismo needs from you here is the shape. Not the schema, ' +
      'not the domain — just whether a person appears once or repeatedly.</p>' +
      '<div class="pcard"><div class="filehead"><span class="fname">adsl.csv</span>' +
        '<span class="fmeta">1,005 rows</span></div>' +
      '<div class="choices">' +
        choice({ name: 'k1', pick: 'kinds:adsl:people', label: 'One row per person',
          why: '1,005 rows and 1,005 different values in one column — proposed', sel: S.kinds.adsl === 'people',
          mark: 'proposed', markKind: 'prop' }) +
        choice({ name: 'k1', pick: 'kinds:adsl:measure', label: 'Many rows per person, each a measurement',
          sel: S.kinds.adsl === 'measure' }) +
      '</div></div>' +
      '<div class="pcard"><div class="filehead"><span class="fname">lab_central.csv</span>' +
        '<span class="fmeta">57,200 rows</span></div>' +
      '<div class="choices">' +
        choice({ name: 'k2', pick: 'kinds:lab:people', label: 'One row per person', sel: S.kinds.lab === 'people' }) +
        choice({ name: 'k2', pick: 'kinds:lab:measure', label: 'Many rows per person, each a measurement',
          why: '57,200 rows over 765 repeating identifiers — proposed', sel: S.kinds.lab === 'measure',
          mark: 'proposed', markKind: 'prop' }) +
      '</div></div>' +
      '<div class="why"><p>The words <i>domain</i>, <i>ADaM</i>, <i>SDTM</i> and <i>mapping</i> ' +
      'have not appeared, and will not.</p></div>';
    }},

  { id: 'join', rail: 'How they connect', note: 'Question 2. The one that silently ruins a study.',
    render: function () {
      var shared = joinShared();
      var body = '' +
      '<p class="q-kicker">Step 3 of 8 &middot; question 2</p>' +
      '<h3 class="q">Which column says who?</h3>' +
      '<p class="q-sub">Every lab result has to find its person. open.gismo compared every text column ' +
      'in one file against every text column in the other and counted how many values they genuinely share.</p>' +
      '<div class="choices">' +
      OVERLAP.map(function (o) {
        var sel = (S.joinA === o.a && S.joinB === o.b);
        return choice({
          name: 'join', pick: 'join:' + o.a + ':' + o.b,
          label: o.a + '  ↔  ' + o.b,
          sample: sampleOf('adsl', o.a, 2) + '   ↔   ' + sampleOf('lab', o.b, 2),
          why: '<b>' + o.shared + '</b> shared ' + (o.shared === 1 ? 'value' : 'values') + ' &middot; ' + o.note,
          sel: sel,
          mark: o.shared === 765 ? 'proposed' : (o.shared === 0 ? 'joins nothing' : ''),
          markKind: o.shared === 765 ? 'prop' : 'lost'
        });
      }).join('') +
      '</div>';

      if (shared === 0) {
        body += '<div class="why bad"><p><b>This pairing joins nothing.</b> All 57,200 lab rows would be ' +
          'dropped and six charts would quietly stop existing. open.gismo will not run a study in this state.</p>' +
          '<p>It found a repair: every value in <code>USUBJID</code> starts with the same ' +
          '<code>AA-AA-000-0000-</code>. Removing it matches all 765.</p>' +
          '<div class="optbtns"><button class="optbtn" data-pick="join:SUBJID:SUBJECT">' +
          'Apply the repair</button></div></div>';
      } else if (shared === 765) {
        body += '<div class="why good"><p><b>765 of 765 enrolled participants matched.</b> ' +
          'This is the pairing open.gismo will use.</p></div>';
      } else {
        body += '<div class="why warn"><p><b>Only ' + shared + ' values match.</b> These two columns ' +
          'overlap, but not as identifiers — they are almost certainly not who-is-who.</p></div>';
      }

      body += '<div class="why"><p><b>Why this is question two.</b> The mapping workflows end in an ' +
        'inner join. A wrong answer here does not raise an error — it produces an empty study that ' +
        'looks fine. Today nothing checks it: validation reads one file at a time.</p></div>';
      return body;
    }},

  { id: 'roles', rail: 'The measurements', note: 'Questions 3–6, over your own values.',
    render: function () {
      var t = TRIPLES[0];
      var body = '' +
      '<p class="q-kicker">Step 4 of 8 &middot; questions 3 to 6</p>' +
      '<h3 class="q">Which number is the result?</h3>' +
      '<p class="q-sub">Four questions about the lab file, each proposed but none filled in. ' +
      'The highlighted columns are what open.gismo would use.</p>' +
      '<div class="choices">' +
      TRIPLES.map(function (c, i) {
        var sel = (S.value === c.value && S.lo === c.lo && S.hi === c.hi);
        return choice({
          name: 'triple', pick: 'triple:' + i,
          label: c.value + '   (range: ' + c.lo + ' – ' + c.hi + ')',
          sample: sampleOf('lab', c.value, 3),
          why: c.purity === 1
            ? 'Every one of the 16 test names carries its <b>own</b> pair of limits — that is what a reference range is.'
            : 'No test name gives a consistent range for these columns, so this is arithmetic coincidence.',
          sel: sel,
          mark: c.purity === 1 ? 'proposed' : 'ranked lower',
          markKind: c.purity === 1 ? 'prop' : 'lost'
        });
      }).join('') +
      '</div>' +
      '<div class="why warn"><p><b>Why you are being asked at all.</b> Pointed at the study ' +
      'open.gismo ships, this same engine picked the <i>visit number</i> as the lab result and scored ' +
      'itself 1.00 — higher than the 0.85 it scored on the answer it got right. So it proposes and ' +
      'shows its reasoning; it never fills a blank.</p></div>' +
      preview('lab', [S.value, S.lo, S.hi, S.measure, S.visit]) +
      '<details class="also"><summary>Three more questions, and 9 columns matched without asking</summary>' +
      '<div class="albody">' +
      [['LBTEST', 'the test name', '16 values: ALT, SGOT, TBILI, Alk Phos, …', 1],
       ['VISIT', 'the visit', 'Baseline · Week 1 · …', 1],
       ['LBORRESU', 'the units', 'U/L · g/dL · mg/dL', 0],
       ['LBDTC', 'the date', '2012-03-01', 0],
       ['VISITNUM', 'the visit number', '1 · 2 · 3', 0],
       ['LBCAT', 'the panel', 'CHEMISTRY PANEL', 0],
       ['SITEID', 'the site', 'SITE4323 · SITE8799', 0],
       ['SEX / RACE / AGE', 'who they are', 'M · White · 46', 0],
       ['ARM', 'the treatment group', 'Placebo · Drug 80mg', 0],
       ['TRTDURD', 'days on treatment', '47 · 33 · 34', 0]
      ].map(function (r) {
        return '<div class="alrow"><span><b>' + esc(r[0]) + '</b> ' +
          (r[3] ? '<span class="pill ac">asked</span>' : '<span class="pill">inferred</span>') +
          '</span><span class="to">→</span><span class="ar">' + esc(r[1]) + ' — ' + esc(r[2]) + '</span></div>';
      }).join('') +
      '</div></details>';
      return body;
    }},

  { id: 'light', rail: 'First light', note: 'The interview succeeds here.',
    render: function () {
      if (joinShared() === 0 || !tripleOk()) {
        return '<p class="q-kicker">Step 5 of 8</p>' +
          '<h3 class="q">Nothing to draw</h3>' +
          '<div class="why bad"><p><b>open.gismo will not run this study.</b> ' +
          (joinShared() === 0
            ? 'The two files share no participants, so the lab table would be empty.'
            : 'The column chosen as the lab result is not a lab result.') +
          ' Go back a step and it will draw.</p></div>';
      }
      return '' +
      '<p class="q-kicker">Step 5 of 8 &middot; six answers in</p>' +
      '<h3 class="q">Your study</h3>' +
      '<p class="q-sub">Two files, six answers, and a chart of your own data. This is where the ' +
      'interview stops — not because the mapping is finished, but because you can now judge everything after it.</p>' +
      '<div class="chartbox"><h4>Alanine aminotransferase, all visits</h4>' +
      '<p class="csub">3,575 results &middot; 765 participants &middot; reference range 7&ndash;41 U/L &middot; ' +
      '737 above the upper limit, 320 beyond the right edge</p>' +
      hist() + '</div>' +
      '<div class="why good"><p><b>Nothing was written to your files to get here.</b> ' +
      'open.gismo mapped in memory and drew. The specs are written on step 8, once you have seen ' +
      'that they produce something you recognise.</p></div>';
    }},

  { id: 'ledger', rail: 'What is missing', note: 'Priced in charts and metrics, not columns.',
    render: function () {
      return '' +
      '<p class="q-kicker">Step 6 of 8 &middot; the ledger</p>' +
      '<h3 class="q">What is not working, and what it costs</h3>' +
      '<p class="q-sub">Everything open.gismo could not resolve, stated as a consequence rather than ' +
      'as a column name.</p>' +
      ledger() +
      '<div class="why warn"><p><b>The hardest moment in this whole flow.</b> There is nothing in ' +
      'your delivery that looks like a toxicity grade, so there is no question to ask you — no list ' +
      'of columns to choose from. All open.gismo can do is tell you what it costs and refuse to let ' +
      'it pass silently.</p></div>' +
      '<div class="optbtns">' +
        '<button class="optbtn' + (S.grade === 'proceed' ? ' on' : '') + '" data-pick="grade:proceed">' +
          'Continue without it</button>' +
        '<button class="optbtn' + (S.grade === 'derive' ? ' on' : '') + '" data-pick="grade:derive">' +
          'Ask my CRO for it</button>' +
      '</div>' +
      (S.grade === 'proceed'
        ? '<div class="why"><p>open.gismo will ask you to say why, in one line, and keep it in ' +
          '<code>config/setup-log.md</code> next to the study. The Grade 3+ Lab KRI stays off and ' +
          'the site risk score stays suppressed.</p></div>'
        : S.grade === 'derive'
        ? '<div class="why"><p>The setup is saved as it stands. When the grade arrives, open.gismo ' +
          'reopens on the difference rather than starting over.</p></div>'
        : '<div class="why"><p class="dim">Choose one to continue. Neither is a click that makes ' +
          'the warning go away.</p></div>');
    }},

  { id: 'hep', rail: 'Naming the analytes', note: 'The one question about values, not columns.',
    render: function () {
      var tests = D.labTests;
      return '' +
      '<p class="q-kicker">Step 7 of 8 &middot; one more chart</p>' +
      '<h3 class="q">Which of your test names is the liver enzyme?</h3>' +
      '<p class="q-sub">The hepatic explorer needs four analytes by name. It looked for the standard ' +
      'spellings in your <code>LBTEST</code> column and found <b>none of them</b> — your lab spells all ' +
      'four differently. This is the only question in the interview about values rather than columns.</p>' +
      '<div class="pcard">' +
      HEP.map(function (h) {
        return '<div class="alrow" style="grid-template-columns:1fr auto 12rem;margin-bottom:.5rem;align-items:center">' +
          '<span><b>' + esc(h.label) + '</b><br><span class="ar">standard spelling: ' + esc(h.gsm) + ' <span class="pill no">not found</span></span></span>' +
          '<span class="to">→</span>' +
          '<select data-hep="' + esc(h.key) + '" style="font:inherit;font-size:.78rem;padding:.3rem;border-radius:6px;border:1px solid var(--p-rule);max-width:100%">' +
          '<option value="">— not in this study —</option>' +
          tests.map(function (t) {
            return '<option value="' + esc(t) + '"' + (S.hep[h.key] === t ? ' selected' : '') + '>' + esc(t) + '</option>';
          }).join('') + '</select></div>';
      }).join('') +
      '</div>' +
      '<div class="why bad"><p><b>Where this design is weak.</b> The question is easy for you to ' +
      'answer and there is nowhere good to put the answer. A mapping spec accepts exactly two things ' +
      '— a type and a source column — and neither of them is about values. open.gismo has to patch ' +
      'the chart’s own configuration file instead, which is a workaround, not a seam.</p></div>';
    }},

  { id: 'emit', rail: 'What gets written', note: 'The interview ends and does not run again.',
    render: function () {
      var joined = joinShared();
      return '' +
      '<p class="q-kicker">Step 8 of 8 &middot; done</p>' +
      '<h3 class="q">Three files, written into your study folder</h3>' +
      '<p class="q-sub">From here on this is an ordinary open.gismo project. Re-run it whenever new ' +
      'data arrives; the interview does not reappear.</p>' +
      '<pre class="emit"><span class="c"># workflows/1_mappings/LB.yaml — written by setup, edit freely</span>\n' +
      '<span class="k">spec:</span>\n' +
      '  <span class="k">Raw_LB:</span>\n' +
      '    <span class="k">subjid:</span>   { <span class="k">type:</span> <span class="v">character</span>, <span class="k">source_col:</span> <span class="v">' + esc(S.joinB) + '</span> }\n' +
      '    <span class="k">lbstresn:</span> { <span class="k">type:</span> <span class="v">numeric</span>,   <span class="k">source_col:</span> <span class="v">' + esc(S.value) + '</span> }\n' +
      '    <span class="k">lbstnrlo:</span> { <span class="k">type:</span> <span class="v">numeric</span>,   <span class="k">source_col:</span> <span class="v">' + esc(S.lo) + '</span> }\n' +
      '    <span class="k">lbstnrhi:</span> { <span class="k">type:</span> <span class="v">numeric</span>,   <span class="k">source_col:</span> <span class="v">' + esc(S.hi) + '</span> }\n' +
      '    <span class="k">lbtstnam:</span> { <span class="k">type:</span> <span class="v">character</span>, <span class="k">source_col:</span> <span class="v">' + esc(S.measure) + '</span> }\n' +
      '    <span class="k">visnam:</span>   { <span class="k">type:</span> <span class="v">character</span>, <span class="k">source_col:</span> <span class="v">' + esc(S.visit) + '</span> }\n' +
      '    <span class="c"># … 5 more inferred, and 3 the delivery does not contain:</span>\n' +
      '    <span class="w">#   toxgrg_nsv, lbblfl, lb_dy — see config/setup-log.md</span>\n' +
      '</pre>' +
      '<pre class="emit"><span class="c"># config/setup-log.md — the plain-English record, new</span>\n' +
      'Which column says who?      <span class="v">' + esc(S.joinA) + ' ↔ ' + esc(S.joinB) + '</span>  <span class="c">(' + joined + ' matched; USUBJID matched 0)</span>\n' +
      'Which number is the result? <span class="v">' + esc(S.value) + '</span>  <span class="c">(each of 16 tests had its own range)</span>\n' +
      'Toxicity grade              <span class="w">absent — ' +
        (S.grade === 'derive' ? 'requested from CRO' : S.grade === 'proceed' ? 'accepted, KRI off' : 'unresolved') + '</span>\n' +
      'Site Risk Score             <span class="w">suppressed — 1 of 12 KRIs mapped</span>\n' +
      '</pre>' +
      '<div class="why"><p><b>And this is where the direction pays its bill.</b> The vocabulary you ' +
      'never had to learn is now sitting in a file you own. The log is what keeps your own words next ' +
      'to it — but the next person to edit <code>LB.yaml</code> is reading <code>lbstnrhi</code>, ' +
      'not &ldquo;the top of the normal range&rdquo;.</p></div>';
    }}
  ];

  /* Histogram of the real ALT distribution: 3,575 results over 765
   * participants from demo-301/input/Raw_LB.csv, binned 0–100 U/L in steps of
   * 5. Counts are measured, not shaped — including the 320 results above
   * 100 U/L that fall off the right edge, which the caption states rather
   * than the chart hiding. Reference range 7–41 U/L is the study's own. */
  function hist() {
    var bins = [0, 5, 174, 680, 845, 579, 311, 197, 106, 73, 54, 41, 25, 33, 31, 31, 20, 19, 17, 14];
    var w = 640, h = 190, pad = 28, max = Math.max.apply(null, bins);
    var bw = (w - pad * 2) / bins.length;   // each bin is 5 U/L
    var xOf = function (v) { return pad + (v / 5) * bw; };
    var bars = bins.map(function (v, i) {
      var bh = (v / max) * (h - pad - 18);
      var x = pad + i * bw, y = h - pad - bh;
      var binLo = i * 5, binHi = binLo + 5;
      var inRange = binHi > 7 && binLo < 41;
      return '<rect x="' + (x + 1).toFixed(1) + '" y="' + y.toFixed(1) + '" width="' + (bw - 2).toFixed(1) +
        '" height="' + bh.toFixed(1) + '" fill="' + (inRange ? '#c2410c' : '#e6a97e') + '" rx="1.5"></rect>';
    }).join('');
    var lo = xOf(7), hi = xOf(41);
    return '<svg viewBox="0 0 ' + w + ' ' + h + '" role="img" ' +
      'aria-label="Histogram of 3,575 alanine aminotransferase results binned every 5 units per litre. The distribution peaks between 15 and 25, inside the 7 to 41 reference range, and trails off to the right; 320 further results above 100 are not shown.">' +
      '<rect x="' + lo.toFixed(1) + '" y="10" width="' + (hi - lo).toFixed(1) + '" height="' + (h - pad - 10) +
      '" fill="#f5efe7"></rect>' + bars +
      '<line x1="' + pad + '" y1="' + (h - pad) + '" x2="' + (w - pad) + '" y2="' + (h - pad) +
      '" stroke="#a3958a" stroke-width="1"></line>' +
      '<line x1="' + lo.toFixed(1) + '" y1="10" x2="' + lo.toFixed(1) + '" y2="' + (h - pad) + '" stroke="#166534" stroke-width="1" stroke-dasharray="3 3"></line>' +
      '<line x1="' + hi.toFixed(1) + '" y1="10" x2="' + hi.toFixed(1) + '" y2="' + (h - pad) + '" stroke="#166534" stroke-width="1" stroke-dasharray="3 3"></line>' +
      '<text x="' + (lo + 3).toFixed(1) + '" y="20" font-size="10" fill="#166534" font-family="ui-monospace,monospace">7</text>' +
      '<text x="' + (hi + 3).toFixed(1) + '" y="20" font-size="10" fill="#166534" font-family="ui-monospace,monospace">41 U/L</text>' +
      '<text x="' + pad + '" y="' + (h - 9) + '" font-size="10" fill="#6b5d52" font-family="ui-monospace,monospace">0</text>' +
      '<text x="' + xOf(50).toFixed(1) + '" y="' + (h - 9) + '" font-size="10" fill="#6b5d52" font-family="ui-monospace,monospace">50</text>' +
      '<text x="' + (w - pad - 74) + '" y="' + (h - 9) + '" font-size="10" fill="#6b5d52" font-family="ui-monospace,monospace">100 U/L</text>' +
      '</svg>';
  }

  // ---- wiring ----------------------------------------------------------
  var main = document.getElementById('main');
  var rail = document.getElementById('rail');
  var pos = document.getElementById('pos');
  var railNote = document.getElementById('railNote');
  var prevB = document.getElementById('prev');
  var nextB = document.getElementById('next');

  function drawRail() {
    rail.innerHTML = STEPS.map(function (s, i) {
      return '<li' + (i === S.step ? ' aria-current="step"' : '') + (i < S.step ? ' class="done"' : '') + '>' +
        '<button type="button" data-step="' + i + '"><span class="n">' + (i + 1) + '</span>' +
        '<span class="t">' + esc(s.rail) + '</span></button></li>';
    }).join('');
  }

  function draw() {
    main.innerHTML = STEPS[S.step].render();
    drawRail();
    railNote.textContent = STEPS[S.step].note;
    pos.textContent = 'Step ' + (S.step + 1) + ' of ' + STEPS.length;
    prevB.disabled = S.step === 0;
    nextB.disabled = S.step === STEPS.length - 1;
    nextB.textContent = S.step === STEPS.length - 1 ? 'Done' : 'Next →';
  }

  function apply(pick) {
    var p = pick.split(':');
    if (p[0] === 'kinds') { S.kinds[p[1]] = p[2]; }
    else if (p[0] === 'join') { S.joinA = p[1]; S.joinB = p[2]; }
    else if (p[0] === 'triple') {
      var t = TRIPLES[+p[1]];
      S.value = t.value; S.lo = t.lo; S.hi = t.hi;
      if (t.measure) S.measure = t.measure;
    } else if (p[0] === 'grade') { S.grade = p[1]; }
    draw();
  }

  document.addEventListener('click', function (e) {
    var stepBtn = e.target.closest('[data-step]');
    if (stepBtn) { S.step = +stepBtn.getAttribute('data-step'); draw(); return; }
    var pickEl = e.target.closest('[data-pick]');
    if (pickEl && main.contains(pickEl)) { apply(pickEl.getAttribute('data-pick')); }
  });

  document.addEventListener('change', function (e) {
    var sel = e.target.closest('[data-hep]');
    if (sel) { S.hep[sel.getAttribute('data-hep')] = sel.value; }
  });

  prevB.addEventListener('click', function () { if (S.step > 0) { S.step--; draw(); } });
  nextB.addEventListener('click', function () { if (S.step < STEPS.length - 1) { S.step++; draw(); } });

  draw();
})();
