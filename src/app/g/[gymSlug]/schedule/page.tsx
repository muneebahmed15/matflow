import { notFound } from 'next/navigation';

import { getAdminClient } from '@/lib/supabase/admin';

import { getPublicGymBySlug } from '@/lib/gym-public';
import { resolveGymPageMetadata } from '@/lib/seo/gym-seo';

import PublicScheduleGrid from '@/components/public/PublicScheduleGrid';
import ScheduleEmbedSnippet from '@/components/public/ScheduleEmbedSnippet';
import CalendarSubscribeSnippet from '@/components/public/CalendarSubscribeSnippet';

import { getPublicEnv } from '@/lib/env';

import type { PublicScheduleClass } from '@/lib/public-schedule';



type Props = { params: Promise<{ gymSlug: string }> };

export async function generateMetadata({ params }: Props) {
  const { gymSlug } = await params;
  return resolveGymPageMetadata(gymSlug, { title: 'Class Schedule', path: '/schedule' });
}

export default async function GymSchedulePage({ params }: Props) {

  const { gymSlug } = await params;

  const gym = await getPublicGymBySlug(gymSlug);

  if (!gym) notFound();



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



  const appUrl = getPublicEnv().NEXT_PUBLIC_APP_URL.replace(/\/$/, '');

  const embedUrl = `${appUrl}/embed/schedule/${gym.slug}`;
  const icsFeedUrl = `${appUrl}/g/${gym.slug}/schedule.ics`;



  return (

    <div className="max-w-3xl mx-auto px-4 py-12">

      <h1 className="text-3xl font-extrabold mb-2">Class Schedule</h1>

      <p className="text-white/40 text-sm mb-4">

        Weekly training schedule at {gym.name} ({timezone.replace('_', ' ')}).

      </p>

      <div className="flex flex-wrap gap-4 mb-8 text-sm">
        <CalendarSubscribeSnippet icsFeedUrl={icsFeedUrl} />
      </div>



      <PublicScheduleGrid

        classes={(classes ?? []) as PublicScheduleClass[]}

        timezone={timezone}

        gymSlug={gym.slug}

        gymName={gym.name}

      />



      <div className="mt-12 bg-white/5 border border-white/10 rounded-2xl p-5">

        <h2 className="font-semibold text-white text-sm mb-1">Embed on your website</h2>

        <p className="text-white/40 text-xs mb-3">

          Paste this iframe on any site to show your live class schedule.

        </p>

        <ScheduleEmbedSnippet embedUrl={embedUrl} />

      </div>

    </div>

  );

}

