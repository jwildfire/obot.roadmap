#!/usr/bin/env python3
"""Aggregate this machine's Claude Code token usage for the obot2 workspace into
site/usage/usage.json — the data behind the roadmap page's Cost section.

The source is the local transcript store (~/.claude/projects/<slugged-cwd>/*.jsonl),
which only exists on @jwildfire's machine. The site build cannot regenerate it, so
the output is committed and refreshed by re-running this script locally:

    python3 scripts/build_usage_data.py            # writes site/usage/usage.json
    python3 scripts/build_usage_data.py --dry-run  # print the summary, write nothing

What counts as one API call
---------------------------
Every assistant message carries a `usage` object, and one API response is written
to several transcript lines — so counting lines double-counts. Calls are deduped by
(file, requestId), keeping the **last** record in the group.

Last, not first: the repeated lines are not always identical. In main-session
transcripts each content block of a response repeats the same final usage, but in
sub-agent and workflow transcripts the lines are *streaming progress snapshots* of
one message — `input_tokens` and the cache counts stay fixed while `output_tokens`
climbs from a placeholder to its final value. Across this store, all 18,773
requestId groups hold exactly one message id and have monotonically non-decreasing
`output_tokens`, so the last record is the complete one. Keeping the first instead
undercounts output by ~5.7M tokens (~41% of the total).

Sub-agent (Agent tool) transcripts live in `<sessionId>/subagents/agent-*.jsonl`
and carry their own usage. They are billed to the parent session's agent — a
sub-agent is work that agent delegated — and tracked separately so the share is
reportable rather than hidden.

Pricing
-------
Rates are per million tokens, from the Claude API pricing table (see PRICES).
Cache multipliers are applied to the model's *input* rate:

    cache read           0.10x
    cache write, 5m TTL  1.25x
    cache write, 1h TTL  2.00x

Costs are list-price arithmetic over recorded token counts — what this usage
would bill at API rates. It is not a copy of an invoice.
"""
import argparse
import collections
import json
import os
import re
import sys
from pathlib import Path

HOME = Path.home()
PROJECTS = HOME / ".claude" / "projects"
JOBS = HOME / ".claude" / "jobs"
# Every session whose cwd was the obot2 workspace or anything under it — the repos
# and the per-branch worktrees each get their own slugged project directory.
PROJECT_PREFIX = "-Users-jwildfire-Documents-obot2"

# Per-million-token rates. `input` also prices cache traffic via CACHE_MULT.
PRICES = {
    "claude-opus-5": (5.00, 25.00),
    "claude-opus-4-8": (5.00, 25.00),
    "claude-opus-4-7": (5.00, 25.00),
    "claude-opus-4-6": (5.00, 25.00),
    "claude-opus-4-5": (5.00, 25.00),
    "claude-fable-5": (10.00, 50.00),
    "claude-mythos-5": (10.00, 50.00),
    # Sonnet 5 introductory pricing runs through 2026-08-31 ($2/$10); list is
    # $3/$15. Every session here falls inside the intro window, so intro is what
    # this usage bills at.
    "claude-sonnet-5": (2.00, 10.00),
    "claude-sonnet-4-6": (3.00, 15.00),
    "claude-haiku-4-5": (1.00, 5.00),
}
# Fast mode is a premium tier on the Opus models, not a separate model id.
FAST_PRICES = {
    "claude-opus-5": (10.00, 50.00),
    "claude-opus-4-8": (10.00, 50.00),
}
# `<synthetic>` marks a message the CLI generated locally (an API error notice, a
# cancellation) — no request was made, so no tokens are billed.
FREE_MODELS = {"<synthetic>", None, ""}

CACHE_MULT = {"read": 0.10, "write5m": 1.25, "write1h": 2.00}

