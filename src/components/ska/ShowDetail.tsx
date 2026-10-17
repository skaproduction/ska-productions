'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState, type CSSProperties } from 'react';
import { brandById, type Brand, type L, type Photo, type Show } from './data';
import AfterShow, { Lightbox } from './AfterShow';
import SeatMap from './SeatMap';
import { Arrow, Countdown, Layer, Magnetic, Poster, Reveal, Tilt, fmtDate, useLang } from './ui';

const AFTER_SHOW = { id: 'aftershow', label: { en: 'After Show', ko: 'After Show' } };

const TABS: { id: string; label: L }[] = [
  { id: 'lineup', label: { en: 'Lineup', ko: '라인업' } },
  { id: 'timetable', label: { en: 'Timetable', ko: '타임테이블' } },
  { id: 'venue', label: { en: 'Seat Map', ko: '좌석 배치도' } },
  { id: 'info', label: { en: 'Info', ko: '안내' } },
];

export default function ShowDetail({ show, past }: { show: Show; past: boolean }) {
  const b = brandById(show.brand);
  const { t, lang } = useLang();
  const photos = show.gallery ?? [];
  // past shows lead with their photos; upcoming shows only get the tab once photos exist
  const tabs = photos.length ? (past ? [AFTER_SHOW, ...TABS] : [...TABS, AFTER_SHOW]) : TABS;
  const [tab, setTab] = useState(past && photos.length ? 'aftershow' : 'lineup');
  const openPhotos = () => {
    setTab('aftershow');
    document.querySelector('[role=tablist]')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <main style={{ '--a1': b.accent, '--a2': b.accent2 } as CSSProperties}>
      {/* hero */}
      <section className="relative overflow-hidden px-5 pb-20 pt-28 sm:px-8 sm:pt-36">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background: `radial-gradient(60% 50% at 75% 20%, ${b.accent}38, transparent 70%), radial-gradient(50% 50% at 0% 100%, ${b.accent2}2a, transparent 70%)`,
          }}
        />
        <div className="relative mx-auto max-w-7xl">
          <Link href={past ? '/#history' : '/#upcoming'} className="inline-flex items-center gap-2 text-sm text-white/50 transition hover:text-white">
            <Arrow className="h-4 w-4 rotate-180" /> {past ? t({ en: 'History', ko: '지난 공연' }) : t({ en: 'All shows', ko: '전체 공연' })}
          </Link>

          <div className="mt-10 grid items-center gap-12 lg:grid-cols-[1.4fr_1fr]">
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <span className="rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-[0.2em] text-black" style={{ background: b.accent }}>
                  {t(b.genre)}
                </span>
                {b.partner && <span className="text-xs uppercase tracking-[0.2em] text-white/50">× {b.partner}</span>}
              </div>
              <h1 className="ska-display mt-6 text-[clamp(56px,11vw,160px)] leading-[0.85]" style={{ textShadow: `0 0 80px ${b.accent}55` }}>
                {show.title}
              </h1>
              <p className="ska-display mt-2 text-[clamp(24px,4vw,48px)] text-white/45">{show.edition}</p>
              <div className="mt-8 grid max-w-lg grid-cols-2 gap-6 border-t border-white/10 pt-6 text-sm">
                <div>
                  <p className="text-white/40">{t({ en: 'Date', ko: '일정' })}</p>
                  <p className="mt-1 text-lg">{fmtDate(show.start, lang, show.end)}</p>
                </div>
                <div>
                  <p className="text-white/40">{t({ en: 'Location', ko: '장소' })}</p>
                  <p className="mt-1 text-lg">
                    {t(show.city)}, {t(show.country)}
                  </p>
                  <p className="text-white/45">{t(show.venue)}</p>
                </div>
              </div>
              {past ? (
                <div className="mt-8 inline-flex items-center gap-3 rounded-full border border-white/15 px-5 py-3 text-sm text-white/70">
                  <span className="h-2 w-2 rounded-full bg-white/40" />
                  {t({ en: 'This show has ended — thank you for being there.', ko: '종료된 공연입니다. 함께해주셔서 감사합니다.' })}
                </div>
              ) : (
                <>
                  <div className="mt-8">
                    <Countdown to={show.start} size="lg" />
                  </div>
                  <Notify show={show} brand={b} />
                </>
              )}
              {photos.length > 0 && (
                <button onClick={openPhotos} className="group mt-6 flex items-center gap-4 text-left">
                  <span className="flex -space-x-3">
                    {photos.slice(0, 4).map((p) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img key={p.id} src={p.url} alt="" className="h-12 w-12 rounded-full border-2 border-[#07070a] object-cover transition group-hover:-translate-y-1" />
                    ))}
                  </span>
                  <span className="text-sm">
                    <span className="block font-semibold" style={{ color: b.accent }}>
                      After Show · {photos.length} {t({ en: 'photos', ko: '장' })}
                    </span>
                    <span className="text-white/50">{t({ en: 'See the night in pictures →', ko: '그날의 현장을 사진으로 →' })}</span>
                  </span>
                </button>
              )}
            </div>

            <Tilt max={14} className="mx-auto w-full max-w-[280px] sm:max-w-[380px]">
              <Poster src={show.poster} brand={b} title={show.title} edition={show.edition} />
            </Tilt>
          </div>
        </div>
      </section>

      {/* tabs */}
      <div className="sticky top-16 z-30 border-y border-white/[0.06] bg-black/75 backdrop-blur-xl sm:top-20">
        <div className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-5 sm:px-8" role="tablist">
          {tabs.map((x) => (
            <button
              key={x.id}
              role="tab"
              aria-selected={tab === x.id}
              onClick={() => setTab(x.id)}
              className={`relative whitespace-nowrap px-4 py-4 text-sm font-semibold transition ${tab === x.id ? 'text-white' : 'text-white/45 hover:text-white/80'}`}
            >
              {t(x.label)}
              <span
                className="absolute inset-x-3 bottom-0 h-0.5 origin-left transition-transform duration-300"
                style={{ background: b.accent, transform: tab === x.id ? 'scaleX(1)' : 'scaleX(0)' }}
              />
            </button>
          ))}
        </div>
      </div>

      <section className="min-h-[70vh] px-5 py-16 sm:px-8 sm:py-24">
        <div key={tab} className="mx-auto max-w-7xl animate-[ska-in_.5s_ease]">
          {tab === 'lineup' && <Lineup show={show} brand={b} past={past} />}
          {tab === 'timetable' && <Timetable show={show} brand={b} />}
          {tab === 'venue' && <SeatMap show={show} brand={b} />}
          {tab === 'info' && <Info />}
          {tab === 'aftershow' && <AfterShow photos={photos} brand={b} />}
        </div>
      </section>

      {/* casting CTA */}
      <section className="px-5 pb-28 sm:px-8">
        <Reveal className="relative mx-auto max-w-7xl overflow-hidden rounded-3xl border border-white/[0.08] p-8 sm:p-14">
          <div aria-hidden className="absolute inset-0" style={{ background: `linear-gradient(120deg, ${b.accent}22, transparent 50%, ${b.accent2}1a)` }} />
          <div className="relative flex flex-col justify-between gap-8 md:flex-row md:items-center">
            <div>
              <p className="ska-eyebrow">{t({ en: 'Promoters & brands', ko: '프로모터 · 브랜드' })}</p>
              <h2 className="ska-display mt-3 text-[clamp(32px,5vw,64px)] leading-[0.95]">
                {t({ en: `Bring ${b.name} to your city.`, ko: `${b.name}를 당신의 도시로.` })}
              </h2>
            </div>
            <Magnetic>
              <Link href="/#casting" className="ska-btn ska-btn-chrome">
                {t({ en: 'Talk to our booking team', ko: '부킹팀에 문의하기' })} <Arrow />
              </Link>
            </Magnetic>
          </div>
        </Reveal>
      </section>
    </main>
  );
}

