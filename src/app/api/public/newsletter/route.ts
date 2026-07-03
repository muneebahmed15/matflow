import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getPublicGymBySlug } from '@/lib/gym-public';
import { createLead } from '@/services/leads';
import { checkRateLimit } from '@/lib/rate-limit';
import { logger } from '@/lib/logger';

const newsletterSchema = z.object({
  gym_slug: z.string().min(1).max(64),
  email: z.string().email(),
});

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  const limit = await checkRateLimit(`newsletter:${ip}`, 10, 60 * 60 * 1000);
  if (!limit.allowed) {
    return NextResponse.json({ error: 'Too many requests. Try again later.' }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = newsletterSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  const { gym_slug, email } = parsed.data;
  const gym = await getPublicGymBySlug(gym_slug);
  if (!gym) {
    return NextResponse.json({ error: 'Gym not found' }, { status: 404 });
  }

  try {
    await createLead({
      gymId: gym.id,
      firstName: email.split('@')[0],
      lastName: '(newsletter)',
      email,
      source: 'newsletter',
    });
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    logger.error({ err, gymSlug: gym_slug }, 'Newsletter signup failed');
    return NextResponse.json({ error: 'Failed to subscribe' }, { status: 500 });
  }
}
