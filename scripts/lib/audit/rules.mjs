// The roadmap audit rule registry (requirement #92).
//
// A rule is a pure function of a snapshot. It knows one convention of this hub,
// why that convention exists, and what to do about a violation — and it returns
// findings, never side effects. That purity is the whole design: it makes a
// finding reproducible, unit-testable against a fixture, and safe to re-validate
// before anything is applied.
//
// Each finding carries:
//   confidence  high   deterministic detection AND an unambiguous fix
//               medium detection is solid; the fix is a judgment call the
//                      proposal states outright
//               low    heuristic detection, or an open convention question
//   proposal    {kind: 'mechanical', ops: [...]}  executed by apply_audit_decision.mjs
//               {kind: 'agentic', prompt}         handed to a bounded headless agent
//
// Nothing here applies anything. Accept is the only thing that does, and it goes
// through the executor with a fresh snapshot.
//
// Adding a rule: export one object in RULES. Keep `why` written for a human
// reading the dashboard's rule list — it is the convention's documentation.

import { judge } from '../provenance.mjs';

export const STAGES = ['Backlog', 'Requirement Gathering', 'Design', 'Development', 'Review', 'Released'];
export const IN_FLIGHT = ['Development', 'Review'];
export const OWNER_LOGIN = 'jwildfire';

// Thresholds, named so they can be argued with rather than found in a comparison.
export const T = {
  stalledDays: 14,      // in-flight with no activity this long → it stopped, quietly
  releasedIdleDays: 10, // "Released" but still open this long → it is done, unclosed
  releasedSureDays: 30, // …and this long makes the close unambiguous
  mergeGraceDays: 2,    // let GitHub's own auto-close settle before calling it a miss
  goalIdleDays: 45,     // a goal with no members this long is decoration
};

// Discussions that are furniture, not ideas: the pinned inbox explainer and the
// triage meta thread (the same pair ideas-triage.yml hard-excludes).
const IDEA_EXCLUDE = new Set([47, 84]);

const days = (iso, now) => (iso ? (now - new Date(iso)) / 86400000 : Infinity);
const has = (issue, label) => issue.labels.includes(label);
const isRequirement = (issue) => has(issue, 'requirement');
const isGoal = (issue) => has(issue, 'goal');
const tracked = (issue) => isRequirement(issue) || isGoal(issue);
const key = (repo, number) => `${repo}#${number}`;

const subject = (issue) => ({
  kind: 'issue',
  repo: issue.repo,
  number: issue.number,
  title: issue.title,
  url: issue.url,
});

// Is a goal reachable from this issue by walking parents upward?
//
// Requirement-under-requirement nesting is legitimate (#122 → #18 → goal #73),
// so goal membership is an *ancestor* question, not a parent question. Checking
// only the direct parent is what made GOALLESS-REQUIREMENT report two false
// positives out of three on 2026-08-15 — and a false positive is the one kind of
// finding no rule can resolve for itself. Parents are always hub issues, and the
// visited set makes a data cycle terminate rather than hang the audit.
const hasGoalAncestor = (s, issue) => {
  const seen = new Set();
  const queue = [key(issue.repo, issue.number)];
  while (queue.length) {
    const k = queue.shift();
    if (seen.has(k)) continue;
    seen.add(k);
    for (const parent of s.parentOf.get(k) ?? []) {
      if (parent.labels?.includes('goal')) return true;
      queue.push(key(s.hub, parent.number));
    }
  }
  return false;
};

// Board items for an issue (a list — being on the board twice is itself a rule).
const itemsFor = (s, repo, number) => s.boardByKey.get(key(repo, number)) ?? [];
const statusOf = (s, repo, number) => itemsFor(s, repo, number).map((i) => i.status).find((v) => v) ?? null;
const openPrsFor = (s, repo, number) => s.prs.open.filter((pr) =>
  pr.closes.some((c) => c.repo === repo && c.number === number)
  || (repo === s.hub && pr.hubRefs.includes(number)));

// Where a rule needs a stage but the board has none, say so rather than guessing.
function inferStatus(s, issue) {
  if (issue.state === 'CLOSED') return 'Released';
  if (openPrsFor(s, issue.repo, issue.number).length) return 'Development';
  if (s.designDocs.has(issue.number)) return 'Design';
  if (issue.subSummary.total && issue.subSummary.completed === issue.subSummary.total) return 'Review';
  return 'Backlog';
}

// ------------------------------------------------------------------ op helpers
const setStatus = (item, value) => ({
  op: 'set-board-status', itemId: item.itemId, value,
  label: `board Status → ${value}`,
});
const addToBoard = (repo, number, value) => ({
  op: 'add-to-board', repo, number, value,
  label: `add to the obot Roadmap project at ${value}`,
});
const removeItem = (item) => ({
  op: 'remove-board-item', itemId: item.itemId,
  label: 'remove the duplicate board item',
});
const closeIssue = (repo, number, reason = 'completed') => ({
  op: 'close-issue', repo, number, reason,
  label: `close ${key(repo, number)} as ${reason}`,
});
const addLabel = (repo, number, name) => ({
  op: 'add-label', repo, number, name,
  label: `add the \`${name}\` label`,
});
const assign = (repo, number, login = OWNER_LOGIN) => ({
  op: 'assign', repo, number, login,
  label: `assign @${login}`,
});
const setMilestone = (repo, number, title) => ({
  op: 'set-milestone', repo, number, title,
  label: `set milestone \`${title}\``,
});
const closeDiscussion = (number, nodeId) => ({
  op: 'close-discussion', number, nodeId, reason: 'RESOLVED',
  label: `close discussion #${number} as resolved`,
});

// ============================================================== board integrity
const closedNotReleased = {
  id: 'CLOSED-NOT-RELEASED',
  title: 'Closed issue still parked in an active stage',
  group: 'Board integrity',
  why: 'The board Status is what the roadmap page and the `--auto` lane read as the stage of record. A closed issue sitting in Development makes the lane look busier than it is and hides what actually shipped — the exact drift the 2026-07-11 usage audit caught.',
  fix: 'Set the board Status to Released.',
  needs: 'board',
  check(s) {
    return s.board.items
      .filter((it) => it.contentState === 'CLOSED' && it.status && it.status !== 'Released')
      .map((it) => ({
        confidence: 'high',
        subject: { kind: 'issue', repo: it.repo, number: it.number, title: it.title, url: it.url },
        evidence: [`issue is CLOSED`, `board Status is ${it.status}`],
        proposal: {
          kind: 'mechanical',
          summary: `Set board Status to Released (currently ${it.status}).`,
          ops: [setStatus(it, 'Released')],
        },
      }));
  },
};

