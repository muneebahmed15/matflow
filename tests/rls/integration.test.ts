/**
 * RLS integration tests — require a dedicated Supabase test project.
 *
 * Set these env vars to enable:
 *   SUPABASE_TEST_URL
 *   SUPABASE_TEST_ANON_KEY
 *   SUPABASE_TEST_SERVICE_ROLE_KEY
 *
 * Run: npm run test:rls
 */
import { describe, expect, it } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import { seedFamilyWaiverFixture, signInPortalMember } from './fixtures/family-portal';
import { seedPortalMemberFixture, signInPortalMember as signInPortalMemberRls } from './fixtures/portal-member';

const testUrl = process.env.SUPABASE_TEST_URL;
const testAnonKey = process.env.SUPABASE_TEST_ANON_KEY;
const testServiceKey = process.env.SUPABASE_TEST_SERVICE_ROLE_KEY;
const enabled = Boolean(testUrl && testAnonKey && testServiceKey);

describe.skipIf(!enabled)('RLS integration', () => {
  it('anon cannot list all members without kiosk context', async () => {
    const supabase = createClient(testUrl!, testAnonKey!);
    const { data, error } = await supabase.from('members').select('id').limit(5);
    expect(error !== null || (data?.length ?? 0) === 0).toBe(true);
  });

  it('primary portal member can read dependent waiver signatures after rbac migration', async () => {
    const fixture = await seedFamilyWaiverFixture();

    try {
      const portal = await signInPortalMember(fixture.primaryEmail, fixture.primaryPassword);

      const { data, error } = await portal
        .from('waiver_signatures')
        .select('id, member_id, waiver_id')
        .eq('member_id', fixture.dependentMemberId);

      expect(error).toBeNull();
      expect(data?.some((row) => row.id === fixture.signatureId)).toBe(true);
    } finally {
      await fixture.cleanup();
    }
  });

  it('primary portal member cannot read unrelated gym waiver signatures', async () => {
    const fixture = await seedFamilyWaiverFixture();
    const other = await seedFamilyWaiverFixture();

    try {
      const portal = await signInPortalMember(fixture.primaryEmail, fixture.primaryPassword);

      const { data, error } = await portal
        .from('waiver_signatures')
        .select('id')
        .eq('member_id', other.dependentMemberId);

      expect(error).toBeNull();
      expect(data?.length ?? 0).toBe(0);
    } finally {
      await fixture.cleanup();
      await other.cleanup();
    }
  });

  it('portal member can read own attendance but not another member in the same gym', async () => {
    const fixture = await seedPortalMemberFixture();

    try {
      const portal = await signInPortalMemberRls(fixture.primaryEmail, fixture.primaryPassword);

      const { data: own, error: ownError } = await portal
        .from('attendance')
        .select('id, member_id')
        .eq('member_id', fixture.memberId);

      expect(ownError).toBeNull();
      expect((own?.length ?? 0) > 0).toBe(true);

      const { data: other, error: otherError } = await portal
        .from('attendance')
        .select('id')
        .eq('member_id', fixture.otherMemberId);

      expect(otherError).toBeNull();
      expect(other?.length ?? 0).toBe(0);
    } finally {
      await fixture.cleanup();
    }
  });
});

describe('RLS test harness', () => {
  it('documents skip when test project is not configured', () => {
    if (!enabled) {
      expect(enabled).toBe(false);
      return;
    }
    expect(enabled).toBe(true);
  });
});
