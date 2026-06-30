import type { User } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';

export type StaffRole = 'admin' | 'coach';

export type StaffAuth = {
  user: User;
  gymId: string;
  role: StaffRole;
};

export async function resolveStaffAuth(user: User): Promise<StaffAuth | null> {
  const supabase = await createClient();

  const { data: staffRole } = await supabase
    .from('staff_roles')
    .select('role, gym_id')
    .eq('user_id', user.id)
    .maybeSingle();

  if (staffRole?.gym_id) {
    return {
      user,
      gymId: staffRole.gym_id,
      role: staffRole.role as StaffRole,
    };
  }

  const { data: gym } = await supabase
    .from('gyms')
    .select('id')
    .eq('owner_id', user.id)
    .maybeSingle();

  if (gym) {
    return { user, gymId: gym.id, role: 'admin' };
  }

  return null;
}

/** Resolve staff session for server actions and services. Throws on failure. */
export async function requireStaffSession(options?: {
  adminOnly?: boolean;
}): Promise<StaffAuth> {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new Error('Unauthorized');
  }

  const auth = await resolveStaffAuth(user);
  if (!auth) {
    throw new Error('Forbidden');
  }

  if (options?.adminOnly && auth.role !== 'admin') {
    throw new Error('Forbidden');
  }

  return auth;
}

export function assertGymAccess(auth: StaffAuth, gymId: string): void {
  if (auth.gymId !== gymId) {
    throw new Error('Forbidden');
  }
}
