import type { MetadataRoute } from 'next';
import { getShows } from '@/lib/ska-store';

const SITE = 'https://www.skaproductions.com';

// rebuilt at most hourly, so new shows reach search engines without a redeploy
export const revalidate = 3600;

/** Every public page, so Google and Naver find each show — rebuilt from the live show list. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const shows = await getShows().catch(() => []);
  const now = Date.now();
  return [
    { url: SITE, changeFrequency: 'daily', priority: 1 },
    ...shows.map((s) => {
      const upcoming = new Date(s.end ?? s.start).getTime() > now;
      return {
        url: `${SITE}/shows/${s.slug}`,
        changeFrequency: upcoming ? ('weekly' as const) : ('yearly' as const),
        priority: upcoming ? 0.9 : 0.5,
        ...(s.poster && { images: [s.poster.startsWith('/') ? SITE + s.poster : s.poster] }),
      };
    }),
  ];
}
