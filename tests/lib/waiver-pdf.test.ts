import { describe, expect, it } from 'vitest';
import { buildWaiverPdf } from '@/lib/waiver-pdf';

describe('buildWaiverPdf', () => {
  it('returns a non-empty PDF byte array', async () => {
    const bytes = await buildWaiverPdf({
      gymName: 'Test Gym',
      waiverTitle: 'Liability Waiver',
      waiverBody: 'I agree to train safely.',
      signedName: 'Ada Lovelace',
      signedAt: new Date().toISOString(),
      memberEmail: 'ada@example.com',
    });
    expect(bytes.length).toBeGreaterThan(100);
    expect(bytes[0]).toBe(0x25); // %
    expect(bytes[1]).toBe(0x50); // P
  });
});
