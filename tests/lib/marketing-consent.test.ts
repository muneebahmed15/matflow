import { describe, expect, it } from 'vitest';
import { canSendMarketingEmail, canSendMarketingSms } from '@/lib/marketing-consent';

describe('marketing-consent', () => {
  it('blocks marketing when opted out globally', () => {
    expect(
      canSendMarketingEmail({ email_opt_out: true, marketing_email_consent: true })
    ).toBe(false);
  });

  it('requires explicit email marketing consent', () => {
    expect(
      canSendMarketingEmail({ email_opt_out: false, marketing_email_consent: false })
    ).toBe(false);
    expect(
      canSendMarketingEmail({ email_opt_out: false, marketing_email_consent: true })
    ).toBe(true);
  });

  it('requires explicit SMS marketing consent', () => {
    expect(canSendMarketingSms({ sms_marketing_consent: false })).toBe(false);
    expect(canSendMarketingSms({ sms_marketing_consent: true })).toBe(true);
  });
});
