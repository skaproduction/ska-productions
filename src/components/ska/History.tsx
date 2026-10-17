"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { BRANDS, brandById, type BrandId, type Show } from "./data";
import {
  Arrow,
  Poster,
  Reveal,
  SwipeDots,
  fmtDate,
  showYear,
  useLang,
  useSnapIndex,
} from "./ui";

/**
 * Archive of past shows. Pick a year and that year's posters deal out of a stack onto a
 * movie-poster shelf; choose one to open its page.
 */
export default function History({ shows }: { shows: Show[] }) {
  const { t } = useLang();
  const years = useMemo(
    () =>
      [...new Set(shows.map((s) => showYear(s.start)))].sort((a, b) => b - a),
    [shows],
  );
  const [year, setYear] = useState<number | null>(years[0] ?? null);
  const [brand, setBrand] = useState<BrandId | "all">("all");
  // bumps on every pick so choosing the same year again replays the deal
  const [deal, setDeal] = useState(0);

  useEffect(() => {
    if (year === null || !years.includes(year)) setYear(years[0] ?? null);
  }, [years, year]);

  const ofYear = shows.filter((s) => showYear(s.start) === year);
  const list = ofYear.filter((s) => brand === "all" || s.brand === brand);
  const pick = (y: number) => {
    setYear(y);
    setBrand("all");
    setDeal((n) => n + 1);
  };

  return (
    <section
      id="history"
      className="relative scroll-mt-20 overflow-hidden border-t border-white/[0.06] px-5 py-20 sm:px-8 sm:py-36"
    >
      <div className="mx-auto max-w-7xl">
        <Reveal>
          <p className="ska-eyebrow">
            04 — {t({ en: "History", ko: "히스토리" })}
          </p>
          <h2 className="ska-display mt-4 text-[clamp(40px,7vw,96px)] leading-[0.9]">
            {t({ en: "Stages we’ve built", ko: "우리가 만든 무대" })}
          </h2>
          <p className="mt-4 max-w-md text-sm text-white/55">
            {t({
              en: "Pick a year to pull out its posters, then choose a show to step back inside.",
              ko: "연도를 고르면 그해의 포스터가 펼쳐집니다. 공연을 골라 그날의 무대로 들어가 보세요.",
            })}
          </p>
        </Reveal>

        {years.length === 0 ? (
          <Reveal className="mt-14 rounded-2xl border border-dashed border-white/15 px-6 py-16 text-center text-white/50">
            {t({
              en: "Our archive fills up as each show wraps. See you at the next one.",
              ko: "공연이 끝날 때마다 이곳에 기록됩니다. 다음 무대에서 만나요.",
            })}
          </Reveal>
        ) : (
          <>
            {/* year dial: drag, swipe or scroll it; the year that settles in the middle is picked */}
            <Reveal delay={100} className="mt-12">
              <YearDial
                years={years}
                counts={(y) =>
                  shows.filter((s) => showYear(s.start) === y).length
                }
                year={year}
                onPick={pick}
              />
            </Reveal>

            {/* festival filter, only when the year has more than one */}
            {new Set(ofYear.map((s) => s.brand)).size > 1 && (
              <div className="mt-6 flex flex-wrap gap-2">
                {(
                  [
                    "all",
                    ...BRANDS.filter((b) =>
                      ofYear.some((s) => s.brand === b.id),
                    ).map((b) => b.id),
                  ] as (BrandId | "all")[]
                ).map((id) => {
                  const b = id === "all" ? null : brandById(id);
                  const on = brand === id;
                  return (
                    <button
                      key={id}
                      onClick={() => {
                        setBrand(id);
                        setDeal((n) => n + 1);
                      }}
                      className="rounded-full border px-3.5 py-1.5 text-xs font-semibold transition"
                      style={{
                        borderColor: on
                          ? (b?.accent ?? "#fff")
                          : "rgba(255,255,255,.15)",
                        background: on
                          ? b
                            ? `${b.accent}22`
                            : "#fff"
                          : "transparent",
                        color: on
                          ? (b?.accent ?? "#000")
                          : "rgba(255,255,255,.6)",
                      }}
                    >
                      {b ? b.name : t({ en: "All", ko: "전체" })}
                    </button>
                  );
                })}
              </div>
            )}

            <Shelf key={`${year}-${brand}-${deal}`} shows={list} />
          </>
        )}
      </div>
    </section>
  );
}

const ITEM_W = 196; // px per year on the dial

