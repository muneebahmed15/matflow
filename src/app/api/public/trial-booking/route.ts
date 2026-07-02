import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getAdminClient } from '@/lib/supabase/admin';
import { getPublicGymBySlug } from '@/lib/gym-public';
import { createLead } from '@/services/leads';
import { checkRateLimit } from '@/lib/rate-limit';
import { logger } from '@/lib/logger';

const trialBookingSchema = z.object({
  gym_slug: z.string().min(1).max(64),
  first_name: z.string().min(1).max(100),
  last_name: z.string().min(1).max(100),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().max(30).optional(),
  interested_in: z.string().max(200).optional(),
  sms_consent: z.boolean().optional(),
  trial_date: z.string().optional(),
  utm_source: z.string().max(100).optional(),
  utm_medium: z.string().max(100).optional(),
  utm_campaign: z.string().max(100).optional(),
});

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  const limit = await checkRateLimit(`trial-booking:${ip}`, 10, 60 * 60 * 1000);
  if (!limit.allowed) {
    return NextResponse.json({ error: 'Too many requests. Try again later.' }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = trialBookingSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  const {
    gym_slug,
    first_name,
    last_name,
    email,
    phone,
    interested_in,
    sms_consent,
    trial_date,
    utm_source,
    utm_medium,
    utm_campaign,
  } = parsed.data;
  const gym = await getPublicGymBySlug(gym_slug);

  if (!gym) {
    return NextResponse.json({ error: 'Gym not found' }, { status: 404 });
  }

  try {
    const lead = await createLead({
      gymId: gym.id,
      firstName: first_name,
      lastName: last_name,
      email: email || undefined,
      phone: phone || undefined,
      source: 'website_trial',
      interestedIn: interested_in,
      smsConsent: sms_consent ?? false,
      trialDate: trial_date,
      utmSource: utm_source,
      utmMedium: utm_medium,
      utmCampaign: utm_campaign,
    });

    const admin = getAdminClient();
    await admin
      .from('leads')
      .update({ status: 'trial_scheduled' })
      .eq('id', lead.id)
      .eq('gym_id', gym.id);

    return NextResponse.json({ ok: true, lead_id: lead.id });
  } catch (err: unknown) {
    logger.error({ err, gymSlug: gym_slug }, 'Trial booking failed');
    const message = err instanceof Error ? err.message : 'Failed to book trial';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