const openInReleased = {
  id: 'OPEN-IN-RELEASED',
  title: 'Open issue the board calls Released',
  group: 'Board integrity',
  why: 'Released is a terminal stage, and under @jwildfire\'s one-requirement-one-release rule (2026-08-15) nothing is ever open in it on purpose. An open issue at Released is one of exactly three defects: finished work nobody closed, live work filed in the wrong lane, or a requirement whose scope spans more than one release. There is deliberately no label, marker or comment that silences this rule — an escape hatch would restore the ambiguity the rule exists to remove.',
  fix: 'Close it if the work is done; move the stage back if the work is live; split it if it carries scope beyond the release it delivered.',
  needs: 'board',
  check(s) {
    const out = [];
    for (const it of s.board.items) {
      if (it.contentState !== 'OPEN' || it.status !== 'Released') continue;
      const issue = it.repo === s.hub ? s.issueByNumber.get(it.number) : null;
      const openSubs = issue ? issue.subIssues.filter((x) => x.state === 'OPEN') : [];
      const idle = issue ? days(issue.updatedAt, s.now) : null;
      const evidence = [`issue is OPEN`, 'board Status is Released'];
      if (issue) evidence.push(`${openSubs.length} open sub-issue${openSubs.length === 1 ? '' : 's'}`, `last touched ${Math.round(idle)}d ago`);

      if (issue && !openSubs.length && idle > T.releasedIdleDays) {
        out.push({
          confidence: idle > T.releasedSureDays ? 'high' : 'medium',
          subject: { kind: 'issue', repo: it.repo, number: it.number, title: it.title, url: it.url },
          evidence,
          proposal: {
            kind: 'mechanical',
            summary: `Close it as completed — the board already says the work shipped, nothing is left open under it, and it has not moved in ${Math.round(idle)} days.`,
            ops: [closeIssue(it.repo, it.number, 'completed')],
          },
        });
        continue;
      }
      if (openSubs.length) {
        // A Released requirement with open sub-issues is a requirement spanning more than
        // one release, which the one-requirement-one-release rule forbids. The remedy is the
        // split, not a stage move back: the delivered scope really did ship, and dragging the
        // requirement to Review would deny that. Left agentic on purpose — the audit can
        // prepare the whole split, but choosing the new requirement's milestone is a
        // scheduling judgement, and a wrongly-split requirement is expensive to unpick.
        const subList = openSubs.map((x) => `${x.repo}#${x.number}`).join(', ');
        out.push({
          confidence: 'medium',
          subject: { kind: 'issue', repo: it.repo, number: it.number, title: it.title, url: it.url },
          evidence,
          proposal: {
            kind: 'agentic',
            summary: `Split it — the board says it shipped, but ${openSubs.length} sub-issue${openSubs.length === 1 ? ' is' : 's are'} still open, so it covers more than one release.`,
            prompt: [
              'This requirement delivered a release and still carries unshipped scope, which the one-requirement-one-release rule forbids (README — One requirement, one release).',
              `Open sub-issues: ${subList}.`,
              'Work out which release the requirement actually delivered, and which sub-issues did not make it.',
              'Then, in this order: (1) comment on this issue naming what shipped and where, what is deferred and why, and where it went; (2) file a new requirement for the deferred scope, with the five template sections, assignee jwildfire and its own milestone; (3) TRANSFER the deferred sub-issues to it — removeSubIssue from this parent then addSubIssue to the new one, never close-and-refile, so scoping and history survive; (4) correct any sub-issue milestone that names a release the work did not ship in; (5) close this issue as completed and leave the board at Released.',
              'Two exceptions need no new requirement: a defect found after release is an ordinary issue against shipped work, and scope that already has a requirement of its own was merely nested — in both cases re-home it to the parent goal and say so.',
            ].join(' '),
          },
        });
        continue;
      }
      out.push({
        confidence: 'medium',
        subject: { kind: 'issue', repo: it.repo, number: it.number, title: it.title, url: it.url },
        evidence,
        proposal: {
          kind: 'agentic',
          summary: 'Decide whether the work is finished (close it) or still live (move the stage back), then do that.',
          prompt: 'Read the issue and any linked PRs. Recent activity on a Released issue is evidence the work is live, so lean towards a stage error rather than a close. If the work is finished, close the issue as completed and leave the board at Released. If it is not finished, set the board Status to the stage it is genuinely in. If it turns out to carry scope beyond the release it delivered, split it instead — note the deferral here, file a new requirement with its own milestone, transfer the deferred sub-issues, then close this one. Say which you did and why in one comment on the issue.',
        },
      });
    }
    return out;
  },
};

