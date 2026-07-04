import { describe, expect, it, vi, beforeEach } from 'vitest';

const { mockFrom, sendTransactionalEmail } = vi.hoisted(() => ({
  mockFrom: vi.fn(),
  sendTransactionalEmail: vi.fn(),
}));

vi.mock('@/lib/supabase/admin', () => ({ getAdminClient: () => ({ from: mockFrom }) }));
vi.mock('@/lib/email/resend', () => ({ sendTransactionalEmail }));
vi.mock('@/lib/env', () => ({
  getPublicEnv: () => ({ NEXT_PUBLIC_APP_URL: 'http://localhost:3000' }),
}));
vi.mock('@/lib/logger', () => ({ logger: { warn: vi.fn(), error: vi.fn() } }));

import { sendInactiveMemberWinBack } from '@/services/member-automation';

function chain(result: { data?: unknown; error?: unknown } = { data: null }) {
  const builder: Record<string, unknown> = {};
  for (const method of ['select', 'eq', 'not', 'order', 'limit', 'insert', 'gte']) {
    builder[method] = () => builder;
  }
  builder.maybeSingle = async () => result;
  builder.then = (resolve: (v: { data: unknown; error: null }) => void) =>
    Promise.resolve({ data: result.data ?? [], error: null }).then(resolve);
  return builder;
}

describe('sendInactiveMemberWinBack', () => {
  beforeEach(() => {
    mockFrom.mockReset();
    sendTransactionalEmail.mockReset();
    sendTransactionalEmail.mockResolvedValue(undefined);
  });

  it('sends a win-back email to inactive members', async () => {
    const oldDate = new Date();
    oldDate.setDate(oldDate.getDate() - 45);

    mockFrom
      .mockReturnValueOnce(chain({ data: [{ id: 'gym-1', name: 'Test Gym', slug: 'test-gym' }] }))
      .mockReturnValueOnce(
        chain({
          data: [
            {
              id: 'member-1',
              first_name: 'Alex',
              email: 'alex@test.com',
              email_opt_out: false,
              marketing_email_consent: true,
              created_at: oldDate.toISOString(),
            },
          ],
        })
      )
      .mockReturnValueOnce(chain({ data: { checked_in_at: oldDate.toISOString() } }))
      .mockReturnValueOnce(chain({ data: null }))
      .mockReturnValueOnce(chain({ data: null }));

    const result = await sendInactiveMemberWinBack();

    expect(result.processed).toBe(1);
    expect(sendTransactionalEmail).toHaveBeenCalledWith(
      expect.objectContaining({ to: 'alex@test.com', subject: expect.stringContaining('We miss you') })
    );
  });
});
