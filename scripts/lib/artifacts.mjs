// Agent artifacts — enumeration, and the one line each of them says about itself.
//
// The news feed's description line is what decides whether a row is worth opening.
// Until 2026-08-15 the feed did not read one: it printed a per-type constant —
// "AI-generated report." on every report folder, "Design document for Requirement
// #N." on every design doc. Both describe the *provenance*, which the AGENT ARTIFACT
// badge already says, instead of the *contents*, which is the only thing a reader is
// choosing on. Nine artifacts had already written a real `<meta name="description">`
// and the feed threw it away.
//
// So: the description lives in the artifact's own `<head>`, written when the artifact
// is written, and this module is the one place that reads it. A standard meta tag
// rather than a side index because these pages are self-contained by contract — the
// description travels with the page, drives link previews and search, and cannot
// drift from a registry nobody remembers to update.
//
// When one is missing the feed prints MISSING — loud, greppable, obviously a defect.
// A plausible-sounding constant reads as intentional and hides forever; a warning
// strip does not. `scripts/check_artifact_descriptions.mjs` fails the deploy on it.
import fs from 'node:fs';
import path from 'node:path';

import { ROOT } from './repos.mjs';

// Rendered into the feed when an artifact ships without a description. Grep this
// string to find every offender at once.
export const MISSING = '⚠ NO DESCRIPTION — this artifact was published without one.';

// Banned openers: text that restates the badge or the title instead of the contents.
// The first two are the constants this module replaced; they must not come back as
// hand-written meta tags either.
const BANNED = [
  /^ai-generated report\.?$/i,
  /^design document(\s+for\s+requirement\s+#?\d+)?\.?$/i,
  /^(an?\s+)?(report|page|document|artifact|summary)\.?$/i,
];

// Long enough to say something. A real one-liner clears this easily; "Report on the
// audit." does not.
export const MIN_LENGTH = 40;
export const MAX_LENGTH = 260;

const unent = (s = '') => s
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
  .replace(/&#39;|&apos;/g, "'").replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&');

/** The `<meta name="description">` of an HTML page, or null when it has none. */
export function readDescription(file) {
  let html;
  try {
    html = fs.readFileSync(file, 'utf8');
  } catch {
    return null;
  }
  return descriptionFrom(html);
}

/** Same, from already-read markup — the unit-testable half. */
export function descriptionFrom(html = '') {
  const m = html.match(/<meta\s+name=["']description["']\s+content=["']([\s\S]*?)["']\s*\/?>/i)
    || html.match(/<meta\s+content=["']([\s\S]*?)["']\s+name=["']description["']\s*\/?>/i);
  if (!m) return null;
  const text = unent(m[1]).replace(/\s+/g, ' ').trim();
  return text || null;
}

/** Why a description is not acceptable, or null when it is fine. */
export function describeProblem(text) {
  if (!text) return 'no <meta name="description"> on the page';
  // Type-restating text first: "Design document." is also too short, and the
  // length complaint would send the author off to pad it rather than rewrite it.
  if (BANNED.some((re) => re.test(text))) return `"${text}" describes the type, not the contents`;
  if (text.length < MIN_LENGTH) {
    return `only ${text.length} characters — say what it contains and why to open it (min ${MIN_LENGTH})`;
  }
  if (text.length > MAX_LENGTH) {
    return `${text.length} characters — keep it to one line (max ${MAX_LENGTH})`;
  }
  return null;
}

/**
 * Every artifact the feed can show, with its description and any problem with it.
 * Kinds: `report` (reports/<slug>/index.html), `decision`
 * (reports/decisions/<slug>/index.html), `design`
 * (requirements/design/<n>_design.html).
 *
 * reports/sessions/ is deliberately out of scope: those pages are generated per
 * session by the session-hub generator and are linked from their diary entry, not
 * surfaced as standalone feed rows.
 */
export function listArtifacts(root = ROOT) {
  const items = [];
  const reportsDir = path.join(root, 'reports');
  for (const entry of fs.readdirSync(reportsDir, { withFileTypes: true })) {
    if (!entry.isDirectory() || entry.name === 'sessions') continue;
    const file = path.join(reportsDir, entry.name, 'index.html');
    if (fs.existsSync(file)) {
      items.push({ kind: 'report', slug: entry.name, rel: `reports/${entry.name}/index.html`, file });
    }
    if (entry.name !== 'decisions') continue;
    // The decisions folder is one feed row; each decision underneath is its own
    // artifact and carries its own description, shown on the decisions index.
    for (const sub of fs.readdirSync(path.join(reportsDir, 'decisions'), { withFileTypes: true })) {
      if (!sub.isDirectory()) continue;
      const subFile = path.join(reportsDir, 'decisions', sub.name, 'index.html');
      if (fs.existsSync(subFile)) {
        items.push({ kind: 'decision', slug: sub.name, rel: `reports/decisions/${sub.name}/index.html`, file: subFile });
      }
    }
  }
  const designDir = path.join(root, 'requirements', 'design');
  for (const f of fs.readdirSync(designDir).filter((n) => n.endsWith('.html'))) {
    items.push({ kind: 'design', slug: f, rel: `requirements/design/${f}`, file: path.join(designDir, f) });
  }
  return items.map((it) => {
    const description = readDescription(it.file);
    return { ...it, description, problem: describeProblem(description) };
  });
}
