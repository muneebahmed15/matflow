import { NextRequest, NextResponse } from 'next/server';
import {
  checkInMember,
  listAttendance,
  validateKioskCheckIn as validateKioskCheckInService,
} from '@/services/attendance';
import { isErrorResponse, requireStaffAuth } from '@/lib/auth/api';
import { isServiceError } from '@/services/errors';

function serviceErrorResponse(error: unknown): NextResponse {
  if (isServiceError(error)) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
}

export async function POST(req: NextRequest) {
  const { member_id, gym_id, notes, checked_in_by } = await req.json();
  if (!member_id || !gym_id) {
    return NextResponse.json({ error: 'member_id and gym_id required' }, { status: 400 });
  }

  const staffAuth = await requireStaffAuth();
  const isStaff = !isErrorResponse(staffAuth);

  try {
    if (isStaff) {
      if (staffAuth.gymId !== gym_id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    } else {
      await validateKioskCheckInService(gym_id, member_id);
    }

    const data = await checkInMember({
      gymId: gym_id,
      memberId: member_id,
      notes: notes || null,
      checkedInBy: isStaff ? staffAuth.user.id : checked_in_by || null,
    });

    return NextResponse.json({ data });
  } catch (error) {
    return serviceErrorResponse(error);
  }
}

export async function GET(req: NextRequest) {
  const auth = await requireStaffAuth();
  if (isErrorResponse(auth)) return auth;

  const { searchParams } = new URL(req.url);
  const gym_id = searchParams.get('gym_id');
  const date = searchParams.get('date');

  if (!gym_id) {
    return NextResponse.json({ error: 'gym_id required' }, { status: 400 });
  }
  if (auth.gymId !== gym_id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const data = await listAttendance(gym_id, { date: date ?? undefined });
    return NextResponse.json({ data });
  } catch (error) {
    return serviceErrorResponse(error);
  }
}