function Notify({ show, brand }: { show: Show; brand: Brand }) {
  const { t } = useLang();
  const [email, setEmail] = useState('');
  const [done, setDone] = useState(false);
  const key = `ska-notify-${show.slug}`;
  useEffect(() => {
    try {
      if (localStorage.getItem(key)) setDone(true);
    } catch {}
  }, [key]);

  return (
    <form
      className="mt-8 flex max-w-lg flex-col gap-3 sm:flex-row"
      onSubmit={(e) => {
        e.preventDefault();
        if (!/\S+@\S+\.\S+/.test(email)) return;
        try {
          localStorage.setItem(key, '1');
        } catch {}
        setDone(true);
      }}
    >
      {done ? (
        <p className="flex items-center gap-3 rounded-full border px-5 py-3 text-sm" style={{ borderColor: `${brand.accent}66`, color: brand.accent }}>
          <span className="h-2 w-2 animate-pulse rounded-full" style={{ background: brand.accent }} />
          {t({ en: 'You’re on the list — we’ll ping you when tickets drop.', ko: '알림 신청 완료 — 티켓 오픈 시 알려드릴게요.' })}
        </p>
      ) : (
        <>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t({ en: 'Email for ticket alerts', ko: '티켓 오픈 알림 받을 이메일' })}
            className="ska-input !rounded-full"
          />
          <button className="ska-btn shrink-0 justify-center text-black" style={{ background: brand.accent }}>
            {t({ en: 'Notify me', ko: '알림 받기' })}
          </button>
        </>
      )}
    </form>
  );
}

