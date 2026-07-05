import { NextRequest, NextResponse } from 'next/server';
import { requireCronSecret } from '@/lib/auth/cron';
import { getAdminClient } from '@/lib/supabase/admin';
import { publishDueSocialPosts } from '@/services/social-posts';
import { logger } from '@/lib/logger';

export async function GET(req: NextRequest) {
  const denied = requireCronSecret(req.headers.get('authorization'));
  if (denied) return denied;

  const admin = getAdminClient();
  const { data: gyms } = await admin.from('gyms').select('id').eq('marketing_enabled', true);

  let published = 0;
  for (const gym of gyms ?? []) {
    try {
      published += await publishDueSocialPosts(gym.id);
    } catch (err) {
      logger.warn({ err, gymId: gym.id }, 'Social post publish failed');
    }
  }

  return NextResponse.json({ ok: true, published });
}
