// Who wrote a requirement, and who approved it — as two facts that cannot be
// confused with each other.
//
// Requirement: jwildfire/obot.roadmap#215. A requirement written by an agent must
// not be able to authorise what only @jwildfire can authorise, and today it can:
// a filed requirement is milestoned, boarded and linked to a goal, and nothing on
// its face separates scope he agreed to from scope an agent inferred. #211's
// spike-harness teardown was the Navigator's own judgement and read identically to
// the half that came from his decision; a worker prepared to delete files on the
// strength of it.
//
// ## The call this module makes
//
// #215 left one call open — whether provenance is structured enough to check
// mechanically, or whether a convention plus review is the honest limit — with the
// warning that a field nobody fills is worse than a sentence everybody writes.
//
// The measurement settles it, and not in the direction the warning expects. The
// sentence everybody writes already exists: 75 of the hub's 113 requirement bodies
// end "and reviewed by @jwildfire", 9 say "not yet reviewed", and #215 itself —
// drafted unattended, never shown to him before filing — asserted that he reviewed
// it. A costless sentence had already drifted from the truth 75 times. So the
// problem was never a field going unfilled; it was a claim nobody could check.
//
// Hence exactly one mechanical property, and it is not presence:
//
//   A non-empty `Approved by` must RESOLVE to a record the filer did not write.
//
// Nothing here ever demands an approval. `EMPTY` is always valid and costs nothing,
// which is what makes it safe to require honesty of the other branch: an approval
// is either checkable or it is not written down. The one thing that cannot happen
// is an unverifiable claim that he agreed.
//
// What stays convention, stated rather than pretended away: whether the resolved
// approval actually COVERS the scope claimed. No script can judge that — the second
// worked example on #215 is three agents failing to settle exactly that question
// about one sentence. `Beyond the approval` is where the author declares the gap in
// their own words, and a reader still has to read it.
//
// ## The block
//
// Three lines, at the foot of the issue body, in the slot the drafted-by line
// already occupies (98 of 100 sampled bodies put it there). Deliberately NOT a sixth `###`
// section: AGENTS.md forbids adding one, downstream parsers split on the five, and
// an HTML comment — the other in-body metadata slot — renders invisibly, which is
// the one thing #215 rules out.
//
//   Authored by: 🧭🤖 obot-navigator (Claude Code using Opus 5)
//   Approved by: D0018.1 — @jwildfire, 2026-08-16, in chat
//   Beyond the approval: the spike-harness teardown in Overview — the Navigator's own
//
// `Approved by` holds citations, never prose. Admissible values:
//
//   EMPTY                    nobody has approved this. Always valid.
//   D0018                    an artifact in the decision registry that records a decision
//   D0018.1                  one question on it — preferred, because it names what was asked
//   owner/repo#123 review    a native GitHub review — preferred over all of the above
//                            where it exists, because it is self-provenancing
//
// The `— gloss` after the citations is optional, human-facing, and GENERATED rather
// than typed (`node scripts/provenance.mjs stamp`). It is checked against what the
// citation resolves to, so a hand-typed gloss that disagrees with the record is a
// finding rather than a decoration.
//
// `Beyond the approval` is required whenever `Approved by` is not EMPTY, and `none`
// is a valid — and load-bearing — answer. It is the per-claim half of #215: when a
// citation covers part of a requirement, the author has to say what it does not
// cover, which is the exact question #211 got wrong by never being asked it.
//
// ## Why a pointer and not a copy
//
// His words, the channel and the date already live on the decision artifact, and
// the artifact is the source of truth by rule (reports/decisions/README.md: "never
// hand-maintain the log"). Copying them into an issue body would be the third place
// the same fact is asserted — #196's two-sources-of-truth failure with one more
// source. So the field stores a pointer and this module does the join.
//
// That is also what makes the field un-self-certifiable, which was #215's second
// stated property. Filling it in falsely requires editing a published decision
// artifact, which is a separate, visible, reviewed act — not a line an agent types
// about itself while filing.

