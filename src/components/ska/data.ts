// Brand definitions and the starting show list. Shows are edited at /ska/admin and stored by
// src/lib/ska-store.ts; DEFAULT_SHOWS only seeds the store until the first admin save.

export type L = { en: string; ko: string };
export type BrandId = 'kpop' | 'rock' | 'swag';

export type Brand = {
  id: BrandId;
  name: string;
  short: string;
  genre: L;
  tagline: L;
  blurb: L;
  partner?: string;
  accent: string;
  accent2: string;
};

export const BRANDS: Brand[] = [
  {
    id: 'kpop',
    name: 'KPOP PRIME',
    short: 'KP',
    genre: { en: 'K-POP Idol Concert', ko: 'K-POP 아이돌 콘서트' },
    tagline: { en: 'The prime stage for K-POP idols.', ko: 'K-POP 아이돌을 위한 프라임 스테이지.' },
    blurb: {
      en: 'A multi-artist K-POP idol concert co-produced with KHAM Inc. (Taiwan), bringing Korea’s biggest idol stages to Asian arenas.',
      ko: '대만 KHAM Inc.와 공동 제작하는 K-POP 아이돌 합동 콘서트. 한국 최정상 아이돌 무대를 아시아 아레나로 옮겨옵니다.',
    },
    partner: 'KHAM Inc. · Taiwan',
    accent: '#ff3ea5',
    accent2: '#8b5cff',
  },
  {
    id: 'rock',
    name: '7 ROCK PRIME',
    short: '7R',
    genre: { en: 'Band Festival', ko: '밴드 페스티벌' },
    tagline: { en: 'Seven bands. One prime night.', ko: '일곱 개의 밴드, 하나의 프라임 나이트.' },
    blurb: {
      en: 'A band festival built around live sound — from Korean indie heroes to arena rock headliners, loud and unfiltered.',
      ko: '라이브 사운드에 집중한 밴드 페스티벌. 한국 인디 히어로부터 아레나 록 헤드라이너까지, 크고 날것 그대로.',
    },
    accent: '#ff4b2b',
    accent2: '#ffb000',
  },
  {
    id: 'swag',
    name: 'SKA SUPER SWAG FESTIVAL',
    short: 'SSS',
    genre: { en: 'Hip-Hop Festival', ko: '힙합 페스티벌' },
    tagline: { en: 'Korean hip-hop, turned all the way up.', ko: '한국 힙합, 볼륨 끝까지.' },
    blurb: {
      en: 'SKA’s own hip-hop festival — headliners, rising MCs and DJ sets across multiple stages, with the energy of a block party.',
      ko: 'SKA의 오리지널 힙합 페스티벌. 헤드라이너, 라이징 MC, DJ 셋이 여러 스테이지에서 블록파티의 에너지로 펼쳐집니다.',
    },
    accent: '#c6ff00',
    accent2: '#ffd400',
  },
];

export const brandById = (id: BrandId) => BRANDS.find((b) => b.id === id)!;

export type Stage = { name: string; slots: { time: string; end: string; act: string }[] };

export type Show = {
  slug: string;
  brand: BrandId;
  title: string;
  edition: string;
  city: L;
  country: L;
  venue: L;
  start: string; // ISO date, local show time
  end?: string;
  poster?: string;
  summary: L;
  lineup: Artist[];
  /** After-show photos, uploaded in the admin once the show is over. */
  gallery?: Photo[];
  /** Timetable as uploaded images (one per day/stage); shown instead of the built-in grid. */
  timetableImages?: Photo[];
  /** Uploaded seat map (e.g. the ticketing site's venue map). Without it a generic layout is drawn. */
  seatMap?: string;
  stages: Stage[];
  zones: Zone[];
};

/** A lineup slot. Unannounced slots show as locked cards; announced ones flip to name + photo. */
export type Artist = { id: string; name: string; photo?: string; announced: boolean };
export type Photo = { id: string; url: string; caption?: string };
/**
 * A seating zone. x/y place its pin on the uploaded seat map, in % of the image; `shape` is an
 * optional outline ("x,y x,y …" in the same % units) that makes the whole section clickable.
 */
export type Zone = { id: string; label: string; tier: L; price?: string; color?: string; x?: number; y?: number; shape?: string };

/** A show is history once its last day is over. */
export const isPast = (s: Pick<Show, 'start' | 'end'>, now = Date.now()) =>
  new Date(s.end ?? s.start).getTime() + 6 * 36e5 < now;

const tbaLineup = (announced: number, total: number): Artist[] =>
  Array.from({ length: total }, (_, i) => ({ id: `a${i + 1}`, name: '', announced: i < announced }));

export const ZONES: Zone[] = [
  { id: 'floor', label: 'FLOOR', tier: { en: 'Standing · VIP', ko: '스탠딩 · VIP' }, color: '#ff3ea5' },
  { id: 'r', label: 'R', tier: { en: 'Reserved R', ko: 'R석' }, color: '#8b5cff' },
  { id: 's', label: 'S', tier: { en: 'Reserved S', ko: 'S석' }, color: '#3b82f6' },
  { id: 'a', label: 'A', tier: { en: 'Reserved A', ko: 'A석' }, color: '#22c55e' },
];

