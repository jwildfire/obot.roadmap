#!/usr/bin/env python3
"""Aggregate one machine's Claude Code token usage into a usage file — the data
behind the analytics page's Cost section.

The source is a Claude Code transcript store (~/.claude/projects/<slugged-cwd>/*.jsonl).
Two kinds of machine hold one:

- @jwildfire's own, for local sessions. The site build cannot reach it, so the output
  is committed as site/usage/usage.json and refreshed by re-running this script there
  (scripts/usage/refresh_local.sh does that unattended, nightly):

      python3 scripts/build_usage_data.py            # merges into site/usage/usage.json
      python3 scripts/build_usage_data.py --dry-run  # print the summary, write nothing

  The store is not an archive: Claude Code deletes a transcript it has not touched
  for `cleanupPeriodDays` (30 by default), so a scan sees less of an old day than
  the scan that first published it. The run therefore MERGES into the file already
  there and never replaces it — see "Merging into what is published" below.

- A cloud session's container, for that session alone. The transcripts vanish with
  the container, so the session publishes its own fragment to the `session-state`
  branch before it ends (scripts/usage/publish_session_usage.sh), and the deploy
  merges every fragment with the committed file (scripts/lib/usage/merge.mjs).
  The flags below point the scan at a different store and name the source:

      python3 scripts/build_usage_data.py --projects-dir ~/.claude/projects \
          --prefix -home-user- --role cloud --agent "☁️ obot.roadmap · <branch>" \
          --source cloud:obot.roadmap:<session> --out fragment.json

Every output has the same shape (schema 1) whatever the store, plus a `source`
block naming where it came from, so the merge treats them alike.

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

Merging into what is published
------------------------------
When the output file already exists, the scan is folded into it day by day:

- a day only the file has is kept as published (its transcripts may be gone);
- a day only the scan has is added;
- a day both have goes to whichever counted more API calls — the scan on a tie,
  so a corrected label or price reaches a day the store still holds in full.

A day's per-model split travels with it (`dayModels`), which is what lets the
model table stay the sum of the days. A day published before the split was
recorded cannot be exchanged for a fuller scan of itself, because what to take
out of the model table is unknown; it is kept as published, with a warning.

Then the result is checked against the file it would replace, and the run stops
with an error — writing nothing — if any published day is missing or has fewer
calls or tokens, or a lower cost. `--allow-lower-cost` waives the cost check
only, for a deliberate downward price correction.

Session titles are free text and the page is public. `usage/label_overrides.json`
maps a session-id prefix to the label to publish instead; it is keyed by id so
the title being withheld never has to be written down in a public repository.

Pricing
-------
Rates are per million tokens, from the Claude API pricing table (see PRICES).
Cache multipliers are applied to the model's *input* rate:

    cache read           0.10x   (0.05x on Opus 5.5; 0.025x on Fable/Mythos 5.1)
    cache write, 5m TTL  1.25x
    cache write, 1h TTL  2.00x

Costs are list-price arithmetic over recorded token counts — what this usage
would bill at API rates. It is not a copy of an invoice.
"""
import argparse
import collections
import datetime
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

# Per-million-token rates (input, output). `input` also prices cache traffic via
# CACHE_MULT. Source: the model pricing table at
# https://platform.claude.com/docs/en/about-claude/pricing — every row here was
# checked against it on 2026-10-05.
PRICES = {
    "claude-opus-5-5": (4.00, 20.00),
    "claude-opus-5": (5.00, 25.00),
    "claude-opus-4-8": (5.00, 25.00),
    "claude-opus-4-7": (5.00, 25.00),
    "claude-opus-4-6": (5.00, 25.00),
    "claude-opus-4-5": (5.00, 25.00),
    "claude-fable-5": (10.00, 50.00),
    "claude-fable-5-1": (10.00, 50.00),
    "claude-mythos-5": (10.00, 50.00),
    "claude-mythos-5-1": (10.00, 50.00),
    "claude-sonnet-5-5": (2.00, 10.00),
    # Sonnet 5 launched at $2/$10 as introductory pricing through 2026-08-31; the
    # scheduled rise to $3/$15 was cancelled and $2/$10 is the standard price.
    "claude-sonnet-5": (2.00, 10.00),
    "claude-sonnet-4-6": (3.00, 15.00),
    "claude-sonnet-4-5": (3.00, 15.00),
    "claude-haiku-4-5": (1.00, 5.00),
}
# Fast mode is a premium tier on the Opus models, not a separate model id.
FAST_PRICES = {
    "claude-opus-5-5": (8.00, 40.00),
    "claude-opus-5": (10.00, 50.00),
    "claude-opus-4-8": (10.00, 50.00),
}
# `<synthetic>` marks a message the CLI generated locally (an API error notice, a
# cancellation) — no request was made, so no tokens are billed.
FREE_MODELS = {"<synthetic>", None, ""}

