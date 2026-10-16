import { NextResponse } from 'next/server';
import { isAdmin } from '@/lib/ska-auth';
import { InvalidShow, deleteShow, saveShow } from '@/lib/ska-store';

export const runtime = 'nodejs';

const unauthorized = () => NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });

/** Create (no slug) or update a show. */
export async function POST(req: Request) {
  if (!(await isAdmin())) return unauthorized();
  const body = await req.json().catch(() => null);
  try {
    const show = await saveShow(body?.show);
    return NextResponse.json({ ok: true, show });
  } catch (e) {
    if (e instanceof InvalidShow) return NextResponse.json({ ok: false, error: e.message }, { status: 400 });
    throw e;
  }
}

export async function DELETE(req: Request) {
  if (!(await isAdmin())) return unauthorized();
  const slug = new URL(req.url).searchParams.get('slug') ?? '';
  const ok = await deleteShow(slug);
  return NextResponse.json({ ok }, { status: ok ? 200 : 404 });
}
