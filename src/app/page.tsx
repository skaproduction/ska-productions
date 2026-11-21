import { connection } from 'next/server';
import About from '@/components/ska/About';
import Brands from '@/components/ska/Brands';
import Casting from '@/components/ska/Casting';
import Hero from '@/components/ska/Hero';
import History from '@/components/ska/History';
import Intro from '@/components/ska/Intro';
import Upcoming from '@/components/ska/Upcoming';
import { isPast } from '@/components/ska/data';
import NoticePopup from '@/components/ska/NoticePopup';
import { eventLd, ldJson, organizationLd } from '@/lib/ska-seo';
import { getSettings, getShows } from '@/lib/ska-store';

export default async function SkaHome() {
  await connection(); // shows are edited at runtime via /ska/admin
  const [shows, notices] = await Promise.all([getShows(), getSettings().then((s) => s.notices).catch(() => undefined)]);
  const now = Date.now();
  const upcoming = shows.filter((s) => !isPast(s, now));
  const past = shows.filter((s) => isPast(s, now)).reverse();
  return (
    <>
      {/* for search engines: who SKA is, and the upcoming shows as events */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ldJson([organizationLd(), ...upcoming.map(eventLd).filter(Boolean)]) }} />
      <Intro />
      <NoticePopup
        notices={notices}
        shows={shows.map((s) => ({ slug: s.slug, oldSlugs: s.oldSlugs, title: s.title, edition: s.edition, ticketUrl: s.ticketUrl, past: isPast(s, now) }))}
      />
      <main>
        <Hero />
        <Brands shows={upcoming} past={past} />
        <Upcoming shows={upcoming} />
        <Casting />
        <History shows={past} />
        <About />
      </main>
    </>
  );
}
