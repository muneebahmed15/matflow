import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('@/lib/env', () => ({
  getEmailEnv: vi.fn(),
  isProduction: vi.fn(() => false),
}));

import { getEmailEnv } from '@/lib/env';
import { sendTransactionalEmail } from '@/lib/email/resend';

describe('sendTransactionalEmail', () => {
  beforeEach(() => {
    vi.mocked(getEmailEnv).mockReset();
    vi.stubGlobal('fetch', vi.fn());
  });

  it('logs in development when Resend is not configured', async () => {
    vi.mocked(getEmailEnv).mockReturnValue(null);
    const logSpy = vi.spyOn(console, 'info').mockImplementation(() => {});

    const result = await sendTransactionalEmail({
      to: 'coach@example.com',
      subject: 'Test',
      html: '<p>Hello</p>',
      text: 'Hello',
    });

    expect(result.channel).toBe('dev');
    expect(logSpy).toHaveBeenCalled();
    logSpy.mockRestore();
  });

  it('calls Resend API when configured', async () => {
    vi.mocked(getEmailEnv).mockReturnValue({
      RESEND_API_KEY: 're_test',
      RESEND_FROM_EMAIL: 'MatsFlow <test@example.com>',
    });

    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ id: 'email_123' }),
    } as Response);

    const result = await sendTransactionalEmail({
      to: 'coach@example.com',
      subject: 'Test',
      html: '<p>Hello</p>',
    });

    expect(result).toEqual({ id: 'email_123', channel: 'resend' });
    expect(fetch).toHaveBeenCalledWith(
      'https://api.resend.com/emails',
      expect.objectContaining({ method: 'POST' })
    );
  });
});
