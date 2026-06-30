import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { getAdminClient } from '@/lib/supabase/admin';
import {
  assertSubscriptionInGym,
  isErrorResponse,
  requireStaffAuth,
} from '@/lib/auth/api';

export async function POST(req: NextRequest) {
  const auth = await requireStaffAuth({ adminOnly: true });
  if (isErrorResponse(auth)) return auth;

  const { subscription_id, stripe_subscription_id, reason, action } = await req.json();

  if (!stripe_subscription_id || !subscription_id) {
    return NextResponse.json(
      { error: 'subscription_id and stripe_subscription_id required' },
      { status: 400 }
    );
  }

  const scopeError = await assertSubscriptionInGym(auth, subscription_id);
  if (scopeError) return scopeError;

  try {
    const admin = getAdminClient();

    if (action === 'pause') {
      await stripe.subscriptions.update(stripe_subscription_id, {
        pause_collection: { behavior: 'void' },
      });
      await admin
        .from('subscriptions')
        .update({
          status: 'paused',
          paused_at: new Date().toISOString(),
          pause_reason: reason || null,
        })
        .eq('id', subscription_id)
        .eq('gym_id', auth.gymId);
    } else {
      await stripe.subscriptions.update(stripe_subscription_id, {
        pause_collection: '',
      });
      await admin
        .from('subscriptions')
        .update({
          status: 'active',
          paused_at: null,
          pause_reason: null,
        })
        .eq('id', subscription_id)
        .eq('gym_id', auth.gymId);
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Pause subscription error';
    console.error('Pause subscription error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
