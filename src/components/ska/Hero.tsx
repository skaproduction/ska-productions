'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { SERIES as BRANDS } from './data';
import { Arrow, ChromeMark, Magnetic, Tilt, useLang } from './ui';

const WORDS = [
  { word: 'K-POP', color: '#ff3ea5' },
  { word: 'ROCK', color: '#ff4b2b' },
  { word: 'HIP-HOP', color: '#c6ff00' },
];

export default function Hero() {
  const { t } = useLang();
  const [i, setI] = useState(0);
  const next = () => setI((n) => (n + 1) % WORDS.length);
  // restarts after every change, so tapping the word doesn't make the next swap come early
  useEffect(() => {
    const id = setTimeout(next, 2200);
    return () => clearTimeout(id);
  }, [i]);

  // phones: the chrome mark turns and drifts as you scroll (there's no cursor to tilt it with)
  const mark = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let raf = 0;
    const on = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const y = Math.min(window.scrollY, 900);
        mark.current?.style.setProperty('transform', `perspective(700px) translateY(${y * 0.35}px) rotateY(${-18 + y * 0.12}deg) rotateZ(${y * 0.02}deg)`);
      });
    };
    on();
    window.addEventListener('scroll', on, { passive: true });
    return () => window.removeEventListener('scroll', on);
  }, []);

  return (
    <section className="relative flex min-h-[100svh] flex-col justify-center overflow-hidden pt-24">
      {/* stage lights */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div
          className="absolute -top-40 left-1/2 h-[900px] w-[900px] -translate-x-1/2 rounded-full opacity-25 blur-3xl transition-colors duration-1000"
          style={{ background: `radial-gradient(circle, ${WORDS[i].color}, transparent 60%)` }}
        />
        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-[#07070a] to-transparent" />
      </div>

      <div ref={mark} aria-hidden className="pointer-events-none absolute -right-10 top-20 w-44 opacity-60 sm:w-56 lg:hidden">
        <div className="ska-float">
          <ChromeMark className="h-auto w-full drop-shadow-[0_20px_40px_rgba(0,0,0,.9)]" />
        </div>
      </div>

      <div className="relative mx-auto grid w-full max-w-7xl items-center gap-10 px-5 sm:px-8 lg:grid-cols-[1.3fr_1fr]">
        <div>
          <p className="ska-eyebrow">SKA PRODUCTIONS INC. · Seoul</p>
          <h1 className="ska-display mt-6 text-[clamp(52px,10vw,148px)] leading-[0.86]">
            {t({ en: 'We put', ko: '한국의' })}
            <br />
            <span className="inline-grid cursor-pointer select-none" aria-live="polite" onClick={next} title="Tap">
              {WORDS.map((w, n) => (
                <span
                  key={w.word}
                  aria-hidden={n !== i}
                  className="transition-all duration-700 ease-[cubic-bezier(.2,.8,.2,1)]"
                  style={{
                    gridArea: '1 / 1',
                    color: w.color,
                    transform: `translateY(${n === i ? 0 : n === (i + WORDS.length - 1) % WORDS.length ? -45 : 45}%)`,
                    filter: n === i ? 'none' : 'blur(8px)',
                    opacity: n === i ? 1 : 0,
                    textShadow: `0 0 40px ${w.color}66`,
                  }}
                >
                  {w.word}
                </span>
              ))}
            </span>
            <br />
            <span className="ska-chrome-text">{t({ en: 'on world stages.', ko: '무대를 세계로.' })}</span>
          </h1>
          <p className="mt-8 max-w-xl text-base leading-relaxed text-white/65 sm:text-lg">
            {t({
              en: 'Concert producer and home of three original festival IPs. Looking to book Korean artists for your stage? Talk to us.',
              ko: '세 개의 오리지널 페스티벌 IP를 가진 공연 기획사. 한국 아티스트 섭외가 필요하다면, 저희에게 연락하세요.',
            })}
          </p>
          <div className="mt-10 flex flex-wrap gap-3">
            <Magnetic>
              <Link href="#casting" className="ska-btn ska-btn-chrome">
                {t({ en: 'Cast Korean Artists', ko: '한국 아티스트 캐스팅' })} <Arrow />
              </Link>
            </Magnetic>
            <Magnetic>
              <Link href="#upcoming" className="ska-btn ska-btn-ghost">
                {t({ en: 'Upcoming Shows', ko: '공연 일정 보기' })}
              </Link>
            </Magnetic>
          </div>
        </div>

        <Tilt max={22} className="mx-auto hidden w-[300px] lg:block xl:w-[360px]">
          <div className="ska-float relative">
            <div className="absolute inset-[15%] rounded-full bg-white/10 blur-3xl" />
            <ChromeMark className="relative h-auto w-full drop-shadow-[0_30px_50px_rgba(0,0,0,.8)]" />
            <div
              className="pointer-events-none absolute inset-0 mix-blend-overlay"
              style={{ background: 'radial-gradient(circle at var(--mx) var(--my), rgba(255,255,255,.65), transparent 35%)' }}
            />
          </div>
        </Tilt>
      </div>

      {/* IP marquee */}
      <div className="ska-marquee-wrap relative mt-20 border-y border-white/[0.07] bg-white/[0.015] py-5">
        <div className="ska-marquee">
          {[0, 1].map((k) => (
            <div key={k} className="flex shrink-0 items-center" aria-hidden={k === 1}>
              {[...BRANDS, ...BRANDS].map((b, n) => (
                <a key={`${b.id}-${n}`} href="#stages" className="group flex items-center">
                  <span
                    className="ska-display px-8 text-3xl text-white/25 transition-colors duration-300 sm:text-5xl"                    onPointerEnter={(e) => (e.currentTarget.style.color = b.accent)}
                    onPointerLeave={(e) => (e.currentTarget.style.color = '')}
                  >
                    {b.name}
                  </span>
                  <span className="text-xl text-white/20">✦</span>
                </a>
              ))}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
