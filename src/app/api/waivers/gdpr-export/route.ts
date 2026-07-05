import { NextRequest, NextResponse } from 'next/server';
import { isErrorResponse, requireStaffAuth } from '@/lib/auth/api';
import { exportMemberWaiverHistory } from '@/services/waivers';
import { handleRouteError } from '@/lib/api-error';

export async function GET(req: NextRequest) {
  const auth = await requireStaffAuth({ adminOnly: true });
  if (isErrorResponse(auth)) return auth;

  const memberId = req.nextUrl.searchParams.get('member_id');
  if (!memberId) {
    return NextResponse.json({ error: 'member_id required' }, { status: 400 });
  }

  try {
    const data = await exportMemberWaiverHistory(auth.gymId, memberId);
    return NextResponse.json(data, {
      headers: {
        'Content-Disposition': `attachment; filename="waiver-export-${memberId}.json"`,
      },
    });
  } catch (err: unknown) {
    return handleRouteError(err, {
      fallbackMessage: 'GDPR export failed',
      logMessage: 'waiver-gdpr-export failed',
    });
  }
}
