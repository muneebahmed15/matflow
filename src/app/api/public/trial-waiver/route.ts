import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getPublicGymBySlug } from '@/lib/gym-public';
import { signLeadWaiver } from '@/services/waivers';
import { checkRateLimit } from '@/lib/rate-limit';
import { handleRouteError } from '@/lib/api-error';

const schema = z.object({
  gym_slug: z.string().min(1).max(64),
  lead_id: z.string().uuid(),
  waiver_id: z.string().uuid(),
  signed_name: z.string().min(1).max(200),
  guardian_name: z.string().max(200).optional(),
});

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  const limit = await checkRateLimit(`trial-waiver:${ip}`, 20, 60 * 60 * 1000);
  if (!limit.allowed) {
    return NextResponse.json({ error: 'Too many requests. Try again later.' }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  const gym = await getPublicGymBySlug(parsed.data.gym_slug);
  if (!gym) {
    return NextResponse.json({ error: 'Gym not found' }, { status: 404 });
  }

  try {
    const result = await signLeadWaiver({
      waiverId: parsed.data.waiver_id,
      leadId: parsed.data.lead_id,
      gymId: gym.id,
      signedName: parsed.data.signed_name,
      guardianName: parsed.data.guardian_name,
      ipAddress: ip,
      userAgent: req.headers.get('user-agent'),
    });

    return NextResponse.json({ ok: true, signature_id: result.signatureId });
  } catch (err) {
    return handleRouteError(err, {
      fallbackMessage: 'Failed to sign waiver',
      logMessage: 'Trial waiver sign failed',
    });
  }
}
