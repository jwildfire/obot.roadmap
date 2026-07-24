// Shared GitHub + formatting helpers for the site generators.
//
// The roadmap page now reads six independent sources, so the important export
// here is `settle()`: a collector either returns data or a human-readable notice,
// and one flaky API renders as a per-section line instead of blanking a page that
// is the project's public record. Fail-loud stays the rule for the page as a
// whole (deploy-site.yml validates the output), not for every upstream call.
const TOKEN = process.env.GITHUB_TOKEN || process.env.GH_TOKEN || '';
const UA = 'obot-roadmap-builder';

export const hasToken = Boolean(TOKEN);

export async function graphql(query, variables = {}) {
  const res = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      'Content-Type': 'application/json',
      'User-Agent': UA,
    },
    body: JSON.stringify({ query, variables }),
  });
  if (!res.ok) throw new Error(`GraphQL HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const body = await res.json();
  // Partial errors still carry usable data (e.g. one repo of a batched query is
  // unreadable) — surface them as a warning and let the caller use what came back.
  if (body.errors?.length) {
    const msg = body.errors.map((e) => e.message).join('; ').slice(0, 300);
    if (!body.data) throw new Error(`GraphQL: ${msg}`);
    console.warn(`roadmap: GraphQL partial errors — ${msg}`);
  }
  return body.data;
}

export async function rest(path, { tolerate404 = false } = {}) {
  const url = path.startsWith('http') ? path : `https://api.github.com${path}`;
  const headers = { Accept: 'application/vnd.github+json', 'User-Agent': UA };
  if (TOKEN) headers.Authorization = `Bearer ${TOKEN}`;
  const res = await fetch(url, { headers });
  if (res.status === 404 && tolerate404) return null;
  if (!res.ok) throw new Error(`REST ${res.status} on ${url.replace('https://api.github.com', '')}`);
  return res.json();
}

// Runs a collector, returning {ok, value} or {ok:false, notice} — never throws.
export async function settle(label, fn) {
  try {
    return { ok: true, value: await fn() };
  } catch (err) {
    const notice = `${label} unavailable — ${err.message}`;
    console.warn(`roadmap: ${notice}`);
    return { ok: false, notice, value: null };
  }
}

export const esc = (s = '') =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export const day = (iso = '') => (iso || '').slice(0, 10);

export const clip = (s = '', n = 90) =>
  s.length > n ? `${s.slice(0, n).replace(/\s+\S*$/, '')}…` : s;

export function fmtET(iso) {
  const d = iso instanceof Date ? iso : new Date(iso);
  const stamp = new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'America/New_York',
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
  }).format(d);
  const zone = new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', timeZoneName: 'short' })
    .formatToParts(d).find((p) => p.type === 'timeZoneName').value;
  return `${stamp} ${zone}`;
}

// "3d" / "5h" / "just now" — compact enough for a dense row's meta column.
export function age(iso, now = new Date()) {
  const ms = now - new Date(iso);
  if (!Number.isFinite(ms)) return '—';
  const mins = Math.floor(ms / 60000);
  if (mins < 60) return mins <= 1 ? 'just now' : `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 60) return `${days}d`;
  return `${Math.floor(days / 30)}mo`;
}

export const daysAgo = (iso, now = new Date()) => (now - new Date(iso)) / 86400000;
