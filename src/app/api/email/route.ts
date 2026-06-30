import { NextRequest, NextResponse } from 'next/server';
import {
  assertGymScope,
  isErrorResponse,
  requireStaffAuth,
} from '@/lib/auth/api';
import { isServiceError } from '@/services/errors';
import {
  sendMemberNotification,
  type NotificationType,
} from '@/services/notifications';

export async function POST(req: NextRequest) {
  const auth = await requireStaffAuth();
  if (isErrorResponse(auth)) return auth;

  const { type, member_id, gym_id, data } = await req.json();

  if (!member_id || !gym_id || !type) {
    return NextResponse.json({ error: 'type, member_id, and gym_id required' }, { status: 400 });
  }

  const scopeError = assertGymScope(auth, gym_id);
  if (scopeError) return scopeError;

  const allowedTypes: NotificationType[] = [
    'welcome',
    'checkin',
    'waiver_signed',
    'subscription_created',
    'belt_promotion',
  ];
  if (!allowedTypes.includes(type)) {
    return NextResponse.json({ error: 'Invalid notification type' }, { status: 400 });
  }

  try {
    const result = await sendMemberNotification({
      gymId: gym_id,
      memberId: member_id,
      type,
      data,
    });
    return NextResponse.json({ success: true, ...result });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Email error';
    console.error('Email error:', message);
    if (isServiceError(err)) {
      return NextResponse.json({ error: message }, { status: err.status });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
