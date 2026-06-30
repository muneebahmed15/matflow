import type { Database } from '@/types/database';

type SubscriptionRow = Database['public']['Tables']['subscriptions']['Row'];

export type SubscriptionWithRelations = Pick<
  SubscriptionRow,
  'id' | 'status' | 'current_period_end' | 'stripe_subscription_id'
> & {
  members: {
    first_name: string;
    last_name: string;
    email: string | null;
  } | null;
  plans: {
    name: string;
    price: number | null;
    interval: string;
  } | null;
};

export type PortalSubscription = Pick<
  SubscriptionRow,
  'id' | 'status' | 'current_period_end'
> & {
  plans: {
    name: string;
    price_cents: number | null;
    interval: string;
  } | null;
};

export type MemberSignatureSummary = Pick<
  Database['public']['Tables']['waiver_signatures']['Row'],
  'waiver_id' | 'signed_at' | 'signed_name'
>;
