'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { youtubeId, type L, type Notice, type SiteSettings } from './data';
import { useLang } from './ui';
import { youtubeThumb } from './Video';

const MAX = 12;
const empty = (): L => ({ en: '', ko: '' });
const newId = () => `n${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
// in the editor a video is kept as the link that was pasted
const toDraft = (ns: Notice[] = []) => ns.map((n) => ({ ...n, video: n.video ? `https://youtu.be/${n.video}` : '' }));

/** Admin card for the homepage news pop-up: video notices open first, text notices follow as a NEWS card. */
export default function NoticeSettings({ settings, onToast }: { settings: SiteSettings; onToast: (m: string) => void }) {
  const { t } = useLang();
  const router = useRouter();
  const saved = toDraft(settings.notices);
  const [list, setList] = useState(() => structuredClone(saved));
  const [busy, setBusy] = useState(false);
  const dirty = JSON.stringify(list) !== JSON.stringify(saved);

  const update = (id: string, patch: Partial<Notice>) => setList((l) => l.map((n) => (n.id === id ? { ...n, ...patch } : n)));
  const add = (kind: Notice['kind']) =>
    setList((l) => (l.length >= MAX ? l : [...l, { id: newId(), kind, title: empty(), body: empty(), video: '', link: '', linkLabel: empty(), on: true }]));
  const move = (i: number, by: number) =>
    setList((l) => {
      const j = i + by;
      if (j < 0 || j >= l.length) return l;
      const next = [...l];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });

  const save = async () => {
    const bad = list.find((n) => n.kind === 'video' && !youtubeId(n.video));
    if (bad) return onToast(t({ en: 'A video notice needs a YouTube link.', ko: '영상 공지에는 유튜브 링크가 필요해요.' }));
    setBusy(true);
    const res = await fetch('/api/ska/admin/settings', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ settings: { notices: list } }),
    }).catch(() => null);
    setBusy(false);
    if (res?.ok) {
      onToast(t({ en: 'News saved', ko: '공지가 저장되었습니다' }));
      router.refresh();
    } else onToast(t({ en: 'Could not save. Try again.', ko: '저장하지 못했습니다. 다시 시도해주세요.' }));
  };

  const on = list.filter((n) => n.on).length;

  return (
    <section className="mt-10 rounded-2xl border border-white/[0.08] bg-[#0d0d12] p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-white/80">
            {t({ en: 'Homepage news', ko: '홈페이지 공지 · 소식' })}
            {list.length > 0 && (
              <span className="ml-2 font-mono text-white/40">
                {on}/{list.length} {t({ en: 'on', ko: '켜짐' })}
              </span>
            )}
          </h2>
          <p className="mt-1 max-w-2xl text-xs text-white/45">
            {t({
              en: 'Pops up when someone opens the homepage (after the intro). Video notices open first as a big player; text notices then slide in as a NEWS card. Each visitor sees them once per visit and can hide them for the day.',
              ko: '홈페이지에 들어오면 인트로가 끝난 뒤 바로 뜹니다. 영상 공지가 먼저 크게 뜨고, 그다음 글 공지가 NEWS 카드로 나와요. 방문할 때마다 한 번 보여주고, 방문자가 "오늘 하루 보지 않기"를 고를 수 있어요.',
            })}
          </p>
        </div>
        <a href="/?intro&news" target="_blank" rel="noopener" className="ska-btn ska-btn-ghost !py-2 !text-xs">
          {t({ en: 'Preview on the site', ko: '사이트에서 미리보기' })} ↗
        </a>
      </div>

      {list.length === 0 && (
        <p className="mt-5 rounded-xl border border-dashed border-white/15 px-4 py-8 text-center text-sm text-white/45">{t({ en: 'No news yet.', ko: '아직 공지가 없습니다.' })}</p>
      )}

      <ol className="mt-5 space-y-4">
        {list.map((n, i) => {
          const vid = youtubeId(n.video);
          return (
            <li key={n.id} className={`rounded-xl border border-white/[0.08] p-4 transition ${n.on ? 'bg-white/[0.02]' : 'opacity-55'}`}>
              <div className="flex flex-wrap items-center gap-2">
                <span className="w-6 font-mono text-xs text-white/35">{i + 1}</span>
                <div className="flex rounded-full border border-white/15 p-0.5 text-xs">
                  {(['video', 'notice'] as const).map((k) => (
                    <button
                      key={k}
                      type="button"
                      onClick={() => update(n.id, { kind: k })}
                      className={`rounded-full px-3 py-1 font-semibold transition ${n.kind === k ? 'bg-white text-black' : 'text-white/60 hover:text-white'}`}
                    >
                      {k === 'video' ? `▶ ${t({ en: 'Video', ko: '영상' })}` : `✎ ${t({ en: 'Notice', ko: '공지' })}`}
                    </button>
                  ))}
                </div>
                <label className="ml-auto flex cursor-pointer items-center gap-2 text-xs font-semibold">
                  <span className={n.on ? 'text-white' : 'text-white/40'}>{n.on ? t({ en: 'On', ko: '켜짐' }) : t({ en: 'Off', ko: '꺼짐' })}</span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={n.on}
                    onClick={() => update(n.id, { on: !n.on })}
                    className={`relative h-6 w-11 rounded-full transition ${n.on ? 'bg-emerald-400' : 'bg-white/15'}`}
                  >
                    <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${n.on ? 'left-[22px]' : 'left-0.5'}`} />
                  </button>
                </label>
                <div className="flex">
                  <Icon label={t({ en: 'Move up', ko: '위로' })} disabled={i === 0} onClick={() => move(i, -1)}>
                    ▲
                  </Icon>
                  <Icon label={t({ en: 'Move down', ko: '아래로' })} disabled={i === list.length - 1} onClick={() => move(i, 1)}>
                    ▼
                  </Icon>
                  <Icon label={t({ en: 'Delete', ko: '삭제' })} danger onClick={() => setList((l) => l.filter((x) => x.id !== n.id))}>
                    ✕
                  </Icon>
                </div>
              </div>

              <div className="mt-4 grid gap-3">
                {n.kind === 'video' && (
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                    <input
                      className="ska-input flex-1"
                      value={n.video ?? ''}
                      onChange={(e) => update(n.id, { video: e.target.value })}
                      placeholder={t({ en: 'YouTube link', ko: '유튜브 링크' }) + ' — https://www.youtube.com/watch?v=…'}
                      inputMode="url"
                    />
                    {vid ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={youtubeThumb(vid)} alt="" className="h-12 w-20 shrink-0 rounded-lg object-cover ring-1 ring-white/15" />
                    ) : (
                      n.video && <span className="text-xs text-amber-300">{t({ en: 'Not a YouTube link', ko: '유튜브 링크가 아니에요' })}</span>
                    )}
                  </div>
                )}
                <Pair label={t({ en: 'Title', ko: '제목' })} value={n.title} onChange={(v) => update(n.id, { title: v })} />
                <Pair label={t({ en: 'Text (optional)', ko: '내용 (선택)' })} value={n.body ?? empty()} onChange={(v) => update(n.id, { body: v })} multiline />
                <div className="grid gap-3 sm:grid-cols-[1.4fr_1fr_1fr_auto]">
                  <input
                    className="ska-input"
                    value={n.link ?? ''}
                    onChange={(e) => update(n.id, { link: e.target.value })}
                    placeholder={t({ en: 'Button link (optional) — https://… or /shows/…', ko: '버튼 링크 (선택) — https://… 또는 /shows/…' })}
                  />
                  <input
                    className="ska-input"
                    value={n.linkLabel?.en ?? ''}
                    onChange={(e) => update(n.id, { linkLabel: { ...(n.linkLabel ?? empty()), en: e.target.value } })}
                    placeholder={t({ en: 'Button text (EN)', ko: '버튼 글자 (영어)' })}
                  />
                  <input
                    className="ska-input"
                    value={n.linkLabel?.ko ?? ''}
                    onChange={(e) => update(n.id, { linkLabel: { ...(n.linkLabel ?? empty()), ko: e.target.value } })}
                    placeholder={t({ en: 'Button text (KO)', ko: '버튼 글자 (한국어)' })}
                  />
                  <label className="flex items-center gap-2 text-xs text-white/55">
                    {t({ en: 'Last day', ko: '마지막 날' })}
                    <input
                      type="date"
                      className="ska-input !w-auto !py-2 [color-scheme:dark]"
                      value={n.until ?? ''}
                      onChange={(e) => update(n.id, { until: e.target.value || undefined })}
                    />
                  </label>
                </div>
              </div>
            </li>
          );
        })}
      </ol>

      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" onClick={() => add('video')} disabled={list.length >= MAX} className="ska-btn ska-btn-ghost !py-2 !text-xs disabled:opacity-40">
          + ▶ {t({ en: 'Add video', ko: '영상 추가' })}
        </button>
        <button type="button" onClick={() => add('notice')} disabled={list.length >= MAX} className="ska-btn ska-btn-ghost !py-2 !text-xs disabled:opacity-40">
          + ✎ {t({ en: 'Add notice', ko: '공지 추가' })}
        </button>
      </div>

      {dirty && (
        <div className="mt-5 flex items-center justify-end gap-3 border-t border-white/10 pt-4">
          <span className="text-xs text-amber-300/80">{t({ en: 'Unsaved changes', ko: '저장되지 않은 변경 사항' })}</span>
          <button type="button" onClick={() => setList(structuredClone(saved))} className="ska-btn ska-btn-ghost !py-2 !text-xs">
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

function Pair({ label, value, onChange, multiline }: { label: string; value: L; onChange: (v: L) => void; multiline?: boolean }) {
  const Input = multiline ? 'textarea' : 'input';
  const cls = `ska-input ${multiline ? 'min-h-[72px] resize-y' : ''}`;
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      <Input className={cls} value={value.en} onChange={(e) => onChange({ ...value, en: e.target.value })} placeholder={`${label} — English`} />
      <Input className={cls} value={value.ko} onChange={(e) => onChange({ ...value, ko: e.target.value })} placeholder={`${label} — 한국어`} />
    </div>
  );
}

function Icon({ label, onClick, disabled, danger, children }: { label: string; onClick: () => void; disabled?: boolean; danger?: boolean; children: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={`flex h-8 w-8 items-center justify-center rounded-lg text-[11px] transition hover:bg-white/10 disabled:opacity-20 ${danger ? 'text-red-300' : 'text-white/60'}`}
    >
      {children}
    </button>
  );
}
