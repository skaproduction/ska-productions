import { after } from 'next/server';
import { recordVisit } from '@/lib/ska-stats';

export const runtime = 'nodejs';

/** Page-view beacon from the site (see Tracker in Shell). Always answers 204; counting happens after. */
export async function POST(req: Request) {
  let body: { path?: unknown; ref?: unknown; landing?: unknown } = {};
  try {
    body = JSON.parse(await req.text());
  } catch {}
  const path = typeof body.path === 'string' ? body.path.split(/[?#]/)[0].slice(0, 200) : '';
  if (!path.startsWith('/') || path.startsWith('/admin') || path.startsWith('/api')) return new Response(null, { status: 204 });

  const h = req.headers;
  const city = h.get('x-vercel-ip-city');
  const visit = {
    path,
    ref: typeof body.ref === 'string' ? body.ref.toLowerCase().replace(/^www\./, '').slice(0, 80) : '',
    landing: body.landing === true,
    ua: h.get('user-agent') ?? '',
    ip: (h.get('x-forwarded-for') ?? '').split(',')[0].trim(),
    country: (h.get('x-vercel-ip-country') ?? '').slice(0, 2).toUpperCase(),
    city: city ? decodeURIComponent(city).slice(0, 60) : '',
  };
  after(() => recordVisit(visit).catch((e) => console.error('[track]', e)));
  return new Response(null, { status: 204 });
}
