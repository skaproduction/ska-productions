import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
import { NextResponse } from 'next/server';
import { isAdmin } from '@/lib/ska-auth';
import { AUDIO_TYPES, BLOB_UPLOAD_PATH_RE, IMAGE_TYPES, MAX_AUDIO_BYTES, MAX_IMAGE_BYTES } from '@/lib/ska-store';

export const runtime = 'nodejs';

/**
 * Issues short-lived tokens so the admin can upload posters, photos and music straight from the
 * browser to Vercel Blob — function requests are capped at 4.5 MB, which large files would exceed.
 */
export async function POST(req: Request) {
  const body = (await req.json()) as HandleUploadBody;
  try {
    const result = await handleUpload({
      body,
      request: req,
      onBeforeGenerateToken: async (pathname) => {
        if (!(await isAdmin())) throw new Error('unauthorized');
        if (!BLOB_UPLOAD_PATH_RE.test(pathname)) throw new Error('bad_pathname');
        const audio = /\.(mp3|m4a)$/.test(pathname);
        return {
          allowedContentTypes: Object.keys(audio ? AUDIO_TYPES : IMAGE_TYPES),
          maximumSizeInBytes: audio ? MAX_AUDIO_BYTES : MAX_IMAGE_BYTES,
          addRandomSuffix: false,
        };
      },
    });
    return NextResponse.json(result);
  } catch (e) {
    const message = e instanceof Error ? e.message : 'upload_failed';
    return NextResponse.json({ error: message }, { status: message === 'unauthorized' ? 401 : 400 });
  }
}
