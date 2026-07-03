import { NextRequest, NextResponse } from 'next/server';
import { processWaiverExpiryReminders } from '@/services/waiver-reminders';
import { logger } from '@/lib/logger';

export async function GET(req: NextRequest) {
  const secret = req.headers.get('authorization')?.replace('Bearer ', '');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || secret !== cronSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await processWaiverExpiryReminders({ withinDays: 7 });
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    logger.error({ err }, 'Waiver expiry reminder cron failed');
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
