'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { BRANDS, brandById, type BrandId, type Show } from './data';
import { Arrow, Countdown, Poster, Reveal, SwipeDots, Tilt, dday, fmtDate, useLang, useNow, useSnapIndex } from './ui';

type Filter = BrandId | 'all';

export default function Upcoming({ shows: all }: { shows: Show[] }) {
  const { t, lang } = useLang();
  const [filter, setFilter] = useState<Filter>('all');
  const [view, setView] = useState<'cards' | 'timeline'>('cards');
  const now = useNow(60_000);
  const row = useSnapIndex<HTMLDivElement>();

  useEffect(() => {
    const on = (e: Event) => setFilter((e as CustomEvent<Filter>).detail);
    window.addEventListener('ska:filter', on);
    return () => window.removeEventListener('ska:filter', on);
  }, []);

  const shows = useMemo(
    () => all.filter((s) => filter === 'all' || s.brand === filter),
    [all, filter],
  );

  return (
    <section id="upcoming" className="scroll-mt-20 border-t border-white/[0.06] bg-[#0a0a0e] px-5 py-20 sm:px-8 sm:py-36">
      <div className="mx-auto max-w-7xl">
        <Reveal className="flex flex-col justify-between gap-8 lg:flex-row lg:items-end">
          <div>
            <p className="ska-eyebrow">02 — {t({ en: 'Upcoming', ko: '예정 공연' })}</p>
            <h2 className="ska-display mt-4 text-[clamp(40px,7vw,96px)] leading-[0.9]">
              {t({ en: 'Next on stage', ko: '다음 무대' })}
            </h2>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="flex flex-wrap gap-2">
              {(['all', ...BRANDS.map((b) => b.id)] as Filter[]).map((f) => {
                const b = f === 'all' ? null : brandById(f);
                const on = filter === f;
                return (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    aria-pressed={on}
                    className="rounded-full border px-4 py-2 text-xs font-semibold tracking-wide transition"
                    style={{
                      borderColor: on ? (b?.accent ?? '#fff') : 'rgba(255,255,255,.15)',
                      background: on ? (b ? `${b.accent}22` : '#fff') : 'transparent',
                      color: on ? (b?.accent ?? '#000') : 'rgba(255,255,255,.7)',
                    }}
                  >
                    {b ? b.name : t({ en: 'All', ko: '전체' })}
                  </button>
                );
              })}
            </div>
            <div className="flex rounded-full border border-white/15 p-1 text-xs">
              {(['cards', 'timeline'] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  className={`rounded-full px-3 py-1.5 transition ${view === v ? 'bg-white text-black' : 'text-white/60'}`}
                >
                  {v === 'cards' ? t({ en: 'Cards', ko: '카드' }) : t({ en: 'Timeline', ko: '타임라인' })}
                </button>
              ))}
            </div>
          </div>
        </Reveal>

        {shows.length === 0 ? (
          <p className="mt-14 rounded-2xl border border-dashed border-white/15 px-6 py-16 text-center text-white/50">
            {t({ en: 'New shows are on the way. Stay tuned.', ko: '새로운 공연을 준비하고 있습니다. 조금만 기다려주세요.' })}
          </p>
        ) : view === 'cards' ? (
          <>
          {/* phones: swipe row; larger screens: grid */}
          <div
            ref={row.ref}
            className="mt-10 flex gap-5 max-sm:-mx-5 max-sm:snap-x max-sm:snap-mandatory max-sm:overflow-x-auto max-sm:px-[11vw] max-sm:pb-2 max-sm:[scrollbar-width:none] sm:mt-14 sm:grid sm:grid-cols-2 sm:gap-8 lg:grid-cols-3"
          >
            {shows.map((s, i) => {
              const b = brandById(s.brand);
              return (
                <Reveal key={s.slug} delay={i * 90} className="max-sm:w-[78vw] max-sm:shrink-0 max-sm:snap-center">
                  <Link href={`/shows/${s.slug}`} className="group block">
                    <Tilt max={10}>
                      <div className="relative">
                        <Poster src={s.poster} brand={b} title={s.title} edition={s.edition} />
                        <span
                          className="absolute left-4 top-12 rounded-full px-3 py-1 font-mono text-xs font-bold text-black"
                          style={{ background: b.accent, transform: 'translateZ(40px)' }}
                        >
                          {dday(s.start, now, s.dateTBA)}
                        </span>
                      </div>
                    </Tilt>
                    <div className="mt-5 flex items-start justify-between gap-4">
                      <div>
                        <p className="text-xs uppercase tracking-[0.2em]" style={{ color: b.accent }}>
                          {fmtDate(s.start, lang, s.end, s.dateTBA)}
                        </p>
                        <h3 className="ska-display mt-2 text-3xl leading-none">
                          {s.title} <span className="text-white/40">{s.edition}</span>
                        </h3>
                        <p className="mt-2 text-sm text-white/55">
                          {t(s.city)}, {t(s.country)} · {t(s.venue)}
                        </p>
                      </div>
                      <span className="mt-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/15 transition group-hover:rotate-[-45deg] group-hover:border-white group-hover:bg-white group-hover:text-black">
                        <Arrow />
                      </span>
                    </div>
                    <div className="mt-4 opacity-80 transition group-hover:opacity-100">
                      <Countdown to={s.start} tba={s.dateTBA} />
                    </div>
                  </Link>
                </Reveal>
              );
            })}
          </div>
          <SwipeDots count={shows.length} index={row.index} onPick={row.go} colors={shows.map((s) => brandById(s.brand).accent)} className="sm:hidden" />
          </>
        ) : (
          <Timeline shows={shows} />
        )}
      </div>
    </section>
  );
}

