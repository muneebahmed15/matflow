import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('@/lib/email/resend', () => ({
  sendTransactionalEmail: vi.fn().mockResolvedValue(undefined),
}));

import { sendTransactionalEmail } from '@/lib/email/resend';
import { processPaymentFailedDunning } from '@/services/dunning';

const mockFrom = vi.fn();

vi.mock('@/lib/supabase/admin', () => ({
  getAdminClient: () => ({ from: mockFrom }),
}));

describe('processPaymentFailedDunning', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('sends first reminder and records it', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'dunning_reminders') {
        return {
          select: () => ({
            eq: () => ({
              eq: () => Promise.resolve({ count: 0 }),
            }),
          }),
          insert: () => Promise.resolve({ error: null }),
        };
      }
      if (table === 'members') {
        return {
          select: () => ({
            eq: () => ({
              single: () =>
                Promise.resolve({
                  data: { email: 'jane@example.com', first_name: 'Jane' },
                }),
            }),
          }),
        };
      }
      if (table === 'gyms') {
        return {
          select: () => ({
            eq: () => ({
              single: () => Promise.resolve({ data: { name: 'Test Gym' } }),
            }),
          }),
        };
      }
      return {};
    });

    const result = await processPaymentFailedDunning({
      gymId: 'gym-1',
      memberId: 'member-1',
      subscriptionId: 'sub-1',
    });

    expect(result.reminderNumber).toBe(1);
    expect(result.sent).toBe(true);
    expect(sendTransactionalEmail).toHaveBeenCalled();
  });
});
