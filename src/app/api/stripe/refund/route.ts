import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import Stripe from 'stripe'

export async function POST(req: NextRequest) {
  const supabaseAdmin = getSupabaseAdmin()
  const { stripe_subscription_id, gym_id, member_id, subscription_id, amount_cents, reason, issued_by } = await req.json()

  if (!stripe_subscription_id) {
    return NextResponse.json({ error: 'stripe_subscription_id required' }, { status: 400 })
  }

  try {
    const invoices = await stripe.invoices.list({
      subscription: stripe_subscription_id,
      limit: 1,
    })

    const latestInvoice = invoices.data[0]
    const paymentIntent = latestInvoice
      ? (latestInvoice as Stripe.Invoice & { payment_intent?: string | Stripe.PaymentIntent | null }).payment_intent
      : null
    const paymentIntentId = typeof paymentIntent === 'string' ? paymentIntent : paymentIntent?.id
    if (!latestInvoice || !paymentIntentId) {
      return NextResponse.json({ error: 'No payment found to refund' }, { status: 404 })
    }

    const refund = await stripe.refunds.create({
      payment_intent: paymentIntentId,
      amount: amount_cents || undefined,
      reason: 'requested_by_customer',
    })

    await supabaseAdmin.from('refunds').insert({
      gym_id,
      member_id,
      subscription_id,
      stripe_refund_id: refund.id,
      amount_cents: refund.amount,
      reason: reason || null,
      issued_by: issued_by || null,
    })

    return NextResponse.json({ success: true, refund })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Refund error'
    console.error('Refund error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
