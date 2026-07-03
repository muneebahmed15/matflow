import { notFound } from 'next/navigation';
import { getAdminClient } from '@/lib/supabase/admin';
import { getPublicGymBySlug } from '@/lib/gym-public';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

type Props = { params: Promise<{ gymSlug: string }> };

export default async function GymSchedulePage({ params }: Props) {
  const { gymSlug } = await params;
  const gym = await getPublicGymBySlug(gymSlug);
  if (!gym) notFound();

  const admin = getAdminClient();
  const { data: classes } = await admin
    .from('classes')
    .select('name, instructor, day_of_week, start_time, end_time, capacity')
    .eq('gym_id', gym.id)
    .eq('is_active', true)
    .order('day_of_week')
    .order('start_time');

  const grouped = DAYS.reduce(
    (acc, day) => {
      acc[day] = (classes ?? []).filter((c) => c.day_of_week === day);
      return acc;
    },
    {} as Record<string, typeof classes>
  );

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-extrabold mb-2">Class Schedule</h1>
      <p className="text-white/40 text-sm mb-4">Weekly training schedule at {gym.name}.</p>
      <a
        href={`/g/${gym.slug}/schedule.ics`}
        className="inline-block text-sm text-blue-400 hover:underline mb-8"
      >
        Add to calendar (.ics)
      </a>

      {!classes?.length ? (
        <p className="text-white/30 text-center py-12">Schedule coming soon.</p>
      ) : (
        <div className="space-y-6">
          {DAYS.filter((d) => (grouped[d]?.length ?? 0) > 0).map((day) => (
            <div key={day}>
              <h2 className="text-sm font-semibold text-white/40 uppercase tracking-wider mb-2">
                {day}
              </h2>
              <div className="space-y-2">
                {grouped[day]!.map((cls, i) => (
                  <div
                    key={`${day}-${i}`}
                    className="bg-[#111] border border-white/10 rounded-xl px-4 py-3 flex justify-between gap-4"
                  >
                    <div>
                      <p className="font-medium text-white">{cls.name}</p>
                      <p className="text-xs text-white/30">{cls.instructor}</p>
                    </div>
                    <div className="text-right text-sm text-white/50 flex items-center gap-4">
                      <div>
                        <p>
                          {cls.start_time} – {cls.end_time}
                        </p>
                        <p className="text-xs text-white/25">{cls.capacity} spots</p>
                      </div>
                      <a
                        href={`/g/${gym.slug}/trial?class=${encodeURIComponent(cls.name)}`}
                        className="text-xs font-semibold text-blue-400 hover:text-blue-300 border border-blue-400/30 rounded-lg px-3 py-1.5 shrink-0"
                      >
                        Book trial
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
