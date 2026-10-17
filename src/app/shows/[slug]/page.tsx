import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { connection } from 'next/server';
import ShowDetail from '@/components/ska/ShowDetail';
import { isPast, type Show } from '@/components/ska/data';
import { getShow } from '@/lib/ska-store';

/** "Aug 15 – 16, 2025" in the show's own time zone (the date part of its ISO time), or "2027 · Date TBA". */
function previewDate(s: Show) {
  const day = (iso: string, o: Intl.DateTimeFormatOptions) => new Date(`${iso.slice(0, 10)}T00:00:00Z`).toLocaleDateString('en-US', { ...o, timeZone: 'UTC' });
  if (s.dateTBA) return `${s.start.slice(0, 4)} · Date TBA`;
  const start = day(s.start, { month: 'short', day: 'numeric', year: 'numeric' });
  if (!s.end || s.end.slice(0, 10) === s.start.slice(0, 10)) return start;
  return `${day(s.start, { month: 'short', day: 'numeric' })} – ${day(s.end, { month: 'short', day: 'numeric', year: 'numeric' })}`;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const show = await getShow(slug);
  if (!show) return { title: 'SKA PRODUCTIONS' };
  const title = `${show.title} ${show.edition}`.trim();
  const when = previewDate(show);
  const where = [show.venue.en, show.city.en].filter(Boolean).join(', ');
  const description = [when, where].filter(Boolean).join(' · ') + (show.summary.en ? ` — ${show.summary.en}` : '');
  // link previews (KakaoTalk, LINE, Instagram DM…) show the poster when there is one, else the SKA card
  const images = show.poster ? [{ url: show.poster, alt: `${title} poster` }] : [{ url: '/ska/og.png', width: 1200, height: 630, alt: 'SKA PRODUCTIONS INC.' }];
  return {
    title: `${title} — SKA PRODUCTIONS`,
    description,
    openGraph: { title, description, images, siteName: 'SKA PRODUCTIONS INC.', type: 'website', url: `/shows/${show.slug}` },
    twitter: { card: 'summary_large_image', images: images.map((i) => i.url) },
  };
}

export default async function ShowPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  await connection(); // shows are edited at runtime via /ska/admin
  const show = await getShow(slug);
  if (!show) notFound();
  return <ShowDetail show={show} past={isPast(show)} />;
}
