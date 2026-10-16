import { readImage } from '@/lib/ska-store';

export const runtime = 'nodejs';

const TYPES: Record<string, string> = { jpg: 'image/jpeg', png: 'image/png', webp: 'image/webp' };

export async function GET(_req: Request, { params }: { params: Promise<{ file: string }> }) {
  const { file } = await params;
  const data = await readImage(file);
  if (!data) return new Response('Not found', { status: 404 });
  return new Response(new Uint8Array(data), {
    headers: {
      'content-type': TYPES[file.split('.').pop()!],
      // file names are unique per upload, so they can be cached forever
      'cache-control': 'public, max-age=31536000, immutable',
    },
  });
}
