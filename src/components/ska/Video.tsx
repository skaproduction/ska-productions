'use client';

import { useEffect, useRef, useState } from 'react';
import { videoSrc } from './data';
import { Layer, useLang } from './ui';

/** Background music steps aside while a video plays (see BgmPlayer). */
export const duckMusic = (on: boolean) => {
  window.dispatchEvent(new Event(on ? 'ska:bgm-duck' : 'ska:bgm-unduck'));
};

export const youtubeThumb = (id: string) => `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;

/**
 * Plays a stored video: an uploaded file (MP4 / MOV / WebM) or a YouTube video.
 * Autoplay starts muted, as browsers require; viewers turn the sound on from the controls.
 */
export function Player({ src, autoplay = false, title = 'Video', className = '' }: { src: string; autoplay?: boolean; title?: string; className?: string }) {
  const v = videoSrc(src);
  if (!v) return null;
  return (
    <div className={`relative aspect-video w-full overflow-hidden rounded-2xl bg-black ${className}`}>
      {'file' in v ? (
        <video
          src={v.file}
          title={title}
          controls
          playsInline
          preload="metadata"
          autoPlay={autoplay}
          muted={autoplay}
          className="absolute inset-0 h-full w-full object-contain"
        />
      ) : (
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${v.youtube}?${new URLSearchParams({ rel: '0', playsinline: '1', modestbranding: '1', ...(autoplay && { autoplay: '1', mute: '1' }) })}`}
          title={title}
          allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
          allowFullScreen
          className="absolute inset-0 h-full w-full"
        />
      )}
    </div>
  );
}

/** A still for a stored video: YouTube's thumbnail, or the first frames of an uploaded file. */
export function VideoThumb({ src, className = '' }: { src: string; className?: string }) {
  const v = videoSrc(src);
  if (!v) return null;
  return 'file' in v ? (
    <video src={`${v.file}#t=0.5`} muted playsInline preload="metadata" className={`object-cover ${className}`} aria-hidden />
  ) : (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={youtubeThumb(v.youtube)} alt="" className={`object-cover ${className}`} />
  );
}

/** Full-screen video player over the page; Esc or the backdrop closes it. */
export function VideoModal({ src, title, onClose, accent = '#fff' }: { src: string; title?: string; onClose: () => void; accent?: string }) {
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
          <Player src={src} autoplay title={title} className="shadow-[0_40px_120px_-30px_rgba(0,0,0,1)] ring-1 ring-white/10" />
        </div>
      </div>
    </Layer>
  );
}

type Upload = (file: File, prefix: string, onProgress?: (pct: number) => void) => Promise<string>;

const VIDEO_ACCEPT = 'video/mp4,video/quicktime,video/webm,.mp4,.mov,.webm';
const MAX_MB = 200;

/**
 * Admin input for a video: upload a file from the computer (click or drop), or paste a YouTube link.
 * The value is the uploaded file's URL or the YouTube link as typed.
 */
export function VideoField({ value, onChange, upload, prefix, onError }: { value: string; onChange: (v: string) => void; upload: Upload; prefix: string; onError: (m: string) => void }) {
  const { t } = useLang();
  const input = useRef<HTMLInputElement>(null);
  const [pct, setPct] = useState<number | null>(null);
  const [over, setOver] = useState(false);
  const src = videoSrc(value);
  const isFile = !!src && 'file' in src;

  const pick = async (file?: File) => {
    if (!file) return;
    if (!/\.(mp4|mov|webm)$/i.test(file.name) && !/^video\/(mp4|quicktime|webm)$/.test(file.type))
      return onError(t({ en: 'Use an MP4, MOV or WebM video.', ko: 'MP4, MOV, WebM 영상만 올릴 수 있어요.' }));
    if (file.size > MAX_MB * 1024 * 1024) return onError(t({ en: `Max ${MAX_MB} MB — compress it first.`, ko: `최대 ${MAX_MB}MB까지예요. 용량을 줄여서 올려주세요.` }));
    setPct(0);
    try {
      onChange(await upload(file, prefix, setPct));
    } catch {
      onError(t({ en: 'Video upload failed. Try again.', ko: '영상 업로드에 실패했어요. 다시 시도해주세요.' }));
    }
    setPct(null);
  };

  return (
    <div>
      {isFile ? (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <video src={src.file} controls playsInline preload="metadata" className="aspect-video w-full rounded-xl bg-black ring-1 ring-white/15 sm:w-72" />
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => input.current?.click()} disabled={pct !== null} className="ska-btn ska-btn-ghost !py-2 !text-xs">
              {pct !== null ? `${t({ en: 'Uploading', ko: '업로드 중' })} ${Math.round(pct)}%` : t({ en: 'Replace video', ko: '영상 교체' })}
            </button>
            <button type="button" onClick={() => onChange('')} className="ska-btn ska-btn-ghost !py-2 !text-xs text-red-300">
              {t({ en: 'Remove', ko: '삭제' })}
            </button>
          </div>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-[auto_1fr] sm:items-stretch">
          <button
            type="button"
            onClick={() => input.current?.click()}
            disabled={pct !== null}
            onDragOver={(e) => {
              e.preventDefault();
              setOver(true);
            }}
            onDragLeave={() => setOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setOver(false);
              pick(e.dataTransfer.files[0]);
            }}
            className={`flex min-h-[88px] flex-col items-center justify-center gap-1 rounded-xl border border-dashed px-6 text-sm text-white/60 transition hover:text-white sm:w-60 ${over ? 'border-white bg-white/[0.05]' : 'border-white/20'}`}
          >
            {pct !== null ? (
              <>
                {t({ en: 'Uploading', ko: '업로드 중' })} {Math.round(pct)}%
                <span className="mt-1 h-1 w-36 overflow-hidden rounded-full bg-white/10">
                  <span className="block h-full bg-white transition-all" style={{ width: `${pct}%` }} />
                </span>
              </>
            ) : (
              <>
                <span className="text-lg">⬆</span>
                {t({ en: 'Upload video', ko: '영상 올리기' })}
                <span className="text-[11px] text-white/35">{t({ en: 'MP4 · MOV · WebM, up to 200 MB — click or drop', ko: 'MP4 · MOV · WebM, 200MB까지 — 클릭 또는 끌어다 놓기' })}</span>
              </>
            )}
          </button>
          <div className="flex flex-col justify-center gap-2">
            <span className="text-[11px] uppercase tracking-[0.2em] text-white/35">{t({ en: 'or a YouTube link', ko: '또는 유튜브 링크' })}</span>
            <div className="flex items-center gap-3">
              <input className="ska-input flex-1" value={value} onChange={(e) => onChange(e.target.value)} placeholder="https://www.youtube.com/watch?v=…" inputMode="url" />
              {src && 'youtube' in src && <VideoThumb src={value} className="h-11 w-[72px] shrink-0 rounded-lg ring-1 ring-white/15" />}
            </div>
            {value && !src && <span className="text-xs text-amber-300">{t({ en: 'That doesn’t look like a YouTube link.', ko: '유튜브 링크가 아닌 것 같아요.' })}</span>}
          </div>
        </div>
      )}
      <input ref={input} type="file" accept={VIDEO_ACCEPT} hidden onChange={(e) => (pick(e.target.files?.[0]), (e.target.value = ''))} />
    </div>
  );
}
