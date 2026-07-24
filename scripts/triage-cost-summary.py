#!/usr/bin/env python3
"""Summarize a headless `claude -p --output-format json` result for cost reporting.

Usage: triage-cost-summary.py [--footer-only] [path]
Prints the one-line cost footer; without --footer-only also prints a per-model
breakdown (evidence of the orchestrator/subagent delegation split).
Never exits nonzero on malformed input — prints a fallback line instead.
"""
import json
import sys

args = sys.argv[1:]
footer_only = "--footer-only" in args
paths = [a for a in args if not a.startswith("--")]
path = paths[0] if paths else "/tmp/claude-out.json"

try:
    with open(path) as f:
        d = json.load(f)
except Exception:
    print("🧮 run cost: unavailable (no usage data)")
    sys.exit(0)

u = d.get("usage") or {}
inp = sum(u.get(k) or 0 for k in ("input_tokens", "cache_creation_input_tokens", "cache_read_input_tokens"))
out = u.get("output_tokens") or 0
cost = d.get("total_cost_usd")


def fmt(n):
    return f"{n / 1000:.1f}k" if n >= 1000 else str(n)


line = f"🧮 run cost: {fmt(inp)} tokens in / {fmt(out)} out"
if isinstance(cost, (int, float)):
    line += f" · ~${cost:.2f}"
line += " (Fable 5 orchestrator + subagents)"
print(line)

if not footer_only:
    mu = d.get("modelUsage") or {}
    for m, v in mu.items():
        if not isinstance(v, dict):
            continue
        mi = v.get("inputTokens", v.get("input_tokens")) or 0
        mo = v.get("outputTokens", v.get("output_tokens")) or 0
        mc = v.get("costUSD", v.get("cost_usd"))
        seg = f"- {m}: {fmt(mi)} in / {fmt(mo)} out"
        if isinstance(mc, (int, float)):
            seg += f" · ${mc:.2f}"
        print(seg)
