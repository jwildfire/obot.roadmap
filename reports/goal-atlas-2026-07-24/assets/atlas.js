/* Goal Atlas — view builders.
   Reads window.ATLAS (data/atlas-data.js). No network, no dependencies.

   Four views over one graph:
     ridge()    — every open issue as one cell, grouped by goal (coverage)
     strata()   — icicle: goal / requirement / task, height = open subtree size
     outline()  — filterable collapsible tree (the workhorse + the table view)
     clusters() — the unclaimed issues, grouped into proposed homes
     matrix()   — open issues by goal x board stage
*/
(function () {
  "use strict";

  var A = window.ATLAS;
  var N = A.nodes;
  var GOAL_ORDER = ["charts", "app", "autonomy", "keynote"];
  var GOAL_META = {
    charts: { id: "jwildfire/obot.roadmap#78", label: "Charts", glyph: "C", num: 78 },
    app: { id: "jwildfire/obot.roadmap#79", label: "App", glyph: "A", num: 79 },
    autonomy: { id: "jwildfire/obot.roadmap#73", label: "Autonomy", glyph: "U", num: 73 },
    keynote: { id: "jwildfire/obot.roadmap#72", label: "Keynote", glyph: "K", num: 72 }
  };
  var STAGES = ["Backlog", "Requirement Gathering", "Design", "Development", "Review", "Released"];
  var STAGE_SHORT = {
    "Backlog": "backlog", "Requirement Gathering": "req gathering", "Design": "design",
    "Development": "development", "Review": "review", "Released": "released"
  };

  function color(goal) { return "var(--g-" + (goal || "orphan") + ")"; }
  function isOpen(n) { return n.state === "OPEN"; }
  function node(id) { return N[id]; }
  function all() { return Object.keys(N).map(node); }
  function openKids(n) { return (n.children || []).filter(function (c) { return N[c] && isOpen(N[c]); }); }

  /* flattened open descendants, depth-first */
  function descendants(id, acc, seen) {
    acc = acc || []; seen = seen || {};
    openKids(N[id]).forEach(function (c) {
      if (seen[c]) return;
      seen[c] = 1; acc.push(c); descendants(c, acc, seen);
    });
    return acc;
  }

  /* ---------- tooltip ---------- */
  var tip;
  function tipEl() {
    if (!tip) { tip = document.createElement("div"); tip.id = "tip"; document.body.appendChild(tip); }
    return tip;
  }
  function bindTip(el, n) {
    el.addEventListener("mouseenter", function () {
      var t = tipEl();
      t.innerHTML = "<span class='tt'></span><span class='tm'></span>";
      t.querySelector(".tt").textContent = n.title;
      t.querySelector(".tm").textContent =
        n.repo + "#" + n.num + " · " + (n.goal || "no goal") + " · " +
        (n.stage ? STAGE_SHORT[n.stage] || n.stage : "not on the board") + " · " +
        (isOpen(n) ? "open" : "closed " + n.closed);
      t.classList.add("on");
    });
    el.addEventListener("mousemove", function (e) {
      var t = tipEl(), pad = 14;
      var x = Math.min(e.clientX + pad, window.innerWidth - t.offsetWidth - 8);
      var y = e.clientY + pad + t.offsetHeight > window.innerHeight ? e.clientY - t.offsetHeight - pad : e.clientY + pad;
      t.style.left = Math.max(8, x) + "px"; t.style.top = Math.max(8, y) + "px";
    });
    el.addEventListener("mouseleave", function () { tipEl().classList.remove("on"); });
  }

  /* ---------- view 1: the coverage ridge ---------- */
  function ridge(sel) {
    var host = document.querySelector(sel); if (!host) return;
    var open = all().filter(isOpen);
    var groups = GOAL_ORDER.map(function (g) {
      return { key: g, label: GOAL_META[g].label, glyph: GOAL_META[g].glyph, items: open.filter(function (n) { return n.goal === g; }) };
    });
    groups.push({ key: null, label: "Unclaimed", glyph: "?", items: open.filter(function (n) { return !n.goal; }) });

    var wrapEl = document.createElement("div");
    wrapEl.className = "ridge-groups";
    groups.forEach(function (grp) {
      grp.items.sort(function (a, b) {
        var sa = STAGES.indexOf(a.stage), sb = STAGES.indexOf(b.stage);
        return (sa < 0 ? 9 : sa) - (sb < 0 ? 9 : sb) || a.num - b.num;
      });
      var g = document.createElement("div");
      g.className = "ridge-group";
      var lab = document.createElement("div");
      lab.className = "ridge-label";
      lab.innerHTML = "<span class='glyph'></span><span class='nm'></span> <span class='count'></span>";
      lab.querySelector(".glyph").style.background = color(grp.key);
      lab.querySelector(".glyph").textContent = grp.glyph;
      lab.querySelector(".nm").textContent = grp.label;
      lab.querySelector(".count").textContent = grp.items.length;
      g.appendChild(lab);
      var cells = document.createElement("div");
      cells.className = "ridge-cells";
      cells.style.maxWidth = Math.min(Math.max(Math.ceil(Math.sqrt(grp.items.length * 2.4)), 4), 12) * 17 + "px";
      grp.items.forEach(function (n) {
        var a = document.createElement("a");
        a.className = "cell" + (n.stage ? "" : " offboard");
        a.href = n.url; a.target = "_blank"; a.rel = "noopener";
        a.style.background = color(n.goal);
        a.setAttribute("aria-label", n.repo + "#" + n.num + " — " + n.title);
        bindTip(a, n);
        cells.appendChild(a);
      });
      g.appendChild(cells);
      wrapEl.appendChild(g);
    });
    host.appendChild(wrapEl);
  }

  /* ---------- view 2: strata (icicle) ---------- */
  function strata(sel) {
    var host = document.querySelector(sel); if (!host) return;
    var UNIT = 22, GAP = 2;

    var openIds = all().filter(isOpen).map(function (n) { return n.id; });
    var openSet = {}; openIds.forEach(function (id) { openSet[id] = 1; });

    function rootsFor(goal) {
      if (goal) return openKids(node(GOAL_META[goal].id));
      return openIds.filter(function (id) {
        var n = node(id);
        if (n.goal || n.kind === "goal") return false;
        return !(n.parent && openSet[n.parent] && !node(n.parent).goal);
      });
    }

    var groups = GOAL_ORDER.map(function (g) { return { key: g, label: GOAL_META[g].label, roots: rootsFor(g), goalNode: node(GOAL_META[g].id) }; });
    groups.push({ key: null, label: "Unclaimed", roots: rootsFor(null), goalNode: null });

    var colA = document.createElement("div"), colB = document.createElement("div"), colC = document.createElement("div");
    colA.className = "stratum col-goal"; colB.className = "stratum col-req"; colC.className = "stratum col-task";
    colA.innerHTML = "<div class='strata-head'>Goal</div>";
    colB.innerHTML = "<div class='strata-head'>Requirement / direct task</div>";
    colC.innerHTML = "<div class='strata-head'>Task</div>";

    function h(units) { return units * UNIT + (units - 1) * GAP; }

    function band(n, units, cls) {
      var a = document.createElement("a");
      a.className = "band " + (cls || "") + (units >= 3 ? " tall" : "");
      a.style.height = h(units) + "px";
      a.href = n.url; a.target = "_blank"; a.rel = "noopener";
      a.innerHTML = "<span class='bn'></span><span class='bt'></span>";
      a.querySelector(".bn").textContent = n.repo + "#" + n.num;
      a.querySelector(".bt").textContent = n.title.replace(/^Requirement:\s*/, "");
      bindTip(a, n);
      return a;
    }
    function spacer(units) {
      var d = document.createElement("div");
      d.className = "band spacer"; d.style.height = h(units) + "px";
      return d;
    }

    groups.forEach(function (grp) {
      var weights = grp.roots.map(function (id) { return Math.max(1, descendants(id).length); });
      var total = weights.reduce(function (a, b) { return a + b; }, 0) || 1;

      var ga = document.createElement(grp.goalNode ? "a" : "div");
      ga.className = "band goalband" + (total >= 3 ? " tall" : "");
      ga.style.height = h(total) + "px";
      ga.style.background = color(grp.key);
      if (grp.goalNode) { ga.href = grp.goalNode.url; ga.target = "_blank"; ga.rel = "noopener"; bindTip(ga, grp.goalNode); }
      ga.innerHTML = "<span class='bt'></span><span class='bn'></span>";
      ga.querySelector(".bt").textContent = grp.label;
      ga.querySelector(".bn").textContent = grp.goalNode ? "hub#" + grp.goalNode.num + " · " + (descendants(grp.goalNode.id).length) + " open" :
        grp.roots.reduce(function (a, id) { return a + Math.max(1, descendants(id).length); }, 0) + " open · no goal";
      colA.appendChild(ga);

      grp.roots.forEach(function (id, i) {
        var n = node(id), w = weights[i];
        var b = band(n, w);
        b.style.background = grp.key ? "var(--g-" + grp.key + "-tint)" : "var(--g-orphan-tint)";
        b.style.borderLeft = "3px solid " + color(grp.key);
        colB.appendChild(b);

        var kids = descendants(id);
        if (kids.length) {
          kids.forEach(function (cid) {
            var cb = band(node(cid), 1);
            cb.style.background = "var(--surface)";
            cb.style.borderLeft = "3px solid " + color(grp.key);
            cb.style.opacity = ".9";
            colC.appendChild(cb);
          });
        } else {
          colC.appendChild(spacer(1));
        }
      });
    });

    var strataEl = document.createElement("div");
    strataEl.className = "strata";
    strataEl.appendChild(colA); strataEl.appendChild(colB); strataEl.appendChild(colC);
    var scroll = document.createElement("div");
    scroll.className = "strata-scroll";
    scroll.appendChild(strataEl);
    host.appendChild(scroll);
  }

  /* ---------- view 3: the outline ---------- */
  function outline(sel) {
    var host = document.querySelector(sel); if (!host) return;

    var state = { scope: "open", goal: "all", repo: "all", q: "" };

    var bar = document.createElement("div");
    bar.className = "controls";
    bar.innerHTML =
      "<label>Show <select data-k='scope'><option value='open'>open only</option>" +
      "<option value='all'>open + closed</option></select></label>" +
      "<label>Goal <select data-k='goal'><option value='all'>all</option>" +
      GOAL_ORDER.map(function (g) { return "<option value='" + g + "'>" + GOAL_META[g].label + "</option>"; }).join("") +
      "<option value='none'>unclaimed</option></select></label>" +
      "<label>Repo <select data-k='repo'><option value='all'>all</option><option value='hub'>hub</option>" +
      "<option value='sv'>safety.viz</option><option value='oa'>obot.agent</option>" +
      "<option value='gs'>gsm.safety</option></select></label>" +
      "<label>Find <input type='search' data-k='q' placeholder='title or #number' size='16'></label>" +
      "<button type='button' data-act='expand'>Expand all</button>" +
      "<button type='button' data-act='collapse'>Collapse all</button>" +
      "<span class='result-count'></span>";
    host.appendChild(bar);

    var treeEl = document.createElement("div");
    treeEl.className = "tree";
    host.appendChild(treeEl);

    function matches(n) {
      if (state.scope === "open" && !isOpen(n)) return false;
      if (state.goal === "none" && n.goal) return false;
      if (state.goal !== "all" && state.goal !== "none" && n.goal !== state.goal) return false;
      if (state.repo !== "all" && n.repo !== state.repo) return false;
      if (state.q) {
        var q = state.q.toLowerCase().replace(/^#/, "");
        if (n.title.toLowerCase().indexOf(q) < 0 && String(n.num).indexOf(q) !== 0) return false;
      }
      return true;
    }
    function subtreeHas(id, seen) {
      seen = seen || {};
      if (seen[id]) return false; seen[id] = 1;
      if (matches(node(id))) return true;
      return (node(id).children || []).some(function (c) { return N[c] && subtreeHas(c, seen); });
    }

    function rowFor(n, kids, depth) {
      var li = document.createElement("li");
      var row = document.createElement("div");
      row.className = "row " + (n.kind === "goal" ? "goalrow " : n.kind === "requirement" ? "reqrow " : "") + (state.q && matches(n) ? "hit" : "");

      var tw = document.createElement("button");
      tw.type = "button";
      tw.className = "twisty" + (kids.length ? "" : " leaf");
      tw.textContent = kids.length ? "▾" : "·";
      tw.setAttribute("aria-label", kids.length ? "collapse " + n.repo + "#" + n.num : "");
      row.appendChild(tw);

      var bar2 = document.createElement("span");
      bar2.className = "gbar";
      bar2.style.background = color(n.goal);
      row.appendChild(bar2);

      var dot = document.createElement("span");
      dot.className = "dot " + (isOpen(n) ? "open" : "closed");
      row.appendChild(dot);

      var ref = document.createElement("a");
      ref.className = "ref";
      ref.href = n.url; ref.target = "_blank"; ref.rel = "noopener";
      ref.textContent = n.repo + "#" + n.num;
      row.appendChild(ref);

      var t = document.createElement("span");
      t.className = "title";
      t.textContent = n.title.replace(/^Requirement:\s*/, "").replace(/^Goal:\s*/, "");
      row.appendChild(t);

      var stage = document.createElement("span");
      var sk = n.stage ? (n.stage === "Development" ? "stage-dev" : n.stage === "Review" ? "stage-review" : n.stage === "Released" ? "stage-released" : "") : "stage-none";
      stage.className = "chip " + sk;
      stage.textContent = n.stage ? STAGE_SHORT[n.stage] || n.stage : "off board";
      row.appendChild(stage);

      var repo = document.createElement("span");
      repo.className = "chip repo";
      repo.textContent = n.repo;
      row.appendChild(repo);

      li.appendChild(row);

      if (kids.length) {
        var ul = document.createElement("ul");
        kids.forEach(function (c) { ul.appendChild(rowFor(node(c), visibleKids(c), depth + 1)); });
        li.appendChild(ul);
        tw.addEventListener("click", function () {
          var hidden = ul.style.display === "none";
          ul.style.display = hidden ? "" : "none";
          tw.textContent = hidden ? "▾" : "▸";
        });
        if (depth >= 1 && !state.q) { ul.style.display = "none"; tw.textContent = "▸"; }
      }
      return li;
    }

    function visibleKids(id) {
      return (node(id).children || []).filter(function (c) { return N[c] && subtreeHas(c); });
    }

    function render() {
      treeEl.innerHTML = "";
      var ul = document.createElement("ul");
      var shown = 0;
      GOAL_ORDER.forEach(function (g) {
        var id = GOAL_META[g].id;
        if (!subtreeHas(id)) return;
        var li = rowFor(node(id), visibleKids(id), 0);
        ul.appendChild(li);
      });
      /* unclaimed pseudo-root */
      var openSet = {};
      all().forEach(function (n) { if (isOpen(n)) openSet[n.id] = 1; });
      var orphanRoots = all().filter(function (n) {
        if (n.goal || n.kind === "goal") return false;
        if (n.parent && N[n.parent] && !N[n.parent].goal) return false;
        return subtreeHas(n.id);
      }).sort(function (a, b) { return a.repo.localeCompare(b.repo) || a.num - b.num; });
      if (orphanRoots.length) {
        var li = document.createElement("li");
        var row = document.createElement("div");
        row.className = "row goalrow";
        row.innerHTML = "<button type='button' class='twisty'>▾</button><span class='gbar'></span>" +
          "<span class='dot'></span><span class='chip'>no goal</span><span class='title'>Unclaimed — reachable from no goal</span>";
        row.querySelector(".gbar").style.background = color(null);
        li.appendChild(row);
        var oul = document.createElement("ul");
        orphanRoots.forEach(function (n) { oul.appendChild(rowFor(n, visibleKids(n.id), 0)); });
        li.appendChild(oul);
        row.querySelector(".twisty").addEventListener("click", function () {
          var hidden = oul.style.display === "none";
          oul.style.display = hidden ? "" : "none";
          this.textContent = hidden ? "▾" : "▸";
        });
        ul.appendChild(li);
      }
      treeEl.appendChild(ul);
      shown = all().filter(matches).length;
      bar.querySelector(".result-count").textContent = shown + " issue" + (shown === 1 ? "" : "s") + " match";
    }

    bar.addEventListener("change", function (e) {
      var k = e.target.getAttribute("data-k");
      if (!k) return;
      state[k] = e.target.value; render();
    });
    bar.addEventListener("input", function (e) {
      if (e.target.getAttribute("data-k") !== "q") return;
      state.q = e.target.value; render();
    });
    bar.addEventListener("click", function (e) {
      var act = e.target.getAttribute("data-act");
      if (!act) return;
      treeEl.querySelectorAll("ul ul").forEach(function (ul) {
        ul.style.display = act === "expand" ? "" : "none";
        var tw = ul.parentNode.querySelector(".twisty");
        if (tw) tw.textContent = act === "expand" ? "▾" : "▸";
      });
    });
    render();
  }

  /* ---------- view 4: the unclaimed, clustered ---------- */
  var CLUSTERS = [
    {
      tag: "A", name: "The workbench", home: "New goal — <b>G5 Build the workbench</b>",
      note: "Session framework, dashboards, roadmap transparency, merge and release lanes, bot identity. Sixteen open issues; the largest cluster on the board and the one with no parent anywhere.",
      ids: ["oa#14", "oa#32", "oa#36", "oa#37", "hub#3", "hub#24", "hub#27", "hub#31", "hub#44", "hub#48", "hub#69", "hub#76", "hub#77", "hub#91", "hub#94", "hub#103"]
    },
    {
      tag: "B", name: "One coherent product", home: "New goal — <b>G6 Make the charts one product</b>",
      note: "Cross-renderer interaction and consistency work: shared legends, shared selection, shared chrome. Not new charts, so #78 does not claim it; today it lives nowhere.",
      ids: ["hub#83", "hub#98", "sv#33", "sv#41", "sv#83", "sv#84", "sv#86", "sv#87", "sv#88", "sv#104"]
    },
    {
      tag: "C", name: "Evidence and data", home: "New goal — <b>G7 Evidence you can trust</b>",
      note: "Demo data, docs site, user guides, QC reporting, fixture and tooling debt. The done-gate depends on all of it, and none of it is a chart.",
      ids: ["hub#15", "hub#21", "hub#25", "hub#32", "hub#33", "sv#32", "sv#35", "sv#51", "sv#89", "sv#109"]
    },
    {
      tag: "D", name: "The talk and the diary", home: "Existing goal — link under <b>#72 keynote</b>",
      note: "The deck requirement and the blog series are the keynote goal's own source material, yet neither is linked to it. A three-link fix.",
      ids: ["hub#10", "hub#22", "oa#15"]
    },
    {
      tag: "E", name: "Charts already in flight", home: "Existing goal — link under <b>#78 charts</b>",
      note: "Requirements that are unambiguously chart work and are already moving. Linking them is bookkeeping, not a decision.",
      ids: ["hub#2", "hub#29", "hub#43", "hub#45", "hub#81", "sv#99"]
    }
  ];

  function idOf(short) {
    var m = short.split("#");
    var repoMap = { hub: "jwildfire/obot.roadmap", oa: "jwildfire/obot.agent", sv: "jwildfire/safety.viz", gs: "jwildfire/gsm.safety", og: "jwildfire/open.gismo" };
    return repoMap[m[0]] + "#" + m[1];
  }

  function clusters(sel) {
    var host = document.querySelector(sel); if (!host) return;
    var grid = document.createElement("div");
    grid.className = "clusters";
    CLUSTERS.forEach(function (c) {
      var box = document.createElement("div");
      box.className = "cluster";
      var h3 = document.createElement("h3");
      h3.innerHTML = "<span class='tag'>" + c.tag + "</span><span></span>";
      h3.querySelector("span:last-child").textContent = c.name + " (" + c.ids.length + ")";
      box.appendChild(h3);
      var home = document.createElement("p");
      home.className = "home";
      home.innerHTML = c.home + " — " + c.note;
      box.appendChild(home);
      var ul = document.createElement("ul");
      ul.className = "olist";
      c.ids.forEach(function (s) {
        var n = node(idOf(s));
        var li = document.createElement("li");
        if (!n) { li.textContent = s + " (not found)"; ul.appendChild(li); return; }
        var a = document.createElement("a");
        a.className = "ref"; a.href = n.url; a.target = "_blank"; a.rel = "noopener";
        a.textContent = s;
        var t = document.createElement("span");
        t.className = "t";
        t.textContent = n.title.replace(/^Requirement:\s*/, "");
        var st = document.createElement("span");
        st.className = "chip " + (n.stage ? "" : "stage-none");
        st.textContent = n.stage ? STAGE_SHORT[n.stage] || n.stage : "off board";
        li.appendChild(a); li.appendChild(t); li.appendChild(st);
        ul.appendChild(li);
      });
      box.appendChild(ul);
      grid.appendChild(box);
    });
    host.appendChild(grid);
  }

  /* ---------- view 5: goal x stage ---------- */
  function matrix(sel) {
    var host = document.querySelector(sel); if (!host) return;
    var cols = STAGES.concat(["off board"]);
    var rows = GOAL_ORDER.concat(["unclaimed"]);
    var open = all().filter(isOpen);
    function cnt(r, c) {
      return open.filter(function (n) {
        var g = n.goal || "unclaimed";
        var s = n.stage || "off board";
        return g === r && s === c;
      }).length;
    }
    var t = document.createElement("table");
    t.className = "matrix";
    var head = "<thead><tr><th>Goal</th>" + cols.map(function (c) { return "<th>" + (STAGE_SHORT[c] || c) + "</th>"; }).join("") + "<th>total</th></tr></thead>";
    var body = "<tbody>" + rows.map(function (r) {
      var vals = cols.map(function (c) { return cnt(r, c); });
      var tot = vals.reduce(function (a, b) { return a + b; }, 0);
      var label = r === "unclaimed" ? "unclaimed" : GOAL_META[r].label;
      return "<tr><td><span class='chip goalchip' style='background:" + color(r === "unclaimed" ? null : r) + "'>" +
        (r === "unclaimed" ? "?" : GOAL_META[r].glyph) + "</span> " + label + "</td>" +
        vals.map(function (v) { return "<td class='" + (v ? "" : "zero") + "'>" + v + "</td>"; }).join("") +
        "<td><b>" + tot + "</b></td></tr>";
    }).join("");
    var totals = cols.map(function (c) { return rows.reduce(function (a, r) { return a + cnt(r, c); }, 0); });
    body += "<tr class='total'><th>total</th>" + totals.map(function (v) { return "<td>" + v + "</td>"; }).join("") +
      "<td>" + totals.reduce(function (a, b) { return a + b; }, 0) + "</td></tr></tbody>";
    t.innerHTML = head + body;
    var sc = document.createElement("div");
    sc.className = "matrix-scroll";
    sc.appendChild(t);
    host.appendChild(sc);
  }

  /* ---------- counters used in prose ---------- */
  function stats() {
    var open = all().filter(isOpen);
    return {
      total: all().length,
      open: open.length,
      claimed: open.filter(function (n) { return n.goal; }).length,
      orphan: open.filter(function (n) { return !n.goal; }).length,
      orphanReq: open.filter(function (n) { return !n.goal && n.kind === "requirement"; }).length,
      offBoard: open.filter(function (n) { return !n.stage; }).length,
      goals: GOAL_ORDER.length
    };
  }

  function fillStats() {
    var s = stats();
    document.querySelectorAll("[data-stat]").forEach(function (el) {
      var k = el.getAttribute("data-stat");
      if (s[k] !== undefined) el.textContent = s[k];
    });
  }

  window.Atlas = { ridge: ridge, strata: strata, outline: outline, clusters: clusters, matrix: matrix, stats: stats, fillStats: fillStats };
  document.addEventListener("DOMContentLoaded", fillStats);
})();
