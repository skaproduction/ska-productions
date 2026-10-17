import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

type Inquiry = {
  genres?: string[];
  event?: string;
  capacity?: number;
  country?: string;
  city?: string;
  date?: string;
  artists?: string[] | string;
  name?: string;
  company?: string;
  email?: string;
  message?: string;
};

export async function POST(req: Request) {
  let body: Inquiry;
  try {
    body = (await req.json()) as Inquiry;
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid_json' }, { status: 400 });
  }

  if (!body.name?.trim() || !body.email || !/\S+@\S+\.\S+/.test(body.email)) {
    return NextResponse.json({ ok: false, error: 'missing_contact' }, { status: 400 });
  }

  const wishes = (Array.isArray(body.artists) ? body.artists : body.artists ? [body.artists] : [])
    .map((a) => String(a).trim().slice(0, 60))
    .filter(Boolean)
    .slice(0, 20);

  const summary = [
    '🎤 SKA casting inquiry',
    `From: ${body.name}${body.company ? ` (${body.company})` : ''} <${body.email}>`,
    `Artists: ${(body.genres ?? []).join(', ')}`,
    wishes.length ? `Wish list: ${wishes.map((a, i) => `${i + 1}. ${a}`).join('  ')}` : '',
    `Event: ${body.event} · ${body.capacity?.toLocaleString()}+ pax`,
    `Where/when: ${[body.city, body.country].filter(Boolean).join(', ')} · ${body.date || 'TBD'}`,
    body.message ? `Note: ${body.message}` : '',
  ]
    .filter(Boolean)
    .join('\n');

  // Set SKA_INQUIRY_WEBHOOK_URL (Slack/Discord) to forward inquiries; otherwise they're only logged.
  const webhook = process.env.SKA_INQUIRY_WEBHOOK_URL;
  if (webhook) {
    try {
      await fetch(webhook, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ content: summary, text: summary }),
      });
    } catch (e) {
      console.error('[ska-inquiry] webhook forward failed', e);
    }
  }
  console.log(summary);

  return NextResponse.json({ ok: true });
}
