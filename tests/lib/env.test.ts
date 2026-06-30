import { describe, expect, it } from 'vitest';
import { validateRuntimeEnv } from '@/lib/env';

describe('validateRuntimeEnv', () => {
  it('returns ok when all required env vars are set', () => {
    const result = validateRuntimeEnv();
    expect(result.ok).toBe(true);
  });

  it('returns error when a required env var is missing', () => {
    const original = process.env.STRIPE_SECRET_KEY;
    delete process.env.STRIPE_SECRET_KEY;
    const result = validateRuntimeEnv();
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toContain('STRIPE_SECRET_KEY');
    }
    process.env.STRIPE_SECRET_KEY = original;
  });
});
