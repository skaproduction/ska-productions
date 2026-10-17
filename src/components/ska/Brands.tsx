'use client';

import { useEffect, useState, type CSSProperties } from 'react';
import { SERIES as BRANDS, type Brand, type Show } from './data';
import { Arrow, Reveal, SwipeDots, useLang, useSnapIndex } from './ui';

export function focusShows(id: Brand['id'] | 'all') {
  window.dispatchEvent(new CustomEvent('ska:filter', { detail: id }));
  document.getElementById('upcoming')?.scrollIntoView({ behavior: 'smooth' });
}

export default function Brands({ shows }: { shows: Show[] }) {
  const { t } = useLang();
  const [active, setActive] = useState(0);
  // on phones the panels are a swipe row; the card in the middle is the "active" one
  const row = useSnapIndex<HTMLDivElement>();
  useEffect(() => {
    if (window.matchMedia('(max-width: 1023px)').matches) setActive(row.index);
  }, [row.index]);

  return (
    <section id="stages" className="scroll-mt-20 px-5 py-20 sm:px-8 sm:py-36">
      <div className="mx-auto max-w-7xl">
        <Reveal className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div>
            <p className="ska-eyebrow">01 — {t({ en: 'Original IPs', ko: '오리지널 IP' })}</p>
            <h2 className="ska-display mt-4 text-[clamp(40px,7vw,96px)] leading-[0.9]">
              {t({ en: 'Three stages.', ko: '세 개의 무대.' })}
              <br />
              <span className="text-white/35">{t({ en: 'Three sounds.', ko: '세 개의 사운드.' })}</span>
            </h2>
          </div>
          <p className="max-w-sm text-sm leading-relaxed text-white/55">
            {t({
              en: 'Hover, tap or swipe through the stages. Each festival is produced in-house by SKA Productions.',
              ko: '무대에 마우스를 올리거나, 탭하거나, 옆으로 넘겨보세요. 모든 페스티벌은 SKA 프로덕션이 직접 제작합니다.',
            })}
          </p>
        </Reveal>

        <Reveal delay={120} className="mt-10 sm:mt-14">
          <div
            ref={row.ref}
            className="flex gap-3 max-lg:-mx-5 max-lg:snap-x max-lg:snap-mandatory max-lg:overflow-x-auto max-lg:px-[8vw] max-lg:pb-1 max-lg:[scrollbar-width:none] sm:max-lg:-mx-8 lg:h-[600px]"
          >
          {BRANDS.map((b, i) => {
            const on = i === active;
            const count = shows.filter((s) => s.brand === b.id).length;
            return (
              <div
                key={b.id}
                role="button"
                tabIndex={0}
                aria-expanded={on}
                onPointerEnter={(e) => e.pointerType === 'mouse' && setActive(i)}
                onClick={() => (window.matchMedia('(max-width: 1023px)').matches ? row.go(i) : setActive(i))}
                onFocus={() => setActive(i)}
                className={`group relative cursor-pointer overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0d0d12] transition-[flex,height,border-color] duration-700 ease-[cubic-bezier(.2,.8,.2,1)] ${
                  on ? 'lg:flex-[3.2]' : 'lg:flex-1'
                } max-lg:h-[460px] max-lg:w-[84vw] max-lg:max-w-[440px] max-lg:shrink-0 max-lg:snap-center ${
                  on ? '' : 'max-lg:scale-[0.96] max-lg:opacity-70'
                }`}
                style={{ '--a1': b.accent, '--a2': b.accent2, borderColor: on ? `${b.accent}55` : undefined } as CSSProperties}
              >
                <div
                  className="absolute inset-0 transition-opacity duration-700"
                  style={{
                    opacity: on ? 1 : 0.35,
                    background: `radial-gradient(90% 70% at 85% 15%, ${b.accent}40, transparent 60%), radial-gradient(70% 60% at 10% 100%, ${b.accent2}30, transparent 60%)`,
                  }}
                />

                {/* collapsed label */}
                <div
                  className={`absolute inset-0 flex items-center justify-between px-6 transition-opacity duration-300 max-lg:hidden lg:flex-col-reverse lg:justify-between lg:px-0 lg:py-8 ${
                    on ? 'pointer-events-none opacity-0' : 'opacity-100'
                  }`}
                >
                  <span className="ska-display text-2xl text-white/80 lg:rotate-180 lg:whitespace-nowrap lg:text-4xl lg:[writing-mode:vertical-rl]">
                    {b.name}
                  </span>
                  <span className="text-xs text-white/40 lg:[writing-mode:vertical-rl]">{t(b.genre)}</span>
                </div>

                {/* expanded */}
                <div
                  className={`relative flex h-full flex-col justify-between p-6 transition-all duration-700 sm:p-10 ${
                    on ? 'translate-y-0 opacity-100 delay-200' : 'pointer-events-none translate-y-6 opacity-0'
                  } max-lg:pointer-events-auto max-lg:translate-y-0 max-lg:opacity-100`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <span
                      className="rounded-full border px-3 py-1 text-[11px] uppercase tracking-[0.2em]"
                      style={{ borderColor: `${b.accent}80`, color: b.accent }}
                    >
                      {t(b.genre)}
                    </span>
                    {b.partner && (
                      <span className="text-right text-[11px] uppercase tracking-[0.2em] text-white/50">
                        {t({ en: 'Co-produced with', ko: '공동 제작' })}
                        <br />
                        <span className="text-white/85">{b.partner}</span>
                      </span>
                    )}
                  </div>

                  <BrandVisual brand={b} active={on} />

                  <div className="grid gap-6 md:grid-cols-[1.4fr_1fr] md:items-end">
                    <div>
                      <h3 className="ska-display text-[clamp(40px,6vw,84px)] leading-[0.88]" style={{ textShadow: `0 0 50px ${b.accent}55` }}>
                        {b.name}
                      </h3>
                      <p className="ska-serif mt-3 text-lg italic text-white/85">{t(b.tagline)}</p>
                    </div>
                    <div>
                      <p className="text-sm leading-relaxed text-white/60">{t(b.blurb)}</p>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (count) focusShows(b.id);
                          else document.getElementById('history')?.scrollIntoView({ behavior: 'smooth' });
                        }}
                        className="mt-5 inline-flex items-center gap-2 text-sm font-semibold transition hover:gap-3"
                        style={{ color: b.accent }}
                      >
                        {count
                          ? t({ en: `See ${count} upcoming show${count === 1 ? '' : 's'}`, ko: `예정 공연 ${count}개 보기` })
                          : t({ en: 'See past shows', ko: '지난 공연 보기' })}{' '}
                        <Arrow />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
          </div>
          <SwipeDots count={BRANDS.length} index={row.index} onPick={row.go} colors={BRANDS.map((b) => b.accent)} />
        </Reveal>
      </div>
    </section>
  );
}

function BrandVisual({ brand, active }: { brand: Brand; active: boolean }) {
  const play = active ? 'running' : 'paused';
  if (brand.id === 'kpop') {
    return (
      <div className="ska-eq flex h-28 items-end justify-center gap-1.5 sm:h-40" style={{ color: brand.accent }} aria-hidden>
        {Array.from({ length: 28 }).map((_, i) => (
          <span
            key={i}
            style={{
              animationDelay: `${(i * 97) % 900}ms`,
              animationDuration: `${600 + ((i * 131) % 700)}ms`,
              animationPlayState: play,
              background: `linear-gradient(to top, ${brand.accent2}, ${brand.accent})`,
            }}
          />
        ))}
      </div>
    );
  }
  if (brand.id === 'rock') {
    return (
      <div className="relative flex h-28 items-center justify-center sm:h-40" aria-hidden>
        <span className="ska-display absolute text-[160px] leading-none text-white/[0.06] sm:text-[220px]">7</span>
        <svg viewBox="0 0 600 100" className="h-full w-full max-w-xl" preserveAspectRatio="none">
          <defs>
            <linearGradient id="rockg" x1="0" x2="1">
              <stop offset="0" stopColor={brand.accent2} />
              <stop offset="1" stopColor={brand.accent} />
            </linearGradient>
          </defs>
          <path
            d="M0 50 L40 50 L55 20 L70 80 L85 10 L100 90 L115 30 L130 70 L150 50 L190 50 L200 35 L210 65 L225 5 L245 95 L260 25 L275 75 L290 50 L340 50 L355 15 L372 85 L390 20 L405 80 L420 40 L440 60 L460 50 L500 50 L515 25 L530 75 L545 45 L560 55 L600 50"
            fill="none"
            stroke="url(#rockg)"
            strokeWidth="3"
            strokeLinejoin="round"
            strokeDasharray="1600"
            style={{
              strokeDashoffset: active ? 0 : 1600,
              transition: 'stroke-dashoffset 1.8s cubic-bezier(.2,.8,.2,1) .2s',
              filter: `drop-shadow(0 0 8px ${brand.accent})`,
            }}
          />
        </svg>
      </div>
    );
  }
  return (
    <div className="flex h-28 items-center justify-center sm:h-40" aria-hidden>
      <div className="ska-spin relative aspect-square h-full rounded-full" style={{ animationPlayState: play }}>
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background: `repeating-radial-gradient(circle, #111 0 2px, #1b1b1b 2px 4px)`,
            boxShadow: `0 0 60px ${brand.accent}44`,
          }}
        />
        <div
          className="absolute inset-[34%] flex items-center justify-center rounded-full text-[9px] font-black tracking-widest text-black"
          style={{ background: `linear-gradient(135deg, ${brand.accent}, ${brand.accent2})` }}
        >
          SSS
        </div>
        <div className="absolute inset-0 rounded-full bg-[conic-gradient(from_0deg,transparent_0_40%,rgba(255,255,255,.12)_45%,transparent_50%)]" />
      </div>
    </div>
  );
}
