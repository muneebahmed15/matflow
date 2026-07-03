import { describe, expect, it } from 'vitest';
import { requireCronSecret } from '@/lib/auth/cron';

describe('requireCronSecret', () => {
  it('rejects when CRON_SECRET is not configured', () => {
    const prev = process.env.CRON_SECRET;
    delete process.env.CRON_SECRET;
    const res = requireCronSecret('Bearer test');
    expect(res?.status).toBe(503);
    process.env.CRON_SECRET = prev;
  });

  it('rejects invalid bearer token', () => {
    const prev = process.env.CRON_SECRET;
    process.env.CRON_SECRET = 'secret123';
    const res = requireCronSecret('Bearer wrong');
    expect(res?.status).toBe(401);
    process.env.CRON_SECRET = prev;
  });

  it('allows valid bearer token', () => {
    const prev = process.env.CRON_SECRET;
    process.env.CRON_SECRET = 'secret123';
    expect(requireCronSecret('Bearer secret123')).toBeNull();
    process.env.CRON_SECRET = prev;
  });
});
