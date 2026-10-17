import 'server-only';
import { BlobNotFoundError, del, head, list, put } from '@vercel/blob';
import { revalidateTag, unstable_cache } from 'next/cache';
import { randomBytes } from 'node:crypto';
import { mkdir, readdir, readFile, rename, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { BRANDS, DEFAULT_SHOWS, ZONES, type Artist, type BrandId, type L, type Photo, type Show, type SiteSettings, type Zone } from '@/components/ska/data';

// Two storage backends behind one API:
// - Vercel Blob when BLOB_READ_WRITE_TOKEN is set (production on Vercel). The show list is one public
//   JSON blob. Reads ask the Blob API for its current etag and fetch the file with that etag in the
//   URL, so the CDN can't hand back an older copy; public pages also keep the result in Next's data
//   cache (tag `ska-shows`), which every save expires at once. Every save also writes a timestamped
//   backup. Images and audio are public blobs served straight from the Blob CDN; the admin uploads
//   them from the browser straight to Blob (see /api/ska/admin/upload), which avoids the 4.5 MB
//   request limit of Vercel functions. Site settings (background music) work like the show list.
// - Local disk under /data/ska otherwise (development on this PC). Images are served by
//   /api/ska/media/[file].

const ROOT = path.join(process.cwd(), 'data', 'ska');
const MEDIA = path.join(ROOT, 'media');
const SHOWS_FILE = path.join(ROOT, 'shows.json');
const SETTINGS_FILE = path.join(ROOT, 'settings.json');
const BACKUPS = path.join(ROOT, 'backups');
const KEEP_BACKUPS = 30;

export const IMAGE_TYPES: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
export const AUDIO_TYPES: Record<string, string> = { 'audio/mpeg': 'mp3', 'audio/mp4': 'm4a', 'audio/x-m4a': 'm4a' };
export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
export const MAX_AUDIO_BYTES = 15 * 1024 * 1024;
export const MEDIA_FILE_RE = /^[a-z0-9-]+\.(jpg|png|webp|mp3|m4a)$/;
/** Blob pathname a browser upload may write to (checked before issuing an upload token). */
export const BLOB_UPLOAD_PATH_RE = /^ska\/media\/[a-z0-9-]+\.(jpg|png|webp|mp3|m4a)$/;
const MEDIA_PREFIX = '/api/ska/media/';
const BLOB_MEDIA_RE = /^https:\/\/[a-z0-9]+\.public\.blob\.vercel-storage\.com\/ska\/media\/[a-z0-9-]+\.(jpg|png|webp|mp3|m4a)$/;
const BLOB_SHOWS = 'ska/data/shows.json';
const BLOB_SETTINGS = 'ska/data/settings.json';
const BLOB_BACKUPS = 'ska/backups/';

const SHOWS_TAG = 'ska-shows';
const SETTINGS_TAG = 'ska-settings';

const useBlob = () => !!process.env.BLOB_READ_WRITE_TOKEN;
/** True on Vercel (Blob storage); false in local dev (disk). */
export const usesBlobStorage = useBlob;

/** Reads a JSON document from Blob (current etag, so never a stale CDN copy) or from disk. */
async function readJson<T>(blobPath: string, diskPath: string): Promise<T | null> {
  if (useBlob()) {
    let meta;
    try {
      meta = await head(blobPath);
    } catch (e) {
      if (e instanceof BlobNotFoundError) return null;
      throw e;
    }
    const res = await fetch(`${meta.url}?v=${encodeURIComponent(meta.etag || String(meta.uploadedAt.getTime()))}`, { cache: 'no-store' });
    if (!res.ok) throw new Error(`Reading ${blobPath} failed: ${res.status}`);
    return (await res.json()) as T;
  }
  try {
    return JSON.parse(await readFile(diskPath, 'utf8')) as T;
  } catch {
    return null;
  }
}

/* ---------- shows ---------- */

const readShows = () => readJson<Show[]>(BLOB_SHOWS, SHOWS_FILE);

const readShowsCached = unstable_cache(async () => (await readShows()) ?? DEFAULT_SHOWS, ['ska-shows'], {
  tags: [SHOWS_TAG],
  revalidate: 3600,
});

/** All shows, oldest first. `fresh` skips the data cache (admin, and before every write). */
export async function getShows({ fresh = false } = {}): Promise<Show[]> {
  const shows = useBlob() && !fresh ? structuredClone(await readShowsCached()) : ((await readShows()) ?? structuredClone(DEFAULT_SHOWS));
  return shows.sort((a, b) => a.start.localeCompare(b.start));
}

export async function getShow(slug: string) {
  return (await getShows()).find((s) => s.slug === slug);
}

// Serialise writes so two quick saves can't overwrite each other.
let queue: Promise<unknown> = Promise.resolve();
function locked<T>(fn: () => Promise<T>): Promise<T> {
  const run = queue.then(fn, fn);
  queue = run.catch(() => {});
  return run;
}

async function writeShows(shows: Show[]) {
  const json = JSON.stringify(shows, null, 2);
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  if (useBlob()) {
    const opts = { access: 'public', contentType: 'application/json', addRandomSuffix: false } as const;
    // short CDN lifetime: reads already add the etag to the URL, this just limits stale copies further
    await put(BLOB_SHOWS, json, { ...opts, allowOverwrite: true, cacheControlMaxAge: 60 });
    revalidateTag(SHOWS_TAG, { expire: 0 });
    // every save also lands in ska/backups/ so a bad edit can be undone
    await put(`${BLOB_BACKUPS}shows-${stamp}.json`, json, opts);
    const { blobs } = await list({ prefix: BLOB_BACKUPS, limit: 1000 });
    const old = blobs.map((b) => b.pathname).sort().slice(0, -KEEP_BACKUPS);
    if (old.length) await del(old);
    return;
  }
  await mkdir(BACKUPS, { recursive: true });
  const tmp = `${SHOWS_FILE}.tmp`;
  await writeFile(tmp, json);
  await rename(tmp, SHOWS_FILE);
  // every save also lands in data/ska/backups/ so a bad edit or a deleted file can be undone
  await writeFile(path.join(BACKUPS, `shows-${stamp}.json`), json);
  const old = (await readdir(BACKUPS)).filter((f) => f.startsWith('shows-')).sort().slice(0, -KEEP_BACKUPS);
  await Promise.all(old.map((f) => unlink(path.join(BACKUPS, f)).catch(() => {})));
}

const imagesOf = (s?: Show) =>
  [s?.poster, s?.seatMap, ...(s?.lineup ?? []).map((a) => a.photo), ...(s?.gallery ?? []).map((p) => p.url)].filter((u): u is string => !!u);

/** Creates (no slug) or updates a show. Returns the saved show. */
export function saveShow(raw: unknown) {
  return locked(async () => {
    const shows = await getShows({ fresh: true });
    const input = normalizeShow(raw);
    const i = shows.findIndex((s) => s.slug === input.slug);
    const prev = i >= 0 ? shows[i] : undefined;
    const show: Show = {
      ...input,
      slug: prev?.slug ?? uniqueSlug(input, shows),
      // the timetable isn't edited in the admin yet, so keep what's there
      stages: prev?.stages ?? [],
      zones: input.zones ?? prev?.zones ?? ZONES,
    };
    if (i >= 0) shows[i] = show;
    else shows.push(show);
    await writeShows(shows);
    const keep = new Set(imagesOf(show));
    await Promise.all(imagesOf(prev).filter((u) => !keep.has(u)).map(deleteImage));
    return show;
  });
}

export function deleteShow(slug: string) {
  return locked(async () => {
    const shows = await getShows({ fresh: true });
    const show = shows.find((s) => s.slug === slug);
    if (!show) return false;
    await writeShows(shows.filter((s) => s.slug !== slug));
    await Promise.all(imagesOf(show).map(deleteImage));
    return true;
  });
}

function uniqueSlug(s: Pick<Show, 'title' | 'edition'>, shows: Show[]) {
  const base =
    `${s.title} ${s.edition}`
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 60) || 'show';
  let slug = base;
  for (let n = 2; shows.some((x) => x.slug === slug); n++) slug = `${base}-${n}`;
  return slug;
}

