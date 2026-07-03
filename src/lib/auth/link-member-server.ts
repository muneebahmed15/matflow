import { getAdminClient } from '@/lib/supabase/admin';

/** Link a Supabase auth user to their members row (server-side, idempotent). */
export async function linkMemberAuthUserServer(
  email: string,
  userId: string
): Promise<{ linked: boolean; memberId?: string }> {
  const admin = getAdminClient();
  const normalizedEmail = email.trim().toLowerCase();

  const { data: member } = await admin
    .from('members')
    .select('id, auth_user_id')
    .eq('email', normalizedEmail)
    .maybeSingle();

  if (!member) return { linked: false };

  if (member.auth_user_id && member.auth_user_id !== userId) {
    return { linked: false };
  }

  if (!member.auth_user_id) {
    await admin
      .from('members')
      .update({ auth_user_id: userId })
      .eq('id', member.id)
      .is('auth_user_id', null);
  }

  return { linked: true, memberId: member.id };
}
