import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const supabase = createRouteHandlerClient({ cookies })
  const { member_id, gym_id, notes } = await request.json()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Prevent duplicate check-in within the same calendar day
  const startOfDay = new Date()
  startOfDay.setHours(0, 0, 0, 0)

  const { data: existing } = await supabase
    .from('attendance')
    .select('id')
    .eq('gym_id', gym_id)
    .eq('member_id', member_id)
    .gte('checked_in_at', startOfDay.toISOString())
    .maybeSingle()

  if (existing) {
    return NextResponse.json(
      { error: 'Member already checked in today' },
      { status: 409 }
    )
  }

  const { data, error } = await supabase
    .from('attendance')
    .insert({ member_id, gym_id, notes, checked_in_by: user.id })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ data })
}

export async function GET(request: Request) {
  const supabase = createRouteHandlerClient({ cookies })
  const { searchParams } = new URL(request.url)
  const gym_id = searchParams.get('gym_id')
  const date = searchParams.get('date') // optional: YYYY-MM-DD

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let query = supabase
    .from('attendance')
    .select(`*, members(id, first_name, last_name, email, phone)`)
    .eq('gym_id', gym_id)
    .order('checked_in_at', { ascending: false })

  if (date) {
    const start = new Date(date)
    start.setHours(0, 0, 0, 0)
    const end = new Date(date)
    end.setHours(23, 59, 59, 999)
    query = query.gte('checked_in_at', start.toISOString()).lte('checked_in_at', end.toISOString())
  }

  const { data, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ data })
}