let audio: AudioContext | null = null;
/** A short, quiet mechanical click (and a tiny buzz on phones) for each year that passes the middle. */
function tick() {
  try {
    navigator.vibrate?.(6);
    audio ??= new AudioContext();
    const a = audio;
    const t0 = a.currentTime;
    const osc = a.createOscillator();
    const gain = a.createGain();
    osc.type = "square";
    osc.frequency.setValueAtTime(1800, t0);
    osc.frequency.exponentialRampToValueAtTime(500, t0 + 0.025);
    gain.gain.setValueAtTime(0.025, t0);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.04);
    osc.connect(gain).connect(a.destination);
    osc.start(t0);
    osc.stop(t0 + 0.05);
  } catch {}
}

/**
 * Years on a horizontal dial. Grab it (mouse), swipe it (touch) or scroll it; years grow as they
 * near the middle, each one passing the middle ticks, and the one it settles on is picked.
 */
function YearDial({
  years,
  counts,
  year,
  onPick,
}: {
  years: number[];
  counts: (y: number) => number;
  year: number | null;
  onPick: (y: number) => void;
}) {
  const { t } = useLang();
  const ref = useRef<HTMLDivElement>(null);
  const items = useRef<(HTMLButtonElement | null)[]>([]);
  const [center, setCenter] = useState(() =>
    Math.max(0, years.indexOf(year ?? years[0])),
  );
  const centerRef = useRef(center);
  const user = useRef(false); // the current scroll comes from the visitor, not from code
  const drag = useRef<{ x: number; left: number; moved: boolean } | null>(null);
  const settle = useRef(0);

  const scrollToIndex = useCallback((i: number, smooth = true) => {
    ref.current?.scrollTo({
      left: i * ITEM_W,
      behavior: smooth ? "smooth" : "auto",
    });
  }, []);

  // size and fade each year by its distance from the middle (styles only, no re-render per frame)
  const paint = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const pos = el.scrollLeft / ITEM_W;
    items.current.forEach((b, i) => {
      if (!b) return;
      const d = Math.min(Math.abs(i - pos), 3);
      b.style.setProperty("--s", String(Math.max(0.7, 1.4 - d * 0.35)));
      b.style.setProperty("--o", String(Math.max(0.12, 1 - d * 0.5)));
    });
    const i = Math.max(0, Math.min(years.length - 1, Math.round(pos)));
    if (i !== centerRef.current) {
      centerRef.current = i;
      setCenter(i);
      if (user.current) tick();
    }
  }, [years.length]);

  useLayoutEffect(() => {
    const i = Math.max(0, years.indexOf(year ?? years[0]));
    centerRef.current = i;
    setCenter(i);
    scrollToIndex(i, false);
    paint();
    // only on mount and when the list of years changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [years]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let raf = 0;
    const done = () => {
      if (drag.current) return;
      const y = years[centerRef.current];
      if (user.current && y !== undefined && y !== year) onPick(y);
      user.current = false;
    };
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(paint);
      clearTimeout(settle.current);
      settle.current = window.setTimeout(done, 180);
    };
    // a vertical mouse wheel turns the dial too, until it reaches either end
    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) {
        user.current = true;
        return;
      }
      const atStart = el.scrollLeft <= 0 && e.deltaY < 0;
      const atEnd =
        el.scrollLeft >= el.scrollWidth - el.clientWidth - 1 && e.deltaY > 0;
      if (atStart || atEnd) return;
      e.preventDefault();
      user.current = true;
      el.scrollLeft += e.deltaY;
    };
    const onTouch = () => (user.current = true);
    el.addEventListener("scroll", onScroll, { passive: true });
    el.addEventListener("wheel", onWheel, { passive: false });
    el.addEventListener("touchstart", onTouch, { passive: true });
    return () => {
      el.removeEventListener("scroll", onScroll);
      el.removeEventListener("wheel", onWheel);
      el.removeEventListener("touchstart", onTouch);
      cancelAnimationFrame(raf);
    };
  }, [paint, years, year, onPick]);

  // mouse: grab and drag (touch screens already scroll natively)
  const onPointerDown = (e: ReactPointerEvent) => {
    if (e.pointerType !== "mouse" || e.button !== 0 || !ref.current) return;
    drag.current = { x: e.clientX, left: ref.current.scrollLeft, moved: false };
    ref.current.style.scrollSnapType = "none";
    user.current = true;
  };
  useEffect(() => {
    const move = (e: PointerEvent) => {
      const d = drag.current;
      const el = ref.current;
      if (!d || !el) return;
      const dx = e.clientX - d.x;
      if (Math.abs(dx) > 4) d.moved = true;
      if (d.moved) e.preventDefault();
      el.scrollLeft = d.left - dx * 1.2;
    };
    const up = () => {
      const d = drag.current;
      const el = ref.current;
      if (!d || !el) return;
      drag.current = null;
      el.style.scrollSnapType = "";
      scrollToIndex(Math.round(el.scrollLeft / ITEM_W));
      if (d.moved) {
        // swallow the click that ends a drag
        const stop = (ev: Event) => {
          ev.stopPropagation();
          ev.preventDefault();
        };
        window.addEventListener("click", stop, { capture: true, once: true });
        setTimeout(
          () => window.removeEventListener("click", stop, { capture: true }),
          0,
        );
      }
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
  }, [scrollToIndex]);

  const step = (dir: number) => {
    user.current = true;
    scrollToIndex(
      Math.max(0, Math.min(years.length - 1, centerRef.current + dir)),
    );
  };

  const mask =
    "linear-gradient(to right, transparent, #000 20%, #000 80%, transparent)";

  return (
    <div className="-mx-5 sm:mx-0">
      <div className="relative">
        <div
          ref={ref}
          onPointerDown={onPointerDown}
          onDragStart={(e) => e.preventDefault()}
          role="tablist"
          aria-label={t({ en: "Year", ko: "연도" })}
          onKeyDown={(e) => {
            if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
              e.preventDefault();
              step(e.key === "ArrowLeft" ? -1 : 1);
            }
          }}
          className="flex cursor-grab snap-x snap-mandatory overflow-x-auto pb-10 pt-12 [scrollbar-width:none] active:cursor-grabbing [&::-webkit-scrollbar]:hidden"
          style={{
            paddingInline: `calc(50% - ${ITEM_W / 2}px)`,
            maskImage: mask,
            WebkitMaskImage: mask,
          }}
        >
          {years.map((y, i) => {
            const on = i === center;
            const n = counts(y);
            return (
              <button
                key={y}
                ref={(el) => {
                  items.current[i] = el;
                }}
                role="tab"
                aria-selected={y === year}
                tabIndex={y === year ? 0 : -1}
                onClick={() => {
                  user.current = true;
                  if (i === centerRef.current) onPick(y);
                  else scrollToIndex(i);
                }}
                className="flex shrink-0 select-none snap-center flex-col items-center"
                style={{ width: ITEM_W }}
              >
                <span
                  className="ska-display block origin-bottom text-[52px] leading-none text-white will-change-transform sm:text-[60px]"
                  style={{
                    transform: "scale(var(--s, 1))",
                    opacity: "var(--o, 1)",
                  }}
                >
                  {y}
                </span>
                <span
                  className={`mt-3 block whitespace-nowrap text-[11px] uppercase tracking-[0.25em] transition duration-300 ${on ? "text-white/60" : "text-transparent"}`}
                >
                  {n} {t({ en: n === 1 ? "show" : "shows", ko: "개 공연" })}
                </span>
              </button>
            );
          })}
        </div>
        {/* the needle in the middle of the dial */}
        <span
          aria-hidden
          className="pointer-events-none absolute bottom-6 left-1/2 h-0.5 w-28 -translate-x-1/2 rounded-full bg-white"
        />
        <span
          aria-hidden
          className="pointer-events-none absolute bottom-[27px] left-1/2 h-2 w-2 -translate-x-1/2 rotate-45 bg-white"
        />
        {/* ruler marks between years */}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-2 h-2 opacity-25"
          style={{
            backgroundImage:
              "repeating-linear-gradient(to right, #fff 0 1px, transparent 1px 21px)",
            maskImage: mask,
            WebkitMaskImage: mask,
          }}
        />
        {years.length > 1 &&
          [-1, 1].map((d) => (
            <button
              key={d}
              onClick={() => step(d)}
              disabled={d < 0 ? center === 0 : center === years.length - 1}
              aria-label={
                d < 0
                  ? t({ en: "Newer year", ko: "최근 연도" })
                  : t({ en: "Older year", ko: "이전 연도" })
              }
              className={`absolute top-[42%] hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/15 bg-black/40 backdrop-blur transition hover:border-white hover:bg-white hover:text-black disabled:pointer-events-none disabled:opacity-0 sm:flex ${
                d < 0 ? "left-0" : "right-0"
              }`}
            >
              <Arrow className={`h-4 w-4 ${d < 0 ? "rotate-180" : ""}`} />
            </button>
          ))}
      </div>
      <p className="pointer-events-none mt-2 text-center text-[10px] uppercase tracking-[0.3em] text-white/30">
        {t({ en: "← drag to travel in time →", ko: "← 끌어서 연도 이동 →" })}
      </p>
    </div>
  );
}

