<!-- STATUS: Drafted on 2026-08-17 (morning) -->

# The Obot Org Chart

- What: the agent-framework org chart — roles, boundaries, triggers, and the failure that created each role — per requirement [hub#237](https://github.com/jwildfire/obot.roadmap/issues/237).
- As of: the morning of Monday 17 August 2026. The page carries its own as-of stamp and a staleness section; trust those over this file.
- Delivered first as a claude.ai Artifact for @jwildfire's review; built to be promoted to a hub page without a rewrite.

## Provenance

- Drafted by Claude Code using Fable 5 in an unattended worker session, Worker: W0032, dispatched by 🧭🤖 obot-navigator under hub#237.
- Research: a 4-agent workflow (sub-ids W0032.1–.4) read the decision artifacts (D0013, D0015–D0017, D0019), the obot.agent skills and tools, GitHub (hub#194/#212/#215/#220/#236/#237, obot.agent#102/#139/#162/#166/#167), and the local operating records (session notes 08-14→08-17, navigator-state, delivery record) — 333 sourced findings.
- The fleet manager's name ("fleet", tag 🚦🤖) came from @jwildfire via the Navigator on 2026-08-17, mid-build; the page reflects it throughout.
- Claim-checking: a 3-agent adversarial refutation pass (sub-ids W0032.5–.7) checked 97 claims on the drafted page against primary sources; 68 were confirmed and the rest corrected before publication — among them every weekday name (off by one day), a single uncommitted-work incident counted as two workers, a "never failed" claim the sweep's own log contradicts, and several boundary statements stated harder than their sources (the push-interrupt rule is agreed but unbuilt; fleet's 30 minutes is a budget, not a hard cap; the Navigator is sole writer of verdicts, not of the whole delivery record). The lid-closed figure uses the measured 11h53m ("nearly twelve hours") rather than the rounded "thirteen hours" that appears in some retellings.

## Promotion notes (when this becomes a hub page)

- The file is authored artifact-shaped: `<title>` + `<meta name="description">` + inline styles + body content, no `<html>/<head>/<body>` wrapper. Promotion means adding the standard document skeleton around it — a mechanical wrap, not a rewrite.
- The diagram is a `<pre class="mermaid">` block. claude.ai artifacts render Mermaid natively; the hub currently has no Mermaid renderer, so promotion needs one of: a build-time render of the block to SVG, or a vendored mermaid script on the page (the site's no-external-assets rule rules out a CDN tag).
- The `<meta name="description">` required by `scripts/check_artifact_descriptions.mjs` is already present.
- Single-theme paper design, matching the house report pages; backgrounds painted explicitly.

---

This README was drafted by Claude Code using Fable 5 (Worker: W0032) and reviewed by @jwildfire.
