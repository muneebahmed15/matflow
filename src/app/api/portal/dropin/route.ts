import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { isErrorResponse } from '@/lib/auth/api';
import { requirePortalMemberFromRequest } from '@/lib/auth/portal-request';
import { bookDropIn, cancelDropIn, listMemberDropIns } from '@/services/class-dropin';
import { parseJsonBody } from '@/lib/api-validate';
import { handleRouteError } from '@/lib/api-error';

const schema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('book'),
    class_id: z.string().uuid(),
    session_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    member_id: z.string().uuid().optional(),
  }),
  z.object({
    action: z.literal('cancel'),
    session_id: z.string().uuid(),
    member_id: z.string().uuid().optional(),
  }),
]);

export async function POST(req: NextRequest) {
  const parsed = await parseJsonBody(req, schema);
  if (!parsed.success) return parsed.response;

  const auth = await requirePortalMemberFromRequest(req, parsed.data);
  if (isErrorResponse(auth)) return auth;

  try {
    if (parsed.data.action === 'book') {
      await bookDropIn({
        gymId: auth.gymId,
        classId: parsed.data.class_id,
        memberId: auth.memberId,
        sessionDate: parsed.data.session_date,
      });
    } else {
      await cancelDropIn({
        gymId: auth.gymId,
        sessionId: parsed.data.session_id,
        memberId: auth.memberId,
      });
    }
    const bookings = await listMemberDropIns(auth.gymId, auth.memberId);
    return NextResponse.json({ success: true, data: bookings });
  } catch (err: unknown) {
    return handleRouteError(err, {
      fallbackMessage: 'Drop-in booking failed',
      logMessage: 'Portal drop-in action failed',
    });
  }
}
