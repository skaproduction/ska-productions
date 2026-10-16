// One-time copy of the local admin data (data/ska) into Vercel Blob.
// Needs BLOB_READ_WRITE_TOKEN in .env.local (`vercel env pull` after creating the Blob store), then:
//   npm run migrate:blob            upload images, then write the show list
//   npm run migrate:blob -- --dry   only print what would happen
// Safe to re-run: images keep their file names, and the show list is overwritten as a whole.
import { put } from '@vercel/blob';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const DRY = process.argv.includes('--dry');
const ROOT = path.join(process.cwd(), 'data', 'ska');
const LOCAL = '/api/ska/media/';

if (!process.env.BLOB_READ_WRITE_TOKEN && !DRY) {
  console.error('BLOB_READ_WRITE_TOKEN is not set. Run `vercel env pull .env.local` first.');
  process.exit(1);
}

const shows = JSON.parse(await readFile(path.join(ROOT, 'shows.json'), 'utf8'));
const TYPES = { jpg: 'image/jpeg', png: 'image/png', webp: 'image/webp' };
const uploaded = new Map();

async function move(url) {
  if (typeof url !== 'string' || !url.startsWith(LOCAL)) return url;
  if (uploaded.has(url)) return uploaded.get(url);
  const file = url.slice(LOCAL.length);
  if (DRY) {
    console.log('  would upload', file);
    uploaded.set(url, url);
    return url;
  }
  const body = await readFile(path.join(ROOT, 'media', file));
  const blob = await put(`ska/media/${file}`, body, {
    access: 'public',
    contentType: TYPES[file.split('.').pop()],
    addRandomSuffix: false,
    allowOverwrite: true,
  });
  console.log('  uploaded', file);
  uploaded.set(url, blob.url);
  return blob.url;
}

for (const s of shows) {
  console.log(s.slug);
  s.poster = await move(s.poster);
  s.seatMap = await move(s.seatMap);
  for (const a of s.lineup ?? []) a.photo = await move(a.photo);
  for (const p of s.gallery ?? []) p.url = await move(p.url);
}

if (DRY) {
  console.log(`\n${shows.length} shows, ${uploaded.size} images — dry run, nothing written.`);
} else {
  const json = JSON.stringify(shows, null, 2);
  const opts = { access: 'public', contentType: 'application/json', addRandomSuffix: false };
  await put('ska/data/shows.json', json, { ...opts, allowOverwrite: true });
  await put(`ska/backups/shows-${new Date().toISOString().replace(/[:.]/g, '-')}-migrated.json`, json, opts);
  console.log(`\nDone: ${shows.length} shows, ${uploaded.size} images now in Vercel Blob.`);
}
