import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

export async function POST(req: NextRequest) {
  const supabaseAdmin = getSupabaseAdmin()
  const { name, description, price_cents, interval, gym_id } = await req.json()
  try {
    const product = await stripe.products.create({ name, description: description || undefined })
    const price = await stripe.prices.create({
      product: product.id,
      unit_amount: price_cents,
      currency: 'usd',
      recurring: { interval },
    })
    const { error } = await supabaseAdmin.from('plans').insert({
      gym_id, name, description, price: price_cents / 100, interval,
      stripe_product_id: product.id, stripe_price_id: price.id, is_active: true,
    })
    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Create plan error'
    console.error('Create plan error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