/* ---------- validation ---------- */

export class InvalidShow extends Error {}

const str = (v: unknown, max: number, field: string, required = false) => {
  const s = typeof v === 'string' ? v.trim().slice(0, max) : '';
  if (required && !s) throw new InvalidShow(`missing_${field}`);
  return s;
};
const loc = (v: unknown, max: number, field: string): L => {
  const o = (v ?? {}) as Partial<L>;
  return { en: str(o.en, max, field), ko: str(o.ko, max, field) };
};
const iso = (v: unknown, field: string, required: boolean) => {
  const s = str(v, 40, field, required);
  if (!s) return undefined;
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?(Z|[+-]\d{2}:\d{2})$/.test(s) || isNaN(Date.parse(s)))
    throw new InvalidShow(`bad_${field}`);
  return s;
};
const media = (v: unknown) => {
  const s = typeof v === 'string' ? v : '';
  const local = s.startsWith(MEDIA_PREFIX) && MEDIA_FILE_RE.test(s.slice(MEDIA_PREFIX.length));
  return local || BLOB_MEDIA_RE.test(s) ? s : undefined;
};

function normalizeShow(raw: unknown): Omit<Show, 'stages' | 'zones'> & { zones?: Zone[] } {
  const r = (raw ?? {}) as Record<string, unknown>;
  const brand = r.brand as BrandId;
  if (!BRANDS.some((b) => b.id === brand)) throw new InvalidShow('bad_brand');
  const start = iso(r.start, 'start', true)!;
  const end = iso(r.end, 'end', false);
  if (end && end < start) throw new InvalidShow('end_before_start');
  const lineup = (Array.isArray(r.lineup) ? r.lineup : []).slice(0, 80).map(
    (a: Record<string, unknown>, i): Artist => ({
      id: str(a?.id, 40, 'artist') || `a${i}-${randomBytes(3).toString('hex')}`,
      name: str(a?.name, 80, 'artist'),
      photo: media(a?.photo),
      announced: !!a?.announced,
    }),
  );
  const gallery = (Array.isArray(r.gallery) ? r.gallery : [])
    .slice(0, 200)
    .map((p: Record<string, unknown>, i): Photo | null => {
      const url = media(p?.url);
      if (!url) return null;
      const caption = str(p?.caption, 200, 'caption');
      return { id: str(p?.id, 40, 'photo') || `p${i}-${randomBytes(3).toString('hex')}`, url, ...(caption && { caption }) };
    })
    .filter((p): p is Photo => !!p);
  const pct = (v: unknown) => (typeof v === 'number' && v >= 0 && v <= 100 ? Math.round(v * 100) / 100 : undefined);
  const zones = Array.isArray(r.zones)
    ? r.zones.slice(0, 60).map(
        (z: Record<string, unknown>, i): Zone => ({
          id: str(z?.id, 40, 'zone') || `z${i}-${randomBytes(3).toString('hex')}`,
          label: str(z?.label, 16, 'zone') || `Z${i + 1}`,
          tier: loc(z?.tier, 60, 'zone'),
          price: str(z?.price, 40, 'price') || undefined,
          color: typeof z?.color === 'string' && /^#[0-9a-f]{6}$/i.test(z.color) ? z.color : undefined,
          x: pct(z?.x),
          y: pct(z?.y),
          shape: typeof z?.shape === 'string' && /^(\d{1,3}(\.\d+)?,\d{1,3}(\.\d+)? ?){3,40}$/.test(z.shape) ? z.shape.trim() : undefined,
        }),
      )
    : undefined;
  return {
    slug: str(r.slug, 80, 'slug'),
    brand,
    title: str(r.title, 60, 'title', true),
    edition: str(r.edition, 60, 'edition'),
    city: loc(r.city, 60, 'city'),
    country: loc(r.country, 60, 'country'),
    venue: loc(r.venue, 120, 'venue'),
    summary: loc(r.summary, 600, 'summary'),
    start,
    end,
    poster: media(r.poster),
    lineup,
    gallery,
    seatMap: media(r.seatMap),
    zones,
  };
}

