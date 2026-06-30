import { describe, expect, it } from 'vitest';
import { filterMembersByName, filterMembersByQuery } from '@/lib/filter-members';

describe('filter-members', () => {
  const members = [
    { first_name: 'Jane', last_name: 'Doe', email: 'jane@example.com' },
    { first_name: 'John', last_name: 'Smith', email: 'john@example.com' },
  ];

  it('returns all members when query is empty', () => {
    expect(filterMembersByQuery(members, '  ')).toHaveLength(2);
  });

  it('filters by email', () => {
    expect(filterMembersByQuery(members, 'jane@')).toHaveLength(1);
  });

  it('filters by full name', () => {
    expect(filterMembersByName(members, 'john sm')).toHaveLength(1);
  });
});
