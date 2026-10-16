import { NextResponse } from 'next/server';
import { isAdmin } from '@/lib/ska-auth';
import { InvalidShow, saveImage } from '@/lib/ska-store';

export const runtime = 'nodejs';

/** Uploads a poster or artist photo; the returned URL is saved with the show. */
export async function POST(req: Request) {
  if (!(await isAdmin())) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  const form = await req.formData().catch(() => null);
  const file = form?.get('file');
  if (!(file instanceof File)) return NextResponse.json({ ok: false, error: 'missing_file' }, { status: 400 });
  try {
    const url = await saveImage(file, String(form?.get('prefix') ?? 'img'));
    return NextResponse.json({ ok: true, url });
  } catch (e) {
    if (e instanceof InvalidShow) return NextResponse.json({ ok: false, error: e.message }, { status: 400 });
    throw e;
  }
}
