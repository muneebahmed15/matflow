// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

const { getUser, from } = vi.hoisted(() => ({
  getUser: vi.fn(),
  from: vi.fn(),
}));

vi.mock('@/lib/supabase', () => ({
  supabase: { auth: { getUser }, from },
}));

import PortalPage from '@/app/(portal)/portal/page';

function memberQueryChain(memberData: Record<string, unknown> | null) {
  return {
    select: () => ({
      eq: () => ({
        single: async () => ({ data: memberData }),
      }),
    }),
  };
}

function countQueryChain(count: number) {
  return {
    select: () => ({
      eq: async () => ({ count }),
    }),
  };
}

describe('Portal page status badge', () => {
  beforeEach(() => {
    getUser.mockReset();
    from.mockReset();
  });

  it('shows a distinct "payment due" badge for past_due members, not the plain status text', async () => {
    getUser.mockResolvedValue({ data: { user: { email: 'ada@example.com' } } });
    from.mockImplementation((table: string) => {
      if (table === 'members') {
        return memberQueryChain({
          id: 'member-1',
          first_name: 'Ada',
          last_name: 'Lovelace',
          belt_rank: 'blue',
          status: 'past_due',
          email: 'ada@example.com',
        });
      }
      return countQueryChain(0);
    });

    render(<PortalPage />);

    const badge = await screen.findByText('payment due');
    expect(badge.className).toContain('bg-yellow-500/10');
  });

  it('shows the plain status text for active members with a green badge', async () => {
    getUser.mockResolvedValue({ data: { user: { email: 'ada@example.com' } } });
    from.mockImplementation((table: string) => {
      if (table === 'members') {
        return memberQueryChain({
          id: 'member-1',
          first_name: 'Ada',
          last_name: 'Lovelace',
          belt_rank: 'blue',
          status: 'active',
          email: 'ada@example.com',
        });
      }
      return countQueryChain(0);
    });

    render(<PortalPage />);

    const badge = await screen.findByText('active');
    expect(badge.className).toContain('bg-green-500/10');
  });
});
