import { NextRequest, NextResponse } from 'next/server';
import { isErrorResponse, requireStaffAuth } from '@/lib/auth/api';
import { importMemberPhotosFromZip } from '@/services/photo-import';
import { handleRouteError } from '@/lib/api-error';

export async function POST(req: NextRequest) {
  const auth = await requireStaffAuth({ adminOnly: true });
  if (isErrorResponse(auth)) return auth;

  try {
    const formData = await req.formData();
    const file = formData.get('file');
    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'Missing zip file' }, { status: 400 });
    }

    const bytes = new Uint8Array(await file.arrayBuffer());
    const result = await importMemberPhotosFromZip(auth.gymId, bytes);
    return NextResponse.json(result);
  } catch (err: unknown) {
    return handleRouteError(err, {
      fallbackMessage: 'Photo import failed',
      logMessage: 'photo-zip-import failed',
    });
  }
}
