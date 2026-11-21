import { CONTACT_EMAIL, SOCIALS, brandById, isPast, type Show } from '@/components/ska/data';

// Structured data (schema.org JSON-LD) for search engines: Google can show a show's date, venue and
// ticket link right in its results, and knows who SKA is. Nothing here is visible on the page.

export const SITE = 'https://www.skaproductions.com';

/**
 * Site-ownership codes from Google Search Console ("HTML tag" method) and Naver Search Advisor
 * ("HTML 태그"): paste just the content="…" value. They're public — they end up in the page's <head>.
 */
export const VERIFICATION = {
  google: process.env.SKA_GOOGLE_VERIFICATION || '0TP948kRRH3Kzubo-Zv7qQTMN6OQQO91utcQMjgFF5c',
  naver: process.env.SKA_NAVER_VERIFICATION || '36848907a8ea98b0daab3025b445eeb8351e564a',
};

const abs = (u?: string) => (!u ? undefined : u.startsWith('/') ? SITE + u : u);

export function organizationLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': `${SITE}/#org`,
    name: 'SKA PRODUCTIONS INC.',
    alternateName: ['SKA Productions', 'SKA 프로덕션', '에스케이에이 프로덕션'],
    url: SITE,
    logo: `${SITE}/ska/logo-mark-chrome.png`,
    image: `${SITE}/ska/og.png`,
    email: CONTACT_EMAIL,
    description:
      'Seoul-based concert producer behind KPOP PRIME, 7 ROCK PRIME and SKA SUPER SWAG FESTIVAL, booking Korean artists for stages worldwide.',
    address: { '@type': 'PostalAddress', addressLocality: 'Seoul', addressCountry: 'KR' },
    sameAs: SOCIALS.map((s) => s.url),
  };
}

/** A show as a schema.org MusicEvent; null while its date is still TBA (Google needs a start date). */
export function eventLd(show: Show) {
  if (show.dateTBA) return null;
  const b = brandById(show.brand);
  const name = `${show.title} ${show.edition}`.trim();
  const performers = show.lineup.filter((a) => a.announced && a.name.trim());
  const past = isPast(show);
  return {
    '@context': 'https://schema.org',
    '@type': 'MusicEvent',
    name,
    url: `${SITE}/shows/${show.slug}`,
    startDate: show.start,
    ...(show.end && { endDate: show.end }),
    eventStatus: 'https://schema.org/EventScheduled',
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    description: show.summary.en || show.summary.ko || `${name} — ${b.genre.en} produced by SKA PRODUCTIONS.`,
    ...(show.poster && { image: [abs(show.poster)] }),
    location: {
      '@type': 'Place',
      name: show.venue.en || show.venue.ko || [show.city.en, show.country.en].filter(Boolean).join(', '),
      address: { '@type': 'PostalAddress', addressLocality: show.city.en || show.city.ko, addressCountry: show.country.en || show.country.ko },
    },
    organizer: { '@type': 'Organization', name: 'SKA PRODUCTIONS INC.', url: SITE },
    ...(performers.length && { performer: performers.map((a) => ({ '@type': 'PerformingGroup', name: a.name.trim() })) }),
    ...(show.ticketUrl && !past && { offers: { '@type': 'Offer', url: show.ticketUrl, availability: 'https://schema.org/InStock' } }),
  };
}

/** For a <script type="application/ld+json">; "<" is escaped so text from the admin can't end the tag. */
export const ldJson = (data: unknown) => JSON.stringify(data).replace(/</g, '\\u003c');
