import { NextRequest, NextResponse } from 'next/server';
import { requireCronSecret } from '@/lib/auth/cron';
import { getAdminClient } from '@/lib/supabase/admin';
import { sendVoiceBriefing } from '@/services/business-assistant';
import { logger } from '@/lib/logger';

export async function GET(req: NextRequest) {
  const denied = requireCronSecret(req.headers.get('authorization'));
  if (denied) return denied;

  const admin = getAdminClient();
  const { data: gyms } = await admin
    .from('gyms')
    .select('id')
    .eq('voice_briefing_enabled', true)
    .not('voice_briefing_phone', 'is', null);

  let sent = 0;
  for (const gym of gyms ?? []) {
    try {
      if (await sendVoiceBriefing(gym.id)) sent++;
    } catch (err) {
      logger.warn({ err, gymId: gym.id }, 'Voice briefing failed');
    }
  }

  return NextResponse.json({ ok: true, sent });
}
