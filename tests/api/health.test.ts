import { describe, expect, it, vi, beforeEach } from 'vitest';

const { mockFrom, validateRuntimeEnv } = vi.hoisted(() => ({
  mockFrom: vi.fn(),
  validateRuntimeEnv: vi.fn(),
}));

vi.mock('@/lib/supabase/admin', () => ({ getAdminClient: () => ({ from: mockFrom }) }));
vi.mock('@/lib/env', () => ({ validateRuntimeEnv }));

import { GET } from '@/app/api/health/route';
import { readJson } from './helpers';

function chain(result: { data?: unknown; error?: unknown }) {
  const builder: Record<string, unknown> = {};
  for (const method of ['select', 'limit']) {
    builder[method] = () => builder;
  }
  builder.then = (resolve: (v: typeof result) => void) => Promise.resolve(result).then(resolve);
  return builder;
}

describe('GET /api/health', () => {
  beforeEach(() => {
    mockFrom.mockReset();
    validateRuntimeEnv.mockReset();
  });

  it('returns 200 ok when env and database are both healthy', async () => {
    validateRuntimeEnv.mockReturnValue({ ok: true });
    mockFrom.mockReturnValueOnce(chain({ data: [], error: null }));

    const res = await GET();

    expect(res.status).toBe(200);
    expect(await readJson(res)).toEqual({ status: 'ok', checks: { env: 'ok', database: 'ok' } });
  });

  it('returns 503 when required env vars are missing', async () => {
    validateRuntimeEnv.mockReturnValue({ ok: false, message: 'Missing SUPABASE_SERVICE_ROLE_KEY' });

    const res = await GET();

    expect(res.status).toBe(503);
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it('returns 503 when the database check fails', async () => {
    validateRuntimeEnv.mockReturnValue({ ok: true });
    mockFrom.mockReturnValueOnce(chain({ data: null, error: { message: 'connection refused' } }));

    const res = await GET();

    expect(res.status).toBe(503);
  });
});
