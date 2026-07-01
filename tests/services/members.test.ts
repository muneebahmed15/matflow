import { describe, expect, it, vi, beforeEach } from 'vitest';

const mockFrom = vi.fn();
const mockSendEmail = vi.fn();

vi.mock('@/lib/supabase/admin', () => ({
  getAdminClient: () => ({ from: mockFrom }),
}));

vi.mock('@/services/notifications', () => ({
  sendMemberNotification: (...args: unknown[]) => mockSendEmail(...args),
}));

import {
  createMember,
  deleteMember,
  getMember,
  listFamilies,
  listMembers,
  updateMember,
} from '@/services/members';

function chain(result: { data?: unknown; error?: { message: string } | null }) {
  const builder: Record<string, unknown> = {};
  for (const method of ['select', 'eq', 'update', 'insert', 'delete', 'order']) {
    builder[method] = vi.fn(() => builder);
  }
  builder.single = vi.fn(async () => result);
  builder.then = (resolve: (value: typeof result) => void) => Promise.resolve(result).then(resolve);
  return builder;
}

describe('members service', () => {
  beforeEach(() => {
    mockFrom.mockReset();
    mockSendEmail.mockReset();
    mockSendEmail.mockResolvedValue({ notificationId: 'n1', emailSent: true });
  });

  it('creates a member and sends welcome notification', async () => {
    mockFrom.mockReturnValueOnce(
      chain({ data: { id: 'm1', first_name: 'Jane', last_name: 'Doe' }, error: null })
    );

    const member = await createMember({
      gymId: 'g1',
      firstName: 'Jane',
      lastName: 'Doe',
      familyOption: 'none',
    });

    expect(member.id).toBe('m1');
    expect(mockSendEmail).toHaveBeenCalledWith({
      gymId: 'g1',
      memberId: 'm1',
      type: 'welcome',
    });
  });

  it('updates a member', async () => {
    mockFrom.mockReturnValueOnce(
      chain({ data: { id: 'm1', first_name: 'Janet' }, error: null })
    );

    const member = await updateMember('g1', 'm1', { first_name: 'Janet' });
    expect(member.first_name).toBe('Janet');
  });

  it('deletes a member', async () => {
    mockFrom.mockReturnValueOnce(chain({ error: null }));
    await expect(deleteMember('g1', 'm1')).resolves.toBeUndefined();
  });

  it('throws when member not found', async () => {
    mockFrom.mockReturnValueOnce(chain({ data: null, error: { message: 'not found' } }));
    await expect(getMember('g1', 'missing')).rejects.toThrow('Member not found');
  });

  it('lists members for a gym', async () => {
    mockFrom.mockReturnValueOnce(chain({ data: [{ id: 'm1' }, { id: 'm2' }], error: null }));
    await expect(listMembers('g1')).resolves.toEqual([{ id: 'm1' }, { id: 'm2' }]);
  });

  it('lists families for a gym', async () => {
    mockFrom.mockReturnValueOnce(chain({ data: [{ id: 'f1', family_name: 'Smith' }], error: null }));
    await expect(listFamilies('g1')).resolves.toEqual([{ id: 'f1', family_name: 'Smith' }]);
  });

  it('rejects creating a member with familyOption "new" but no family name', async () => {
    await expect(
      createMember({ gymId: 'g1', firstName: 'Jane', lastName: 'Doe', familyOption: 'new' })
    ).rejects.toMatchObject({ status: 400 });
  });

  it('rejects creating a member with familyOption "existing" but no family id', async () => {
    await expect(
      createMember({ gymId: 'g1', firstName: 'Jane', lastName: 'Doe', familyOption: 'existing' })
    ).rejects.toMatchObject({ status: 400 });
  });

  it('creates a new family then links the member to it', async () => {
    mockFrom
      .mockReturnValueOnce(chain({ data: { id: 'family-1' }, error: null }))
      .mockReturnValueOnce(chain({ data: { id: 'm1', family_id: 'family-1' }, error: null }));

    const member = await createMember({
      gymId: 'g1',
      firstName: 'Jane',
      lastName: 'Doe',
      familyOption: 'new',
      newFamilyName: 'The Does',
    });

    expect(member.family_id).toBe('family-1');
  });

  it('does not let a best-effort welcome email failure fail member creation', async () => {
    mockFrom.mockReturnValueOnce(
      chain({ data: { id: 'm1', first_name: 'Jane', last_name: 'Doe' }, error: null })
    );
    mockSendEmail.mockRejectedValueOnce(new Error('email provider down'));

    await expect(
      createMember({ gymId: 'g1', firstName: 'Jane', lastName: 'Doe', familyOption: 'none' })
    ).resolves.toMatchObject({ id: 'm1' });
  });
});
