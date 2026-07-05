import { NextRequest, NextResponse } from 'next/server';
import { isErrorResponse, requireStaffAuth } from '@/lib/auth/api';
import { importSignedWaiverPdfs } from '@/services/waiver-import';
import { assertPdfMagicBytes, validatePdfUpload } from '@/lib/upload-validation';
import { handleRouteError } from '@/lib/api-error';

export async function POST(req: NextRequest) {
  const auth = await requireStaffAuth({ adminOnly: true });
  if (isErrorResponse(auth)) return auth;

  try {
    const formData = await req.formData();
    const waiverId = formData.get('waiver_id');
    if (typeof waiverId !== 'string' || !waiverId) {
      return NextResponse.json({ error: 'waiver_id required' }, { status: 400 });
    }

    const files: { name: string; bytes: Uint8Array }[] = [];
    for (const [key, value] of formData.entries()) {
      if (key === 'waiver_id') continue;
      if (value instanceof File && value.size > 0) {
        const uploadError = validatePdfUpload(value);
        if (uploadError) {
          return NextResponse.json({ error: uploadError }, { status: 400 });
        }
        const magicError = await assertPdfMagicBytes(value);
        if (magicError) {
          return NextResponse.json({ error: `${value.name}: ${magicError}` }, { status: 400 });
        }
        files.push({ name: value.name, bytes: new Uint8Array(await value.arrayBuffer()) });
      }
    }

    if (files.length === 0) {
      return NextResponse.json({ error: 'No PDF files uploaded' }, { status: 400 });
    }

    const result = await importSignedWaiverPdfs({
      gymId: auth.gymId,
      waiverId,
      files,
      actorId: auth.user.id,
    });

    return NextResponse.json(result);
  } catch (err: unknown) {
    return handleRouteError(err, {
      fallbackMessage: 'Waiver import failed',
      logMessage: 'waiver-pdf-import failed',
    });
  }
}
