import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { isErrorResponse } from '@/lib/auth/api';
import { requirePortalMemberFromRequest } from '@/lib/auth/portal-request';
import { enrollMemberInClass, cancelEnrollment, listMemberEnrollments } from '@/services/class-enrollment';
import { parseJsonBody } from '@/lib/api-validate';
import { handleRouteError } from '@/lib/api-error';

const schema = z.object({
  class_id: z.string().uuid(),
  action: z.enum(['book', 'cancel']),
  member_id: z.string().uuid().optional(),
});

export async function POST(req: NextRequest) {
  const parsed = await parseJsonBody(req, schema);
  if (!parsed.success) return parsed.response;

  const auth = await requirePortalMemberFromRequest(req, parsed.data);
  if (isErrorResponse(auth)) return auth;

  try {
    if (parsed.data.action === 'book') {
      await enrollMemberInClass({
        gymId: auth.gymId,
        classId: parsed.data.class_id,
        memberId: auth.memberId,
      });
    } else {
      await cancelEnrollment({
        gymId: auth.gymId,
        classId: parsed.data.class_id,
        memberId: auth.memberId,
      });
    }
    const enrollments = await listMemberEnrollments(auth.gymId, auth.memberId);
    return NextResponse.json({ success: true, data: enrollments });
  } catch (err: unknown) {
    return handleRouteError(err, {
      fallbackMessage: 'Booking update failed',
      logMessage: 'Portal enrollment action failed',
    });
  }
}
