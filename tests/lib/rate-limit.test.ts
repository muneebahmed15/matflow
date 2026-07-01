import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

const { redisIncr, redisExpire, redisTtl } = vi.hoisted(() => ({
  redisIncr: vi.fn(),
  redisExpire: vi.fn(),
  redisTtl: vi.fn(),
}));

vi.mock('@upstash/redis', () => ({
  Redis: vi.fn().mockImplementation(function RedisMock() {
    return { incr: redisIncr, expire: redisExpire, ttl: redisTtl };
  }),
}));

import {
  applyRateLimit,
  checkRateLimit,
  getClientIp,
  resetRateLimitsForTests,
  RATE_LIMIT_RULES,
} from '@/lib/rate-limit';

describe('checkRateLimit (in-memory)', () => {
  beforeEach(() => {
    resetRateLimitsForTests();
  });

  it('allows requests under the limit', async () => {
    const first = await checkRateLimit('test-key', 3, 60_000);
    expect(first.allowed).toBe(true);
    expect(first.remaining).toBe(2);
  });

  it('blocks requests over the limit', async () => {
    await checkRateLimit('block-key', 2, 60_000);
    await checkRateLimit('block-key', 2, 60_000);
    const third = await checkRateLimit('block-key', 2, 60_000);
    expect(third.allowed).toBe(false);
    expect(third.remaining).toBe(0);
  });
});

describe('checkRateLimit (Upstash Redis)', () => {
  const OLD_ENV = process.env;

  beforeEach(() => {
    resetRateLimitsForTests();
    process.env = {
      ...OLD_ENV,
      UPSTASH_REDIS_REST_URL: 'https://example.upstash.io',
      UPSTASH_REDIS_REST_TOKEN: 'test-token',
    };
    redisIncr.mockReset();
    redisExpire.mockReset();
    redisTtl.mockReset();
  });

  afterEach(() => {
    process.env = OLD_ENV;
  });

  it('allows a request under the limit via Redis INCR', async () => {
    redisIncr.mockResolvedValue(1);
    redisTtl.mockResolvedValue(60);

    const result = await checkRateLimit('redis-key', 5, 60_000);

    expect(result).toMatchObject({ allowed: true, remaining: 4 });
    expect(redisExpire).toHaveBeenCalledWith('redis-key', 60);
  });

  it('blocks once the Redis-backed count exceeds the limit', async () => {
    redisIncr.mockResolvedValue(6);
    redisTtl.mockResolvedValue(30);

    const result = await checkRateLimit('redis-key', 5, 60_000);

    expect(result).toMatchObject({ allowed: false, remaining: 0 });
  });

  it('falls back to in-memory when Redis throws', async () => {
    redisIncr.mockRejectedValue(new Error('network error'));

    const result = await checkRateLimit('redis-fallback-key', 3, 60_000);

    expect(result).toMatchObject({ allowed: true, remaining: 2 });
  });
});

describe('getClientIp', () => {
  it('reads the first entry of x-forwarded-for', () => {
    const req = new Request('http://test/login', {
      headers: { 'x-forwarded-for': '1.2.3.4, 5.6.7.8' },
    });
    expect(getClientIp(req)).toBe('1.2.3.4');
  });

  it('falls back to x-real-ip when x-forwarded-for is absent', () => {
    const req = new Request('http://test/login', { headers: { 'x-real-ip': '9.9.9.9' } });
    expect(getClientIp(req)).toBe('9.9.9.9');
  });

  it('returns null when neither header is present', () => {
    const req = new Request('http://test/login');
    expect(getClientIp(req)).toBeNull();
  });
});

describe('applyRateLimit', () => {
  beforeEach(() => resetRateLimitsForTests());

  it('fails open (does not block) when no client IP can be determined', async () => {
    for (let i = 0; i < 25; i++) {
      const req = new Request('http://test/login', { method: 'GET' });
      const result = await applyRateLimit(req);
      expect(result).toBeNull();
    }
  });

  it('rate-limits repeated requests from the same identified IP without affecting a different IP', async () => {
    const makeReq = (ip: string) =>
      new Request('http://test/login', { method: 'GET', headers: { 'x-forwarded-for': ip } });

    let blocked = false;
    for (let i = 0; i < 25; i++) {
      const result = await applyRateLimit(makeReq('1.1.1.1'));
      if (result) blocked = true;
    }
    expect(blocked).toBe(true);

    // A different, unrelated IP is unaffected by the first IP's bucket being exhausted.
    expect(await applyRateLimit(makeReq('2.2.2.2'))).toBeNull();
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
