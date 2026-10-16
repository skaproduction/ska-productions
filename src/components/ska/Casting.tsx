'use client';

import { useState, type CSSProperties } from 'react';
import type { L } from './data';
import { Arrow, Reveal, useLang } from './ui';

const GENRES: { id: string; label: L; icon: string }[] = [
  { id: 'idol', label: { en: 'K-POP Idol', ko: 'K-POP 아이돌' }, icon: '✦' },
  { id: 'band', label: { en: 'Band / Rock', ko: '밴드 / 록' }, icon: '◉' },
  { id: 'hiphop', label: { en: 'Hip-Hop / R&B', ko: '힙합 / R&B' }, icon: '▲' },
  { id: 'solo', label: { en: 'Solo Vocalist', ko: '솔로 보컬' }, icon: '◆' },
  { id: 'dj', label: { en: 'DJ / Producer', ko: 'DJ / 프로듀서' }, icon: '◐' },
  { id: 'actor', label: { en: 'Actor / Host', ko: '배우 / MC' }, icon: '★' },
];

const EVENTS: { id: string; label: L }[] = [
  { id: 'festival', label: { en: 'Festival', ko: '페스티벌' } },
  { id: 'concert', label: { en: 'Concert / Tour', ko: '콘서트 / 투어' } },
  { id: 'fanmeet', label: { en: 'Fan Meeting', ko: '팬미팅' } },
  { id: 'brand', label: { en: 'Brand / Corporate', ko: '브랜드 / 기업 행사' } },
  { id: 'tv', label: { en: 'TV / Award Show', ko: '방송 / 시상식' } },
  { id: 'other', label: { en: 'Other', ko: '기타' } },
];

// Venue types by audience size; `cap` doubles as the quick-pick preset.
const SCALE = [
  { cap: 500, label: { en: 'Club', ko: '클럽' } },
  { cap: 2000, label: { en: 'Hall', ko: '홀' } },
  { cap: 10000, label: { en: 'Arena', ko: '아레나' } },
  { cap: 30000, label: { en: 'Stadium', ko: '스타디움' } },
  { cap: 60000, label: { en: 'Festival ground', ko: '페스티벌 부지' } },
];
const MIN_AUDIENCE = 50;
const MAX_AUDIENCE = 100000;
const venueFor = (n: number) => SCALE.find((s, i) => n < (SCALE[i + 1]?.cap ?? Infinity) * 0.6 || i === SCALE.length - 1)!;
// the slider is logarithmic so 300 and 30,000 are both easy to reach
const toSlider = (n: number) => Math.round((Math.log(n / MIN_AUDIENCE) / Math.log(MAX_AUDIENCE / MIN_AUDIENCE)) * 1000);
const fromSlider = (v: number) => {
  const raw = MIN_AUDIENCE * Math.pow(MAX_AUDIENCE / MIN_AUDIENCE, v / 1000);
  const step = raw < 1000 ? 50 : raw < 10000 ? 500 : 1000;
  return Math.round(raw / step) * step;
};

const STEPS: L[] = [
  { en: 'Artists', ko: '아티스트' },
  { en: 'Event', ko: '행사' },
  { en: 'Where & when', ko: '장소 · 일정' },
  { en: 'Contact', ko: '연락처' },
];

type Form = {
  genres: string[];
  event: string;
  audience: number;
  country: string;
  city: string;
  date: string;
  artists: string;
  name: string;
  company: string;
  email: string;
  message: string;
};

const EMPTY: Form = {
  genres: [],
  event: '',
  audience: 2000,
  country: '',
  city: '',
  date: '',
  artists: '',
  name: '',
  company: '',
  email: '',
  message: '',
};

