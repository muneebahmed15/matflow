import { describe, expect, it } from 'vitest';
import {
  signMemberRankToken,
  verifyMemberRankToken,
} from '@/lib/auth/member-rank-token';

describe('member rank token', () => {
  it('signs and verifies member rank tokens', () => {
    const token = signMemberRankToken('member-1', 'gym-1');
    expect(verifyMemberRankToken('member-1', 'gym-1', token)).toBe(true);
    expect(verifyMemberRankToken('member-1', 'gym-2', token)).toBe(false);
  });
});
