import json, html, collections, os

import sys
BASE = os.path.dirname(os.path.abspath(__file__)) if '__file__' in dir() else '.'
exec(open(f'{BASE}/classification.py').read())
rows = json.load(open(f'{BASE}/corpus.json'))
by = {f"{r['repo']}#{r['n']}": r for r in rows}
e = lambda s: html.escape(str(s), quote=True)

QW = {
 'QW1': dict(
   title='Make a filter a filter everywhere: <code>start</code>, <code>all</code>, <code>multiple</code>',
   n_issues=6,
   what='Six trackers carry the same request, filed by the same maintainer in 2021 and never done: let a filter declare its opening value, whether it offers an “All” option, and whether it takes more than one value.',
   quick='Two of the twelve modules already do it. <code>outlier-explorer</code> normalises <code>{ value_col, label, start }</code> and suppresses the “All” option when a start is set (<code>src/outlier-explorer/configure.js:43</code>); <code>ae-explorer</code> normalises the same shape plus a filter <em>type</em> (<code>src/ae-explorer/configure.js:104-113</code>). The other ten declare <code>{ value_col, label }</code> and stop there. The work is lifting one normaliser into the shared shell and pointing the ten at it — the design question was settled twice already.',
   quote=('samussiah', 'RhoInc/ae-timelines#83', '<code>webcharts</code> supports <code>start</code>/<code>all</code>/<code>multiple</code> but the filters in most of the safety explorer modules are hard coded with only the <code>value_col</code> and <code>label</code> properties - even if other properties are specified.'),
   note='Still literally true of the port, five years on. The one warning in the thread also survives: do not test <code>all</code> for truthiness, because <code>false</code> is a valid value.'),
 'QW2': dict(
   title='One <code>measures</code> setting — which measures appear, and in what order',
   n_issues=9,
   what='Two requests, nine issues, one code point. Four trackers ask to subset the measure dropdown (2016); five ask to order it by something other than the alphabet (2021).',
   quick='Five modules build their measure list from the same single line — <code>unique(this.cleanData.map(row =&gt; measureLabel(row, this.settings))).sort()</code> at <code>histogram.js:295</code>, <code>outlier-explorer.js:288</code>, <code>results-over-time.js:193</code>, <code>shift-plot.js:256</code> and <code>delta-delta/structureData.js:46</code>. An ordered whitelist replaces that <code>.sort()</code> and answers both requests at once. The pattern is already shipping: <code>qt-explorer</code> has <code>measures: [&#39;QTcF&#39;, &#39;QTcB&#39;, &#39;Heart Rate&#39;]</code>, an ordered list of exactly the options to offer.',
   quote=('samussiah', 'RhoInc/safety-delta-delta#38', 'Need to apply measure order in small multiples.'),
   note='The 2016 thread nearly closed itself for want of a second request: “Should probably close - will mark for review”, wrote brittsikora on <a href="https://github.com/RhoInc/safety-results-over-time/issues/5">safety-results-over-time#5</a> in 2016. It got eight more.'),
 'QW3': dict(
   title='A Reset control on every module',
   n_issues=9,
   what='Nine issues across seven trackers, most of them filed on one day in December 2017. The lab modules ship “Reset Limits”, which resets an axis and nothing else.',
   quick='<code>hep-waterfall</code> already does the whole thing in four lines — <code>this.state = this.seedState(); this.buildControls(); this.render();</code> (<code>src/hep-waterfall.js:586</code>) — and <code>hep-explorer</code> has a longer hand-written version (<code>resetChart()</code>, <code>src/hep-explorer.js:729</code>). Every other module builds its state in one object literal in its constructor (<code>histogram.js:95</code>, <code>shift-plot.js:79</code>, <code>qt-explorer.js:130</code> …), so extracting a <code>seedState()</code> is mechanical. Honest scope: this is per-module wiring with a proven shape, not a shared drop-in.',
   quote=None, note=''),
 'QW4': dict(
   title='ae-explorer draws no count column at all for a single-arm study',
   n_issues=1,
   what='A defect the port inherited. With one level in the group column and <code>group_cols: false, total_col: true</code>, the table renders neither group columns nor a Total column — exactly what RhoInc/aeexplorer#148 reported in 2020.',
   quick='Executed against the port rather than reasoned about: <code>columnPlan(1, {group_cols:false, total_col:true, diff_col:true})</code> returns <code>{groupCols:false, totalCol:false, diffCol:false}</code>. The cause is one clause — <code>totalCol = settings.total_col &amp;&amp; groupCount &gt; 1</code> (<code>src/ae-explorer/configure.js:186</code>) — and the guard next to it already knows this state is illegal, throwing when both columns are configured off. It just never fires when the suppression is automatic.',
   quote=('samussiah on behalf of @nandriychuk', 'RhoInc/aeexplorer#148', 'The total column is not rendered, resulting in a table with only the <em>Category</em> and <em>AE Rate by group</em> columns.'),
   note='This is the one item in the sweep that is a live defect in shipped code rather than a missing feature.'),
 'QW5': dict(
   title='Say which kind of empty an empty AE table is',
   n_issues=2,
   what='“No AEs found” currently covers three different situations: filters that exclude every event, filters that exclude every participant, and a study with no adverse events recorded yet.',
   quick='One constant at <code>src/ae-explorer.js:40</code>, and the number the second message needs is already computed — <code>totalN()</code> supplies the participant denominator at <code>ae-explorer.js:654</code>.',
   quote=('pburnsdata', 'RhoInc/aeexplorer#153', 'Currently can&#39;t distinguish between the absence of AES and the absence of subjects.'),
   note=''),
 'QW6': dict(
   title='A standing caution on qt-explorer',
   n_issues=2,
   what='The QT reviewers asked for two things a year apart: a disclaimer that the tool is exploratory and not validated, and a warning about unnecessary unblinding when treatment-arm data is loaded.',
   quick='<code>hep-explorer</code> ships the mechanism: <code>CLINICAL_CAUTION</code> (<code>src/hep-explorer/getPlugins.js:102</code>) rendered once into the module shell and shown in every view (<code>src/hep-explorer.js:312-317</code>), specified as HEP-CAUTION-001 and deliberately not clearable. qt-explorer has only a narrow ΔΔ approximation note on one view (<code>src/qt-explorer.js:713</code>). Adding the standing caution is an import and an append; the unblinding warning is a second string in the same slot, and qt-explorer already colours every view by arm.',
   quote=None, note=''),
 'QW7': dict(
   title='Unscheduled visits in hep-explorer',
   n_issues=1,
   what='hep-explorer has no notion of an unscheduled visit. The 2019 issue said the fix was to copy what the other renderers do.',
   quick='It now is a copy. <code>results-over-time</code> ships an “Unscheduled visits” toggle, an <code>unscheduled_visits</code> pattern setting that accepts the <code>/source/flags</code> form, and <code>isUnscheduledVisit()</code> in <code>src/results-over-time/structureData.js</code>. In 2019 that meant reading a sibling repository; today it is an import inside one library.',
   quote=('jwildfire', 'SafetyGraphics/hep-explorer#229', 'We can probably use the same approach and settings established in other renderers.'),
   note=''),
 'QW8': dict(
   title='A log / linear toggle on shift-plot',
   n_issues=2,
   what='The oldest request in the whole sweep — April 2016 — and its follow-up: auto-scaling misleads people, so let them switch the axes to log, and let them set the ranges.',
   quick='Both halves exist elsewhere in the library. <code>results-over-time</code> has a Scale control switching its y-axis between linear and log (<code>results-over-time.js:536</code>); <code>hep-explorer</code> has an Axis Type control plus a log-base choice (HEP-CTRL-006 / HEP-CTRL-017). The range half is a shared module — <code>src/axis-limits.js</code>, imported by histogram, outlier-explorer and results-over-time, and by shift-plot not at all. shift-plot builds plain linear scales in <code>src/shift-plot/getScales.js</code>.',
   quote=('brittsikora', 'RhoInc/safety-shift-plot#3', 'Auto-scaling was throwing people off, so add ability to set limits. Or toggle between log axis and linear.'),
   note='Both axes share one domain in the port (SSP: “the identity line spans a domain shared by both axes”), so the toggle applies to the pair, not to each axis separately.'),
 'QW9': dict(
   title='Print the QT confidence intervals, don’t only draw them',
   n_issues=1,
   what='The central-tendency plot draws a confidence band. The reviewers asked for the numbers underneath it.',
   quick='The numbers are already computed — each arm’s mean change with a two-sided 90% CI at every visit (QT-CT-002) — and the module already renders a by-arm table, because the categorical view is one (QT-CAT-001, “hides the chart and tabulates by-arm exceedance”). This is tabulating values that exist with a renderer that exists.',
   quote=None, note=''),
}
QW_ORDER = ['QW1','QW2','QW3','QW4','QW5','QW6','QW7','QW8','QW9']