export default function Casting() {
  const { t, lang } = useLang();
  const [step, setStep] = useState(0);
  const [f, setF] = useState<Form>(EMPTY);
  const [state, setState] = useState<'idle' | 'sending' | 'done' | 'error'>('idle');
  const set = <K extends keyof Form>(k: K, v: Form[K]) => setF((p) => ({ ...p, [k]: v }));

  const valid = [
    f.genres.length > 0,
    !!f.event,
    !!f.country.trim(),
    !!f.name.trim() && /\S+@\S+\.\S+/.test(f.email),
  ];

  const submit = async () => {
    setState('sending');
    try {
      const res = await fetch('/api/ska-inquiry', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ ...f, capacity: f.audience, lang }),
      });
      setState(res.ok ? 'done' : 'error');
    } catch {
      setState('error');
    }
  };

  const labelOf = (list: { id: string; label: L }[], id: string) => list.find((x) => x.id === id)?.label;

  return (
    <section id="casting" className="relative scroll-mt-20 overflow-hidden px-5 py-20 sm:px-8 sm:py-36">
      <div aria-hidden className="pointer-events-none absolute -right-40 top-20 h-[600px] w-[600px] rounded-full bg-white/[0.04] blur-3xl" />
      <div className="relative mx-auto max-w-7xl">
        <Reveal className="max-w-3xl">
          <p className="ska-eyebrow">03 — {t({ en: 'Artist Casting', ko: '아티스트 캐스팅' })}</p>
          <h2 className="ska-display mt-4 text-[clamp(40px,7vw,96px)] leading-[0.9]">
            {t({ en: 'Want Korean artists', ko: '당신의 무대에' })}
            <br />
            <span className="ska-chrome-text">{t({ en: 'on your stage?', ko: '한국 아티스트를.' })}</span>
          </h2>
          <p className="mt-6 text-white/60 sm:text-lg">
            {t({
              en: 'K-POP idols, bands, hip-hop artists, actors — tell us what you’re planning and our booking team will come back with options.',
              ko: 'K-POP 아이돌, 밴드, 힙합 아티스트, 배우까지. 계획 중인 행사를 알려주시면 부킹팀이 가능한 옵션을 제안드립니다.',
            })}
          </p>
        </Reveal>

        <Reveal delay={120} className="mt-14 grid gap-6 lg:grid-cols-[1fr_380px]">
          {/* builder */}
          <div className="rounded-3xl border border-white/[0.08] bg-[#0d0d12]/80 p-6 backdrop-blur sm:p-10">
            {state === 'done' ? (
              <Done onReset={() => { setF(EMPTY); setStep(0); setState('idle'); }} />
            ) : (
              <>
                <ol className="flex gap-2">
                  {STEPS.map((s, i) => (
                    <li key={i} className="flex-1">
                      <button
                        onClick={() => i <= step || valid.slice(0, i).every(Boolean) ? setStep(i) : null}
                        className="w-full text-left"
                      >
                        <span className="block h-1 overflow-hidden rounded-full bg-white/10">
                          <span
                            className="block h-full bg-white transition-all duration-500"
                            style={{ width: i < step ? '100%' : i === step ? '50%' : '0%' }}
                          />
                        </span>
                        <span className={`mt-2 hidden text-xs sm:block ${i === step ? 'text-white' : 'text-white/40'}`}>
                          {String(i + 1).padStart(2, '0')} {t(s)}
                        </span>
                      </button>
                    </li>
                  ))}
                </ol>

                <div key={step} className="mt-10 min-h-[320px] animate-[ska-in_.5s_ease]">
                  {step === 0 && (
                    <Q title={t({ en: 'What kind of artists are you looking for?', ko: '어떤 아티스트를 찾고 계신가요?' })} hint={t({ en: 'Pick as many as you like.', ko: '복수 선택 가능' })}>
                      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                        {GENRES.map((g) => {
                          const on = f.genres.includes(g.id);
                          return (
                            <button
                              key={g.id}
                              onClick={() => set('genres', on ? f.genres.filter((x) => x !== g.id) : [...f.genres, g.id])}
                              aria-pressed={on}
                              className={`group relative flex h-28 flex-col justify-between overflow-hidden rounded-2xl border p-4 text-left transition ${
                                on ? 'border-white bg-white text-black' : 'border-white/10 hover:border-white/40'
                              }`}
                            >
                              <span className={`text-2xl transition-transform group-hover:scale-125 ${on ? '' : 'text-white/50'}`}>{g.icon}</span>
                              <span className="text-sm font-semibold">{t(g.label)}</span>
                              {on && <span className="absolute right-3 top-3 text-xs">✓</span>}
                            </button>
                          );
                        })}
                      </div>
                      <input
                        className="ska-input mt-4"
                        placeholder={t({ en: 'Specific artists in mind? (optional)', ko: '원하는 특정 아티스트가 있다면 (선택)' })}
                        value={f.artists}
                        onChange={(e) => set('artists', e.target.value)}
                      />
                    </Q>
                  )}

                  {step === 1 && (
                    <Q title={t({ en: 'What’s the occasion?', ko: '어떤 행사인가요?' })}>
                      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                        {EVENTS.map((e) => (
                          <button
                            key={e.id}
                            onClick={() => set('event', e.id)}
                            aria-pressed={f.event === e.id}
                            className={`rounded-2xl border px-4 py-5 text-left text-sm font-semibold transition ${
                              f.event === e.id ? 'border-white bg-white text-black' : 'border-white/10 hover:border-white/40'
                            }`}
                          >
                            {t(e.label)}
                          </button>
                        ))}
                      </div>
                      <div className="mt-10">
                        <div className="flex flex-wrap items-end justify-between gap-3">
                          <label htmlFor="ska-audience" className="text-sm text-white/60">
                            {t({ en: 'Expected audience', ko: '예상 관객 규모' })}
                          </label>
                          <div className="flex items-center gap-2">
                            <div className="flex items-center rounded-xl border border-white/15 bg-white/[0.04] focus-within:border-white/50">
                              <button
                                type="button"
                                onClick={() => set('audience', Math.max(MIN_AUDIENCE, f.audience - (f.audience > 10000 ? 1000 : f.audience > 1000 ? 500 : 50)))}
                                className="h-11 w-10 text-lg text-white/60 hover:text-white"
                                aria-label={t({ en: 'Fewer', ko: '줄이기' })}
                              >
                                −
                              </button>
                              <input
                                id="ska-audience"
                                type="text"
                                inputMode="numeric"
                                value={f.audience.toLocaleString()}
                                onChange={(e) => {
                                  const n = Number(e.target.value.replace(/[^0-9]/g, ''));
                                  set('audience', Math.min(MAX_AUDIENCE * 5, n));
                                }}
                                onBlur={() => set('audience', Math.max(MIN_AUDIENCE, f.audience))}
                                className="ska-display w-28 bg-transparent text-center text-3xl outline-none"
                              />
                              <button
                                type="button"
                                onClick={() => set('audience', f.audience + (f.audience >= 10000 ? 1000 : f.audience >= 1000 ? 500 : 50))}
                                className="h-11 w-10 text-lg text-white/60 hover:text-white"
                                aria-label={t({ en: 'More', ko: '늘리기' })}
                              >
                                +
                              </button>
                            </div>
                            <span className="text-sm text-white/50">{t({ en: 'people', ko: '명' })}</span>
                          </div>
                        </div>
                        <input
                          type="range"
                          min={0}
                          max={1000}
                          value={toSlider(Math.min(MAX_AUDIENCE, Math.max(MIN_AUDIENCE, f.audience)))}
                          onChange={(e) => set('audience', fromSlider(+e.target.value))}
                          className="ska-range mt-5"
                          style={{ '--p': `${toSlider(Math.min(MAX_AUDIENCE, Math.max(MIN_AUDIENCE, f.audience))) / 10}%` } as CSSProperties}
                          aria-label={t({ en: 'Audience size', ko: '관객 규모' })}
                        />
                        <div className="mt-4 flex flex-wrap gap-2">
                          {SCALE.map((s) => {
                            const on = venueFor(f.audience) === s;
                            return (
                              <button
                                key={s.cap}
                                type="button"
                                onClick={() => set('audience', s.cap)}
                                className={`rounded-full border px-3 py-1.5 text-xs transition ${on ? 'border-white bg-white text-black' : 'border-white/15 text-white/60 hover:text-white'}`}
                              >
                                {t(s.label)} · {s.cap.toLocaleString()}
                              </button>
                            );
                          })}
                        </div>
                        <Crowd n={f.audience} />
                      </div>
                    </Q>
                  )}

                  {step === 2 && (
                    <Q title={t({ en: 'Where and when?', ko: '어디서, 언제인가요?' })}>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <Field label={t({ en: 'Country *', ko: '국가 *' })}>
                          <input className="ska-input" value={f.country} onChange={(e) => set('country', e.target.value)} placeholder="Taiwan, Japan, USA…" />
                        </Field>
                        <Field label={t({ en: 'City', ko: '도시' })}>
                          <input className="ska-input" value={f.city} onChange={(e) => set('city', e.target.value)} />
                        </Field>
                        <Field label={t({ en: 'Target date', ko: '희망 일정' })}>
                          <input type="month" className="ska-input [color-scheme:dark]" value={f.date} onChange={(e) => set('date', e.target.value)} />
                        </Field>
                      </div>
                      <div className="mt-6 flex flex-wrap gap-2">
                        {['Taiwan', 'Japan', 'Hong Kong', 'Thailand', 'USA', 'Europe'].map((c) => (
                          <button
                            key={c}
                            onClick={() => set('country', c)}
                            className={`rounded-full border px-3 py-1.5 text-xs transition ${f.country === c ? 'border-white bg-white text-black' : 'border-white/15 text-white/60 hover:text-white'}`}
                          >
                            {c}
                          </button>
                        ))}
                      </div>
                    </Q>
                  )}

                  {step === 3 && (
                    <Q title={t({ en: 'How do we reach you?', ko: '연락처를 남겨주세요' })}>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <Field label={t({ en: 'Name *', ko: '이름 *' })}>
                          <input className="ska-input" value={f.name} onChange={(e) => set('name', e.target.value)} autoComplete="name" />
                        </Field>
                        <Field label={t({ en: 'Company', ko: '회사' })}>
                          <input className="ska-input" value={f.company} onChange={(e) => set('company', e.target.value)} autoComplete="organization" />
                        </Field>
                        <Field label={t({ en: 'Email *', ko: '이메일 *' })} className="sm:col-span-2">
                          <input type="email" className="ska-input" value={f.email} onChange={(e) => set('email', e.target.value)} autoComplete="email" />
                        </Field>
                        <Field label={t({ en: 'Anything else?', ko: '추가 내용' })} className="sm:col-span-2">
                          <textarea rows={3} className="ska-input resize-none" value={f.message} onChange={(e) => set('message', e.target.value)} />
                        </Field>
                      </div>
                      {state === 'error' && (
                        <p className="mt-4 text-sm text-red-400">{t({ en: 'Something went wrong. Please try again.', ko: '전송에 실패했습니다. 다시 시도해주세요.' })}</p>
                      )}
                    </Q>
                  )}
                </div>

                <div className="mt-8 flex items-center justify-between">
                  <button
                    onClick={() => setStep((s) => Math.max(0, s - 1))}
                    className={`text-sm text-white/50 transition hover:text-white ${step === 0 ? 'invisible' : ''}`}
                  >
                    ← {t({ en: 'Back', ko: '이전' })}
                  </button>
                  {step < 3 ? (
                    <button
                      disabled={!valid[step]}
                      onClick={() => setStep((s) => s + 1)}
                      className="ska-btn ska-btn-chrome disabled:cursor-not-allowed disabled:opacity-30"
                    >
                      {t({ en: 'Next', ko: '다음' })} <Arrow />
                    </button>
                  ) : (
                    <button
                      disabled={!valid[3] || state === 'sending'}
                      onClick={submit}
                      className="ska-btn ska-btn-chrome disabled:cursor-not-allowed disabled:opacity-30"
                    >
                      {state === 'sending' ? t({ en: 'Sending…', ko: '전송 중…' }) : t({ en: 'Send request', ko: '문의 보내기' })} <Arrow />
                    </button>
                  )}
                </div>
              </>
            )}
          </div>

          {/* live brief */}
          <aside className="relative overflow-hidden rounded-3xl border border-white/[0.08] bg-gradient-to-b from-white/[0.06] to-transparent p-6 sm:p-8 lg:sticky lg:top-28 lg:self-start">
            <div className="flex items-center justify-between">
              <p className="ska-eyebrow">{t({ en: 'Your brief', ko: '문의 요약' })}</p>
              <span className="flex items-center gap-2 text-[11px] text-white/50">
                <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" /> {t({ en: 'Live', ko: '실시간' })}
              </span>
            </div>
            <dl className="mt-6 space-y-5 text-sm">
              <Row k={t({ en: 'Artists', ko: '아티스트' })}>
                {f.genres.length ? (
                  <div className="flex flex-wrap gap-1.5">
                    {f.genres.map((g) => (
                      <span key={g} className="rounded-full bg-white/10 px-2.5 py-1 text-xs">
                        {t(labelOf(GENRES, g)!)}
                      </span>
                    ))}
                  </div>
                ) : null}
                {f.artists && <p className="mt-2 text-white/60">“{f.artists}”</p>}
              </Row>
              <Row k={t({ en: 'Event', ko: '행사' })}>{f.event ? t(labelOf(EVENTS, f.event)!) : null}</Row>
              <Row k={t({ en: 'Audience', ko: '규모' })}>
                {step >= 1 ? `${f.audience.toLocaleString()}${t({ en: ' people', ko: '명' })} · ${t(venueFor(f.audience).label)}` : null}
              </Row>
              <Row k={t({ en: 'Location', ko: '장소' })}>{[f.city, f.country].filter(Boolean).join(', ') || null}</Row>
              <Row k={t({ en: 'Date', ko: '일정' })}>{f.date || null}</Row>
              <Row k={t({ en: 'Contact', ko: '연락처' })}>{f.name ? `${f.name}${f.company ? ` · ${f.company}` : ''}` : null}</Row>
            </dl>
            <div className="mt-8 border-t border-white/10 pt-5 text-xs leading-relaxed text-white/45">
              {t({
                en: 'Our booking team typically replies within 2 business days with availability and next steps.',
                ko: '부킹팀이 영업일 기준 2일 내로 가능 여부와 다음 단계를 안내드립니다.',
              })}
            </div>
          </aside>
        </Reveal>
      </div>
    </section>
  );
}

