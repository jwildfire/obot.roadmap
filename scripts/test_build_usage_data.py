"""Tests for build_usage_data.py — the prices, and the rule that a rebuild never
publishes less than is already published.

    python3 -m unittest discover -s scripts -p 'test_*.py'

Each test builds a throwaway transcript store in a temp directory, so nothing
here reads the real one.
"""
import contextlib
import io
import json
import sys
import tempfile
import unittest
from pathlib import Path
from unittest import mock

sys.path.insert(0, str(Path(__file__).resolve().parent))
import build_usage_data as b  # noqa: E402

M = 1_000_000
PREFIX = "-store"


def usage(inp=0, out=0, read=0, w5m=0, w1h=0, speed=None):
    u = {
        "input_tokens": inp, "output_tokens": out, "cache_read_input_tokens": read,
        "cache_creation_input_tokens": w5m + w1h,
        "cache_creation": {"ephemeral_5m_input_tokens": w5m, "ephemeral_1h_input_tokens": w1h},
    }
    if speed:
        u["speed"] = speed
    return u


class Store:
    """A transcript store on disk: one .jsonl per session."""

    def __init__(self, root):
        self.dir = Path(root) / "projects" / f"{PREFIX}-repo"
        self.dir.mkdir(parents=True)
        self.projects = self.dir.parent
        self.n = 0

    def session(self, sid, title, calls, model="claude-opus-5"):
        """calls: [(day, output_tokens)] — one API call each."""
        lines = [{"type": "custom-title", "sessionId": sid, "customTitle": title}]
        for day, out in calls:
            self.n += 1
            lines.append({
                "type": "assistant", "sessionId": sid, "requestId": f"req_{self.n}",
                "timestamp": f"{day}T12:00:00.000Z",
                "message": {"model": model, "usage": usage(inp=100, out=out, read=1000)},
            })
        (self.dir / f"{sid}.jsonl").write_text("".join(json.dumps(x) + "\n" for x in lines))

    def prune(self, sid):
        (self.dir / f"{sid}.jsonl").unlink()


class Case(unittest.TestCase):
    def setUp(self):
        tmp = tempfile.TemporaryDirectory()
        self.addCleanup(tmp.cleanup)
        self.root = Path(tmp.name)
        self.store = Store(self.root)
        self.out = self.root / "usage.json"
        self.overrides = self.root / "overrides.json"
        self.overrides.write_text("{}")
        # The real machine's background-job names must not leak into a test.
        patch = mock.patch.object(b, "JOBS", self.root / "no-jobs")
        patch.start()
        self.addCleanup(patch.stop)

    def run_build(self, *extra):
        """Run the CLI; returns (exit code, stdout, stderr)."""
        out, err = io.StringIO(), io.StringIO()
        with contextlib.redirect_stdout(out), contextlib.redirect_stderr(err):
            code = b.main(["--projects-dir", str(self.store.projects), f"--prefix={PREFIX}",
                           "--out", str(self.out), "--label-overrides", str(self.overrides),
                           *extra])
        return code, out.getvalue(), err.getvalue()

    def doc(self):
        return json.loads(self.out.read_text())

    def calls_by_day(self):
        return {d: s["calls"] for d, s in b.day_sums(self.doc()["cells"]).items()}

    def assert_models_add_up(self):
        """The model table and the per-day split both equal the sum of the cells."""
        doc = self.doc()
        self.assertEqual(sum(m["calls"] for m in doc["models"]), doc["totals"]["calls"])
        self.assertAlmostEqual(sum(m["cost"] for m in doc["models"]), doc["totals"]["cost"], places=2)
        self.assertTrue(all(m["calls"] >= 0 and m["cost"] >= 0 for m in doc["models"]))


