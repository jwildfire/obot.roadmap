// The briefing's cut, and the properties it must not lose (obot.roadmap#247,
// under #238).
//
// The page is a second VIEW of the queue at /roadmap.html, so it must never
// disagree with it about what counts as waiting. What it does differently is
// CUT: twenty items do not fit in ten lines, and the Queue does not have to
// choose. Every assertion below is the inverse of something measured in the
// summaries this replaces — 559 words on a self-described quiet day, asks at
// line 38, and a fixed template whose slots grew the page from 136 to 865 words.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { cut, render, LINE_BUDGET, meta } from '../roadmap/briefing.mjs'

const item = (type, title, since) => ({
  type, title, since, prefix: 'waiting',
  why: 'because', act: { label: 'Do it', href: `https://example.invalid/${encodeURIComponent(title)}` },
  cite: { label: 'x', href: 'https://example.invalid/x' },
})

// The live queue on the day this was written: 2 review, 3 decide, 3 triage,
// 4 release, 9 unstick — twenty items, longest wait 24 days.
const LIVE_SHAPE = [
  ...Array.from({ length: 2 }, (_, i) => item('review', `RC ${i}`, '2026-08-17T00:00:00Z')),
  ...Array.from({ length: 3 }, (_, i) => item('decide', `Decision ${i}`, '2026-08-16T00:00:00Z')),
  ...Array.from({ length: 3 }, (_, i) => item('triage', `Idea ${i}`, '2026-07-25T00:00:00Z')),
  ...Array.from({ length: 4 }, (_, i) => item('release', `Release ${i}`, '2026-08-16T00:00:00Z')),
  ...Array.from({ length: 9 }, (_, i) => item('unstick', `Stalled ${i}`, '2026-08-18T00:00:00Z')),
]

test('it publishes at the one URL the decision named', () => {
  assert.equal(meta.out, 'reports/briefing/index.html')
})

test('the two headlines carry in full and are never cut', () => {
  const c = cut(LIVE_SHAPE)
  assert.equal(c.rcs.length, 2)
  assert.equal(c.decisions.length, 3)
})

test('nothing is silently dropped — whatever does not fit is counted', () => {
  const c = cut(LIVE_SHAPE)
  const shown = c.rcs.length + c.decisions.length + c.todos.length
  const cutCount = LIVE_SHAPE.length - shown
  assert.equal(c.remainder, cutCount,
    'the remainder must account for every item not shown; a briefing that lies by omission is worse than a long one')
  assert.ok(c.remainder > 0, 'this fixture is the real shape, and it does overflow')
})

test('the ten-line budget is enforced rather than trusted', () => {
  const c = cut(LIVE_SHAPE)
  const lines = c.rcs.length + c.decisions.length + c.todos.length
  assert.ok(lines <= LINE_BUDGET, `rendered ${lines} item lines against a budget of ${LINE_BUDGET}`)
})

test('a queue that is all headlines overflows loudly rather than hiding his asks', () => {
  const many = Array.from({ length: 14 }, (_, i) => item('decide', `D${i}`, '2026-08-16T00:00:00Z'))
  const c = cut(many)
  assert.equal(c.decisions.length, 14, 'shortening this would hide the exact thing the page is for')
  assert.equal(c.overBudget, true)
  assert.equal(c.todos.length, 0, 'and nothing optional is added on top of it')
})

test('an empty queue still renders both headings', async () => {
  const html = await render(EMPTY_DATA())
  assert.match(html, /🚦 Release candidates \(0\)/)
  assert.match(html, /🧭 Decisions \(0\)/)
  assert.match(html, /None waiting on you\./)
})

test('the ask is above the record, always', async () => {
  const html = await render(DATA(LIVE_SHAPE))
  const firstAsk = html.indexOf('Release candidates')
  const record = html.indexOf('Overnight')
  assert.ok(firstAsk > 0 && record > firstAsk,
    'the summaries this replaces buried seven real asks at line 38 behind 500 words of recap')
})

test('a source that could not be read is named, not quietly treated as clear', async () => {
  const d = DATA(LIVE_SHAPE)
  d.decRes = { ok: false, value: null, notice: 'gh failed' }
  const html = await render(d)
  assert.match(html, /Incomplete: decisions could not be read/)
  assert.match(html, /Nothing below is a claim that they are clear/)
})

test('every item line is a link', async () => {
  const html = await render(DATA(LIVE_SHAPE))
  const lis = html.match(/<li>.*?<\/li>/gs) ?? []
  assert.ok(lis.length > 0)
  for (const li of lis) assert.match(li, /<a href="/, `a line he cannot act on from the phone: ${li}`)
})

test('it holds at 390px: no fixed-width tracks, and long strings wrap', async () => {
  const html = await render(DATA(LIVE_SHAPE))
  assert.match(html, /html \{ overflow-x: clip; \}/)
  assert.match(html, /overflow-wrap: anywhere/)
  assert.doesNotMatch(html, /min-width:\s*\d+rem/, 'a fixed floor is what starves a 1fr track at 390px')
  assert.doesNotMatch(html, /grid-template-columns/, 'the page is a single column by construction')
})

test('it carries the description the feed and the deploy check require', async () => {
  const html = await render(EMPTY_DATA())
  const m = html.match(/<meta name="description" content="([^"]+)">/)
  assert.ok(m, 'a page with no description renders as a loud NO DESCRIPTION strip')
  assert.ok(m[1].length >= 40 && m[1].length <= 260, `description is ${m[1].length} chars`)
  assert.doesNotMatch(m[1], /AI-generated report|^Design document/i)
})

