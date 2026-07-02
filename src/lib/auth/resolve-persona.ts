import type { User } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';
import type { StaffRole } from '@/lib/permissions/capabilities';

export const PERSONA_COOKIE = 'matflow_persona';

export type UserPersonas = {
  hasStaff: boolean;
  hasMember: boolean;
  staffRole: StaffRole | null;
  gymId: string | null;
  memberId: string | null;
};

export async function resolveUserPersonasWithClient(
  supabase: SupabaseClient,
  user: User
): Promise<UserPersonas> {
  const { data: staffRole } = await supabase
    .from('staff_roles')
    .select('role, gym_id')
    .eq('user_id', user.id)
    .maybeSingle();

  let hasStaff = Boolean(staffRole);
  let staffRoleValue = (staffRole?.role as StaffRole) ?? null;
  let gymId = staffRole?.gym_id ?? null;

  if (!hasStaff) {
    const { data: gym } = await supabase
      .from('gyms')
      .select('id')
      .eq('owner_id', user.id)
      .maybeSingle();
    if (gym) {
      hasStaff = true;
      staffRoleValue = 'admin';
      gymId = gym.id;
    }
  }

  let memberId: string | null = null;
  if (user.email) {
    const { data: member } = await supabase
      .from('members')
      .select('id, gym_id')
      .eq('email', user.email)
      .maybeSingle();
    if (member) {
      memberId = member.id;
      if (!gymId) gymId = member.gym_id;
    }
  }

  return {
    hasStaff,
    hasMember: Boolean(memberId),
    staffRole: staffRoleValue,
    gymId,
    memberId,
  };
}

export async function resolveUserPersonas(user: User): Promise<UserPersonas> {
  const supabase = await createClient();
  return resolveUserPersonasWithClient(supabase, user);
}

export type PersonaSurface = 'staff' | 'member';

export function parsePersonaCookie(value: string | undefined): PersonaSurface | null {
  if (value === 'staff' || value === 'member') return value;
  return null;
}