# Session-framework identity tags (memory: bg-session-identity). The emoji prefix
# on an agent's name is its role, which is what the chart colors by.
ROLES = [
    ("lead", "\U0001f63a\U0001f916"),        # 😺🤖 the lead / main session
    ("sibling", "\U0001f46f\U0001f916"),     # 👯🤖 spawned background siblings
    ("ultracode", "⚡️\U0001f916"), # ⚡️🤖 ultracode workflow jobs
    ("ultracode", "⚡\U0001f916"),       # ⚡🤖 same tag without the VS16
    ("auto", "\U0001f9be\U0001f916"),        # 🦾🤖 fully autonomous sessions
]
ROLE_LABELS = {
    "lead": "Lead session",
    "sibling": "Background sibling",
    "ultracode": "Ultracode job",
    "auto": "Autonomous session",
    "interactive": "Interactive / untagged",
}
# Sessions predating the identity convention (and ordinary interactive ones) carry
# no role tag, only a conversation title. They still get their own segment — the
# chart colors by role, not by agent, so a long tail of one-off names costs the
# legend nothing and keeps "one segment = one agent" true for every bar.
UNTITLED = "Untitled session"
LABEL_MAX = 48


# Transcript record types that name a session, best identity first. `agent-name`
# is the session-framework name set via `claude -n`; the two title kinds are the
# CLI's own (user-set, then model-generated) and are all an untagged session has.
TITLE_RECORDS = {
    "agent-name": "agentName",
    "custom-title": "customTitle",
    "ai-title": "aiTitle",
}
TITLE_PRIORITY = ["agent-name", "custom-title", "ai-title"]


def normalize_model(model):
    """Collapse a dated snapshot id onto the alias PRICES is keyed by.

    Transcripts record whichever id the request used, so the same model can appear
    as both `claude-haiku-4-5` and `claude-haiku-4-5-20251001`. Pricing is per
    model, not per snapshot, so the two must not split into separate rows.
    """
    if not model:
        return model
    if model in PRICES or model in FREE_MODELS:
        return model
    stripped = re.sub(r"-\d{8}$", "", model)
    return stripped if stripped in PRICES else model


def role_of(name):
    if not name:
        return "interactive"
    for role, tag in ROLES:
        if name.startswith(tag):
            return role
    return "interactive"


def job_names():
    """sessionId prefix -> agent name, from the background-job state files.

    A session that never wrote an `agent-name` record (it was renamed only in
    state.json, or the record predates the field) still resolves here. Job
    directories are named with the first segment of the session UUID.
    """
    out = {}
    if not JOBS.is_dir():
        return out
    for d in sorted(JOBS.iterdir()):
        state = d / "state.json"
        if not state.is_file():
            continue
        try:
            name = json.loads(state.read_text()).get("name")
        except (OSError, ValueError):
            continue
        if name:
            out[d.name] = name
    return out


def price(model, speed, usage):
    """Dollar cost of one API call."""
    if model in FREE_MODELS:
        return 0.0
    table = FAST_PRICES if speed == "fast" and model in FAST_PRICES else PRICES
    rate = table.get(model)
    if rate is None:
        return 0.0  # unknown model — counted in tokens, flagged in the summary
    rate_in, rate_out = rate
    creation = usage.get("cache_creation") or {}
    w1h = creation.get("ephemeral_1h_input_tokens", 0)
    w5m = creation.get("ephemeral_5m_input_tokens", 0)
    if not creation:
        # No split recorded: bill the whole write at the 5-minute rate (the
        # cheaper of the two, so this cannot inflate the total).
        w5m = usage.get("cache_creation_input_tokens", 0)
    return (
        usage.get("input_tokens", 0) * rate_in
        + usage.get("output_tokens", 0) * rate_out
        + usage.get("cache_read_input_tokens", 0) * rate_in * CACHE_MULT["read"]
        + w5m * rate_in * CACHE_MULT["write5m"]
        + w1h * rate_in * CACHE_MULT["write1h"]
    ) / 1_000_000


def blank():
    return {
        "input": 0, "output": 0, "cacheRead": 0, "cacheWrite": 0,
        "cost": 0.0, "calls": 0, "subCalls": 0, "subCost": 0.0,
    }


