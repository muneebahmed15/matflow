export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase/admin';
import { isErrorResponse, requireStaffAuth } from '@/lib/auth/api';

export async function GET(req: NextRequest) {
  const auth = await requireStaffAuth();
  if (isErrorResponse(auth)) return auth;

  const { searchParams } = new URL(req.url);
  const gym_id = searchParams.get('gym_id');
  if (!gym_id) {
    return NextResponse.json({ error: 'gym_id required' }, { status: 400 });
  }
  if (auth.gymId !== gym_id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const admin = getAdminClient();
  const { data, error } = await admin
    .from('plans')
    .select('*')
    .eq('gym_id', gym_id)
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}
