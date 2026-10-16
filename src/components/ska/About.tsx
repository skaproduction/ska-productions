'use client';

import { useEffect, useState } from 'react';
import { STATS, type L } from './data';
import { Reveal, useInView, useLang } from './ui';

const SERVICES: { n: string; title: L; body: L }[] = [
  {
    n: '01',
    title: { en: 'Show Production', ko: '공연 제작' },
    body: {
      en: 'From concept to curtain call — we plan, build and run concerts and festivals end to end.',
      ko: '기획부터 커튼콜까지. 콘서트와 페스티벌을 처음부터 끝까지 직접 만들고 운영합니다.',
    },
  },
  {
    n: '02',
    title: { en: 'Artist Casting & Booking', ko: '아티스트 캐스팅 · 부킹' },
    body: {
      en: 'We connect promoters and brands worldwide with Korean artists — idols, bands, hip-hop, actors.',
      ko: '전 세계 프로모터와 브랜드를 아이돌, 밴드, 힙합, 배우 등 한국 아티스트와 연결합니다.',
    },
  },
  {
    n: '03',
    title: { en: 'International Co-production', ko: '해외 공동 제작' },
    body: {
      en: 'Local partners, Korean content. KPOP PRIME is co-produced with KHAM Inc. in Taiwan.',
      ko: '현지 파트너와 한국 콘텐츠의 결합. KPOP PRIME은 대만 KHAM Inc.와 공동 제작합니다.',
    },
  },
  {
    n: '04',
    title: { en: 'IP Licensing & Touring', ko: 'IP 라이선싱 · 투어' },
    body: {
      en: 'Take one of our festival brands to your city — format, artists and production included.',
      ko: '우리의 페스티벌 브랜드를 당신의 도시로. 포맷, 아티스트, 프로덕션까지 함께합니다.',
    },
  },
];

export default function About() {
  const { t } = useLang();
  const [open, setOpen] = useState(0);
  return (
    <section id="about" className="scroll-mt-20 border-t border-white/[0.06] bg-[#0a0a0e] px-5 py-20 sm:px-8 sm:py-36">
      <div className="mx-auto grid max-w-7xl gap-16 lg:grid-cols-[1fr_1.2fr]">
        <Reveal>
          <p className="ska-eyebrow">05 — {t({ en: 'What we do', ko: '하는 일' })}</p>
          <h2 className="ska-serif mt-6 text-[clamp(30px,4vw,52px)] leading-[1.1] text-white/90">
            {t({
              en: 'We produce the shows — and bring the artists who make them.',
              ko: '우리는 공연을 만들고, 그 무대를 채울 아티스트를 데려옵니다.',
            })}
          </h2>
          <div className="mt-12 grid grid-cols-2 gap-x-6 gap-y-10">
            {STATS.map((s) => (
              <Stat key={s.label.en} {...s} label={t(s.label)} />
            ))}
          </div>
        </Reveal>

        <Reveal delay={120}>
          <ul className="border-t border-white/10">
            {SERVICES.map((s, i) => {
              const on = open === i;
              return (
                <li key={s.n} className="border-b border-white/10">
                  <button
                    onClick={() => setOpen(on ? -1 : i)}
                    onPointerEnter={(e) => e.pointerType === 'mouse' && setOpen(i)}
                    aria-expanded={on}
                    className="group flex w-full items-center gap-6 py-7 text-left"
                  >
                    <span className="font-mono text-xs text-white/35">{s.n}</span>
                    <span
                      className={`ska-display flex-1 text-[clamp(26px,3.6vw,46px)] leading-none transition-colors ${
                        on ? 'text-white' : 'text-white/45 group-hover:text-white/80'
                      }`}
                    >
                      {t(s.title)}
                    </span>
                    <span className={`text-2xl text-white/50 transition-transform duration-500 ${on ? 'rotate-45' : ''}`}>+</span>
                  </button>
                  <div className="grid transition-[grid-template-rows] duration-500" style={{ gridTemplateRows: on ? '1fr' : '0fr' }}>
                    <p className="overflow-hidden pl-12 text-white/60">
                      <span className="block pb-7">{t(s.body)}</span>
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>

          <div className="mt-12 flex items-center gap-5 rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5">
            <span className="text-xs uppercase tracking-[0.25em] text-white/40">{t({ en: 'Partner', ko: '파트너' })}</span>
            <span className="h-6 w-px bg-white/15" />
            <span className="ska-serif text-lg">KHAM Inc.</span>
            <span className="text-sm text-white/45">Taiwan · KPOP PRIME</span>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function Stat({ value, suffix, label }: { value: number; suffix: string; label: string }) {
  const [ref, inView] = useInView<HTMLDivElement>(0.5);
  const [v, setV] = useState(0);
  useEffect(() => {
    if (!inView) return;
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / 1400);
      setV(Math.round(value * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, value]);
  return (
    <div ref={ref}>
      <div className="ska-display ska-chrome-text text-6xl leading-none">
        {v}
        {suffix}
      </div>
      <div className="mt-2 text-sm text-white/50">{label}</div>
    </div>
  );
}
