'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { findBySlug, isPast, videoSrc, type L, type Notice, type Show, type SiteSettings } from './data';
import { useLang } from './ui';
import { VideoField } from './Video';

const MAX = 12;
const empty = (): L => ({ en: '', ko: '' });
const newId = () => `n${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
// in the editor an uploaded video keeps its URL and a YouTube video shows as a link
const toDraft = (ns: Notice[] = []) =>
  ns.map((n) => {
    const v = videoSrc(n.video);
    return { ...n, video: !v ? '' : 'file' in v ? v.file : `https://youtu.be/${v.youtube}` };
  });

type Upload = (file: File, prefix: string, onProgress?: (pct: number) => void) => Promise<string>;

/** Admin card for the homepage news pop-up: video notices open first, text notices follow as a NEWS card. */
export default function NoticeSettings({ settings, shows, upload, onToast }: { settings: SiteSettings; shows: Show[]; upload: Upload; onToast: (m: string) => void }) {
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
    const bad = list.find((n) => n.kind === 'video' && !videoSrc(n.video));
    if (bad) return onToast(t({ en: 'A video notice needs a video — upload one or paste a YouTube link.', ko: '영상 공지에는 영상이 필요해요. 파일을 올리거나 유튜브 링크를 넣어주세요.' }));
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
  const upcoming = shows.filter((s) => !isPast(s));
  const past = shows.filter((s) => isPast(s)).reverse();
  const name = (s: Show) => `${s.title} ${s.edition}`.trim();
  // picking a show fills in an empty title with the show's name
  const pickShow = (n: Notice, slug: string) => {
    const s = shows.find((x) => x.slug === slug);
    const emptyTitle = !n.title.en.trim() && !n.title.ko.trim();
    update(n.id, { show: slug || undefined, ...(s && emptyTitle && { title: { en: name(s), ko: name(s) } }) });
  };

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
                  <VideoField value={n.video ?? ''} onChange={(v) => update(n.id, { video: v })} upload={upload} prefix={`news-${n.id}`} onError={onToast} />
                )}
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <span className="shrink-0 text-xs text-white/55 sm:w-24">{t({ en: 'About show', ko: '관련 공연' })}</span>
                  <select className="ska-input flex-1 [color-scheme:dark]" value={findBySlug(shows, n.show)?.slug ?? n.show ?? ''} onChange={(e) => pickShow(n, e.target.value)}>
                    <option value="">{t({ en: '— none —', ko: '— 선택 안 함 —' })}</option>
                    {upcoming.length > 0 && (
                      <optgroup label={t({ en: 'Upcoming', ko: '예정 공연' })}>
                        {upcoming.map((s) => (
                          <option key={s.slug} value={s.slug}>
                            {name(s)}
                            {s.ticketUrl ? ' 🎟' : ''}
                          </option>
                        ))}
                      </optgroup>
                    )}
                    {past.length > 0 && (
                      <optgroup label={t({ en: 'Past', ko: '지난 공연' })}>
                        {past.map((s) => (
                          <option key={s.slug} value={s.slug}>
                            {name(s)}
                          </option>
                        ))}
                      </optgroup>
                    )}
                  </select>
                </div>
                {n.show &&
                  (() => {
                    const s = findBySlug(shows, n.show);
                    if (!s) return <p className="-mt-1 text-xs text-amber-300">{t({ en: 'That show was deleted — pick another.', ko: '삭제된 공연이에요. 다시 골라주세요.' })}</p>;
                    return (
                      <p className="-mt-1 text-xs text-white/45">
                        {t({ en: 'Adds a “See the show” button', ko: '"공연 보기" 버튼이 붙어요' })}
                        {!isPast(s) &&
                          (s.ticketUrl
                            ? t({ en: ' and “Buy tickets”.', ko: ' + "티켓 예매" 버튼도 붙어요.' })
                            : t({ en: '. No ticket link yet — add one in that show’s editor (Tickets).', ko: '. 티켓 링크는 아직 없어요 — 공연 편집의 "티켓 예매" 칸에서 넣으세요.' }))}
                      </p>
                    );
                  })()}
                <Pair label={t({ en: 'Title', ko: '제목' })} value={n.title} onChange={(v) => update(n.id, { title: v })} />
                <Pair label={t({ en: 'Text (optional)', ko: '내용 (선택)' })} value={n.body ?? empty()} onChange={(v) => update(n.id, { body: v })} multiline />
                <div className="grid gap-3 sm:grid-cols-[1.4fr_1fr_1fr_auto]">
                  <input
                    className="ska-input"
                    value={n.link ?? ''}
                    onChange={(e) => update(n.id, { link: e.target.value })}
                    placeholder={t({ en: 'Extra button link (optional) — https://…', ko: '추가 버튼 링크 (선택) — https://…' })}
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