/** A row of posters that fan out from a stack when it mounts. */
function Shelf({ shows }: { shows: Show[] }) {
  const { t, lang } = useLang();
  const row = useSnapIndex<HTMLDivElement>();
  // every poster starts in one pile in the middle of the shelf, then deals out to its slot
  useLayoutEffect(() => {
    const el = row.ref.current;
    if (!el || shows.length < 2) return;
    const mid = el.clientWidth / 2;
    [...el.children].forEach((c, i) => {
      const h = c as HTMLElement;
      const dx = mid - (h.offsetLeft - el.scrollLeft + h.offsetWidth / 2);
      h.style.setProperty("--dx", `${dx}px`);
      h.style.setProperty("--dy", `${-i * 3}px`);
    });
  }, [row.ref, shows.length]);
  const scrollBy = (dir: number) =>
    row.ref.current?.scrollBy({
      left: dir * row.ref.current.clientWidth * 0.7,
      behavior: "smooth",
    });

  return (
    <div className="relative mt-10">
      {/* stage light under the shelf */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-[radial-gradient(60%_100%_at_50%_100%,rgba(255,255,255,.08),transparent)]"
      />

      <div
        ref={row.ref}
        className="relative -mx-5 flex snap-x snap-mandatory gap-5 overflow-x-auto px-5 pb-16 pt-4 [scrollbar-width:none] sm:-mx-8 sm:gap-7 sm:px-8"
      >
        {shows.map((s, i) => {
          const b = brandById(s.brand);
          return (
            <Link
              key={s.slug}
              href={`/shows/${s.slug}`}
              className={`${shows.length > 1 ? "ska-deal" : "ska-rise"} group relative w-[62vw] max-w-[260px] shrink-0 snap-center sm:w-[240px] sm:snap-start`}
              style={
                {
                  // pile askew, then deal: the pile shows for a beat before cards fly out in turn
                  "--rot": `${(i % 2 ? 1 : -1) * (3 + (i % 3) * 2.5)}deg`,
                  animationDelay: `${120 + i * 75}ms`,
                  zIndex: shows.length - i,
                } as CSSProperties
              }
            >
              <div className="relative transition duration-500 ease-out group-hover:-translate-y-3 group-hover:rotate-[-1deg] group-focus-visible:-translate-y-3">
                <div className="relative overflow-hidden rounded-xl shadow-[0_30px_60px_-20px_rgba(0,0,0,.9)] ring-1 ring-white/10 transition duration-500 group-hover:shadow-[0_40px_80px_-20px_rgba(0,0,0,1)]">
                  <Poster
                    src={s.poster}
                    brand={b}
                    title={s.title}
                    edition={s.edition}
                  />
                  {s.gallery?.[0] && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={s.gallery[0].url}
                      alt=""
                      loading="lazy"
                      className="absolute inset-0 h-full w-full scale-105 object-cover opacity-0 transition duration-700 group-hover:scale-100 group-hover:opacity-100"
                    />
                  )}
                  <div className="absolute inset-x-0 bottom-0 translate-y-3 bg-gradient-to-t from-black via-black/80 to-transparent p-4 pt-14 opacity-0 transition duration-500 group-hover:translate-y-0 group-hover:opacity-100">
                    <p
                      className="text-[10px] uppercase tracking-[0.25em]"
                      style={{ color: b.accent }}
                    >
                      {fmtDate(s.start, lang, s.end, s.dateTBA)}
                    </p>
                    <p className="mt-1 text-xs text-white/70">
                      {t(s.venue) || t(s.city)}
                    </p>
                    <span className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-white">
                      {t({ en: "View show", ko: "공연 보기" })}{" "}
                      <Arrow className="h-3 w-3" />
                    </span>
                  </div>
                  {!!s.gallery?.length && (
                    <span className="absolute left-3 top-3 rounded-full bg-black/70 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur">
                      📷 {s.gallery.length}
                    </span>
                  )}
                </div>
              </div>
              <div className="mt-4 px-1">
                <p
                  className="text-[10px] uppercase tracking-[0.25em]"
                  style={{ color: b.accent }}
                >
                  {b.name}
                </p>
                <h3 className="ska-display mt-1 text-xl leading-tight">
                  {s.title} <span className="text-white/40">{s.edition}</span>
                </h3>
                <p className="mt-1 text-xs text-white/45">
                  {t(s.city)}
                  {t(s.country) && `, ${t(s.country)}`}
                </p>
              </div>
            </Link>
          );
        })}
      </div>

      {shows.length > 3 && (
        <div className="absolute -top-14 right-0 hidden gap-2 sm:flex">
          {[-1, 1].map((d) => (
            <button
              key={d}
              onClick={() => scrollBy(d)}
              className="flex h-11 w-11 items-center justify-center rounded-full border border-white/15 transition hover:border-white hover:bg-white hover:text-black"
              aria-label={d < 0 ? "Previous" : "Next"}
            >
              <Arrow className={`h-4 w-4 ${d < 0 ? "rotate-180" : ""}`} />
            </button>
          ))}
        </div>
      )}
      <SwipeDots
        count={shows.length}
        index={row.index}
        onPick={row.go}
        className="-mt-10 sm:hidden"
      />
    </div>
  );
}