def add(bucket, usage, cost, is_sub):
    creation = usage.get("cache_creation") or {}
    write = (
        creation.get("ephemeral_1h_input_tokens", 0)
        + creation.get("ephemeral_5m_input_tokens", 0)
    ) or usage.get("cache_creation_input_tokens", 0)
    bucket["input"] += usage.get("input_tokens", 0)
    bucket["output"] += usage.get("output_tokens", 0)
    bucket["cacheRead"] += usage.get("cache_read_input_tokens", 0)
    bucket["cacheWrite"] += write
    bucket["cost"] += cost
    bucket["calls"] += 1
    if is_sub:
        bucket["subCalls"] += 1
        bucket["subCost"] += cost


def scan(verbose=False):
    """Walk the transcript store and return per-(day, session) usage buckets."""
    if not PROJECTS.is_dir():
        sys.exit(f"no transcript store at {PROJECTS}")
    dirs = sorted(d for d in PROJECTS.iterdir()
                  if d.is_dir() and d.name.startswith(PROJECT_PREFIX))
    if not dirs:
        sys.exit(f"no project directories under {PROJECTS} match {PROJECT_PREFIX!r}")

    names = {}                                     # sessionId -> agent name
    cells = collections.defaultdict(blank)         # (day, sessionId) -> bucket
    models = collections.defaultdict(blank)        # model -> bucket
    unknown_models = collections.Counter()
    files = 0

    for d in dirs:
        for path in sorted(d.glob("**/*.jsonl")):
            files += 1
            # A sub-agent transcript sits under <sessionId>/subagents/; its own
            # records carry the parent sessionId, so no path parsing is needed.
            # A sub-agent transcript sits under <sessionId>/subagents/ (workflow
            # agents one level deeper still), so test for the segment, not the
            # immediate parent.
            is_sub = "subagents" in path.parts
            # requestId -> the call's last-seen record. A dict keyed by insertion
            # keeps the group's final snapshot and preserves file order.
            calls = {}
            loose = []          # records with no requestId (7 across the store)
            with path.open(errors="ignore") as fh:
                for line in fh:
                    try:
                        rec = json.loads(line)
                    except ValueError:
                        continue
                    kind = rec.get("type")
                    if kind in TITLE_RECORDS:
                        # Later records win: a session renamed mid-run should read
                        # as the name it ended up with.
                        value = rec.get(TITLE_RECORDS[kind])
                        if value:
                            names.setdefault(rec.get("sessionId"), {})[kind] = value
                        continue
                    msg = rec.get("message")
                    if not isinstance(msg, dict):
                        continue
                    usage = msg.get("usage")
                    if not usage:
                        continue
                    day = (rec.get("timestamp") or "")[:10]
                    sid = rec.get("sessionId")
                    if not (day and sid):
                        continue
                    entry = (day, sid, normalize_model(msg.get("model")), usage)
                    rid = rec.get("requestId")
                    if rid:
                        calls[rid] = entry   # later line replaces the earlier one
                    else:
                        loose.append(entry)

            for day, sid, model, usage in list(calls.values()) + loose:
                cost = price(model, usage.get("speed"), usage)
                if model not in FREE_MODELS and model not in PRICES:
                    unknown_models[model] += 1
                add(cells[(day, sid)], usage, cost, is_sub)
                add(models[model or "unknown"], usage, cost, is_sub)

    if verbose:
        print(f"scanned {files} transcripts in {len(dirs)} project directories",
              file=sys.stderr)
    return names, cells, models, unknown_models


