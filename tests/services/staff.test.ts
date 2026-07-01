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

import {
  inviteStaffMember,
  listStaffMembers,
  removeStaffMember,
  updateStaffRole,
} from '@/services/staff';
import { ServiceError } from '@/services/errors';

function chain(result: { data?: unknown; error?: { message: string } | null }) {
  const builder: Record<string, unknown> = {};
  for (const method of ['select', 'eq', 'insert', 'delete', 'update', 'order']) {
    builder[method] = vi.fn(() => builder);
  }
  builder.maybeSingle = vi.fn(async () => result);
  builder.single = vi.fn(async () => result);
  builder.then = (resolve: (value: typeof result) => void) => Promise.resolve(result).then(resolve);
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

  it('falls back to a magic link when the invited email already has an account', async () => {
    mockFrom
      .mockReturnValueOnce(chain({ data: { name: 'Test Gym' } }))
      .mockReturnValueOnce(chain({ data: null })) // not already staff
      .mockReturnValueOnce(chain({ data: { id: 'role-1' } }));

    mockGenerateLink
      .mockResolvedValueOnce({ data: { user: null }, error: { message: 'User already registered' } })
      .mockResolvedValueOnce({
        data: { properties: { action_link: 'https://login.example' } },
        error: null,
      });
    mockListUsers.mockResolvedValueOnce({
      data: { users: [{ id: 'existing-user-1', email: 'coach@example.com' }] },
      error: null,
    });

    const result = await inviteStaffMember({
      gymId: 'gym-1',
      email: 'coach@example.com',
      fullName: 'Coach Josh',
      role: 'coach',
    });

    expect(result).toEqual({ staffRoleId: 'role-1', userId: 'existing-user-1' });
    expect(mockGenerateLink).toHaveBeenCalledWith(expect.objectContaining({ type: 'magiclink' }));
  });

  it('rejects the invite when the email does not resolve to a user and generateLink failed', async () => {
    mockFrom.mockReturnValueOnce(chain({ data: { name: 'Test Gym' } }));
    mockGenerateLink.mockResolvedValueOnce({ data: { user: null }, error: { message: 'no user' } });
    mockListUsers.mockResolvedValueOnce({ data: { users: [] }, error: null });

    await expect(
      inviteStaffMember({ gymId: 'gym-1', email: 'ghost@example.com', fullName: 'Ghost', role: 'coach' })
    ).rejects.toBeInstanceOf(ServiceError);
  });

  it('prevents removing the gym owner', async () => {
    mockFrom
      .mockReturnValueOnce(chain({ data: { id: 'role-1', user_id: 'owner-1', gym_id: 'gym-1' } }))
      .mockReturnValueOnce(chain({ data: { owner_id: 'owner-1' } }));

    await expect(
      removeStaffMember('gym-1', 'role-1', 'admin-1')
    ).rejects.toBeInstanceOf(ServiceError);
  });

  it('prevents removing your own staff access', async () => {
    mockFrom
      .mockReturnValueOnce(chain({ data: { id: 'role-1', user_id: 'actor-1', gym_id: 'gym-1' } }))
      .mockReturnValueOnce(chain({ data: { owner_id: 'owner-1' } }));

    await expect(
      removeStaffMember('gym-1', 'role-1', 'actor-1')
    ).rejects.toMatchObject({ status: 400 });
  });

  it('removes a non-owner, non-self staff member successfully', async () => {
    mockFrom
      .mockReturnValueOnce(chain({ data: { id: 'role-1', user_id: 'coach-1', gym_id: 'gym-1' } }))
      .mockReturnValueOnce(chain({ data: { owner_id: 'owner-1' } }))
      .mockReturnValueOnce(chain({ error: null }));

    await expect(removeStaffMember('gym-1', 'role-1', 'admin-1')).resolves.toBeUndefined();
  });

  it('throws 404 when the staff role does not exist', async () => {
    mockFrom.mockReturnValueOnce(chain({ data: null, error: null }));

    await expect(removeStaffMember('gym-1', 'missing-role', 'admin-1')).rejects.toMatchObject({
      status: 404,
    });
  });

  it('updates a staff member role', async () => {
    mockFrom.mockReturnValueOnce(chain({ error: null }));
    await expect(updateStaffRole('gym-1', 'role-1', 'admin')).resolves.toBeUndefined();
  });

  it('lists staff members for a gym', async () => {
    mockFrom.mockReturnValueOnce(chain({ data: [{ id: 'role-1' }], error: null }));
    await expect(listStaffMembers('gym-1')).resolves.toEqual([{ id: 'role-1' }]);
  });
});