class Prices(unittest.TestCase):
    def test_opus_5_5_list_prices(self):
        # https://platform.claude.com/docs/en/about-claude/pricing, 2026-10-05:
        # $4 in, $20 out, $0.20 cache hit, $5 five-minute write, $8 one-hour write.
        p = lambda **kw: b.price("claude-opus-5-5", None, usage(**kw))
        self.assertAlmostEqual(p(inp=M), 4.00)
        self.assertAlmostEqual(p(out=M), 20.00)
        self.assertAlmostEqual(p(read=M), 0.20)
        self.assertAlmostEqual(p(w5m=M), 5.00)
        self.assertAlmostEqual(p(w1h=M), 8.00)

    def test_cache_read_rates_per_model(self):
        read = lambda model: b.price(model, None, usage(read=M))
        self.assertAlmostEqual(read("claude-opus-5"), 0.50)
        self.assertAlmostEqual(read("claude-fable-5"), 1.00)
        self.assertAlmostEqual(read("claude-fable-5-1"), 0.25)
        self.assertAlmostEqual(read("claude-sonnet-5"), 0.20)
        self.assertAlmostEqual(read("claude-haiku-4-5"), 0.10)

    def test_fast_mode_stacks_with_the_cache_multiplier(self):
        fast = lambda **kw: b.price("claude-opus-5-5", "fast", usage(speed="fast", **kw))
        self.assertAlmostEqual(fast(inp=M), 8.00)
        self.assertAlmostEqual(fast(out=M), 40.00)
        self.assertAlmostEqual(fast(read=M), 0.40)

    def test_every_special_case_names_a_priced_model(self):
        for table in (b.FAST_PRICES, b.CACHE_READ_MULT):
            self.assertLessEqual(set(table), set(b.PRICES))

    def test_an_unknown_model_costs_nothing_rather_than_guessing(self):
        self.assertEqual(b.price("claude-not-yet", None, usage(inp=M, out=M)), 0.0)


class Merge(Case):
    def test_first_run_writes_the_scan_with_a_per_day_model_split(self):
        self.store.session("aaaaaaaa-1", "Alpha", [("2026-09-01", 10), ("2026-09-02", 10)])
        code, _, _ = self.run_build()
        self.assertEqual(code, 0)
        doc = self.doc()
        self.assertEqual(doc["totals"]["calls"], 2)
        self.assertEqual({r["day"] for r in doc["dayModels"]}, {"2026-09-01", "2026-09-02"})
        self.assert_models_add_up()

    def test_a_pruned_store_keeps_every_published_day_and_adds_the_new_ones(self):
        self.store.session("aaaaaaaa-1", "Alpha", [("2026-09-01", 10)] * 5)
        self.store.session("bbbbbbbb-1", "Beta", [("2026-09-01", 10)] * 3, model="claude-fable-5")
        self.assertEqual(self.run_build()[0], 0)
        before = self.doc()

        # The store forgets Alpha; a new day arrives.
        self.store.prune("aaaaaaaa-1")
        self.store.session("cccccccc-1", "Gamma", [("2026-09-03", 10)] * 2)
        code, out, _ = self.run_build()
        self.assertEqual(code, 0)
        self.assertIn("2026-09-01: kept as published (8 calls; the store now holds 3)", out)
        self.assertEqual(self.calls_by_day(), {"2026-09-01": 8, "2026-09-03": 2})
        after = self.doc()
        day1 = lambda d: [c for c in d["cells"] if c["day"] == "2026-09-01"]
        self.assertEqual(day1(after), day1(before))
        self.assertEqual(after["totals"]["agents"], 3)
        self.assert_models_add_up()

    def test_a_day_the_store_holds_more_of_replaces_the_published_one(self):
        # The last published day is always a partial one: the session kept going.
        self.store.session("aaaaaaaa-1", "Alpha", [("2026-09-01", 10)] * 2)
        self.run_build()
        self.store.session("aaaaaaaa-1", "Alpha", [("2026-09-01", 10)] * 6)
        code, out, _ = self.run_build()
        self.assertEqual(code, 0)
        self.assertIn("2026-09-01: 2 → 6 calls", out)
        self.assertEqual(self.calls_by_day(), {"2026-09-01": 6})
        self.assert_models_add_up()

    def test_a_day_published_without_a_split_is_never_exchanged(self):
        self.store.session("aaaaaaaa-1", "Alpha", [("2026-09-01", 10)] * 2)
        self.run_build()
        legacy = self.doc()
        del legacy["dayModels"]          # the shape of every file before 2026-10-05
        del legacy["source"]
        self.out.write_text(json.dumps(legacy))
        self.store.session("aaaaaaaa-1", "Alpha", [("2026-09-01", 10)] * 6)
        code, out, _ = self.run_build()
        self.assertEqual(code, 0)
        self.assertIn("published without a per-model split", out)
        self.assertEqual(self.calls_by_day(), {"2026-09-01": 2})
        self.assert_models_add_up()

    def test_an_unchanged_store_leaves_the_file_alone(self):
        self.store.session("aaaaaaaa-1", "Alpha", [("2026-09-01", 10)])
        self.run_build()
        before = self.out.read_text()
        code, out, _ = self.run_build()
        self.assertEqual(code, 0)
        self.assertIn("unchanged", out)
        self.assertEqual(self.out.read_text(), before)

    def test_a_label_override_is_published_instead_of_the_session_title(self):
        self.store.session("aaaaaaaa-1", "A title that must stay private", [("2026-09-01", 10)])
        self.overrides.write_text(json.dumps({"_readme": "ignored", "aaaaaaaa": "neutral label"}))
        self.run_build()
        self.assertEqual([c["agent"] for c in self.doc()["cells"]], ["neutral label"])
        self.assertNotIn("private", self.out.read_text())


