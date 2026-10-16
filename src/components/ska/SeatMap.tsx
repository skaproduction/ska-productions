'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { Brand, Show, Zone } from './data';
import { useLang } from './ui';

/** Seat Map tab: the uploaded venue map with zone pins, or a generic layout when there is none. */
export default function SeatMap({ show, brand }: { show: Show; brand: Brand }) {
  const { t } = useLang();
  const zones = show.zones;
  const [sel, setSel] = useState(zones[0]?.id);
  const zone = zones.find((z) => z.id === sel);
  const [focus, setFocus] = useState<{ id: string; n: number } | null>(null);

  if (zones.length === 0 && !show.seatMap)
    return <p className="py-16 text-center text-white/50">{t({ en: 'Seat map to be announced.', ko: '좌석 배치도는 추후 공개됩니다.' })}</p>;

  const choose = (id: string) => {
    setSel(id);
    setFocus((f) => ({ id, n: (f?.n ?? 0) + 1 }));
  };
  const colorOf = (z: Zone) => z.color ?? brand.accent;
  const groups = zones.reduce<{ key: string; zones: Zone[] }[]>((acc, z) => {
    const key = (z.tier.en || z.tier.ko || z.id).toLowerCase();
    const g = acc.find((x) => x.key === key);
    if (g) g.zones.push(z);
    else acc.push({ key, zones: [z] });
    return acc;
  }, []);

  return (
    <div className="grid gap-10 lg:grid-cols-[1.6fr_1fr]">
      <div className="rounded-3xl border border-white/[0.06] bg-white/[0.02] p-3 sm:p-6">
        {show.seatMap ? (
          <ZoomMap image={show.seatMap} zones={zones} sel={sel} focus={focus} onSelect={setSel} accent={brand.accent} />
        ) : (
          <GenericMap zones={zones} sel={sel} onSelect={setSel} brand={brand} />
        )}
        <p className="mt-3 text-center text-xs text-white/35">
          {show.seatMap
            ? t({ en: 'Scroll or use + / − to zoom, drag to move. Tap a section for details.', ko: '스크롤 또는 + / − 로 확대, 드래그로 이동. 구역을 누르면 정보가 보입니다.' })
            : t({ en: 'Illustrative layout — final seat map announced with tickets.', ko: '예시 배치도입니다. 최종 좌석도는 티켓 오픈 시 공개됩니다.' })}
        </p>
      </div>

      <div className="self-start lg:sticky lg:top-40">
        {zone && (
          <div key={zone.id} className="animate-[ska-in_.4s_ease]">
            <p className="ska-eyebrow">{t({ en: 'Selected zone', ko: '선택한 구역' })}</p>
            <h3 className="ska-display mt-3 flex items-center gap-4 text-6xl" style={{ color: colorOf(zone) }}>
              {zone.label}
            </h3>
            <p className="mt-2 text-xl">{t(zone.tier) || zone.tier.en}</p>
            <dl className="mt-6 space-y-4 border-t border-white/10 pt-5 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-white/45">{t({ en: 'Price', ko: '가격' })}</dt>
                <dd className="text-right">{zone.price || t({ en: 'To be announced', ko: '추후 공개' })}</dd>
              </div>
            </dl>
          </div>
        )}
        {/* zones sharing a tier name are listed together, e.g. all floor blocks */}
        <ul className="mt-8 space-y-3">
          {groups.map((g) => {
            const prices = [...new Set(g.zones.map((z) => z.price).filter(Boolean))];
            const open = g.zones.some((z) => z.id === sel);
            return (
              <li key={g.key} className={`rounded-2xl border p-3 transition ${open ? 'border-white/30 bg-white/[0.04]' : 'border-white/[0.07]'}`}>
                <div className="flex items-center gap-3 px-1 text-sm">
                  <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: colorOf(g.zones[0]) }} />
                  <span className="flex-1 font-semibold">{t(g.zones[0].tier) || g.zones[0].tier.en || g.zones[0].label}</span>
                  <span className="text-white/70">{prices.length === 1 ? prices[0] : ''}</span>
                  {g.zones.length > 1 && <span className="text-xs text-white/40">{g.zones.length}</span>}
                </div>
                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  {g.zones.map((z) => (
                    <button
                      key={z.id}
                      onClick={() => choose(z.id)}
                      onPointerEnter={(e) => e.pointerType === 'mouse' && setSel(z.id)}
                      className="rounded-lg border px-2.5 py-1 text-xs font-semibold transition"
                      style={{
                        borderColor: z.id === sel ? colorOf(z) : 'rgba(255,255,255,.12)',
                        background: z.id === sel ? `${colorOf(z)}33` : 'transparent',
                        color: z.id === sel ? '#fff' : 'rgba(255,255,255,.7)',
                      }}
                    >
                      {z.label}
                    </button>
                  ))}
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

const MIN = 1;
const MAX = 5;

function ZoomMap({
  image,
  zones,
  sel,
  focus,
  onSelect,
  accent,
}: {
  image: string;
  zones: Zone[];
  sel?: string;
  focus: { id: string; n: number } | null;
  onSelect: (id: string) => void;
  accent: string;
}) {
  const box = useRef<HTMLDivElement>(null);
  const [view, setView] = useState({ s: 1, x: 0, y: 0 });
  const drag = useRef<{ px: number; py: number; x: number; y: number; moved: boolean } | null>(null);
  const [hover, setHover] = useState<string | null>(null);

  // keep the image covering the frame: no panning past its edges
  const clamp = useCallback((s: number, x: number, y: number) => {
    const el = box.current;
    if (!el) return { s, x, y };
    const { width: w, height: h } = el.getBoundingClientRect();
    return { s, x: Math.min(0, Math.max(w - w * s, x)), y: Math.min(0, Math.max(h - h * s, y)) };
  }, []);

  const zoomAt = useCallback(
    (factor: number, cx?: number, cy?: number) =>
      setView((v) => {
        const el = box.current;
        if (!el) return v;
        const r = el.getBoundingClientRect();
        const px = cx ?? r.width / 2;
        const py = cy ?? r.height / 2;
        const s = Math.min(MAX, Math.max(MIN, v.s * factor));
        return clamp(s, px - ((px - v.x) * s) / v.s, py - ((py - v.y) * s) / v.s);
      }),
    [clamp],
  );

  // wheel zoom needs a non-passive listener so the page doesn't scroll at the same time
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const r = el.getBoundingClientRect();
      zoomAt(e.deltaY < 0 ? 1.15 : 1 / 1.15, e.clientX - r.left, e.clientY - r.top);
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [zoomAt]);

  // choosing a zone from the list flies to its pin
  useEffect(() => {
    const z = zones.find((x) => x.id === focus?.id);
    const el = box.current;
    if (!z || z.x === undefined || z.y === undefined || !el) return;
    const { width: w, height: h } = el.getBoundingClientRect();
    const s = 2.2;
    setView(clamp(s, w / 2 - (z.x / 100) * w * s, h / 2 - (z.y / 100) * h * s));
  }, [focus, zones, clamp]);

  return (
    <div className="relative">
      <div
        ref={box}
        className={`relative overflow-hidden rounded-2xl bg-black ${view.s > 1 ? 'cursor-grab touch-none active:cursor-grabbing' : 'touch-pan-y'}`}
        onPointerDown={(e) => {
          if (view.s === 1) return;
          drag.current = { px: e.clientX, py: e.clientY, x: view.x, y: view.y, moved: false };
        }}
        onPointerMove={(e) => {
          const d = drag.current;
          if (!d) return;
          const dx = e.clientX - d.px;
          const dy = e.clientY - d.py;
          // capture only once it's a real drag, so a plain tap still reaches the pin under it
          if (!d.moved && Math.abs(dx) + Math.abs(dy) > 3) {
            d.moved = true;
            e.currentTarget.setPointerCapture(e.pointerId);
          }
          setView((v) => clamp(v.s, d.x + dx, d.y + dy));
        }}
        onPointerUp={() => {
          drag.current = null;
        }}
        onDoubleClick={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          zoomAt(1.8, e.clientX - r.left, e.clientY - r.top);
        }}
      >
        <div
          className="relative origin-top-left transition-transform duration-200 ease-out"
          style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.s})`, transitionDuration: drag.current ? '0ms' : undefined }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={image} alt="Seat map" draggable={false} className="block w-full select-none" />
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 h-full w-full">
            {zones.map((z) => {
              if (!z.shape) return null;
              const on = z.id === sel;
              const hov = z.id === hover;
              const c = z.color ?? accent;
              return (
                <polygon
                  key={z.id}
                  points={z.shape}
                  vectorEffect="non-scaling-stroke"
                  fill={c}
                  fillOpacity={on ? 0.6 : hov ? 0.35 : 0}
                  stroke={on ? '#fff' : hov ? c : 'transparent'}
                  strokeWidth={on ? 2.5 : 1.5}
                  className="cursor-pointer transition-[fill-opacity] duration-200"
                  onPointerEnter={() => setHover(z.id)}
                  onPointerLeave={() => setHover((h) => (h === z.id ? null : h))}
                  onClick={(e) => {
                    if (drag.current?.moved) return;
                    e.stopPropagation();
                    onSelect(z.id);
                  }}
                >
                  <title>{z.label}</title>
                </polygon>
              );
            })}
          </svg>
          {zones.map((z) => {
            if (z.x === undefined || z.y === undefined) return null;
            if (z.shape) {
              // outlined sections already carry their name on the map; float a tag only while active
              if (z.id !== sel && z.id !== hover) return null;
              return (
                <span
                  key={z.id}
                  className="pointer-events-none absolute whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-bold text-black shadow-lg"
                  style={{
                    left: `${z.x}%`,
                    top: `${z.y}%`,
                    background: z.color ?? accent,
                    transform: `translate(-50%, calc(-100% - 18px)) scale(${1 / view.s})`,
                    transformOrigin: 'bottom center',
                  }}
                >
                  {z.label}
                  {z.price && <span className="ml-1.5 font-semibold opacity-70">{z.price}</span>}
                </span>
              );
            }
            const on = z.id === sel;
            const c = z.color ?? accent;
            return (
              <button
                key={z.id}
                onClick={(e) => {
                  if (drag.current?.moved) return;
                  e.stopPropagation();
                  onSelect(z.id);
                }}
                className="absolute"
                style={{ left: `${z.x}%`, top: `${z.y}%`, transform: `translate(-50%, -50%) scale(${1 / view.s})` }}
                aria-label={z.label}
              >
                {on && <span className="absolute inset-0 animate-ping rounded-full" style={{ background: c, opacity: 0.5 }} />}
                <span
                  className="relative flex items-center justify-center whitespace-nowrap rounded-full border-2 px-2.5 py-1 text-[11px] font-bold text-black shadow-lg transition-transform"
                  style={{ background: c, borderColor: on ? '#fff' : 'rgba(0,0,0,.4)', transform: on ? 'scale(1.25)' : 'none' }}
                >
                  {z.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="absolute right-3 top-3 flex flex-col overflow-hidden rounded-xl border border-white/15 bg-black/70 text-lg backdrop-blur">
        <button onClick={() => zoomAt(1.4)} className="h-9 w-9 hover:bg-white/10" aria-label="Zoom in">
          +
        </button>
        <button onClick={() => zoomAt(1 / 1.4)} className="h-9 w-9 border-t border-white/10 hover:bg-white/10" aria-label="Zoom out">
          −
        </button>
        <button onClick={() => setView({ s: 1, x: 0, y: 0 })} className="h-9 w-9 border-t border-white/10 text-sm hover:bg-white/10" aria-label="Reset view">
          ⟲
        </button>
      </div>
    </div>
  );
}

/** Stage + floor + three seating arcs, for shows without an uploaded map. Zones with other ids show only in the list. */
function GenericMap({ zones, sel, onSelect, brand }: { zones: Zone[]; sel?: string; onSelect: (id: string) => void; brand: Brand }) {
  const arcs: Record<string, { r1: number; r2: number }> = { r: { r1: 150, r2: 200 }, s: { r1: 210, r2: 260 }, a: { r1: 270, r2: 320 } };
  const arc = (r1: number, r2: number) => {
    const cx = 300,
      cy = 60,
      a0 = (20 * Math.PI) / 180,
      a1 = (160 * Math.PI) / 180;
    const p = (r: number, a: number) => `${cx + r * Math.cos(a)} ${cy + r * Math.sin(a)}`;
    return `M ${p(r2, a0)} A ${r2} ${r2} 0 0 1 ${p(r2, a1)} L ${p(r1, a1)} A ${r1} ${r1} 0 0 0 ${p(r1, a0)} Z`;
  };

  return (
    <svg viewBox="0 0 600 400" className="w-full">
      <defs>
        <linearGradient id="stg" x1="0" x2="1">
          <stop offset="0" stopColor={brand.accent2} />
          <stop offset="1" stopColor={brand.accent} />
        </linearGradient>
      </defs>
      <rect x="200" y="20" width="200" height="40" rx="6" fill="url(#stg)" />
      <text x="300" y="46" textAnchor="middle" className="fill-black text-[14px] font-bold tracking-[0.3em]">
        STAGE
      </text>
      {zones.map((z) => {
        if (z.id !== 'floor' && !arcs[z.id]) return null;
        const on = z.id === sel;
        const c = z.color ?? brand.accent;
        const common = {
          onClick: () => onSelect(z.id),
          onPointerEnter: () => onSelect(z.id),
          className: 'cursor-pointer transition-all duration-300',
          fill: on ? c : 'rgba(255,255,255,.08)',
          fillOpacity: on ? 0.75 : 1,
          stroke: on ? c : 'rgba(255,255,255,.2)',
          strokeWidth: 1.5,
          style: { filter: on ? `drop-shadow(0 0 14px ${c})` : 'none' },
        };
        if (z.id === 'floor')
          return (
            <g key={z.id}>
              <rect x="215" y="75" width="170" height="110" rx="8" {...common} />
              <text x="300" y="136" textAnchor="middle" className="pointer-events-none fill-white text-[13px] font-bold tracking-widest">
                {z.label}
              </text>
            </g>
          );
        const { r1, r2 } = arcs[z.id];
        return (
          <g key={z.id}>
            <path d={arc(r1, r2)} {...common} />
            <text x="300" y={60 + (r1 + r2) / 2 + 5} textAnchor="middle" className="pointer-events-none fill-white text-[13px] font-bold">
              {z.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