function Lineup({ show, brand, past }: { show: Show; brand: Brand; past: boolean }) {
  const { t } = useLang();
  const [flipped, setFlipped] = useState<Set<string>>(() => new Set(past ? show.lineup.map((a) => a.id) : []));
  const announced = show.lineup.filter((a) => a.announced);
  const locked = show.lineup.length - announced.length;
  const toggle = (id: string) =>
    setFlipped((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  const revealAll = () =>
    announced.forEach((a, i) => setTimeout(() => setFlipped((s) => new Set(s).add(a.id)), i * 140));

  if (show.lineup.length === 0)
    return <p className="py-16 text-center text-white/50">{t({ en: 'Lineup to be announced.', ko: '라인업은 추후 공개됩니다.' })}</p>;

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex items-baseline gap-4">
          <h3 className="ska-display text-4xl">{t({ en: 'Lineup', ko: '라인업' })}</h3>
          <span className="text-sm" style={{ color: brand.accent }}>
            {announced.length} {t({ en: 'announced', ko: '팀 공개' })}
            {locked > 0 && <span className="text-white/40"> · {locked} {t({ en: 'more coming', ko: '팀 공개 예정' })}</span>}
          </span>
        </div>
        {announced.length > 0 && (
          <button onClick={revealAll} className="ska-btn ska-btn-ghost !py-2 !text-xs">
            {t({ en: 'Flip all cards', ko: '전체 공개하기' })} ↻
          </button>
        )}
      </div>
      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {show.lineup.map((a, i) => {
          const isOn = flipped.has(a.id);
          return (
            <button
              key={a.id}
              disabled={!a.announced}
              onClick={() => toggle(a.id)}
              data-flipped={isOn}
              className="ska-flip aspect-[3/4] text-left disabled:cursor-not-allowed"
              aria-label={a.announced ? a.name || 'Artist' : 'Coming soon'}
            >
              <div className="ska-flip-inner">
                <div
                  className="ska-flip-face flex flex-col items-center justify-center overflow-hidden rounded-2xl border border-white/10"
                  style={{ background: `linear-gradient(160deg, ${brand.accent}18, #0d0d12 60%)` }}
                >
                  {a.announced ? (
                    <>
                      <span className="ska-display text-7xl text-white/15">?</span>
                      <span className="mt-3 text-[11px] uppercase tracking-[0.3em] text-white/45">{t({ en: 'Tap to reveal', ko: '탭해서 공개' })}</span>
                    </>
                  ) : (
                    <>
                      <div className="absolute inset-0 backdrop-blur-sm" />
                      <span className="relative text-3xl text-white/30">🔒</span>
                      <span className="relative mt-3 text-[11px] uppercase tracking-[0.3em] text-white/35">{t({ en: 'Coming soon', ko: '공개 예정' })}</span>
                    </>
                  )}
                </div>
                <div
                  className="ska-flip-face ska-flip-back flex flex-col justify-end overflow-hidden rounded-2xl border p-4"
                  style={{
                    borderColor: `${brand.accent}66`,
                    background: `radial-gradient(80% 60% at 50% 30%, ${brand.accent}55, transparent), linear-gradient(to top, #000, #15151c)`,
                  }}
                >
                  {a.photo ? (
                    <>
                      <Image src={a.photo} alt={a.name} fill sizes="(max-width: 640px) 50vw, 25vw" className="object-cover" unoptimized />
                      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />
                    </>
                  ) : (
                    <div className="absolute inset-x-0 top-1/3 flex justify-center">
                      <span className="ska-display text-6xl text-white/10">{(a.name || '?').slice(0, 1)}</span>
                    </div>
                  )}
                  <span className="relative text-[10px] uppercase tracking-[0.25em]" style={{ color: brand.accent }}>
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <span className="ska-display relative text-2xl leading-tight">{a.name || 'Artist TBA'}</span>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** Uploaded timetable images: a tab per image, tap to view full screen, or open the original to pinch-zoom. */
function TimetableImages({ images, brand }: { images: Photo[]; brand: Brand }) {
  const { t } = useLang();
  const [i, setI] = useState(0);
  const [open, setOpen] = useState<number | null>(null);
  const img = images[Math.min(i, images.length - 1)];
  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h3 className="ska-display text-4xl">{t({ en: 'Timetable', ko: '타임테이블' })}</h3>
        <a href={img.url} target="_blank" rel="noopener noreferrer" className="ska-btn ska-btn-ghost !py-2 !text-xs">
          {t({ en: 'Open full size', ko: '원본 크게 보기' })} ↗
        </a>
      </div>
      {images.length > 1 && (
        <div className="mt-6 flex flex-wrap gap-2" role="tablist">
          {images.map((p, n) => (
            <button
              key={p.id}
              role="tab"
              aria-selected={n === i}
              onClick={() => setI(n)}
              className="rounded-full border px-4 py-2 text-xs font-semibold transition"
              style={{
                borderColor: n === i ? brand.accent : 'rgba(255,255,255,.15)',
                background: n === i ? `${brand.accent}22` : 'transparent',
                color: n === i ? brand.accent : 'rgba(255,255,255,.65)',
              }}
            >
              {p.caption || `DAY ${n + 1}`}
            </button>
          ))}
        </div>
      )}
      <button
        key={img.id}
        onClick={() => setOpen(Math.min(i, images.length - 1))}
        className="group relative mt-6 block w-full animate-[ska-in_.4s_ease] overflow-hidden rounded-2xl border border-white/10 bg-black"
        aria-label={t({ en: 'View full screen', ko: '전체 화면으로 보기' })}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={img.url} alt={img.caption ?? 'Timetable'} className="mx-auto block max-h-[80vh] w-auto max-w-full" />
        <span className="absolute right-3 top-3 rounded-full bg-black/70 px-3 py-1.5 text-xs text-white opacity-0 backdrop-blur transition group-hover:opacity-100">
          ⤢ {t({ en: 'Full screen', ko: '크게 보기' })}
        </span>
      </button>
      {open !== null && (
        <Layer>
          <Lightbox photos={images} index={open} onIndex={setOpen} onClose={() => setOpen(null)} accent={brand.accent} />
        </Layer>
      )}
    </div>
  );
}

function Timetable({ show, brand }: { show: Show; brand: Brand }) {
  const { t } = useLang();
  const key = `ska-plan-${show.slug}`;
  const [plan, setPlan] = useState<string[]>([]);
  useEffect(() => {
    try {
      setPlan(JSON.parse(localStorage.getItem(key) || '[]'));
    } catch {}
  }, [key]);
  const toggle = (id: string) => {
    const next = plan.includes(id) ? plan.filter((x) => x !== id) : [...plan, id];
    setPlan(next);
    try {
      localStorage.setItem(key, JSON.stringify(next));
    } catch {}
  };

  if (show.timetableImages?.length) return <TimetableImages images={show.timetableImages} brand={brand} />;
  if (show.stages.length === 0)
    return <p className="py-16 text-center text-white/50">{t({ en: 'Timetable to be announced.', ko: '타임테이블은 추후 공개됩니다.' })}</p>;

  const toMin = (s: string) => +s.slice(0, 2) * 60 + +s.slice(3);
  const all = show.stages.flatMap((s) => s.slots);
  const startH = Math.floor(Math.min(...all.map((x) => toMin(x.time))) / 60);
  const endH = Math.ceil(Math.max(...all.map((x) => toMin(x.end))) / 60);
  const pxPerMin = 1.6;
  const hours = Array.from({ length: endH - startH + 1 }, (_, i) => startH + i);

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h3 className="ska-display text-4xl">{t({ en: 'Build your day', ko: '나만의 타임테이블' })}</h3>
          <p className="mt-2 text-sm text-white/50">
            {t({ en: 'Tap a set to add it to your plan. Saved on this device.', ko: '원하는 무대를 탭해서 플랜에 담으세요. 이 기기에 저장됩니다.' })}
          </p>
        </div>
        <span className="rounded-full border px-4 py-2 text-sm" style={{ borderColor: `${brand.accent}66`, color: brand.accent }}>
          ★ {plan.length} {t({ en: 'in my plan', ko: '개 담음' })}
        </span>
      </div>

      <div className="mt-8 overflow-x-auto">
        <div className="grid min-w-[560px] gap-3" style={{ gridTemplateColumns: `56px repeat(${show.stages.length}, minmax(200px, 1fr))` }}>
          <div />
          {show.stages.map((s) => (
            <div key={s.name} className="ska-display rounded-xl bg-white/[0.04] px-4 py-3 text-center text-lg tracking-wide">
              {s.name}
            </div>
          ))}

          <div className="relative" style={{ height: (endH - startH) * 60 * pxPerMin }}>
            {hours.map((h) => (
              <span key={h} className="absolute right-2 -translate-y-1/2 font-mono text-xs text-white/35" style={{ top: (h - startH) * 60 * pxPerMin }}>
                {h}:00
              </span>
            ))}
          </div>
          {show.stages.map((s) => (
            <div
              key={s.name}
              className="relative rounded-xl border border-white/[0.05]"
              style={{
                height: (endH - startH) * 60 * pxPerMin,
                backgroundImage: `repeating-linear-gradient(to bottom, rgba(255,255,255,.05) 0 1px, transparent 1px ${60 * pxPerMin}px)`,
              }}
            >
              {s.slots.map((slot) => {
                const id = `${s.name}-${slot.time}`;
                const on = plan.includes(id);
                const top = (toMin(slot.time) - startH * 60) * pxPerMin;
                const h = (toMin(slot.end) - toMin(slot.time)) * pxPerMin;
                return (
                  <button
                    key={id}
                    onClick={() => toggle(id)}
                    aria-pressed={on}
                    className="absolute inset-x-2 flex flex-col justify-between overflow-hidden rounded-lg border p-3 text-left transition hover:scale-[1.02]"
                    style={{
                      top,
                      height: h - 4,
                      borderColor: on ? brand.accent : 'rgba(255,255,255,.1)',
                      background: on ? `${brand.accent}30` : 'rgba(255,255,255,.035)',
                      boxShadow: on ? `0 0 24px ${brand.accent}40` : 'none',
                    }}
                  >
                    <span className="flex items-start justify-between gap-2">
                      <span className="text-sm font-semibold leading-tight">{slot.act}</span>
                      <span style={{ color: on ? brand.accent : 'rgba(255,255,255,.25)' }}>{on ? '★' : '☆'}</span>
                    </span>
                    <span className="font-mono text-[11px] text-white/45">
                      {slot.time} – {slot.end}
                    </span>
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const FAQ: { q: L; a: L }[] = [
  {
    q: { en: 'When do tickets go on sale?', ko: '티켓은 언제 오픈되나요?' },
    a: { en: 'Ticket details will be announced here and on our socials. Sign up for alerts above.', ko: '티켓 정보는 이 페이지와 공식 SNS에서 공지됩니다. 상단에서 알림을 신청하세요.' },
  },
  {
    q: { en: 'Is there an age restriction?', ko: '연령 제한이 있나요?' },
    a: { en: 'To be announced with ticketing.', ko: '티켓 오픈 시 함께 안내됩니다.' },
  },
  {
    q: { en: 'Can I bring a camera?', ko: '카메라를 가져가도 되나요?' },
    a: { en: 'Professional cameras are not permitted. Phone photos are fine unless the artist requests otherwise.', ko: '전문 카메라는 반입이 불가합니다. 아티스트 요청이 없는 한 휴대폰 촬영은 가능합니다.' },
  },
  {
    q: { en: 'I’m a promoter — can I bring this show to my city?', ko: '프로모터인데, 이 공연을 우리 도시로 가져올 수 있나요?' },
    a: { en: 'Yes. Reach our booking team through the casting form.', ko: '네. 캐스팅 문의 폼을 통해 부킹팀에 연락해주세요.' },
  },
];

function Info() {
  const { t } = useLang();
  const [open, setOpen] = useState<number | null>(0);
  return (
    <div className="mx-auto max-w-3xl">
      <h3 className="ska-display text-4xl">{t({ en: 'Good to know', ko: '공연 안내' })}</h3>
      <ul className="mt-8 border-t border-white/10">
        {FAQ.map((f, i) => (
          <li key={i} className="border-b border-white/10">
            <button onClick={() => setOpen(open === i ? null : i)} aria-expanded={open === i} className="flex w-full items-center justify-between gap-4 py-6 text-left text-lg">
              {t(f.q)}
              <span className={`text-2xl text-white/50 transition-transform ${open === i ? 'rotate-45' : ''}`}>+</span>
            </button>
            <div className="grid transition-[grid-template-rows] duration-500" style={{ gridTemplateRows: open === i ? '1fr' : '0fr' }}>
              <p className="overflow-hidden text-white/60">
                <span className="block pb-6">{t(f.a)}</span>
              </p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