function Timeline({ shows }: { shows: Show[] }) {
  const { t, lang } = useLang();
  const [hover, setHover] = useState<string | null>(shows[0]?.slug ?? null);

  // from this month to the month of the last show (at least 8 months wide)
  const first = new Date();
  const last = shows.length ? new Date(shows[shows.length - 1].start) : first;
  const span0 = (last.getFullYear() - first.getFullYear()) * 12 + last.getMonth() - first.getMonth() + 2;
  const months = Array.from({ length: Math.max(8, span0) }, (_, i) => new Date(first.getFullYear(), first.getMonth() + i, 1));
  const span = months[months.length - 1].getTime() + 31 * 864e5 - months[0].getTime();
  const pos = (iso: string) => ((new Date(iso).getTime() - months[0].getTime()) / span) * 100;
  const active = shows.find((s) => s.slug === hover) ?? shows[0];

  return (
    <div className="mt-14">
      <div className="overflow-x-auto pb-4">
        <div className="relative min-w-[760px] pt-28">
          <div className="absolute inset-x-0 top-[132px] h-px bg-white/15" />
          <div className="relative grid" style={{ gridTemplateColumns: `repeat(${months.length}, 1fr)` }}>
            {months.map((m) => (
              <div key={m.toISOString()} className="border-l border-white/10 pl-2 pt-10 text-[11px] uppercase tracking-widest text-white/40">
                {m.toLocaleDateString(lang === 'ko' ? 'ko-KR' : 'en-US', { month: 'short' })}
                {m.getMonth() === 0 && <span className="ml-1 text-white/70">{m.getFullYear()}</span>}
              </div>
            ))}
          </div>
          {shows.map((s) => {
            const b = brandById(s.brand);
            const on = s.slug === active?.slug;
            return (
              <Link
                key={s.slug}
                href={`/shows/${s.slug}`}
                onPointerEnter={() => setHover(s.slug)}
                onFocus={() => setHover(s.slug)}
                className="absolute top-0 flex -translate-x-1/2 flex-col items-center"
                style={{ left: `${pos(s.start)}%` }}
              >
                <span
                  className="ska-display whitespace-nowrap text-lg transition"
                  style={{ color: on ? b.accent : 'rgba(255,255,255,.5)' }}
                >
                  {s.title}
                </span>
                <span className="h-[96px] w-px" style={{ background: `linear-gradient(${b.accent}, transparent)` }} />
                <span
                  className="absolute top-[124px] h-4 w-4 rounded-full border-2 border-[#0a0a0e] transition-transform"
                  style={{ background: b.accent, transform: on ? 'scale(1.6)' : 'scale(1)', boxShadow: on ? `0 0 20px ${b.accent}` : 'none' }}
                />
              </Link>
            );
          })}
        </div>
      </div>

      {active && (
        <div
          key={active.slug}
          className="mt-10 grid items-center gap-8 rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6 sm:grid-cols-[180px_1fr_auto] sm:p-8"
        >
          <Poster src={active.poster} brand={brandById(active.brand)} title={active.title} edition={active.edition} className="w-40" />
          <div>
            <p className="text-xs uppercase tracking-[0.2em]" style={{ color: brandById(active.brand).accent }}>
              {fmtDate(active.start, lang, active.end, active.dateTBA)} · {t(active.city)}
            </p>
            <h3 className="ska-display mt-2 text-4xl">
              {active.title} <span className="text-white/40">{active.edition}</span>
            </h3>
            <p className="mt-3 max-w-lg text-white/60">{t(active.summary)}</p>
            <div className="mt-5">
              <Countdown to={active.start} tba={active.dateTBA} />
            </div>
          </div>
          <Link href={`/shows/${active.slug}`} className="ska-btn ska-btn-chrome self-end">
            {t({ en: 'Enter show', ko: '공연 보기' })} <Arrow />
          </Link>
        </div>
      )}
    </div>
  );
}
