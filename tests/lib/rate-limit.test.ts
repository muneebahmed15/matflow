import { describe, expect, it, beforeEach } from 'vitest';
import {
  checkRateLimit,
  resetRateLimitsForTests,
  RATE_LIMIT_RULES,
} from '@/lib/rate-limit';

describe('checkRateLimit', () => {
  beforeEach(() => {
    resetRateLimitsForTests();
  });

  it('allows requests under the limit', () => {
    const first = checkRateLimit('test-key', 3, 60_000);
    expect(first.allowed).toBe(true);
    expect(first.remaining).toBe(2);
  });

  it('blocks requests over the limit', () => {
    checkRateLimit('block-key', 2, 60_000);
    checkRateLimit('block-key', 2, 60_000);
    const third = checkRateLimit('block-key', 2, 60_000);
    expect(third.allowed).toBe(false);
    expect(third.remaining).toBe(0);
  });
});

describe('RATE_LIMIT_RULES', () => {
  it('matches gym onboard POST', () => {
    const rule = RATE_LIMIT_RULES.find((r) => r.id === 'gym-onboard');
    expect(rule?.match('/api/gym/onboard', 'POST')).toBe(true);
    expect(rule?.match('/api/gym/onboard', 'GET')).toBe(false);
  });

  it('matches auth pages', () => {
    const rule = RATE_LIMIT_RULES.find((r) => r.id === 'auth-pages');
    expect(rule?.match('/login', 'GET')).toBe(true);
    expect(rule?.match('/dashboard', 'GET')).toBe(false);
  });
});
