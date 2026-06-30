type Bucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, Bucket>();

export type RateLimitResult =
  | { allowed: true; remaining: number; resetAt: number }
  | { allowed: false; remaining: 0; resetAt: number };

/**
 * Simple in-memory sliding-window rate limiter.
 * Suitable for single-node dev/staging. For multi-instance production,
 * configure Upstash Redis (see .env.example) in a later phase.
 */
export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number
): RateLimitResult {
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

/** @internal Test helper */
export function resetRateLimitsForTests(): void {
  buckets.clear();
}

export function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0]?.trim() || 'unknown';
  return request.headers.get('x-real-ip') || 'unknown';
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

export function applyRateLimit(request: Request): RateLimitResult | null {
  const url = new URL(request.url);
  const method = request.method.toUpperCase();
  const ip = getClientIp(request);

  for (const rule of RATE_LIMIT_RULES) {
    if (!rule.match(url.pathname, method)) continue;
    const result = checkRateLimit(`${rule.id}:${ip}`, rule.limit, rule.windowMs);
    if (!result.allowed) return result;
  }

  return null;
}
