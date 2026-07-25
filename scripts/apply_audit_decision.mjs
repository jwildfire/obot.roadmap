#!/usr/bin/env node
// Applies an accept/reject decision from the roadmap dashboard (#92).
//
//   node scripts/apply_audit_decision.mjs --issue 93 [--dry-run] [--report out.md]
//   node scripts/apply_audit_decision.mjs --decision accept --findings A,B
//   node scripts/apply_audit_decision.mjs --finalize 93 --outcome applied
//
// The contract that makes a one-click button safe:
//
//   1. The decision names finding ids, never operations. What runs comes from a
//      FRESH audit, not from the page — the dashboard can be a day stale, and a
//      URL is user-editable input.
//   2. A finding the current audit no longer reports is refused as stale. Someone
//      else may have already fixed it, or the situation may have changed. But if
//      the rule that found it could not RUN — an unreadable source, a token
//      without the scope — the decision is `blocked`, not stale: "I could not
//      look" must never be reported as "it is not there", or an accept quietly
//      evaporates.
//   3. Mechanical findings run their ops here. Agentic ones are written to a
//      prompt pack for the bounded headless agent the workflow invokes; this
//      script never runs a model.
//   4. Every decision — applied, refused, rejected — is appended to
//      site/audit/decisions.json. Rejections mute the finding; nothing else does.
import fs from 'node:fs/promises';
import path from 'node:path';

import { ROOT, HUB } from './lib/repos.mjs';
import { runAudit, FINDINGS_PATH, DECISIONS_PATH, readJson } from './audit_roadmap.mjs';
import { makeClient, runOps } from './lib/audit/ops.mjs';
import { RULE_BY_ID } from './lib/audit/rules.mjs';

const args = process.argv.slice(2);
const flag = (n) => args.includes(`--${n}`);
const value = (n) => {
  const i = args.indexOf(`--${n}`);
  return i === -1 ? null : args[i + 1];
};

const AGENTIC_PACK = process.env.AUDIT_AGENTIC_PACK || '/tmp/audit-agentic.md';
export const FINDING_ID = /^[A-Z][A-Z-]+:[^\s|]+$/;

// ------------------------------------------------------------ decision parsing
// The prefilled body the dashboard's buttons generate. Kept deliberately
// human-readable: @jwildfire sees exactly what he is submitting before he does.
export function parseDecision(body = '') {
  const decision = (body.match(/^\s*decision:\s*(accept|reject)\s*$/mi) || [])[1]?.toLowerCase() ?? null;
  const ids = [];
  for (const line of body.split('\n')) {
    const m = line.match(/^\s*[-*]\s*(?:`)?([A-Z][A-Z-]+:[^\s`|]+)/);
    if (m && FINDING_ID.test(m[1])) ids.push(m[1]);
  }
  return { decision, ids: [...new Set(ids)] };
}

// ------------------------------------------------------------------- ledger IO
async function appendDecisions(entries) {
  const file = path.join(ROOT, DECISIONS_PATH);
  const ledger = await readJson(DECISIONS_PATH, { version: 1, decisions: [] });
  ledger.decisions.push(...entries);
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, `${JSON.stringify(ledger, null, 2)}\n`);
  return ledger;
}

// The agent's outcome is only known after the workflow's claude step, so the
// ledger is patched rather than guessed: delegated → applied or failed.
async function finalize(issueNumber, outcome) {
  const file = path.join(ROOT, DECISIONS_PATH);
  const ledger = await readJson(DECISIONS_PATH, { version: 1, decisions: [] });
  let patched = 0;
  for (const d of ledger.decisions) {
    if (d.issue === Number(issueNumber) && d.outcome === 'delegated') {
      d.outcome = outcome;
      patched += 1;
    }
  }
  await fs.writeFile(file, `${JSON.stringify(ledger, null, 2)}\n`);
  console.log(`apply: finalized ${patched} delegated decision${patched === 1 ? '' : 's'} from issue #${issueNumber} as ${outcome}`);
  return patched;
}

// ---------------------------------------------------------------------- report
const link = (s) => (s.url ? `[${s.repo?.split('/')[1] ?? ''}#${s.number ?? ''}](${s.url})` : `${s.repo}#${s.number}`);

