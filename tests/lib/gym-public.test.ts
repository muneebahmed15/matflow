import { describe, expect, it } from 'vitest';
import { formatGymAddress, gymPrimaryColor } from '@/lib/gym-public';

describe('gym-public helpers', () => {
  it('formatGymAddress joins parts', () => {
    const addr = formatGymAddress({
      address_line1: '123 Main St',
      address_city: 'Wilmington',
      address_state: 'NC',
      address_zip: '28401',
    });
    expect(addr).toContain('123 Main St');
    expect(addr).toContain('28401');
  });

  it('formatGymAddress returns null when empty', () => {
    expect(
      formatGymAddress({
        address_line1: null,
        address_city: null,
        address_state: null,
        address_zip: null,
      })
    ).toBeNull();
  });

  it('gymPrimaryColor validates hex', () => {
    expect(gymPrimaryColor('#ff0000')).toBe('#ff0000');
    expect(gymPrimaryColor('invalid')).toBe('#2563eb');
    expect(gymPrimaryColor(null)).toBe('#2563eb');
  });
});
