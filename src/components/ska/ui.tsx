'use client';

import Image from 'next/image';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import type { Brand, L } from './data';

/* ---------- language ---------- */

type Lang = 'en' | 'ko';
const LangCtx = createContext<{ lang: Lang; setLang: (l: Lang) => void }>({ lang: 'en', setLang: () => {} });

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>('en');
  useEffect(() => {
    try {
      const saved = localStorage.getItem('ska-lang');
      if (saved === 'en' || saved === 'ko') setLangState(saved);
    } catch {}
  }, []);
  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    try {
      localStorage.setItem('ska-lang', l);
    } catch {}
  }, []);
  return <LangCtx.Provider value={{ lang, setLang }}>{children}</LangCtx.Provider>;
}

export function useLang() {
  const { lang, setLang } = useContext(LangCtx);
  const t = useCallback((s: L) => s[lang], [lang]);
  return { lang, setLang, t };
}

/* ---------- overlays ---------- */

/**
 * Renders modals and toasts at the root of the SKA site. Page sections stack at z-index 2,
 * so an overlay rendered inside <main> would sit under the footer and lose its clicks.
 */
export function Layer({ children }: { children: ReactNode }) {
  const [host, setHost] = useState<Element | null>(null);
  useEffect(() => setHost(document.querySelector('.ska') ?? document.body), []);
  return host ? createPortal(children, host) : null;
}

/* ---------- motion helpers ---------- */

export function useInView<T extends Element>(threshold = 0.2, once = true) {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setInView(true);
          if (once) io.disconnect();
        } else if (!once) setInView(false);
      },
      { threshold },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [threshold, once]);
  return [ref, inView] as const;
}

