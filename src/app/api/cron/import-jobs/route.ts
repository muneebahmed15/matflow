import { NextRequest, NextResponse } from 'next/server';
import { requireCronSecret } from '@/lib/auth/cron';
import { processImportJobQueue } from '@/services/migration';
import { logger } from '@/lib/logger';

export async function GET(req: NextRequest) {
  const denied = requireCronSecret(req.headers.get('authorization'));
  if (denied) return denied;

  try {
    const processed = await processImportJobQueue(10);
    return NextResponse.json({ ok: true, processed });
  } catch (err) {
    logger.error({ err }, 'Import job queue processing failed');
    return NextResponse.json({ ok: false, error: 'Queue processing failed' }, { status: 500 });
  }
}