function report({ decision, results, issueNumber, dryRun }) {
  const lines = [];
  const applied = results.filter((r) => r.outcome === 'applied');
  const delegated = results.filter((r) => r.outcome === 'delegated');
  const stale = results.filter((r) => r.outcome === 'stale');
  const failed = results.filter((r) => r.outcome === 'failed');
  const blocked = results.filter((r) => r.outcome === 'blocked');
  const rejected = results.filter((r) => r.outcome === 'rejected');

  lines.push(`## Audit decision — ${decision}${dryRun ? ' (dry run)' : ''}`, '');
  lines.push(`${results.length} finding${results.length === 1 ? '' : 's'} from decision #${issueNumber ?? '—'}: ${applied.length} applied, ${delegated.length} handed to the agent, ${rejected.length} rejected, ${stale.length} refused as stale, ${blocked.length} blocked, ${failed.length} failed.`, '');
  if (blocked.length) {
    lines.push(`**This decision was not applied and is still valid.** ${blocked.length} finding${blocked.length === 1 ? '' : 's'} could not be re-validated because a source the audit reads was unavailable on this run. Re-file the decision — the findings were not discarded.`, '');
  }

  const block = (title, rows, render) => {
    if (!rows.length) return;
    lines.push(`### ${title}`, '');
    for (const r of rows) lines.push(`- ${render(r)}`);
    lines.push('');
  };

  block('Applied', applied, (r) => `**${r.finding.ruleTitle}** on ${link(r.finding.subject)} — ${r.detail}`);
  block('Handed to the agent', delegated, (r) => `**${r.finding.ruleTitle}** on ${link(r.finding.subject)} — ${r.finding.proposal.summary}`);
  block('Rejected (muted for 60 days, or until the evidence changes)', rejected, (r) => `**${r.id}** — ${r.detail}`);
  block('Refused as stale', stale, (r) => `**${r.id}** — ${r.detail}`);
  block('Blocked — a source was unreadable, so nothing was re-validated', blocked, (r) => `**${r.id}** — ${r.detail}`);
  block('Failed', failed, (r) => `**${r.id}** — ${r.detail}`);

  lines.push('---', 'Applied by `apply_audit_decision.mjs` for [requirement #92](https://github.com/jwildfire/obot.roadmap/issues/92). Nothing runs without an explicit accept, and every accepted change is re-validated against a fresh audit before it is applied.');
  return lines.join('\n');
}

