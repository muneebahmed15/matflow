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

const mockActiveMember = {
  id: 'member-1',
  gym_id: 'gym-1',
  first_name: 'Ada',
  last_name: 'Lovelace',
  belt_rank: 'blue',
  stripe_count: 0,
  status: 'active',
  email: 'ada@example.com',
  family_id: null,
  portal_role: 'primary',
};

vi.mock('@/lib/portal-member-context', () => ({
  usePortalMember: () => ({
    activeMember: mockActiveMember,
    loading: false,
    familyMembers: [mockActiveMember],
    setActiveMemberId: vi.fn(),
  }),
}));

import PortalPage from '@/app/(portal)/portal/page';

function chainable(result: unknown = { data: [], count: 0 }) {
  const chain: Record<string, unknown> = {};
  const self = () => chain;
  chain.select = () => chain;
  chain.eq = () => chain;
  chain.order = () => chain;
  chain.single = async () => result;
  chain.maybeSingle = async () => result;
  chain.then = (resolve: (v: unknown) => unknown) => Promise.resolve(result).then(resolve);
  return chain;
}

describe('Portal page status badge', () => {
  beforeEach(() => {
    getUser.mockReset();
    from.mockReset();
  });

  it('shows a distinct "payment due" badge for past_due members, not the plain status text', async () => {
    mockActiveMember.status = 'past_due';
    getUser.mockResolvedValue({ data: { user: { email: 'ada@example.com' } } });
    from.mockImplementation(() => chainable({ data: [], count: 0 }));

    render(<PortalPage />);

    const badge = await screen.findByText('payment due');
    expect(badge.className).toContain('bg-yellow-500/10');
  });

  it('shows the plain status text for active members with a green badge', async () => {
    mockActiveMember.status = 'active';
    getUser.mockResolvedValue({ data: { user: { email: 'ada@example.com' } } });
    from.mockImplementation(() => chainable({ data: [], count: 0 }));

    render(<PortalPage />);

    const badge = await screen.findByText('active');
    expect(badge.className).toContain('bg-green-500/10');
  });
});
