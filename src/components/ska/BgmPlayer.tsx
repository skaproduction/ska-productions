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

const shuffled = (n: number, avoidFirst?: number) => {
  const a = Array.from({ length: n }, (_, i) => i);
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  if (n > 1 && a[0] === avoidFirst) [a[0], a[1]] = [a[1], a[0]]; // no back-to-back repeat between rounds
  return a;
};

/**
 * Background music playlist. Browsers only allow sound after a user gesture, so it starts (fading in) when
 * the visitor clicks “enter” on the intro, or on their first click if they had it on last time.
 * A floating button toggles it (the choice is remembered) and a small one skips to the next
 * track. Tracks play in order or shuffled; renders nothing without tracks.
 */
export default function BgmPlayer({ bgm }: { bgm?: SiteSettings['bgm'] }) {
  const { t } = useLang();
  const path = usePathname();
  const audio = useRef<HTMLAudioElement | null>(null);
  const raf = useRef(0);
  const [playing, setPlaying] = useState(false);
  const [hint, setHint] = useState(false);
  const tracks = bgm?.tracks ?? [];
  const many = tracks.length > 1;
  const active = !!bgm?.enabled && tracks.length > 0 && !path.startsWith('/admin');
  const order = useRef<number[]>([]);
  const pos = useRef(0);
  const skipping = useRef(false);

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

  // the track to play at position `pos` of this visitor's play order
  const current = useCallback(() => {
    const n = tracks.length;
    if (order.current.length !== n) order.current = bgm?.shuffle ? shuffled(n) : Array.from({ length: n }, (_, i) => i);
    return tracks[order.current[pos.current % n]];
  }, [tracks, bgm?.shuffle]);

  const advance = useCallback(() => {
    pos.current += 1;
    if (pos.current >= tracks.length) {
      pos.current = 0;
      if (bgm?.shuffle) order.current = shuffled(tracks.length, order.current[order.current.length - 1]);
    }
  }, [tracks.length, bgm?.shuffle]);

  const playFrom = useCallback(
    (fadeMs: number) => {
      const a = audio.current;
      if (!a || !bgm) return;
      a.volume = 0;
      return a.play().then(() => {
        setPlaying(true);
        setHint(false);
        fadeTo(bgm.volume, fadeMs);
      });
    },
    [bgm, fadeTo],
  );

  const start = useCallback(() => {
    if (!bgm || !tracks.length) return;
    if (!audio.current) {
      const a = new Audio(current().url);
      a.loop = !many;
      // when a track ends, move on to the next one
      a.addEventListener('ended', () => {
        if (skipping.current) return; // the skip already moves on
        advance();
        a.src = current().url;
        playFrom(1500)?.catch(() => {});
      });
      audio.current = a;
    }
    playFrom(2500)?.catch(() => setHint(true)); // blocked: no gesture yet — nudge the visitor to tap the button
  }, [bgm, tracks.length, many, current, advance, playFrom]);

  const skip = () => {
    const a = audio.current;
    if (!a || !many || skipping.current) return;
    skipping.current = true;
    fadeTo(0, 350, () => {
      advance();
      a.src = current().url;
      playFrom(1200)
        ?.catch(() => {})
        .finally(() => (skipping.current = false));
    });
  };

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
        {many && (
          <button
            onClick={skip}
            tabIndex={playing ? 0 : -1}
            aria-hidden={!playing}
            aria-label={t({ en: 'Next track', ko: '다음 곡' })}
            title={t({ en: 'Next track', ko: '다음 곡' })}
            className={`flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-[#111116]/85 text-white/70 backdrop-blur-md transition-all duration-300 hover:border-white hover:text-white ${
              playing ? 'scale-100 opacity-100' : 'pointer-events-none scale-75 opacity-0'
            }`}
          >
            <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4" aria-hidden>
              <path d="M5 5.5v13l9-6.5-9-6.5Z" />
              <rect x="16" y="5.5" width="2.5" height="13" rx="1" />
            </svg>
          </button>
        )}
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
