import { describe, expect, it } from 'vitest';
import { buildBeltCertificatePdf } from '@/lib/belt-certificate-pdf';

describe('buildBeltCertificatePdf', () => {
  it('returns a non-empty PDF byte array', async () => {
    const bytes = await buildBeltCertificatePdf({
      gymName: 'Test Gym',
      memberName: 'Jane Doe',
      fromBelt: 'white',
      toBelt: 'yellow',
      promotedAt: new Date().toISOString(),
      ceremonyDate: '2026-07-01',
      notes: 'Outstanding dedication in class.',
    });
    expect(bytes.length).toBeGreaterThan(100);
    expect(bytes[0]).toBe(0x25);
    expect(bytes[1]).toBe(0x50);
  });
});
