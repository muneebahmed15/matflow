import { getAdminClient } from '@/lib/supabase/admin';
import { ServiceError } from '@/services/errors';
import { stringifyCsv } from '@/lib/csv';

export type RevenueMetrics = {
  mrrCents: number;
  activeSubscriptions: number;
  pastDueCount: number;
  churnRate30d: number;
  revenueByPlan: { planName: string; subscribers: number; mrrCents: number }[];
};

type SubWithPlan = {
  id: string;
  status: string;
  cancelled_at: string | null;
  plans: { name: string; price_cents: number | null; interval: string } | null;
};

/** Monthly recurring contribution of one subscription in cents. */
export function monthlyContributionCents(
  priceCents: number | null,
  interval: string
): number {
  if (!priceCents || priceCents <= 0) return 0;
  return interval === 'year' ? Math.round(priceCents / 12) : priceCents;
}

/** Churn = cancellations in window / (active now + cancellations in window). */
export function churnRate(activeNow: number, cancelledInWindow: number): number {
  const base = activeNow + cancelledInWindow;
  if (base === 0) return 0;
  return Math.round((cancelledInWindow / base) * 1000) / 10;
}

export async function getRevenueMetrics(gymId: string): Promise<RevenueMetrics> {
  const admin = getAdminClient();

  const { data, error } = await admin
    .from('subscriptions')
    .select('id, status, cancelled_at, plans(name, price_cents, interval)')
    .eq('gym_id', gymId);

  if (error) throw new ServiceError(500, error.message);

  const subs = (data ?? []) as unknown as SubWithPlan[];
  const active = subs.filter((s) => s.status === 'active' || s.status === 'trialing');
  const pastDue = subs.filter((s) => s.status === 'past_due');

  const thirtyDaysAgo = new Date(Date.now() - 30 * 86_400_000).toISOString();
  const cancelled30d = subs.filter(
    (s) => s.status === 'cancelled' && s.cancelled_at && s.cancelled_at >= thirtyDaysAgo
  );

  let mrrCents = 0;
  const byPlan = new Map<string, { subscribers: number; mrrCents: number }>();

  for (const sub of active) {
    const contribution = monthlyContributionCents(
      sub.plans?.price_cents ?? null,
      sub.plans?.interval ?? 'month'
    );
    mrrCents += contribution;
    const planName = sub.plans?.name ?? 'Unknown plan';
    const entry = byPlan.get(planName) ?? { subscribers: 0, mrrCents: 0 };
    entry.subscribers += 1;
    entry.mrrCents += contribution;
    byPlan.set(planName, entry);
  }

  return {
    mrrCents,
    activeSubscriptions: active.length,
    pastDueCount: pastDue.length,
    churnRate30d: churnRate(active.length, cancelled30d.length),
    revenueByPlan: [...byPlan.entries()]
      .map(([planName, stats]) => ({ planName, ...stats }))
      .sort((a, b) => b.mrrCents - a.mrrCents),
  };
}

export type PastDueMember = {
  memberId: string;
  firstName: string;
  lastName: string;
  email: string | null;
  planName: string | null;
};

export async function listPastDueMembers(gymId: string): Promise<PastDueMember[]> {
  const admin = getAdminClient();
  const { data, error } = await admin
    .from('subscriptions')
    .select('member_id, members(first_name, last_name, email), plans(name)')
    .eq('gym_id', gymId)
    .eq('status', 'past_due');

  if (error) throw new ServiceError(500, error.message);

  return (data ?? []).map((row) => {
    const r = row as unknown as {
      member_id: string;
      members: { first_name: string; last_name: string; email: string | null } | null;
      plans: { name: string } | null;
    };
    return {
      memberId: r.member_id,
      firstName: r.members?.first_name ?? '',
      lastName: r.members?.last_name ?? '',
      email: r.members?.email ?? null,
      planName: r.plans?.name ?? null,
    };
  });
}

export async function exportSubscriptionsCsv(gymId: string): Promise<string> {
  const admin = getAdminClient();
  const { data, error } = await admin
    .from('subscriptions')
    .select(
      'status, payment_method, current_period_end, created_at, cancelled_at, members(first_name, last_name, email), plans(name, price_cents, interval)'
    )
    .eq('gym_id', gymId)
    .order('created_at', { ascending: false });

  if (error) throw new ServiceError(500, error.message);

  const rows = (data ?? []).map((row) => {
    const r = row as unknown as {
      status: string;
      payment_method: string | null;
      current_period_end: string | null;
      created_at: string;
      cancelled_at: string | null;
      members: { first_name: string; last_name: string; email: string | null } | null;
      plans: { name: string; price_cents: number | null; interval: string } | null;
    };
    return [
      r.members ? `${r.members.first_name} ${r.members.last_name}` : '',
      r.members?.email ?? '',
      r.plans?.name ?? '',
      r.plans?.price_cents != null ? (r.plans.price_cents / 100).toFixed(2) : '',
      r.plans?.interval ?? '',
      r.status,
      r.payment_method ?? 'stripe',
      r.current_period_end ?? '',
      r.created_at,
      r.cancelled_at ?? '',
    ];
  });

  return stringifyCsv(
    ['Member', 'Email', 'Plan', 'Price', 'Interval', 'Status', 'Payment Method', 'Period End', 'Started', 'Cancelled'],
    rows
  );
}

/** Manual (cash/check) subscription without Stripe. */
export async function createManualSubscription(input: {
  gymId: string;
  memberId: string;
  planId: string;
  paymentMethod: 'cash' | 'check' | 'other';
}): Promise<{ id: string }> {
  const admin = getAdminClient();

  const { data: plan } = await admin
    .from('plans')
    .select('id, interval')
    .eq('id', input.planId)
    .eq('gym_id', input.gymId)
    .maybeSingle();

  if (!plan) throw new ServiceError(404, 'Plan not found.');

  const { data: member } = await admin
    .from('members')
    .select('id')
    .eq('id', input.memberId)
    .eq('gym_id', input.gymId)
    .maybeSingle();

  if (!member) throw new ServiceError(404, 'Member not found.');

  const { data: existing } = await admin
    .from('subscriptions')
    .select('id')
    .eq('gym_id', input.gymId)
    .eq('member_id', input.memberId)
    .in('status', ['active', 'trialing', 'past_due'])
    .maybeSingle();

  if (existing) {
    throw new ServiceError(409, 'Member already has an active subscription.');
  }

  const periodEnd = new Date();
  if (plan.interval === 'year') periodEnd.setFullYear(periodEnd.getFullYear() + 1);
  else periodEnd.setMonth(periodEnd.getMonth() + 1);

  const { data, error } = await admin
    .from('subscriptions')
    .insert({
      gym_id: input.gymId,
      member_id: input.memberId,
      plan_id: input.planId,
      status: 'active',
      payment_method: input.paymentMethod,
      current_period_end: periodEnd.toISOString(),
    })
    .select('id')
    .single();

  if (error || !data) throw new ServiceError(500, error?.message ?? 'Insert failed');

  await admin
    .from('members')
    .update({ status: 'active' })
    .eq('id', input.memberId)
    .eq('gym_id', input.gymId);

  return data;
}
