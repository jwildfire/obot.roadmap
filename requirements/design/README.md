# Design documents

One per requirement: `{issue_number}_design.html` (self-contained HTML, published to the site; per [obot-claw#59](https://github.com/obot-claw/obot-claw.github.io/issues/59)), or `.md` for simple designs. Linked from the Design section of the Requirement issue.

## Every artifact says what it is — in one line, on the page

The news feed's description line is what decides whether a row is worth opening. It
comes from the artifact's own page head, written when the artifact is written:

```html
<title>What the page is called</title>
<meta name="description" content="What this page contains, and why you would open it.">
```

Put it directly after `<title>`. One line, 40–260 characters, and it must clear the
plain-English bar (@jwildfire, 2026-08-15):

- **Say what the artifact contains and why someone would open it** — not what kind of
  thing it is. "AI-generated report." and "Design document for Requirement #161." both
  describe the badge the feed already prints. They were the hardcoded fallbacks the
  feed used until 2026-08-15, and they are now rejected by name.
- **Name things, don't number them.** An issue number is not an explanation; a reader
  who has memorised nothing must be able to tell from the line alone whether this is
  for them. Delete every reference from the sentence — if it stops making sense,
  rewrite it.
- **Write it from the contents**, not from the title. A parity report's line should
  convey that it compares the chart library against its R wrappers and names what is
  stale — not that it is a report.

`node scripts/check_artifact_descriptions.mjs` verifies every artifact, and the deploy
runs it before publishing: a page with no description fails the build. If one ever
reaches the site it renders as a loud `⚠ NO DESCRIPTION` strip rather than a plausible
sentence — a fallback that reads as intentional is how the old one survived six weeks.
