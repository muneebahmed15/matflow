import { createClient } from '@supabase/supabase-js';
import { uniqueTestEmail } from './test-user';

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error('Missing Supabase env vars for portal e2e fixtures');
  }
  return createClient(url, serviceKey);
}

export type PortalMemberFixture = {
  email: string;
  password: string;
  memberId: string;
  gymId: string;
  cleanup: () => Promise<void>;
};

export async function createPortalMemberFixture(): Promise<PortalMemberFixture> {
  const admin = adminClient();
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const email = uniqueTestEmail(`e2e-portal-${suffix}`);
  const password = 'Test-Password-123!';

  const { data: ownerUser, error: ownerError } = await admin.auth.admin.createUser({
    email: uniqueTestEmail(`e2e-owner-${suffix}`),
    password,
    email_confirm: true,
  });
  if (ownerError || !ownerUser.user) {
    throw new Error(`Failed to create owner: ${ownerError?.message}`);
  }

  const { data: gym, error: gymError } = await admin
    .from('gyms')
    .insert({
      name: `Portal E2E Gym ${suffix}`,
      slug: `portal-e2e-${suffix}`,
      owner_id: ownerUser.user.id,
      setup_completed_at: new Date().toISOString(),
    })
    .select('id')
    .single();
  if (gymError || !gym) throw new Error(`Failed to create gym: ${gymError?.message}`);

  await admin.from('staff_roles').insert({
    gym_id: gym.id,
    user_id: ownerUser.user.id,
    role: 'admin',
    full_name: 'E2E Owner',
  });

  const { data: authUser, error: authError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (authError || !authUser.user) {
    throw new Error(`Failed to create portal user: ${authError?.message}`);
  }

  const { data: member, error: memberError } = await admin
    .from('members')
    .insert({
      gym_id: gym.id,
      first_name: 'Portal',
      last_name: 'Member',
      email,
      auth_user_id: authUser.user.id,
      status: 'active',
    })
    .select('id')
    .single();
  if (memberError || !member) {
    throw new Error(`Failed to create member: ${memberError?.message}`);
  }

  return {
    email,
    password,
    memberId: member.id,
    gymId: gym.id,
    cleanup: async () => {
      await admin.from('attendance').delete().eq('member_id', member.id);
      await admin.from('members').delete().eq('id', member.id);
      await admin.from('staff_roles').delete().eq('gym_id', gym.id);
      await admin.from('gyms').delete().eq('id', gym.id);
      await admin.auth.admin.deleteUser(authUser.user!.id);
      await admin.auth.admin.deleteUser(ownerUser.user!.id);
    },
  };
}