const unstagedBoardItem = {
  id: 'UNSTAGED-BOARD-ITEM',
  title: 'Board item with no Status',
  group: 'Board integrity',
  why: 'An item with no Status is on the board but outside the lifecycle: it appears in no stage lane, the roadmap page has to call it "Unstaged", and the `--auto` selector cannot reason about it.',
  fix: 'Set the Status the evidence supports — Released if it is closed, otherwise the stage its PRs and design artifacts imply.',
  needs: 'board',
  check(s) {
    return s.board.items
      .filter((it) => !it.status && it.number)
      .map((it) => {
        const issue = it.repo === s.hub ? s.issueByNumber.get(it.number) : null;
        const closed = it.contentState === 'CLOSED';
        const value = closed ? 'Released' : issue ? inferStatus(s, issue) : 'Backlog';
        const evidence = ['no board Status set', `issue is ${it.contentState ?? 'unknown'}`];
        if (!closed && issue) {
          const prs = openPrsFor(s, issue.repo, issue.number);
          if (prs.length) evidence.push(`${prs.length} open PR: ${prs.map((p) => `${p.repo}#${p.number}`).join(', ')}`);
          if (s.designDocs.has(issue.number)) evidence.push('design doc on disk');
        }
        return {
          confidence: closed ? 'high' : 'medium',
          subject: { kind: 'issue', repo: it.repo, number: it.number, title: it.title, url: it.url },
          evidence,
          proposal: {
            kind: 'mechanical',
            summary: closed
              ? 'Set board Status to Released — the issue is closed.'
              : `Set board Status to ${value}, inferred from ${evidence.slice(2).join(' + ') || 'the absence of any in-flight signal'}.`,
            ops: [setStatus(it, value)],
          },
        };
      });
  },
};

// What the board is supposed to hold — which is not the same thing as what
// carries the `requirement` label (#201).
//
// The label is a filing habit. Hub #189–#193 were filed with `infrastructure`
// and `ai`, sat off the board, and OFF-BOARD-REQUIREMENT could not have named
// them even on a fresh run: it was gated on a label they never had. The board is
// the stage tracker for hub work, so the population is the work, not the tag.
//
// Two exclusions, each with a rule of its own behind it:
//
//   goals        are deliberately not board items — permanent, so no delivery
//                stage they could ever reach (@jwildfire, R3-a, 2026-08-15).
//                GOAL-BOARD-INCONSISTENT takes any goal it finds back off.
//   closed and   is archaeology. A closed *requirement* still fires, because
//   unlabelled   that is coverage this rule already had; asking for a board item
//                on an unlabelled issue that finished months ago is paperwork
//                about work that is over.
//
// `audit-decision` issues never reach this: snapshot.mjs drops them upstream.
//
// This overlaps UNTRACKED-TASK on an issue with no label, no parent and no board
// item — #189–#193 were exactly that shape — and the overlap is deliberate. The
// two rules answer different questions (what stage is it in / what does it serve)
// and propose different fixes, the mechanical one here is the cheap half, and
// applying it takes the issue out of UNTRACKED-TASK's population on the next run.
const belongsOnBoard = (i) => {
  if (isGoal(i)) return false;
  return i.state === 'OPEN' || isRequirement(i);
};

const offBoardRequirement = {
  id: 'OFF-BOARD-REQUIREMENT',
  title: 'Hub issue missing from the board',
  group: 'Board integrity',
  why: 'The obot Roadmap project is the stage tracker for hub work. An issue that never got added is invisible to the stage lanes, to the roadmap page\'s stage grouping, and to any review that starts from the board — which is how a burst of promoted ideas can vanish the day after it is filed. The population deliberately does not depend on the `requirement` label: #189–#193 were filed with `infrastructure` and `ai`, sat off the board, and a label-gated rule could not have named them even on a fresh run (#201).',
  fix: 'Add it to the project and give it a Status.',
  needs: 'board',
  check(s) {
    return s.issues
      .filter((i) => belongsOnBoard(i) && !itemsFor(s, i.repo, i.number).length)
      .map((i) => {
        const value = inferStatus(s, i);
        return {
          confidence: 'high',
          subject: subject(i),
          evidence: [
            // What it actually carries, rather than the label the rule used to
            // require — the old evidence line asserted `requirement` on every
            // finding because nothing else could produce one.
            i.labels.length ? `labelled ${i.labels.map((l) => `\`${l}\``).join(', ')}` : 'no labels',
            'no item on the obot Roadmap project',
            `issue is ${i.state}`,
          ],
          proposal: {
            kind: 'mechanical',
            summary: `Add it to the obot Roadmap project at ${value}.`,
            ops: [addToBoard(i.repo, i.number, value)],
          },
        };
      });
  },
};

const boardDuplicate = {
  id: 'BOARD-DUPLICATE',
  title: 'Same issue on the board twice',
  group: 'Board integrity',
  why: 'Duplicate items double-count a requirement in every stage tally and let two copies hold different Statuses, so the board contradicts itself. One appeared during the #53 goal migration and had to be removed by hand.',
  fix: 'Remove the extra items, keeping the one that carries a Status.',
  needs: 'board',
  check(s) {
    const out = [];
    for (const [k, items] of s.boardByKey) {
      if (items.length < 2) continue;
      const keep = items.find((i) => i.status) ?? items[0];
      const drop = items.filter((i) => i !== keep);
      const [repo, number] = [k.split('#')[0], Number(k.split('#')[1])];
      out.push({
        confidence: 'high',
        subject: { kind: 'issue', repo, number, title: keep.title, url: keep.url },
        evidence: [`${items.length} board items for the same issue`,
          `statuses: ${items.map((i) => i.status ?? 'none').join(', ')}`],
        proposal: {
          kind: 'mechanical',
          summary: `Remove ${drop.length} duplicate board item${drop.length === 1 ? '' : 's'}, keeping the one at ${keep.status ?? 'no Status'}.`,
          ops: drop.map(removeItem),
        },
      });
    }
    return out;
  },
};

// =================================================================== hierarchy
const closedParentOpenSubs = {
  id: 'CLOSED-PARENT-OPEN-SUBS',
  title: 'Closed parent with open sub-issues',
  group: 'Hierarchy',
  why: 'Sub-issues are the canonical task tracker for a requirement, so a closed parent asserts its children are finished. When they are not, the remaining work is orphaned — visible on no requirement, in no stage, and to nobody. (@jwildfire named this one as the founding example of the audit.)',
  fix: 'Close the children that are actually done; move genuine follow-on scope to a follow-up requirement — the #30 → #88 precedent — or reopen the parent.',
  check(s) {
    const out = [];
    for (const issue of s.issues) {
      if (issue.state !== 'CLOSED') continue;
      const open = issue.subIssues.filter((x) => x.state === 'OPEN');
      if (!open.length) continue;

      // A sub-issue with a merged PR that closes it is simply an unclosed
      // done item — mechanical. Anything else is a scope judgment.
      const merged = new Map();
      for (const pr of s.prs.merged) {
        for (const c of pr.closes) {
          if (open.some((o) => o.repo === c.repo && o.number === c.number)) merged.set(key(c.repo, c.number), pr);
        }
      }
      const allMerged = open.every((o) => merged.has(key(o.repo, o.number)));
      const evidence = [
        `parent CLOSED${issue.stateReason ? ` (${issue.stateReason.toLowerCase()})` : ''}`,
        `${open.length} open sub-issue${open.length === 1 ? '' : 's'}: ${open.map((o) => `${o.repo.split('/')[1]}#${o.number}`).join(', ')}`,
      ];
      if (merged.size) evidence.push(`${merged.size} of them have a merged PR`);

      if (allMerged) {
        out.push({
          confidence: 'high',
          subject: subject(issue),
          evidence,
          proposal: {
            kind: 'mechanical',
            summary: `Close all ${open.length} sub-issues as completed — each has a merged PR that closes it.`,
            ops: open.map((o) => closeIssue(o.repo, o.number, 'completed')),
          },
        });
        continue;
      }
      out.push({
        confidence: 'medium',
        subject: subject(issue),
        evidence,
        proposal: {
          kind: 'agentic',
          summary: 'Resolve each open sub-issue: close the finished ones, and re-parent real remaining scope to a follow-up requirement rather than leaving it under a closed parent.',
          prompt: `The parent is closed but ${open.length} sub-issues are open: ${open.map((o) => `${o.repo}#${o.number}`).join(', ')}. For each, read it and decide: (a) the work shipped → close it as completed; (b) it is genuine follow-on scope → file ONE follow-up requirement in the hub carrying the remaining sub-issues (the #30 → #88 precedent: same goal parent, board Backlog, milestone set) and link them under it; (c) the parent was closed prematurely → reopen the parent and say so. Do not leave any sub-issue parented to a closed issue. Report what you did as a comment on the parent.`,
        },
      });
    }
    return out;
  },
};

