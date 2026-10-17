'use client';

import { upload as blobUpload } from '@vercel/blob/client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { BRANDS, ZONES, artistDay, brandById, showDays, isPast, type Artist, type BrandId, type L, type Photo, type Show, type SiteSettings, type Zone } from './data';
import MusicSettings from './MusicSettings';
import VisitorStats from './VisitorStats';
import SeatMapEditor from './SeatMapEditor';
import { Arrow, Layer, Poster, fmtDate, useLang } from './ui';

const ACCEPT = 'image/jpeg,image/png,image/webp';
const MAX_MB = 10;

/* ================= login ================= */

export function AdminLogin({ configured }: { configured: boolean }) {
  const { t } = useLang();
  const router = useRouter();
  const [pw, setPw] = useState('');
  const [state, setState] = useState<'idle' | 'busy' | 'wrong'>('idle');

  return (
    <main className="flex min-h-screen items-center justify-center px-5 pt-20">
      <form
        className="w-full max-w-sm rounded-3xl border border-white/[0.08] bg-[#0d0d12] p-8"
        onSubmit={async (e) => {
          e.preventDefault();
          setState('busy');
          const res = await fetch('/api/ska/admin/login', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ password: pw }),
          }).catch(() => null);
          if (res?.ok) router.refresh();
          else setState('wrong');
        }}
      >
        <p className="ska-eyebrow">SKA Admin</p>
        <h1 className="ska-display mt-3 text-4xl">{t({ en: 'Show manager', ko: '공연 관리' })}</h1>
        {configured ? (
          <>
            <label className="mt-8 block">
              <span className="mb-2 block text-xs text-white/50">{t({ en: 'Admin password', ko: '관리자 비밀번호' })}</span>
              <input
                type="password"
                autoFocus
                autoComplete="current-password"
                className="ska-input"
                value={pw}
                onChange={(e) => {
                  setPw(e.target.value);
                  setState('idle');
                }}
              />
            </label>
            {state === 'wrong' && <p className="mt-3 text-sm text-red-400">{t({ en: 'Wrong password.', ko: '비밀번호가 맞지 않습니다.' })}</p>}
            <button disabled={!pw || state === 'busy'} className="ska-btn ska-btn-chrome mt-6 w-full justify-center disabled:opacity-40">
              {state === 'busy' ? '…' : t({ en: 'Sign in', ko: '로그인' })}
            </button>
          </>
        ) : (
          <p className="mt-6 text-sm leading-relaxed text-white/60">
            {t({
              en: 'Admin is disabled. Set SKA_ADMIN_PASSWORD in the server environment and restart.',
              ko: '관리자 기능이 꺼져 있습니다. 서버 환경변수 SKA_ADMIN_PASSWORD를 설정하고 재시작하세요.',
            })}
          </p>
        )}
      </form>
    </main>
  );
}

/* ================= helpers ================= */

const EXT: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'audio/mpeg': 'mp3', 'audio/mp4': 'm4a', 'audio/x-m4a': 'm4a' };

// On Vercel files go from the browser straight to Blob (function requests are capped at 4.5 MB);
// locally they're posted to the dev server, which stores them on disk.
let directUploads = false;

