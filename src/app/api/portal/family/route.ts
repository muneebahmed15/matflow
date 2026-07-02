import { NextResponse } from 'next/server';
import { requireMemberAuth, isErrorResponse } from '@/lib/auth/api';
import { listFamilyMembersForPortal } from '@/services/portal-family';
import { getFamilyBillingSummary } from '@/services/billing-metrics';
import { handleRouteError } from '@/lib/api-error';

export async function GET() {
  const auth = await requireMemberAuth();
  if (isErrorResponse(auth)) return auth;

  try {
    const members = await listFamilyMembersForPortal(auth.memberId, auth.gymId);
    const authMember = members.find((m) => m.id === auth.memberId);
    let billing = null;
    if (authMember?.family_id) {
      billing = await getFamilyBillingSummary(auth.gymId, authMember.family_id);
    }
    return NextResponse.json({ members, billing });
  } catch (err: unknown) {
    return handleRouteError(err, {
      fallbackMessage: 'Failed to load family',
      logMessage: 'Portal family load failed',
    });
  }
}
