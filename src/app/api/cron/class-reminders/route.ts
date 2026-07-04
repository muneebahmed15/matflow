import { NextRequest, NextResponse } from 'next/server';
import { requireCronSecret } from '@/lib/auth/cron';
import { sendClassReminders } from '@/services/class-reminders';
import { logger } from '@/lib/logger';

export async function GET(req: NextRequest) {
  const denied = requireCronSecret(req.headers.get('authorization'));
  if (denied) return denied;

  try {
    const result = await sendClassReminders();
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    logger.error({ err }, 'Class reminder cron failed');
    return NextResponse.json({ error: 'Cron failed' }, { status: 500 });
  }
}
