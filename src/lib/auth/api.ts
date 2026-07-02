import { NextResponse } from 'next/server';
import type { User } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';
import { getAdminClient } from '@/lib/supabase/admin';
import {
  resolveStaffAuth,
  type StaffAuth,
  type StaffRole,
} from '@/lib/auth/staff';
import { hasCapability, type Capability } from '@/lib/permissions/capabilities';
import { assertPortalMemberAccess } from '@/services/portal-family';

export type { StaffAuth, StaffRole };

export type MemberAuth = {
  user: User;
  memberId: string;
  gymId: string;
  email: string;
  portalRole: string;
  authMemberId: string;
};

export function isErrorResponse(value: unknown): value is NextResponse {
  return value instanceof NextResponse;
}

/** Require an authenticated gym staff member (admin, supervisor, or instructor/coach). */
export async function requireStaffAuth(options?: {
  adminOnly?: boolean;
  capability?: Capability;
}): Promise<StaffAuth | NextResponse> {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const auth = await resolveStaffAuth(user);
  if (!auth) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  if (options?.capability && !hasCapability(auth.role, options.capability)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  if (options?.adminOnly && auth.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  return auth;
}

/** Require an authenticated member portal user, optionally acting as a family member. */
export async function requireMemberAuth(options?: {
  memberId?: string;
}): Promise<MemberAuth | NextResponse> {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const targetMemberId = options?.memberId;

  try {
    if (targetMemberId) {
      const access = await assertPortalMemberAccess(user, targetMemberId);
      const admin = getAdminClient();
      const { data: member } = await admin
        .from('members')
        .select('portal_role')
        .eq('id', access.memberId)
        .single();

      return {
        user,
        memberId: access.memberId,
        gymId: access.gymId,
        email: access.email,
        portalRole: member?.portal_role ?? 'primary',
        authMemberId: (
          await admin.from('members').select('id').eq('email', user.email).single()
        ).data?.id ?? access.memberId,
      };
    }

    const { data: member } = await supabase
      .from('members')
      .select('id, gym_id, email, portal_role')
      .eq('email', user.email)
      .maybeSingle();

    if (!member) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return {
      user,
      memberId: member.id,
      gymId: member.gym_id,
      email: member.email ?? user.email,
      portalRole: member.portal_role ?? 'primary',
      authMemberId: member.id,
    };
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
}

/** Require staff auth OR member auth (for shared endpoints like checkout). */
export async function requireStaffOrMemberAuth(options: {
  gymId: string;
  memberId: string;
}): Promise<
  | { kind: 'staff'; auth: StaffAuth }
  | { kind: 'member'; auth: MemberAuth }
  | NextResponse
> {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const staff = await resolveStaffAuth(user);
  if (staff) {
    if (staff.gymId !== options.gymId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    const admin = getAdminClient();
    const { data: member } = await admin
      .from('members')
      .select('id')
      .eq('id', options.memberId)
      .eq('gym_id', options.gymId)
      .maybeSingle();
    if (!member) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }
    return { kind: 'staff', auth: staff };
  }

  const memberAuth = await requireMemberAuth({ memberId: options.memberId });
  if (isErrorResponse(memberAuth)) {
    return memberAuth;
  }
  if (memberAuth.gymId !== options.gymId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  return { kind: 'member', auth: memberAuth };
}

export function assertGymScope(
  auth: StaffAuth,
  gymId: string
): NextResponse | null {
  if (auth.gymId !== gymId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  return null;
}

export async function assertSubscriptionInGym(
  auth: StaffAuth,
  subscriptionId: string
): Promise<NextResponse | null> {
  const admin = getAdminClient();
  const { data: subscription } = await admin
    .from('subscriptions')
    .select('id, gym_id')
    .eq('id', subscriptionId)
    .maybeSingle();

  if (!subscription) {
    return NextResponse.json({ error: 'Subscription not found' }, { status: 404 });
  }

  if (subscription.gym_id !== auth.gymId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  return null;
}