def build(names, cells, models):
    from_state = job_names()
    # sessionId -> (label, role). Best available identity: the framework
    # `agent-name`, else the background job's state.json, else the conversation
    # title, else the session id. Only `agent-name`/state.json carry a role tag.
    ident = {}
    for (_day, sid) in cells:
        if sid in ident:
            continue
        titles = names.get(sid, {})
        tagged = titles.get("agent-name") or from_state.get(sid[:8])
        label = tagged or next(
            (titles[k] for k in TITLE_PRIORITY if titles.get(k)),
            f"{UNTITLED} {sid[:8]}",
        )
        # Titles are free text and some run long; the full name stays in the
        # tooltip via the detail table, so a display cap is safe here.
        if len(label) > LABEL_MAX:
            label = label[: LABEL_MAX - 1].rstrip() + "…"
        ident[sid] = (label, role_of(tagged))

    # One cell per (day, agent), so an agent that ran across two session ids (a
    # resumed session) is one segment rather than two.
    merged = collections.defaultdict(blank)
    for (day, sid), bucket in cells.items():
        label, role = ident[sid]
        target = merged[(day, label, role)]
        for k, v in bucket.items():
            target[k] += v

    out_cells = []
    for (day, label, role), b in sorted(merged.items()):
        out_cells.append({
            "day": day, "agent": label, "role": role,
            "input": b["input"], "output": b["output"],
            "cacheRead": b["cacheRead"], "cacheWrite": b["cacheWrite"],
            "cost": round(b["cost"], 4), "calls": b["calls"],
            "subCalls": b["subCalls"], "subCost": round(b["subCost"], 4),
        })

    model_rows = []
    for model, b in sorted(models.items(), key=lambda kv: -kv[1]["cost"]):
        rate = PRICES.get(model)
        model_rows.append({
            "model": model, "calls": b["calls"],
            "input": b["input"], "output": b["output"],
            "cacheRead": b["cacheRead"], "cacheWrite": b["cacheWrite"],
            "cost": round(b["cost"], 4),
            "rateIn": rate[0] if rate else None,
            "rateOut": rate[1] if rate else None,
        })

    def total(key):
        return sum(c[key] for c in out_cells)

    days = sorted({c["day"] for c in out_cells})
    return {
        "schema": 1,
        "project": "obot2",
        "days": days,
        "cells": out_cells,
        "models": model_rows,
        "roleLabels": ROLE_LABELS,
        "cacheMultipliers": CACHE_MULT,
        "totals": {
            "input": total("input"), "output": total("output"),
            "cacheRead": total("cacheRead"), "cacheWrite": total("cacheWrite"),
            "cost": round(total("cost"), 2),
            "calls": total("calls"), "subCalls": total("subCalls"),
            "subCost": round(total("subCost"), 2),
            "agents": len({c["agent"] for c in out_cells}),
            "activeDays": len(days),
            "first": days[0] if days else None,
            "last": days[-1] if days else None,
        },
    }


def main():
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    ap.add_argument("--out", default=None,
                    help="output path (default: site/usage/usage.json beside this script's repo)")
    ap.add_argument("--dry-run", action="store_true", help="print the summary, write nothing")
    args = ap.parse_args()

    names, cells, models, unknown = scan(verbose=True)
    if not cells:
        sys.exit("no usage records found — nothing to write")
    data = build(names, cells, models)

    t = data["totals"]
    billed = t["input"] + t["output"] + t["cacheRead"] + t["cacheWrite"]
    print(f"{t['first']} → {t['last']}  ({t['activeDays']} active days, "
          f"{t['agents']} agents, {t['calls']:,} API calls)")
    print(f"tokens: {billed:,} billed  "
          f"(in {t['input']:,} · out {t['output']:,} · "
          f"cache read {t['cacheRead']:,} · cache write {t['cacheWrite']:,})")
    print(f"cost:   ${t['cost']:,.2f}  "
          f"(sub-agents ${t['subCost']:,.2f} over {t['subCalls']:,} calls)")
    for m in data["models"]:
        print(f"  {m['model']:<20} ${m['cost']:>9,.2f}  {m['calls']:>6,} calls")
    if unknown:
        print(f"WARNING: unpriced models (counted as $0): {dict(unknown)}", file=sys.stderr)

    if args.dry_run:
        return
    out = Path(args.out) if args.out else (
        Path(__file__).resolve().parent.parent / "site" / "usage" / "usage.json")
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(data, indent=1, sort_keys=False) + "\n")
    print(f"wrote {out} ({out.stat().st_size:,} bytes)")


if __name__ == "__main__":
    main()
