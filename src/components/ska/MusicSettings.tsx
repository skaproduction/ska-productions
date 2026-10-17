'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import type { SiteSettings } from './data';
import { useLang } from './ui';

type Bgm = NonNullable<SiteSettings['bgm']>;
type Upload = (file: File, prefix: string, onProgress?: (pct: number) => void) => Promise<string>;

const AUDIO_ACCEPT = 'audio/mpeg,audio/mp4,audio/x-m4a,.mp3,.m4a';
const MAX_MB = 15;

/** Admin card for the site's background music: upload, preview at the chosen volume, enable, save. */
export default function MusicSettings({ settings, upload, onToast }: { settings: SiteSettings; upload: Upload; onToast: (m: string) => void }) {
  const { t } = useLang();
  const router = useRouter();
  const saved = settings.bgm;
  const [draft, setDraft] = useState<Bgm | null>(saved ? { ...saved } : null);
  const [progress, setProgress] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [over, setOver] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const audio = useRef<HTMLAudioElement>(null);
  const dirty = JSON.stringify(draft ?? null) !== JSON.stringify(saved ?? null);

  useEffect(() => {
    if (audio.current && draft) audio.current.volume = draft.volume;
  }, [draft?.volume, draft]);

  const pick = async (file?: File) => {
    if (!file) return;
    if (!/\.(mp3|m4a)$/i.test(file.name) && !/^audio\/(mpeg|mp4|x-m4a)$/.test(file.type))
      return onToast(t({ en: 'Use an MP3 or M4A file.', ko: 'MP3 또는 M4A 파일만 가능합니다.' }));
    if (file.size > MAX_MB * 1024 * 1024) return onToast(t({ en: `Max ${MAX_MB} MB.`, ko: `최대 ${MAX_MB}MB까지 가능합니다.` }));
    setProgress(0);
    try {
      const url = await upload(file, 'bgm', setProgress);
      setDraft((d) => ({ url, title: file.name.replace(/\.[^.]+$/, '').slice(0, 80), volume: d?.volume ?? 0.25, enabled: d?.enabled ?? true }));
    } catch {
      onToast(t({ en: 'Upload failed. Try again.', ko: '업로드에 실패했습니다. 다시 시도해주세요.' }));
    }
    setProgress(null);
  };

  const save = async () => {
    setBusy(true);
    const res = await fetch('/api/ska/admin/settings', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ settings: { bgm: draft } }),
    }).catch(() => null);
    setBusy(false);
    if (res?.ok) {
      onToast(t({ en: 'Background music saved', ko: '배경음악이 저장되었습니다' }));
      router.refresh();
    } else onToast(t({ en: 'Could not save. Try again.', ko: '저장하지 못했습니다. 다시 시도해주세요.' }));
  };

  return (
    <section className="mt-10 rounded-2xl border border-white/[0.08] bg-[#0d0d12] p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-white/80">{t({ en: 'Background music', ko: '배경음악' })}</h2>
          <p className="mt-1 text-xs text-white/45">
            {t({
              en: 'Plays softly once a visitor clicks “enter” on the intro; they can switch it off with the music button. MP3/M4A up to 15 MB — a 1–3 minute loop works best. Use music you have the rights to.',
              ko: '방문자가 인트로에서 "입장"을 누르면 잔잔하게 재생되고, 음악 버튼으로 끌 수 있습니다. MP3/M4A, 15MB 이하. 1~3분짜리 반복 곡이 좋습니다. 사용 권한이 있는 음악만 올려주세요.',
            })}
          </p>
        </div>
        {draft && (
          <label className="flex cursor-pointer items-center gap-2 text-xs font-semibold">
            <span className={draft.enabled ? 'text-white' : 'text-white/40'}>{draft.enabled ? t({ en: 'On', ko: '켜짐' }) : t({ en: 'Off', ko: '꺼짐' })}</span>
            <button
              type="button"
              role="switch"
              aria-checked={draft.enabled}
              onClick={() => setDraft({ ...draft, enabled: !draft.enabled })}
              className={`relative h-6 w-11 rounded-full transition ${draft.enabled ? 'bg-emerald-400' : 'bg-white/15'}`}
            >
              <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${draft.enabled ? 'left-[22px]' : 'left-0.5'}`} />
            </button>
          </label>
        )}
      </div>

      {draft ? (
        <div className="mt-5 grid gap-5 lg:grid-cols-[1.2fr_1fr] lg:items-end">
          <div>
            <input
              className="ska-input mb-3"
              value={draft.title ?? ''}
              onChange={(e) => setDraft({ ...draft, title: e.target.value })}
              placeholder={t({ en: 'Track name (for your reference)', ko: '곡 이름 (관리용)' })}
            />
            {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
            <audio ref={audio} src={draft.url} controls loop preload="metadata" className="w-full" />
          </div>
          <div>
            <div className="flex items-baseline justify-between text-sm">
              <span className="text-white/60">{t({ en: 'Volume on the site', ko: '사이트 재생 볼륨' })}</span>
              <span className="font-mono">{Math.round(draft.volume * 100)}%</span>
            </div>
            <input
              type="range"
              min={5}
              max={80}
              value={Math.round(draft.volume * 100)}
              onChange={(e) => setDraft({ ...draft, volume: +e.target.value / 100 })}
              className="ska-range mt-3"
              style={{ '--p': `${((draft.volume * 100 - 5) / 75) * 100}%` } as CSSProperties}
              aria-label={t({ en: 'Volume', ko: '볼륨' })}
            />
            <p className="mt-2 text-[11px] text-white/35">{t({ en: 'The player above previews this volume. 20–30% feels “soft”.', ko: '위 플레이어로 이 볼륨을 미리 들을 수 있어요. 20~30%가 잔잔한 정도예요.' })}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <button type="button" onClick={() => input.current?.click()} disabled={progress !== null} className="ska-btn ska-btn-ghost !py-2 !text-xs">
                {progress !== null ? `${t({ en: 'Uploading', ko: '업로드 중' })} ${Math.round(progress)}%` : t({ en: 'Replace track', ko: '곡 교체' })}
              </button>
              <button type="button" onClick={() => setDraft(null)} className="ska-btn ska-btn-ghost !py-2 !text-xs text-red-300">
                {t({ en: 'Remove', ko: '삭제' })}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => input.current?.click()}
          disabled={progress !== null}
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
          className={`mt-5 flex h-28 w-full flex-col items-center justify-center gap-1 rounded-xl border border-dashed text-sm text-white/55 transition hover:text-white ${
            over ? 'border-white bg-white/[0.05]' : 'border-white/15'
          }`}
        >
          {progress !== null ? (
            <>
              {t({ en: 'Uploading', ko: '업로드 중' })} {Math.round(progress)}%
              <span className="mt-1 h-1 w-40 overflow-hidden rounded-full bg-white/10">
                <span className="block h-full bg-white transition-all" style={{ width: `${progress}%` }} />
              </span>
            </>
          ) : (
            <>
              <span className="text-2xl">♪</span>
              {t({ en: 'Upload background music (MP3/M4A)', ko: '배경음악 올리기 (MP3/M4A)' })}
              <span className="text-[11px] text-white/30">{t({ en: 'click or drop', ko: '클릭 또는 끌어다 놓기' })}</span>
            </>
          )}
        </button>
      )}

      <input ref={input} type="file" accept={AUDIO_ACCEPT} hidden onChange={(e) => (pick(e.target.files?.[0]), (e.target.value = ''))} />

      {dirty && (
        <div className="mt-5 flex items-center justify-end gap-3 border-t border-white/10 pt-4">
          <span className="text-xs text-amber-300/80">{t({ en: 'Unsaved changes', ko: '저장되지 않은 변경 사항' })}</span>
          <button type="button" onClick={() => setDraft(saved ? { ...saved } : null)} className="ska-btn ska-btn-ghost !py-2 !text-xs">
            {t({ en: 'Cancel', ko: '취소' })}
          </button>
          <button type="button" onClick={save} disabled={busy} className="ska-btn ska-btn-chrome !py-2 !text-xs disabled:opacity-40">
            {busy ? t({ en: 'Saving…', ko: '저장 중…' }) : t({ en: 'Save', ko: '저장' })}
          </button>
        </div>
      )}
    </section>
  );
}
