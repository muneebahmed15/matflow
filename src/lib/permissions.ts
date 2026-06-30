import { supabase } from './supabase'

export type StaffRole = 'admin' | 'coach' | null

export interface StaffInfo {
  role: StaffRole
  gymId: string | null
  fullName: string | null
}

/**
 * Gets the current logged-in staff member's role and gym.
 * Falls back to 'admin' if they're the gym owner (legacy accounts
 * created before staff_roles existed).
 */
export async function getCurrentStaffInfo(): Promise<StaffInfo> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { role: null, gymId: null, fullName: null }

  // Check staff_roles table first
  const { data: staffRole } = await supabase
    .from('staff_roles')
    .select('role, gym_id, full_name')
    .eq('user_id', user.id)
    .maybeSingle()

  if (staffRole) {
    return { role: staffRole.role as StaffRole, gymId: staffRole.gym_id, fullName: staffRole.full_name }
  }

  // Fallback: check if they own a gym directly (legacy / original admin)
  const { data: gym } = await supabase
    .from('gyms')
    .select('id, name')
    .eq('owner_id', user.id)
    .maybeSingle()

  if (gym) {
    return { role: 'admin', gymId: gym.id, fullName: user.email || null }
  }

  return { role: null, gymId: null, fullName: null }
}

// Pages/sections that coaches CANNOT see
export const ADMIN_ONLY_ROUTES = ['/plans', '/subscriptions', '/settings', '/staff', '/leads']

export function canAccessRoute(role: StaffRole, path: string): boolean {
  if (role === 'admin') return true
  if (role === 'coach') {
    return !ADMIN_ONLY_ROUTES.some(route => path.startsWith(route))
  }
  return false
}

/** Returns gym id for the current staff member, or null if unauthenticated / no gym. */
export async function getStaffGymId(): Promise<string | null> {
  const info = await getCurrentStaffInfo()
  return info.gymId
}
