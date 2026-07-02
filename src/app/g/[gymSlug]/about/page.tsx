import { notFound } from 'next/navigation';
import { getPublicGymBySlug } from '@/lib/gym-public';

type Props = { params: Promise<{ gymSlug: string }> };

export default async function GymAboutPage({ params }: Props) {
  const { gymSlug } = await params;
  const gym = await getPublicGymBySlug(gymSlug);
  if (!gym) notFound();

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-extrabold mb-6">About {gym.name}</h1>
      {gym.about_text ? (
        <p className="text-white/60 leading-relaxed whitespace-pre-wrap">{gym.about_text}</p>
      ) : (
        <p className="text-white/40">
          {gym.name} is dedicated to building champions on and off the mat. Contact us to learn more
          about our programs and community.
        </p>
      )}
    </div>
  );
}
