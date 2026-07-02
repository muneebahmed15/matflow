import { getAdminClient } from '@/lib/supabase/admin';
import { ServiceError } from '@/services/errors';

export type BlogPost = {
  id: string;
  gym_id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  body_html: string;
  seo_score: number | null;
  status: string;
  published_at: string | null;
  created_at: string;
};

function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80);
}

function computeSeoScore(title: string, excerpt: string | null, bodyHtml: string): number {
  let score = 0;
  if (title.length >= 30 && title.length <= 70) score += 25;
  else if (title.length > 10) score += 10;
  if (excerpt && excerpt.length >= 50) score += 25;
  const wordCount = bodyHtml.replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length;
  if (wordCount >= 300) score += 30;
  else if (wordCount >= 100) score += 15;
  if (bodyHtml.includes('<h2')) score += 10;
  if (bodyHtml.includes('<h3')) score += 10;
  return Math.min(100, score);
}

export async function listBlogPosts(gymId: string, publishedOnly = false): Promise<BlogPost[]> {
  const admin = getAdminClient();
  let query = admin.from('blog_posts').select('*').eq('gym_id', gymId).order('created_at', { ascending: false });

  if (publishedOnly) query = query.eq('status', 'published');

  const { data, error } = await query;
  if (error) throw new ServiceError(500, error.message);
  return (data ?? []) as BlogPost[];
}

export async function getBlogPostBySlug(gymId: string, slug: string): Promise<BlogPost | null> {
  const admin = getAdminClient();
  const { data, error } = await admin
    .from('blog_posts')
    .select('*')
    .eq('gym_id', gymId)
    .eq('slug', slug)
    .eq('status', 'published')
    .maybeSingle();

  if (error) throw new ServiceError(500, error.message);
  return data as BlogPost | null;
}

export async function createBlogPost(input: {
  gymId: string;
  title: string;
  excerpt?: string;
  bodyHtml: string;
}): Promise<BlogPost> {
  const admin = getAdminClient();
  const slug = slugify(input.title);
  const seoScore = computeSeoScore(input.title, input.excerpt ?? null, input.bodyHtml);

  const { data, error } = await admin
    .from('blog_posts')
    .insert({
      gym_id: input.gymId,
      title: input.title.trim(),
      slug,
      excerpt: input.excerpt?.trim() || null,
      body_html: input.bodyHtml.trim(),
      seo_score: seoScore,
      status: 'draft',
    })
    .select('*')
    .single();

  if (error) throw new ServiceError(500, error.message);
  return data as BlogPost;
}

export async function publishBlogPost(gymId: string, postId: string): Promise<void> {
  const admin = getAdminClient();
  const { error } = await admin
    .from('blog_posts')
    .update({
      status: 'published',
      published_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', postId)
    .eq('gym_id', gymId);

  if (error) throw new ServiceError(500, error.message);
}

export async function deleteBlogPost(gymId: string, postId: string): Promise<void> {
  const admin = getAdminClient();
  const { error } = await admin.from('blog_posts').delete().eq('id', postId).eq('gym_id', gymId);
  if (error) throw new ServiceError(500, error.message);
}