CACHE_MULT = {"read": 0.10, "write5m": 1.25, "write1h": 2.00}
# Models whose cache reads are priced below the standard 0.10x of input: Fable 5.1
# and Mythos 5.1 at 0.025x ($0.25/MTok), Opus 5.5 at 0.05x ($0.20/MTok). Kept as
# multipliers because they stack on the fast-mode input rate too.
CACHE_READ_MULT = {
    "claude-fable-5-1": 0.025,
    "claude-mythos-5-1": 0.025,
    "claude-opus-5-5": 0.05,
}
# Where a session's published label is replaced: session-id prefix -> label.
LABEL_OVERRIDES = Path(__file__).resolve().parent / "usage" / "label_overrides.json"

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
    # Cloud sessions carry no identity tag in their transcripts; the publish script
    # assigns the role with --role, since the store itself says it is a container.
    "cloud": "Cloud session",
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
        + usage.get("cache_read_input_tokens", 0)
        * rate_in * CACHE_READ_MULT.get(model, CACHE_MULT["read"])
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


def scan(projects=PROJECTS, prefix=PROJECT_PREFIX, verbose=False):
    """Walk the transcript store and return per-(day, session) usage buckets."""
    projects = Path(projects)
    if not projects.is_dir():
        sys.exit(f"no transcript store at {projects}")
    dirs = sorted(d for d in projects.iterdir()
                  if d.is_dir() and d.name.startswith(prefix))
    if not dirs:
        sys.exit(f"no project directories under {projects} match {prefix!r}")

    names = {}                                     # sessionId -> agent name
    cells = collections.defaultdict(blank)         # (day, sessionId) -> bucket
    models = collections.defaultdict(blank)        # model -> bucket
    day_models = collections.defaultdict(blank)    # (day, model) -> bucket
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
                add(day_models[(day, model or "unknown")], usage, cost, is_sub)

    if verbose:
        print(f"scanned {files} transcripts in {len(dirs)} project directories",
              file=sys.stderr)
    return names, cells, models, unknown_models, day_models


def label_overrides(path=LABEL_OVERRIDES):
    """session-id prefix -> the label to publish for that session."""
    try:
        raw = json.loads(Path(path).read_text())
    except FileNotFoundError:
        return {}
    return {k: v for k, v in raw.items() if not k.startswith("_")}


def model_row(model, b):
    rate = PRICES.get(model)
    return {
        "model": model, "calls": b["calls"],
        "input": b["input"], "output": b["output"],
        "cacheRead": b["cacheRead"], "cacheWrite": b["cacheWrite"],
        "cost": round(b["cost"], 4),
        "rateIn": rate[0] if rate else None,
        "rateOut": rate[1] if rate else None,
    }


def totals_of(cells):
    def total(key):
        return sum(c[key] for c in cells)
    days = sorted({c["day"] for c in cells})
    return days, {
        "input": total("input"), "output": total("output"),
        "cacheRead": total("cacheRead"), "cacheWrite": total("cacheWrite"),
        "cost": round(total("cost"), 2),
        "calls": total("calls"), "subCalls": total("subCalls"),
        "subCost": round(total("subCost"), 2),
        "agents": len({c["agent"] for c in cells}),
        "activeDays": len(days),
        "first": days[0] if days else None,
        "last": days[-1] if days else None,
    }