const subsDoneParentOpen = {
  id: 'SUBS-DONE-PARENT-OPEN',
  title: 'All sub-issues closed, parent still open',
  group: 'Hierarchy',
  why: 'When every task under a requirement is closed the requirement is done being built; leaving it open in an earlier stage means the board understates progress and the review queue never surfaces it.',
  fix: 'Move it to Review, or close it if it has already sat in Review.',
  check(s) {
    const out = [];
    for (const issue of s.issues) {
      if (issue.state !== 'OPEN' || !isRequirement(issue)) continue;
      if (!issue.subSummary.total || issue.subSummary.completed !== issue.subSummary.total) continue;
      const status = statusOf(s, issue.repo, issue.number);
      if (status === 'Released') continue; // OPEN-IN-RELEASED owns that case
      const idle = days(issue.updatedAt, s.now);
      const evidence = [`${issue.subSummary.total}/${issue.subSummary.total} sub-issues closed`,
        `board Status is ${status ?? 'unset'}`, `last touched ${Math.round(idle)}d ago`];
      const items = itemsFor(s, issue.repo, issue.number);
      if (status === 'Review') {
        out.push({
          confidence: 'medium',
          subject: subject(issue),
          evidence,
          proposal: {
            kind: 'mechanical',
            summary: 'Close it as completed and set the board to Released — every task under it is closed and it is already in Review.',
            ops: [closeIssue(issue.repo, issue.number, 'completed'), ...items.map((it) => setStatus(it, 'Released'))],
          },
        });
        continue;
      }
      if (!items.length) continue; // OFF-BOARD-REQUIREMENT owns that case
      out.push({
        confidence: 'medium',
        subject: subject(issue),
        evidence,
        proposal: {
          kind: 'mechanical',
          summary: `Move it to Review — all its tasks are closed but the board still says ${status ?? 'unset'}.`,
          ops: items.map((it) => setStatus(it, 'Review')),
        },
      });
    }
    return out;
  },
};

const goallessRequirement = {
  id: 'GOALLESS-REQUIREMENT',
  title: 'Open requirement under no goal',
  group: 'Hierarchy',
  why: 'Since #53 goals are hub issues and membership is the sub-issue link — nothing else. Membership is inherited, so a requirement nested under another requirement still belongs to that requirement\u2019s goal; only an issue with no goal anywhere up its parent chain belongs to no standing direction, never appears on a goal page, and can never be picked up by an autonomous session selecting by goal.',
  fix: 'Link it under the goal it serves, or state why it is deliberately standalone.',
  check(s) {
    const goalTitles = s.issues.filter((i) => isGoal(i) && i.state === 'OPEN')
      .map((i) => `#${i.number} ${i.title.replace(/^Goal:\s*/i, '')}`);
    return s.issues
      .filter((i) => i.state === 'OPEN' && isRequirement(i) && !isGoal(i))
      .filter((i) => !hasGoalAncestor(s, i))
      .map((i) => ({
        confidence: 'medium',
        subject: subject(i),
        evidence: ['open requirement', 'no `goal`-labelled ancestor at any depth'],
        proposal: {
          kind: 'agentic',
          summary: 'Link it under the goal it serves.',
          prompt: `Read the requirement and the open goals (${goalTitles.join('; ')}). If it clearly serves one, link it as a sub-issue of that goal (gh api repos/jwildfire/obot.roadmap/issues/{goal}/sub_issues). If it genuinely belongs to none, add one sentence to the issue body explaining why it is standalone, so the audit stops asking. Do not invent a new goal.`,
        },
      }));
  },
};

const untrackedTask = {
  id: 'UNTRACKED-TASK',
  title: 'Hub issue in no structure at all',
  group: 'Hierarchy',
  why: 'The hub has exactly three ways an issue is visible: the `requirement` label puts it on the roadmap page, a sub-issue link puts it on a goal page, and a board item puts it in a stage lane. An issue with none of the three is filed and then invisible — it will be found again only by accident.',
  fix: 'Link it under the goal or requirement it belongs to, or promote it to a requirement.',
  check(s) {
    return s.issues
      .filter((i) => i.state === 'OPEN' && !tracked(i))
      .filter((i) => !(s.parentOf.get(key(i.repo, i.number)) ?? []).length)
      .filter((i) => !itemsFor(s, i.repo, i.number).length)
      .map((i) => ({
        confidence: 'medium',
        subject: subject(i),
        evidence: ['no `requirement` or `goal` label', 'not a sub-issue of anything',
          'not on the obot Roadmap project', `filed ${Math.round(days(i.createdAt, s.now))}d ago`],
        proposal: {
          kind: 'agentic',
          summary: 'Give it a home: link it under the goal or requirement it serves, or promote it to a requirement.',
          prompt: 'Read the issue. If it is a small concrete task, link it as a sub-issue of the goal or requirement it serves (#53 allows small items to live directly under a goal). If it is really a scoped piece of work with its own lifecycle, promote it: add the `requirement` label, rewrite the body to the requirement template, add it to the obot Roadmap project at Backlog, and link it under a goal. Do not close it.',
        },
      }));
  },
};

