import { notFound } from 'next/navigation';
import { getPublicGymBySlug } from '@/lib/gym-public';
import { listCoaches } from '@/services/gym-content';

type Props = { params: Promise<{ gymSlug: string }> };

export default async function GymCoachesPage({ params }: Props) {
  const { gymSlug } = await params;
  const gym = await getPublicGymBySlug(gymSlug);
  if (!gym) notFound();

  const coaches = (await listCoaches(gym.id)).filter((c) => c.is_active);

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-extrabold mb-8">Our Coaches</h1>
      {coaches.length === 0 ? (
        <p className="text-white/30">Meet our team soon.</p>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2">
          {coaches.map((c) => (
            <div key={c.id} className="bg-white/5 border border-white/10 rounded-2xl p-6">
              {c.photo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={c.photo_url} alt="" className="w-16 h-16 rounded-full object-cover mb-4" />
              ) : (
                <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center text-xl font-bold mb-4">
                  {c.name[0]}
                </div>
              )}
              <h2 className="font-semibold text-white">{c.name}</h2>
              {c.belt_rank && <p className="text-white/40 text-xs capitalize mt-0.5">{c.belt_rank} belt</p>}
              {c.specialties && <p className="text-white/50 text-xs mt-1">{c.specialties}</p>}
              {c.bio && <p className="text-white/60 text-sm mt-3 leading-relaxed">{c.bio}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