/** The literal an unapproved requirement carries. Uppercase so it reads as a fact. */
export const EMPTY = 'EMPTY';

/** `D0018` — a decision artifact. Same shape the ID registry enforces. */
const ARTIFACT_RE = /^[A-Z]\d{4}$/;
/** `D0018.1` — one question on it. The number is plain, not padded. */
const QUESTION_RE = /^[A-Z]\d{4}\.[1-9]\d*$/;
/** `owner/repo#123 review` — a native GitHub review on a pull request. */
const REVIEW_RE = /^([A-Za-z0-9][\w.-]*\/[\w.-]+)#(\d+)\s+review$/;

const LABELS = {
  authoredBy: /^[ \t]*Authored by:[ \t]*(.*)$/gmi,
  approvedBy: /^[ \t]*Approved by:[ \t]*(.*)$/gmi,
  beyond: /^[ \t]*Beyond the approval:[ \t]*(.*)$/gmi,
};

/**
 * The body with fenced code blocks blanked out.
 *
 * A requirement that documents this convention quotes the block, and a naive scan
 * would read the example as the issue's own provenance — which would let a page of
 * prose about approvals assert one. The same trap the attribution-guard hit from the
 * other side: a checker that cannot tell an example from the real thing is worse than
 * none, because it is confidently wrong in the direction of claiming approval.
 */
