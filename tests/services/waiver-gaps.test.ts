import { describe, expect, it } from 'vitest';
import { computeMemberWaiverGaps } from '@/services/waivers';

describe('computeMemberWaiverGaps', () => {
  const waivers = [
    { id: 'w1', title: 'Liability' },
    { id: 'w2', title: 'Photo Release' },
  ];

  const members = [
    { id: 'm1', first_name: 'Ada', last_name: 'Lovelace', email: 'ada@example.com' },
    { id: 'm2', first_name: 'Grace', last_name: 'Hopper', email: 'grace@example.com' },
  ];

  it('flags members with missing waivers', () => {
    const now = new Date('2026-07-02T12:00:00Z');
    const gaps = computeMemberWaiverGaps(waivers, [], members, now);
    expect(gaps).toHaveLength(2);
    expect(gaps[0].issues.every((i) => i.status === 'missing')).toBe(true);
  });

  it('flags expired signatures but not valid ones', () => {
    const now = new Date('2026-07-02T12:00:00Z');
    const future = new Date('2026-08-02T12:00:00Z').toISOString();
    const past = new Date('2026-06-02T12:00:00Z').toISOString();

    const gaps = computeMemberWaiverGaps(
      waivers,
      [
        { member_id: 'm1', waiver_id: 'w1', signed_at: '2026-01-01', expires_at: future },
        { member_id: 'm1', waiver_id: 'w2', signed_at: '2026-01-01', expires_at: past },
        { member_id: 'm2', waiver_id: 'w1', signed_at: '2026-01-01', expires_at: future },
        { member_id: 'm2', waiver_id: 'w2', signed_at: '2026-01-01', expires_at: future },
      ],
      members,
      now
    );

    expect(gaps).toHaveLength(1);
    expect(gaps[0].memberId).toBe('m1');
    expect(gaps[0].issues).toEqual([
      { waiverId: 'w2', title: 'Photo Release', status: 'expired' },
    ]);
  });

  it('uses the latest signature when multiple exist', () => {
    const now = new Date('2026-07-02T12:00:00Z');
    const future = new Date('2026-08-02T12:00:00Z').toISOString();
    const past = new Date('2026-06-02T12:00:00Z').toISOString();

    const gaps = computeMemberWaiverGaps(
      [waivers[0]],
      [
        { member_id: 'm2', waiver_id: 'w1', signed_at: '2026-01-01', expires_at: past },
        { member_id: 'm2', waiver_id: 'w1', signed_at: '2026-06-15', expires_at: future },
      ],
      [members[1]],
      now
    );

    expect(gaps).toHaveLength(0);
  });
});
