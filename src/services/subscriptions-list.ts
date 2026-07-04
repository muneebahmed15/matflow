import { getAdminClient } from '@/lib/supabase/admin';
import { ServiceError } from '@/services/errors';

export type SubscriptionListItem = {
  id: string;
  status: string;
  current_period_end: string | null;
  stripe_subscription_id: string | null;
  payment_method: string | null;
  members: { first_name: string; last_name: string; email: string } | null;
  plans: { name: string; price: number; interval: string } | null;
};

export type PlanOption = { id: string; name: string };

export async function listSubscriptions(gymId: string): Promise<SubscriptionListItem[]> {
  const admin = getAdminClient();
  const { data, error } = await admin
    .from('subscriptions')
    .select(
      'id, status, current_period_end, stripe_subscription_id, payment_method, members(first_name, last_name, email), plans(name, price, interval)'
    )
    .eq('gym_id', gymId)
    .order('created_at', { ascending: false });

  if (error) throw new ServiceError(500, error.message);
  return (data ?? []) as unknown as SubscriptionListItem[];
}

export async function listPlanOptions(gymId: string): Promise<PlanOption[]> {
  const admin = getAdminClient();
  const { data, error } = await admin
    .from('plans')
    .select('id, name')
    .eq('gym_id', gymId)
    .eq('is_active', true)
    .order('name');

  if (error) throw new ServiceError(500, error.message);
  return data ?? [];
}
