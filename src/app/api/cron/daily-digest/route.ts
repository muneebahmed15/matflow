import { NextRequest, NextResponse } from 'next/server';
import { requireCronSecret } from '@/lib/auth/cron';
import { getAdminClient } from '@/lib/supabase/admin';
import {
  saveDailySnapshot,
  metricsToRecommendations,
  computeGymMetrics,
  filterDigestRecommendations,
  getHiddenDigestActionKeys,
  getDigestRecipients,
  getMarketingTip,
  buildDigestSmsBody,
  getDigestSmsPhone,
} from '@/services/business-assistant';
import { parseDigestSections } from '@/lib/digest-sections';
import { shouldSendDigest } from '@/lib/digest-schedule';
import { summarizeDigestWithLlm } from '@/lib/digest-llm-summary';
import { sendTransactionalEmail } from '@/lib/email/resend';
import { sendSms } from '@/lib/sms/twilio';
import { logger } from '@/lib/logger';

async function postSlackDigest(webhookUrl: string, gymName: string, lines: string[]): Promise<void> {
  await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text: `*${gymName} — daily actions*\n${lines.map((l) => `• ${l}`).join('\n')}`,
    }),
  });
}

export async function GET(req: NextRequest) {
  const denied = requireCronSecret(req.headers.get('authorization'));
  if (denied) return denied;

  const admin = getAdminClient();
  const { data: gyms } = await admin
    .from('gyms')
    .select(
      'id, name, owner_id, daily_digest_enabled, timezone, digest_hour, digest_frequency, digest_slack_webhook_url, digest_sections'
    )
    .eq('daily_digest_enabled', true);

  let sent = 0;

  for (const gym of gyms ?? []) {
    try {
      if (
        !shouldSendDigest({
          timezone: gym.timezone ?? 'America/New_York',
          digestHour: gym.digest_hour ?? 8,
          digestFrequency: gym.digest_frequency === 'weekly' ? 'weekly' : 'daily',
        })
      ) {
        continue;
      }

      await saveDailySnapshot(gym.id);
      const metrics = await computeGymMetrics(gym.id);
      const sections = parseDigestSections(gym.digest_sections);
      const hidden = await getHiddenDigestActionKeys(gym.id);
      const recommendations = filterDigestRecommendations(
        metricsToRecommendations(metrics),
        sections,
        hidden
      );
      if (recommendations.length === 0) continue;

      const tip = getMarketingTip(metrics);
      const llmSummary = await summarizeDigestWithLlm({
        gymName: gym.name,
        metrics,
        recommendations,
      });

      const lines = recommendations.map((r) => `[${r.priority}] ${r.title}: ${r.description}`);
      lines.push(`Tip: ${tip}`);
      if (llmSummary) lines.unshift(`Summary: ${llmSummary}`);

      const recipients = await getDigestRecipients(gym.id, gym.owner_id);
      for (const email of recipients) {
        await sendTransactionalEmail({
          to: email,
          subject: `${gym.name} — daily actions`,
          html: `<p>Good morning! Here are today's recommended actions for ${gym.name}:</p><pre>${lines.join('\n')}</pre>`,
          text: `Daily actions for ${gym.name}:\n${lines.join('\n')}`,
        });
      }

      const smsPhone = await getDigestSmsPhone(gym.id);
      if (smsPhone) {
        try {
          await sendSms({
            to: smsPhone,
            body: buildDigestSmsBody(gym.name, recommendations),
          });
        } catch (err) {
          logger.warn({ err, gymId: gym.id }, 'SMS digest failed');
        }
      }

      if (gym.digest_slack_webhook_url) {
        try {
          await postSlackDigest(gym.digest_slack_webhook_url, gym.name, lines);
        } catch (err) {
          logger.warn({ err, gymId: gym.id }, 'Slack digest failed');
        }
      }

      sent++;
    } catch (err) {
      logger.warn({ err, gymId: gym.id }, 'Daily digest failed for gym');
    }
  }

  return NextResponse.json({ ok: true, gyms: gyms?.length ?? 0, emailsSent: sent });
}
