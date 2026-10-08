// What the wire page and the briefing say when a read fails, now that draft
// releases are not listed (obot.roadmap#386). Found by the review of that fix:
// a failed releases read still spoke of draft releases, and a releases read that
// succeeded was taken as grounds to state a count of release candidates, which
// come from the pull-request search alone.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { render as wire } from '../roadmap/wire.mjs'
import { render as briefing } from '../roadmap/briefing.mjs'

const NOW = new Date('2026-10-07T20:00:00Z')
const ok = (value) => ({ ok: true, value })
const bad = (notice) => ({ ok: false, value: null, notice })
const decRes = ok({
  awaiting: [{ date: '2026-10-01', title: 'A decision', path: 'reports/decisions/x.html', statusPlain: 'open' }],
  all: [], decided: [], recent: [],
})
const base = {
  NOW, decRes, changelog: { entries: [] }, HUB: 'jwildfire/obot.roadmap', REPOS: [],
  reqRes: ok([]), hierRes: ok({}), goalRes: ok([]),
}
const releases = ok({ recent: [], upcoming: [], drafts: [] })
const text = (html) => html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ')

test('with the pull-request search failed, the wire states no count of release candidates', async () => {
  const page = text(await wire({ ...base, prRes: bad('GitHub search failed (HTTP 403)'), relRes: releases }))
  assert.match(page, /Release-candidate PRs unknown/)
  assert.doesNotMatch(page, /\d+ release candidates? in the review queue/)
  assert.match(page, /1 decision waiting/)
})

test('with the pull-request search read, the wire states the count', async () => {
  const page = text(await wire({ ...base, prRes: ok([]), relRes: bad('releases: HTTP 502') }))
  assert.match(page, /0 release candidates in the review queue/)
})

test('a failed releases read is called that, and nothing speaks of draft releases', async () => {
  const data = { ...base, prRes: ok([]), relRes: bad('releases: HTTP 502') }
  for (const page of [text(await wire(data)), text(await briefing(data))]) {
    assert.doesNotMatch(page, /draft releases/i)
    assert.match(page, /releases/i)
  }
  assert.match(text(await wire(data)), /Releases unknown/)
  assert.match(text(await briefing(data)), /Incomplete: releases could not be read/)
})
