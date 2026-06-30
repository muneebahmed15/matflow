import { describe, expect, it, vi, beforeEach } from 'vitest';

const mockFrom = vi.fn();
const mockGenerateLink = vi.fn();
const mockListUsers = vi.fn();
const mockSendEmail = vi.fn();

vi.mock('@/lib/supabase/admin', () => ({
  getAdminClient: () => ({
    from: mockFrom,
    auth: {
      admin: {
        generateLink: (...args: unknown[]) => mockGenerateLink(...args),
        listUsers: (...args: unknown[]) => mockListUsers(...args),
      },
    },
  }),
}));

vi.mock('@/lib/env', () => ({
  getPublicEnv: () => ({ NEXT_PUBLIC_APP_URL: 'http://localhost:3000' }),
}));

vi.mock('@/lib/email/resend', () => ({
  sendTransactionalEmail: (...args: unknown[]) => mockSendEmail(...args),
  staffInviteEmail: vi.fn(() => ({
    to: '',
    subject: 'invite',
    html: '<p>invite</p>',
    text: 'invite',
  })),
  staffAddedEmail: vi.fn(() => ({
    to: '',
    subject: 'added',
    html: '<p>added</p>',
    text: 'added',
  })),
}));

import { inviteStaffMember, removeStaffMember } from '@/services/staff';
import { ServiceError } from '@/services/errors';

function chain(result: { data?: unknown; error?: { message: string } | null }) {
  const builder: Record<string, unknown> = {};
  for (const method of ['select', 'eq', 'insert', 'delete', 'update']) {
    builder[method] = vi.fn(() => builder);
  }
  builder.maybeSingle = vi.fn(async () => result);
  builder.single = vi.fn(async () => result);
  return builder;
}

describe('staff service', () => {
  beforeEach(() => {
    mockFrom.mockReset();
    mockGenerateLink.mockReset();
    mockListUsers.mockReset();
    mockSendEmail.mockReset();
    mockSendEmail.mockResolvedValue({ id: 'email-1', channel: 'dev' });
  });

  it('invites a new staff member via admin generateLink', async () => {
    mockFrom
      .mockReturnValueOnce(chain({ data: { name: 'Test Gym' } }))
      .mockReturnValueOnce(chain({ data: null }))
      .mockReturnValueOnce(chain({ data: { id: 'role-1' } }));

    mockGenerateLink.mockResolvedValueOnce({
      data: {
        user: { id: 'user-1' },
        properties: { action_link: 'https://invite.example' },
      },
      error: null,
    });

    const result = await inviteStaffMember({
      gymId: 'gym-1',
      email: 'coach@example.com',
      fullName: 'Coach Josh',
      role: 'coach',
    });

    expect(result).toEqual({ staffRoleId: 'role-1', userId: 'user-1' });
    expect(mockGenerateLink).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'invite',
        email: 'coach@example.com',
      })
    );
    expect(mockSendEmail).toHaveBeenCalled();
  });

  it('prevents removing the gym owner', async () => {
    mockFrom
      .mockReturnValueOnce(chain({ data: { id: 'role-1', user_id: 'owner-1', gym_id: 'gym-1' } }))
      .mockReturnValueOnce(chain({ data: { owner_id: 'owner-1' } }));

    await expect(
      removeStaffMember('gym-1', 'role-1', 'admin-1')
    ).rejects.toBeInstanceOf(ServiceError);
  });
});
