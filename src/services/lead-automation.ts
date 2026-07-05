import { getAdminClient } from '@/lib/supabase/admin';
import { sendTransactionalEmail } from '@/lib/email/resend';
import { sendGymTextMessage } from '@/lib/messaging/gym-message';
import { getPublicEnv } from '@/lib/env';
import { logger } from '@/lib/logger';

type LeadRow = {
  id: string;
  gym_id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  sms_consent: boolean;
  source: string | null;
  trial_date: string | null;
};

type GymRow = {
  id: string;
  name: string;
  slug: string;
  contact_email: string | null;
};

async function logAutomation(input: {
  gymId: string;
  leadId: string;
  workflow: string;
  step: string;
  channel: 'email' | 'sms';
  status: 'sent' | 'failed' | 'skipped';
}): Promise<void> {
  const admin = getAdminClient();
  await admin.from('lead_automation_logs').insert({
    gym_id: input.gymId,
    lead_id: input.leadId,
    workflow: input.workflow,
    step: input.step,
    channel: input.channel,
    status: input.status,
  });
}

async function notifyStaffNewLead(gym: GymRow, lead: LeadRow): Promise<void> {
  if (!gym.contact_email) return;

  const appUrl = getPublicEnv().NEXT_PUBLIC_APP_URL;
  const leadUrl = `${appUrl}/leads`;

  try {
    await sendTransactionalEmail({
      to: gym.contact_email,
      subject: `New lead: ${lead.first_name} ${lead.last_name} — ${gym.name}`,
      html: `
        <p>A new lead just came in from <strong>${lead.source ?? 'unknown'}</strong>.</p>
        <p><strong>${lead.first_name} ${lead.last_name}</strong><br/>
        ${lead.email ? `Email: ${lead.email}<br/>` : ''}
        ${lead.phone ? `Phone: ${lead.phone}` : ''}</p>
        <p><a href="${leadUrl}">View leads in MatsFlow</a></p>
      `.trim(),
      text: `New lead: ${lead.first_name} ${lead.last_name}. View at ${leadUrl}`,
    });
    await logAutomation({
      gymId: gym.id,
      leadId: lead.id,
      workflow: 'new_lead',
      step: 'staff_notification',
      channel: 'email',
      status: 'sent',
    });
  } catch (err) {
    logger.warn({ err, leadId: lead.id }, 'Staff lead notification failed');
    await logAutomation({
      gymId: gym.id,
      leadId: lead.id,
      workflow: 'new_lead',
      step: 'staff_notification',
      channel: 'email',
      status: 'failed',
    });
  }
}

async function sendLeadWelcomeEmail(gym: GymRow, lead: LeadRow): Promise<void> {
  if (!lead.email) {
    await logAutomation({
      gymId: gym.id,
      leadId: lead.id,
      workflow: 'new_lead',
      step: 'welcome_email',
      channel: 'email',
      status: 'skipped',
    });
    return;
  }

  const trialUrl = `${getPublicEnv().NEXT_PUBLIC_APP_URL}/g/${gym.slug}/trial`;

  try {
    await sendTransactionalEmail({
      to: lead.email,
      subject: `Welcome to ${gym.name} — your free trial`,
      html: `
        <p>Hi ${lead.first_name},</p>
        <p>Thanks for your interest in training at <strong>${gym.name}</strong>!</p>
        <p>We're excited to meet you. Our team will reach out shortly to confirm your free trial class.</p>
        <p>In the meantime, you can <a href="${trialUrl}">view our schedule and programs</a>.</p>
        <p>See you on the mats!</p>
      `.trim(),
      text: `Hi ${lead.first_name}, thanks for your interest in ${gym.name}! We'll contact you shortly about your free trial.`,
    });
    await logAutomation({
      gymId: gym.id,
      leadId: lead.id,
      workflow: 'new_lead',
      step: 'welcome_email',
      channel: 'email',
      status: 'sent',
    });
  } catch (err) {
    logger.warn({ err, leadId: lead.id }, 'Lead welcome email failed');
    await logAutomation({
      gymId: gym.id,
      leadId: lead.id,
      workflow: 'new_lead',
      step: 'welcome_email',
      channel: 'email',
      status: 'failed',
    });
  }
}

