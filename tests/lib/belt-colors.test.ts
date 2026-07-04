import { describe, expect, it } from 'vitest';
import { defaultBeltHex, getBeltBadgeStyle } from '@/lib/belt-colors';

describe('belt-colors', () => {
  it('uses default tailwind classes without overrides', () => {
    const style = getBeltBadgeStyle('blue');
    expect(style.className).toContain('bg-blue-500/20');
    expect(style.style).toBeUndefined();
  });

  it('applies gym hex overrides inline', () => {
    const style = getBeltBadgeStyle('blue', { blue: '#112233' });
    expect(style.style).toEqual({ backgroundColor: '#11223333', color: '#112233' });
  });

  it('falls back to a neutral hex for unknown belts', () => {
    expect(defaultBeltHex('camo')).toBe('#6b7280');
  });
});
