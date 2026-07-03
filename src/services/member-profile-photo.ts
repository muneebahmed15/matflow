import { getAdminClient } from '@/lib/supabase/admin';
import { ServiceError } from '@/services/errors';

const MAX_BYTES = 2 * 1024 * 1024;
const ALLOWED = new Set(['image/jpeg', 'image/png', 'image/webp']);

export async function uploadMemberProfilePhoto(input: {
  gymId: string;
  memberId: string;
  bytes: Uint8Array;
  contentType: string;
}): Promise<string> {
  if (!ALLOWED.has(input.contentType)) {
    throw new ServiceError(400, 'Photo must be JPEG, PNG, or WebP.');
  }
  if (input.bytes.length > MAX_BYTES) {
    throw new ServiceError(400, 'Photo must be under 2 MB.');
  }

  const ext =
    input.contentType === 'image/png'
      ? 'png'
      : input.contentType === 'image/webp'
        ? 'webp'
        : 'jpg';
  const path = `${input.gymId}/${input.memberId}.${ext}`;
  const admin = getAdminClient();

  const { error: uploadErr } = await admin.storage
    .from('member-avatars')
    .upload(path, input.bytes, { contentType: input.contentType, upsert: true });

  if (uploadErr) throw new ServiceError(500, uploadErr.message);

  const { data: pub } = admin.storage.from('member-avatars').getPublicUrl(path);
  const url = pub.publicUrl;

  const { error: updateErr } = await admin
    .from('members')
    .update({ profile_photo_url: url })
    .eq('id', input.memberId)
    .eq('gym_id', input.gymId);

  if (updateErr) throw new ServiceError(500, updateErr.message);

  return url;
}
