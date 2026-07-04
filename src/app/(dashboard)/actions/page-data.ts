'use server';

import { revalidatePath } from 'next/cache';
import { requireStaffSession } from '@/lib/auth/staff';
import { getGymSettings } from '@/services/gym';
import { getDashboardStats } from '@/services/dashboard-stats';
import { listActiveMembers } from '@/services/members';
import { getTodayCheckedInMemberIds, listAttendance } from '@/services/attendance';
import { listFamiliesWithCounts, getFamilyWithMembers } from '@/services/families';
import { listSubscriptions, listPlanOptions } from '@/services/subscriptions-list';
import { listRecentPromotions } from '@/services/belts';
import { listActivePlans } from '@/services/plans';
import {
  getMember,
  type MemberDetail,
} from '@/services/members';
import {
  getMemberWaiverSignatures,
  getWaiver,
  listActiveWaiversForGym,
} from '@/services/waivers';
import { waiverStatusFromSignature } from '@/lib/waivers';
import type { StaffRole } from '@/lib/auth/staff';
import { type ActionResult, toActionError } from './_shared';

export async function getDashboardSessionAction(): Promise<
  ActionResult<{
    role: StaffRole;
    gymId: string;
    gymName: string;
    timezone: string;
    setupCompletedAt: string | null;
    marketingEnabled: boolean;
  }>
> {
  try {
    const auth = await requireStaffSession();
    const settings = await getGymSettings(auth.gymId);
    return {
      ok: true,
      data: {
        role: auth.role,
        gymId: auth.gymId,
        gymName: settings.name,
        timezone: settings.timezone,
        setupCompletedAt: settings.setup_completed_at ?? null,
        marketingEnabled: settings.marketing_enabled,
      },
    };
  } catch (error) {
    return toActionError(error);
  }
}

export async function getDashboardStatsAction(): Promise<
  ActionResult<Awaited<ReturnType<typeof getDashboardStats>>>
> {
  try {
    const auth = await requireStaffSession();
    return { ok: true, data: await getDashboardStats(auth.gymId) };
  } catch (error) {
    return toActionError(error);
  }
}

export async function getCheckInPageDataAction(): Promise<
  ActionResult<{
    gymId: string;
    members: Awaited<ReturnType<typeof listActiveMembers>>;
    checkedInMemberIds: string[];
  }>
> {
  try {
    const auth = await requireStaffSession();
    const [members, checkedInMemberIds] = await Promise.all([
      listActiveMembers(auth.gymId),
      getTodayCheckedInMemberIds(auth.gymId),
    ]);
    return { ok: true, data: { gymId: auth.gymId, members, checkedInMemberIds } };
  } catch (error) {
    return toActionError(error);
  }
}

export async function listAttendanceLogAction(
  date: string,
  locationId?: string | null
): Promise<
  ActionResult<
    {
      id: string;
      checked_in_at: string;
      members: { first_name: string; last_name: string; email: string };
    }[]
  >
> {
  try {
    const auth = await requireStaffSession();
    const rows = await listAttendance(auth.gymId, { date, locationId: locationId ?? null });
    return {
      ok: true,
      data: rows.map((r) => ({
        id: r.id,
        checked_in_at: r.checked_in_at,
        members: {
          first_name: r.members?.first_name ?? '',
          last_name: r.members?.last_name ?? '',
          email: r.members?.email ?? '',
        },
      })),
    };
  } catch (error) {
    return toActionError(error);
  }
}

export async function listFamiliesPageDataAction(): Promise<
  ActionResult<Awaited<ReturnType<typeof listFamiliesWithCounts>>>
> {
  try {
    const auth = await requireStaffSession({ adminOnly: true });
    return { ok: true, data: await listFamiliesWithCounts(auth.gymId) };
  } catch (error) {
    return toActionError(error);
  }
}

export async function getFamilyDetailAction(familyId: string): Promise<
  ActionResult<NonNullable<Awaited<ReturnType<typeof getFamilyWithMembers>>>>
> {
  try {
    const auth = await requireStaffSession({ adminOnly: true });
    const data = await getFamilyWithMembers(auth.gymId, familyId);
    if (!data) return { ok: false, error: 'Family not found' };
    return { ok: true, data };
  } catch (error) {
    return toActionError(error);
  }
}

export async function getSubscriptionsPageDataAction(): Promise<
  ActionResult<{
    subscriptions: Awaited<ReturnType<typeof listSubscriptions>>;
    memberOptions: { id: string; label: string }[];
    planOptions: Awaited<ReturnType<typeof listPlanOptions>>;
  }>
> {
  try {
    const auth = await requireStaffSession({ capability: 'billing.read' });
    const [subscriptions, members, planOptions] = await Promise.all([
      listSubscriptions(auth.gymId),
      listActiveMembers(auth.gymId),
      listPlanOptions(auth.gymId),
    ]);
    return {
      ok: true,
      data: {
        subscriptions,
        memberOptions: members.map((m) => ({
          id: m.id,
          label: `${m.first_name} ${m.last_name}`,
        })),
        planOptions,
      },
    };
  } catch (error) {
    return toActionError(error);
  }
}

