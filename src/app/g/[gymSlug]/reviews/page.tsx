import { notFound } from 'next/navigation';
import { getPublicGymBySlug } from '@/lib/gym-public';
import { listPublishedReviews } from '@/services/gym-content';
import ReviewSubmitForm from '@/components/gym-public/ReviewSubmitForm';

type Props = { params: Promise<{ gymSlug: string }> };

export default async function GymReviewsPage({ params }: Props) {
  const { gymSlug } = await params;
  const gym = await getPublicGymBySlug(gymSlug);
  if (!gym) notFound();

  const reviews = await listPublishedReviews(gym.id);

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-extrabold mb-8">Reviews</h1>
      {reviews.length === 0 ? (
        <p className="text-white/30 mb-8">Be the first to leave a review.</p>
      ) : (
        <div className="space-y-4 mb-10">
          {reviews.map((r: { id: string; author_name: string; rating: number; body: string | null }) => (
            <div key={r.id} className="bg-white/5 border border-white/10 rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-2">
                <span className="font-medium text-white">{r.author_name}</span>
                <span className="text-yellow-400 text-sm">{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</span>
              </div>
              {r.body && <p className="text-white/60 text-sm leading-relaxed">{r.body}</p>}
            </div>
          ))}
        </div>
      )}
      <ReviewSubmitForm gymId={gym.id} />
    </div>
  );
}
