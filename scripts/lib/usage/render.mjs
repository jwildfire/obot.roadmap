// The roadmap page's Cost section — per-agent token spend and dollar cost over
// time, one stacked column per period, one segment per agent.
//
// Data source and staleness: site/usage/usage.json is a COMMITTED artifact built
// from @jwildfire's local Claude Code transcript store by
// scripts/build_usage_data.py. The site build cannot regenerate it (the
// transcripts only exist on that machine), so the section renders whatever was
// last committed and says which day the data runs through. Refresh with:
//
//     python3 scripts/build_usage_data.py && git commit site/usage/usage.json
//
// The chart is built client-side from data inlined into the page rather than
// fetched: it is ~33 kB, and inlining keeps the section working with no network
// round trip and no CORS/CSP surface.
//
// Color: segments are colored by the agent's ROLE (five slots of the validated
// categorical palette), not per agent — there are 100+ agents, which no
// categorical palette can carry. One segment is still exactly one agent; the
// legend names the roles and the table names every agent.
import { esc } from '../gh.mjs';
import { HUB } from '../repos.mjs';

// Fixed slot order from the validated categorical palette. Adjacency in a stack
// follows this order, which is the ordering the palette was validated on — do
// not reorder to taste. Light steps sit on the site's paper surface; the dark
// steps are declared in styles.css for a future site theme.
const ROLE_ORDER = ['lead', 'sibling', 'ultracode', 'auto', 'interactive'];

const ROLE_BLURB = {
  lead: 'The interactive session driving the work (😺🤖).',
  sibling: 'Background agents the lead spawned to work in parallel (👯🤖).',
  ultracode: 'Multi-agent ultracode jobs — a workflow fanning out over many agents (⚡️🤖).',
  auto: 'Fully autonomous sessions that picked their own increment (🦾🤖).',
  interactive: 'Sessions with no identity tag — ordinary interactive work, and everything before the tagging convention existed.',
};

const METRICS = [
  { key: 'cost', label: '$', blurb: 'Dollar cost at list API rates.' },
  { key: 'tokens', label: 'all tokens', blurb: 'Every billed token, cache reads included — cache reads dominate this total.' },
  { key: 'work', label: 'in + out', blurb: 'Input and output tokens only, excluding all cache traffic.' },
];

const BUCKETS = [
  { key: 'day', label: 'day' },
  { key: 'week', label: 'week' },
  { key: 'month', label: 'month' },
];

const compact = (n) => {
  const a = Math.abs(n);
  if (a >= 1e9) return `${(n / 1e9).toFixed(a >= 1e10 ? 0 : 2)}B`;
  if (a >= 1e6) return `${(n / 1e6).toFixed(a >= 1e7 ? 0 : 1)}M`;
  if (a >= 1e3) return `${(n / 1e3).toFixed(a >= 1e4 ? 0 : 1)}K`;
  return String(Math.round(n));
};
const money = (n) => `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const num = (n) => n.toLocaleString('en-US');

// A JSON literal inside <script> must not be able to close the tag or open a
// comment; escaping '<' covers both and keeps the value valid JSON.
const inlineJson = (value) => JSON.stringify(value).replace(/</g, '\\u003c');

function tile(label, value, sub) {
  return `  <div class="uz-tile">
    <span class="uz-tile-label">${esc(label)}</span>
    <strong class="uz-tile-value">${esc(value)}</strong>
    <span class="uz-tile-sub">${sub}</span>
  </div>`;
}

// The per-agent table is not a nicety: three of the five light-mode series
// colors sit below 3:1 against the page surface, and the palette's relief rule
// makes a table view mandatory when that is true.
function agentTable(cells) {
  const byAgent = new Map();
  for (const c of cells) {
    let a = byAgent.get(c.agent);
    if (!a) {
      a = { agent: c.agent, role: c.role, days: 0, calls: 0, subCalls: 0,
            input: 0, output: 0, cacheRead: 0, cacheWrite: 0, cost: 0 };
      byAgent.set(c.agent, a);
    }
    a.days += 1;
    for (const k of ['calls', 'subCalls', 'input', 'output', 'cacheRead', 'cacheWrite', 'cost']) a[k] += c[k];
  }
  const rows = [...byAgent.values()].sort((x, y) => y.cost - x.cost).map((a) => `  <tr>
    <td><span class="uz-swatch" data-role="${a.role}" aria-hidden="true"></span>${esc(a.agent)}</td>
    <td class="uz-num">${a.days}</td>
    <td class="uz-num">${num(a.calls)}</td>
    <td class="uz-num">${num(a.input + a.output)}</td>
    <td class="uz-num">${compact(a.cacheRead)}</td>
    <td class="uz-num">${compact(a.cacheWrite)}</td>
    <td class="uz-num">${money(a.cost)}</td>
  </tr>`).join('\n');

  // Seven numeric columns: the scroll container is what keeps them off the page
  // at phone widths, where `html { overflow-x: clip }` would cut them instead.
  return `<div class="rm-scroll">
