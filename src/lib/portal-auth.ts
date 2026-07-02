import type { SupabaseClient } from '@supabase/supabase-js';

/** Link Supabase auth user to members row on portal login/signup. */
export async function linkMemberAuthUser(
  supabase: SupabaseClient,
  email: string,
  userId: string
): Promise<void> {
  await supabase
    .from('members')
    .update({ auth_user_id: userId })
    .eq('email', email)
    .is('auth_user_id', null);
}
