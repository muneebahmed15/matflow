import { Redis } from '@upstash/redis';
import { logger } from '@/lib/logger';

type Bucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, Bucket>();

export type RateLimitResult =
  | { allowed: true; remaining: number; resetAt: number }
  | { allowed: false; remaining: 0; resetAt: number };

let redisClient: Redis | null | undefined;

/** Lazily resolves an Upstash Redis client from env vars, or null if unconfigured. */
function getRedisClient(): Redis | null {
  if (redisClient !== undefined) return redisClient;

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  redisClient = url && token ? new Redis({ url, token }) : null;
  return redisClient;
}

/** In-memory fixed-window limiter. Only correct on a single instance; used as the
 * dev/staging default and as a fallback if Redis is unreachable. */
function checkRateLimitInMemory(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || now >= bucket.resetAt) {
    const resetAt = now + windowMs;
    buckets.set(key, { count: 1, resetAt });
    return { allowed: true, remaining: limit - 1, resetAt };
  }

  if (bucket.count >= limit) {
    return { allowed: false, remaining: 0, resetAt: bucket.resetAt };
  }

  bucket.count += 1;
  buckets.set(key, bucket);
  return { allowed: true, remaining: limit - bucket.count, resetAt: bucket.resetAt };
}

/** Redis-backed fixed-window limiter via INCR + EXPIRE, correct across instances. */
async function checkRateLimitRedis(
  redis: Redis,
  key: string,
  limit: number,
  windowMs: number
): Promise<RateLimitResult> {
  const windowSeconds = Math.max(1, Math.ceil(windowMs / 1000));
  const count = await redis.incr(key);
  if (count === 1) {
    await redis.expire(key, windowSeconds);
  }
  const ttl = await redis.ttl(key);
  const resetAt = Date.now() + Math.max(ttl, 0) * 1000;

  if (count > limit) {
    return { allowed: false, remaining: 0, resetAt };
  }
  return { allowed: true, remaining: limit - count, resetAt };
}

/**
 * Rate limiter with an Upstash Redis backing store when UPSTASH_REDIS_REST_URL
 * and UPSTASH_REDIS_REST_TOKEN are configured (correct across multiple serverless
 * instances), automatically falling back to a single-instance in-memory store
 * otherwise (dev/staging default), or if Redis is temporarily unreachable.
 */
export async function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number
): Promise<RateLimitResult> {
  const redis = getRedisClient();
  if (redis) {
    try {
      return await checkRateLimitRedis(redis, key, limit, windowMs);
    } catch (err) {
      logger.error({ err }, 'Redis rate limit check failed; falling back to in-memory');
    }
  }
  return checkRateLimitInMemory(key, limit, windowMs);
}

/** @internal Test helper */
export function resetRateLimitsForTests(): void {
  buckets.clear();
  redisClient = undefined;
}

/** Returns the client IP from proxy headers, or null when none are present. */
export function getClientIp(request: Request): string | null {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0]?.trim() || null;
  return request.headers.get('x-real-ip') || null;
}

export type RateLimitRule = {
  id: string;
  limit: number;
  windowMs: number;
  match: (pathname: string, method: string) => boolean;
};

export const RATE_LIMIT_RULES: RateLimitRule[] = [
  {
    id: 'auth-pages',
    limit: 20,
    windowMs: 15 * 60 * 1000,
    match: (pathname) =>
      ['/login', '/signup', '/portal/login', '/portal/signup'].includes(pathname),
  },
  {
    id: 'gym-onboard',
    limit: 10,
    windowMs: 60 * 60 * 1000,
    match: (pathname, method) => pathname === '/api/gym/onboard' && method === 'POST',
  },
  {
    id: 'attendance-post',
    limit: 120,
    windowMs: 60 * 1000,
    match: (pathname, method) => pathname === '/api/attendance' && method === 'POST',
  },
];

export async function applyRateLimit(request: Request): Promise<RateLimitResult | null> {
  const url = new URL(request.url);
  const method = request.method.toUpperCase();
  const ip = getClientIp(request);

  // Fail open rather than collapse every client with no forwarded-IP headers
  // (e.g. local dev, or a proxy that doesn't set them) into one shared bucket
  // that unrelated visitors could exhaust for each other.
  if (!ip) return null;

  for (const rule of RATE_LIMIT_RULES) {
    if (!rule.match(url.pathname, method)) continue;
    const result = await checkRateLimit(`${rule.id}:${ip}`, rule.limit, rule.windowMs);
    if (!result.allowed) return result;
  }

  return null;
}
