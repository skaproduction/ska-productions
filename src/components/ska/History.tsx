'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { BRANDS, brandById, type BrandId, type Show } from './data';
import { Arrow, Poster, Reveal, SwipeDots, fmtDate, showYear, useLang, useSnapIndex } from './ui';

/**
 * Archive of past shows. Pick a year and that year's posters deal out of a stack onto a
 * movie-poster shelf; choose one to open its page.
 */
export default function History({ shows }: { shows: Show[] }) {
  const { t } = useLang();
  const years = useMemo(() => [...new Set(shows.map((s) => showYear(s.start)))].sort((a, b) => b - a), [shows]);
  const [year, setYear] = useState<number | null>(years[0] ?? null);
  const [brand, setBrand] = useState<BrandId | 'all'>('all');
  // bumps on every pick so choosing the same year again replays the deal
  const [deal, setDeal] = useState(0);

  useEffect(() => {
    if (year === null || !years.includes(year)) setYear(years[0] ?? null);
  }, [years, year]);

  const ofYear = shows.filter((s) => showYear(s.start) === year);
  const list = ofYear.filter((s) => brand === 'all' || s.brand === brand);
  const pick = (y: number) => {
    setYear(y);
    setBrand('all');
    setDeal((n) => n + 1);
  };

  return (
    <section id="history" className="relative scroll-mt-20 overflow-hidden border-t border-white/[0.06] px-5 py-20 sm:px-8 sm:py-36">
      <div className="mx-auto max-w-7xl">
        <Reveal>
          <p className="ska-eyebrow">04 — {t({ en: 'History', ko: '히스토리' })}</p>
          <h2 className="ska-display mt-4 text-[clamp(40px,7vw,96px)] leading-[0.9]">
            {t({ en: 'Stages we’ve built', ko: '우리가 만든 무대' })}
          </h2>
          <p className="mt-4 max-w-md text-sm text-white/55">
            {t({ en: 'Pick a year to pull out its posters, then choose a show to step back inside.', ko: '연도를 고르면 그해의 포스터가 펼쳐집니다. 공연을 골라 그날의 무대로 들어가 보세요.' })}
          </p>
        </Reveal>

        {years.length === 0 ? (
          <Reveal className="mt-14 rounded-2xl border border-dashed border-white/15 px-6 py-16 text-center text-white/50">
            {t({ en: 'Our archive fills up as each show wraps. See you at the next one.', ko: '공연이 끝날 때마다 이곳에 기록됩니다. 다음 무대에서 만나요.' })}
          </Reveal>
        ) : (
          <>
            {/* year rail */}
            <Reveal delay={100} className="mt-12">
              <div className="-mx-5 flex items-end gap-6 overflow-x-auto px-5 pb-2 [scrollbar-width:none] sm:mx-0 sm:gap-10 sm:px-0" role="tablist">
                {years.map((y) => {
                  const on = y === year;
                  const n = shows.filter((s) => showYear(s.start) === y).length;
                  return (
                    <button key={y} role="tab" aria-selected={on} onClick={() => pick(y)} className="group relative shrink-0 pb-3 text-left">
                      <span
                        className={`ska-display block leading-none transition-all duration-500 ${
                          on ? 'text-[clamp(56px,9vw,120px)] text-white' : 'text-[clamp(32px,5vw,64px)] text-white/20 group-hover:text-white/50'
                        }`}
                      >
                        {y}
                      </span>
                      <span className={`mt-1 block text-[11px] uppercase tracking-[0.25em] transition ${on ? 'text-white/60' : 'text-white/25'}`}>
                        {n} {t({ en: n === 1 ? 'show' : 'shows', ko: '개 공연' })}
                      </span>
                      <span className={`absolute inset-x-0 bottom-0 h-0.5 origin-left bg-white transition-transform duration-500 ${on ? 'scale-x-100' : 'scale-x-0'}`} />
                    </button>
                  );
                })}
              </div>
            </Reveal>

            {/* festival filter, only when the year has more than one */}
            {new Set(ofYear.map((s) => s.brand)).size > 1 && (
              <div className="mt-6 flex flex-wrap gap-2">
                {(['all', ...BRANDS.filter((b) => ofYear.some((s) => s.brand === b.id)).map((b) => b.id)] as (BrandId | 'all')[]).map((id) => {
                  const b = id === 'all' ? null : brandById(id);
                  const on = brand === id;
                  return (
                    <button
                      key={id}
                      onClick={() => {
                        setBrand(id);
                        setDeal((n) => n + 1);
                      }}
                      className="rounded-full border px-3.5 py-1.5 text-xs font-semibold transition"
                      style={{
                        borderColor: on ? (b?.accent ?? '#fff') : 'rgba(255,255,255,.15)',
                        background: on ? (b ? `${b.accent}22` : '#fff') : 'transparent',
                        color: on ? (b?.accent ?? '#000') : 'rgba(255,255,255,.6)',
                      }}
                    >
                      {b ? b.name : t({ en: 'All', ko: '전체' })}
                    </button>
                  );
                })}
              </div>
            )}

            <Shelf key={`${year}-${brand}-${deal}`} shows={list} />
          </>
        )}
      </div>
    </section>
  );
}