const goalNoMembers = {
  id: 'GOAL-NO-MEMBERS',
  title: 'Goal with no member requirements',
  group: 'Hierarchy',
  why: 'A goal exists to group work and to give an autonomous session something to select from. With no sub-issues it is a statement of intent the machinery cannot act on.',
  fix: 'Link the requirements that serve it, or retire the goal.',
  check(s) {
    return s.issues
      .filter((i) => i.state === 'OPEN' && isGoal(i) && !i.subSummary.total)
      .filter((i) => days(i.createdAt, s.now) > 7) // a goal filed today is allowed to be empty
      .map((i) => ({
        confidence: 'low',
        subject: subject(i),
        evidence: ['open `goal` issue', 'zero sub-issues', `filed ${Math.round(days(i.createdAt, s.now))}d ago`],
        proposal: {
          kind: 'agentic',
          summary: 'Populate the goal with the requirements that serve it, or retire it.',
          prompt: 'Find the open requirements that serve this goal and link them as sub-issues. If none exist and none are planned, close the goal and say why in a comment. Never edit the goal body\'s prose beyond what #53 v2 allows (prose-only bodies, no hand-maintained lists).',
        },
      }));
  },
};

const goalBoardInconsistent = {
  id: 'GOAL-BOARD-INCONSISTENT',
  title: 'Goals inconsistently placed on the board',
  group: 'Hierarchy',
  why: 'Goals are permanent and do not move through the requirement stages, so a goal on the delivery board is an item with no stage it can ever reach. @jwildfire settled the convention on 2026-08-15 (audit decision R3-a): goals are not board items. They are surfaced by the goal pages and the hierarchy view, which are the better surfaces for something that never finishes.',
  fix: 'Take the goal off the board. Nothing is deleted — the goal issue and its sub-issue links are untouched.',
  needs: 'board',
  check(s) {
    // R3-a (@jwildfire, 2026-08-15): this used to compare goals against each other and ask
    // which convention to adopt — a question, asked every night for twenty nights. The
    // convention is now settled, so the rule enforces it per goal instead of debating it.
    return s.issues
      .filter((i) => i.state === 'OPEN' && isGoal(i))
      .flatMap((g) => itemsFor(s, g.repo, g.number).map((item) => ({
        confidence: 'high',
        subject: subject(g),
        evidence: ['issue carries the `goal` label', 'it has a board item', 'goals are not board items (README, 2026-08-15)'],
        proposal: {
          kind: 'mechanical',
          summary: 'Take it off the board — a goal is permanent, so it has no delivery stage it can ever reach. The issue and its sub-issue links are untouched.',
          ops: [removeItem(item)],
        },
      })));
  },
};

// ===================================================================== linkage
const mergedPrOpenTarget = {
  id: 'MERGED-PR-OPEN-TARGET',
  title: 'Merged PR whose closing target is still open',
  group: 'Linkage',
  why: 'GitHub only auto-closes an issue when the PR is in the same repository. Cross-repo `Closes` lines — the norm here, where implementation PRs live in spoke repos and requirements live in the hub — merge silently without closing anything.',
  fix: 'Close the referenced issue.',
  check(s) {
    const out = [];
    const seen = new Set();
    for (const pr of s.prs.merged) {
      if (days(pr.mergedAt, s.now) < T.mergeGraceDays) continue; // let auto-close settle
      for (const c of pr.closes) {
        if (c.state !== 'OPEN' || seen.has(key(c.repo, c.number))) continue;
        seen.add(key(c.repo, c.number));
        const target = c.repo === s.hub ? s.issueByNumber.get(c.number) : null;
        // A requirement is not closed by one implementation PR; that is what
        // sub-issues are for. Only plain task issues get the mechanical close.
        if (target && tracked(target)) continue;
        out.push({
          confidence: 'high',
          subject: { kind: 'issue', repo: c.repo, number: c.number, title: c.title, url: c.url },
          evidence: [`${pr.repo}#${pr.number} merged ${Math.round(days(pr.mergedAt, s.now))}d ago`,
            'its closing reference names this issue', 'the issue is still OPEN'],
          proposal: {
            kind: 'mechanical',
            summary: `Close it as completed — ${pr.repo}#${pr.number} merged and declares it closed.`,
            ops: [closeIssue(c.repo, c.number, 'completed')],
          },
        });
      }
    }
    return out;
  },
};

const openPrClosedTarget = {
  id: 'OPEN-PR-CLOSED-TARGET',
  title: 'Open PR against an already-closed issue',
  group: 'Linkage',
  why: 'Either the branch is stale work that should be dropped, or the issue was closed while its implementation was still in review. Both are worth knowing; neither resolves itself.',
  fix: 'Close the PR, or reopen the issue.',
  check(s) {
    return s.prs.open
      .filter((pr) => pr.closes.length && pr.closes.every((c) => c.state === 'CLOSED'))
      .map((pr) => ({
        confidence: 'medium',
        subject: { kind: 'pr', repo: pr.repo, number: pr.number, title: pr.title, url: pr.url },
        evidence: [`open ${pr.isDraft ? 'draft ' : ''}PR`,
          `every closing target is closed: ${pr.closes.map((c) => `${c.repo.split('/')[1]}#${c.number}`).join(', ')}`,
          `last touched ${Math.round(days(pr.updatedAt, s.now))}d ago`],
        proposal: {
          kind: 'agentic',
          summary: 'Decide whether the PR is still wanted: close it as superseded, or reopen the issue it implements.',
          prompt: 'Read the PR and the closed issue(s) it references. If the work was delivered another way, close the PR with a one-line comment saying what superseded it and delete the branch if it is safe to. If the work is still needed, reopen the referenced issue and say why. Never merge anything.',
        },
      }));
  },
};

