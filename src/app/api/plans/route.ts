export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

export async function GET(req: NextRequest) {
  const supabaseAdmin = getSupabaseAdmin()
  const { searchParams } = new URL(req.url)
  const gym_id = searchParams.get('gym_id')
  if (!gym_id) return NextResponse.json({ error: 'gym_id required' }, { status: 400 })
  const { data, error } = await supabaseAdmin.from('plans').select('*').eq('gym_id', gym_id).eq('is_active', true).order('created_at', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}