<table class="rm-table uz-table">
  <tr><th>Agent</th><th class="uz-num">Days</th><th class="uz-num">Calls</th><th class="uz-num">In + out</th>
      <th class="uz-num">Cache read</th><th class="uz-num">Cache write</th><th class="uz-num">Cost</th></tr>
${rows}
</table>
</div>`;
}

function modelTable(models, mult) {
  const rows = models.filter((m) => m.calls).map((m) => `  <tr>
    <td><code>${esc(m.model)}</code></td>
    <td class="uz-num">${m.rateIn === null ? '—' : `$${m.rateIn.toFixed(2)} / $${m.rateOut.toFixed(2)}`}</td>
    <td class="uz-num">${num(m.calls)}</td>
    <td class="uz-num">${num(m.input + m.output)}</td>
    <td class="uz-num">${compact(m.cacheRead)}</td>
    <td class="uz-num">${compact(m.cacheWrite)}</td>
    <td class="uz-num">${money(m.cost)}</td>
  </tr>`).join('\n');
  return `<p class="uz-fine">Rates are per million tokens, input / output. Cache traffic is priced off the
input rate: reads &times;${mult.read}, writes &times;${mult.write5m} (5-minute TTL) or &times;${mult.write1h} (1-hour TTL).
<code>&lt;synthetic&gt;</code> messages are generated locally by the CLI — no request, no charge.</p>
<div class="rm-scroll">
<table class="rm-table uz-table">
  <tr><th>Model</th><th class="uz-num">Rate in / out</th><th class="uz-num">Calls</th><th class="uz-num">In + out</th>
      <th class="uz-num">Cache read</th><th class="uz-num">Cache write</th><th class="uz-num">Cost</th></tr>
${rows}
</table>
</div>`;
}

export function usageSection(data) {
  if (!data || !data.cells?.length) {
    return `<section class="rm-sec" id="sec-usage">
<h2>Cost</h2>
<p class="rm-notice">No usage data committed yet — run <code>python3 scripts/build_usage_data.py</code> locally.</p>
</section>`;
  }

  const t = data.totals;
  const billed = t.input + t.output + t.cacheRead + t.cacheWrite;
  const cachePct = billed ? Math.round((t.cacheRead / billed) * 100) : 0;
  const perDay = t.activeDays ? t.cost / t.activeDays : 0;

  const metricBtns = METRICS.map((m, i) =>
    `<button class="uz-btn${i === 0 ? ' current' : ''}" data-metric="${m.key}" aria-pressed="${i === 0}"` +
    ` title="${esc(m.blurb)}">${esc(m.label)}</button>`).join('');
  const bucketBtns = BUCKETS.map((b, i) =>
    `<button class="uz-btn${i === 0 ? ' current' : ''}" data-bucket="${b.key}" aria-pressed="${i === 0}">${esc(b.label)}</button>`).join('');
  const legend = ROLE_ORDER.map((r) =>
    `<span class="uz-legend-item"><span class="uz-swatch" data-role="${r}" aria-hidden="true"></span>` +
    `<span title="${esc(ROLE_BLURB[r])}">${esc(data.roleLabels[r] ?? r)}</span></span>`).join('');

  const tiles = [
    tile('Total cost', money(t.cost), `${money(perDay)} per active day`),
    tile('Billed tokens', compact(billed), `${cachePct}% cache reads`),
    tile('API calls', num(t.calls), `${num(t.subCalls)} from sub-agents`),
    tile('Agents', num(t.agents), `over ${t.activeDays} active days`),
  ].join('\n');

  return `<section class="rm-sec" id="sec-usage">
