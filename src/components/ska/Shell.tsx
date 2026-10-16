'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { CONTACT_EMAIL, SOCIALS } from './data';
import MobileDock from './MobileDock';
import { Arrow, LangProvider, Magnetic, SocialIcon, useLang } from './ui';

const NAV = [
  { href: '/#stages', label: { en: 'Our Stages', ko: '오리지널 IP' } },
  { href: '/#upcoming', label: { en: 'Upcoming', ko: '공연 일정' } },
  { href: '/#casting', label: { en: 'Artist Casting', ko: '아티스트 캐스팅' } },
  { href: '/#history', label: { en: 'History', ko: '히스토리' } },
  { href: '/#about', label: { en: 'About', ko: '회사 소개' } },
];

export default function Shell({ children }: { children: ReactNode }) {
  const root = useRef<HTMLDivElement>(null);
  const bar = useRef<HTMLDivElement>(null);
  const isAdmin = usePathname().startsWith('/admin');

  useEffect(() => {
    const host = root.current?.parentElement;
    let raf = 0;
    const onMove = (e: PointerEvent) => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        host?.style.setProperty('--cx', `${e.clientX}px`);
        host?.style.setProperty('--cy', `${e.clientY}px`);
      });
    };
    const onScroll = () => {
      const h = document.documentElement;
      const p = h.scrollTop / Math.max(1, h.scrollHeight - h.clientHeight);
      if (bar.current) bar.current.style.transform = `scaleX(${p})`;
    };
    if (!isAdmin) window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('scroll', onScroll);
    };
  }, [isAdmin]);

  return (
    <LangProvider>
      <div ref={root}>
        <div
          ref={bar}
          className="fixed left-0 right-0 top-0 z-[80] h-[2px] origin-left scale-x-0 bg-gradient-to-r from-white/40 via-white to-white/40"
        />
        <Nav />
        {children}
        <Footer />
        <MobileDock />
      </div>
    </LangProvider>
  );
}

