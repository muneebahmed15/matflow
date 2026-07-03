import { describe, expect, it } from 'vitest';
import { collectExpiringWaiverNotices } from '@/services/waiver-reminders';

describe('collectExpiringWaiverNotices', () => {
  const now = new Date('2026-07-01T12:00:00.000Z');

  const baseRow = {
    id: 'sig-1',
    member_id: 'm-1',
    waiver_id: 'w-1',
    expires_at: '2026-07-05T12:00:00.000Z',
    members: {
      id: 'm-1',
      gym_id: 'g-1',
      first_name: 'Ada',
      last_name: 'Lovelace',
      email: 'ada@example.com',
      status: 'active',
    },
    waivers: { id: 'w-1', title: 'Liability', is_active: true },
  };

  it('includes signatures expiring within the window', () => {
    const notices = collectExpiringWaiverNotices([baseRow], { now, withinDays: 7 });
    expect(notices).toHaveLength(1);
    expect(notices[0].waiverTitle).toBe('Liability');
    expect(notices[0].memberEmail).toBe('ada@example.com');
  });

  it('skips already-expired signatures', () => {
    const notices = collectExpiringWaiverNotices(
      [{ ...baseRow, expires_at: '2026-06-30T12:00:00.000Z' }],
      { now, withinDays: 7 }
    );
    expect(notices).toHaveLength(0);
  });

  it('skips signatures expiring outside the window', () => {
    const notices = collectExpiringWaiverNotices(
      [{ ...baseRow, expires_at: '2026-08-01T12:00:00.000Z' }],
      { now, withinDays: 7 }
    );
    expect(notices).toHaveLength(0);
  });

  it('skips inactive members and inactive waivers', () => {
    expect(
      collectExpiringWaiverNotices(
        [{ ...baseRow, members: { ...baseRow.members!, status: 'inactive' } }],
        { now, withinDays: 7 }
      )
    ).toHaveLength(0);

    expect(
      collectExpiringWaiverNotices(
        [{ ...baseRow, waivers: { ...baseRow.waivers!, is_active: false } }],
        { now, withinDays: 7 }
      )
    ).toHaveLength(0);
  });

  it('skips members without email', () => {
    const notices = collectExpiringWaiverNotices(
      [{ ...baseRow, members: { ...baseRow.members!, email: null } }],
      { now, withinDays: 7 }
    );
    expect(notices).toHaveLength(0);
  });
});
