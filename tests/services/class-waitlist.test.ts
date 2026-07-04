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

import {
  addMemberToWaitlist,
  listClassWaitlist,
  nextWaitlistPosition,
  promoteNextFromWaitlist,
} from '@/services/class-waitlist';

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

describe('nextWaitlistPosition', () => {
  it('starts at 1 when the waitlist is empty', () => {
    expect(nextWaitlistPosition(null)).toBe(1);
    expect(nextWaitlistPosition(undefined)).toBe(1);
  });

  it('increments from the last waiting position', () => {
    expect(nextWaitlistPosition(2)).toBe(3);
  });
});

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

describe('listClassWaitlist', () => {
  beforeEach(() => {
    adminFrom.mockReset();
  });

  it('requests waitlist rows ordered by position ascending', async () => {
    const order = vi.fn().mockReturnThis();
    const builder: Record<string, unknown> = {};
    for (const method of ['select', 'eq']) {
      builder[method] = vi.fn().mockReturnValue(builder);
    }
    builder.order = order;
    builder.then = (resolve: (v: { data: unknown[]; error: null }) => void) =>
      Promise.resolve({ data: [], error: null }).then(resolve);
    adminFrom.mockReturnValueOnce(builder);

    await listClassWaitlist('gym-1', 'class-1');

    expect(order).toHaveBeenCalledWith('position', { ascending: true });
  });
});

describe('promoteNextFromWaitlist', () => {
  beforeEach(() => {
    adminFrom.mockReset();
  });

  it('promotes the lowest-position waiting member', async () => {
    const order = vi.fn().mockReturnThis();
    const limit = vi.fn().mockReturnThis();
    const updateEq = vi.fn().mockReturnThis();
    const selectBuilder: Record<string, unknown> = {};
    for (const method of ['select', 'eq']) {
      selectBuilder[method] = vi.fn().mockReturnValue(selectBuilder);
    }
    selectBuilder.order = order;
    selectBuilder.limit = limit;
    selectBuilder.maybeSingle = async () => ({
      data: {
        id: 'wait-1',
        position: 1,
        members: { email: 'a@test.com', first_name: 'A', last_name: 'B' },
        classes: { name: 'Fundamentals', day_of_week: 'Monday' },
      },
    });

    const updateBuilder: Record<string, unknown> = {};
    updateBuilder.update = vi.fn().mockReturnValue(updateBuilder);
    updateBuilder.eq = updateEq;

    adminFrom.mockReturnValueOnce(selectBuilder).mockReturnValueOnce(updateBuilder);

    const promoted = await promoteNextFromWaitlist('gym-1', 'class-1');

    expect(order).toHaveBeenCalledWith('position', { ascending: true });
    expect(limit).toHaveBeenCalledWith(1);
    expect(promoted?.id).toBe('wait-1');
  });
});
