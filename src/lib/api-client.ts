import type { AttendanceWithMember } from '@/services/attendance';
import type { Database } from '@/types/database';

type AttendanceRow = Database['public']['Tables']['attendance']['Row'];

export type AttendanceLogEntry = Pick<AttendanceRow, 'id' | 'checked_in_at' | 'member_id'> & {
  members: {
    first_name: string;
    last_name: string;
    email: string | null;
  };
};

export async function fetchAttendanceLog(
  gymId: string,
  date: string
): Promise<AttendanceLogEntry[]> {
  const params = new URLSearchParams({ gym_id: gymId, date });
  const res = await fetch(`/api/attendance?${params.toString()}`);
  const body = (await res.json()) as { data?: AttendanceWithMember[]; error?: string };

  if (!res.ok) {
    throw new Error(body.error ?? 'Failed to load attendance');
  }

  return (body.data ?? []).map((row) => ({
    id: row.id,
    member_id: row.member_id,
    checked_in_at: row.checked_in_at,
    members: {
      first_name: row.members?.first_name ?? '',
      last_name: row.members?.last_name ?? '',
      email: row.members?.email ?? null,
    },
  }));
}

export async function fetchTodayCheckedInMemberIds(gymId: string): Promise<Set<string>> {
  const records = await fetchTodayCheckIns(gymId);
  return new Set(records.map((row) => row.member_id));
}

export async function postCheckIn(input: {
  gymId: string;
  memberId: string;
  notes?: string;
}): Promise<void> {
  const res = await fetch('/api/attendance', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      gym_id: input.gymId,
      member_id: input.memberId,
      notes: input.notes,
    }),
  });

  const body = (await res.json()) as { error?: string };
  if (!res.ok) {
    throw new Error(body.error ?? 'Check-in failed');
  }
}

export async function fetchTodayCheckIns(gymId: string): Promise<AttendanceLogEntry[]> {
  const today = new Date().toISOString().split('T')[0];
  return fetchAttendanceLog(gymId, today);
}

async function postStripeAction<T>(
  path: string,
  body: Record<string, unknown>
): Promise<T> {
  const res = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const payload = (await res.json()) as T & { error?: string };
  if (!res.ok) {
    throw new Error(payload.error ?? 'Request failed');
  }
  return payload;
}

export async function cancelStripeSubscription(input: {
  subscriptionId: string;
  stripeSubscriptionId: string;
  reason?: string;
  cancelImmediately?: boolean;
}): Promise<void> {
  await postStripeAction('/api/stripe/cancel-subscription', {
    subscription_id: input.subscriptionId,
    stripe_subscription_id: input.stripeSubscriptionId,
    reason: input.reason,
    cancel_immediately: input.cancelImmediately ?? false,
  });
}

export async function pauseStripeSubscription(input: {
  subscriptionId: string;
  stripeSubscriptionId: string;
  action: 'pause' | 'resume';
  reason?: string;
}): Promise<void> {
  await postStripeAction('/api/stripe/pause-subscription', {
    subscription_id: input.subscriptionId,
    stripe_subscription_id: input.stripeSubscriptionId,
    action: input.action,
    reason: input.reason,
  });
}

export async function refundStripeSubscription(input: {
  subscriptionId: string;
  stripeSubscriptionId: string;
  memberId?: string;
  amountCents?: number;
  reason?: string;
}): Promise<{ refundId: string; amountCents: number }> {
  const result = await postStripeAction<{
    refund: { refundId: string; amountCents: number };
  }>('/api/stripe/refund', {
    subscription_id: input.subscriptionId,
    stripe_subscription_id: input.stripeSubscriptionId,
    member_id: input.memberId,
    amount_cents: input.amountCents,
    reason: input.reason,
  });
  return result.refund;
}
