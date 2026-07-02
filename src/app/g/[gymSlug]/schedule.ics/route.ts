import { notFound } from 'next/navigation';
import { getPublicGymBySlug } from '@/lib/gym-public';
import { getAdminClient } from '@/lib/supabase/admin';
import { buildWeeklyScheduleIcal } from '@/lib/ical';

type Props = { params: Promise<{ gymSlug: string }> };

export async function GET(_req: Request, { params }: Props) {
  const { gymSlug } = await params;
  const gym = await getPublicGymBySlug(gymSlug);
  if (!gym) notFound();

  const admin = getAdminClient();
  const { data: classes } = await admin
    .from('classes')
    .select('id, name, instructor, day_of_week, start_time, end_time')
    .eq('gym_id', gym.id)
    .eq('is_active', true);

  const ical = buildWeeklyScheduleIcal(
    gym.name,
    (classes ?? []).map((c) => ({
      uid: c.id,
      summary: c.name,
      description: c.instructor ?? undefined,
      dayOfWeek: c.day_of_week ?? 'Monday',
      startTime: c.start_time ?? '09:00',
      endTime: c.end_time ?? '10:00',
    }))
  );

  return new Response(ical, {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': `attachment; filename="${gym.slug}-schedule.ics"`,
    },
  });
}
