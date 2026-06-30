import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

export async function POST(req: NextRequest) {
  const supabaseAdmin = getSupabaseAdmin()
  const { subscription_id, stripe_subscription_id, reason, cancel_immediately } = await req.json()

  if (!stripe_subscription_id) {
    return NextResponse.json({ error: 'stripe_subscription_id required' }, { status: 400 })
  }

  try {
    if (cancel_immediately) {
      await stripe.subscriptions.cancel(stripe_subscription_id)
    } else {
      await stripe.subscriptions.update(stripe_subscription_id, {
        cancel_at_period_end: true,
      })
    }

    await supabaseAdmin.from('subscriptions').update({
      status: cancel_immediately ? 'cancelled' : 'active',
      cancellation_reason: reason || null,
      cancelled_at: new Date().toISOString(),
    }).eq('id', subscription_id)

    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Cancel subscription error'
    console.error('Cancel subscription error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
