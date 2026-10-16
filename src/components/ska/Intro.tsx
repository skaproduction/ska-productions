'use client';

import Image from 'next/image';
import { useCallback, useEffect, useLayoutEffect, useState } from 'react';

const KEY = 'ska-intro-seen';

/**
 * Full-screen logo reveal shown on the first visit of a browser session.
 * The inline script in the home page sets window.__skaIntroSeen (and hides the
 * overlay with CSS) before hydration so returning visitors never see a flash of it.
 * Add ?intro to the URL to force it.
 */
export default function Intro() {
  const [phase, setPhase] = useState<'hidden' | 'play' | 'ready' | 'exit'>('play');

  const enter = useCallback(() => {
    setPhase((p) => (p === 'play' || p === 'ready' ? 'exit' : p));
  }, []);

  // Layout effect so a client-side navigation back to the home page never paints the overlay.
  useLayoutEffect(() => {
    const w = window as { __skaIntroSeen?: number };
    if (w.__skaIntroSeen) {
      setPhase('hidden');
      return;
    }
    try {
      sessionStorage.setItem(KEY, '1');
    } catch {}
    document.documentElement.style.overflow = 'hidden';
    const ready = setTimeout(() => setPhase((p) => (p === 'play' ? 'ready' : p)), 2300);
    const auto = setTimeout(enter, 5200);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'Escape') enter();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      clearTimeout(ready);
      clearTimeout(auto);
      window.removeEventListener('keydown', onKey);
    };
  }, [enter]);

  useEffect(() => {
    if (phase !== 'exit') return;
    (window as { __skaIntroSeen?: number }).__skaIntroSeen = 1;
    const id = setTimeout(() => {
      document.documentElement.style.overflow = '';
      setPhase('hidden');
    }, 1000);
    return () => clearTimeout(id);
  }, [phase]);

  if (phase === 'hidden') return null;

  return (
    <div
      className="ska-intro fixed inset-0 z-[100] flex cursor-pointer flex-col items-center justify-center bg-[#050507]"
      data-phase={phase}
      onClick={enter}
      role="button"
      tabIndex={0}
      aria-label="Enter SKA Productions"
    >
      <div className="ska-intro-glow pointer-events-none absolute inset-0" />

      <div className="ska-intro-logo relative flex flex-col items-center gap-8 px-6 sm:flex-row sm:gap-10">
        <div className="ska-intro-mark relative w-[120px] sm:w-[150px]">
          <Image src="/ska/logo-mark-chrome.png" alt="" width={285} height={380} priority className="h-auto w-full" />
          <span className="ska-intro-flare absolute left-[18%] top-[6%]" />
          <span className="ska-intro-flare absolute bottom-[30%] right-[22%] [animation-delay:1.25s]" />
        </div>
        <div className="ska-intro-word relative w-[min(78vw,560px)]">
          <Image src="/ska/wordmark.png" alt="SKA PRODUCTIONS INC. Entertainment" width={1220} height={160} priority className="h-auto w-full" />
          <span className="ska-intro-shine pointer-events-none absolute inset-0" />
        </div>
      </div>

      <button
        onClick={(e) => {
          e.stopPropagation();
          enter();
        }}
        className="ska-intro-cta absolute bottom-[12vh] flex flex-col items-center gap-3 text-[11px] uppercase tracking-[0.5em] text-white/60 transition hover:text-white"
      >
        <span className="h-10 w-px bg-gradient-to-b from-transparent to-white/60" />
        Click to enter
      </button>
    </div>
  );
}
