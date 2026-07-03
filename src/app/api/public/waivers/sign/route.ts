import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getAdminClient } from '@/lib/supabase/admin';
import { signWaiver } from '@/services/waivers';
import { parseJsonBody } from '@/lib/api-validate';
import { handleRouteError } from '@/lib/api-error';
import { checkRateLimit } from '@/lib/rate-limit';

const schema = z.object({
  gym_id: z.string().uuid(),
  waiver_id: z.string().uuid(),
  member_id: z.string().uuid(),
  signed_name: z.string().min(2).max(200),
});

/** Kiosk waiver signing: anon, but gated on kiosk_enabled + member/gym match. */
export async function POST(req: NextRequest) {
  const parsed = await parseJsonBody(req, schema);
  if (!parsed.success) return parsed.response;

  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    req.headers.get('x-real-ip') ??
    'unknown';

  const limit = await checkRateLimit(`kiosk-waiver:${ip}`, 20, 60 * 60 * 1000);
  if (!limit.allowed) {
    return NextResponse.json({ error: 'Too many attempts. Try again later.' }, { status: 429 });
  }

  try {
    const admin = getAdminClient();

    const { data: gym } = await admin
      .from('gyms')
      .select('id, kiosk_enabled')
      .eq('id', parsed.data.gym_id)
      .maybeSingle();

    if (!gym?.kiosk_enabled) {
      return NextResponse.json({ error: 'Kiosk is not enabled for this gym' }, { status: 403 });
    }

    const { data: member } = await admin
      .from('members')
      .select('id, first_name, last_name')
      .eq('id', parsed.data.member_id)
      .eq('gym_id', parsed.data.gym_id)
      .maybeSingle();

    if (!member) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    const expectedName = `${member.first_name} ${member.last_name}`.trim().toLowerCase();
    if (parsed.data.signed_name.trim().toLowerCase() !== expectedName) {
      return NextResponse.json(
        { error: 'Typed name must match the member name exactly.' },
        { status: 400 }
      );
    }

    const result = await signWaiver({
      waiverId: parsed.data.waiver_id,
      memberId: parsed.data.member_id,
      gymId: parsed.data.gym_id,
      signedName: parsed.data.signed_name,
      ipAddress: ip === 'unknown' ? null : ip,
      userAgent: req.headers.get('user-agent'),
    });

    return NextResponse.json({ success: true, signature_id: result.signatureId });
  } catch (err: unknown) {
    return handleRouteError(err, {
      fallbackMessage: 'Sign waiver error',
      logMessage: 'Kiosk waiver sign failed',
    });
  }
}
