import { supabase } from './supabase'
import {
  canAccessRoute as canAccessRouteByCapability,
  hasCapability,
  staffRoleLabel,
  type StaffRole,
  type Capability,
} from '@/lib/permissions/capabilities'

export type { StaffRole, Capability }
export { hasCapability, staffRoleLabel }

export interface StaffInfo {
  role: StaffRole | null
  gymId: string | null
  fullName: string | null
}

/** @deprecated Use capability checks; kept for proxy compatibility */
export const ADMIN_ONLY_ROUTES = [
  '/plans', '/subscriptions', '/settings', '/staff', '/leads',
  '/migration', '/marketing', '/shop', '/insights', '/website-content', '/audit', '/families', '/ai-desk', '/inbox', '/notes',
]

export async function getCurrentStaffInfo(): Promise<StaffInfo> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { role: null, gymId: null, fullName: null }

  const { data: staffRole } = await supabase
    .from('staff_roles')
    .select('role, gym_id, full_name')
    .eq('user_id', user.id)
    .maybeSingle()

  if (staffRole) {
    return {
      role: staffRole.role as StaffRole,
      gymId: staffRole.gym_id,
      fullName: staffRole.full_name,
    }
  }

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

export function canAccessRoute(role: StaffRole | null, path: string): boolean {
  return canAccessRouteByCapability(role, path)
}

export async function getStaffGymId(): Promise<string | null> {
  const info = await getCurrentStaffInfo()
  return info.gymId
}
