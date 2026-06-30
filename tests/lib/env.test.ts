import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { validateRuntimeEnv } from '@/lib/env';

const REQUIRED_ENV = {
  NEXT_PUBLIC_SUPABASE_URL: 'https://placeholder.supabase.co',
  NEXT_PUBLIC_SUPABASE_ANON_KEY: 'placeholder-anon-key',
  NEXT_PUBLIC_APP_URL: 'http://localhost:3000',
  SUPABASE_SERVICE_ROLE_KEY: 'placeholder-service-role-key',
  STRIPE_SECRET_KEY: 'sk_test_placeholder',
  STRIPE_WEBHOOK_SECRET: 'whsec_placeholder',
} as const;

describe('validateRuntimeEnv', () => {
  beforeEach(() => {
    Object.assign(process.env, REQUIRED_ENV);
  });

  afterEach(() => {
    for (const key of Object.keys(REQUIRED_ENV)) {
      delete process.env[key];
    }
  });

  it('returns ok when all required env vars are set', () => {
    const result = validateRuntimeEnv();
    expect(result.ok).toBe(true);
  });

  it('returns error when a required env var is missing', () => {
    delete process.env.STRIPE_SECRET_KEY;
    const result = validateRuntimeEnv();
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toContain('STRIPE_SECRET_KEY');
    }
  });
});
