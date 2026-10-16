'use client';

import { useRef, useState } from 'react';
import { ZONES, type Zone } from './data';
import { useLang } from './ui';

const ACCEPT = 'image/jpeg,image/png,image/webp';
const PALETTE = ['#ff3ea5', '#8b5cff', '#3b82f6', '#22c55e', '#facc15', '#f97316', '#ef4444', '#94a3b8'];

type Upload = (file: File, prefix: string) => Promise<string>;
type Translate = (texts: string[]) => Promise<string[] | null>;

/**
 * Seat map image + zones. Pick a zone's 📍 and click the map to drop its pin;
 * on the show page the pins become clickable hotspots on a zoomable map.
 */
export default function SeatMapEditor({
  image,
  zones,
  onImage,
  onZones,
  upload,
  translate,
  canTranslate,
  onError,
  slug,
}: {
  image?: string;
  zones: Zone[];
  onImage: (url?: string) => void;
  onZones: (z: Zone[]) => void;
  upload: Upload;
  translate: Translate;
  canTranslate: boolean;
  onError: (m: string) => void;
  slug: string;
}) {
  const { t } = useLang();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [placing, setPlacing] = useState<string | null>(null);
  const [over, setOver] = useState(false);

  const pick = async (file?: File) => {
    if (!file) return;
    setBusy(true);
    try {
      onImage(await upload(file, `seatmap-${slug}`));
    } catch {
      onError(t({ en: 'Seat map upload failed (JPG/PNG/WebP, max 10 MB).', ko: '좌석 배치도 업로드 실패 (JPG/PNG/WebP, 10MB 이하).' }));
    }
    setBusy(false);
  };

  const update = (id: string, patch: Partial<Zone>) => onZones(zones.map((z) => (z.id === id ? { ...z, ...patch } : z)));
  const add = () =>
    onZones([
      ...zones,
      { id: `z${Date.now().toString(36)}`, label: `Z${zones.length + 1}`, tier: { en: '', ko: '' }, color: PALETTE[zones.length % PALETTE.length] },
    ]);

  const translateTier = async (z: Zone) => {
    if (!canTranslate || !z.tier.en.trim() || z.tier.ko.trim()) return;
    const ko = await translate([z.tier.en]);
    if (ko) update(z.id, { tier: { en: z.tier.en, ko: ko[0] } });
  };

  return (
    <div>
      <p className="-mt-2 mb-4 text-xs text-white/45">
        {t({
          en: 'Upload the venue’s seat map (e.g. from the ticketing site). Then press 📍 on a zone and click where it is on the map. Without an image, the show page draws a generic layout.',
          ko: '공연장 좌석 배치도 이미지(예: 예매처 좌석도)를 올리세요. 그다음 구역의 📍를 누르고 배치도에서 해당 위치를 클릭하면 핀이 찍힙니다. 이미지가 없으면 공연 페이지에 기본 배치도가 표시됩니다.',
        })}
      </p>

      {image ? (
        <div className="relative overflow-hidden rounded-xl border border-white/10 bg-black">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={image}
            alt=""
            draggable={false}
            className={`block w-full select-none ${placing ? 'cursor-crosshair' : ''}`}
            onClick={(e) => {
              if (!placing) return;
              const r = e.currentTarget.getBoundingClientRect();
              update(placing, { x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 });
              setPlacing(null);
            }}
          />
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="pointer-events-none absolute inset-0 h-full w-full">
            {zones.map((z) => z.shape && <polygon key={z.id} points={z.shape} vectorEffect="non-scaling-stroke" fill={z.color ?? '#fff'} fillOpacity={0.25} stroke={z.color ?? '#fff'} strokeWidth={1} />)}
          </svg>
          {zones.map(
            (z) =>
              !z.shape &&
              z.x !== undefined &&
              z.y !== undefined && (
                <span
                  key={z.id}
                  className="pointer-events-none absolute flex -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-white px-2 py-0.5 text-[10px] font-bold text-black shadow-lg"
                  style={{ left: `${z.x}%`, top: `${z.y}%`, background: z.color ?? '#fff' }}
                >
                  {z.label}
                </span>
              ),
          )}
          {placing && (
            <div className="pointer-events-none absolute inset-x-0 top-0 bg-black/80 px-3 py-2 text-center text-xs text-white">
              📍 {t({ en: 'Click on the map to place', ko: '배치도에서 위치를 클릭하세요' })}: <b>{zones.find((z) => z.id === placing)?.label}</b>
            </div>
          )}
        </div>
      ) : (
        <button
          type="button"
          onClick={() => input.current?.click()}
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
          className={`flex h-40 w-full flex-col items-center justify-center gap-1 rounded-xl border border-dashed text-sm text-white/50 transition hover:text-white ${
            over ? 'border-white bg-white/[0.05]' : 'border-white/15'
          }`}
        >
          {busy ? (
            t({ en: 'Uploading…', ko: '업로드 중…' })
          ) : (
            <>
              <span className="text-2xl">🗺️</span>
              {t({ en: 'Upload seat map image', ko: '좌석 배치도 이미지 올리기' })}
              <span className="text-[11px] text-white/30">{t({ en: 'click or drop', ko: '클릭 또는 끌어다 놓기' })}</span>
            </>
          )}
        </button>
      )}
      {image && (
        <div className="mt-2 flex gap-2">
          <button type="button" onClick={() => input.current?.click()} disabled={busy} className="ska-btn ska-btn-ghost !py-2 !text-xs">
            {busy ? t({ en: 'Uploading…', ko: '업로드 중…' }) : t({ en: 'Replace image', ko: '이미지 교체' })}
          </button>
          <button type="button" onClick={() => onImage(undefined)} className="ska-btn ska-btn-ghost !py-2 !text-xs text-red-300">
            {t({ en: 'Remove image', ko: '이미지 삭제' })}
          </button>
        </div>
      )}
      <input ref={input} type="file" accept={ACCEPT} hidden onChange={(e) => (pick(e.target.files?.[0]), (e.target.value = ''))} />

      {/* zones */}
      <div className="mt-6 space-y-2">
        <div className="hidden grid-cols-[36px_70px_1fr_1fr_110px_auto] gap-2 px-1 text-[10px] uppercase tracking-widest text-white/35 sm:grid">
          <span />
          <span>{t({ en: 'Label', ko: '표시' })}</span>
          <span>{t({ en: 'Zone name', ko: '구역명' })} EN</span>
          <span>{t({ en: 'Zone name', ko: '구역명' })} KO</span>
          <span>{t({ en: 'Price', ko: '가격' })}</span>
          <span />
        </div>
        {zones.map((z) => (
          <div key={z.id} className="grid grid-cols-[36px_70px_1fr] items-center gap-2 rounded-xl border border-white/[0.07] bg-white/[0.02] p-2 sm:grid-cols-[36px_70px_1fr_1fr_110px_auto]">
            <label className="relative h-9 w-9 cursor-pointer overflow-hidden rounded-lg border border-white/20" style={{ background: z.color ?? '#fff' }} title={t({ en: 'Color', ko: '색상' })}>
              <input type="color" value={z.color ?? '#ffffff'} onChange={(e) => update(z.id, { color: e.target.value })} className="absolute inset-0 cursor-pointer opacity-0" />
            </label>
            <input className="ska-input !px-2.5 !py-2 text-sm" value={z.label} maxLength={16} onChange={(e) => update(z.id, { label: e.target.value })} placeholder="VIP" />
            <input
              className="ska-input !py-2 text-sm"
              value={z.tier.en}
              onChange={(e) => update(z.id, { tier: { ...z.tier, en: e.target.value } })}
              onBlur={() => translateTier(z)}
              placeholder="Floor standing"
            />
            <input
              className="ska-input col-span-3 !py-2 text-sm sm:col-span-1"
              value={z.tier.ko}
              onChange={(e) => update(z.id, { tier: { ...z.tier, ko: e.target.value } })}
              placeholder="플로어 스탠딩"
            />
            <input
              className="ska-input col-span-2 !py-2 text-sm sm:col-span-1"
              value={z.price ?? ''}
              onChange={(e) => update(z.id, { price: e.target.value })}
              placeholder="NT$ 5,800"
            />
            <div className="flex items-center justify-end gap-1">
              {image && (
                <button
                  type="button"
                  onClick={() => setPlacing(placing === z.id ? null : z.id)}
                  className={`rounded-lg border px-2 py-1.5 text-xs transition ${
                    placing === z.id ? 'border-white bg-white text-black' : z.x !== undefined ? 'border-white/20 text-white' : 'border-white/10 text-white/50'
                  }`}
                  title={t({ en: 'Place pin on the map', ko: '배치도에 핀 찍기' })}
                >
                  📍{z.x !== undefined ? '✓' : ''}
                </button>
              )}
              <button type="button" onClick={() => onZones(zones.filter((x) => x.id !== z.id))} className="px-2 text-lg text-white/40 hover:text-red-300" aria-label="Remove zone">
                ✕
              </button>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" onClick={add} className="ska-btn ska-btn-ghost !py-2 !text-xs">
          + {t({ en: 'Add zone', ko: '구역 추가' })}
        </button>
        <button
          type="button"
          onClick={() => confirm(t({ en: 'Replace all zones with the default 4?', ko: '모든 구역을 기본 4개로 되돌릴까요?' })) && onZones(ZONES.map((z) => ({ ...z })))}
          className="ska-btn ska-btn-ghost !py-2 !text-xs"
        >
          {t({ en: 'Reset to default zones', ko: '기본 구역으로 되돌리기' })}
        </button>
      </div>
    </div>
  );
}
