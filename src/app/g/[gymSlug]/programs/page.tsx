import { notFound } from 'next/navigation';
import { getPublicGymBySlug } from '@/lib/gym-public';
import { listPrograms } from '@/services/gym-content';
import { resolveGymPageMetadata } from '@/lib/seo/gym-seo';

type Props = { params: Promise<{ gymSlug: string }> };

export async function generateMetadata({ params }: Props) {
  const { gymSlug } = await params;
  return resolveGymPageMetadata(gymSlug, { title: 'Programs', path: '/programs' });
}

export default async function GymProgramsPage({ params }: Props) {
  const { gymSlug } = await params;
  const gym = await getPublicGymBySlug(gymSlug);
  if (!gym) notFound();

  const programs = (await listPrograms(gym.id)).filter((p) => p.is_active);

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-extrabold mb-2">Programs</h1>
      <p className="text-white/40 text-sm mb-8">Training programs at {gym.name}</p>
      {programs.length === 0 ? (
        <p className="text-white/30">Programs coming soon. Contact us to learn more.</p>
      ) : (
        <div className="space-y-4">
          {programs.map((p) => (
            <div key={p.id} className="bg-white/5 border border-white/10 rounded-2xl p-6">
              <h2 className="text-lg font-semibold text-white">{p.name}</h2>
              {p.age_group && <p className="text-white/40 text-xs mt-1">{p.age_group}</p>}
              {p.description && <p className="text-white/60 text-sm mt-3 leading-relaxed">{p.description}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
