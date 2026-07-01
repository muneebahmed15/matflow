import { NextRequest, NextResponse } from 'next/server';
import {
  assertGymScope,
  isErrorResponse,
  requireStaffAuth,
} from '@/lib/auth/api';
import { sendMemberNotification } from '@/services/notifications';
import { parseJsonBody } from '@/lib/api-validate';
import { sendEmailSchema } from '@/lib/api-schemas';
import { handleRouteError } from '@/lib/api-error';

export async function POST(req: NextRequest) {
  const auth = await requireStaffAuth();
  if (isErrorResponse(auth)) return auth;

  const parsed = await parseJsonBody(req, sendEmailSchema);
  if (!parsed.success) return parsed.response;
  const { type, member_id, gym_id, data } = parsed.data;

  const scopeError = assertGymScope(auth, gym_id);
  if (scopeError) return scopeError;

  try {
    const result = await sendMemberNotification({
      gymId: gym_id,
      memberId: member_id,
      type,
      data,
    });
    return NextResponse.json({ success: true, ...result });
  } catch (err: unknown) {
    return handleRouteError(err, {
      fallbackMessage: 'Email error',
      logMessage: 'Email send failed',
      logContext: { gymId: gym_id, memberId: member_id, type },
    });
  }
}
