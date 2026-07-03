import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export type FamilyWaiverFixture = {
  gymId: string;
  familyId: string;
  primaryMemberId: string;
  dependentMemberId: string;
  waiverId: string;
  signatureId: string;
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

export async function seedFamilyWaiverFixture(): Promise<FamilyWaiverFixture> {
  const admin = serviceClient();
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const primaryEmail = `rls-primary+${suffix}@gmail.com`;
  const primaryPassword = 'Test-Password-123!';

  const { data: authUser, error: authError } = await admin.auth.admin.createUser({
    email: primaryEmail,
    password: primaryPassword,
    email_confirm: true,
  });
  if (authError || !authUser.user) {
    throw new Error(`Failed to create portal auth user: ${authError?.message}`);
  }

  const ownerEmail = `rls-owner+${suffix}@gmail.com`;
  const { data: ownerUser, error: ownerError } = await admin.auth.admin.createUser({
    email: ownerEmail,
    password: primaryPassword,
    email_confirm: true,
  });
  if (ownerError || !ownerUser.user) {
    await admin.auth.admin.deleteUser(authUser.user.id);
    throw new Error(`Failed to create gym owner: ${ownerError?.message}`);
  }

  const { data: gym, error: gymError } = await admin
    .from('gyms')
    .insert({
      name: `RLS Test Gym ${suffix}`,
      slug: `rls-test-${suffix}`,
      owner_id: ownerUser.user.id,
      require_waiver_for_checkin: true,
    })
    .select('id')
    .single();
  if (gymError || !gym) {
    throw new Error(`Failed to create gym: ${gymError?.message}`);
  }

  const { data: family, error: familyError } = await admin
    .from('families')
    .insert({ gym_id: gym.id, family_name: `RLS Family ${suffix}` })
    .select('id')
    .single();
  if (familyError || !family) {
    throw new Error(`Failed to create family: ${familyError?.message}`);
  }

  const { data: primaryMember, error: primaryError } = await admin
    .from('members')
    .insert({
      gym_id: gym.id,
      family_id: family.id,
      portal_role: 'primary',
      auth_user_id: authUser.user.id,
      first_name: 'Primary',
      last_name: 'Parent',
      email: primaryEmail,
      status: 'active',
    })
    .select('id')
    .single();
  if (primaryError || !primaryMember) {
    throw new Error(`Failed to create primary member: ${primaryError?.message}`);
  }

  const { data: dependentMember, error: dependentError } = await admin
    .from('members')
    .insert({
      gym_id: gym.id,
      family_id: family.id,
      portal_role: 'dependent',
      first_name: 'Dependent',
      last_name: 'Child',
      email: `rls-child+${suffix}@gmail.com`,
      status: 'active',
    })
    .select('id')
    .single();
  if (dependentError || !dependentMember) {
    throw new Error(`Failed to create dependent member: ${dependentError?.message}`);
  }

  const { data: waiver, error: waiverError } = await admin
    .from('waivers')
    .insert({
      gym_id: gym.id,
      title: 'Family RLS Waiver',
      body: 'Test waiver body',
      is_active: true,
    })
    .select('id')
    .single();
  if (waiverError || !waiver) {
    throw new Error(`Failed to create waiver: ${waiverError?.message}`);
  }

  const { data: signature, error: sigError } = await admin
    .from('waiver_signatures')
    .insert({
      gym_id: gym.id,
      waiver_id: waiver.id,
      member_id: dependentMember.id,
      signed_name: 'Dependent Child',
    })
    .select('id')
    .single();
  if (sigError || !signature) {
    throw new Error(`Failed to create waiver signature: ${sigError?.message}`);
  }

  const cleanup = async () => {
    await admin.from('waiver_signatures').delete().eq('id', signature.id);
    await admin.from('waivers').delete().eq('id', waiver.id);
    await admin.from('members').delete().eq('family_id', family.id);
    await admin.from('families').delete().eq('id', family.id);
    await admin.from('gyms').delete().eq('id', gym.id);
    await admin.auth.admin.deleteUser(authUser.user!.id);
    await admin.auth.admin.deleteUser(ownerUser.user!.id);
  };

  return {
    gymId: gym.id,
    familyId: family.id,
    primaryMemberId: primaryMember.id,
    dependentMemberId: dependentMember.id,
    waiverId: waiver.id,
    signatureId: signature.id,
    primaryEmail,
    primaryPassword,
    cleanup,
  };
}

export async function signInPortalMember(
  email: string,
  password: string
): Promise<SupabaseClient> {
  const client = createClient(
    requireEnv('SUPABASE_TEST_URL'),
    requireEnv('SUPABASE_TEST_ANON_KEY')
  );
  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw new Error(`Portal sign-in failed: ${error.message}`);
  return client;
}
