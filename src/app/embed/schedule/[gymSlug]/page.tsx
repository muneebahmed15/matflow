import { notFound } from 'next/navigation';
import { getAdminClient } from '@/lib/supabase/admin';
import { getPublicGymBySlug } from '@/lib/gym-public';
import PublicScheduleGrid from '@/components/public/PublicScheduleGrid';
import type { PublicScheduleClass } from '@/lib/public-schedule';

type Props = { params: Promise<{ gymSlug: string }> };

export default async function EmbedSchedulePage({ params }: Props) {
  const { gymSlug } = await params;
  const gym = await getPublicGymBySlug(gymSlug);
  if (!gym || !gym.website_enabled) notFound();

  const admin = getAdminClient();
  const { data: gymRow } = await admin
    .from('gyms')
    .select('timezone')
    .eq('id', gym.id)
    .maybeSingle();
  const timezone = gymRow?.timezone ?? 'America/New_York';

  const { data: classes } = await admin
    .from('classes')
    .select('name, instructor, day_of_week, start_time, end_time, capacity, category_tag, color')
    .eq('gym_id', gym.id)
    .eq('is_active', true)
    .order('day_of_week')
    .order('start_time');

  return (
    <div className="px-3 py-4 sm:px-4">
      <div className="mb-4">
        <p className="font-semibold text-white">{gym.name}</p>
        <p className="text-white/40 text-xs">Weekly class schedule</p>
      </div>
      <PublicScheduleGrid
        classes={(classes ?? []) as PublicScheduleClass[]}
        timezone={timezone}
        gymSlug={gym.slug}
        gymName={gym.name}
        compact
        showTrialLinks={false}
      />
      <p className="text-center text-[10px] text-white/25 mt-4">
        Powered by{' '}
        <a href={`/g/${gym.slug}/schedule`} target="_blank" rel="noopener noreferrer" className="underline">
          {gym.name}
        </a>
      </p>
    </div>
  );
}
