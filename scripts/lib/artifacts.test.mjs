// node --test scripts/lib/artifacts.test.mjs
//
// The rules that keep the news feed's description line worth reading. Worth a test
// rather than a look at the page: the failure mode being guarded against is a
// description that *looks* fine — "AI-generated report." rendered on every artifact
// row for six weeks without anyone reading it as a defect.
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { descriptionFrom, describeProblem, MIN_LENGTH } from './artifacts.mjs';

const GOOD = 'Which safety.viz charts have an R wrapper and which do not, and why the ones that exist draw a stale bundle.';

test('a description is read out of the page head', () => {
  const html = `<head><title>x</title>\n<meta name="description" content="${GOOD}">\n</head>`;
  assert.equal(descriptionFrom(html), GOOD);
});

test('attribute order does not matter, and entities are decoded', () => {
  const html = `<meta content="Sankey &amp; waterfall &mdash; what each one shows and when to reach for it." name="description">`;
  assert.equal(descriptionFrom(html), 'Sankey & waterfall &mdash; what each one shows and when to reach for it.');
});

test('a page with no description reads as null, not as empty text', () => {
  assert.equal(descriptionFrom('<head><title>x</title></head>'), null);
  assert.equal(descriptionFrom('<meta name="description" content="   ">'), null);
});

test('a real description passes', () => {
  assert.equal(describeProblem(GOOD), null);
});

test('the constants this replaced are rejected, however they are spelled', () => {
  assert.match(describeProblem('AI-generated report.'), /describes the type/);
  assert.match(describeProblem('Design document for Requirement #161.'), /describes the type/);
  assert.match(describeProblem('Design document.'), /describes the type/);
});

test('a missing description is a problem, and so is a one-word one', () => {
  assert.match(describeProblem(null), /no <meta name="description">/);
  assert.match(describeProblem('An audit.'), new RegExp(`min ${MIN_LENGTH}`));
});

test('an essay is a problem too — the feed row is one line', () => {
  assert.match(describeProblem('x'.repeat(500)), /keep it to one line/);
});
