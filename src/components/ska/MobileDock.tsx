'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { SOCIALS, type L } from './data';
import { Arrow, Layer, SocialIcon, useLang } from './ui';

const SECTIONS: { id: string; label: L }[] = [
  { id: 'stages', label: { en: 'Our Stages', ko: '오리지널 IP' } },
  { id: 'upcoming', label: { en: 'Upcoming', ko: '공연 일정' } },
  { id: 'casting', label: { en: 'Artist Casting', ko: '아티스트 캐스팅' } },
  { id: 'history', label: { en: 'History', ko: '히스토리' } },
  { id: 'about', label: { en: 'About', ko: '회사 소개' } },
];

/**
 * Floating navigation: on phones/tablets a pill at the bottom that names the section
 * you're in and opens a jump menu; on desktop a slim rail on the right edge with a mark per section.
 */
export default function MobileDock() {
  const { t, lang, setLang } = useLang();
  const path = usePathname();
  const onHome = path === '/';
  const [shown, setShown] = useState(false);
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState<string | null>(null);

  useEffect(() => {
    const on = () => setShown(window.scrollY > 320);
    on();
    window.addEventListener('scroll', on, { passive: true });
    return () => window.removeEventListener('scroll', on);
  }, [path]);

  // scrollspy: the section crossing the middle of the screen is "current"
  useEffect(() => {
    if (!onHome) return setCurrent(null);
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && setCurrent(e.target.id)),
      { rootMargin: '-45% 0px -50% 0px' },
    );
    SECTIONS.forEach((s) => {
      const el = document.getElementById(s.id);
      if (el) io.observe(el);
    });
    return () => io.disconnect();
  }, [onHome]);

  useEffect(() => {
    if (!open) return;
    document.documentElement.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => {
      document.documentElement.style.overflow = '';
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  if (path.startsWith('/admin')) return null;

  const currentLabel = SECTIONS.find((s) => s.id === current)?.label;
  const index = SECTIONS.findIndex((s) => s.id === current);

  return (
    <Layer>
      {/* desktop: slim rail on the right edge; hover a mark to see its section */}
      <nav
        aria-label={t({ en: 'Sections', ko: '섹션' })}
        className={`fixed right-5 top-1/2 z-[75] hidden -translate-y-1/2 flex-col items-end gap-2 transition-all duration-500 lg:flex ${
          shown ? 'translate-x-0 opacity-100' : 'pointer-events-none translate-x-6 opacity-0'
        }`}
      >
        <Link
          href="/#casting"
          className="group mb-2 flex items-center gap-2 rounded-full border border-white/15 bg-[#111116]/85 py-1.5 pl-1.5 pr-1.5 shadow-[0_10px_30px_-10px_rgba(0,0,0,.9)] backdrop-blur-md transition-all hover:pr-4"
        >
          <span className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-white/20 to-white/5">
            <Image src="/ska/logo-mark-chrome.png" alt="" width={285} height={380} className="h-6 w-auto" />
          </span>
          <span className="max-w-0 overflow-hidden whitespace-nowrap text-xs font-semibold transition-all duration-300 group-hover:max-w-40">
            {t({ en: 'Book an Artist', ko: '캐스팅 문의' })}
          </span>
        </Link>
        <ol className="group/rail flex flex-col items-end gap-1 rounded-2xl border border-white/10 bg-[#111116]/70 px-2 py-3 backdrop-blur-md transition-colors hover:bg-[#111116]/95">
          {SECTIONS.map((s, i) => {
            const on = s.id === current;
            return (
              <li key={s.id}>
                <Link href={`/#${s.id}`} className="group flex items-center justify-end gap-3 py-1.5 pl-2" aria-current={on ? 'true' : undefined}>
                  <span
                    className={`whitespace-nowrap text-xs transition-all duration-300 ${
                      on ? 'text-white' : 'text-white/60 group-hover:text-white'
                    } max-w-0 translate-x-2 overflow-hidden opacity-0 group-hover/rail:max-w-48 group-hover/rail:translate-x-0 group-hover/rail:opacity-100`}
                  >
                    <span className="mr-1.5 font-mono text-[10px] text-white/40">{String(i + 1).padStart(2, '0')}</span>
                    {t(s.label)}
                  </span>
                  <span
                    className={`h-[3px] rounded-full transition-all duration-300 ${on ? 'w-7 bg-white' : 'w-3.5 bg-white/30 group-hover:w-5 group-hover:bg-white/70'}`}
                  />
                </Link>
              </li>
            );
          })}
        </ol>
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="mt-2 flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-[#111116]/85 text-white/70 backdrop-blur-md transition hover:border-white hover:text-white"
          aria-label={t({ en: 'Back to top', ko: '맨 위로' })}
        >
          ↑
        </button>
      </nav>

      {/* phones/tablets: floating pill */}
      <div
        className={`fixed inset-x-0 bottom-4 z-[75] flex justify-center px-4 transition-all duration-500 lg:hidden ${
          shown && !open ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-24 opacity-0'
        }`}
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="flex items-center gap-1 rounded-full border border-white/15 bg-[#111116]/90 p-1.5 shadow-[0_12px_40px_-8px_rgba(0,0,0,.9)] backdrop-blur-md">
          <button onClick={() => setOpen(true)} className="flex items-center gap-3 rounded-full py-1 pl-1 pr-4" aria-label={t({ en: 'Open menu', ko: '메뉴 열기' })} aria-expanded={open}>
            <span className="relative flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-white/20 to-white/5">
              <Image src="/ska/logo-mark-chrome.png" alt="" width={285} height={380} className="h-7 w-auto" />
            </span>
            <span className="flex flex-col items-start leading-tight">
              <span className="text-[10px] uppercase tracking-[0.2em] text-white/45">
                {index >= 0 ? `${String(index + 1).padStart(2, '0')} / ${String(SECTIONS.length).padStart(2, '0')}` : 'SKA'}
              </span>
              <span className="text-sm font-semibold">{currentLabel ? t(currentLabel) : t({ en: 'Menu', ko: '메뉴' })}</span>
            </span>
            <span className="ml-1 flex flex-col gap-1" aria-hidden>
              <span className="h-px w-4 bg-white/70" />
              <span className="h-px w-4 bg-white/70" />
            </span>
          </button>
          <Link href="/#casting" className="ska-btn ska-btn-chrome !px-4 !py-2.5 !text-xs">
            {t({ en: 'Book', ko: '캐스팅' })}
          </Link>
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="flex h-10 w-10 items-center justify-center rounded-full text-white/70 hover:bg-white/10"
            aria-label={t({ en: 'Back to top', ko: '맨 위로' })}
          >
            ↑
          </button>
        </div>
      </div>

      {/* jump menu */}
      {open && (
        <div className="fixed inset-0 z-[96] flex flex-col justify-end bg-black/70 lg:hidden" onClick={() => setOpen(false)}>
          <div
            className="animate-[ska-sheet_.35s_cubic-bezier(.2,.8,.2,1)] rounded-t-3xl border-t border-white/10 bg-[#0d0d12] px-5 pb-6 pt-3"
            style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 24px)' }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label={t({ en: 'Menu', ko: '메뉴' })}
          >
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-white/20" />
            <div className="flex items-center justify-between">
              <p className="ska-eyebrow">SKA Productions</p>
              <div className="flex rounded-full border border-white/15 p-0.5 text-[11px] font-semibold">
                {(['en', 'ko'] as const).map((l) => (
                  <button
                    key={l}
                    onClick={() => setLang(l)}
                    className={`rounded-full px-3 py-1 uppercase transition ${lang === l ? 'bg-white text-black' : 'text-white/60'}`}
                  >
                    {l}
                  </button>
                ))}
              </div>
            </div>
            <nav className="mt-4">
              {SECTIONS.map((s, i) => (
                <Link
                  key={s.id}
                  href={`/#${s.id}`}
                  onClick={() => setOpen(false)}
                  className="group flex items-center gap-4 border-b border-white/[0.06] py-3.5"
                  style={{ animation: `ska-in .4s ease ${i * 40}ms both` }}
                >
                  <span className="w-6 font-mono text-xs text-white/35">{String(i + 1).padStart(2, '0')}</span>
                  <span className={`ska-display flex-1 text-[28px] leading-none ${s.id === current ? 'text-white' : 'text-white/60'}`}>{t(s.label)}</span>
                  {s.id === current ? (
                    <span className="h-2 w-2 rounded-full bg-white shadow-[0_0_12px_white]" />
                  ) : (
                    <Arrow className="h-4 w-4 text-white/30 transition group-active:translate-x-1" />
                  )}
                </Link>
              ))}
            </nav>
            <div className="mt-5 grid grid-cols-2 gap-2">
              {!onHome && (
                <Link href="/" onClick={() => setOpen(false)} className="ska-btn ska-btn-ghost justify-center !py-3 !text-sm">
                  {t({ en: 'Home', ko: '홈' })}
                </Link>
              )}
              <Link href="/#casting" onClick={() => setOpen(false)} className={`ska-btn ska-btn-chrome justify-center !py-3 !text-sm ${onHome ? 'col-span-2' : ''}`}>
                {t({ en: 'Book an Artist', ko: '캐스팅 문의' })} <Arrow />
              </Link>
            </div>
            <div className="mt-4 flex justify-center gap-3">
              {SOCIALS.map((s) => (
                <a
                  key={s.name}
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={s.name}
                  className="flex h-11 w-11 items-center justify-center rounded-full border border-white/15 text-white/70 transition hover:border-white hover:text-white"
                >
                  <SocialIcon name={s.name} className="h-5 w-5" />
                </a>
              ))}
            </div>
          </div>
        </div>
      )}
    </Layer>
  );
}
