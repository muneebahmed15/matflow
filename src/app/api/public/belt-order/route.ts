import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getAdminClient } from '@/lib/supabase/admin';
import { resolveBeltSystem } from '@/lib/belt-systems';
import { handleRouteError } from '@/lib/api-error';

const querySchema = z.object({
  gym_id: z.string().uuid(),
});

/** Public belt order for third-party displays (kiosk, TV, partner apps). */
export async function GET(req: NextRequest) {
  const parsed = querySchema.safeParse(Object.fromEntries(req.nextUrl.searchParams));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid gym_id' }, { status: 400 });
  }

  try {
    const admin = getAdminClient();
    const { data: gym } = await admin
      .from('gyms')
      .select('id, name, slug, belt_system, belt_custom_order, website_enabled')
      .eq('id', parsed.data.gym_id)
      .maybeSingle();

    if (!gym?.website_enabled) {
      return NextResponse.json({ error: 'Gym not found' }, { status: 404 });
    }

    const system = resolveBeltSystem(gym.belt_system, gym.belt_custom_order);

    return NextResponse.json({
      gym_id: gym.id,
      gym_name: gym.name,
      gym_slug: gym.slug,
      system_key: system.key,
      system_label: system.label,
      belts: system.belts,
      max_stripes: system.maxStripes,
    });
  } catch (err: unknown) {
    return handleRouteError(err, {
      fallbackMessage: 'Failed to load belt order',
      logMessage: 'Public belt-order failed',
    });
  }
}