async function uploadMedia(file: File, prefix: string, onProgress?: (pct: number) => void): Promise<string> {
  const type = file.type || (/\.m4a$/i.test(file.name) ? 'audio/mp4' : /\.mp3$/i.test(file.name) ? 'audio/mpeg' : '');
  const ext = EXT[type];
  if (!ext) throw new Error('type');
  if (file.size > (type.startsWith('audio/') ? 15 : MAX_MB) * 1024 * 1024) throw new Error('size');
  if (directUploads) {
    const safe = prefix.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 30) || 'file';
    const name = `${safe}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const blob = await blobUpload(`ska/media/${name}`, file, {
      access: 'public',
      handleUploadUrl: '/api/ska/admin/upload',
      contentType: type,
      onUploadProgress: (p) => onProgress?.(p.percentage),
    });
    return blob.url;
  }
  const body = new FormData();
  body.set('file', file);
  body.set('prefix', prefix);
  const res = await fetch('/api/ska/admin/media', { method: 'POST', body });
  const json = (await res.json().catch(() => ({}))) as { url?: string };
  if (!res.ok || !json.url) throw new Error('upload');
  onProgress?.(100);
  return json.url;
}

const uploadImage = (file: File, prefix: string) => {
  if (!ACCEPT.split(',').includes(file.type)) return Promise.reject(new Error('type'));
  return uploadMedia(file, prefix);
};

type Translate = (texts: string[]) => Promise<string[] | null>;

const TIMEZONES = [
  { v: '+09:00', label: { en: 'Seoul / Tokyo (UTC+9)', ko: '서울 · 도쿄 (UTC+9)' } },
  { v: '+08:00', label: { en: 'Taipei / Hong Kong / Singapore (UTC+8)', ko: '타이베이 · 홍콩 · 싱가포르 (UTC+8)' } },
  { v: '+07:00', label: { en: 'Bangkok / Jakarta (UTC+7)', ko: '방콕 · 자카르타 (UTC+7)' } },
  { v: '+00:00', label: { en: 'London (UTC+0)', ko: '런던 (UTC+0)' } },
  { v: '+01:00', label: { en: 'Paris / Berlin (UTC+1)', ko: '파리 · 베를린 (UTC+1)' } },
  { v: '-05:00', label: { en: 'New York (UTC−5)', ko: '뉴욕 (UTC−5)' } },
  { v: '-08:00', label: { en: 'Los Angeles (UTC−8)', ko: 'LA (UTC−8)' } },
];

type Draft = {
  slug: string;
  brand: BrandId;
  title: string;
  edition: string;
  date: string;
  time: string;
  tz: string;
  endDate: string;
  city: L;
  country: L;
  venue: L;
  summary: L;
  poster?: string;
  lineup: Artist[];
  gallery: Photo[];
  timetableImages: Photo[];
  seatMap?: string;
  zones: Zone[];
};

const ISO_RE = /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})(?::\d{2})?(Z|[+-]\d{2}:\d{2})$/;
const emptyL = (): L => ({ en: '', ko: '' });
const newId = () => `a${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

function toDraft(show?: Show, past = false): Draft {
  if (!show) {
    // a new upcoming show starts two months out; a new past show (for History) a year back
    const d = new Date(Date.now() + (past ? -365 : 60) * 864e5);
    return {
      slug: '',
      brand: 'kpop',
      title: brandById('kpop').name,
      edition: String(d.getFullYear()),
      date: d.toISOString().slice(0, 10),
      time: '18:00',
      tz: '+09:00',
      endDate: '',
      city: { en: 'Seoul', ko: '서울' },
      country: { en: 'Korea', ko: '대한민국' },
      venue: { en: 'Venue to be announced', ko: '공연장 추후 공개' },
      summary: emptyL(),
      lineup: [],
      gallery: [],
      timetableImages: [],
      zones: ZONES.map((z) => ({ ...z })),
    };
  }
  const [, date = '', time = '18:00', tz = '+09:00'] = show.start.match(ISO_RE) ?? [];
  return {
    slug: show.slug,
    brand: show.brand,
    title: show.title,
    edition: show.edition,
    date: show.dateTBA ? '' : date,
    time,
    tz: tz === 'Z' ? '+00:00' : tz,
    endDate: show.end?.match(ISO_RE)?.[1] ?? '',
    city: { ...show.city },
    country: { ...show.country },
    venue: { ...show.venue },
    summary: { ...show.summary },
    poster: show.poster,
    lineup: show.lineup.map((a) => ({ ...a })),
    gallery: (show.gallery ?? []).map((p) => ({ ...p })),
    timetableImages: (show.timetableImages ?? []).map((p) => ({ ...p })),
    seatMap: show.seatMap,
    zones: show.zones.map((z) => ({ ...z, tier: { ...z.tier } })),
  };
}

const tbaYear = (edition: string) => {
  const y = Number(edition.match(/20\d\d/)?.[0]);
  return y || new Date().getFullYear() + 1;
};

const fromDraft = (d: Draft) => ({
  slug: d.slug || undefined,
  brand: d.brand,
  title: d.title,
  edition: d.edition,
  // no date yet: keep the show in its year (from the edition, e.g. "2027") as "Date TBA"
  start: d.date ? `${d.date}T${d.time}:00${d.tz}` : `${tbaYear(d.edition)}-12-31T${d.time}:00${d.tz}`,
  end: d.date && d.endDate && d.endDate !== d.date ? `${d.endDate}T23:00:00${d.tz}` : undefined,
  dateTBA: !d.date || undefined,
  city: d.city,
  country: d.country,
  venue: d.venue,
  summary: d.summary,
  poster: d.poster,
  lineup: d.lineup,
  gallery: d.gallery,
  timetableImages: d.timetableImages,
  seatMap: d.seatMap,
  zones: d.zones,
});

/* ================= dashboard ================= */

export function AdminDashboard({
  shows,
  settings,
  canTranslate,
  blobUploads,
}: {
  shows: Show[];
  settings: SiteSettings;
  canTranslate: boolean;
  blobUploads: boolean;
}) {
  directUploads = blobUploads;
  const { t, lang } = useLang();
  const router = useRouter();
  const [tab, setTab] = useState<'upcoming' | 'history'>('upcoming');
  const [editing, setEditing] = useState<Show | 'new' | 'new-past' | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 2800);
    return () => clearTimeout(id);
  }, [toast]);

  const upcoming = shows.filter((s) => !isPast(s));
  const history = shows.filter((s) => isPast(s)).reverse();
  const list = tab === 'upcoming' ? upcoming : history;

  const translate: Translate = async (texts) => {
    const res = await fetch('/api/ska/admin/translate', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ texts }),
    }).catch(() => null);
    const json = (await res?.json().catch(() => null)) as { ko?: string[] } | null;
    if (res?.ok && json?.ko) return json.ko;
    setToast(t({ en: 'Auto-translation failed — please type the Korean yourself.', ko: '자동 번역에 실패했습니다. 한글을 직접 입력해주세요.' }));
    return null;
  };

  return (
    <main className="px-5 pb-28 pt-28 sm:px-8 sm:pt-36">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
          <div>
            <p className="ska-eyebrow">SKA Admin</p>
            <h1 className="ska-display mt-3 text-[clamp(40px,6vw,80px)] leading-[0.9]">{t({ en: 'Show manager', ko: '공연 관리' })}</h1>
            <p className="mt-4 max-w-xl text-sm text-white/55">
              {t({
                en: 'Edit shows, posters and lineups. Changes go live as soon as you save. Shows move to History automatically once their date has passed.',
                ko: '공연 정보, 포스터, 라인업을 수정할 수 있습니다. 저장하면 바로 사이트에 반영되고, 공연 날짜가 지나면 자동으로 History로 이동합니다.',
              })}
            </p>
          </div>
          <div className="flex gap-2 self-start sm:self-auto">
            <button onClick={() => setEditing('new')} className="ska-btn ska-btn-chrome !py-2.5 !text-sm">
              + {t({ en: 'New show', ko: '새 공연' })}
            </button>
            <button
              onClick={async () => {
                await fetch('/api/ska/admin/login', { method: 'DELETE' });
                router.refresh();
              }}
              className="ska-btn ska-btn-ghost !py-2.5 !text-xs"
            >
              {t({ en: 'Sign out', ko: '로그아웃' })}
            </button>
          </div>
        </div>

        <VisitorStats shows={shows} />

        <MusicSettings settings={settings} upload={uploadMedia} onToast={setToast} />

        <div className="mt-12 flex gap-1 border-b border-white/10">
          {(
            [
              ['upcoming', t({ en: 'Upcoming', ko: '예정 공연' }), upcoming.length],
              ['history', t({ en: 'History', ko: '지난 공연 · History' }), history.length],
            ] as const
          ).map(([id, label, n]) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`relative px-4 py-3 text-sm font-semibold transition ${tab === id ? 'text-white' : 'text-white/45 hover:text-white/80'}`}
            >
              {label} <span className="ml-1 rounded-full bg-white/10 px-2 py-0.5 text-[11px]">{n}</span>
              {tab === id && <span className="absolute inset-x-3 -bottom-px h-0.5 bg-white" />}
            </button>
          ))}
        </div>

        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <button
            onClick={() => setEditing(tab === 'upcoming' ? 'new' : 'new-past')}
            className="group flex min-h-[176px] flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-white/20 p-4 text-center text-white/55 transition hover:border-white/60 hover:bg-white/[0.03] hover:text-white"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-full border border-current text-2xl leading-none transition group-hover:scale-110">+</span>
            <span className="text-sm font-semibold">
              {tab === 'upcoming' ? t({ en: 'Add upcoming show', ko: '예정 공연 추가' }) : t({ en: 'Add past show', ko: '지난 공연 추가' })}
            </span>
            <span className="max-w-[240px] text-[11px] text-white/35">
              {tab === 'upcoming'
                ? t({ en: 'Moves to History by itself once the date passes.', ko: '공연 날짜가 지나면 자동으로 History로 이동해요.' })
                : t({ en: 'Starts with a past date — set the real one.', ko: '과거 날짜로 시작해요. 실제 공연 날짜로 바꿔주세요.' })}
            </span>
          </button>
            {list.map((s) => {
              const b = brandById(s.brand);
              const announced = s.lineup.filter((a) => a.announced).length;
              return (
                <div key={s.slug} className="flex gap-4 rounded-2xl border border-white/[0.08] bg-[#0d0d12] p-4">
                  <Poster src={s.poster} brand={b} title={s.title} edition={s.edition} className="w-24 shrink-0 !rounded-lg" />
                  <div className="flex min-w-0 flex-1 flex-col">
                    <p className="text-[10px] uppercase tracking-[0.2em]" style={{ color: b.accent }}>
                      {b.name}
                    </p>
                    <h2 className="ska-display mt-1 truncate text-xl leading-tight">
                      {s.title} <span className="text-white/40">{s.edition}</span>
                    </h2>
                    <p className="mt-1 text-xs text-white/50">{fmtDate(s.start, lang, s.end, s.dateTBA)}</p>
                    <p className="text-xs text-white/50">{[s.city[lang], s.country[lang]].filter(Boolean).join(', ')}</p>
                    <p className="mt-2 text-xs text-white/40">
                      {t({ en: 'Lineup', ko: '라인업' })} {s.lineup.length} · {t({ en: 'announced', ko: '공개' })} {announced}
                      {' · '}
                      {t({ en: 'Photos', ko: '사진' })} {s.gallery?.length ?? 0}
                    </p>
                    <div className="mt-auto flex gap-2 pt-3">
                      <button onClick={() => setEditing(s)} className="ska-btn ska-btn-chrome flex-1 justify-center !px-3 !py-2 !text-xs">
                        {t({ en: 'Edit', ko: '편집' })}
                      </button>
                      <Link href={`/shows/${s.slug}`} target="_blank" className="ska-btn ska-btn-ghost !px-3 !py-2 !text-xs">
                        {t({ en: 'View', ko: '보기' })} <Arrow className="h-3 w-3" />
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
        </div>
      </div>

      {editing && (
        <Layer>
          <ShowEditor
          key={typeof editing === 'string' ? editing : editing.slug}
          show={typeof editing === 'string' ? undefined : editing}
          past={editing === 'new-past'}
          canTranslate={canTranslate}
          translate={translate}
          onClose={() => setEditing(null)}
          onSaved={(msg) => {
            setEditing(null);
            setToast(msg);
            router.refresh();
          }}
          onError={setToast}
          />
        </Layer>
      )}

      <Layer>
        <div
          className={`fixed bottom-6 left-1/2 z-[90] -translate-x-1/2 rounded-full bg-white px-5 py-3 text-sm font-semibold text-black shadow-2xl transition-all duration-300 ${
          toast ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-4 opacity-0'
        }`}
          role="status"
        >
          {toast}
        </div>
      </Layer>
    </main>
  );
}

/* ================= editor ================= */

const SAVE_ERRORS: Record<string, L> = {
  missing_title: { en: 'Title is required.', ko: '제목을 입력해주세요.' },
  missing_start: { en: 'Start date is required.', ko: '시작 날짜를 입력해주세요.' },
  bad_start: { en: 'Check the start date and time.', ko: '시작 날짜와 시간을 확인해주세요.' },
  bad_end: { en: 'Check the end date.', ko: '종료 날짜를 확인해주세요.' },
  end_before_start: { en: 'End date is before the start date.', ko: '종료일이 시작일보다 빠릅니다.' },
};

function ShowEditor({
  show,
  past,
  canTranslate,
  translate,
  onClose,
  onSaved,
  onError,
}: {
  show?: Show;
  /** new show meant for History: start with a past date */
  past?: boolean;
  canTranslate: boolean;
  translate: Translate;
  onClose: () => void;
  onSaved: (msg: string) => void;
  onError: (msg: string) => void;
}) {
  const { t, lang } = useLang();
  const initial = useMemo(() => toDraft(show, past), [show, past]);
  const [d, setD] = useState<Draft>(initial);
  const [busy, setBusy] = useState<'save' | 'delete' | 'translate' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((p) => ({ ...p, [k]: v }));
  const dirty = JSON.stringify(d) !== JSON.stringify(initial);
  const b = brandById(d.brand);
  const willBeHistory = !!d.date && isPast({ start: `${d.date}T${d.time}:00${d.tz}`, end: d.endDate ? `${d.endDate}T23:00:00${d.tz}` : undefined });

  useEffect(() => {
    document.documentElement.style.overflow = 'hidden';
    return () => {
      document.documentElement.style.overflow = '';
    };
  }, []);

  // Ctrl/Cmd+S saves, Esc closes; warn before leaving the page with unsaved edits
  const keys = useRef({ save: () => {}, close: () => {} });
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        keys.current.save();
      } else if (e.key === 'Escape') keys.current.close();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  useEffect(() => {
    if (!dirty) return;
    const onUnload = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener('beforeunload', onUnload);
    return () => window.removeEventListener('beforeunload', onUnload);
  }, [dirty]);

  const close = () => {
    if (dirty && !confirm(t({ en: 'Discard unsaved changes?', ko: '저장하지 않은 변경 사항을 버릴까요?' }))) return;
    onClose();
  };
  // a drag that starts inside the panel (e.g. selecting text) and ends on the backdrop must not close it
  const pressedBackdrop = useRef(false);

  const save = async () => {
    setError(null);
    setBusy('save');
    const res = await fetch('/api/ska/admin/shows', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ show: fromDraft(d) }),
    }).catch(() => null);
    const json = (await res?.json().catch(() => null)) as { error?: string } | null;
    setBusy(null);
    if (res?.ok) onSaved(t({ en: `${d.title} saved`, ko: `${d.title} 저장되었습니다` }));
    else setError(t(SAVE_ERRORS[json?.error ?? ''] ?? { en: 'Could not save. Try again.', ko: '저장하지 못했습니다. 다시 시도해주세요.' }));
  };

  keys.current = { save: () => !busy && d.title.trim() && d.date && save(), close };

  const remove = async () => {
    if (!show || !confirm(t({ en: `Delete ${show.title} ${show.edition}? This can’t be undone.`, ko: `${show.title} ${show.edition} 공연을 삭제할까요? 되돌릴 수 없습니다.` }))) return;
    setBusy('delete');
    const res = await fetch(`/api/ska/admin/shows?slug=${encodeURIComponent(show.slug)}`, { method: 'DELETE' }).catch(() => null);
    setBusy(null);
    if (res?.ok) onSaved(t({ en: 'Show deleted', ko: '공연이 삭제되었습니다' }));
    else setError(t({ en: 'Could not delete.', ko: '삭제하지 못했습니다.' }));
  };

  const translateAll = async () => {
    const keys = (['city', 'country', 'venue', 'summary'] as const).filter((k) => d[k].en.trim());
    if (!keys.length) return;
    setBusy('translate');
    const ko = await translate(keys.map((k) => d[k].en));
    setBusy(null);
    if (ko) setD((p) => ({ ...p, ...Object.fromEntries(keys.map((k, i) => [k, { en: p[k].en, ko: ko[i] }])) }));
  };

  return (
    <div
      className="fixed inset-0 z-[85] flex justify-end bg-black/75"
      onPointerDown={(e) => (pressedBackdrop.current = e.target === e.currentTarget)}
      onClick={(e) => {
        if (pressedBackdrop.current && e.target === e.currentTarget) close();
        pressedBackdrop.current = false;
      }}
    >
      <div
        className="flex h-full w-full max-w-3xl animate-[ska-drawer_.35s_cubic-bezier(.2,.8,.2,1)] flex-col border-l border-white/10 bg-[#0b0b10]"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={t({ en: 'Edit show', ko: '공연 편집' })}
      >
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
          <div>
            <p className="text-[10px] uppercase tracking-[0.25em]" style={{ color: b.accent }}>
              {show ? t({ en: 'Edit show', ko: '공연 편집' }) : t({ en: 'New show', ko: '새 공연' })}
            </p>
            <p className="ska-display text-2xl">
              {d.title || '—'} <span className="text-white/40">{d.edition}</span>
            </p>
          </div>
          <button onClick={close} className="flex h-10 w-10 items-center justify-center rounded-full border border-white/15 text-lg hover:bg-white/10" aria-label="Close">
            ✕
          </button>
        </div>

        <div className="flex-1 space-y-10 overflow-y-auto px-6 py-8">
          {/* basics */}
          <Group title={t({ en: 'Basics', ko: '기본 정보' })}>
            <div className="grid gap-4 sm:grid-cols-[1fr_1fr]">
              <Field label={t({ en: 'Category', ko: '카테고리' })} className="sm:col-span-2">
                <div className="flex flex-wrap gap-2">
                  {BRANDS.map((x) => (
                    <button
                      key={x.id}
                      type="button"
                      onClick={() =>
                        setD((p) => ({ ...p, brand: x.id, title: p.title === brandById(p.brand).name || !p.title ? x.name : p.title }))
                      }
                      className="rounded-full border px-4 py-2 text-xs font-semibold transition"
                      style={{
                        borderColor: d.brand === x.id ? x.accent : 'rgba(255,255,255,.15)',
                        background: d.brand === x.id ? `${x.accent}22` : 'transparent',
                        color: d.brand === x.id ? x.accent : 'rgba(255,255,255,.6)',
                      }}
                    >
                      {x.name}
                    </button>
                  ))}
                </div>
              </Field>
              <Field label={t({ en: 'Title *', ko: '제목 *' })}>
                <input className="ska-input" value={d.title} onChange={(e) => set('title', e.target.value)} placeholder="KPOP PRIME" />
              </Field>
              <Field label={t({ en: 'Edition / subtitle', ko: '회차 / 부제' })}>
                <input className="ska-input" value={d.edition} onChange={(e) => set('edition', e.target.value)} placeholder="2027 in TAIPEI" />
              </Field>
            </div>
          </Group>

          {/* date */}
          <Group title={t({ en: 'Date', ko: '날짜' })}>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label={t({ en: 'Start date', ko: '시작일' })}>
                <input type="date" className="ska-input [color-scheme:dark]" value={d.date} onChange={(e) => set('date', e.target.value)} />
                {!d.date && (
                  <span className="mt-1.5 block text-[11px] text-amber-300/80">
                    {t({ en: `Empty = “${tbaYear(d.edition)} · Date TBA”`, ko: `비워두면 “${tbaYear(d.edition)} · 날짜 추후 공개”로 저장` })}
                  </span>
                )}
              </Field>
              <Field label={t({ en: 'Show time', ko: '공연 시작 시간' })}>
                <input type="time" className="ska-input [color-scheme:dark]" value={d.time} onChange={(e) => set('time', e.target.value)} />
              </Field>
              <Field label={t({ en: 'End date (multi-day)', ko: '종료일 (여러 날 공연)' })}>
                <input type="date" min={d.date} className="ska-input [color-scheme:dark]" value={d.endDate} onChange={(e) => set('endDate', e.target.value)} />
              </Field>
              <Field label={t({ en: 'Local time zone', ko: '현지 시간대' })} className="sm:col-span-3">
                <select className="ska-input [color-scheme:dark]" value={d.tz} onChange={(e) => set('tz', e.target.value)}>
                  {TIMEZONES.map((z) => (
                    <option key={z.v} value={z.v}>
                      {z.label[lang]}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
            {willBeHistory && (
              <p className="mt-3 rounded-lg bg-white/[0.05] px-3 py-2 text-xs text-white/60">
                {t({ en: 'This date has passed, so the show will appear in History.', ko: '지난 날짜라서 이 공연은 History에 표시됩니다.' })}
              </p>
            )}
          </Group>

          {/* place & copy */}
          <Group
            title={t({ en: 'Place & description', ko: '장소 · 소개 문구' })}
            aside={
              canTranslate ? (
                <button type="button" onClick={translateAll} disabled={busy === 'translate'} className="text-xs text-white/60 underline-offset-4 hover:text-white hover:underline disabled:opacity-40">
                  {busy === 'translate' ? t({ en: 'Translating…', ko: '번역 중…' }) : `↻ ${t({ en: 'Translate all to Korean', ko: '한글 전체 다시 번역' })}`}
                </button>
              ) : null
            }
          >
            <p className="-mt-2 mb-5 text-xs text-white/45">
              {canTranslate
                ? t({
                    en: 'Write in English — the Korean fills in automatically when you leave the field. You can still edit the Korean yourself.',
                    ko: '영문으로 입력하고 칸을 벗어나면 한글이 자동으로 채워집니다. 한글은 직접 고칠 수도 있습니다.',
                  })
                : t({
                    en: 'Auto-translation is off (set ANTHROPIC_API_KEY on the server to turn it on). Please fill in both languages.',
                    ko: '자동 번역이 꺼져 있습니다 (서버에 ANTHROPIC_API_KEY를 설정하면 켜집니다). 영문과 한글을 모두 입력해주세요.',
                  })}
            </p>
            <div className="space-y-5">
              <BiField label={t({ en: 'City', ko: '도시' })} value={d.city} onChange={(v) => set('city', v)} canTranslate={canTranslate} translate={translate} />
              <BiField label={t({ en: 'Country', ko: '국가' })} value={d.country} onChange={(v) => set('country', v)} canTranslate={canTranslate} translate={translate} />
              <BiField label={t({ en: 'Venue', ko: '공연장' })} value={d.venue} onChange={(v) => set('venue', v)} canTranslate={canTranslate} translate={translate} />
              <BiField label={t({ en: 'Description', ko: '소개 문구' })} value={d.summary} onChange={(v) => set('summary', v)} canTranslate={canTranslate} translate={translate} multiline />
            </div>
          </Group>

          {/* poster */}
          <Group title={t({ en: 'Poster', ko: '포스터' })}>
            <PosterField draft={d} onChange={(url) => set('poster', url)} onError={onError} />
          </Group>

          {/* timetable images */}
          <Group
            title={t({ en: 'Timetable', ko: '타임테이블' })}
            aside={<span className="text-xs text-white/50">{d.timetableImages.length} {t({ en: 'images', ko: '장' })}</span>}
          >
            <GalleryEditor
              gallery={d.timetableImages}
              onChange={(g) => set('timetableImages', g)}
              onError={onError}
              slug={`timetable-${d.slug || d.title}`}
              cover={false}
              captionPlaceholder={{ en: 'Tab name, e.g. DAY 1', ko: '탭 이름 (예: DAY 1)' }}
              hint={{
                en: 'Upload the timetable as images — one per day or stage. They replace the built-in timetable on the show page; the name you give each image becomes its tab.',
                ko: '타임테이블을 이미지로 올리세요. 날짜나 스테이지마다 한 장씩 올리면 됩니다. 공연 페이지의 기본 타임테이블 대신 표시되고, 각 이미지의 이름이 탭 이름이 됩니다.',
              }}
            />
          </Group>

          {/* seat map */}
          <Group
            title={t({ en: 'Seat map', ko: '좌석 배치도' })}
            aside={<span className="text-xs text-white/50">{d.zones.length} {t({ en: 'zones', ko: '구역' })}</span>}
          >
            <SeatMapEditor
              image={d.seatMap}
              zones={d.zones}
              onImage={(url) => set('seatMap', url)}
              onZones={(z) => set('zones', z)}
              upload={uploadImage}
              translate={translate}
              canTranslate={canTranslate}
              onError={onError}
              slug={d.slug || d.title}
            />
          </Group>

          {/* lineup */}
          <Group
            title={t({ en: 'Lineup', ko: '라인업' })}
            aside={
              <span className="text-xs text-white/50">
                {t({ en: 'Total', ko: '총' })} {d.lineup.length} · {t({ en: 'announced', ko: '공개' })} {d.lineup.filter((a) => a.announced).length}
              </span>
            }
          >
            <LineupEditor
              lineup={d.lineup}
              days={d.date ? showDays(d.date, d.endDate || undefined) : []}
              onChange={(l) => set('lineup', l)} accent={b.accent} onError={onError} slug={d.slug || d.title} />
          </Group>

          {/* after-show gallery */}
          <Group
            title={t({ en: 'After-show photos', ko: 'After Show 사진' })}
            aside={<span className="text-xs text-white/50">{d.gallery.length} {t({ en: 'photos', ko: '장' })}</span>}
          >
            <GalleryEditor gallery={d.gallery} onChange={(g) => set('gallery', g)} onError={onError} slug={d.slug || d.title} />
          </Group>
        </div>

        <div className="flex flex-wrap items-center gap-3 border-t border-white/10 px-6 py-4">
          {show && (
            <button type="button" onClick={remove} disabled={!!busy} className="text-sm text-red-300/80 hover:text-red-300 disabled:opacity-40">
              {busy === 'delete' ? '…' : t({ en: 'Delete show', ko: '공연 삭제' })}
            </button>
          )}
          {error && <p className="text-sm text-red-400">{error}</p>}
          <div className="ml-auto flex gap-2">
            <button type="button" onClick={close} className="ska-btn ska-btn-ghost !py-2.5 !text-sm">
              {t({ en: 'Cancel', ko: '취소' })}
            </button>
            <button type="button" onClick={save} disabled={!!busy || !d.title.trim()} className="ska-btn ska-btn-chrome !py-2.5 !text-sm disabled:opacity-40">
              {busy === 'save' ? t({ en: 'Saving…', ko: '저장 중…' }) : t({ en: 'Save', ko: '저장' })}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Group({ title, aside, children }: { title: string; aside?: ReactNode; children: ReactNode }) {
  return (
    <section>
      <div className="mb-5 flex items-center justify-between gap-4 border-b border-white/[0.07] pb-3">
        <h3 className="text-sm font-bold uppercase tracking-[0.2em] text-white/80">{title}</h3>
        {aside}
      </div>
      {children}
    </section>
  );
}

function Field({ label, children, className = '' }: { label: string; children: ReactNode; className?: string }) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-2 block text-xs text-white/50">{label}</span>
      {children}
    </label>
  );
}

/** English input with a Korean twin that auto-translates when the English field loses focus. */
function BiField({
  label,
  value,
  onChange,
  canTranslate,
  translate,
  multiline,
}: {
  label: string;
  value: L;
  onChange: (v: L) => void;
  canTranslate: boolean;
  translate: Translate;
  multiline?: boolean;
}) {
  const { t } = useLang();
  const [busy, setBusy] = useState(false);
  const lastEn = useRef(value.en);
  // once the Korean is typed by hand, don't overwrite it on blur (the ↻ button still can)
  const koEdited = useRef(false);
  const latest = useRef(value);
  latest.current = value;

  const run = async (force: boolean) => {
    const en = latest.current.en.trim();
    if (!canTranslate || !en || busy) return;
    if (!force && (en === lastEn.current.trim() || koEdited.current)) return;
    setBusy(true);
    const ko = await translate([en]);
    setBusy(false);
    if (!ko) return;
    lastEn.current = latest.current.en;
    koEdited.current = false;
    onChange({ en: latest.current.en, ko: ko[0] });
  };

  const Input = multiline ? 'textarea' : 'input';
  const common = `ska-input ${multiline ? 'min-h-[96px] resize-y' : ''}`;

  return (
    <div className="grid gap-2 sm:grid-cols-2">
      <label className="block">
        <span className="mb-2 flex items-center gap-2 text-xs text-white/50">
          {label} <span className="rounded bg-white/10 px-1.5 text-[10px] font-bold">EN</span>
        </span>
        <Input className={common} value={value.en} onChange={(e) => onChange({ ...value, en: e.target.value })} onBlur={() => run(false)} />
      </label>
      <label className="block">
        <span className="mb-2 flex items-center justify-between gap-2 text-xs text-white/50">
          <span className="flex items-center gap-2">
            {label} <span className="rounded bg-white/10 px-1.5 text-[10px] font-bold">KO</span>
            {busy && <span className="animate-pulse text-white/70">{t({ en: 'translating…', ko: '번역 중…' })}</span>}
          </span>
          {canTranslate && value.en.trim() && (
            <button type="button" onClick={() => run(true)} disabled={busy} className="text-[11px] text-white/50 hover:text-white" title={t({ en: 'Translate again', ko: '다시 번역' })}>
              ↻ {t({ en: 'translate', ko: '번역' })}
            </button>
          )}
        </span>
        <Input
          className={`${common} ${busy ? 'opacity-50' : ''}`}
          value={value.ko}
          onChange={(e) => {
            koEdited.current = true;
            onChange({ ...value, ko: e.target.value });
          }}
        />
      </label>
    </div>
  );
}

function useImageDrop(onFile: (f: File) => void) {
  const [over, setOver] = useState(false);
  return {
    over,
    props: {
      onDragOver: (e: React.DragEvent) => {
        e.preventDefault();
        setOver(true);
      },
      onDragLeave: () => setOver(false),
      onDrop: (e: React.DragEvent) => {
        e.preventDefault();
        setOver(false);
        const f = e.dataTransfer.files[0];
        if (f) onFile(f);
      },
    },
  };
}

function PosterField({ draft, onChange, onError }: { draft: Draft; onChange: (url?: string) => void; onError: (m: string) => void }) {
  const { t } = useLang();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);

  const pick = async (file: File) => {
    setBusy(true);
    try {
      const url = await uploadImage(file, `poster-${draft.slug || draft.title}`);
      const img = new Image();
      img.onload = () => setSize({ w: img.naturalWidth, h: img.naturalHeight });
      img.src = url;
      onChange(url);
    } catch (e) {
      onError(
        (e as Error).message === 'type'
          ? t({ en: 'Use JPG, PNG or WebP.', ko: 'JPG, PNG, WebP 파일만 가능합니다.' })
          : (e as Error).message === 'size'
            ? t({ en: `Max ${MAX_MB} MB.`, ko: `최대 ${MAX_MB}MB까지 가능합니다.` })
            : t({ en: 'Upload failed.', ko: '업로드에 실패했습니다.' }),
      );
    }
    setBusy(false);
  };
  const drop = useImageDrop(pick);
  const offRatio = size && Math.abs(size.w / size.h - 2 / 3) > 0.04;

  return (
    <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
      <button
        type="button"
        {...drop.props}
        onClick={() => input.current?.click()}
        className={`group relative w-48 shrink-0 rounded-xl outline-offset-4 ${drop.over ? 'outline-2 outline-white' : 'outline-none'}`}
      >
        <Poster src={draft.poster} brand={brandById(draft.brand)} title={draft.title} edition={draft.edition} />
        <span
          className={`absolute inset-0 flex flex-col items-center justify-center gap-1 rounded-xl bg-black/70 text-xs font-semibold transition ${
            drop.over || busy ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
          }`}
        >
          {busy ? t({ en: 'Uploading…', ko: '업로드 중…' }) : <>⇪ {t({ en: 'Click or drop', ko: '클릭 또는 끌어다 놓기' })}</>}
        </span>
      </button>
      <div className="space-y-3 text-sm text-white/55">
        <p>{t({ en: 'JPG, PNG or WebP up to 10 MB. Portrait 2:3 (e.g. 1200×1800) fits best.', ko: 'JPG·PNG·WebP, 10MB 이하. 세로 2:3 비율(예: 1200×1800)이 가장 잘 맞습니다.' })}</p>
        {size && (
          <p className={offRatio ? 'text-amber-400' : ''}>
            {size.w}×{size.h}px{offRatio && ` · ${t({ en: 'not 2:3 — edges will be cropped', ko: '2:3 비율이 아니어서 가장자리가 잘립니다' })}`}
          </p>
        )}
        <div className="flex gap-2">
          <button type="button" onClick={() => input.current?.click()} className="ska-btn ska-btn-ghost !py-2 !text-xs">
            {draft.poster ? t({ en: 'Replace', ko: '교체' }) : t({ en: 'Upload', ko: '업로드' })}
          </button>
          {draft.poster && (
            <button type="button" onClick={() => (onChange(undefined), setSize(null))} className="ska-btn ska-btn-ghost !py-2 !text-xs text-red-300">
              {t({ en: 'Remove', ko: '삭제' })}
            </button>
          )}
        </div>
      </div>
      <input ref={input} type="file" accept={ACCEPT} hidden onChange={(e) => (e.target.files?.[0] && pick(e.target.files[0]), (e.target.value = ''))} />
    </div>
  );
}

const dayTab = (date: string, lang: 'en' | 'ko') =>
  new Date(`${date}T00:00:00Z`).toLocaleDateString(lang === 'ko' ? 'ko-KR' : 'en-US', { month: 'numeric', day: 'numeric', weekday: 'short', timeZone: 'UTC' });

function LineupEditor({
  lineup,
  days,
  onChange,
  accent,
  onError,
  slug,
}: {
  lineup: Artist[];
  /** show dates (YYYY-MM-DD); more than one gives each day its own lineup */
  days: string[];
  onChange: (l: Artist[]) => void;
  accent: string;
  onError: (m: string) => void;
  slug: string;
}) {
  const { t, lang } = useLang();
  const multi = days.length > 1;
  const [day, setDay] = useState(1);
  const cur = Math.min(day, Math.max(days.length, 1));
  const onDay = (a: Artist) => !multi || artistDay(a, days.length) === cur;
  const shown = lineup.filter(onDay);
  const add = (n: number) =>
    onChange([...lineup, ...Array.from({ length: n }, () => ({ id: newId(), name: '', announced: false, ...(multi && cur > 1 && { day: cur }) }))]);
  const update = (id: string, patch: Partial<Artist>) => onChange(lineup.map((a) => (a.id === id ? { ...a, ...patch } : a)));
  // swap with the neighbour on the same day
  const move = (id: string, dir: -1 | 1) => {
    const i = shown.findIndex((a) => a.id === id);
    const other = shown[i + dir];
    if (!other) return;
    const ai = lineup.findIndex((a) => a.id === id);
    const bi = lineup.findIndex((a) => a.id === other.id);
    const next = [...lineup];
    [next[ai], next[bi]] = [next[bi], next[ai]];
    onChange(next);
  };

  return (
    <div>
      <p className="-mt-2 mb-4 text-xs text-white/45">
        {t({
          en: 'Each row is one card on the show page. “Announced” cards flip to show the name and photo; the rest stay locked as “Coming soon”.',
          ko: '한 줄이 공연 페이지의 카드 한 장입니다. “공개”로 켠 카드는 뒤집으면 이름과 사진이 보이고, 나머지는 “공개 예정”으로 잠겨 있습니다.',
        })}
        {multi &&
          ' ' +
            t({
              en: 'This show runs several days, so each day has its own lineup — pick a day above the list. An artist playing two days is added to both.',
              ko: '여러 날 공연이라 날짜별로 라인업을 따로 입력합니다. 위에서 날짜를 고르세요. 이틀 모두 나오는 아티스트는 각 날짜에 한 번씩 추가하세요.',
            })}
      </p>
      {multi && (
        <div className="mb-4 flex flex-wrap gap-2" role="tablist">
          {days.map((date, n) => {
            const on = n + 1 === cur;
            const count = lineup.filter((a) => artistDay(a, days.length) === n + 1).length;
            return (
              <button
                key={date}
                type="button"
                role="tab"
                aria-selected={on}
                onClick={() => setDay(n + 1)}
                className="rounded-full border px-4 py-2 text-xs font-semibold transition"
                style={{
                  borderColor: on ? accent : 'rgba(255,255,255,.15)',
                  background: on ? `${accent}22` : 'transparent',
                  color: on ? accent : 'rgba(255,255,255,.6)',
                }}
              >
                DAY {n + 1} <span className="font-normal opacity-70">· {dayTab(date, lang)}</span>
                <span className="ml-2 rounded-full bg-white/10 px-1.5 py-0.5 font-mono text-[10px] text-white/70">{count}</span>
              </button>
            );
          })}
        </div>
      )}
      {shown.length === 0 && (
        <p className="rounded-xl border border-dashed border-white/15 px-4 py-8 text-center text-sm text-white/45">
          {multi ? t({ en: `No artists on DAY ${cur} yet.`, ko: `DAY ${cur}에 아직 아티스트가 없습니다.` }) : t({ en: 'No artists yet.', ko: '아직 아티스트가 없습니다.' })}
        </p>
      )}
      <ol className="space-y-2">
        {shown.map((a, i) => (
          <ArtistRow
            key={a.id}
            artist={a}
            index={i}
            total={shown.length}
            accent={accent}
            slug={slug}
            days={multi ? days.length : 0}
            onChange={(p) => update(a.id, p)}
            onMove={(dir) => move(a.id, dir)}
            onRemove={() => onChange(lineup.filter((x) => x.id !== a.id))}
            onError={onError}
          />
        ))}
      </ol>
      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" onClick={() => add(1)} className="ska-btn ska-btn-ghost !py-2 !text-xs">
          + {multi ? t({ en: `Add artist to DAY ${cur}`, ko: `DAY ${cur}에 아티스트 추가` }) : t({ en: 'Add artist', ko: '아티스트 추가' })}
        </button>
        <button type="button" onClick={() => add(5)} className="ska-btn ska-btn-ghost !py-2 !text-xs">
          + {t({ en: '5 TBA slots', ko: '미정 5팀 추가' })}
        </button>
        {shown.length > 0 && (
          <button type="button" onClick={() => onChange(lineup.map((a) => (onDay(a) ? { ...a, announced: true } : a)))} className="ska-btn ska-btn-ghost !py-2 !text-xs">
            {multi ? t({ en: `Announce all on DAY ${cur}`, ko: `DAY ${cur} 전체 공개` }) : t({ en: 'Announce all', ko: '전체 공개' })}
          </button>
        )}
      </div>
    </div>
  );
}

function ArtistRow({
  artist: a,
  index,
  total,
  accent,
  slug,
  days,
  onChange,
  onMove,
  onRemove,
  onError,
}: {
  artist: Artist;
  index: number;
  total: number;
  accent: string;
  slug: string;
  /** number of show days when the lineup is split by day, else 0 */
  days: number;
  onChange: (p: Partial<Artist>) => void;
  onMove: (dir: -1 | 1) => void;
  onRemove: () => void;
  onError: (m: string) => void;
}) {
  const { t } = useLang();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const pick = async (file: File) => {
    setBusy(true);
    try {
      onChange({ photo: await uploadImage(file, `artist-${slug}`) });
    } catch {
      onError(t({ en: 'Photo upload failed (JPG/PNG/WebP, max 10 MB).', ko: '사진 업로드 실패 (JPG/PNG/WebP, 10MB 이하).' }));
    }
    setBusy(false);
  };
  const drop = useImageDrop(pick);

  return (
    <li className="flex flex-wrap items-center gap-3 rounded-xl sm:flex-nowrap border border-white/[0.07] bg-white/[0.02] p-2 pr-3">
      <span className="w-6 text-center font-mono text-xs text-white/35">{String(index + 1).padStart(2, '0')}</span>
      <button
        type="button"
        {...drop.props}
        onClick={() => input.current?.click()}
        className={`relative h-14 w-14 shrink-0 overflow-hidden rounded-lg border bg-black/40 text-[10px] text-white/40 ${drop.over ? 'border-white' : 'border-white/10'}`}
        title={t({ en: 'Click or drop a photo', ko: '사진 클릭 또는 끌어다 놓기' })}
      >
        {a.photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={a.photo} alt="" className="h-full w-full object-cover" />
        ) : busy ? (
          '…'
        ) : (
          '+ ' + t({ en: 'Photo', ko: '사진' })
        )}
      </button>
      <input ref={input} type="file" accept={ACCEPT} hidden onChange={(e) => (e.target.files?.[0] && pick(e.target.files[0]), (e.target.value = ''))} />
      <input
        className="ska-input min-w-[140px] flex-1 !py-2.5"
        value={a.name}
        placeholder={t({ en: 'Artist name (blank = TBA)', ko: '아티스트 이름 (비우면 TBA)' })}
        onChange={(e) => onChange({ name: e.target.value })}
      />
      <button
        type="button"
        onClick={() => onChange({ announced: !a.announced })}
        aria-pressed={a.announced}
        className="flex shrink-0 items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] font-semibold transition"
        style={{
          borderColor: a.announced ? accent : 'rgba(255,255,255,.15)',
          color: a.announced ? accent : 'rgba(255,255,255,.5)',
        }}
      >
        <span className="h-2 w-2 rounded-full" style={{ background: a.announced ? accent : 'rgba(255,255,255,.3)' }} />
        {a.announced ? t({ en: 'Announced', ko: '공개' }) : t({ en: 'Hidden', ko: '비공개' })}
      </button>
      {days > 1 && (
        <select
          className="ska-input !w-auto shrink-0 !py-1.5 !pl-2 !pr-7 !text-[11px] [color-scheme:dark]"
          value={artistDay(a, days)}
          onChange={(e) => onChange({ day: +e.target.value > 1 ? +e.target.value : undefined })}
          aria-label={t({ en: 'Move to day', ko: '날짜 이동' })}
          title={t({ en: 'Move to another day', ko: '다른 날짜로 옮기기' })}
        >
          {Array.from({ length: days }, (_, n) => (
            <option key={n} value={n + 1}>
              DAY {n + 1}
            </option>
          ))}
        </select>
      )}
      <div className="flex shrink-0 flex-col">
        <button type="button" disabled={index === 0} onClick={() => onMove(-1)} className="px-1 text-xs text-white/50 hover:text-white disabled:opacity-20" aria-label="Move up">
          ▲
        </button>
        <button type="button" disabled={index === total - 1} onClick={() => onMove(1)} className="px-1 text-xs text-white/50 hover:text-white disabled:opacity-20" aria-label="Move down">
          ▼
        </button>
      </div>
      {a.photo && (
        <button type="button" onClick={() => onChange({ photo: undefined })} className="shrink-0 text-[11px] text-white/40 hover:text-white" title={t({ en: 'Remove photo', ko: '사진 삭제' })}>
          {t({ en: 'No photo', ko: '사진 X' })}
        </button>
      )}
      <button type="button" onClick={onRemove} className="shrink-0 text-lg text-white/40 hover:text-red-300" aria-label={t({ en: 'Remove artist', ko: '아티스트 삭제' })}>
        ✕
      </button>
    </li>
  );
}

