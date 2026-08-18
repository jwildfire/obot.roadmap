<!-- STATUS: Published to https://jwildfire.github.io/obot.roadmap/reports/org-chart/ on 2026-08-18 -->

# The Obot Org Chart

- What: the agent-framework org chart — roles, boundaries, triggers, and the failure that created each role — per requirement [hub#237](https://github.com/jwildfire/obot.roadmap/issues/237).
- As of: the morning of Monday 17 August 2026. The page carries its own as-of stamp and a staleness section; trust those over this file.
- Delivered first as a claude.ai Artifact for @jwildfire's review; built to be promoted to a hub page without a rewrite.

## Provenance

- Drafted by Claude Code using Fable 5 in an unattended worker session, Worker: W0032, dispatched by 🧭🤖 obot-navigator under hub#237.
- Research: a 4-agent workflow (sub-ids W0032.1–.4) read the decision artifacts (D0013, D0015–D0017, D0019), the obot.agent skills and tools, GitHub (hub#194/#212/#215/#220/#236/#237, obot.agent#102/#139/#162/#166/#167), and the local operating records (session notes 08-14→08-17, navigator-state, delivery record) — 333 sourced findings.
- The admiral's name came from @jwildfire on 2026-08-17 — first as "fleet" (tag 🚦🤖) mid-build, then as "admiral" (tag ⚓🤖) the same evening: *"I think we should call the fleet manager the admiral. prime, admiral and nav."* The page reflects the second name throughout (obot.agent#182). The tag moved with it because 🚦 already means "Release candidates needing review" in his own queue headline.
- Claim-checking: a 3-agent adversarial refutation pass (sub-ids W0032.5–.7) checked 97 claims on the drafted page against primary sources; 68 were confirmed and the rest corrected before publication — among them every weekday name (off by one day), a single uncommitted-work incident counted as two workers, a "never failed" claim the sweep's own log contradicts, and several boundary statements stated harder than their sources (the push-interrupt rule is agreed but unbuilt; the admiral's 30 minutes is a budget, not a hard cap; the Navigator is sole writer of verdicts, not of the whole delivery record). The lid-closed figure uses the measured 11h53m ("nearly twelve hours") rather than the rounded "thirteen hours" that appears in some retellings.

## How this page is built

Promoted from artifact to hub page on 2026-08-18 (Worker: W0057). Three mechanical changes, no edit to a word of the prose or a node of the chart:

- The document skeleton the artifact was authored without — `<!doctype html>`, `<html lang="en">`, `<head>`, `<body>` — wrapped around the existing `<title>`, description and styles.
- `<meta name="viewport" content="width=device-width, initial-scale=1">`, which 46 of the hub's 47 report pages already carry. Without it the page laid out at ~980px on a phone.
- The diagram, rendered.

The chart's source is [`chart.mmd`](chart.mmd) — the Mermaid block the artifact carried, with its HTML entities decoded and nothing else changed. `index.html` holds that source rendered to a static inline SVG. The hub has no Mermaid renderer and the site publishes `reports/` as-is with no external assets, so the alternative was vendoring a 3.5 MB script into the page; a build-time render keeps the page dependency-free and leaves the diagram readable with JavaScript off.

To change the chart, edit `chart.mmd`, re-render, and replace the `<svg id="org-chart-diagram">` element in `index.html`:

```
# mermaid 11, in a local page that inlines chart.mmd into <pre class="mermaid">, with
# mermaid.initialize({ htmlLabels: false, flowchart: { useMaxWidth: false, htmlLabels: false } })
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new \
  --virtual-time-budget=15000 --allow-file-access-from-files --dump-dom file:///path/to/harness.html
```

`htmlLabels: false` makes every label a real SVG `<text>` rather than an HTML `<foreignObject>`, so the page's own CSS cannot reach inside the diagram; `useMaxWidth: false` keeps the diagram at its rendered 845×904 rather than scaling it to a phone's width, where the labels would be about 5px tall. It fits the 960px column on a desktop and scrolls horizontally inside its figure at 390px, which is what `.fig{overflow-x:auto}` was written for.

Verified at a 390px viewport: no page-level horizontal scroll, the diagram scrolling inside its own figure, nothing else overflowing.

---

This README was drafted by Claude Code using Fable 5 (Worker: W0032) and reviewed by @jwildfire. The build section above was written by Claude Code using Opus 5 (Worker: W0057) when the page was promoted.
