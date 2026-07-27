# open.csr text-block editor — live protocol

A twelve-step walkthrough of the text-block editor shipped in [open.csr#9](https://github.com/jwildfire/open.csr/pull/9) — part B of requirement [#113](https://github.com/jwildfire/obot.roadmap/issues/113), the *reader → editor* increment named in its Design section.

**Live:** https://jwildfire.github.io/obot.roadmap/reports/open-csr-text-editor-2026-07-26/

## What it is, and why it is not a screencast

The editor's whole claim is that **the browser runs the build's gates rather than a copy of them** — an edit that passes as you type passes CI. A recording of that claim is only a picture of it, so this page inlines the code instead:

| Inlined, unmodified | From |
|---|---|
| Binding grammar, ARD resolution, value formatting, token substitution, all three gates of contracts §6 | [`site/demo/text-core.js`](https://github.com/jwildfire/open.csr/blob/dev/site/demo/text-core.js) |
| Frontmatter split, live evaluation, preview segmentation, LCS line diff, unified diff, patch composition | [`site/demo/editor-core.js`](https://github.com/jwildfire/open.csr/blob/dev/site/demo/editor-core.js) |
| 84 ARD rows, columns trimmed to what resolution reads | `outputs/t-disposition/v001/ard.json` (CDISCPILOT01) |
| Two prose blocks, verbatim | `library/text/TXT-E3-1101.md`, `TXT-E3-0502.md` |

Both editors on the page are live: type anything into either and the real gates evaluate it. The steps only type for you.

## The protocol

Each step declares a machine-checkable expectation, runs it, and stamps ✓ or ✗ on itself with the observed values — a self-verifying demo rather than an illustrated one. **Run all 12 steps** walks the whole protocol and tallies it; it reads 12/12 against `bb58906`.

| Phase | Steps |
|---|---|
| Read | the block as committed — 4/4 bindings resolved |
| The fidelity gate | a number typed by hand fails; the same number bound passes |
| When a binding is wrong | under-specified (ambiguous, 4 rows) · statistic not in the ARD (orphaned) · malformed address · a display the block never declared |
| Presentation is part of the address | a proportion unrounded (warning) · `scale=100;digits=1` → 67.4 |
| The patch | reword a sentence → a hunk at line 14 or later, no frontmatter in the diff |
| Two blocks, one patch | a block with no bindings fails on a typed digit; an `allow_digits` literal is exempt and counted |

## Sources

- Code, data and prose: `jwildfire/open.csr` at [`bb58906`](https://github.com/jwildfire/open.csr/commit/bb58906) — the merge of PR #9 into `dev`. Nothing was rewritten for the page; the build script pulls each file from the checkout.
- The screenshot below the bench is the editor in the Demo app's Text pane, captured from a local build of the same commit.
- Requirements `TXT-EDIT-001` … `TXT-EDIT-012` in [`quality/requirements/text.md`](https://github.com/jwildfire/open.csr/blob/dev/quality/requirements/text.md); the design rationale is [`docs/design/design.md` §13](https://github.com/jwildfire/open.csr/blob/dev/docs/design/design.md).

## How it was assembled

A build script reads `text-core.js`, `editor-core.js`, the published ARD payload and both block sources from the checkout and substitutes them into a template, asserting that every placeholder was consumed and that no inlined script could close its own tag. Two copies come out: this one, which declares its own charset, and an artifact copy whose non-ASCII is escaped per region because the artifact host owns `<head>`. Regenerating against a later commit is one command.

## Assumptions and limits

- The page states these itself, in a **What is staged** panel: the ARD is inlined rather than fetched (the app loads it from `demo/ard/<slug>.json` when a block is opened); only 2 of the library's 14 blocks are present; the site navigation, block provenance and binding tables are omitted.
- Numbers shown are demo numbers — CDISCPILOT01, the xanomeline Alzheimer's study.
- The editor writes nothing and approves nothing. Frontmatter never reaches the browser and patch hunks are offset past it, so no patch composed here can change a block's tier, approval state or digit allowlist. In-app sign-off remains deferred (open.csr design §12).
- Clipboard and download behaviour depend on the browser; the diff is on the page either way.

---

Built and written by Claude Code using Opus 5 in an unattended `--auto` session — demo reviewed by @jwildfire, this write-up not yet
