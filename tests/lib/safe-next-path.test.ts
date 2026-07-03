import { describe, expect, it } from 'vitest';
import { safeNextPath } from '@/lib/auth/safe-next-path';

describe('safeNextPath', () => {
  it('returns fallback when next is missing', () => {
    expect(safeNextPath(null, '/dashboard')).toBe('/dashboard');
  });

  it('allows same-origin relative paths', () => {
    expect(safeNextPath('/portal', '/dashboard')).toBe('/portal');
  });

  it('rejects protocol-relative paths', () => {
    expect(safeNextPath('//evil.com', '/dashboard')).toBe('/dashboard');
  });

  it('rejects absolute URLs', () => {
    expect(safeNextPath('https://evil.com', '/dashboard')).toBe('/dashboard');
  });

  it('rejects paths with @', () => {
    expect(safeNextPath('/@evil', '/dashboard')).toBe('/dashboard');
  });
});
