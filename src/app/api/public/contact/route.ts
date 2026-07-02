import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getPublicGymBySlug } from '@/lib/gym-public';
import { createLead } from '@/services/leads';
import { checkRateLimit } from '@/lib/rate-limit';
import { logger } from '@/lib/logger';
import { sendTransactionalEmail } from '@/lib/email/resend';

const contactSchema = z.object({
  gym_slug: z.string().min(1).max(64),
  first_name: z.string().min(1).max(100),
  last_name: z.string().min(1).max(100),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().max(30).optional(),
  message: z.string().max(2000).optional(),
  sms_consent: z.boolean().optional(),
  utm_source: z.string().max(100).optional(),
  utm_medium: z.string().max(100).optional(),
  utm_campaign: z.string().max(100).optional(),
});

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  const limit = await checkRateLimit(`contact:${ip}`, 10, 60 * 60 * 1000);
  if (!limit.allowed) {
    return NextResponse.json({ error: 'Too many requests. Try again later.' }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = contactSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  const data = parsed.data;
  const gym = await getPublicGymBySlug(data.gym_slug);
  if (!gym) {
    return NextResponse.json({ error: 'Gym not found' }, { status: 404 });
  }

  try {
    const lead = await createLead({
      gymId: gym.id,
      firstName: data.first_name,
      lastName: data.last_name,
      email: data.email || undefined,
      phone: data.phone || undefined,
      source: 'website_contact',
      notes: data.message,
      smsConsent: data.sms_consent ?? false,
      utmSource: data.utm_source,
      utmMedium: data.utm_medium,
      utmCampaign: data.utm_campaign,
    });

    if (gym.contact_email && data.message) {
      await sendTransactionalEmail({
        to: gym.contact_email,
        subject: `Contact form: ${data.first_name} ${data.last_name}`,
        html: `<p><strong>${data.first_name} ${data.last_name}</strong></p>
               <p>${data.email ? `Email: ${data.email}<br/>` : ''}${data.phone ? `Phone: ${data.phone}<br/>` : ''}</p>
               <p>${data.message}</p>`,
        text: `Contact from ${data.first_name} ${data.last_name}: ${data.message}`,
      }).catch((err) => logger.warn({ err }, 'Contact form staff email failed'));
    }

    return NextResponse.json({ ok: true, lead_id: lead.id });
  } catch (err: unknown) {
    logger.error({ err, gymSlug: data.gym_slug }, 'Contact form failed');
    const message = err instanceof Error ? err.message : 'Failed to submit';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
