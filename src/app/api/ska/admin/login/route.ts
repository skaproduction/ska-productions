import { NextResponse } from 'next/server';
import { adminConfigured, logIn, logOut } from '@/lib/ska-auth';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  if (!adminConfigured()) {
    return NextResponse.json({ ok: false, error: 'not_configured' }, { status: 503 });
  }
  let password = '';
  try {
    password = String(((await req.json()) as { password?: unknown }).password ?? '');
  } catch {}
  if (!(await logIn(password))) {
    await new Promise((r) => setTimeout(r, 600)); // slow down guessing
    return NextResponse.json({ ok: false, error: 'wrong_password' }, { status: 401 });
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  await logOut();
  return NextResponse.json({ ok: true });
}