export const DEFAULT_SHOWS: Show[] = [
  {
    slug: 'kpop-prime-2026-taipei',
    brand: 'kpop',
    title: 'KPOP PRIME',
    edition: '2026 in TAIPEI',
    city: { en: 'Taipei', ko: '타이베이' },
    country: { en: 'Taiwan', ko: '대만' },
    venue: { en: 'Venue to be announced', ko: '공연장 추후 공개' },
    start: '2026-12-19T18:00:00+08:00',
    end: '2026-12-20T22:00:00+08:00',
    summary: {
      en: 'Two nights of K-POP idol stages in Taipei, co-produced with KHAM Inc.',
      ko: 'KHAM Inc.와 함께하는 타이베이 이틀간의 K-POP 아이돌 무대.',
    },
    lineup: tbaLineup(4, 10),
    stages: [
      {
        name: 'DAY 1',
        slots: [
          { time: '18:00', end: '18:40', act: 'Artist TBA' },
          { time: '18:50', end: '19:30', act: 'Artist TBA' },
          { time: '19:45', end: '20:30', act: 'Artist TBA' },
          { time: '20:45', end: '21:45', act: 'Headliner TBA' },
        ],
      },
      {
        name: 'DAY 2',
        slots: [
          { time: '18:00', end: '18:40', act: 'Artist TBA' },
          { time: '18:50', end: '19:30', act: 'Artist TBA' },
          { time: '19:45', end: '20:30', act: 'Artist TBA' },
          { time: '20:45', end: '21:45', act: 'Headliner TBA' },
        ],
      },
    ],
    zones: ZONES,
  },
  {
    slug: 'ska-super-swag-2027',
    brand: 'swag',
    title: 'SKA SUPER SWAG',
    edition: 'FESTIVAL 2027',
    city: { en: 'Seoul', ko: '서울' },
    country: { en: 'Korea', ko: '대한민국' },
    venue: { en: 'Venue to be announced', ko: '공연장 추후 공개' },
    start: '2027-03-27T14:00:00+09:00',
    end: '2027-03-28T22:00:00+09:00',
    summary: {
      en: 'Two days, multiple stages, all Korean hip-hop.',
      ko: '이틀, 멀티 스테이지, 오직 한국 힙합.',
    },
    lineup: tbaLineup(6, 16),
    stages: [
      {
        name: 'SWAG STAGE',
        slots: [
          { time: '14:00', end: '14:40', act: 'Rookie MC TBA' },
          { time: '15:00', end: '15:45', act: 'Artist TBA' },
          { time: '16:15', end: '17:00', act: 'Artist TBA' },
          { time: '17:30', end: '18:30', act: 'Artist TBA' },
          { time: '19:00', end: '20:00', act: 'Co-Headliner TBA' },
          { time: '20:30', end: '21:45', act: 'Headliner TBA' },
        ],
      },
      {
        name: 'BLOCK STAGE',
        slots: [
          { time: '14:30', end: '15:30', act: 'DJ Set TBA' },
          { time: '15:45', end: '16:30', act: 'Artist TBA' },
          { time: '17:00', end: '18:00', act: 'Cypher Battle' },
          { time: '18:30', end: '19:30', act: 'Artist TBA' },
          { time: '20:00', end: '21:30', act: 'DJ Set TBA' },
        ],
      },
    ],
    zones: ZONES,
  },
  {
    slug: '7-rock-prime-2027',
    brand: 'rock',
    title: '7 ROCK PRIME',
    edition: '2027',
    city: { en: 'Seoul', ko: '서울' },
    country: { en: 'Korea', ko: '대한민국' },
    venue: { en: 'Venue to be announced', ko: '공연장 추후 공개' },
    start: '2027-05-22T15:00:00+09:00',
    summary: {
      en: 'Seven bands, one stage, one night of live sound.',
      ko: '일곱 밴드, 하나의 무대, 라이브 사운드의 밤.',
    },
    lineup: tbaLineup(3, 7),
    stages: [
      {
        name: 'PRIME STAGE',
        slots: [
          { time: '15:00', end: '15:40', act: 'Band 7' },
          { time: '16:00', end: '16:40', act: 'Band 6' },
          { time: '17:00', end: '17:45', act: 'Band 5' },
          { time: '18:05', end: '18:50', act: 'Band 4' },
          { time: '19:10', end: '20:00', act: 'Band 3' },
          { time: '20:20', end: '21:10', act: 'Band 2' },
          { time: '21:30', end: '22:40', act: 'Headliner' },
        ],
      },
    ],
    zones: ZONES,
  },
];

// Placeholder figures for the mock-up — replace with real numbers before launch.
export const STATS = [
  { value: 3, suffix: '', label: { en: 'Original festival IPs', ko: '오리지널 페스티벌 IP' } },
  { value: 2, suffix: '', label: { en: 'Countries on the map', ko: '진출 국가' } },
  { value: 100, suffix: '+', label: { en: 'Artists in network', ko: '네트워크 아티스트' } },
  { value: 24, suffix: '/7', label: { en: 'Booking desk', ko: '부킹 데스크' } },
];

/** Site-wide options edited in the admin. */
export type SiteSettings = {
  /** Background music: starts softly when a visitor enters through the intro; visitors can toggle it. */
  bgm?: { url: string; title?: string; volume: number; enabled: boolean };
};

export const CONTACT_EMAIL = 'booking@skaproductions.com';

export const SOCIALS = [
  { name: 'Instagram', handle: '@skaproductions_official', url: 'https://www.instagram.com/skaproductions_official/' },
  { name: 'YouTube', handle: '@ska_productions', url: 'https://www.youtube.com/@ska_productions' },
] as const;
