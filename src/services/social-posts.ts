import { getAdminClient } from '@/lib/supabase/admin';
import { scheduleBufferPost } from '@/lib/buffer';
import { ServiceError } from '@/services/errors';

export type SocialPost = {
  id: string;
  gym_id: string;
  caption: string;
  image_url: string | null;
  scheduled_at: string | null;
  status: string;
  buffer_post_id: string | null;
  published_at: string | null;
  created_at: string;
};

export async function scheduleSocialPost(input: {
  gymId: string;
  caption: string;
  imageUrl?: string;
  scheduledAt: Date;
}): Promise<string> {
  const admin = getAdminClient();
  const { data: gym } = await admin
    .from('gyms')
    .select('buffer_access_token, buffer_profile_ids')
    .eq('id', input.gymId)
    .maybeSingle();

  const profileIds = Array.isArray(gym?.buffer_profile_ids)
    ? (gym.buffer_profile_ids as string[]).filter(Boolean)
    : [];

  const { data: post, error } = await admin
    .from('social_posts')
    .insert({
      gym_id: input.gymId,
      caption: input.caption,
      image_url: input.imageUrl ?? null,
      scheduled_at: input.scheduledAt.toISOString(),
      status: 'scheduled',
    })
    .select('id')
    .single();

  if (error || !post) throw new ServiceError(500, error?.message ?? 'Failed to schedule post');

  if (gym?.buffer_access_token && profileIds.length > 0) {
    const { postIds } = await scheduleBufferPost({
      accessToken: gym.buffer_access_token,
      profileIds,
      text: input.caption,
      mediaUrl: input.imageUrl,
      scheduledAt: input.scheduledAt,
    });
    if (postIds[0]) {
      await admin
        .from('social_posts')
        .update({ buffer_post_id: postIds[0] })
        .eq('id', post.id);
    }
  }

  return post.id;
}

export async function publishDueSocialPosts(gymId: string): Promise<number> {
  const admin = getAdminClient();
  const now = new Date().toISOString();

  const { data: posts } = await admin
    .from('social_posts')
    .select('*')
    .eq('gym_id', gymId)
    .eq('status', 'scheduled')
    .lte('scheduled_at', now);

  let count = 0;
  for (const post of posts ?? []) {
    await admin
      .from('social_posts')
      .update({ status: 'published', published_at: new Date().toISOString() })
      .eq('id', post.id);
    count++;
  }

  return count;
}

export async function listSocialPosts(gymId: string): Promise<SocialPost[]> {
  const admin = getAdminClient();
  const { data, error } = await admin
    .from('social_posts')
    .select('*')
    .eq('gym_id', gymId)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) throw new ServiceError(500, error.message);
  return (data ?? []) as SocialPost[];
}
