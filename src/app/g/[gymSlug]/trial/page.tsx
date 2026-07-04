import { notFound } from 'next/navigation';
import { getPublicGymBySlug } from '@/lib/gym-public';
import { TrialBookingPageClient } from '@/components/gym-public/TrialBookingForm';
import { resolveGymPageMetadata } from '@/lib/seo/gym-seo';

type Props = { params: Promise<{ gymSlug: string }> };

export async function generateMetadata({ params }: Props) {
  const { gymSlug } = await params;
  return resolveGymPageMetadata(gymSlug, {
    title: 'Book a Free Trial',
    path: '/trial',
    description: 'Schedule your free trial class.',
  });
}

export default async function GymTrialPage({ params }: Props) {
  const { gymSlug } = await params;
  const gym = await getPublicGymBySlug(gymSlug);
  if (!gym) notFound();

  return <TrialBookingPageClient gym={gym} />;
}
