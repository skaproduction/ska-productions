'use client';

import { useEffect, useMemo, useState } from 'react';
import type { Show } from './data';
import { useLang } from './ui';

type Stats = {
  days: { day: string; views: number; visitors: number }[];
  totals: { views: number; visitors: number };
  pages: [string, number][];
  countries: [string, number][];
  cities: [string, number][];
  refs: [string, number][];
};

// one series → one hue (reference palette, dark step; validated against this surface)
const SERIES = '#3987e5';
const RANGES = [7, 30, 90] as const;

const REF_NAMES: [RegExp, string][] = [
  [/(^|\.)instagram\.com$/, 'Instagram'],
  [/(^|\.)youtube\.com$|^youtu\.be$/, 'YouTube'],
  [/(^|\.)google\./, 'Google'],
  [/(^|\.)naver\.com$/, 'Naver'],
  [/(^|\.)kakao(talk)?\.com$|^kakao\./, 'Kakao'],
  [/(^|\.)facebook\.com$|^fb\.me$/, 'Facebook'],
  [/^t\.co$|(^|\.)x\.com$|(^|\.)twitter\.com$/, 'X (Twitter)'],
  [/(^|\.)threads\.net$/, 'Threads'],
  [/(^|\.)bing\.com$/, 'Bing'],
  [/(^|\.)daum\.net$/, 'Daum'],
];

const flag = (cc: string) => (/^[A-Z]{2}$/.test(cc) ? String.fromCodePoint(...[...cc].map((c) => 0x1f1a5 + c.charCodeAt(0))) : '🌐');

