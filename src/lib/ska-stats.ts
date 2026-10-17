import 'server-only';
import { Redis } from '@upstash/redis';
import { createHash } from 'node:crypto';

// Privacy-friendly visit counting in Upstash Redis (connected through the Vercel Marketplace).
// No cookies and no IP addresses are stored: a visitor is a one-way hash of (salt, day, IP, browser)
// that changes every day, kept only inside a HyperLogLog counter. Everything is bucketed by day in
// Korean time, and keys expire after ~13 months.

const P = 'ska:stats:';
const TTL = 60 * 60 * 24 * 400;
const BOT = /bot|crawl|spider|slurp|preview|facebookexternalhit|headless|lighthouse|pingdom|uptime|monitor|curl|wget|python|node-fetch|vercel/i;

export const statsConfigured = () =>
  !!(process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL) && !!(process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN);

let client: Redis | null = null;
const redis = () => (client ??= Redis.fromEnv());

/** YYYY-MM-DD in Korean time. */
export const dayKey = (d = new Date()) => d.toLocaleDateString('en-CA', { timeZone: 'Asia/Seoul' });

export type Visit = { path: string; ref: string; landing: boolean; ua: string; ip: string; country: string; city: string };

export async function recordVisit(v: Visit) {
  if (!statsConfigured() || !v.ua || BOT.test(v.ua)) return;
  const day = dayKey();
  const salt = process.env.SKA_STATS_SALT || process.env.SKA_ADMIN_PASSWORD || 'ska-stats';
  const visitor = createHash('sha256').update(`${salt}|${day}|${v.ip}|${v.ua}`).digest('hex').slice(0, 20);
  const key = (k: string) => `${P}${k}:${day}`;

  const p = redis().pipeline();
  p.incr(key('views'));
  p.pfadd(key('uniq'), visitor);
  p.hincrby(key('pages'), v.path, 1);
  if (v.landing) p.hincrby(key('refs'), v.ref || 'direct', 1);
  for (const k of ['views', 'uniq', 'pages', 'refs']) p.expire(key(k), TTL);
  const res = await p.exec();

  // places count people, not page views: only a visitor's first hit of the day adds to them
  if (res[1] === 1) {
    const q = redis().pipeline();
    q.hincrby(key('countries'), v.country || '??', 1);
    q.hincrby(key('cities'), `${v.country || '??'}|${v.city || '?'}`, 1);
    q.expire(key('countries'), TTL);
    q.expire(key('cities'), TTL);
    await q.exec();
  }
}

export type Stats = {
  days: { day: string; views: number; visitors: number }[];
  totals: { views: number; visitors: number };
  pages: [string, number][];
  countries: [string, number][];
  cities: [string, number][];
  refs: [string, number][];
};

const sumHashes = (rows: (Record<string, unknown> | null)[]) => {
  const out = new Map<string, number>();
  for (const r of rows) for (const [k, v] of Object.entries(r ?? {})) out.set(k, (out.get(k) ?? 0) + Number(v));
  return [...out.entries()].sort((a, b) => b[1] - a[1]);
};

/** The last `n` days (today included), oldest first. */
export async function getStats(n: number): Promise<Stats> {
  const today = new Date();
  const days = Array.from({ length: n }, (_, i) => dayKey(new Date(today.getTime() - (n - 1 - i) * 864e5)));
  const p = redis().pipeline();
  for (const d of days) {
    p.get(`${P}views:${d}`);
    p.pfcount(`${P}uniq:${d}`);
    p.hgetall(`${P}pages:${d}`);
    p.hgetall(`${P}countries:${d}`);
    p.hgetall(`${P}cities:${d}`);
    p.hgetall(`${P}refs:${d}`);
  }
  p.pfcount(...(days.map((d) => `${P}uniq:${d}`) as [string, ...string[]]));
  const res = (await p.exec()) as unknown[];
  const at = (i: number, k: number) => res[i * 6 + k];
  const rows = days.map((day, i) => ({ day, views: Number(at(i, 0) ?? 0), visitors: Number(at(i, 1) ?? 0) }));
  const pick = (k: number) => sumHashes(days.map((_, i) => at(i, k) as Record<string, unknown> | null));
  return {
    days: rows,
    totals: { views: rows.reduce((s, r) => s + r.views, 0), visitors: Number(res[res.length - 1] ?? 0) },
    pages: pick(2).slice(0, 12),
    countries: pick(3).slice(0, 15),
    cities: pick(4).slice(0, 15),
    refs: pick(5).slice(0, 12),
  };
}
