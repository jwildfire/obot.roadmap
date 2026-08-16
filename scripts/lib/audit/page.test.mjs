// The audit page, asserted on the artifact it actually publishes (#92, #109).
//
// The generator has no exported seam worth testing in isolation: it is one pass
// from the committed ledger to one HTML file, and every interesting property is
// a property of that file. So this runs it and reads what came out.
//
// What these guard is the contract between the page and everything around it —
// the deploy's assertions, the apply lane, the roadmap page's deep links, and
// the seven decisions the view was built to (see the header of
// build_audit_page.mjs). They do not test the browser behaviour; nothing here
// runs a DOM.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

import { ROOT } from '../repos.mjs';

const GENERATOR = path.join(ROOT, 'scripts', 'build_audit_page.mjs');
const OUT = path.join(ROOT, '_site', 'audit', 'index.html');

// Two builds of one page (2026-07-27): AUDIT_MODE=readonly is what the deploy
// publishes; AUDIT_MODE=local is what the session-audit server serves. Build
// local first so `html` — what most tests read — is the deployed artifact.
execFileSync(process.execPath, [GENERATOR], { cwd: ROOT, stdio: 'pipe', env: { ...process.env, AUDIT_MODE: 'local' } });
const htmlLocal = fs.readFileSync(OUT, 'utf8');
execFileSync(process.execPath, [GENERATOR], { cwd: ROOT, stdio: 'pipe' });
const html = fs.readFileSync(OUT, 'utf8');

const ledger = JSON.parse(fs.readFileSync(path.join(ROOT, 'site', 'audit', 'findings.json'), 'utf8'));
const live = ledger.findings.filter((f) => !f.muted);

/** The ledger the page renders from, read back out of the page. */
function embedded() {
  const m = /<script type="application\/json" id="ap-data">([\s\S]*?)<\/script>/.exec(html);
  assert.ok(m, 'the page must embed its ledger as ap-data');
  return JSON.parse(m[1].replace(/\\u003c/g, '<'));
}

test('the page carries the whole live ledger, not a sample of it', () => {
  const data = embedded();
  assert.equal(data.findings.length, ledger.findings.length);
  assert.equal(data.rules.length, ledger.rules.length);
  assert.deepEqual(data.counts, ledger.counts);
  // Muted findings ship too — the sidebar can show them, so they must be there.
  assert.equal(data.findings.filter((f) => f.muted).length,
    ledger.findings.filter((f) => f.muted).length);
});

test('every finding keeps the fields the rail reads', () => {
  for (const f of embedded().findings) {
    assert.ok(f.id && f.rule && f.confidence, `${f.id}: identity`);
    assert.ok(f.subject && f.subject.url, `${f.id}: subject`);
    assert.ok(Array.isArray(f.evidence), `${f.id}: evidence`);
    assert.ok(typeof f.proposal.summary === 'string' && f.proposal.summary, `${f.id}: summary`);
    // A judgment call without its prompt would ask him to approve an unread
    // instruction; a mechanical fix without its ops would hide what runs.
    if (f.proposal.kind === 'agentic') assert.ok(f.proposal.prompt, `${f.id}: agent prompt`);
    else assert.ok(Array.isArray(f.proposal.ops), `${f.id}: ops`);
  }
});

test('the deploy assertions the page is validated by are present', () => {
  assert.match(html, /id="ap-queue"/);
  assert.match(html, /id="ap-data"/);
  // Exactly one shared nav, and the roadmap group's second row (deploy-site.yml).
  assert.equal((html.match(/aria-label="Site"/g) ?? []).length, 1);
  assert.match(html, /nav class="site sub"/);
  assert.doesNotMatch(html, /SITE-HEADER/);
});

