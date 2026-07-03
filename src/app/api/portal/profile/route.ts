import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { isErrorResponse } from '@/lib/auth/api';
import {
  requirePortalMemberFromRequest,
  requireProfileEditAccess,
} from '@/lib/auth/portal-request';
import { updateMember } from '@/services/members';
import { parseJsonBody } from '@/lib/api-validate';
import { handleRouteError } from '@/lib/api-error';

const schema = z.object({
  phone: z.string().max(30).optional(),
  email_opt_out: z.boolean().optional(),
  member_id: z.string().uuid().optional(),
});

export async function PATCH(req: NextRequest) {
  const parsed = await parseJsonBody(req, schema);
  if (!parsed.success) return parsed.response;

  const auth = await requirePortalMemberFromRequest(req, parsed.data);
  if (isErrorResponse(auth)) return auth;

  const profileDenied = requireProfileEditAccess(auth);
  if (profileDenied) return profileDenied;

  try {
    const updates: Parameters<typeof updateMember>[2] = {
      phone: parsed.data.phone?.trim() || null,
    };
    if (parsed.data.email_opt_out !== undefined) {
      updates.email_opt_out = parsed.data.email_opt_out;
    }
    const member = await updateMember(auth.gymId, auth.memberId, updates);
    return NextResponse.json({ member });
  } catch (err: unknown) {
    return handleRouteError(err, {
      fallbackMessage: 'Profile update failed',
      logMessage: 'Portal profile update failed',
    });
  }
}