<h2>Cost <span class="uz-total">${esc(money(t.cost))}</span></h2>
<p class="rm-note">What this project has cost to build, at list API rates — one column per period,
one segment per agent, colored by the agent's role. Read from this machine's Claude Code
transcripts by <a href="https://github.com/${HUB}/blob/main/scripts/build_usage_data.py"><code>build_usage_data.py</code></a>;
data runs through <strong>${esc(t.last ?? '—')}</strong>.</p>

<div class="uz-tiles">
${tiles}
</div>

<div class="uz-controls">
  <span class="uz-group" role="group" aria-label="Measure">${metricBtns}</span>
  <span class="uz-group" role="group" aria-label="Bucket by">${bucketBtns}</span>
  <span class="uz-legend">${legend}</span>
</div>
<p class="uz-caption" id="uz-caption"></p>

<div class="uz-chart-wrap">
  <svg class="uz-chart" id="uz-chart" role="img" aria-labelledby="uz-chart-desc"></svg>
  <p class="uz-sr" id="uz-chart-desc"></p>
  <div class="uz-tip" id="uz-tip" role="status" aria-live="polite" hidden></div>
</div>

<details class="rm-fold uz-fold">
<summary>Every agent (${t.agents})</summary>
${agentTable(data.cells)}
</details>

<details class="rm-fold uz-fold">
<summary>Models and rates</summary>
${modelTable(data.models, data.cacheMultipliers)}
</details>

<p class="uz-fine">One API call is counted once — a response is written to the transcript several times
(one line per content block, and streaming snapshots inside sub-agent transcripts), so calls are
deduped by request id keeping the final record. Sub-agent usage is billed to the agent that spawned it.
Costs are list-price arithmetic over recorded token counts, not a copy of an invoice.
Refresh the data by re-running the generator locally and committing
<a href="https://github.com/${HUB}/blob/main/site/usage/usage.json"><code>site/usage/usage.json</code></a>.</p>

<script id="uz-data" type="application/json">${inlineJson({
    cells: data.cells,
    roleLabels: data.roleLabels,
    roleOrder: ROLE_ORDER,
    metrics: METRICS.map((m) => ({ key: m.key, label: m.label })),
  })}</script>
