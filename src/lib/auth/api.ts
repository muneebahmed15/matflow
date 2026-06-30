import { NextResponse } from 'next/server';
import type { User } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';
import { getAdminClient } from '@/lib/supabase/admin';

export type StaffRole = 'admin' | 'coach';

export type StaffAuth = {
  user: User;
  gymId: string;
  role: StaffRole;
};

export type MemberAuth = {
  user: User;
  memberId: string;
  gymId: string;
  email: string;
};

export function isErrorResponse(value: unknown): value is NextResponse {
  return value instanceof NextResponse;
}

async function resolveStaffAuth(user: User): Promise<StaffAuth | null> {
  const supabase = await createClient();

  const { data: staffRole } = await supabase
    .from('staff_roles')
    .select('role, gym_id')
    .eq('user_id', user.id)
    .maybeSingle();

  if (staffRole?.gym_id) {
    return {
      user,
      gymId: staffRole.gym_id,
      role: staffRole.role as StaffRole,
    };
  }

  const { data: gym } = await supabase
    .from('gyms')
    .select('id')
    .eq('owner_id', user.id)
    .maybeSingle();

  if (gym) {
    return { user, gymId: gym.id, role: 'admin' };
  }

  return null;
}

/** Require an authenticated gym staff member (admin or coach). */
export async function requireStaffAuth(options?: {
  adminOnly?: boolean;
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

  if (options?.adminOnly && auth.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  return auth;
}

/** Require an authenticated member portal user. */
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

  const { data: member } = await supabase
    .from('members')
    .select('id, gym_id, email')
    .eq('email', user.email)
    .maybeSingle();

  if (!member) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  if (options?.memberId && member.id !== options.memberId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  return {
    user,
    memberId: member.id,
    gymId: member.gym_id,
    email: member.email,
  };
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

/** Validate kiosk check-in without a logged-in user. */
export async function validateKioskCheckIn(
  gymId: string,
  memberId: string
): Promise<NextResponse | null> {
  const admin = getAdminClient();

  const { data: gym } = await admin
    .from('gyms')
    .select('id, kiosk_enabled')
    .eq('id', gymId)
    .maybeSingle();

  if (!gym?.kiosk_enabled) {
    return NextResponse.json({ error: 'Kiosk check-in disabled' }, { status: 403 });
  }

  const { data: member } = await admin
    .from('members')
    .select('id')
    .eq('id', memberId)
    .eq('gym_id', gymId)
    .eq('status', 'active')
    .maybeSingle();

  if (!member) {
    return NextResponse.json({ error: 'Member not found' }, { status: 404 });
  }

  return null;
}

/** Ensure a subscription belongs to the staff member's gym. */
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