/* ---------- site settings ---------- */

const readSettingsCached = unstable_cache(async () => (await readJson<SiteSettings>(BLOB_SETTINGS, SETTINGS_FILE)) ?? {}, ['ska-settings'], {
  tags: [SETTINGS_TAG],
  revalidate: 3600,
});

export async function getSettings({ fresh = false } = {}): Promise<SiteSettings> {
  if (useBlob() && !fresh) return structuredClone(await readSettingsCached());
  return (await readJson<SiteSettings>(BLOB_SETTINGS, SETTINGS_FILE)) ?? {};
}

export function saveSettings(raw: unknown) {
  return locked(async () => {
    const prev = await getSettings({ fresh: true });
    const r = (raw ?? {}) as { bgm?: Record<string, unknown> | null };
    const url = media(r.bgm?.url);
    const vol = Number(r.bgm?.volume);
    const next: SiteSettings = {
      bgm: url
        ? {
            url,
            title: str(r.bgm?.title, 80, 'title') || undefined,
            volume: Number.isFinite(vol) ? Math.min(0.8, Math.max(0.05, Math.round(vol * 100) / 100)) : 0.25,
            enabled: r.bgm?.enabled !== false,
          }
        : undefined,
    };
    const json = JSON.stringify(next, null, 2);
    if (useBlob()) {
      await put(BLOB_SETTINGS, json, { access: 'public', contentType: 'application/json', addRandomSuffix: false, allowOverwrite: true, cacheControlMaxAge: 60 });
      revalidateTag(SETTINGS_TAG, { expire: 0 });
    } else {
      await mkdir(ROOT, { recursive: true });
      await writeFile(SETTINGS_FILE, json);
    }
    if (prev.bgm?.url && prev.bgm.url !== next.bgm?.url) await deleteImage(prev.bgm.url);
    return next;
  });
}