export default function VisitorStats({ shows }: { shows: Show[] }) {
  const { t, lang } = useLang();
  const [days, setDays] = useState<(typeof RANGES)[number]>(30);
  const [metric, setMetric] = useState<'visitors' | 'views'>('visitors');
  const [state, setState] = useState<{ status: 'loading' | 'ok' | 'off' | 'error'; data?: Stats }>({ status: 'loading' });
  const [hover, setHover] = useState<number | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let alive = true;
    setState((s) => ({ ...s, status: 'loading' }));
    fetch(`/api/ska/admin/stats?days=${days}`, { cache: 'no-store' })
      .then(async (r) => {
        if (!alive) return;
        if (r.status === 503) return setState({ status: 'off' });
        if (!r.ok) return setState({ status: 'error' });
        setState({ status: 'ok', data: (await r.json()) as Stats });
      })
      .catch(() => alive && setState({ status: 'error' }));
    return () => {
      alive = false;
    };
  }, [days, tick]);

  const countryName = useMemo(() => {
    try {
      const dn = new Intl.DisplayNames([lang === 'ko' ? 'ko' : 'en'], { type: 'region' });
      return (cc: string) => (/^[A-Z]{2}$/.test(cc) ? (dn.of(cc) ?? cc) : t({ en: 'Unknown', ko: '알 수 없음' }));
    } catch {
      return (cc: string) => cc;
    }
  }, [lang, t]);

  const pageName = (path: string) => {
    if (path === '/') return t({ en: 'Home', ko: '홈' });
    const slug = path.match(/^\/shows\/([^/]+)/)?.[1];
    const s = slug && shows.find((x) => x.slug === slug);
    return s ? `${s.title} ${s.edition}` : path;
  };
  const refName = (host: string) =>
    host === 'direct' ? t({ en: 'Direct / bookmark', ko: '직접 입력 · 북마크' }) : (REF_NAMES.find(([re]) => re.test(host))?.[1] ?? host);

  const d = state.data;
  const today = d?.days[d.days.length - 1];

  return (
    <section className="mt-10 rounded-2xl border border-white/[0.08] bg-[#0d0d12] p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-white/80">{t({ en: 'Visitors', ko: '방문 통계' })}</h2>
          <p className="mt-1 text-xs text-white/45">
            {t({
              en: 'Anonymous counts (no cookies, no IPs stored). Places are where visitors connect from, roughly by city. Days run on Korean time.',
              ko: '익명 집계입니다 (쿠키·IP 저장 없음). 지역은 접속 위치 기준의 대략적인 도시입니다. 날짜는 한국 시간 기준입니다.',
            })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-full border border-white/15 p-0.5 text-xs" role="group" aria-label={t({ en: 'Date range', ko: '기간' })}>
            {RANGES.map((r) => (
              <button
                key={r}
                onClick={() => setDays(r)}
                aria-pressed={days === r}
                className={`rounded-full px-3 py-1.5 transition ${days === r ? 'bg-white text-black' : 'text-white/60 hover:text-white'}`}
              >
                {t({ en: `${r} days`, ko: `${r}일` })}
              </button>
            ))}
          </div>
          <button onClick={() => setTick((n) => n + 1)} className="rounded-full border border-white/15 px-3 py-1.5 text-xs text-white/60 hover:text-white" aria-label={t({ en: 'Refresh', ko: '새로고침' })}>
            ↻
          </button>
        </div>
      </div>

      {state.status === 'off' && (
        <p className="mt-6 rounded-xl border border-dashed border-white/15 px-4 py-6 text-center text-sm text-white/55">
          {t({
            en: 'Visitor counting is not connected yet. Connect Upstash for Redis to this project in Vercel → Storage, then redeploy.',
            ko: '방문 집계 저장소가 아직 연결되지 않았습니다. Vercel → Storage에서 Upstash for Redis를 이 프로젝트에 연결한 뒤 다시 배포하세요.',
          })}
        </p>
      )}
      {state.status === 'error' && (
        <p className="mt-6 text-sm text-red-300">{t({ en: 'Could not load stats. Try refresh.', ko: '통계를 불러오지 못했습니다. 새로고침해 보세요.' })}</p>
      )}

      {d && (
        <div className={state.status === 'loading' ? 'opacity-50 transition-opacity' : 'transition-opacity'}>
          {/* tiles */}
          <div className="mt-6 grid grid-cols-3 gap-3">
            {[
              { k: t({ en: `Visitors · ${days}d`, ko: `방문자 · ${days}일` }), v: d.totals.visitors },
              { k: t({ en: `Page views · ${days}d`, ko: `페이지뷰 · ${days}일` }), v: d.totals.views },
              { k: t({ en: 'Visitors today', ko: '오늘 방문자' }), v: today?.visitors ?? 0 },
            ].map((x) => (
              <div key={x.k} className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-4">
                <p className="text-[11px] text-white/50">{x.k}</p>
                <p className="mt-1 font-mono text-2xl tabular-nums text-white sm:text-3xl">{x.v.toLocaleString()}</p>
              </div>
            ))}
          </div>

          {/* daily chart */}
          <div className="mt-6">
            <div className="flex items-center justify-between">
              <p className="text-xs text-white/60">{metric === 'visitors' ? t({ en: 'Visitors per day', ko: '일별 방문자' }) : t({ en: 'Page views per day', ko: '일별 페이지뷰' })}</p>
              <div className="flex rounded-full border border-white/10 p-0.5 text-[11px]">
                {(['visitors', 'views'] as const).map((m) => (
                  <button key={m} onClick={() => setMetric(m)} aria-pressed={metric === m} className={`rounded-full px-2.5 py-1 transition ${metric === m ? 'bg-white/90 text-black' : 'text-white/55'}`}>
                    {m === 'visitors' ? t({ en: 'Visitors', ko: '방문자' }) : t({ en: 'Page views', ko: '페이지뷰' })}
                  </button>
                ))}
              </div>
            </div>
            <DailyBars data={d.days} metric={metric} hover={hover} onHover={setHover} lang={lang} />
          </div>

          {/* top lists */}
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <TopList title={t({ en: 'Countries', ko: '국가' })} rows={d.countries.map(([cc, n]) => [`${flag(cc)}  ${countryName(cc)}`, n])} empty={t({ en: 'No data yet', ko: '아직 데이터 없음' })} />
            <TopList
              title={t({ en: 'Cities', ko: '도시' })}
              rows={d.cities.map(([k, n]) => {
                const [cc, city] = k.split('|');
                return [`${flag(cc)}  ${city && city !== '?' ? city : t({ en: 'Unknown', ko: '알 수 없음' })}`, n];
              })}
              empty={t({ en: 'No data yet', ko: '아직 데이터 없음' })}
            />
            <TopList title={t({ en: 'Most viewed pages', ko: '많이 본 페이지' })} rows={d.pages.map(([p, n]) => [pageName(p), n])} empty={t({ en: 'No data yet', ko: '아직 데이터 없음' })} />
            <TopList title={t({ en: 'Where visitors came from', ko: '유입 경로' })} rows={d.refs.map(([h, n]) => [refName(h), n])} empty={t({ en: 'No data yet', ko: '아직 데이터 없음' })} />
          </div>
        </div>
      )}
      {state.status === 'loading' && !d && <p className="mt-6 text-sm text-white/40">{t({ en: 'Loading…', ko: '불러오는 중…' })}</p>}
    </section>
  );
}

