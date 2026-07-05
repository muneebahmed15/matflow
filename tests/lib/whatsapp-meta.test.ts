import { describe, expect, it } from 'vitest';
import { normalizeWhatsAppPhone, parseWhatsAppWebhook } from '@/lib/whatsapp/meta';

describe('normalizeWhatsAppPhone', () => {
  it('strips non-digits and keeps country code', () => {
    expect(normalizeWhatsAppPhone('+1 (555) 123-4567')).toBe('15551234567');
    expect(normalizeWhatsAppPhone('5551234567')).toBe('15551234567');
  });
});

describe('parseWhatsAppWebhook', () => {
  it('extracts inbound text messages', () => {
    const messages = parseWhatsAppWebhook({
      object: 'whatsapp_business_account',
      entry: [
        {
          id: 'waba-123',
          changes: [
            {
              field: 'messages',
              value: {
                metadata: { phone_number_id: 'phone-id-1' },
                messages: [
                  {
                    from: '15551234567',
                    id: 'msg-1',
                    type: 'text',
                    text: { body: 'Hello gym' },
                  },
                ],
              },
            },
          ],
        },
      ],
    });

    expect(messages).toHaveLength(1);
    expect(messages[0]).toMatchObject({
      phoneNumberId: 'phone-id-1',
      businessAccountId: 'waba-123',
      from: '15551234567',
      text: 'Hello gym',
    });
  });

  it('ignores non-whatsapp payloads', () => {
    expect(parseWhatsAppWebhook({ object: 'page' })).toEqual([]);
  });
});
