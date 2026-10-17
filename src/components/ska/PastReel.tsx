'use client';

import Link from 'next/link';
import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import type { Brand, Show } from './data';
import { Arrow, Layer, Poster, fmtDate, showYear, useLang } from './ui';

/**
 * One festival's past shows, opened over the page (no scrolling away): the posters drop in as a pile,
 * fan out like a hand of movie posters and keep floating; hover lifts one, click opens the show.
 */
export default function PastReel({ brand, shows, onClose }: { brand: Brand; shows: Show[]; onClose: () => void }) {
  const { t, lang } = useLang();
  const row = useRef<HTMLDivElement>(null);
  const [closing, setClosing] = useState(false);
  // oldest on the left, like a timeline
  const list = [...shows].sort((a, b) => a.start.localeCompare(b.start));
  const n = list.length;
  const fan = n <= 7; // a hand of cards; longer lists become a scrolling strip

  const close = () => {
    setClosing(true);
    setTimeout(onClose, 260);
  };

  useEffect(() => {
    const prev = document.documentElement.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close();
    window.addEventListener('keydown', onKey);
    return () => {
      document.documentElement.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // every poster starts in one pile in the middle of the screen
  useLayoutEffect(() => {
    const el = row.current;
    if (!el) return;
    const mid = el.clientWidth / 2;
    [...el.children].forEach((c) => {
      const h = c as HTMLElement;
      h.style.setProperty('--dx', `${mid - (h.offsetLeft - el.scrollLeft + h.offsetWidth / 2)}px`);
    });
    // start a long strip at its newest end
    if (!fan) el.scrollLeft = el.scrollWidth;
  }, [fan]);

  return (
    <Layer>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`${brand.name} — ${t({ en: 'Past shows', ko: '지난 공연' })}`}
        className={`fixed inset-0 z-[88] flex flex-col overflow-hidden bg-[#08080c]/95 backdrop-blur-2xl transition-opacity duration-300 ${closing ? 'opacity-0' : 'animate-[ska-in_.35s_ease]'}`}
        onClick={close}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{ background: `radial-gradient(60% 50% at 50% 100%, ${brand.accent}33, transparent 70%), radial-gradient(40% 40% at 50% 0%, ${brand.accent2}1f, transparent 70%)` }}
        />

        <div className="relative flex items-start justify-between gap-4 px-5 pt-6 sm:px-10 sm:pt-10" onClick={(e) => e.stopPropagation()}>
          <div>
            <p className="text-[11px] uppercase tracking-[0.3em]" style={{ color: brand.accent }}>
              {brand.name}
            </p>
            <h2 className="ska-display mt-2 text-[clamp(36px,6vw,72px)] leading-[0.9]">{t({ en: 'Past shows', ko: '지난 공연' })}</h2>
            <p className="mt-2 text-sm text-white/50">
              {n} {t({ en: n === 1 ? 'show' : 'shows', ko: '개 공연' })} · {showYear(list[0].start)}
              {n > 1 && ` – ${showYear(list[n - 1].start)}`}
            </p>
          </div>
          <button
            onClick={close}
            aria-label={t({ en: 'Close', ko: '닫기' })}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/20 text-lg transition hover:border-white hover:bg-white hover:text-black"
          >
            ✕
          </button>
        </div>

        <div className="relative flex flex-1 items-center">
          <div
            ref={row}
            className={`flex w-full items-center px-[12vw] py-16 [scrollbar-width:none] sm:px-10 ${
              fan ? 'justify-center max-md:snap-x max-md:snap-mandatory max-md:justify-start max-md:overflow-x-auto max-md:gap-5' : 'snap-x snap-mandatory gap-6 overflow-x-auto'
            }`}
          >
            {list.map((s, i) => {
              const off = i - (n - 1) / 2;
              const style = {
                '--rot': fan ? `${off * 5}deg` : `${(i % 2 ? 1 : -1) * 2}deg`,
                '--lift': fan ? `${Math.abs(off) ** 2 * 7}px` : '0px',
                animationDelay: `${150 + i * 80}ms`,
                zIndex: fan ? 20 - Math.round(Math.abs(off)) : undefined,
              } as CSSProperties;
              return (
                <div
                  key={s.slug}
                  onClick={(e) => e.stopPropagation()}
                  className={`ska-fan relative shrink-0 snap-center ${fan ? 'md:-mx-5 lg:-mx-3' : ''} hover:!z-30`}
                  style={style}
                >
                  <div className="ska-float" style={{ animationDelay: `${-i * 0.9}s` }}>
                    <Link
                      href={`/shows/${s.slug}`}
                      onClick={() => (document.documentElement.style.overflow = '')}
                      className="group block w-[62vw] max-w-[260px] transition duration-500 ease-out hover:-translate-y-6 hover:scale-[1.06] sm:w-[220px] lg:w-[240px]"
                      style={{ transformOrigin: '50% 100%' }}
                    >
                      <div className="relative overflow-hidden rounded-xl shadow-[0_40px_80px_-25px_rgba(0,0,0,1)] ring-1 ring-white/10 transition group-hover:ring-white/40">
                        <Poster src={s.poster} brand={brand} title={s.title} edition={s.edition} />
                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/70 to-transparent p-4 pt-12 opacity-0 transition duration-300 group-hover:opacity-100">
                          <p className="text-[10px] uppercase tracking-[0.25em]" style={{ color: brand.accent }}>
                            {fmtDate(s.start, lang, s.end, s.dateTBA)}
                          </p>
                          <p className="mt-1 truncate text-xs text-white/75">{t(s.venue) || t(s.city)}</p>
                          <span className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold">
                            {t({ en: 'View show', ko: '공연 보기' })} <Arrow className="h-3 w-3" />
                          </span>
                        </div>
                        {!!s.gallery?.length && (
                          <span className="absolute left-3 top-3 rounded-full bg-black/70 px-2.5 py-1 text-[11px] font-semibold backdrop-blur">📷 {s.gallery.length}</span>
                        )}
                      </div>
                      <p className="ska-display mt-4 text-center text-2xl text-white/80 transition group-hover:text-white">{s.edition || showYear(s.start)}</p>
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <p className="relative pb-6 text-center text-[10px] uppercase tracking-[0.3em] text-white/30">
          {t({ en: 'Tap a poster to open the show · Esc to close', ko: '포스터를 누르면 공연 페이지로 이동 · Esc로 닫기' })}
        </p>
      </div>
    </Layer>
  );
}
