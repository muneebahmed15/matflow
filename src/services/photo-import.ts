import JSZip from 'jszip';
import sharp from 'sharp';
import { getAdminClient } from '@/lib/supabase/admin';
import { ServiceError } from '@/services/errors';

const MAX_ZIP_BYTES = 50 * 1024 * 1024;
const AVATAR_SIZE = 400;

export type PhotoImportResult = {
  success: number;
  errors: { file: string; message: string }[];
};

function emailFromFilename(name: string): string | null {
  const base = name.split('/').pop() ?? name;
  const withoutExt = base.replace(/\.(jpe?g|png|webp)$/i, '');
  const email = withoutExt.trim().toLowerCase();
  if (!email.includes('@')) return null;
  return email;
}

async function resizePhoto(bytes: Uint8Array): Promise<Buffer> {
  return sharp(bytes)
    .rotate()
    .resize(AVATAR_SIZE, AVATAR_SIZE, { fit: 'cover', position: 'centre' })
    .jpeg({ quality: 85 })
    .toBuffer();
}

export async function importMemberPhotosFromZip(
  gymId: string,
  zipBytes: Uint8Array
): Promise<PhotoImportResult> {
  if (zipBytes.length > MAX_ZIP_BYTES) {
    throw new ServiceError(400, 'Zip file must be under 50 MB.');
  }

  const zip = await JSZip.loadAsync(zipBytes);
  const admin = getAdminClient();
  const result: PhotoImportResult = { success: 0, errors: [] };

  for (const [path, entry] of Object.entries(zip.files)) {
    if (entry.dir) continue;
    const fileName = path.split('/').pop() ?? path;
    if (fileName.startsWith('.')) continue;

    const email = emailFromFilename(fileName);
    if (!email) {
      result.errors.push({ file: fileName, message: 'Filename must be email.jpg (e.g. john@example.com.jpg).' });
      continue;
    }

    const { data: member } = await admin
      .from('members')
      .select('id')
      .eq('gym_id', gymId)
      .ilike('email', email)
      .maybeSingle();

    if (!member) {
      result.errors.push({ file: fileName, message: `No member found for ${email}.` });
      continue;
    }

    try {
      const raw = await entry.async('uint8array');
      const resized = await resizePhoto(raw);
      const storagePath = `${gymId}/${member.id}.jpg`;

      const { error: uploadErr } = await admin.storage
        .from('member-avatars')
        .upload(storagePath, resized, { contentType: 'image/jpeg', upsert: true });

      if (uploadErr) {
        result.errors.push({ file: fileName, message: uploadErr.message });
        continue;
      }

      const { data: pub } = admin.storage.from('member-avatars').getPublicUrl(storagePath);
      await admin
        .from('members')
        .update({ profile_photo_url: pub.publicUrl })
        .eq('id', member.id)
        .eq('gym_id', gymId);

      result.success += 1;
    } catch (err) {
      result.errors.push({
        file: fileName,
        message: err instanceof Error ? err.message : 'Upload failed.',
      });
    }
  }

  return result;
}