// ------------------------------------------------------------------------ main
async function main() {
  if (flag('finalize')) {
    await finalize(value('finalize'), value('outcome') ?? 'applied');
    return;
  }

  const dryRun = flag('dry-run');
  const token = process.env.GH_TOKEN || process.env.GITHUB_TOKEN || '';
  const projectToken = process.env.PROJECT_TOKEN || process.env.ROADMAP_TOKEN || token;
  if (!token) throw new Error('apply: no GH_TOKEN — nothing can be read or written');

  const client = makeClient({ token, projectToken, dryRun });

  // The decision either comes from an issue body (the dashboard's path) or from
  // flags (a session applying a finding by hand).
  const issueNumber = value('issue') ? Number(value('issue')) : null;
  let decision = value('decision');
  let ids = (value('findings') ?? '').split(',').map((s) => s.trim()).filter(Boolean);
  let actor = null;

  if (issueNumber) {
    const issue = await client.rest('GET', `/repos/${HUB}/issues/${issueNumber}`);
    actor = issue.user?.login ?? null;
    const parsed = parseDecision(issue.body ?? '');
    decision = decision ?? parsed.decision;
    ids = ids.length ? ids : parsed.ids;
  }

  if (!decision || !['accept', 'reject'].includes(decision)) {
    throw new Error('apply: the decision must say "decision: accept" or "decision: reject"');
  }
  if (!ids.length) throw new Error('apply: no finding ids in the decision');

  // Re-validate against a fresh audit — the whole safety story of one-click apply.
  const { snapshot, result } = await runAudit({ source: `apply #${issueNumber ?? 'manual'}` });
  const byId = new Map(result.findings.map((f) => [f.id, f]));
  const ctx = {
    board: {
      projectId: snapshot.board.project?.id ?? null,
      statusField: snapshot.board.statusField,
    },
  };

  const at = new Date().toISOString();
  const results = [];
  const agentic = [];

  for (const id of ids) {
    const finding = byId.get(id);
    if (!finding) {
      // "I could not look" must never be reported as "it is not there". A rule
      // whose source was unreadable on this run has no opinion about its
      // findings, so its decisions are blocked and retryable — not discarded.
      // (Run 30142448481 threw away five accepted findings exactly this way: the
      // re-validation ran with a token that cannot read the project, so every
      // board rule skipped and every board finding looked stale.)
      const rule = RULE_BY_ID.get(id.split(':')[0]);
      const unreadable = rule?.needs === 'board' && !snapshot.board.readable;
      results.push(unreadable
        ? {
          id,
          outcome: 'blocked',
          detail: 'the obot Roadmap project was unreadable on this run, so the rule that found this could not be re-validated — nothing was changed. Retry once the token can read the project.',
        }
        : { id, outcome: 'stale', detail: 'the current audit no longer reports this finding — nothing was changed' });
      continue;
    }
    if (decision === 'reject') {
      results.push({ id, finding, outcome: 'rejected', detail: finding.proposal.summary });
      continue;
    }
    if (finding.proposal.kind === 'agentic') {
      agentic.push(finding);
      results.push({ id, finding, outcome: 'delegated', detail: 'handed to the bounded agent' });
      continue;
    }
    try {
      const detail = await runOps(client, finding.proposal.ops, ctx);
      results.push({ id, finding, outcome: 'applied', detail: detail.join('; ') });
    } catch (err) {
      results.push({ id, finding, outcome: 'failed', detail: err.message });
    }
  }

  // Ledger: one entry per finding, carrying the fingerprint so a rejection knows
  // later whether it is still looking at the same situation.
  if (!dryRun) {
    await appendDecisions(results.map((r) => ({
      id: r.id,
      decision,
      at,
      by: actor ?? 'session',
      issue: issueNumber,
      fingerprint: r.finding?.fingerprint ?? null,
      rule: r.finding?.rule ?? r.id.split(':')[0],
      outcome: r.outcome,
      detail: typeof r.detail === 'string' ? r.detail.slice(0, 300) : null,
    })));
  }

  // The agentic prompt pack. The workflow runs it; this script never calls a model.
  if (agentic.length) {
    const pack = [
      '# Accepted audit findings needing judgment',
      '',
      `@jwildfire accepted ${agentic.length} finding${agentic.length === 1 ? '' : 's'} whose fix is a judgment call. Work them one at a time, in order. Follow .github/roadmap-audit-policy.md — it is binding.`,
      '',
      ...agentic.flatMap((f) => [
        `## ${f.id}`,
        `- rule: **${f.ruleTitle}** (${f.rule}, ${f.confidence} confidence)`,
        `- subject: ${f.subject.url ?? `${f.subject.repo}#${f.subject.number}`} — ${f.subject.title}`,
        `- evidence: ${f.evidence.join(' · ')}`,
        `- goal: ${f.proposal.summary}`,
        '',
        f.proposal.prompt,
        '',
      ]),
    ].join('\n');
    await fs.writeFile(AGENTIC_PACK, `${pack}\n`);
    console.log(`apply: wrote ${agentic.length} agentic finding(s) to ${AGENTIC_PACK}`);
  } else {
    await fs.writeFile(AGENTIC_PACK, '');
  }

  // Rewrite findings.json so the dashboard drops what was just fixed on the next
  // deploy rather than waiting for tomorrow's nightly run.
  if (!dryRun) {
    const { result: after } = await runAudit({ source: `after apply #${issueNumber ?? 'manual'}` });
    await fs.writeFile(path.join(ROOT, FINDINGS_PATH), `${JSON.stringify(after, null, 2)}\n`);
    console.log(`apply: refreshed ${FINDINGS_PATH} — ${after.counts.total} live findings remain`);
  }

  const md = report({ decision, results, issueNumber, dryRun });
  const out = value('report');
  if (out) await fs.writeFile(out, `${md}\n`);
  console.log(`\n${md}`);

  // Blocked is a failure of the lane, not of the roadmap: the run must go red so
  // a discarded decision cannot pass for a handled one.
  const bad = results.filter((r) => r.outcome === 'failed' || r.outcome === 'blocked');
  if (bad.length) process.exitCode = 1;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  await main();
}