/** A row of posters that fan out from a stack when it mounts. */
function Shelf({ shows }: { shows: Show[] }) {
  const { t, lang } = useLang();
  const row = useSnapIndex<HTMLDivElement>();
  const scrollBy = (dir: number) => row.ref.current?.scrollBy({ left: dir * row.ref.current.clientWidth * 0.7, behavior: 'smooth' });

  return (
    <div className="relative mt-10">
      {/* stage light under the shelf */}
      <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-[radial-gradient(60%_100%_at_50%_100%,rgba(255,255,255,.08),transparent)]" />

      <div
        ref={row.ref}
        className="relative -mx-5 flex snap-x snap-mandatory gap-5 overflow-x-auto px-5 pb-16 pt-4 [scrollbar-width:none] sm:-mx-8 sm:gap-7 sm:px-8"
      >
        {shows.map((s, i) => {
          const b = brandById(s.brand);
          return (
            <Link
              key={s.slug}
              href={`/shows/${s.slug}`}
              className="ska-deal group relative w-[62vw] max-w-[260px] shrink-0 snap-center sm:w-[240px] sm:snap-start"
              style={
                {
                  // every card starts on top of the first one, slightly askew, then slides to its slot
                  '--dx': `calc(${-i} * (100% + 1.75rem))`,
                  '--rot': `${(i % 2 ? 1 : -1) * (4 + (i % 3) * 3)}deg`,
                  animationDelay: `${i * 90}ms`,
                  zIndex: shows.length - i,
                } as CSSProperties
              }
            >
              <div className="relative transition duration-500 ease-out group-hover:-translate-y-3 group-hover:rotate-[-1deg] group-focus-visible:-translate-y-3">
                <div className="relative overflow-hidden rounded-xl shadow-[0_30px_60px_-20px_rgba(0,0,0,.9)] ring-1 ring-white/10 transition duration-500 group-hover:shadow-[0_40px_80px_-20px_rgba(0,0,0,1)]">
                  <Poster src={s.poster} brand={b} title={s.title} edition={s.edition} />
                  {s.gallery?.[0] && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={s.gallery[0].url}
                      alt=""
                      loading="lazy"
                      className="absolute inset-0 h-full w-full scale-105 object-cover opacity-0 transition duration-700 group-hover:scale-100 group-hover:opacity-100"
                    />
                  )}
                  <div className="absolute inset-x-0 bottom-0 translate-y-3 bg-gradient-to-t from-black via-black/80 to-transparent p-4 pt-14 opacity-0 transition duration-500 group-hover:translate-y-0 group-hover:opacity-100">
                    <p className="text-[10px] uppercase tracking-[0.25em]" style={{ color: b.accent }}>
                      {fmtDate(s.start, lang, s.end)}
                    </p>
                    <p className="mt-1 text-xs text-white/70">
                      {t(s.venue) || t(s.city)}
                    </p>
                    <span className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-white">
                      {t({ en: 'View show', ko: '공연 보기' })} <Arrow className="h-3 w-3" />
                    </span>
                  </div>
                  {!!s.gallery?.length && (
                    <span className="absolute left-3 top-3 rounded-full bg-black/70 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur">
                      📷 {s.gallery.length}
                    </span>
                  )}
                </div>
              </div>
              <div className="mt-4 px-1">
                <p className="text-[10px] uppercase tracking-[0.25em]" style={{ color: b.accent }}>
                  {b.name}
                </p>
                <h3 className="ska-display mt-1 text-xl leading-tight">
                  {s.title} <span className="text-white/40">{s.edition}</span>
                </h3>
                <p className="mt-1 text-xs text-white/45">
                  {t(s.city)}
                  {t(s.country) && `, ${t(s.country)}`}
                </p>
              </div>
            </Link>
          );
        })}
      </div>

      {shows.length > 3 && (
        <div className="absolute -top-14 right-0 hidden gap-2 sm:flex">
          {[-1, 1].map((d) => (
            <button
              key={d}
              onClick={() => scrollBy(d)}
              className="flex h-11 w-11 items-center justify-center rounded-full border border-white/15 transition hover:border-white hover:bg-white hover:text-black"
              aria-label={d < 0 ? 'Previous' : 'Next'}
            >
              <Arrow className={`h-4 w-4 ${d < 0 ? 'rotate-180' : ''}`} />
            </button>
          ))}
        </div>
      )}
      <SwipeDots count={shows.length} index={row.index} onPick={row.go} className="-mt-10 sm:hidden" />
    </div>
  );
}
