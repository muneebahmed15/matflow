import { getAdminClient } from '@/lib/supabase/admin';
import { ServiceError } from '@/services/errors';
import { getGymSettings } from '@/services/gym';

export type DashboardStats = {
  gymName: string;
  totalMembers: number;
  activeMembers: number;
  todayCheckIns: number;
  activeSubscriptions: number;
  activeWaivers: number;
};

export async function getDashboardStats(gymId: string): Promise<DashboardStats> {
  const admin = getAdminClient();
  const settings = await getGymSettings(gymId);
  const today = new Date().toISOString().split('T')[0];

  const [
    { count: totalMembers, error: e1 },
    { count: activeMembers, error: e2 },
    { count: todayCheckIns, error: e3 },
    { count: activeSubscriptions, error: e4 },
    { count: activeWaivers, error: e5 },
  ] = await Promise.all([
    admin.from('members').select('*', { count: 'exact', head: true }).eq('gym_id', gymId),
    admin.from('members').select('*', { count: 'exact', head: true }).eq('gym_id', gymId).eq('status', 'active'),
    admin
      .from('attendance')
      .select('*', { count: 'exact', head: true })
      .eq('gym_id', gymId)
      .gte('checked_in_at', `${today}T00:00:00`)
      .lte('checked_in_at', `${today}T23:59:59`),
    admin.from('subscriptions').select('*', { count: 'exact', head: true }).eq('gym_id', gymId).eq('status', 'active'),
    admin.from('waivers').select('*', { count: 'exact', head: true }).eq('gym_id', gymId).eq('is_active', true),
  ]);

  const err = e1 ?? e2 ?? e3 ?? e4 ?? e5;
  if (err) throw new ServiceError(500, err.message);

  return {
    gymName: settings.name,
    totalMembers: totalMembers ?? 0,
    activeMembers: activeMembers ?? 0,
    todayCheckIns: todayCheckIns ?? 0,
    activeSubscriptions: activeSubscriptions ?? 0,
    activeWaivers: activeWaivers ?? 0,
  };
}