TRACKERS = [
 ('RhoInc/ae-timelines','ae-timelines'),('RhoInc/aeexplorer','ae-explorer'),
 ('RhoInc/paneled-outlier-explorer','paneled-outlier-explorer (planned)'),
 ('RhoInc/safety-delta-delta','delta-delta'),('RhoInc/safety-histogram','histogram'),
 ('RhoInc/safety-outlier-explorer','outlier-explorer'),
 ('RhoInc/safety-results-over-time','results-over-time'),
 ('RhoInc/safety-shift-plot','shift-plot'),('RhoInc/web-codebook','web-codebook (planned)'),
 ('SafetyGraphics/hep-explorer','hep-explorer'),('SafetyGraphics/nepExplorer','nep-explorer'),
 ('SafetyGraphics/qtexplorer','qt-explorer'),
]

# Raw HTML is allowed in why/ev/target so citations can carry <code> and links. A stray
# unescaped tag is invisible in the file and lethal in the browser: an unescaped <title>
# in one item switched the tokenizer to RAWTEXT and swallowed 110 of the 282 items plus
# a whole section, on a page that deployed green and looked complete. Fail the build.
import re as _re
_ALLOWED = {'code','/code','em','/em','strong','/strong','a','/a'}
_bad = [(k, f, m.group(0)) for k, v in C.items() for f in ('why','ev','target')
        for m in _re.finditer(r'<\s*([^\s>]+)', v[f] or '')
        if m.group(1).lower().rstrip('>') not in _ALLOWED]