function DailyBars({
  data,
  metric,
  hover,
  onHover,
  lang,
}: {
  data: Stats['days'];
  metric: 'visitors' | 'views';
  hover: number | null;
  onHover: (i: number | null) => void;
  lang: 'en' | 'ko';
}) {
  const W = 720;
  const H = 180;
  const pad = { l: 34, r: 8, t: 10, b: 22 };
  const max = Math.max(1, ...data.map((d) => d[metric]));
  const nice = (() => {
    const p = 10 ** Math.floor(Math.log10(max));
    return [1, 2, 2.5, 5, 10].map((m) => m * p).find((v) => v >= max) ?? max;
  })();
  const ticks = [0, nice / 2, nice];
  const iw = W - pad.l - pad.r;
  const ih = H - pad.t - pad.b;
  const step = iw / data.length;
  const bw = Math.max(2, step - 2); // 2px gap between bars
  const y = (v: number) => pad.t + ih - (v / nice) * ih;
  const label = (day: string) => {
    const [, m, dd] = day.split('-');
    return lang === 'ko' ? `${+m}/${+dd}` : `${+m}/${+dd}`;
  };
  const every = data.length <= 7 ? 1 : data.length <= 31 ? 5 : 15;
  const h = hover !== null ? data[hover] : null;

  return (
    <div className="relative mt-3">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={`${metric} per day`} onMouseLeave={() => onHover(null)}>
        {ticks.map((v) => (
          <g key={v}>
            <line x1={pad.l} x2={W - pad.r} y1={y(v)} y2={y(v)} stroke="rgba(255,255,255,.08)" />
            <text x={pad.l - 6} y={y(v) + 3} textAnchor="end" fontSize="10" fill="rgba(255,255,255,.45)">
              {Math.round(v).toLocaleString()}
            </text>
          </g>
        ))}
        {data.map((d, i) => {
          const v = d[metric];
          const x = pad.l + i * step + 1;
          const top = y(v);
          const bh = Math.max(0, pad.t + ih - top);
          const r = Math.min(4, bw / 2, bh);
          return (
            <g key={d.day}>
              {bh > 0 && (
                <path
                  d={`M${x},${pad.t + ih} V${top + r} Q${x},${top} ${x + r},${top} H${x + bw - r} Q${x + bw},${top} ${x + bw},${top + r} V${pad.t + ih} Z`}
                  fill={SERIES}
                  opacity={hover === null || hover === i ? 1 : 0.45}
                />
              )}
              {i % every === (data.length - 1) % every && (
                <text x={x + bw / 2} y={H - 6} textAnchor="middle" fontSize="10" fill="rgba(255,255,255,.45)">
                  {label(d.day)}
                </text>
              )}
              {/* hit target: the whole column, wider than the bar */}
              <rect x={pad.l + i * step} y={pad.t} width={step} height={ih} fill="transparent" onMouseEnter={() => onHover(i)} onClick={() => onHover(i)} />
            </g>
          );
        })}
        <line x1={pad.l} x2={W - pad.r} y1={pad.t + ih} y2={pad.t + ih} stroke="rgba(255,255,255,.25)" />
      </svg>
      {h && hover !== null && (
        <div
          className="pointer-events-none absolute top-0 -translate-x-1/2 rounded-lg border border-white/15 bg-[#16161c] px-3 py-2 text-xs shadow-xl"
          style={{ left: `${((pad.l + hover * step + step / 2) / W) * 100}%` }}
        >
          <p className="font-semibold text-white">{h.day}</p>
          <p className="mt-1 flex items-center gap-2 text-white/80">
            <span className="h-2 w-2 rounded-sm" style={{ background: SERIES }} />
            {lang === 'ko' ? '방문자' : 'Visitors'} <span className="ml-auto font-mono tabular-nums text-white">{h.visitors.toLocaleString()}</span>
          </p>
          <p className="text-white/60">
            {lang === 'ko' ? '페이지뷰' : 'Page views'} <span className="ml-3 font-mono tabular-nums text-white/80">{h.views.toLocaleString()}</span>
          </p>
        </div>
      )}
      {/* table view for screen readers */}
      <table className="sr-only">
        <caption>{metric}</caption>
        <tbody>
          {data.map((d) => (
            <tr key={d.day}>
              <th>{d.day}</th>
              <td>{d.visitors}</td>
              <td>{d.views}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TopList({ title, rows, empty }: { title: string; rows: [string, number][]; empty: string }) {
  const max = Math.max(1, ...rows.map((r) => r[1]));
  return (
    <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-4">
      <p className="text-xs font-semibold text-white/70">{title}</p>
      {rows.length === 0 ? (
        <p className="mt-3 text-xs text-white/35">{empty}</p>
      ) : (
        <ol className="mt-3 space-y-2">
          {rows.slice(0, 8).map(([k, n]) => (
            <li key={k} className="text-sm">
              <div className="flex items-baseline justify-between gap-3">
                <span className="truncate text-white/85">{k}</span>
                <span className="shrink-0 font-mono text-xs tabular-nums text-white/70">{n.toLocaleString()}</span>
              </div>
              <div className="mt-1 h-1.5 rounded-full bg-white/[0.06]">
                <div className="h-full rounded-full" style={{ width: `${(n / max) * 100}%`, background: SERIES }} />
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
