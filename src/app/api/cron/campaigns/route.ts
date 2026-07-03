import { NextRequest, NextResponse } from 'next/server';
import { sendDueCampaigns } from '@/services/marketing';
import { logger } from '@/lib/logger';

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await sendDueCampaigns();
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    logger.error({ err }, 'Scheduled campaign cron failed');
    return NextResponse.json({ error: 'Cron failed' }, { status: 500 });
  }
}