const prNoRequirement = {
  id: 'PR-NO-REQUIREMENT',
  title: 'Open PR with no requirement link',
  group: 'Linkage',
  why: 'The Issue–PR Link Convention exists so a merge closes its requirement and the roadmap page can show which requirement a PR is moving. An unlinked PR is invisible to both.',
  fix: 'Add the closing reference to the requirement or task it implements.',
  check(s) {
    return s.prs.open
      .filter((pr) => !pr.closes.length && !pr.hubRefs.length)
      .filter((pr) => pr.author === OWNER_LOGIN || pr.author.endsWith('[bot]'))
      .map((pr) => ({
        confidence: 'medium',
        subject: { kind: 'pr', repo: pr.repo, number: pr.number, title: pr.title, url: pr.url },
        evidence: ['no closing reference', 'no hub requirement reference in the title or body',
          `opened ${Math.round(days(pr.createdAt, s.now))}d ago by ${pr.author}`],
        proposal: {
          kind: 'agentic',
          summary: 'Identify the issue this PR implements and add the closing reference to its body.',
          prompt: 'Read the PR diff and description, find the issue it implements (search the hub requirements and the PR repo\'s issues), and edit the PR body to add a `Closes <owner>/<repo>#N` line immediately after the opening paragraph, per the Issue–PR Link Convention. If no issue exists, file the task issue first, link it to the right requirement, then reference it. Use the REST API to edit the body — `gh pr edit` is broken here.',
        },
      }));
  },
};

// ================================================== conventions and hygiene
const requirementLabelMissing = {
  id: 'REQUIREMENT-LABEL-MISSING',
  title: 'Requirement-titled issue without the `requirement` label',
  group: 'Conventions',
  why: 'Every generator selects requirements by label. An issue titled "Requirement: …" without the label is absent from the roadmap page, the stage tallies and the goal pages — present on GitHub, missing from the project.',
  fix: 'Add the `requirement` label.',
  check(s) {
    return s.issues
      .filter((i) => /^Requirement:/i.test(i.title) && !isRequirement(i))
      .map((i) => ({
        confidence: 'high',
        subject: subject(i),
        evidence: ['title begins "Requirement:"', 'no `requirement` label',
          `labels: ${i.labels.join(', ') || 'none'}`],
        proposal: {
          kind: 'mechanical',
          summary: 'Add the `requirement` label.',
          ops: [addLabel(i.repo, i.number, 'requirement')],
        },
      }));
  },
};

const assigneeMissing = {
  id: 'ASSIGNEE-MISSING',
  title: 'Tracked issue with no assignee',
  group: 'Conventions',
  why: 'The Assignee Convention puts @jwildfire on every issue the agent files, so his GitHub views ("assigned to me") are the same working set the roadmap shows. Unassigned issues fall out of that view.',
  fix: 'Assign @jwildfire.',
  check(s) {
    return s.issues
      .filter((i) => i.state === 'OPEN' && tracked(i) && !i.assignees.length)
      .map((i) => ({
        confidence: 'high',
        subject: subject(i),
        evidence: [`open ${isGoal(i) ? 'goal' : 'requirement'}`, 'no assignee'],
        proposal: {
          kind: 'mechanical',
          summary: `Assign @${OWNER_LOGIN}.`,
          ops: [assign(i.repo, i.number)],
        },
      }));
  },
};

const milestoneMissing = {
  id: 'MILESTONE-MISSING',
  title: 'Open requirement with no milestone',
  group: 'Conventions',
  why: 'Milestones are the delivery slot (`backlog`, `2026q3`, `2026q4`) and drive the release-facing views. A requirement with none is unscheduled by omission rather than by decision.',
  fix: 'Set `backlog` for anything not yet scheduled; pick the quarter for work in flight.',
  check(s) {
    return s.issues
      .filter((i) => i.state === 'OPEN' && isRequirement(i) && !i.milestone)
      .map((i) => {
        const status = statusOf(s, i.repo, i.number);
        const backlogish = !status || status === 'Backlog';
        return {
          confidence: backlogish ? 'medium' : 'low',
          subject: subject(i),
          evidence: ['open requirement', 'no milestone', `board Status is ${status ?? 'unset'}`],
          proposal: backlogish
            ? {
              kind: 'mechanical',
              summary: 'Set the `backlog` milestone — it is not scheduled into a quarter yet.',
              ops: [setMilestone(i.repo, i.number, 'backlog')],
            }
            : {
              kind: 'agentic',
              summary: 'Set the delivery-slot milestone that matches the stage it is in.',
              prompt: `This requirement is at board Status ${status} with no milestone. Read it, decide between \`2026q3\` (shipping now), \`2026q4\` and \`backlog\` given today's date and the work's state, and set it. State the choice in one line as an issue comment only if it is not obvious from the stage.`,
            },
        };
      });
  },
};

