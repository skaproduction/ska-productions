import type { MetadataRoute } from 'next';

/** Search engines may read everything except the admin and the API. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: '*', allow: '/', disallow: ['/admin', '/api/'] }],
    sitemap: 'https://www.skaproductions.com/sitemap.xml',
    host: 'https://www.skaproductions.com',
  };
}