test('D6 — the per-finding cards are gone, the rule reference stays', () => {
  assert.doesNotMatch(html, /class="ap-card/);
  for (const r of ledger.rules) assert.ok(html.includes(`<code>${r.id}</code>`), `${r.id} missing from the reference`);
  assert.match(html, /<details class="ap-fold" id="rules">/);
});

test('D4 — the activity log is a fold, under the table', () => {
  assert.match(html, /<details class="ap-fold" id="activity">/);
  assert.ok(html.indexOf('id="ap-queue"') < html.indexOf('id="activity"'),
    'the activity fold must come after the queue');
});

test('D2 revised — the deployed page has no write path at all', () => {
  // The dispatch lane and the token that powered it are gone (2026-07-27):
  // a public page holds nothing that can change GitHub.
  assert.match(html, /var MODE = "readonly"/);
  assert.doesNotMatch(html, /event_type: 'audit-decision'/);
  assert.doesNotMatch(html, /api\.github\.com/);
  assert.doesNotMatch(html, /github_pat/);
});

test('D2 revised — the local build stages a queue and submits to the loopback server', () => {
  assert.match(htmlLocal, /var MODE = "local"/);
  assert.match(htmlLocal, /\/api\/audit\/decision/);
  assert.match(htmlLocal, /\/api\/audit\/state/);
  assert.match(htmlLocal, /id="ap-qbar"/);
  // ids only, in the batch shape the server validates.
  assert.match(htmlLocal, /JSON\.stringify\(\{ batch: batch, label: label \}\)/);
  // And still nothing pointed at GitHub's API from the browser.
  assert.doesNotMatch(htmlLocal, /api\.github\.com/);
});

test('D3 — muting above three still confirms, now at submit time', () => {
  assert.match(htmlLocal, /MUTE_CONFIRM_OVER = 3/);
  const guard = /if \(rej\.length > MUTE_CONFIRM_OVER\)/;
  assert.match(htmlLocal, guard, 'only the reject side of a submit is gated');
});

test('each build names its lane in the connection pill', () => {
  assert.match(html, /read-only — decide from the local hub/);
  assert.match(htmlLocal, /stage \u2713\/\u2717, submit when ready|stage ✓\/✗, submit when ready/);
  // The connect-a-PAT dialog is gone from both.
  assert.doesNotMatch(html, /ap-connect/);
  assert.doesNotMatch(htmlLocal, /ap-connect/);
  // The documented fallback survives: an audit-decision issue, for when the
  // local server is not running.
  assert.match(html, /labels=audit-decision/);
});

test('without JavaScript the queue is still readable', () => {
  const m = /<noscript>([\s\S]*?)<\/noscript>/.exec(html);
  assert.ok(m, 'a noscript fallback must exist');
  // One body row per live finding — the header row is <th>, so it is not counted.
  assert.equal((m[1].match(/<td><code>/g) ?? []).length, live.length,
    'one no-script row per live finding');
});

test('nothing on the page is loaded from another host', () => {
  // Anything fetched at render time would be a CDN dependency; api.github.com is
  // called at decision time, by hand, and is the only external host allowed.
  const srcs = [...html.matchAll(/(?:src|href)="(https?:)?\/\/([^"/]+)/g)].map((m) => m[2]);
  assert.deepEqual([...new Set(srcs)].sort(), ['github.com'],
    'only links to github.com, no external assets');
  assert.doesNotMatch(html, /<script[^>]+src=/, 'no external script tags');
});

test('the page says how old the ledger is, without JavaScript and with it', () => {
  // Server-rendered, so a noscript reader gets it (#201) …
  assert.match(html, /id="ap-fresh"/);
  assert.match(html, /before this page was built/);
  assert.match(html, /invisible to it/);
  // … and recomputed in the browser, because a static artifact read three days
  // later must report three days, not the age it was published at.
  assert.match(html, /var ageHours = \(Date\.now\(\) - stampedAt\) \/ 3600000/);
  assert.match(html, /This audit last ran/);
});

test('the roadmap fold\'s per-rule deep links land somewhere', () => {
  // scripts/lib/audit/render.mjs links to audit/index.html#rule-<RULE-ID>.
  assert.match(html, /\^#rule-\(\.\+\)\$/, 'the page must read a #rule- deep link');
});
