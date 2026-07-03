import { describe, expect, it, vi, beforeEach } from 'vitest';

const adminFrom = vi.hoisted(() => vi.fn());

vi.mock('@/lib/supabase/admin', () => ({
  getAdminClient: () => ({ from: adminFrom }),
}));

vi.mock('@/lib/email/resend', () => ({
  sendTransactionalEmail: vi.fn(),
  waitlistPromotedEmail: vi.fn(() => ({ subject: 'x', html: 'x', text: 'x' })),
}));

vi.mock('@/lib/env', () => ({
  getPublicEnv: () => ({ NEXT_PUBLIC_APP_URL: 'http://localhost:3000' }),
}));

import { addMemberToWaitlist } from '@/services/class-waitlist';

function chain(result: { data?: unknown; error?: unknown } = { data: null }) {
  const builder: Record<string, unknown> = {};
  const methods = ['select', 'eq', 'order', 'limit', 'upsert', 'update'];
  for (const method of methods) {
    builder[method] = () => builder;
  }
  builder.maybeSingle = async () => result;
  builder.single = async () => result;
  return builder;
}

describe('addMemberToWaitlist', () => {
  beforeEach(() => {
    adminFrom.mockReset();
  });

  it('assigns the next position after existing waitlist entries', async () => {
    adminFrom
      .mockReturnValueOnce(chain({ data: { id: 'class-1' } }))
      .mockReturnValueOnce(chain({ data: { id: 'member-1' } }))
      .mockReturnValueOnce(chain({ data: null }))
      .mockReturnValueOnce(chain({ data: { position: 2 } }))
      .mockReturnValueOnce(chain({ data: { id: 'wait-1', position: 3, status: 'waiting' }, error: null }));

    const entry = await addMemberToWaitlist({
      gymId: 'gym-1',
      classId: 'class-1',
      memberId: 'member-1',
    });

    expect(entry.position).toBe(3);
  });
});