def build(names, cells, models, source=None, default_role="interactive",
          default_agent=None, day_models=None, overrides=None):
    """Assemble the output document.

    `source` names where the store came from (written through to the output so
    the merge can list it); `default_role` and `default_agent` apply to every
    session without an identity tag — a cloud container's store, where the
    transcripts carry no name and the publish script knows the session's handle.
    """
    from_state = job_names()
    overrides = label_overrides() if overrides is None else overrides
    # sessionId -> (label, role). Best available identity: the framework
    # `agent-name`, else the background job's state.json, else the conversation
    # title, else the session id. Only `agent-name`/state.json carry a role tag.
    ident = {}
    for (_day, sid) in cells:
        if sid in ident:
            continue
        titles = names.get(sid, {})
        tagged = titles.get("agent-name") or from_state.get(sid[:8])
        label = tagged or default_agent or next(
            (titles[k] for k in TITLE_PRIORITY if titles.get(k)),
            f"{UNTITLED} {sid[:8]}",
        )
        # Titles are free text and some run long; the full name stays in the
        # tooltip via the detail table, so a display cap is safe here.
        if len(label) > LABEL_MAX:
            label = label[: LABEL_MAX - 1].rstrip() + "…"
        role = role_of(tagged) if tagged else default_role
        # An override replaces the label only; the role still comes from the tag.
        ident[sid] = (overrides.get(sid[:8], label), role)

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

    model_rows = [model_row(model, b) for model, b in
                  sorted(models.items(), key=lambda kv: -kv[1]["cost"])]
    # The same split per day, so a merge can exchange one day for a fuller scan
    # of it and keep the model table equal to the sum of the days.
    day_rows = [{"day": day, **{k: v for k, v in model_row(model, b).items()
                                if k not in ("rateIn", "rateOut")}}
                for (day, model), b in sorted((day_models or {}).items())]

    days, totals = totals_of(out_cells)
    return {
        "schema": 1,
        "project": "obot2",
        "source": {
            "id": source or "local",
            "generatedAt": datetime.datetime.now(datetime.timezone.utc)
            .strftime("%Y-%m-%dT%H:%M:%SZ"),
        },
        "days": days,
        "cells": out_cells,
        "models": model_rows,
        "dayModels": day_rows,
        "roleLabels": ROLE_LABELS,
        "cacheMultipliers": CACHE_MULT,
        "cacheReadMultipliers": CACHE_READ_MULT,
        "totals": totals,
    }


MODEL_SUMS = ["calls", "input", "output", "cacheRead", "cacheWrite", "cost"]


class ShrinkError(Exception):
    """A write that would publish less than is already published."""


def day_sums(cells):
    """day -> {calls, tokens, cost} over that day's cells."""
    out = collections.defaultdict(lambda: {"calls": 0, "tokens": 0, "cost": 0.0})
    for c in cells:
        d = out[c["day"]]
        d["calls"] += c["calls"]
        d["tokens"] += c["input"] + c["output"] + c["cacheRead"] + c["cacheWrite"]
        d["cost"] += c["cost"]
    return out


def merge_published(old, new):
    """Fold a fresh scan (`new`) into the published file (`old`), day by day.

    Returns (merged document, notes). See "Merging into what is published" in
    the module docstring for the rule; the notes say what happened to each day
    both sides had, for the run's log.
    """
    def by_day(rows):
        out = collections.defaultdict(list)
        for r in rows or []:
            out[r["day"]].append(r)
        return out

    old_cells, new_cells = by_day(old["cells"]), by_day(new["cells"])
    old_split, new_split = by_day(old.get("dayModels")), by_day(new.get("dayModels"))
    old_sum, new_sum = day_sums(old["cells"]), day_sums(new["cells"])

    models = {m["model"]: {k: m[k] for k in MODEL_SUMS} for m in old["models"]}

    def shift(rows, sign):
        for r in rows:
            m = models.setdefault(r["model"], dict.fromkeys(MODEL_SUMS, 0))
            for k in MODEL_SUMS:
                m[k] += sign * r[k]

    cells, split, notes = [], [], []
    for day in sorted(set(old_cells) | set(new_cells)):
        take_new = day not in old_cells
        if day in old_cells and day in new_cells:
            fuller = new_sum[day]["calls"] >= old_sum[day]["calls"]
            if fuller and day not in old_split:
                if new_sum[day]["calls"] > old_sum[day]["calls"]:
                    notes.append(
                        f"{day}: kept as published ({old_sum[day]['calls']:,} calls) although "
                        f"the store now holds {new_sum[day]['calls']:,} — it was published "
                        "without a per-model split, so it cannot be exchanged")
            elif fuller:
                take_new = True
                shift(old_split[day], -1)
                if new_sum[day]["calls"] > old_sum[day]["calls"]:
                    notes.append(f"{day}: {old_sum[day]['calls']:,} → "
                                 f"{new_sum[day]['calls']:,} calls")
            else:
                notes.append(
                    f"{day}: kept as published ({old_sum[day]['calls']:,} calls; the store "
                    f"now holds {new_sum[day]['calls']:,})")
        if take_new:
            cells += new_cells[day]
            split += new_split[day]
            shift(new_split[day], +1)
        else:
            cells += old_cells[day]
            split += old_split[day]

    model_rows = []
    for model, m in sorted(models.items(), key=lambda kv: -kv[1]["cost"]):
        # Subtracting a day and adding it back leaves float dust; a count can
        # only go negative if a stored split was wrong, which the guard reports.
        b = {**blank(), **{k: m[k] for k in MODEL_SUMS}}
        model_rows.append(model_row(model, b))

    cells.sort(key=lambda c: (c["day"], c["agent"], c["role"]))
    days, totals = totals_of(cells)
    merged = {
        **new,
        "days": days, "cells": cells, "models": model_rows,
        "dayModels": sorted(split, key=lambda r: (r["day"], r["model"])),
        "totals": totals,
    }
    return merged, notes


