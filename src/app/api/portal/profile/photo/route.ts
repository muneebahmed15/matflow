import { NextRequest, NextResponse } from 'next/server';
import { isErrorResponse } from '@/lib/auth/api';
import {
  requirePortalMemberFromRequest,
  requireProfileEditAccess,
} from '@/lib/auth/portal-request';
import { uploadMemberProfilePhoto } from '@/services/member-profile-photo';
import { handleRouteError } from '@/lib/api-error';

export async function POST(req: NextRequest) {
  const auth = await requirePortalMemberFromRequest(req);
  if (isErrorResponse(auth)) return auth;

  const profileDenied = requireProfileEditAccess(auth);
  if (profileDenied) return profileDenied;

  try {
    const form = await req.formData();
    const file = form.get('photo');
    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'Missing photo file' }, { status: 400 });
    }

    const bytes = new Uint8Array(await file.arrayBuffer());
    const url = await uploadMemberProfilePhoto({
      gymId: auth.gymId,
      memberId: auth.memberId,
      bytes,
      contentType: file.type || 'image/jpeg',
    });

    return NextResponse.json({ profile_photo_url: url });
  } catch (err: unknown) {
    return handleRouteError(err, {
      fallbackMessage: 'Photo upload failed',
      logMessage: 'Portal profile photo upload failed',
    });
  }
}
