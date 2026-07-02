import { getAdminClient } from '@/lib/supabase/admin';
import { ServiceError } from '@/services/errors';

export type BillingMetrics = {
  mrrCents: number;
  activeSubscriptions: number;
  pastDueSubscriptions: number;
  familyCount: number;
};

export async function computeBillingMetrics(gymId: string): Promise<BillingMetrics> {
  const admin = getAdminClient();

  const [{ data: subs }, { count: pastDue }, { count: families }] = await Promise.all([
    admin
      .from('subscriptions')
      .select('id, status, plans(price_cents, interval)')
      .eq('gym_id', gymId)
      .in('status', ['active', 'trialing']),
    admin
      .from('subscriptions')
      .select('*', { count: 'exact', head: true })
      .eq('gym_id', gymId)
      .eq('status', 'past_due'),
    admin
      .from('families')
      .select('*', { count: 'exact', head: true })
      .eq('gym_id', gymId),
  ]);

  let mrrCents = 0;
  for (const sub of subs ?? []) {
    const plan = sub.plans as unknown as { price_cents: number | null; interval: string } | null;
    if (!plan?.price_cents) continue;
    mrrCents += plan.interval === 'year' ? Math.round(plan.price_cents / 12) : plan.price_cents;
  }

  return {
    mrrCents,
    activeSubscriptions: subs?.length ?? 0,
    pastDueSubscriptions: pastDue ?? 0,
    familyCount: families ?? 0,
  };
}

export async function getFamilyBillingSummary(gymId: string, familyId: string) {
  const admin = getAdminClient();
  const { data: family, error: famErr } = await admin
    .from('families')
    .select('id, family_name, primary_email, stripe_customer_id')
    .eq('id', familyId)
    .eq('gym_id', gymId)
    .single();

  if (famErr || !family) throw new ServiceError(404, 'Family not found');

  const { data: members } = await admin
    .from('members')
    .select('id, first_name, last_name, email, status, belt_rank')
    .eq('gym_id', gymId)
    .eq('family_id', familyId)
    .order('first_name');

  const memberIds = (members ?? []).map((m) => m.id);
  let subscriptions: { member_id: string; status: string; plans: { name: string } | null }[] = [];

  if (memberIds.length > 0) {
    const { data: subs } = await admin
      .from('subscriptions')
      .select('member_id, status, plans(name)')
      .eq('gym_id', gymId)
      .in('member_id', memberIds)
      .in('status', ['active', 'past_due', 'trialing']);
    subscriptions = (subs ?? []).map((s) => ({
      member_id: s.member_id as string,
      status: s.status as string,
      plans: (s.plans as unknown as { name: string } | null) ?? null,
    }));
  }

  return { family, members: members ?? [], subscriptions };
}
