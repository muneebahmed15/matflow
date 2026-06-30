import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

export async function POST(req: NextRequest) {
  const supabaseAdmin = getSupabaseAdmin()
  const { member_id, gym_id, notes, checked_in_by } = await req.json()
  if (!member_id || !gym_id) return NextResponse.json({ error: 'member_id and gym_id required' }, { status: 400 })
  const today = new Date().toISOString().split('T')[0]
  const { data: existing } = await supabaseAdmin.from('attendance').select('id').eq('gym_id', gym_id).eq('member_id', member_id).gte('checked_in_at', `${today}T00:00:00`).lte('checked_in_at', `${today}T23:59:59`).maybeSingle()
  if (existing) return NextResponse.json({ error: 'Member already checked in today' }, { status: 409 })
  const { data, error } = await supabaseAdmin.from('attendance').insert({ member_id, gym_id, notes: notes || null, checked_in_by: checked_in_by || null }).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}

export async function GET(req: NextRequest) {
  const supabaseAdmin = getSupabaseAdmin()
  const { searchParams } = new URL(req.url)
  const gym_id = searchParams.get('gym_id')
  const date = searchParams.get('date')
  if (!gym_id) return NextResponse.json({ error: 'gym_id required' }, { status: 400 })
  let query = supabaseAdmin.from('attendance').select('*, members(id, first_name, last_name, email, phone)').eq('gym_id', gym_id).order('checked_in_at', { ascending: false })
  if (date) query = query.gte('checked_in_at', `${date}T00:00:00`).lte('checked_in_at', `${date}T23:59:59`)
  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}
