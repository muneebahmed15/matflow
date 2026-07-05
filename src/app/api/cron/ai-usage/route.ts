import { NextRequest, NextResponse } from 'next/server';
import { requireCronSecret } from '@/lib/auth/cron';
import { getAdminClient } from '@/lib/supabase/admin';
import { checkAndAlertAiOverage } from '@/lib/ai/usage-metering';
import { logger } from '@/lib/logger';

export async function GET(req: NextRequest) {
  const denied = requireCronSecret(req.headers.get('authorization'));
  if (denied) return denied;

  const admin = getAdminClient();
  const { data: gyms } = await admin
    .from('gyms')
    .select('id')
    .eq('ai_front_desk_enabled', true);

  let alerted = 0;
  for (const gym of gyms ?? []) {
    try {
      if (await checkAndAlertAiOverage(gym.id)) alerted++;
    } catch (err) {
      logger.warn({ err, gymId: gym.id }, 'AI overage check failed');
    }
  }

  return NextResponse.json({ ok: true, gyms: gyms?.length ?? 0, alerted });
}
