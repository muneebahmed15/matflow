import { getAdminClient } from '@/lib/supabase/admin';
import { ServiceError } from '@/services/errors';
import { requestReview } from '@/services/marketing';

export async function maybeRequestReviewAfterCheckIn(
  gymId: string,
  memberId: string
): Promise<void> {
  const admin = getAdminClient();

  const { data: gym } = await admin
    .from('gyms')
    .select('review_checkin_threshold, google_place_id')
    .eq('id', gymId)
    .maybeSingle();

  const threshold = gym?.review_checkin_threshold ?? 5;
  if (threshold <= 0) return;

  const { count, error: countErr } = await admin
    .from('attendance')
    .select('id', { count: 'exact', head: true })
    .eq('gym_id', gymId)
    .eq('member_id', memberId);

  if (countErr) throw new ServiceError(500, countErr.message);
  if ((count ?? 0) !== threshold) return;

  const { data: existing } = await admin
    .from('review_requests')
    .select('id')
    .eq('gym_id', gymId)
    .eq('member_id', memberId)
    .limit(1);

  if (existing && existing.length > 0) return;

  await requestReview(gymId, memberId, gym?.google_place_id ?? null);
}
