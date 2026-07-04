import { NextRequest, NextResponse } from 'next/server';
import {
  checkInMember,
  listAttendance,
  validateKioskCheckIn as validateKioskCheckInService,
} from '@/services/attendance';
import { isErrorResponse, requireStaffAuth } from '@/lib/auth/api';
import { parseJsonBody, parseSearchParams } from '@/lib/api-validate';
import { attendanceLogQuerySchema, checkInSchema } from '@/lib/api-schemas';
import { handleRouteError } from '@/lib/api-error';

export async function POST(req: NextRequest) {
  const parsed = await parseJsonBody(req, checkInSchema);
  if (!parsed.success) return parsed.response;
  const { member_id, gym_id, notes, checked_in_by, class_id } = parsed.data;

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
      notes: notes ?? null,
      checkedInBy: isStaff ? staffAuth.user.id : checked_in_by ?? null,
      classId: class_id ?? null,
    });

    return NextResponse.json({ data });
  } catch (error) {
    return handleRouteError(error, {
      fallbackMessage: 'Internal server error',
      logMessage: 'Check-in failed',
      logContext: { gymId: gym_id, memberId: member_id },
    });
  }
}

export async function GET(req: NextRequest) {
  const auth = await requireStaffAuth();
  if (isErrorResponse(auth)) return auth;

  const { searchParams } = new URL(req.url);
  const parsed = parseSearchParams(searchParams, attendanceLogQuerySchema);
  if (!parsed.success) return parsed.response;
  const { gym_id, date } = parsed.data;

  if (auth.gymId !== gym_id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const data = await listAttendance(gym_id, { date });
    return NextResponse.json({ data });
  } catch (error) {
    return handleRouteError(error, {
      fallbackMessage: 'Internal server error',
      logMessage: 'Attendance log lookup failed',
      logContext: { gymId: gym_id },
    });
  }
}
