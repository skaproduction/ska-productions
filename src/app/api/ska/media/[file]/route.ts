import { readImage } from '@/lib/ska-store';

export const runtime = 'nodejs';

const TYPES: Record<string, string> = {
  jpg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  mp3: 'audio/mpeg',
  m4a: 'audio/mp4',
  mp4: 'video/mp4',
  webm: 'video/webm',
  mov: 'video/quicktime',
};

/** Serves media saved on disk in local development (production files come straight from Blob). */
export async function GET(req: Request, { params }: { params: Promise<{ file: string }> }) {
  const { file } = await params;
  const data = await readImage(file);
  if (!data) return new Response('Not found', { status: 404 });
  const headers = {
    'content-type': TYPES[file.split('.').pop()!],
    'accept-ranges': 'bytes',
    // file names are unique per upload, so they can be cached forever
    'cache-control': 'public, max-age=31536000, immutable',
  };
  // video and audio players ask for byte ranges to seek
  const m = req.headers.get('range')?.match(/^bytes=(\d*)-(\d*)$/);
  if (m) {
    const size = data.length;
    const start = m[1] ? Number(m[1]) : Math.max(0, size - Number(m[2]));
    const end = m[1] && m[2] ? Math.min(Number(m[2]), size - 1) : size - 1;
    if (start >= size || start > end) return new Response(null, { status: 416, headers: { 'content-range': `bytes */${size}` } });
    return new Response(new Uint8Array(data.subarray(start, end + 1)), {
      status: 206,
      headers: { ...headers, 'content-range': `bytes ${start}-${end}/${size}`, 'content-length': String(end - start + 1) },
    });
  }
  return new Response(new Uint8Array(data), { headers: { ...headers, 'content-length': String(data.length) } });
}
