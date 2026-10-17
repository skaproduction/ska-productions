import { NextResponse } from 'next/server';
import { Resend } from 'resend';

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

  // Email the booking team (RESEND_API_KEY). Replying to the email goes straight to the inquirer.
  if (process.env.RESEND_API_KEY) {
    try {
      const { error } = await new Resend(process.env.RESEND_API_KEY).emails.send({
        // onboarding@resend.dev only delivers to the Resend account's own address; set SKA_MAIL_FROM
        // to e.g. "SKA Productions <booking@skaproductions.com>" once the domain is verified in Resend.
        from: process.env.SKA_MAIL_FROM || 'SKA Productions <onboarding@resend.dev>',
        to: (process.env.SKA_INQUIRY_TO || 'terry@skaproductions.com').split(',').map((a) => a.trim()),
        replyTo: body.email,
        subject: `[SKA casting] ${body.name}${body.company ? ` · ${body.company}` : ''} — ${body.event ?? 'inquiry'}, ${[body.city, body.country].filter(Boolean).join(', ') || 'TBD'}`,
        text: summary,
        html: inquiryHtml(body, wishes),
      });
      if (error) console.error('[ska-inquiry] email failed', error);
    } catch (e) {
      console.error('[ska-inquiry] email failed', e);
    }
  }

  // Optionally also forward to Slack/Discord (SKA_INQUIRY_WEBHOOK_URL). Every inquiry is logged as well.
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

const esc = (v: unknown) =>
  String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

function inquiryHtml(b: Inquiry, wishes: string[]) {
  const row = (k: string, v: string) =>
    v ? `<tr><td style="padding:8px 16px 8px 0;color:#777;vertical-align:top;white-space:nowrap">${k}</td><td style="padding:8px 0;color:#111">${v}</td></tr>` : '';
  return `<div style="font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;max-width:560px">
  <p style="font-size:12px;letter-spacing:.2em;color:#999;margin:0 0 4px">SKA PRODUCTIONS · CASTING INQUIRY</p>
  <h2 style="margin:0 0 16px;font-size:20px;color:#111">${esc(b.name)}${b.company ? ` <span style="color:#777">· ${esc(b.company)}</span>` : ''}</h2>
  <table style="border-collapse:collapse;font-size:14px;line-height:1.5">
    ${row('Email', `<a href="mailto:${esc(b.email)}">${esc(b.email)}</a>`)}
    ${row('Artists', esc((b.genres ?? []).join(', ')))}
    ${row('Wish list', wishes.map((a, i) => `${i + 1}. ${esc(a)}`).join('<br>'))}
    ${row('Event', `${esc(b.event)} · ${esc(b.capacity?.toLocaleString())}+ people`)}
    ${row('Where', esc([b.city, b.country].filter(Boolean).join(', ')))}
    ${row('When', esc(b.date || 'TBD'))}
    ${row('Note', esc(b.message).replace(/\n/g, '<br>'))}
  </table>
  <p style="margin-top:20px;font-size:12px;color:#999">Reply to this email to answer ${esc(b.name)} directly.</p>
</div>`;
}
