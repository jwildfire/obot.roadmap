#!/usr/bin/env node
// Ask a requirement whose decision it carries — and get an answer you can quote.
//
// Requirement: jwildfire/obot.roadmap#215. This is the half of that requirement
// that gets USED rather than written. The field only stays honest because agents
// read it, and they only read it because reading it answers the question they
// actually have, which is never "is the field filled in" but:
//
//     I am about to do something only @jwildfire can authorise. Did he?
//
//   node scripts/provenance.mjs resolve D0018.1
//   node scripts/provenance.mjs resolve 215        # whatever #215's block cites
//   node scripts/provenance.mjs check              # every open requirement
//   node scripts/provenance.mjs check 215 211
//   node scripts/provenance.mjs stamp 215 --approved-by D0018.1
//   node scripts/provenance.mjs report             # the measured state of the hub
//
// `resolve` prints what was asked, what he said, the channel and the date — the
// four facts the second worked example on #215 needed and could not get from three
// agents' memories of a sentence. That output is the citation an approval-gated
// action quotes. The requirement is not the citation; it never was.
//
// Exit codes: 0 clean, 1 something claims his approval and cannot show it, 2 the
// command itself failed. `check` is the only one that can exit 1.
//
// NOT a deploy entrypoint. It reads GitHub and the repo, writes nothing, and is
// deliberately absent from deploy-site.yml — the mechanical lane that runs
// unattended is the nightly audit's PROVENANCE rules, which fire on GitHub state
// rather than on a push to this repo. A body-borne field goes stale without any
// commit ever happening, so a push-triggered check would be watching the wrong door.
import { collectDecisionLog } from './lib/collect/decision-log.mjs';
import { graphql, rest, hasToken } from './lib/gh.mjs';
import { HUB } from './lib/repos.mjs';
import {
  EMPTY, buildApprovalIndex, resolveCitation, parseCitation, glossFor, judge, parseProvenance,
} from './lib/provenance.mjs';

const [OWNER, NAME] = HUB.split('/');
const args = process.argv.slice(2);
const cmd = args[0] ?? 'help';
const rest_ = args.slice(1).filter((a) => !a.startsWith('--'));
const flag = (name) => {
  const i = args.indexOf(`--${name}`);
  return i === -1 ? null : (args[i + 1] ?? '');
};

const bold = (s) => (process.stdout.isTTY ? `[1m${s}[0m` : s);
const dim = (s) => (process.stdout.isTTY ? `[2m${s}[0m` : s);

// --------------------------------------------------------------------- data

const REQUIREMENTS = `
query ($owner: String!, $name: String!, $cursor: String) {
  repository(owner: $owner, name: $name) {
    issues(first: 50, after: $cursor, states: [OPEN, CLOSED], orderBy: {field: CREATED_AT, direction: DESC}) {
      pageInfo { hasNextPage endCursor }
      nodes {
        number title url state createdAt
        labels(first: 20) { nodes { name } }
      }
    }
  }
}`;

async function readRequirements() {
  const out = [];
  let cursor = null;
  for (;;) {
    const data = await graphql(REQUIREMENTS, { owner: OWNER, name: NAME, cursor });
    const page = data.repository.issues;
    out.push(...page.nodes.filter((i) => i.labels.nodes.some((l) => l.name === 'requirement')));
    if (!page.pageInfo.hasNextPage) break;
    cursor = page.pageInfo.endCursor;
  }
  return out;
}

/** Issue bodies, one REST call each — GraphQL truncates long bodies inconsistently. */
async function bodyOf(number) {
  const issue = await rest(`/repos/${HUB}/issues/${number}`, { tolerate404: true });
  return issue ? { number, title: issue.title, url: issue.html_url, state: issue.state, body: issue.body ?? '' } : null;
}

/**
 * The one thing that cannot be settled from the repo: does a native review exist?
 *
 * Checked against the reviews API rather than `reviewDecision`, because the field
 * a requirement cites is @jwildfire's own APPROVED review, and reviewDecision
 * summarises a policy rather than naming a person.
 */
async function resolveReview(c) {
  if (!hasToken) return { ok: null, citation: c, why: 'no GitHub token in the environment — cannot confirm the review' };
  const reviews = await rest(`/repos/${c.repo}/pulls/${c.pr}/reviews`, { tolerate404: true });
  if (!reviews) return { ok: false, citation: c, why: `${c.repo}#${c.pr} is not a pull request` };
  const approvals = reviews.filter((r) => r.state === 'APPROVED' && r.user?.login === 'jwildfire');
  if (approvals.length === 0) {
    const states = [...new Set(reviews.map((r) => `${r.user?.login}:${r.state}`))].join(', ') || 'no reviews at all';
    return { ok: false, citation: c, why: `no APPROVED review by @jwildfire on ${c.repo}#${c.pr} — the PR has ${states}` };
  }
  const latest = approvals[approvals.length - 1];
  return {
    ok: true,
    citation: c,
    said: { date: latest.submitted_at.slice(0, 10), channel: 'GitHub review', verbatim: true, words: (latest.body || '').trim() },
    where: latest.html_url,
    asked: `approve ${c.repo}#${c.pr}`,
  };
}

