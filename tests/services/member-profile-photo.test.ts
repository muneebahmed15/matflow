import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('sharp', () => ({
  default: () => ({
    rotate: () => ({
      resize: () => ({
        jpeg: () => ({
          toBuffer: async () => Buffer.from('jpeg-bytes'),
        }),
      }),
    }),
  }),
}));

const upload = vi.fn();
const getPublicUrl = vi.fn();
const update = vi.fn();
const eq = vi.fn();
const from = vi.fn();

vi.mock('@/lib/supabase/admin', () => ({
  getAdminClient: () => ({
    storage: {
      from: (bucket: string) => {
        from(bucket);
        return { upload, getPublicUrl };
      },
    },
    from: (table: string) => {
      if (table === 'members') {
        return {
          update: (data: unknown) => {
            update(data);
            return { eq: () => ({ eq: () => Promise.resolve({ error: null }) }) };
          },
        };
      }
      return {};
    },
  }),
}));

import { uploadMemberProfilePhoto } from '@/services/member-profile-photo';

describe('uploadMemberProfilePhoto', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    upload.mockResolvedValue({ error: null });
    getPublicUrl.mockReturnValue({ data: { publicUrl: 'https://cdn.example/photo.jpg' } });
  });

  it('rejects unsupported file types', async () => {
    await expect(
      uploadMemberProfilePhoto({
        gymId: 'gym-1',
        memberId: 'm-1',
        bytes: new Uint8Array([1, 2, 3]),
        contentType: 'application/pdf',
      })
    ).rejects.toThrow('JPEG, PNG, or WebP');
  });

  it('uploads and returns public URL', async () => {
    const url = await uploadMemberProfilePhoto({
      gymId: 'gym-1',
      memberId: 'm-1',
      bytes: new Uint8Array([1, 2, 3]),
      contentType: 'image/jpeg',
    });
    expect(from).toHaveBeenCalledWith('member-avatars');
    expect(upload).toHaveBeenCalled();
    expect(url).toBe('https://cdn.example/photo.jpg');
  });
});
