#!/usr/bin/env python3
"""Generate _site/dashboard.html — the Jeremy queue plus portfolio metrics.

Successor to the obot-claw hub's update_metrics.py (design doc #7 §3.2). Metrics are
recomputed from scratch on every run; nothing is stored between runs. Requires
GITHUB_TOKEN. Reading sign-off gates from the user-level project additionally needs a
token with `project` read scope; that subsection is skipped silently without it.
"""
from __future__ import annotations

import json
import os
import urllib.parse
import urllib.request
from datetime import datetime, timedelta, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OWNER = "jwildfire"
REPOS = ["obot.roadmap", "safety.agent", "safety.viz", "gsm.safety", "safety-histogram"]
PROJECT_NUMBER = 1
TOKEN = os.environ.get("GITHUB_TOKEN") or os.environ.get("GH_TOKEN") or ""
REPO_QUALIFIER = " ".join(f"repo:{OWNER}/{r}" for r in REPOS)

# Frozen at the hub's last nightly briefing (2026-06-11); scope: public obot-claw repos.
HUB_BASELINE = [("267", "commits"), ("18", "PRs merged"), ("11,855", "tracked lines"), ("2", "releases")]


def api(url: str, payload: dict | None = None) -> dict:
    req = urllib.request.Request(
        url,
        data=json.dumps(payload).encode() if payload else None,
        headers={
            "Authorization": f"Bearer {TOKEN}",
            "Accept": "application/vnd.github+json",
            "User-Agent": "obot-dashboard-builder",
        },
    )
    with urllib.request.urlopen(req) as res:
        return json.load(res)


def search(query: str) -> dict:
    q = urllib.parse.quote(f"{query} {REPO_QUALIFIER}")
    return api(f"https://api.github.com/search/issues?per_page=50&q={q}")


def queue_items() -> list[str]:
    items = []
    for query, why in [
        ("is:open is:issue assignee:jwildfire", "assigned"),
        ("is:open is:pr review-requested:jwildfire draft:false", "review requested"),
    ]:
        for it in search(query)["items"]:
            repo = it["repository_url"].rsplit("/", 1)[-1]
            items.append(
                f'<li><a href="{it["html_url"]}">{repo}#{it["number"]}</a> — '
                f'{escape(it["title"])} <span class="meta">({why})</span></li>'
            )
    for issue in signoff_gates():
        items.append(issue)
    return items


def signoff_gates() -> list[str]:
    """Requirement issues sitting at a project Status that needs @jwildfire."""
    query = """
    query($login: String!, $number: Int!) {
      user(login: $login) { projectV2(number: $number) {
        items(first: 100) { nodes {
          fieldValueByName(name: "Status") { ... on ProjectV2ItemFieldSingleSelectValue { name } }
          content { ... on Issue { number title url state } }
        } }
      } }
    }"""
    try:
        data = api("https://api.github.com/graphql",
                   {"query": query, "variables": {"login": OWNER, "number": PROJECT_NUMBER}})
        nodes = data["data"]["user"]["projectV2"]["items"]["nodes"]
    except Exception:
        return []  # token lacks project scope — skip this subsection
    out = []
    for node in nodes:
        status = (node.get("fieldValueByName") or {}).get("name")
        issue = node.get("content") or {}
        if status in ("Design", "Review") and issue.get("state") == "OPEN":
            out.append(
                f'<li><a href="{issue["url"]}">obot.roadmap#{issue["number"]}</a> — '
                f'{escape(issue["title"])} <span class="meta">(sign-off: {status})</span></li>'
            )
    return out


def escape(s: str) -> str:
    return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


def metrics() -> list[tuple[str, str]]:
    since = (datetime.now(timezone.utc) - timedelta(days=30)).strftime("%Y-%m-%d")
    open_reqs = search("is:open is:issue label:requirement")["total_count"]
    open_prs = search("is:open is:pr")["total_count"]
    merged_30d = search(f"is:pr is:merged merged:>={since}")["total_count"]
    commits_30d = 0
    for repo in REPOS:
        try:
            data = api(f"https://api.github.com/repos/{OWNER}/{repo}/commits?since={since}T00:00:00Z&per_page=100")
            commits_30d += len(data)
        except Exception:
            pass  # repo may be empty or not yet created
    entries = sorted(p.stem for p in (ROOT / "diary").glob("*.md") if p.stem[0].isdigit())
    return [
        (str(open_reqs), "open requirements"),
        (str(open_prs), "open PRs"),
        (str(commits_30d), "commits, last 30d"),
        (str(merged_30d), "PRs merged, last 30d"),
        (entries[-1] if entries else "—", "last diary entry"),
    ]


def tiles(pairs: list[tuple[str, str]], cls: str = "metric") -> str:
    return "\n".join(f'<div class="{cls}"><strong>{v}</strong><span>{label}</span></div>'
                     for v, label in pairs)


queue = queue_items()
queue_html = "\n".join(queue) if queue else '<li class="meta">Nothing waiting on Jeremy. 🎉</li>'
stamp = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")

html = f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Dashboard · obot</title>
<link rel="stylesheet" href="assets/styles.css">
</head>
<body>
<header class="site">
  <h1>Dashboard</h1>
  <nav class="site">
    <a href="index.html">Home</a>
    <a href="roadmap.html">Roadmap</a>
    <a href="diary/">Diary</a>
    <a href="reports/">Reports</a>
  </nav>
</header>

<h2>🙋 Jeremy queue</h2>
<p class="meta">Everything across the portfolio waiting on @jwildfire.</p>
<ul class="queue">
{queue_html}
</ul>

<h2>Key metrics</h2>
<p class="meta">Scope: {", ".join(f"{OWNER}/{r}" for r in REPOS)}.</p>
<div class="metric-row">
{tiles(metrics())}
</div>

<h3>Historical baseline — obot-claw hub</h3>
<p class="meta">Frozen at the last nightly briefing (2026-06-11); scope: public obot-claw repos.</p>
<div class="metric-row">
{tiles(HUB_BASELINE, "metric baseline")}
</div>

<footer class="site">Generated {stamp} · regenerates daily via <code>deploy-site.yml</code>.</footer>
</body>
</html>
"""

out = ROOT / "_site" / "dashboard.html"
out.parent.mkdir(exist_ok=True)
out.write_text(html)
print(f"dashboard: {len(queue)} queue items")
