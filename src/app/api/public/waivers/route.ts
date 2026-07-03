import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getAdminClient } from '@/lib/supabase/admin';
import { parseSearchParams } from '@/lib/api-validate';
import { handleRouteError } from '@/lib/api-error';

const querySchema = z.object({
  gym_id: z.string().uuid(),
});

/** Active waivers for a kiosk-enabled gym (anon; kiosk waiver flow). */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const parsed = parseSearchParams(searchParams, querySchema);
  if (!parsed.success) return parsed.response;

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

    const { data, error } = await admin
      .from('waivers')
      .select('id, title, body')
      .eq('gym_id', parsed.data.gym_id)
      .eq('is_active', true)
      .order('created_at');

    if (error) throw error;
    return NextResponse.json({ data: data ?? [] });
  } catch (err: unknown) {
    return handleRouteError(err, {
      fallbackMessage: 'Failed to load waivers',
      logMessage: 'Public waiver list failed',
    });
  }
}