function GalleryEditor({
  gallery,
  onChange,
  onError,
  slug,
  hint,
  cover = true,
  captionPlaceholder,
}: {
  gallery: Photo[];
  onChange: (g: Photo[]) => void;
  onError: (m: string) => void;
  slug: string;
  hint?: L;
  cover?: boolean;
  captionPlaceholder?: L;
}) {
  const { t } = useLang();
  const input = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [over, setOver] = useState(false);
  // uploads finish one at a time; append each result to the newest list
  const latest = useRef(gallery);
  latest.current = gallery;

  const addFiles = async (files: File[]) => {
    const images = files.filter((f) => ACCEPT.split(',').includes(f.type));
    if (images.length < files.length) onError(t({ en: 'Some files were skipped (JPG/PNG/WebP only).', ko: '일부 파일은 건너뛰었습니다 (JPG/PNG/WebP만 가능).' }));
    if (!images.length) return;
    setProgress({ done: 0, total: images.length });
    let failed = 0;
    for (const [i, f] of images.entries()) {
      try {
        const url = await uploadImage(f, cover ? `aftershow-${slug}` : slug);
        const next = [...latest.current, { id: newId(), url }];
        latest.current = next;
        onChange(next);
      } catch {
        failed++;
      }
      setProgress({ done: i + 1, total: images.length });
    }
    setProgress(null);
    if (failed) onError(t({ en: `${failed} photo(s) failed to upload (max 10 MB each).`, ko: `${failed}장 업로드 실패 (장당 최대 10MB).` }));
  };

  const update = (id: string, patch: Partial<Photo>) => onChange(gallery.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= gallery.length) return;
    const next = [...gallery];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };

  return (
    <div>
      <p className="-mt-2 mb-4 text-xs text-white/45">
        {t(
          hint ?? {
            en: 'Photos from the show appear in an “After Show” tab on the show page. Select or drop several at once. The first photo is the cover in History.',
            ko: '공연 현장 사진은 공연 페이지의 “After Show” 탭에 표시됩니다. 여러 장을 한 번에 선택하거나 끌어다 놓을 수 있어요. 첫 번째 사진은 History의 대표 이미지로 쓰입니다.',
          },
        )}
      </p>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          addFiles([...e.dataTransfer.files]);
        }}
        className={`grid grid-cols-2 gap-3 rounded-xl border border-dashed p-3 transition sm:grid-cols-3 ${over ? 'border-white bg-white/[0.05]' : 'border-white/15'}`}
      >
        {gallery.map((p, i) => (
          <div key={p.id} className="group overflow-hidden rounded-lg border border-white/10 bg-black/40">
            <div className="relative aspect-[4/3]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.url} alt="" className="h-full w-full object-cover" />
              {cover && i === 0 && (
                <span className="absolute left-2 top-2 rounded-full bg-white px-2 py-0.5 text-[10px] font-bold text-black">{t({ en: 'Cover', ko: '대표' })}</span>
              )}
              <div className="absolute inset-x-0 top-0 flex justify-end gap-1 p-1.5 opacity-0 transition group-hover:opacity-100">
                <button type="button" disabled={i === 0} onClick={() => move(i, -1)} className="rounded bg-black/70 px-2 py-1 text-xs disabled:opacity-30" aria-label="Move left">
                  ◀
                </button>
                <button type="button" disabled={i === gallery.length - 1} onClick={() => move(i, 1)} className="rounded bg-black/70 px-2 py-1 text-xs disabled:opacity-30" aria-label="Move right">
                  ▶
                </button>
                <button type="button" onClick={() => onChange(gallery.filter((x) => x.id !== p.id))} className="rounded bg-black/70 px-2 py-1 text-xs text-red-300" aria-label="Remove photo">
                  ✕
                </button>
              </div>
            </div>
            <input
              className="w-full bg-transparent px-2.5 py-2 text-xs text-white outline-none placeholder:text-white/30"
              placeholder={t(captionPlaceholder ?? { en: 'Caption (optional)', ko: '설명 (선택)' })}
              value={p.caption ?? ''}
              onChange={(e) => update(p.id, { caption: e.target.value })}
            />
          </div>
        ))}
        <button
          type="button"
          onClick={() => input.current?.click()}
          disabled={!!progress}
          className="flex aspect-[4/3] flex-col items-center justify-center gap-1 rounded-lg border border-white/10 text-xs text-white/50 transition hover:border-white/40 hover:text-white disabled:opacity-60"
        >
          {progress ? (
            <>
              <span className="text-lg">⇪</span>
              {t({ en: 'Uploading', ko: '업로드 중' })} {progress.done}/{progress.total}
              <span className="mt-1 h-1 w-2/3 overflow-hidden rounded-full bg-white/10">
                <span className="block h-full bg-white transition-all" style={{ width: `${(progress.done / progress.total) * 100}%` }} />
              </span>
            </>
          ) : (
            <>
              <span className="text-2xl">+</span>
              {t({ en: 'Add photos', ko: '사진 추가' })}
              <span className="text-[10px] text-white/30">{t({ en: 'or drop files here', ko: '또는 여기로 끌어다 놓기' })}</span>
            </>
          )}
        </button>
      </div>
      <input
        ref={input}
        type="file"
        accept={ACCEPT}
        multiple
        hidden
        onChange={(e) => {
          addFiles([...(e.target.files ?? [])]);
          e.target.value = '';
        }}
      />
    </div>
  );
}
