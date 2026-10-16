import { connection } from 'next/server';
import About from '@/components/ska/About';
import Brands from '@/components/ska/Brands';
import Casting from '@/components/ska/Casting';
import Hero from '@/components/ska/Hero';
import History from '@/components/ska/History';
import Intro from '@/components/ska/Intro';
import Upcoming from '@/components/ska/Upcoming';
import { isPast } from '@/components/ska/data';
import { getShows } from '@/lib/ska-store';

export default async function SkaHome() {
  await connection(); // shows are edited at runtime via /ska/admin
  const shows = await getShows();
  const now = Date.now();
  const upcoming = shows.filter((s) => !isPast(s, now));
  const past = shows.filter((s) => isPast(s, now)).reverse();
  return (
    <>
      <Intro />
      <main>
        <Hero />
        <Brands shows={upcoming} />
        <Upcoming shows={upcoming} />
        <Casting />
        <History shows={past} />
        <About />
      </main>
    </>
  );
}
