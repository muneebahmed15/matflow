import { NextRequest, NextResponse } from 'next/server';
import { requireCronSecret } from '@/lib/auth/cron';
import { processWaiverExpiryReminders } from '@/services/waiver-reminders';
import { logger } from '@/lib/logger';

export async function GET(req: NextRequest) {
  const denied = requireCronSecret(req.headers.get('authorization'));
  if (denied) return denied;

  try {
    const result = await processWaiverExpiryReminders({ withinDays: 7 });
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    logger.error({ err }, 'Waiver expiry reminder cron failed');
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
