#!/usr/bin/env node
// The nightly roadmap audit (requirement #92).
//
//   node scripts/audit_roadmap.mjs            # write site/audit/findings.json
//   node scripts/audit_roadmap.mjs --print    # write nothing, report to stdout
//   node scripts/audit_roadmap.mjs --rule ID  # only that rule (debugging)
//
// Deterministic by design: one snapshot, pure rules, no model in the loop. A
// finding on the dashboard is therefore a fact about GitHub state, and the same
// state produces the same findings — which is what makes re-validating a finding
// before applying it meaningful.
import fs from 'node:fs/promises';
import path from 'node:path';

import { ROOT } from './lib/repos.mjs';
import { hasToken } from './lib/gh.mjs';
import { buildSnapshot } from './lib/audit/snapshot.mjs';
import { buildLedger } from './lib/audit/engine.mjs';
import { freshness } from './lib/audit/freshness.mjs';
import { RULES } from './lib/audit/rules.mjs';

const args = process.argv.slice(2);
const flag = (name) => args.includes(`--${name}`);
const value = (name) => {
  const i = args.indexOf(`--${name}`);
  return i === -1 ? null : args[i + 1];
};

export const FINDINGS_PATH = path.join('site', 'audit', 'findings.json');
export const DECISIONS_PATH = path.join('site', 'audit', 'decisions.json');

export async function readJson(rel, fallback = null) {
  try {
    return JSON.parse(await fs.readFile(path.join(ROOT, rel), 'utf8'));
  } catch {
    return fallback;
  }
}

export async function runAudit({ now = new Date(), source = 'local' } = {}) {
  const snapshot = await buildSnapshot({ now });
  const prior = await readJson(FINDINGS_PATH);
  const ledger = await readJson(DECISIONS_PATH, { version: 1, decisions: [] });
  return { snapshot, result: buildLedger(snapshot, { prior, ledger, now, source }) };
}

// Only run as a script, not when the apply lane imports runAudit() to re-validate.
if (import.meta.url === `file://${process.argv[1]}`) {
  if (!hasToken) {
    console.error('audit: no GITHUB_TOKEN/GH_TOKEN — the audit reads the API for everything and cannot run blind');
    process.exit(1);
  }

  const only = value('rule');
  if (only && !RULES.some((r) => r.id === only)) {
    console.error(`audit: no rule named ${only}. Known rules:\n  ${RULES.map((r) => r.id).join('\n  ')}`);
    process.exit(1);
  }

  // What was on disk before this run — the file anyone reading `findings.json`
  // in the last day was actually reading. Printed first, and printed whatever it
  // says, because a 22-hour-old ledger looks exactly like a current one until
  // something states its age out loud (#201).
  console.log(`audit: previous ${freshness(await readJson(FINDINGS_PATH)).summary}`);

  const { result } = await runAudit({ source: process.env.GITHUB_RUN_ID ? `run ${process.env.GITHUB_RUN_ID}` : 'local' });
  const shown = only ? result.findings.filter((f) => f.rule === only) : result.findings;

  if (!result.boardReadable) {
    console.warn('audit: the obot Roadmap project was unreadable — board rules skipped (needs a project-scoped token)');
  }

  for (const f of shown) {
    const tag = f.muted ? 'muted' : f.confidence;
    console.log(`[${tag}] ${f.id}`);
    console.log(`    ${f.subject.title || f.subject.url}`);
    console.log(`    evidence: ${f.evidence.join(' · ')}`);
    console.log(`    ${f.proposal.kind}: ${f.proposal.summary}`);
    if (f.proposal.ops?.length) console.log(`    ops: ${f.proposal.ops.map((o) => o.label).join('; ')}`);
  }

  const quiet = result.rules.filter((r) => !r.fired && !r.skipped && !r.error).length;
  const broken = result.rules.filter((r) => r.error);
  console.log(
    `\naudit: ${result.counts.total} live findings ` +
    `(${result.counts.high} high, ${result.counts.medium} medium, ${result.counts.low} low; ` +
    `${result.counts.mechanical} mechanical, ${result.counts.agentic} agentic, ${result.counts.muted} muted) ` +
    `across ${result.rules.length} rules — ${quiet} quiet ` +
    `(as of ${result.generatedAt}; stale after ${result.staleAfterHours}h)`,
  );
  for (const r of broken) console.error(`audit: rule ${r.id} threw — ${r.error}`);

  if (!flag('print')) {
    await fs.mkdir(path.join(ROOT, 'site', 'audit'), { recursive: true });
    await fs.writeFile(path.join(ROOT, FINDINGS_PATH), `${JSON.stringify(result, null, 2)}\n`);
    console.log(`audit: wrote ${FINDINGS_PATH}`);
  }
  // A rule that throws is a bug in the audit, not a finding about the roadmap.
  if (broken.length) process.exit(1);
}