function Q({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h3>
      {hint && <p className="mt-1 text-sm text-white/45">{hint}</p>}
      <div className="mt-6">{children}</div>
    </div>
  );
}

function Field({ label, children, className = '' }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-2 block text-xs text-white/50">{label}</span>
      {children}
    </label>
  );
}

function Row({ k, children }: { k: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[80px_1fr] gap-3">
      <dt className="text-white/40">{k}</dt>
      <dd className="min-h-5 text-white transition-all">{children ?? <span className="text-white/20">—</span>}</dd>
    </div>
  );
}

/** Dots that fill in as the audience grows (log scale, so every size moves it). */
function Crowd({ n }: { n: number }) {
  const total = 120;
  const lit = Math.max(2, Math.round((toSlider(Math.min(MAX_AUDIENCE, Math.max(MIN_AUDIENCE, n))) / 1000) * total));
  return (
    <div className="mt-6 grid grid-cols-[repeat(24,1fr)] gap-1.5" aria-hidden>
      {Array.from({ length: total }).map((_, i) => (
        <span
          key={i}
          className="aspect-square rounded-full transition-all duration-500"
          style={{
            background: i < lit ? '#fff' : 'rgba(255,255,255,.08)',
            transform: i < lit ? 'scale(1)' : 'scale(.6)',
            transitionDelay: `${(i % 24) * 12}ms`,
          }}
        />
      ))}
    </div>
  );
}

function Done({ onReset }: { onReset: () => void }) {
  const { t } = useLang();
  return (
    <div className="flex min-h-[420px] flex-col items-center justify-center text-center">
      <div className="relative flex h-24 w-24 items-center justify-center">
        <span className="absolute inset-0 animate-ping rounded-full bg-white/20" />
        <span className="relative flex h-20 w-20 items-center justify-center rounded-full bg-white text-3xl text-black">✓</span>
      </div>
      <h3 className="ska-display mt-8 text-5xl">{t({ en: 'Request received', ko: '문의가 접수되었습니다' })}</h3>
      <p className="mt-3 max-w-md text-white/60">
        {t({ en: 'Our booking team will be in touch shortly.', ko: '부킹팀이 곧 연락드리겠습니다.' })}
      </p>
      <button onClick={onReset} className="ska-btn ska-btn-ghost mt-8">
        {t({ en: 'Send another', ko: '새 문의 작성' })}
      </button>
    </div>
  );
}
