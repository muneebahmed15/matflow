type NamedMember = {
  first_name: string;
  last_name: string;
  email: string | null;
};

export function filterMembersByQuery<T extends NamedMember>(
  members: T[],
  query: string
): T[] {
  const q = query.trim().toLowerCase();
  if (!q) return members;

  return members.filter(
    (member) =>
      member.first_name.toLowerCase().includes(q) ||
      member.last_name.toLowerCase().includes(q) ||
      (member.email ?? '').toLowerCase().includes(q)
  );
}

export function filterMembersByName<T extends Pick<NamedMember, 'first_name' | 'last_name'>>(
  members: T[],
  query: string
): T[] {
  const q = query.trim().toLowerCase();
  if (!q) return members;

  return members.filter((member) =>
    `${member.first_name} ${member.last_name}`.toLowerCase().includes(q)
  );
}
