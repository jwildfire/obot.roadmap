#!/usr/bin/env node
// Fails when an agent artifact ships without a description of its own.
//
// The news feed's description line is what @jwildfire decides from — whether a row
// is worth opening at all. Before 2026-08-15 the feed printed a per-type constant
// ("AI-generated report.") and nobody noticed for six weeks, because a plausible
// sentence is indistinguishable from an intentional one. This check makes the
// absence loud: run in the deploy before the site is published, and by hand while
// writing an artifact.
//
//   node scripts/check_artifact_descriptions.mjs
//
// The bar (reports/decisions/README.md, @jwildfire 2026-08-15): say what the
// artifact contains and why someone would open it, in plain English, without
// leaning on an issue number as the explanation. Name things, don't number them.
import { listArtifacts, MIN_LENGTH, MAX_LENGTH } from './lib/artifacts.mjs';

const artifacts = listArtifacts();
const bad = artifacts.filter((a) => a.problem);

for (const a of bad) {
  console.error(`::error file=${a.rel},title=Artifact description::${a.problem}`);
  console.error(`  ${a.rel}`);
}

if (bad.length) {
  console.error('');
  console.error(`${bad.length} of ${artifacts.length} artifacts need a description.`);
  console.error('Add one to the page head, right after <title>:');
  console.error('');
  console.error('  <meta name="description" content="What this page contains, and why you would open it.">');
  console.error('');
  console.error(`One line, ${MIN_LENGTH}–${MAX_LENGTH} characters, plain English — name things rather than`);
  console.error('numbering them, and do not restate the title or say that it is a report.');
  process.exit(1);
}

console.log(`artifact descriptions: ${artifacts.length} artifacts, all described`);
