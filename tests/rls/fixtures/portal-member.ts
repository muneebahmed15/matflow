import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export type PortalMemberFixture = {
  gymId: string;
  memberId: string;
  otherMemberId: string;
  primaryEmail: string;
  primaryPassword: string;
  cleanup: () => Promise<void>;
};

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing ${name} for RLS fixture seeding`);
  return value;
}

function serviceClient(): SupabaseClient {
  return createClient(requireEnv('SUPABASE_TEST_URL'), requireEnv('SUPABASE_TEST_SERVICE_ROLE_KEY'));
}

export async function seedPortalMemberFixture(): Promise<PortalMemberFixture> {
  const admin = serviceClient();
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const primaryEmail = `rls-portal+${suffix}@gmail.com`;
  const primaryPassword = 'Test-Password-123!';

  const { data: ownerUser } = await admin.auth.admin.createUser({
    email: `rls-portal-owner+${suffix}@gmail.com`,
    password: primaryPassword,
    email_confirm: true,
  });
  const { data: authUser } = await admin.auth.admin.createUser({
    email: primaryEmail,
    password: primaryPassword,
    email_confirm: true,
  });
  if (!ownerUser.user || !authUser.user) {
    throw new Error('Failed to create portal RLS auth users');
  }

  const { data: gym } = await admin
    .from('gyms')
    .insert({
      name: `Portal RLS Gym ${suffix}`,
      slug: `portal-rls-${suffix}`,
      owner_id: ownerUser.user.id,
    })
    .select('id')
    .single();
  if (!gym) throw new Error('Failed to create gym');

  const { data: member } = await admin
    .from('members')
    .insert({
      gym_id: gym.id,
      first_name: 'Portal',
      last_name: 'Member',
      email: primaryEmail,
      auth_user_id: authUser.user.id,
    })
    .select('id')
    .single();

  const { data: otherMember } = await admin
    .from('members')
    .insert({
      gym_id: gym.id,
      first_name: 'Other',
      last_name: 'Member',
      email: `other+${suffix}@gmail.com`,
    })
    .select('id')
    .single();

  if (!member || !otherMember) throw new Error('Failed to create members');

  await admin.from('attendance').insert([
    { gym_id: gym.id, member_id: member.id, checked_in_at: new Date().toISOString() },
    { gym_id: gym.id, member_id: otherMember.id, checked_in_at: new Date().toISOString() },
  ]);

  return {
    gymId: gym.id,
    memberId: member.id,
    otherMemberId: otherMember.id,
    primaryEmail,
    primaryPassword,
    cleanup: async () => {
      await admin.from('attendance').delete().eq('gym_id', gym.id);
      await admin.from('members').delete().eq('gym_id', gym.id);
      await admin.from('gyms').delete().eq('id', gym.id);
      await admin.auth.admin.deleteUser(authUser.user!.id);
      await admin.auth.admin.deleteUser(ownerUser.user!.id);
    },
  };
}

export async function signInPortalMember(email: string, password: string) {
  const client = createClient(requireEnv('SUPABASE_TEST_URL'), requireEnv('SUPABASE_TEST_ANON_KEY'));
  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw new Error(error.message);
  return client;
}
