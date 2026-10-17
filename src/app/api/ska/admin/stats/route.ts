import { NextResponse } from 'next/server';
import { isAdmin } from '@/lib/ska-auth';
import { getStats, statsConfigured } from '@/lib/ska-stats';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  if (!statsConfigured()) return NextResponse.json({ error: 'not_configured' }, { status: 503 });
  const days = Math.min(90, Math.max(1, Number(new URL(req.url).searchParams.get('days')) || 30));
  try {
    return NextResponse.json(await getStats(days), { headers: { 'cache-control': 'no-store' } });
  } catch (e) {
    console.error('[stats]', e);
    return NextResponse.json({ error: 'stats_failed' }, { status: 502 });
  }
}