const designMissing = {
  id: 'DESIGN-MISSING',
  title: 'Requirement past Design with no design',
  group: 'Conventions',
  why: 'The lifecycle puts Design before Development for a reason: sub-issues are supposed to be decomposed from it. A requirement in Development whose Design section is empty or "TBD" means the decomposition was improvised, and there is nothing for a reviewer or an autonomous session to work from.',
  fix: 'Populate the Design section, or add a design doc under requirements/design/.',
  check(s) {
    const gated = new Set(['Design', 'Development', 'Review']);
    return s.issues
      .filter((i) => i.state === 'OPEN' && isRequirement(i))
      .filter((i) => gated.has(statusOf(s, i.repo, i.number) ?? ''))
      .filter((i) => !s.designDocs.has(i.number))
      .filter((i) => {
        const section = (i.body.split(/^###\s+Design\s*$/mi)[1] ?? '').split(/^###\s/m)[0].trim();
        return section.length < 120 || /^tbd\b/i.test(section);
      })
      .map((i) => ({
        confidence: 'medium',
        subject: subject(i),
        evidence: [`board Status is ${statusOf(s, i.repo, i.number)}`,
          'no requirements/design/ doc', 'Design section is empty, stub or "TBD"'],
        proposal: {
          kind: 'agentic',
          summary: 'Write the Design section from the work as it actually stands.',
          prompt: 'Use the requirement-design skill. Read the requirement, its sub-issues and any merged PRs, then populate the Design section in the issue body (or add requirements/design/{number}_design.html for a substantial design) describing the approach that is actually being built — not an aspirational one. Keep it factual and short enough to be read.',
        },
      }));
  },
};

// The convention landed with #215; requirements filed before it are not failed for
// a block that did not exist. The date is here rather than inside the rule so it
// reads as a fact about the hub, not a threshold to tune.
export const PROVENANCE_FROM = '2026-08-18';

const approvalUnresolved = {
  id: 'APPROVAL-UNRESOLVED',
  title: 'Requirement claims an approval that does not resolve',
  group: 'Conventions',
  why: 'A requirement written by an agent must not be able to authorise what only @jwildfire can authorise (#215). `Approved by` therefore holds a citation that resolves — a decision id whose artifact records his words, or a native review — and never prose. An unresolvable citation is the exact failure this convention exists to stop: something claims his approval and cannot show it, and the next agent to read it will act on it. On 2026-08-16 one did, and prepared to delete files on the strength of a requirement its own supervisor had written.',
  fix: 'Resolve it or remove it: `node scripts/provenance.mjs resolve <citation>` says why it fails. If he has not decided, the honest value is `EMPTY` — nothing is blocked by writing it.',
  check(s) {
    if (!s.approvals) return [];
    return s.issues
      .filter((i) => i.state === 'OPEN' && isRequirement(i))
      .map((i) => ({ i, v: judge(i.body, s.approvals, { requireBlock: false }) }))
      .filter(({ v }) => v.state === 'unresolved')
      .map(({ i, v }) => ({
        confidence: 'high',
        subject: subject(i),
        evidence: v.problems.slice(0, 3),
        proposal: {
          kind: 'agentic',
          summary: 'Make the approval citation resolve, or set it to EMPTY.',
          prompt: `This requirement's \`Approved by\` line does not resolve: ${v.problems[0]}. Run \`node scripts/provenance.mjs resolve <citation>\` to see why. If @jwildfire genuinely decided this, find the decision artifact that records it and cite the question sub-id (\`D0018.1\`) so the citation carries what was asked as well as what he said. If he did not, set the line to \`Approved by: EMPTY\` — that is a correct and complete answer, and nothing downstream is blocked by it. Do not invent a citation, and do not add a decision artifact just to have something to point at.`,
        },
      }));
  },
};

const provenanceMissing = {
  id: 'PROVENANCE-MISSING',
  title: 'Requirement filed without saying who wrote it or who approved it',
  group: 'Conventions',
  why: `Every requirement filed since ${PROVENANCE_FROM} carries a provenance block: who authored it, and who approved it or \`EMPTY\` (#215). The empty value is the point — a missing field reads as an oversight and invites the next reader to assume, and an explicit "nobody has approved this" reads as a fact and invites them to check. Requirements filed before that date are out of scope here and counted instead in reports/requirement-provenance/, because rewriting 75 existing bodies to say something different about his own review is not a change an agent makes unattended.`,
  fix: 'Add the block at the foot of the body: `node scripts/provenance.mjs stamp <number>` prints it.',
  check(s) {
    if (!s.approvals) return [];
    return s.issues
      .filter((i) => i.state === 'OPEN' && isRequirement(i))
      .filter((i) => (i.createdAt ?? '') >= PROVENANCE_FROM)
      .filter((i) => judge(i.body, s.approvals, { requireBlock: false }).state === 'missing')
      .map((i) => ({
        confidence: 'high',
        subject: subject(i),
        evidence: [`filed ${(i.createdAt ?? '').slice(0, 10)}, after the convention`, 'no `Authored by` / `Approved by` lines in the body'],
        proposal: {
          kind: 'agentic',
          summary: 'Add the provenance block naming the author, with EMPTY unless an approval resolves.',
          prompt: 'Add the three-line provenance block at the foot of this requirement (see AGENTS.md, "Who wrote it, and who approved it"). `Authored by` is whoever wrote the prose — an agent identity or @jwildfire. `Approved by` is `EMPTY` unless a recorded decision or a native GitHub review covers it, in which case cite it and run `node scripts/provenance.mjs check <number>` to confirm it resolves. Never write `Approved by` from your own reading of a conversation; if the decision is real but unrecorded, the fix is a decision artifact, not a citation.',
        },
      }));
  },
};

const autoDraftConflict = {
  id: 'AUTO-DRAFT-CONFLICT',
  title: 'Issue labelled both `auto` and `draft`',
  group: 'Conventions',
  why: 'The two labels are opposites: `auto` means the #18 implementation-ready criteria are met and an autonomous session may take it; `draft` means it needs @jwildfire\'s steering first. Carrying both means the `--auto` selector may pick up work that was explicitly gated.',
  fix: 'Keep whichever the issue actually satisfies and drop the other.',
  check(s) {
    return s.issues
      .filter((i) => i.state === 'OPEN' && has(i, 'auto') && has(i, 'draft'))
      .map((i) => ({
        confidence: 'high',
        subject: subject(i),
        evidence: ['`auto` and `draft` are both set', 'the `--auto` lane treats `auto` as a grant'],
        proposal: {
          kind: 'agentic',
          summary: 'Assess it against the #18 implementation-ready criteria and remove the label that does not hold.',
          prompt: 'Read the issue against the #18 implementation-ready criteria (scope clear, design settled, no open decisions for @jwildfire). If it is ready, remove `draft`. If it is not, remove `auto`. Add a one-line comment naming the criterion that decided it.',
        },
      }));
  },
};

// Hard-wrapped bodies read as literal line breaks on GitHub — @jwildfire calls
// it "sloppy". Detection is conservative: three or more consecutive short lines
// that are not a list, table, quote or fenced block.
export function hardWrapped(body = '') {
  const lines = body.split('\n');
  let fence = false;
  let run = 0;
  for (const raw of lines) {
    const line = raw.trimEnd();
    if (/^\s*```/.test(line)) { fence = !fence; run = 0; continue; }
    if (fence) continue;
    const structural = !line.trim()
      || /^\s*([-*+]|\d+\.)\s/.test(line)
      || /^\s*[>#|]/.test(line)
      || /^\s*<!--/.test(line)
      || /^\s*<\/?[a-z]/i.test(line)
      || line.includes('|');
    if (structural) { run = 0; continue; }
    // A wrapped line is short and does not end a sentence.
    if (line.length <= 95 && !/[.:;!?)\]"'`]$/.test(line.trim())) run += 1;
    else run = 0;
    if (run >= 3) return true;
  }
  return false;
}

const hardWrappedBody = {
  id: 'HARD-WRAPPED-BODY',
  title: 'Issue body hard-wrapped mid-paragraph',
  group: 'Conventions',
  why: 'GitHub renders a single newline as a line break, so a body wrapped at 80 columns arrives as ragged half-lines. @jwildfire\'s standing instruction is one line per paragraph or bullet in anything posted to GitHub.',
  fix: 'Rewrap the body to one line per paragraph.',
  check(s) {
    return s.issues
      .filter((i) => i.state === 'OPEN' && tracked(i) && hardWrapped(i.body))
      .map((i) => ({
        confidence: 'low',
        subject: subject(i),
        evidence: ['three or more consecutive wrapped lines outside a list, table or code fence'],
        proposal: {
          kind: 'agentic',
          summary: 'Rewrap the body to one line per paragraph, changing no wording.',
          ops: [],
          prompt: 'Read the issue body. Join hard-wrapped paragraph lines into one line each, leaving lists, tables, code fences and HTML comments untouched. Change no wording, no headings and no content — this is whitespace only. Update the body via the REST API. If the body turns out not to be hard-wrapped (the detection is heuristic), do nothing and say so.',
        },
      }));
  },
};

const promotedIdeaOpen = {
  id: 'PROMOTED-IDEA-OPEN',
  title: 'Promoted idea thread still open',
  group: 'Conventions',
  why: 'Triage closes a thread as resolved when it becomes an issue; that closure is what keeps the Ideas board an inbox rather than an archive. A promoted thread left open keeps showing up as un-triaged work.',
  fix: 'Close the discussion as resolved.',
  check(s) {
    return s.ideas
      .filter((d) => !d.closed && d.promotedTo && !IDEA_EXCLUDE.has(d.number))
      .filter((d) => s.issueByNumber.has(d.promotedTo))
      .map((d) => ({
        confidence: 'medium',
        subject: { kind: 'discussion', repo: s.hub, number: d.number, title: d.title, url: d.url },
        evidence: ['discussion is open', `a comment says it was filed as #${d.promotedTo}`,
          `#${d.promotedTo} exists`],
        proposal: {
          kind: 'mechanical',
          summary: `Close the discussion as resolved — it became #${d.promotedTo}.`,
          ops: [closeDiscussion(d.number, d.nodeId)],
        },
      }));
  },
};

const stalledInFlight = {
  id: 'STALLED-IN-FLIGHT',
  title: 'In-flight requirement that stopped moving',
  group: 'Conventions',
  why: 'Development and Review are lanes for work happening now. A requirement that has not been touched in two weeks, with no open PR behind it, is parked — and while it sits in an active lane it crowds out the real front line on every view of the roadmap.',
  fix: 'Park it back at Backlog. Dragging it forward on the board is how you say it is live again.',
  needs: 'board',
  check(s) {
    return s.issues
      .filter((i) => i.state === 'OPEN' && isRequirement(i))
      .filter((i) => IN_FLIGHT.includes(statusOf(s, i.repo, i.number) ?? ''))
      .filter((i) => days(i.updatedAt, s.now) > T.stalledDays)
      .filter((i) => !openPrsFor(s, i.repo, i.number).length)
      // An issue whose every sub-issue is closed is finished, not stalled, and
      // SUBS-DONE-PARENT-OPEN owns that case — it proposes promoting the item,
      // where this rule would park it. Before R1-a made this rule mechanical the
      // two could coexist; now they are both executable, and on 2026-08-15 they
      // proposed opposite stage moves for #43 and #129 on the same night. One
      // rule owns one situation, as OPEN-IN-RELEASED already does for Released.
      .filter((i) => !(i.subSummary.total && i.subSummary.completed === i.subSummary.total))
      .map((i) => ({
        confidence: 'medium',
        subject: subject(i),
        evidence: [`board Status is ${statusOf(s, i.repo, i.number)}`,
          `no activity for ${Math.round(days(i.updatedAt, s.now))}d`, 'no open PR references it'],
        // R1-a (@jwildfire, 2026-08-15): this rule used to ask "why has this stalled?", which
        // is a question, and a question re-fires every night until someone answers it — 13 of
        // the 24 findings that needed him on 2026-08-15 came from here alone. It now parks the
        // item instead. The park is cheap and self-correcting: dragging the card forward on the
        // board is how you say the work is live again, which costs one gesture and needs no reply.
        proposal: {
          kind: 'mechanical',
          summary: `Park it back at Backlog — ${Math.round(days(i.updatedAt, s.now))} days in ${statusOf(s, i.repo, i.number)} with no open PR behind it. Drag it forward when it is live again.`,
          ops: [setStatus(itemsFor(s, i.repo, i.number)[0], 'Backlog')],
        },
      }));
  },
};

export const RULES = [
  closedNotReleased,
  openInReleased,
  unstagedBoardItem,
  offBoardRequirement,
  boardDuplicate,
  closedParentOpenSubs,
  subsDoneParentOpen,
  goallessRequirement,
  untrackedTask,
  goalNoMembers,
  goalBoardInconsistent,
  mergedPrOpenTarget,
  openPrClosedTarget,
  prNoRequirement,
  requirementLabelMissing,
  assigneeMissing,
  milestoneMissing,
  designMissing,
  approvalUnresolved,
  provenanceMissing,
  autoDraftConflict,
  hardWrappedBody,
  promotedIdeaOpen,
  stalledInFlight,
];

export const RULE_BY_ID = new Map(RULES.map((r) => [r.id, r]));
