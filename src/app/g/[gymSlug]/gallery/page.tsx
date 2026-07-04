import { notFound } from 'next/navigation';
import { getPublicGymBySlug } from '@/lib/gym-public';
import { listGallery } from '@/services/gym-content';
import { resolveGymPageMetadata } from '@/lib/seo/gym-seo';

type Props = { params: Promise<{ gymSlug: string }> };

export async function generateMetadata({ params }: Props) {
  const { gymSlug } = await params;
  return resolveGymPageMetadata(gymSlug, { title: 'Gallery', path: '/gallery' });
}

export default async function GymGalleryPage({ params }: Props) {
  const { gymSlug } = await params;
  const gym = await getPublicGymBySlug(gymSlug);
  if (!gym) notFound();

  const images = await listGallery(gym.id);

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-extrabold mb-8">Gallery</h1>
      {images.length === 0 ? (
        <p className="text-white/30">Photos coming soon.</p>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {images.map((img: { id: string; image_url: string; caption: string | null }) => (
            <figure key={img.id} className="rounded-xl overflow-hidden border border-white/10 bg-white/5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img.image_url} alt={img.caption ?? ''} className="w-full aspect-square object-cover" />
              {img.caption && (
                <figcaption className="text-white/50 text-xs px-3 py-2">{img.caption}</figcaption>
              )}
            </figure>
          ))}
        </div>
      )}
    </div>
  );
}
