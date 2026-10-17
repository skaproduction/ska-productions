'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import type { SiteSettings, Track } from './data';
import { useLang } from './ui';

type Bgm = NonNullable<SiteSettings['bgm']>;
type Upload = (file: File, prefix: string, onProgress?: (pct: number) => void) => Promise<string>;

const AUDIO_ACCEPT = 'audio/mpeg,audio/mp4,audio/x-m4a,.mp3,.m4a';
const MAX_MB = 15;
const MAX_TRACKS = 20;
const EMPTY: Bgm = { tracks: [], volume: 0.25, enabled: true, shuffle: false };

/** Admin card for the site's background music playlist: upload several tracks, order them, preview, save. */
export default function MusicSettings({ settings, upload, onToast }: { settings: SiteSettings; upload: Upload; onToast: (m: string) => void }) {
  const { t } = useLang();
  const router = useRouter();
  const saved = settings.bgm ?? EMPTY;
  const [draft, setDraft] = useState<Bgm>(() => structuredClone(saved));
  const [uploading, setUploading] = useState<{ name: string; pct: number; left: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const [over, setOver] = useState(false);
  const [previewing, setPreviewing] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const audio = useRef<HTMLAudioElement>(null);
  const dirty = JSON.stringify(draft) !== JSON.stringify(saved);
  const has = draft.tracks.length > 0;

  useEffect(() => {
    if (audio.current) audio.current.volume = draft.volume;
  }, [draft.volume, previewing]);

  const setTracks = (fn: (ts: Track[]) => Track[]) => setDraft((d) => ({ ...d, tracks: fn(d.tracks) }));

  const add = async (list?: FileList | null) => {
    const files = [...(list ?? [])];
    if (!files.length) return;
    const room = MAX_TRACKS - draft.tracks.length;
    if (room <= 0) return onToast(t({ en: `Up to ${MAX_TRACKS} tracks.`, ko: `최대 ${MAX_TRACKS}곡까지 가능합니다.` }));
    const ok = files.filter((f) => /\.(mp3|m4a)$/i.test(f.name) || /^audio\/(mpeg|mp4|x-m4a)$/.test(f.type));
    const fit = ok.filter((f) => f.size <= MAX_MB * 1024 * 1024).slice(0, room);
    if (ok.length < files.length) onToast(t({ en: 'Only MP3 or M4A files were added.', ko: 'MP3 또는 M4A 파일만 추가됩니다.' }));
    else if (fit.length < ok.length) onToast(t({ en: `Some files skipped (max ${MAX_MB} MB, ${MAX_TRACKS} tracks).`, ko: `일부 파일은 제외되었습니다 (곡당 ${MAX_MB}MB, 최대 ${MAX_TRACKS}곡).` }));
    for (const [n, file] of fit.entries()) {
      setUploading({ name: file.name, pct: 0, left: fit.length - n });
      try {
        const url = await upload(file, 'bgm', (pct) => setUploading((u) => u && { ...u, pct }));
        const id = `t${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
        setTracks((ts) => [...ts, { id, url, title: file.name.replace(/\.[^.]+$/, '').slice(0, 80) }]);
      } catch {
        onToast(t({ en: `Upload failed: ${file.name}`, ko: `업로드 실패: ${file.name}` }));
      }
    }
    setUploading(null);
  };

  const move = (i: number, by: number) =>
    setTracks((ts) => {
      const j = i + by;
      if (j < 0 || j >= ts.length) return ts;
      const next = [...ts];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });

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

  const preview = draft.tracks.find((x) => x.id === previewing);

  return (
    <section className="mt-10 rounded-2xl border border-white/[0.08] bg-[#0d0d12] p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-white/80">
            {t({ en: 'Background music', ko: '배경음악' })}
            {has && <span className="ml-2 font-mono text-white/40">{draft.tracks.length}</span>}
          </h2>
          <p className="mt-1 max-w-2xl text-xs text-white/45">
            {t({
              en: 'Plays softly once a visitor clicks “enter” on the intro; when a track ends the next one starts. Visitors can skip or switch it off. MP3/M4A up to 15 MB each, up to 20 tracks. Use music you have the rights to.',
              ko: '방문자가 인트로에서 "입장"을 누르면 잔잔하게 재생되고, 한 곡이 끝나면 다음 곡으로 넘어갑니다. 방문자는 다음 곡으로 넘기거나 끌 수 있어요. MP3/M4A, 곡당 15MB, 최대 20곡. 사용 권한이 있는 음악만 올려주세요.',
            })}
          </p>
        </div>
        {has && (
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

      {has && (
        <div className="mt-5 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
          <div>
            <ol className="space-y-2">
              {draft.tracks.map((tr, i) => (
                <li key={tr.id} className="flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.02] p-2">
                  <span className="w-6 text-center font-mono text-xs text-white/35">{i + 1}</span>
                  <button
                    type="button"
                    onClick={() => setPreviewing(previewing === tr.id ? null : tr.id)}
                    aria-label={previewing === tr.id ? t({ en: 'Stop preview', ko: '미리듣기 정지' }) : t({ en: 'Preview', ko: '미리듣기' })}
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-xs transition ${
                      previewing === tr.id ? 'border-white bg-white text-black' : 'border-white/15 text-white/70 hover:border-white'
                    }`}
                  >
                    {previewing === tr.id ? '■' : '▶'}
                  </button>
                  <input
                    className="ska-input min-w-0 flex-1 !py-1.5 !text-sm"
                    value={tr.title ?? ''}
                    onChange={(e) => setTracks((ts) => ts.map((x) => (x.id === tr.id ? { ...x, title: e.target.value } : x)))}
                    placeholder={t({ en: 'Track name (for your reference)', ko: '곡 이름 (관리용)' })}
                  />
                  <div className="flex shrink-0">
                    <IconBtn label={t({ en: 'Move up', ko: '위로' })} disabled={i === 0} onClick={() => move(i, -1)}>
                      ▲
                    </IconBtn>
                    <IconBtn label={t({ en: 'Move down', ko: '아래로' })} disabled={i === draft.tracks.length - 1} onClick={() => move(i, 1)}>
                      ▼
                    </IconBtn>
                    <IconBtn
                      label={t({ en: 'Remove', ko: '삭제' })}
                      danger
                      onClick={() => {
                        if (previewing === tr.id) setPreviewing(null);
                        setTracks((ts) => ts.filter((x) => x.id !== tr.id));
                      }}
                    >
                      ✕
                    </IconBtn>
                  </div>
                </li>
              ))}
            </ol>
            {preview && (
              // eslint-disable-next-line jsx-a11y/media-has-caption
              <audio
                key={preview.id}
                ref={audio}
                src={preview.url}
                controls
                autoPlay
                preload="metadata"
                onEnded={() => setPreviewing(null)}
                className="mt-3 w-full"
              />
            )}
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
            <p className="mt-2 text-[11px] text-white/35">{t({ en: 'Previews play at this volume. 20–30% feels “soft”.', ko: '미리듣기도 이 볼륨으로 재생돼요. 20~30%가 잔잔한 정도예요.' })}</p>

            <div className="mt-5 text-sm text-white/60">{t({ en: 'Play order', ko: '재생 방식' })}</div>
            <div className="mt-2 grid grid-cols-2 gap-2" role="radiogroup">
              {[
                { v: false, en: 'In order', ko: '순서대로', sub: { en: '1 → 2 → … → 1', ko: '1번부터 차례로 반복' } },
                { v: true, en: 'Shuffle', ko: '랜덤', sub: { en: 'Mixed for each visitor', ko: '방문자마다 섞어서' } },
              ].map((o) => (
                <button
                  key={String(o.v)}
                  type="button"
                  role="radio"
                  aria-checked={draft.shuffle === o.v}
                  onClick={() => setDraft({ ...draft, shuffle: o.v })}
                  className={`rounded-xl border px-3 py-2.5 text-left transition ${
                    draft.shuffle === o.v ? 'border-white bg-white/[0.07]' : 'border-white/10 text-white/55 hover:border-white/30'
                  }`}
                >
                  <span className="block text-sm font-semibold">{t(o)}</span>
                  <span className="block text-[11px] text-white/40">{t(o.sub)}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => input.current?.click()}
        disabled={!!uploading || draft.tracks.length >= MAX_TRACKS}
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          if (!uploading) add(e.dataTransfer.files);
        }}
        className={`mt-5 flex w-full flex-col items-center justify-center gap-1 rounded-xl border border-dashed text-sm text-white/55 transition hover:text-white disabled:opacity-60 ${
          has ? 'h-20' : 'h-28'
        } ${over ? 'border-white bg-white/[0.05]' : 'border-white/15'}`}
      >
        {uploading ? (
          <>
            <span className="max-w-[90%] truncate">
              {t({ en: 'Uploading', ko: '업로드 중' })} {uploading.name} · {Math.round(uploading.pct)}%
              {uploading.left > 1 && <span className="text-white/35"> (+{uploading.left - 1})</span>}
            </span>
            <span className="mt-1 h-1 w-40 overflow-hidden rounded-full bg-white/10">
              <span className="block h-full bg-white transition-all" style={{ width: `${uploading.pct}%` }} />
            </span>
          </>
        ) : (
          <>
            {!has && <span className="text-2xl">♪</span>}
            {has ? t({ en: '+ Add tracks (MP3/M4A)', ko: '+ 곡 추가 (MP3/M4A)' }) : t({ en: 'Upload background music (MP3/M4A)', ko: '배경음악 올리기 (MP3/M4A)' })}
            <span className="text-[11px] text-white/30">{t({ en: 'click or drop — several at once is fine', ko: '클릭 또는 끌어다 놓기 · 여러 곡 한 번에 가능' })}</span>
          </>
        )}
      </button>

      <input ref={input} type="file" accept={AUDIO_ACCEPT} multiple hidden onChange={(e) => (add(e.target.files), (e.target.value = ''))} />

      {dirty && (
        <div className="mt-5 flex items-center justify-end gap-3 border-t border-white/10 pt-4">
          <span className="text-xs text-amber-300/80">{t({ en: 'Unsaved changes', ko: '저장되지 않은 변경 사항' })}</span>
          <button
            type="button"
            onClick={() => {
              setPreviewing(null);
              setDraft(structuredClone(saved));
            }}
            className="ska-btn ska-btn-ghost !py-2 !text-xs"
          >
            {t({ en: 'Cancel', ko: '취소' })}
          </button>
          <button type="button" onClick={save} disabled={busy || !!uploading} className="ska-btn ska-btn-chrome !py-2 !text-xs disabled:opacity-40">
            {busy ? t({ en: 'Saving…', ko: '저장 중…' }) : t({ en: 'Save', ko: '저장' })}
          </button>
        </div>
      )}
    </section>
  );
}

function IconBtn({ label, onClick, disabled, danger, children }: { label: string; onClick: () => void; disabled?: boolean; danger?: boolean; children: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={`flex h-8 w-8 items-center justify-center rounded-lg text-[11px] transition hover:bg-white/10 disabled:opacity-20 disabled:hover:bg-transparent ${
        danger ? 'text-red-300' : 'text-white/60'
      }`}
    >
      {children}
    </button>
  );
}
