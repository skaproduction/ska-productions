import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { connection } from 'next/server';
import ShowDetail from '@/components/ska/ShowDetail';
import { isPast } from '@/components/ska/data';
import { getShow } from '@/lib/ska-store';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const show = await getShow(slug);
  return { title: show ? `${show.title} ${show.edition} — SKA PRODUCTIONS` : 'SKA PRODUCTIONS' };
}

export default async function ShowPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  await connection(); // shows are edited at runtime via /ska/admin
  const show = await getShow(slug);
  if (!show) notFound();
  return <ShowDetail show={show} past={isPast(show)} />;
}
