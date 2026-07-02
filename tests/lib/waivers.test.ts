import { describe, expect, it } from 'vitest';
import {
  countUnsignedActiveWaivers,
  isSignatureValid,
  latestSignatureByWaiverId,
  waiverStatusFromSignature,
} from '@/lib/waivers';

describe('waiver status helpers', () => {
  it('treats missing expiry as valid', () => {
    expect(isSignatureValid(null)).toBe(true);
    expect(isSignatureValid(undefined)).toBe(true);
  });

  it('marks expired signatures as expired', () => {
    const past = new Date(Date.now() - 86_400_000).toISOString();
    expect(isSignatureValid(past)).toBe(false);
    expect(waiverStatusFromSignature({ expires_at: past })).toBe('expired');
  });

  it('marks valid signatures as signed', () => {
    const future = new Date(Date.now() + 86_400_000).toISOString();
    expect(waiverStatusFromSignature({ expires_at: future })).toBe('signed');
    expect(waiverStatusFromSignature(null)).toBe('pending');
  });

  it('uses the latest signature per waiver', () => {
    const map = latestSignatureByWaiverId([
      { waiver_id: 'w1', signed_at: '2026-01-01T00:00:00Z', expires_at: null },
      { waiver_id: 'w1', signed_at: '2026-06-01T00:00:00Z', expires_at: null },
    ]);
    expect(map.get('w1')?.signed_at).toBe('2026-06-01T00:00:00Z');
  });

  it('counts unsigned and expired active waivers', () => {
    const future = new Date(Date.now() + 86_400_000).toISOString();
    const past = new Date(Date.now() - 86_400_000).toISOString();
    const count = countUnsignedActiveWaivers(
      [{ id: 'w1' }, { id: 'w2' }, { id: 'w3' }],
      [
        { waiver_id: 'w1', signed_at: '2026-01-01', expires_at: future },
        { waiver_id: 'w2', signed_at: '2026-01-01', expires_at: past },
      ]
    );
    expect(count).toBe(2);
  });
});
