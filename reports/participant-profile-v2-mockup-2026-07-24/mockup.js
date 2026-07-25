// Participant profile v2 — interactive UX mockup (obot.roadmap#75).
//
// The chart and the profile block on this page are the REAL safety.viz modules,
// mounted from the vendored dev bundle (safety.viz-dev-1.4.1). Everything that
// surrounds them — the right rail, the layout switcher, the expand state, and
// the two adverse-event tracks — is mockup code written for this page, standing
// in for the v2 work the requirement proposes. Where a behaviour is faked, the
// page says so.
//
// Reading order: data (parse + study-day derivation), mounts (chart, profile),
// AE tracks (summary + timeline, pixel-locked to the lab chart's x-axis),
// layout (the four surfacing options), controls (toolbar wiring).
(function () {
  'use strict';

  // ---------------------------------------------------------------- data ----

  /** Quote-aware CSV parse — the lab file quotes long test names. */
  function parseCsv(text) {
    const rows = [];
    let row = [];
    let field = '';
    let inQuotes = false;
    for (let i = 0; i < text.length; i += 1) {
      const char = text[i];
      if (inQuotes) {
        if (char === '"' && text[i + 1] === '"') {
          field += '"';
          i += 1;
        } else if (char === '"') inQuotes = false;
        else field += char;
      } else if (char === '"') inQuotes = true;
      else if (char === ',') {
        row.push(field);
        field = '';
      } else if (char === '\n' || char === '\r') {
        if (char === '\r' && text[i + 1] === '\n') i += 1;
        row.push(field);
        rows.push(row);
        row = [];
        field = '';
      } else field += char;
    }
    if (field !== '' || row.length) {
      row.push(field);
      rows.push(row);
    }
    const [header, ...records] = rows.filter(
      (cells) => cells.length > 1 || (cells[0] || '').trim() !== ''
    );
    return records.map((cells) =>
      Object.fromEntries(header.map((col, i) => [col, cells[i] ?? '']))
    );
  }

  // The distribution lab file carries visits, not study days — but the AE file
  // is in study days, and the whole point of putting the two tracks on one
  // screen is reading them against a common clock. So derive a nominal day per
  // record from the visit label (Baseline = day 1, "Week N" = day 7N + 1) and
  // interpolate the handful of unscheduled visits off the preceding scheduled
  // one. Local data cleaning for the mockup; the real requirement is that the
  // lab domain carry a study-day column (see the design doc, data section).
  function deriveStudyDay(rows) {
    const scheduled = new Map(); // VISITNUM -> nominal day
    rows.forEach((row) => {
      const label = (row.VISIT || '').trim();
      let day = null;
      if (/^Baseline$/i.test(label)) day = 1;
      const week = label.match(/^Week\s+(\d+)$/i);
      if (week) day = Number(week[1]) * 7 + 1;
      if (day === null) return;
      const key = Math.floor(Number(row.VISITNUM));
      // Several VISITNUMs carry two labels in this file; keep the modal one.
      const seen = scheduled.get(key) || {};
      seen[day] = (seen[day] || 0) + 1;
      scheduled.set(key, seen);
    });
    const modal = new Map();
    scheduled.forEach((counts, key) => {
      const best = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
      modal.set(key, Number(best[0]));
    });
    rows.forEach((row) => {
      const label = (row.VISIT || '').trim();
      const num = Number(row.VISITNUM);
      let day = null;
      if (/^Baseline$/i.test(label)) day = 1;
      const week = label.match(/^Week\s+(\d+)$/i);
      if (week) day = Number(week[1]) * 7 + 1;
      if (day === null && Number.isFinite(num)) {
        const base = modal.get(Math.floor(num));
        if (base !== undefined) day = base + Math.round((num - Math.floor(num)) * 70);
      }
      row.__day = day === null ? '' : day;
    });
    return rows;
  }

  const SEVERITY = {
    MILD: { key: 'MILD', label: 'Mild', color: '#fab219', rank: 1 },
    MODERATE: { key: 'MODERATE', label: 'Moderate', color: '#ec835a', rank: 2 },
    SEVERE: { key: 'SEVERE', label: 'Severe', color: '#d03b3b', rank: 3 }
  };
  const SEVERITY_UNKNOWN = { key: 'UNKNOWN', label: 'Not recorded', color: '#c3c2b7', rank: 0 };
  const severityOf = (record) => SEVERITY[(record.AESEV || '').toUpperCase()] || SEVERITY_UNKNOWN;

  // -------------------------------------------------------------- helpers ----

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  const state = {
    layout: 'rails', // dock | rails | stacked | tabbed
    behavior: 'push', // push | overlay
    autoCollapse: true,
    expanded: false,
    tab: 'participant',
    railWidth: 520,
    participant: null,
    cohort: []
  };

  const dom = {};
  let chart = null;
  let profile = null;
  let aeByParticipant = new Map();
  let hepSidebar = null;
  let sidebarWasCollapsed = false;

  // ------------------------------------------------------------ AE tracks ----

  /** The four headline numbers for one participant's AE record. */
  function summarize(events) {
    const worst = events.reduce(
      (acc, record) => (severityOf(record).rank > acc.rank ? severityOf(record) : acc),
      SEVERITY_UNKNOWN
    );
    return {
      total: events.length,
      serious: events.filter((record) => (record.AESER || '').toUpperCase() === 'Y').length,
      // "No end date" rather than "ongoing": a blank AENDY in this dataset
      // means unresolved OR unrecorded, and the profile should not decide which.
      ongoing: events.filter((record) => !String(record.AENDY).trim()).length,
      worst
    };
  }

  function severityMix(events) {
    const order = [SEVERITY.SEVERE, SEVERITY.MODERATE, SEVERITY.MILD, SEVERITY_UNKNOWN];
    return order
      .map((level) => ({
        level,
        count: events.filter((record) => severityOf(record).key === level.key).length
      }))
      .filter((entry) => entry.count > 0);
  }

  function renderTiles(summary) {
    const wrap = el('div', 'pv-tiles');
    const tiles = [
      { label: 'Events', value: String(summary.total) },
      { label: 'Highest severity', value: summary.worst.label, tone: summary.worst.key },
      { label: 'Serious', value: String(summary.serious), tone: summary.serious ? 'SEVERE' : null },
      { label: 'No end date', value: String(summary.ongoing) }
    ];
    tiles.forEach((tile) => {
      const node = el('div', 'pv-tile');
      const value = el('div', 'pv-tile-value', tile.value);
      if (tile.tone && SEVERITY[tile.tone]) {
        const dot = el('span', 'pv-dot');
        dot.style.background = SEVERITY[tile.tone].color;
        value.prepend(dot);
      }
      node.append(value, el('div', 'pv-tile-label', tile.label));
      wrap.append(node);
    });
    return wrap;
  }

  function renderMix(events) {
    const mix = severityMix(events);
    const wrap = el('div', 'pv-mix-wrap');
    const bar = el('div', 'pv-mix');
    mix.forEach((entry) => {
      const seg = el('div', 'pv-mix-seg');
      seg.style.flexGrow = String(entry.count);
      seg.style.background = entry.level.color;
      seg.title = `${entry.level.label}: ${entry.count}`;
      bar.append(seg);
    });
    const legend = el('div', 'pv-mix-legend');
    mix.forEach((entry) => {
      const item = el('span', 'pv-legend-item');
      const dot = el('span', 'pv-dot');
      dot.style.background = entry.level.color;
      item.append(dot, el('span', null, `${entry.level.label} ${entry.count}`));
      legend.append(item);
    });
    wrap.append(bar, legend);
    return wrap;
  }

  function renderBodySystems(events) {
    const counts = new Map();
    events.forEach((record) => {
      const key = record.AEBODSYS || 'Not recorded';
      counts.set(key, (counts.get(key) || 0) + 1);
    });
    const top = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4);
    const list = el('ul', 'pv-soc');
    top.forEach(([name, count]) => {
      const item = el('li');
      const pretty = name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
      const label = el('span', 'pv-soc-name', pretty);
      const value = el('span', 'pv-soc-count', String(count));
      item.append(label, value);
      list.append(item);
    });
    const wrap = el('div', 'pv-soc-wrap');
    wrap.append(el('div', 'pv-track-label', 'Body systems'), list);
    return wrap;
  }

  const MAX_ROWS = 10;

  function renderTimeline(events) {
    const wrap = el('div', 'pv-timeline');
    const rows = events
      .slice()
      .sort(
        (a, b) =>
          severityOf(b).rank - severityOf(a).rank ||
          (Number(a.ASTDY) || 0) - (Number(b.ASTDY) || 0)
      );
    const shown = rows.slice(0, MAX_ROWS);
    const plot = el('div', 'pv-tl-plot');
    shown.forEach((record) => {
      const row = el('div', 'pv-tl-row');
      row.dataset.start = record.ASTDY || '';
      row.dataset.end = record.AENDY || '';
      const level = severityOf(record);
      const openEnded = !String(record.AENDY).trim();
      const serious = (record.AESER || '').toUpperCase() === 'Y';
      // The term rides above its own bar rather than in a left gutter: the
      // gutter is only as wide as the lab chart's y-axis, which truncates
      // MedDRA terms, and starting the label at the onset day makes the label
      // carry information instead of just naming the row.
      const term = el('div', 'pv-tl-term');
      term.textContent =
        (record.AEDECOD || record.AETERM || '').toLowerCase() +
        (serious ? ' · serious' : '') +
        (openEnded ? ' · no end date' : '');
      const bar = el('div', 'pv-tl-bar');
      bar.style.background = level.color;
      if (openEnded) bar.classList.add('is-open-ended');
      if (serious) bar.classList.add('is-serious');
      const tip =
        `${record.AETERM || record.AEDECOD} — ${level.label}` +
        `${serious ? ', serious' : ''}` +
        ` · day ${record.ASTDY || '?'} to ${openEnded ? 'no end date recorded' : record.AENDY}`;
      bar.title = tip;
      term.title = tip;
      row.append(term, bar);
      plot.append(row);
    });
    wrap.append(plot);
    if (rows.length > shown.length) {
      wrap.append(
        el('p', 'pv-tl-more', `${rows.length - shown.length} more events — not shown in the rail.`)
      );
    }
    const axis = el('div', 'pv-tl-axis');
    wrap.append(axis);
    return wrap;
  }

  function renderAeSection(participantId) {
    const events = aeByParticipant.get(String(participantId)) || [];
    const section = el('section', 'pv-ae');
    section.setAttribute('aria-label', 'Adverse events');
    const head = el('div', 'pv-ae-head');
    head.append(el('h3', null, 'Adverse events'));
    head.append(el('span', 'pv-mock-tag', 'v2 mockup'));
    section.append(head);

    if (!events.length) {
      section.append(
        el(
          'p',
          'pv-empty',
          'No adverse events recorded for this participant. The constructed CLD- cohort in this ' +
            'demo dataset carries laboratory results only.'
        )
      );
      return section;
    }

    const summary = summarize(events);
    section.append(renderTiles(summary));
    section.append(renderMix(events));
    section.append(el('div', 'pv-track-label', 'Timeline, on the lab chart’s study-day axis'));
    section.append(renderTimeline(events));
    section.append(renderBodySystems(events));
    return section;
  }

  // Pixel-lock the AE timeline to the lab chart's x-axis: read the live
  // Chart.js scale and place every bar with the same day-to-pixel mapping the
  // spaghetti above it uses, so a rise in ALT and the event that may explain it
  // sit on the same vertical.
  function syncAxis() {
    const timeline = dom.rail.querySelector('.pv-timeline');
    if (!timeline || !profile || !profile.spaghettiChart) return false;
    const chartInstance = profile.spaghettiChart;
    const canvas = chartInstance.canvas;
    const scale = chartInstance.scales.x;
    if (!canvas || !scale) return false;
    const canvasBox = canvas.getBoundingClientRect();
    const timelineBox = timeline.getBoundingClientRect();
    // The chart's canvas is not laid out on the frame it is created — on a slow
    // load it can still be zero-width several frames later — so the caller
    // retries rather than silently leaving every bar unplaced.
    if (!canvasBox.width || !timelineBox.width) return false;
    const ratio = canvasBox.width / (chartInstance.width || canvasBox.width);
    const offset = canvasBox.left - timelineBox.left;
    const left = offset + scale.left * ratio;
    const right = offset + scale.right * ratio;
    const min = scale.min;
    const max = scale.max;
    const span = max - min || 1;
    const toPx = (day) => left + ((day - min) / span) * (right - left);

    timeline.style.setProperty('--ax-left', `${left}px`);
    timeline.style.setProperty('--ax-right', `${timelineBox.width - right}px`);

    timeline.querySelectorAll('.pv-tl-row').forEach((row) => {
      const start = Number(row.dataset.start);
      const rawEnd = row.dataset.end;
      const end = rawEnd === '' ? max : Number(rawEnd);
      const bar = row.querySelector('.pv-tl-bar');
      const term = row.querySelector('.pv-tl-term');
      if (!Number.isFinite(start)) {
        bar.style.display = 'none';
        return;
      }
      bar.style.display = '';
      const x0 = Math.max(left, toPx(start));
      const x1 = Math.min(right, toPx(Math.max(end, start)));
      bar.style.left = `${x0}px`;
      bar.style.width = `${Math.max(6, x1 - x0)}px`;
      bar.classList.toggle('is-clipped', Number.isFinite(end) && toPx(end) > right + 0.5);
      if (term) {
        // Labels start at the onset, but flip to right-aligned when the onset
        // is so late that the term would run off the rail.
        const flip = x0 > left + (right - left) * 0.55;
        term.classList.toggle('is-flipped', flip);
        if (flip) {
          term.style.left = 'auto';
          term.style.right = `${timelineBox.width - x1}px`;
          term.style.maxWidth = `${x1 - left}px`;
        } else {
          term.style.left = `${x0}px`;
          term.style.right = 'auto';
          term.style.maxWidth = `${right - x0}px`;
        }
      }
    });

    // The ruler repeats the lab chart's own ticks so the shared clock is
    // legible without reading two axes.
    const axis = timeline.querySelector('.pv-tl-axis');
    if (axis) {
      axis.innerHTML = '';
      const ticks = (scale.ticks || []).map((tick) => tick.value);
      ticks.forEach((value) => {
        const px = toPx(value);
        if (px < left - 1 || px > right + 1) return;
        const tick = el('span', 'pv-tl-tick', String(Math.round(value)));
        tick.style.left = `${px}px`;
        axis.append(tick);
      });
    }
    return true;
  }

  let canvasObserver = null;

  /**
   * Sync the timeline to the lab chart's axis as soon as the chart is sized,
   * then keep it synced: retry while the canvas is still zero-width (it is not
   * laid out on the frame it is created, and on a slow load that lasts several
   * frames), and watch the canvas so any later resize re-places the bars.
   */
  function scheduleSync() {
    // The frame budget is per-loop: several loops can be in flight at once
    // (a render, a layout change, a resize), and a shared counter would let
    // them exhaust each other's retries before the chart is ready.
    let frames = 0;
    const attempt = () => {
      if (syncAxis()) return;
      // Self-heal a chart created while its container had no width:
      // re-measuring is what Chart.js's own resize does, and it is idempotent.
      const live = profile && profile.spaghettiChart;
      if (live && live.canvas && !live.canvas.getBoundingClientRect().width) live.resize();
      frames += 1;
      if (frames < 240) requestAnimationFrame(attempt);
    };
    requestAnimationFrame(attempt);

    const canvas = profile && profile.spaghettiChart ? profile.spaghettiChart.canvas : null;
    if (canvasObserver) canvasObserver.disconnect();
    if (!canvas || typeof ResizeObserver === 'undefined') return;
    canvasObserver = new ResizeObserver(() => syncAxis());
    canvasObserver.observe(canvas);
  }

  // --------------------------------------------------------------- mounts ----

  function injectAeSection() {
    const root = dom.profileMount.querySelector('.sv-profile-root');
    if (!root) return;
    const id = profile.state.ids[profile.state.index];
    state.participant = id;
    state.cohort = profile.state.ids.slice();
    const section = renderAeSection(id);
    // Section order (design decision D5): the AE tracks sit directly under the
    // labs chart, not appended after the measure table, so the two time tracks
    // share an edge as well as an axis.
    const spaghetti = root.querySelector('.sv-profile-spaghetti');
    if (spaghetti && spaghetti.nextSibling) root.insertBefore(section, spaghetti.nextSibling);
    else root.append(section);
    updateRailHead();
    scheduleSync();
  }

  function updateRailHead() {
    const id = state.participant;
    dom.railTitle.textContent = id ? id : 'Participant profile';
    dom.railSub.textContent = id
      ? state.cohort.length > 1
        ? `${state.cohort.length} selected · stepping worst first`
        : 'Selected from the chart'
      : 'Nothing selected';
    dom.rail.classList.toggle('is-empty', !id);
    dom.railControls.hidden = !id;
  }

  function mount(labRows, aeRows) {
    aeByParticipant = new Map();
    aeRows.forEach((record) => {
      const key = String(record.USUBJID);
      if (!aeByParticipant.has(key)) aeByParticipant.set(key, []);
      aeByParticipant.get(key).push(record);
    });

    const mapping = {
      studyday_col: '__day',
      visit_col: 'VISIT',
      visitn_col: 'VISITNUM',
      measure_values: {
        ALT: 'Alanine Aminotransferase',
        AST: 'Aspartate Aminotransferase',
        TB: 'Bilirubin',
        ALP: 'Alkaline Phosphatase'
      }
    };

    chart = window.SafetyViz.hepExplorer(dom.chartMount, {
      profile: false, // the rail on this page stands in for the built-in dock
      arm_col: 'ARM',
      placebo_arm: 'Placebo',
      active_arms: ['Xanomeline High Dose', 'Xanomeline Low Dose'],
      studyday_col: mapping.studyday_col,
      visit_col: mapping.visit_col,
      visitn_col: mapping.visitn_col,
      measure_values: mapping.measure_values,
      filters: [
        { value_col: 'SEX', label: 'Sex' },
        { value_col: 'ARM', label: 'Treatment Group' }
      ],
      groups: [
        { value_col: 'ARM', label: 'Treatment Group' },
        { value_col: 'SEX', label: 'Sex' }
      ]
    });
    chart.init(labRows);

    const chartRoot = dom.chartMount.querySelector('.sv-root');
    hepSidebar = chartRoot ? chartRoot.querySelector('.sv-sidebar') : null;

    profile = window.SafetyViz.participantProfile(dom.profileMount, labRows, {
      listen_to: chartRoot,
      studyday_col: mapping.studyday_col,
      visit_col: mapping.visit_col,
      visitn_col: mapping.visitn_col,
      measure_values: mapping.measure_values,
      details: [
        { value_col: 'SEX', label: 'Sex' },
        { value_col: 'RACE', label: 'Race' },
        { value_col: 'ARM', label: 'Treatment Group' },
        { value_col: 'SITE', label: 'Site' }
      ]
    });

    // The AE tracks do not exist in the shipped module — this page renders them
    // after every profile render, into the module's own block, to show what the
    // grown profile reads like.
    const renderProfileOriginal = profile.renderProfile.bind(profile);
    profile.renderProfile = function patched() {
      renderProfileOriginal();
      injectAeSection();
    };
    const clearOriginal = profile.clear.bind(profile);
    profile.clear = function patchedClear() {
      const result = clearOriginal();
      state.participant = null;
      state.cohort = [];
      updateRailHead();
      if (state.autoCollapse) restoreControlsSidebar();
      return result;
    };

    // Opening on a live participant rather than an empty rail: this one has
    // both elevated transaminases and ten adverse events, so every track has
    // something in it on first paint.
    chartRoot.dispatchEvent(
      new CustomEvent('participantsSelected', { detail: { data: ['01-701-1239'] } })
    );

    dom.stage.classList.remove('is-loading');
    applyLayout();

    const observer = new ResizeObserver(() => {
      if (chart) chart.resize();
      if (profile) profile.resize();
      scheduleSync();
    });
    observer.observe(dom.stage);
    window.addEventListener('resize', () => scheduleSync());
  }

  // --------------------------------------------------------------- layout ----

  function collapseControlsSidebar() {
    if (!hepSidebar) return;
    const root = hepSidebar.closest('.sv-root');
    if (!root || root.classList.contains('sv-collapsed')) return;
    sidebarWasCollapsed = false;
    const toggle = hepSidebar.querySelector('.sv-sidebar-toggle');
    if (toggle) toggle.click();
  }

  function restoreControlsSidebar() {
    if (!hepSidebar || sidebarWasCollapsed) return;
    const root = hepSidebar.closest('.sv-root');
    if (!root || !root.classList.contains('sv-collapsed')) return;
    const toggle = hepSidebar.querySelector('.sv-sidebar-toggle');
    if (toggle) toggle.click();
  }

  // The three coexistence options differ only in where the chart's own control
  // sidebar lives — so the switcher moves the real element rather than drawing
  // a picture of it.
  function placeControls() {
    if (!hepSidebar) return;
    const chartRoot = dom.chartMount.querySelector('.sv-root');
    if (state.layout === 'stacked' || state.layout === 'tabbed') {
      if (hepSidebar.parentElement !== dom.railControlsSlot) {
        dom.railControlsSlot.append(hepSidebar);
      }
    } else if (chartRoot && hepSidebar.parentElement !== chartRoot) {
      chartRoot.prepend(hepSidebar);
    }
  }

  function applyLayout() {
    dom.stage.dataset.layout = state.layout;
    dom.stage.dataset.behavior = state.behavior;
    dom.stage.dataset.expanded = String(state.expanded);
    dom.stage.dataset.tab = state.tab;
    dom.stage.style.setProperty('--rail-width', `${state.railWidth}px`);
    placeControls();

    // Dock mode returns the rail to the v1 position: full width, below the chart.
    if (state.layout === 'dock') {
      if (dom.rail.parentElement !== dom.dockSlot) dom.dockSlot.append(dom.rail);
    } else if (dom.rail.parentElement !== dom.stageInner) {
      dom.stageInner.append(dom.rail);
    }

    // Auto-collapse only earns its keep when the chart is squeezed between two
    // panels; every other layout gives the controls back.
    if (state.layout === 'rails' && state.autoCollapse && state.participant) {
      collapseControlsSidebar();
    } else {
      restoreControlsSidebar();
    }

    document.querySelectorAll('[data-layout-option]').forEach((button) => {
      const active = button.dataset.layoutOption === state.layout;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', String(active));
    });
    dom.expandButton.textContent = state.expanded ? 'Collapse to rail' : 'Expand to full screen';
    dom.expandButton.setAttribute('aria-pressed', String(state.expanded));
    dom.tabBar.hidden = state.layout !== 'tabbed';
    dom.behaviorRow.hidden = state.layout === 'dock';

    requestAnimationFrame(() => {
      if (chart) chart.resize();
      if (profile) profile.resize();
      scheduleSync();
    });
  }

  // ------------------------------------------------------------- controls ----

  function wireControls() {
    document.querySelectorAll('[data-layout-option]').forEach((button) => {
      button.addEventListener('click', () => {
        state.layout = button.dataset.layoutOption;
        if (state.layout === 'dock') state.expanded = false;
        applyLayout();
      });
    });

    document.querySelectorAll('[data-behavior-option]').forEach((button) => {
      button.addEventListener('click', () => {
        state.behavior = button.dataset.behaviorOption;
        document.querySelectorAll('[data-behavior-option]').forEach((other) => {
          const active = other.dataset.behaviorOption === state.behavior;
          other.classList.toggle('is-active', active);
          other.setAttribute('aria-pressed', String(active));
        });
        applyLayout();
      });
    });

    dom.autoCollapse.addEventListener('change', () => {
      state.autoCollapse = dom.autoCollapse.checked;
      applyLayout();
    });

    dom.widthInput.addEventListener('input', () => {
      state.railWidth = Number(dom.widthInput.value);
      dom.widthValue.textContent = `${state.railWidth}px`;
      applyLayout();
    });

    dom.expandButton.addEventListener('click', () => {
      state.expanded = !state.expanded;
      if (state.expanded && state.layout === 'dock') state.layout = 'rails';
      applyLayout();
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && state.expanded) {
        state.expanded = false;
        applyLayout();
      }
    });

    dom.tabBar.querySelectorAll('[data-tab]').forEach((button) => {
      button.addEventListener('click', () => {
        state.tab = button.dataset.tab;
        dom.tabBar.querySelectorAll('[data-tab]').forEach((other) => {
          const active = other.dataset.tab === state.tab;
          other.classList.toggle('is-active', active);
          other.setAttribute('aria-selected', String(active));
        });
        applyLayout();
      });
    });

    dom.cohortButton.addEventListener('click', () => {
      const chartRoot = dom.chartMount.querySelector('.sv-root');
      if (!chartRoot) return;
      const ids = [
        '01-701-1239',
        '01-718-1150',
        '01-709-1102',
        '01-705-1292',
        '01-708-1286',
        '01-709-1029',
        '01-701-1275',
        '01-704-1266'
      ];
      chartRoot.dispatchEvent(
        new CustomEvent('participantsSelected', { detail: { data: ids } })
      );
    });

    // The module keeps its Standardization and Measures controls in the shell
    // sidebar, which the rail hides — so the rail head carries a stand-in for
    // the one control a reviewer reaches for most. In the real v2 the module
    // would own this strip.
    dom.railControls.querySelectorAll('[data-display]').forEach((button) => {
      button.addEventListener('click', () => {
        if (!profile) return;
        dom.railControls.querySelectorAll('[data-display]').forEach((other) => {
          other.classList.toggle('is-active', other === button);
        });
        profile.onDisplayChange(button.dataset.display);
      });
    });

    dom.closeButton.addEventListener('click', () => {
      if (profile) profile.clear();
      state.expanded = false;
      applyLayout();
    });
  }

  // ----------------------------------------------------------------- boot ----

  function boot() {
    dom.stage = document.getElementById('pv-stage');
    dom.stageInner = document.getElementById('pv-stage-inner');
    dom.chartMount = document.getElementById('pv-chart');
    dom.dockSlot = document.getElementById('pv-dock-slot');
    dom.rail = document.getElementById('pv-rail');
    dom.railTitle = document.getElementById('pv-rail-title');
    dom.railSub = document.getElementById('pv-rail-sub');
    dom.railControls = document.getElementById('pv-rail-controls');
    dom.railControlsSlot = document.getElementById('pv-rail-controls-slot');
    dom.profileMount = document.getElementById('pv-profile');
    dom.expandButton = document.getElementById('pv-expand');
    dom.closeButton = document.getElementById('pv-close');
    dom.autoCollapse = document.getElementById('pv-autocollapse');
    dom.widthInput = document.getElementById('pv-width');
    dom.widthValue = document.getElementById('pv-width-value');
    dom.tabBar = document.getElementById('pv-tabs');
    dom.behaviorRow = document.getElementById('pv-behavior-row');
    dom.cohortButton = document.getElementById('pv-cohort');

    wireControls();
    updateRailHead();

    Promise.all([
      fetch('./data/adbds-liver.csv').then((response) => response.text()),
      fetch('./data/adae.csv').then((response) => response.text())
    ])
      .then(([labText, aeText]) => {
        const labRows = deriveStudyDay(parseCsv(labText));
        const aeRows = parseCsv(aeText);
        mount(labRows, aeRows);
      })
      .catch((error) => {
        dom.stage.classList.remove('is-loading');
        dom.chartMount.textContent = `The demo data did not load: ${error.message}`;
        console.error(error);
      });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
