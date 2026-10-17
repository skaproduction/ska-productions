import type { Metadata } from 'next';
import { Anton, Noto_Serif } from 'next/font/google';
import Shell from '@/components/ska/Shell';
import { getSettings } from '@/lib/ska-store';
import './globals.css';
import './ska.css';

const display = Anton({ subsets: ['latin'], weight: '400', variable: '--font-display' });
const serif = Noto_Serif({ subsets: ['latin'], weight: ['400', '500'], variable: '--font-serif' });

// Runs before hydration so returning visitors (same browser session) skip the intro without a flash.
// Lives in the root layout (rendered once on the server, not on client navigations) and only touches
// <head> and window, which React tolerates during hydration.
const introScript = `try{if(sessionStorage.getItem('ska-intro-seen')&&!/[?&]intro/.test(location.search)){window.__skaIntroSeen=1;var s=document.createElement('style');s.textContent='.ska-intro{display:none}';document.head.appendChild(s)}}catch(e){}`;

export const metadata: Metadata = {
  metadataBase: new URL('https://www.skaproductions.com'),
  title: 'SKA PRODUCTIONS INC. — Entertainment',
  description:
    'SKA Productions produces KPOP PRIME, 7 ROCK PRIME and SKA SUPER SWAG FESTIVAL, and books Korean artists for stages worldwide.',
  openGraph: {
    title: 'SKA PRODUCTIONS INC.',
    description: 'KPOP PRIME · 7 ROCK PRIME · SKA SUPER SWAG FESTIVAL — and Korean artist casting for stages worldwide.',
    images: [{ url: '/ska/og.png', width: 1200, height: 630, alt: 'SKA PRODUCTIONS INC.' }],
    siteName: 'SKA PRODUCTIONS INC.',
    url: '/',
    type: 'website',
  },
  twitter: { card: 'summary_large_image', images: ['/ska/og.png'] },
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  // background music is optional; a storage hiccup must never take the page down
  const bgm = await getSettings()
    .then((s) => s.bgm)
    .catch(() => undefined);
  return (
    <html lang="ko" className="h-full antialiased">
      <head>
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"
        />
      </head>
      <body className="min-h-full bg-[#07070a] font-sans text-zinc-100">
        <div className={`${display.variable} ${serif.variable} ska`}>
          <script dangerouslySetInnerHTML={{ __html: introScript }} />
          <Shell bgm={bgm}>{children}</Shell>
        </div>
      </body>
    </html>
  );
}
