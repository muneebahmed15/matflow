/** Link Supabase auth user to members row via server API (portal login/signup). */
export async function linkMemberAuthUser(email: string): Promise<boolean> {
  const res = await fetch('/api/auth/link-member', { method: 'POST' });
  if (res.ok) return true;
  if (res.status === 403) return false;
  throw new Error('Failed to link member account');
}
