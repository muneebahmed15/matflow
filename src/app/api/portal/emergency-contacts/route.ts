import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { isErrorResponse } from '@/lib/auth/api';
import {
  requirePortalMemberFromRequest,
  requireProfileEditAccess,
} from '@/lib/auth/portal-request';
import { createEmergencyContact } from '@/services/emergency-contacts';
import { parseJsonBody } from '@/lib/api-validate';
import { handleRouteError } from '@/lib/api-error';

const schema = z.object({
  full_name: z.string().min(1),
  phone: z.string().min(1),
  relationship: z.string().min(1),
  is_primary: z.boolean().optional(),
  member_id: z.string().uuid().optional(),
});

export async function POST(req: NextRequest) {
  const parsed = await parseJsonBody(req, schema);
  if (!parsed.success) return parsed.response;

  const auth = await requirePortalMemberFromRequest(req, parsed.data);
  if (isErrorResponse(auth)) return auth;

  const profileDenied = requireProfileEditAccess(auth);
  if (profileDenied) return profileDenied;

  try {
    const contact = await createEmergencyContact({
      gymId: auth.gymId,
      memberId: auth.memberId,
      fullName: parsed.data.full_name,
      phone: parsed.data.phone,
      relationship: parsed.data.relationship,
      isPrimary: parsed.data.is_primary,
    });
    return NextResponse.json({ contact });
  } catch (err: unknown) {
    return handleRouteError(err, {
      fallbackMessage: 'Failed to add contact',
      logMessage: 'Portal emergency contact create failed',
    });
  }
}
