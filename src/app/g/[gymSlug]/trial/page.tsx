import { notFound } from 'next/navigation';
import { getPublicGymBySlug } from '@/lib/gym-public';
import { TrialBookingPageClient } from '@/components/gym-public/TrialBookingForm';

type Props = { params: Promise<{ gymSlug: string }> };

export default async function GymTrialPage({ params }: Props) {
  const { gymSlug } = await params;
  const gym = await getPublicGymBySlug(gymSlug);
  if (!gym) notFound();

  return <TrialBookingPageClient gym={gym} />;
}
