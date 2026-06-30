import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase/admin';
import { assertGymScope, isErrorResponse, requireStaffAuth } from '@/lib/auth/api';

export async function POST(req: NextRequest) {
  const auth = await requireStaffAuth();
  if (isErrorResponse(auth)) return auth;

  const { type, member_id, gym_id, data } = await req.json();

  if (!member_id || !gym_id || !type) {
    return NextResponse.json({ error: 'type, member_id, and gym_id required' }, { status: 400 });
  }

  const scopeError = assertGymScope(auth, gym_id);
  if (scopeError) return scopeError;

  try {
    const admin = getAdminClient();
    const { data: member } = await admin
      .from('members')
      .select('first_name, last_name, email')
      .eq('id', member_id)
      .eq('gym_id', gym_id)
      .single();

    if (!member) return NextResponse.json({ error: 'Member not found' }, { status: 404 });

    const { data: gym } = await admin
      .from('gyms')
      .select('name')
      .eq('id', gym_id)
      .single();

    await admin.from('notifications').insert({
      gym_id,
      member_id,
      type,
      subject: getSubject(type, gym?.name),
      body: getBody(type, member.first_name, gym?.name, data),
      sent_at: new Date().toISOString(),
    });

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Email error';
    console.error('Email error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

function getSubject(type: string, gymName?: string | null) {
  switch (type) {
    case 'welcome':
      return `Welcome to ${gymName}!`;
    case 'checkin':
      return `Check-in confirmed at ${gymName}`;
    case 'waiver_signed':
      return `Waiver signed - ${gymName}`;
    case 'subscription_created':
      return `Subscription activated - ${gymName}`;
    case 'belt_promotion':
      return `Congratulations on your promotion! - ${gymName}`;
    default:
      return `Notification from ${gymName}`;
  }
}

function getBody(
  type: string,
  firstName: string,
  gymName: string | null | undefined,
  data: Record<string, unknown> | null | undefined
) {
  switch (type) {
    case 'welcome':
      return `Hi ${firstName}, welcome to ${gymName}! We're excited to have you train with us.`;
    case 'checkin':
      return `Hi ${firstName}, your check-in at ${gymName} has been recorded on ${new Date().toLocaleDateString()}.`;
    case 'waiver_signed':
      return `Hi ${firstName}, your waiver has been successfully signed at ${gymName}.`;
    case 'subscription_created':
      return `Hi ${firstName}, your membership subscription at ${gymName} is now active. Plan: ${data?.plan_name}.`;
    case 'belt_promotion':
      return `Hi ${firstName}, congratulations on your promotion to ${data?.to_belt} belt at ${gymName}!`;
    default:
      return `Hi ${firstName}, you have a notification from ${gymName}.`;
  }
}
