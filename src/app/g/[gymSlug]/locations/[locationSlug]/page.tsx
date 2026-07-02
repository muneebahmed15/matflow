import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getPublicGymBySlug } from '@/lib/gym-public';
import { listLocationPages } from '@/services/gbp';
import { buildGymPageMetadata } from '@/lib/seo/gym-seo';

type Props = { params: Promise<{ gymSlug: string; locationSlug: string }> };

export default async function GymLocationPage({ params }: Props) {
  const { gymSlug, locationSlug } = await params;
  const gym = await getPublicGymBySlug(gymSlug);
  if (!gym) notFound();

  const pages = await listLocationPages(gym.id);
  const page = pages.find((p) => p.slug === locationSlug);
  if (!page) notFound();

  const base = `/g/${gym.slug}`;

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-extrabold mb-2">{page.title}</h1>
      <p className="text-white/60 text-lg mb-8">{page.description}</p>

      <div className="bg-[#111] border border-white/10 rounded-2xl p-8 space-y-4">
        <p className="text-white/70">
          {gym.name} offers martial arts training
          {page.city ? ` in ${page.city}${page.state ? `, ${page.state}` : ''}` : ''}.
          Book your free trial and experience world-class coaching.
        </p>
        <Link
          href={`${base}/trial`}
          className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-3 rounded-xl text-sm"
        >
          Book Free Trial
        </Link>
      </div>
    </div>
  );
}

export async function generateMetadata({ params }: Props) {
  const { gymSlug, locationSlug } = await params;
  const gym = await getPublicGymBySlug(gymSlug);
  if (!gym) return { title: 'Not found' };
  const pages = await listLocationPages(gym.id);
  const page = pages.find((p) => p.slug === locationSlug);
  if (!page) return { title: 'Not found' };
  return buildGymPageMetadata(gym, {
    title: page.title,
    description: page.description,
    path: `/locations/${locationSlug}`,
  });
}

export async function generateStaticParams() {
  return [];
}
