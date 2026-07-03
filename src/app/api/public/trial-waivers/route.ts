import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getPublicGymBySlug } from '@/lib/gym-public';
import { listActiveWaiversForGym } from '@/services/waivers';
import { handleRouteError } from '@/lib/api-error';

export async function GET(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get('gym_slug');
  if (!slug) {
    return NextResponse.json({ error: 'gym_slug required' }, { status: 400 });
  }

  const gym = await getPublicGymBySlug(slug);
  if (!gym) {
    return NextResponse.json({ error: 'Gym not found' }, { status: 404 });
  }

  try {
    const waivers = await listActiveWaiversForGym(gym.id);
    return NextResponse.json({
      waivers: waivers.map((w) => ({
        id: w.id,
        title: w.title,
        body: w.body,
        version: (w as { version?: number }).version ?? 1,
      })),
    });
  } catch (err) {
    return handleRouteError(err, {
      fallbackMessage: 'Failed to load waivers',
      logMessage: 'Public trial waivers list failed',
    });
  }
}
