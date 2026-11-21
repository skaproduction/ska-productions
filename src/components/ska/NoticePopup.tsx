'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { liveNotices, type Notice, type NoticeShow } from './data';
import { Arrow, Layer, useLang } from './ui';
import { Player, duckMusic } from './Video';

const HIDE = 'ska-news-hide'; // { [noticeId]: 'YYYY-MM-DD' } — "don't show again today"
const SHOWN = 'ska-news-shown'; // once per visit (session)
const today = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Seoul' });

const readHidden = (): Record<string, string> => {
  try {
    return JSON.parse(localStorage.getItem(HIDE) || '{}');
  } catch {
    return {};
  }
};

/**
 * Homepage news, set in the admin. Once the intro is over, video notices open first as a big
 * player, then text notices slide in as a NEWS card. Shown once per visit; "hide for today" skips
 * them until tomorrow.
 */
export default function NoticePopup({ notices, shows = [] }: { notices?: Notice[]; shows?: NoticeShow[] }) {
  const { t } = useLang();
  const [phase, setPhase] = useState<'wait' | 'video' | 'news' | 'done'>('wait');
  const [vi, setVi] = useState(0);
  const [hideToday, setHideToday] = useState(false);
  const [items, setItems] = useState<Notice[]>([]);

  useEffect(() => {
    // ?news (the admin's preview link) always shows it
    const preview = new URLSearchParams(location.search).has('news');
    let shown = false;
    try {
      shown = !!sessionStorage.getItem(SHOWN);
    } catch {}
    if (shown && !preview) return;
    const hidden = preview ? {} : readHidden();
    const list = liveNotices(notices).filter((n) => hidden[n.id] !== today());
    if (!list.length) return;
    setItems(list);
    const start = () => {
      try {
        sessionStorage.setItem(SHOWN, '1');
      } catch {}
      setPhase(list.some((n) => n.kind === 'video') ? 'video' : 'news');
    };
    // wait for the intro to finish; if it was skipped, show shortly after the page appears
    if ((window as { __skaIntroSeen?: number }).__skaIntroSeen) {
      const id = setTimeout(start, 900);
      return () => clearTimeout(id);
    }
    window.addEventListener('ska:intro-done', start, { once: true });
    return () => window.removeEventListener('ska:intro-done', start);
  }, [notices]);

  const videos = useMemo(() => items.filter((n) => n.kind === 'video' && n.video), [items]);
  const texts = useMemo(() => items.filter((n) => n.kind === 'notice'), [items]);

  // music steps aside while the video pop-up is open
  useEffect(() => {
    if (phase !== 'video') return;
    duckMusic(true);
    return () => duckMusic(false);
  }, [phase]);

  const rememberHide = (list: Notice[]) => {
    if (!hideToday) return;
    try {
      const h = readHidden();
      for (const n of list) h[n.id] = today();
      localStorage.setItem(HIDE, JSON.stringify(h));
    } catch {}
  };
  const closeVideos = () => {
    rememberHide(videos);
    setHideToday(false);
    setPhase(texts.length ? 'news' : 'done');
  };
  const closeNews = () => {
    rememberHide(texts);
    setPhase('done');
  };

  useEffect(() => {
    if (phase !== 'video' && phase !== 'news') return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && (phase === 'video' ? closeVideos() : closeNews());
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const HideToday = (
    <label className="flex cursor-pointer select-none items-center gap-2 text-xs text-white/55 hover:text-white/80">
      <input type="checkbox" checked={hideToday} onChange={(e) => setHideToday(e.target.checked)} className="h-3.5 w-3.5 accent-white" />
      {t({ en: 'Don’t show again today', ko: '오늘 하루 보지 않기' })}
    </label>
  );

  // buttons: the show it's about (and its tickets while on sale), then any extra link
  const CTA = ({ n }: { n: Notice }) => {
    const s = n.show ? shows.find((x) => x.slug === n.show) : undefined;
    const tickets = s && !s.past ? s.ticketUrl : undefined;
    if (!s && !n.link) return null;
    return (
      <div className="mt-4 flex flex-wrap gap-2">
        {tickets && (
          <a href={tickets} target="_blank" rel="noopener noreferrer" className="ska-btn !bg-white !py-2 !text-xs !text-black" onClick={() => setPhase('done')}>
            🎟 {t({ en: 'Buy tickets', ko: '티켓 예매' })}
          </a>
        )}
        {s && (
          <Link href={`/shows/${s.slug}`} className="ska-btn ska-btn-chrome !py-2 !text-xs" onClick={() => setPhase('done')}>
            {t({ en: 'See the show', ko: '공연 보기' })} <Arrow className="h-3 w-3" />
          </Link>
        )}
        {n.link && (
          <Link
            href={n.link}
            target={n.link.startsWith('/') ? undefined : '_blank'}
            rel={n.link.startsWith('/') ? undefined : 'noopener noreferrer'}
            className="ska-btn ska-btn-ghost !py-2 !text-xs"
            onClick={() => setPhase('done')}
          >
            {t(n.linkLabel?.en || n.linkLabel?.ko ? n.linkLabel : { en: 'Learn more', ko: '자세히 보기' })} <Arrow className="h-3 w-3" />
          </Link>
        )}
      </div>
    );
  };

  if (phase === 'video' && videos.length) {
    const v = videos[Math.min(vi, videos.length - 1)];
    return (
      <Layer>
        <div className="fixed inset-0 z-[92] flex animate-[ska-in_.4s_ease] items-center justify-center bg-black/85 p-4 backdrop-blur-xl sm:p-10" onClick={closeVideos} role="dialog" aria-modal="true" aria-label={t(v.title) || 'News'}>
          <div className="w-full max-w-5xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between gap-4">
              <span className="rounded-full bg-white px-3 py-1 text-[10px] font-bold uppercase tracking-[0.25em] text-black">{t({ en: 'New', ko: '새 소식' })}</span>
              <button onClick={closeVideos} aria-label={t({ en: 'Close', ko: '닫기' })} className="flex h-10 w-10 items-center justify-center rounded-full border border-white/20 transition hover:border-white hover:bg-white hover:text-black">
                ✕
              </button>
            </div>
            <Player key={v.id} src={v.video!} autoplay title={t(v.title)} className="ska-pop shadow-[0_40px_120px_-30px_rgba(0,0,0,1)] ring-1 ring-white/10" />
            <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div className="min-w-0">
                {t(v.title) && <h2 className="ska-display text-3xl leading-tight sm:text-4xl">{t(v.title)}</h2>}
                {t(v.body ?? { en: '', ko: '' }) && <p className="mt-2 max-w-2xl whitespace-pre-line text-sm text-white/65">{t(v.body!)}</p>}
                <CTA n={v} />
              </div>
              <div className="flex shrink-0 flex-col items-start gap-3 sm:items-end">
                {videos.length > 1 && (
                  <div className="flex items-center gap-2">
                    {videos.map((x, i) => (
                      <button key={x.id} onClick={() => setVi(i)} aria-label={`${i + 1}`} className={`h-2 rounded-full transition-all ${i === vi ? 'w-6 bg-white' : 'w-2 bg-white/30 hover:bg-white/60'}`} />
                    ))}
                    <button onClick={() => setVi((i) => (i + 1) % videos.length)} className="ml-2 text-xs font-semibold text-white/70 hover:text-white">
                      {t({ en: 'Next', ko: '다음' })} →
                    </button>
                  </div>
                )}
                {HideToday}
              </div>
            </div>
          </div>
        </div>
      </Layer>
    );
  }

  if (phase === 'news' && texts.length) {
    return (
      <Layer>
        <aside
          className="fixed inset-x-4 bottom-24 z-[80] max-h-[60vh] animate-[ska-sheet_.45s_cubic-bezier(.2,.8,.2,1)] overflow-y-auto rounded-2xl border border-white/15 bg-[#111116]/95 p-5 shadow-[0_30px_80px_-20px_rgba(0,0,0,1)] backdrop-blur-xl sm:left-auto sm:right-24 sm:w-[380px] lg:bottom-8"
          role="dialog"
          aria-label="News"
        >
          <div className="flex items-center justify-between">
            <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.3em]">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white/70" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-white" />
              </span>
              {t({ en: 'News', ko: '소식' })}
            </p>
            <button onClick={closeNews} aria-label={t({ en: 'Close', ko: '닫기' })} className="flex h-8 w-8 items-center justify-center rounded-full text-white/60 transition hover:bg-white/10 hover:text-white">
              ✕
            </button>
          </div>
          <ul className="mt-3 divide-y divide-white/10">
            {texts.map((n) => (
              <li key={n.id} className="py-3 first:pt-1">
                <p className="font-semibold leading-snug">{t(n.title)}</p>
                {n.body && t(n.body) && <p className="mt-1 whitespace-pre-line text-sm text-white/60">{t(n.body)}</p>}
                <CTA n={n} />
              </li>
            ))}
          </ul>
          <div className="mt-2 border-t border-white/10 pt-3">{HideToday}</div>
        </aside>
      </Layer>
    );
  }

  return null;
}
