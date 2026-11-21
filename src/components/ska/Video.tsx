'use client';

import { useEffect } from 'react';
import { Layer, useLang } from './ui';

/** Background music steps aside while a video plays (see BgmPlayer). */
export const duckMusic = (on: boolean) => {
  window.dispatchEvent(new Event(on ? 'ska:bgm-duck' : 'ska:bgm-unduck'));
};

export const youtubeThumb = (id: string) => `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;

/** A YouTube player (privacy-enhanced domain). Autoplay starts muted where browsers require it. */
export function YouTube({ id, autoplay = false, title = 'Video', className = '' }: { id: string; autoplay?: boolean; title?: string; className?: string }) {
  const q = new URLSearchParams({ rel: '0', playsinline: '1', modestbranding: '1', ...(autoplay && { autoplay: '1', mute: '1' }) });
  return (
    <div className={`relative aspect-video w-full overflow-hidden rounded-2xl bg-black ${className}`}>
      <iframe
        src={`https://www.youtube-nocookie.com/embed/${id}?${q}`}
        title={title}
        allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
        allowFullScreen
        className="absolute inset-0 h-full w-full"
      />
    </div>
  );
}

/** Full-screen video player over the page; Esc or the backdrop closes it. */
export function VideoModal({ id, title, onClose, accent = '#fff' }: { id: string; title?: string; onClose: () => void; accent?: string }) {
  const { t } = useLang();
  useEffect(() => {
    duckMusic(true);
    const prev = document.documentElement.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => {
      duckMusic(false);
      document.documentElement.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [onClose]);
  return (
    <Layer>
      <div className="fixed inset-0 z-[92] flex animate-[ska-in_.3s_ease] items-center justify-center bg-black/90 p-4 backdrop-blur-xl sm:p-10" onClick={onClose} role="dialog" aria-modal="true" aria-label={title ?? 'Video'}>
        <div className="w-full max-w-5xl" onClick={(e) => e.stopPropagation()}>
          <div className="mb-3 flex items-center justify-between gap-4">
            <p className="truncate text-sm font-semibold" style={{ color: accent }}>
              {title}
            </p>
            <button onClick={onClose} aria-label={t({ en: 'Close', ko: '닫기' })} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/20 transition hover:border-white hover:bg-white hover:text-black">
              ✕
            </button>
          </div>
          <YouTube id={id} autoplay title={title} className="shadow-[0_40px_120px_-30px_rgba(0,0,0,1)] ring-1 ring-white/10" />
        </div>
      </div>
    </Layer>
  );
}
