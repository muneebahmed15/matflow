// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import MembersTable from '@/components/members/MembersTable';
import type { MemberSummary } from '@/services/members';

function member(overrides: Partial<MemberSummary> = {}): MemberSummary {
  return {
    id: 'member-1',
    first_name: 'Ada',
    last_name: 'Lovelace',
    email: 'ada@example.com',
    phone: null,
    belt_rank: 'blue',
    status: 'active',
    ...overrides,
  } as MemberSummary;
}

describe('MembersTable status badge', () => {
  it('renders active members with a green badge', () => {
    render(<MembersTable members={[member({ status: 'active' })]} />);
    const badge = screen.getByText('active');
    expect(badge.className).toContain('bg-green-500/10');
  });

  it('renders past_due members with a distinct yellow badge, not the inactive grey', () => {
    render(<MembersTable members={[member({ status: 'past_due' })]} />);
    const badge = screen.getByText('past_due');
    expect(badge.className).toContain('bg-yellow-500/10');
    expect(badge.className).not.toContain('bg-green-500/10');
    expect(badge.className).not.toContain('bg-white/5');
  });

  it('renders inactive members with the grey badge', () => {
    render(<MembersTable members={[member({ status: 'inactive' })]} />);
    const badge = screen.getByText('inactive');
    expect(badge.className).toContain('bg-white/5');
  });

  it('falls back to white belt when belt_rank is null', () => {
    render(<MembersTable members={[member({ belt_rank: null })]} />);
    expect(screen.getByText('white')).toBeInTheDocument();
  });
});
