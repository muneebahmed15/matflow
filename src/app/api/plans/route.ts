export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { listActivePlans } from '@/services/plans';
import { isErrorResponse, requireStaffAuth } from '@/lib/auth/api';
import { isServiceError } from '@/services/errors';

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

  try {
    const data = await listActivePlans(gym_id);
    return NextResponse.json({ data });
  } catch (error) {
    if (isServiceError(error)) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