if _bad:
    raise SystemExit('unescaped markup in item fields (would truncate the page): ' + repr(_bad))

counts = collections.Counter(v['klass'] for v in C.values())
conf = collections.Counter(v['conf'] for v in C.values())
titleonly = sum(1 for k in C if not (by[k].get('body') or '').strip() and not by[k]['comment_bodies'])
qw_tagged = sum(1 for v in C.values() if v['qw'])

def item_html(k, v):
    r = by[k]
    cls = v['klass']
    qwbadge = f' <span class="qw">{v["qw"]}</span>' if v['qw'] else ''
    ev = f'<p class="ev">{v["ev"]}</p>' if v['ev'] else ''
    confb = '' if v['conf']=='code' else ' <span class="judged" title="Judged from the issue and the port\'s architecture; not checked against a specific line of code.">judged</span>'
    return (f'<article class="it {cls}" data-t="{e(r["repo"])}" data-k="{cls}">'
            f'<h4><a href="{e(r["url"])}">{e(k)}</a> — {e(r["title"].strip())}{qwbadge}{confb}</h4>'
            f'<p class="meta">{e(r["user"])} · {e(r["created"])} · target: {v["target"]}</p>'
            f'<p class="why">{v["why"]}</p>{ev}</article>')

def section(klass, open_default=True):
    items = [(k,v) for k,v in C.items() if v['klass']==klass]
    out=[]
    for repo, target in TRACKERS:
        sub = [(k,v) for k,v in items if k.startswith(repo+'#')]
        if not sub: continue
        sub.sort(key=lambda kv: int(kv[0].split('#')[1]))
        op = ' open' if open_default else ''
        out.append(f'<details class="grp"{op}><summary><span class="repo">{e(repo)}</span>'
                   f'<span class="cnt">{len(sub)} of {sum(1 for k in C if k.startswith(repo + chr(35)))}</span>'
                   f'<span class="tgt">{target}</span></summary>')
        out += [item_html(k,v) for k,v in sub]
        out.append('</details>')
    return '\n'.join(out)

