import { NextRequest, NextResponse } from 'next/server';
import { requireMemberAuth, isErrorResponse, type MemberAuth } from '@/lib/auth/api';
import { canManageBilling, canEditProfile } from '@/lib/portal/billing-access';

export async function requirePortalMemberFromRequest(
  req: NextRequest,
  body?: { member_id?: string }
): Promise<MemberAuth | NextResponse> {
  const memberId =
    body?.member_id ?? req.nextUrl.searchParams.get('member_id') ?? undefined;
  return requireMemberAuth(memberId ? { memberId } : undefined);
}

export function requireBillingAccess(auth: MemberAuth): NextResponse | null {
  if (!canManageBilling(auth.portalRole)) {
    return NextResponse.json(
      { error: 'Billing can only be managed by the primary account holder.' },
      { status: 403 }
    );
  }
  return null;
}

export function requireProfileEditAccess(auth: MemberAuth): NextResponse | null {
  if (!canEditProfile(auth.portalRole)) {
    return NextResponse.json(
      { error: 'Profile can only be edited by the primary account holder.' },
      { status: 403 }
    );
  }
  return null;
}
