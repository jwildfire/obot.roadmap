#!/usr/bin/env python3
"""Inject portfolio metrics into _site/index.html at the METRICS placeholder.

Successor to build_dashboard.py (the standalone dashboard page was retired 2026-07-04;
its Jeremy-queue code lives in git history if it comes back). Metrics are recomputed
from scratch on every run; nothing is stored between runs. Requires GITHUB_TOKEN.
"""
from __future__ import annotations

import json
import os
import urllib.parse
import urllib.request
from datetime import datetime, timedelta, timezone
from pathlib import Path
from zoneinfo import ZoneInfo

ROOT = Path(__file__).resolve().parents[1]
OWNER = "jwildfire"
REPOS = ["obot.roadmap", "safety.agent", "safety.viz", "gsm.safety", "safety-histogram"]
TOKEN = os.environ.get("GITHUB_TOKEN") or os.environ.get("GH_TOKEN") or ""
REPO_QUALIFIER = " ".join(f"repo:{OWNER}/{r}" for r in REPOS)
PLACEHOLDER = "<!-- METRICS: replaced at deploy time by scripts/build_metrics.py -->"

# Frozen at the hub's last nightly briefing (2026-06-11); scope: public obot-claw repos.
HUB_BASELINE = [("267", "commits"), ("18", "PRs merged"), ("11,855", "tracked lines"), ("2", "releases")]


def api(url: str, payload: dict | None = None) -> dict:
    req = urllib.request.Request(
        url,
        data=json.dumps(payload).encode() if payload else None,
        headers={
            "Authorization": f"Bearer {TOKEN}",
            "Accept": "application/vnd.github+json",
            "User-Agent": "obot-metrics-builder",
        },
    )
    with urllib.request.urlopen(req) as res:
        return json.load(res)


def search(query: str) -> dict:
    q = urllib.parse.quote(f"{query} {REPO_QUALIFIER}")
    return api(f"https://api.github.com/search/issues?per_page=50&q={q}")


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


stamp = datetime.now(ZoneInfo("America/New_York")).strftime("%Y-%m-%d %H:%M %Z")

section = f"""<h2>Key metrics</h2>
<p class="meta">Scope: {", ".join(f"{OWNER}/{r}" for r in REPOS)}. Generated {stamp}; regenerates daily via <code>deploy-site.yml</code>.</p>
<div class="metric-row">
{tiles(metrics())}
</div>

<h3>Historical baseline — obot-claw hub</h3>
<p class="meta">Frozen at the last nightly briefing (2026-06-11); scope: public obot-claw repos.</p>
<div class="metric-row">
{tiles(HUB_BASELINE, "metric baseline")}
</div>"""

index = ROOT / "_site" / "index.html"
html = index.read_text()
if PLACEHOLDER not in html:
    raise SystemExit(f"metrics: placeholder not found in {index}")
index.write_text(html.replace(PLACEHOLDER, section))
print("metrics: injected into index.html")
