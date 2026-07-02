import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { isErrorResponse } from '@/lib/auth/api';
import { requirePortalMemberFromRequest } from '@/lib/auth/portal-request';
import { addMemberToWaitlist, cancelMemberWaitlistByClass } from '@/services/class-waitlist';
import { parseJsonBody } from '@/lib/api-validate';
import { handleRouteError } from '@/lib/api-error';

const schema = z.object({
  class_id: z.string().uuid(),
  action: z.enum(['join', 'leave']),
  member_id: z.string().uuid().optional(),
});

export async function POST(req: NextRequest) {
  const parsed = await parseJsonBody(req, schema);
  if (!parsed.success) return parsed.response;

  const auth = await requirePortalMemberFromRequest(req, parsed.data);
  if (isErrorResponse(auth)) return auth;

  try {
    if (parsed.data.action === 'join') {
      await addMemberToWaitlist({
        gymId: auth.gymId,
        classId: parsed.data.class_id,
        memberId: auth.memberId,
      });
    } else {
      await cancelMemberWaitlistByClass(auth.gymId, parsed.data.class_id, auth.memberId);
    }
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    return handleRouteError(err, {
      fallbackMessage: 'Waitlist update failed',
      logMessage: 'Portal waitlist action failed',
    });
  }
}
