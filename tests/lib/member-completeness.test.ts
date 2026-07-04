import { describe, expect, it } from 'vitest';
import { computeMemberCompleteness, completenessLabel } from '@/lib/member-completeness';

describe('computeMemberCompleteness', () => {
  it('returns 0 when nothing is filled', () => {
    expect(
      computeMemberCompleteness({
        email: null,
        phone: null,
        date_of_birth: null,
        profile_photo_url: null,
        hasEmergencyContact: false,
        hasSignedWaiver: false,
      })
    ).toBe(0);
  });

  it('returns 100 when all fields are present', () => {
    expect(
      computeMemberCompleteness({
        email: 'a@b.com',
        phone: '555-0100',
        date_of_birth: '2010-01-01',
        profile_photo_url: 'https://example.com/p.jpg',
        hasEmergencyContact: true,
        hasSignedWaiver: true,
      })
    ).toBe(100);
  });

  it('rounds partial scores', () => {
    expect(
      computeMemberCompleteness({
        email: 'a@b.com',
        phone: '555',
        date_of_birth: null,
        profile_photo_url: null,
        hasEmergencyContact: false,
        hasSignedWaiver: false,
      })
    ).toBe(33);
  });
});

describe('completenessLabel', () => {
  it('maps score bands to labels', () => {
    expect(completenessLabel(100)).toBe('Complete');
    expect(completenessLabel(85)).toBe('Almost complete');
    expect(completenessLabel(60)).toBe('Needs attention');
    expect(completenessLabel(20)).toBe('Incomplete');
  });
});
