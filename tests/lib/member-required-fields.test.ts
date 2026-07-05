import { describe, expect, it } from 'vitest';
import {
  parseMemberRequiredFields,
  validateMemberRequiredFields,
} from '@/lib/member-required-fields';

describe('member-required-fields', () => {
  it('parses empty or invalid config as empty object', () => {
    expect(parseMemberRequiredFields(null)).toEqual({});
    expect(parseMemberRequiredFields(undefined)).toEqual({});
    expect(parseMemberRequiredFields('bad')).toEqual({});
  });

  it('parses boolean flags from jsonb config', () => {
    expect(
      parseMemberRequiredFields({
        email: true,
        phone: false,
        date_of_birth: 1,
        emergency_contact: 'yes',
      })
    ).toEqual({
      email: true,
      phone: false,
      date_of_birth: true,
      emergency_contact: true,
    });
  });

  it('returns null when all required fields are present', () => {
    const config = parseMemberRequiredFields({
      email: true,
      phone: true,
      date_of_birth: true,
      emergency_contact: true,
    });
    expect(
      validateMemberRequiredFields({
        config,
        email: 'a@b.com',
        phone: '5551234567',
        dateOfBirth: '2000-01-01',
        hasEmergencyContact: true,
      })
    ).toBeNull();
  });

  it('returns error when required email is missing', () => {
    const config = parseMemberRequiredFields({ email: true });
    expect(
      validateMemberRequiredFields({
        config,
        email: null,
        phone: '555',
        dateOfBirth: null,
        hasEmergencyContact: false,
      })
    ).toBe('Email is required for active members at this gym.');
  });

  it('returns error when required emergency contact is missing', () => {
    const config = parseMemberRequiredFields({ emergency_contact: true });
    expect(
      validateMemberRequiredFields({
        config,
        email: 'a@b.com',
        phone: '555',
        dateOfBirth: '2010-01-01',
        hasEmergencyContact: false,
      })
    ).toBe('Emergency contact is required for active members at this gym.');
  });
});
