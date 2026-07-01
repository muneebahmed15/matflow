export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { listActivePlans } from '@/services/plans';
import { isErrorResponse, requireStaffAuth } from '@/lib/auth/api';
import { isServiceError } from '@/services/errors';
import { parseSearchParams } from '@/lib/api-validate';
import { plansQuerySchema } from '@/lib/api-schemas';

export async function GET(req: NextRequest) {
  const auth = await requireStaffAuth();
  if (isErrorResponse(auth)) return auth;

  const { searchParams } = new URL(req.url);
  const parsed = parseSearchParams(searchParams, plansQuerySchema);
  if (!parsed.success) return parsed.response;
  const { gym_id } = parsed.data;
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
