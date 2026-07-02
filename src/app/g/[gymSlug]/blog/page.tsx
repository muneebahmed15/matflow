import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getPublicGymBySlug } from '@/lib/gym-public';
import { listBlogPosts } from '@/services/blog';
import { buildGymPageMetadata } from '@/lib/seo/gym-seo';

type Props = { params: Promise<{ gymSlug: string }> };

export default async function GymBlogIndexPage({ params }: Props) {
  const { gymSlug } = await params;
  const gym = await getPublicGymBySlug(gymSlug);
  if (!gym) notFound();

  const posts = await listBlogPosts(gym.id, true);
  const base = `/g/${gym.slug}`;

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-extrabold mb-2">Blog</h1>
      <p className="text-white/40 text-sm mb-8">Tips, news, and updates from {gym.name}.</p>

      {posts.length === 0 ? (
        <p className="text-white/30">No posts yet. Check back soon!</p>
      ) : (
        <div className="space-y-4">
          {posts.map((post) => (
            <Link
              key={post.id}
              href={`${base}/blog/${post.slug}`}
              className="block bg-[#111] border border-white/10 rounded-2xl p-6 hover:border-white/20 transition"
            >
              <h2 className="font-semibold text-white text-lg">{post.title}</h2>
              {post.excerpt && <p className="text-white/50 text-sm mt-2">{post.excerpt}</p>}
              {post.published_at && (
                <p className="text-white/30 text-xs mt-3">
                  {new Date(post.published_at).toLocaleDateString()}
                </p>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export async function generateMetadata({ params }: Props) {
  const { gymSlug } = await params;
  const gym = await getPublicGymBySlug(gymSlug);
  if (!gym) return { title: 'Not found' };
  return buildGymPageMetadata(gym, {
    title: `Blog | ${gym.name}`,
    description: `Training tips and news from ${gym.name}.`,
    path: '/blog',
  });
}