async function sendLeadWelcomeSms(gym: GymRow, lead: LeadRow): Promise<void> {
  if (!lead.phone || !lead.sms_consent) {
    await logAutomation({
      gymId: gym.id,
      leadId: lead.id,
      workflow: 'new_lead',
      step: 'welcome_sms',
      channel: 'sms',
      status: 'skipped',
    });
    return;
  }

  try {
    await sendGymTextMessage({
      gymId: gym.id,
      to: lead.phone,
      body: `Hi ${lead.first_name}! Thanks for reaching out to ${gym.name}. We'll text you shortly to confirm your free trial. Reply STOP to opt out.`,
    });
    await logAutomation({
      gymId: gym.id,
      leadId: lead.id,
      workflow: 'new_lead',
      step: 'welcome_sms',
      channel: 'sms',
      status: 'sent',
    });
  } catch (err) {
    logger.warn({ err, leadId: lead.id }, 'Lead welcome SMS failed');
    await logAutomation({
      gymId: gym.id,
      leadId: lead.id,
      workflow: 'new_lead',
      step: 'welcome_sms',
      channel: 'sms',
      status: 'failed',
    });
  }
}

/** Run instant automations when a new lead is created. */
export async function runNewLeadAutomations(leadId: string): Promise<void> {
  const admin = getAdminClient();

  const { data: lead } = await admin
    .from('leads')
    .select('id, gym_id, first_name, last_name, email, phone, sms_consent, source, trial_date')
    .eq('id', leadId)
    .maybeSingle();

  if (!lead) return;

  const { data: gym } = await admin
    .from('gyms')
    .select('id, name, slug, contact_email')
    .eq('id', lead.gym_id)
    .maybeSingle();

  if (!gym) return;

  await Promise.all([
    notifyStaffNewLead(gym as GymRow, lead as LeadRow),
    sendLeadWelcomeEmail(gym as GymRow, lead as LeadRow),
    sendLeadWelcomeSms(gym as GymRow, lead as LeadRow),
  ]);
}

/** Send trial reminder emails/SMS for leads with trial_date = tomorrow. */
export async function sendTrialReminders(): Promise<{ processed: number }> {
  const admin = getAdminClient();
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const trialDate = tomorrow.toISOString().split('T')[0];

  const { data: leads } = await admin
    .from('leads')
    .select('id, gym_id, first_name, email, phone, sms_consent, status')
    .eq('trial_date', trialDate)
    .in('status', ['new', 'trial_scheduled', 'contacted']);

  let processed = 0;

  for (const lead of leads ?? []) {
    const { data: gym } = await admin
      .from('gyms')
      .select('name')
      .eq('id', lead.gym_id)
      .single();

    if (lead.email) {
      try {
        await sendTransactionalEmail({
          to: lead.email,
          subject: `Reminder: your trial class at ${gym?.name ?? 'our gym'} is tomorrow`,
          html: `<p>Hi ${lead.first_name},</p><p>Just a friendly reminder — your free trial at <strong>${gym?.name}</strong> is tomorrow. We can't wait to see you!</p>`,
          text: `Hi ${lead.first_name}, your free trial at ${gym?.name} is tomorrow!`,
        });
        await logAutomation({
          gymId: lead.gym_id,
          leadId: lead.id,
          workflow: 'trial_reminder',
          step: '24h_email',
          channel: 'email',
          status: 'sent',
        });
      } catch {
        await logAutomation({
          gymId: lead.gym_id,
          leadId: lead.id,
          workflow: 'trial_reminder',
          step: '24h_email',
          channel: 'email',
          status: 'failed',
        });
      }
    }

    if (lead.phone && lead.sms_consent) {
      try {
        await sendGymTextMessage({
          gymId: lead.gym_id,
          to: lead.phone,
          body: `Reminder from ${gym?.name}: your free trial is tomorrow! See you on the mats. Reply STOP to opt out.`,
        });
        await logAutomation({
          gymId: lead.gym_id,
          leadId: lead.id,
          workflow: 'trial_reminder',
          step: '24h_sms',
          channel: 'sms',
          status: 'sent',
        });
      } catch {
        await logAutomation({
          gymId: lead.gym_id,
          leadId: lead.id,
          workflow: 'trial_reminder',
          step: '24h_sms',
          channel: 'sms',
          status: 'failed',
        });
      }
    }

    processed++;
  }

  return { processed };
}
