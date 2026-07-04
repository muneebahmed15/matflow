import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getAdminClient } from '@/lib/supabase/admin';
import { filterTodaysCheckInClasses } from '@/lib/todays-classes';
import { handleRouteError } from '@/lib/api-error';

const querySchema = z.object({
  gym_id: z.string().uuid(),
});

export async function GET(req: NextRequest) {
  const parsed = querySchema.safeParse(Object.fromEntries(req.nextUrl.searchParams));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid gym_id' }, { status: 400 });
  }

  try {
    const admin = getAdminClient();
    const gymId = parsed.data.gym_id;
    const today = new Date().toISOString().slice(0, 10);

    const [{ data: classes }, { data: exceptions }] = await Promise.all([
      admin
        .from('classes')
        .select('id, name, day_of_week, start_time, end_time, category_tag, color')
        .eq('gym_id', gymId)
        .eq('is_active', true)
        .order('start_time'),
      admin
        .from('class_schedule_exceptions')
        .select('class_id, exception_date')
        .eq('gym_id', gymId)
        .eq('exception_date', today),
    ]);

    const cancelled = new Set(
      (exceptions ?? []).map((e) => `${e.class_id}:${e.exception_date}`)
    );

    const data = filterTodaysCheckInClasses(classes ?? [], cancelled);
    return NextResponse.json({ data });
  } catch (err: unknown) {
    return handleRouteError(err, {
      fallbackMessage: 'Failed to load classes',
      logMessage: 'Public todays-classes failed',
    });
  }
}