class Guard(Case):
    def test_a_rebuild_that_would_shrink_a_published_day_fails_and_writes_nothing(self):
        self.store.session("aaaaaaaa-1", "Alpha", [("2026-09-01", 1000)] * 4)
        self.run_build()
        before = self.out.read_text()
        # The same day rebuilt at a lower price: as many calls, so the merge would
        # take it, and the published day's cost would go down.
        cheaper = {**b.PRICES, "claude-opus-5": (0.50, 2.50)}
        with mock.patch.object(b, "PRICES", cheaper):
            code, _, err = self.run_build()
            self.assertEqual(code, 1)
            self.assertIn("refusing to write", err)
            self.assertIn("2026-09-01: cost", err)
            self.assertEqual(self.out.read_text(), before)
            # A deliberate price correction is the one waiver, and only for cost.
            self.assertEqual(self.run_build("--allow-lower-cost")[0], 0)
        self.assertNotEqual(self.out.read_text(), before)

    def test_the_check_names_every_way_a_day_can_get_smaller(self):
        cell = lambda **over: {"day": "2026-09-01", "agent": "A", "role": "lead", "input": 1,
                               "output": 1, "cacheRead": 10, "cacheWrite": 0, "cost": 1.0,
                               "calls": 5, "subCalls": 0, "subCost": 0, **over}
        old = {"cells": [cell(), cell(day="2026-09-02")], "models": []}
        b.check_not_shrunk(old, {"cells": old["cells"] + [cell(day="2026-09-03")], "models": []})
        for worse, says in (
            ([cell(calls=4), cell(day="2026-09-02")], "2026-09-01: calls 5 → 4"),
            ([cell(cacheRead=9), cell(day="2026-09-02")], "2026-09-01: tokens 12 → 11"),
            ([cell(cost=0.5), cell(day="2026-09-02")], "2026-09-01: cost $1.00 → $0.50"),
            ([cell()], "2026-09-02: published with 5 calls, missing"),
        ):
            with self.assertRaises(b.ShrinkError) as caught:
                b.check_not_shrunk(old, {"cells": worse, "models": []})
            self.assertIn(says, str(caught.exception))
        # Waiving cost never waives calls or tokens.
        with self.assertRaises(b.ShrinkError):
            b.check_not_shrunk(old, {"cells": [cell(calls=4), cell(day="2026-09-02")], "models": []},
                               allow_lower_cost=True)

    def test_a_file_that_will_not_parse_is_not_overwritten(self):
        self.store.session("aaaaaaaa-1", "Alpha", [("2026-09-01", 10)])
        self.out.write_text("{ not json")
        with self.assertRaises(SystemExit) as caught:
            self.run_build()
        self.assertIn("will not be overwritten", str(caught.exception))
        self.assertEqual(self.out.read_text(), "{ not json")

    def test_two_stores_are_never_mixed_in_one_file(self):
        self.store.session("aaaaaaaa-1", "Alpha", [("2026-09-01", 10)])
        self.run_build()
        with self.assertRaises(SystemExit) as caught:
            self.run_build("--source", "cloud:repo:abc")
        self.assertIn("refusing to mix", str(caught.exception))


if __name__ == "__main__":
    unittest.main()
