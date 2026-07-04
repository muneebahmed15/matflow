import { NextRequest, NextResponse } from 'next/server';
import { requireCronSecret } from '@/lib/auth/cron';
import { sendInactiveMemberWinBack } from '@/services/member-automation';
import { logger } from '@/lib/logger';

export async function GET(req: NextRequest) {
  const denied = requireCronSecret(req.headers.get('authorization'));
  if (denied) return denied;

  try {
    const result = await sendInactiveMemberWinBack();
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    logger.error({ err }, 'Win-back cron failed');
    return NextResponse.json({ error: 'Cron failed' }, { status: 500 });
  }
}