/* ---------- images & audio ---------- */

export async function saveImage(file: File, prefix: string) {
  const ext = IMAGE_TYPES[file.type] ?? AUDIO_TYPES[file.type];
  if (!ext) throw new InvalidShow('unsupported_type');
  if (file.size > (AUDIO_TYPES[file.type] ? MAX_AUDIO_BYTES : MAX_IMAGE_BYTES)) throw new InvalidShow('too_large');
  const safe = prefix.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 30) || 'img';
  const name = `${safe}-${Date.now()}-${randomBytes(3).toString('hex')}.${ext}`;
  if (useBlob()) {
    const blob = await put(`ska/media/${name}`, file, { access: 'public', contentType: file.type, addRandomSuffix: false });
    return blob.url;
  }
  await mkdir(MEDIA, { recursive: true });
  await writeFile(path.join(MEDIA, name), Buffer.from(await file.arrayBuffer()));
  return MEDIA_PREFIX + name;
}

async function deleteImage(url: string) {
  if (BLOB_MEDIA_RE.test(url)) {
    if (useBlob()) await del(url).catch(() => {});
    return;
  }
  const file = url.slice(MEDIA_PREFIX.length);
  if (url.startsWith(MEDIA_PREFIX) && MEDIA_FILE_RE.test(file)) await unlink(path.join(MEDIA, file)).catch(() => {});
}

export async function readImage(file: string) {
  if (!MEDIA_FILE_RE.test(file)) return null;
  try {
    return await readFile(path.join(MEDIA, file));
  } catch {
    return null;
  }
}