<script>
(function () {
  var node = document.getElementById('uz-data');
  if (!node) return;
  var D = JSON.parse(node.textContent);
  var svg = document.getElementById('uz-chart');
  var tip = document.getElementById('uz-tip');
  var caption = document.getElementById('uz-caption');
  var desc = document.getElementById('uz-chart-desc');
  var wrap = svg.parentNode;
  var NS = 'http://www.w3.org/2000/svg';

  var metric = 'cost';
  var bucket = 'day';

  // ---- value + period helpers
  function valueOf(c) {
    if (metric === 'cost') return c.cost;
    if (metric === 'work') return c.input + c.output;
    return c.input + c.output + c.cacheRead + c.cacheWrite;
  }
  function fmt(v) {
    if (metric === 'cost') {
      return '$' + v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    return v.toLocaleString('en-US');
  }
  var MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  // Parse as UTC — the day strings are calendar dates, and local parsing would
  // shift them a day in western timezones.
  function parse(day) {
    var p = day.split('-');
    return new Date(Date.UTC(+p[0], +p[1] - 1, +p[2]));
  }
  function periodOf(day) {
    var d = parse(day);
    if (bucket === 'month') return day.slice(0, 7);
    if (bucket === 'week') {
      // Monday-start week; getUTCDay() is 0 for Sunday.
      var dow = (d.getUTCDay() + 6) % 7;
      d.setUTCDate(d.getUTCDate() - dow);
      return d.toISOString().slice(0, 10);
    }
    return day;
  }
  function labelOf(period) {
    if (bucket === 'month') {
      var m = period.split('-');
      return MONTHS[+m[1] - 1] + ' ' + m[0];
    }
    var d = parse(period);
    var base = MONTHS[d.getUTCMonth()] + ' ' + d.getUTCDate();
    return bucket === 'week' ? 'wk ' + base : base;
  }
  function tickLabel(v) {
    if (metric === 'cost') return '$' + (v >= 1000 ? (v / 1000).toFixed(v >= 10000 ? 0 : 1) + 'K' : Math.round(v));
    // Keep a decimal below each 10x step, or neighbouring columns round to the
    // same label — 2.4M and 1.96M must not both read "2M".
    var a = Math.abs(v);
    if (a >= 1e9) return (v / 1e9).toFixed(a >= 1e10 ? 0 : 2) + 'B';
    if (a >= 1e6) return (v / 1e6).toFixed(a >= 1e7 ? 0 : 1) + 'M';
    if (a >= 1e3) return (v / 1e3).toFixed(a >= 1e4 ? 0 : 1) + 'K';
    return String(Math.round(v));
  }
  // Pick a clean tick STEP and derive the axis top from it. Rounding the top
  // first is the obvious version and is wrong: a nice-looking max still divides
  // into ugly ticks (20M under a 25M top gives 6.3M / 13M / 19M).
  function niceStep(v, ticks) {
    if (v <= 0) return 1 / ticks;
    var raw = v / ticks;
    var mag = Math.pow(10, Math.floor(Math.log10(raw)));
    var steps = [1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10];
    for (var i = 0; i < steps.length; i++) {
      if (steps[i] * mag >= raw) return steps[i] * mag;
    }
    return 10 * mag;
  }

  // ---- aggregate to (period, agent)
  function build() {
    var periods = new Map();
    D.cells.forEach(function (c) {
      var p = periodOf(c.day);
      if (!periods.has(p)) periods.set(p, new Map());
      var agents = periods.get(p);
      var a = agents.get(c.agent);
      if (!a) {
        a = { agent: c.agent, role: c.role, value: 0, calls: 0, subCalls: 0, days: 0 };
        agents.set(c.agent, a);
      }
      a.value += valueOf(c);
      a.calls += c.calls;
      a.subCalls += c.subCalls;
      a.days += 1;
    });
    var order = D.roleOrder;
    return Array.from(periods.keys()).sort().map(function (p) {
      // Segment order = role slot order, then value descending inside a role.
      // Fixed order means stack adjacency is the adjacency the palette was
      // validated on, and a segment never changes color between views.
      var segs = Array.from(periods.get(p).values()).sort(function (x, y) {
        var d = order.indexOf(x.role) - order.indexOf(y.role);
        return d !== 0 ? d : y.value - x.value;
      });
      var total = segs.reduce(function (s, x) { return s + x.value; }, 0);
      return { period: p, segs: segs, total: total };
    });
  }

  // ---- render
  var PAD = { top: 14, right: 12, bottom: 46, left: 52 };
  var H = 260;
  var GAP = 2;          // surface gap between stacked segments
  var BAR_MAX = 24;     // mark spec: columns never thicker than this

  function render() {
    var cols = build();
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    if (!cols.length) return;

    // Bands stretch to fill the usual section width, but the bar itself stays
    // capped at BAR_MAX — the leftover band is deliberate air, not a fatter mark.
    var band = Math.max(30, Math.min(80, 900 / cols.length));
    var bar = Math.min(BAR_MAX, band - 8);
    // A floor on the plot width so the month view (one column) still draws an
    // axis rather than 80px of stubby gridlines.
    var plotW = Math.max(band * cols.length, 240);
    var W = PAD.left + plotW + PAD.right;
    var plotH = H - PAD.top - PAD.bottom;
    var TICKS = 4;
    var step = niceStep(Math.max.apply(null, cols.map(function (c) { return c.total; })), TICKS);
    var max = step * TICKS;
    var y = function (v) { return PAD.top + plotH - (v / max) * plotH; };

    svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
    svg.setAttribute('width', W);
    svg.setAttribute('height', H);

    function el(name, attrs) {
      var n = document.createElementNS(NS, name);
      for (var k in attrs) n.setAttribute(k, attrs[k]);
      return n;
    }

    // gridlines + y ticks
    for (var i = 0; i <= TICKS; i++) {
      var v = step * i;
      var gy = y(v);
      svg.appendChild(el('line', {
        x1: PAD.left, x2: PAD.left + plotW, y1: gy, y2: gy,
        class: i === 0 ? 'uz-axis' : 'uz-grid',
      }));
      var lab = el('text', { x: PAD.left - 8, y: gy + 3.5, class: 'uz-tick', 'text-anchor': 'end' });
      lab.textContent = tickLabel(v);
      svg.appendChild(lab);
    }

    cols.forEach(function (col, ci) {
      var cx = PAD.left + ci * band + band / 2;
      var top = y(col.total);

      // x label, rotated so labels never collide however many periods there are
      var xl = el('text', {
        x: cx, y: PAD.top + plotH + 12, class: 'uz-tick',
        'text-anchor': 'end', transform: 'rotate(-45 ' + cx + ' ' + (PAD.top + plotH + 12) + ')',
      });
      xl.textContent = labelOf(col.period);
      svg.appendChild(xl);

      if (col.total <= 0) return;

      // Stack from the baseline up. The gap is taken out of each segment's own
      // height so the column's total height still equals the real total.
      var cursor = PAD.top + plotH;
      col.segs.forEach(function (s, si) {
        if (s.value <= 0) return;
        var full = (s.value / max) * plotH;
        var h = Math.max(1, full - (si < col.segs.length - 1 ? GAP : 0));
        var yTop = cursor - full;
        var isTop = si === col.segs.length - 1;
        var g = el('g', { class: 'uz-seg' });
        g.appendChild(el('rect', {
          x: cx - bar / 2, y: yTop, width: bar, height: h,
          rx: isTop ? 4 : 0, ry: isTop ? 4 : 0,
          'data-role': s.role, class: 'uz-bar',
        }));
        if (isTop && h > 5) {
          // Square the rounded corner off at the segment's own base so only the
          // column's top end is rounded, never an interior joint.
          g.appendChild(el('rect', {
            x: cx - bar / 2, y: yTop + h - 4, width: bar, height: 4,
            'data-role': s.role, class: 'uz-bar',
          }));
        }
        // A transparent hit target spanning the whole band, carrying the
        // tabindex and the label. It exists for two reasons: the pointer target
        // should be bigger than the painted mark, and Chrome ignores tabindex on
        // an SVG <g> — a container is not focusable, so putting it on the group
        // silently kept every segment out of the tab order. A <rect> is.
        var pct = col.total ? Math.round((s.value / col.total) * 100) : 0;
        var hit = el('rect', {
          x: cx - band / 2, y: yTop, width: band, height: Math.max(full, 3),
          class: 'uz-hit', tabindex: '0', role: 'img',
          'aria-label': s.agent + ', ' + (D.roleLabels[s.role] || s.role) + ', ' +
            fmt(s.value) + ', ' + pct + '% of ' + labelOf(col.period),
        });
        g.appendChild(hit);
        g.__tip = {
          agent: s.agent, role: D.roleLabels[s.role] || s.role,
          value: fmt(s.value), pct: pct, calls: s.calls, subCalls: s.subCalls,
          period: labelOf(col.period), total: fmt(col.total),
        };
        svg.appendChild(g);
        cursor = yTop;
      });

      // Direct label on the column cap — the palette's relief for the low-contrast
      // series, and it keeps the axis from being the only source of magnitude.
      var capLabel = el('text', { x: cx, y: top - 6, class: 'uz-cap', 'text-anchor': 'middle' });
      capLabel.textContent = tickLabel(col.total);
      svg.appendChild(capLabel);
    });

    var metricLabel = (D.metrics.filter(function (m) { return m.key === metric; })[0] || {}).label || metric;
    caption.textContent = metric === 'cost'
      ? 'Dollar cost per ' + bucket + ' at list API rates, stacked by agent.'
      : metric === 'work'
        ? 'Input + output tokens per ' + bucket + ', stacked by agent — cache traffic excluded.'
        : 'All billed tokens per ' + bucket + ', stacked by agent — cache reads included, and they dominate.';
    desc.textContent = 'Stacked column chart: ' + metricLabel + ' per ' + bucket +
      ' across ' + cols.length + ' periods, segmented by agent. The tables below list every value.';
  }

  // ---- tooltip (values lead, labels follow; names via textContent — untrusted)
  function showTip(t, ev) {
    tip.textContent = '';
    var v = document.createElement('strong');
    v.textContent = t.value;
    tip.appendChild(v);
    var share = document.createElement('span');
    share.className = 'uz-tip-share';
    share.textContent = t.pct + '% of ' + t.period + ' (' + t.total + ')';
    tip.appendChild(share);
    var who = document.createElement('span');
    who.className = 'uz-tip-who';
    who.textContent = t.agent;
    tip.appendChild(who);
    var meta = document.createElement('span');
    meta.className = 'uz-tip-meta';
    meta.textContent = t.role + ' · ' + t.calls.toLocaleString('en-US') + ' calls' +
      (t.subCalls ? ' (' + t.subCalls.toLocaleString('en-US') + ' sub-agent)' : '');
    tip.appendChild(meta);
    tip.hidden = false;

    var box = wrap.getBoundingClientRect();
    var x = (ev.clientX != null ? ev.clientX - box.left : box.width / 2) + 14;
    var yy = (ev.clientY != null ? ev.clientY - box.top : 0) + 14;
    // Keep the tooltip inside the section rather than letting it push the page wide.
    tip.style.left = Math.max(0, Math.min(x, box.width - tip.offsetWidth - 4)) + 'px';
    tip.style.top = Math.max(0, Math.min(yy, box.height - tip.offsetHeight - 4)) + 'px';
  }
  function hideTip() { tip.hidden = true; }

  svg.addEventListener('pointermove', function (ev) {
    var g = ev.target.closest ? ev.target.closest('.uz-seg') : null;
    if (g && g.__tip) showTip(g.__tip, ev); else hideTip();
  });
  svg.addEventListener('pointerleave', hideTip);
  // Keyboard parity: focusing a segment gives the same readout as hovering it.
  // Capture phase, and 'focus' rather than 'focusin': Chrome does not fire
  // focusin for SVG elements, so a bubbling listener never sees a focused <g>
  // even though it really is document.activeElement. 'focus' does not bubble
  // either, but it does capture, so a capture-phase listener on the <svg> gets it.
  svg.addEventListener('focus', function (ev) {
    var g = ev.target.closest ? ev.target.closest('.uz-seg') : null;
    if (!g || !g.__tip) return;
    var r = g.getBoundingClientRect();
    showTip(g.__tip, { clientX: r.left + r.width / 2, clientY: r.top });
  }, true);
  svg.addEventListener('blur', hideTip, true);

  function wire(attr, set) {
    var btns = Array.prototype.slice.call(svg.closest('.rm-sec').querySelectorAll('[data-' + attr + ']'));
    btns.forEach(function (b) {
      b.addEventListener('click', function () {
        set(b.getAttribute('data-' + attr));
        btns.forEach(function (o) {
          var on = o === b;
          o.classList.toggle('current', on);
          o.setAttribute('aria-pressed', on ? 'true' : 'false');
        });
        hideTip();
        render();
      });
    });
  }
  wire('metric', function (v) { metric = v; });
  wire('bucket', function (v) { bucket = v; });

  render();
})();
</script>
</section>`;
}
