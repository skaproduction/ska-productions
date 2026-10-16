import Anthropic from '@anthropic-ai/sdk';
import { NextResponse } from 'next/server';
import { isAdmin } from '@/lib/ska-auth';
import { translateConfigured, translateToKorean } from '@/lib/ska-translate';

export const runtime = 'nodejs';

/** { texts: string[] } (English) → { ko: string[] } */
export async function POST(req: Request) {
  if (!(await isAdmin())) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  if (!translateConfigured()) return NextResponse.json({ ok: false, error: 'not_configured' }, { status: 503 });

  const body = (await req.json().catch(() => null)) as { texts?: unknown } | null;
  const texts = Array.isArray(body?.texts) ? body.texts.map((t) => String(t ?? '').slice(0, 1000)) : [];
  if (texts.length === 0 || texts.length > 20) return NextResponse.json({ ok: false, error: 'bad_input' }, { status: 400 });

  try {
    return NextResponse.json({ ok: true, ko: await translateToKorean(texts) });
  } catch (e) {
    if (e instanceof Anthropic.RateLimitError) return NextResponse.json({ ok: false, error: 'rate_limited' }, { status: 429 });
    if (e instanceof Anthropic.AuthenticationError) return NextResponse.json({ ok: false, error: 'not_configured' }, { status: 503 });
    if (e instanceof Anthropic.APIError) {
      console.error('[ska-translate]', e.status, e.message);
      return NextResponse.json({ ok: false, error: 'api_error' }, { status: 502 });
    }
    console.error('[ska-translate]', e);
    return NextResponse.json({ ok: false, error: 'translate_failed' }, { status: 502 });
  }
}
