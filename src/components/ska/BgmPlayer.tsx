'use client';

import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { SiteSettings } from './data';
import { Layer, useLang } from './ui';

const PREF = 'ska-bgm'; // 'on' | 'off' — remembered per browser

const readPref = () => {
  try {
    return localStorage.getItem(PREF);
  } catch {
    return null;
  }
};
const writePref = (v: 'on' | 'off') => {
  try {
    localStorage.setItem(PREF, v);
  } catch {}
};

/**
 * Background music. Browsers only allow sound after a user gesture, so it starts (fading in) when
 * the visitor clicks “enter” on the intro, or on their first click if they had it on last time.
 * A floating button toggles it; the choice is remembered. Renders nothing without a track.
 */
export default function BgmPlayer({ bgm }: { bgm?: SiteSettings['bgm'] }) {
  const { t } = useLang();
  const path = usePathname();
  const audio = useRef<HTMLAudioElement | null>(null);
  const raf = useRef(0);
  const [playing, setPlaying] = useState(false);
  const [hint, setHint] = useState(false);
  const active = !!bgm?.enabled && !!bgm.url && !path.startsWith('/admin');

  const fadeTo = useCallback((target: number, ms: number, done?: () => void) => {
    const a = audio.current;
    if (!a) return;
    cancelAnimationFrame(raf.current);
    const from = a.volume;
    const t0 = performance.now();
    const step = (now: number) => {
      const p = Math.min(1, (now - t0) / ms);
      a.volume = from + (target - from) * p;
      if (p < 1) raf.current = requestAnimationFrame(step);
      else done?.();
    };
    raf.current = requestAnimationFrame(step);
  }, []);

  const start = useCallback(() => {
    if (!bgm) return;
    if (!audio.current) {
      audio.current = new Audio(bgm.url);
      audio.current.loop = true;
    }
    const a = audio.current;
    a.volume = 0;
    a.play()
      .then(() => {
        setPlaying(true);
        setHint(false);
        fadeTo(bgm.volume, 2500);
      })
      .catch(() => setHint(true)); // blocked: no gesture yet — nudge the visitor to tap the button
  }, [bgm, fadeTo]);

  const stop = useCallback(() => {
    setPlaying(false);
    fadeTo(0, 600, () => audio.current?.pause());
  }, [fadeTo]);

  const toggle = () => {
    if (playing) {
      stop();
      writePref('off');
    } else {
      start();
      writePref('on');
    }
  };

  useEffect(() => {
    if (!active) return;
    const pref = readPref();
    // the intro's "enter" click is a gesture, so music may start right there
    const onEnter = () => pref !== 'off' && start();
    window.addEventListener('ska:enter', onEnter);
    // returning visitors who had music on: start on their first interaction with the page
    const seen = !!(window as { __skaIntroSeen?: number }).__skaIntroSeen;
    const onFirst = () => start();
    if (seen && pref === 'on') {
      window.addEventListener('pointerdown', onFirst, { once: true });
      window.addEventListener('keydown', onFirst, { once: true });
    }
    // brief nudge if nothing is playing after a while (and they haven't turned it off)
    const nudge = setTimeout(() => pref !== 'off' && !audio.current?.played.length && setHint(true), 6000);
    return () => {
      window.removeEventListener('ska:enter', onEnter);
      window.removeEventListener('pointerdown', onFirst);
      window.removeEventListener('keydown', onFirst);
      clearTimeout(nudge);
    };
  }, [active, start]);

  useEffect(() => {
    if (!hint) return;
    const id = setTimeout(() => setHint(false), 7000);
    return () => clearTimeout(id);
  }, [hint]);

  // pause in background tabs, resume on return
  useEffect(() => {
    const onVis = () => {
      const a = audio.current;
      if (!a || !playing) return;
      if (document.hidden) a.pause();
      else a.play().catch(() => {});
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [playing]);

  useEffect(() => () => audio.current?.pause(), []);
  useEffect(() => {
    if (!active && audio.current) {
      audio.current.pause();
      setPlaying(false);
    }
  }, [active]);

  if (!active) return null;

  return (
    <Layer>
      <div className="fixed bottom-20 right-4 z-[74] flex items-center gap-2 lg:bottom-6 lg:left-6 lg:right-auto lg:flex-row-reverse">
        <span
          className={`pointer-events-none rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-black shadow-lg transition-all duration-500 ${
            hint && !playing ? 'translate-x-0 opacity-100' : 'translate-x-2 opacity-0'
          }`}
        >
          ♪ {t({ en: 'Sound on?', ko: '음악 켜기' })}
        </span>
        <button
          onClick={toggle}
          aria-pressed={playing}
          aria-label={playing ? t({ en: 'Turn music off', ko: '음악 끄기' }) : t({ en: 'Turn music on', ko: '음악 켜기' })}
          title={bgm?.title}
          className={`flex h-11 w-11 items-center justify-center rounded-full border bg-[#111116]/85 backdrop-blur-md transition hover:border-white ${
            playing ? 'border-white/40 text-white' : 'border-white/15 text-white/60'
          } ${hint && !playing ? 'animate-pulse' : ''}`}
        >
          {playing ? (
            <span className="flex h-4 items-end gap-[3px]" aria-hidden>
              {[0, 1, 2, 3].map((i) => (
                <span
                  key={i}
                  className="w-[3px] rounded-full bg-current"
                  style={{ animation: `ska-eq ${600 + i * 130}ms ease-in-out ${i * 90}ms infinite alternate`, height: '100%' }}
                />
              ))}
            </span>
          ) : (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5" aria-hidden>
              <path d="M11 5 6 9H3v6h3l5 4V5Z" fill="currentColor" stroke="none" />
              <path d="m16 9 5 6M21 9l-5 6" />
            </svg>
          )}
        </button>
      </div>
    </Layer>
  );
}