def check_not_shrunk(old, new, allow_lower_cost=False):
    """Raise ShrinkError if `new` publishes less than `old` on any published day."""
    before, after = day_sums(old["cells"]), day_sums(new["cells"])
    problems = []
    for day in sorted(before):
        b, a = before[day], after.get(day)
        if a is None:
            problems.append(f"{day}: published with {b['calls']:,} calls, missing from the new file")
            continue
        for key, label in (("calls", "calls"), ("tokens", "tokens")):
            if a[key] < b[key]:
                problems.append(f"{day}: {label} {b[key]:,} → {a[key]:,}")
        if not allow_lower_cost and a["cost"] < b["cost"] - 0.005:
            problems.append(f"{day}: cost ${b['cost']:,.2f} → ${a['cost']:,.2f}")
    for m in new["models"]:
        if any(m[k] < 0 for k in MODEL_SUMS):
            problems.append(f"model {m['model']}: a total went negative in the merge")
    if problems:
        raise ShrinkError(
            "refusing to write: the new file would publish less than the one it replaces\n  "
            + "\n  ".join(problems))


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    ap.add_argument("--out", default=None,
                    help="output path (default: site/usage/usage.json beside this script's repo)")
    ap.add_argument("--dry-run", action="store_true", help="print the summary, write nothing")
    ap.add_argument("--projects-dir", default=str(PROJECTS),
                    help="the transcript store to scan (default: ~/.claude/projects)")
    ap.add_argument("--prefix", default=PROJECT_PREFIX,
                    help="only project directories whose name starts with this "
                         f"(default: {PROJECT_PREFIX!r})")
    ap.add_argument("--source", default=None,
                    help="source id written into the output (default: local)")
    ap.add_argument("--role", default="interactive", choices=sorted(ROLE_LABELS),
                    help="role for sessions with no identity tag (default: interactive)")
    ap.add_argument("--agent", default=None,
                    help="agent label for sessions with no identity tag "
                         "(default: the session's own title or id)")
    ap.add_argument("--allow-lower-cost", action="store_true",
                    help="let a published day's cost go down (a deliberate price "
                         "correction); calls and tokens may still never shrink")
    ap.add_argument("--label-overrides", default=str(LABEL_OVERRIDES),
                    help="JSON map of session-id prefix to the label to publish")
    args = ap.parse_args(argv)

    names, cells, models, unknown, day_models = scan(
        args.projects_dir, args.prefix, verbose=True)
    if not cells:
        sys.exit("no usage records found — nothing to write")
    data = build(names, cells, models, source=args.source,
                 default_role=args.role, default_agent=args.agent,
                 day_models=day_models,
                 overrides=label_overrides(args.label_overrides))

    out = Path(args.out) if args.out else (
        Path(__file__).resolve().parent.parent / "site" / "usage" / "usage.json")
    # The file already published, if any. Unreadable is not absent: a file that
    # exists and will not parse stops the run rather than being overwritten.
    old = None
    if out.is_file():
        try:
            old = json.loads(out.read_text())
        except ValueError as err:
            sys.exit(f"{out} exists but is not valid JSON ({err}) — fix or move it; "
                     "it will not be overwritten")
        old_id = (old.get("source") or {}).get("id", "local")
        if old_id != data["source"]["id"]:
            sys.exit(f"{out} holds source {old_id!r}, this run is "
                     f"{data['source']['id']!r} — refusing to mix two stores in one file")
        scanned = data["totals"]
        print(f"scanned: {scanned['first']} → {scanned['last']}, "
              f"{scanned['calls']:,} calls, ${scanned['cost']:,.2f} — merging into {out.name}")
        data, notes = merge_published(old, data)
        for note in notes:
            print(f"  {note}")
        try:
            check_not_shrunk(old, data, allow_lower_cost=args.allow_lower_cost)
        except ShrinkError as err:
            print(f"ERROR: {err}", file=sys.stderr)
            return 1

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
        return 0
    out.parent.mkdir(parents=True, exist_ok=True)
    # Leave the file alone when only the generation stamp would change, so the
    # nightly refresh commits nothing on a night with no new usage.
    if isinstance(old, dict) and same_but_stamp(old, data):
        print(f"unchanged {out} — kept the existing file")
        return 0
    out.write_text(json.dumps(data, indent=1, sort_keys=False) + "\n")
    print(f"wrote {out} ({out.stat().st_size:,} bytes)")
    return 0


def same_but_stamp(old, new):
    strip = lambda d: {**d, "source": {**(d.get("source") or {}), "generatedAt": None}}
    return strip(old) == strip(new)


if __name__ == "__main__":
    sys.exit(main())