def qw_html():
    out=[]
    for i,q in enumerate(QW_ORDER,1):
        d = QW[q]
        issues = sorted([k for k,v in C.items() if v['qw']==q], key=lambda k:(k.split('#')[0], int(k.split('#')[1])))
        links = ' · '.join(f'<a href="{e(by[k]["url"])}">{e(k.split("/")[-1])}</a>' for k in issues)
        quote=''
        if d['quote']:
            who, where, text = d['quote']
            quote = (f'<blockquote>{text}<footer>— {e(who)}, <a href="{e(by[where]["url"])}">{e(where)}</a>, '
                     f'{e(by[where]["created"])}</footer></blockquote>')
        note = f'<p class="note">{d["note"]}</p>' if d['note'] else ''
        out.append(f'''<article class="win">
<h3><span class="rank">{i}</span>{d['title']}</h3>
<p class="clears">Clears {d['n_issues']} legacy issue{'s' if d['n_issues']!=1 else ''}: {links}</p>
<p>{d['what']}</p>
<p class="whyquick"><span class="lbl">Why it is quick.</span> {d['quick']}</p>
{quote}{note}</article>''')
    return '\n'.join(out)

tracker_rows = '\n'.join(
  f'<tr><td><a href="https://github.com/{e(repo)}/issues">{e(repo)}</a></td><td>{e(target)}</td>'
  f'<td>{sum(1 for k in C if k.startswith(repo+"#"))}</td>'
  f'<td>{sum(1 for k,v in C.items() if k.startswith(repo+"#") and v["klass"]=="migrate")}</td>'
  f'<td>{sum(1 for k,v in C.items() if k.startswith(repo+"#") and v["klass"]=="covered")}</td>'
  f'<td>{sum(1 for k,v in C.items() if k.startswith(repo+"#") and v["klass"]=="obsolete")}</td></tr>'
  for repo, target in TRACKERS)

DOC = open(f'{BASE}/template.html').read()
out = (DOC
  .replace('{{QUICKWINS}}', qw_html())
  .replace('{{MIGRATE}}', section('migrate', True))
  .replace('{{COVERED}}', section('covered', False))
  .replace('{{OBSOLETE}}', section('obsolete', False))
  .replace('{{TRACKERROWS}}', tracker_rows)
  .replace('{{N_TOTAL}}', str(len(C)))
  .replace('{{N_MIGRATE}}', str(counts['migrate']))
  .replace('{{N_COVERED}}', str(counts['covered']))
  .replace('{{N_OBSOLETE}}', str(counts['obsolete']))
  .replace('{{N_CODE}}', str(conf['code']))
  .replace('{{N_JUDGED}}', str(conf['text']))
  .replace('{{N_TITLEONLY}}', str(titleonly))
  .replace('{{N_QWCLEARS}}', str(qw_tagged)))
open(os.environ['OUT'],'w').write(out)
print('wrote', os.environ['OUT'], len(out), 'bytes')
