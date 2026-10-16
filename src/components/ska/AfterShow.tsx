'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { Brand, Photo } from './data';
import { Layer, useLang } from './ui';

/** After-show photo wall: masonry grid that opens into a swipeable lightbox. */
export default function AfterShow({ photos, brand }: { photos: Photo[]; brand: Brand }) {
  const { t } = useLang();
  const [open, setOpen] = useState<number | null>(null);

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex items-baseline gap-4">
          <h3 className="ska-display text-4xl">After Show</h3>
          <span className="text-sm" style={{ color: brand.accent }}>
            {photos.length} {t({ en: 'photos', ko: '장' })}
          </span>
        </div>
        <button onClick={() => setOpen(0)} className="ska-btn ska-btn-ghost !py-2 !text-xs">
          ▶ {t({ en: 'Slideshow', ko: '슬라이드쇼' })}
        </button>
      </div>

      <div className="mt-6 columns-2 gap-3 sm:columns-3 lg:columns-4">
        {photos.map((p, i) => (
          <button
            key={p.id}
            onClick={() => setOpen(i)}
            className="group relative mb-3 block w-full break-inside-avoid overflow-hidden rounded-xl"
            style={{ animation: `ska-in .6s ease ${Math.min(i, 12) * 50}ms both` }}
            aria-label={p.caption || `Photo ${i + 1}`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={p.url} alt={p.caption ?? ''} loading="lazy" className="w-full transition duration-700 group-hover:scale-105" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 transition group-hover:opacity-100" />
            {p.caption && (
              <span className="absolute inset-x-3 bottom-3 translate-y-2 text-left text-xs text-white opacity-0 transition group-hover:translate-y-0 group-hover:opacity-100">
                {p.caption}
              </span>
            )}
            <span
              className="absolute right-3 top-3 flex h-8 w-8 scale-75 items-center justify-center rounded-full text-sm text-black opacity-0 transition group-hover:scale-100 group-hover:opacity-100"
              style={{ background: brand.accent }}
            >
              ⤢
            </span>
          </button>
        ))}
      </div>

      {open !== null && (
        <Layer>
          <Lightbox photos={photos} index={open} onIndex={setOpen} onClose={() => setOpen(null)} accent={brand.accent} />
        </Layer>
      )}
    </div>
  );
}

function Lightbox({
  photos,
  index,
  onIndex,
  onClose,
  accent,
}: {
  photos: Photo[];
  index: number;
  onIndex: (i: number) => void;
  onClose: () => void;
  accent: string;
}) {
  const n = photos.length;
  const go = useCallback((d: number) => onIndex((index + d + n) % n), [index, n, onIndex]);
  const drag = useRef<{ x: number; dx: number } | null>(null);
  const [dx, setDx] = useState(0);
  const strip = useRef<HTMLDivElement>(null);
  const photo = photos[index];

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') go(1);
      else if (e.key === 'ArrowLeft') go(-1);
      else if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    document.documentElement.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.documentElement.style.overflow = '';
    };
  }, [go, onClose]);

  useEffect(() => {
    strip.current?.children[index]?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  }, [index]);

  return (
    <div className="fixed inset-0 z-[95] flex flex-col bg-black/95" role="dialog" aria-modal="true" aria-label="Photo viewer">
      <div className="flex items-center justify-between px-5 py-4 text-sm text-white/70">
        <span className="font-mono tabular-nums">
          <span className="text-white">{String(index + 1).padStart(2, '0')}</span> / {String(n).padStart(2, '0')}
        </span>
        <button onClick={onClose} className="flex h-10 w-10 items-center justify-center rounded-full border border-white/20 text-lg hover:bg-white/10" aria-label="Close">
          ✕
        </button>
      </div>

      <div
        className="relative flex flex-1 touch-pan-y items-center justify-center overflow-hidden px-4 select-none"
        onPointerDown={(e) => {
          drag.current = { x: e.clientX, dx: 0 };
        }}
        onPointerMove={(e) => {
          if (!drag.current) return;
          drag.current.dx = e.clientX - drag.current.x;
          setDx(drag.current.dx);
        }}
        onPointerUp={() => {
          const d = drag.current?.dx ?? 0;
          drag.current = null;
          setDx(0);
          if (Math.abs(d) > 60) go(d < 0 ? 1 : -1);
        }}
        onPointerCancel={() => {
          drag.current = null;
          setDx(0);
        }}
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          key={photo.id}
          src={photo.url}
          alt={photo.caption ?? ''}
          draggable={false}
          className="max-h-full max-w-full animate-[ska-in_.35s_ease] rounded-lg object-contain shadow-2xl"
          style={{ transform: `translateX(${dx}px)`, transition: dx ? 'none' : 'transform .3s' }}
        />
        {n > 1 && (
          <>
            <button
              onClick={() => go(-1)}
              className="absolute left-3 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-xl backdrop-blur transition hover:bg-white/25 sm:left-6"
              aria-label="Previous photo"
            >
              ‹
            </button>
            <button
              onClick={() => go(1)}
              className="absolute right-3 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-xl backdrop-blur transition hover:bg-white/25 sm:right-6"
              aria-label="Next photo"
            >
              ›
            </button>
          </>
        )}
      </div>

      <p className="min-h-6 px-5 pt-3 text-center text-sm text-white/70">{photo.caption}</p>

      <div ref={strip} className="flex gap-2 overflow-x-auto px-5 pb-5 pt-3">
        {photos.map((p, i) => (
          <button
            key={p.id}
            onClick={() => onIndex(i)}
            className="h-14 w-20 shrink-0 overflow-hidden rounded-md border-2 transition"
            style={{ borderColor: i === index ? accent : 'transparent', opacity: i === index ? 1 : 0.45 }}
            aria-label={`Photo ${i + 1}`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={p.url} alt="" className="h-full w-full object-cover" />
          </button>
        ))}
      </div>
    </div>
  );
}
