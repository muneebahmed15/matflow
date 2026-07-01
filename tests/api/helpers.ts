import type { User } from '@supabase/supabase-js';
import type { StaffAuth } from '@/lib/auth/staff';

export function jsonRequest(url: string, body: unknown, method = 'POST'): Request {
  return new Request(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

export function getRequest(url: string): Request {
  return new Request(url, { method: 'GET' });
}

export function makeStaffAuth(overrides: Partial<StaffAuth> = {}): StaffAuth {
  return {
    user: { id: 'user-1' } as User,
    gymId: 'gym-1',
    role: 'admin',
    ...overrides,
  };
}

export async function readJson(response: Response): Promise<Record<string, unknown>> {
  return response.json();
}

/** Chainable Supabase query builder mock, mirroring tests/services/attendance.test.ts's pattern. */
export function chain(result: { data?: unknown; error?: { message: string } | null }) {
  const builder: Record<string, unknown> = {};
  const methods = ['select', 'eq', 'gte', 'lte', 'order', 'limit', 'insert', 'update', 'delete', 'upsert'];
  for (const method of methods) {
    builder[method] = () => builder;
  }
  builder.maybeSingle = async () => result;
  builder.single = async () => result;
  builder.then = (resolve: (value: typeof result) => void) => Promise.resolve(result).then(resolve);
  return builder;
}

export const VALID_GYM_ID = '11111111-1111-4111-8111-111111111111';
export const VALID_MEMBER_ID = '22222222-2222-4222-8222-222222222222';
export const VALID_SUBSCRIPTION_ID = '33333333-3333-4333-8333-333333333333';
