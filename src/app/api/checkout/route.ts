export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe';
import { getSupabase } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  try {
    const supabase = getSupabase();
    const { member_id, plan_id } = await req.json();

    const { data: member, error: memberError } = await supabase
      .from('members').select('*').eq('id', member_id).single();

    if (memberError || !member) throw new Error('Member not found');

    const { data: plan, error: planError } = await supabase
      .from('plans').select('*').eq('id', plan_id).single();

    if (planError || !plan) throw new Error('Plan not found');
    if (!plan.stripe_price_id) throw new Error('Plan not connected to Stripe');

    const session = await getStripe().checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: plan.stripe_price_id, quantity: 1 }],
      customer_email: member.email,
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/members/${member_id}?success=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/members/${member_id}?cancelled=true`,
      metadata: { member_id, plan_id },
    });

    return NextResponse.json({ url: session.url });

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}