test('no blocker item text can reach the page — only a count', async () => {
  const html = await render(DATA(LIVE_SHAPE))
  // The config bucket arrives through readConfigCount, whose whole payload is two
  // integers and a timestamp. There is no code path from any item's text to this
  // page, and the local-only guard exists so there never is one.
  assert.doesNotMatch(html, /\bc0\d{3}\b/, 'a config id on a public page is a policy breach and a failed deploy')
})

test('the theme is complete in both directions', async () => {
  const html = await render(EMPTY_DATA())
  assert.match(html, /@media \(prefers-color-scheme: dark\)/)
  assert.match(html, /:root\[data-theme="dark"\]/)
  assert.match(html, /body \{[^}]*background: var\(--paper\)/s, 'a transparent body borrows the host ground')
})

// -------------------------------------------------------------------- fixtures
const NOW = new Date('2026-08-18T12:00:00Z')
const ok = (value) => ({ ok: true, value, notice: null })

// The config count is a FIXTURE, in the shape readConfigCount returns, stamped
// relative to the clock this file pins. It used to be the repository's own
// data/config-count.json, opened inside render(): on 2026-08-20 the automatic
// `Config count` commit stamped that file two days past the pinned clock, the
// count read as coming from the future, the age caveat was never rendered, and
// the site did not deploy for four and a half hours (#287). Nothing had
// regressed. Whether the committed file is one the site can read is checked
// where the reader lives, in public-channel.test.mjs, on a rule no refresh of
// the file can trip.
const count = (hoursOld, open = 13) => ({
  ok: true,
  open,
  critical: 0,
  asOf: new Date(NOW.getTime() - hoursOld * 3600000).toISOString().replace('.000Z', 'Z'),
  ageDays: hoursOld / 24,
  stale: hoursOld / 24 > 3,
})

function DATA(items) {
  // buildItems is imported by render(); feeding it the collector shapes that
  // produce exactly these items would duplicate queue.mjs's rules here, which is
  // the drift this page exists to avoid. The items are injected instead.
  return {
    NOW,
    configRes: count(0),
    prRes: ok(items.filter((i) => i.type === 'review').map((i, n) => ({
      repo: 'jwildfire/x', number: n, title: i.title, url: i.act.href,
      updatedAt: i.since, reviewRequested: ['jwildfire'], version: null,
    }))),
    relRes: ok({ drafts: [], upcoming: [] }),
    decRes: ok({ awaiting: items.filter((i) => i.type === 'decide').map((i) => ({
      id: i.title, title: i.title, date: '2026-08-16', statusPlain: 'open',
      discussion: { url: i.act.href }, path: 'reports/decisions/',
    })) }),
    ideaRes: ok({ open: items.filter((i) => i.type === 'triage').map((i, n) => ({
      number: n, title: i.title, url: i.act.href, createdAt: '2026-07-25T00:00:00Z',
    })) }),
    reqRes: ok(items.filter((i) => i.type === 'unstick').map((i, n) => ({
      number: n, title: i.title, url: i.act.href, state: 'OPEN', stage: 'Development',
      updatedAt: '2026-07-01T00:00:00Z', drift: null,
    }))),
  }
}

const EMPTY_DATA = () => ({
  NOW,
  configRes: count(0),
  prRes: ok([]), relRes: ok({ drafts: [], upcoming: [] }),
  decRes: ok({ awaiting: [] }), ideaRes: ok({ open: [] }), reqRes: ok([]),
})

test('a config count that is hours old says so, instead of reading as a current fact', async () => {
  // The count is a committed file that nothing refreshes on a schedule; the
  // site's own staleness rule only flags it after three days, so a count off by
  // one for a day renders as truth. Found live: the page said 9 while the list
  // held 10, because the last hand-run was before c0016 was filed.
  //
  // The renderer stamps at >= 6h - see the countAge guard in
  // scripts/roadmap/briefing.mjs - so 18h is old and 2h is fresh.
  const html = await render({ ...EMPTY_DATA(), configRes: count(18) })
  const fresh = await render({ ...EMPTY_DATA(), configRes: count(2) })
  const stamped = /counted \d+[hd] ago/
  // Unconditional. These assertions used to be guarded by `if the line is
  // present`, which handed a committed file the power to decide whether the test
  // ran at all: a refresh to `open: 0` removes the line, and the test would then
  // pass while asserting nothing. Verified - with the guards in place and the
  // count at zero, the whole ageing rule can be deleted from the renderer and
  // this file still reports 14 pass, 0 fail.
  assert.match(html, /13 config items/, 'the fixture is the count, so the line is always there')
  assert.match(html, stamped, 'an old count must carry its age')
  assert.doesNotMatch(fresh, stamped, 'a fresh one needs no caveat')
})

test('a count days old is stated in days, not in a three-figure hour count', async () => {
  const html = await render({ ...EMPTY_DATA(), configRes: count(60) })
  assert.match(html, /counted 2d ago/)
})

test('the page renders the count it is HANDED, never one it reads off disk', async () => {
  // 4237 is a number data/config-count.json cannot plausibly hold. If a change
  // puts a file read back inside render(), this fails on the spot instead of
  // waiting for the next refresh to stop the deploy.
  const html = await render({ ...EMPTY_DATA(), configRes: count(0, 4237) })
  assert.match(html, /4237 config items/)
})

test('a briefing built without a count refuses, rather than publishing silence', async () => {
  // The failure this refuses: a page that quietly drops the line reads as
  // "nothing needs your hands" when in fact nobody looked.
  const data = EMPTY_DATA()
  delete data.configRes
  await assert.rejects(() => render(data), /configRes is required/)
})