export async function getBeltsPageDataAction(): Promise<
  ActionResult<{
    members: Awaited<ReturnType<typeof listActiveMembers>>;
    promotions: Awaited<ReturnType<typeof listRecentPromotions>>;
  }>
> {
  try {
    const auth = await requireStaffSession();
    const [members, promotions] = await Promise.all([
      listActiveMembers(auth.gymId),
      listRecentPromotions(auth.gymId, 20),
    ]);
    return { ok: true, data: { members, promotions } };
  } catch (error) {
    return toActionError(error);
  }
}

export async function getMemberDetailPageDataAction(memberId: string): Promise<
  ActionResult<{
    member: MemberDetail;
    plans: {
      id: string;
      name: string;
      stripe_price_id: string | null;
      price_cents: number | null;
      interval: string;
    }[];
    attendance: { id: string; checked_in_at: string }[];
    signatures: Awaited<ReturnType<typeof getMemberWaiverSignatures>>;
    hasEmergencyContact: boolean;
  }>
> {
  try {
    const auth = await requireStaffSession();
    const member = await getMember(auth.gymId, memberId);
    const adminPlans = await listActivePlans(auth.gymId);
    const { getAdminClient } = await import('@/lib/supabase/admin');
    const admin = getAdminClient();
    const { data: attendance, error: attErr } = await admin
      .from('attendance')
      .select('id, checked_in_at')
      .eq('member_id', memberId)
      .eq('gym_id', auth.gymId)
      .order('checked_in_at', { ascending: false })
      .limit(10);
    if (attErr) throw new Error(attErr.message);

    const signatures = await getMemberWaiverSignatures(memberId);

    const { count: emergencyContactCount } = await admin
      .from('emergency_contacts')
      .select('*', { count: 'exact', head: true })
      .eq('member_id', memberId);

    return {
      ok: true,
      data: {
        member,
        plans: adminPlans.map((p) => ({
          id: p.id,
          name: p.name,
          stripe_price_id: p.stripe_price_id,
          price_cents: p.price_cents,
          interval: p.interval,
        })),
        attendance: attendance ?? [],
        signatures,
        hasEmergencyContact: (emergencyContactCount ?? 0) > 0,
      },
    };
  } catch (error) {
    return toActionError(error);
  }
}

export async function getWaiverPrintDataAction(waiverId: string): Promise<
  ActionResult<{
    waiver: { id: string; title: string; body: string; version: number | null; created_at: string };
    gymName: string;
  }>
> {
  try {
    const auth = await requireStaffSession();
    const waiver = await getWaiver(auth.gymId, waiverId);
    const settings = await getGymSettings(auth.gymId);
    return {
      ok: true,
      data: {
        waiver: {
          id: waiver.id,
          title: waiver.title,
          body: waiver.body,
          version: waiver.version ?? null,
          created_at: waiver.created_at,
        },
        gymName: settings.name,
      },
    };
  } catch (error) {
    return toActionError(error);
  }
}

export async function getSignWaiverPageDataAction(memberId: string): Promise<
  ActionResult<{
    member: { id: string; first_name: string; last_name: string; gym_id: string };
    waivers: Awaited<ReturnType<typeof listActiveWaiversForGym>>;
    existingSignatures: Awaited<ReturnType<typeof getMemberWaiverSignatures>>;
    signedWaiverIds: string[];
  }>
> {
  try {
    const auth = await requireStaffSession();
    const member = await getMember(auth.gymId, memberId);
    const waivers = await listActiveWaiversForGym(auth.gymId);
    const existingSignatures = await getMemberWaiverSignatures(memberId);
    const signedWaiverIds = existingSignatures
      .filter((sig) => waiverStatusFromSignature(sig) === 'signed')
      .map((sig) => sig.waiver_id);

    return {
      ok: true,
      data: {
        member: {
          id: member.id,
          first_name: member.first_name,
          last_name: member.last_name,
          gym_id: member.gym_id,
        },
        waivers,
        existingSignatures,
        signedWaiverIds,
      },
    };
  } catch (error) {
    return toActionError(error);
  }
}

export async function setFamilyBillingContactAction(
  familyId: string,
  billingMemberId: string | null
): Promise<ActionResult<{ family: import('@/services/families').FamilyDetail }>> {
  try {
    const auth = await requireStaffSession({ adminOnly: true });
    const { setFamilyBillingContact } = await import('@/services/families');
    const family = await setFamilyBillingContact(auth.gymId, familyId, billingMemberId);
    revalidatePath(`/families/${familyId}`);
    return { ok: true, data: { family } };
  } catch (error) {
    return toActionError(error);
  }
}