/** Local resolution first; only a review citation spends a network call. */
async function resolveOne(citation, index) {
  const c = typeof citation === 'string' ? parseCitation(citation) : citation;
  if (c.kind === 'review') return resolveReview(c);
  return resolveCitation(c, index);
}

// ------------------------------------------------------------------ commands

async function cmdResolve(index) {
  const target = rest_[0];
  if (!target) fail('resolve needs a citation (`D0018.1`) or a requirement number (`215`)');

  let citations = [target];
  if (/^\d+$/.test(target)) {
    const issue = await bodyOf(Number(target));
    if (!issue) fail(`${HUB}#${target} does not exist`);
    const p = parseProvenance(issue.body);
    console.log(`${bold(`#${issue.number}`)} ${issue.title}`);
    console.log(`  ${issue.url}\n`);
    if (!p.present) {
      console.log(`  ${bold('no provenance block')} — this requirement does not say who wrote it or who approved it.`);
      console.log(`  ${dim('Filed before the convention, or filed without it. Either way: not evidence of approval.')}`);
      if (p.reviewClaim === 'asserted') {
        console.log(`  ${bold('and its drafted-by line says "reviewed by @jwildfire"')} — that line is not a record, and 66 requirements carry it.`);
      }
      return 0;
    }
    console.log(`  Authored by: ${p.authoredBy || dim('(blank)')}`);
    if (p.isEmpty) {
      console.log(`  Approved by: ${bold(EMPTY)} — ${bold('nobody has approved this.')}`);
      console.log(`  ${dim('An approval-gated action cannot cite this requirement. Go and get an answer.')}`);
      return 0;
    }
    citations = p.approved.map((c) => c.text);
    if (p.beyond) console.log(`  Beyond the approval: ${p.beyond}`);
    console.log('');
  }

  let bad = 0;
  for (const text of citations) {
    const r = await resolveOne(text, index);
    if (r.ok === true) {
      console.log(`  ${bold(text)} ${bold('resolves')}`);
      if (r.asked) console.log(`    asked:   ${r.asked}`);
      if (r.said) {
        console.log(`    said:    ${r.said.verbatim ? `"${r.said.words}"` : `${r.said.words} ${dim('(relayed, not verbatim)')}`}`);
        console.log(`    channel: ${r.said.channel}`);
        console.log(`    date:    ${r.said.date}`);
      }
      if (r.where) console.log(`    record:  ${r.where}`);
      if (r.weaker) console.log(`    ${dim(`note: ${r.weaker} — a question citation (D0018.1) says what was asked`)}`);
      console.log(`    ${dim('cite this, not the requirement that contains it')}`);
    } else if (r.ok === null) {
      console.log(`  ${bold(text)} undetermined — ${r.why}`);
    } else {
      bad += 1;
      console.log(`  ${bold(text)} ${bold('does NOT resolve')} — ${r.why}`);
      if (r.asked) console.log(`    the question is still open: ${r.asked}`);
    }
    console.log('');
  }
  return bad ? 1 : 0;
}

async function cmdCheck(index) {
  const only = rest_.map(Number).filter(Boolean);
  const list = only.length
    ? (await Promise.all(only.map(bodyOf))).filter(Boolean)
    : await withBodies((await readRequirements()).filter((i) => i.state === 'OPEN'));

  let failures = 0;
  let clean = 0;
  for (const issue of list) {
    // Pre-convention requirements are not failed for a block that did not exist
    // when they were filed. They are counted, named by `report`, and left alone:
    // rewriting 66 bodies to say something different about his own review is not a
    // call an agent makes unattended.
    const v = judge(issue.body, index, { requireBlock: false });
    const resolved = await Promise.all(
      (v.approved ?? []).filter((c) => c.kind === 'review').map((c) => resolveOne(c, index)),
    );
    const reviewProblems = resolved.filter((r) => r.ok === false)
      .map((r) => `\`Approved by: ${r.citation.text}\` does not resolve — ${r.why}`);
    const problems = [...v.problems, ...reviewProblems];
    if (problems.length === 0) { clean += 1; continue; }
    failures += 1;
    console.log(`${bold(`#${issue.number}`)} ${issue.title}`);
    for (const p of problems) console.log(`  - ${p}`);
    console.log(`  ${issue.url}\n`);
  }
  console.log(`${clean} clean, ${failures} with problems, ${list.length} checked.`);
  return failures ? 1 : 0;
}

async function cmdStamp(index) {
  const number = Number(rest_[0]);
  const citation = flag('approved-by') ?? EMPTY;
  const author = flag('authored-by') ?? process.env.OBOT_WORKER_ID ?? '';
  if (!number) fail('stamp needs a requirement number');

  const lines = [`Authored by: ${author || '(name the agent or person who wrote it)'}`];
  if (!citation || citation.toUpperCase() === EMPTY) {
    lines.push(`Approved by: ${EMPTY}`);
  } else {
    const r = await resolveOne(citation, index);
    if (r.ok === false) {
      console.error(`refusing to stamp: ${citation} does not resolve — ${r.why}`);
      return 1;
    }
    if (r.ok === null) console.error(`warning: ${citation} could not be confirmed — ${r.why}`);
    const g = glossFor(r);
    lines.push(`Approved by: ${citation}${g ? ` — ${g}` : ''}`);
    lines.push('Beyond the approval: (what this requirement adds that the approval does not cover, or `none`)');
  }
  console.log(`\n---\n\n${lines.join('\n')}\n`);
  console.log(dim(`Paste at the foot of ${HUB}#${number}. The edit itself goes out as obotclaw[bot]:`));
  console.log(dim('  obot.agent/scripts/obot-gh issue edit ' + number + ' -R ' + HUB + ' --body-file <file>'));
  return 0;
}

/**
 * The state of the hub, measured rather than asserted.
 *
 * Reports the legacy claim alongside the new one on purpose. The interesting number
 * is not how many requirements carry the block; it is how many assert his review in
 * prose while carrying no record of it — the population this requirement exists
 * because of.
 */
async function cmdReport(index) {
  const issues = await withBodies(await readRequirements());
  const rows = issues.map((i) => ({ ...i, v: judge(i.body, index, { requireBlock: false }) }));
  const by = (state) => rows.filter((r) => r.v.state === state);

  const asserted = rows.filter((r) => r.v.reviewClaim === 'asserted');
  const assertedNoRecord = asserted.filter((r) => r.v.state !== 'approved');

  console.log(bold(`${HUB} — requirement provenance, ${new Date().toISOString().slice(0, 10)}`));
  console.log(`  ${rows.length} requirements (open and closed)\n`);
  console.log(`  ${String(by('approved').length).padStart(4)}  carry an approval that resolves`);
  console.log(`  ${String(by('empty').length).padStart(4)}  say ${EMPTY} — explicitly nobody`);
  console.log(`  ${String(by('unresolved').length).padStart(4)}  claim an approval that does not resolve`);
  console.log(`  ${String(by('undetermined').length).padStart(4)}  cite a review this run could not confirm`);
  console.log(`  ${String(by('missing').length).padStart(4)}  have no provenance block\n`);
  console.log(`  ${String(asserted.length).padStart(4)}  say "reviewed by @jwildfire" in the drafted-by line`);
  console.log(`  ${String(assertedNoRecord.length).padStart(4)}  ${bold('of those carry no record of it')}`);
  console.log(`  ${String(rows.filter((r) => r.v.reviewClaim === 'disclaimed').length).padStart(4)}  say "not yet reviewed by @jwildfire"\n`);

  for (const r of by('unresolved')) {
    console.log(`  unresolved  #${r.number}  ${r.title.slice(0, 70)}`);
    for (const p of r.v.problems) console.log(`              ${p}`);
  }
  return 0;
}

async function withBodies(issues) {
  const out = [];
  for (const i of issues) {
    const full = await bodyOf(i.number);
    if (full) out.push(full);
  }
  return out;
}

function fail(msg) {
  console.error(`provenance: ${msg}`);
  process.exit(2);
}

// ------------------------------------------------------------------------ go

const COMMANDS = { resolve: cmdResolve, check: cmdCheck, stamp: cmdStamp, report: cmdReport };

if (!COMMANDS[cmd]) {
  console.log(`Usage: node scripts/provenance.mjs <resolve|check|stamp|report> [args]

  resolve <D0018.1 | 215 | owner/repo#9 review>
        What a citation actually points at: what was asked, what he said, the
        channel and the date. This output is what an approval-gated action cites.

  check [<number> ...]
        Every open requirement, or the ones named. Exits 1 when something claims
        his approval and cannot show it. Never demands an approval: EMPTY passes.

  stamp <number> --approved-by <citation> [--authored-by <who>]
        Print the block, with the gloss generated from the record rather than typed.
        Refuses to stamp a citation that does not resolve.

  report
        The measured state of the hub, including the legacy claim this replaces.`);
  process.exit(cmd === 'help' ? 0 : 2);
}

try {
  const index = buildApprovalIndex(await collectDecisionLog());
  process.exit(await COMMANDS[cmd](index));
} catch (err) {
  console.error(`provenance: ${err.message}`);
  process.exit(2);
}