const outsideFences = (body = '') => {
  let fenced = false;
  return body.split('\n').map((line) => {
    if (/^\s*(```|~~~)/.test(line)) { fenced = !fenced; return ''; }
    return fenced ? '' : line;
  }).join('\n');
};

/**
 * The LAST match, because the block lives at the foot of the body. An issue that
 * mentions the lines in prose above its own block loses to the block.
 */
const field = (body, re) => {
  re.lastIndex = 0;
  let last = null, m;
  while ((m = re.exec(body)) !== null) last = m[1];
  return (last ?? '').trim();
};

/**
 * The legacy claim this convention replaces.
 *
 * The drafted-by line has asserted "and reviewed by @jwildfire" on two thirds of
 * the hub's requirements, including ones filed in unattended sessions where no
 * review was possible. Reported rather than rewritten: 74 bodies is a bulk edit,
 * and bulk-editing his record to say something different about his own review is
 * not a call an agent makes unattended. Counted in reports/requirement-provenance/.
 *
 * Returns `asserted` (claims he reviewed it), `disclaimed` (says he has not yet),
 * or `none`.
 */
export function reviewClaim(body = '') {
  const line = body.match(/^.*\bdrafted by\b.*$/mi)?.[0] ?? '';
  if (!line) return 'none';
  if (/not (?:yet )?reviewed by @?jwildfire/i.test(line)) return 'disclaimed';
  if (/reviewed by @?jwildfire/i.test(line)) return 'asserted';
  return 'none';
}

/** Split `D0018.1, owner/repo#9 review — gloss` into its citations and its gloss. */
function splitCitations(value) {
  const [head, ...rest] = value.split(/\s+—\s+/);
  return {
    citations: head.split(',').map((s) => s.trim()).filter(Boolean),
    gloss: rest.join(' — ').trim(),
  };
}

/**
 * Classify one citation without resolving it.
 *
 * Shape is separate from existence on purpose: "that is not a citation" and "that
 * citation does not resolve" are different findings with different fixes, and
 * collapsing them produces the unhelpful half of both.
 */
export function parseCitation(raw = '') {
  const text = raw.trim();
  if (!text) return { kind: 'unknown', text, why: 'empty citation' };
  if (text.toUpperCase() === EMPTY) return { kind: 'empty', text };
  if (QUESTION_RE.test(text)) return { kind: 'question', text, artifact: text.split('.')[0], question: text };
  if (ARTIFACT_RE.test(text)) return { kind: 'artifact', text, artifact: text };
  const review = text.match(REVIEW_RE);
  if (review) return { kind: 'review', text, repo: review[1], pr: Number(review[2]) };
  return {
    kind: 'unknown',
    text,
    why: 'not a decision id (`D0018` / `D0018.1`) or a review pointer (`owner/repo#123 review`)',
  };
}

/**
 * Read the provenance block out of an issue body.
 *
 * Absence is reported, never inferred into a value. A body with no block gets
 * `present: false` and nothing else — the caller decides what that means, because
 * on a requirement filed before this convention it means "unknown", and on one
 * filed after it means "the convention was skipped".
 */
export function parseProvenance(body = '') {
  const scan = outsideFences(body);
  const authoredBy = field(scan, LABELS.authoredBy);
  const approvedRaw = field(scan, LABELS.approvedBy);
  const beyond = field(scan, LABELS.beyond);
  const present = Boolean(authoredBy || approvedRaw);

  const { citations, gloss } = splitCitations(approvedRaw);
  const parsed = citations.map(parseCitation);
  const isEmpty = parsed.length === 1 && parsed[0].kind === 'empty';

  return {
    present,
    authoredBy,
    approvedRaw,
    approved: isEmpty ? [] : parsed,
    isEmpty,
    gloss,
    beyond,
    reviewClaim: reviewClaim(body),
  };
}

// ------------------------------------------------------------------ resolution

/**
 * The set of approvals a citation may point at, built from the decision log.
 *
 * Takes `collectDecisionLog()`'s output rather than reading disk, so the resolver
 * stays a pure function of data the audit and the deploy already collect — and so
 * the tests below can exercise every branch with fixtures instead of a repository.
 */
export function buildApprovalIndex(log = { artifacts: [] }) {
  const byArtifact = new Map();
  const byQuestion = new Map();

  for (const a of log.artifacts ?? []) {
    if (!a?.id) continue;
    const entries = (a.entries ?? []).filter((e) => e?.date);
    byArtifact.set(a.id, { artifact: a, entries });
    for (const q of a.questions ?? []) {
      // The join #215 needs and nothing in the repo does yet: the registry knows a
      // question's code, the artifact's decision blocks say which codes they
      // resolve. Together they answer "what was asked" beside "what he said",
      // which the second worked example showed is the half that goes missing.
      const answering = entries.filter((e) => (e.resolves ?? []).includes(q.code));
      byQuestion.set(q.id, { artifact: a, question: q, entries: answering });
    }
  }
  return { byArtifact, byQuestion };
}

const said = (e) => ({
  date: e.date,
  channel: e.channel,
  verbatim: e.verbatim !== false,
  words: e.quote,
});

/**
 * Does this citation point at something @jwildfire actually decided?
 *
 * Returns `{ ok, citation, why, asked, said, where }`. `ok: false` always carries a
 * `why` a human can act on — an unresolvable approval must never read as a
 * technicality, because the whole point is that somebody trusted it.
 *
 * A review citation cannot be settled from local data; it resolves to
 * `ok: null` (undetermined) and the caller decides whether to spend a network
 * call. Undetermined is deliberately not `false`: reporting a real approval as
 * fake because the checker was offline is its own kind of lie.
 */
export function resolveCitation(citation, index) {
  const c = typeof citation === 'string' ? parseCitation(citation) : citation;

  if (c.kind === 'empty') return { ok: true, citation: c, why: 'nobody has approved this', said: null };
  if (c.kind === 'unknown') return { ok: false, citation: c, why: c.why };

  if (c.kind === 'review') {
    return {
      ok: null,
      citation: c,
      why: `needs GitHub: an APPROVED review by @jwildfire on ${c.repo}#${c.pr}`,
      where: `https://github.com/${c.repo}/pull/${c.pr}`,
    };
  }

  if (c.kind === 'question') {
    const hit = index?.byQuestion?.get(c.question);
    if (!hit) {
      return { ok: false, citation: c, why: `${c.question} is not a question in the decision registry` };
    }
    if (hit.entries.length === 0) {
      return {
        ok: false,
        citation: c,
        why: `${c.question} ("${hit.question.code}") is a real question, but ${hit.artifact.id} records no decision resolving it — it is still open`,
        asked: hit.question.question,
        where: hit.artifact.path,
      };
    }
    return {
      ok: true,
      citation: c,
      asked: hit.question.question,
      said: said(hit.entries[0]),
      where: `${hit.artifact.path}#${c.question}`,
      title: hit.artifact.title,
    };
  }

  // Artifact-level: he decided something on this artifact, but the citation does
  // not say which question. Weaker than a question citation and reported as such.
  const hit = index?.byArtifact?.get(c.artifact);
  if (!hit) return { ok: false, citation: c, why: `${c.artifact} is not in the decision registry` };
  if (hit.entries.length === 0) {
    return { ok: false, citation: c, why: `${c.artifact} exists but records no decision — it is still open` };
  }
  return {
    ok: true,
    citation: c,
    weaker: 'cites the artifact rather than the question it answers',
    said: said(hit.entries[0]),
    where: hit.artifact.path,
    title: hit.artifact.title,
  };
}

/** The one-line human gloss for a resolved citation — generated, never typed. */
export function glossFor(resolved) {
  if (!resolved?.said) return '';
  const { date, channel, verbatim } = resolved.said;
  return `@jwildfire, ${date}, ${channel}${verbatim ? '' : ' (relayed, not verbatim)'}`;
}

// ---------------------------------------------------------------------- verdict

/**
 * Judge one requirement's block. The single entry point every surface uses.
 *
 * `state` is the headline, and the vocabulary is chosen so that no state can be
 * misread as approval:
 *
 *   approved      every citation resolves to something he decided
 *   empty         explicitly nobody — the normal, correct state for agent-written work
 *   unresolved    a citation that does not point at anything, or points at an open
 *                 question. THE finding: something claims his approval and cannot show it
 *   undetermined  a review citation the checker could not reach GitHub to confirm
 *   missing       no block at all
 *
 * `problems` is what a check reports; `state` is what a surface renders.
 */
export function judge(body, index, { requireBlock = true } = {}) {
  const p = parseProvenance(body);
  const problems = [];

  if (!p.present) {
    if (requireBlock) problems.push('no provenance block — the requirement does not say who wrote it or who approved it');
    return { ...p, state: 'missing', resolved: [], problems };
  }

  if (!p.authoredBy) problems.push('`Authored by` is blank — an author is always known, so blank is a skipped line rather than a fact');
  if (!p.approvedRaw) problems.push(`\`Approved by\` is blank — write \`${EMPTY}\` when nobody has approved it, so the absence reads as a fact rather than an oversight`);

  if (p.isEmpty) {
    return { ...p, state: 'empty', resolved: [], problems };
  }

  const resolved = p.approved.map((c) => resolveCitation(c, index));
  for (const r of resolved) {
    if (r.ok === false) problems.push(`\`Approved by: ${r.citation.text}\` does not resolve — ${r.why}`);
  }

  // The per-claim half. Required only once an approval is claimed, because that is
  // the only time the question "what does it not cover?" has an answer to get wrong.
  if (!p.beyond) {
    problems.push('`Approved by` names an approval but `Beyond the approval` is missing — say what the author added that the approval does not cover, or write `none`');
  }

  // A generated gloss that disagrees with the record is worse than none: it is the
  // readable half, and it is the half a reader in a hurry will believe.
  const first = resolved.find((r) => r.said);
  if (p.gloss && first) {
    const want = glossFor(first);
    if (want && p.gloss !== want) {
      problems.push(`the gloss reads "${p.gloss}" but ${first.citation.text} records "${want}" — the gloss is generated by \`scripts/provenance.mjs stamp\`, not typed`);
    }
  }

  const bad = resolved.some((r) => r.ok === false);
  const unknown = resolved.some((r) => r.ok === null);
  return {
    ...p,
    resolved,
    state: bad ? 'unresolved' : unknown ? 'undetermined' : 'approved',
    problems,
  };
}
