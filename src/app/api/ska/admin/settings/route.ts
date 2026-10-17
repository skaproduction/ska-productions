import { NextResponse } from 'next/server';
import { isAdmin } from '@/lib/ska-auth';
import { saveSettings } from '@/lib/ska-store';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  if (!(await isAdmin())) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  const body = await req.json().catch(() => null);
  const settings = await saveSettings(body?.settings);
  return NextResponse.json({ ok: true, settings });
}
