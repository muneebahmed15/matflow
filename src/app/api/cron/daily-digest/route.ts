import { NextRequest, NextResponse } from 'next/server';
import { requireCronSecret } from '@/lib/auth/cron';
import { getAdminClient } from '@/lib/supabase/admin';
import { saveDailySnapshot, metricsToRecommendations, computeGymMetrics } from '@/services/business-assistant';
import { sendTransactionalEmail } from '@/lib/email/resend';
import { logger } from '@/lib/logger';

export async function GET(req: NextRequest) {
  const denied = requireCronSecret(req.headers.get('authorization'));
  if (denied) return denied;

  const admin = getAdminClient();
  const { data: gyms } = await admin
    .from('gyms')
    .select('id, name, owner_id, daily_digest_enabled')
    .eq('daily_digest_enabled', true);

  let sent = 0;

  for (const gym of gyms ?? []) {
    try {
      await saveDailySnapshot(gym.id);
      const metrics = await computeGymMetrics(gym.id);
      const recommendations = metricsToRecommendations(metrics);
      if (recommendations.length === 0) continue;

      const { data: owner } = await admin.auth.admin.getUserById(gym.owner_id);
      const email = owner?.user?.email;
      if (!email) continue;

      const lines = recommendations
        .map((r) => `[${r.priority}] ${r.title}: ${r.description}`)
        .join('\n');

      await sendTransactionalEmail({
        to: email,
        subject: `${gym.name} — daily actions`,
        html: `<p>Good morning! Here are today's recommended actions for ${gym.name}:</p><pre>${lines}</pre>`,
        text: `Daily actions for ${gym.name}:\n${lines}`,
      });
      sent++;
    } catch (err) {
      logger.warn({ err, gymId: gym.id }, 'Daily digest failed for gym');
    }
  }

  return NextResponse.json({ ok: true, gyms: gyms?.length ?? 0, emailsSent: sent });
}