function Nav() {
  const { lang, setLang, t } = useLang();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 40);
    on();
    window.addEventListener('scroll', on, { passive: true });
    return () => window.removeEventListener('scroll', on);
  }, []);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-500 ${
        scrolled || open ? 'border-b border-white/[0.06] bg-black/70 backdrop-blur-xl' : 'bg-transparent'
      }`}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 sm:h-20 sm:px-8">
        <Link href="/" className="flex items-center gap-3" aria-label="SKA Productions home">
          <Image src="/ska/logo-full.png" alt="SKA PRODUCTIONS INC." width={1544} height={367} className="h-8 w-auto sm:h-10" priority />
        </Link>

        <nav className="hidden items-center gap-8 lg:flex">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} className="group relative text-[13px] tracking-wide text-white/70 transition hover:text-white">
              {t(n.label)}
              <span className="absolute -bottom-1 left-0 h-px w-0 bg-white transition-all duration-300 group-hover:w-full" />
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <div className="flex rounded-full border border-white/15 p-0.5 text-[11px] font-semibold">
            {(['en', 'ko'] as const).map((l) => (
              <button
                key={l}
                onClick={() => setLang(l)}
                className={`rounded-full px-2.5 py-1 uppercase transition ${lang === l ? 'bg-white text-black' : 'text-white/60 hover:text-white'}`}
                aria-pressed={lang === l}
              >
                {l === 'en' ? 'EN' : 'KO'}
              </button>
            ))}
          </div>
          <span className="hidden sm:block">
            <Magnetic>
              <Link href="/#casting" className="ska-btn ska-btn-chrome whitespace-nowrap !py-2.5 !text-[13px]">
                {t({ en: 'Book an Artist', ko: '캐스팅 문의' })}
              </Link>
            </Magnetic>
          </span>
          <button
            className="flex h-10 w-10 flex-col items-center justify-center gap-1.5 lg:hidden"
            onClick={() => setOpen((o) => !o)}
            aria-label="Menu"
            aria-expanded={open}
          >
            <span className={`h-px w-6 bg-white transition ${open ? 'translate-y-[3.5px] rotate-45' : ''}`} />
            <span className={`h-px w-6 bg-white transition ${open ? '-translate-y-[3.5px] -rotate-45' : ''}`} />
          </button>
        </div>
      </div>

      <div className={`overflow-hidden transition-all duration-500 lg:hidden ${open ? 'max-h-96' : 'max-h-0'}`}>
        <nav className="flex flex-col px-5 pb-6">
          {NAV.map((n, i) => (
            <Link
              key={n.href}
              href={n.href}
              onClick={() => setOpen(false)}
              className="ska-display border-b border-white/[0.06] py-4 text-3xl text-white/90"
              style={{ transitionDelay: `${i * 40}ms` }}
            >
              {t(n.label)}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}

function Footer() {
  const { t } = useLang();
  const [copied, setCopied] = useState(false);
  return (
    <footer className="border-t border-white/[0.06] px-5 pb-32 pt-20 sm:px-8 lg:pb-10">
      <div className="mx-auto max-w-7xl">
        <div className="grid gap-12 lg:grid-cols-[1.4fr_1fr]">
          <div>
            <p className="ska-eyebrow">{t({ en: 'Get in touch', ko: '문의하기' })}</p>
            <h2 className="ska-display mt-4 text-[clamp(44px,8vw,110px)] leading-[0.9]">
              {t({ en: 'Let’s build', ko: '다음 무대를' })}
              <br />
              <span className="ska-chrome-text">{t({ en: 'the next stage.', ko: '함께 만듭시다.' })}</span>
            </h2>
            <button
              onClick={() => {
                navigator.clipboard?.writeText(CONTACT_EMAIL).catch(() => {});
                setCopied(true);
                setTimeout(() => setCopied(false), 1800);
              }}
              className="group mt-8 inline-flex items-center gap-3 text-lg text-white/80 transition hover:text-white sm:text-2xl"
            >
              <span className="border-b border-white/30 pb-1 group-hover:border-white">{CONTACT_EMAIL}</span>
              <span className="rounded-full border border-white/20 px-3 py-1 text-xs uppercase tracking-widest">
                {copied ? t({ en: 'Copied ✓', ko: '복사됨 ✓' }) : t({ en: 'Copy', ko: '복사' })}
              </span>
            </button>
          </div>
          <div className="grid grid-cols-2 gap-8 text-sm">
            <div>
              <p className="ska-eyebrow mb-4">{t({ en: 'Festivals', ko: '페스티벌' })}</p>
              <ul className="space-y-2 text-white/70">
                <li>KPOP PRIME</li>
                <li>7 ROCK PRIME</li>
                <li>SKA SUPER SWAG FESTIVAL</li>
              </ul>
            </div>
            <div>
              <p className="ska-eyebrow mb-4">{t({ en: 'Company', ko: '회사' })}</p>
              <ul className="space-y-2 text-white/70">
                <li>
                  <Link href="/#casting" className="inline-flex items-center gap-1 hover:text-white">
                    {t({ en: 'Artist casting', ko: '아티스트 캐스팅' })} <Arrow className="h-3 w-3" />
                  </Link>
                </li>
                <li>Seoul, Korea</li>
                {SOCIALS.map((s) => (
                  <li key={s.name}>
                    <a href={s.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 hover:text-white">
                      <SocialIcon name={s.name} className="h-4 w-4" /> {s.name}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
        <div className="mt-16 flex flex-col items-start justify-between gap-4 border-t border-white/[0.06] pt-6 text-xs text-white/40 sm:flex-row sm:items-center">
          <span>© {new Date().getFullYear()} SKA PRODUCTIONS INC. All rights reserved.</span>
          <span className="flex items-center gap-6">
            <Link href="/admin" className="transition hover:text-white/70">Admin</Link>
            <span className="tracking-[0.3em]">ENTERTAINMENT</span>
          </span>
        </div>
      </div>
    </footer>
  );
}
