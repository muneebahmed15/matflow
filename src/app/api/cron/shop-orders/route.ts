import { NextRequest, NextResponse } from 'next/server';
import { requireCronSecret } from '@/lib/auth/cron';
import { getAdminClient } from '@/lib/supabase/admin';
import { cancelStalePendingShopOrders } from '@/services/merchandise';
import { logger } from '@/lib/logger';

export async function GET(req: NextRequest) {
  const denied = requireCronSecret(req.headers.get('authorization'));
  if (denied) return denied;

  const admin = getAdminClient();
  const { data: gyms } = await admin.from('gyms').select('id').eq('store_enabled', true);

  let totalCancelled = 0;
  for (const gym of gyms ?? []) {
    try {
      totalCancelled += await cancelStalePendingShopOrders(gym.id);
    } catch (err) {
      logger.warn({ err, gymId: gym.id }, 'Stale shop order cleanup failed');
    }
  }

  return NextResponse.json({
    ok: true,
    gyms: gyms?.length ?? 0,
    cancelled: totalCancelled,
  });
}
