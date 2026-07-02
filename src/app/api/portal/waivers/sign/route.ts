import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { isErrorResponse } from '@/lib/auth/api';
import { requirePortalMemberFromRequest } from '@/lib/auth/portal-request';
import { signWaiver } from '@/services/waivers';
import { parseJsonBody } from '@/lib/api-validate';
import { handleRouteError } from '@/lib/api-error';

const schema = z.object({
  waiver_id: z.string().uuid(),
  member_id: z.string().uuid(),
  signed_name: z.string().min(2).max(200),
});

export async function POST(req: NextRequest) {
  const parsed = await parseJsonBody(req, schema);
  if (!parsed.success) return parsed.response;

  const auth = await requirePortalMemberFromRequest(req, parsed.data);
  if (isErrorResponse(auth)) return auth;

  try {
    const ip =
      req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
      req.headers.get('x-real-ip') ??
      null;

    const result = await signWaiver({
      waiverId: parsed.data.waiver_id,
      memberId: auth.memberId,
      gymId: auth.gymId,
      signedName: parsed.data.signed_name,
      ipAddress: ip,
      userAgent: req.headers.get('user-agent'),
    });

    return NextResponse.json({ success: true, signature_id: result.signatureId });
  } catch (err: unknown) {
    return handleRouteError(err, {
      fallbackMessage: 'Sign waiver error',
      logMessage: 'Portal waiver sign failed',
    });
  }
}
