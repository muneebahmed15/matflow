import { describe, expect, it } from 'vitest';
import {
  canAccessRoute,
  hasCapability,
  staffRoleLabel,
} from '@/lib/permissions/capabilities';
import { canManageBilling, canEditProfile } from '@/lib/portal/billing-access';

describe('RBAC capabilities', () => {
  it('grants admins every capability', () => {
    expect(hasCapability('admin', 'settings.write')).toBe(true);
    expect(hasCapability('admin', 'staff.manage')).toBe(true);
  });

  it('allows supervisors to read leads but not manage staff', () => {
    expect(hasCapability('supervisor', 'leads.read')).toBe(true);
    expect(hasCapability('supervisor', 'staff.manage')).toBe(false);
  });

  it('allows instructors to check in members but not edit billing', () => {
    expect(hasCapability('coach', 'checkin.write')).toBe(true);
    expect(hasCapability('coach', 'billing.write')).toBe(false);
  });

  it('routes supervisors to leads and blocks staff settings', () => {
    expect(canAccessRoute('supervisor', '/leads')).toBe(true);
    expect(canAccessRoute('supervisor', '/staff')).toBe(false);
  });

  it('labels coach as Instructor', () => {
    expect(staffRoleLabel('coach')).toBe('Instructor');
    expect(staffRoleLabel('supervisor')).toBe('Supervisor');
  });
});

describe('portal billing access', () => {
  it('restricts dependents from billing and profile edits', () => {
    expect(canManageBilling('primary')).toBe(true);
    expect(canManageBilling('dependent')).toBe(false);
    expect(canEditProfile('dependent')).toBe(false);
  });
});
