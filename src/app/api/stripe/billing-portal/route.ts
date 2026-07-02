import { NextRequest, NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe';
import { getPublicEnv } from '@/lib/env';
import { getAdminClient } from '@/lib/supabase/admin';
import { requireMemberAuth, isErrorResponse } from '@/lib/auth/api';

export async function POST(req: NextRequest) {
  const auth = await requireMemberAuth();
  if (isErrorResponse(auth)) return auth;

  const admin = getAdminClient();
  const { data: member } = await admin
    .from('members')
    .select('id, gym_id, email')
    .eq('id', auth.memberId)
    .single();

  if (!member?.email) {
    return NextResponse.json({ error: 'Member email required' }, { status: 400 });
  }

  const { data: subscription } = await admin
    .from('subscriptions')
    .select('stripe_customer_id')
    .eq('member_id', member.id)
    .not('stripe_customer_id', 'is', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!subscription?.stripe_customer_id) {
    return NextResponse.json({ error: 'No billing account found' }, { status: 404 });
  }

  const { NEXT_PUBLIC_APP_URL } = getPublicEnv();
  const session = await getStripe().billingPortal.sessions.create({
    customer: subscription.stripe_customer_id,
    return_url: `${NEXT_PUBLIC_APP_URL}/portal/subscription`,
  });

  return NextResponse.json({ url: session.url });
}
