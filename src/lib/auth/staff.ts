import type { User } from '@supabase/supabase-js';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { logger, errorMessage } from '@/lib/logger';

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

/**
 * Server Component auth guard: resolves the staff session or redirects to
 * /dashboard, logging the reason first (Unauthorized vs Forbidden) instead of
 * silently discarding it. Centralizes the pattern so every page under
 * (dashboard) gets it the same way rather than re-implementing try/catch.
 */
export async function requireStaffSessionForPage(options?: {
  adminOnly?: boolean;
}): Promise<StaffAuth> {
  try {
    return await requireStaffSession(options);
  } catch (error) {
    logger.warn({ reason: errorMessage(error) }, 'Redirecting unauthenticated/unauthorized page request');
    redirect('/dashboard');
  }
}
