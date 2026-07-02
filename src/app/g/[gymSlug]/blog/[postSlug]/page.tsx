import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getPublicGymBySlug } from '@/lib/gym-public';
import { getBlogPostBySlug } from '@/services/blog';
import { buildGymPageMetadata } from '@/lib/seo/gym-seo';

type Props = { params: Promise<{ gymSlug: string; postSlug: string }> };

export default async function GymBlogPostPage({ params }: Props) {
  const { gymSlug, postSlug } = await params;
  const gym = await getPublicGymBySlug(gymSlug);
  if (!gym) notFound();

  const post = await getBlogPostBySlug(gym.id, postSlug);
  if (!post) notFound();

  const base = `/g/${gym.slug}`;

  return (
    <article className="max-w-3xl mx-auto px-4 py-12">
      <Link href={`${base}/blog`} className="text-white/40 text-sm hover:text-white mb-6 inline-block">
        ← Back to blog
      </Link>
      <h1 className="text-3xl font-extrabold mb-2">{post.title}</h1>
      {post.published_at && (
        <p className="text-white/40 text-sm mb-8">
          {new Date(post.published_at).toLocaleDateString()}
        </p>
      )}
      <div
        className="prose prose-invert max-w-none text-white/80"
        dangerouslySetInnerHTML={{ __html: post.body_html }}
      />
    </article>
  );
}

export async function generateMetadata({ params }: Props) {
  const { gymSlug, postSlug } = await params;
  const gym = await getPublicGymBySlug(gymSlug);
  if (!gym) return { title: 'Not found' };
  const post = await getBlogPostBySlug(gym.id, postSlug);
  if (!post) return { title: 'Not found' };
  return buildGymPageMetadata(gym, {
    title: `${post.title} | ${gym.name}`,
    description: post.excerpt ?? post.title,
    path: `/blog/${postSlug}`,
  });
}