export function Reveal({
  children,
  className = '',
  delay = 0,
  as: Tag = 'div',
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  as?: 'div' | 'section' | 'li';
}) {
  const [ref, inView] = useInView<HTMLDivElement>(0.12);
  return (
    <Tag
      ref={ref as never}
      data-in={inView}
      className={`ska-reveal ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </Tag>
  );
}

/** 3D tilt that follows the pointer and drives a specular highlight via CSS vars. */
export function Tilt({
  children,
  className = '',
  max = 12,
  style,
}: {
  children: ReactNode;
  className?: string;
  max?: number;
  style?: CSSProperties;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const onMove = (e: React.PointerEvent) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width;
    const y = (e.clientY - r.top) / r.height;
    el.style.setProperty('--rx', `${(0.5 - y) * max}deg`);
    el.style.setProperty('--ry', `${(x - 0.5) * max}deg`);
    el.style.setProperty('--mx', `${x * 100}%`);
    el.style.setProperty('--my', `${y * 100}%`);
  };
  const onLeave = () => {
    const el = ref.current;
    if (!el) return;
    el.style.setProperty('--rx', '0deg');
    el.style.setProperty('--ry', '0deg');
  };
  return (
    <div ref={ref} onPointerMove={onMove} onPointerLeave={onLeave} className={`ska-tilt ${className}`} style={style}>
      {children}
    </div>
  );
}

/** Button/link that leans toward the cursor. */
export function Magnetic({ children, className = '', strength = 0.3 }: { children: ReactNode; className?: string; strength?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  return (
    <span
      ref={ref}
      className={`inline-block transition-transform duration-300 ease-out ${className}`}
      onPointerMove={(e) => {
        const el = ref.current;
        if (!el) return;
        const r = el.getBoundingClientRect();
        el.style.transform = `translate(${(e.clientX - r.left - r.width / 2) * strength}px, ${(e.clientY - r.top - r.height / 2) * strength}px)`;
      }}
      onPointerLeave={() => {
        if (ref.current) ref.current.style.transform = '';
      }}
    >
      {children}
    </span>
  );
}

export function useNow(interval = 1000) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), interval);
    return () => clearInterval(id);
  }, [interval]);
  return now;
}

export function Countdown({ to, size = 'sm' }: { to: string; size?: 'sm' | 'lg' }) {
  const now = useNow();
  const { t } = useLang();
  const diff = now === null ? null : Math.max(0, new Date(to).getTime() - now);
  const parts = [
    { v: diff === null ? null : Math.floor(diff / 864e5), l: { en: 'Days', ko: '일' } },
    { v: diff === null ? null : Math.floor(diff / 36e5) % 24, l: { en: 'Hrs', ko: '시간' } },
    { v: diff === null ? null : Math.floor(diff / 6e4) % 60, l: { en: 'Min', ko: '분' } },
    { v: diff === null ? null : Math.floor(diff / 1e3) % 60, l: { en: 'Sec', ko: '초' } },
  ];
  const big = size === 'lg';
  return (
    <div className={`flex ${big ? 'gap-3 sm:gap-5' : 'gap-2'}`} aria-label="countdown">
      {parts.map((p, i) => (
        <div
          key={i}
          className={`flex flex-col items-center rounded-lg border border-white/10 bg-black/40 backdrop-blur ${
            big ? 'min-w-[68px] px-3 py-3 sm:min-w-[92px] sm:px-4' : 'min-w-[44px] px-2 py-1.5'
          }`}
        >
          <span className={`font-mono tabular-nums text-white ${big ? 'text-3xl sm:text-5xl' : 'text-base'}`}>
            {p.v === null ? '--' : String(p.v).padStart(2, '0')}
          </span>
          <span className={`uppercase tracking-[0.2em] text-white/45 ${big ? 'mt-1 text-[10px] sm:text-xs' : 'text-[9px]'}`}>
            {t(p.l)}
          </span>
        </div>
      ))}
    </div>
  );
}

export function dday(iso: string, now: number | null) {
  if (now === null) return 'D-··';
  const d = Math.ceil((new Date(iso).getTime() - now) / 864e5);
  return d > 0 ? `D-${d}` : d === 0 ? 'D-DAY' : 'ENDED';
}

/**
 * The calendar date as written in the show's own time zone ("2026-12-20T23:00:00+08:00" → Dec 20),
 * not converted to the viewer's zone, which could shift it by a day.
 */
export const localDay = (iso: string) => new Date(`${iso.slice(0, 10)}T00:00:00Z`);
export const showYear = (iso: string) => Number(iso.slice(0, 4));

export function fmtDate(iso: string, lang: 'en' | 'ko', end?: string) {
  const loc = lang === 'ko' ? 'ko-KR' : 'en-US';
  const a = localDay(iso).toLocaleDateString(loc, { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' });
  if (!end || end.slice(0, 10) === iso.slice(0, 10)) return a;
  const sameMonth = end.slice(0, 7) === iso.slice(0, 7);
  const b = localDay(end).toLocaleDateString(loc, sameMonth ? { day: 'numeric', timeZone: 'UTC' } : { month: 'short', day: 'numeric', timeZone: 'UTC' });
  return `${a} – ${b}`;
}

/** Poster with a styled placeholder until a real poster file is set in data.ts. */
export function Poster({ src, brand, title, edition, className = '' }: { src?: string; brand: Brand; title: string; edition: string; className?: string }) {
  return (
    <div
      className={`ska-poster relative aspect-[2/3] overflow-hidden rounded-xl ${className}`}
      style={{ '--a1': brand.accent, '--a2': brand.accent2 } as CSSProperties}
    >
      {src ? (
        <Image src={src} alt={`${title} ${edition} poster`} fill sizes="(max-width: 768px) 80vw, 400px" className="object-cover" unoptimized={src.startsWith('/api/')} />
      ) : (
        <div className="absolute inset-0 flex flex-col justify-between p-5">
          <div className="ska-poster-bg absolute inset-0" />
          <div className="relative flex items-center justify-between text-[10px] uppercase tracking-[0.3em] text-white/60">
            <span>SKA Productions</span>
            <span>{brand.short}</span>
          </div>
          <div className="relative">
            <div className="ska-display text-[clamp(28px,5vw,44px)] leading-[0.9] text-white">{title}</div>
            <div className="mt-2 text-sm tracking-[0.25em] text-white/80">{edition}</div>
          </div>
          <div className="relative rounded-md border border-dashed border-white/30 px-3 py-2 text-center text-[10px] uppercase tracking-[0.25em] text-white/55">
            Poster slot · 2:3
          </div>
        </div>
      )}
      <div className="ska-glare pointer-events-none absolute inset-0" />
    </div>
  );
}

export function ChromeMark({ className = '' }: { className?: string }) {
  return <Image src="/ska/logo-mark-chrome.png" alt="SKA Productions" width={285} height={380} className={className} priority />;
}

/* ---------- swipe carousels (phones) ---------- */

/** Index of the child closest to the centre of a horizontal scroll-snap row. */
export function useSnapIndex<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [index, setIndex] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let raf = 0;
    const on = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const mid = el.scrollLeft + el.clientWidth / 2;
        let best = 0;
        let dist = Infinity;
        [...el.children].forEach((c, i) => {
          const h = c as HTMLElement;
          const d = Math.abs(h.offsetLeft + h.offsetWidth / 2 - mid);
          if (d < dist) {
            dist = d;
            best = i;
          }
        });
        setIndex(best);
      });
    };
    el.addEventListener('scroll', on, { passive: true });
    return () => el.removeEventListener('scroll', on);
  }, []);
  const go = useCallback((i: number) => {
    const c = ref.current?.children[i] as HTMLElement | undefined;
    c?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  }, []);
  return { ref, index, go };
}

/** Dots + counter under a phone carousel; hidden on wide screens where the row isn't a carousel. */
export function SwipeDots({ count, index, onPick, colors, className = 'lg:hidden' }: { count: number; index: number; onPick: (i: number) => void; colors?: string[]; className?: string }) {
  if (count < 2) return null;
  return (
    <div className={`mt-5 flex items-center justify-center gap-2 ${className}`}>
      {Array.from({ length: count }, (_, i) => (
        <button
          key={i}
          onClick={() => onPick(i)}
          aria-label={`${i + 1} / ${count}`}
          className="h-1.5 rounded-full transition-all duration-300"
          style={{ width: i === index ? 28 : 8, background: i === index ? (colors?.[i] ?? '#fff') : 'rgba(255,255,255,.25)' }}
        />
      ))}
      <span className="ml-2 font-mono text-[11px] text-white/40">
        {String(index + 1).padStart(2, '0')}/{String(count).padStart(2, '0')}
      </span>
    </div>
  );
}

export function SocialIcon({ name, className = 'h-4 w-4' }: { name: 'Instagram' | 'YouTube'; className?: string }) {
  return name === 'Instagram' ? (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className} aria-hidden>
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M23 7.2a3 3 0 0 0-2.1-2.1C19 4.6 12 4.6 12 4.6s-7 0-8.9.5A3 3 0 0 0 1 7.2 31 31 0 0 0 .5 12a31 31 0 0 0 .5 4.8 3 3 0 0 0 2.1 2.1c1.9.5 8.9.5 8.9.5s7 0 8.9-.5a3 3 0 0 0 2.1-2.1 31 31 0 0 0 .5-4.8 31 31 0 0 0-.5-4.8ZM9.8 15.1V8.9l5.4 3.1-5.4 3.1Z" />
    </svg>
  );
}

export function Arrow({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className} aria-hidden>
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}
